import { Router } from 'express';
import GeminiService from '../services/geminiService.js';
import GeminiController from '../controllers/geminiController.js';
import PreferencesProfileRepository from '../repositories/preferencesProfileRepository.js'; 
import catchAsync from '../utils/catchAsync.js';
import verifyToken from '../middlewares/verifyToken.js';

const router = Router();

const preferencesProfileRepository = new PreferencesProfileRepository(); 
const geminiService = new GeminiService(preferencesProfileRepository); 
const geminiController = new GeminiController(geminiService);

router.post(
  '/chat',
  verifyToken, // Asume que verifyToken añade req.user.id o similar
  catchAsync(geminiController.chat.bind(geminiController))
);

export default router;