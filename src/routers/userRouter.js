// src/routes/authRouter.js
import { Router } from 'express';
import userRepository from '../repositories/userRepository.js';
import UserService from '../services/userService.js';
import UserController from '../controllers/userController.js';
import catchAsync from '../utils/catchAsync.js';
import * as validator from '../middlewares/userValidator.js';
import validationErrors from '../middlewares/validationResult.js';
import { verifyToken } from '../utils/jwt.js';

const router = Router();

const userService = new UserService(userRepository);
const userController = new UserController(userService);

// Registro de usuario
router.post(
  '/register',
  validator.registerValidator(), // Invocación para obtener middlewares de validación
  validationErrors,
  catchAsync(userController.register.bind(userController))
);

// Completar perfil de usuario
router.put(
  '/completeProfile',
  validator.completeProfileValidator(),
  validationErrors,
  verifyToken,
  catchAsync(userController.completeProfile.bind(userController))
);

export default router;
