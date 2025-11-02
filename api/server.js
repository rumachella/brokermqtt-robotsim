import express from 'express';
import dotenv from 'dotenv';
import { publicarComando } from '../broker/mqtt-client.js';
import crypto from 'crypto';

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.static('public'));

// --- 🔸 Clientes conectados vía SSE ---
let clients = [];
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clients.push(res);

  req.on('close', () => {
    clients = clients.filter((c) => c !== res);
  });
});

function sendEvent(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach((c) => c.write(msg));
}

// --- 🔹 Webhook receptor ---
app.post('/webhook', (req, res) => {
  const { nonce, robotId, commandType, timestamp, status, content } = req.body;
  console.log('📥 Webhook recibido:', req.body);
  if (!robotId || !commandType)
    return res
      .status(400)
      .send({ error: 'Faltan campos requeridos: robotId o commandType' });

  /* if (status !== "ok")
    return res.status(400).send({ error: "El status debe ser 'ok' para reenviar el comando" }); */

  const validCommands = [
    'mode',
    'start',
    'stop',
    'take_photo',
    'lift',
    'tilt',
    'move',
    'turn',
    'connect',
    'disconnect',
    'battery_status'
  ];
  if (!validCommands.includes(commandType)) {
    return res
      .status(400)
      .send({ error: `commandType inválido: ${commandType}` });
  }

  if (['lift', 'tilt', 'move', 'turn'].includes(commandType)) {
    if (!content?.direction) {
      return res.status(400).send({
        error: `El comando '${commandType}' requiere el campo 'direction'`
      });
    }
  }

  if (commandType === 'mode' && !content?.mode) {
    return res.status(400).send({
      error: "El comando 'mode' requiere el campo 'mode' en content"
    });
  }

  const payload = {
    nonce: nonce || crypto.randomUUID(),
    robotId,
    commandType,
    timestamp: timestamp || new Date().toISOString(),
    status,
    content: content || {}
  };

  console.log('Payload final:', payload);

  // 🔸 Enviamos evento: recibido
  sendEvent({
    tipo: 'recibido',
    mensaje: `📥 Recibido en backend: ${JSON.stringify(payload)}`
  });

  // 🔸 Publicamos en MQTT
  const publicado = publicarComando(payload);

  // 🔸 Enviamos evento: publicado
  sendEvent({
    tipo: 'publicado',
    mensaje: `🚀 Publicado MQTT: ${JSON.stringify(publicado)}`
  });

  res.status(200).send({
    status: 'enviado',
    payload: publicado
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Webhook escuchando en http://localhost:${PORT}`)
);
