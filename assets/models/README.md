# Robot models

Meshes for the interactive arms in the "Robotic Platforms" section (`assets/js/robot-arm.js`).

| File        | Robot                  | Source                                                                                                              | License    |
|-------------|------------------------|---------------------------------------------------------------------------------------------------------------------|------------|
| `iiwa7.glb` | KUKA LBR iiwa 7 R800   | [lbr-stack/lbr_fri_ros2_stack](https://github.com/lbr-stack/lbr_fri_ros2_stack) `lbr_description/meshes/iiwa7/visual` | Apache-2.0 |
| `piper.glb` | AgileX PiPER           | [google-deepmind/mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie) `agilex_piper/assets`         | MIT        |
| `panda.glb` | Franka Emika Panda     | [google-deepmind/mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie) `franka_emika_panda/assets`   | Apache-2.0 |

`assets/img/robots/franka_panda.jpg` (the placeholder shown while the Panda loads) is a render of `panda.glb`.

Each link's visual meshes are moved into that link's frame, grouped by colour, simplified, and
compressed. Each GLB node is named `<link>__<colour>` (`body`, `light`, `accent`, `dark`). The
kinematic chain (joint origins, axes, limits) lives in the `ROBOTS` table in `robot-arm.js`.

## Regenerating

```bash
# src/iiwa7/link_{0..7}.dae                          <- lbr_description/meshes/iiwa7/visual
# src/piper/piper.xml, *.stl, link{2..5}_*.obj       <- mujoco_menagerie/agilex_piper
# src/panda/panda.xml, visual *.obj                  <- mujoco_menagerie/franka_emika_panda
pip install numpy trimesh pycollada fast_simplification
python build_models.py                               # writes out/{iiwa7,piper,panda}.glb
for r in iiwa7 piper panda; do npx @gltf-transform/cli meshopt out/$r.glb $r.glb; done
```
