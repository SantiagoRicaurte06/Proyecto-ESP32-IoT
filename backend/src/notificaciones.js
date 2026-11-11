import nodemailer from "nodemailer";
import { config } from "./config.js";
import { guardarNotificacion } from "./db.js";
import { aLocal } from "./tiempo.js";

const n = config.notificaciones;
const correo = n.smtpUsuario && n.smtpClave && n.correoDestino
  ? nodemailer.createTransport({ service: "gmail", auth: { user: n.smtpUsuario, pass: n.smtpClave } })
  : null;

/** Push por ntfy (app ntfy en el teléfono, suscrita al topic) y, si se pide, correo. */
export async function notificar({ titulo, mensaje, prioridad = 3, tags = [], porCorreo = false }) {
  console.log(`[notif p${prioridad}] ${titulo} · ${mensaje}`);
  const tareas = [];

  if (n.ntfyTopic) {
    tareas.push(
      fetch(n.ntfyServidor, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: n.ntfyTopic, title: titulo, message: mensaje, priority: prioridad, tags }),
        signal: AbortSignal.timeout(8000),
      })
        .then((r) => guardarNotificacion("push", titulo, mensaje, prioridad, r.ok))
        .catch((e) => { console.error("ntfy:", e.message); guardarNotificacion("push", titulo, mensaje, prioridad, false); }),
    );
  }

  if (porCorreo && correo) {
    tareas.push(
      correo.sendMail({
        from: `"Centinela Cravo Sur" <${n.smtpUsuario}>`,
        to: n.correoDestino,
        subject: `[Centinela] ${titulo}`,
        text: `${mensaje}\n\nHora: ${aLocal(Date.now())} (Colombia)\nEstación: ${config.estacion}`,
      })
        .then(() => guardarNotificacion("correo", titulo, mensaje, prioridad, true))
        .catch((e) => { console.error("correo:", e.message); guardarNotificacion("correo", titulo, mensaje, prioridad, false); }),
    );
  }
  await Promise.all(tareas);
}

// ── Reglas de alerta ─────────────────────────────────────────────────────────

const ORDEN = { verde: 0, amarillo: 1, naranja: 2, rojo: 3 };
const EMOJI = { verde: "green_circle", amarillo: "yellow_circle", naranja: "orange_circle", rojo: "red_circle" };
let repetidor = null;

function detenerRepeticion() {
  if (repetidor) clearInterval(repetidor);
  repetidor = null;
}

function textoPrediccion(p) {
  if (!p?.disponible) return "";
  if (p.minutosHastaDesborde !== null) return ` A este ritmo (${p.tasaCmMin} cm/min) se desborda en ~${p.minutosHastaDesborde} min.`;
  return ` Tendencia: ${p.tendencia}.`;
}

/**
 * Decide qué notificar para cada evento del ESP32.
 * @param {object} e  evento
 * @param {() => object} obtenerPrediccion
 */
export function alEvento(e, obtenerPrediccion) {
  const nivel = e.nivel !== undefined ? `${e.nivel} cm` : "";
  switch (e.tipo) {
    case "cambio_riesgo": {
      const sube = ORDEN[e.a] > ORDEN[e.de];
      const pred = textoPrediccion(obtenerPrediccion());
      if (!sube) {
        if (e.a === "verde") notificar({ titulo: "Riesgo normalizado", mensaje: `El nivel bajó a ${nivel}. Barrera abierta.`, prioridad: 2, tags: [EMOJI.verde] });
        if (ORDEN[e.a] < ORDEN.rojo) detenerRepeticion();
        return;
      }
      if (e.a === "amarillo") {
        notificar({ titulo: "Alerta AMARILLA · vigilancia", mensaje: `El agua sube: ${nivel}.${pred}`, prioridad: 3, tags: [EMOJI.amarillo] });
      } else if (e.a === "naranja") {
        notificar({ titulo: "Alerta NARANJA · paso cerrado", mensaje: `Nivel ${nivel}. Barrera cerrada, prepárese para evacuar.${pred}`, prioridad: 4, tags: [EMOJI.naranja, "warning"], porCorreo: true });
      } else if (e.a === "rojo") {
        const enviarRojo = () => notificar({
          titulo: "ALERTA ROJA · evacúe la ribera",
          mensaje: `Nivel ${nivel}. Barrera cerrada y LED rojo en alerta. Aléjese del río y del puente.${textoPrediccion(obtenerPrediccion())}`,
          prioridad: 5, tags: [EMOJI.rojo, "rotating_light"], porCorreo: true,
        });
        enviarRojo();
        detenerRepeticion();
        repetidor = setInterval(enviarRojo, n.repetirRojoMin * 60_000); // hasta que alguien la reconozca
      }
      return;
    }
    case "alerta_reconocida":
      detenerRepeticion();
      notificar({ titulo: "Alerta reconocida", mensaje: `Reconocida desde ${e.origen === "app" ? "la app" : "la estación (táctil)"}. La alerta deja de repetirse.`, prioridad: 2, tags: ["white_check_mark"] });
      return;
    case "boton_emergencia":
      notificar({ titulo: "EMERGENCIA reportada en la estación", mensaje: `Alguien activó el botón comunitario. Riesgo ${e.riesgo}, nivel ${nivel}.`, prioridad: 5, tags: ["sos"], porCorreo: true });
      return;
    default:
      return;
  }
}

export function alCambioConexion(online) {
  if (online) {
    notificar({ titulo: "Estación en línea", mensaje: "La estación Centinela volvió a conectarse.", prioridad: 2, tags: ["satellite"] });
  } else {
    notificar({ titulo: "Estación DESCONECTADA", mensaje: "No llegan datos de la estación. La alerta local sigue funcionando; revise energía y WiFi.", prioridad: 4, tags: ["warning", "satellite"], porCorreo: true });
  }
}
