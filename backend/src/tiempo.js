// Colombia es UTC-5 todo el año (sin horario de verano).
export const ZONA = "America/Bogota";
const OFFSET = "-05:00";

const formato = new Intl.DateTimeFormat("es-CO", {
  timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
});

/** ms → "2026-11-10 14:05:09" en hora de Colombia */
export function aLocal(ms) {
  const p = Object.fromEntries(formato.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

/** "2026-11-10T08:00" (hora de Colombia, sin zona) o ISO con zona → ms. null si no es válida. */
export function desdeLocal(texto) {
  if (typeof texto !== "string" || !texto.trim()) return null;
  let s = texto.trim().replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += "T00:00";
  if (!/(Z|[+-]\d{2}:?\d{2})$/.test(s)) s += OFFSET;
  const ms = Date.parse(s);
  return Number.isNaN(ms) ? null : ms;
}

/** Inicio del día de hoy en Colombia (ms) */
export function inicioDeHoy(ahora = Date.now()) {
  return desdeLocal(aLocal(ahora).slice(0, 10));
}

/** Rango [desde, hasta] a partir de textos opcionales; por defecto: hoy hasta ahora. */
export function rango(desde, hasta, ahora = Date.now()) {
  const d = desdeLocal(desde) ?? inicioDeHoy(ahora);
  const h = desdeLocal(hasta) ?? ahora;
  return d <= h ? [d, h] : [h, d];
}
