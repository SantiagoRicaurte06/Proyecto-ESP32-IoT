# Fase 1 — Ideas de proyecto

Contexto: proyecto formativo SENA (Tecnología en ADSO), Yopal, Casanare. ESP32 DevKit v1 (38 pines), app Android (APK), MQTT, agente IA con históricos, notificaciones push/correo. Mínimo 3 sensores y 2 actuadores, costo extra ≈ 0.

## Decisiones de hardware comunes a todas las ideas

| Componente | Decisión | Motivo |
|---|---|---|
| Matriz LED 8x8 (16 pines, sin MAX7219) | **Descartar** | Consume 16 GPIO y exige multiplexado por software que compite con WiFi/MQTT. |
| Display 4 dígitos (12 pines, sin driver) | **Descartar** | 12 GPIO para mostrar 4 números; la OLED hace lo mismo con 2. |
| OLED I2C | **Usar** como pantalla principal | Solo 2 pines (GPIO21 SDA, GPIO22 SCL). |
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

## Recomendación: **AgroRiego Llanero**

1. **Problema real y medible** en Casanare (sequía, calor, agro), fácil de justificar en lo social y económico.
2. **Es el único que usa el sensor de humedad de suelo**, aprovechando mejor el hardware disponible.
3. **Demo con impacto**: el jurado ve el suelo secarse, llegar la notificación al celular y la bomba regar; luego se le pregunta al agente IA.
4. **Datos ricos para el agente IA**: series de tiempo continuas (humedad, temperatura, nivel) y eventos (riegos, movimiento).
5. **Presupuesto de pines holgado**: ~9 GPIO, con espacio para joystick o LCD si se quiere.
6. Costo extra: mini bomba sumergible 5 V (~$8.000 COP) o reemplazarla por un LED/ventilador en el relé para la demo.

> Siguiente paso: elegir una idea para generar la Fase 2 (problema, objetivos, arquitectura, conexiones, planos, MQTT, app, agente IA y plan de trabajo).
