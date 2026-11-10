import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { api, cargarConfig } from "./src/api";
import { color, riesgo as R } from "./src/tema";
import Monitor from "./src/pantallas/Monitor";
import Historial from "./src/pantallas/Historial";
import Control from "./src/pantallas/Control";
import Agente from "./src/pantallas/Agente";
import Ajustes from "./src/pantallas/Ajustes";

const PESTANAS = [
  { id: "monitor", texto: "Monitor", icono: "◉" },
  { id: "historial", texto: "Historial", icono: "≋" },
  { id: "agente", texto: "Agente IA", icono: "✦" },
  { id: "control", texto: "Control", icono: "⚙" },
  { id: "ajustes", texto: "Ajustes", icono: "☰" },
];

export default function App() {
  const [listo, setListo] = useState(false);
  const [pestana, setPestana] = useState("monitor");
  const [rol, setRol] = useState(null);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  const refrescar = useCallback(async () => {
    try {
      setDatos(await api("/api/estado"));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // Al abrir: carga la configuración guardada y valida el token
  useEffect(() => {
    (async () => {
      const c = await cargarConfig();
      if (!c.url || !c.token) { setPestana("ajustes"); setListo(true); return; }
      try { setRol((await api("/api/sesion")).rol); } catch (e) { setError(e.message); }
      setListo(true);
    })();
  }, []);

  // Tiempo real: consulta el estado cada 2 s
  useEffect(() => {
    if (!rol) return;
    refrescar();
    const id = setInterval(refrescar, 2000);
    return () => clearInterval(id);
  }, [rol, refrescar]);

  async function reconocer() {
    try { await api("/api/comando", { metodo: "POST", cuerpo: { accion: "reconocer" } }); setTimeout(refrescar, 1000); }
    catch (e) { setError(e.message); }
  }

  const nivelRiesgo = datos?.telemetria?.riesgo ?? "verde";
  const enAlerta = nivelRiesgo === "naranja" || nivelRiesgo === "rojo";

  if (!listo) {
    return <View style={s.cargando}><ActivityIndicator size="large" color={color.acento} /></View>;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.raiz} edges={["top", "bottom"]}>
        <StatusBar style="dark" />
        <View style={s.encabezado}>
          <View>
            <Text style={s.titulo}>Centinela Cravo Sur</Text>
            <Text style={s.subtitulo}>Alerta temprana de crecientes · Yopal</Text>
          </View>
          <View style={[s.conexion, { backgroundColor: datos?.enLinea ? "#DCFCE7" : "#F3F4F6" }]}>
            <View style={[s.puntoConexion, { backgroundColor: datos?.enLinea ? "#15803D" : "#9CA3AF" }]} />
            <Text style={s.conexionTexto}>{datos?.enLinea ? "En línea" : "Sin señal"}</Text>
          </View>
        </View>

        {enAlerta && pestana !== "monitor" ? (
          <Pressable style={[s.banner, { backgroundColor: R[nivelRiesgo].fuerte }]} onPress={() => setPestana("monitor")}>
            <Text style={s.bannerTexto}>ALERTA {nivelRiesgo.toUpperCase()} · {datos.telemetria.nivel} cm · toca para ver</Text>
          </Pressable>
        ) : null}

        <View style={{ flex: 1 }}>
          {pestana === "monitor" && <Monitor datos={datos} error={error} rol={rol} onReconocer={reconocer} />}
          {pestana === "historial" && <Historial estacion={datos?.estacion} />}
          {pestana === "agente" && <Agente />}
          {pestana === "control" && <Control datos={datos} rol={rol} alCambiar={refrescar} />}
          {pestana === "ajustes" && <Ajustes alGuardar={(r) => { setRol(r); setPestana("monitor"); }} />}
        </View>

        <View style={s.tabs}>
          {PESTANAS.map((p) => {
            const activa = pestana === p.id;
            return (
              <Pressable key={p.id} style={s.tab} onPress={() => setPestana(p.id)}>
                <Text style={[s.tabIcono, { color: activa ? color.acento : color.suave }]}>{p.icono}</Text>
                <Text style={[s.tabTexto, { color: activa ? color.acento : color.suave, fontWeight: activa ? "700" : "500" }]}>{p.texto}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  cargando: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color.fondo },
  raiz: { flex: 1, backgroundColor: color.fondo },
  encabezado: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: color.tarjeta, borderBottomWidth: 1, borderBottomColor: color.borde },
  titulo: { fontSize: 18, fontWeight: "700", color: color.texto },
  subtitulo: { fontSize: 12, color: color.suave },
  conexion: { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  puntoConexion: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  conexionTexto: { fontSize: 12, color: color.texto },
  banner: { paddingVertical: 8, alignItems: "center" },
  bannerTexto: { color: "#fff", fontWeight: "700", fontSize: 13 },
  tabs: { flexDirection: "row", borderTopWidth: 1, borderTopColor: color.borde, backgroundColor: color.tarjeta },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8 },
  tabIcono: { fontSize: 18 },
  tabTexto: { fontSize: 11, marginTop: 2 },
});
