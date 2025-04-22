// src/routes/authRouter.js
import { Router } from 'express';
import userRepository from '../repositories/userRepository.js';
import UserService from '../services/userService.js';
import UserController from '../controllers/userController.js';
import catchAsync from '../utils/catchAsync.js';
import * as validator from '../middlewares/userValidator.js';
import uploadSingleImage from '../middlewares/multerValidator.js';
import validationErrors from '../middlewares/validationResult.js';
import verifyToken from '../middlewares/verifyToken.js';
import checkFilePresence from '../middlewares/checkFilePresence.js';

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

router.put(
  '/imageProfile',
  verifyToken, // Asegura que req.user esté poblado
  uploadSingleImage, // Procesa el archivo 'profilePicture', adjunta a req.file (si existe)
  checkFilePresence, // Verifica que req.file haya sido adjuntado por Multer
  catchAsync(userController.uploadProfileImage.bind(userController)) // Llama al controlador (ahora asume que req.file existe)
);

export default router;
