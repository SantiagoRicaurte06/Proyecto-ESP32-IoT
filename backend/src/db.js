import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { config } from "./config.js";

mkdirSync(path.dirname(config.db), { recursive: true });
export const db = new DatabaseSync(config.db);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;

  CREATE TABLE IF NOT EXISTS lecturas (
    ts      INTEGER NOT NULL,      -- ms UTC
    nivel   REAL, tasa REAL, suelo INTEGER, temp REAL, hum REAL,
    riesgo  TEXT, barrera TEXT, sirena INTEGER, modo TEXT,
    pir     INTEGER, ir INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_lecturas_ts ON lecturas(ts);

  CREATE TABLE IF NOT EXISTS eventos (
    id     INTEGER PRIMARY KEY,
    ts     INTEGER NOT NULL,
    tipo   TEXT NOT NULL,
    riesgo TEXT, nivel REAL,
    datos  TEXT                    -- JSON con el resto del mensaje
  );
  CREATE INDEX IF NOT EXISTS idx_eventos_ts ON eventos(ts);
  CREATE INDEX IF NOT EXISTS idx_eventos_tipo_ts ON eventos(tipo, ts);

  CREATE TABLE IF NOT EXISTS notificaciones (
    id INTEGER PRIMARY KEY, ts INTEGER NOT NULL,
    canal TEXT, titulo TEXT, mensaje TEXT, prioridad INTEGER, ok INTEGER
  );
`);

const insLectura = db.prepare(`INSERT INTO lecturas
  (ts, nivel, tasa, suelo, temp, hum, riesgo, barrera, sirena, modo, pir, ir)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const insEvento = db.prepare(`INSERT INTO eventos (ts, tipo, riesgo, nivel, datos) VALUES (?, ?, ?, ?, ?)`);
const insNotif = db.prepare(`INSERT INTO notificaciones (ts, canal, titulo, mensaje, prioridad, ok) VALUES (?, ?, ?, ?, ?, ?)`);

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const bool = (v) => (typeof v === "boolean" ? Number(v) : null);
const txt = (v) => (typeof v === "string" ? v.slice(0, 40) : null);

export function guardarLectura(ts, t) {
  insLectura.run(ts, num(t.nivel), num(t.tasa), num(t.suelo), num(t.temp), num(t.hum),
    txt(t.riesgo), txt(t.barrera), bool(t.sirena), txt(t.modo), bool(t.pir), bool(t.ir));
}

export function guardarEvento(ts, e) {
  const { tipo, riesgo, nivel, ts: _ts, ...resto } = e;
  insEvento.run(ts, txt(tipo) ?? "desconocido", txt(riesgo), num(nivel), JSON.stringify(resto));
}

export function guardarNotificacion(canal, titulo, mensaje, prioridad, ok) {
  insNotif.run(Date.now(), canal, titulo, mensaje, prioridad, Number(ok));
}

// ── Consultas (usadas por la API y por las herramientas del agente) ──────────

const VARIABLES = new Set(["nivel", "tasa", "temp", "hum", "suelo"]);

export function estadisticas(variable, desde, hasta) {
  if (!VARIABLES.has(variable)) throw new Error(`Variable no válida: ${variable}`);
  const r = db.prepare(`SELECT COUNT(${variable}) n, MIN(${variable}) min, MAX(${variable}) max,
      AVG(${variable}) promedio FROM lecturas WHERE ts BETWEEN ? AND ?`).get(desde, hasta);
  if (!r.n) return { muestras: 0 };
  const tsMax = db.prepare(`SELECT ts FROM lecturas WHERE ts BETWEEN ? AND ? AND ${variable} = ? ORDER BY ts LIMIT 1`)
    .get(desde, hasta, r.max)?.ts;
  const tsMin = db.prepare(`SELECT ts FROM lecturas WHERE ts BETWEEN ? AND ? AND ${variable} = ? ORDER BY ts LIMIT 1`)
    .get(desde, hasta, r.min)?.ts;
  return { muestras: r.n, min: r.min, max: r.max, promedio: r.promedio, tsMax, tsMin };
}

export function contarEventos(desde, hasta, tipo) {
  const filas = tipo
    ? db.prepare(`SELECT tipo, COUNT(*) n FROM eventos WHERE ts BETWEEN ? AND ? AND tipo = ? GROUP BY tipo`).all(desde, hasta, tipo)
    : db.prepare(`SELECT tipo, COUNT(*) n FROM eventos WHERE ts BETWEEN ? AND ? GROUP BY tipo`).all(desde, hasta);
  return Object.fromEntries(filas.map((f) => [f.tipo, f.n]));
}

export function listarEventos(desde, hasta, tipo, limite = 50) {
  const lim = Math.min(Math.max(Number(limite) || 50, 1), 200);
  const filas = tipo
    ? db.prepare(`SELECT * FROM eventos WHERE ts BETWEEN ? AND ? AND tipo = ? ORDER BY ts DESC LIMIT ?`).all(desde, hasta, tipo, lim)
    : db.prepare(`SELECT * FROM eventos WHERE ts BETWEEN ? AND ? ORDER BY ts DESC LIMIT ?`).all(desde, hasta, lim);
  return filas.map((f) => ({ ...f, datos: JSON.parse(f.datos || "{}") }));
}

/** Serie reducida a ~puntos (promedio por intervalo) para gráficas y para el agente. */
export function serie(desde, hasta, puntos = 120) {
  const p = Math.min(Math.max(Number(puntos) || 120, 10), 500);
  const paso = Math.max(Math.ceil((hasta - desde) / p), 1000);
  return db.prepare(`SELECT CAST(ts / ? AS INTEGER) * ? AS ts, ROUND(AVG(nivel), 2) nivel, ROUND(AVG(tasa), 2) tasa,
      MAX(CASE riesgo WHEN 'rojo' THEN 3 WHEN 'naranja' THEN 2 WHEN 'amarillo' THEN 1 ELSE 0 END) riesgo
    FROM lecturas WHERE ts BETWEEN ? AND ? GROUP BY CAST(ts / ? AS INTEGER) ORDER BY 1`).all(paso, paso, desde, hasta, paso);
}

/** Minutos en cada nivel de riesgo (huecos de más de 30 s no se cuentan). */
export function tiempoPorRiesgo(desde, hasta) {
  const filas = db.prepare(`SELECT ts, riesgo FROM lecturas WHERE ts BETWEEN ? AND ? ORDER BY ts`).all(desde, hasta);
  const ms = { verde: 0, amarillo: 0, naranja: 0, rojo: 0 };
  for (let i = 1; i < filas.length; i++) {
    const dt = filas[i].ts - filas[i - 1].ts;
    if (dt <= 30000 && filas[i - 1].riesgo in ms) ms[filas[i - 1].riesgo] += dt;
  }
  return Object.fromEntries(Object.entries(ms).map(([k, v]) => [k, Math.round((v / 60000) * 10) / 10]));
}

export function ultimasLecturas(n = 150) {
  return db.prepare(`SELECT ts, nivel FROM lecturas WHERE nivel IS NOT NULL ORDER BY ts DESC LIMIT ?`).all(n).reverse();
}
