// src/routes/authRouter.js
import express from "express";
import passport from "passport";
import AuthController from "../controllers/authController.js";
import AuthService from "../services/authService.js";
import UserRepository from "../repositories/userRepository.js";
import { loginValidator, passwordChange, recoveryPassword } from "../middlewares/authValidator.js";
import validationErrors from "../middlewares/validationResult.js";
import catchAsync from "../utils/catchAsync.js";
import PasswordResetToken from "../database/models/tokensRecovery.js";

const router = express.Router();

const authService = new AuthService(UserRepository, PasswordResetToken);
const authController = new AuthController(authService);

// Ruta de login con validación
router.post(
  "/login",
  loginValidator(),
  validationErrors,
  catchAsync(authController.login.bind(authController))
);

// Rutas OAuth con Google
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  catchAsync(authController.oauthCallback.bind(authController))
);

// Rutas OAuth con Facebook
router.get("/facebook", passport.authenticate("facebook", { scope: ["email"] }));
router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { session: false }),
  catchAsync(authController.oauthCallback.bind(authController))
);

router.post("/recover-password",
  recoveryPassword(),
  validationErrors,
  catchAsync(authController.recoverPassword.bind(authController))
);

router.post("/password-change",
  passwordChange(),
  validationErrors,
  catchAsync(authController.passwordChange.bind(authController))
);

export default router;
