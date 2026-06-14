(() => {
  const titleScreen = document.getElementById("title-screen");
  const gameScreen = document.getElementById("game-screen");
  const sceneContainer = document.getElementById("scene-container");
  const startButton = document.getElementById("start-button");
  const outsideButton = document.getElementById("outside-button");
  const heroButton = document.getElementById("hero-button");
  const resetButton = document.getElementById("reset-button");
  const rainToggleButton = document.getElementById("rain-toggle-button");
  const burstButton = document.getElementById("burst-button");
  const blockCount = document.getElementById("block-count");
  const workerToggleButton = document.getElementById("worker-toggle-button");
  const workerStateLabel = document.getElementById("worker-state-label");
  const materialCount = document.getElementById("material-count");
  const materialGoalLabel = document.getElementById("material-goal");
  const workerSpeech = document.getElementById("worker-speech");
  const modeLabel = document.getElementById("mode-label");
  const messageText = document.getElementById("message-text");

  const MODES = {
    OUTSIDE: "outside",
    HERO: "hero",
  };

  const outsideMessage = "外から見ると、町はまだ未完成の構造物に見える。";
  const heroMessage = "中から見ると、作業員が材料を気にしているのが分かる。";
  const initialMessage = "落ちてきた材料に、作業員たちが気づきはじめた。";
  const centralMessage = "ここに、まだ名前のない何かが作られようとしている。";
  const rainOnMessage = "空からブロックが落ちてくる。町はそれを材料にしようとしている。";
  const rainOffMessage = "ブロックの雨が止まった。町は少し静かになった。";
  const workerOnMessage = "作業員たちは、使えそうなブロックを探している。";
  const workerOffMessage = "作業員たちは少し休んでいる。";
  const inspectingMessage = "これ、つかえそう。";
  const carryingMessage = "町はまだ、何になるのか考えている。";
  const heroMaterialMessage = "中から見ると、材料がただの山ではなく、置かれた場所に見える。";
  const goalReachedMessage = "何かになりそう。でも、まだ名前がない。";
  const prepProgressMessage = "町の中心で、何かが少しずつ形になりはじめた。";
  const gatherMessages = [
    "材料が、少しずつ町の中心に集まっていく。",
    "まだ建物にはならない。でも、何かが始まりそうだ。",
    "町は、落ちてきたものを自分の材料にしようとしている。",
  ];

  const outsideCameraPosition = new THREE.Vector3(8.8, 5.9, 9.4);
  const outsideTarget = new THREE.Vector3(0.2, 1.05, -0.15);
  const heroStartPosition = new THREE.Vector3(0.9, 1.05, 2.7);
  const heroLookTarget = new THREE.Vector3(3.45, 3.2, -0.55);
  const fallingBlockLimit = 80;
  const fallingPalette = [
    0xff6b6b, 0xffcc4d, 0x4d96ff, 0x6bcb77, 0xff8f5a,
    0x9d8cff, 0x4dd6c7, 0xf2ef6d, 0xf58bc3, 0x7dd3fc,
  ];
  const dropZones = [
    { name: "foundation", x: 0.05, z: -0.2, radiusX: 2.0, radiusZ: 1.45, weight: 5, landings: 0 },
    { name: "block-yard", x: -3.25, z: -0.35, radiusX: 1.2, radiusZ: 0.85, weight: 3, landings: 0 },
    { name: "rocket-side", x: 3.85, z: -1.2, radiusX: 1.1, radiusZ: 0.95, weight: 2, landings: 0 },
    { name: "outer-town", x: -1.2, z: 3.9, radiusX: 2.3, radiusZ: 0.85, weight: 2, landings: 0 },
  ];
  const materialGoal = 15;
  const materialZones = [
    { id: "left-yard", x: -2.8, z: 0.5, accent: 0x4d96ff, flag: 0xff6b6b, cols: 3, rows: 2, spacing: 0.46, platformTop: 0.19, slots: [], blocks: [] },
    { id: "right-yard", x: 3.0, z: -0.5, accent: 0xff8f5a, flag: 0xffcc4d, cols: 3, rows: 2, spacing: 0.46, platformTop: 0.19, slots: [], blocks: [] },
    { id: "back-yard", x: -0.6, z: -2.95, accent: 0x9d8cff, flag: 0x6bcb77, cols: 3, rows: 2, spacing: 0.46, platformTop: 0.19, slots: [], blocks: [] },
  ];
  const centralBuildCenter = { x: 0.1, z: -0.1 };
  const centralBuildBaseTop = 0.32;
  const centralBuildPillarTop = 0.96;
  const centralBuildCorners = [
    [-0.62, -0.44],
    [0.62, -0.44],
    [-0.62, 0.44],
    [0.62, 0.44],
  ];
  const workerPlaceLines = [
    "ここに おこう",
    "あつまってきた",
    "まだ かたちは きまってない",
    "なにに なるかな",
    "まだ なまえがない",
    "このへん、つかえそう",
  ];
  const workerSpeechLines = [
    "これ、つかえそう",
    "ここに はこぼう",
    "まるいの、たりない",
    "ちょっと おもい",
    "まだ なまえがない",
    "まだ なまえがない",
    "どこに おこうかな",
    "この町、まだ つくってる",
  ];
  const workerStateLabels = {
    searching: "さがす",
    inspecting: "しらべる",
    carrying: "はこぶ",
  };

  let scene;
  let camera;
  let renderer;
  let controls;
  let currentMode = MODES.OUTSIDE;
  let heroOffset = 0;
  let heroLookSway = 0;
  let rainEnabled = true;
  let workersEnabled = true;
  let nextBlockDropAt = 0;
  let animationStarted = false;
  let initialMessageTimer = null;
  let workerSpeechUntil = 0;
  let activeSpeechWorker = null;
  const clock = new THREE.Clock();
  const animatedParts = [];
  const fallingBlocks = [];
  const landingEffects = [];
  const workerAgents = [];
  const materialBlocks = [];
  const preparationStages = [];
  let materialCollected = 0;
  let materialGoalAnnounced = false;

  startButton.addEventListener("click", () => {
    titleScreen.classList.add("is-hidden");
    gameScreen.classList.remove("is-hidden");

    if (!renderer) {
      initScene();
    }

    resizeRenderer();
    setMode(MODES.OUTSIDE, { showInitialMessage: true });
  });

  outsideButton.addEventListener("click", () => setMode(MODES.OUTSIDE));
  heroButton.addEventListener("click", () => setMode(MODES.HERO));
  resetButton.addEventListener("click", resetCameraForCurrentMode);
  rainToggleButton.addEventListener("click", toggleBlockRain);
  burstButton.addEventListener("click", () => {
    spawnBlockBurst(7);
    setTimedMessage(rainOnMessage);
  });
  workerToggleButton.addEventListener("click", toggleWorkers);
  window.addEventListener("resize", resizeRenderer);
  window.addEventListener("keydown", handleHeroKeys);

  function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8fd9ff);
    scene.fog = new THREE.Fog(0x8fd9ff, 18, 36);

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.copy(outsideCameraPosition);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    sceneContainer.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.copy(outsideTarget);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 4.6;
    controls.maxDistance = 19;
    controls.maxPolarAngle = Math.PI * 0.5;

    addLights();
    createDioramaBase();
    createTownObjects();
    updateRainButton();
    updateBlockCount();
    updateWorkerButton();
    updateWorkerStatus();
    materialGoalLabel.textContent = String(materialGoal);
    updateMaterialCount();
    spawnBlockBurst(4);
    nextBlockDropAt = clock.elapsedTime + 0.8;

    if (!animationStarted) {
      animationStarted = true;
      animate();
    }
  }

  function addLights() {
    const hemisphere = new THREE.HemisphereLight(0xffffff, 0x75b86a, 0.78);
    scene.add(hemisphere);

    const sun = new THREE.DirectionalLight(0xffffff, 0.86);
    sun.position.set(6, 11, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    scene.add(sun);

    const warmFill = new THREE.DirectionalLight(0xfff0b5, 0.28);
    warmFill.position.set(-8, 4, -5);
    scene.add(warmFill);
  }

  function createDioramaBase() {
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x7fcf61,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(new THREE.BoxGeometry(15, 0.3, 15), groundMaterial);
    ground.position.y = -0.18;
    ground.receiveShadow = true;
    scene.add(ground);

    const tileMaterials = [
      new THREE.MeshStandardMaterial({ color: 0x8bd96b, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0x76c961, roughness: 0.9 }),
    ];

    for (let x = -7; x <= 7; x += 1) {
      for (let z = -7; z <= 7; z += 1) {
        const tile = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.035, 0.95), tileMaterials[(x + z + 20) % 2]);
        tile.position.set(x, 0.015, z);
        tile.receiveShadow = true;
        scene.add(tile);
      }
    }

    const lot = new THREE.Mesh(
      new THREE.BoxGeometry(4.1, 0.07, 3.2),
      new THREE.MeshStandardMaterial({ color: 0xf3d68a, roughness: 0.84 })
    );
    lot.position.set(0.1, 0.08, -0.1);
    lot.receiveShadow = true;
    scene.add(lot);

    addLowFence(-2.25, -1.85, 1.6, true);
    addLowFence(0.7, -1.85, 1.75, true);
    addLowFence(-2.25, 1.65, 3.0, true);
    addLowFence(-2.25, -1.85, 1.35, false);
    addLowFence(2.35, -0.35, 2.0, false);
    createUnfinishedFoundation();
  }

  function addLowFence(x, z, length, horizontal) {
    const material = new THREE.MeshStandardMaterial({ color: 0xf7f0c9, roughness: 0.75 });
    const geometry = horizontal ? new THREE.BoxGeometry(length, 0.22, 0.12) : new THREE.BoxGeometry(0.12, 0.22, length);
    const fence = new THREE.Mesh(geometry, material);
    fence.position.set(x + (horizontal ? length / 2 : 0), 0.24, z + (horizontal ? 0 : length / 2));
    fence.castShadow = true;
    fence.receiveShadow = true;
    scene.add(fence);
  }

  function createUnfinishedFoundation() {
    const slabMaterial = new THREE.MeshStandardMaterial({ color: 0xffefb1, roughness: 0.76 });
    const shadowMaterial = new THREE.MeshStandardMaterial({ color: 0xd8b75a, roughness: 0.85 });

    const slabs = [
      [-0.75, -0.45, 1.35, 0.16, 0.55, 0.02],
      [0.7, -0.45, 1.1, 0.16, 0.55, -0.03],
      [-0.1, 0.36, 1.7, 0.16, 0.48, 0.05],
      [-1.35, 0.55, 0.75, 0.16, 0.45, -0.08],
      [1.25, 0.48, 0.72, 0.16, 0.45, 0.1],
    ];

    slabs.forEach(([x, z, width, height, depth, rotation]) => {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), slabMaterial);
      slab.position.set(x, 0.18, z);
      slab.rotation.y = rotation;
      slab.castShadow = true;
      slab.receiveShadow = true;
      scene.add(slab);
    });

    const innerHole = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, 0.08, 0.82),
      new THREE.MeshStandardMaterial({ color: 0xc7a55f, roughness: 0.9 })
    );
    innerHole.position.set(0.08, 0.16, -0.02);
    innerHole.receiveShadow = true;
    scene.add(innerHole);

    const starterBlocks = [
      [-1.55, -0.95, 0.42, 0.35, 0.42, 0x80e0a5],
      [-1.55, -0.95, 0.36, 0.32, 0.36, 0xffcf4a],
      [1.55, -1.02, 0.38, 0.28, 0.38, 0xff8f5a],
      [1.58, -1.0, 0.32, 0.24, 0.32, 0x8fd3ff],
    ];

    starterBlocks.forEach(([x, z, width, height, depth, color], index) => {
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, depth),
        new THREE.MeshStandardMaterial({ color, roughness: 0.75 })
      );
      block.position.set(x, 0.28 + index % 2 * 0.26, z);
      block.rotation.y = index % 2 === 0 ? 0.08 : -0.06;
      block.castShadow = true;
      block.receiveShadow = true;
      scene.add(block);
    });

    const markerMaterial = new THREE.MeshStandardMaterial({ color: 0x4d96ff, roughness: 0.65 });
    const markerPositions = [
      [-2.0, -1.48],
      [2.0, -1.48],
      [-2.0, 1.28],
      [2.0, 1.28],
    ];

    markerPositions.forEach(([x, z]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.58, 10), markerMaterial);
      pole.position.set(x, 0.48, z);
      pole.castShadow = true;
      scene.add(pole);

      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), markerMaterial);
      cap.position.set(x, 0.8, z);
      cap.castShadow = true;
      scene.add(cap);
    });

    const darkPatch = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.04, 0.32), shadowMaterial);
    darkPatch.position.set(-0.25, 0.14, 1.05);
    darkPatch.rotation.y = -0.12;
    darkPatch.receiveShadow = true;
    scene.add(darkPatch);
  }

  function createMaterialZones() {
    materialZones.forEach((zone) => {
      buildMaterialZoneVisual(zone);

      const startX = zone.x - ((zone.cols - 1) / 2) * zone.spacing;
      const startZ = zone.z - ((zone.rows - 1) / 2) * zone.spacing;

      for (let r = 0; r < zone.rows; r += 1) {
        for (let c = 0; c < zone.cols; c += 1) {
          const sx = startX + c * zone.spacing;
          const sz = startZ + r * zone.spacing;
          zone.slots.push({ x: sx, z: sz, topY: zone.platformTop, reservedBy: null, blockMesh: null });
          addSlotMarker(zone, sx, sz);
        }
      }
    });
  }

  function buildMaterialZoneVisual(zone) {
    const width = zone.cols * zone.spacing + 0.46;
    const depth = zone.rows * zone.spacing + 0.46;
    const halfW = width / 2;
    const halfD = depth / 2;

    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.1, depth),
      new THREE.MeshStandardMaterial({ color: 0xe9c987, roughness: 0.92 })
    );
    platform.position.set(zone.x, 0.14, zone.z);
    platform.receiveShadow = true;
    scene.add(platform);
    zone.platformTop = 0.19;

    const postMaterial = new THREE.MeshStandardMaterial({ color: zone.accent, roughness: 0.6 });
    [[-halfW, -halfD], [halfW, -halfD], [-halfW, halfD], [halfW, halfD]].forEach(([ox, oz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 10), postMaterial);
      post.position.set(zone.x + ox, 0.34, zone.z + oz);
      post.castShadow = true;
      scene.add(post);
    });

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.55, 0.16, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xfff3c9, roughness: 0.8 })
    );
    board.position.set(zone.x, 0.31, zone.z - halfD - 0.03);
    board.castShadow = true;
    scene.add(board);

    const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 10), postMaterial);
    flagPole.position.set(zone.x - halfW, 0.5, zone.z - halfD);
    flagPole.castShadow = true;
    scene.add(flagPole);

    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.2, 0.02),
      new THREE.MeshStandardMaterial({ color: zone.flag, roughness: 0.7 })
    );
    flag.position.set(zone.x - halfW + 0.18, 0.74, zone.z - halfD);
    flag.castShadow = true;
    scene.add(flag);
  }

  function addSlotMarker(zone, x, z) {
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(zone.spacing * 0.72, 0.02, zone.spacing * 0.72),
      new THREE.MeshStandardMaterial({ color: 0xd9b06a, roughness: 0.95 })
    );
    marker.position.set(x, zone.platformTop + 0.006, z);
    marker.receiveShadow = true;
    scene.add(marker);
  }

  function createPreparationProps() {
    // 中央土台が材料の集まりに合わせて少しずつ「作りかけの何か」になっていく。
    // どの段階も完成はさせず、骨組みのまま止める。
    addPreparationStage(3, buildStageBase());
    addPreparationStage(6, buildStagePillars());
    addPreparationStage(9, buildStageWalls());
    addPreparationStage(12, buildStageScaffold());
    addPreparationStage(15, buildStageFrame());
  }

  function addPreparationStage(threshold, object) {
    object.visible = false;
    scene.add(object);
    preparationStages.push({ threshold, object, revealed: false });
  }

  function newCentralGroup() {
    const group = new THREE.Group();
    group.position.set(centralBuildCenter.x, 0, centralBuildCenter.z);
    return group;
  }

  // 材料 3個: 低い台が増える
  function buildStageBase() {
    const group = newCentralGroup();

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.2, 1.08),
      new THREE.MeshStandardMaterial({ color: 0xe7c98a, roughness: 0.82 })
    );
    base.position.y = 0.22;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const step = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.12, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xf3d68a, roughness: 0.84 })
    );
    step.position.set(-0.18, 0.38, 0.16);
    step.rotation.y = 0.08;
    step.castShadow = true;
    step.receiveShadow = true;
    group.add(step);

    return group;
  }

  // 材料 6個: 小さな柱が立つ
  function buildStagePillars() {
    const group = newCentralGroup();
    const material = new THREE.MeshStandardMaterial({ color: 0xd9b27a, roughness: 0.7 });
    const pillarHeight = (centralBuildPillarTop - centralBuildBaseTop) * 1.0;

    centralBuildCorners.forEach(([ox, oz], index) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.15, pillarHeight, 0.15), material);
      pillar.position.set(ox, centralBuildBaseTop + pillarHeight / 2, oz);
      pillar.rotation.y = index % 2 === 0 ? 0.05 : -0.05;
      pillar.castShadow = true;
      group.add(pillar);
    });

    return group;
  }

  // 材料 9個: 仮の壁が少し出る（高さが不ぞろいで未完成）
  function buildStageWalls() {
    const group = newCentralGroup();
    const material = new THREE.MeshStandardMaterial({ color: 0xfae7bd, roughness: 0.8 });

    const backLeft = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.4, 0.1), material);
    backLeft.position.set(-0.34, centralBuildBaseTop + 0.2, -0.44);
    backLeft.castShadow = true;
    group.add(backLeft);

    const backRight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.1), material);
    backRight.position.set(0.42, centralBuildBaseTop + 0.15, -0.44);
    backRight.castShadow = true;
    group.add(backRight);

    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.36, 0.56), material);
    sideWall.position.set(-0.62, centralBuildBaseTop + 0.18, 0.06);
    sideWall.castShadow = true;
    group.add(sideWall);

    return group;
  }

  // 材料 12個: 足場や旗が増える
  function buildStageScaffold() {
    const group = newCentralGroup();
    const woodMaterial = new THREE.MeshStandardMaterial({ color: 0xd49b4d, roughness: 0.78 });
    const beamMaterial = new THREE.MeshStandardMaterial({ color: 0xffdf7c, roughness: 0.72 });

    [-0.12, 0.32].forEach((oz) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.92, 0.06), woodMaterial);
      post.position.set(0.78, centralBuildBaseTop + 0.46, oz);
      post.castShadow = true;
      group.add(post);
    });

    [0.55, 0.85].forEach((y) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.5), beamMaterial);
      rail.position.set(0.78, y, 0.1);
      rail.castShadow = true;
      group.add(rail);
    });

    const flagPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.42, 10),
      woodMaterial
    );
    flagPole.position.set(-0.62, centralBuildPillarTop + 0.2, -0.44);
    flagPole.castShadow = true;
    group.add(flagPole);

    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.16, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.7 })
    );
    flag.position.set(-0.47, centralBuildPillarTop + 0.28, -0.44);
    flag.castShadow = true;
    group.add(flag);

    return group;
  }

  // 材料 15個: 未完成の「何か」の骨組みになる（完成はさせない）
  function buildStageFrame() {
    const group = newCentralGroup();
    const beamMaterial = new THREE.MeshStandardMaterial({ color: 0xc99a5a, roughness: 0.65 });
    const topY = centralBuildPillarTop;

    const frontBeam = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.1, 0.1), beamMaterial);
    frontBeam.position.set(0, topY, 0.44);
    frontBeam.castShadow = true;
    group.add(frontBeam);

    const backBeam = frontBeam.clone();
    backBeam.position.z = -0.44;
    group.add(backBeam);

    const leftBeam = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.98), beamMaterial);
    leftBeam.position.set(-0.62, topY, 0);
    leftBeam.castShadow = true;
    group.add(leftBeam);

    const rightBeam = leftBeam.clone();
    rightBeam.position.x = 0.62;
    group.add(rightBeam);

    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.98), beamMaterial);
    ridge.position.set(0, topY + 0.42, 0);
    ridge.castShadow = true;
    group.add(ridge);

    [-1, 1].forEach((side) => {
      const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.74, 0.07), beamMaterial);
      rafter.position.set(side * 0.31, topY + 0.21, 0.44);
      rafter.rotation.z = side * 0.7;
      rafter.castShadow = true;
      group.add(rafter);

      const rafterBack = rafter.clone();
      rafterBack.position.z = -0.44;
      group.add(rafterBack);
    });

    const ghostBox = new THREE.BoxGeometry(1.34, 0.5, 0.98);
    const ghost = new THREE.Mesh(
      ghostBox,
      new THREE.MeshStandardMaterial({
        color: 0x8fd3ff,
        transparent: true,
        opacity: 0.12,
        roughness: 0.4,
        depthWrite: false,
      })
    );
    ghost.position.y = topY + 0.18;
    group.add(ghost);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(ghostBox),
      new THREE.LineBasicMaterial({ color: 0x4d96ff, transparent: true, opacity: 0.5 })
    );
    edges.position.y = topY + 0.18;
    group.add(edges);

    return group;
  }

  function revealPreparation() {
    let revealedAny = false;

    preparationStages.forEach((stage) => {
      if (!stage.revealed && materialCollected >= stage.threshold) {
        stage.revealed = true;
        stage.object.visible = true;
        revealedAny = true;
        createLandingEffect(stage.object.position, new THREE.Color(0xffe08a));
        setTimedMessage(prepProgressMessage);
      }
    });

    return revealedAny;
  }

  function updateMaterialCount() {
    materialCount.textContent = String(materialCollected);
  }

  function createTownObjects() {
    createMaterialZones();
    createPreparationProps();
    createColorBlocks();
    createWorkInProgressDetails();
    createOddPassage();
    createBlockYard();
    createSimpleCrane();
    createRestShelter();
    createResidentGathering();
    createHomes();
    createTower();
    createRocket();
    registerWorker(createRobot(-4.2, 0.1, -2.6, 0x4aa3ff), "worker-blue");
    registerWorker(createRobot(2.55, 0.1, 1.65, 0xffcc4d), "worker-yellow");
    createRobot(0.85, 0.1, -1.65, 0x6bcb77);
    createResident(-1.2, 0.1, 2.9, 0xff7f7f);
    createResident(2.1, 0.1, -1.15, 0x7bdb83);
    createResident(-3.4, 0.1, 1.1, 0xb995ff);
    createResident(4.6, 0.1, -3.2, 0xffb35c);
  }

  function createColorBlocks() {
    const palette = [
      0xff6b6b, 0xffcc4d, 0x4d96ff, 0x6bcb77, 0xff8f5a,
      0x9d8cff, 0x4dd6c7, 0xf2ef6d, 0xf58bc3, 0x7dd3fc,
    ];

    const blocks = [
      [-5.6, -5.2, 1.1, 0.7, 1.0],
      [-4.4, -5.1, 0.8, 0.8, 1.2],
      [-2.9, -5.5, 1.2, 0.6, 0.8],
      [1.9, -5.6, 1.0, 1.2, 0.7],
      [3.3, -5.1, 0.7, 0.8, 1.0],
      [5.1, -4.8, 1.2, 0.9, 0.9],
      [-6.1, -2.5, 0.9, 0.7, 0.9],
      [-4.9, -1.3, 1.2, 0.7, 0.7],
      [-5.7, 1.7, 1.0, 1.0, 0.8],
      [-5.1, 3.1, 0.7, 0.7, 1.1],
      [-3.8, 5.0, 1.1, 0.9, 0.8],
      [-1.6, 5.2, 0.9, 0.8, 0.8],
      [0.9, 5.5, 1.3, 0.7, 1.0],
      [2.8, 4.7, 0.9, 1.0, 0.7],
      [5.2, 3.9, 1.2, 0.8, 1.1],
      [5.7, 1.6, 0.8, 0.9, 0.8],
      [5.4, -0.7, 1.1, 0.7, 0.9],
      [4.4, -2.4, 0.7, 1.2, 0.6],
      [2.2, 2.5, 1.0, 0.8, 0.8],
      [-2.2, 2.1, 0.8, 0.7, 1.0],
      [-3.0, -0.8, 1.1, 0.7, 0.8],
      [3.0, 0.8, 0.9, 0.8, 0.7],
      [0.2, -3.5, 1.2, 0.9, 0.9],
      [-1.6, -3.3, 0.8, 0.8, 0.8],
      [1.9, -2.7, 1.0, 0.7, 1.1],
      [-0.5, 3.3, 0.7, 1.1, 0.7],
    ];

    blocks.forEach(([x, z, height, width, depth], index) => {
      addBlock(x, z, width, height, depth, palette[index % palette.length], (index % 5) * 0.08);
    });
  }

  function addBlock(x, z, width, height, depth, color, rotation = 0, tilt = {}) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.02 });
    const block = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    block.position.set(x, height / 2 + 0.07, z);
    block.rotation.set(tilt.x || 0, rotation, tilt.z || 0);
    block.castShadow = true;
    block.receiveShadow = true;
    scene.add(block);

    const nubMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.68 });
    const nubGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 18);
    const nubCountX = Math.max(1, Math.floor(width * 1.9));
    const nubCountZ = Math.max(1, Math.floor(depth * 1.9));

    for (let nx = 0; nx < nubCountX; nx += 1) {
      for (let nz = 0; nz < nubCountZ; nz += 1) {
        const nub = new THREE.Mesh(nubGeometry, nubMaterial);
        const localX = (nx - (nubCountX - 1) / 2) * 0.34;
        const localZ = (nz - (nubCountZ - 1) / 2) * 0.34;
        const rotatedX = localX * Math.cos(rotation) - localZ * Math.sin(rotation);
        const rotatedZ = localX * Math.sin(rotation) + localZ * Math.cos(rotation);
        nub.position.set(x + rotatedX, height + 0.15, z + rotatedZ);
        nub.castShadow = true;
        scene.add(nub);
      }
    }
  }

  function createWorkInProgressDetails() {
    addBlock(-2.65, -1.95, 0.62, 0.46, 0.74, 0xffcc4d, -0.28, { z: -0.05 });
    addBlock(-2.15, -1.72, 0.72, 0.35, 0.52, 0x4dd6c7, 0.42, { x: 0.04 });
    addBlock(-2.45, -2.45, 0.48, 0.5, 0.48, 0xf58bc3, 0.18, { z: 0.08 });
    addBlock(0.95, -2.35, 0.78, 0.42, 0.64, 0x9d8cff, -0.18, { x: -0.06 });
    addBlock(1.38, -2.05, 0.48, 0.62, 0.5, 0xff8f5a, 0.25, { z: 0.04 });
    addBlock(-0.55, 2.35, 0.64, 0.38, 0.56, 0x7dd3fc, 0.34, { x: 0.04 });

    createSimpleScaffold(-1.9, -4.35, 1.25, 2.4);
    createSimpleScaffold(3.9, 0.0, 1.1, 2.0);
  }

  function createSimpleScaffold(x, z, width, height) {
    const wood = new THREE.MeshStandardMaterial({ color: 0xd49b4d, roughness: 0.78 });
    const beamMaterial = new THREE.MeshStandardMaterial({ color: 0xffdf7c, roughness: 0.72 });

    [-1, 1].forEach((sideX) => {
      [-1, 1].forEach((sideZ) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, height, 0.08), wood);
        post.position.set(x + sideX * width * 0.5, height * 0.5 + 0.08, z + sideZ * 0.42);
        post.castShadow = true;
        scene.add(post);
      });
    });

    [0.7, 1.35, height].forEach((y) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(width + 0.22, 0.08, 0.08), beamMaterial);
      rail.position.set(x, y, z - 0.42);
      rail.castShadow = true;
      scene.add(rail);

      const backRail = rail.clone();
      backRail.position.z = z + 0.42;
      scene.add(backRail);
    });

    const platform = new THREE.Mesh(new THREE.BoxGeometry(width + 0.12, 0.08, 0.92), beamMaterial);
    platform.position.set(x, Math.max(0.72, height - 0.5), z);
    platform.castShadow = true;
    platform.receiveShadow = true;
    scene.add(platform);
  }

  function createOddPassage() {
    const pathMaterial = new THREE.MeshStandardMaterial({ color: 0xf8e8ad, roughness: 0.85 });
    const pathTiles = [
      [1.28, 2.45, 0.7, 0.06, 0.85, 0.08],
      [1.62, 1.68, 0.65, 0.06, 0.76, -0.12],
      [1.92, 0.98, 0.55, 0.06, 0.66, 0.14],
    ];

    pathTiles.forEach(([x, z, width, height, depth, rotation]) => {
      const tile = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), pathMaterial);
      tile.position.set(x, 0.12, z);
      tile.rotation.y = rotation;
      tile.receiveShadow = true;
      scene.add(tile);
    });

    addBlock(0.55, 2.12, 0.56, 0.9, 0.62, 0xffa9b4, -0.15);
    addBlock(0.68, 2.92, 0.48, 0.68, 0.54, 0x9d8cff, 0.24);
    addBlock(2.75, 2.1, 0.5, 0.78, 0.58, 0xffcf4a, 0.18);
    addBlock(2.62, 2.85, 0.62, 0.54, 0.46, 0x80e0a5, -0.22);
    addBlock(2.18, 0.42, 0.95, 0.45, 0.36, 0x4d96ff, 0.08);
  }

  function createBlockYard() {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.08, 1.25),
      new THREE.MeshStandardMaterial({ color: 0xf2cf78, roughness: 0.9 })
    );
    base.position.set(-3.25, 0.12, -0.35);
    base.rotation.y = -0.08;
    base.receiveShadow = true;
    scene.add(base);

    const pile = [
      [-3.85, -0.75, 0.5, 0.38, 0.55, 0xff6b6b, 0.18],
      [-3.2, -0.82, 0.58, 0.32, 0.45, 0x4d96ff, -0.2],
      [-2.75, -0.38, 0.46, 0.42, 0.52, 0xffcc4d, 0.38],
      [-3.55, 0.08, 0.52, 0.28, 0.44, 0x6bcb77, -0.34],
      [-2.95, 0.12, 0.6, 0.36, 0.5, 0xf58bc3, 0.12],
    ];

    pile.forEach(([x, z, width, height, depth, color, rotation], index) => {
      addBlock(x, z, width, height, depth, color, rotation, { z: index % 2 === 0 ? 0.04 : -0.04 });
    });
  }

  function createSimpleCrane() {
    const craneMaterial = new THREE.MeshStandardMaterial({ color: 0xffc247, roughness: 0.62 });
    const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x6c5b3e, roughness: 0.75 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.22, 18), darkMaterial);
    base.position.set(1.95, 0.24, -2.02);
    base.castShadow = true;
    scene.add(base);

    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.2, 0.16), craneMaterial);
    mast.position.set(1.95, 1.36, -2.02);
    mast.castShadow = true;
    scene.add(mast);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.13, 0.13), craneMaterial);
    arm.position.set(1.06, 2.42, -2.02);
    arm.rotation.z = 0.04;
    arm.castShadow = true;
    scene.add(arm);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.28), darkMaterial);
    counter.position.set(2.35, 2.38, -2.02);
    counter.castShadow = true;
    scene.add(counter);

    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.72, 8), darkMaterial);
    cable.position.set(0.25, 2.04, -2.02);
    cable.castShadow = true;
    scene.add(cable);

    const hook = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.22, 10), darkMaterial);
    hook.position.set(0.25, 1.58, -2.02);
    hook.rotation.x = Math.PI;
    hook.castShadow = true;
    scene.add(hook);
  }

  function createRestShelter() {
    const group = new THREE.Group();
    group.position.set(-5.15, 0.08, 0.25);
    group.rotation.y = 0.18;

    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xc9f0ff, roughness: 0.82 });
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xffcf71, roughness: 0.72 });
    const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x9c6a38, roughness: 0.86 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.78, 0.75), baseMaterial);
    body.position.y = 0.39;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.76, 0.38, 4), roofMaterial);
    roof.position.y = 0.98;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.12, 0.22), woodMaterial);
    bench.position.set(0.03, 0.2, 0.55);
    bench.castShadow = true;
    group.add(bench);

    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.12, 12), roofMaterial);
    cup.position.set(0.38, 0.33, 0.56);
    cup.castShadow = true;
    group.add(cup);

    scene.add(group);
  }

  function createResidentGathering() {
    const tableMaterial = new THREE.MeshStandardMaterial({ color: 0xffefb1, roughness: 0.8 });
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.16, 20), tableMaterial);
    table.position.set(3.0, 0.22, 1.55);
    table.castShadow = true;
    table.receiveShadow = true;
    scene.add(table);

    const seatMaterial = new THREE.MeshStandardMaterial({ color: 0x8fd3ff, roughness: 0.78 });
    [
      [2.45, 1.55],
      [3.55, 1.55],
      [3.0, 1.05],
      [3.02, 2.05],
    ].forEach(([x, z]) => {
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 14), seatMaterial);
      seat.position.set(x, 0.18, z);
      seat.castShadow = true;
      scene.add(seat);
    });

    createResident(2.52, 0.1, 1.88, 0xff7f7f);
    createResident(3.42, 0.1, 1.2, 0x7bdb83);
    createResident(3.35, 0.1, 1.95, 0xb995ff);
  }

  function createHomes() {
    createHouse(-4.4, -3.8, 0xffcf71, 0xff6f61, 0.15);
    createHouse(4.0, -4.0, 0x76d7ff, 0xf7a13d, -0.1);
    createHouse(-4.6, 4.0, 0xf6a9c9, 0x6f7dff, 0.08);
    createHouse(3.6, 3.8, 0xb9e78b, 0xff7b45, -0.18);
  }

  function createHouse(x, z, wallColor, roofColor, rotation) {
    const group = new THREE.Group();
    group.position.set(x, 0.08, z);
    group.rotation.y = rotation;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 1.1, 1.05),
      new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.8 })
    );
    body.position.y = 0.55;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.92, 0.65, 4),
      new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.74 })
    );
    roof.position.y = 1.42;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.52, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x6f4b2b, roughness: 0.9 })
    );
    door.position.set(0, 0.31, 0.55);
    group.add(door);

    scene.add(group);
  }

  function createTower() {
    const group = new THREE.Group();
    group.position.set(-1.45, 0.08, -4.75);
    group.rotation.z = -0.035;

    const colors = [0x8fd3ff, 0xffcf4a, 0xff7f7f, 0x80e0a5];
    for (let i = 0; i < 6; i += 1) {
      const section = new THREE.Mesh(
        new THREE.BoxGeometry(1.05 - i * 0.06, 0.78, 1.05 - i * 0.06),
        new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.72 })
      );
      section.position.y = 0.39 + i * 0.75;
      section.rotation.y = i * 0.18;
      section.castShadow = true;
      section.receiveShadow = true;
      group.add(section);
    }

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.72, 0.92, 5),
      new THREE.MeshStandardMaterial({ color: 0xff8f5a, roughness: 0.72 })
    );
    roof.position.y = 5.05;
    roof.castShadow = true;
    group.add(roof);

    scene.add(group);
  }

  function createRocket() {
    const group = new THREE.Group();
    group.position.set(4.75, 0.12, -0.25);
    group.rotation.z = -0.055;

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.54, 3.25, 24),
      new THREE.MeshStandardMaterial({ color: 0xf7f7f7, roughness: 0.48 })
    );
    body.position.y = 1.78;
    body.castShadow = true;
    group.add(body);

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.48, 0.9, 24),
      new THREE.MeshStandardMaterial({ color: 0xff5f6d, roughness: 0.58 })
    );
    nose.position.y = 3.86;
    nose.castShadow = true;
    group.add(nose);

    const windowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 18, 12),
      new THREE.MeshStandardMaterial({ color: 0x4d96ff, roughness: 0.25 })
    );
    windowMesh.position.set(0, 2.22, 0.47);
    group.add(windowMesh);

    const finMaterial = new THREE.MeshStandardMaterial({ color: 0xffcf4a, roughness: 0.72 });
    [-1, 1].forEach((side) => {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.82, 0.58), finMaterial);
      fin.position.set(side * 0.52, 0.48, 0);
      fin.rotation.z = side * 0.25;
      fin.castShadow = true;
      group.add(fin);
    });

    scene.add(group);
  }

  function createRobot(x, y, z, color) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const bodyMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.58, 0.35), bodyMaterial);
    body.position.y = 0.58;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.36, 0.38),
      new THREE.MeshStandardMaterial({ color: 0xf5f7ff, roughness: 0.48 })
    );
    head.position.y = 1.08;
    head.castShadow = true;
    group.add(head);

    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x243247, roughness: 0.3 });
    [-0.1, 0.1].forEach((eyeX) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), eyeMaterial);
      eye.position.set(eyeX, 1.1, 0.2);
      group.add(eye);
    });

    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.28, 10),
      new THREE.MeshStandardMaterial({ color: 0x243247, roughness: 0.4 })
    );
    antenna.position.y = 1.42;
    group.add(antenna);

    group.scale.setScalar(0.84);
    animatedParts.push({ object: group, baseY: y, speed: 1.8 + animatedParts.length * 0.18, amount: 0.035 });
    scene.add(group);
    return group;
  }

  function createResident(x, y, z, color) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 0.55, 16),
      new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
    );
    body.position.y = 0.42;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 18, 12),
      new THREE.MeshStandardMaterial({ color: 0xffd8a8, roughness: 0.72 })
    );
    head.position.y = 0.82;
    head.castShadow = true;
    group.add(head);

    const hat = new THREE.Mesh(
      new THREE.ConeGeometry(0.17, 0.22, 12),
      new THREE.MeshStandardMaterial({ color: 0xffcf4a, roughness: 0.7 })
    );
    hat.position.y = 1.06;
    hat.castShadow = true;
    group.add(hat);

    group.scale.setScalar(0.78);
    scene.add(group);
  }

  function registerWorker(group, id) {
    const carryMaterial = new THREE.MeshStandardMaterial({ color: 0xffcf4a, roughness: 0.72 });
    const carryMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.34), carryMaterial);
    carryMesh.position.set(0, 1.12, 0.42);
    carryMesh.castShadow = true;
    carryMesh.visible = false;
    group.add(carryMesh);

    workerAgents.push({
      id,
      group,
      carryMesh,
      state: "searching",
      targetBlock: null,
      targetPoint: null,
      dropOffPoint: null,
      targetZone: null,
      targetSlot: null,
      inspectTimer: 0,
      pauseTimer: randomBetween(0.2, 0.8),
      speechCooldown: randomBetween(1.2, 2.4),
      wobblePhase: Math.random() * Math.PI * 2,
      wobbleSpeed: randomBetween(1.1, 1.8),
      speed: randomBetween(0.75, 1.0),
    });
  }

  function toggleWorkers() {
    workersEnabled = !workersEnabled;
    updateWorkerButton();
    updateWorkerStatus();
    setTimedMessage(workersEnabled ? workerOnMessage : workerOffMessage);

    if (!workersEnabled) {
      hideWorkerSpeech();
    }
  }

  function updateWorkerButton() {
    workerToggleButton.textContent = workersEnabled ? "作業員 ON" : "作業員 OFF";
    workerToggleButton.classList.toggle("is-active", workersEnabled);
  }

  function updateWorkerStatus() {
    if (!workersEnabled) {
      workerStateLabel.textContent = "休み";
      return;
    }

    if (workerAgents.length === 0) {
      workerStateLabel.textContent = "待機";
      return;
    }

    const counts = workerAgents.reduce((summary, worker) => {
      summary[worker.state] += 1;
      return summary;
    }, { searching: 0, inspecting: 0, carrying: 0 });

    workerStateLabel.textContent = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([state, count]) => `${workerStateLabels[state]} ${count}`)
      .join(" / ");
  }

  function updateWorkerAgents(elapsed, delta) {
    if (!workersEnabled) {
      return;
    }

    workerAgents.forEach((worker) => {
      worker.speechCooldown = Math.max(0, worker.speechCooldown - delta);

      if (worker.state === "searching") {
        updateSearchingWorker(worker, delta);
      } else if (worker.state === "inspecting") {
        updateInspectingWorker(worker, delta);
      } else if (worker.state === "carrying") {
        updateCarryingWorker(worker, delta);
      }
    });

    updateWorkerStatus();
  }

  function updateSearchingWorker(worker, delta) {
    if (!worker.targetBlock || worker.targetBlock.state !== "settled" || worker.targetBlock.delivered) {
      assignWorkerTarget(worker);
    }

    if (!worker.targetBlock) {
      worker.group.rotation.y += Math.sin(clock.elapsedTime * 1.6 + worker.wobblePhase) * 0.01;
      return;
    }

    if (worker.pauseTimer > 0) {
      worker.pauseTimer -= delta;
      worker.group.rotation.y += Math.sin(clock.elapsedTime * 5 + worker.wobblePhase) * 0.012;
      return;
    }

    if (Math.random() < 0.006) {
      worker.pauseTimer = randomBetween(0.18, 0.45);
      if (worker.speechCooldown <= 0) {
        showWorkerSpeech(worker, "どこに おこうかな", 1.6);
      }
      return;
    }

    const target = getWorkerApproachPoint(worker);
    const arrived = moveWorkerToward(worker, target, delta, worker.speed);

    if (arrived) {
      enterInspecting(worker);
    }
  }

  function updateInspectingWorker(worker, delta) {
    worker.inspectTimer -= delta;
    worker.group.rotation.y += Math.sin(clock.elapsedTime * 4 + worker.wobblePhase) * 0.01;

    if (worker.inspectTimer <= 0) {
      enterCarrying(worker);
    }
  }

  function updateCarryingWorker(worker, delta) {
    if (!worker.dropOffPoint || !worker.targetSlot) {
      worker.carryMesh.visible = false;
      worker.state = "searching";
      return;
    }

    const arrived = moveWorkerToward(worker, worker.dropOffPoint, delta, worker.speed * 0.88);

    if (arrived) {
      deliverWorkerBlock(worker);
    }
  }

  function assignWorkerTarget(worker) {
    const block = findClaimableBlock(worker);

    if (!block) {
      worker.targetBlock = null;
      return;
    }

    block.claimedBy = worker;
    worker.targetBlock = block;
    worker.targetPoint = {
      x: block.mesh.position.x + randomBetween(-0.28, 0.28),
      z: block.mesh.position.z + randomBetween(-0.28, 0.28),
    };
    worker.pauseTimer = randomBetween(0.16, 0.42);
  }

  function findClaimableBlock(worker) {
    const candidates = fallingBlocks.filter((block) => (
      block.state === "settled" &&
      !block.claimedBy &&
      !block.delivered &&
      block.mesh.visible
    ));

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => {
      const aDistance = distance2D(worker.group.position, a.mesh.position) + randomBetween(0, 1.5);
      const bDistance = distance2D(worker.group.position, b.mesh.position) + randomBetween(0, 1.5);
      return aDistance - bDistance;
    });

    return candidates[0];
  }

  function getWorkerApproachPoint(worker) {
    const blockPosition = worker.targetBlock.mesh.position;
    const base = worker.targetPoint || blockPosition;
    const dx = blockPosition.x - worker.group.position.x;
    const dz = blockPosition.z - worker.group.position.z;
    const length = Math.max(0.001, Math.hypot(dx, dz));
    const wobble = Math.sin(clock.elapsedTime * worker.wobbleSpeed + worker.wobblePhase) * 0.18;

    return {
      x: base.x + (-dz / length) * wobble,
      z: base.z + (dx / length) * wobble,
    };
  }

  function enterInspecting(worker) {
    worker.state = "inspecting";
    worker.inspectTimer = randomBetween(1.0, 2.0);
    worker.pauseTimer = 0;
    showWorkerSpeech(worker, chooseWorkerSpeech("inspect"), 2.1);
    setTimedMessage(inspectingMessage);
    updateWorkerStatus();
  }

  function enterCarrying(worker) {
    if (!worker.targetBlock) {
      worker.state = "searching";
      return;
    }

    worker.state = "carrying";
    worker.targetZone = chooseMaterialZoneForWorker(worker);
    worker.targetSlot = reserveZoneSlot(worker.targetZone, worker);
    worker.dropOffPoint = { x: worker.targetSlot.x, z: worker.targetSlot.z };
    worker.targetBlock.mesh.visible = false;
    worker.targetBlock.claimedBy = worker;
    worker.carryMesh.material.color.copy(worker.targetBlock.mesh.material.color);
    worker.carryMesh.visible = true;
    showWorkerSpeech(worker, chooseWorkerSpeech("carry"), 2.0);
    setTimedMessage(carryingMessage);
    updateWorkerStatus();
  }

  function chooseMaterialZoneForWorker(worker) {
    let best = materialZones[0];
    let bestScore = Infinity;

    materialZones.forEach((zone) => {
      const score = distance2D(worker.group.position, zone) + randomBetween(0, 1.4);
      if (score < bestScore) {
        bestScore = score;
        best = zone;
      }
    });

    return best;
  }

  function reserveZoneSlot(zone, worker) {
    let slot = zone.slots.find((candidate) => !candidate.reservedBy && !candidate.blockMesh);

    if (!slot && zone.blocks.length > 0) {
      const oldest = zone.blocks[0];
      slot = oldest.slot;
      freeMaterial(oldest);
    }

    if (!slot) {
      slot = zone.slots[0];
    }

    slot.reservedBy = worker;
    return slot;
  }

  function freeMaterial(material) {
    material.slot.blockMesh = null;
    scene.remove(material.mesh);
    disposeObject(material.mesh);

    const materialIndex = materialBlocks.indexOf(material);
    if (materialIndex >= 0) {
      materialBlocks.splice(materialIndex, 1);
    }

    const zoneIndex = material.zone.blocks.indexOf(material);
    if (zoneIndex >= 0) {
      material.zone.blocks.splice(zoneIndex, 1);
    }
  }

  function releaseWorkerReservation(worker) {
    if (worker.targetSlot && worker.targetSlot.reservedBy === worker) {
      worker.targetSlot.reservedBy = null;
    }
    worker.targetSlot = null;
    worker.targetZone = null;
  }

  function deliverWorkerBlock(worker) {
    const block = worker.targetBlock;
    const zone = worker.targetZone;
    const slot = worker.targetSlot;

    if (block && zone && slot) {
      const height = (block.mesh.geometry.parameters && block.mesh.geometry.parameters.height) || 0.4;
      block.mesh.visible = true;
      block.mesh.position.set(
        slot.x + randomBetween(-0.06, 0.06),
        slot.topY + height / 2,
        slot.z + randomBetween(-0.06, 0.06)
      );
      block.mesh.rotation.set(0, randomBetween(-0.12, 0.12), 0);
      block.delivered = true;
      block.claimedBy = null;

      slot.reservedBy = null;
      slot.blockMesh = block.mesh;

      const material = { mesh: block.mesh, zone, slot };
      materialBlocks.push(material);
      zone.blocks.push(material);

      const fallingIndex = fallingBlocks.indexOf(block);
      if (fallingIndex >= 0) {
        fallingBlocks.splice(fallingIndex, 1);
      }
      updateBlockCount();
      createLandingEffect(block.mesh.position, block.mesh.material.color);

      materialCollected += 1;
      updateMaterialCount();

      if (worker.speechCooldown <= 0) {
        showWorkerSpeech(worker, workerPlaceLines[Math.floor(Math.random() * workerPlaceLines.length)], 1.7);
      }

      const revealed = revealPreparation();
      if (materialCollected >= materialGoal && !materialGoalAnnounced) {
        materialGoalAnnounced = true;
        setTimedMessage(goalReachedMessage);
      } else if (!revealed && Math.random() < 0.4) {
        setTimedMessage(gatherMessages[Math.floor(Math.random() * gatherMessages.length)]);
      }
    } else if (block) {
      block.mesh.visible = true;
      block.delivered = true;
      block.claimedBy = null;
    }

    worker.targetBlock = null;
    worker.targetPoint = null;
    worker.dropOffPoint = null;
    worker.targetZone = null;
    worker.targetSlot = null;
    worker.carryMesh.visible = false;
    worker.state = "searching";
    worker.pauseTimer = randomBetween(0.28, 0.8);

    updateWorkerStatus();
  }

  function moveWorkerToward(worker, target, delta, speed) {
    const dx = target.x - worker.group.position.x;
    const dz = target.z - worker.group.position.z;
    const distance = Math.hypot(dx, dz);

    if (distance < 0.18) {
      return true;
    }

    const step = Math.min(distance, speed * delta);
    const nx = dx / distance;
    const nz = dz / distance;
    worker.group.position.x += nx * step;
    worker.group.position.z += nz * step;
    worker.group.rotation.y = Math.atan2(nx, nz);
    return false;
  }

  function chooseWorkerSpeech(context) {
    if (context === "inspect") {
      return Math.random() < 0.28 ? "まだ なまえがない" : "これ、つかえそう";
    }

    if (context === "carry") {
      return Math.random() < 0.35 ? "ここに はこぼう" : workerSpeechLines[Math.floor(Math.random() * workerSpeechLines.length)];
    }

    return workerSpeechLines[Math.floor(Math.random() * workerSpeechLines.length)];
  }

  function showWorkerSpeech(worker, line, duration = 2) {
    activeSpeechWorker = worker;
    workerSpeechUntil = clock.elapsedTime + duration;
    workerSpeech.textContent = line;
    workerSpeech.style.display = "block";
    worker.speechCooldown = randomBetween(2.2, 4.2);
    messageText.textContent = `作業員「${line}」`;
  }

  function updateWorkerSpeech(elapsed) {
    if (!activeSpeechWorker || elapsed > workerSpeechUntil || !workersEnabled) {
      hideWorkerSpeech();
      return;
    }

    const position = activeSpeechWorker.group.position.clone();
    position.y += 1.7;
    position.project(camera);

    if (position.z < -1 || position.z > 1) {
      workerSpeech.style.display = "none";
      return;
    }

    const width = renderer.domElement.clientWidth;
    const height = renderer.domElement.clientHeight;
    const x = (position.x * 0.5 + 0.5) * width;
    const y = (-position.y * 0.5 + 0.5) * height;

    workerSpeech.style.display = "block";
    workerSpeech.style.left = `${x}px`;
    workerSpeech.style.top = `${y}px`;
  }

  function hideWorkerSpeech() {
    activeSpeechWorker = null;
    workerSpeechUntil = 0;
    workerSpeech.style.display = "none";
  }

  function distance2D(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
  }

  function toggleBlockRain() {
    rainEnabled = !rainEnabled;
    updateRainButton();
    setTimedMessage(rainEnabled ? rainOnMessage : rainOffMessage);

    if (rainEnabled) {
      nextBlockDropAt = clock.elapsedTime + 0.35;
    }
  }

  function updateRainButton() {
    rainToggleButton.textContent = rainEnabled ? "ブロックの雨 ON" : "ブロックの雨 OFF";
    rainToggleButton.classList.toggle("is-active", rainEnabled);
  }

  function updateBlockCount() {
    blockCount.textContent = String(fallingBlocks.length);
  }

  function spawnBlockBurst(amount) {
    for (let i = 0; i < amount; i += 1) {
      spawnFallingBlock(i * 0.16);
    }
  }

  function spawnFallingBlock(stagger = 0) {
    pruneFallingBlocks();

    const zone = chooseDropZone();
    const landing = chooseLandingPoint(zone);
    const size = {
      x: randomBetween(0.38, 0.78),
      y: randomBetween(0.3, 0.72),
      z: randomBetween(0.38, 0.82),
    };
    const color = fallingPalette[Math.floor(Math.random() * fallingPalette.length)];
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.02 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
    const startY = randomBetween(7.2, 10.4) + stagger * 2.2;
    const fallLeanX = randomBetween(-0.42, 0.42);
    const fallLeanZ = randomBetween(-0.42, 0.42);
    const pileLift = Math.min(0.56, zone.landings * 0.014) + randomBetween(0, 0.1);

    mesh.position.set(landing.x + fallLeanX, startY, landing.z + fallLeanZ);
    mesh.rotation.set(
      randomBetween(-0.42, 0.42),
      randomBetween(0, Math.PI),
      randomBetween(-0.42, 0.42)
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    fallingBlocks.push({
      mesh,
      zone,
      state: "falling",
      targetX: landing.x,
      targetZ: landing.z,
      targetY: 0.1 + size.y / 2 + pileLift,
      fallSpeed: randomBetween(2.25, 3.65),
      driftX: (landing.x - mesh.position.x) * randomBetween(0.18, 0.32),
      driftZ: (landing.z - mesh.position.z) * randomBetween(0.18, 0.32),
      rotationSpeed: new THREE.Vector3(
        randomBetween(-1.8, 1.8),
        randomBetween(-2.2, 2.2),
        randomBetween(-1.5, 1.5)
      ),
      bounceTime: 0,
      bounceDuration: randomBetween(0.28, 0.42),
      finalRotationY: randomBetween(-0.5, 0.5),
      claimedBy: null,
      delivered: false,
    });

    updateBlockCount();
  }

  function chooseDropZone() {
    const totalWeight = dropZones.reduce((sum, zone) => sum + zone.weight, 0);
    let pick = Math.random() * totalWeight;

    for (const zone of dropZones) {
      pick -= zone.weight;
      if (pick <= 0) {
        return zone;
      }
    }

    return dropZones[0];
  }

  function chooseLandingPoint(zone) {
    let x = zone.x + randomBetween(-zone.radiusX, zone.radiusX);
    let z = zone.z + randomBetween(-zone.radiusZ, zone.radiusZ);
    const distanceFromHero = Math.hypot(x - heroStartPosition.x, z - heroStartPosition.z);

    if (distanceFromHero < 1.35) {
      z -= 1.45;
      x += x < heroStartPosition.x ? -0.45 : 0.45;
    }

    // 中央の作りかけ構造の上には積まない。材料は構造の周りにリング状に集まる。
    const buildDx = x - centralBuildCenter.x;
    const buildDz = z - centralBuildCenter.z;
    if (Math.abs(buildDx) < 0.95 && Math.abs(buildDz) < 0.7) {
      if (Math.abs(buildDx) / 0.95 >= Math.abs(buildDz) / 0.7) {
        x = centralBuildCenter.x + (buildDx >= 0 ? 1 : -1) * randomBetween(0.95, 1.5);
      } else {
        z = centralBuildCenter.z + (buildDz >= 0 ? 1 : -1) * randomBetween(0.7, 1.3);
      }
    }

    return {
      x: THREE.MathUtils.clamp(x, -6.5, 6.5),
      z: THREE.MathUtils.clamp(z, -6.5, 6.5),
    };
  }

  function updateFallingBlockRain(elapsed, delta) {
    if (rainEnabled && elapsed >= nextBlockDropAt) {
      spawnFallingBlock();
      nextBlockDropAt = elapsed + randomBetween(1.25, 2.05);
    }

    for (const block of fallingBlocks) {
      if (block.state === "falling") {
        block.mesh.position.y -= block.fallSpeed * delta;
        block.mesh.position.x += block.driftX * delta;
        block.mesh.position.z += block.driftZ * delta;
        block.mesh.rotation.x += block.rotationSpeed.x * delta;
        block.mesh.rotation.y += block.rotationSpeed.y * delta;
        block.mesh.rotation.z += block.rotationSpeed.z * delta;

        if (block.mesh.position.y <= block.targetY) {
          block.mesh.position.set(block.targetX, block.targetY, block.targetZ);
          block.mesh.rotation.x *= 0.45;
          block.mesh.rotation.y = block.finalRotationY;
          block.mesh.rotation.z *= 0.45;
          block.state = "bouncing";
          block.zone.landings += 1;
          createLandingEffect(block.mesh.position, block.mesh.material.color);
        }
      } else if (block.state === "bouncing") {
        block.bounceTime += delta;
        const progress = THREE.MathUtils.clamp(block.bounceTime / block.bounceDuration, 0, 1);
        const hop = Math.sin(progress * Math.PI) * 0.16 * (1 - progress);
        block.mesh.position.y = block.targetY + hop;
        block.mesh.rotation.y += 0.4 * delta * (1 - progress);

        if (progress >= 1) {
          block.mesh.position.y = block.targetY;
          block.state = "settled";
        }
      }
    }

    updateLandingEffects(delta);
  }

  function createLandingEffect(position, color) {
    const effectMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    const effect = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.018, 28), effectMaterial);
    effect.position.set(position.x, 0.11, position.z);
    effect.scale.set(0.38, 1, 0.38);
    scene.add(effect);
    landingEffects.push({ mesh: effect, age: 0, duration: 0.52 });
  }

  function updateLandingEffects(delta) {
    for (let i = landingEffects.length - 1; i >= 0; i -= 1) {
      const effect = landingEffects[i];
      effect.age += delta;
      const progress = THREE.MathUtils.clamp(effect.age / effect.duration, 0, 1);
      const scale = 0.38 + progress * 1.35;
      effect.mesh.scale.set(scale, 1, scale);
      effect.mesh.material.opacity = 0.34 * (1 - progress);

      if (progress >= 1) {
        scene.remove(effect.mesh);
        disposeObject(effect.mesh);
        landingEffects.splice(i, 1);
      }
    }
  }

  function pruneFallingBlocks() {
    while (fallingBlocks.length >= fallingBlockLimit) {
      const settledIndex = fallingBlocks.findIndex((block) => block.state === "settled" && !block.claimedBy);
      const removeIndex = settledIndex >= 0 ? settledIndex : 0;
      const [removed] = fallingBlocks.splice(removeIndex, 1);

      if (removed.claimedBy) {
        const owner = removed.claimedBy;
        releaseWorkerReservation(owner);
        owner.targetBlock = null;
        owner.targetPoint = null;
        owner.dropOffPoint = null;
        owner.carryMesh.visible = false;
        owner.state = "searching";
      }

      scene.remove(removed.mesh);
      disposeObject(removed.mesh);
    }
  }

  function disposeObject(object) {
    object.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }

      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function setMode(mode, options = {}) {
    currentMode = mode;
    const isOutside = mode === MODES.OUTSIDE;

    outsideButton.classList.toggle("is-active", isOutside);
    heroButton.classList.toggle("is-active", !isOutside);
    modeLabel.textContent = isOutside ? "外側から見るモード" : "主人公目線";

    if (controls) {
      controls.enabled = isOutside;
    }

    if (isOutside) {
      applyOutsideCamera();
      if (options.showInitialMessage) {
        setOpeningMessages();
      } else {
        setTimedMessage(outsideMessage);
      }
    } else {
      applyHeroCamera();
      setTimedMessage(heroMessage, heroMaterialMessage);
    }
  }

  function setOpeningMessages() {
    window.clearTimeout(initialMessageTimer);
    messageText.textContent = initialMessage;

    initialMessageTimer = window.setTimeout(() => {
      if (currentMode === MODES.OUTSIDE) {
        messageText.textContent = rainOnMessage;
      }

      initialMessageTimer = window.setTimeout(() => {
        if (currentMode === MODES.OUTSIDE) {
          messageText.textContent = centralMessage;
        }
      }, 2600);
    }, 2200);
  }

  function setTimedMessage(message, nextMessage) {
    window.clearTimeout(initialMessageTimer);
    messageText.textContent = message;

    if (nextMessage) {
      const modeAtCall = currentMode;
      initialMessageTimer = window.setTimeout(() => {
        if (currentMode === modeAtCall) {
          messageText.textContent = nextMessage;
        }
      }, 2400);
    }
  }

  function resetCameraForCurrentMode() {
    if (currentMode === MODES.OUTSIDE) {
      applyOutsideCamera();
      messageText.textContent = outsideMessage;
      return;
    }

    heroOffset = 0;
    heroLookSway = 0;
    applyHeroCamera();
    messageText.textContent = heroMessage;
  }

  function applyOutsideCamera() {
    camera.position.copy(outsideCameraPosition);
    camera.lookAt(outsideTarget);

    if (controls) {
      controls.target.copy(outsideTarget);
      controls.update();
    }
  }

  function applyHeroCamera() {
    const position = heroStartPosition.clone();
    position.x += heroOffset;
    camera.position.copy(position);

    const target = heroLookTarget.clone();
    target.x += heroOffset * 0.28 + heroLookSway;
    camera.lookAt(target);
  }

  function handleHeroKeys(event) {
    if (currentMode !== MODES.HERO) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key !== "arrowleft" && key !== "arrowright" && key !== "a" && key !== "d") {
      return;
    }

    event.preventDefault();
    const direction = key === "arrowleft" || key === "a" ? -1 : 1;
    heroOffset = THREE.MathUtils.clamp(heroOffset + direction * 0.25, -1.2, 1.2);
    heroLookSway = THREE.MathUtils.clamp(heroLookSway + direction * 0.16, -0.32, 0.32);
    applyHeroCamera();
  }

  function resizeRenderer() {
    if (!renderer || !camera) {
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;

    animatedParts.forEach(({ object, baseY, speed, amount }, index) => {
      object.position.y = baseY + Math.sin(elapsed * speed + index) * amount;
    });

    updateFallingBlockRain(elapsed, delta);
    updateWorkerAgents(elapsed, delta);

    if (currentMode === MODES.HERO && Math.abs(heroLookSway) > 0.001) {
      heroLookSway *= 0.92;
      applyHeroCamera();
    }

    if (controls && controls.enabled) {
      controls.update();
    }

    updateWorkerSpeech(elapsed);
    renderer.render(scene, camera);
  }
})();
