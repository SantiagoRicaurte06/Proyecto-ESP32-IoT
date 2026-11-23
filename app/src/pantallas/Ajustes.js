import { useState } from "react";
import { ScrollView, Text, TextInput, StyleSheet } from "react-native";
import { Tarjeta, Boton } from "../componentes/Tarjeta";
import { api, guardarConfig, configActual } from "../api";
import { color, espacio } from "../tema";

export default function Ajustes({ alGuardar }) {
  const inicial = configActual();
  const [url, setUrl] = useState(inicial.url || "http://192.168.");
  const [token, setToken] = useState(inicial.token);
  const [estado, setEstado] = useState("");
  const [probando, setProbando] = useState(false);

  async function probarYGuardar() {
    setProbando(true);
    setEstado("Probando conexión…");
    try {
      const prueba = { url: url.trim().replace(/\/+$/, ""), token: token.trim() };
      const { rol } = await api("/api/sesion", { config: prueba });
      await guardarConfig(prueba);
      setEstado(`✓ Conectado como ${rol}`);
      alGuardar(rol);
    } catch (e) {
      setEstado(`✖ ${e.message}`);
    } finally {
      setProbando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled">
      <Tarjeta titulo="Servidor">
        <Text style={s.etiqueta}>URL del backend</Text>
        <TextInput style={s.input} value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="http://192.168.1.50:3000" />
        <Text style={s.ayuda}>La IP del computador donde corre el backend (misma red WiFi), con el puerto 3000.</Text>

        <Text style={[s.etiqueta, { marginTop: espacio.l }]}>Token de acceso</Text>
        <TextInput style={s.input} value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} secureTextEntry placeholder="Token de comunidad u operador" />
        <Text style={s.ayuda}>Comunidad: solo consulta. Operador: también controla la barrera y reconoce alertas.</Text>

        <Boton texto="Probar y guardar" deshabilitado={probando} onPress={probarYGuardar} estilo={{ marginTop: espacio.l }} />
        {estado ? <Text style={[s.estado, { color: estado.startsWith("✓") ? "#15803D" : estado.startsWith("✖") ? color.error : color.suave }]}>{estado}</Text> : null}
      </Tarjeta>

      <Tarjeta titulo="Notificaciones push">
        <Text style={s.texto}>
          Instala la app <Text style={{ fontWeight: "700" }}>ntfy</Text> desde Play Store y suscríbete al topic de tu estación (te lo da el operador). Recibirás las alertas aunque esta app esté cerrada.
        </Text>
      </Tarjeta>

      <Text style={s.version}>Centinela Cravo Sur · v1.0.0 · SENA ADSO · Yopal</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  contenido: { padding: espacio.l },
  etiqueta: { fontSize: 13, color: color.suave, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: color.borde, borderRadius: 8, padding: 12, fontSize: 15, color: color.texto, backgroundColor: "#FAFAFA" },
  ayuda: { fontSize: 12, color: color.suave, marginTop: 6 },
  estado: { textAlign: "center", marginTop: espacio.m, fontWeight: "600" },
  texto: { fontSize: 14, color: color.texto, lineHeight: 20 },
  version: { textAlign: "center", color: color.suave, fontSize: 12, marginTop: espacio.s },
});
