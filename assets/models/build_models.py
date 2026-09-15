"""Bake robot visual meshes into per-link frames, simplify, export GLB.

Each GLB node is named "<link>__<colorkey>"; the web viewer assigns materials by colorkey
and assembles the kinematic chain itself.
"""
import re
import numpy as np
import trimesh
import fast_simplification
from collections import defaultdict

SRC = 'src'
OUT = 'out'


def simplify(mesh, max_faces):
    mesh = mesh.copy()
    mesh.merge_vertices()
    mesh.update_faces(mesh.nondegenerate_faces())
    if len(mesh.faces) > max_faces:
        r = 1 - max_faces / len(mesh.faces)
        v, f = fast_simplification.simplify(mesh.vertices.astype(np.float32), mesh.faces, target_reduction=r)
        mesh = trimesh.Trimesh(v, f, process=True)
    return trimesh.graph.smooth_shade(mesh, angle=np.radians(32))


def export(parts, path, budget):
    """parts: {(link, colorkey): [Trimesh,...]}; budget: fraction of original faces to keep."""
    scene = trimesh.Scene()
    total = 0
    for (link, key), meshes in parts.items():
        m = trimesh.util.concatenate(meshes)
        n = max(160, int(len(m.faces) * budget))
        m = simplify(m, n)
        total += len(m.faces)
        name = f'{link}__{key}'
        scene.add_geometry(m, node_name=name, geom_name=name)
    scene.export(path, include_normals=True)
    print(path, 'faces', total)


def color_key(rgba):
    r, g, b = (int(x) for x in rgba[:3])
    return {
        (153, 153, 153): 'body',
        (204, 204, 204): 'light',
        (255, 127, 0): 'accent',
        (51, 51, 51): 'dark',
        (102, 102, 102): 'dark',
        (153, 204, 204): 'light',
    }[(r, g, b)]


def build_iiwa():
    # URDF visual origins (translation only) from lbr_description/urdf/iiwa7/iiwa7_description.xacro
    offsets = {0: (0, 0, 0), 1: (0, 0, -0.1475), 2: (0, 0.0105, -0.34), 3: (0, 0, -0.5475),
               4: (0, -0.0105, -0.74), 5: (0, 0, -0.9475), 6: (0, 0.0707, -1.14), 7: (0, 0, -1.231)}
    parts = defaultdict(list)
    for i, off in offsets.items():
        scene = trimesh.load(f'{SRC}/iiwa7/link_{i}.dae')
        for g in scene.dump():
            g.apply_translation(off)
            parts[(f'link_{i}', color_key(g.visual.material.main_color))].append(g)
    export(parts, f'{OUT}/iiwa7.glb', budget=0.38)


def build_piper():
    xml = open(f'{SRC}/piper/piper.xml').read()
    # obj parts with materials, per link
    parts = defaultdict(list)
    keymap = {'gray_mat': 'body', 'light_gray_mat': 'light', 'light_medium_gray_mat': 'light',
              'white_mat': 'light', 'dark_gray_mat': 'dark', 'darker_gray_mat': 'dark',
              'black_mat': 'dark', 'red_mat': 'accent'}
    for mesh, mat in re.findall(r'<geom mesh="(link[2-5]_\d+)" material="(\w+)"', xml):
        g = trimesh.load(f'{SRC}/piper/{mesh}.obj', force='mesh')
        if max(g.extents) < 0.012:  # drop screws and tiny decals
            continue
        parts[(mesh.split('_')[0], keymap[mat])].append(g)
    for link in ['base_link', 'link1', 'link6', 'link7', 'link8']:
        g = trimesh.load(f'{SRC}/piper/{link}.stl')
        if link == 'link6':  # geom quat="0.707105 0 0 0.707108" (w x y z)
            g.apply_transform(trimesh.transformations.quaternion_matrix([0.707105, 0, 0, 0.707108]))
        parts[(link, 'body' if link != 'link6' else 'dark')].append(g)
    export(parts, f'{OUT}/piper.glb', budget=0.12)


def build_panda():
    import xml.etree.ElementTree as ET
    root = ET.parse(f'{SRC}/panda/panda.xml').getroot()
    keymap = {'white': 'body', 'off_white': 'light', 'black': 'dark', 'light_blue': 'accent', 'green': 'accent'}
    parts = defaultdict(list)
    for body in root.iter('body'):
        for geom in body.findall('geom'):
            if geom.get('class') != 'visual':
                continue
            g = trimesh.load(f"{SRC}/panda/{geom.get('mesh')}.obj", force='mesh')
            parts[(body.get('name'), keymap[geom.get('material')])].append(g)
    export(parts, f'{OUT}/panda.glb', budget=0.3)


if __name__ == '__main__':
    import os
    os.makedirs(OUT, exist_ok=True)
    build_iiwa()
    build_piper()
    build_panda()
