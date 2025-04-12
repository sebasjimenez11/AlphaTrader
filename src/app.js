import express from "express";
import cors from "cors";
import http from "http";
import session from "express-session";
import dotenv from "dotenv";
import { createClient } from "redis";
import connectRedis from "connect-redis";

// Cargar variables de entorno desde .env
dotenv.config();

// Importa configuraciones y routers para la API REST
import passport from "./config/passport.js";
import authRouter from "./routers/authRouter.js";
import userRouter from "./routers/userRouter.js";
import sequelize from "./config/db.js";
import errorHandler from "./middlewares/errorHandler.js";
import gemini from "./routers/geminiRouter.js";
import { ejecutarTareaCoins, tareaProgramadaCoins, iniciarTareaPingRedis } from "./utils/task.js";

// Inicializar Express
const app = express();
app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Crear y configurar el cliente de Redis usando variables de entorno
const redisClient = createClient({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT) || 6379,
    connectTimeout: 10000, // Tiempo de espera de 10 segundos
    tls: process.env.REDIS_TLS === "true", // Configuración para TLS
    rejectUnauthorized: true,
    keepAlive: 5000,
  },
});

// Manejo de eventos del cliente Redis
redisClient.on("error", (err) => {
  console.error("❌ Error en Redis:", err);
});
redisClient.on("connect", () => {
  console.log("✅ Conexión exitosa a Redis");
});
redisClient.on("reconnecting", () => {
  console.warn("🔄 Reintentando conexión a Redis...");
});
redisClient.on("end", () => {
  console.log("🔌 Conexión a Redis cerrada");
});

// Conectar al cliente Redis
await redisClient.connect().catch((err) => {
  console.error("Error conectando a Redis:", err);
});

// Iniciar tarea de PING a Redis cada 2 minutos
iniciarTareaPingRedis(redisClient, "*/2 * * * *");

// Configurar RedisStore para express-session
const RedisStore = connectRedis(session);

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.JWT_SECRET || "secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Uso de cookies seguras en producción
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 día
    },
  })
);

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

// Definir una ruta para la página de inicio
app.get("/", (req, res) => {
  res.send("¡Bienvenido a AlphaTrader!");
});

// Montar routers
app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/gemini", gemini);

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
