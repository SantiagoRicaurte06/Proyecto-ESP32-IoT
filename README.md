<div align="center">

# Centinela Cravo Sur

**Sistema IoT de alerta temprana de crecientes** · ESP32 + MQTT + App Android + Agente IA

Mide el nivel del río y **la velocidad a la que sube**, cierra el paso del puente, activa la sirena, avisa al celular y responde en lenguaje natural qué está pasando. Funciona aunque se caiga internet.

Proyecto formativo · **SENA – Tecnología en Análisis y Desarrollo de Software (ADSO)** · Yopal, Casanare, Colombia

![ESP32](https://img.shields.io/badge/ESP32-DevKit%20v1-E7352C?logo=espressif&logoColor=white)
![MQTT](https://img.shields.io/badge/MQTT-TLS%20%C2%B7%20HiveMQ-660066?logo=mqtt&logoColor=white)
![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20SQLite-339933?logo=nodedotjs&logoColor=white)
![Expo](https://img.shields.io/badge/App-React%20Native%20%C2%B7%20Expo-000020?logo=expo&logoColor=white)
![IA](https://img.shields.io/badge/Agente%20IA-Claude%20tool%20calling-D97757)
[![Firmware](https://github.com/SantiagoRicaurte06/Proyecto-ESP32-IoT/actions/workflows/firmware.yml/badge.svg)](https://github.com/SantiagoRicaurte06/Proyecto-ESP32-IoT/actions/workflows/firmware.yml)
[![Backend](https://github.com/SantiagoRicaurte06/Proyecto-ESP32-IoT/actions/workflows/backend.yml/badge.svg)](https://github.com/SantiagoRicaurte06/Proyecto-ESP32-IoT/actions/workflows/backend.yml)
[![APK](https://github.com/SantiagoRicaurte06/Proyecto-ESP32-IoT/actions/workflows/apk.yml/badge.svg)](https://github.com/SantiagoRicaurte06/Proyecto-ESP32-IoT/actions/workflows/apk.yml)

</div>

---

## Cómo funciona

| Riesgo | Condición (maqueta) | La estación… | Notificación |
|---|---|---|---|
| 🟢 Verde | nivel < 5 cm | paso abierto | — |
| 🟡 Amarillo | ≥ 5 cm o ribera saturada | vigila | push |
| 🟠 Naranja | ≥ 8 cm | **cierra la barrera** | push + correo |
| 🔴 Rojo | ≥ 11 cm | **sirena** hasta que alguien la reconozca | push repetido + correo |

Si el agua sube a más de 2 cm/min, el riesgo sube un nivel extra. Además, el sistema avisa cuando:
- hay personas en la ribera durante una alerta,
- un vehículo intenta cruzar con la barrera cerrada,
- alguien presiona el botón comunitario,
- la estación se desconecta.

## Arquitectura

```mermaid
flowchart LR
  S["Sensores<br/>nivel · suelo · DHT11<br/>PIR · IR · táctil"] --> E["ESP32<br/>riesgo local"]
  E --> A["Barrera · sirena<br/>semáforo · OLED"]
  E <-->|MQTT TLS| B[("HiveMQ Cloud")]
  B <--> K["Backend Node.js"]
  K --> D[("SQLite")]
  K --> N["Push ntfy · correo"]
  APP["App Android"] <-->|REST| K
  K <-->|tool calling| IA["Agente IA"]
```

## Estructura

| Carpeta | Contenido |
|---|---|
| [`firmware/`](firmware/) | ESP32 (PlatformIO): medición, tasa de ascenso, máquina de estados, MQTT, respaldo sin conexión, OTA · simulación Wokwi |
| [`backend/`](backend/) | MQTT → SQLite, predicción de desborde, notificaciones, API REST, agente IA, simulador de la estación |
| [`app/`](app/) | App Android (Expo): monitor, historial, control, chat con el agente |
| [`hardware/`](hardware/) | Plano eléctrico, plano de la maqueta, tabla de conexiones y materiales |
| [`docs/`](docs/) | Ideas, documento del proyecto y guía de puesta en marcha |

## Documentación

1. [Fase 1: ideas y comparación](docs/01-ideas.md)
2. [Fase 2: documento del proyecto](docs/02-fase2.md) (problema, objetivos, arquitectura, MQTT, agente IA, plan)
3. [Puesta en marcha paso a paso](docs/03-puesta-en-marcha.md)
4. [Hardware: conexiones y maqueta](hardware/README.md)

## Inicio rápido (sin hardware)

```bash
git clone https://github.com/SantiagoRicaurte06/Proyecto-ESP32-IoT.git
cd Proyecto-ESP32-IoT/backend
npm install && cp .env.example .env   # completa MQTT, tokens y API key
npm start                             # terminal 1
npm run simular                       # terminal 2: estación simulada
```

Instala el APK (pestaña **Actions → APK Android → Artifacts**), configura `http://<IP-del-PC>:3000` y el token, y verás la creciente simulada en tiempo real.

## Flujo de trabajo

[`GIT_WORKFLOW.md`](GIT_WORKFLOW.md): Git Flow simplificado (`main` / `develop` / `feature/*`), Conventional Commits y PRs con plantilla. Activa los hooks con `git config core.hooksPath .githooks`.

## Autor

**Santiago Alexis Ricaurte Piñeros** · [@SantiagoRicaurte06](https://github.com/SantiagoRicaurte06)

## Licencia

[MIT](LICENSE)
