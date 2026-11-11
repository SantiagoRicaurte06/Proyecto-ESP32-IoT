import { ScrollView, View, Text, StyleSheet } from "react-native";
import { Tarjeta, Dato, Boton } from "../componentes/Tarjeta";
import { color, riesgo as R, espacio } from "../tema";

function hace(ts) {
  if (!ts) return "sin datos";
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  return s < 60 ? `hace ${s} s` : `hace ${Math.round(s / 60)} min`;
}

export default function Monitor({ datos, error, rol, onReconocer }) {
  const t = datos?.telemetria;
  const p = datos?.prediccion;
  const nivelRiesgo = t?.riesgo ?? "verde";
  const r = R[nivelRiesgo];
  const desborde = datos?.estacion?.desborde ?? 14;
  const pct = t ? Math.min(100, Math.max(0, (t.nivel / desborde) * 100)) : 0;

  return (
    <ScrollView contentContainerStyle={s.contenido}>
      {error ? <Text style={s.error}>{error}</Text> : null}

      <View style={[s.riesgo, { backgroundColor: r.fondo, borderColor: r.fuerte }]}>
        <Text style={[s.riesgoEtiqueta, { color: r.fuerte }]}>ALERTA {nivelRiesgo.toUpperCase()}</Text>
        <Text style={s.riesgoTitulo}>{r.texto}</Text>
        <Text style={s.riesgoConsejo}>{r.consejo}</Text>
        {t?.alarma ? <Text style={[s.alarma, { color: r.fuerte }]}>● LED rojo en alerta: reconoce para detener la repetición</Text> : null}
        {t && !t.reconocida && rol === "operador" ? (
          <Boton texto="Reconocer alerta" tipo="peligro" onPress={onReconocer} estilo={{ marginTop: espacio.m }} />
        ) : null}
      </View>

      <Tarjeta titulo="Nivel del agua">
        <View style={s.filaNivel}>
          <View style={s.tubo}>
            <View style={[s.agua, { height: `${pct}%`, backgroundColor: r.fuerte }]} />
          </View>
          <View style={{ flex: 1, marginLeft: espacio.l }}>
            <Text style={s.nivel}>{t ? t.nivel.toFixed(1) : "—"}<Text style={s.unidad}> cm</Text></Text>
            <Text style={s.suave}>de {desborde} cm (desborde)</Text>
            <Text style={[s.tasa, { color: (t?.tasa ?? 0) > 0.5 ? r.fuerte : color.texto }]}>
              {t ? `${t.tasa > 0 ? "▲" : t.tasa < 0 ? "▼" : "■"} ${Math.abs(t.tasa).toFixed(2)} cm/min` : ""}
            </Text>
          </View>
        </View>
        {p?.disponible && p.minutosHastaDesborde !== null ? (
          <View style={s.prediccion}>
            <Text style={s.prediccionTexto}>Desborde estimado en ~{p.minutosHastaDesborde} min</Text>
            <Text style={s.suave}>Confianza {Math.round(p.confianza * 100)} % · margen {p.margenCm} cm</Text>
          </View>
        ) : p?.disponible ? (
          <Text style={[s.suave, { marginTop: espacio.m }]}>Tendencia: {p.tendencia}</Text>
        ) : null}
      </Tarjeta>

      <Tarjeta titulo="Sensores">
        <View style={s.grilla}>
          <Dato etiqueta="Distancia al agua" valor={t?.dist} unidad="cm" />
          <Dato etiqueta="Temperatura" valor={t?.temp} unidad="°C" />
          <Dato etiqueta="Humedad aire" valor={t?.hum} unidad="%" />
          <Dato etiqueta="Personas en ribera" valor={t ? (t.pir ? "Detectada" : "No") : null} />
        </View>
      </Tarjeta>

      <Tarjeta titulo="Actuadores">
        <View style={s.grilla}>
          <Dato etiqueta="Barrera" valor={t?.barrera === "cerrada" ? "Cerrada" : t ? "Abierta" : null} />
          <Dato etiqueta="LED de alerta" valor={t ? ({ verde: "Verde", amarillo: "Verde intermitente", naranja: "Rojo", rojo: "Rojo intermitente" }[t.riesgo] ?? "—") : null} />
          <Dato etiqueta="Modo" valor={t ? (t.modo === "manual" ? "Manual" : "Automático") : null} />
          <Dato etiqueta="Vehículo en barrera" valor={t ? (t.ir ? "Sí" : "No") : null} />
        </View>
      </Tarjeta>

      <Text style={s.pie}>
        Estación {datos?.enLinea ? "en línea" : "DESCONECTADA"} · última lectura {hace(t?.ts)}
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  contenido: { padding: espacio.l },
  error: { color: color.error, marginBottom: espacio.m, textAlign: "center" },
  riesgo: { borderRadius: 14, borderWidth: 1.5, padding: espacio.l, marginBottom: espacio.m },
  riesgoEtiqueta: { fontSize: 13, fontWeight: "700", letterSpacing: 1 },
  riesgoTitulo: { fontSize: 28, fontWeight: "700", color: color.texto, marginTop: 2 },
  riesgoConsejo: { fontSize: 15, color: color.texto, marginTop: espacio.xs },
  alarma: { fontWeight: "700", marginTop: espacio.s },
  filaNivel: { flexDirection: "row", alignItems: "center" },
  tubo: { width: 36, height: 110, borderRadius: 8, borderWidth: 1, borderColor: color.borde, backgroundColor: "#F9FAFB", justifyContent: "flex-end", overflow: "hidden" },
  agua: { width: "100%", opacity: 0.85 },
  nivel: { fontSize: 40, fontWeight: "700", color: color.texto },
  unidad: { fontSize: 18, fontWeight: "400", color: color.suave },
  tasa: { fontSize: 17, fontWeight: "600", marginTop: espacio.s },
  suave: { color: color.suave, fontSize: 13 },
  prediccion: { marginTop: espacio.m, padding: espacio.m, borderRadius: 8, backgroundColor: color.acentoSuave },
  prediccionTexto: { fontWeight: "700", color: color.acento, fontSize: 15 },
  grilla: { flexDirection: "row", flexWrap: "wrap" },
  pie: { textAlign: "center", color: color.suave, fontSize: 12, marginVertical: espacio.s },
});
