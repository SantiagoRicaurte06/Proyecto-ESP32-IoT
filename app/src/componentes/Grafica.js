import { View, Text, StyleSheet } from "react-native";
import Svg, { Polyline, Line, Rect, Text as SvgText } from "react-native-svg";
import { color, riesgo as colRiesgo } from "../tema";

/** Gráfica de nivel con líneas de umbral. serie: [{ts, nivel}] */
export function GraficaNivel({ serie, umbrales, desborde = 14, ancho = 320, alto = 180 }) {
  const m = { izq: 28, der: 8, arr: 8, aba: 20 };
  const w = ancho - m.izq - m.der, h = alto - m.arr - m.aba;
  const max = Math.max(desborde + 1, ...serie.map((p) => p.nivel ?? 0));
  if (serie.length < 2) {
    return <View style={[s.vacio, { height: alto }]}><Text style={s.vacioTexto}>Aún no hay datos suficientes</Text></View>;
  }
  const t0 = serie[0].ts, t1 = serie.at(-1).ts || t0 + 1;
  const x = (ts) => m.izq + ((ts - t0) / Math.max(t1 - t0, 1)) * w;
  const y = (v) => m.arr + h - (v / max) * h;
  const puntos = serie.filter((p) => p.nivel !== null).map((p) => `${x(p.ts).toFixed(1)},${y(p.nivel).toFixed(1)}`).join(" ");
  const lineas = umbrales ? [["amarillo", umbrales.amarillo], ["naranja", umbrales.naranja], ["rojo", umbrales.rojo]] : [];
  const hora = (ts) => new Date(ts).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });

  return (
    <Svg width={ancho} height={alto}>
      <Rect x={m.izq} y={m.arr} width={w} height={h} fill="#FAFAFA" stroke={color.borde} strokeWidth={1} />
      {lineas.map(([n, v]) => (
        <Line key={n} x1={m.izq} x2={m.izq + w} y1={y(v)} y2={y(v)} stroke={colRiesgo[n].fuerte} strokeWidth={1} strokeDasharray="4,4" />
      ))}
      <Line x1={m.izq} x2={m.izq + w} y1={y(desborde)} y2={y(desborde)} stroke={color.texto} strokeWidth={1} />
      <SvgText x={m.izq + 4} y={y(desborde) - 3} fontSize="9" fill={color.texto}>desborde {desborde} cm</SvgText>
      {[0, max / 2, max].map((v) => (
        <SvgText key={v} x={m.izq - 4} y={y(v) + 3} fontSize="9" fill={color.suave} textAnchor="end">{v.toFixed(0)}</SvgText>
      ))}
      <SvgText x={m.izq} y={alto - 5} fontSize="9" fill={color.suave}>{hora(t0)}</SvgText>
      <SvgText x={m.izq + w} y={alto - 5} fontSize="9" fill={color.suave} textAnchor="end">{hora(t1)}</SvgText>
      <Polyline points={puntos} fill="none" stroke={color.acento} strokeWidth={2} />
    </Svg>
  );
}

const s = StyleSheet.create({
  vacio: { alignItems: "center", justifyContent: "center", backgroundColor: "#FAFAFA", borderRadius: 8 },
  vacioTexto: { color: color.suave },
});
