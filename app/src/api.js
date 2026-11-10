import AsyncStorage from "@react-native-async-storage/async-storage";

const CLAVE = "centinela.config.v1";
let actual = { url: "", token: "" };

export async function cargarConfig() {
  try {
    const s = await AsyncStorage.getItem(CLAVE);
    if (s) actual = { ...actual, ...JSON.parse(s) };
  } catch {}
  return actual;
}

export async function guardarConfig(c) {
  actual = { url: c.url.trim().replace(/\/+$/, ""), token: c.token.trim() };
  await AsyncStorage.setItem(CLAVE, JSON.stringify(actual));
  return actual;
}

export const configActual = () => actual;

export async function api(ruta, { metodo = "GET", cuerpo, timeoutMs = 8000, config = actual } = {}) {
  if (!config.url) throw new Error("Configura la URL del servidor en Ajustes");
  const control = new AbortController();
  const t = setTimeout(() => control.abort(), timeoutMs);
  try {
    const r = await fetch(`${config.url}${ruta}`, {
      method: metodo,
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      signal: control.signal,
    });
    const datos = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(datos.error || `Error ${r.status}`);
    return datos;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("El servidor no responde");
    if (e.message === "Network request failed") throw new Error("Sin conexión con el servidor");
    throw e;
  } finally {
    clearTimeout(t);
  }
}
