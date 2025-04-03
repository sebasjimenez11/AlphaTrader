// redisRepository.js
import { createClient } from 'redis';
import AppError from '../utils/appError.js';

export default class RedisRepository {
  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    this.client.on('error', (err) => console.error('Redis Client Error', err));
    this.client.connect().catch(console.error);
  }

  // Obtener un valor de la caché
  async get(key) {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
        throw new AppError('Error al obtner la data del cache', 505);
    }
  }

  // Guardar un valor en la caché con un TTL (en segundos)
  async set(key, value, ttl) {
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error(`Error al guardar la key ${key}:`, error);
    }
  }

  // Eliminar un valor de la caché
  async del(key) {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Error al eliminar la key ${key}:`, error);
    }
  }
}
