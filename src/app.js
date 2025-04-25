// app.js
import express from "express";
import http from "http";
import dotenv from "dotenv";
// ... otros imports ...
import sequelize from "./config/db.js";
import errorHandler from "./middlewares/errorHandler.js";
import SocketServer from "./sockets/socketServer.js"; // Importar clase
import marketDataService from "./services/marketDataService.js"; 
import fs from 'fs';
import * as models from './database/models/index.js';
import { syncModels } from './database/models/index.js';
import './config/cloudinaryConfig.js';
import connectRedisClient from './config/redis.js';
import setupMiddlewares from './config/middleware.js';
import startScheduledTasks from './config/tasks.js';

import authRouter from "./routers/authRouter.js";
import userRouter from "./routers/userRouter.js";
import geminiRouter from "./routers/geminiRouter.js";

import preferencesProfileRouter from "./routers/preferencesProfileRouter.js";

// --- Cargar .env ---
const dotenvResult = dotenv.config();
if (dotenvResult.error) { console.error('Error loading .env file:', dotenvResult.error); }

const app = express();

// --- Crear directorio uploads ---
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); console.log('Created uploads directory'); }

// --- Conectar Redis ---
let redisClient;
try {
  redisClient = await connectRedisClient();
} catch (error) {
  console.error("❌ Error crítico al conectar a Redis. Terminando...", error);
  process.exit(1);
}

// --- Middlewares globales ---
setupMiddlewares(app, redisClient);

// --- Rutas ---
app.get("/", (req, res) => res.send("¡Bienvenido a AlphaTrader!"));
app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/gemini", geminiRouter);
app.use("/preferencesProfile", preferencesProfileRouter);

// --- Error Handler ---
app.use(errorHandler);

// --- Tareas Programadas ---
startScheduledTasks();

// --- Servidor HTTP ---
const server = http.createServer(app);

// --- Servidor WebSocket ---
// Pasar opciones si es necesario, como allowEIO3
const socketServer = new SocketServer(server, { allowEIO3: true });
socketServer.init(); // Inicia el servidor Socket.IO y la escucha de conexiones

// --- Cierre Gracioso ---
const gracefulShutdown = async () => {
  console.log(" Iniciando cierre gracioso...");
  try {
    // 1. Cerrar conexiones WebSocket ANTES de cerrar otros servicios
    if (socketServer) {
      await socketServer.closeAllConnections(); // Esperar a que se limpien los sockets
    } else {
       console.warn("Instancia de SocketServer no encontrada para cierre gracioso.");
    }

    // 2. Cerrar Redis
    if (redisClient) {
      await redisClient.quit();
      console.log("Cliente Redis desconectado.");
    }

    // 3. Cerrar Sequelize
    await sequelize.close();
    console.log("Conexión Sequelize cerrada.");

    // 4. Cerrar el servidor HTTP
    server.close((err) => {
      if (err) {
           console.error("Error cerrando el servidor HTTP:", err);
           process.exit(1); // Salir con error si el cierre falla
      } else {
          console.log("Servidor HTTP cerrado.");
          process.exit(0); // Salir limpiamente
      }
    });

  } catch (err) {
    console.error("Error durante el cierre gracioso:", err);
    process.exit(1); // Salir con error
  }

  // Timeout por si algo se cuelga
  setTimeout(() => {
    console.error(" Cierre gracioso forzado después de 10 segundos.");
    process.exit(1);
  }, 10000);
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// --- Iniciar Servidor ---
try {
  await syncModels(false);
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  });
} catch (error) {
  console.error("❌ Error al sincronizar la base de datos o iniciar el servidor:", error);
  process.exit(1);
}