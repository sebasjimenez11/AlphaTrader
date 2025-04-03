// src/repositories/marketDataRepository.js
import axios from "axios";
import WebSocket from "ws";
import AppError from "../utils/appError.js";

class MarketDataRepository {
  constructor(redisRepository) {
    this.redisRepository = redisRepository;

    // Configuración para Binance
    this.binanceBaseUrl = "https://api.binance.com";
    this.binanceWsUrl = "wss://stream.binance.com:9443";

    // Configuración para CryptoCompare
    this.cryptoCompareBaseUrl = "https://min-api.cryptocompare.com/data";
    this.cryptoCompareApiKey = process.env.CRYPTOCOMPARE_API_KEY; // Opcional, si se requiere

    // Configuración para conversión de divisas (ejemplo: exchangerate-api)
    // Retorna tasas de conversión en base a una moneda de referencia.
    this.currencyConverterBaseUrl = "https://api.exchangerate-api.com/v4/latest";
  }

  // ---------------------------
  // Métodos para Data Histórica
  // ---------------------------

  /**
   * Estandariza la data histórica para mantener un formato consistente.
   * Para CryptoCompare se transforma el campo "time" (en segundos) a milisegundos.
   */
  formatHistoricalData(data) {
    if (!data || data.length === 0) return data;

    // Si la data proviene de CryptoCompare (posee propiedad "time")
    if (data[0].hasOwnProperty("time")) {
      return data.map(item => ({
        openTime: item.time * 1000, // tiempo en milisegundos
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volumeto, // o volumefrom, según lo que se necesite
        closeTime: (item.time + 86400) * 1000 // suponiendo velas diarias
      }));
    }
    // Si es de Binance, asumimos que ya viene con el formato deseado:
    return data;
  }

  /**
   * Obtiene datos históricos de una criptomoneda.
   * Primero revisa en Redis; si no hay data cacheada, hace llamadas concurrentes a Binance y CryptoCompare.
   * Se utiliza Promise.race para usar la respuesta que llegue primero y se cachea la data resultante.
   *
   * @param {string} symbol - Símbolo de la criptomoneda (ej. BTC)
   * @param {string} interval - Intervalo para Binance (ej. "1m", "1h", etc.)
   * @returns {Array} - Data histórica estandarizada.
   */
  async getHistoricalData(symbol, interval) {
    // Para el cache usamos "both" como fuente unificada, pero se puede parametrizar si se desea
    const cacheKey = `marketData:historical:${symbol}:${interval}:both`;
    let cachedData = await this.redisRepository.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    let dataFromAPI;
    try {
      // Solicitud a Binance para datos históricos
      const binancePromise = axios.get(`${this.binanceBaseUrl}/api/v3/klines`, {
        params: {
          symbol: symbol.toUpperCase(),
          interval,
          limit: 500
        }
      })
        .then(response => response.data.map(item => ({
          openTime: item[0],
          open: item[1],
          high: item[2],
          low: item[3],
          close: item[4],
          volume: item[5],
          closeTime: item[6]
        })))
        .catch(err => {
          console.error("Error en Binance:", err.message);
          return null;
        });

      // Solicitud a CryptoCompare para datos históricos diarios
      const cryptoPromise = axios.get(`${this.cryptoCompareBaseUrl}/v2/histoday`, {
        params: {
          fsym: symbol.toUpperCase(),
          tsym: "USD",
          limit: 2000,
          aggregate: 1,
          api_key: this.cryptoCompareApiKey
        }
      })
        .then(response => {
          if (response.data.Response !== "Success") {
            throw new AppError("Error al obtener datos de CryptoCompare", 500);
          }
          return response.data.Data.Data;
        })
        .catch(err => {
          console.error("Error en CryptoCompare:", err.message);
          return null;
        });

      // Promise.race para la primera respuesta exitosa
      dataFromAPI = await Promise.race([binancePromise, cryptoPromise]);
      if (!dataFromAPI) {
        // En caso de que la primera respuesta sea null, se usa Promise.any
        dataFromAPI = await Promise.any([binancePromise, cryptoPromise]);
      }
    } catch (error) {
      throw new AppError(error.message, 505);
    }

    const standardizedData = this.formatHistoricalData(dataFromAPI);
    // Cachea la data por 5 minutos (300 segundos)
    await this.redisRepository.set(cacheKey, standardizedData, 300);
    return standardizedData;
  }

  // -------------------------------
  // Métodos para Actualizaciones en Vivo
  // -------------------------------

  /**
   * Se suscribe a actualizaciones en tiempo real desde Binance usando WebSocket.
   * Los datos en vivo se almacenan en Redis y se envían a través del callback.
   *
   * @param {string[]} symbols - Lista de símbolos (ej. ["BTCUSDT", "ETHUSDT"])
   * @param {function} onUpdateCallback - Función callback para cada actualización recibida.
   * @returns {WebSocket} - La instancia del WebSocket.
   */
  subscribeToMarketUpdates(symbols, onUpdateCallback) {
    try {
      const streams = symbols.map(s => `${s.toLowerCase()}@ticker`).join("/");
      const ws = new WebSocket(`${this.binanceWsUrl}/stream?streams=${streams}`);

      ws.on("open", () => console.log("Conectado a Binance WebSocket"));
      ws.on("message", async (data) => {
        try {
          const parsed = JSON.parse(data);
          const coinData = parsed.data;
          // Cachea la actualización en Redis con un TTL corto (ej. 60 segundos)
          await this.redisRepository.set(`marketData:realtime:${coinData.s}`, coinData, 60);
          onUpdateCallback(coinData);
        } catch (err) {
          console.error("Error procesando mensaje:", err);
        }
      });
      ws.on("error", (err) => {
        console.error("Error en WebSocket:", err);
        throw new AppError(err.message, 500);
      });
      ws.on("close", () => console.log("WebSocket cerrado"));
      return ws;
    } catch (error) {
      throw new AppError(error.message, 505);
    }
  }

  // ----------------------------
  // Métodos para Conversión de Divisas
  // ----------------------------

  /**
   * Convierte una cantidad de una moneda a otra.
   * Primero revisa en Redis si la tasa de conversión ya está cacheada para evitar peticiones repetitivas.
   * La tasa se cachea y se actualiza según el TTL definido.
   *
   * @param {number} amount - La cantidad a convertir.
   * @param {string} fromCurrency - Moneda origen (ej. "BTC", "USD").
   * @param {string} toCurrency - Moneda destino (ej. "COP").
   * @returns {number} - La cantidad convertida.
   */
  async convertCurrency(amount, fromCurrency, toCurrency) {
    const cacheKey = `currencyRate:${fromCurrency}:${toCurrency}`;
    let rate = await this.redisRepository.get(cacheKey);
    if (!rate) {
      try {
        // Se consulta la tasa de conversión usando la API (por ejemplo, desde exchangerate-api)
        const response = await axios.get(`${this.currencyConverterBaseUrl}/${fromCurrency.toUpperCase()}`);
        rate = response.data.rates[toCurrency.toUpperCase()];
        if (!rate) {
          throw new AppError("Tasa de conversión no encontrada", 404);
        }
        // Cachea la tasa por 10 minutos (600 segundos)
        await this.redisRepository.set(cacheKey, rate, 600);
      } catch (error) {
        throw new AppError(error.message, 505);
      }
    }
    return amount * rate;
  }
}

export default MarketDataRepository;
