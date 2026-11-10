// API REST para la app. Sin framework: node:http basta para 6 rutas.
import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { config } from "./config.js";
import { listarEventos, serie } from "./db.js";
import { estado, prediccion, enviarComando } from "./estacion.js";
import { preguntar, errorAgente } from "./agente.js";

const LIMITE_CUERPO = 32 * 1024;

function igual(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Rol según el token: "operador" puede controlar; "comunidad" solo consulta. */
function rolDe(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  if (igual(token, config.tokens.operador)) return "operador";
  if (igual(token, config.tokens.comunidad)) return "comunidad";
  return null;
}

// Límite de consultas al agente: 12 por minuto por IP (cada consulta cuesta dinero)
const usoAgente = new Map();
function permitirAgente(ip) {
  const ahora = Date.now();
  const lista = (usoAgente.get(ip) || []).filter((t) => ahora - t < 60_000);
  if (lista.length >= 12) return false;
  lista.push(ahora);
  usoAgente.set(ip, lista);
  return true;
}

function responder(res, codigo, datos) {
  res.writeHead(codigo, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(datos));
}

function leerCuerpo(req) {
  return new Promise((ok, falla) => {
    let tam = 0; const partes = [];
    req.on("data", (c) => {
      tam += c.length;
      if (tam > LIMITE_CUERPO) { falla(new Error("Cuerpo demasiado grande")); req.destroy(); return; }
      partes.push(c);
    });
    req.on("end", () => { try { ok(JSON.parse(Buffer.concat(partes).toString() || "{}")); } catch { falla(new Error("JSON inválido")); } });
    req.on("error", falla);
  });
}

function validarHistorial(h) {
  if (!Array.isArray(h) || h.length === 0 || h.length > 20) return false;
  if (h.at(-1).rol !== "usuario") return false;
  return h.every((m) => m && (m.rol === "usuario" || m.rol === "agente") && typeof m.texto === "string" && m.texto.length > 0 && m.texto.length <= 2000);
}

async function rutas(req, res) {
  const url = new URL(req.url, "http://x");
  const ruta = `${req.method} ${url.pathname}`;

  if (req.method === "OPTIONS") return responder(res, 204, {});
  if (ruta === "GET /api/salud") return responder(res, 200, { ok: true, broker: estado.brokerConectado, estacion: estado.online });

  const rol = rolDe(req);
  if (!rol) return responder(res, 401, { error: "Token inválido" });

  switch (ruta) {
    case "GET /api/sesion":
      return responder(res, 200, { rol });

    case "GET /api/estado":
      return responder(res, 200, {
        telemetria: estado.telemetria,
        enLinea: estado.online,
        broker: estado.brokerConectado,
        estacion: estado.info,
        prediccion: prediccion(),
      });

    case "GET /api/historial": {
      const minutos = Math.min(Math.max(Number(url.searchParams.get("minutos")) || 60, 1), 7 * 24 * 60);
      const hasta = Date.now();
      return responder(res, 200, { serie: serie(hasta - minutos * 60_000, hasta, 120) });
    }

    case "GET /api/eventos": {
      const limite = Math.min(Number(url.searchParams.get("limite")) || 30, 100);
      return responder(res, 200, { eventos: listarEventos(0, Date.now(), null, limite) });
    }

    case "POST /api/comando": {
      if (rol !== "operador") return responder(res, 403, { error: "Solo el operador puede controlar la estación" });
      const { accion, valor } = await leerCuerpo(req);
      try {
        return responder(res, 200, { enviado: await enviarComando(accion, valor) });
      } catch (e) {
        return responder(res, 400, { error: e.message });
      }
    }

    case "POST /api/agente": {
      if (!permitirAgente(req.socket.remoteAddress)) return responder(res, 429, { error: "Demasiadas preguntas, espera un minuto" });
      const { historial } = await leerCuerpo(req);
      if (!validarHistorial(historial)) return responder(res, 400, { error: "Historial inválido" });
      try {
        return responder(res, 200, await preguntar(historial));
      } catch (e) {
        console.error("[agente]", e);
        return responder(res, 502, { error: errorAgente(e) });
      }
    }

    default:
      return responder(res, 404, { error: "Ruta no encontrada" });
  }
}

export function iniciarServidor() {
  const servidor = http.createServer((req, res) => {
    rutas(req, res).catch((e) => responder(res, 400, { error: e.message }));
  });
  servidor.listen(config.puerto, "0.0.0.0", () => console.log(`[api] escuchando en http://0.0.0.0:${config.puerto}`));
  return servidor;
}
