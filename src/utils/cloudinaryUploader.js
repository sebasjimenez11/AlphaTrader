import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs'; // Para limpiar el archivo local
import AppError from './appError.js'; // Asumiendo que tienes una clase AppError

const uploadToCloudinary = async (filePath, options = {}) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(filePath, {
      folder: options.folder || 'profile_pictures', // Opcional: especificar una carpeta en Cloudinary
      use_filename: true, // Opcional: usar el nombre de archivo original
      unique_filename: false, // Opcional: añadir dígitos únicos si el nombre de archivo ya existe
      overwrite: true, // Opcional: sobrescribir si existe un archivo con el mismo nombre
      ...options // Permitir sobrescribir las opciones por defecto
    }, async (error, result) => {
      // Siempre eliminar el archivo local temporal después del intento de subida (éxito o fallo)
      try {
        await fs.promises.unlink(filePath);
      } catch (unlinkError) {
        console.error(`❌ Error al eliminar el archivo local ${filePath}:`, unlinkError);
      }

      if (error) {
        console.error("❌ Error de subida a Cloudinary:", error);
        const appError = new AppError(`Error al subir la imagen a Cloudinary: ${error.message}`, 500);
        appError.originalError = error;
        return reject(appError);
      }
      resolve(result); // result contiene secure_url, public_id, etc.
    });
  });
};

export default uploadToCloudinary;