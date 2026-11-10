<div align="center">

# Proyecto ESP32 · IoT + App Android + Agente IA

Sistema IoT basado en **ESP32** que monitorea sensores, controla actuadores por **MQTT**, guarda históricos y se opera desde una **app Android** con un **agente de IA** que responde preguntas en lenguaje natural sobre las métricas.

Proyecto formativo · **SENA – Tecnología en Análisis y Desarrollo de Software (ADSO)** · Yopal, Casanare, Colombia

![ESP32](https://img.shields.io/badge/ESP32-DevKit%20v1-E7352C?logo=espressif&logoColor=white)
![MQTT](https://img.shields.io/badge/MQTT-HiveMQ%20Cloud-660066?logo=mqtt&logoColor=white)
![Android](https://img.shields.io/badge/App-Android%20APK-3DDC84?logo=android&logoColor=white)
![Estado](https://img.shields.io/badge/estado-en%20dise%C3%B1o-lightgrey)
![Licencia](https://img.shields.io/badge/licencia-MIT-blue)

</div>

---

## Arquitectura

```mermaid
flowchart LR
    S[Sensores] --> E[ESP32]
    E --> A[Actuadores]
    E <-->|MQTT / TLS| B[(Broker MQTT)]
    B <--> K[Backend]
    K --> D[(Base de datos<br/>históricos)]
    K --> N[Notificaciones<br/>push / correo]
    APP[App Android] <-->|MQTT / API| B
    APP <--> IA[Agente IA]
    IA -->|tool calling| D
```

## Requisitos del proyecto

- ESP32 DevKit v1 (38 pines) con mínimo **3 sensores** y **2 actuadores**.
- Comunicación por **MQTT** (HiveMQ Cloud, EMQX o Mosquitto).
- App Android instalable (**APK**) para monitoreo y control.
- **Agente IA** dentro de la app que consulta el histórico ("¿cuál fue la temperatura promedio hoy?").
- **Notificaciones** push (FCM / ntfy) y/o correo.

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| [`firmware/`](firmware/) | Código del ESP32 (PlatformIO / Arduino) |
| [`backend/`](backend/) | Puente MQTT → base de datos, API y notificaciones |
| [`app/`](app/) | App móvil Android con el agente IA |
| [`hardware/`](hardware/) | Conexiones, plano eléctrico, simulación Wokwi, maqueta |
| [`docs/`](docs/) | Documentación del proyecto y de la presentación |

## Documentación

1. [Fase 1 — Ideas de proyecto y recomendación](docs/01-ideas.md)
2. Fase 2 — Desarrollo de la idea elegida _(pendiente)_

## Flujo de trabajo

El repositorio sigue [`GIT_WORKFLOW.md`](GIT_WORKFLOW.md): Git Flow simplificado (`main` / `develop` / `feature/*`), Conventional Commits y PRs con plantilla.

```bash
git clone https://github.com/SantiagoRicaurte06/Proyecto-ESP32-IoT.git
cd Proyecto-ESP32-IoT
git config core.hooksPath .githooks   # activa las validaciones de commits
git switch develop
```

## Autor

**Santiago Alexis Ricaurte Piñeros** · [@SantiagoRicaurte06](https://github.com/SantiagoRicaurte06)

## Licencia

[MIT](LICENSE)
