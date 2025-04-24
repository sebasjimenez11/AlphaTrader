import axios from "axios";
import WebSocket from "ws";
import AppError from "../utils/appError.js";
import pkg from "lodash/throttle.js";

import EventEmitter from "events";
import { formatLiveUpdate } from "../utils/coinDataFormatter.js";

class marketDataAdapter {
  constructor(redisRepository) {
    this.throttle = pkg;
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
   * Se suscribe a actualizaciones en tiempo real desde Binance para un solo símbolo.
   * Los datos se almacenan en Redis y se emiten como un solo objeto.
   *
   * @param {string} symbol - El símbolo (ej. "BTCUSDT")
   * @returns {WebSocket} - La instancia del WebSocket.
   */
  /**
   * Suscribe a actualizaciones en tiempo real desde Binance para múltiples símbolos.
   * @param {string[]} symbols - Lista de símbolos (por ejemplo, ["BTCUSDT", "ETHUSDT"]).
   * @returns {WebSocket} - Instancia del WebSocket.
   */
  subscribeToMultipleMarketUpdates(symbols) {
    try {
      // Verificar y normalizar los símbolos
      const validSymbols = symbols
        .map(s => {
          const lower = s.toLowerCase();
          const fixed = lower.replace(/tusd$/, "usdt");
          return fixed.endsWith("usdt") ? fixed : fixed + "usdt";
        })
        .filter(s => /^[a-z0-9]+usdt$/.test(s));

      if (validSymbols.length === 0) {
        throw new Error("No se han proporcionado símbolos válidos para Binance.");
      }

      // Construir la URL de streams
      const streams = validSymbols.map(s => `${s}@miniTicker`).join("/");
      const wsUrl = `${this.binanceWsUrl}/stream?streams=${streams}`;

      const ws = new WebSocket(wsUrl);
      const marketData = {};
      const lastEmitted = {}; // guarda el último dato emitido por símbolo

      ws.on("open", () =>
        console.log("Conectado a Binance WebSocket [Múltiples]")
      );

      // Procesamiento con throttling de 200ms (5 mensajes/segundo)
      const processMessageThrottled = this.throttle(async (data) => {
        try {
          const parsed = JSON.parse(data);
          const coinRaw = parsed.data;
          const coin = formatLiveUpdate(coinRaw);
          const key = coinRaw.s;

          // Solo emitir si cambió precio o volumen
          const prev = lastEmitted[key];
          if (
            !prev ||
            prev.Precio !== coin.Precio ||
            prev.Volumen !== coin.Volumen
          ) {
            lastEmitted[key] = coin;
            marketData[key] = coin;

            await this.redisRepository.set(
              `marketData:realtime:${key}`,
              coin,
              60
            );
            this.eventEmitter.emit(
              "marketDataUpdate",
              Object.values(marketData)
            );
          }
        } catch (err) {
          console.error("Error procesando mensaje:", err);
        }
      }, 200);

      ws.on("message", data => processMessageThrottled(data));

      ws.on("error", err => console.error("Error en WebSocket:", err));
      ws.on("close", () => console.log("WebSocket cerrado [Múltiples]"));

      return ws;
    } catch (error) {
      throw new AppError(error.message, 505);
    }
  }


  subscribeToCandlestickUpdates(symbol, interval) {
    const stream = `${symbol.toLowerCase()}@kline_${interval}`;
    const ws = new WebSocket(`${this.binanceWsUrl}/ws/${stream}`);
    ws.on("open", () => console.log(`Conectado a velas ${symbol} @ ${interval}`));

    ws.on("message", raw => {
      const { k } = JSON.parse(raw).data;
      if (k.x) {  // vela cerrada
        const candle = {
          openTime: k.t, open: k.o, high: k.h,
          low: k.l, close: k.c, volume: k.v, closeTime: k.T
        };
        const formatted = formatHistoricalCandle(candle, symbol);
        // guardar en cache opcional:
        this.redisRepository.set(`candles:${symbol}:${interval}`, formatted, 3600);
        this.eventEmitter.emit("candlestickUpdate", { symbol, interval, candle: formatted });
      }
    });

    ws.on("error", err => console.error("WS candlestick error:", err));
    ws.on("close", () => console.log(`WS candlestick cerrado: ${symbol}@${interval}`));
    return ws;
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

export default marketDataAdapter;
