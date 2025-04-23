// src/middlewares/multerValidator.js
import multer from 'multer';
import path from 'path';
import fs from 'fs'; // Importar el módulo de sistema de archivos para la limpieza

// Directorio donde se guardarán temporalmente los archivos
const uploadDir = 'uploads/';

// Crear el directorio 'uploads' si no existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log(`✅ Directorio de subidas temporales creado en ${uploadDir}`);
} else {
    console.log(`📁 Directorio de subidas temporales encontrado en ${uploadDir}`);
}

// Configuración de almacenamiento en disco
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Usar el directorio definido
  },
  filename: (req, file, cb) => {
    const userId = req.tokenId ? req.tokenId : 'unknown';
    cb(null, `profile-${userId}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Filtro para permitir solo ciertos tipos de archivos (imágenes)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true); // Aceptar el archivo
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes.'), false); // Rechazar el archivo
  }
};

// Configurar Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Limite de tamaño del archivo (ej: 5MB)
  }
});

// Middleware para subir un solo archivo con el nombre de campo 'profilePicture'
const uploadSingleImage = upload.single('profilePicture');

export default uploadSingleImage;