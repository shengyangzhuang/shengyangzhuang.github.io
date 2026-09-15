// Interactive robot arms for the "Robotic Platforms" section.
// Each <div class="robot-viewer" data-robot="..."> gets a three.js scene; the arm idles, and when the
// cursor comes near it the end-effector follows the cursor via CCD inverse kinematics.
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
};

const CAMERA_DIR = new THREE.Vector3(1.05, 0.5, 1.25).normalize(); // y-up world, looking from front-right
const IDLE_AMPLITUDE = 0.07;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const clamp = THREE.MathUtils.clamp;
const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));

// Shared pointer state (client coordinates); far away means "no cursor".
const pointer = { x: -1e4, y: -1e4 };
window.addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
const releaseTouch = e => { if (e.pointerType !== 'mouse') { pointer.x = pointer.y = -1e4; } };
window.addEventListener('pointerup', releaseTouch, { passive: true });
window.addEventListener('pointercancel', releaseTouch, { passive: true });
document.documentElement.addEventListener('mouseleave', () => { pointer.x = pointer.y = -1e4; });

function buildArm(spec, gltf) {
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

    const frames = new Map();
    const joints = [];
    for (const b of spec.bodies) {
        const fixed = new THREE.Group();
        if (b.pos) fixed.position.fromArray(b.pos);
        if (b.quat) fixed.quaternion.set(b.quat[1], b.quat[2], b.quat[3], b.quat[0]).normalize();
        const frame = new THREE.Group();
        fixed.add(frame);
        (b.parent ? frames.get(b.parent) : null)?.add(fixed);
        frames.set(b.name, b.parent ? frame : fixed);
        for (const mesh of parts.get(b.name) ?? []) frame.add(mesh);
        if (b.axis) {
            joints.push({
                frame,
                axis: new THREE.Vector3().fromArray(b.axis).normalize(),
                range: b.range,
                ik: b.ik !== false,
            });
        }
    }
    const root = frames.get(spec.bodies[0].name);
    const tip = new THREE.Object3D();
    tip.position.fromArray(spec.tip.offset);
    frames.get(spec.tip.body).add(tip);
    return { root, joints, tip };
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
    const world = new THREE.Group();
    world.rotation.x = -Math.PI / 2; // robot z-up -> three.js y-up
    scene.add(world);
    const yawGroup = new THREE.Group();
    yawGroup.rotation.z = spec.yaw;
    world.add(yawGroup);

    let arm = null;
    let lastTime = 0, t = 0;
    const home = spec.home.slice();
    const qTarget = home.slice(); // IK / idle target
    const q = home.slice();       // displayed joint angles, smoothed toward qTarget

    const setJoints = angles => arm.joints.forEach((j, i) => {
        j.frame.quaternion.setFromAxisAngle(j.axis, angles[i]);
    });

    // Target plane through the home end-effector position, facing the camera.
    const plane = new THREE.Plane();
    const homeTip = new THREE.Vector3();
    const goal = new THREE.Vector3();
    const smoothGoal = new THREE.Vector3();
    const hit = new THREE.Vector3();
    const ndc = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const tipPos = new THREE.Vector3(), pivot = new THREE.Vector3(), axisW = new THREE.Vector3();
    const toTip = new THREE.Vector3(), toGoal = new THREE.Vector3(), cross = new THREE.Vector3();
    const quat = new THREE.Quaternion();

    // Points the camera must keep in frame: every mesh's bounding-box corners (home pose) plus the reach area.
    const framePoints = [];
    function collectFramePoints() {
        const corner = new THREE.Vector3();
        arm.root.traverse(o => {
            if (!o.isMesh) return;
            const { min, max } = o.geometry.boundingBox ?? (o.geometry.computeBoundingBox(), o.geometry.boundingBox);
            for (let k = 0; k < 8; k++) {
                corner.set(k & 1 ? max.x : min.x, k & 2 ? max.y : min.y, k & 4 ? max.z : min.z);
                framePoints.push(corner.clone().applyMatrix4(o.matrixWorld));
            }
        });
        const r = spec.reach * 0.6;
        for (const d of [[r, 0, 0], [-r, 0, 0], [0, r, 0], [0, -r * 0.5, 0], [0, 0, r], [0, 0, -r]]) {
            framePoints.push(homeTip.clone().add(new THREE.Vector3(...d)));
        }
    }

    function fitCamera() {
        const w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        if (!arm) return;
        const center = new THREE.Box3().setFromPoints(framePoints).getCenter(new THREE.Vector3());
        const right = new THREE.Vector3(), up = new THREE.Vector3(), p = new THREE.Vector3();
        let dist = 3;
        for (let iter = 0; iter < 6; iter++) { // converge on distance and centring in screen space
            camera.position.copy(center).addScaledVector(CAMERA_DIR, dist);
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
            dist *= Math.max((x1 - x0) / 2, (y1 - y0) / 2) / 0.84;
        }
        camera.near = dist / 20;
        camera.far = dist * 4;
        camera.updateProjectionMatrix();
        plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), homeTip);
    }

    // How strongly the arm should attend to the cursor: 1 inside the card's neighbourhood, easing to 0.
    function attention(rect) {
        const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        const d = Math.hypot(pointer.x - cx, pointer.y - cy);
        const inner = 0.65 * Math.max(rect.width, rect.height), outer = inner + 220;
        if (d <= inner) return 1;
        if (d >= outer) return 0;
        const t = 1 - (d - inner) / (outer - inner);
        return t * t * (3 - 2 * t);
    }

    function solveIK() {
        for (let iter = 0; iter < 4; iter++) {
            arm.tip.getWorldPosition(tipPos);
            if (tipPos.distanceTo(smoothGoal) < 0.004) return;
            for (let i = arm.joints.length - 1; i >= 0; i--) {
                const j = arm.joints[i];
                if (!j.ik) continue;
                arm.tip.getWorldPosition(tipPos);
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

    // Browsers pause requestAnimationFrame in hidden tabs; off-screen cards skip their work here.
    function tick(now) {
        requestAnimationFrame(tick);
        const dt = clamp((now - lastTime) / 1000, 0, 0.05);
        lastTime = now;
        const rect = el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight || !rect.width) return;
        t += dt;
        const s = attention(rect);

        const idle = i => home[i] + (reducedMotion ? 0 : Math.sin(t * (0.45 + 0.04 * i) + 0.8 * i) * IDLE_AMPLITUDE);
        if (s > 0.01) {
            ndc.set((pointer.x - rect.left) / rect.width * 2 - 1, -((pointer.y - rect.top) / rect.height) * 2 + 1);
            raycaster.setFromCamera(ndc, camera);
            if (raycaster.ray.intersectPlane(plane, hit)) {
                goal.subVectors(hit, homeTip).clampLength(0, spec.reach).multiplyScalar(s).add(homeTip);
                smoothGoal.lerp(goal, 1 - Math.exp(-5 * dt));
            }
            // Gently pull the redundant joints back toward the home posture so the arm never drifts into odd poses.
            qTarget.forEach((v, i) => { qTarget[i] = damp(v, idle(i), 0.8, dt); });
            setJoints(qTarget);
            world.updateMatrixWorld(true);
            solveIK();
        } else {
            qTarget.forEach((_, i) => { qTarget[i] = idle(i); });
            smoothGoal.copy(homeTip);
        }
        q.forEach((v, i) => { q[i] = damp(v, qTarget[i], 4 + 0.2 * i, dt); });
        setJoints(q);
        renderer.render(scene, camera);
    }

    loader.load(spec.model, gltf => {
        arm = buildArm(spec, gltf);
        yawGroup.add(arm.root);
        setJoints(home);
        world.updateMatrixWorld(true);
        arm.tip.getWorldPosition(homeTip);
        smoothGoal.copy(homeTip);
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
        } catch (err) { // e.g. no WebGL: the card keeps showing its photo
            console.warn('Robot viewer disabled:', err);
        }
    }
}, { rootMargin: '300px' });
document.querySelectorAll('.robot-viewer[data-robot]').forEach(el => lazy.observe(el));
