// Interactive robots for the "Robotic Platforms" section.
// Each <div class="robot-viewer" data-robot="..."> gets a three.js scene. Arms idle and then follow the
// cursor with their end-effector (CCD inverse kinematics); Spaleka gallops, driven by the cursor.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const DEG = Math.PI / 180;

// Kinematic trees in the robot's own (z-up) frame. Each body sits at `pos`/`quat` (w, x, y, z) in its
// parent's frame; bodies with an `axis` are revolute joints rotating about that axis in their own frame.
// Meshes in the GLB are named "<body>__<palette key>" and are expressed in their body's frame.
const ROBOTS = {
    // KUKA LBR iiwa 7 R800, from lbr_description/urdf/iiwa7 (lbr-stack/lbr_fri_ros2_stack)
    iiwa7: {
        model: 'assets/models/iiwa7.glb',
        palette: { body: 0xeeeeeb, light: 0xc4c8cc, accent: 0xff7a00, dark: 0x3a3a3a },
        bodies: [
            { name: 'link_0' },
            { name: 'link_1', parent: 'link_0', pos: [0, 0, 0.1475], axis: [0, 0, 1], range: [-170 * DEG, 170 * DEG] },
            { name: 'link_2', parent: 'link_1', pos: [0, -0.0105, 0.1925], axis: [0, 1, 0], range: [-120 * DEG, 120 * DEG] },
            { name: 'link_3', parent: 'link_2', pos: [0, 0.0105, 0.2075], axis: [0, 0, 1], range: [-170 * DEG, 170 * DEG] },
            { name: 'link_4', parent: 'link_3', pos: [0, 0.0105, 0.1925], axis: [0, -1, 0], range: [-120 * DEG, 120 * DEG] },
            { name: 'link_5', parent: 'link_4', pos: [0, -0.0105, 0.2075], axis: [0, 0, 1], range: [-170 * DEG, 170 * DEG] },
            { name: 'link_6', parent: 'link_5', pos: [0, -0.0707, 0.1925], axis: [0, 1, 0], range: [-120 * DEG, 120 * DEG] },
            { name: 'link_7', parent: 'link_6', pos: [0, 0.0707, 0.091], axis: [0, 0, 1], range: [-175 * DEG, 175 * DEG], ik: false },
        ],
        home: [0, 30 * DEG, 0, -65 * DEG, 0, 35 * DEG, 0],
        tip: { body: 'link_7', offset: [0, 0, 0.035] },
        reach: 0.3,
        yaw: 0.05,
    },
    // Franka Emika Panda, from google-deepmind/mujoco_menagerie/franka_emika_panda
    panda: {
        model: 'assets/models/panda.glb',
        palette: { body: 0xf4f5f6, light: 0xe2e6e9, accent: 0x0a8ac7, dark: 0x353638 },
        bodies: [
            { name: 'link0' },
            { name: 'link1', parent: 'link0', pos: [0, 0, 0.333], axis: [0, 0, 1], range: [-2.8973, 2.8973] },
            { name: 'link2', parent: 'link1', quat: [1, -1, 0, 0], axis: [0, 0, 1], range: [-1.7628, 1.7628] },
            { name: 'link3', parent: 'link2', pos: [0, -0.316, 0], quat: [1, 1, 0, 0], axis: [0, 0, 1], range: [-2.8973, 2.8973] },
            { name: 'link4', parent: 'link3', pos: [0.0825, 0, 0], quat: [1, 1, 0, 0], axis: [0, 0, 1], range: [-3.0718, -0.0698] },
            { name: 'link5', parent: 'link4', pos: [-0.0825, 0.384, 0], quat: [1, -1, 0, 0], axis: [0, 0, 1], range: [-2.8973, 2.8973] },
            { name: 'link6', parent: 'link5', quat: [1, 1, 0, 0], axis: [0, 0, 1], range: [-0.0175, 3.7525] },
            { name: 'link7', parent: 'link6', pos: [0.088, 0, 0], quat: [1, 1, 0, 0], axis: [0, 0, 1], range: [-2.8973, 2.8973], ik: false },
            { name: 'hand', parent: 'link7', pos: [0, 0, 0.107], quat: [0.9238795, 0, 0, -0.3826834] },
            { name: 'left_finger', parent: 'hand', pos: [0, 0.03, 0.0584] },
            { name: 'right_finger', parent: 'hand', pos: [0, -0.03, 0.0584], quat: [0, 0, 0, 1] },
        ],
        home: [0, 0.2, 0, -1.9, 0, 2.0, 0.785],
        tip: { body: 'hand', offset: [0, 0, 0.1034] },
        reach: 0.25,
        yaw: 0.05,
    },
    // AgileX PiPER, from google-deepmind/mujoco_menagerie/agilex_piper
    piper: {
        model: 'assets/models/piper.glb',
        palette: { body: 0xa9acb0, light: 0xdadada, accent: 0xd12626, dark: 0x2b2b2d },
        bodies: [
            { name: 'base_link' },
            { name: 'link1', parent: 'base_link', pos: [0, 0, 0.123], quat: [0.707105, 0, 0, -0.707108], axis: [0, 0, 1], range: [-2.618, 2.618] },
            { name: 'link2', parent: 'link1', quat: [0.499998, 0.5, -0.500002, -0.5], axis: [0, 0, 1], range: [0, 3.14] },
            { name: 'link3', parent: 'link2', pos: [0.28358, 0.028726, 0], quat: [0.998726, 0, 0, 0.0504536], axis: [0, 0, 1], range: [-2.697, 0] },
            { name: 'link4', parent: 'link3', pos: [-0.24221, 0.068514, 0], quat: [0.544767, -0.544769, -0.450809, 0.450808], axis: [0, 0, 1], range: [-1.832, 1.832] },
            { name: 'link5', parent: 'link4', quat: [0.707105, 0.707108, 0, 0], axis: [0, 0, 1], range: [-1.22, 1.22] },
            { name: 'link6', parent: 'link5', pos: [0, 0.091, 0.0014165], quat: [0, 0, -0.707105, -0.707108], axis: [0, 0, 1], range: [-3.14, 3.14], ik: false },
            { name: 'link7', parent: 'link6', pos: [0, 0, 0.13503], quat: [1.89468e-08, 1.89469e-08, 0.707108, 0.707105] },
            { name: 'link8', parent: 'link6', pos: [0, 0, 0.13503], quat: [1.89468e-08, -1.89469e-08, -0.707108, 0.707105] },
        ],
        home: [0, 1.25, -1.05, 0, 0.75, 0],
        tip: { body: 'link6', offset: [0, 0, 0.15] },
        reach: 0.14,
        yaw: -0.35,
    },
    // Spaleka half-cheetah, from CheetahTailLab spaleka_control.xml (MuJoCo model of the lab's robot).
    // Each leg is a closed five-bar linkage: two hip motors drive two links that meet at the foot, so
    // the gait drives foot positions and `solveLeg` works the joint angles back out.
    spaleka: {
        model: 'assets/models/spaleka.glb',
        palette: { body: 0x8f959c, light: 0xb2b8be, accent: 0xd8dce0, dark: 0x27292c },
        bodies: [
            { name: 'spine_roll_link', pos: [-0.0095, 0.0, 0.395], quat: [0.70711, -0.0, 0.70711, -0.0], joint: 'spine_roll', axis: [0.0, 0.0, 1.0], range: [-0.6, 0.6] },
            { name: 'rod_right', parent: 'spine_roll_link', pos: [-0.02831, -0.01626, 0.07163], quat: [0.39104, 0.59291, -0.49877, -0.49677] },
            { name: 'rod_left', parent: 'spine_roll_link', pos: [-0.02831, 0.01626, 0.07163], quat: [0.57303, 0.37123, 0.51958, 0.51368] },
            { name: 'spine_universal_link', parent: 'spine_roll_link', pos: [0.0, 0.0, 0.104], quat: [0.5, -0.5, -0.5, 0.5], joint: 'spine_yaw', axis: [0.0, 0.0, 1.0], range: [-0.65, 0.65] },
            { name: 'hindquarters', parent: 'spine_universal_link', pos: [0.079, -0.065, 0.0], quat: [0.48146, 0.51788, 0.48146, 0.51788], joint: 'spine_pitch', axis: [0.0, 0.0, -1.0], range: [-0.65, 0.65] },
            { name: 'upper_leg_m1', parent: 'hindquarters', pos: [-0.258, -0.025, 0.006], quat: [-0.21901, 0.0, -0.0, 0.97572], joint: 'leg_m1', axis: [0.0, 0.0, 1.0], range: [-1.2, 1.2] },
            { name: 'lower_m1', parent: 'upper_leg_m1', pos: [0.1745, 0.0, 0.034], quat: [-0.22188, 0.0, 0.0, 0.97507], joint: 'knee_m1', axis: [0.0, 0.0, 1.0], range: [-1.4, 1.4] },
            { name: 'upper_leg_m2', parent: 'hindquarters', pos: [-0.138, -0.025, 0.006], quat: [0.98877, -0.0, 0.0, -0.14944], joint: 'leg_m2', axis: [0.0, 0.0, 1.0], range: [-1.2, 1.2] },
            { name: 'lower_m2', parent: 'upper_leg_m2', pos: [0.1745, -0.0, 0.034], quat: [0.96903, -0.0, -0.0, -0.24695], joint: 'knee_m2', axis: [0.0, 0.0, 1.0], range: [-1.4, 1.4] },
            { name: 'upper_leg_m3', parent: 'hindquarters', pos: [-0.258, -0.025, -0.164], quat: [-0.0, 0.97572, 0.21901, -0.0], joint: 'leg_m3', axis: [0.0, 0.0, 1.0], range: [-1.2, 1.2] },
            { name: 'lower_m3', parent: 'upper_leg_m3', pos: [-0.1745, 0.0, 0.034], quat: [0.22188, 0.0, 0.0, 0.97507], joint: 'knee_m3', axis: [0.0, 0.0, 1.0], range: [-1.4, 1.4] },
            { name: 'upper_leg_m4', parent: 'hindquarters', pos: [-0.138, -0.025, -0.164], quat: [-0.0, 0.14944, 0.98877, -0.0], joint: 'leg_m4', axis: [0.0, 0.0, 1.0], range: [-1.2, 1.2] },
            { name: 'lower_m4', parent: 'upper_leg_m4', pos: [-0.1745, -0.0, 0.034], quat: [0.0, -0.24695, 0.96903, 0.0], joint: 'knee_m4', axis: [0.0, 0.0, 1.0], range: [-1.4, 1.4] },
            { name: 'spine_motor_left_pulley', parent: 'hindquarters', pos: [0.0, -0.105, -0.018], joint: 'spine_motor_left', axis: [0.0, 0.0, 1.0] },
            { name: 'spine_motor_right_pulley', parent: 'hindquarters', pos: [0.0, -0.105, -0.14], quat: [0.0, -0.0, 1.0, -0.0], joint: 'spine_motor_right', axis: [0.0, 0.0, 1.0] },
            { name: 'tail_gimbal', parent: 'hindquarters', pos: [-0.3355, 0.095, -0.109], quat: [-0.70711, 0.0, -0.0, 0.70711], joint: 'tail_pitch', axis: [0.0, 0.0, 1.0], range: [-1.57, 1.57] },
            { name: 'tail', parent: 'tail_gimbal', pos: [0.0, -0.0323, 0.042], quat: [-0.0, 0.0, -0.70711, 0.70711], joint: 'tail_roll', axis: [0.0, 0.0, 1.0], range: [-1.57, 1.57] },
            { name: 'spine_crank_left_link', parent: 'spine_universal_link', pos: [0.0685, -0.065, 0.0], quat: [0.48146, 0.51788, 0.48146, 0.51788], joint: 'spine_crank_left', axis: [0.0, 0.0, 1.0] },
            { name: 'spine_crank_right_link', parent: 'spine_universal_link', pos: [-0.0685, -0.065, 0.0], quat: [0.48146, 0.51788, 0.48146, 0.51788], joint: 'spine_crank_right', axis: [0.0, 0.0, 1.0] },
        ],
        yaw: 0.05,
        cameraDir: [0.3, 0.3, 1.35],
        exposure: 0.8,
        fill: 0.88,   // tight crop; the tail tip may reach the edge mid-stride
        gait: {
            drop: 0.0964,      // sink the robot so the neutral stance meets the ground plane
            tailBase: 0.95,   // resting tail pitch (the MJCF zero pose stands the tail straight up)
            stance: 0.42,      // fraction of the cycle a foot spends on the ground
            lead: 0.14,        // phase offset between the two legs (a bounding gallop)
            // Five-bar legs, solved in their own plane: `p` hip positions, `foot` the neutral foot point,
            // `up` which way is up in plane coordinates. a0/b0 are the zero-pose link directions.
            legs: [
                {
                    foot: [0.055, -0.33], up: -1,
                    branches: [
                        { hip: 'leg_m1', knee: 'knee_m1', p: [0.0, 0.0], L1: 0.1745, L2: 0.2955, a0: -2.7, b0: -0.68171, elbow: -1, kneeSign: 1 },
                        { hip: 'leg_m2', knee: 'knee_m2', p: [0.12, 0.0], L1: 0.1745, L2: 0.3, a0: -0.3, b0: -2.36987, elbow: 1, kneeSign: 1 },
                    ],
                },
                {
                    foot: [0.055, 0.33], up: 1,
                    branches: [
                        { hip: 'leg_m3', knee: 'knee_m3', p: [0.0, 0.0], L1: 0.1745, L2: 0.2955, a0: 2.7, b0: 0.68171, elbow: 1, kneeSign: 1 },
                        { hip: 'leg_m4', knee: 'knee_m4', p: [0.12, 0.0], L1: 0.1745, L2: 0.3, a0: 0.3, b0: 2.36987, elbow: -1, kneeSign: -1 },
                    ],
                },
            ],
            // The differential rods are a closed loop too: point each rod at the crank it connects to.
            aims: [
                { body: 'rod_right', axis: [0, 1, 0], length: 0.106, target: { body: 'spine_crank_right_link', point: [-0.00067, 0.05, 0.03139] } },
                { body: 'rod_left', axis: [0, 1, 0], length: 0.106, target: { body: 'spine_crank_left_link', point: [-0.00067, 0.05, -0.03139] } },
            ],
        },
    },
};
const DEFAULT_CAMERA_DIR = [1.05, 0.5, 1.25]; // y-up world, looking from front-right
const IDLE_AMPLITUDE = 0.07;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const clamp = THREE.MathUtils.clamp;
const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
const wrapPi = a => Math.atan2(Math.sin(a), Math.cos(a));

// Shared pointer state (client coordinates); far away means "no cursor".
const pointer = { x: -1e4, y: -1e4 };
window.addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
const releaseTouch = e => { if (e.pointerType !== 'mouse') { pointer.x = pointer.y = -1e4; } };
window.addEventListener('pointerup', releaseTouch, { passive: true });
window.addEventListener('pointercancel', releaseTouch, { passive: true });
document.documentElement.addEventListener('mouseleave', () => { pointer.x = pointer.y = -1e4; });

function buildRobot(spec, gltf) {
    const parts = new Map();
    gltf.scene.traverse(o => {
        if (!o.isMesh) return;
        const [body, key] = o.name.split('__');
        o.material = new THREE.MeshStandardMaterial({
            color: spec.palette[key] ?? spec.palette.body,
            roughness: key === 'dark' ? 0.55 : 0.35,
            metalness: key === 'body' ? 0.15 : 0.05,
        });
        o.castShadow = true;
        if (!parts.has(body)) parts.set(body, []);
        parts.get(body).push(o);
    });

    const frames = new Map();   // body name -> the group that the body's joint rotates
    const joints = [];
    const jointByName = new Map();
    let root = null;
    for (const b of spec.bodies) {
        const fixed = new THREE.Group();   // the body's fixed offset from its parent
        if (b.pos) fixed.position.fromArray(b.pos);
        if (b.quat) fixed.quaternion.set(b.quat[1], b.quat[2], b.quat[3], b.quat[0]).normalize();
        const frame = new THREE.Group();   // rotated by this body's joint
        fixed.add(frame);
        frames.set(b.name, frame);
        if (b.parent) frames.get(b.parent).add(fixed); else root = fixed;
        for (const mesh of parts.get(b.name) ?? []) frame.add(mesh);
        if (b.axis) {
            const joint = {
                name: b.joint ?? b.name,
                frame,
                axis: new THREE.Vector3().fromArray(b.axis).normalize(),
                range: b.range,
                ik: b.ik !== false,
            };
            joints.push(joint);
            jointByName.set(joint.name, joint);
        }
    }
    return { root, frames, joints, jointByName };
}

// --- behaviour: arms reach for the cursor ----------------------------------
function reachBehavior(spec, robot, ctx) {
    const home = spec.home.slice();
    const qTarget = home.slice(); // IK / idle target
    const q = home.slice();       // displayed joint angles, smoothed toward qTarget

    const setJoints = angles => robot.joints.forEach((j, i) => {
        j.frame.quaternion.setFromAxisAngle(j.axis, angles[i]);
    });

    const plane = new THREE.Plane();   // target plane through the home tip, facing the camera
    const homeTip = new THREE.Vector3();
    const goal = new THREE.Vector3();
    const smoothGoal = new THREE.Vector3();
    const hit = new THREE.Vector3();
    const ndc = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const tipPos = new THREE.Vector3(), pivot = new THREE.Vector3(), axisW = new THREE.Vector3();
    const toTip = new THREE.Vector3(), toGoal = new THREE.Vector3(), cross = new THREE.Vector3();
    const quat = new THREE.Quaternion();

    const tip = new THREE.Object3D();
    tip.position.fromArray(spec.tip.offset);
    robot.frames.get(spec.tip.body).add(tip);

    setJoints(home);
    ctx.world.updateMatrixWorld(true);
    tip.getWorldPosition(homeTip);
    smoothGoal.copy(homeTip);

    function solveIK() {
        for (let iter = 0; iter < 4; iter++) {
            tip.getWorldPosition(tipPos);
            if (tipPos.distanceTo(smoothGoal) < 0.004) return;
            for (let i = robot.joints.length - 1; i >= 0; i--) {
                const j = robot.joints[i];
                if (!j.ik) continue;
                tip.getWorldPosition(tipPos);
                j.frame.getWorldPosition(pivot);
                axisW.copy(j.axis).applyQuaternion(j.frame.getWorldQuaternion(quat)).normalize();
                toTip.subVectors(tipPos, pivot).projectOnPlane(axisW);
                toGoal.subVectors(smoothGoal, pivot).projectOnPlane(axisW);
                if (toTip.lengthSq() < 1e-6 || toGoal.lengthSq() < 1e-6) continue;
                toTip.normalize();
                toGoal.normalize();
                let angle = Math.acos(clamp(toTip.dot(toGoal), -1, 1));
                if (cross.crossVectors(toTip, toGoal).dot(axisW) < 0) angle = -angle;
                qTarget[i] = clamp(qTarget[i] + clamp(angle, -0.05, 0.05), j.range[0], j.range[1]);
                j.frame.quaternion.setFromAxisAngle(j.axis, qTarget[i]);
                j.frame.updateMatrixWorld(true);
            }
        }
    }

    return {
        // the arm must stay framed over the whole area its tip can reach
        expandFrame(points) {
            const r = spec.reach * 0.6;
            for (const d of [[r, 0, 0], [-r, 0, 0], [0, r, 0], [0, -r * 0.5, 0], [0, 0, r], [0, 0, -r]]) {
                points.push(homeTip.clone().add(new THREE.Vector3(...d)));
            }
        },
        onCamera(camera) {
            plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), homeTip);
        },
        update(dt, t, s, rect) {
            const idle = i => home[i] + (reducedMotion ? 0 : Math.sin(t * (0.45 + 0.04 * i) + 0.8 * i) * IDLE_AMPLITUDE);
            if (s > 0.01) {
                ndc.set((pointer.x - rect.left) / rect.width * 2 - 1, -((pointer.y - rect.top) / rect.height) * 2 + 1);
                raycaster.setFromCamera(ndc, ctx.camera);
                if (raycaster.ray.intersectPlane(plane, hit)) {
                    goal.subVectors(hit, homeTip).clampLength(0, spec.reach).multiplyScalar(s).add(homeTip);
                    smoothGoal.lerp(goal, 1 - Math.exp(-5 * dt));
                }
                // Gently pull the redundant joints back toward the home posture so the arm never drifts into odd poses.
                qTarget.forEach((v, i) => { qTarget[i] = damp(v, idle(i), 0.8, dt); });
                setJoints(qTarget);
                ctx.world.updateMatrixWorld(true);
                solveIK();
            } else {
                qTarget.forEach((_, i) => { qTarget[i] = idle(i); });
                smoothGoal.copy(homeTip);
            }
            q.forEach((v, i) => { q[i] = damp(v, qTarget[i], 4 + 0.2 * i, dt); });
            setJoints(q);
        },
    };
}

// --- behaviour: Spaleka gallops --------------------------------------------
function gaitBehavior(spec, robot, ctx) {
    const g = spec.gait;
    const baseZ = robot.root.position.z - g.drop;
    robot.root.position.z = baseZ;

    const setJoint = (name, value) => {
        const j = robot.jointByName.get(name);
        if (j) j.frame.quaternion.setFromAxisAngle(j.axis, j.range ? clamp(value, j.range[0], j.range[1]) : value);
    };

    // Analytic inverse kinematics for one five-bar leg: both branches are driven to the same foot point,
    // which is what keeps the closed linkage together.
    function solveLeg(leg, fx, fy) {
        for (const b of leg.branches) {
            const dx = fx - b.p[0], dy = fy - b.p[1];
            const reach = clamp(Math.hypot(dx, dy), Math.abs(b.L1 - b.L2) + 1e-3, b.L1 + b.L2 - 1e-3);
            const alpha = Math.atan2(dy, dx);
            const phi = Math.acos(clamp((reach * reach - b.L1 * b.L1 - b.L2 * b.L2) / (2 * b.L1 * b.L2), -1, 1));
            const beta = Math.atan2(b.L2 * Math.sin(phi), b.L1 + b.L2 * Math.cos(phi));
            const dir1 = alpha + b.elbow * beta;
            const kx = b.p[0] + b.L1 * Math.cos(dir1), ky = b.p[1] + b.L1 * Math.sin(dir1);
            const dir2 = Math.atan2(fy - ky, fx - kx);
            const q1 = wrapPi(dir1 - b.a0);
            setJoint(b.hip, q1);
            setJoint(b.knee, (wrapPi(dir2 - b.b0) - q1) / b.kneeSign);
        }
    }

    // Where a foot sits within its cycle: pushing back along the ground, then swinging forward.
    function footOffset(ph, stride, lift, out) {
        if (ph < g.stance) {
            const u = ph / g.stance;
            out[0] = (0.5 - u) * stride;
            out[1] = 0;
        } else {
            const u = (ph - g.stance) / (1 - g.stance);
            out[0] = (u - 0.5) * stride;
            out[1] = lift * Math.sin(Math.PI * u);
        }
    }

    const state = { speed: 0, stride: 0, lift: 0, rise: 0, yaw: 0, roll: 0, tailPitch: 0, tailRoll: 0, dir: 1 };
    const off = [0, 0];
    let phase = 0;

    // Rest pose, so the camera is framed on the robot as it actually stands.
    setJoint('tail_pitch', g.tailBase);
    g.legs.forEach(leg => solveLeg(leg, leg.foot[0], leg.foot[1]));
    ctx.world.updateMatrixWorld(true);

    const aimTarget = new THREE.Vector3(), aimOrigin = new THREE.Vector3(), aimDir = new THREE.Vector3();
    const aimScale = new THREE.Vector3(), aimQuat = new THREE.Quaternion();

    function aimRods() {
        for (const aim of g.aims) {
            const frame = robot.frames.get(aim.body);
            const fixed = frame.parent;
            const targetFrame = robot.frames.get(aim.target.body);
            aimTarget.fromArray(aim.target.point).applyMatrix4(targetFrame.matrixWorld);
            fixed.matrixWorld.decompose(aimOrigin, aimQuat, aimScale);
            aimDir.subVectors(aimTarget, aimOrigin).applyQuaternion(aimQuat.invert());
            const length = aimDir.length();
            if (length < 1e-6) continue;
            aimDir.divideScalar(length);
            frame.quaternion.setFromUnitVectors(new THREE.Vector3().fromArray(aim.axis).normalize(), aimDir);
            frame.scale.set(1, 1, 1).setComponent(aim.axis.findIndex(v => v !== 0), length / aim.length);
            frame.updateMatrixWorld(true);
        }
    }

    return {
        expandFrame(points) {
            const box = new THREE.Box3().setFromPoints(points).expandByScalar(0.05);
            points.push(box.min.clone(), box.max.clone());
        },
        onCamera() {},
        update(dt, t, s, rect) {
            const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
            const hx = s > 0.01 ? clamp((pointer.x - cx) / (rect.width * 0.6), -1, 1) : 0;
            const hy = s > 0.01 ? clamp((cy - pointer.y) / (rect.height * 0.6), -1, 1) : 0;

            // Cursor across the card sets pace and heading; cursor height sets how high it bounds.
            state.dir = Math.abs(hx) > 0.08 ? Math.sign(hx) : state.dir;
            state.speed = damp(state.speed, s * (0.9 + 1.6 * Math.abs(hx)), 2.5, dt);
            state.stride = damp(state.stride, s * (0.085 + 0.05 * Math.abs(hx)), 3, dt);
            state.lift = damp(state.lift, s * (0.04 + 0.05 * Math.max(0, hy)), 3, dt);
            state.rise = damp(state.rise, s * 0.035 * hy, 2.5, dt);
            state.yaw = damp(state.yaw, 0.32 * hx * s, 2.5, dt);
            state.roll = damp(state.roll, -0.16 * hx * s, 2.5, dt);
            state.tailPitch = damp(state.tailPitch, -0.5 * hy * s, 2.5, dt);
            state.tailRoll = damp(state.tailRoll, -0.5 * hx * s, 2.5, dt);

            phase = (phase + state.speed * dt) % 1;
            const breathe = reducedMotion ? 0 : Math.sin(t * 0.7) * 0.02;
            const cycle = 2 * Math.PI * phase;
            const bob = state.lift * 0.5 * Math.sin(cycle + 0.6);
            const pitch = state.lift * 0.8 * Math.sin(cycle + 1.2) + breathe;

            robot.root.position.z = baseZ + state.rise + bob;
            setJoint('spine_roll', state.roll);
            setJoint('spine_yaw', state.yaw);
            setJoint('spine_pitch', pitch);
            // Belt-coupled differential: the two motors sum to spine pitch and differ by spine yaw.
            setJoint('spine_motor_left', pitch + state.yaw * 1.5);
            setJoint('spine_motor_right', -pitch + state.yaw * 1.5);
            setJoint('spine_crank_left', state.yaw * 1.5);
            setJoint('spine_crank_right', -state.yaw * 1.5);
            setJoint('tail_pitch', g.tailBase + state.tailPitch + state.lift * 1.6 * Math.sin(cycle + 3.0));
            setJoint('tail_roll', state.tailRoll);

            g.legs.forEach((leg, i) => {
                footOffset((phase + (i ? g.lead : 0)) % 1, state.stride, state.lift, off);
                solveLeg(leg, leg.foot[0] + state.dir * off[0], leg.foot[1] + leg.up * (off[1] - state.rise - bob));
            });

            ctx.world.updateMatrixWorld(true);
            aimRods();
        },
    };
}

function initViewer(el) {
    const spec = ROBOTS[el.dataset.robot];
    if (!spec) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = spec.exposure ?? 1;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.55;
    pmrem.dispose();

    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(1.5, 3, 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -1;
    sun.shadow.camera.right = sun.shadow.camera.top = 1;
    sun.shadow.radius = 4;
    scene.add(sun, new THREE.HemisphereLight(0xffffff, 0xd8dde6, 0.6));

    const ground = new THREE.Mesh(new THREE.CircleGeometry(1.2, 48), new THREE.ShadowMaterial({ opacity: 0.16 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.02, 20);
    const cameraDir = new THREE.Vector3().fromArray(spec.cameraDir ?? DEFAULT_CAMERA_DIR).normalize();
    const world = new THREE.Group();
    world.rotation.x = -Math.PI / 2; // robot z-up -> three.js y-up
    scene.add(world);
    const yawGroup = new THREE.Group();
    yawGroup.rotation.z = spec.yaw;
    world.add(yawGroup);

    let robot = null, behavior = null;
    let lastTime = 0, t = 0;

    // Points the camera must keep in frame: every mesh's bounding-box corners, plus whatever the
    // behaviour needs room for.
    const framePoints = [];
    function collectFramePoints() {
        const corner = new THREE.Vector3();
        robot.root.traverse(o => {
            if (!o.isMesh) return;
            const { min, max } = o.geometry.boundingBox ?? (o.geometry.computeBoundingBox(), o.geometry.boundingBox);
            for (let k = 0; k < 8; k++) {
                corner.set(k & 1 ? max.x : min.x, k & 2 ? max.y : min.y, k & 4 ? max.z : min.z);
                framePoints.push(corner.clone().applyMatrix4(o.matrixWorld));
            }
        });
        behavior.expandFrame(framePoints);
    }

    function fitCamera() {
        const w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        if (!robot) return;
        const center = new THREE.Box3().setFromPoints(framePoints).getCenter(new THREE.Vector3());
        const right = new THREE.Vector3(), up = new THREE.Vector3(), p = new THREE.Vector3();
        let dist = 3;
        for (let iter = 0; iter < 6; iter++) { // converge on distance and centring in screen space
            camera.position.copy(center).addScaledVector(cameraDir, dist);
            camera.lookAt(center);
            camera.updateMatrixWorld();
            camera.updateProjectionMatrix();
            let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
            for (const fp of framePoints) {
                p.copy(fp).project(camera);
                x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
                y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
            }
            const halfH = Math.tan(camera.fov * DEG / 2) * dist;
            right.setFromMatrixColumn(camera.matrixWorld, 0);
            up.setFromMatrixColumn(camera.matrixWorld, 1);
            center.addScaledVector(right, (x0 + x1) / 2 * halfH * camera.aspect)
                .addScaledVector(up, (y0 + y1) / 2 * halfH);
            dist *= Math.max((x1 - x0) / 2, (y1 - y0) / 2) / (spec.fill ?? 0.84);
        }
        camera.near = dist / 20;
        camera.far = dist * 4;
        camera.updateProjectionMatrix();
        behavior.onCamera(camera);
    }

    // How strongly the robot should attend to the cursor: 1 inside the card's neighbourhood, easing to 0.
    function attention(rect) {
        const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        const d = Math.hypot(pointer.x - cx, pointer.y - cy);
        const inner = 0.65 * Math.max(rect.width, rect.height), outer = inner + 220;
        if (d <= inner) return 1;
        if (d >= outer) return 0;
        const t = 1 - (d - inner) / (outer - inner);
        return t * t * (3 - 2 * t);
    }

    // Browsers pause requestAnimationFrame in hidden tabs; off-screen cards skip their work here.
    function tick(now) {
        requestAnimationFrame(tick);
        const dt = clamp((now - lastTime) / 1000, 0, 0.05);
        lastTime = now;
        const rect = el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight || !rect.width) return;
        t += dt;
        behavior.update(dt, t, attention(rect), rect);
        renderer.render(scene, camera);
    }

    loader.load(spec.model, gltf => {
        robot = buildRobot(spec, gltf);
        yawGroup.add(robot.root);
        behavior = spec.gait ? gaitBehavior(spec, robot, { world, camera, el }) : reachBehavior(spec, robot, { world, camera, el });
        world.updateMatrixWorld(true);
        collectFramePoints();

        el.appendChild(renderer.domElement);
        renderer.domElement.setAttribute('aria-hidden', 'true');
        fitCamera();
        renderer.render(scene, camera);
        el.classList.add('is-ready');

        new ResizeObserver(fitCamera).observe(el);
        lastTime = performance.now();
        requestAnimationFrame(tick);
    }, undefined, err => {
        console.error(`Failed to load ${spec.model}:`, err);
        renderer.dispose();
    });
}

// Only build a viewer once its card is about to scroll into view.
const lazy = new IntersectionObserver(entries => {
    for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        lazy.unobserve(entry.target);
        try {
            initViewer(entry.target);
        } catch (err) { // e.g. no WebGL: the card keeps showing its image
            console.warn('Robot viewer disabled:', err);
        }
    }
}, { rootMargin: '300px' });
document.querySelectorAll('.robot-viewer[data-robot]').forEach(el => lazy.observe(el));
