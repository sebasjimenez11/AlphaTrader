// src/utils/task.js
import cron from 'node-cron';
import TaskService from '../services/taskService.js';

const taskService = new TaskService();

// Función para ejecutar la lógica de actualización
export const ejecutarTareaCoins = async () => {
  try {
    await taskService.getCoinsBinance();
    await taskService.getCoinsCoingecko();
    await taskService.getCoinsRanking();
    console.log(`[INIT] Tareas iniciales completadas`);
  } catch (error) {
    console.error(`[INIT] Error ejecutando tareas: ${error.message}`);
  }
};

// Tarea programada cada hora
export const tareaProgramadaCoins = cron.schedule('0 * * * *', async () => {
  try {
    await taskService.getCoinsBinance();
    await taskService.getCoinsCoingecko();
    await taskService.getCoinsRanking();
    console.log(`[CRON] Tarea programada completada con éxito - ${new Date().toLocaleString()}`);
  } catch (error) {
    console.error(`[CRON] Error en tarea programada: ${error.message}`);
  }
});
