import { Router } from 'express';
import coinsController from '../controllers/coinsController.js';
import coinService from '../services/coinService.js';
import coinGeckoAdapter from '../adapters/coingeckoAdapter.js';
import RedisRepository from '../repositories/redisRepository.js';
import catchAsync from '../utils/catchAsync.js';

const router = Router();

const redisRepositoryInstance = new RedisRepository();
const coinGeckoAdapterInstance = new coinGeckoAdapter(redisRepositoryInstance);
const coinServiceInstance = new coinService(coinGeckoAdapterInstance);
const coinsControllerInstance = new coinsController(coinServiceInstance);

router.get('/coins',catchAsync(coinsControllerInstance.getCoinsList.bind(coinsControllerInstance)));
router.get('/coins/foreign-exchange', catchAsync(coinsControllerInstance.getForeignExchangeAndListCoin.bind(coinsControllerInstance)));
router.get('/coins/convert-crypto-to-fiat', catchAsync(coinsControllerInstance.convertCryptoToFiat.bind(coinsControllerInstance)));

export default router;



