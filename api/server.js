import express from "express";
import dotenv from "dotenv";
import { publicarComando } from "../broker/mqtt-client.js";
import { v4 as uuidv4 } from "uuid";

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.static("public")); // sirve el front (se descartara cuando lo subamos a render)

app.post("/comando", (req, res) => {
  const { accion, direccion, modo, state = "down" } = req.body; 

  let payload;

  if (accion === "mover") {
    payload = { accion, direccion, state, nonce: uuidv4() };
  } else if (accion === "montacargas") {
    payload = { accion, modo, state, nonce: uuidv4() };
  } else {
    return res.status(400).send({ error: "Acción no soportada" });
  }

  publicarComando(payload);
  res.send({ status: "enviado", payload });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));
