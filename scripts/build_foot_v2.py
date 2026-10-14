"""Genera public/models/foot-v2.glb: pie izquierdo de MakeHuman (CC0) con zonas anatómicas como materiales.

Uso (la malla base viene dentro del add-on MPFB2, extensions.blender.org/add-ons/mpfb, carpeta data/):
  blender --background --python scripts/build_foot_v2.py -- <mpfb>/data public/models/foot-v2.glb

Marco de salida (cm, igual al de foot-v1): +Z hacia los dedos (talón en z=0), +Y arriba (planta en y=0),
-X medial. Cada cara lleva un material "zona:<id>"; el visor lee la zona del material tocado.
Las zonas se derivan de las articulaciones del esqueleto de MakeHuman (MTF y falanges de cada dedo,
tobillo) y, donde el esqueleto no llega (tarso), de proporciones del largo del pie.
"""
import json
import sys

import bmesh
import bpy
from mathutils import Vector

data_dir, salida = sys.argv[sys.argv.index("--") + 1:]

vertices, caras = [], []
with open(f"{data_dir}/3dobjs/base.obj", encoding="utf-8") as obj:
    for linea in obj:
        if linea.startswith("v "):
            vertices.append(Vector(map(float, linea.split()[1:4])))
        elif linea.startswith("f "):
            caras.append([int(t.split("/")[0]) - 1 for t in linea.split()[1:]])
with open(f"{data_dir}/mesh_metadata/basemesh_vertex_groups.json", encoding="utf-8") as archivo:
    grupos = json.load(archivo)


def indices(grupo):
    return [i for inicio, fin in grupos[grupo] for i in range(inicio, fin + 1)]


def articulacion(nombre):
    puntos = [vertices[i] for i in indices(f"joint-l-{nombre}")]
    return sum(puntos, Vector()) / len(puntos)


# --- Recorte del pie izquierdo (MakeHuman: decímetros, +Y arriba, +Z adelante, pie izquierdo en +X) ---
tobillo_dm = articulacion("ankle")
corte = tobillo_dm.y + 0.75  # pierna distal hasta ~15 cm del suelo
cuerpo = set(indices("body"))
seleccion = {i for i in cuerpo if vertices[i].x > 0.9 and vertices[i].y < corte}
caras_pie = [c for c in caras if all(i in seleccion for i in c)]

suelo = min(vertices[i].y for i in seleccion)
talon = min(vertices[i].z for i in seleccion)


def a_cm(v):
    return Vector(((v.x - tobillo_dm.x) * 10, (v.y - suelo) * 10, (v.z - talon) * 10))


bm = bmesh.new()
mapa = {}
for c in caras_pie:
    for i in c:
        if i not in mapa:
            mapa[i] = bm.verts.new(a_cm(vertices[i]))
for c in caras_pie:
    bm.faces.new([mapa[i] for i in c])
bmesh.ops.holes_fill(bm, edges=bm.edges[:], sides=0)  # tapa la pierna
bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
malla = bpy.data.meshes.new("PieIzquierdo")
bm.to_mesh(malla)
bm.free()
objeto = bpy.data.objects.new("PieIzquierdo", malla)
bpy.context.scene.collection.objects.link(objeto)
objeto.modifiers.new("subdivision", "SUBSURF").levels = 2
grafo = bpy.context.evaluated_depsgraph_get()
final = bpy.data.meshes.new_from_object(objeto.evaluated_get(grafo))
objeto.modifiers.clear()
objeto.data = final

# --- Puntos de referencia anatómicos (cm) ---
TOBILLO = a_cm(tobillo_dm)
CADENAS = {1: ["toe-1-1", "toe-1-2", "toe-1-3"]}
CADENAS.update({n: [f"toe-{n}-{k}" for k in range(1, 5)] for n in range(2, 6)})
DEDOS = {n: [a_cm(articulacion(j)) for j in cadena] for n, cadena in CADENAS.items()}
MTF = {n: puntos[0] for n, puntos in DEDOS.items()}
LARGO = max(v.co.z for v in final.vertices)

piel = [v.co.copy() for v in final.vertices]


def cerca(alto, adelante):
    """Piel a ±1,2 cm de la altura/profundidad dada respecto del centro de la articulación del tobillo."""
    return [p for p in piel if abs(p.y - TOBILLO.y - alto) < 1.2 and abs(p.z - TOBILLO.z - adelante) < 1.2]


# El maléolo lateral es más bajo y posterior que el medial.
MALEOLO_MEDIAL = min(cerca(0.3, 0.3), key=lambda p: p.x)
MALEOLO_LATERAL = max(cerca(-0.7, -0.6), key=lambda p: p.x)
# Cabezas metatarsianas: prominencias medial (1.ª) y lateral (5.ª) del antepié, medidas en la piel.
# En esta malla caen al 72 % y 64 % del largo (referencia de horma: 72,5 % y 63,5 %); las articulaciones
# del esqueleto de MakeHuman quedan 1–2 cm más distales, por eso solo se usan para separar los dedos.
planta_antepie = [p for p in piel if p.y < 3.5 and 0.55 * LARGO < p.z < 0.8 * LARGO]
CABEZA_1 = min(planta_antepie, key=lambda p: p.x).z
CABEZA_5 = max(planta_antepie, key=lambda p: p.x).z
CABEZAS = {n: CABEZA_1 + (CABEZA_5 - CABEZA_1) * (n - 1) / 4 for n in range(1, 6)}
talon_bajo = [p for p in piel if p.z < 0.2 * LARGO and p.y < 2]
CENTRO_TALON_X = sum(p.x for p in talon_bajo) / len(talon_bajo)


def distancia_xz(p, a, b):
    """Distancia en planta (xz) de p al segmento ab."""
    p2, a2, b2 = Vector((p.x, p.z)), Vector((a.x, a.z)), Vector((b.x, b.z))
    ab = b2 - a2
    t = max(0.0, min(1.0, (p2 - a2).dot(ab) / ab.length_squared))
    return (p2 - (a2 + ab * t)).length


def radio_mas_cercano(p):
    def distancia(n):
        # Cadena del dedo prolongada por el metatarsiano hasta detrás de su cabeza.
        puntos = [Vector((MTF[n].x, MTF[n].y, CABEZAS[n] - 2))] + DEDOS[n]
        return min(distancia_xz(p, a, b) for a, b in zip(puntos, puntos[1:]))
    return min(DEDOS, key=distancia)


def zona(c, normal):
    if (c - MALEOLO_MEDIAL).length < 2.2 and normal.x < 0:
        return "maleolo_medial"
    if (c - MALEOLO_LATERAL).length < 2.2 and normal.x > 0:
        return "maleolo_lateral"
    if c.z < TOBILLO.z - 1 and normal.z < -0.4 and c.y > 4:
        return "aquiles"
    if c.y > TOBILLO.y + 3:
        return "pierna"
    if c.y > TOBILLO.y - 1 and c.z < TOBILLO.z + 3:
        return "tobillo"
    if c.z < 0.3 * LARGO:
        return "talon"
    if c.z > min(CABEZAS.values()) - 1.2:
        n = radio_mas_cercano(c)
        # El dedo empieza en la articulación del esqueleto (base visible del dedo); la cabeza
        # metatarsiana abarca ~1,2 cm proximal a su prominencia hasta esa base.
        if c.z > MTF[n].z + 0.5:
            return "hallux" if n == 1 else f"dedo_{n}"
        if c.z > CABEZAS[n] - 1.2:
            return f"cabeza_mt_{n}"
    if c.z > 0.5 * LARGO:
        return "diafisis_mt"
    if normal.x > 0.4 and c.z > 0.4 * LARGO and c.y < 2.5:
        return "base_mt_5"
    eje_x = CENTRO_TALON_X + (MTF[2].x - CENTRO_TALON_X) * c.z / MTF[2].z
    if normal.y < -0.3 and c.x < eje_x:
        return "arco_medial"
    return "mediopie"


materiales = {}
for poligono in final.polygons:
    nombre = zona(poligono.center, poligono.normal)
    if nombre not in materiales:
        material = bpy.data.materials.new(f"zona:{nombre}")
        material.diffuse_color = (0.85, 0.72, 0.64, 1)
        material.use_backface_culling = True
        material.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.85, 0.72, 0.64, 1)
        material.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.6
        final.materials.append(material)
        materiales[nombre] = len(final.materials) - 1
    poligono.material_index = materiales[nombre]
    poligono.use_smooth = True

print("ZONAS", {nombre: sum(1 for p in final.polygons if p.material_index == i) for nombre, i in materiales.items()})
print("LARGO_CM", round(LARGO, 2), "CARAS", len(final.polygons), "VERTICES", len(final.vertices))
print("CABEZAS", {n: round(z, 2) for n, z in CABEZAS.items()}, "MTF", {n: round(p.z, 2) for n, p in MTF.items()})
print("MALEOLOS", tuple(round(v, 2) for v in MALEOLO_MEDIAL), tuple(round(v, 2) for v in MALEOLO_LATERAL))

for otro in list(bpy.data.objects):
    if otro is not objeto:
        bpy.data.objects.remove(otro)
bpy.ops.export_scene.gltf(
    filepath=salida, export_format="GLB", export_yup=False, use_selection=False,
    export_normals=True, export_materials="EXPORT", export_cameras=False, export_lights=False,
)
