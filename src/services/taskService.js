import RedisRepository from '../repositories/redisRepository.js';
import CoingeckoAdapter from '../adapters/coingeckoAdapter.js';
import AppError from '../utils/appError.js';


class TaskService {
    constructor() {
        this.redisRepository = new RedisRepository();
        this.CoingeckoAdapter = new CoingeckoAdapter(this.redisRepository);
    }

    // async getCoinsBinance() {
    //     try {
    //         const coinsListBinance = await this.CoingeckoAdapter.getBinanceCoins();
    //         if (!coinsListBinance) {
    //             throw new AppError('No se pudo obtener la lista de monedas de Binance', 404);
    //         }
    //         // Guardar la lista de monedas en Redis con un TTL de 1 hora
    //         await this.redisRepository.set('coinsListBinance', coinsListBinance, 3600);
    //     } catch (e) {
    //         throw new AppError(`Error al obtener monedas de Binance: ${e.message}`, 505);
    //     }
    // }

    async getCoinsCoingecko() {
        try {
            const coinsListCoingecko = await this.CoingeckoAdapter.coinsList();
            if (!coinsListCoingecko) {
                throw new AppError('No se pudo obtener la lista de monedas de Coingecko', 404);
            }
            // Guardar la lista de monedas en Redis con un TTL de 1 hora
            await this.redisRepository.set('coinsListCoingecko', coinsListCoingecko, 3600);
        } catch (e) {
            throw new AppError(`Error al obtener monedas de Coingecko: ${e.message}`, 505);
        }
    }

    async getCoinsRanking() {
        try {
            const coinsRanking = await this.CoingeckoAdapter.coinsRanking();
            if (!coinsRanking) {
                throw new AppError('No se pudo obtener el ranking de monedas', 404);
            }
            // Guardar el ranking en Redis con un TTL de 1 hora
            await this.redisRepository.set('coinsRanking', coinsRanking, 3600);
        } catch (e) {
            throw new AppError(`Error al obtener el ranking de monedas: ${e.message}`, 505);
        }
    }
}

export default TaskService;