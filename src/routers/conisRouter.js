import Express from 'express';
import CoinsRepository from '../repositories/coinsRepository.js';
import ConisService from '../services/coinService.js';
import CoinsController from '../controllers/coinController.js';
import catchAsync from '../utils/catchAsync.js';

const Router = Express.Router();

// const coinsRepository = CoinsRepository();
// const coinsService = ConisService(coinsRepository);
// const coinsController = CoinsController(coinsService);

// Router.get('/Ranking', catchAsync(coinsController.coinsService.bind(coinsController)));
// Router.get('/CoinList', catchAsync(coinsController.getAllCoins.bind(coinsController)));
// Router.get('/Coin', catchAsync(coinsController.getByCoins.bind(coinsController)));      