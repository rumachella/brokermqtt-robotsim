import mqtt from "mqtt";
import dotenv from "dotenv";
dotenv.config();

const MQTT_HOST = process.env.MQTT_HOST;
const MQTT_PORT = process.env.MQTT_PORT || 8883;
const MQTT_USER = process.env.MQTT_USER;
const MQTT_PASS = process.env.MQTT_PASS;

const clientId = `robot-sim-${Math.random().toString(16).slice(2,8)}`;
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
  console.log("Robot simulado conectado a HiveMQ Cloud!");
  client.subscribe("robot/comandos", { qos: 1 }, () => {
    console.log("Suscripto a robot/comandos");
  });
});

client.on("error", (err) => console.error("MQTT error:", err));

client.on("message", (topic, payloadBuffer) => {
  const payload = payloadBuffer.toString();
  console.log(`<< Comando recibido [${topic}]:`, payload);

  // parseamos JSON
  let cmd;
  try {
    cmd = JSON.parse(payload);
  } catch (e) {
    console.error("Error parseando comando:", e);
    return;
  }

  // simulamos ejecución
  console.log(`Ejecutando acción: ${cmd.accion} ${cmd.direccion || cmd.modo || ""}`);

  // enviamos ACK
  const ack = {
    status: "ok",
    accion: cmd.accion,
    direccion: cmd.direccion || null,
    modo: cmd.modo || null,
    nonce: cmd.nonce
  };

  client.publish("robot/ack", JSON.stringify(ack), { qos: 1 }, (err) => {
    if (err) console.error("Error enviando ACK:", err);
    else console.log(">> ACK enviado:", ack);
  });
});
