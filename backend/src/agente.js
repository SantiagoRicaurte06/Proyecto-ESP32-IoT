// Agente IA: responde preguntas en lenguaje natural consultando la base de datos con herramientas.
import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import { estadisticas, contarEventos, listarEventos, serie, tiempoPorRiesgo } from "./db.js";
import { estado, prediccion } from "./estacion.js";
import { aLocal, rango } from "./tiempo.js";

const cliente = new Anthropic(); // lee ANTHROPIC_API_KEY del entorno

const RANGO = {
  desde: { type: "string", description: "Inicio en hora de Colombia, formato YYYY-MM-DDTHH:mm. Por defecto: inicio de hoy." },
  hasta: { type: "string", description: "Fin en hora de Colombia, formato YYYY-MM-DDTHH:mm. Por defecto: ahora." },
};
const TIPOS_EVENTO = ["cambio_riesgo", "persona_zona", "vehiculo_barrera", "boton_emergencia", "alerta_reconocida", "comando", "arranque"];

const herramientas = [
  {
    name: "estado_actual",
    description: "Lectura más reciente de la estación: nivel del agua (cm), tasa de ascenso (cm/min), humedad del suelo (%), temperatura (°C), humedad del aire (%), nivel de riesgo, barrera, sirena, modo y si la estación está en línea. También los umbrales configurados.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "estadisticas",
    description: "Mínimo, máximo, promedio y número de muestras de una variable en un rango de tiempo, con la hora del máximo y del mínimo.",
    input_schema: {
      type: "object",
      properties: {
        variable: { type: "string", enum: ["nivel", "tasa", "temp", "hum", "suelo"], description: "nivel=cm de agua, tasa=cm/min, temp=°C, hum=% aire, suelo=% humedad del suelo" },
        ...RANGO,
      },
      required: ["variable"],
    },
  },
  {
    name: "contar_eventos",
    description: "Cuenta eventos por tipo en un rango. Tipos: cambio_riesgo (subidas/bajadas de alerta), persona_zona (movimiento en la ribera durante alerta), vehiculo_barrera (vehículo intentó cruzar con barrera cerrada), boton_emergencia, alerta_reconocida, comando (acciones desde la app), arranque (reinicios de la estación).",
    input_schema: { type: "object", properties: { tipo: { type: "string", enum: TIPOS_EVENTO }, ...RANGO } },
  },
  {
    name: "listar_eventos",
    description: "Lista eventos (más recientes primero) con hora, riesgo, nivel y detalles. Úsala para reconstruir qué pasó en un evento o generar reportes.",
    input_schema: {
      type: "object",
      properties: { tipo: { type: "string", enum: TIPOS_EVENTO }, limite: { type: "integer", description: "Máximo 200, por defecto 50" }, ...RANGO },
    },
  },
  {
    name: "tiempo_por_riesgo",
    description: "Minutos que la estación pasó en cada nivel de riesgo (verde, amarillo, naranja, rojo) en un rango.",
    input_schema: { type: "object", properties: { ...RANGO } },
  },
  {
    name: "serie_nivel",
    description: "Serie de tiempo resumida del nivel del agua, la tasa y el riesgo máximo (0 verde a 3 rojo) por intervalo. Útil para describir tendencias o picos.",
    input_schema: { type: "object", properties: { puntos: { type: "integer", description: "Cantidad de intervalos, por defecto 40" }, ...RANGO } },
  },
  {
    name: "prediccion_desborde",
    description: "Estimación del tiempo hasta el desbordamiento con regresión lineal de los últimos 3 minutos: tasa, tendencia, margen en cm, minutos estimados y confianza (R²).",
    input_schema: { type: "object", properties: {} },
  },
];

function rangoTexto([d, h]) { return { desde: aLocal(d), hasta: aLocal(h) }; }

export function ejecutar(nombre, entrada = {}) {
  const r = rango(entrada.desde, entrada.hasta);
  switch (nombre) {
    case "estado_actual": {
      const t = estado.telemetria;
      return {
        enLinea: estado.online,
        ultimaLectura: t ? { ...t, ts: undefined, hora: aLocal(t.ts) } : null,
        umbralesCm: estado.info.umbrales,
        desbordeCm: estado.info.desborde,
      };
    }
    case "estadisticas": {
      const s = estadisticas(entrada.variable, ...r);
      return { variable: entrada.variable, ...rangoTexto(r), ...s,
        horaMax: s.tsMax ? aLocal(s.tsMax) : undefined, horaMin: s.tsMin ? aLocal(s.tsMin) : undefined,
        tsMax: undefined, tsMin: undefined };
    }
    case "contar_eventos":
      return { ...rangoTexto(r), conteo: contarEventos(...r, entrada.tipo) };
    case "listar_eventos":
      return { ...rangoTexto(r), eventos: listarEventos(...r, entrada.tipo, entrada.limite).map((e) => ({ hora: aLocal(e.ts), tipo: e.tipo, riesgo: e.riesgo, nivel: e.nivel, ...e.datos })) };
    case "tiempo_por_riesgo":
      return { ...rangoTexto(r), minutos: tiempoPorRiesgo(...r) };
    case "serie_nivel":
      return { ...rangoTexto(r), serie: serie(...r, entrada.puntos ?? 40).map((p) => ({ hora: aLocal(p.ts), ...p, ts: undefined })) };
    case "prediccion_desborde":
      return prediccion();
    default:
      throw new Error(`Herramienta desconocida: ${nombre}`);
  }
}

function sistema() {
  return `Eres el asistente de Centinela Cravo Sur, una estación de alerta temprana de crecientes instalada en una maqueta a escala de un puente sobre el río Cravo Sur (Yopal, Casanare, Colombia).

La estación mide el nivel del agua (cm), la tasa de ascenso (cm/min), la humedad del suelo de la ribera, la temperatura y la humedad del aire. Clasifica el riesgo en verde, amarillo, naranja (cierra la barrera del puente) y rojo (sirena). También registra personas en la ribera durante alertas, vehículos que intentan cruzar con la barrera cerrada y el botón comunitario de emergencia.

Responde en español, breve y claro, a personas de la comunidad y a operadores de gestión del riesgo. Consulta siempre las herramientas antes de dar cifras y nunca inventes datos; si no hay datos para el periodo, dilo. Usa hora de Colombia (formato 12 h, ej. 3:40 p. m.) y redondea a una cifra decimal. Si el riesgo actual es naranja o rojo, empieza por la recomendación de seguridad. Cuando te pidan un reporte, organízalo con hora de inicio, pico, duración por nivel y acciones tomadas.

Fecha y hora actual en Colombia: ${aLocal(Date.now())}.`;
}

/**
 * @param {{rol: "usuario"|"agente", texto: string}[]} historial
 * @returns {Promise<{respuesta: string, herramientas: string[]}>}
 */
export async function preguntar(historial) {
  const messages = historial.map((m) => ({ role: m.rol === "agente" ? "assistant" : "user", content: m.texto }));
  const usadas = [];

  for (let vuelta = 0; vuelta < 8; vuelta++) {
    const respuesta = await cliente.beta.messages.create({
      model: config.ia.modelo,
      max_tokens: 16000,
      system: sistema(),
      tools: herramientas,
      messages,
      output_config: { effort: config.ia.esfuerzo },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });

    if (respuesta.stop_reason === "refusal") {
      return { respuesta: "No puedo responder esa pregunta. Pregúntame sobre el nivel del río, las alertas o los sensores.", herramientas: usadas };
    }
    if (respuesta.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: respuesta.content });
      continue;
    }

    const llamadas = respuesta.content.filter((b) => b.type === "tool_use");
    if (respuesta.stop_reason !== "tool_use" || !llamadas.length) {
      const texto = respuesta.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      return { respuesta: texto || "No obtuve respuesta, intenta de nuevo.", herramientas: usadas };
    }

    messages.push({ role: "assistant", content: respuesta.content });
    const resultados = llamadas.map((ll) => {
      usadas.push(ll.name);
      try {
        return { type: "tool_result", tool_use_id: ll.id, content: JSON.stringify(ejecutar(ll.name, ll.input)) };
      } catch (e) {
        return { type: "tool_result", tool_use_id: ll.id, content: `Error: ${e.message}`, is_error: true };
      }
    });
    messages.push({ role: "user", content: resultados }); // todos los resultados en un solo mensaje
  }
  return { respuesta: "La consulta fue demasiado larga. Intenta una pregunta más concreta.", herramientas: usadas };
}

export function errorAgente(e) {
  if (e instanceof Anthropic.AuthenticationError) return "Falta o es inválida la ANTHROPIC_API_KEY del backend.";
  if (e instanceof Anthropic.RateLimitError) return "El agente está ocupado, intenta en unos segundos.";
  if (e instanceof Anthropic.APIConnectionError) return "El backend no tiene conexión a internet para consultar la IA.";
  if (e instanceof Anthropic.APIError) return `Error del servicio de IA (${e.status}).`;
  return "Error interno del agente.";
}
