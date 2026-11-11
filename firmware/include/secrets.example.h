// Copia este archivo como secrets.h y completa tus datos. secrets.h NO se sube al repo.
#pragma once

#define WIFI_SSID      "TuRedWiFi"
#define WIFI_PASSWORD  "TuClaveWiFi"

// EMQX Cloud Serverless → Overview: "Address" (sin mqtts:// ni puerto) · usuario en Access Control → Authentication
#define MQTT_HOST      "xxxxxxxx.ala.us-east-1.emqxsl.com"
#define MQTT_PORT      8883
#define MQTT_USER      "centinela-esp32"
#define MQTT_PASSWORD  "cambia-esta-clave"

// Clave para actualizar el firmware por WiFi (ArduinoOTA)
#define OTA_PASSWORD   "centinela-ota"
