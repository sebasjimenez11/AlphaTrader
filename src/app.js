// src/app.js
import express from "express";
import cors from 'cors';
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
import initStockendRouter from "./routers/stockendRouter.js";

// Inicializar Express
const app = express();
app.use(express.json());
app.use(cors());

// Configuración de Redis para sesiones
const redisClient = createClient({
  legacyMode: true,
  url: process.env.REDIS_URL || "redis://localhost:6379",
});
redisClient.connect().catch(console.error);

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
// Otras rutas...

// Middleware de manejo de errores globales
app.use(errorHandler);

// Tareas programadas
import { ejecutarTareaCoins, tareaProgramadaCoins } from "./utils/task.js";
ejecutarTareaCoins();
tareaProgramadaCoins.start();


// Crear servidor HTTP (necesario para Socket.io)
const server = http.createServer(app);

// Inicializar el servidor de WebSocket
import SocketServer from "./sockets/socketServer.js";
const socketServer = new SocketServer(server,{
    allowEIO3: true // Habilita la compatibilidad con clientes de la versión 3
  });
  
socketServer.init();

// ------------------------------
// Sincronizar la BD y levantar el servidor
// ------------------------------
sequelize.sync({ alter: true }).then(() => {
server.listen(process.env.PORT || 3000, () => {
    console.log(`🚀 Servidor corriendo en puerto ${process.env.PORT || 3000}`);
  });
});
