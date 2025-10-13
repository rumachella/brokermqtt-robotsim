import mqtt from "mqtt";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";import axios from "axios";
dotenv.config();
import { commandMap } from "../utils/diccionarioComandos.js";

const MQTT_HOST = process.env.MQTT_HOST;
const MQTT_PORT = process.env.MQTT_PORT || 8883;
const MQTT_USER = process.env.MQTT_USER;
const MQTT_PASS = process.env.MQTT_PASS;
const DEBUG_ENDPOINT = process.env.DEBUG_ENDPOINT || "http://localhost:4000/api/debug";

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
  client.subscribe("/tenant/1/robot/estado", { qos: 1 });
  client.subscribe("/tenant/1/robot/ack", { qos: 1 });
});

client.on("error", (err) => console.error("❌ MQTT error:", err));
client.on("reconnect", () => console.log("♻️  Reconectando..."));

client.on("message", async (topic, payloadBuffer) => {
  const raw = payloadBuffer.toString();
  console.log(`📩 [${topic}] ${raw}`);

  // Intentar parsear como JSON
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { raw }; // si no es JSON, lo mandamos como texto
  }

  // === Nueva estructura ESP32 ===
  const type = (parsed.type || "").trim().toLowerCase();
  const actionParam = (parsed.action || "").trim().toLowerCase();
  const state = parsed.state || "down";
  const nonce = parsed.nonce || uuidv4();

  // Mapear al task usando commandMap
  let task = "unknown";

  if (type && actionParam) {
    if (commandMap[type]?.[actionParam]) {
      task = commandMap[type][actionParam];
    } else {
      // si no está en el diccionario, usar type_action
      task = `${type}_${actionParam}`;
    }
  }
    let value = null;
  if (task === "turn_degrees" || actionParam === "degrees") {
    task = "turn_degrees";
    value = 180; // valor fijo
  }

  // Construcción del objeto estándar
  const commandData = {
    robotId: "1000",
    source: "auto",
    task,
    value: value,
    timestamp: new Date(),
    status: "executed",
  };

  try {
    await axios.post(DEBUG_ENDPOINT, commandData);
    console.log("📤 Enviado al endpoint debug:", commandData);
  } catch (err) {
    console.error("⚠️ Error reenviando al debug endpoint:", err.message);
  }
});


export const publicarComando = (payload) => {
  client.publish("/tenant/1/robot/comandos", JSON.stringify(payload), { qos: 1 }, (err) => {
    if (err) console.error("❌ Error publicando comando:", err);
    else console.log("📤 Comando enviado:", payload);
  });
};

export default client;
