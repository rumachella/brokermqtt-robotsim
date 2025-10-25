// src/services/webhookSender.js
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const WEBHOOK_ENDPOINT = process.env.WEBHOOK_ENDPOINT;
if (!WEBHOOK_ENDPOINT) {
  console.warn(" No se encontró WEB HOOK ENDPOINT en las variables de entorno");
}

/**
 * Envía datos al endpoint de debug del backend
 * @param {Object} commandData - Datos del comando a enviar
 */
export const sendToDebug = async (commandData) => {
  try {
    await axios.post(WEBHOOK_ENDPOINT, commandData);
    console.log("📤 Enviado al endpoint debug:", commandData);
  } catch (err) {
    console.error("⚠️ Error reenviando al debug endpoint:", err.message);
  }
};
