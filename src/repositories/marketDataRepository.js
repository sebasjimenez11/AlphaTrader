import axios from "axios";
import WebSocket from "ws";
import AppError from "../utils/appError.js";
import EventEmitter from "events";
import { log } from "console";

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
    this.currencyConverterBaseUrl = "https://api.exchangerate-api.com/v4/latest";

    // Instancia de EventEmitter para el patrón Pub/Sub
    this.eventEmitter = new EventEmitter();
  }

  // ---------------------------
  // Métodos para Data Histórica
  // ---------------------------
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

  async getHistoricalData(symbol, interval) {
    const cacheKey = `marketData:historical:${symbol}:${interval}:both`;
    let cachedData = await this.redisRepository.get(cacheKey);
    if (cachedData) {
      console.table(cachedData);
      return cachedData;
    }

    let dataFromAPI;
    try {
      const binancePromise = axios.get(`${this.binanceBaseUrl}/api/v3/klines`, {
        params: {
          symbol: symbol.toUpperCase(),
          interval: interval,
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

      dataFromAPI = await Promise.race([binancePromise, cryptoPromise]);
      if (!dataFromAPI) {
        dataFromAPI = await Promise.any([binancePromise, cryptoPromise]);
      }
    } catch (error) {
      throw new AppError(error.message, 505);
    }

    const standardizedData = this.formatHistoricalData(dataFromAPI);
    await this.redisRepository.set(cacheKey, standardizedData, 300);
    return standardizedData;
  }

  // -------------------------------
  // Métodos para Actualizaciones en Vivo
  // -------------------------------
  /**
   * Se suscribe a actualizaciones en tiempo real desde Binance usando WebSocket.
   * Los datos en vivo se almacenan en Redis y se emiten mediante el EventEmitter.
   *
   * @param {string[]} symbols - Lista de símbolos (ej. ["BTCUSDT", "ETHUSDT"])
   * @returns {WebSocket} - La instancia del WebSocket.
   */
  subscribeToMarketUpdates(symbols) {
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
          // Emite el evento de actualización a través del EventEmitter
          this.eventEmitter.emit("marketDataUpdate", coinData);
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
  async convertCurrency(amount, fromCurrency, toCurrency) {
    const cacheKey = `currencyRate:${fromCurrency}:${toCurrency}`;
    let rate = await this.redisRepository.get(cacheKey);
    if (!rate) {
      try {
        const response = await axios.get(`${this.currencyConverterBaseUrl}/${fromCurrency.toUpperCase()}`);
        rate = response.data.rates[toCurrency.toUpperCase()];
        if (!rate) {
          throw new AppError("Tasa de conversión no encontrada", 404);
        }
        await this.redisRepository.set(cacheKey, rate, 600);
      } catch (error) {
        throw new AppError(error.message, 505);
      }
    }
    return amount * rate;
  }
}

export default MarketDataRepository;
