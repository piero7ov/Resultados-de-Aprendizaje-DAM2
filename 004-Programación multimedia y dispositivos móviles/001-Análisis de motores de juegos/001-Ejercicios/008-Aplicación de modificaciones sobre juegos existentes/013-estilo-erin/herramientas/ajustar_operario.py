"""Combina el avatar y un chaleco ajustado en un GLB para la versión 008.

Ejecutar con Blender: blender -b --python herramientas/ajustar_operario.py -- --previsualizar
"""

import bmesh
import bpy
import math
import sys
import tempfile
from mathutils import Matrix, Vector
from pathlib import Path


RAIZ = Path(__file__).resolve().parents[1]
MODELOS = RAIZ / "modelos"


def importar_avatar():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(MODELOS / "avatar.glb"))
    for objeto in list(bpy.data.objects):
        if objeto.name not in ("Armature", "Cube"):
            bpy.data.objects.remove(objeto, do_unlink=True)

    armadura = bpy.data.objects["Armature"]
    cuerpo = bpy.data.objects["Cube"]
    cuerpo.name = "Cuerpo"

    espejo = cuerpo.copy()
    espejo.data = cuerpo.data.copy()
    bpy.context.collection.objects.link(espejo)
    espejo.name = "Cuerpo espejo"
    for vertice in espejo.data.vertices:
        vertice.co.x = -vertice.co.x
    malla = bmesh.new()
    malla.from_mesh(espejo.data)
    bmesh.ops.reverse_faces(malla, faces=malla.faces[:])
    malla.to_mesh(espejo.data)
    malla.free()

    for derecha, izquierda in [
        ("Bone.004", "Bone.008"), ("Bone.005", "Bone.009"),
        ("Bone.006", "Bone.010"), ("Bone.007", "Bone.011")
    ]:
        espejo.vertex_groups[derecha].name = "temporal" + derecha
        espejo.vertex_groups[izquierda].name = derecha
        espejo.vertex_groups["temporal" + derecha].name = izquierda
    return armadura, cuerpo, espejo


def importar_chaleco():
    anteriores = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(MODELOS / "vest.glb"))
    chaleco = next(
        objeto for objeto in bpy.data.objects
        if objeto not in anteriores and objeto.type == "MESH"
    )
    transformacion = chaleco.matrix_world.copy()
    chaleco.parent = None
    chaleco.matrix_world = transformacion
    chaleco.name = "Chaleco"
    # El archivo fuente tenía un giro de 30° y una inclinación de 4°.
    # Se alinea la prenda antes de medirla para no deformar sus hombros.
    alineacion = (Matrix.Rotation(math.pi / 2 - 1.6419656, 4, "X")
                  @ Matrix.Rotation(math.pi / 6, 4, "Z"))
    chaleco.data.transform(alineacion)
    bpy.context.view_layer.update()
    chaleco.scale.x *= 1.0 / chaleco.dimensions.x
    chaleco.scale.y *= .62 / chaleco.dimensions.y
    chaleco.scale.z *= 1.18 / chaleco.dimensions.z
    chaleco.location = (0, .025, 2.97)
    bpy.ops.object.select_all(action="DESELECT")
    chaleco.select_set(True)
    bpy.context.view_layer.objects.active = chaleco
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return chaleco


def ajustar_al_torso(chaleco):
    # El torso del avatar es más ancho en pecho y hombros que en cintura.
    # Una expansión gradual conserva los pliegues sin romper la superficie.
    for vertice in chaleco.data.vertices:
        x, y, z = vertice.co
        avance = max(0, min(1, (z - 2.45) / 1.05))
        suavizado = avance * avance * (3 - 2 * avance)
        vertice.co.x = x * (1 + .10 * suavizado)
        profundidad = .02 + (y - .02) * (1 + .12 * suavizado)
        separacion = .025 + .015 * suavizado
        vertice.co.y = profundidad + separacion * math.tanh((y - .02) / .12)
        espalda = max(0, min(1, (y - .02) / .20))
        espalda = espalda * espalda * (3 - 2 * espalda)
        vertice.co.y += .15 * espalda * math.exp(-((z - 3.15) / .38) ** 2)
    chaleco.data.update()
    malla = bmesh.new()
    malla.from_mesh(chaleco.data)
    bmesh.ops.recalc_face_normals(malla, faces=malla.faces[:])
    malla.to_mesh(chaleco.data)
    malla.free()


def material(nombre, color, rugosidad):
    nuevo = bpy.data.materials.new(nombre)
    nuevo.diffuse_color = (*color, 1)
    nuevo.use_nodes = True
    principal = nuevo.node_tree.nodes.get("Principled BSDF")
    principal.inputs["Base Color"].default_value = (*color, 1)
    principal.inputs["Roughness"].default_value = rugosidad
    return nuevo


def colorear_chaleco(chaleco):
    tela = material("Tela del chaleco", (1, 1, 1), .82)
    nodos = tela.node_tree.nodes
    enlaces = tela.node_tree.links
    principal = nodos.get("Principled BSDF")
    for nombre, entrada in (("Base_Color", "Base Color"),
                            ("Roughness", "Roughness"),
                            ("Metallic", "Metallic"),
                            ("Normal_OpenGL", None)):
        imagen = bpy.data.images.load(str(
            MODELOS / "texturas-chaleco" / f"lambert2_{nombre}.png"))
        if nombre != "Base_Color":
            imagen.colorspace_settings.name = "Non-Color"
            if max(imagen.size) > 1024:
                imagen.scale(1024, 1024)
        textura = nodos.new("ShaderNodeTexImage")
        textura.image = imagen
        if entrada:
            enlaces.new(textura.outputs["Color"], principal.inputs[entrada])
        else:
            normal = nodos.new("ShaderNodeNormalMap")
            normal.inputs["Strength"].default_value = .6
            enlaces.new(textura.outputs["Color"], normal.inputs["Color"])
            enlaces.new(normal.outputs["Normal"], principal.inputs["Normal"])
        if nombre == "Base_Color":
            nodos.active = textura
    chaleco.data.materials.clear()
    chaleco.data.materials.append(tela)


def crear_banda(chaleco, altura, nombre, reflectante):
    puntos = [(vertice.co.x, vertice.co.y, vertice.co.z)
              for vertice in chaleco.data.vertices]
    vertices = []
    caras = []
    segmentos = 64
    for indice in range(segmentos):
        angulo = indice * math.tau / segmentos
        for z in (altura - .045, altura + .045):
            radios = []
            for x_punto, y_punto, z_punto in puntos:
                if abs(z_punto - z) > .055:
                    continue
                direccion = math.atan2(y_punto - .02, x_punto)
                distancia = abs((direccion - angulo + math.pi) % math.tau - math.pi)
                if distancia < .16:
                    radios.append(math.hypot(x_punto, y_punto - .02))
            radio = max(radios) + .012 if radios else .48
            vertices.append((radio * math.cos(angulo),
                             .02 + radio * math.sin(angulo), z))
        siguiente = ((indice + 1) % segmentos) * 2
        actual = indice * 2
        caras.append((actual, siguiente, siguiente + 1, actual + 1))
    malla = bpy.data.meshes.new(nombre)
    malla.from_pydata(vertices, [], caras)
    malla.materials.append(reflectante)
    objeto = bpy.data.objects.new(nombre, malla)
    bpy.context.collection.objects.link(objeto)
    return objeto


def colocar_en_torso(objeto, armadura):
    transformacion = objeto.matrix_world.copy()
    objeto.parent = armadura
    objeto.parent_type = "BONE"
    objeto.parent_bone = "Bone.001"
    objeto.matrix_world = transformacion


def previsualizar(lado):
    escena = bpy.context.scene
    datos = bpy.data.cameras.new("Cámara de revisión")
    camara = bpy.data.objects.new("Cámara de revisión", datos)
    escena.collection.objects.link(camara)
    escena.camera = camara
    posiciones = {"frente": (0, -7, 3.7), "espalda": (0, 7, 3.7),
                  "derecha": (6, -4, 3.7), "izquierda": (-6, -4, 3.7)}
    camara.location = posiciones[lado]
    camara.rotation_euler = (
        Vector((0, 0, 2.9)) - camara.location
    ).to_track_quat("-Z", "Y").to_euler()
    datos.type = "ORTHO"
    datos.ortho_scale = 2.7
    escena.render.engine = "BLENDER_WORKBENCH"
    escena.display.shading.light = "STUDIO"
    escena.display.shading.color_type = "TEXTURE"
    escena.render.resolution_x = 800
    escena.render.resolution_y = 800
    escena.render.resolution_percentage = 100
    escena.render.image_settings.file_format = "PNG"
    vistas = RAIZ / "previsualizaciones"
    vistas.mkdir(exist_ok=True)
    escena.render.filepath = str(vistas / f"operario-{lado}.png")
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camara, do_unlink=True)


def principal():
    armadura, cuerpo, espejo = importar_avatar()
    chaleco = importar_chaleco()
    ajustar_al_torso(chaleco)
    colorear_chaleco(chaleco)
    colocar_en_torso(chaleco, armadura)

    if "--previsualizar" in sys.argv:
        previsualizar("espalda")
        previsualizar("frente")
        previsualizar("derecha")
        previsualizar("izquierda")

    bpy.ops.object.select_all(action="DESELECT")
    for objeto in (armadura, cuerpo, espejo, chaleco):
        objeto.select_set(True)
    bpy.context.view_layer.objects.active = armadura
    temporal_anterior = tempfile.tempdir
    with tempfile.TemporaryDirectory(prefix=".exportacion-", dir=RAIZ) as temporal:
        try:
            tempfile.tempdir = temporal
            bpy.ops.export_scene.gltf(
                filepath=str(MODELOS / "operario.glb"), export_format="GLB",
                use_selection=True, export_cameras=False, export_lights=False,
                export_normals=True, export_skins=True
            )
        finally:
            tempfile.tempdir = temporal_anterior
    print("Operario exportado:", MODELOS / "operario.glb")


principal()
