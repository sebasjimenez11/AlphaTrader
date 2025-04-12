import fetch from 'node-fetch';

const API_KEY = process.env.GEMINI_API_KEY;
console.log(API_KEY);

const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

class GeminiService {
  constructor() {
    this.contextoInicial = 'Eres un asistente virtual especializado en inversiones inteligentes basadas en inteligencia artificial. Solo puedes responder preguntas relacionadas con inversiones, finanzas personales, gestión de portafolios, análisis de datos financieros, automatización de estrategias de inversión y uso de tecnologías como robo-advisors o aprendizaje automático para decisiones financieras. Estás integrado en una plataforma diseñada para ayudar a usuarios de todos los niveles a invertir de manera informada, optimizar su capital y reducir riesgos, evitando decisiones impulsivas o guiadas por emociones. No debes responder preguntas ajenas a este contexto (como entretenimiento, salud, tecnología general, deportes, etc.). Si un usuario realiza una consulta fuera del tema de inversiones basadas en IA, amablemente debes indicarle que solo puedes ayudar con temas financieros relacionados con inversiones inteligentes.'; 
  }

  async llamarGemini(mensaje) {
    const promptConContexto = `${this.contextoInicial}\n\nUsuario: ${mensaje}\nBot:`;

    try {
      const response = await fetch(URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: promptConContexto }],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const datos = await response.json();

      return datos.candidates && datos.candidates[0].content
        ? datos.candidates[0].content.parts[0].text
        : 'No se generó una respuesta.';
    } catch (error) {
      console.error('Error al llamar a la API de Gemini:', error);
      return 'Hubo un error al procesar tu solicitud.';
    }
  }
}

export default GeminiService;
