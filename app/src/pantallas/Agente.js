import { useRef, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { api } from "../api";
import { color, espacio } from "../tema";

const SUGERENCIAS = [
  "¿Cómo está el río ahora?",
  "¿Cuánto falta para que se desborde?",
  "¿Cuántas alertas hubo hoy?",
  "¿Cuál fue el nivel máximo hoy y a qué hora?",
  "¿Cuánto tiempo estuvimos en alerta roja?",
  "Genera el reporte del último evento",
];

export default function Agente() {
  const [mensajes, setMensajes] = useState([
    { rol: "agente", texto: "Hola, soy el asistente de Centinela. Pregúntame por el nivel del río, las alertas o los sensores.", inicial: true },
  ]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const lista = useRef(null);

  async function enviar(pregunta) {
    const q = (pregunta ?? texto).trim();
    if (!q || pensando) return;
    const nuevos = [...mensajes, { rol: "usuario", texto: q }];
    setMensajes(nuevos);
    setTexto("");
    setPensando(true);
    try {
      const historial = nuevos.filter((m) => !m.inicial && !m.error).slice(-12).map(({ rol, texto }) => ({ rol, texto }));
      const r = await api("/api/agente", { metodo: "POST", cuerpo: { historial }, timeoutMs: 90000 });
      setMensajes((m) => [...m, { rol: "agente", texto: r.respuesta, herramientas: r.herramientas }]);
    } catch (e) {
      setMensajes((m) => [...m, { rol: "agente", texto: e.message, error: true }]);
    } finally {
      setPensando(false);
      setTimeout(() => lista.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <FlatList
        ref={lista}
        data={mensajes}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={s.lista}
        onContentSizeChange={() => lista.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[s.burbuja, item.rol === "usuario" ? s.usuario : s.agente, item.error && s.burbujaError]}>
            <Text style={[s.texto, item.rol === "usuario" && { color: "#fff" }]}>{item.texto}</Text>
            {item.herramientas?.length ? (
              <Text style={s.fuente}>Consultó: {[...new Set(item.herramientas)].join(", ")}</Text>
            ) : null}
          </View>
        )}
        ListFooterComponent={pensando ? (
          <View style={[s.burbuja, s.agente, { flexDirection: "row", alignItems: "center" }]}>
            <ActivityIndicator color={color.acento} />
            <Text style={[s.texto, { marginLeft: espacio.s, color: color.suave }]}>Consultando datos…</Text>
          </View>
        ) : null}
      />

      {mensajes.length <= 2 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sugerencias} keyboardShouldPersistTaps="handled">
          {SUGERENCIAS.map((q) => (
            <Pressable key={q} style={s.chip} onPress={() => enviar(q)}>
              <Text style={s.chipTexto}>{q}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={s.barra}>
        <TextInput
          style={s.input}
          placeholder="Escribe tu pregunta…"
          placeholderTextColor={color.suave}
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={() => enviar()}
          returnKeyType="send"
          multiline
          maxLength={500}
        />
        <Pressable style={[s.enviar, (!texto.trim() || pensando) && { opacity: 0.4 }]} onPress={() => enviar()} disabled={!texto.trim() || pensando}>
          <Text style={s.enviarTexto}>➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  lista: { padding: espacio.l, paddingBottom: espacio.s },
  burbuja: { maxWidth: "85%", borderRadius: 14, padding: espacio.m, marginBottom: espacio.s },
  usuario: { alignSelf: "flex-end", backgroundColor: color.acento, borderBottomRightRadius: 4 },
  agente: { alignSelf: "flex-start", backgroundColor: color.tarjeta, borderWidth: 1, borderColor: color.borde, borderBottomLeftRadius: 4 },
  burbujaError: { borderColor: color.error },
  texto: { fontSize: 15, color: color.texto, lineHeight: 21 },
  fuente: { fontSize: 11, color: color.suave, marginTop: espacio.xs },
  sugerencias: { paddingHorizontal: espacio.l, paddingBottom: espacio.s, gap: espacio.s },
  chip: { borderWidth: 1, borderColor: color.acento, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: color.acentoSuave },
  chipTexto: { color: color.acento, fontSize: 13 },
  barra: { flexDirection: "row", alignItems: "flex-end", padding: espacio.s, borderTopWidth: 1, borderTopColor: color.borde, backgroundColor: color.tarjeta },
  input: { flex: 1, maxHeight: 110, fontSize: 15, paddingHorizontal: espacio.m, paddingVertical: 10, color: color.texto, backgroundColor: "#F9FAFB", borderRadius: 20, borderWidth: 1, borderColor: color.borde },
  enviar: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.acento, alignItems: "center", justifyContent: "center", marginLeft: espacio.s },
  enviarTexto: { color: "#fff", fontSize: 18 },
});
