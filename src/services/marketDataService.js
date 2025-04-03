// src/services/unifiedMarketDataService.js
import MarketDataRepository from "../repositories/marketDataRepository.js";
import CoingeckoRepository from "../repositories/coingeckoRepository.js";
import RedisRepository from "../repositories/redisRepository.js";
import AppError from "../utils/appError.js";

class MarketDataService {
    constructor() {
        this.redisRepository = new RedisRepository();
        this.marketDataRepo = new MarketDataRepository(this.redisRepository);
        this.coingeckoRepo = new CoingeckoRepository(this.redisRepository);
    }

    // En unifiedMarketDataService.js
    async getMainCoinsLiveData() {
        try {
            const mainCoins = await this.coingeckoRepo.coinsRanking();
            const symbols = mainCoins.map(coin => coin.symbol + "USDT"); // Ejemplo para Binance

            // Variable para almacenar la última actualización
            let lastUpdate = null;

            // Se suscribe a las actualizaciones en vivo
            const ws = this.marketDataRepo.subscribeToMarketUpdates(symbols, (data) => {
                lastUpdate = data; // Actualiza la variable con el último dato recibido
                // Puedes hacer algo adicional aquí, por ejemplo emitir un evento interno
                // console.log("Actualización en vivo:", data);
            });

            // Retorna la lista de coins, la última actualización (inicialmente null) y la instancia del WebSocket
            return { mainCoins, lastUpdate, ws };
        } catch (error) {
            throw new AppError(error.message, 505);
        }
    }


    // 2. Obtener listado de monedas secundarias
    async getSecondaryCoinsLiveData() {
        try {
            const allCoins = await this.coingeckoRepo.coinsList();
            const ranking = await this.coingeckoRepo.coinsRanking();
            const rankingIds = ranking.map(c => c.id);
            const secondaryCoins = allCoins.filter(coin => !rankingIds.includes(coin.id));
            const symbols = secondaryCoins.map(coin => coin.symbol.toUpperCase() + "USDT");

            let lastUpdate = null;
            const ws = this.marketDataRepo.subscribeToMarketUpdates(symbols, (data) => {
                lastUpdate = data;
                // console.log("Actualización de monedas secundarias:", data);
            });

            return { secondaryCoins, lastUpdate, ws };
        } catch (error) {
            throw new AppError(error.message, 505);
        }
    }

    // 3. Obtener detalle de una crypto con historial
    async getCryptoDetailWithHistory(cryptoId, { interval = "1d", historyRange = "30d" } = {}) {
        try {
            // Detalle de la coin
            const coinDetail = await this.coingeckoRepo.coinById(cryptoId);
            // Obtener datos históricos (puedes ajustar parámetros según historyRange)
            const historicalData = await this.marketDataRepo.getHistoricalData(coinDetail.symbol, interval, { source: "both" });
            return { coinDetail, historicalData };
        } catch (error) {
            throw new AppError(error.message, 505);
        }
    }

    // 4. Obtener datos de conversión para una crypto
    async getConversionData(cryptoId, fiatCurrency = "USD", amountCrypto = 1) {
        try {
            // Usando MarketDataRepository para conversión
            const conversion = await this.coingeckoRepo.convertirCryptoAmoneda(cryptoId, fiatCurrency, amountCrypto);
            return { cryptoId, fiatCurrency, amountConverted: conversion };
        } catch (error) {
            throw new AppError(error.message, 505);
        }
    }
}

export default new MarketDataService();
