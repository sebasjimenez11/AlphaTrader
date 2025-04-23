// src/config/redis.js
import { createClient } from "redis";
// No necesitamos dotenv.config() aquí si ya se llamó en app.js antes de importarlo
import { iniciarTareaPingRedis } from "../utils/task.js"; // Importa la tarea de ping

/**
 * Configura y conecta el cliente de Redis.
 * @returns {Promise<object>} El cliente de Redis conectado.
 */
const connectRedisClient = async () => {

  const redisClient = createClient({
    url: process.env.REDIS_URL,
  });

  redisClient.on("error", (err) => {
    console.error("❌ Error en Redis:", err);
    // Aquí podrías añadir lógica de reconexión si es necesario
  });

  redisClient.on("connect", () => {
    console.log("✅ Conexión exitosa a Redis");
  });

  try {
    await redisClient.connect();

    // Iniciar tarea de PING a Redis una vez que el cliente está conectado
    // La tarea de ping se mantiene aquí porque depende directamente del cliente.
    iniciarTareaPingRedis(redisClient, "*/2 * * * *"); // Programada cada 2 minutos

    return redisClient;
  } catch (error) {
    console.error("❌ Falló la conexión inicial a Redis:", error);
    throw error; // Relanza el error para que app.js lo maneje al inicio
  }
};

export default connectRedisClient;