# Fase 1 — Ideas de proyecto

Contexto: proyecto formativo SENA (Tecnología en ADSO), Yopal, Casanare. ESP32 DevKit v1 (38 pines), app Android (APK), MQTT, agente IA con históricos, notificaciones push/correo. Mínimo 3 sensores y 2 actuadores, costo extra ≈ 0.

## Decisiones de hardware comunes a todas las ideas

| Componente | Decisión | Motivo |
|---|---|---|
| Matriz LED 8x8 (16 pines, sin MAX7219) | **Descartar** | Consume 16 GPIO y exige multiplexado por software que compite con WiFi/MQTT. |
| Display 4 dígitos (12 pines, sin driver) | **Descartar** | 12 GPIO para mostrar 4 números; la OLED hace lo mismo con 2. |
| OLED I2C | **Usar** como pantalla principal | Solo 2 pines (GPIO21 SDA, GPIO22 SCL). |
| LEDs (varios) | **Usar** | Indicadores de estado o semáforo; 1 GPIO + resistencia de 220 Ω cada uno. |
| LCD 16x2 | Opcional | Sin módulo I2C usa 6 GPIO. Solo si sobra presupuesto de pines. |
| Joystick KY-023 | Opcional | 2 entradas analógicas (deben ir en ADC1: GPIO32–39) + 1 digital. Útil para menú local. |
| HC-SR04 | Usar con divisor | ECHO a 5 V → divisor 1 kΩ / 2 kΩ hacia el ESP32. |
| Humedad de suelo / joystick | Solo ADC1 | ADC2 no funciona con WiFi activo. |
| Servo SG90 y relé | 5 V | Alimentar desde VIN (5 V USB) con 470–1000 µF en paralelo; si hay bomba o carga real, fuente externa 5 V/2 A (cargador de celular) con GND común. |

---

## 1. AgroRiego Llanero — riego inteligente para huerta o vivero

**Problema.** En Yopal la temporada seca (dic–mar) y temperaturas de 33–36 °C secan los cultivos de pancoger y viveros. El riego manual se olvida o se excede, y el agua del tanque se agota sin aviso.

**Hardware.**
- Sensores: humedad de suelo (ADC1), DHT11 (temp/humedad aire), HC-SR04 (nivel del tanque), PIR (animales o intrusos en el cultivo).
- Actuadores: relé (mini bomba de agua o electroválvula), servo SG90 (compuerta de riego o polisombra).
- Pantalla: OLED. Descarta: matriz 8x8, display 4 dígitos, IR de obstáculos.

**Agente IA.** "¿Cuántas veces se regó hoy?", "¿cuánta agua queda en el tanque?", "¿a qué hora el suelo estuvo más seco?", "¿conviene regar ahora con 35 °C?". Consulta históricos y recomienda horarios de riego.

**Notificaciones.** Suelo bajo el umbral, tanque bajo 20 %, temperatura > 35 °C, movimiento en el cultivo de noche, riego automático ejecutado.

**Dificultad:** 3/5 · **Wow:** 5/5 (maqueta con planta real y agua visible).

## 2. Hato Seguro — bebedero inteligente para ganado

**Problema.** Casanare es ganadero: un bebedero vacío en días de calor causa estrés calórico y pérdida de peso. El vaquero no siempre puede revisar todos los potreros.

**Hardware.**
- Sensores: HC-SR04 (nivel del bebedero), DHT11 (índice de estrés calórico THI), IR de obstáculos (conteo de visitas al bebedero), PIR (presencia en el corral).
- Actuadores: relé (bomba de llenado), servo (válvula/compuerta).
- Pantalla: OLED. Descarta: matriz, display 4 dígitos, humedad de suelo.

**Agente IA.** "¿Cuántas veces bebieron hoy?", "¿cuál fue el THI máximo de la semana?", "¿cuántos litros se repusieron?".

**Notificaciones.** Nivel bajo, bomba encendida más de N minutos (posible fuga), THI en zona de peligro.

**Dificultad:** 3/5 · **Wow:** 4/5.

## 3. Guardián Llanero — seguridad para casa o finca

**Problema.** Robos en fincas y viviendas sin vigilancia; las alarmas comerciales son costosas y no avisan al celular.

**Hardware.**
- Sensores: PIR (movimiento), IR de obstáculos (puerta/ventana), HC-SR04 (distancia al acceso), táctil capacitivo (armar/desarmar).
- Actuadores: relé (sirena o reflector), servo (cerradura/pestillo).
- Entrada/pantalla: joystick para PIN local + OLED. Descarta: matriz, display 4 dígitos, humedad de suelo.

**Agente IA.** "¿Cuántas alertas hubo esta semana?", "¿a qué hora se abre más la puerta?", "¿quién desarmó la alarma ayer?".

**Notificaciones.** Intrusión con alarma armada, puerta abierta más de X minutos, alarma desarmada.

**Dificultad:** 3/5 · **Wow:** 4/5.

## 4. Casa Fresca — confort térmico y ahorro de energía

**Problema.** El calor de Yopal dispara el uso de ventiladores y aire acondicionado, que quedan encendidos en cuartos vacíos.

**Hardware.**
- Sensores: DHT11, PIR (ocupación), táctil (encendido manual), IR de obstáculos (conteo de entradas al cuarto).
- Actuadores: relé (ventilador), servo (rejilla/persiana).
- Pantalla: OLED o LCD. Descarta: matriz, display, HC-SR04, humedad de suelo.

**Agente IA.** "¿Cuántas horas estuvo encendido el ventilador?", "¿cuánto ahorré esta semana?", "¿cuál fue la hora más caliente?".

**Notificaciones.** Temperatura > 34 °C, ventilador encendido sin nadie en el cuarto, reporte diario de consumo.

**Dificultad:** 2/5 · **Wow:** 3/5.

## 5. Silo Vigía — monitoreo de almacenamiento de arroz

**Problema.** Casanare es arrocero: el grano almacenado con humedad y calor se fermenta o atrae roedores, con pérdidas para pequeños productores.

**Hardware.**
- Sensores: DHT11 (condiciones del almacén), HC-SR04 (nivel del silo), PIR (roedores/personas), IR de obstáculos (compuerta de descarga).
- Actuadores: relé (extractor de aire), servo (ventila de aireación).
- Pantalla: OLED. Descarta: matriz, display, humedad de suelo.

**Agente IA.** "¿Cuántas horas estuvo la humedad sobre 70 %?", "¿cuánto bajó el nivel esta semana?", "¿cuántas veces se activó el extractor?".

**Notificaciones.** Humedad o temperatura fuera de rango, movimiento nocturno, nivel bajo.

**Dificultad:** 3/5 · **Wow:** 3/5.

---

## Comparativa

| # | Proyecto | Sensores | Actuadores | Contexto local | Dificultad | Wow | Demo en maqueta |
|---|---|---|---|---|---|---|---|
| 1 | **AgroRiego Llanero** | 4 | 2 | Agro + sequía | 3 | **5** | Muy fácil: planta, tanque, bomba |
| 2 | Hato Seguro | 4 | 2 | Ganadería | 3 | 4 | Media: simular bebedero |
| 3 | Guardián Llanero | 4 + joystick | 2 | Seguridad | 3 | 4 | Fácil |
| 4 | Casa Fresca | 4 | 2 | Clima cálido | 2 | 3 | Fácil, poco vistosa |
| 5 | Silo Vigía | 4 | 2 | Arroz | 3 | 3 | Media |
| 6 | **Centinela Cravo Sur** | 5 + táctil | 2 + 4 LEDs | Gestión del riesgo | **5** | **5** | Muy vistosa: agua subiendo en vivo |

---

## 6. Centinela Cravo Sur: alerta temprana de crecientes (nivel avanzado) ⭐

> **Actualización:** la versión construida no tiene sirena ni LED amarillo o naranja. La alerta se muestra con 2 LED (verde y rojo) y la barrera. Ver [`02-fase2.md`](02-fase2.md).

**Problema.** En invierno (abr–nov) el río Cravo Sur y las quebradas urbanas de Yopal crecen en pocas horas. Las familias ribereñas y los conductores que cruzan puentes y vados se enteran tarde, porque nadie avisa con datos a tiempo. Una alerta temprana barata protege vidas, no solo cultivos.

**Qué hace.** Mide el nivel del agua y **la velocidad a la que sube**. Clasifica el riesgo en 4 niveles (verde, amarillo, naranja, rojo). Si sube el nivel de alerta, cierra la barrera del paso vehicular, activa sirena y baliza, y avisa a la comunidad y a gestión del riesgo. Sigue funcionando **sin internet**.

**Hardware (usa casi todo el kit).**

| Rol | Componente | Uso |
|---|---|---|
| Sensor | HC-SR04 | Nivel del agua (distancia desde el puente a la superficie) |
| Sensor | Humedad de suelo | Saturación de la ribera, que adelanta el riesgo cuando el suelo ya no absorbe |
| Sensor | DHT11 | Condiciones ambientales del registro histórico |
| Sensor | PIR | Personas en la zona de riesgo durante una alerta |
| Sensor | IR de obstáculos | Vehículos que intentan cruzar con la barrera cerrada |
| Entrada | Táctil capacitivo | Botón comunitario de "reportar emergencia" / reconocer alerta |
| Entrada | Joystick (opcional) | Menú local en la OLED para calibrar umbrales sin la app |
| Actuador | Servo SG90 | Barrera vehicular del puente o vado |
| Actuador | Relé | Sirena / baliza |
| Actuador | LEDs ×4 (verde, amarillo, naranja, rojo) | Semáforo de riesgo visible para la comunidad |
| Pantalla | OLED I2C | Nivel, tendencia (cm/min), estado, conexión |

Descarta: matriz 8x8, display de 4 dígitos y LCD 16x2 (pines).

**Por qué es más difícil (lo que se evalúa como ingeniería):**
1. **Señal ruidosa → dato confiable**: filtro de mediana sobre el HC-SR04 y cálculo de la **tasa de ascenso** (cm/min) con ventana móvil.
2. **Máquina de estados con histéresis**: los niveles no oscilan cuando el agua está justo en el umbral. El riesgo combina nivel + velocidad + saturación del suelo.
3. **Autonomía en el borde**: la lógica de alerta corre en el ESP32. Si cae el WiFi, igual cierra la barrera y suena la sirena, y guarda las lecturas en LittleFS para enviarlas al reconectar (*store-and-forward*).
4. **MQTT robusto**: TLS, QoS 1, mensajes *retained* para el estado y **Last Will** para detectar que la estación se cayó (eso también es una alerta).
5. **Predicción**: el backend estima "**tiempo hasta desbordamiento**" con regresión sobre las últimas lecturas.
6. **Agente IA con tool calling** sobre la base de datos y la predicción.
7. **Notificaciones escalonadas**: amarillo → push (ntfy/FCM); naranja → push + correo; rojo → push prioritario + correo a gestión del riesgo, repetidos hasta que alguien los reconozca en la app o en el táctil.
8. **Actualización OTA** del firmware y dos roles en la app: comunidad (ver) y operador (controlar).

**Agente IA.** "¿Qué tan rápido está subiendo el agua?", "¿cuánto falta para que se desborde a este ritmo?", "¿cuántas alertas rojas hubo este mes y cuánto duraron?", "¿cuántos vehículos intentaron cruzar con la barrera cerrada?", "Genera el reporte del evento de anoche para gestión del riesgo".

**Notificaciones.** Cambio de nivel de riesgo, ascenso brusco (> X cm/min), persona en la zona durante una alerta, vehículo cruzando con la barrera cerrada, estación desconectada, botón comunitario presionado.

**Maqueta.** Un recipiente transparente hace de cauce y una jarra sube el nivel en vivo. Encima va un puente de MDF con el sensor y una barrera con el servo, y un poste con el semáforo de LEDs y la sirena. En la sustentación el agua sube, los LEDs cambian de color, la barrera baja, llega la alerta al celular y el agente IA responde cuánto falta para desbordarse.

**Dificultad:** 5/5 · **Wow:** 5/5 · **Impacto:** protege vidas; replicable en cualquier puente o vado de Casanare.

### Pines estimados (≈ 17 GPIO, todos seguros)

| Componente | GPIO |
|---|---|
| HC-SR04 TRIG / ECHO (con divisor) | 5 / 18 |
| Humedad de suelo (ADC1) | 34 |
| DHT11 | 4 |
| PIR | 27 |
| IR de obstáculos | 26 |
| Táctil | 33 |
| Servo | 13 |
| Relé | 23 |
| LED verde / amarillo / naranja / rojo (220 Ω) | 19 / 17 / 16 / 25 |
| OLED SDA / SCL | 21 / 22 |
| Joystick VRx / VRy / SW (opcional) | 32 / 35 / 14 |

---

## Recomendación por nivel

- **Mayor dificultad e impacto → Centinela Cravo Sur (idea 6).** Recomendada si el equipo tiene 6–8 semanas.
- **Ruta segura → AgroRiego Llanero (idea 1).** Si el tiempo es corto.

### AgroRiego Llanero (ruta segura)

1. **Problema real y medible** en Casanare (sequía, calor, agro), fácil de justificar en lo social y económico.
2. **Es el único que usa el sensor de humedad de suelo**, aprovechando mejor el hardware disponible.
3. **Demo con impacto**: el jurado ve el suelo secarse, llegar la notificación al celular y la bomba regar; luego se le pregunta al agente IA.
4. **Datos ricos para el agente IA**: series de tiempo continuas (humedad, temperatura, nivel) y eventos (riegos, movimiento).
5. **Presupuesto de pines holgado**: ~9 GPIO, con espacio para joystick o LCD si se quiere.
6. Costo extra: mini bomba sumergible 5 V (~$8.000 COP) o reemplazarla por un LED/ventilador en el relé para la demo.

> Siguiente paso: elegir una idea para generar la Fase 2 (problema, objetivos, arquitectura, conexiones, planos, MQTT, app, agente IA y plan de trabajo).
