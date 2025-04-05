// src/app.js
import express from "express";
import cors from "cors";
import http from "http";
import session from "express-session";
import dotenv from "dotenv";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";

dotenv.config();

// Importa configuraciones y routers para la API REST
import passport from "./config/passport.js";
import authRouter from "./routers/authRouter.js";
import userRouter from "./routers/userRouter.js";
import sequelize from "./config/db.js";
import errorHandler from "./middlewares/errorHandler.js";
import { ejecutarTareaCoins, tareaProgramadaCoins, iniciarTareaPingRedis } from "./utils/task.js";

// Inicializar Express
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Configuración de Redis para sesiones
const redisClient = createClient({
  legacyMode: true,
  url: process.env.REDIS_URL,
  socket: {
    tls: true,
    rejectUnauthorized: false,
  },
});

redisClient.on('error', (err) => {
  console.error('❌ Error en Redis:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Conexión exitosa a Redis');
});

redisClient.on('reconnecting', () => {
  console.warn('🔄 Reintentando conexión a Redis...');
});

// Conectar al cliente Redis
redisClient.connect().catch((err) => {
  console.error('Error conectando a Redis:', err);
});

iniciarTareaPingRedis(redisClient, "*/5 * * * *"); // PING cada 5 minutos
// Configurar la sesión utilizando RedisStore
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.JWT_SECRET || "secret_key",
    resave: false,
    saveUninitialized: false,
  })
);

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

// Montar routers
app.use("/auth", authRouter);
app.use("/user", userRouter);

// Middleware de manejo de errores globales
app.use(errorHandler);

// Tareas programadas
ejecutarTareaCoins();
tareaProgramadaCoins.start();

// Crear servidor HTTP (necesario para Socket.io)
const server = http.createServer(app);

// Inicializar el servidor de WebSocket
import SocketServer from "./sockets/socketServer.js";
const socketServer = new SocketServer(server, {
  allowEIO3: true, // Habilita la compatibilidad con clientes de la versión 3
});
socketServer.init();

// Manejo adecuado de señales para cerrar conexiones de forma ordenada
const gracefulShutdown = () => {
  console.log("Cerrando conexiones...");
  redisClient
    .quit()
    .then(() => {
      console.log("Conexión a Redis cerrada.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error cerrando Redis:", err);
      process.exit(1);
    });
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// Sincronizar la base de datos y levantar el servidor
sequelize
  .sync({ alter: true })
  .then(() => {
    server.listen(process.env.PORT || 3000, () => {
      console.log(`🚀 Servidor corriendo en puerto ${process.env.PORT || 3000}`);
    });
  })
  .catch((error) => {
    console.error("Error al sincronizar la base de datos:", error.message);
  });
