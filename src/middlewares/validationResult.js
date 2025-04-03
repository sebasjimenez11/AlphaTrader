import { validationResult } from "express-validator";

// Función formateadora de errores
const errorFormatter = ({ location, msg, path, value, nestedErrors }) => {
  return {
    path,
    message: msg,         // Mensaje personalizado
    location,  // Ubicación del error (body, query, etc.)
  };
};

const validationErrors = (req, res, next) => {
  const errors = validationResult(req).formatWith(errorFormatter);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: false, message: 'Error en la validacion de parametros',errors: errors.array() });
  }
  next();
};

export default validationErrors;
