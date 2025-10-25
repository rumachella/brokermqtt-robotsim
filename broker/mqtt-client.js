import mqtt from "mqtt";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { sendToDebug } from "./webhookSender.js";

dotenv.config();

const MQTT_HOST = process.env.MQTT_HOST;
const MQTT_PORT = process.env.MQTT_PORT || 8883;
const MQTT_USER = process.env.MQTT_USER;
const MQTT_PASS = process.env.MQTT_PASS;

const clientId = `bridge-${Math.random().toString(16).slice(2, 8)}`;
const connectUrl = `mqtts://${MQTT_HOST}:${MQTT_PORT}`;

const opts = {
  clientId,
  username: MQTT_USER,
  password: MQTT_PASS,
  protocol: "mqtts",
  keepalive: 60,
  reconnectPeriod: 5000,
  rejectUnauthorized: true,
};

const client = mqtt.connect(connectUrl, opts);

client.on("connect", () => {
  console.log("✅ Conectado a HiveMQ Cloud:", connectUrl);

  // Suscripción a los 4 topics
  client.subscribe("/tenant/1/robot/ack", { qos: 1 });
  client.subscribe("/tenant/1/robot/status", { qos: 1 });
  client.subscribe("/tenant/1/robot/image", { qos: 1 });
  client.subscribe("/tenant/1/robot/obstacle", { qos: 1 });
});

client.on("error", (err) => console.error("❌ MQTT error:", err));
client.on("reconnect", () => console.log("♻️  Reconectando..."));

client.on("message", async (topic, payloadBuffer) => {
  const raw = payloadBuffer.toString();
  console.log(`📩 [${topic}] ${raw}`);

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { raw };
  }

// messageType viene del mqtt hardware
const messageType = parsed.messageType || "unknown";
const data = {
  nonce: parsed.nonce || uuidv4(),
  robotId: parsed.robotId || "1000",
  messageType,
  timestamp: new Date(),
  status: parsed.status || "ok",
  content: parsed.content || {},
};


  try {
    await sendToDebug(data);
    console.log(`📤 Enviado a debug (${messageType})`);
  } catch (err) {
    console.error("❌ Error enviando a debug:", err.message);
  }
});

//funcion de publicar comandillos
export const publicarComando = (payload) => {
  const type = payload.commandType;
  let action = "stop";

  if (payload.content?.direction) {
    action = payload.content.direction;
  } else if (payload.content?.mode) {
    action = payload.content.mode;
  } else if (type) {
    action = type;
  }

  const legacyPayload = {
    type,
    action,
    state: "down",
    nonce: payload.nonce || uuidv4(),
  };

  // Parseo el stop xq viene como stop stop
  if (legacyPayload.type === "stop" && legacyPayload.action === "stop") {
    legacyPayload.type = "move";
  }

  client.publish("/tenant/1/robot/comandos", JSON.stringify(legacyPayload), { qos: 1 }, (err) => {
    if (err) {
      console.error("❌ Error publicando comando:", err);
    } else {
      console.log(
        `✅ Enviado comando: ${legacyPayload.type} → ${legacyPayload.action}`
      );
    }
  });

  return legacyPayload;
};

export default client;