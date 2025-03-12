import express from "express";
import passport from "passport";
import AuthController from "../controllers/authController.js";
import AuthService from "../services/authService.js";
import UserRepository from "../repositories/userRepository.js";
import { loginValidator } from "../middlewares/authValidator.js";

const authService = new AuthService(UserRepository);
const authController = new AuthController(authService);

const router = express.Router();

// Ruta de login con validación
router.post("/login", loginValidator, (req, res) => authController.login(req, res));

// Rutas OAuth con Google
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback", passport.authenticate("google", { session: false }), (req, res) =>
  authController.oauthCallback(req, res)
);

// Rutas OAuth con Facebook
router.get("/facebook", passport.authenticate("facebook", { scope: ["email"] }));
router.get("/facebook/callback", passport.authenticate("facebook", { session: false }), (req, res) =>
  authController.oauthCallback(req, res)
);

export default router;
