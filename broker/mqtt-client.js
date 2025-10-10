import mqtt from "mqtt";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
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
  rejectUnauthorized: true
};

const client = mqtt.connect(connectUrl, opts);

client.on("connect", () => {
  console.log("✅ Conectado a HiveMQ Cloud:", connectUrl);
  client.subscribe("/tenant/1/robot/estado", { qos: 1 });
  client.subscribe("/tenant/1/robot/ack", { qos: 1 });
});

client.on("error", (err) => console.error("❌ MQTT error:", err));
client.on("reconnect", () => console.log("♻️  Reconectando..."));

client.on("message", (topic, payloadBuffer) => {
  const payload = payloadBuffer.toString();
  console.log(`📩 [${topic}]`, payload);
});

// 👉 Función para publicar comandos
export const publicarComando = (payload) => {
  client.publish("/tenant/1/robot/comandos", JSON.stringify(payload), { qos: 1 }, (err) => {
    if (err) console.error("❌ Error publicando comando:", err);
    else console.log("📤 Comando enviado:", payload);
  });
};

export default client;
