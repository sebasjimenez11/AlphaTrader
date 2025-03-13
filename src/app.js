import express from "express";
import session from "express-session";
import dotenv from "dotenv";
dotenv.config();

import passport from "./config/passport.js";
import authRouter from "./routers/authRouter.js";
import sequelize from "./database/db.js"; // Conexión a la BD
import userRouter from "./routers/userRouter.js";

const app = express();
app.use(express.json());

// Configuración de sesiones (si usas sesiones con Passport)
app.use(
  session({
    secret: process.env.JWT_SECRET || "secret_key",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Rutas de autenticación y usuario
app.use("/auth", authRouter);
app.use("/user", userRouter);

// Crear servidor HTTP (necesario para WebSocket)
const server = http.createServer(app);

// Configurar WebSocket
const wss = new WebSocketServer({ server });

// Manejo de conexiones WebSocket
wss.on("connection", (ws) => {
  console.log("Cliente conectado");

  // Enviar un mensaje de bienvenida al cliente
  ws.send(JSON.stringify({ event: "welcome", message: "Bienvenido al WebSocket!" }));

  // Escuchar mensajes del cliente
  ws.on("message", (message) => {
    console.log("Mensaje recibido:", message.toString());

    // Responder al cliente con un mensaje de eco
    ws.send(JSON.stringify({ event: "response", message: `Eco: ${message.toString()}` }));
  });

  ws.on("close", () => console.log("Cliente desconectado"));
});

// Sincronizar la BD y levantar el servidor
sequelize.sync({ alter: true }).then(() => {
  server.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor corriendo en puerto ${process.env.PORT || 3000}`);
  });
});