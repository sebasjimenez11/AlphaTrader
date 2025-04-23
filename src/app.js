// app.js
import express from "express";
import http from "http";
import dotenv from "dotenv";

// --- Cargar variables de entorno (DEBE SER LA PRIMERA COSA QUE SE EJECUTE SECUENCIALMENTE) ---
const dotenvResult = dotenv.config(); // <-- Captura el resultado
if (dotenvResult.error) {
  console.error('Error loading .env file:', dotenvResult.error); // <-- **AÑADE ESTO**
} else
  dotenvResult.parsed;

import sequelize from "./config/db.js";
import errorHandler from "./middlewares/errorHandler.js";
import SocketServer from "./sockets/socketServer.js";
import fs from 'fs';

import * as models from './database/models/index.js';
import { syncModels } from './database/models/index.js';

// --- Importar Módulos de Configuración e Inicialización ---
// Cargar variables de entorno (Debe ser lo primero)

// Configurar Cloudinary (solo importar para ejecutar la configuración)
import './config/cloudinaryConfig.js';

// Conectar a Redis y obtener el cliente (es async)
import connectRedisClient from './config/redis.js';

// Configurar middlewares globales (necesita la app y el cliente Redis)
import setupMiddlewares from './config/middleware.js';

// Iniciar tareas programadas
import startScheduledTasks from './config/tasks.js';

// --- Importar Routers ---
import authRouter from "./routers/authRouter.js";
import userRouter from "./routers/userRouter.js"; // Asegúrate que tu userRouter incluye la ruta de subida
import geminiRouter from "./routers/geminiRouter.js";
import preferencesProfileRouter from "./routers/preferencesProfileRouter.js";
// --- Proceso de Inicialización de la Aplicación ---

// Inicializar Express (Corazón de app.js)
const app = express();

// Crear el directorio 'uploads' si no existe (Puedes mantenerlo aquí o moverlo a un archivo de setup general si tienes más inicializaciones FS)
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log('Created uploads directory');
}

// Conectar a Redis - Lógica de arranque crítica
let redisClient;
try {
  redisClient = await connectRedisClient(); // Esperar la conexión de Redis
} catch (error) {
  console.error("❌ Error crítico al conectar a Redis. Terminando la aplicación.");
  process.exit(1); // Terminar si no se puede conectar a Redis
}

// Configurar Middlewares Globales - Pasar la instancia 'app' y el cliente Redis
setupMiddlewares(app, redisClient);


// Definir ruta raíz (Opcional, puede quedarse o ir a un router)
app.get("/", (req, res) => {
  res.send("¡Bienvenido a AlphaTrader!");
});

app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/gemini", geminiRouter);
app.use("/preferencesProfile", preferencesProfileRouter);

// Middleware de Manejo de Errores - Siempre al final (Mantener aquí)
app.use(errorHandler);


// Iniciar Tareas Programadas
startScheduledTasks();


// Crear Servidor HTTP (Mantener aquí)
const server = http.createServer(app);


// Inicializar Servidor de WebSocket (Mantener aquí o mover si su setup es complejo)
const socketServer = new SocketServer(server, {
  allowEIO3: true
});
socketServer.init();

// Manejo de Cierre Gracioso (Mantener aquí - Lógica de ciclo de vida)
const gracefulShutdown = async () => {
  console.log("Cerrando conexiones...");
  try {
    // Cerrar Redis (si existe el cliente)
    if (redisClient) {
      await redisClient.quit();
      console.log("Redis client disconnected.");
    }

    // Cerrar Sequelize
    await sequelize.close();
    console.log("Sequelize connection closed.");

    // Cerrar el servidor HTTP (permite que las peticiones en curso terminen)
    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0); // Salir sin error
    });

  } catch (err) {
    console.error("Error durante el cierre gracioso:", err);
    process.exit(1); // Salir con error
  }

  // Forzar salida después de un tiempo si el cierre gracioso se cuelga
  setTimeout(() => {
    console.error("Cierre gracioso forzado después de timeout.");
    process.exit(1);
  }, 10000); // 10 segundos de timeout
};

process.on("SIGINT", gracefulShutdown); // Ctrl+C
process.on("SIGTERM", gracefulShutdown); // kill command

try {
  await syncModels(false); // false para alter, true para force
  server.listen(process.env.PORT || 3000, () => {
    console.log(`🚀 Servidor corriendo en puerto ${process.env.PORT || 3000}`);
  });
} catch (error) {
  console.error("❌ Error al sincronizar la base de datos:", error);
  process.exit(1);
}