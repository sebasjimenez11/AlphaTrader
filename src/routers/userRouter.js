// routers/authRouter.js
import { Router } from 'express';
import userRepository from '../repositories/userRepository.js';
import UserService from '../services/userService.js';
import UserController from '../controllers/userController.js';
import { sendEmail } from '../services/integrations/emailService.js';
import { generateToken } from '../utils/jwt.js';

const router = Router();

// Inyección de dependencias: se inyecta el repositorio en el servicio y el servicio en el controlador.
const userService = new UserService(userRepository);
const userController = new UserController(userService);

// Registro local
router.post('/register', userController.register);




export default router;
