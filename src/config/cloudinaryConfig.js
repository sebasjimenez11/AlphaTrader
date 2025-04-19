// src/config/cloudinaryConfig.js
// Importar v2 como cloudinary
import { v2 as cloudinary } from 'cloudinary';

// Asumimos que dotenv.config() ya se llamó en tu archivo principal (app.js)
// antes de que este archivo sea importado. Por lo tanto, process.env
// ya debería tener las variables cargadas.

console.log("⚙️ Configurando Cloudinary...");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true // Usar HTTPS
});

console.log("✅ Cloudinary configurado");
