// Conexión MQTT con la estación: guarda telemetría y eventos, detecta caídas y envía comandos.
import mqtt from "mqtt";
import { config } from "./config.js";
import { guardarLectura, guardarEvento, ultimasLecturas } from "./db.js";
import { predecirDesborde } from "./prediccion.js";
import { alEvento, alCambioConexion } from "./notificaciones.js";

export const estado = {
  telemetria: null,
  tsTelemetria: 0,
  online: false,
  info: { umbrales: null, desborde: config.maqueta.desborde, fw: null, ip: null },
  brokerConectado: false,
};

// Últimas ~5 min en memoria para la predicción (se precargan de la BD al iniciar)
const recientes = ultimasLecturas(150);

export function prediccion() {
  return predecirDesborde(recientes, estado.info.desborde ?? config.maqueta.desborde);
}

let vistaAlgunaVez = false;
function ponerOnline(valor) {
  if (estado.online === valor) return;
  estado.online = valor;
  console.log(`[estación] ${valor ? "en línea" : "desconectada"}`);
  if (valor && !vistaAlgunaVez) { vistaAlgunaVez = true; return; } // primer contacto al arrancar: sin aviso
  alCambioConexion(valor);
}

let cliente;

export function conectarMqtt() {
  const base = config.topicBase;
  cliente = mqtt.connect(config.mqtt.url, {
    username: config.mqtt.usuario,
    password: config.mqtt.clave,
    clientId: `centinela-backend-${Math.random().toString(16).slice(2, 8)}`,
    reconnectPeriod: 5000,
  });

  cliente.on("connect", () => {
    estado.brokerConectado = true;
    console.log("[mqtt] conectado al broker");
    cliente.subscribe(`${base}/#`, { qos: 1 });
  });
  cliente.on("close", () => { estado.brokerConectado = false; });
  cliente.on("error", (e) => console.error("[mqtt]", e.message));

  cliente.on("message", (topic, buf) => {
    let msg;
    try { msg = JSON.parse(buf.toString()); } catch { return; }
    if (typeof msg !== "object" || msg === null) return;
    const sub = topic.slice(base.length + 1);
    const ts = Number.isFinite(msg.ts) && msg.ts > 1_700_000_000 ? msg.ts * 1000 : Date.now();

    if (sub === "telemetria") {
      guardarLectura(ts, msg);
      if (ts >= estado.tsTelemetria) {
        estado.telemetria = { ...msg, ts };
        estado.tsTelemetria = ts;
      }
      if (Number.isFinite(msg.nivel)) {
        recientes.push({ ts, nivel: msg.nivel });
        if (recientes.length > 150) recientes.shift();
      }
      if (Date.now() - ts < 30_000) ponerOnline(true);
    } else if (sub === "evento") {
      guardarEvento(ts, msg);
      // Los eventos que llegan del respaldo (estación sin internet) se guardan pero no se notifican tarde
      if (Date.now() - ts < 120_000) alEvento(msg, prediccion);
    } else if (sub === "estado") {
      estado.info = { ...estado.info, ...msg };
      if (msg.online === false) ponerOnline(false);
    }
  });

  // Vigilante: sin telemetría en 30 s = estación caída (aunque el Last Will no haya llegado)
  setInterval(() => {
    if (estado.online && Date.now() - estado.tsTelemetria > 30_000) ponerOnline(false);
  }, 5000);
}

const ACCIONES = {
  barrera: (v) => v === "abrir" || v === "cerrar",
  modo: (v) => v === "auto" || v === "manual",
  reconocer: () => true,
  umbrales: (v) => v && [v.amarillo, v.naranja, v.rojo].every((x) => Number.isFinite(x) && x > 0)
    && v.amarillo < v.naranja && v.naranja < v.rojo,
};

/** Valida y publica un comando para el ESP32. Lanza Error si no es válido. */
export function enviarComando(accion, valor) {
  if (!Object.hasOwn(ACCIONES, accion) || !ACCIONES[accion](valor)) throw new Error("Comando no válido");
  if (!cliente?.connected) throw new Error("Sin conexión con el broker MQTT");
  const payload = valor === undefined ? { accion } : { accion, valor };
  return new Promise((ok, falla) =>
    cliente.publish(`${config.topicBase}/cmd`, JSON.stringify(payload), { qos: 1 }, (e) => (e ? falla(e) : ok(payload))));
}
