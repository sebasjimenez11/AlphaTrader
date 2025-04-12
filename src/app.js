import express from "express";
import cors from "cors";
import http from "http";
import session from "express-session";
import dotenv from "dotenv";
import { createClient } from "redis";
import connectRedis from "connect-redis";
import passport from "./config/passport.js";
import authRouter from "./routers/authRouter.js";
import userRouter from "./routers/userRouter.js";
import geminiRouter from "./routers/geminiRouter.js";
import sequelize from "./config/db.js";
import errorHandler from "./middlewares/errorHandler.js";
import { ejecutarTareaCoins, tareaProgramadaCoins, iniciarTareaPingRedis } from "./utils/task.js";
import SocketServer from "./sockets/socketServer.js";

// Cargar variables de entorno
dotenv.config();

// Inicializar Express
const app = express();

// Configurar CORS
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Middleware para parsear JSON
app.use(express.json());

// Construir la URL de conexión a Redis
const protocol = process.env.REDIS_TLS === "true" ? "rediss" : "redis";
const redisUrl = `${protocol}://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

const redisClient = createClient({
  url: redisUrl,
  socket: {
    tls: process.env.REDIS_TLS === "true",
    rejectUnauthorized: false,
  },
});


redisClient.on("error", (err) => {
  console.error("❌ Error en Redis:", err);
});

redisClient.on("connect", () => {
  console.log("✅ Conexión exitosa a Redis");
});

await redisClient.connect();

// Iniciar tarea de PING a Redis cada 2 minutos
iniciarTareaPingRedis(redisClient, "*/2 * * * *");

// Configurar RedisStore para express-session
const RedisStore = connectRedis(session);

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.JWT_SECRET || "secret_key",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 1 día
  }
}));

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

// Definir ruta raíz
app.get("/", (req, res) => {
  res.send("¡Bienvenido a AlphaTrader!");
});

// Montar routers
app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/gemini", geminiRouter);

// Middleware de manejo de errores
app.use(errorHandler);

// Ejecutar tareas programadas
ejecutarTareaCoins();
tareaProgramadaCoins.start();

// Crear servidor HTTP
const server = http.createServer(app);

// Inicializar servidor de WebSocket
const socketServer = new SocketServer(server, {
  allowEIO3: true
});
socketServer.init();

// Manejo de cierre gracioso
const gracefulShutdown = () => {
  console.log("Cerrando conexiones...");
  redisClient.quit().then(() => {
    console.log("Conexión a Redis cerrada.");
    process.exit(0);
  }).catch((err) => {
    console.error("Error cerrando Redis:", err);
    process.exit(1);
  });
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// Sincronizar base de datos y levantar servidor
sequelize.sync({ alter: true }).then(() => {
  server.listen(process.env.PORT || 3000, () => {
    console.log(`🚀 Servidor corriendo en puerto ${process.env.PORT || 3000}`);
  });
}).catch((error) => {
  console.error("Error al sincronizar la base de datos:", error.message);
});
