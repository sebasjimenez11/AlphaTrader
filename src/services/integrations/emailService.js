import sgMail from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

// Configurar la API Key de SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
/**
 * Enviar un correo electrónico usando SendGrid
 * @param {string} to - Dirección de correo del destinatario
 * @param {string} subject - Asunto del correo
 * @param {string} htmlContent - Contenido en HTML del correo
 * @returns {Promise<object>}
 */
export const sendEmail = async (to, subject, htmlContent) => {
  try {
    const msg = {
      to,
      from: process.env.SENDGRID_SENDER_EMAIL, // Debe estar verificado en SendGrid
      subject,
      html: htmlContent,
    };

    const response = await sgMail.send(msg);
    return response;
  } catch (error) {
    console.error('Error al enviar correo:', error.response?.body || error);
    throw new Error('No se pudo enviar el correo');
  }
};
