#pragma once
// ─────────────────────────────────────────────────────────────────────────────
// Centinela Cravo Sur · configuración de pines y parámetros
// Ver hardware/conexiones.md para el cableado completo.
// ─────────────────────────────────────────────────────────────────────────────

#define FW_VERSION      "1.0.0"
#define ESTACION_ID     "est01"
#define TOPIC_BASE      "centinela/" ESTACION_ID

// ── Pines ────────────────────────────────────────────────────────────────────
#define PIN_TRIG        5    // HC-SR04 TRIG
#define PIN_ECHO        18   // HC-SR04 ECHO (con divisor 1k/2k → 3,3 V)
#define PIN_DHT         4    // DHT11 DATA
#define PIN_PIR         27   // PIR OUT
#define PIN_IR          26   // IR obstáculos OUT (LOW = obstáculo)
#define PIN_TACTIL      33   // TTP223 SIG (HIGH = tocado)
#define PIN_SERVO       13   // SG90 señal
#define PIN_LED_VERDE   19   // 220 Ω en serie
#define PIN_LED_ROJO    25   // 220 Ω en serie
#define PIN_RELE        23   // opcional: alarma externa (luz o buzzer). Ver USAR_RELE
#define PIN_JOY_X       32   // Joystick VRx (ADC1) · opcional
#define PIN_JOY_SW      14   // Joystick SW · opcional
// OLED I2C: SDA 21, SCL 22 (pines por defecto de Wire)

// Señalización con 2 LED:
//   verde fijo = normal · verde parpadeando = vigilancia (amarillo)
//   rojo fijo = barrera cerrada (naranja) · rojo parpadeando = alerta máxima sin reconocer (rojo)
#ifndef USAR_RELE
#define USAR_RELE 0   // pon 1 si conectas una alarma externa al relé (se activa en rojo sin reconocer)
#endif
#ifndef RELE_ACTIVO_EN_ALTO
#define RELE_ACTIVO_EN_ALTO false  // la mayoría de módulos con optoacoplador se activan con LOW; pon true si el tuyo se activa con HIGH
#endif

// ── Maqueta (cm) ─────────────────────────────────────────────────────────────
#define ALTURA_SENSOR_CM   23.0f  // del fondo del cauce al sensor
#define NIVEL_DESBORDE_CM  14.0f  // borde del cauce

// Umbrales de nivel por defecto (se pueden cambiar desde la app; quedan en flash)
#define UMBRAL_AMARILLO_CM 5.0f
#define UMBRAL_NARANJA_CM  8.0f
#define UMBRAL_ROJO_CM     11.0f
#define HISTERESIS_CM      1.0f   // para bajar de nivel el agua debe estar 1 cm por debajo del umbral
#define TIEMPO_BAJADA_MS   10000  // ...durante 10 s seguidos

#define TASA_RAPIDA_CM_MIN 2.0f   // ascenso brusco: sube un nivel de riesgo


// Servo (grados)
#define SERVO_ABIERTA      90
#define SERVO_CERRADA      0

// ── Tiempos (ms) ─────────────────────────────────────────────────────────────
#define PERIODO_NIVEL_MS       500
#define PERIODO_DHT_MS         2500
#define PERIODO_TELEMETRIA_MS  2000
#define PERIODO_BUFFER_MS      10000   // sin conexión: guarda una lectura cada 10 s
#define BUFFER_MAX             240     // 40 min de respaldo sin internet
#define ANTIRREBOTE_EVENTO_MS  15000   // mismo evento PIR/IR como máximo cada 15 s
#define TACTIL_LARGO_MS        2000    // mantener 2 s = emergencia comunitaria
