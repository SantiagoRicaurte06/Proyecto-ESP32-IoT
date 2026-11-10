# App Android · Centinela

React Native + Expo SDK 58. Cinco pestañas: **Monitor** (tiempo real), **Historial** (gráfica y eventos), **Agente IA** (chat), **Control** (solo operador) y **Ajustes**.

```
App.js                 navegación por pestañas, consulta de estado cada 2 s, aviso de alerta
src/api.js             cliente REST con token y configuración guardada (AsyncStorage)
src/tema.js            colores y estilos (gris claro + acento azul + colores de riesgo)
src/pantallas/         Monitor, Historial, Control, Agente, Ajustes
src/componentes/       Tarjeta, Dato, Boton, GraficaNivel (react-native-svg)
```

## APK

Se compila en GitHub Actions (`.github/workflows/apk.yml`): **Actions → APK Android → Artifacts → centinela-apk**. Para recompilar: *Run workflow*.

## Desarrollo

```bash
npm install
npx expo start     # escanea el QR con Expo Go
```

`app.json` habilita tráfico HTTP (`usesCleartextTraffic`) porque el backend corre en la red local sin HTTPS. Si usas un túnel HTTPS puedes quitarlo.
