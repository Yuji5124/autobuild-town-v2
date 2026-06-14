(() => {
  const titleScreen = document.getElementById("title-screen");
  const gameScreen = document.getElementById("game-screen");
  const sceneContainer = document.getElementById("scene-container");
  const startButton = document.getElementById("start-button");
  const outsideButton = document.getElementById("outside-button");
  const heroButton = document.getElementById("hero-button");
  const resetButton = document.getElementById("reset-button");
  const modeLabel = document.getElementById("mode-label");
  const messageText = document.getElementById("message-text");

  const MODES = {
    OUTSIDE: "outside",
    HERO: "hero",
  };

  const outsideMessage = "外から見ると、町はまだ未完成の構造物に見える。";
  const heroMessage = "中に入ると、同じ町が少し違って見える。";
  const initialMessage = "名前のない町が、まだ何かを作りたがっている。";

  const outsideCameraPosition = new THREE.Vector3(9.5, 7.2, 10.5);
  const outsideTarget = new THREE.Vector3(0, 0.9, 0);
  const heroStartPosition = new THREE.Vector3(-3.5, 1.35, 4.15);
  const heroLookTarget = new THREE.Vector3(0.25, 2.1, 0.25);

  let scene;
  let camera;
  let renderer;
  let controls;
  let currentMode = MODES.OUTSIDE;
  let heroOffset = 0;
  let animationStarted = false;
  let initialMessageTimer = null;
  const clock = new THREE.Clock();
  const animatedParts = [];

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
    controls.minDistance = 5;
    controls.maxDistance = 24;
    controls.maxPolarAngle = Math.PI * 0.48;

    addLights();
    createDioramaBase();
    createTownObjects();

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
      new THREE.BoxGeometry(3.2, 0.06, 2.4),
      new THREE.MeshStandardMaterial({ color: 0xf5d98b, roughness: 0.82 })
    );
    lot.position.set(0, 0.07, 0);
    lot.receiveShadow = true;
    scene.add(lot);

    addLowFence(-1.85, -1.35, 3.7, true);
    addLowFence(-1.85, 1.35, 3.7, true);
    addLowFence(-1.85, -1.35, 2.7, false);
    addLowFence(1.85, -1.35, 2.7, false);
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

  function createTownObjects() {
    createColorBlocks();
    createHomes();
    createTower();
    createRocket();
    createRobot(-4.2, 0.1, -2.6, 0x4aa3ff);
    createRobot(3.2, 0.1, 2.8, 0xffcc4d);
    createResident(-1.2, 0.1, 2.9, 0xff7f7f);
    createResident(2.4, 0.1, -1.4, 0x7bdb83);
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

  function addBlock(x, z, width, height, depth, color, rotation = 0) {
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.02 });
    const block = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    block.position.set(x, height / 2 + 0.07, z);
    block.rotation.y = rotation;
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
    group.position.set(-0.9, 0.08, -5.0);

    const colors = [0x8fd3ff, 0xffcf4a, 0xff7f7f, 0x80e0a5];
    for (let i = 0; i < 5; i += 1) {
      const section = new THREE.Mesh(
        new THREE.BoxGeometry(0.95 - i * 0.06, 0.7, 0.95 - i * 0.06),
        new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.72 })
      );
      section.position.y = 0.35 + i * 0.68;
      section.rotation.y = i * 0.18;
      section.castShadow = true;
      section.receiveShadow = true;
      group.add(section);
    }

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.72, 0.92, 5),
      new THREE.MeshStandardMaterial({ color: 0xff8f5a, roughness: 0.72 })
    );
    roof.position.y = 3.9;
    roof.castShadow = true;
    group.add(roof);

    scene.add(group);
  }

  function createRocket() {
    const group = new THREE.Group();
    group.position.set(5.0, 0.12, 0.4);
    group.rotation.z = -0.08;

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.42, 2.25, 24),
      new THREE.MeshStandardMaterial({ color: 0xf7f7f7, roughness: 0.48 })
    );
    body.position.y = 1.25;
    body.castShadow = true;
    group.add(body);

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.36, 0.72, 24),
      new THREE.MeshStandardMaterial({ color: 0xff5f6d, roughness: 0.58 })
    );
    nose.position.y = 2.74;
    nose.castShadow = true;
    group.add(nose);

    const windowMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 18, 12),
      new THREE.MeshStandardMaterial({ color: 0x4d96ff, roughness: 0.25 })
    );
    windowMesh.position.set(0, 1.66, 0.36);
    group.add(windowMesh);

    const finMaterial = new THREE.MeshStandardMaterial({ color: 0xffcf4a, roughness: 0.72 });
    [-1, 1].forEach((side) => {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.46), finMaterial);
      fin.position.set(side * 0.38, 0.35, 0);
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

    animatedParts.push({ object: group, baseY: y, speed: 1.8 + animatedParts.length * 0.18, amount: 0.035 });
    scene.add(group);
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

    scene.add(group);
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
      setTimedMessage(options.showInitialMessage ? initialMessage : outsideMessage, outsideMessage);
    } else {
      applyHeroCamera();
      setTimedMessage(heroMessage);
    }
  }

  function setTimedMessage(message, nextMessage) {
    window.clearTimeout(initialMessageTimer);
    messageText.textContent = message;

    if (nextMessage) {
      initialMessageTimer = window.setTimeout(() => {
        if (currentMode === MODES.OUTSIDE) {
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
    target.x += heroOffset * 0.35;
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
    heroOffset = THREE.MathUtils.clamp(heroOffset + direction * 0.28, -1.35, 1.35);
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
    const elapsed = clock.getElapsedTime();

    animatedParts.forEach(({ object, baseY, speed, amount }, index) => {
      object.position.y = baseY + Math.sin(elapsed * speed + index) * amount;
    });

    if (controls && controls.enabled) {
      controls.update();
    }

    renderer.render(scene, camera);
  }
})();
