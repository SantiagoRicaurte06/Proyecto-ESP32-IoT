# Backend · Centinela Cravo Sur

Node.js 22+ sin framework. Une la estación (MQTT) con la app (REST) y el agente IA.

```
src/
├── index.js           arranque
├── config.js          variables de entorno (.env)
├── estacion.js        MQTT: guarda telemetría y eventos, detecta caídas, envía comandos validados
├── db.js              SQLite (node:sqlite): esquema, índices y consultas
├── prediccion.js      regresión lineal → minutos hasta el desborde
├── notificaciones.js  reglas de alerta → ntfy (push) y Gmail (correo); repite la roja hasta que la reconozcan
├── agente.js          agente IA (Claude + tool calling sobre la BD)
├── servidor.js        API REST con tokens por rol y límite de uso del agente
└── tiempo.js          hora de Colombia (UTC-5)
scripts/simulador.js   estación falsa para probar sin hardware
test/                  pruebas (node --test)
```

```bash
npm install
cp .env.example .env   # completar
npm test
npm start              # o npm run dev (recarga al guardar)
npm run simular        # en otra terminal, sin la estación real
```

API y modelo de datos: [`docs/02-fase2.md`](../docs/02-fase2.md#10-stack-de-la-app-backend-y-base-de-datos). Guía completa: [`docs/03-puesta-en-marcha.md`](../docs/03-puesta-en-marcha.md).

## Seguridad

- Tokens distintos para **comunidad** (solo lectura + agente) y **operador** (control), comparados en tiempo constante.
- Los comandos se validan contra una lista permitida antes de publicarse en MQTT; la app nunca habla con el broker.
- Las herramientas del agente usan consultas parametrizadas y una lista cerrada de variables (no hay SQL generado por la IA).
- El agente tiene un límite de 12 consultas por minuto por IP, historial máximo de 20 mensajes de 2.000 caracteres y cuerpo máximo de 32 KB.
- Secretos solo en `.env` (ignorado por git). La API key de Anthropic nunca llega al APK.
