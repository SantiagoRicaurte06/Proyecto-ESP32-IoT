// ─────────────────────────────────────────────────────────────────────────────
// Centinela Cravo Sur · estación de alerta temprana de crecientes
// ESP32 DevKit v1 · MQTT (TLS) · funciona sin internet (lógica local + respaldo)
// ─────────────────────────────────────────────────────────────────────────────
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <ArduinoOTA.h>
#include <Preferences.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>
#include <ESP32Servo.h>
#include <deque>
#include <time.h>

#include "config.h"
#if __has_include("secrets.h")
#include "secrets.h"
#else
#include "secrets.example.h"
#endif

#ifdef SIMULACION_WOKWI
#undef WIFI_SSID
#undef WIFI_PASSWORD
#define WIFI_SSID "Wokwi-GUEST"
#define WIFI_PASSWORD ""
#define TIPO_DHT DHT22
#else
#define TIPO_DHT DHT11
#endif

#ifndef USAR_JOYSTICK
#define USAR_JOYSTICK 0  // pon 1 si conectas el joystick (sin él, el ADC flota)
#endif

// ── Objetos ──────────────────────────────────────────────────────────────────
WiFiClientSecure red;
PubSubClient mqtt(red);
DHT dht(PIN_DHT, TIPO_DHT);
Adafruit_SSD1306 oled(128, 64, &Wire, -1);
Servo barreraServo;
Preferences prefs;

const char* TOPIC_TELEMETRIA = TOPIC_BASE "/telemetria";
const char* TOPIC_EVENTO     = TOPIC_BASE "/evento";
const char* TOPIC_ESTADO     = TOPIC_BASE "/estado";
const char* TOPIC_CMD        = TOPIC_BASE "/cmd";

// ── Estado ───────────────────────────────────────────────────────────────────
enum Riesgo : uint8_t { VERDE = 0, AMARILLO, NARANJA, ROJO };
const char* NOMBRE_RIESGO[] = {"verde", "amarillo", "naranja", "rojo"};

struct Umbrales { float amarillo, naranja, rojo; } umbrales;

float nivelCm = 0, distanciaCm = 0, tasaCmMin = 0;
float temperatura = NAN, humedad = NAN;

Riesgo riesgo = VERDE;
unsigned long inicioBajadaMs = 0;
bool alertaReconocida = true;

bool modoManual = false;
bool barreraCerradaManual = false;
bool barreraCerrada = false, alarmaActiva = false;

bool oledOk = false, otaIniciado = false, horaOk = false;
uint8_t paginaOled = 0;

// Historial de nivel para la tasa de ascenso (ventana de 30 s, 1 muestra cada 500 ms)
const int VENTANA = 60;
float histNivel[VENTANA];
unsigned long histMs[VENTANA];
int histIdx = 0, histN = 0;

// Respaldo de mensajes mientras no hay conexión (store-and-forward)
struct Pendiente { bool esEvento; String payload; };
std::deque<Pendiente> pendientes;

// ── Utilidades ───────────────────────────────────────────────────────────────
uint32_t ahoraEpoch() {
  time_t t = time(nullptr);
  return t > 1700000000 ? (uint32_t)t : 0;  // 0 = sin hora (el backend usa la de llegada)
}

float leerDistanciaUnaVez() {
  digitalWrite(PIN_TRIG, LOW);  delayMicroseconds(3);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  unsigned long us = pulseIn(PIN_ECHO, HIGH, 25000);  // máx ~4 m
  if (us == 0) return -1;
  return us * 0.0343f / 2.0f;
}

// Mediana de 5 lecturas: descarta los picos típicos del HC-SR04 sobre agua
bool leerDistancia(float& salida) {
  float v[5]; int n = 0;
  for (int i = 0; i < 5; i++) {
    float d = leerDistanciaUnaVez();
    if (d > 1.5f && d < 400) v[n++] = d;
    delay(8);
  }
  if (n < 3) return false;
  for (int i = 0; i < n - 1; i++)
    for (int j = i + 1; j < n; j++)
      if (v[j] < v[i]) { float t = v[i]; v[i] = v[j]; v[j] = t; }
  salida = v[n / 2];
  return true;
}

// Pendiente por mínimos cuadrados sobre la ventana → cm/min
float calcularTasa() {
  if (histN < 10) return 0;
  double sx = 0, sy = 0, sxx = 0, sxy = 0;
  unsigned long t0 = histMs[(histIdx - histN + VENTANA) % VENTANA];
  for (int k = 0; k < histN; k++) {
    int i = (histIdx - histN + k + VENTANA) % VENTANA;
    double x = (histMs[i] - t0) / 60000.0;  // minutos
    double y = histNivel[i];
    sx += x; sy += y; sxx += x * x; sxy += x * y;
  }
  double den = histN * sxx - sx * sx;
  if (fabs(den) < 1e-9) return 0;
  return (float)((histN * sxy - sx * sy) / den);
}

Riesgo riesgoPara(float nivel, float tasa) {
  Riesgo r = VERDE;
  if (nivel >= umbrales.rojo) r = ROJO;
  else if (nivel >= umbrales.naranja) r = NARANJA;
  else if (nivel >= umbrales.amarillo) r = AMARILLO;
  if (tasa >= TASA_RAPIDA_CM_MIN && r < ROJO) r = (Riesgo)(r + 1);  // sube rápido: un nivel más
  return r;
}

void ponerRele(bool on) {
#if USAR_RELE
  digitalWrite(PIN_RELE, (on == RELE_ACTIVO_EN_ALTO) ? HIGH : LOW);
#endif
}

// ── MQTT ─────────────────────────────────────────────────────────────────────
void encolar(bool esEvento, const String& payload) {
  if (pendientes.size() >= BUFFER_MAX) pendientes.pop_front();  // descarta lo más viejo
  pendientes.push_back({esEvento, payload});
}

void publicarEvento(const char* tipo, JsonDocument extra) {
  extra["tipo"] = tipo;
  extra["ts"] = ahoraEpoch();
  extra["riesgo"] = NOMBRE_RIESGO[riesgo];
  extra["nivel"] = roundf(nivelCm * 10) / 10;
  String s; serializeJson(extra, s);
  Serial.printf("[evento] %s\n", s.c_str());
  if (mqtt.connected() && pendientes.empty()) mqtt.publish(TOPIC_EVENTO, s.c_str());
  else encolar(true, s);  // los eventos nunca se pierden
}

String telemetriaJson() {
  JsonDocument d;
  d["ts"] = ahoraEpoch();
  d["nivel"] = roundf(nivelCm * 10) / 10;
  d["dist"] = roundf(distanciaCm * 10) / 10;
  d["tasa"] = roundf(tasaCmMin * 100) / 100;
  if (!isnan(temperatura)) d["temp"] = roundf(temperatura * 10) / 10;
  if (!isnan(humedad)) d["hum"] = roundf(humedad);
  d["riesgo"] = NOMBRE_RIESGO[riesgo];
  d["barrera"] = barreraCerrada ? "cerrada" : "abierta";
  d["alarma"] = alarmaActiva;
  d["modo"] = modoManual ? "manual" : "auto";
  d["reconocida"] = alertaReconocida;
  d["rssi"] = WiFi.RSSI();
  String s; serializeJson(d, s);
  return s;
}

void publicarEstado() {
  JsonDocument d;
  d["online"] = true;
  d["fw"] = FW_VERSION;
  d["ip"] = WiFi.localIP().toString();
  JsonObject u = d["umbrales"].to<JsonObject>();
  u["amarillo"] = umbrales.amarillo; u["naranja"] = umbrales.naranja; u["rojo"] = umbrales.rojo;
  d["desborde"] = NIVEL_DESBORDE_CM;
  String s; serializeJson(d, s);
  mqtt.publish(TOPIC_ESTADO, s.c_str(), true);  // retained
}

void reconocerAlerta(const char* origen) {
  if (alertaReconocida) return;
  alertaReconocida = true;
  JsonDocument e; e["origen"] = origen;
  publicarEvento("alerta_reconocida", e);
}

void alRecibirMqtt(char* topic, byte* payload, unsigned int len) {
  JsonDocument d;
  if (deserializeJson(d, payload, len)) return;
  const char* accion = d["accion"] | "";
  Serial.printf("[cmd] %s\n", accion);

  if (!strcmp(accion, "barrera")) {
    modoManual = true;
    barreraCerradaManual = !strcmp(d["valor"] | "", "cerrar");
  } else if (!strcmp(accion, "modo")) {
    modoManual = !strcmp(d["valor"] | "auto", "manual");
    barreraCerradaManual = barreraCerrada;
  } else if (!strcmp(accion, "reconocer")) {
    reconocerAlerta("app");
    return;
  } else if (!strcmp(accion, "umbrales")) {
    float a = d["valor"]["amarillo"] | umbrales.amarillo;
    float n = d["valor"]["naranja"] | umbrales.naranja;
    float r = d["valor"]["rojo"] | umbrales.rojo;
    if (a > 0 && a < n && n < r && r <= ALTURA_SENSOR_CM) {
      umbrales = {a, n, r};
      prefs.putFloat("amarillo", a); prefs.putFloat("naranja", n); prefs.putFloat("rojo", r);
      publicarEstado();
    }
    return;
  } else {
    return;
  }
  JsonDocument e; e["accion"] = accion; e["modo"] = modoManual ? "manual" : "auto";
  publicarEvento("comando", e);
}

void gestionarConexion() {
  static unsigned long ultimoIntento = 0, ultimoAvisoWifi = 0;
  static bool wifiAntes = false;
  bool wifiAhora = WiFi.status() == WL_CONNECTED;
  if (wifiAhora && !wifiAntes) Serial.printf("[wifi] conectado a \"%s\" · IP %s · RSSI %d dBm\n", WIFI_SSID, WiFi.localIP().toString().c_str(), WiFi.RSSI());
  wifiAntes = wifiAhora;
  if (!wifiAhora) {
    if (millis() - ultimoAvisoWifi > 5000) {
      ultimoAvisoWifi = millis();
      const char* motivo;
      switch (WiFi.status()) {
        case WL_NO_SSID_AVAIL:  motivo = "no se encuentra la red (¿nombre mal escrito o red de 5 GHz?)"; break;
        case WL_CONNECT_FAILED: motivo = "conexión rechazada (¿clave incorrecta?)"; break;
        case WL_DISCONNECTED:   motivo = "intentando conectar..."; break;
        default:                motivo = "sin conexión"; break;
      }
      Serial.printf("[wifi] \"%s\": %s (estado %d)\n", WIFI_SSID, motivo, WiFi.status());
    }
    return;
  }

  if (!otaIniciado) {
    ArduinoOTA.setHostname("centinela-" ESTACION_ID);
    ArduinoOTA.setPassword(OTA_PASSWORD);
    ArduinoOTA.begin();
    otaIniciado = true;
  }
  if (!horaOk && ahoraEpoch()) horaOk = true;

  if (mqtt.connected()) return;
  if (millis() - ultimoIntento < 5000) return;
  ultimoIntento = millis();

  String id = String("centinela-" ESTACION_ID "-") + String((uint32_t)ESP.getEfuseMac(), HEX);
  Serial.print("[mqtt] conectando... ");
  // Last Will: si la estación se cae, el broker publica online:false (retained)
  if (mqtt.connect(id.c_str(), MQTT_USER, MQTT_PASSWORD, TOPIC_ESTADO, 1, true, "{\"online\":false}")) {
    Serial.println("ok");
    mqtt.subscribe(TOPIC_CMD, 1);
    publicarEstado();
  } else {
    Serial.printf("fallo (%d)\n", mqtt.state());
  }
}

void vaciarPendientes() {
  int enviados = 0;
  while (mqtt.connected() && !pendientes.empty() && enviados < 10) {
    Pendiente& p = pendientes.front();
    if (!mqtt.publish(p.esEvento ? TOPIC_EVENTO : TOPIC_TELEMETRIA, p.payload.c_str())) break;
    pendientes.pop_front();
    enviados++;
  }
}

// ── Pantalla ─────────────────────────────────────────────────────────────────
void dibujarOled() {
  if (!oledOk) return;
  oled.clearDisplay();
  oled.setTextColor(SSD1306_WHITE);
  oled.setTextSize(1);
  oled.setCursor(0, 0);
  oled.printf("CENTINELA %s %s", WiFi.isConnected() ? "W" : "-", mqtt.connected() ? "M" : "-");

  if (paginaOled == 0) {
    oled.setTextSize(2);
    oled.setCursor(0, 14);
    String r = NOMBRE_RIESGO[riesgo]; r.toUpperCase();
    oled.print(r);
    oled.setTextSize(1);
    oled.setCursor(0, 36);
    oled.printf("Nivel %.1f/%.0f cm", nivelCm, NIVEL_DESBORDE_CM);
    oled.setCursor(0, 46);
    oled.printf("Tasa %+.2f cm/min", tasaCmMin);
    oled.setCursor(0, 56);
    oled.printf("Barr:%s %s", barreraCerrada ? "CERR" : "ABIE", modoManual ? "MAN" : "AUTO");
    // barra de nivel a la derecha
    int alto = constrain((int)(nivelCm / NIVEL_DESBORDE_CM * 52), 0, 52);
    oled.drawRect(118, 11, 10, 53, SSD1306_WHITE);
    oled.fillRect(120, 62 - alto, 6, alto, SSD1306_WHITE);
  } else if (paginaOled == 1) {
    // Página de sensores: también sirve para calibrar (Dist = distancia al agua)
    oled.setCursor(0, 12); oled.printf("Dist: %.1f cm", distanciaCm);
    oled.setCursor(0, 22); oled.printf("Temp: %.1fC Hum: %.0f%%", temperatura, humedad);
    oled.setCursor(0, 32); oled.printf("Nivel: %.1f cm", nivelCm);
    oled.setCursor(0, 42); oled.printf("WiFi: %s", WiFi.isConnected() ? "conectado" : "sin conexion");
    oled.setCursor(0, 52); oled.printf("Toque corto: pagina");
  } else {
    oled.setCursor(0, 14); oled.printf("IP %s", WiFi.localIP().toString().c_str());
    oled.setCursor(0, 26); oled.printf("RSSI %d dBm", WiFi.RSSI());
    oled.setCursor(0, 38); oled.printf("Respaldo: %u msg", (unsigned)pendientes.size());
    oled.setCursor(0, 50); oled.printf("FW %s", FW_VERSION);
  }
  oled.display();
}

// ── Lógica principal ─────────────────────────────────────────────────────────
void actualizarNivel() {
  float d;
  if (!leerDistancia(d)) return;  // conserva el último valor válido
  distanciaCm = d;
  nivelCm = constrain(ALTURA_SENSOR_CM - d, 0.0f, ALTURA_SENSOR_CM);
  histNivel[histIdx] = nivelCm;
  histMs[histIdx] = millis();
  histIdx = (histIdx + 1) % VENTANA;
  if (histN < VENTANA) histN++;
  tasaCmMin = calcularTasa();
}

void actualizarSensores() {

  static unsigned long ultimoDht = 0;
  if (millis() - ultimoDht > PERIODO_DHT_MS) {
    ultimoDht = millis();
    float t = dht.readTemperature(), h = dht.readHumidity();
    if (!isnan(t)) temperatura = t;
    if (!isnan(h)) humedad = h;
  }
}

void evaluarRiesgo() {
  Riesgo objetivo = riesgoPara(nivelCm, tasaCmMin);
  Riesgo anterior = riesgo;

  if (objetivo > riesgo) {
    riesgo = objetivo;  // subir: inmediato
    inicioBajadaMs = 0;
  } else if (objetivo < riesgo) {
    // bajar: con histéresis (como si el agua estuviera 1 cm más alta) y sostenido 10 s
    Riesgo conMargen = riesgoPara(nivelCm + HISTERESIS_CM, tasaCmMin);
    if (conMargen < riesgo) {
      if (!inicioBajadaMs) inicioBajadaMs = millis();
      if (millis() - inicioBajadaMs > TIEMPO_BAJADA_MS) { riesgo = conMargen; inicioBajadaMs = 0; }
    } else {
      inicioBajadaMs = 0;
    }
  } else {
    inicioBajadaMs = 0;
  }

  if (riesgo != anterior) {
    if (riesgo > anterior && riesgo >= NARANJA) alertaReconocida = false;  // nueva alerta
    if (riesgo < NARANJA) alertaReconocida = true;
    JsonDocument e;
    e["de"] = NOMBRE_RIESGO[anterior];
    e["a"] = NOMBRE_RIESGO[riesgo];
    e["tasa"] = roundf(tasaCmMin * 100) / 100;
    publicarEvento("cambio_riesgo", e);
  }
}

void aplicarActuadores() {
  bool cerrar = modoManual ? barreraCerradaManual : (riesgo >= NARANJA);
  bool alarma = riesgo == ROJO && !alertaReconocida;   // rojo sin reconocer: LED rojo parpadea

  if (cerrar != barreraCerrada) {
    barreraCerrada = cerrar;
    barreraServo.write(cerrar ? SERVO_CERRADA : SERVO_ABIERTA);
  }
  if (alarma != alarmaActiva) {
    alarmaActiva = alarma;
    ponerRele(alarma);
  }

  bool parpadeo = (millis() / 400) % 2;
  bool parpadeoLento = (millis() / 700) % 2;
  // verde fijo = normal · verde parpadeando = vigilancia · rojo fijo = barrera cerrada · rojo parpadeando = alerta máxima
  digitalWrite(PIN_LED_VERDE, riesgo == VERDE || (riesgo == AMARILLO && parpadeoLento));
  digitalWrite(PIN_LED_ROJO,  riesgo == NARANJA || (riesgo == ROJO && (alertaReconocida || parpadeo)));
}

void revisarEntradas() {
  static unsigned long inicioToque = 0;
  static bool emergenciaEnviada = false;

  // Táctil: toque corto = silenciar/reconocer o cambiar pantalla; mantener 2 s = emergencia
  bool toque = digitalRead(PIN_TACTIL) == HIGH;
  if (toque && !inicioToque) { inicioToque = millis(); emergenciaEnviada = false; }
  if (toque && inicioToque && !emergenciaEnviada && millis() - inicioToque > TACTIL_LARGO_MS) {
    emergenciaEnviada = true;
    JsonDocument e; e["origen"] = "tactil"; publicarEvento("boton_emergencia", e);
  }
  if (!toque && inicioToque) {
    if (!emergenciaEnviada) {
      if (!alertaReconocida) reconocerAlerta("tactil");
      else paginaOled = (paginaOled + 1) % 3;
    }
    inicioToque = 0;
  }

#if USAR_JOYSTICK
  static unsigned long ultimoJoy = 0;
  int x = analogRead(PIN_JOY_X);
  if (millis() - ultimoJoy > 400 && (x < 600 || x > 3500)) {
    ultimoJoy = millis();
    paginaOled = (paginaOled + (x > 3500 ? 1 : 2)) % 3;
  }
#endif
}

// ── Arduino ──────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("\nCentinela Cravo Sur " FW_VERSION);

  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_TACTIL, INPUT_PULLDOWN);
#if USAR_RELE
  pinMode(PIN_RELE, OUTPUT);
#endif
  ponerRele(false);
  pinMode(PIN_LED_VERDE, OUTPUT);
  pinMode(PIN_LED_ROJO, OUTPUT);
#if USAR_JOYSTICK
  pinMode(PIN_JOY_SW, INPUT_PULLUP);
#endif
  analogReadResolution(12);

  prefs.begin("centinela", false);
  umbrales.amarillo = prefs.getFloat("amarillo", UMBRAL_AMARILLO_CM);
  umbrales.naranja  = prefs.getFloat("naranja", UMBRAL_NARANJA_CM);
  umbrales.rojo     = prefs.getFloat("rojo", UMBRAL_ROJO_CM);

  ESP32PWM::allocateTimer(0);
  barreraServo.setPeriodHertz(50);
  barreraServo.attach(PIN_SERVO, 500, 2400);
  barreraServo.write(SERVO_ABIERTA);

  dht.begin();
  oledOk = oled.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  if (oledOk) { oled.clearDisplay(); oled.setTextColor(SSD1306_WHITE); oled.setCursor(0, 0); oled.print("Centinela iniciando..."); oled.display(); }

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  configTime(0, 0, "pool.ntp.org", "time.google.com");  // UTC; el backend convierte a hora de Colombia

  red.setInsecure();  // TLS cifrado sin validar certificado (suficiente para la maqueta)
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(alRecibirMqtt);
  mqtt.setBufferSize(1024);
  mqtt.setKeepAlive(10);  // el broker detecta la caída en ~15 s (Last Will)

  JsonDocument e; e["fw"] = FW_VERSION; publicarEvento("arranque", e);
}

void loop() {
  static unsigned long tNivel = 0, tTelemetria = 0, tBuffer = 0, tOled = 0;
  unsigned long ahora = millis();

  if (ahora - tNivel >= PERIODO_NIVEL_MS) {
    tNivel = ahora;
    actualizarNivel();
    actualizarSensores();
    evaluarRiesgo();  // la seguridad no depende de internet
  }
  revisarEntradas();
  aplicarActuadores();

  gestionarConexion();
  if (mqtt.connected()) {
    mqtt.loop();
    vaciarPendientes();
    if (ahora - tTelemetria >= PERIODO_TELEMETRIA_MS) {
      tTelemetria = ahora;
      if (pendientes.empty()) mqtt.publish(TOPIC_TELEMETRIA, telemetriaJson().c_str());
    }
  } else if (ahora - tBuffer >= PERIODO_BUFFER_MS) {
    tBuffer = ahora;
    encolar(false, telemetriaJson());  // respaldo mientras no hay conexión
  }
  if (otaIniciado) ArduinoOTA.handle();

  if (ahora - tOled >= 250) { tOled = ahora; dibujarOled(); }
}
