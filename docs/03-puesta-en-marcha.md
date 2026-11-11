# Puesta en marcha

Guía paso a paso para tener el sistema completo funcionando. Sigue el orden: primero todo en simulación y luego con la maqueta.

## 0. Requisitos en el computador

- Node.js 22.13 o superior (`node -v`)
- VS Code + extensión **PlatformIO IDE** (y **Wokwi Simulator** para simular)
- Git

## 1. Cuentas (30 min, todas gratis salvo la IA)

### HiveMQ Cloud (broker MQTT)
1. Entra a <https://console.hivemq.cloud> y crea un cluster **Serverless (Free)**.
2. En *Access Management* crea dos credenciales con permiso de publicar y suscribirse:
   - `centinela-esp32` (para el ESP32)
   - `centinela-backend` (para el backend)
3. Copia el *Cluster URL* (algo como `abc123.s1.eu.hivemq.cloud`). Puerto TLS: **8883**.

### Notificaciones push (ntfy)
1. Instala **ntfy** desde Play Store.
2. Toca **+** y suscríbete a un topic difícil de adivinar, por ejemplo `centinela-cravosur-7f3k`. Ese mismo valor va en `NTFY_TOPIC`.

### Correo (opcional)
Gmail → Cuenta → Seguridad → activa la verificación en 2 pasos → **Contraseñas de aplicaciones**. Genera una y úsala en `SMTP_PASSWORD`.

### Agente IA (Anthropic)
1. <https://console.anthropic.com> → *API Keys* → *Create key*. Requiere cargar créditos (mínimo USD 5).
2. Costo aproximado con `claude-opus-5-5`: unos USD 0,05–0,10 por pregunta (cada pregunta hace 2–3 llamadas con herramientas). Para gastar menos puedes poner `CLAUDE_MODEL=claude-haiku-5-5` en `.env`, con respuestas algo menos elaboradas.

## 2. Backend

```bash
cd backend
npm install
cp .env.example .env      # complétalo con lo de arriba
npm test                  # 6 pruebas deben pasar
npm start
```

En `.env`:
- `MQTT_URL=mqtts://<tu-cluster>.s1.eu.hivemq.cloud:8883`
- `MQTT_USER` / `MQTT_PASSWORD`: los de `centinela-backend`
- `TOKEN_COMUNIDAD` y `TOKEN_OPERADOR`: genera cada uno con `node -e "console.log(crypto.randomUUID())"`

Debes ver `[mqtt] conectado al broker` y `[api] escuchando en http://0.0.0.0:3000`.

> Windows preguntará si permites que Node acceda a la red: marca **redes privadas** y acepta, o el celular no podrá conectarse.

Busca la IP del computador con `ipconfig` (Adaptador WiFi → Dirección IPv4, ej. `192.168.1.50`).

## 3. Probar sin hardware (simulador)

En otra terminal:
```bash
cd backend
npm run simular          # creciente completa cada ~4 min
```
El simulador publica exactamente lo mismo que el ESP32. Con él puedes probar la app, las alertas en ntfy y el agente IA antes de tener la maqueta. **Apágalo cuando conectes la estación real**, porque comparten los mismos topics.

## 4. App Android

**Opción A: APK de GitHub (recomendada).**
1. En GitHub → pestaña **Actions** → **APK Android** → la última ejecución en verde → *Artifacts* → `centinela-apk`.
2. Descomprime, pasa `centinela.apk` al celular e instálalo (permite "instalar apps desconocidas").
3. Si necesitas recompilar: *Actions* → *APK Android* → **Run workflow**.

**Opción B: desarrollo con Expo Go.** `cd app && npm install && npx expo start` y escanea el QR con la app Expo Go.

**Configurar:** en *Ajustes*, pon `http://<IP-del-PC>:3000` y el token:
- Operador: tú y el jurado en la demo.
- Comunidad: solo consulta.

Toca **Probar y guardar**.

> El celular y el computador deben estar **en la misma red**. Si la red del SENA aísla los dispositivos, usa el **hotspot del celular**: conecta el PC y el ESP32 al hotspot y usa la IP que el PC recibe ahí.
>
> Alternativa sin red local: `npx cloudflared tunnel --url http://localhost:3000` te da una URL `https://...trycloudflare.com` para poner en la app.

## 5. Firmware y maqueta

1. Abre la carpeta `firmware/` en VS Code (PlatformIO la detecta).
2. Copia `include/secrets.example.h` como `include/secrets.h` y pon el WiFi y las credenciales de `centinela-esp32`. El WiFi debe ser de 2,4 GHz.
3. Conecta el ESP32 por USB → **PlatformIO: Upload** (o `pio run -t upload`). Abre el monitor serial a 115200.
4. **Calibra** en `include/config.h` y vuelve a subir:
   - Toca el botón táctil para pasar a la página **Sensores** de la OLED.
   - `ALTURA_SENSOR_CM`: con el recipiente vacío, el valor `Dist` (cm). Con eso, el nivel marca ≈ 0.
   - `SUELO_ADC_SECO` / `SUELO_ADC_MOJADO`: el valor `ADC` del sensor de suelo en el aire y dentro de un vaso de agua.
   - `SERVO_ABIERTA` / `SERVO_CERRADA`: ángulos según cómo pegaste el brazo.
5. Después del primer USB, las siguientes subidas pueden ir por WiFi: `pio run -t upload --upload-port centinela-est01.local`.

**Simulación en Wokwi:** `pio run -e wokwi`, abre `firmware/diagram.json` y presiona ▶. Cambia la distancia del HC-SR04 (clic sobre el sensor) para simular la creciente.

## 6. Lista de verificación antes de la sustentación

- [ ] Verde con el recipiente vacío; amarillo, naranja y rojo al llenarlo a 5, 8 y 11 cm.
- [ ] Verde fijo → verde intermitente (amarillo) → rojo fijo y barrera abajo (naranja) → rojo intermitente (rojo). El táctil deja el rojo fijo.
- [ ] Llegan los push de ntfy en cada cambio y el correo en naranja y rojo.
- [ ] La app muestra "Desborde estimado en ~N min" mientras se vierte agua.
- [ ] Con el router apagado, la estación sigue actuando sola y llega "Estación DESCONECTADA". Al volver, el respaldo se envía.
- [ ] El agente responde "¿Cuántas alertas hubo hoy?" con datos reales.
- [ ] Hay 2–3 eventos completos en el histórico (corre crecientes de prueba antes).
- [ ] Batería del power bank cargada y cargador de 5 V para el riel de potencia.

## Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `[mqtt] fallo (-2)` en el ESP32 | WiFi sin internet o host mal escrito | Revisa `MQTT_HOST` (sin `mqtts://`) y que la red tenga salida |
| `fallo (5)` | Usuario o clave de HiveMQ | Revisa las credenciales de `centinela-esp32` |
| El ESP32 se reinicia al mover el servo | Servo alimentado desde el ESP32 | Usa la fuente externa de 5 V con GND común y el condensador |
| Nivel salta mucho | Agua en movimiento o eco en las paredes | Disco de icopor flotando bajo el sensor; sensor centrado |
| Humedad de suelo siempre 0 o 100 | Calibración | Ajusta `SUELO_ADC_SECO/MOJADO` |
| App: "Sin conexión con el servidor" | Red distinta o firewall | Misma red; permite Node en el firewall; prueba `http://IP:3000/api/salud` en el navegador del celular |
| Agente: "Falta o es inválida la ANTHROPIC_API_KEY" | Clave o créditos | Revisa `.env` y el saldo en la consola de Anthropic |
