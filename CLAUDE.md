# Centinela Cravo Sur · alerta temprana de crecientes

Proyecto formativo SENA (ADSO), Yopal, Casanare. Todo en español: textos, identificadores y comentarios.

## Contexto técnico

- Documento del proyecto: `docs/02-fase2.md` (topics MQTT, API, agente). Guía: `docs/03-puesta-en-marcha.md`.
- `firmware/`: ESP32 DevKit v1, PlatformIO + Arduino. Pines y umbrales en `include/config.h`. Compila con `~/.platformio/penv/Scripts/pio.exe run` (entornos `esp32dev` y `wokwi`).
- `backend/`: Node.js 22+ ESM, sin framework (`node:http`, `node:sqlite`), `mqtt`, `@anthropic-ai/sdk`, `nodemailer`. `npm test`; `npm run simular` simula la estación.
- `app/`: Expo SDK 58 (React Native, JS). Antes de tocar APIs de Expo lee `app/AGENTS.md`. Instala paquetes con `npx expo install`. El APK se compila en GitHub Actions (`apk.yml`).
- Si cambias un topic, un mensaje o una ruta, actualiza a la vez firmware, simulador, backend, app y `docs/02-fase2.md`.
- Hardware en uso: HC-SR04, DHT11, táctil capacitivo, SG90, relé 1 canal (sin uso: no hay sirena), OLED I2C, LCD 16x2, joystick KY-023 y **solo LED rojo y verde**. La alerta se muestra con los 2 LED y la barrera. Se retiraron del proyecto la humedad de suelo, el PIR y el IR de obstáculos. Matriz 8x8 y display de 4 dígitos sin driver: descartados por consumo de GPIO.

## Reglas de hardware (no negociables)

- Sensores analógicos solo en **ADC1** (GPIO32–39). ADC2 no funciona con WiFi.
- GPIO34–39 son solo entrada y sin pull-up interno.
- No usar GPIO6–11 (flash). Evitar GPIO0, 2, 12, 15 para cosas que afecten el arranque.
- ECHO del HC-SR04 con divisor de tensión (1 kΩ / 2 kΩ).
- Servo y relé a 5 V con GND común; fuente externa si hay bomba o carga real.

## Secretos

- WiFi, MQTT, claves de API (LLM, FCM, correo) van en `.env` o `firmware/include/secrets.h`, **nunca** en el repo. Solo se suben las plantillas `.env.example` y `secrets.example.h`.
- La API key del LLM vive en el backend, nunca dentro del APK.

## Git workflow

Este repositorio sigue `GIT_WORKFLOW.md`. Reglas obligatorias para asistentes de IA:

- Ramas `tipo/descripcion-corta` (feature, fix, refactor, docs, chore, release, hotfix) desde `develop` (hotfix desde `main`). Nunca commit directo a `main` ni `develop`.
- Commits en Conventional Commits: `<tipo>(<scope>): <descripción>`, imperativo, minúscula, sin punto final, ≤ 72 caracteres. Scopes sugeridos: `firmware`, `backend`, `app`, `ia`, `mqtt`, `hardware`, `docs`.
- **No añadir coautorías** (`Co-Authored-By`) ni firmas de generación automática en commits, PRs, tags o releases.
- No modificar `user.name` ni `user.email`.
- No hacer `push`, `force-push`, reescritura de historial, merges a `main`/`develop` ni crear tags sin aprobación explícita.
- Proponer el mensaje del commit y el diff antes de ejecutar cuando el cambio no sea trivial.
- Antes de reescribir historial: `git branch backup/<descripcion>-<yyyymmdd>`.

## Skills del proyecto (`.claude/skills/`)

Al empezar una tarea consulta `guia-skills` para elegir la skill. Las que aplican aquí:

| Skill | Cuándo |
|---|---|
| `git-workflow` | Cada rama, commit, PR o release |
| `proteccion` | Siempre activa (hook en `.claude/settings.json`). Si bloquea algo, no la rodees: explica y propone una alternativa |
| `revision-seguridad-backend` | Antes de mergear backend/API: credenciales MQTT, endpoints, API key del LLM, validación de payloads |
| `revision-rendimiento` | Consultas de históricos del agente IA (índices, agregaciones), escrituras en lote desde MQTT |

`checklist-lanzamiento`, `entrega-al-cliente` y `cerebro` no aplican a este proyecto.
