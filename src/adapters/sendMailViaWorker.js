import axios from "axios";
import templateID from "../utils/templateId.js";
import AppError from "../utils/appError.js";

export const sendMailViaWorker = async (mail, type, userName, urlToken = "") => {
    let templateId = templateID(type);
    try {
        const response = await axios.post(process.env.WORKER_URL + "/api/send-email", {
            templateId,
            to: mail,
            templateData: {
                Usuario: userName,
                btnUrl: urlToken,
            },
            from: process.env.WORKER_EMAIL
        });
        return response.data;
    } catch (error) {
        console.error("Error al enviar el correo", error);
        // throw new AppError("Error al enviar el correo", 500);
    }
};

export default sendMailViaWorker;