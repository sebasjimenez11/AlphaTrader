// adapters/marketDataAdapter.js
import axios from "axios";
import WebSocket from "ws";
import AppError from "../utils/appError.js"; // Asegúrate que la ruta sea correcta
import pkg from "lodash/throttle.js";
import EventEmitter from "events";
// Importar los formateadores actualizados desde tu archivo de formateadores
import { formatLiveUpdate, formatHistoricalCandle } from "../utils/coinDataFormatter.js"; // Asegúrate que la ruta sea correcta

class MarketDataAdapter {
    constructor(redisRepository) {
        this.throttle = pkg; // lodash throttle function
        this.redisRepository = redisRepository;

        // Configuración Binance
        this.binanceApiBaseUrl = "https://api.binance.com/api/v3";
        this.binanceWsUrl = "wss://stream.binance.com:9443";

        // EventEmitter para desacoplar la recepción de datos de su emisión
        this.eventEmitter = new EventEmitter();

        // Configuración para conversión de divisas (mantener si aún se usa)
        // this.currencyConverterBaseUrl = "https://api.exchangerate-api.com/v4/latest";
    }

    /**
     * Obtiene datos históricos de velas (Klines) de Binance para un símbolo e intervalo.
     * @param {string} binanceSymbol - Símbolo del par (ej. 'BTCUSDT').
     * @param {string} interval - Intervalo de Binance (ej. '1h', '4h', '1d').
     * @param {number} [limit=500] - Cantidad de velas a obtener (máx 1000).
     * @param {number} [startTime] - Timestamp de inicio (ms).
     * @param {number} [endTime] - Timestamp de fin (ms).
     * @returns {Promise<Array<object>>} - Array de velas formateadas.
     */
    async getKlinesData(binanceSymbol, interval, limit = 500, startTime, endTime) {
        if (!binanceSymbol || !interval) {
             console.error("getKlinesData: Se requiere binanceSymbol e interval.");
             return []; // Devuelve vacío si faltan parámetros clave
        }
        // Validar límite
        if (limit > 1000) limit = 1000;

        const cacheKey = `klines:${binanceSymbol}:${interval}:${limit}:${startTime || 'na'}:${endTime || 'na'}`;
        try {
            const cachedData = await this.redisRepository.get(cacheKey);
            if (cachedData && Array.isArray(cachedData)) {
                return cachedData;
            }

            const params = {
                symbol: binanceSymbol.toUpperCase(),
                interval: interval,
                limit: limit
            };
            if (startTime) params.startTime = startTime;
            if (endTime) params.endTime = endTime;

            const response = await axios.get(`${this.binanceApiBaseUrl}/klines`, { params });
            const klinesRaw = response.data;

            if (!Array.isArray(klinesRaw)) {
                throw new AppError("Respuesta inesperada de la API de Klines de Binance", 502);
            }

            // Formatear usando la función actualizada
            const formattedKlines = klinesRaw.map(kline => formatHistoricalCandle(kline, binanceSymbol));

            // Guardar en caché (ej. 5 minutos = 300 segundos) solo si hay datos
            if (formattedKlines.length > 0) {
                 await this.redisRepository.set(cacheKey, formattedKlines, 300);
            }

            return formattedKlines;

        } catch (error) {
            const status = error.response?.status || 500;
            const message = error.response?.data?.msg || error.message;
            console.error(`Error en getKlinesData (${binanceSymbol}, ${interval}): ${status} - ${message}`);
            // Devuelve array vacío en caso de error API para manejo en el servicio
            return [];
        }
    }

    /**
     * Obtiene datos históricos de velas para periodos cortos (24h, 48h, 72h).
     * Utiliza velas de 1 hora.
     * @param {string} binanceSymbol - Símbolo del par (ej. 'BTCUSDT').
     * @param {number} hours - Periodo en horas (24, 48 o 72).
     * @returns {Promise<Array<object>>} - Array de velas formateadas de 1h.
     */
    async getShortTermHistory(binanceSymbol, hours) {
        if (![24, 48, 72].includes(hours)) {
            // Lanza error para que el servicio lo capture y reporte al cliente
            throw new AppError("Periodo de horas inválido para historial corto. Usar 24, 48 o 72.", 400);
        }
        if (!binanceSymbol) {
             throw new AppError("Se requiere binanceSymbol para getShortTermHistory.", 400);
        }

        const interval = '1h'; // Usar velas de 1 hora
        const limit = hours; // Pedir exactamente el número de velas/horas

        // Se llama a getKlinesData pidiendo las 'limit' velas más recientes.
        return this.getKlinesData(binanceSymbol, interval, limit);
    }


    /**
     * Se suscribe a actualizaciones en tiempo real de velas (Klines) desde Binance.
     * Emite eventos 'candlestickUpdate' (vela cerrada) y 'candlestickTickUpdate' (vela formándose).
     * @param {string} binanceSymbol - Símbolo del par (ej. 'BTCUSDT').
     * @param {string} interval - Intervalo de la vela (ej. '1h', '1d').
     * @returns {WebSocket} - La instancia del WebSocket.
     * @throws {AppError} Si la suscripción falla.
     */
    subscribeToCandlestickUpdates(binanceSymbol, interval) {
        if (!binanceSymbol || !interval) {
             throw new AppError("Se requiere binanceSymbol e interval para suscribir a velas.", 400);
        }
        const symbolLower = binanceSymbol.toLowerCase();
        const stream = `${symbolLower}@kline_${interval}`;
        const wsUrl = `${this.binanceWsUrl}/ws/${stream}`;

        try {
            const ws = new WebSocket(wsUrl);

            ws.on("open", () => console.log(`WS Klines conectado: ${binanceSymbol}@${interval}`));

            ws.on("message", (data) => {
                try {
                    const message = JSON.parse(data.toString()); // Asegurar que es string antes de parsear
                    // Verificar si es un mensaje de kline válido
                    if (message.e === 'kline') {
                        const k = message.k;
                        const isClosed = k.x; // ¿Está cerrada la vela?

                        if (isClosed) {
                            // Vela cerrada: formatear como vela histórica completa
                            const candleArray = [
                                k.t, k.o, k.h, k.l, k.c, k.v, k.T, k.q, k.n, k.V, k.Q, k.B
                            ];
                            const formattedClosedCandle = formatHistoricalCandle(candleArray, binanceSymbol);
                            this.eventEmitter.emit("candlestickUpdate", {
                                symbol: binanceSymbol, // Emitir con el símbolo exacto suscrito
                                interval: interval,
                                candle: formattedClosedCandle
                            });
                            // Opcional: guardar en cache la última vela cerrada
                            this.redisRepository.set(`lastCandle:${binanceSymbol}:${interval}`, formattedClosedCandle, 3600 * 24);
                        } else {
                            // Vela aún abierta (Tick Update): formatear como actualización en vivo
                            // Se usa parseFloat para asegurar que son números
                            const tickUpdate = {
                                id: null, name: null,
                                symbol: binanceSymbol.replace(/(USDT|TUSD|BUSD|USDC)$/, '').toLowerCase(),
                                binanceSymbol: binanceSymbol,
                                image: null, marketCap: null, marketCapRank: null,
                                currentPrice: parseFloat(k.c),
                                highPrice: parseFloat(k.h),
                                lowPrice: parseFloat(k.l),
                                openPrice: parseFloat(k.o),
                                priceChangePercentage: ((parseFloat(k.c) - parseFloat(k.o)) / parseFloat(k.o)) * 100, // Cambio vs apertura
                                totalVolume: parseFloat(k.v),
                                trend: parseFloat(k.c) > parseFloat(k.o) ? 'bullish' : (parseFloat(k.c) < parseFloat(k.o) ? 'bearish' : 'neutral'),
                                openTime: new Date(k.t).toISOString(),
                                closeTime: new Date(k.T).toISOString(),
                                lastUpdated: new Date(message.E).toISOString(),
                                eventTime: message.E, // Timestamp del evento
                                isForming: true
                            };
                            this.eventEmitter.emit("candlestickTickUpdate", {
                                symbol: binanceSymbol, // Emitir con el símbolo exacto suscrito
                                interval: interval,
                                tick: tickUpdate
                            });
                        }
                    }
                } catch (parseError) {
                    console.error(`Error parseando mensaje kline WS (${binanceSymbol}@${interval}):`, parseError, data.toString());
                }
            });

            ws.on("error", (err) => console.error(`Error en WS Klines (${binanceSymbol}@${interval}):`, err.message));
            ws.on("close", (code, reason) => {
                const reasonString = reason ? reason.toString() : 'No reason provided';
                 // Podrías querer emitir un evento para que el servicio sepa que se cerró inesperadamente
                 this.eventEmitter.emit("candlestickDisconnect", { symbol: binanceSymbol, interval: interval, code: code, reason: reasonString });
            });
             ws.on("unexpected-response", (req, res) => {
                 console.error(`Respuesta inesperada en WS Klines (${binanceSymbol}@${interval}): Status ${res.statusCode}`);
                 if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
                     ws.terminate(); // Forzar cierre
                 }
                  this.eventEmitter.emit("candlestickDisconnect", { symbol: binanceSymbol, interval: interval, code: `unexpected-${res.statusCode}`, reason: 'Unexpected server response' });
            });

            return ws;

        } catch (error) {
            console.error(`No se pudo crear el WebSocket para ${binanceSymbol}@${interval}: ${error.message}`);
            // Lanzar error para que el servicio sepa que falló la suscripción
            throw new AppError(`Fallo al suscribir a velas para ${binanceSymbol}@${interval}: ${error.message}`, 500);
        }
    }

     /**
     * Se suscribe a actualizaciones en tiempo real desde Binance para múltiples símbolos (miniTicker).
     * Ideal para vistas generales con muchas monedas. Emite 'marketDataUpdate'.
     * @param {string[]} binanceSymbols - Lista de símbolos de Binance (ej. ["BTCUSDT", "ETHUSDT"]).
     * @returns {WebSocket | null} - Instancia del WebSocket o null si no hay símbolos válidos.
     * @throws {AppError} Si la suscripción falla catastróficamente.
     */
    subscribeToMultipleMarketUpdates(binanceSymbols) {
         if (!Array.isArray(binanceSymbols) || binanceSymbols.length === 0) {
             console.warn("subscribeToMultipleMarketUpdates: No se proporcionaron símbolos.");
             return null; // No iniciar si no hay símbolos
         }
        try {
            // Asegurar que los símbolos sean válidos y en minúsculas para la URL del stream
             const validSymbolsLower = binanceSymbols
                .map(s => s.trim().toUpperCase()) // Limpiar y asegurar mayúsculas primero
                .filter(s => /^[A-Z0-9]+USDT$/.test(s)) // Validar formato (ajusta si usas otros pares)
                .map(s => s.toLowerCase()); // Convertir a minúsculas para el stream URL

            if (validSymbolsLower.length === 0) {
                console.warn("subscribeToMultipleMarketUpdates: Ningún símbolo válido encontrado después de filtrar.");
                return null; // No iniciar si no quedan símbolos válidos
            }

            // Construir la URL de streams
            const streams = validSymbolsLower.map(s => `${s}@miniTicker`).join("/");
            const wsUrl = `${this.binanceWsUrl}/stream?streams=${streams}`;

            const ws = new WebSocket(wsUrl);
            // const marketData = {}; // No parece necesario mantener el estado aquí si se emite por símbolo
            const lastEmitted = {}; // Para throttling basado en cambios

            ws.on("open", () => console.log(`WS Multi Ticker conectado para ${validSymbolsLower.length} símbolos.`));

            // Throttle para limitar procesamiento/emisión
            const processMessageThrottled = this.throttle(async (rawData) => {
                try {
                    const message = JSON.parse(rawData.toString());
                    if (message.stream && message.data && message.data.e === '24hrMiniTicker') {
                         const coinRaw = message.data;
                         const coinFormatted = formatLiveUpdate(coinRaw); // Usa el formateador actualizado

                         if (!coinFormatted || !coinFormatted.binanceSymbol) {
                             console.warn("MiniTicker: Formateo inválido o falta binanceSymbol", coinRaw);
                             return;
                         }

                         const key = coinFormatted.binanceSymbol; // Clave ej: BTCUSDT

                         // Optimización: Solo emitir si el precio o volumen cambiaron
                         const prev = lastEmitted[key];
                         if (!prev || prev.currentPrice !== coinFormatted.currentPrice || prev.totalVolume !== coinFormatted.totalVolume) {
                            lastEmitted[key] = coinFormatted;

                            // Opcional: Cachear en Redis (TTL corto)
                            // await this.redisRepository.set(`marketData:realtime:${key}`, coinFormatted, 60);

                            // Emitir un objeto solo con la moneda actualizada { SYMBOL: data }
                            this.eventEmitter.emit("marketDataUpdate", { [key]: coinFormatted });
                         }
                    }
                } catch (err) {
                    console.error("Error procesando mensaje miniTicker WS:", err, rawData.toString());
                }
            }, 200); // Ajusta el throttle según necesidad

            ws.on("message", processMessageThrottled);
            ws.on("error", (err) => console.error("Error en WS Multi Ticker:", err.message));
            ws.on("close", (code, reason) => {
                 const reasonString = reason ? reason.toString() : 'No reason provided';
                 // Emitir evento de desconexión si es necesario gestionarlo en el servicio
                  this.eventEmitter.emit("multiTickerDisconnect", { code: code, reason: reasonString });
            });
             ws.on("unexpected-response", (req, res) => {
                 console.error(`Respuesta inesperada en WS Multi Ticker: Status ${res.statusCode}`);
                  if (ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
                     ws.terminate();
                 }
                 this.eventEmitter.emit("multiTickerDisconnect", { code: `unexpected-${res.statusCode}`, reason: 'Unexpected server response' });
            });

            return ws;
        } catch (error) {
             console.error(`No se pudo crear el WebSocket múltiple: ${error.message}`);
             // Lanzar para que el servicio lo maneje
             throw new AppError(`Fallo al suscribir a múltiples tickers: ${error.message}`, 500);
        }
    }


    // --- Método de Conversión de Divisas (si aún se usa) ---
    async convertCurrency(amount, fromCurrency, toCurrency) {
        // Código existente... parece correcto si la API sigue funcionando.
        // Añadir validación básica de parámetros
        if (typeof amount !== 'number' || !fromCurrency || !toCurrency) {
            throw new AppError("Parámetros inválidos para conversión de moneda.", 400);
        }
        const cacheKey = `currencyRate:${fromCurrency.toUpperCase()}:${toCurrency.toUpperCase()}`;
        let rate = await this.redisRepository.get(cacheKey);
        if (rate) {
             // Asegurarse que el caché es un número
             rate = parseFloat(rate);
             if (!isNaN(rate)) {
                 return amount * rate;
             } else {
                  console.warn(`Valor de caché inválido para ${cacheKey}`);
                  // Proceder a buscar en API si el caché es inválido
             }
        }
        try {
            const response = await axios.get(`${this.currencyConverterBaseUrl}/${fromCurrency.toUpperCase()}`); // Asegurar mayúsculas
            const rateFound = response.data?.rates?.[toCurrency.toUpperCase()]; // Acceso seguro

            if (typeof rateFound !== 'number') { // Verificar que sea un número
                throw new AppError(`Tasa de conversión no encontrada o inválida para ${toCurrency.toUpperCase()}`, 404);
            }
            await this.redisRepository.set(cacheKey, rateFound.toString(), 600); // Guardar como string
            return amount * rateFound;
        } catch (error) {
            const status = error.response?.status || (error instanceof AppError ? error.statusCode : 500);
            const message = error.response?.data?.error || error.message;
            // Evitar lanzar errores genéricos si es un 404 esperado
            if (status === 404 && error instanceof AppError) {
                 throw error; // Re-lanzar el error 404 específico
            }
             console.error(`Error en API de conversión (${fromCurrency} a ${toCurrency}): ${status} - ${message}`);
             throw new AppError(`Error en servicio de conversión: ${message}`, status);
        }
    }

    
}

export default MarketDataAdapter;