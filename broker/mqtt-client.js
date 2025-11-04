import mqtt from 'mqtt';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { sendToDebug } from './webhookSender.js';

dotenv.config();

// ================== VARIABLES DE ENTORNO ==================
const MQTT_HOST = process.env.MQTT_HOST;
const MQTT_PORT = process.env.MQTT_PORT || 8883;
const MQTT_USER = process.env.MQTT_USER;
const MQTT_PASS = process.env.MQTT_PASS;

// ================== CONFIGURACIÓN DE CLIENTE ==================
const clientId = `bridge-${uuidv4().slice(0, 8)}`;
const useTls = MQTT_PORT === '8883' || MQTT_PORT === 8883; // usa mqtts solo si el puerto es TLS
const connectUrl = `${useTls ? 'mqtts' : 'mqtt'}://${MQTT_HOST}:${MQTT_PORT}`;

const opts = {
  clientId,
  username: MQTT_USER,
  password: MQTT_PASS,
  protocol: useTls ? 'mqtts' : 'mqtt',
  keepalive: 60,
  reconnectPeriod: 5000,
  // ⚠️ En desarrollo puede causar error 400 si el certificado es self-signed
  rejectUnauthorized: false
};

// ================== CONEXIÓN ==================
const client = mqtt.connect(connectUrl, opts);

client.on('connect', () => {
  console.log('✅ Conectado al broker MQTT:', connectUrl);

  // Suscribirse a los topics necesarios
  const topics = [
    '/tenant/1/robot/ack',
    '/tenant/1/robot/status',
    '/tenant/1/robot/image',
    '/tenant/1/robot/obstacle',
    '/tenant/1/robot/error'
  ];

  client.subscribe(topics, { qos: 1 }, (err) => {
    if (err) console.error('❌ Error al suscribirse:', err);
    else console.log('📡 Suscrito a:', topics.join(', '));
  });
});

client.on('error', (err) => console.error('❌ Error MQTT:', err.message));
client.on('reconnect', () => console.log('♻️ Reconectando al broker...'));

// ================== RECEPCIÓN DE MENSAJES ==================
client.on('message', async (topic, payloadBuffer) => {
  const raw = payloadBuffer.toString();
  console.log(`📩 [${topic}] ${raw}`);

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { raw };
  }

  const messageType = parsed.messageType || 'unknown';

  const data = {
    nonce: parsed.nonce || uuidv4(),
    robotId: '68faa22f17d51b1089c1f1d5',
    messageType,
    timestamp: new Date().toISOString(),
    status: parsed.status || 'ok',
    content: parsed.content || {}
  };

  try {
    await sendToDebug(data);
    console.log(`📤 Enviado a debug (${messageType})`);
  } catch (err) {
    console.error('❌ Error enviando a debug:', err.message);
  }
});

// ================== FUNCIÓN PARA PUBLICAR ==================
export const publicarComando = (payload) => {
  try {
    const jsonString = JSON.stringify(payload);

    client.publish(
      '/tenant/1/robot/comandos',
      jsonString,
      { qos: 1 },
      (err) => {
        if (err) {
          console.error('❌ Error publicando comando:', err);
        } else {
          console.log('✅ Comando publicado MQTT:', jsonString);
        }
      }
    );

    return payload;
  } catch (err) {
    console.error('❌ Error serializando payload:', err);
    return { error: err.message };
  }
};

export default client;
