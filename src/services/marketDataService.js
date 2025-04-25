// services/marketDataService.js
import MarketDataAdapter from "../adapters/marketDataAdapter.js";
import CoinGeckoAdapter from "../adapters/coingeckoAdapter.js";
import RedisRepository from "../repositories/redisRepository.js";
import AppError from "../utils/appError.js";
import PreferencesProfileRepository from "../repositories/preferencesProfileRepository.js";
import WebSocket from 'ws'; // Necesario para marketDataAdapter

class MarketDataService {
    constructor() {
        this.redisRepository = new RedisRepository();
        this.marketDataAdap = new MarketDataAdapter(this.redisRepository);
        this.CoinGeckoAdap = new CoinGeckoAdapter(this.redisRepository);
        this.preferenceRepository = new PreferencesProfileRepository();

        this.socketListeners = new Map();
        this.socketWebsockets = new Map();
    }

    // --- Métodos de Servicio (Actualizados y sin socket.on('disconnect')) ---

    async getMainCoinsLiveData(socket) {
        const socketId = socket.id;
        try {
            const mainCoins = await this.CoinGeckoAdap.coinsRanking(20);
            if (!mainCoins || mainCoins.length === 0) {
                socket.emit("mainCoinsData", { mainCoins: [] }); return;
            }
            socket.emit("mainCoinsData", { mainCoins });
            const symbols = mainCoins.map(coin => coin.binanceSymbol).filter(Boolean);
            if (symbols.length === 0) return;

            const updateListener = (marketUpdate) => {
                const updatedSymbol = Object.keys(marketUpdate)[0];
                if (symbols.includes(updatedSymbol)) {
                    // *** MODIFICADO: Emitir como array [ { datos } ] ***
                    socket.emit("mainCoinUpdate", Object.values(marketUpdate));
                }
            };
            this.marketDataAdap.eventEmitter.on("marketDataUpdate", updateListener);
            this.socketListeners.set(`ticker_${socketId}`, updateListener);

            const ws = this.marketDataAdap.subscribeToMultipleMarketUpdates(symbols);
            if (!ws) {
                this.marketDataAdap.eventEmitter.removeListener("marketDataUpdate", updateListener);
                this.socketListeners.delete(`ticker_${socketId}`);
                socket.emit("error", { message: "No se pudo suscribir a las actualizaciones en vivo." });
                return;
            }
            return { success: true, subscribedSymbols: symbols };

        } catch (error) {
            console.error(`[${socketId}] Error en getMainCoinsLiveData:`, error);
            socket.emit("error", { message: `Error obteniendo datos principales: ${error.message}` });
            const listener = this.socketListeners.get(`ticker_${socketId}`);
            if (listener) {
               this.marketDataAdap.eventEmitter.removeListener("marketDataUpdate", listener);
               this.socketListeners.delete(`ticker_${socketId}`);
           }
        }
    }

    async getSecondaryCoinsLiveData(socket) {
        const socketId = socket.id;
         try {
            const allCoins = await this.CoinGeckoAdap.coinsList(100);
            const ranking = await this.CoinGeckoAdap.coinsRanking(20);
            const rankingSymbols = new Set(ranking.map(c => c.binanceSymbol));
            const secondaryCoins = allCoins
                .filter(coin => coin.binanceSymbol && !rankingSymbols.has(coin.binanceSymbol))
                .slice(0, 30);
             if (!secondaryCoins || secondaryCoins.length === 0) {
                 socket.emit("secondaryCoinsData", { secondaryCoins: [] }); return;
             }
             socket.emit("secondaryCoinsData", { secondaryCoins });
             const symbols = secondaryCoins.map(coin => coin.binanceSymbol);
             if (symbols.length === 0) return;

            const updateListener = (marketUpdate) => {
                const updatedSymbol = Object.keys(marketUpdate)[0];
                if (symbols.includes(updatedSymbol)) {
                     // *** MODIFICADO: Emitir como array [ { datos } ] ***
                    socket.emit("secondaryCoinUpdate", Object.values(marketUpdate));
                }
            };
            this.marketDataAdap.eventEmitter.on("marketDataUpdate", updateListener);
            this.socketListeners.set(`ticker_${socketId}`, updateListener);

            const ws = this.marketDataAdap.subscribeToMultipleMarketUpdates(symbols);
            if (!ws) {
                 this.marketDataAdap.eventEmitter.removeListener("marketDataUpdate", updateListener);
                 this.socketListeners.delete(`ticker_${socketId}`);
                 socket.emit("error", { message: "No se pudo suscribir a las actualizaciones en vivo (secundarias)." });
                 return;
            }
            return { success: true, subscribedSymbols: symbols };

        } catch (error) {
             console.error(`[${socketId}] Error en getSecondaryCoinsLiveData:`, error);
             socket.emit("error", { message: `Error obteniendo datos secundarios: ${error.message}` });
              const listener = this.socketListeners.get(`ticker_${socketId}`);
             if (listener) {
                this.marketDataAdap.eventEmitter.removeListener("marketDataUpdate", listener);
                this.socketListeners.delete(`ticker_${socketId}`);
            }
        }
    }

    async getLiveDataWithPreferences(idUser, socket) {
         const socketId = socket.id;
         if (!idUser) {
            socket.emit("error", { message: "No autorizado o ID de usuario no encontrado." });
            return;
          }
         try {
             const preferences = await this.preferenceRepository.findByuserID(idUser);
             const preferredCoinSymbols = preferences?.coins || [];
             if (preferredCoinSymbols.length === 0) {
                 socket.emit("preferencesData", { preferredCoinsData: [], preferredSymbols: [] });
                 return;
              }
             const allCoinsList = await this.CoinGeckoAdap.coinsList(250);
             const preferredCoinsData = allCoinsList.filter(coin => coin.symbol && preferredCoinSymbols.includes(coin.symbol.toLowerCase()));
             if (preferredCoinsData.length === 0) {
                  socket.emit("preferencesData", { preferredCoinsData: [], preferredSymbols: preferredCoinSymbols });
                  return;
              }
             socket.emit("preferencesData", { preferredCoinsData, preferredSymbols: preferredCoinSymbols });
             const symbolsToSubscribe = preferredCoinsData.map(coin => coin.binanceSymbol).filter(Boolean);
             if (symbolsToSubscribe.length === 0) return;


             const updateListener = (marketUpdate) => {
                  const updatedSymbol = Object.keys(marketUpdate)[0];
                  if (symbolsToSubscribe.includes(updatedSymbol)) {
                       // *** MODIFICADO: Emitir como array [ { datos } ] ***
                      socket.emit("preferenceUpdate", Object.values(marketUpdate));
                  }
             };
             this.marketDataAdap.eventEmitter.on("marketDataUpdate", updateListener);
             this.socketListeners.set(`ticker_${socketId}`, updateListener);

             const ws = this.marketDataAdap.subscribeToMultipleMarketUpdates(symbolsToSubscribe);
             if (!ws) {
                  this.marketDataAdap.eventEmitter.removeListener("marketDataUpdate", updateListener);
                  this.socketListeners.delete(`ticker_${socketId}`);
                  socket.emit("error", { message: "No se pudo suscribir a las actualizaciones de preferencias." });
                  return;
             }
              return { success: true, subscribedSymbols: symbolsToSubscribe };

         } catch (error) {
             console.error(`[${socketId}] Error en getLiveDataWithPreferences para User ${idUser}:`, error);
             socket.emit("error", { message: `Error obteniendo datos de preferencias: ${error.message}` });
              const listener = this.socketListeners.get(`ticker_${socketId}`);
             if (listener) {
                this.marketDataAdap.eventEmitter.removeListener("marketDataUpdate", listener);
                this.socketListeners.delete(`ticker_${socketId}`);
            }
         }
    }

    async getCryptoDetailWithKlines(socket, data) {
         const socketId = socket.id;
         const { cryptoId, interval = '1d', limit = 30 } = data;
         if (!cryptoId) {
             socket.emit("error", { message: "Se requiere el ID de la criptomoneda." });
             return;
          }

         try {
            const coinDetail = await this.CoinGeckoAdap.coinById(cryptoId);
            if (!coinDetail || !coinDetail.binanceSymbol) {
                 socket.emit("error", { message: `No se encontró la moneda ${cryptoId} o no está disponible en Binance.` });
                 return;
             }
            const binanceSymbol = coinDetail.binanceSymbol;
            const historicalKlines = await this.marketDataAdap.getKlinesData(binanceSymbol, interval, limit);
            socket.emit("klineData", { binanceSymbol, interval, klines: historicalKlines , coinDetail});

            const wsKline = this.marketDataAdap.subscribeToCandlestickUpdates(binanceSymbol, interval);
            this.socketWebsockets.set(`kline_${socketId}`, wsKline);

            const klineUpdateListener = (update) => {
                if (update.symbol === binanceSymbol && update.interval === interval) {
                     // La actualización de velas cerradas ya viene como objeto, no necesita Object.values
                     socket.emit("klineUpdate", update.candle);
                 }
            };
            const klineTickListener = (tickUpdate) => {
                 if (tickUpdate.symbol === binanceSymbol && tickUpdate.interval === interval) {
                      // La actualización de ticks (vela formándose) ya viene como objeto
                     socket.emit("klineTickUpdate", tickUpdate.tick);
                 }
            };
            this.marketDataAdap.eventEmitter.on('candlestickUpdate', klineUpdateListener);
            this.marketDataAdap.eventEmitter.on('candlestickTickUpdate', klineTickListener);
            this.socketListeners.set(`klineUpdate_${socketId}`, klineUpdateListener);
            this.socketListeners.set(`klineTick_${socketId}`, klineTickListener);

            return { success: true, coinDetail, initialKlinesCount: historicalKlines.length };

         } catch (error) {
            console.error(`[${socketId}] Error en getCryptoDetailWithKlines:`, error);
            socket.emit("error", { message: `Error obteniendo historial/updates para ${cryptoId}: ${error.message}` });
         }
    }

    async getShortTermHistoryWithLiveUpdates(socket, data) {
         const socketId = socket.id;
         const { cryptoId, hours = 24 } = data;
         const interval = '1h';
          if (!cryptoId || ![24, 48, 72].includes(hours)) {
              socket.emit("error", { message: "Parámetros inválidos para historial corto." });
              return;
           }

         try {
             const coinDetail = await this.CoinGeckoAdap.coinById(cryptoId);
             if (!coinDetail || !coinDetail.binanceSymbol) {
                 socket.emit("error", { message: `No se encontró la moneda ${cryptoId} o no está disponible en Binance.` });
                 return;
             }
             const binanceSymbol = coinDetail.binanceSymbol;
             const shortTermKlines = await this.marketDataAdap.getShortTermHistory(binanceSymbol, hours);
             socket.emit("shortTermHistoryData", { binanceSymbol, interval, hours, klines: shortTermKlines });

             const wsShortTerm = this.marketDataAdap.subscribeToCandlestickUpdates(binanceSymbol, interval);
             this.socketWebsockets.set(`short_${socketId}`, wsShortTerm);

             const shortTermUpdateListener = (update) => {
                 if (update.symbol === binanceSymbol && update.interval === interval) {
                     socket.emit("shortTermHistoryUpdate", update.candle);
                 }
             };
             const shortTermTickListener = (tickUpdate) => {
                  if (tickUpdate.symbol === binanceSymbol && tickUpdate.interval === interval) {
                     socket.emit("shortTermHistoryTickUpdate", tickUpdate.tick);
                 }
             };
             this.marketDataAdap.eventEmitter.on('candlestickUpdate', shortTermUpdateListener);
             this.marketDataAdap.eventEmitter.on('candlestickTickUpdate', shortTermTickListener);
             this.socketListeners.set(`shortUpdate_${socketId}`, shortTermUpdateListener);
             this.socketListeners.set(`shortTick_${socketId}`, shortTermTickListener);

             return { success: true, coinDetail, initialKlinesCount: shortTermKlines.length };

         } catch (error) {
             console.error(`[${socketId}] Error en getShortTermHistoryWithLiveUpdates:`, error);
             socket.emit("error", { message: `Error obteniendo historial corto para ${cryptoId}: ${error.message}` });
         }
    }
}

export default new MarketDataService();