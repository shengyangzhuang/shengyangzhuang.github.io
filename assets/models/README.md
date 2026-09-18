# Robot models

Meshes for the interactive robots in the "Robotic Platforms" section (`assets/js/robots.js`).

| File        | Robot                  | Source                                                                                                              | License    |
|-------------|------------------------|---------------------------------------------------------------------------------------------------------------------|------------|
| `iiwa7.glb` | KUKA LBR iiwa 7 R800   | [lbr-stack/lbr_fri_ros2_stack](https://github.com/lbr-stack/lbr_fri_ros2_stack) `lbr_description/meshes/iiwa7/visual` | Apache-2.0 |
| `piper.glb` | AgileX PiPER           | [google-deepmind/mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie) `agilex_piper/assets`         | MIT        |
| `panda.glb` | Franka Emika Panda     | [google-deepmind/mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie) `franka_emika_panda/assets`   | Apache-2.0 |
| `spaleka.glb` | Spaleka (half-cheetah) | CheetahTailLab `results/derived_data/spaleka/mujoco_control` (our own robot)                                        | in-house   |

`assets/img/robots/franka_panda.jpg` (the placeholder shown while the Panda loads) is a render of `panda.glb`.

Each link's visual meshes are moved into that link's frame, grouped by colour, simplified, and
compressed. Each GLB node is named `<link>__<colour>` (`body`, `light`, `accent`, `dark`). The
kinematic chain (joint origins, axes, limits) lives in the `ROBOTS` table in `robots.js`.

Spaleka comes from the lab's MuJoCo model rather than a public repository, so publishing it puts the
robot's geometry (simplified, with the smallest fasteners dropped) on the open web. Its legs are closed
five-bar linkages and its spine differential is a closed loop as well; `robots.js` solves both
(`solveLeg` and the rod `aims`) instead of treating the robot as a simple parent-child chain.

## Regenerating

The build script lives in `dev/build_models.py`, which is git-ignored (local only, not published).

Two stages. `build_models.py` bakes each robot's meshes into per-link frames and writes a full-detail
`*_raw.glb`; meshoptimizer then simplifies under an **error bound**. Do not decimate to a fixed face
budget instead -- that tore the thin plates on the CAD-derived models and left floating shards.

Crease normals are added *after* simplification, by the script's `crease` subcommand: split vertices
stop the simplifier dead (Spaleka got stuck at 2.7 MB when the creases went in first).

```bash
# src/iiwa7/link_{0..7}.dae                     <- lbr_description/meshes/iiwa7/visual
# src/piper/piper.xml, *.stl, link{2..5}_*.obj  <- mujoco_menagerie/agilex_piper
# src/panda/panda.xml, visual *.obj             <- mujoco_menagerie/franka_emika_panda
# Spaleka reads SPALEKA_MJCF directly (a path into the CheetahTailLab repo).
pip install numpy trimesh pycollada networkx
python dev/build_models.py            # writes out/{iiwa7,piper,panda,spaleka}_raw.glb

G="npx @gltf-transform/cli"
simplify() {  # $1 robot, $2 ratio, $3 error
  $G weld     out/$1_raw.glb  out/$1_weld.glb
  $G simplify out/$1_weld.glb out/$1_simp.glb --ratio $2 --error $3 --lock-border false
  python dev/build_models.py crease out/$1_simp.glb out/$1_crease.glb 35
  $G dedup    out/$1_crease.glb out/$1_dedup.glb   # repeated links (legs, fingers) share one mesh
  $G meshopt  out/$1_dedup.glb  assets/models/$1.glb
}
simplify iiwa7   0.20 0.003
simplify panda   0.20 0.004
simplify piper   0.10 0.012
simplify spaleka 0.04 0.008
```

`--error` is a fraction of each mesh's radius, so it adapts to part size. It trades detail against
size: for Spaleka, 0.005 → 520 KB, 0.008 → 421 KB (shipped), 0.012 → 350 KB.
