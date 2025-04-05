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


/**
 * Función que configura una tarea programada para enviar un PING a Redis.
 * @param {Object} redisClient - Cliente de Redis ya inicializado y conectado.
 * @param {string} schedule - Expresión cron que define la frecuencia de ejecución.
 */
export function iniciarTareaPingRedis(redisClient, schedule = '* * * * *') {
  // Verifica que el cliente de Redis esté conectado
  if (!redisClient.isOpen) {
    console.error('El cliente de Redis no está conectado.');
    return;
  }

  // Programa la tarea utilizando la expresión cron proporcionada
  const tarea = cron.schedule(schedule, async () => {
    try {
      await redisClient.ping();
      console.log('Ping a Redis exitoso');
    } catch (err) {
      console.error('Error en ping de Redis:', err);
    }
  });

  console.log('Tarea programada para enviar PING a Redis iniciada.');

  // Retorna la tarea por si se necesita detenerla o manipularla posteriormente
  return tarea;
}