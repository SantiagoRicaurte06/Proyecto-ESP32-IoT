import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const archivoEnv = path.join(raiz, ".env");
if (existsSync(archivoEnv)) process.loadEnvFile(archivoEnv);

const env = (nombre, porDefecto) => {
  const v = process.env[nombre];
  return v === undefined || v === "" ? porDefecto : v;
};

export const config = {
  puerto: Number(env("PORT", 3000)),
  estacion: env("ESTACION_ID", "est01"),
  get topicBase() { return `centinela/${this.estacion}`; },

  mqtt: {
    url: env("MQTT_URL", ""), // ej: mqtts://xxxxxxxx.ala.us-east-1.emqxsl.com:8883 (EMQX Cloud)
    usuario: env("MQTT_USER", ""),
    clave: env("MQTT_PASSWORD", ""),
  },

  db: env("DB_PATH", path.join(raiz, "data", "centinela.db")),

  tokens: {
    comunidad: env("TOKEN_COMUNIDAD", ""),
    operador: env("TOKEN_OPERADOR", ""),
  },

  ia: {
    // "gemini" (capa gratuita de Google) o "anthropic" (Claude). Por defecto: el que tenga clave.
    proveedor: env("LLM_PROVIDER", process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY ? "gemini" : "anthropic"),
    modelo: env("CLAUDE_MODEL", "claude-opus-5-5"),
    esfuerzo: env("CLAUDE_EFFORT", "low"),
    geminiModelo: env("GEMINI_MODEL", "gemini-flash-latest"),
  },

  notificaciones: {
    ntfyServidor: env("NTFY_SERVER", "https://ntfy.sh"),
    ntfyTopic: env("NTFY_TOPIC", ""),
    smtpUsuario: env("SMTP_USER", ""),
    smtpClave: env("SMTP_PASSWORD", ""),
    correoDestino: env("ALERT_EMAIL_TO", ""),
    repetirRojoMin: Number(env("REPETIR_ROJO_MIN", 2)),
  },

  // Valores de la maqueta (el ESP32 los reporta en /estado; estos son el respaldo)
  maqueta: {
    desborde: Number(env("NIVEL_DESBORDE_CM", 14)),
  },
};

export function validarConfig() {
  const faltan = [];
  if (!config.mqtt.url) faltan.push("MQTT_URL");
  if (!config.tokens.comunidad) faltan.push("TOKEN_COMUNIDAD");
  if (!config.tokens.operador) faltan.push("TOKEN_OPERADOR");
  if (faltan.length) {
    console.error(`✖ Faltan variables en backend/.env: ${faltan.join(", ")} (copia .env.example)`);
    process.exit(1);
  }
  if (config.ia.proveedor === "gemini") {
    if (!process.env.GEMINI_API_KEY) console.warn("⚠ Sin GEMINI_API_KEY: el agente IA no responderá.");
    else console.log(`Agente IA: Gemini (${config.ia.geminiModelo})`);
  } else if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("⚠ Sin ANTHROPIC_API_KEY ni GEMINI_API_KEY: el agente IA no responderá.");
  } else {
    console.log(`Agente IA: Claude (${config.ia.modelo})`);
  }
  if (!config.notificaciones.ntfyTopic) console.warn("⚠ Sin NTFY_TOPIC: no se enviarán notificaciones push.");
}
