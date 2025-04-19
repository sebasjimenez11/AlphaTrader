// app.js
import express from "express";
import http from "http";
import dotenv from "dotenv";
import sequelize from "./config/db.js"; // Tu configuración existente de Sequelize
import errorHandler from "./middlewares/errorHandler.js"; // Tu middleware de manejo de errores
import SocketServer from "./sockets/socketServer.js"; // Tu servidor de sockets
import fs from 'fs'; // Necesario para crear el directorio 'uploads'

// --- Importar Módulos de Configuración e Inicialización ---
// Cargar variables de entorno (Debe ser lo primero)
dotenv.config();

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


// Montar Routers - Define la estructura principal de la API (Mantener aquí)
console.log("⚙️ Montando Routers...");
app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/gemini", geminiRouter);
console.log("✅ Routers montados");


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
console.log("✅ WebSocket Server inicializado");


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


// Sincronizar Base de Datos y Levantar Servidor (Mantener aquí - Secuencia de arranque final)
console.log("⚙️ Sincronizando base de datos...");
sequelize.sync({ alter: true }).then(() => { // alter: true intentará modificar tablas existentes, force: true las droppeará y creará
  console.log("✅ Base de datos sincronizada");
  server.listen(process.env.PORT || 3000, () => {
    console.log(`🚀 Servidor corriendo en puerto ${process.env.PORT || 3000}`);
  });
}).catch((error) => {
  console.error("❌ Error al sincronizar la base de datos:", error.message);
  process.exit(1); // Terminar si falla la sincronización de la DB
});