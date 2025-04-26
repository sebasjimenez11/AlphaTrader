// geminiService.js
import fetch from 'node-fetch';

const API_KEY = process.env.GEMINI_API_KEY;
const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

class GeminiService {
  constructor(preferencesProfileRepository) {
    this.preferencesProfileRepository = preferencesProfileRepository;

    // --- NUEVO CONTEXTO INICIAL ---
    this.contextoInicial = `Eres un asistente virtual experto y altamente especializado únicamente en el trading de criptomonedas. Tu propósito es proporcionar análisis, estrategias, información de mercado (precios, volumen, tendencias), explicaciones de conceptos de trading (órdenes de mercado, limit, stop-loss, apalancamiento, etc.), y detalles sobre blockchains y tokens específicos, siempre dentro del ámbito de las criptomonedas. Estás integrado en una plataforma de trading de criptoactivos.

    **Reglas Estrictas:**
    1.  **Exclusividad Cripto:** Solo puedes responder preguntas DIRECTAMENTE relacionadas con el trading de criptomonedas, análisis técnico/fundamental de criptoactivos, tecnología blockchain asociada a criptomonedas, exchanges de cripto, billeteras (wallets), y seguridad en el espacio cripto.
    2.  **No Otros Temas:** NO DEBES responder preguntas sobre otros tipos de inversiones (acciones, bonos, forex, bienes raíces), finanzas personales generales (presupuestos, ahorros no relacionados con cripto), ni ningún otro tema fuera del ecosistema cripto (noticias generales, deportes, entretenimiento, tecnología no cripto, etc.).
    3.  **Rechazo Amable:** Si un usuario pregunta sobre un tema no relacionado con criptomonedas, debes responder de forma amable pero firme que tu especialización es exclusivamente el trading y análisis de criptomonedas y no puedes ayudar con otros temas. Por ejemplo: "Mi especialización es el trading de criptomonedas, por lo que no puedo ayudarte con [tema preguntado]. ¿Tienes alguna consulta sobre criptoactivos en la que pueda asistirte?"
    4.  **No Asesoramiento Financiero Personalizado:** Aunque puedes explicar estrategias y conceptos, no debes dar consejos de inversión específicos o personalizados ("compra esta moneda ahora", "invierte X cantidad en Y"). Debes aclarar que la información es para fines educativos e informativos y las decisiones de inversión son responsabilidad del usuario.`;
  }

  // Mantén los métodos #getContexoPreferencias y #getContexoInicial como en la versión anterior
  // si quieres seguir usando las preferencias del usuario además de este contexto base.

  async #getContexoPreferencias(idUser) {
    // Si no tienes o no quieres usar preferencias, puedes simplificar esto
    if (!this.preferencesProfileRepository) return {}; // Manejar si no se inyecta el repo
    try {
        const preferencesProfile = await this.preferencesProfileRepository.findByuserID(idUser);
        return preferencesProfile || {};
    } catch (error) {
        console.error("Error fetching preferences:", error);
        return {}; // Devuelve vacío en caso de error para no romper el flujo
    }
  }

  async #getPromptCompleto(mensaje, idUser) {
    const contextoPreferencias = await this.#getContexoPreferencias(idUser);
    
    // Formatea las preferencias si existen, o indica que no están configuradas
    const preferenciasFormateadas = Object.keys(contextoPreferencias).length > 0
        ? `\n\nPreferencias del Usuario: ${JSON.stringify(contextoPreferencias)}` // O un formato más legible
        : '\n\nPreferencias del Usuario: No configuradas.';

    // Combina contexto inicial, preferencias y el mensaje del usuario
    // Añadimos placeholders claros para el inicio y fin del prompt de usuario
    return `${this.contextoInicial}${preferenciasFormateadas}\n\n--- INICIO MENSAJE USUARIO ---\n${mensaje}\n--- FIN MENSAJE USUARIO ---\n\nAsistente Cripto:`;
  }


  // Modifica llamarGemini para usar el nuevo método que construye el prompt completo
  async llamarGemini(mensaje, idUser) { // Asegúrate de recibir idUser
    const promptFinal = await this.#getPromptCompleto(mensaje, idUser);

    // Añade el mensaje de configuración de preferencias si es necesario
    const preferencesProfile = await this.#getContexoPreferencias(idUser); // Reutiliza la lógica
    let mensajeAdicional = '';
    if (!preferencesProfile || Object.keys(preferencesProfile).length === 0) {
       mensajeAdicional = '\n\n(Nota: Para obtener análisis más alineados a tu perfil, considera configurar tus preferencias de trading.)';
    }

    try {
      const response = await fetch(URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: promptFinal }],
            },
          ],
        }),
      });

      if (!response.ok) {
        // Intenta obtener más detalles del error si es posible
        let errorBody = await response.text();
        try { errorBody = JSON.parse(errorBody); } catch (e) { /* No era JSON */ }
        console.error('Error Body:', errorBody);
        throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
      }

      const datos = await response.json();

      // Validaciones más robustas de la respuesta
      if (!datos.candidates || datos.candidates.length === 0 || !datos.candidates[0].content?.parts?.[0]?.text) {
         // Puede haber casos donde Gemini bloquee la respuesta por seguridad u otros motivos
         const blockReason = datos.promptFeedback?.blockReason;
         const safetyRatings = datos.candidates?.[0]?.safetyRatings;
         console.warn('Respuesta no generada o inesperada. Razón de bloqueo:', blockReason, 'Safety Ratings:', safetyRatings);
         return `No pude generar una respuesta. ${blockReason ? `Motivo: ${blockReason}` : 'Es posible que la pregunta infrinja las políticas de seguridad.'}`;
      }

      let respuestaGemini = datos.candidates[0].content.parts[0].text;

      // Añadir el mensaje sobre configurar preferencias si es necesario
      respuestaGemini += mensajeAdicional;

      return respuestaGemini;

    } catch (error) {
      console.error('Error al llamar a la API de Gemini:', error);
      // Devuelve un mensaje de error más genérico al usuario final
      return 'Hubo un problema al procesar tu solicitud con el asistente IA. Por favor, inténtalo de nuevo más tarde.';
    }
  }
}

export default GeminiService;