# Firmware · Centinela Cravo Sur

ESP32 DevKit v1 con PlatformIO (framework Arduino).

## Qué hace

- Mide el nivel del agua (HC-SR04, mediana de 5 lecturas) y calcula la **tasa de ascenso** (cm/min) con regresión lineal sobre los últimos 30 s.
- Clasifica el riesgo (verde → amarillo → naranja → rojo) combinando nivel, tasa y saturación del suelo, con **histéresis** para bajar de nivel.
- Señalización con 2 LED: verde fijo (normal), verde intermitente (amarillo), rojo fijo con barrera cerrada (naranja) y rojo intermitente (rojo) hasta que alguien reconozca la alerta (táctil o app). Sin sirena; el relé queda opcional (`USAR_RELE`).
- **Funciona sin internet**: la lógica corre en el ESP32. Si cae la conexión, guarda telemetría y eventos en memoria y los envía al reconectar.
- MQTT con TLS, QoS 1 en comandos, estado *retained* y **Last Will** (`online:false`) para detectar la caída de la estación.
- Actualización por WiFi (ArduinoOTA) y umbrales configurables desde la app (guardados en flash).

## Uso

```bash
cp include/secrets.example.h include/secrets.h   # completa WiFi y HiveMQ
pio run -t upload                                 # compilar y subir
pio device monitor                                # ver logs
pio run -t upload --upload-port centinela-est01.local   # actualizar por WiFi (OTA)
```

Calibra en `include/config.h`: `ALTURA_SENSOR_CM` (del fondo del cauce al sensor), umbrales, `SUELO_ADC_SECO/MOJADO` y `RELE_ACTIVO_EN_ALTO`.

## Simulación (sin hardware)

1. Instala la extensión **Wokwi Simulator** en VS Code.
2. `pio run -e wokwi`
3. Abre `diagram.json` y presiona ▶. Mueve la distancia del HC-SR04 para simular la creciente (distancia baja = agua alta); usa el potenciómetro como humedad de suelo y los botones como IR y táctil.

En la simulación se usa DHT22 (Wokwi no tiene DHT11) y la red `Wokwi-GUEST`.

## Topics MQTT

| Topic | Dirección | QoS | Contenido |
|---|---|---|---|
| `centinela/est01/telemetria` | ESP32 → | 0 | Lectura cada 2 s |
| `centinela/est01/evento` | ESP32 → | 0 | Cambios de riesgo, persona, vehículo, emergencia… |
| `centinela/est01/estado` | ESP32 → (retained) | 1 | `online`, IP, firmware, umbrales. LWT `{"online":false}` |
| `centinela/est01/cmd` | → ESP32 | 1 | `{"accion":"barrera","valor":"cerrar"}` etc. |

Detalle de los mensajes en [`docs/02-fase2.md`](../docs/02-fase2.md#9-topics-mqtt-y-mensajes).
