import { body } from 'express-validator';
import moment from 'moment';
import allowedDomains from '../config/allowedDomains.js';

/**
 * Valida que el campo de tipo string no esté vacío
 * @param {string} fieldName - Nombre del campo a validar
 * @param {string} [errorMessage] - Mensaje de error opcional
 */
export const validateStringField = (fieldName, errorMessage = `El campo ${fieldName} es requerido`) => {
  return body(fieldName)
    .notEmpty().withMessage(errorMessage)
    .isString().withMessage(`El campo ${fieldName} debe ser un string`);
};

/**
 * Valida que el campo email tenga un formato correcto y que el dominio esté permitido
 * @param {string} fieldName - Nombre del campo de email
 */
export const validateEmailField = (fieldName) => {
  return body(fieldName)
    .notEmpty().withMessage('El correo es requerido')
    .isEmail().withMessage('Debe ser un correo electrónico válido')
    .custom(value => {
      const domain = value.split('@')[1];
      if (!allowedDomains.includes(domain)) {
        throw new Error('Dominio de correo no permitido');
      }
      return true;
    });
};

/**
 * Valida que la contraseña cumpla con los criterios de seguridad:
 * - Al menos 8 caracteres.
 * - Contener al menos un número, una letra minúscula, una mayúscula y un carácter especial.
 * @param {string} fieldName - Nombre del campo password
 */
export const validatePasswordField = (fieldName) => {
  return body(fieldName)
    .notEmpty().withMessage("La contraseña es requerida")
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/\d/).withMessage('La contraseña debe contener al menos un número')
    .matches(/[a-z]/).withMessage('La contraseña debe contener al menos una letra minúscula')
    .matches(/[A-Z]/).withMessage('La contraseña debe contener al menos una letra mayúscula')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('La contraseña debe contener al menos un carácter especial');
};

/**
 * Valida que el campo de fecha tenga un formato válido y no sea una fecha futura.
 * @param {string} fieldName - Nombre del campo de fecha
 * @param {string} [dateFormat='YYYY-MM-DD'] - Formato de fecha a utilizar
 */
export const validateDateField = (fieldName, dateFormat = 'YYYY-MM-DD') => {
  return body(fieldName)
    .notEmpty().withMessage(`El campo ${fieldName} es requerido`)
    .custom(value => {
      const date = moment(value, dateFormat, true);
      if (!date.isValid()) {
        throw new Error(`Formato de fecha no válido. Use el formato ${dateFormat}`);
      }
      if (date.isAfter(moment())) {
        throw new Error('La fecha no puede ser mayor al día de hoy');
      }
      return true;
    });
};

/**
 * Valida que la fecha de nacimiento indique que el usuario es mayor de 18 años.
 * @param {string} fieldName - Nombre del campo de fecha de nacimiento
 * @param {string} [dateFormat='YYYY-MM-DD'] - Formato de fecha a utilizar
 */
export const validateDateOfBirthField = (fieldName, dateFormat = 'YYYY-MM-DD') => {
  return body(fieldName)
    .notEmpty().withMessage('La fecha de nacimiento es requerida')
    .custom(value => {
      const date = moment(value, dateFormat, true);
      if (!date.isValid()) {
        throw new Error(`Formato de fecha no válido. Use el formato ${dateFormat}`);
      }
      const age = moment().diff(date, 'years');
      if (age < 18) {
        throw new Error('Debes ser mayor de 18 años');
      }
      return true;
    });
};

/**
 * Valida que el campo numérico no esté vacío y que sea numérico.
 * @param {string} fieldName - Nombre del campo numérico
 * @param {string} [errorMessage] - Mensaje de error opcional
 */
export const validateNumericField = (fieldName, errorMessage = `El campo ${fieldName} es requerido`) => {
  return body(fieldName)
    .notEmpty().withMessage(errorMessage)
    .isNumeric().withMessage(`El campo ${fieldName} debe ser numérico`);
};

/**
 * Valida que el campo opcional de tipo string, si se proporciona, no esté vacío y sea un string.
 * @param {string} fieldName - Nombre del campo opcional
 * @param {string} [errorMessage] - Mensaje de error opcional
 */
export const validateOptionalStringField = (fieldName, errorMessage = `El campo ${fieldName} debe ser un string`) => {
  return body(fieldName)
    .optional()
    .notEmpty().withMessage(`Si se proporciona, el campo ${fieldName} no puede estar vacío`)
    .isString().withMessage(errorMessage);
};

/**
 * Valida que el campo teléfono tenga un formato válido de número de teléfono.
 * @param {string} fieldName - Nombre del campo teléfono
 */
export const validatePhoneField = (fieldName) => {
  return body(fieldName)
    .notEmpty().withMessage("El teléfono es requerido")
    .isMobilePhone("any").withMessage("Número de teléfono no válido");
};

/**
 * Valida que se hayan aceptado los términos y condiciones.
 * @param {string} fieldName - Nombre del campo que representa la aceptación de términos
 */
export const validateAcceptedTermsField = (fieldName) => {
  return body(fieldName)
    .custom(value => {
      if (value !== true && value !== "true") {
        throw new Error("Debes aceptar los términos y condiciones");
      }
      return true;
    });
};
