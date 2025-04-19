import marketDataAdapter from "../adapters/marketDataAdapter.js";
import CoinGeckoAdapter from "../adapters/coingeckoAdapter.js";
import RedisRepository from "../repositories/redisRepository.js";
import AppError from "../utils/appError.js";

class MarketDataService {
    constructor() {
        this.redisRepository = new RedisRepository();
        this.marketDataAdap = new marketDataAdapter(this.redisRepository);
        this.CoinGeckoAdap = new CoinGeckoAdapter(this.redisRepository);
    }

    // 1. Obtener datos en vivo de las monedas principales
    async getMainCoinsLiveData(socket) {
        try {
            const mainCoins = await this.CoinGeckoAdap.coinsRanking();
            const symbols = mainCoins.map(coin => coin.symbol + "USDT");

            // Definir listener para recibir actualizaciones del EventEmitter
            const updateListener = (coinData) => {
                socket.emit("mainCoinsLiveUpdate", coinData);
            };

            // Suscribirse al evento de actualización
            this.marketDataAdap.eventEmitter.on("marketDataUpdate", updateListener);

            // Establecer la conexión WebSocket
            const ws = this.marketDataAdap.subscribeToMultipleMarketUpdates(symbols);
            // Al desconectar el socket, remover el listener y cerrar el WebSocket
            socket.on("disconnect", () => {
                this.marketDataAdap.eventEmitter.removeListener("marketDataUpdate", updateListener);
                if (ws && ws.readyState === ws.OPEN) {  // ✅ Solo cerrar si está realmente abierto
                    ws.close();
                } else {
                    console.warn(`Intento de cerrar WebSocket no establecido: ${socket.id}`);
                }
            });

            return { mainCoins };
        } catch (error) {
            throw new AppError(error.message, 505);
        }
    }

    // 2. Obtener listado de monedas secundarias
    async getSecondaryCoinsLiveData(socket) {
        try {
            const allCoins = await this.CoinGeckoAdap.coinsList();
            const ranking = await this.CoinGeckoAdap.coinsRanking();
            const rankingIds = ranking.map(c => c.id);
            const secondaryCoins = allCoins.filter(coin => !rankingIds.includes(coin.id)).slice(29, 46);

            const symbols = secondaryCoins.map(coin => coin.symbolo + "USDT");
            const updateListener = (coinData) => {
                socket.emit("secondaryCoinsLiveUpdate", coinData);
            };

            this.marketDataAdap.eventEmitter.on("marketDataUpdate", updateListener);
            const ws = this.marketDataAdap.subscribeToMultipleMarketUpdates(symbols);

            socket.on("disconnect", () => {
                this.marketDataAdap.eventEmitter.removeListener("marketDataUpdate", updateListener);
                if (ws && ws.readyState === ws.OPEN) {  // ✅ Solo cerrar si está realmente abierto
                    ws.close();
                } else {
                    console.warn(`Intento de cerrar WebSocket no establecido: ${socket.id}`);
                }
            });

            return { secondaryCoins };
        } catch (error) {
            throw new AppError(error.message, 505);
        }
    }

    // 3. Obtener detalle de una crypto con historial
    async getCryptoDetailWithHistory(cryptoId, { interval = "1d", historyRange = "30d" } = {}) {
        try {
            const coinDetail = await this.CoinGeckoAdap.coinById(cryptoId);
            const historicalData = await this.marketDataAdap.getHistoricalData(coinDetail.binance_symbol, interval);
            return { coinDetail, historicalData };
        } catch (error) {
            throw new AppError(error.message, 505);
        }
    }

    // 4. Obtener datos de conversión para una crypto
    async getConversionData(cryptoId, fiatCurrency = "USD", amountCrypto = 1) {
        try {
            const conversion = await this.CoinGeckoAdap.convertirCryptoAmoneda(cryptoId, fiatCurrency, amountCrypto);
            return { cryptoId, fiatCurrency, amountConverted: conversion };
        } catch (error) {
            throw new AppError(error.message, 505);
        }
    }
}

export default new MarketDataService();
