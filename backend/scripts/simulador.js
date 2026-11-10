// Simula la estación ESP32 (mismos topics y mensajes) para probar backend, app y agente sin hardware.
// Uso: npm run simular            (escenario de creciente en ~4 min, se repite)
//      npm run simular -- --lento  (escenario en ~12 min)
// ⚠ No lo corras al mismo tiempo que la estación real: comparten topics.
import mqtt from "mqtt";
import { config } from "../src/config.js";

const LENTO = process.argv.includes("--lento");
const base = config.topicBase;
const U = { amarillo: 5, naranja: 8, rojo: 11 };
const DESBORDE = 14, HIST = 1;
const ORDEN = ["verde", "amarillo", "naranja", "rojo"];

const cliente = mqtt.connect(config.mqtt.url, {
  username: config.mqtt.usuario, password: config.mqtt.clave,
  clientId: `centinela-sim-${Math.random().toString(16).slice(2, 8)}`,
  will: { topic: `${base}/estado`, payload: JSON.stringify({ online: false }), qos: 1, retain: true },
});

let t = 0, nivel = 2, historial = [], riesgo = 0, reconocida = true;
let modoManual = false, barreraManual = false, sirenaManual = false;
let barrera = false, sirena = false, ultimoPir = 0;
const factor = LENTO ? 3 : 1;

// Escenario: calma → lluvia (sube) → pico → baja, en segundos
function nivelObjetivo(seg) {
  const ciclo = 240 * factor, s = seg % ciclo, f = s / factor;
  if (f < 40) return 2 + Math.sin(f / 6) * 0.2;                      // calma
  if (f < 140) return 2 + (f - 40) * 0.105;                           // creciente (~6 cm/min)
  if (f < 170) return 12.5 + Math.sin(f) * 0.2;                       // pico
  return Math.max(2, 12.5 - (f - 170) * 0.15);                        // baja
}

function riesgoPara(n, tasa, suelo) {
  let r = n >= U.rojo ? 3 : n >= U.naranja ? 2 : n >= U.amarillo ? 1 : 0;
  if (tasa >= 2 && r < 3) r++;
  if (suelo >= 80 && r === 0) r = 1;
  return r;
}

function tasa() {
  if (historial.length < 10) return 0;
  const n = historial.length, t0 = historial[0].t;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const p of historial) { const x = (p.t - t0) / 60; sx += x; sy += p.n; sxx += x * x; sxy += x * p.n; }
  return (n * sxy - sx * sy) / (n * sxx - sx * sx);
}

const pub = (sub, obj, opts = {}) => cliente.publish(`${base}/${sub}`, JSON.stringify(obj), opts);
const evento = (tipo, extra = {}) => {
  const e = { tipo, ts: Math.floor(Date.now() / 1000), riesgo: ORDEN[riesgo], nivel: +nivel.toFixed(1), ...extra };
  console.log("[evento]", JSON.stringify(e));
  pub("evento", e);
};

cliente.on("connect", () => {
  console.log(`Simulador conectado · ${base}`);
  cliente.subscribe(`${base}/cmd`, { qos: 1 });
  pub("estado", { online: true, fw: "sim-1.0.0", ip: "simulador", umbrales: U, desborde: DESBORDE }, { retain: true, qos: 1 });
  evento("arranque", { fw: "sim-1.0.0" });
});

cliente.on("message", (_t, buf) => {
  let c; try { c = JSON.parse(buf.toString()); } catch { return; }
  console.log("[cmd]", c);
  if (c.accion === "barrera") { modoManual = true; barreraManual = c.valor === "cerrar"; sirenaManual = sirena; }
  else if (c.accion === "sirena") { modoManual = true; sirenaManual = !!c.valor; barreraManual = barrera; }
  else if (c.accion === "modo") { modoManual = c.valor === "manual"; barreraManual = barrera; sirenaManual = sirena; }
  else if (c.accion === "reconocer") { if (!reconocida) { reconocida = true; evento("alerta_reconocida", { origen: "app" }); } return; }
  else if (c.accion === "umbrales") { Object.assign(U, c.valor); pub("estado", { online: true, fw: "sim-1.0.0", ip: "simulador", umbrales: U, desborde: DESBORDE }, { retain: true, qos: 1 }); return; }
  else return;
  evento("comando", { accion: c.accion, modo: modoManual ? "manual" : "auto" });
});

let bajandoDesde = 0;
setInterval(() => {
  if (!cliente.connected) return;
  t += 1;
  nivel = nivelObjetivo(t) + (Math.random() - 0.5) * 0.15;
  historial.push({ t, n: nivel });
  if (historial.length > 30) historial.shift();
  const ta = tasa();
  const suelo = Math.min(100, Math.round(55 + nivel * 2.5));
  const objetivo = riesgoPara(nivel, ta, suelo);
  const anterior = riesgo;

  if (objetivo > riesgo) { riesgo = objetivo; bajandoDesde = 0; }
  else if (objetivo < riesgo) {
    const margen = riesgoPara(nivel + HIST, ta, suelo);
    if (margen < riesgo) { bajandoDesde ||= t; if (t - bajandoDesde > 10) { riesgo = margen; bajandoDesde = 0; } }
    else bajandoDesde = 0;
  }
  if (riesgo !== anterior) {
    if (riesgo > anterior && riesgo >= 2) reconocida = false;
    if (riesgo < 2) reconocida = true;
    evento("cambio_riesgo", { de: ORDEN[anterior], a: ORDEN[riesgo], tasa: +ta.toFixed(2), suelo });
  }

  barrera = modoManual ? barreraManual : riesgo >= 2;
  sirena = modoManual ? sirenaManual : riesgo === 3 && !reconocida;
  const pir = riesgo >= 2 && Math.random() < 0.03;
  if (pir && Date.now() - ultimoPir > 15000) { ultimoPir = Date.now(); evento("persona_zona"); }
  if (barrera && Math.random() < 0.01) evento("vehiculo_barrera");

  if (t % 2 === 0) {
    pub("telemetria", {
      ts: Math.floor(Date.now() / 1000), nivel: +nivel.toFixed(1), dist: +(23 - nivel).toFixed(1), tasa: +ta.toFixed(2),
      suelo, temp: +(29 + Math.sin(t / 300) * 3).toFixed(1), hum: Math.round(70 + nivel), riesgo: ORDEN[riesgo],
      barrera: barrera ? "cerrada" : "abierta", sirena, modo: modoManual ? "manual" : "auto", reconocida, pir, ir: false, rssi: -55,
    });
    process.stdout.write(`\r${ORDEN[riesgo].padEnd(8)} nivel ${nivel.toFixed(1).padStart(5)} cm  tasa ${ta.toFixed(2).padStart(6)} cm/min  barrera ${barrera ? "cerrada" : "abierta"}  sirena ${sirena ? "ON " : "off"}   `);
  }
}, 1000);
