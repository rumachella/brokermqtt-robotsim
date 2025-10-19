# Sistema de simulación y control MQTT para robots

Este sistema se divide en tres partes:

1. Un simulador del robot
2. Un cliente puente MQTT–HTTP (bridge)
3. Un servidor web con interfaz HTML para enviar comandos al robot

---

- `robotsim.js`: Simula el firmware del robot real (como si fuera el ESP32). Se conecta al broker MQTT (HiveMQ Cloud) y escucha comandos en el topic `robot/comandos`.
- `server.js + index.html`: Sirve la interfaz web de control (botones) y recibe comandos del usuario. Envia esos comandos al broker MQTT (topic `/tenant/1/robot/comandos`).
- `mqtt-client.js`: Actúa como bridge entre MQTT y tu backend HTTP. Escucha mensajes del robot y los reenvía al endpoint REST `DEBUG_ENDPOINT`.

---

Flujo 1: `Usuario (botones)` → `/comando HTTP` → `MQTT Broker` → `Robot simulado`
Flujo 2: `Robot simulado` → `MQTT ACK` → `Bridge MQTT` → `HTTP /api/debug`

## Robot simulado

El archivo `robotsim.js` emula al robot físico conectado a un broker MQTT (por ejemplo, HiveMQ Cloud).

### Conexión al broker

- Usa MQTT sobre TLS (mqtts).
- Se autentica con `username` y `password` del broker.
- `clientId` aleatorio (`robot-sim-xxxx`) para identificar el robot.

### Eventos

- `connect` → se ejecuta al conectarse correctamente. Se suscribe al topic `robot/comandos` (por donde recibe órdenes).
- `message` → se dispara al recibir un comando MQTT.
- `error` → captura errores de conexión.

### Al recibir un mensaje

1. Convierte el payload en JSON (`cmd = JSON.parse(payload)`).
2. Muestra la acción recibida (`cmd.accion`, `cmd.direccion`, etc.).
3. Simula su ejecución (solo con un `console.log`).
4. Envía un ACK (confirmación) al topic `robot/ack`.

Esto imita lo que haría el robot real después de ejecutar una orden: responder que todo fue bien.

## Interfaz de usuario

Una página web simple que permite enviar comandos al robot a través del servidor Express.

Cada botón llama a `enviar(tipo, accion)`:

### Enviar mensaje

La función `enviar()` hace una petición HTTP al endpoint `/comando` del servidor local (Express). El servidor se encarga de publicar el comando en MQTT.

### Registros

Solo muestra en pantalla el registro de los mensajes enviados.

## Servidor Express

El archivo `server.js` es el punto de entrada del sistema de control web.

- Sirve los archivos estáticos de `public/` (donde está `index.html`).
- Exponga una ruta POST `/comando` que recibe comandos del usuario y los envía al broker MQTT.

### POST /comando

1. Recibe el comando desde el frontend.
2. Genera un `nonce` único (identificador).
3. Llama a `publicarComando(payload)` — función exportada desde `mqtt-client.js` para enviar el comando vía MQTT.

## Bridge MQTT ↔ HTTP

Este módulo es el “intermediario inteligente”:

- Publica comandos hacia el robot.
- Escucha respuestas (`ack, estado`).
- Traduce y reenvía la información al backend REST (`DEBUG_ENDPOINT`).

### Conexión al broker

Igual que el robot simulado, pero usa `clientId` con prefijo `bridge-`.

Se suscribe a los topics del robot (por ejemplo, ACKs).

### Procesamiento de mensajes

Cuando llega un mensaje MQTT:

1. Se parsea el JSON (`parsed`).
2. Se extraen los campos (`type, action, state, nonce`).
3. Se traduce al nombre de “tarea” estandarizado mediante `commandMap` (diccionario).
4. Si el comando es un giro de 180°, se ajusta el `value = 180`.
5. Construye un objeto de log estándar:

```js
const commandData = {
  robotId: '1000',
  source: 'auto',
  task,
  value,
  timestamp: new Date(),
  status: 'executed'
};
```

6. Envía ese objeto al backend HTTP (endpoint `/api/debug`) usando `axios`.

Esto te permite registrar y visualizar en el backend qué acciones ejecutó el robot o cómo responde.

### Publicar comandos

Usado por `server.js` para mandar órdenes desde la web.
