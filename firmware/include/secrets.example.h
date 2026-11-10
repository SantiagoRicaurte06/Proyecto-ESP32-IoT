// Copia este archivo como secrets.h y completa tus datos. secrets.h NO se sube al repo.
#pragma once

#define WIFI_SSID      "TuRedWiFi"
#define WIFI_PASSWORD  "TuClaveWiFi"

// HiveMQ Cloud → Cluster → Access Management (crea un usuario solo para el ESP32)
#define MQTT_HOST      "xxxxxxxxxxxxxxxx.s1.eu.hivemq.cloud"
#define MQTT_PORT      8883
#define MQTT_USER      "centinela-esp32"
#define MQTT_PASSWORD  "cambia-esta-clave"

// Clave para actualizar el firmware por WiFi (ArduinoOTA)
#define OTA_PASSWORD   "centinela-ota"
