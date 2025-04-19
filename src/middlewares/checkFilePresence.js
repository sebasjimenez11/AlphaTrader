// src/middlewares/checkFilePresence.js

const checkFilePresence = (req, res, next) => {
    if (!req.file) {
        res.status(400).json({
            status: false,
            message: 'No se proporcionó ningún archivo para subir o el nombre del campo es incorrecto.',
            data: null
        });
    }
    next();
};

export default checkFilePresence;