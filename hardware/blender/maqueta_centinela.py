"""
Centinela Cravo Sur · maqueta 3D realista con animación de armado (Blender 4.2 LTS).

Construye la maqueta a escala real (1 unidad = 1 cm), con materiales procedurales
(MDF, balso, pasto pintado, asfalto, vidrio, agua, PCB) y una animación en 8 pasos:
cada pieza baja a su lugar en el orden de construcción, y en el paso 8 el río crece,
cambian los LED del semáforo y baja la barrera.

Uso (sin abrir la interfaz):
  blender -b -P maqueta_centinela.py -- --salida <carpeta> [--render] [--muestras 32] [--ancho 1280]

  --render      además de guardar el .blend, renderiza los cuadros PNG en <salida>/cuadros
Sin --render solo crea <salida>/maqueta_centinela.blend para abrirlo en Blender.
"""
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

# ── Argumentos ────────────────────────────────────────────────────────────────
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(nombre, defecto=None):
    return argv[argv.index(nombre) + 1] if nombre in argv else defecto
SALIDA = os.path.abspath(arg("--salida", os.path.join(os.getcwd(), "salida_blender")))
RENDER = "--render" in argv
MUESTRAS = int(arg("--muestras", 32))
ANCHO = int(arg("--ancho", 1280))
os.makedirs(SALIDA, exist_ok=True)

# ── Escena limpia ─────────────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
escena = bpy.context.scene
escena.unit_settings.system = "METRIC"
escena.unit_settings.scale_length = 0.01
escena.unit_settings.length_unit = "CENTIMETERS"

PASO = 48                 # cuadros por paso de armado
PASOS = 7
F_PRUEBA = PASOS * PASO   # inicio del paso 8 (prueba con agua)
FIN = F_PRUEBA + 120
escena.frame_start, escena.frame_end = 1, FIN
escena.render.fps = 24

# Coordenadas de la maqueta (cm): x largo 0..60, y alto, z fondo 0 (frente)..40 (atrás)
def B(x, y, z):
    return Vector((x - 30.0, z - 20.0, y))

# ── Materiales ────────────────────────────────────────────────────────────────
def nodo(arbol, tipo, x=0, y=0, **props):
    n = arbol.nodes.new(tipo)
    n.location = (x, y)
    for k, v in props.items():
        setattr(n, k, v)
    return n

def material(nombre, color, rugosidad=0.6, metal=0.0, ruido=None, escala=4.0, bump=0.0, vetas=False,
             alpha=1.0, transmision=0.0, ior=1.45, emision=None, intensidad=0.0):
    m = bpy.data.materials.new(nombre)
    m.use_nodes = True
    a = m.node_tree
    p = a.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Roughness"].default_value = rugosidad
    p.inputs["Metallic"].default_value = metal
    p.inputs["IOR"].default_value = ior
    if transmision:
        p.inputs["Transmission Weight"].default_value = transmision
    if alpha < 1:
        p.inputs["Alpha"].default_value = alpha
        if hasattr(m, "surface_render_method"):
            m.surface_render_method = "BLENDED"
        else:
            m.blend_method = "BLEND"
        if hasattr(m, "use_transparency_overlap"):
            m.use_transparency_overlap = False
    if emision is not None:
        p.inputs["Emission Color"].default_value = (*emision, 1)
        p.inputs["Emission Strength"].default_value = intensidad
    if ruido:
        coord = nodo(a, "ShaderNodeTexCoord", -900, 0)
        mapeo = nodo(a, "ShaderNodeMapping", -700, 0)
        mapeo.inputs["Scale"].default_value = (escala, escala * (6 if vetas else 1), escala)
        a.links.new(coord.outputs["Object"], mapeo.inputs["Vector"])
        if vetas:
            tex = nodo(a, "ShaderNodeTexWave", -500, 0)
            tex.inputs["Scale"].default_value = 2.0
            tex.inputs["Distortion"].default_value = 6.0
            tex.inputs["Detail"].default_value = 3.0
        else:
            tex = nodo(a, "ShaderNodeTexNoise", -500, 0)
            tex.inputs["Scale"].default_value = 6.0
            tex.inputs["Detail"].default_value = 8.0
        a.links.new(mapeo.outputs["Vector"], tex.inputs["Vector"])
        rampa = nodo(a, "ShaderNodeValToRGB", -250, 100)
        rampa.color_ramp.elements[0].color = (*ruido[0], 1)
        rampa.color_ramp.elements[1].color = (*ruido[1], 1)
        a.links.new(tex.outputs["Fac"], rampa.inputs["Fac"])
        a.links.new(rampa.outputs["Color"], p.inputs["Base Color"])
        if bump:
            b = nodo(a, "ShaderNodeBump", -250, -200)
            b.inputs["Strength"].default_value = bump
            a.links.new(tex.outputs["Fac"], b.inputs["Height"])
            a.links.new(b.outputs["Normal"], p.inputs["Normal"])
    return m

def srgb(h):
    """Hex sRGB → color lineal para Blender."""
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92 for v in c)

MAT = {
    "mdf": material("MDF", srgb("C9A97A"), 0.72, ruido=(srgb("C2A070"), srgb("D2B488")), escala=1.5, bump=0.05),
    "mdf2": material("MDF interior", srgb("B8955F"), 0.75, ruido=(srgb("AD8A55"), srgb("C29F6B")), escala=1.5, bump=0.05),
    "pasto": material("Pintura pasto", srgb("2F7D4F"), 0.85, ruido=(srgb("2A7247"), srgb("3A8C5A")), escala=0.6, bump=0.08),
    "via": material("Asfalto", srgb("4B5260"), 0.9, ruido=(srgb("3F4652"), srgb("5A6170")), escala=3.0, bump=0.15),
    "pintura": material("Pintura blanca", srgb("F2F2EE"), 0.5),
    "balso": material("Balso", srgb("E8D2A6"), 0.65, ruido=(srgb("DEC594"), srgb("F0DDB6")), escala=0.8, vetas=True, bump=0.03),
    "tierra": material("Tierra", srgb("6B4A2E"), 0.95, ruido=(srgb("4F3420"), srgb("8A6440")), escala=2.5, bump=0.6),
    "blanco": material("Plástico blanco", srgb("F4F4F2"), 0.45),
    "negro": material("Plástico negro", srgb("1C1F24"), 0.4),
    "rojo": material("Pintura roja", srgb("C62828"), 0.45),
    "azul": material("Módulo azul", srgb("1D4ED8"), 0.35),
    "pcb": material("PCB", srgb("12733A"), 0.35, ruido=(srgb("0F6533"), srgb("168443")), escala=8, bump=0.05),
    "metal": material("Metal", srgb("C7CDD6"), 0.25, metal=1.0),
    "techo": material("Teja", srgb("A0522D"), 0.8, ruido=(srgb("8E4726"), srgb("B05E35")), escala=4, bump=0.2),
    "vidrio": material("Vidrio", srgb("EEF5FF"), 0.03, alpha=0.1, ior=1.5),
    "agua": material("Agua", srgb("1A56B8"), 0.05, alpha=0.8, ior=1.33),
    "mesa": material("Mesa", srgb("D9DCE1"), 0.6, ruido=(srgb("D0D3D8"), srgb("E2E5EA")), escala=0.05, bump=0.02),
    "oled": material("OLED", srgb("05070A"), 0.2, emision=srgb("7FD8FF"), intensidad=1.5),
    "cobre": material("Cobre", srgb("B87333"), 0.3, metal=1.0),
}
CABLES = [material(f"Cable {i}", srgb(c), 0.45) for i, c in enumerate(["D32F2F", "212121", "1E88E5", "FDD835", "43A047", "FB8C00"])]

# ── Geometría ─────────────────────────────────────────────────────────────────
coleccion = escena.collection

def objeto(nombre, malla, mat, biselar=True, suave=False):
    ob = bpy.data.objects.new(nombre, malla)
    coleccion.objects.link(ob)
    ob.data.materials.append(mat)
    if suave:
        for p in ob.data.polygons:
            p.use_smooth = True
    if biselar:
        mod = ob.modifiers.new("Bisel", "BEVEL")
        mod.width = 0.06
        mod.segments = 2
        mod.limit_method = "ANGLE"
    return ob

def caja(nombre, x0, y0, z0, w, h, d, mat, biselar=True):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(w, d, h), verts=bm.verts)
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me); bm.free()
    ob = objeto(nombre, me, mat, biselar and min(w, h, d) > 0.15)
    ob.location = B(x0 + w / 2, y0 + h / 2, z0 + d / 2)
    return ob

def cilindro(nombre, x, y0, z, r, h, mat, segmentos=32, eje="Y"):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segmentos, radius1=r, radius2=r, depth=h)
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me); bm.free()
    ob = objeto(nombre, me, mat, biselar=False, suave=True)
    if eje == "Y":       # vertical en la maqueta
        ob.location = B(x, y0 + h / 2, z)
    else:                # eje hacia el frente (perpendicular a la pared frontal)
        ob.rotation_euler = (math.radians(90), 0, 0)
        ob.location = B(x, y0, z)
    return ob

def esfera(nombre, centro, r, mat, media=False):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=r)
    if media:
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context="VERTS")
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me); bm.free()
    ob = objeto(nombre, me, mat, biselar=False, suave=True)
    ob.location = centro
    return ob

def piramide(nombre, cx, y0, cz, w, d, h, mat):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=1, radius2=0.001, depth=1)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=__import__("mathutils").Matrix.Rotation(math.radians(45), 3, "Z"))
    bmesh.ops.scale(bm, vec=(w / 1.414 * 1.1, d / 1.414 * 1.1, h), verts=bm.verts)
    me = bpy.data.meshes.new(nombre)
    bm.to_mesh(me); bm.free()
    ob = objeto(nombre, me, mat, biselar=False)
    ob.location = B(cx, y0 + h / 2, cz)
    return ob

def cable(nombre, puntos, mat, grosor=0.12):
    cu = bpy.data.curves.new(nombre, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = grosor
    cu.bevel_resolution = 3
    sp = cu.splines.new("NURBS")
    sp.points.add(len(puntos) - 1)
    for p, v in zip(sp.points, puntos):
        p.co = (*v, 1)
    sp.order_u = 4
    sp.use_endpoint_u = True
    ob = bpy.data.objects.new(nombre, cu)
    coleccion.objects.link(ob)
    ob.data.materials.append(mat)
    return ob

# ── Pasos de armado ───────────────────────────────────────────────────────────
piezas = {k: [] for k in range(1, PASOS + 1)}   # paso → lista de grupos (empties)

def pieza(paso, nombre, *objs):
    """Agrupa objetos bajo un empty en el origen; el empty se anima para 'bajar' a su lugar."""
    g = bpy.data.objects.new(f"P{paso} · {nombre}", None)
    g.empty_display_size = 2
    coleccion.objects.link(g)
    for o in objs:
        o.parent = g
    piezas[paso].append(g)
    return g

E, TAPA = 0.3, 15.0
T = TAPA + E

# Paso 1 · caja de MDF
pieza(1, "Fondo", caja("Fondo", 0, 0, 0, 60, E, 40, MAT["mdf"]))
pieza(1, "Frente izquierdo", caja("Frente izq", 0, E, 0, 24, TAPA - E, E, MAT["mdf"]))
pieza(1, "Frente derecho", caja("Frente der", 39, E, 0, 21, TAPA - E, E, MAT["mdf"]))
pieza(1, "Lateral izquierdo", caja("Lateral izq", 0, E, E, E, TAPA - E, 40 - 2 * E, MAT["mdf"]))
pieza(1, "Lateral derecho", caja("Lateral der", 60 - E, E, E, E, TAPA - E, 40 - 2 * E, MAT["mdf"]))
pieza(1, "Pared trasera", caja("Trasera a", 0, E, 40 - E, 3, TAPA - E, E, MAT["mdf"]),
      caja("Trasera b", 18, E, 40 - E, 42, TAPA - E, E, MAT["mdf"]),
      caja("Trasera c", 3, E, 40 - E, 15, 2.7, E, MAT["mdf"]),
      caja("Trasera d", 3, 13, 40 - E, 15, TAPA - 13, E, MAT["mdf"]))

# Paso 2 · compartimiento de electrónica
pieza(2, "Divisiones", caja("Division frontal", E, E, 26.5, 21.2, TAPA - 2 * E, E, MAT["mdf2"]),
      caja("Division lateral", 21.5, E, 26.5, E, TAPA - 2 * E, 13.2, MAT["mdf2"]))
proto = [caja("Protoboard", 3, E, 29, 16.5, 0.9, 5.5, MAT["blanco"])]
for i in range(30):
    proto.append(caja(f"Proto agujeros {i}", 3.4 + i * 0.52, E + 0.9, 29.6, 0.12, 0.02, 4.3, MAT["negro"], biselar=False))
pieza(2, "Protoboard", *proto)
pieza(2, "ESP32 DevKit v1", caja("ESP32 placa", 6, 1.2, 30.2, 5.5, 0.16, 2.8, MAT["negro"]),
      caja("ESP32 modulo", 6.3, 1.36, 30.6, 1.8, 0.3, 2.0, MAT["metal"]),
      caja("ESP32 usb", 11.1, 1.36, 31.2, 0.6, 0.3, 0.8, MAT["metal"]))
pieza(2, "Fuente 5 V", caja("Fuente", 3, E, 35.5, 6, 2.5, 3, MAT["negro"]))
pieza(2, "Puerta trasera", caja("Puerta", 3, 3, 40, 15, 10, E, MAT["mdf2"]),
      cilindro("Perilla", 16, 7.5, 40.6, 0.35, 0.6, MAT["metal"], eje="Z"))

# Paso 3 · río
regla = [caja("Regla", 24.2, E, -0.05, 1.2, TAPA - E, 0.05, MAT["blanco"], biselar=False)]
for cm in range(1, 15):
    largo = 0.8 if cm % 5 == 0 else 0.45
    regla.append(caja(f"Marca {cm}", 24.25, E + cm - 0.03, -0.09, largo, 0.06, 0.04, MAT["negro"], biselar=False))
pieza(3, "Río (recipiente)", caja("Recipiente", 24, E, 0, 15, TAPA - E, 30, MAT["vidrio"], biselar=False), *regla)
agua = caja("Agua", 24.15, E, 0.15, 14.7, 1.0, 29.7, MAT["agua"], biselar=False)
# origen en la base para escalar la altura
for v in agua.data.vertices:
    v.co.z += 0.5
agua.location.z -= 0.5
pieza(3, "Agua", agua)

# Paso 4 · tapa
MAT["pasto_izq"] = material("Pintura pasto (tapa izq.)", srgb("2F7D4F"), 0.85, ruido=(srgb("2A7247"), srgb("3A8C5A")), escala=0.6, bump=0.08, alpha=0.999)
pieza(4, "Tapa izquierda", caja("Tapa izq", 0, TAPA, 0, 24, E, 40, MAT["pasto_izq"]))
pieza(4, "Tapa derecha", caja("Tapa der", 39, TAPA, 0, 21, E, 40, MAT["pasto"]))
pieza(4, "Tapa trasera del río", caja("Tapa rio", 24, TAPA, 30, 15, E, 10, MAT["pasto"]))

# Paso 5 · vía, puente, ribera, viviendas
lineas = []
for x0, x1 in ((0, 22), (41, 60)):
    x = x0 + 1
    while x + 2 < x1:
        lineas.append(caja(f"Linea {x}", x, T + 0.2, 20.85, 2, 0.02, 0.3, MAT["pintura"], biselar=False))
        x += 3.5
pieza(5, "Vía", caja("Via izq", 0, T, 17, 22, 0.2, 8, MAT["via"]), caja("Via der", 41, T, 17, 19, 0.2, 8, MAT["via"]), *lineas)
pieza(5, "Puente", caja("Tablero", 22, T, 16.5, 19, 0.5, 9, MAT["balso"]),
      caja("Baranda frontal", 22, T + 0.5, 16.5, 19, 1.2, 0.3, MAT["balso"]),
      caja("Baranda trasera", 22, T + 0.5, 25.2, 19, 1.2, 0.3, MAT["balso"]))
pieza(5, "Ribera", caja("Bandeja", 42, T, 3, 10, 1.5, 10, MAT["balso"]),
      caja("Tierra", 42.3, T + 0.3, 3.3, 9.4, 1.35, 9.4, MAT["tierra"]))
casas = []
for i, (x, z) in enumerate(((53, 29), (53, 35))):
    casas += [caja(f"Casa {i}", x, T, z, 5, 3, 4, MAT["blanco"]),
              piramide(f"Techo {i}", x + 2.5, T + 3, z + 2, 5.6, 4.6, 2, MAT["techo"]),
              caja(f"Puerta casa {i}", x + 2, T, z - 0.05, 1, 1.8, 0.1, MAT["mdf2"], biselar=False)]
pieza(5, "Viviendas", *casas)

# Paso 6 · sensores y actuadores
leds = {}
sem = [cilindro("Poste semaforo", 5, T, 29, 0.4, 12, MAT["negro"]),
       caja("Cabeza semaforo", 4.1, T + 8, 28.2, 1.8, 5, 1.4, MAT["negro"])]
for i, (clave, col) in enumerate((("rojo", "FF2A2A"), ("verde", "22E05A"))):
    m = material(f"LED {clave}", tuple(c * 0.08 for c in srgb(col)), 0.2, emision=srgb(col), intensidad=0.0)
    leds[clave] = m
    sem.append(esfera(f"LED {clave}", B(5, T + 11.9 - i * 2.2, 28.1), 0.5, m))
pieza(6, "Semáforo 2 LED", *sem)

pivote = bpy.data.objects.new("Pivote barrera", None)
coleccion.objects.link(pivote)
pivote.location = B(15.15, T + 3.2, 26.4)
# Brazo en coordenadas locales del pivote: se extiende 9 cm hacia el frente (-Y)
brazo = caja("Brazo", 0, 0, 0, 0.3, 0.6, 9, MAT["rojo"])
brazo.parent = pivote
brazo.location = (0, -4.5, 0)
for k in (1.5, 4.5, 7.5):
    franja = caja(f"Franja {k}", 0, 0, 0, 0.32, 0.62, 1, MAT["blanco"], biselar=False)
    franja.parent = pivote
    franja.location = (0, -k, 0)
pivote.rotation_euler = (math.radians(-90), 0, 0)
pieza(6, "Barrera (servo)", caja("Taco servo", 14, T, 26.5, 2.3, 1.3, 1.2, MAT["balso"]),
      caja("Servo SG90", 14, T + 1.3, 26.5, 2.3, 2.2, 1.2, MAT["azul"]),
      cilindro("Eje servo", 15.15, T + 3.5, 26.4, 0.25, 0.3, MAT["blanco"]), pivote)

pieza(6, "Sensor IR", caja("IR placa", 11.2, T, 14.2, 1.6, 0.16, 3.2, MAT["pcb"]),
      cilindro("IR led a", 11.6, T + 0.16, 16.9, 0.25, 0.6, MAT["negro"]),
      cilindro("IR led b", 12.4, T + 0.16, 16.9, 0.25, 0.6, MAT["blanco"]))
pieza(6, "Mástil", cilindro("Mastil", 40.5, T, 7, 0.4, 10, MAT["balso"]),
      caja("Brazo mastil", 31, T + 9.2, 6.6, 9.9, 0.6, 0.8, MAT["balso"]))
pieza(6, "HC-SR04", caja("HC placa", 29.25, T + 8.4, 6, 4.5, 0.16, 2, MAT["azul"]),
      cilindro("HC tx", 30.4, T + 7.75, 7, 0.75, 0.65, MAT["metal"]),
      cilindro("HC rx", 32.6, T + 7.75, 7, 0.75, 0.65, MAT["metal"]),
      caja("HC cristal", 31.2, T + 8.1, 6.3, 0.6, 0.3, 0.3, MAT["metal"]))
pieza(6, "DHT11", caja("DHT11", 40.9, T + 4, 6.2, 0.5, 2, 1.6, MAT["azul"]))
pieza(6, "PIR", cilindro("Poste PIR", 55, T, 6, 0.4, 6, MAT["balso"]),
      caja("PIR placa", 54.2, T + 6, 5.2, 1.6, 0.16, 1.6, MAT["pcb"]),
      esfera("PIR domo", B(55, T + 6.16, 6), 0.75, MAT["blanco"], media=True))
pieza(6, "Panel: OLED y táctil", caja("OLED marco", 5, 8, -0.25, 3, 2.1, 0.25, MAT["negro"]),
      caja("OLED pantalla", 5.15, 8.3, -0.3, 2.7, 1.5, 0.05, MAT["oled"], biselar=False),
      cilindro("Tactil", 13, 9, -0.15, 0.9, 0.3, MAT["azul"], eje="Z"))

# Paso 7 · cableado (dupont de colores hasta el ESP32)
esp = B(8.75, 1.7, 31.6)
destinos = [(5, T, 29), (15, T, 27), (12, T, 15.5), (40.5, T, 7), (55, T, 6), (6.5, 9, 0.3), (13, 9, 0.3)]
cs = []
for i, (x, y, z) in enumerate(destinos):
    a = B(x + 0.6, y, z)
    fin = esp + Vector((i * 0.25 - 1, 0, 0.4))
    if x > 22:   # lado derecho: baja, va por detrás del río (z > 30) y entra por la división lateral
        pts = [a, B(x + 0.6, y - 1.5, z), B(x + 0.6, 12, 34), B(23, 10, 34), B(19, 6, 34), fin]
    else:        # lado izquierdo: baja y va directo al compartimiento
        pts = [a, B(x + 0.6, y - 1.5, z), B(x + 0.6, 8, max(z, 22)), B(12, 6, 28), fin]
    cs.append(cable(f"Cable {i}", pts, CABLES[i % len(CABLES)]))
pieza(7, "Cableado", *cs)

# ── Animación de armado ───────────────────────────────────────────────────────
def clave(ob, ruta, cuadro, interp="BEZIER"):
    ob.keyframe_insert(ruta, frame=cuadro)
    for fc in ob.animation_data.action.fcurves:
        if fc.data_path == ruta:
            for kp in fc.keyframe_points:
                if kp.co.x == cuadro:
                    kp.interpolation = interp
                    kp.easing = "EASE_OUT"

for paso, grupos in piezas.items():
    inicio = (paso - 1) * PASO + 1
    separacion = min(5, 26 / max(len(grupos), 1))
    for i, g in enumerate(grupos):
        t0 = int(inicio + 2 + i * separacion)
        g.scale = (0, 0, 0); clave(g, "scale", 1, "CONSTANT")
        if t0 > 1:
            clave(g, "scale", t0 - 1, "CONSTANT")
        g.scale = (1, 1, 1); clave(g, "scale", t0, "CONSTANT")
        g.location = (0, 0, 32); clave(g, "location", t0)
        g.location = (0, 0, 0); clave(g, "location", t0 + 18)

# El agua solo aparece en la prueba
agua.scale.z = 0.001; clave(agua, "scale", F_PRUEBA, "CONSTANT")

# ── Paso 8 · prueba con agua ──────────────────────────────────────────────────
U = {"amarillo": 5.0, "naranja": 8.0, "rojo": 11.0}
SUBIDA0, SUBIDA1, MAX = F_PRUEBA + 8, F_PRUEBA + 92, 12.6
def nivel_en(f):
    if f <= SUBIDA0: return 0.5
    if f >= SUBIDA1: return MAX
    k = (f - SUBIDA0) / (SUBIDA1 - SUBIDA0)
    return 0.5 + (MAX - 0.5) * (k * k * (3 - 2 * k))
for f in range(SUBIDA0, SUBIDA1 + 1, 4):
    agua.scale.z = nivel_en(f); clave(agua, "scale", f, "LINEAR")

def cuadro_de(nivel):
    for f in range(SUBIDA0, SUBIDA1 + 1):
        if nivel_en(f) >= nivel:
            return f
    return SUBIDA1
f_am, f_na, f_ro = cuadro_de(U["amarillo"]), cuadro_de(U["naranja"]), cuadro_de(U["rojo"])

def emision(m, cuadro, valor):
    s = m.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    s.default_value = valor
    s.keyframe_insert("default_value", frame=cuadro)
    for fc in m.node_tree.animation_data.action.fcurves:
        for kp in fc.keyframe_points:
            kp.interpolation = "CONSTANT"

f_sem = 5 * PASO + 10      # el semáforo se enciende en verde al instalarlo
# Verde fijo = normal · verde intermitente = vigilancia · rojo fijo = barrera cerrada · rojo intermitente = alerta máxima
emision(leds["verde"], 1, 0); emision(leds["verde"], f_sem, 6)
for f in range(f_am, f_na, 8):
    emision(leds["verde"], f, 6 if ((f - f_am) // 8) % 2 == 0 else 0)
emision(leds["verde"], f_na, 0)
emision(leds["rojo"], 1, 0); emision(leds["rojo"], f_na, 7)
for f in range(f_ro, FIN + 1, 6):
    emision(leds["rojo"], f, 8 if ((f - f_ro) // 6) % 2 == 0 else 0.4)

clave(pivote, "rotation_euler", f_na)          # abierta hasta naranja
pivote.rotation_euler = (0, 0, 0)              # cerrada
clave(pivote, "rotation_euler", f_na + 14)

# ── Escenario: mesa, luz y cámara ─────────────────────────────────────────────
mesa = caja("Mesa", -170, -1.2, -140, 400, 1.2, 320, MAT["mesa"], biselar=False)
mesa.location = B(30, -0.6, 20)

mundo = bpy.data.worlds.new("Cielo")
escena.world = mundo
mundo.use_nodes = True
cielo = mundo.node_tree.nodes.new("ShaderNodeTexSky")
cielo.sky_type = "NISHITA"
cielo.sun_elevation = math.radians(38)
cielo.sun_rotation = math.radians(210)
fondo = mundo.node_tree.nodes["Background"]
fondo.inputs["Strength"].default_value = 0.22
mundo.node_tree.links.new(cielo.outputs["Color"], fondo.inputs["Color"])

sol = bpy.data.objects.new("Sol", bpy.data.lights.new("Sol", "SUN"))
sol.data.energy = 3.2
sol.data.angle = math.radians(4)
sol.rotation_euler = (math.radians(48), 0, math.radians(-35))
coleccion.objects.link(sol)

objetivo = bpy.data.objects.new("Objetivo", None)
objetivo.location = (0, 2, 5)
coleccion.objects.link(objetivo)
cam = bpy.data.objects.new("Cámara", bpy.data.cameras.new("Cámara"))
cam.data.lens = 42
cam.data.clip_start, cam.data.clip_end = 1, 2000
cam.location = (64, -92, 66)
coleccion.objects.link(cam)
rastreo = cam.constraints.new("TRACK_TO")
rastreo.target = objetivo
rastreo.track_axis, rastreo.up_axis = "TRACK_NEGATIVE_Z", "UP_Y"
escena.camera = cam

def toma(cuadro, pos, mira):
    cam.location = pos; clave(cam, "location", cuadro)
    objetivo.location = mira; clave(objetivo, "location", cuadro)
C0, T0 = (64, -92, 66), (0, 2, 5)
C2, T2 = (-17, -6, 92), tuple(B(11, 0, 32))      # paso 2: vista casi cenital del compartimiento
C7, T7 = (-58, -72, 74), tuple(B(14, 4, 26))     # paso 7: cableado bajo la tapa izquierda
C8, T8 = (34, -78, 40), (-2, -6, 10)             # paso 8: frente del río y semáforo
# La cámara queda quieta durante cada paso y solo se mueve al comenzar el siguiente,
# así cada pausa del reproductor (fin de paso) muestra una vista limpia.
for cuadro, (pos, mira) in (
    (1, (C0, T0)), (PASO, (C0, T0)),
    (PASO + 8, (C2, T2)), (2 * PASO, (C2, T2)),
    (2 * PASO + 10, (C0, T0)), (6 * PASO, (C0, T0)),
    (6 * PASO + 10, (C7, T7)), (7 * PASO, (C7, T7)),
    (7 * PASO + 10, (C8, T8)), (FIN, ((40, -84, 44), T8)),
):
    toma(cuadro, pos, mira)

# Paso 7: la tapa izquierda se vuelve transparente para ver el cableado y luego vuelve a ser opaca
alfa = MAT["pasto_izq"].node_tree.nodes["Principled BSDF"].inputs["Alpha"]
for cuadro, valor in ((6 * PASO + 4, 1.0), (6 * PASO + 14, 0.25), (7 * PASO, 0.25), (7 * PASO + 8, 1.0)):
    alfa.default_value = valor
    alfa.keyframe_insert("default_value", frame=cuadro)

# ── Render ────────────────────────────────────────────────────────────────────
escena.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_EEVEE"
ee = escena.eevee
ee.taa_render_samples = MUESTRAS
for prop, val in (("use_shadows", True), ("use_raytracing", True), ("use_gtao", True), ("shadow_ray_count", 2), ("shadow_step_count", 8)):
    if hasattr(ee, prop):
        setattr(ee, prop, val)
if hasattr(ee, "ray_tracing_options"):
    ee.ray_tracing_options.resolution_scale = "2"
escena.view_settings.view_transform = "AgX"
try:
    escena.view_settings.look = "AgX - Medium High Contrast"
except TypeError:
    pass
escena.render.resolution_x = ANCHO
escena.render.resolution_y = int(ANCHO * 9 / 16)
escena.render.resolution_percentage = 100
escena.render.film_transparent = False
escena.render.image_settings.file_format = "PNG"
escena.render.filepath = os.path.join(SALIDA, "cuadros", "")
escena.frame_set(FIN)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SALIDA, "maqueta_centinela.blend"))
print(f"[centinela] .blend guardado · cuadros 1–{FIN} · naranja en {f_na}, rojo en {f_ro}")
print(f"[centinela] pasos: " + ", ".join(f"{p}:{(p - 1) * PASO + 1}" for p in range(1, PASOS + 1)) + f", 8:{F_PRUEBA + 1}")

if RENDER:
    bpy.ops.render.render(animation=True)
