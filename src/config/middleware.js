// src/config/middleware.js
import cors from "cors";
import express from "express";
import session from "express-session";
import connectRedis from "connect-redis";
import passport from "./passport.js"; // Importa tu configuración de passport

// Necesitas inicializar RedisStore con el constructor de session
const RedisStore = connectRedis(session);

/**
 * Configura y aplica los middlewares globales a la aplicación Express.
 * @param {express.Application} app - La instancia de la aplicación Express.
 * @param {object} redisClient - El cliente de Redis conectado.
 */
const setupMiddlewares = (app, redisClient) => {
  console.log("⚙️ Configurando Middlewares...");

  // Configurar CORS
  app.use(cors({
    origin: "*", // Considera hacer esto más restrictivo en producción
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true // Importante si usas cookies o encabezados de autorización
  }));

  // Middleware para parsear JSON y datos de formulario
  app.use(express.json());
  app.use(express.urlencoded({ extended: true })); // Para parsear form data no multipart

  // Configurar RedisStore para express-session
  app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.JWT_SECRET || "secret_key", // ¡Usa una variable de entorno real y segura!
    resave: false, // No guardar la sesión si no ha cambiado
    saveUninitialized: false, // No crear sesión hasta que se modifique (ej: login)
    cookie: {
      secure: process.env.NODE_ENV === "production", // true en producción (requiere HTTPS)
      httpOnly: true, // La cookie solo es accesible por el servidor
      maxAge: 1000 * 60 * 60 * 24 // Tiempo de vida de la cookie en milisegundos (1 día)
      // sameSite: 'lax', // Considera añadir SameSite para protección CSRF
    }
  }));

  // Inicializar Passport
  app.use(passport.initialize());
  // Usar passport.session() DESPUÉS de express-session
  app.use(passport.session());

  console.log("✅ Middlewares configurados");
};

export default setupMiddlewares;