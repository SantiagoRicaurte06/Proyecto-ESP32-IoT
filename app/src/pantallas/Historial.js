import { useCallback, useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, useWindowDimensions, RefreshControl } from "react-native";
import { Tarjeta } from "../componentes/Tarjeta";
import { GraficaNivel } from "../componentes/Grafica";
import { api } from "../api";
import { color, riesgo as R, espacio } from "../tema";

const RANGOS = [["15 min", 15], ["1 h", 60], ["6 h", 360], ["24 h", 1440]];

const NOMBRE = {
  cambio_riesgo: "Cambio de alerta",
  persona_zona: "Persona en la ribera",
  vehiculo_barrera: "Vehículo en la barrera",
  boton_emergencia: "Botón de emergencia",
  alerta_reconocida: "Alerta reconocida",
  comando: "Comando",
  arranque: "Estación reiniciada",
};

function detalle(e) {
  const d = e.datos || {};
  if (e.tipo === "cambio_riesgo") return `${d.de} → ${d.a} · ${e.nivel} cm · ${d.tasa} cm/min`;
  if (e.tipo === "alerta_reconocida") return `desde ${d.origen === "app" ? "la app" : "la estación"}`;
  if (e.tipo === "comando") return `${d.accion} (modo ${d.modo})`;
  return e.nivel !== null && e.nivel !== undefined ? `nivel ${e.nivel} cm` : "";
}

export default function Historial({ estacion }) {
  const { width } = useWindowDimensions();
  const [minutos, setMinutos] = useState(60);
  const [serie, setSerie] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [h, e] = await Promise.all([api(`/api/historial?minutos=${minutos}`), api("/api/eventos?limite=40")]);
      setSerie(h.serie); setEventos(e.eventos); setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [minutos]);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 10000);
    return () => clearInterval(id);
  }, [cargar]);

  return (
    <ScrollView contentContainerStyle={s.contenido} refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} />}>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <Tarjeta titulo="Nivel del agua">
        <View style={s.rangos}>
          {RANGOS.map(([t, m]) => (
            <Pressable key={m} onPress={() => setMinutos(m)} style={[s.rango, minutos === m && s.rangoActivo]}>
              <Text style={[s.rangoTexto, minutos === m && { color: "#fff" }]}>{t}</Text>
            </Pressable>
          ))}
        </View>
        <GraficaNivel serie={serie} umbrales={estacion?.umbrales} desborde={estacion?.desborde ?? 14} ancho={width - 66} />
      </Tarjeta>

      <Tarjeta titulo="Eventos recientes">
        {eventos.length === 0 ? <Text style={s.suave}>Sin eventos todavía</Text> : null}
        {eventos.map((e) => {
          const c = R[e.datos?.a ?? e.riesgo] ?? R.verde;
          return (
            <View key={e.id} style={s.evento}>
              <View style={[s.punto, { backgroundColor: c.fuerte }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.eventoTitulo}>{NOMBRE[e.tipo] ?? e.tipo}</Text>
                <Text style={s.suave}>{detalle(e)}</Text>
              </View>
              <Text style={s.hora}>{new Date(e.ts).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</Text>
            </View>
          );
        })}
      </Tarjeta>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  contenido: { padding: espacio.l },
  error: { color: color.error, marginBottom: espacio.m, textAlign: "center" },
  rangos: { flexDirection: "row", marginBottom: espacio.m, gap: espacio.s },
  rango: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: color.borde },
  rangoActivo: { backgroundColor: color.acento, borderColor: color.acento },
  rangoTexto: { fontSize: 13, color: color.texto },
  evento: { flexDirection: "row", alignItems: "center", paddingVertical: espacio.s, borderBottomWidth: 1, borderBottomColor: color.borde },
  punto: { width: 10, height: 10, borderRadius: 5, marginRight: espacio.m },
  eventoTitulo: { fontWeight: "600", color: color.texto },
  suave: { color: color.suave, fontSize: 13 },
  hora: { color: color.suave, fontSize: 12, marginLeft: espacio.s },
});
