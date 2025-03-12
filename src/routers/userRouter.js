// routers/authRouter.js
import { Router } from 'express';
import userRepository from '../repositories/userRepository.js';
import UserService from '../services/userService.js';
import UserController from '../controllers/userController.js';
import { sendEmail } from '../services/integrations/emailService.js';
import { generateToken } from '../utils/jwt.js';

const router = Router();

// Inyección de dependencias: se inyecta el repositorio en el servicio y el servicio en el controlador.
const userServiceInstance = new UserService(userRepository);
const userControllerInstance = new UserController(userServiceInstance);

// Registro local
router.post('/register', async (req, res) => {
  try {
    // Se delega en el controlador la lógica de registro
    const user = await userControllerInstance.register(req, res);
    // Generar token usando una función de utilidad
    const token = generateToken(user);
    return res.json({ token });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});




export default router;
