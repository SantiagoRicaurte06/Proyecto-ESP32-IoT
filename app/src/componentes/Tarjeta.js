import { View, Text, StyleSheet, Pressable } from "react-native";
import { color, espacio } from "../tema";

export function Tarjeta({ titulo, children, estilo }) {
  return (
    <View style={[s.tarjeta, estilo]}>
      {titulo ? <Text style={s.titulo}>{titulo}</Text> : null}
      {children}
    </View>
  );
}

export function Dato({ etiqueta, valor, unidad }) {
  return (
    <View style={s.dato}>
      <Text style={s.etiqueta}>{etiqueta}</Text>
      <Text style={s.valor}>
        {valor ?? "—"}
        {valor !== undefined && valor !== null && unidad ? <Text style={s.unidad}> {unidad}</Text> : null}
      </Text>
    </View>
  );
}

export function Boton({ texto, onPress, tipo = "primario", deshabilitado, estilo }) {
  const fondo = tipo === "primario" ? color.acento : tipo === "peligro" ? color.error : color.tarjeta;
  const colorTexto = tipo === "secundario" ? color.texto : "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      style={({ pressed }) => [s.boton, { backgroundColor: fondo, opacity: deshabilitado ? 0.4 : pressed ? 0.8 : 1 },
        tipo === "secundario" && { borderWidth: 1, borderColor: color.borde }, estilo]}
    >
      <Text style={[s.botonTexto, { color: colorTexto }]}>{texto}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  tarjeta: { backgroundColor: color.tarjeta, borderRadius: 12, borderWidth: 1, borderColor: color.borde, padding: espacio.l, marginBottom: espacio.m },
  titulo: { fontSize: 13, fontWeight: "600", color: color.suave, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: espacio.s },
  dato: { flexBasis: "50%", paddingVertical: espacio.s },
  etiqueta: { fontSize: 12, color: color.suave },
  valor: { fontSize: 20, fontWeight: "600", color: color.texto, marginTop: 2 },
  unidad: { fontSize: 13, fontWeight: "400", color: color.suave },
  boton: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: espacio.l, alignItems: "center", justifyContent: "center" },
  botonTexto: { fontSize: 15, fontWeight: "600" },
});
