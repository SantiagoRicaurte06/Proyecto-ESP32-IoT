# Tabla de cableado · Centinela Cravo Sur

Acompaña a [`plano-conexiones.svg`](plano-conexiones.svg). Los números de la columna **N.º** son los círculos del plano. Marca cada cable al conectarlo.

## Antes de empezar

- [ ] ESP32 en la protoboard, con el USB hacia el borde.
- [ ] Fuente de 5 V: rojo (+) al riel de 5 V, negro (−) al riel GND.
- [ ] Condensador de 470 µF entre 5 V (pata larga) y GND (franja).
- [ ] Pin **3V3** del ESP32 al riel de 3,3 V. Pin **GND** del ESP32 al riel GND (GND común con la fuente).
- [ ] Puentes entre los rieles superior e inferior (5 V con 5 V, 3,3 V con 3,3 V, GND con GND).
- [ ] El pin **5V** del ESP32 queda **sin conectar**.

## Señales (ESP32)

| N.º | Componente | Pin | Va a | Color sugerido | ✓ |
|---|---|---|---|---|---|
| 1 | Humedad de suelo | AO | GPIO34 | verde | ☐ |
| 2 | Joystick KY-023 | VRx | GPIO32 | morado | ☐ |
| 3 | Joystick KY-023 | SW | GPIO14 | cian | ☐ |
| 4 | Táctil TTP223 | SIG | GPIO33 | amarillo | ☐ |
| 5 | LED rojo | + | GPIO25 | rosado | ☐ |
| 6 | IR de obstáculos | OUT | GPIO26 | azul | ☐ |
| 7 | PIR HC-SR501 | OUT | GPIO27 | naranja | ☐ |
| 8 | Servo SG90 | naranja | GPIO13 | turquesa | ☐ |
| 9 | Relé 1 canal | IN | GPIO23 | violeta | ☐ |
| 10 | OLED SSD1306 | SCL | GPIO22 | verde oliva | ☐ |
| 11 | OLED SSD1306 | SDA | GPIO21 | verde | ☐ |
| 12 | LED verde | + | GPIO19 | morado | ☐ |
| 13 | HC-SR04 | ECHO | R1 1 kΩ → GPIO18; del punto entre R1 y GPIO18, R2 2 kΩ → GND | cian | ☐ |
| 14 | HC-SR04 | TRIG | GPIO5 | amarillo | ☐ |
| 15 | LED amarillo | + | GPIO17 | rosado | ☐ |
| 16 | LED naranja | + | GPIO16 | azul | ☐ |
| 17 | DHT11 | DATA | GPIO4 | naranja | ☐ |

## Alimentación de cada módulo

| Componente | Pin | Va a | Color | ✓ |
|---|---|---|---|---|
| Humedad de suelo | VCC | +3,3 V (pin 3V3 del ESP32) | naranja | ☐ |
| Humedad de suelo | GND | GND común | negro | ☐ |
| Joystick KY-023 | +5V* | +3,3 V (pin 3V3 del ESP32) | naranja | ☐ |
| Joystick KY-023 | GND | GND común | negro | ☐ |
| Táctil TTP223 | VCC | +3,3 V (pin 3V3 del ESP32) | naranja | ☐ |
| Táctil TTP223 | GND | GND común | negro | ☐ |
| LED rojo | − | GND común | negro | ☐ |
| IR de obstáculos | VCC | +3,3 V (pin 3V3 del ESP32) | naranja | ☐ |
| IR de obstáculos | GND | GND común | negro | ☐ |
| PIR HC-SR501 | VCC | +5 V (fuente externa) | rojo | ☐ |
| PIR HC-SR501 | GND | GND común | negro | ☐ |
| Servo SG90 | rojo | +5 V (fuente externa) | rojo | ☐ |
| Servo SG90 | café | GND común | negro | ☐ |
| Relé 1 canal | VCC | +5 V (fuente externa) | rojo | ☐ |
| Relé 1 canal | GND | GND común | negro | ☐ |
| Relé 1 canal | COM | +5 V (fuente externa) | rojo | ☐ |
| Buzzer 5 V | − | GND común | negro | ☐ |
| OLED SSD1306 | VCC | +3,3 V (pin 3V3 del ESP32) | naranja | ☐ |
| OLED SSD1306 | GND | GND común | negro | ☐ |
| LED verde | − | GND común | negro | ☐ |
| HC-SR04 | VCC | +5 V (fuente externa) | rojo | ☐ |
| HC-SR04 | GND | GND común | negro | ☐ |
| LED amarillo | − | GND común | negro | ☐ |
| LED naranja | − | GND común | negro | ☐ |
| DHT11 | VCC | +3,3 V (pin 3V3 del ESP32) | naranja | ☐ |
| DHT11 | GND | GND común | negro | ☐ |
| Relé 1 canal | NO | Buzzer + (el − del buzzer a GND) | café | ☐ |

## Prueba antes de cerrar la caja

1. Conecta solo el USB (sin fuente de 5 V) y abre el monitor serial: debe aparecer `Centinela Cravo Sur 1.0.0` y la OLED encendida.
2. Conecta la fuente de 5 V: la barrera debe ir a 90° (abierta) y el LED verde encenderse.
3. Toca el táctil: la OLED cambia a la página **Sensores**, con distancia, temperatura y valor ADC del suelo.
4. Acerca la mano al HC-SR04: la distancia cambia. Tapa el IR y pasa la mano frente al PIR: la página Sensores muestra `SI`.
5. Si el relé queda activado al revés, cambia `RELE_ACTIVO_EN_ALTO` en `firmware/include/config.h`.
