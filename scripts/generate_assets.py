"""
Procedural GLB 2.0 generator for AURORA railway assets.
Produces valid standalone binary glTF (GLB) files with materials, meshes, nodes, and scenes.
"""
import struct
import json
import math
from pathlib import Path

def create_box_mesh(width, height, length, color_rgb=(0.8, 0.2, 0.2), metallic=0.3, roughness=0.5):
    """Generates vertex buffer and glTF data for a colored 3D box."""
    w, h, l = width / 2.0, height / 2.0, length / 2.0
    
    raw_positions = []
    raw_normals = []
    raw_indices = []
    
    faces = [
        # Face: (+Z, Front)
        ([(-w, -h,  l), ( w, -h,  l), ( w,  h,  l), (-w,  h,  l)], (0, 0, 1)),
        # Face: (-Z, Back)
        ([( w, -h, -l), (-w, -h, -l), (-w,  h, -l), ( w,  h, -l)], (0, 0, -1)),
        # Face: (+Y, Top)
        ([(-w,  h,  l), ( w,  h,  l), ( w,  h, -l), (-w,  h, -l)], (0, 1, 0)),
        # Face: (-Y, Bottom)
        ([(-w, -h, -l), ( w, -h, -l), ( w, -h,  l), (-w, -h,  l)], (0, -1, 0)),
        # Face: (+X, Right)
        ([( w, -h,  l), ( w, -h, -l), ( w,  h, -l), ( w,  h,  l)], (1, 0, 0)),
        # Face: (-X, Left)
        ([(-w, -h, -l), (-w, -h,  l), (-w,  h,  l), (-w,  h, -l)], (-1, 0, 0)),
    ]
    
    v_offset = 0
    for verts, norm in faces:
        for v in verts:
            raw_positions.extend(v)
            raw_normals.extend(norm)
        raw_indices.extend([v_offset, v_offset + 1, v_offset + 2, v_offset, v_offset + 2, v_offset + 3])
        v_offset += 4
        
    return {
        "positions": raw_positions,
        "normals": raw_normals,
        "indices": raw_indices,
        "color": list(color_rgb) + [1.0],
        "metallic": metallic,
        "roughness": roughness
    }

def combine_submeshes(submeshes):
    """Combines multiple submeshes with their transforms into a single composite GLB."""
    materials = []
    bin_buffer = bytearray()
    buffer_views = []
    accessors = []
    gltf_primitives = []
    
    for i, sub in enumerate(submeshes):
        tx, ty, tz = sub.get("pos", (0, 0, 0))
        sx, sy, sz = sub.get("scale", (1, 1, 1))
        
        pos_list = []
        for j in range(0, len(sub["positions"]), 3):
            vx = sub["positions"][j] * sx + tx
            vy = sub["positions"][j+1] * sy + ty
            vz = sub["positions"][j+2] * sz + tz
            pos_list.extend([vx, vy, vz])
            
        norm_list = sub["normals"]
        idx_list = [idx for idx in sub["indices"]]
        
        min_pos = [min(pos_list[k::3]) for k in range(3)]
        max_pos = [max(pos_list[k::3]) for k in range(3)]
        
        pos_bytes = struct.pack(f"<{len(pos_list)}f", *pos_list)
        norm_bytes = struct.pack(f"<{len(norm_list)}f", *norm_list)
        idx_bytes = struct.pack(f"<{len(idx_list)}H", *idx_list)
        
        # 1. POS
        while len(bin_buffer) % 4 != 0: bin_buffer.append(0)
        pos_offset = len(bin_buffer)
        bin_buffer.extend(pos_bytes)
        bv_pos = len(buffer_views)
        buffer_views.append({"buffer": 0, "byteOffset": pos_offset, "byteLength": len(pos_bytes), "target": 34962})
        acc_pos = len(accessors)
        accessors.append({"bufferView": bv_pos, "byteOffset": 0, "componentType": 5126, "count": len(pos_list)//3, "type": "VEC3", "max": max_pos, "min": min_pos})

        # 2. NORM
        while len(bin_buffer) % 4 != 0: bin_buffer.append(0)
        norm_offset = len(bin_buffer)
        bin_buffer.extend(norm_bytes)
        bv_norm = len(buffer_views)
        buffer_views.append({"buffer": 0, "byteOffset": norm_offset, "byteLength": len(norm_bytes), "target": 34962})
        acc_norm = len(accessors)
        accessors.append({"bufferView": bv_norm, "byteOffset": 0, "componentType": 5126, "count": len(norm_list)//3, "type": "VEC3"})

        # 3. IDX
        while len(bin_buffer) % 4 != 0: bin_buffer.append(0)
        idx_offset = len(bin_buffer)
        bin_buffer.extend(idx_bytes)
        bv_idx = len(buffer_views)
        buffer_views.append({"buffer": 0, "byteOffset": idx_offset, "byteLength": len(idx_bytes), "target": 34963})
        acc_idx = len(accessors)
        accessors.append({"bufferView": bv_idx, "byteOffset": 0, "componentType": 5123, "count": len(idx_list), "type": "SCALAR"})

        mat_idx = len(materials)
        materials.append({
            "name": f"Material_{i}_{sub.get('name', 'part')}",
            "pbrMetallicRoughness": {
                "baseColorFactor": sub["color"],
                "metallicFactor": sub["metallic"],
                "roughnessFactor": sub["roughness"]
            },
            "doubleSided": False
        })
        
        gltf_primitives.append({
            "attributes": {"POSITION": acc_pos, "NORMAL": acc_norm},
            "indices": acc_idx,
            "material": mat_idx,
            "mode": 4
        })

    while len(bin_buffer) % 4 != 0: bin_buffer.append(0)

    gltf_dict = {
        "asset": {"version": "2.0", "generator": "AURORA 3D Engine Builder"},
        "scenes": [{"nodes": [0]}],
        "scene": 0,
        "nodes": [{"name": "RootNode", "mesh": 0}],
        "meshes": [{"name": "ModelMesh", "primitives": gltf_primitives}],
        "materials": materials,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": len(bin_buffer)}]
    }

    json_str = json.dumps(gltf_dict, separators=(',', ':'))
    json_bytes = json_str.encode('utf-8')
    while len(json_bytes) % 4 != 0:
        json_bytes += b' '

    total_length = 12 + 8 + len(json_bytes) + 8 + len(bin_buffer)
    header = struct.pack("<4sII", b"glTF", 2, total_length)
    json_chunk_header = struct.pack("<II", len(json_bytes), 0x4E4F534A)
    bin_chunk_header = struct.pack("<II", len(bin_buffer), 0x004E4942)

    return header + json_chunk_header + json_bytes + bin_chunk_header + bin_buffer

def generate_wap7_locomotive():
    submeshes = []
    # Main Body (White / Red band IR livery)
    body = create_box_mesh(2.9, 2.6, 17.0, color_rgb=(0.95, 0.95, 0.92), roughness=0.3)
    body["pos"] = (0, 2.1, 0); body["name"] = "body"; submeshes.append(body)
    
    # Red livery band
    band = create_box_mesh(2.92, 0.45, 17.05, color_rgb=(0.85, 0.12, 0.12), roughness=0.4)
    band["pos"] = (0, 1.6, 0); band["name"] = "red_band"; submeshes.append(band)

    # Dark blue / grey lower skirt
    skirt = create_box_mesh(2.85, 0.5, 17.2, color_rgb=(0.15, 0.22, 0.32), roughness=0.6)
    skirt["pos"] = (0, 0.9, 0); skirt["name"] = "skirt"; submeshes.append(skirt)

    for z_side in [8.55, -8.55]:
        windshield = create_box_mesh(2.4, 0.8, 0.2, color_rgb=(0.1, 0.15, 0.2), roughness=0.1, metallic=0.8)
        windshield["pos"] = (0, 2.5, z_side); windshield["name"] = "windshield"; submeshes.append(windshield)
        
        headlight = create_box_mesh(0.9, 0.25, 0.25, color_rgb=(1.0, 0.95, 0.6), roughness=0.1, metallic=0.9)
        headlight["pos"] = (0, 1.8, z_side + (0.15 if z_side > 0 else -0.15)); headlight["name"] = "headlight"; submeshes.append(headlight)

    roof_equip = create_box_mesh(2.0, 0.35, 12.0, color_rgb=(0.5, 0.52, 0.55), roughness=0.5, metallic=0.7)
    roof_equip["pos"] = (0, 3.55, 0); roof_equip["name"] = "roof"; submeshes.append(roof_equip)

    for z_pos in [4.5, -4.5]:
        panto_base = create_box_mesh(1.6, 0.15, 1.8, color_rgb=(0.8, 0.1, 0.1), metallic=0.8)
        panto_base["pos"] = (0, 3.8, z_pos); submeshes.append(panto_base)
        panto_arm = create_box_mesh(1.2, 0.6, 0.1, color_rgb=(0.85, 0.15, 0.15), metallic=0.9)
        panto_arm["pos"] = (0, 4.15, z_pos); submeshes.append(panto_arm)

    for z_bogie in [5.2, -5.2]:
        bogie_frame = create_box_mesh(2.5, 0.6, 4.5, color_rgb=(0.18, 0.18, 0.2), roughness=0.8, metallic=0.5)
        bogie_frame["pos"] = (0, 0.5, z_bogie); bogie_frame["name"] = "bogie"; submeshes.append(bogie_frame)

    return combine_submeshes(submeshes)

def generate_lhb_coach():
    submeshes = []
    # Main Body (LHB Crimson Red & Silver Grey)
    body = create_box_mesh(2.9, 2.7, 21.0, color_rgb=(0.82, 0.15, 0.18), roughness=0.35)
    body["pos"] = (0, 2.05, 0); body["name"] = "lhb_body"; submeshes.append(body)

    roof = create_box_mesh(2.82, 0.4, 21.1, color_rgb=(0.75, 0.77, 0.8), roughness=0.4, metallic=0.6)
    roof["pos"] = (0, 3.55, 0); roof["name"] = "lhb_roof"; submeshes.append(roof)

    for side in [1.46, -1.46]:
        windows = create_box_mesh(0.1, 0.65, 17.5, color_rgb=(0.12, 0.18, 0.25), roughness=0.1, metallic=0.8)
        windows["pos"] = (side, 2.2, 0); windows["name"] = "windows"; submeshes.append(windows)

    stripe = create_box_mesh(2.92, 0.12, 21.05, color_rgb=(0.95, 0.82, 0.12), roughness=0.5)
    stripe["pos"] = (0, 1.45, 0); stripe["name"] = "yellow_stripe"; submeshes.append(stripe)

    for z_bogie in [6.5, -6.5]:
        bogie = create_box_mesh(2.4, 0.55, 3.6, color_rgb=(0.2, 0.2, 0.22), roughness=0.8)
        bogie["pos"] = (0, 0.45, z_bogie); bogie["name"] = "fiat_bogie"; submeshes.append(bogie)

    for z_end in [10.6, -10.6]:
        vestibule = create_box_mesh(1.4, 2.1, 0.4, color_rgb=(0.15, 0.15, 0.16), roughness=0.9)
        vestibule["pos"] = (0, 1.9, z_end); submeshes.append(vestibule)

    return combine_submeshes(submeshes)

def generate_vande_bharat():
    submeshes = []
    body = create_box_mesh(2.9, 2.65, 20.0, color_rgb=(0.96, 0.97, 0.98), roughness=0.25)
    body["pos"] = (0, 2.05, 0); body["name"] = "vb_body"; submeshes.append(body)

    blue_stripe = create_box_mesh(2.92, 0.6, 20.1, color_rgb=(0.08, 0.22, 0.55), roughness=0.3, metallic=0.3)
    blue_stripe["pos"] = (0, 1.95, 0); blue_stripe["name"] = "vb_stripe"; submeshes.append(blue_stripe)

    nose = create_box_mesh(2.7, 2.2, 2.2, color_rgb=(0.95, 0.96, 0.98), roughness=0.2)
    nose["pos"] = (0, 1.8, 10.8); nose["name"] = "vb_nose"; submeshes.append(nose)

    cab_glass = create_box_mesh(2.5, 0.9, 1.2, color_rgb=(0.08, 0.12, 0.18), roughness=0.1, metallic=0.9)
    cab_glass["pos"] = (0, 2.4, 11.0); cab_glass["name"] = "vb_glass"; submeshes.append(cab_glass)

    for side in [1.46, -1.46]:
        win = create_box_mesh(0.1, 0.7, 16.0, color_rgb=(0.1, 0.14, 0.2), roughness=0.1, metallic=0.8)
        win["pos"] = (side, 2.2, -0.5); submeshes.append(win)

    for z_bogie in [6.2, -6.2]:
        bogie = create_box_mesh(2.4, 0.5, 3.4, color_rgb=(0.18, 0.18, 0.2), roughness=0.8)
        bogie["pos"] = (0, 0.45, z_bogie); submeshes.append(bogie)

    return combine_submeshes(submeshes)

def generate_freight_wagon():
    submeshes = []
    chassis = create_box_mesh(2.8, 0.4, 14.5, color_rgb=(0.2, 0.22, 0.25), roughness=0.8, metallic=0.7)
    chassis["pos"] = (0, 0.75, 0); chassis["name"] = "chassis"; submeshes.append(chassis)

    c1 = create_box_mesh(2.6, 2.5, 6.4, color_rgb=(0.65, 0.22, 0.15), roughness=0.6)
    c1["pos"] = (0, 2.15, 3.4); c1["name"] = "container_1"; submeshes.append(c1)

    c2 = create_box_mesh(2.6, 2.5, 6.4, color_rgb=(0.12, 0.35, 0.65), roughness=0.6)
    c2["pos"] = (0, 2.15, -3.4); c2["name"] = "container_2"; submeshes.append(c2)

    for z_bogie in [4.5, -4.5]:
        bogie = create_box_mesh(2.3, 0.5, 2.8, color_rgb=(0.15, 0.15, 0.15), roughness=0.9)
        bogie["pos"] = (0, 0.4, z_bogie); submeshes.append(bogie)

    return combine_submeshes(submeshes)

def generate_railway_bridge():
    submeshes = []
    for x_pos in [7.5, -7.5]:
        for z_pos in [18.0, 0.0, -18.0]:
            pier = create_box_mesh(2.5, 12.0, 2.5, color_rgb=(0.55, 0.58, 0.6), roughness=0.9)
            pier["pos"] = (x_pos, -5.5, z_pos); pier["name"] = "pier"; submeshes.append(pier)

    deck = create_box_mesh(16.0, 1.4, 48.0, color_rgb=(0.42, 0.45, 0.48), roughness=0.8, metallic=0.3)
    deck["pos"] = (0, 0.0, 0); deck["name"] = "deck"; submeshes.append(deck)

    for x_side in [7.2, -7.2]:
        top_chord = create_box_mesh(0.8, 0.8, 48.0, color_rgb=(0.28, 0.45, 0.52), roughness=0.4, metallic=0.8)
        top_chord["pos"] = (x_side, 7.5, 0); submeshes.append(top_chord)

        bot_chord = create_box_mesh(0.8, 0.8, 48.0, color_rgb=(0.28, 0.45, 0.52), roughness=0.4, metallic=0.8)
        bot_chord["pos"] = (x_side, 1.2, 0); submeshes.append(bot_chord)

        for z in range(-20, 24, 6):
            post = create_box_mesh(0.6, 6.8, 0.6, color_rgb=(0.32, 0.48, 0.55), roughness=0.4, metallic=0.8)
            post["pos"] = (x_side, 4.2, z); submeshes.append(post)

    for z in range(-18, 24, 12):
        cross_beam = create_box_mesh(14.8, 0.6, 0.6, color_rgb=(0.32, 0.48, 0.55), roughness=0.4, metallic=0.8)
        cross_beam["pos"] = (0, 7.5, z); submeshes.append(cross_beam)

    return combine_submeshes(submeshes)

def main():
    root = Path(r"c:\AURORA")
    assets_dir = root / "frontend" / "public" / "assets" / "trains"
    infra_dir = root / "frontend" / "public" / "assets" / "infrastructure"
    assets_dir.mkdir(parents=True, exist_ok=True)
    infra_dir.mkdir(parents=True, exist_ok=True)

    wap7_path = assets_dir / "wap7"
    wap7_path.mkdir(parents=True, exist_ok=True)
    glb_wap7 = generate_wap7_locomotive()
    (wap7_path / "locomotive.glb").write_bytes(glb_wap7)
    (assets_dir / "AURORA_engine.glb").write_bytes(glb_wap7)
    (wap7_path / "metadata.json").write_text(json.dumps({
        "id": "wap7-locomotive",
        "name": "Indian Railways WAP-7 Electric Locomotive",
        "assetFile": "locomotive.glb",
        "scale": "1 unit = 1 metre",
        "status": "ready",
        "author": "AURORA 3D Procedural Engine"
    }, indent=2), encoding="utf-8")
    print(f"Generated Locomotive GLB: {len(glb_wap7)} bytes")

    coach_path = assets_dir / "passenger_coach"
    coach_path.mkdir(parents=True, exist_ok=True)
    glb_coach = generate_lhb_coach()
    (coach_path / "coach.glb").write_bytes(glb_coach)
    (assets_dir / "AURORA_passenger_coach.glb").write_bytes(glb_coach)
    (coach_path / "metadata.json").write_text(json.dumps({
        "id": "lhb-passenger-coach",
        "name": "Indian Railways LHB AC Chair / Sleeper Coach",
        "assetFile": "coach.glb",
        "scale": "1 unit = 1 metre",
        "status": "ready",
        "author": "AURORA 3D Procedural Engine"
    }, indent=2), encoding="utf-8")
    print(f"Generated Passenger Coach GLB: {len(glb_coach)} bytes")

    vb_path = assets_dir / "vande_bharat"
    vb_path.mkdir(parents=True, exist_ok=True)
    glb_vb = generate_vande_bharat()
    (vb_path / "vande_bharat.glb").write_bytes(glb_vb)
    (assets_dir / "AURORA_vande_bharat.glb").write_bytes(glb_vb)
    print(f"Generated Vande Bharat GLB: {len(glb_vb)} bytes")

    freight_path = assets_dir / "freight"
    freight_path.mkdir(parents=True, exist_ok=True)
    glb_freight = generate_freight_wagon()
    (freight_path / "wagon.glb").write_bytes(glb_freight)
    (assets_dir / "AURORA_freight_wagon.glb").write_bytes(glb_freight)
    print(f"Generated Freight Wagon GLB: {len(glb_freight)} bytes")

    bridge_path = infra_dir / "bridge"
    bridge_path.mkdir(parents=True, exist_ok=True)
    glb_bridge = generate_railway_bridge()
    (bridge_path / "bridge.glb").write_bytes(glb_bridge)
    (infra_dir / "AURORA_bridge.glb").write_bytes(glb_bridge)
    print(f"Generated Railway Bridge GLB: {len(glb_bridge)} bytes")

if __name__ == "__main__":
    main()
