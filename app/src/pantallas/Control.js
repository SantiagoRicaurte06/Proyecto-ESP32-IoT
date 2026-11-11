import { useEffect, useState } from "react";
import { ScrollView, View, Text, TextInput, StyleSheet } from "react-native";
import { Tarjeta, Boton } from "../componentes/Tarjeta";
import { api } from "../api";
import { color, espacio } from "../tema";

export default function Control({ datos, rol, alCambiar }) {
  const t = datos?.telemetria;
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [umbrales, setUmbrales] = useState({ amarillo: "", naranja: "", rojo: "" });

  useEffect(() => {
    const u = datos?.estacion?.umbrales;
    if (u && !umbrales.amarillo) setUmbrales({ amarillo: String(u.amarillo), naranja: String(u.naranja), rojo: String(u.rojo) });
  }, [datos?.estacion?.umbrales]);

  if (rol !== "operador") {
    return (
      <View style={s.contenido}>
        <Tarjeta titulo="Control">
          <Text style={s.texto}>El control de la estación es solo para operadores de gestión del riesgo.</Text>
          <Text style={[s.texto, { marginTop: espacio.s, color: color.suave }]}>Usa el token de operador en Ajustes para habilitarlo.</Text>
        </Tarjeta>
      </View>
    );
  }

  async function enviar(accion, valor, texto) {
    setEnviando(true);
    try {
      await api("/api/comando", { metodo: "POST", cuerpo: { accion, valor } });
      setMensaje(`✓ ${texto}`);
      setTimeout(alCambiar, 1200);
    } catch (e) {
      setMensaje(`✖ ${e.message}`);
    } finally {
      setEnviando(false);
    }
  }

  function guardarUmbrales() {
    const v = { amarillo: Number(umbrales.amarillo), naranja: Number(umbrales.naranja), rojo: Number(umbrales.rojo) };
    if (!(v.amarillo > 0 && v.amarillo < v.naranja && v.naranja < v.rojo)) {
      setMensaje("✖ Los umbrales deben cumplir amarillo < naranja < rojo");
      return;
    }
    enviar("umbrales", v, "Umbrales actualizados");
  }

  const manual = t?.modo === "manual";
  const cerrada = t?.barrera === "cerrada";

  return (
    <ScrollView contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled">
      {mensaje ? <Text style={[s.mensaje, { color: mensaje.startsWith("✓") ? "#15803D" : color.error }]}>{mensaje}</Text> : null}

      <Tarjeta titulo="Modo de operación">
        <Text style={s.texto}>
          {manual ? "MANUAL: la barrera sigue tus órdenes." : "AUTOMÁTICO: la estación decide según el nivel de riesgo."}
        </Text>
        <Boton
          texto={manual ? "Volver a automático" : "Pasar a manual"}
          tipo={manual ? "primario" : "secundario"}
          deshabilitado={enviando}
          onPress={() => enviar("modo", manual ? "auto" : "manual", manual ? "Modo automático" : "Modo manual")}
          estilo={{ marginTop: espacio.m }}
        />
      </Tarjeta>

      <Tarjeta titulo={`Barrera · ${cerrada ? "cerrada" : "abierta"}`}>
        <View style={s.fila}>
          <Boton texto="Cerrar paso" tipo="peligro" deshabilitado={enviando || cerrada} onPress={() => enviar("barrera", "cerrar", "Barrera cerrada")} estilo={s.mitad} />
          <Boton texto="Abrir paso" tipo="secundario" deshabilitado={enviando || !cerrada} onPress={() => enviar("barrera", "abrir", "Barrera abierta")} estilo={s.mitad} />
        </View>
      </Tarjeta>

      <Tarjeta titulo={`Alerta · ${t?.alarma ? "LED rojo parpadeando" : t?.reconocida === false ? "sin reconocer" : "sin alerta pendiente"}`}>
        <Text style={s.texto}>Reconocer la alerta deja el LED rojo fijo y detiene la repetición de notificaciones. La barrera sigue cerrada mientras el riesgo sea naranja o rojo.</Text>
        <Boton texto="Reconocer alerta" tipo="peligro" deshabilitado={enviando || t?.reconocida !== false} onPress={() => enviar("reconocer", undefined, "Alerta reconocida")} estilo={{ marginTop: espacio.m }} />
      </Tarjeta>

      <Tarjeta titulo="Umbrales de alerta (cm)">
        <View style={s.fila}>
          {["amarillo", "naranja", "rojo"].map((k) => (
            <View key={k} style={{ flex: 1 }}>
              <Text style={s.etiqueta}>{k}</Text>
              <TextInput
                style={s.input}
                keyboardType="decimal-pad"
                value={umbrales[k]}
                onChangeText={(v) => setUmbrales({ ...umbrales, [k]: v.replace(",", ".") })}
              />
            </View>
          ))}
        </View>
        <Boton texto="Guardar umbrales" deshabilitado={enviando} onPress={guardarUmbrales} estilo={{ marginTop: espacio.m }} />
      </Tarjeta>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  contenido: { padding: espacio.l },
  texto: { color: color.texto, fontSize: 15 },
  mensaje: { textAlign: "center", marginBottom: espacio.m, fontWeight: "600" },
  fila: { flexDirection: "row", gap: espacio.s },
  mitad: { flex: 1 },
  etiqueta: { fontSize: 12, color: color.suave, textTransform: "capitalize", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: color.borde, borderRadius: 8, padding: 10, fontSize: 16, color: color.texto, backgroundColor: "#FAFAFA" },
});
