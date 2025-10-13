import express from "express";
import dotenv from "dotenv";
import { publicarComando } from "../broker/mqtt-client.js";
import { v4 as uuidv4 } from "uuid";

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.static("public"));

app.post("/comando", (req, res) => {
  const { type, action, state = "down" } = req.body;

  if (!type || !action) return res.status(400).send({ error: "Campos type/action requeridos" });

  const payload = { type, action, state, nonce: uuidv4() };

  publicarComando(payload);
  res.send({ status: "enviado", payload });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));
