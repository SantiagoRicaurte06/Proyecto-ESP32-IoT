# Maqueta en Blender

Modelo realista de la maqueta a escala real (1 unidad = 1 cm), con animación de armado en 8 pasos.

| Archivo | Para qué |
|---|---|
| [`maqueta_centinela.blend`](maqueta_centinela.blend) | Ábrelo en Blender 4.2 o superior: gira, acerca y revisa cada pieza. Cada pieza es un objeto `P<paso> · <nombre>` |
| [`maqueta_centinela.py`](maqueta_centinela.py) | Script que genera todo el modelo. Si cambias una medida, vuelve a ejecutarlo |
| [`armado.mp4`](armado.mp4) / [`desarmado.mp4`](desarmado.mp4) | Animación hacia adelante y en reversa (las usa el reproductor) |
| [`armado-con-titulos.mp4`](armado-con-titulos.mp4) | Video para la presentación, con el nombre de cada paso |
| [`pasos/`](pasos/) | Imagen del final de cada paso (`paso-1.jpg` … `paso-8.jpg`) para las diapositivas |
| [`../maqueta-3d.html`](../maqueta-3d.html) | **Reproductor paso a paso**: botones Armar / Desarmar. Ábrelo con doble clic |

## Los 8 pasos

| Paso | Qué se arma | Cuadros |
|---|---|---|
| 1 | Caja de MDF (fondo, frentes, laterales, trasera con puerta) | 1–48 |
| 2 | Compartimiento de electrónica: divisiones, protoboard, ESP32, fuente, puerta | 49–96 |
| 3 | Río: recipiente transparente con regla | 97–144 |
| 4 | Tapa (terreno) en tres piezas | 145–192 |
| 5 | Vía, puente, ribera y viviendas | 193–240 |
| 6 | Sensores y actuadores | 241–288 |
| 7 | Cableado bajo la tapa (la tapa izquierda se vuelve transparente) | 289–336 |
| 8 | Prueba con agua: verde intermitente, rojo fijo con barrera abajo y rojo intermitente | 337–456 |

## Regenerar

Blender 4.2 LTS portable (no requiere instalación): <https://download.blender.org/release/Blender4.2/>

```bash
blender -b -P maqueta_centinela.py -- --salida salida              # solo el .blend
blender -b -P maqueta_centinela.py -- --salida salida --render      # además los 456 cuadros PNG (~12 min con EEVEE)
```
