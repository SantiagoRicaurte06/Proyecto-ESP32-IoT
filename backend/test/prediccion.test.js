import { test } from "node:test";
import assert from "node:assert/strict";
import { predecirDesborde } from "../src/prediccion.js";
import { desdeLocal, aLocal, rango } from "../src/tiempo.js";

const serie = (pendienteCmMin, n = 60, inicio = 2) =>
  Array.from({ length: n }, (_, i) => ({ ts: 1_800_000_000_000 + i * 2000, nivel: inicio + pendienteCmMin * (i * 2 / 60) }));

test("subiendo a 3 cm/min desde 5 cm estima el tiempo al desborde", () => {
  const p = predecirDesborde(serie(3, 60, 2), 14);
  assert.equal(p.tendencia, "subiendo");
  assert.ok(Math.abs(p.tasaCmMin - 3) < 0.01);
  // nivel final ≈ 2 + 3 * (118 s / 60) = 7,9 → margen 6,1 cm → ~2 min
  assert.ok(Math.abs(p.minutosHastaDesborde - 2.03) < 0.1, `obtuvo ${p.minutosHastaDesborde}`);
  assert.ok(p.confianza > 0.99);
});

test("nivel estable no predice desborde", () => {
  const p = predecirDesborde(serie(0), 14);
  assert.equal(p.tendencia, "estable");
  assert.equal(p.minutosHastaDesborde, null);
});

test("bajando no predice desborde", () => {
  assert.equal(predecirDesborde(serie(-2, 60, 12), 14).tendencia, "bajando");
});

test("pocos datos: no disponible", () => {
  assert.equal(predecirDesborde(serie(3, 3), 14).disponible, false);
  assert.equal(predecirDesborde([], 14).disponible, false);
});

test("las horas se interpretan en Colombia (UTC-5)", () => {
  assert.equal(desdeLocal("2026-11-10T08:00"), Date.parse("2026-11-10T13:00:00Z"));
  assert.equal(aLocal(Date.parse("2026-11-10T13:00:00Z")), "2026-11-10 08:00:00");
  assert.equal(desdeLocal("no es fecha"), null);
});

test("rango por defecto: desde el inicio de hoy hasta ahora", () => {
  const ahora = Date.parse("2026-11-10T20:30:00Z"); // 3:30 p. m. en Colombia
  const [d, h] = rango(undefined, undefined, ahora);
  assert.equal(aLocal(d), "2026-11-10 00:00:00");
  assert.equal(h, ahora);
});
