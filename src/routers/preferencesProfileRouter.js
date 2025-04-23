import { Router } from 'express';
import PreferencesProfileRepository from '../repositories/preferencesProfileRepository.js';
import PreferencesProfileService from '../services/PreferencesProfileService.js';
import PreferencesProfileController from '../controllers/PreferencesProfileController.js';
import catchAsync from '../utils/catchAsync.js';
import * as validator from '../middlewares/preferencesProfileValidator.js';
import validationErrors from '../middlewares/validationResult.js';
import verifyToken from '../middlewares/verifyToken.js';
import RedisRepository from '../repositories/redisRepository.js';
import CoinGeckoAdapter from '../adapters/coingeckoAdapter.js';

const redisRepository = new RedisRepository();
const coinGeckoAdapter = new CoinGeckoAdapter(redisRepository);
const preferenceProfileRepository = new PreferencesProfileRepository();
const preferenceProfileService = new PreferencesProfileService(preferenceProfileRepository, coinGeckoAdapter);
const preferenceProfileController = new PreferencesProfileController(preferenceProfileService);

const router = Router();

router.post('/Create',
    validator.validateCreateProfile,
    validationErrors,
    verifyToken,
    catchAsync(preferenceProfileController.createPreferencesProfile.bind(preferenceProfileController))
);

router.get('/Profile',
    verifyToken,
    catchAsync(preferenceProfileController.getPreferencesProfile.bind(preferenceProfileController))
);

router.patch('/Update',
    validator.validateCreateProfile,
    validationErrors,
    verifyToken,
    catchAsync(preferenceProfileController.updatePreferencesProfile.bind(preferenceProfileController))
);

router.delete('/Delete',
    verifyToken,
    catchAsync(preferenceProfileController.deletePreferencesProfile.bind(preferenceProfileController))
);

router.get('/GetCoinsList',
    catchAsync(preferenceProfileController.getCoinsList.bind(preferenceProfileController))
);

export default router;