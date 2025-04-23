// src/utils/uploadToCloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import AppError from './appError.js'; // Ajusta la ruta si es necesario

// Esta función ASUME que 'cloudinary' ya está configurado globalmente
const uploadToCloudinary = async (filePath, options = {}) => {
  // ... (tu código actual de uploadToCloudinary) ...
  return new Promise((resolve, reject) => {
    // Llama a cloudinary.uploader.upload, que usa la configuración global ya hecha
    cloudinary.uploader.upload(filePath, {
      folder: options.folder || 'profile_pictures',
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      ...options
    }, async (error, result) => {
      // ... (manejo de archivo local y error) ...
       try {
        await fs.promises.unlink(filePath);
      } catch (unlinkError) {
        console.error(`❌ Error al eliminar el archivo local ${filePath}:`, unlinkError);
      }

      if (error) {
        console.error("❌ Error de subida a Cloudinary:", error);
        // Verifica el error de Cloudinary para más detalles si es posible
        console.error("Detalles del error de Cloudinary:", error); // Puede dar más contexto

        const appError = new AppError(`Error al subir la imagen a Cloudinary: ${error.message}`, 500);
        appError.originalError = error;
        // Añade el código del error si está disponible
        if (error.http_code) {
            appError.statusCode = error.http_code; // Usa el código HTTP de Cloudinary si existe
        } else if (error.response && error.response.status) {
             appError.statusCode = error.response.status;
        }

        return reject(appError);
      }
      resolve(result);
    });
  });
};

export default uploadToCloudinary;