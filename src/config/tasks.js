// src/config/tasks.js
// Asumimos que importar estas funciones es suficiente para ejecutarlas o configurarlas
import { ejecutarTareaCoins, tareaProgramadaCoins } from "../utils/task.js";
// La tarea de ping de Redis la movimos a src/config/redis.js

/**
 * Inicializa y arranca las tareas programadas de la aplicación (excepto la de Redis Ping).
 */
const startScheduledTasks = () => {
  console.log("⚙️ Iniciando Tareas Programadas...");
  // Ejecutar la tarea de monedas inmediatamente al inicio
  ejecutarTareaCoins();
  // Iniciar la tarea programada cron para las monedas
  tareaProgramadaCoins.start();
  console.log("✅ Tareas programadas iniciadas");
};

export default startScheduledTasks;