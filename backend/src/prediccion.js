/**
 * Estima el tiempo hasta el desbordamiento con regresión lineal sobre las lecturas recientes.
 * @param {{ts:number, nivel:number}[]} lecturas  ordenadas por ts (ms)
 * @param {number} desborde  nivel de desbordamiento (cm)
 * @param {number} ventanaMs  cuánto historial usar (por defecto 3 min)
 */
export function predecirDesborde(lecturas, desborde, ventanaMs = 3 * 60_000) {
  if (!lecturas.length) return { disponible: false, motivo: "sin datos" };
  const fin = lecturas.at(-1).ts;
  const pts = lecturas.filter((l) => l.ts >= fin - ventanaMs && Number.isFinite(l.nivel));
  const nivelActual = lecturas.at(-1).nivel;
  if (pts.length < 8) return { disponible: false, motivo: "pocos datos recientes", nivelActual };

  const t0 = pts[0].ts;
  let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
  for (const p of pts) {
    const x = (p.ts - t0) / 60_000, y = p.nivel;
    sx += x; sy += y; sxx += x * x; sxy += x * y; syy += y * y;
  }
  const n = pts.length;
  const den = n * sxx - sx * sx;
  if (Math.abs(den) < 1e-9) return { disponible: false, motivo: "datos sin variación de tiempo", nivelActual };

  const pendiente = (n * sxy - sx * sy) / den; // cm/min
  const varY = n * syy - sy * sy;
  const r2 = varY > 1e-9 ? Math.min(((n * sxy - sx * sy) ** 2) / (den * varY), 1) : 0;
  const margen = Math.max(desborde - nivelActual, 0);

  let minutos = null, tendencia = "estable";
  if (pendiente > 0.05) {
    tendencia = "subiendo";
    minutos = margen === 0 ? 0 : Math.round((margen / pendiente) * 10) / 10;
  } else if (pendiente < -0.05) {
    tendencia = "bajando";
  }

  return {
    disponible: true,
    nivelActual: Math.round(nivelActual * 10) / 10,
    desborde,
    margenCm: Math.round(margen * 10) / 10,
    tasaCmMin: Math.round(pendiente * 100) / 100,
    tendencia,
    minutosHastaDesborde: minutos,
    confianza: Math.round(r2 * 100) / 100, // R² de la regresión (0 a 1)
  };
}
