import { Router } from 'express';
import GeminiService from '../services/geminiService.js';
import GeminiController from '../controllers/geminiController.js';
import catchAsync from '../utils/catchAsync.js';

const router = Router();

const geminiService = new GeminiService();
const geminiController = new GeminiController(geminiService);

router.post(
  '/chat',
  catchAsync(geminiController.chat.bind(geminiController))
);

export default router;
