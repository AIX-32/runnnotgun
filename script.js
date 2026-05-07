import * as THREE from 'three';

        function loadCustomFigures() {
            const stored = localStorage.getItem('rngCustomFigures');
            return stored ? JSON.parse(stored) : [];
        }

        let customFigures = loadCustomFigures();

        const PS1_W = 320;
        const PS1_H = 240;
        const canvas = document.getElementById('game');
        canvas.width = PS1_W;
        canvas.height = PS1_H;

        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x8899aa, 30, 2500);

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
        renderer.setPixelRatio(1);
        renderer.setSize(PS1_W, PS1_H, false);
        renderer.shadowMap.enabled = false;
        renderer.setClearColor(0x8899aa, 1);

        const camera = new THREE.PerspectiveCamera(75, PS1_W / PS1_H, 0.1, 5000);
        camera.position.set(0, 1.7, 0);
        let baseFov = 75;
        let zoomFov = 35;
        let targetFov = baseFov;

        const sunLight = new THREE.DirectionalLight(0xffe8c0, 1.2);
        sunLight.position.set(50, 100, 50);
        scene.add(sunLight);
        const ambientLight = new THREE.AmbientLight(0x667788, 0.6);
        scene.add(ambientLight);

        const SKY_R = 2500;
        const skyGeo = new THREE.SphereGeometry(SKY_R, 32, 16);
        const skyMat = new THREE.MeshBasicMaterial({
            color: 0x8899aa,
            side: THREE.BackSide,
            fog: false
        });
        const skyMesh = new THREE.Mesh(skyGeo, skyMat);
        camera.add(skyMesh);
        scene.add(camera);

        const loader = new THREE.TextureLoader();

        let dirtSplashTex;
        loader.load('assets/images/dirtsplash.png', tex => {
            tex.minFilter = tex.magFilter = THREE.NearestFilter;
            dirtSplashTex = tex;
        });

        let sunMesh, moonMesh;

        loader.load('assets/images/sun.png', sunTex => {
            sunTex.minFilter = sunTex.magFilter = THREE.NearestFilter;
            const sunAspect = sunTex.image.width / sunTex.image.height;
            const SUN_SIZE = 400;
            const sunGeo = new THREE.PlaneGeometry(SUN_SIZE * sunAspect, SUN_SIZE);
            const sunMat = new THREE.MeshBasicMaterial({ map: sunTex, transparent: true, alphaTest: 0.1, fog: false, depthTest: true, depthWrite: false, side: THREE.DoubleSide });
            sunMesh = new THREE.Mesh(sunGeo, sunMat);
            scene.add(sunMesh);
        });

        loader.load('assets/images/moon.png', moonTex => {
            moonTex.minFilter = moonTex.magFilter = THREE.NearestFilter;
            const moonAspect = moonTex.image.width / moonTex.image.height;
            const MOON_SIZE = 100;
            const moonGeo = new THREE.PlaneGeometry(MOON_SIZE * moonAspect, MOON_SIZE);
            const moonMat = new THREE.MeshBasicMaterial({ map: moonTex, transparent: true, alphaTest: 0.1, fog: false, depthTest: true, depthWrite: false, side: THREE.DoubleSide });
            moonMesh = new THREE.Mesh(moonGeo, moonMat);
            moonMesh.renderOrder = 999;
            scene.add(moonMesh);
        });

        let handsMesh;
        let handsTargetX = 0;
        let handsTargetZ = -2;

        const handsTextures = {};
        function loadHandsTexture(name) {
            return new Promise(resolve => {
                loader.load('assets/images/' + name, tex => {
                    tex.minFilter = tex.magFilter = THREE.NearestFilter;
                    handsTextures[name] = tex;
                    resolve();
                });
            });
        }

        Promise.all([
            loadHandsTexture('hands.png'),
            loadHandsTexture('hand2.png'),
            loadHandsTexture('hand3.png')
        ]).then(() => {
            const { equipped } = loadShopData();
            const handImage = equipped.hands && handsTextures[equipped.hands + '.png'] ? equipped.hands + '.png' : 'hands.png';
            const tex = handsTextures[handImage];
            const handsGeo = new THREE.PlaneGeometry(2.5, 2.5);
            const handsMat = new THREE.MeshBasicMaterial({
                map: tex,
                transparent: true,
                alphaTest: 0.1,
                side: THREE.DoubleSide,
                depthTest: false,
                depthWrite: false
            });
            handsMesh = new THREE.Mesh(handsGeo, handsMat);
            handsMesh.position.set(0, -1.0, -2.5);
            handsMesh.visible = false;
            handsMesh.renderOrder = 999;
            camera.add(handsMesh);

            let handsItemMesh;
            handsItemMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(1.1, 1.1),
                new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.1, side: THREE.DoubleSide, depthTest: false, depthWrite: false, renderOrder: 1000 })
            );
            handsItemMesh.position.set(0, -0.25, -1.8);
            handsItemMesh.visible = false;
            camera.add(handsItemMesh);
            window.handsItemMesh = handsItemMesh;

            scene.add(camera);
        });

        function updateCelestialBodies() {
            let hour;
            if (useCustomTime) {
                const timeParts = customTimeValue.split(':');
                hour = parseInt(timeParts[0]) + parseInt(timeParts[1]) / 60;
            } else {
                const now = new Date();
                hour = now.getHours() + now.getMinutes() / 60;
            }
            const angle = ((hour - 6) / 24) * Math.PI * 2;

            if (sunMesh) sunMesh.position.set(
                Math.cos(angle) * 1800,
                Math.sin(angle) * 1800,
                -1500
            );
            if (sunMesh) sunMesh.visible = Math.sin(angle) > 0;
            if (moonMesh) moonMesh.position.set(
                Math.cos(angle + Math.PI) * 1800,
                Math.sin(angle + Math.PI) * 1800,
                -1500
            );
            if (moonMesh) moonMesh.visible = Math.sin(angle) < 0;
            if (sunMesh) {
                sunMesh.lookAt(camera.position);
                sunLight.position.copy(sunMesh.position);
            }
            if (moonMesh) moonMesh.lookAt(camera.position);
        }

        let useCustomTime = localStorage.getItem('rngUseCustomTime') === 'true';
        let customTimeValue = localStorage.getItem('rngCustomTime') || '12:00';

        function updateDayNight() {
            let hour;
            if (useCustomTime) {
                const timeParts = customTimeValue.split(':');
                hour = parseInt(timeParts[0]) + parseInt(timeParts[1]) / 60;
            } else {
                const now = new Date();
                hour = now.getHours() + now.getMinutes() / 60;
            }
            const dayProgress = hour / 24;

            const nightAmt = Math.abs(dayProgress - 0.5) * 2;
            const isNight = hour < 6 || hour > 18;
            const darkness = Math.max(0, Math.min(1, nightAmt * 0.7));

            const lightIntensity = 1.2 * (1 - darkness * 0.7);
            sunLight.intensity = lightIntensity;

            const ambientIntensity = 0.6 * (1 - darkness * 0.6);
            ambientLight.intensity = ambientIntensity;

            if (isNight) {
                sunLight.color.setHex(0x8899bb);
                ambientLight.color.setHex(0x334466);
                skyMat.color.setRGB(
                    0.1 * (1 - darkness),
                    0.12 * (1 - darkness),
                    0.3 * (1 - darkness) + darkness * 0.4
                );
            } else {
                sunLight.color.setHex(0xffe8c0);
                ambientLight.color.setHex(0x667788);
                skyMat.color.setRGB(
                    0.29 * (1 - darkness * 0.3),
                    0.47 * (1 - darkness * 0.3),
                    0.72 * (1 - darkness * 0.3)
                );
            }

            scene.fog.color.setHex(isNight ? 0x1a1a2e : 0x8899aa);
            scene.fog.near = 30 * (1 - darkness * 0.5);
            scene.fog.far = 800 * (1 - darkness * 0.4);
        }
        updateDayNight();

        function makeNoiseTexture(w, h, baseR, baseG, baseB, spread, pixSize) {
            const off = document.createElement('canvas');
            off.width = w; off.height = h;
            const ctx = off.getContext('2d');
            const bw = Math.ceil(w / pixSize);
            const bh = Math.ceil(h / pixSize);
            for (let bx = 0; bx < bw; bx++) {
                for (let by = 0; by < bh; by++) {
                    const n = (Math.random() - 0.5) * spread;
                    const r = Math.min(255, Math.max(0, baseR + n));
                    const g = Math.min(255, Math.max(0, baseG + n * 1.2));
                    const b = Math.min(255, Math.max(0, baseB + n * 0.6));
                    ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
                    ctx.fillRect(bx * pixSize, by * pixSize, pixSize, pixSize);
                }
            }
            const tex = new THREE.CanvasTexture(off);
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.minFilter = tex.magFilter = THREE.NearestFilter;
            return tex;
        }

        const MAP_SIZE = 3200;
        const TERRAIN_SEGMENTS = 128;

        const mountains = [
            { x: 250, z: -250, radius: 300, height: 100 },
            { x: -400, z: 350, radius: 250, height: 80 },
            { x: 600, z: 200, radius: 200, height: 70 },
            { x: -200, z: -500, radius: 180, height: 60 },
            { x: 800, z: -300, radius: 150, height: 50 },
            { x: -600, z: -100, radius: 200, height: 65 },
            { x: 100, z: 600, radius: 180, height: 55 },
            { x: -800, z: 100, radius: 120, height: 45 },
        ];

        const BIOME_SCALE = 0.004;

        function getBiome(x, z) {
            const n = Math.sin(x * BIOME_SCALE) * Math.cos(z * BIOME_SCALE * 0.7) +
                Math.sin(x * BIOME_SCALE * 1.5 + 2.1) * Math.cos(z * BIOME_SCALE * 1.3) * 0.5;
            return n > 0.3;
        }

        function baseNoise(x, z) {
            return Math.sin(x * 0.05) * Math.cos(z * 0.05) * 2 +
                Math.sin(x * 0.02 + 1.3) * Math.cos(z * 0.03) * 4 +
                Math.sin(x * 0.08) * Math.cos(z * 0.07) * 1;
        }

        function getMountainAmount(x, z) {
            let totalHeight = 0;
            for (const m of mountains) {
                const dx = x - m.x;
                const dz = z - m.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < m.radius) {
                    const t = 1 - dist / m.radius;
                    const smooth = t * t * (3 - 2 * t);
                    totalHeight += m.height * smooth * smooth;
                }
            }
            return totalHeight;
        }

        function getWorldHeight(x, z) {
            return baseNoise(x, z) + getMountainAmount(x, z);
        }

        const groundGeo = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
        const posAttr = groundGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const wx = posAttr.getX(i);
            const wz = -posAttr.getY(i);
            const h = getWorldHeight(wx, wz);
            posAttr.setZ(i, h);
        }
        groundGeo.computeVertexNormals();

        const grassTex = makeNoiseTexture(256, 256, 42, 64, 10, 30, 8);
        grassTex.repeat.set(100, 100);
        const groundMat = new THREE.MeshLambertMaterial({ map: grassTex });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        scene.add(ground);

let wallMat;
        loader.load('assets/images/otherwall.png', tex => {
            tex.minFilter = tex.magFilter = THREE.NearestFilter;
            tex.wrapS = THREE.RepeatWrapping;
            tex.repeat.set(20, 1);
            const wallHeight = tex.image.height * 0.2;
            const wallLen = MAP_SIZE + 200;
            const wallGeo = new THREE.PlaneGeometry(wallLen, wallHeight);
            wallMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1 });

            const halfMap = MAP_SIZE / 2;

            const wallN = new THREE.Mesh(wallGeo, wallMat);
            wallN.position.set(0, wallHeight / 2, -halfMap);
            wallN.renderOrder = 998;
            scene.add(wallN);

            const wallS = new THREE.Mesh(wallGeo.clone(), wallMat);
            wallS.position.set(0, wallHeight / 2, halfMap);
            wallS.rotation.y = Math.PI;
            wallS.renderOrder = 998;
            scene.add(wallS);

            const wallW = new THREE.Mesh(wallGeo.clone(), wallMat);
            wallW.position.set(-halfMap, wallHeight / 2, 0);
            wallW.rotation.y = Math.PI / 2;
            wallW.renderOrder = 998;
            scene.add(wallW);

            const wallE = new THREE.Mesh(wallGeo.clone(), wallMat);
            wallE.position.set(halfMap, wallHeight / 2, 0);
            wallE.rotation.y = -Math.PI / 2;
            wallE.renderOrder = 998;
            scene.add(wallE);
        });

        function getTerrainHeight(x, z) {
            return getWorldHeight(x, z);
        }

        let treeMat, rockMat;
        const billboards = [];
        const trees = [];
        const rocks = [];

        function createTree() {
            loader.load('assets/images/tree.png', tex => {
                tex.minFilter = tex.magFilter = THREE.NearestFilter;
                const tree1Aspect = tex.image.width / tex.image.height;
                const tree1Geo = new THREE.PlaneGeometry(22 * tree1Aspect, 22);
                const tree1Mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.FrontSide });

                loader.load('assets/images/tree2.png', tex2 => {
                    tex2.minFilter = tex2.magFilter = THREE.NearestFilter;
                    const tree2Aspect = tex2.image.width / tex2.image.height;
                    const tree2Geo = new THREE.PlaneGeometry(22 * tree2Aspect, 22);
                    const tree2Mat = new THREE.MeshLambertMaterial({ map: tex2, transparent: true, alphaTest: 0.1, side: THREE.FrontSide });

                    loader.load('assets/images/tree3.png', tex3 => {
                        tex3.minFilter = tex3.magFilter = THREE.NearestFilter;
                        const tree3Aspect = tex3.image.width / tex3.image.height;
                        const tree3Geo = new THREE.PlaneGeometry(22 * tree3Aspect, 22);
                        const tree3Mat = new THREE.MeshLambertMaterial({ map: tex3, transparent: true, alphaTest: 0.1, side: THREE.FrontSide });

                        window.treeTextures = {
                            'tree.png': tex,
                            'tree2.png': tex2,
                            'tree3.png': tex3
                        };
                        window.treeAspects = {
                            'tree.png': tree1Aspect,
                            'tree2.png': tree2Aspect,
                            'tree3.png': tree3Aspect
                        };

                        const FOREST_TREE_COUNT = 1600;
                        const PLAINS_TREE_COUNT = 40;

                        function trySpawnTree() {
                            const x = (Math.random() - 0.5) * MAP_SIZE * 0.9;
                            const z = (Math.random() - 0.5) * MAP_SIZE * 0.9;
                            if (Math.abs(x) < 25 && Math.abs(z) < 45) return false;

                            const isForest = getBiome(x, z);
                            if (!isForest && Math.random() > 0.15) return false;

                            const r = Math.random();
                            let useTree = 1;
                            if (r > 0.66) useTree = 3;
                            else if (r > 0.33) useTree = 2;

                            const geo = useTree === 3 ? tree3Geo : (useTree === 2 ? tree2Geo : tree1Geo);
                            const mat = useTree === 3 ? tree3Mat : (useTree === 2 ? tree2Mat : tree1Mat);
                            const aspect = useTree === 3 ? tree3Aspect : (useTree === 2 ? tree2Aspect : tree1Aspect);

                            const scale = 0.8 + Math.random() * 0.8;
                            const tree = new THREE.Mesh(geo, mat);
                            const terrainH = getTerrainHeight(x, z);
                            tree.position.set(x, terrainH + 22 / 2 * scale, z);
                            tree.scale.setScalar(scale);
                            tree.userData.baseY = terrainH + 22 / 2 * scale;
                            tree.userData.isTree = true;
                            scene.add(tree);
                            billboards.push(tree);
                            trees.push(tree);
                            return true;
                        }

                        let treeAttempts = 0;
                        while (trees.length < FOREST_TREE_COUNT + PLAINS_TREE_COUNT && treeAttempts < 15000) {
                            if (trySpawnTree()) {
                                treeAttempts++;
                            }
                            treeAttempts++;
                        }
                    });
                });
            });
        }
        createTree();

        loader.load('assets/images/rock.png', tex => {
            tex.minFilter = tex.magFilter = THREE.NearestFilter;
            const aspect = tex.image.width / tex.image.height;
            const ROCK_H = 2;
const rockGeo = new THREE.PlaneGeometry(ROCK_H * aspect, ROCK_H);
        rockMat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.FrontSide });

const FOREST_ROCK_COUNT = 300;
        const PLAINS_ROCK_COUNT = 30;

        let rockAttempts = 0;
        while (rocks.length < FOREST_ROCK_COUNT + PLAINS_ROCK_COUNT && rockAttempts < 5000) {
            const x = (Math.random() - 0.5) * MAP_SIZE * 0.85;
            const z = (Math.random() - 0.5) * MAP_SIZE * 0.85;
            if (Math.abs(x) < 20 && Math.abs(z) < 40) {
                rockAttempts++;
                continue;
            }
            const isForest = getBiome(x, z);
            if (!isForest && Math.random() > 0.12) {
                rockAttempts++;
                continue;
            }
            const scale = 1.0 + Math.random() * 1.0;
            const rock = new THREE.Mesh(rockGeo, rockMat);
            const rockTerrainH = getTerrainHeight(x, z);
            rock.position.set(x, rockTerrainH + ROCK_H / 2 * scale, z);
            rock.scale.setScalar(scale);
            rock.userData.baseY = rockTerrainH + ROCK_H / 2 * scale;
            rock.userData.isTree = false;
            scene.add(rock);
            billboards.push(rock);
            rocks.push(rock);
            rockAttempts++;
        }
    });

        let bushMesh = null;
        loader.load('assets/images/bush.png', tex => {
            tex.minFilter = tex.magFilter = THREE.NearestFilter;
            const aspect = tex.image.width / tex.image.height;
            const BUSH_H = 4;
const bushGeo = new THREE.PlaneGeometry(BUSH_H * aspect, BUSH_H);
        bushMesh = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.FrontSide });

        const FOREST_BUSH_COUNT = 250;
        const PLAINS_BUSH_COUNT = 30;

        let bushAttempts = 0;
        while (billboards.filter(b => b.userData.isBush).length < FOREST_BUSH_COUNT + PLAINS_BUSH_COUNT && bushAttempts < 5000) {
            const x = (Math.random() - 0.5) * MAP_SIZE * 0.85;
            const z = (Math.random() - 0.5) * MAP_SIZE * 0.85;
            if (Math.abs(x) < 20 && Math.abs(z) < 40) {
                bushAttempts++;
                continue;
            }
            const isForest = getBiome(x, z);
            if (!isForest && Math.random() > 0.1) {
                bushAttempts++;
                continue;
            }
            const scale = 1.0 + Math.random() * 1.0;
            const bush = new THREE.Mesh(bushGeo, bushMesh);
            const bushTerrainH = getTerrainHeight(x, z);
            bush.position.set(x, bushTerrainH + BUSH_H / 2 * scale, z);
            bush.scale.setScalar(scale);
            bush.userData.baseY = bushTerrainH + BUSH_H / 2 * scale;
            bush.userData.isBush = true;
            scene.add(bush);
            billboards.push(bush);
            bushAttempts++;
        }
    });

        let figureMaterial;
        let itemMeshes = [];
        let bearTrapMesh = null;
        let flareMesh = null;
        let machineMeshes = [];
        let machines = [];
        let puzzleMeshes = [];
        let puzzles = [];
        let cellTowers = [];
        let nearCellTower = null;
        let nearPuzzle = null;
        let puzzleGrid = [null, null, null, null, null, null];
        let puzzleSelectedSlot = null;
        let isPuzzleActive = false;

        const puzzleItemTypes = ['bear', 'gem', 'flaregun', 'bear', 'gem', 'flaregun'];

        loader.load('assets/images/bear.png', tex => {
            tex.minFilter = tex.magFilter = THREE.NearestFilter;
            const aspect = tex.image.width / tex.image.height;
            const bearGeo = new THREE.PlaneGeometry(2 * aspect, 2);
            const bearMat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.FrontSide });
            bearTrapMesh = new THREE.Mesh(bearGeo, bearMat);
            bearTrapMesh.visible = false;
            bearTrapMesh.userData.isTrap = true;
            scene.add(bearTrapMesh);
            billboards.push(bearTrapMesh);
        });

        loader.load('assets/images/flare.png', tex => {
            tex.minFilter = tex.magFilter = THREE.NearestFilter;
            const FLARE_H = 4;
            const aspect = tex.image.width / tex.image.height;
            const flareGeo = new THREE.PlaneGeometry(FLARE_H * aspect, FLARE_H);
            const flareMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.FrontSide });
            flareMesh = new THREE.Mesh(flareGeo, flareMat);
            flareMesh.visible = false;
            flareMesh.userData.isFlare = true;
            scene.add(flareMesh);
            billboards.push(flareMesh);
        });

        function spawnItem(type, x, z) {
            let texName;
            if (type === 'bear') texName = 'bear.png';
            else if (type === 'gem') texName = 'gem.png';
            else if (type === 'flaregun') texName = 'flaregun.png';
            else if (type === 'firework') texName = 'firework.png';
            const itemTerrainH = getTerrainHeight(x, z);
            loader.load(texName.startsWith('assets') ? texName : 'assets/images/' + texName, tex => {
                tex.minFilter = tex.magFilter = THREE.NearestFilter;
                const ITEM_H = type === 'flaregun' ? 2 : 1.5;
                const aspect = tex.image.width / tex.image.height;
                const itemGeo = new THREE.PlaneGeometry(ITEM_H * aspect, ITEM_H);
                const itemMat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.FrontSide });
                const item = new THREE.Mesh(itemGeo, itemMat);
                item.position.set(x, itemTerrainH + ITEM_H / 2, z);
                item.userData.itemType = type;
                item.userData.collected = false;
                scene.add(item);
                itemMeshes.push(item);
                billboards.push(item);
            });
        }

        for (let i = 0; i < 240; i++) {
            const x = (Math.random() - 0.5) * MAP_SIZE * 0.8;
            const z = (Math.random() - 0.5) * MAP_SIZE * 0.8;
            if (Math.abs(x) < 25 && Math.abs(z) < 50) continue;
            let type;
            if (i < 120) type = i % 2 === 0 ? 'bear' : 'gem';
            else if (i < 180) type = 'flaregun';
            else type = 'firework';
            spawnItem(type, x, z);
        }

        loader.load('assets/images/machine.png', tex => {
            tex.minFilter = tex.magFilter = THREE.NearestFilter;
            const aspect = tex.image.width / tex.image.height;
            const MACHINE_H = 3;
            const machineGeo = new THREE.PlaneGeometry(MACHINE_H * aspect, MACHINE_H);
            const machineMat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.FrontSide });

            for (let i = 0; i < 30; i++) {
                const x = (Math.random() - 0.5) * MAP_SIZE * 0.7;
                const z = (Math.random() - 0.5) * MAP_SIZE * 0.7;
                if (Math.abs(x) < 30 && Math.abs(z) < 60) continue;
                const machine = new THREE.Mesh(machineGeo, machineMat);
                const terrainH = getTerrainHeight(x, z);
                machine.position.set(x, terrainH + MACHINE_H / 2, z);
                machine.userData.isMachine = true;
                machine.userData.active = true;
                scene.add(machine);
                machineMeshes.push(machine);
                billboards.push(machine);
                machines.push({ x, z, active: true });
            }
        });

        loader.load('assets/images/puzzle.png', tex => {
            tex.minFilter = tex.magFilter = THREE.NearestFilter;
            const aspect = tex.image.width / tex.image.height;
            const PUZZLE_H = 3;
            const puzzleGeo = new THREE.PlaneGeometry(PUZZLE_H * aspect, PUZZLE_H);
            const puzzleMat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.FrontSide });

            for (let i = 0; i < 18; i++) {
                const x = (Math.random() - 0.5) * MAP_SIZE * 0.7;
                const z = (Math.random() - 0.5) * MAP_SIZE * 0.7;
                if (Math.abs(x) < 30 && Math.abs(z) < 60) continue;
                const puzzle = new THREE.Mesh(puzzleGeo, puzzleMat);
                const terrainH = getTerrainHeight(x, z);
                puzzle.position.set(x, terrainH + PUZZLE_H / 2, z);
                puzzle.userData.isPuzzle = true;
                puzzle.userData.solved = false;
                scene.add(puzzle);
                puzzleMeshes.push(puzzle);
                billboards.push(puzzle);
                puzzles.push({ x, z, solved: false });
            }
        });

        let cellTowerMeshes = [];
        loader.load('assets/images/celltower.png', tex => {
            tex.minFilter = tex.magFilter = THREE.NearestFilter;
            const aspect = tex.image.width / tex.image.height;
            const CELLTOWER_H = 100;
            const cellTowerGeo = new THREE.PlaneGeometry(CELLTOWER_H * aspect, CELLTOWER_H);
            const cellTowerMat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.FrontSide });

            const CELL_TOWER_MIN_DIST = 300;
            for (let i = 0; i < 10; i++) {
                let attempts = 0;
                let placed = false;
                while (!placed && attempts < 50) {
                    const x = (Math.random() - 0.5) * MAP_SIZE * 0.8;
                    const z = (Math.random() - 0.5) * MAP_SIZE * 0.8;
                    if (Math.abs(x) < 50 && Math.abs(z) < 80) { attempts++; continue; }

                    let tooClose = false;
                    for (const ct of cellTowers) {
                        const dx = x - ct.x;
                        const dz = z - ct.z;
                        if (Math.sqrt(dx * dx + dz * dz) < CELL_TOWER_MIN_DIST) {
                            tooClose = true;
                            break;
                        }
                    }
                    if (tooClose) { attempts++; continue; }

                    const cellTower = new THREE.Mesh(cellTowerGeo, cellTowerMat);
                    const terrainH = getTerrainHeight(x, z);
                    cellTower.position.set(x, terrainH + CELLTOWER_H / 2, z);
                    cellTower.userData.isCellTower = true;
                    scene.add(cellTower);
                    cellTowerMeshes.push(cellTower);
                    billboards.push(cellTower);
                    cellTowers.push({ x, z });
                    placed = true;
                }
            }
        });


        let portalMat = null;
        let portalGeo = null;
        let portalMeshes = [];
        let portalPoints = [];
        let portalUsesRemaining = 0;
        let portalCooldown = 0;
        let portalSpawnPending = false;

        function clearPortals() {
            for (const m of portalMeshes) {
                try { scene.remove(m); } catch { }
                const bbIndex = billboards.indexOf(m);
                if (bbIndex !== -1) billboards.splice(bbIndex, 1);
            }
            portalMeshes = [];
            portalPoints = [];
            portalUsesRemaining = 0;
            portalCooldown = 0;
            portalSpawnPending = false;
        }

        function spawnPortalPair() {
            clearPortals();
            if (!portalMat || !portalGeo) {
                portalSpawnPending = true;
                return;
            }
            portalSpawnPending = false;

            const triesMax = 200;
            const minSpawnDist = 220;
            const minFromCenter = 80;

            function randomPoint() {
                return {
                    x: (Math.random() - 0.5) * MAP_SIZE * 0.75,
                    z: (Math.random() - 0.5) * MAP_SIZE * 0.75
                };
            }

            let a = null, b = null;
            let tries = 0;
            while ((!a || !b) && tries < triesMax) {
                tries++;
                const p1 = randomPoint();
                if (Math.abs(p1.x) < minFromCenter && Math.abs(p1.z) < minFromCenter) continue;
                const p2 = randomPoint();
                if (Math.abs(p2.x) < minFromCenter && Math.abs(p2.z) < minFromCenter) continue;
                const dx = p1.x - p2.x;
                const dz = p1.z - p2.z;
                if (Math.sqrt(dx * dx + dz * dz) < minSpawnDist) continue;
                a = p1; b = p2;
            }
            if (!a || !b) return;

            portalPoints = [a, b];
            portalUsesRemaining = 2;

            for (const p of portalPoints) {
                const y = getTerrainHeight(p.x, p.z);
                const mesh = new THREE.Mesh(portalGeo, portalMat);
                mesh.position.set(p.x, y + 2.5, p.z);
                mesh.userData.isPortal = true;
                mesh.userData.spinOffset = Math.random() * Math.PI * 2;
                scene.add(mesh);
                portalMeshes.push(mesh);
                billboards.push(mesh);
            }
        }

        loader.load('assets/images/portal.png', tex => {
            tex.minFilter = tex.magFilter = THREE.NearestFilter;
            const aspect = tex.image.width / tex.image.height;
            const H = 22;
            portalGeo = new THREE.PlaneGeometry(H * aspect, H);
            portalMat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.FrontSide });
            if (portalSpawnPending && gameStarted && !dead && !isPaused && !isTraining && !sandboxMode) {
                spawnPortalPair();
            }
        });

        const lootIndicator = document.getElementById('lootIndicator');
        window.lootIndicator = lootIndicator;
        const portalIndicator = document.getElementById('portalIndicator');
        window.portalIndicator = portalIndicator;

        const figureTex = {};

        loader.load('assets/images/figure.png', tex => {
            figureTex.default = tex;
            loader.load('assets/images/kanye.png', tex => {
                figureTex.kanye = tex;
                loader.load('assets/images/scaryguy.png', tex => {
                    figureTex.scaryguy = tex;
                    loader.load('assets/images/stalin.png', tex => {
                        tex.minFilter = tex.magFilter = THREE.NearestFilter;
                        figureTex.stalin = tex;
                    });
                });
            });
        });

        const FIG_H = 5;
        let figureGeo, figureMesh;

        const figureAspects = {
            default: 0.5,
            kanye: 0.7,
            scaryguy: 0.5,
            stalin: 0.5,
            training: 0.5
        };

        function loadCustomFigureTexture(index) {
            const fig = customFigures[index];
            if (fig) {
                const img = new Image();
                img.onload = () => {
                    const tex = new THREE.Texture(img);
                    tex.minFilter = tex.magFilter = THREE.NearestFilter;
                    tex.needsUpdate = true;
                    figureTex['custom_' + index] = tex;
                };
                img.src = fig.image;
            }
        }

        customFigures.forEach((fig, i) => {
            loadCustomFigureTexture(i);
            if (fig.aspect) figureAspects['custom_' + i] = fig.aspect;
        });

        function createFigureMesh() {
            figureGeo = new THREE.PlaneGeometry(FIG_H * 0.5, FIG_H);
            figureMaterial = new THREE.MeshBasicMaterial({
                map: figureTex.default,
                transparent: true,
                alphaTest: 0.1,
                side: THREE.DoubleSide
            });
            figureMesh = new THREE.Mesh(figureGeo, figureMaterial);
            figureMesh.position.set(0, getTerrainHeight(0, -60) + FIG_H / 2, -60);
            figureMesh.visible = false;
            figureMesh.userData.isFigure = true;
            scene.add(figureMesh);
            billboards.push(figureMesh);
        }

        createFigureMesh();

        const raycaster = new THREE.Raycaster();
        const screenCenter = new THREE.Vector2(0, 0);
        let yaw = 0, pitch = 0;
        let moveF = false, moveB = false, moveL = false, moveR = false;
        let moveLeft = false, moveRight = false;
        let sprint = false;
        let locked = false;
        let isJumping = false;
        let jumpBuffered = false;
        let jumpBufferTimer = 0;
        const JUMP_BUFFER_WINDOW = 0.12;
        let landingMomentumTimer = 0;
        const LANDING_MOMENTUM_TIME = 0.15;

        const dirtSplashes = [];
        function spawnDirtSplash(x, z) {
            if (!dirtSplashTex) return;
            const mat = new THREE.SpriteMaterial({ map: dirtSplashTex, transparent: true, alphaTest: 0.1, depthWrite: false });
            const sprite = new THREE.Sprite(mat);
            sprite.scale.setScalar(1.5);
            sprite.position.set(x, getTerrainHeight(x, z) + BASE_Y + 0.5, z);
            scene.add(sprite);
            dirtSplashes.push({ mesh: sprite, time: 0, duration: 0.5 });
        }
        let dashCooldown = 0;
        let lastSlideTime = 0;
        let isSliding = false;
        let slideVelX = 0, slideVelZ = 0;
        let slideFriction = 0;
        let slideTimer = 0;
        const SLIDE_DURATION = 2;
        const SLIDE_FRICTION_BASE = 0.8;
        const SLIDE_MIN_SPEED = 3;

        const overlay = document.getElementById('overlay');
        const playBtn = document.getElementById('playBtn');
        const hudText = document.getElementById('hudText');
        const noticeWindow = document.getElementById('noticeWindow');
        const noticeText = document.getElementById('noticeText');
        const countdownEl = document.getElementById('countdown');
        const countdownText = countdownEl.querySelector('span');
        const deathEl = document.getElementById('death');
        const retryBtn = document.getElementById('retryBtn');
        const staticEl = document.getElementById('static');
        const flashEl = document.getElementById('flash');
        const pauseEl = document.getElementById('pause');
        const resumeBtn = document.getElementById('resumeBtn');
        const pauseHomeBtn = document.getElementById('pauseHomeBtn');
        const recordBtn = document.getElementById('recordBtn');
        const puzzleEl = document.getElementById('puzzle');
        const puzzleCloseBtn = document.getElementById('puzzleClose');

        let isPaused = false;
        let currentPuzzle = null;
        let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;

        function showNotice(text) {
            if (!noticeWindow || !noticeText) return;
            noticeText.textContent = text;
            noticeWindow.classList.remove('hidden');
        }

        function hideNotice() {
            if (!noticeWindow) return;
            noticeWindow.classList.add('hidden');
        }

        hideNotice();

        function useItem() {
            if (!locked && !isMobile) return;

            if (!isWorking && nearMachine) {
                isWorking = true;
                workTimer = 8;
                nearMachine.active = false;
                const mesh = machineMeshes.find(m => m.position.x === nearMachine.x && m.position.z === nearMachine.z);
                if (mesh) mesh.visible = false;
            } else if (nearPuzzle && !nearPuzzle.solved) {
                openPuzzle();
            } else {
                const usedSlot = selectedSlot;
                if (inventory[usedSlot]) {
                    activeItem = inventory[usedSlot];
                    inventory[usedSlot] = null;
                    updateInventoryUI();

                    if (activeItem === 'bear') {
                        if (!bearTrapPlaced && bearTrapMesh) {
                            bearTrapPlaced = true;
                            const trapX = camera.position.x + Math.sin(yaw) * 3;
                            const trapZ = camera.position.z + Math.cos(yaw) * 3;
                            const trapY = getTerrainHeight(trapX, trapZ);
                            bearTrapPos = new THREE.Vector3(trapX, trapY, trapZ);
                            bearTrapMesh.position.set(trapX, trapY + 1, trapZ);
                            bearTrapMesh.visible = true;
                        } else {
                            inventory[usedSlot] = 'bear';
                            updateInventoryUI();
                        }
                    } else if (activeItem === 'gem') {
                        speedBoostTimer += 10;
                        gemStacks = Math.min(3, gemStacks + 1);
                    } else if (activeItem === 'firework') {
                        const boostAmount = 100;
                        velX = -Math.sin(yaw) * boostAmount;
                        velZ = -Math.cos(yaw) * boostAmount;
                        isJumping = true;
                        velY = 15;
                        addDailyChallengeProgress('use_firework', 1);
                    } else if (activeItem === 'flaregun') {
                        if (!flareActive && flareMesh) {
                            flareActive = true;
                            flareTimer = 8;
                            const flareX = camera.position.x + Math.sin(yaw) * 5;
                            const flareZ = camera.position.z + Math.cos(yaw) * 5;
                            const flareY = getTerrainHeight(flareX, flareZ);
                            flarePos = new THREE.Vector3(flareX, flareY + 2, flareZ);
                            flareMesh.position.copy(flarePos);
                            flareMesh.visible = true;
                            figureTargetFlare = true;
                        } else {
                            inventory[usedSlot] = 'flaregun';
                            updateInventoryUI();
                        }
                    }
                }
            }
        }

        function setupMobileControls() {
            if (!isMobile) return;

            const mobileControls = document.getElementById('mobileControls');
            const keyIndicators = document.getElementById('keyIndicators');

            mobileControls.classList.remove('hidden');
            keyIndicators.classList.add('hidden');

            const mobUp = document.getElementById('mob-up');
            const mobDown = document.getElementById('mob-down');
            const mobLeft = document.getElementById('mob-left');
            const mobRight = document.getElementById('mob-right');
            const mobJump = document.getElementById('mob-jump');
            const mobSprint = document.getElementById('mob-sprint');
            const mobAction = document.getElementById('mob-action');

            const addTouchEvents = function(el, onStart, onEnd) {
                el.ontouchstart = function(e) { e.preventDefault(); onStart(); };
                el.ontouchend = function(e) { e.preventDefault(); onEnd(); };
            };

            addTouchEvents(mobUp, function(){ moveF = true; }, function(){ moveF = false; });
            addTouchEvents(mobDown, function(){ moveB = true; }, function(){ moveB = false; });
            addTouchEvents(mobLeft, function(){ moveL = true; }, function(){ moveL = false; });
            addTouchEvents(mobRight, function(){ moveR = true; }, function(){ moveR = false; });
            addTouchEvents(mobJump, function(){
                if (!isJumping) {
                    doJump();
                } else {
                    jumpBuffered = true;
                    jumpBufferTimer = JUMP_BUFFER_WINDOW;
                }
            }, function(){});
            addTouchEvents(mobSprint, function(){
                sprint = !sprint;
                mobSprint.classList.toggle('toggled', sprint);
            }, function(){});
            addTouchEvents(mobAction, function(){ useItem(); }, function(){});

            const mobSlot1 = document.getElementById('mob-slot1');
            const mobSlot2 = document.getElementById('mob-slot2');
            const mobSlot3 = document.getElementById('mob-slot3');

            addTouchEvents(mobSlot1, () => { selectedSlot = 0; updateInventoryUI(); }, () => {});
            addTouchEvents(mobSlot2, () => { selectedSlot = 1; updateInventoryUI(); }, () => {});
            addTouchEvents(mobSlot3, () => { selectedSlot = 2; updateInventoryUI(); }, () => {});
        }

        function mobileControlsLoop() {
            if (!isMobile) return;
            const mobileControls = document.getElementById('mobileControls');
            if (gameStarted && !isPaused) {
                mobileControls.classList.remove('hidden');
            } else {
                mobileControls.classList.add('hidden');
            }
        }

        if (isMobile) {
            const welcomePopup = document.getElementById('mobileWelcomePopup');
            if (welcomePopup) {
                welcomePopup.classList.remove('hidden');
            }
            const fullscreenBtn = document.getElementById('fullscreenBtn');
            const skipWelcomeBtn = document.getElementById('skipWelcomeBtn');
            const hideWelcome = () => {
                if (welcomePopup) welcomePopup.classList.add('hidden');
            };
            if (fullscreenBtn) {
                fullscreenBtn.addEventListener('click', () => {
                    if (document.documentElement.requestFullscreen) {
                        document.documentElement.requestFullscreen();
                    } else if (document.documentElement.webkitRequestFullscreen) {
                        document.documentElement.webkitRequestFullscreen();
                    }
                    hideWelcome();
                });
            }
            if (skipWelcomeBtn) {
                skipWelcomeBtn.addEventListener('click', hideWelcome);
            }
        }

        function openPuzzle() {
            currentPuzzle = nearPuzzle;
            const items = ['bear', 'gem', 'flaregun', 'bear', 'gem', 'flaregun'];
            puzzleGrid = [...items];
            for (let i = puzzleGrid.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [puzzleGrid[i], puzzleGrid[j]] = [puzzleGrid[j], puzzleGrid[i]];
            }
            puzzleSelectedSlot = null;
            isPuzzleActive = true;
            document.exitPointerLock();
            puzzleEl.classList.add('active');
            renderPuzzleGrid();
            renderPuzzleItems();
        }

        function closePuzzle() {
            isPuzzleActive = false;
            puzzleEl.classList.remove('active');
            if (!isMobile) renderer.domElement.requestPointerLock();
        }

        function renderPuzzleGrid() {
            const slots = document.querySelectorAll('.puzzle-slot');
            let draggedItem = null;
            let isPuzzleDragging = false;

            slots.forEach((slot, i) => {
                slot.innerHTML = '';
                slot.classList.remove('selected');
                slot.draggable = false;
                slot.ondragstart = null;
                slot.ondragover = null;
                slot.ondrop = null;

                if (puzzleGrid[i]) {
                    const img = document.createElement('img');
                    img.src = 'assets/images/' + puzzleGrid[i] + '.png';
                    img.draggable = true;
                    img.ondragstart = (e) => {
                        isPuzzleDragging = true;
                        e.dataTransfer.setData('text/plain', i);
                        e.dataTransfer.effectAllowed = 'move';
                        try {
                            const previewSize = 24;
                            const canvas = document.createElement('canvas');
                            canvas.width = previewSize;
                            canvas.height = previewSize;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                ctx.imageSmoothingEnabled = false;
                                ctx.clearRect(0, 0, previewSize, previewSize);
                                ctx.drawImage(img, 0, 0, previewSize, previewSize);
                                e.dataTransfer.setDragImage(canvas, Math.floor(previewSize / 2), Math.floor(previewSize / 2));
                            } else {
                                e.dataTransfer.setDragImage(img, 12, 12);
                            }
                        } catch { }
                        draggedItem = i;
                    };
                    img.ondragend = () => {
                        isPuzzleDragging = false;
                        draggedItem = null;
                    };
                    img.style.cursor = 'grab';
                    slot.appendChild(img);
                }
                if (i === puzzleSelectedSlot) {
                    slot.classList.add('selected');
                }
                slot.onclick = () => {
                    if (isPuzzleDragging) return;
                    puzzleSelectedSlot = i;
                    renderPuzzleGrid();
                };
                slot.ondragover = (e) => {
                    e.preventDefault();
                };
                slot.ondrop = (e) => {
                    e.preventDefault();
                    isPuzzleDragging = false;
                    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    if (fromIndex !== i) {
                        [puzzleGrid[fromIndex], puzzleGrid[i]] = [puzzleGrid[i], puzzleGrid[fromIndex]];
                        renderPuzzleGrid();
                        checkPuzzleWin();
                    }
                };
            });
            document.getElementById('puzzleItems').style.display = 'none';
        }

        function renderPuzzleItems() {

            const container = document.getElementById('puzzleItems');
            container.style.display = 'none';
        }

        function checkPuzzleWin() {
            let matches = 0;

            for (let i = 0; i < puzzleGrid.length - 1; i++) {
                if (puzzleGrid[i] && puzzleGrid[i + 1] && puzzleGrid[i] === puzzleGrid[i + 1]) {

                    if (i % 2 === 0) {
                        matches++;
                    }
                }
            }
            if (matches >= 3) {
                setTimeout(() => {
                    closePuzzle();
                    if (currentPuzzle) {
                        currentPuzzle.solved = true;
                        const mesh = puzzleMeshes.find(p => p.position.x === currentPuzzle.x && p.position.z === currentPuzzle.z);
                        if (mesh) mesh.visible = false;
                    }
                    coins += 60;
                    saveCoins(coins);
                    document.getElementById('coins').textContent = coins;
                    hudText.textContent = '+60 COINS!';
                    setTimeout(() => hudText.textContent = isTraining ? 'TRAINING MODE' : 'RUN...', 2000);
                    addDailyChallengeProgress('solve_puzzle', 1);
                }, 100);
            }
        }

        function updatePuzzleUI() {
            if (isPuzzleActive && figureMesh) {
                const dist = Math.floor(camera.position.distanceTo(figureMesh.position));
                document.getElementById('puzzleDistance').textContent = 'FIGURE: ' + dist + 'm';
            }
        }

        puzzleCloseBtn.addEventListener('click', closePuzzle);
        const puzzleCloseXBtn = document.getElementById('puzzleCloseX');
        if (puzzleCloseXBtn) puzzleCloseXBtn.addEventListener('click', closePuzzle);

        document.getElementById('puzzleCheck').addEventListener('click', () => {
            checkPuzzleWin();
        });

        function flash() {
            flashEl.style.opacity = 0.6;
            setTimeout(() => { flashEl.style.opacity = 0; }, 80);
        }

        function setStaticOpacity(opacity) {
            staticEl.style.opacity = opacity;
        }

        function updateInventoryUI() {
            const slot1 = document.getElementById('slot1');
            const slot2 = document.getElementById('slot2');
            const slot3 = document.getElementById('slot3');
            slot1.innerHTML = '<span class="key">1</span>';
            slot2.innerHTML = '<span class="key">2</span>';
            slot3.innerHTML = '<span class="key">3</span>';

            slot1.classList.remove('selected');
            slot2.classList.remove('selected');
            slot3.classList.remove('selected');

            if (selectedSlot === 0) slot1.classList.add('selected');
            if (selectedSlot === 1) slot2.classList.add('selected');
            if (selectedSlot === 2) slot3.classList.add('selected');

            if (inventory[0]) {
                slot1.classList.add('filled');
                const img = document.createElement('img');
                if (inventory[0] === 'bear') img.src = 'assets/images/bear.png';
                else if (inventory[0] === 'gem') img.src = 'assets/images/gem.png';
                else if (inventory[0] === 'flaregun') img.src = 'assets/images/flaregun.png';
                else if (inventory[0] === 'firework') img.src = 'assets/images/firework.png';
                slot1.appendChild(img);
            } else {
                slot1.classList.remove('filled');
            }
            if (inventory[1]) {
                slot2.classList.add('filled');
                const img = document.createElement('img');
                if (inventory[1] === 'bear') img.src = 'assets/images/bear.png';
                else if (inventory[1] === 'gem') img.src = 'assets/images/gem.png';
                else if (inventory[1] === 'flaregun') img.src = 'assets/images/flaregun.png';
                else if (inventory[1] === 'firework') img.src = 'assets/images/firework.png';
                slot2.appendChild(img);
            } else {
                slot2.classList.remove('filled');
            }
            if (inventory[2]) {
                slot3.classList.add('filled');
                const img = document.createElement('img');
                if (inventory[2] === 'bear') img.src = 'assets/images/bear.png';
                else if (inventory[2] === 'gem') img.src = 'assets/images/gem.png';
                else if (inventory[2] === 'flaregun') img.src = 'assets/images/flaregun.png';
                else if (inventory[2] === 'firework') img.src = 'assets/images/firework.png';
                slot3.appendChild(img);
            } else {
                slot3.classList.remove('filled');
            }

            if (window.handsItemMesh) {
                const itemType = inventory[selectedSlot];
                if (itemType) {
                    let texName = 'gem.png';
                    if (itemType === 'bear') texName = 'bear.png';
                    else if (itemType === 'gem') texName = 'gem.png';
                    else if (itemType === 'flaregun') texName = 'flaregun.png';
                    else if (itemType === 'firework') texName = 'firework.png';
                    loader.load('assets/images/' + texName, tex => {
                        tex.minFilter = tex.magFilter = THREE.NearestFilter;
                        window.handsItemMesh.material.map = tex;
                        window.handsItemMesh.material.needsUpdate = true;
                    });
                }
            }
        }

        let trainingMode = false;

        playBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sandboxMode = false;
            trainingMode = false;
            overlay.setAttribute('data-visible', 'false');
            overlay.style.display = 'none';
            document.querySelectorAll('.game-ui').forEach(el => el.classList.add('hidden'));
            countdown = 3;
            startCountdownSpin();
            countdownEl.classList.add('active');
            countdownText.textContent = '3';
            gameStarted = false;
            camera.position.set(0, getTerrainHeight(0, 0) + BASE_Y, 0);
            moveF = moveB = moveL = moveR = false;
            moveLeft = moveRight = false;
            sprint = false;
            isJumping = false;
            velX = 0;
            velY = 0;
            velZ = 0;
            isSliding = false;
            jumpBuffered = false;
            jumpBufferTimer = 0;
            if (figureMesh && figureTex[figureSelect.value]) {
                const aspect = figureAspects[figureSelect.value] || 0.5;
                figureMesh.geometry.dispose();
                figureMesh.geometry = new THREE.PlaneGeometry(FIG_H * aspect, FIG_H);
                figureMesh.material.map = figureTex[figureSelect.value];
                figureMesh.material.needsUpdate = true;
                figureMesh.visible = false;
                figureMesh.position.set(0, getTerrainHeight(0, camera.position.z - 60) + 2.5, camera.position.z - 60);
            }
        });

        let sandboxMode = false;
        let sandboxFigures = [];
        let sandboxBillboard = true;
        let mouseUnlocked = false;

        document.getElementById('trainingBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            sandboxMode = false;
            trainingMode = true;
            overlay.setAttribute('data-visible', 'false');
            overlay.style.display = 'none';
            document.querySelectorAll('.game-ui').forEach(el => el.classList.add('hidden'));
            countdown = 3;
            startCountdownSpin();
            countdownEl.classList.add('active');
            countdownText.textContent = '3';
            gameStarted = false;
            camera.position.set(0, getTerrainHeight(0, 0) + BASE_Y, 0);
            moveF = moveB = moveL = moveR = false;
            moveLeft = moveRight = false;
            sprint = false;
            isJumping = false;
            velX = 0;
            velY = 0;
            velZ = 0;
            isSliding = false;
            jumpBuffered = false;
            jumpBufferTimer = 0;
            if (figureMesh) figureMesh.visible = false;
        });

        sandboxBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sandboxMode = true;
            trainingMode = false;
            overlay.setAttribute('data-visible', 'false');
            overlay.style.display = 'none';
            document.querySelectorAll('.game-ui').forEach(el => el.classList.add('hidden'));
            countdown = 3;
            startCountdownSpin();
            countdownEl.classList.add('active');
            countdownText.textContent = '3';
            gameStarted = false;
            camera.position.set(0, getTerrainHeight(0, 0) + BASE_Y, 0);
            moveF = moveB = moveL = moveR = false;
            moveLeft = moveRight = false;
            sprint = false;
            isJumping = false;
            velX = 0;
            velY = 0;
            velZ = 0;
            isSliding = false;
            jumpBuffered = false;
            jumpBufferTimer = 0;
            jumpCombo = 0;
            if (figureMesh) figureMesh.visible = false;
        });

        document.getElementById('spawnTree1').addEventListener('click', () => spawnSandboxItem('tree1'));
        document.getElementById('spawnTree2').addEventListener('click', () => spawnSandboxItem('tree2'));
        document.getElementById('spawnTree3').addEventListener('click', () => spawnSandboxItem('tree3'));
        document.getElementById('spawnRock').addEventListener('click', () => spawnSandboxItem('rock'));
        document.getElementById('spawnBush').addEventListener('click', () => spawnSandboxItem('bush'));
        document.getElementById('spawnFigure').addEventListener('click', () => spawnSandboxItem('figure'));
        document.getElementById('spawnCellTower').addEventListener('click', () => spawnSandboxItem('celltower'));
        document.getElementById('spawnAnyItem').addEventListener('click', () => {
            const type = document.getElementById('sandboxItemSelect').value;
            spawnSandboxItem('item:' + type);
        });
        document.getElementById('sandboxBillboardToggle').addEventListener('change', (e) => {
            sandboxBillboard = e.target.checked;
        });

        function spawnSandboxItem(type) {
            const x = camera.position.x;
            const z = camera.position.z;
            const terrainH = getTerrainHeight(x, z);

            if (type === 'tree1' || type === 'tree2' || type === 'tree3') {
                const texKey = type === 'tree1' ? 'tree.png' : (type === 'tree2' ? 'tree2.png' : 'tree3.png');
                const tex = window.treeTextures && window.treeTextures[texKey];
                if (tex) {
                    const aspect = window.treeAspects[texKey];
                    const geo = new THREE.PlaneGeometry(22 * aspect, 22);
                    const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.1 });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.set(x, terrainH + 11, z);
                    mesh.scale.setScalar(0.8 + Math.random() * 0.8);
                    scene.add(mesh);
                    billboards.push(mesh);
                }
            } else if (type === 'rock') {
                if (rockMat) {
                    const geo = new THREE.PlaneGeometry(2, 2);
                    const mesh = new THREE.Mesh(geo, rockMat);
                    mesh.position.set(x, terrainH + 1, z);
                    mesh.scale.setScalar(1.0 + Math.random());
                    scene.add(mesh);
                    billboards.push(mesh);
                }
            } else if (type === 'bush') {
                if (bushMesh) {
                    const geo = new THREE.PlaneGeometry(4, 4);
                    const mesh = new THREE.Mesh(geo, bushMesh);
                    mesh.position.set(x, terrainH + 2, z);
                    mesh.scale.setScalar(1.0 + Math.random());
                    scene.add(mesh);
                    billboards.push(mesh);
                }
            } else if (type === 'celltower') {
                if (cellTowerMeshes && cellTowerMeshes[0]) {
                    const geo = cellTowerMeshes[0].geometry.clone();
                    const mat = new THREE.MeshLambertMaterial({ map: cellTowerMeshes[0].material.map, transparent: true, alphaTest: 0.1 });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.set(x, terrainH + 10, z);
                    mesh.scale.setScalar(2);
                    scene.add(mesh);
                    billboards.push(mesh);
                }
            } else if (type === 'figure') {
                const figTex = figureTex['default'];
                if (figTex) {
                    const geo = new THREE.PlaneGeometry(10, 10);
                    const mat = new THREE.MeshLambertMaterial({ map: figTex, transparent: true, alphaTest: 0.1 });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.set(x, terrainH + 5, z);
                    scene.add(mesh);
                    sandboxFigures.push(mesh);
                }
            } else if (type.startsWith('item:')) {
                const itemType = type.slice('item:'.length);
                if (['bear', 'gem', 'flaregun', 'firework'].includes(itemType)) {
                    spawnItem(itemType, x, z);
                }
            }
        }

        function startGame() {
            gameStarted = true;
            gameTime = 0;
            isTraining = trainingMode;
            figureActive = false;
            figureHeadStartTimer = 6;
            figureSpeedVar = 0;
            playerPosHistory = [];
            strategistWaitTimer = 0;
            strategistState = 'chase';
            document.querySelectorAll('.game-ui').forEach(el => el.classList.remove('hidden'));
            document.getElementById('coins').textContent = 'COINS: ' + coins;

            if (isMobile) {
                document.getElementById('mobileControls').classList.remove('hidden');
                document.getElementById('keyIndicators').classList.add('hidden');
            }


            const { equipped } = loadShopData();
            if (handsMesh && handsTextures) {
                const handImage = equipped.hands && handsTextures[equipped.hands + '.png'] ? equipped.hands + '.png' : 'hands.png';
                if (handsTextures[handImage]) {
                    handsMesh.material.map = handsTextures[handImage];
                    handsMesh.material.needsUpdate = true;
                }
                handsMesh.visible = true;
            }


            for (const p of puzzles) {
                p.solved = false;
            }
            for (const m of puzzleMeshes) {
                m.visible = true;
            }

            if (!isTraining) {
                spawnPortalPair();
            } else {
                clearPortals();
            }

            if (!isTraining && figureMesh && figureTex[figureSelect.value]) {
                const aspect = figureAspects[figureSelect.value] || 0.5;
                figureMesh.geometry.dispose();
                figureMesh.geometry = new THREE.PlaneGeometry(FIG_H * aspect, FIG_H);
                figureMesh.material.map = figureTex[figureSelect.value];
                figureMesh.material.needsUpdate = true;
                figureMesh.visible = true;
                figureMesh.position.set(0, getTerrainHeight(0, camera.position.z - 60) + 2.5, camera.position.z - 60);
            } else if (figureMesh) {
                figureMesh.visible = false;
            }
            hudText.textContent = isTraining ? 'TRAINING MODE' : 'RUN...';
            if (!isMobile) renderer.domElement.requestPointerLock();
        }

        retryBtn.addEventListener('click', () => {
            hideNotice();
            stopFigureSound();
            clearPortals();
            dead = false;
            isPaused = false;
            figureActive = false;
            figureTriggered = false;
            figureGazeTime = 0;
            figureSpeedVar = 0;
            figureStuckTimer = 0;
            gameStarted = false;
            gameTime = 0;
            sandboxMode = false;
            trainingMode = trainingMode || isTraining;
            isTraining = trainingMode;

            inventory = [null, null, null];
            selectedSlot = 0;
            updateInventoryUI();

            speedBoostTimer = 0;
            gemStacks = 0;

            isWorking = false;
            workTimer = 0;
            nearMachine = null;

            bearTrapPlaced = false;
            bearTrapPos = null;
            if (bearTrapMesh) bearTrapMesh.visible = false;

            flareActive = false;
            flareTimer = 0;
            flarePos = null;
            figureTargetFlare = false;
            if (flareMesh) flareMesh.visible = false;


            for (const item of itemMeshes) {
                item.userData.collected = false;
                item.visible = true;
            }
            for (const m of machines) m.active = true;
            for (const m of machineMeshes) m.visible = true;
            for (const p of puzzles) p.solved = false;
            for (const pm of puzzleMeshes) pm.visible = true;

            if (figureMesh && figureTex[figureSelect.value]) {
                const aspect = figureAspects[figureSelect.value] || 0.5;
                figureMesh.geometry.dispose();
                figureMesh.geometry = new THREE.PlaneGeometry(FIG_H * aspect, FIG_H);
                figureMesh.material.map = figureTex[figureSelect.value];
                figureMesh.material.needsUpdate = true;
                figureMesh.visible = false;
                figureMesh.position.set(0, getTerrainHeight(0, -60) + 2.5, -60);
            } else if (figureMesh) {
                figureMesh.visible = false;
            }

            camera.position.set(0, getTerrainHeight(0, 0) + BASE_Y, 0);
            moveF = moveB = moveL = moveR = false;
            moveLeft = moveRight = false;
            sprint = false;
            isJumping = false;
            velX = 0;
            velY = 0;
            velZ = 0;
            isSliding = false;
            jumpBuffered = false;
            jumpBufferTimer = 0;

            overlay.setAttribute('data-visible', 'false');
            overlay.style.display = 'none';
            overlay.classList.add('hidden');
            deathEl.classList.remove('active');

            countdown = 3;
            startCountdownSpin();
            countdownEl.classList.add('active');
            countdownText.textContent = '3';
            hudText.textContent = isTraining ? 'TRAINING MODE' : 'RUN...';
        });

        const homeBtn = document.getElementById('homeBtn');
        homeBtn.addEventListener('click', () => {
            stopFigureSound();
            goHome();
        });

        renderer.domElement.addEventListener('click', () => {
            if (!locked && !isMobile) renderer.domElement.requestPointerLock();
        });

        document.addEventListener('pointerlockchange', () => {
            locked = document.pointerLockElement === renderer.domElement;
            if (locked) {
                overlay.classList.add('hidden');
                overlay.style.display = 'none';
            } else if (!dead && gameStarted && countdown <= 0 && !isPaused && !isPuzzleActive && !isMobile) {
                togglePause();
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden && gameStarted && !dead && countdown <= 0 && !isPaused && !isPuzzleActive && !isMobile) {
                togglePause();
            }
        });

        function togglePause() {
            if (dead) return;
            isPaused = !isPaused;
            if (isPaused) {
                pauseEl.classList.add('active');
                if (!isMobile) document.exitPointerLock();
                stopFigureSound();
            } else {
                pauseEl.classList.remove('active');
                if (!isMobile) renderer.domElement.requestPointerLock();
            }
        }

        resumeBtn.addEventListener('click', () => {
            isPaused = false;
            pauseEl.classList.remove('active');
            if (!isMobile) renderer.domElement.requestPointerLock();
        });

        pauseHomeBtn.addEventListener('click', () => {
            isPaused = false;
            pauseEl.classList.remove('active');
            goHome();
        });

        let mediaRecorder, recordedChunks = [];
        let isRecording = false;

        document.getElementById('recordBtn').addEventListener('click', async () => {
            if (isRecording) {
                mediaRecorder.stop();
                document.getElementById('recordBtn').textContent = 'Record';
                document.getElementById('recordingIndicator').classList.add('hidden');
                isRecording = false;
                return;
            }
            try {
                const stream = renderer.domElement.captureStream(30);
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
                recordedChunks = [];
                mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
                mediaRecorder.onstop = () => {
                    const blob = new Blob(recordedChunks, { type: 'video/webm' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'runnnotgun-' + Date.now() + '.webm';
                    a.click();
                    URL.revokeObjectURL(url);
                };
                mediaRecorder.start();
                document.getElementById('recordBtn').textContent = 'Stop';
                document.getElementById('recordingIndicator').classList.remove('hidden');
                isRecording = true;
            } catch (e) {
                alert('Recording not supported');
            }
        });

        function goHome() {
            hideNotice();
            clearPortals();
            if (isRecording && mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                document.getElementById('recordBtn').textContent = 'Record';
                document.getElementById('recordingIndicator').classList.add('hidden');
                isRecording = false;
            }
            if (!isMobile) {
                try { document.exitPointerLock(); } catch { }
            }
            dead = false;
            gameTime = 0;
            figureActive = false;
            figureTriggered = false;
            figureGazeTime = 0;
            figureSpeedVar = 0;
            figureStuckTimer = 0;
            gameStarted = false;
            inventory = [null, null, null];
            speedBoostTimer = 0;
            gemStacks = 0;
            isWorking = false;
            workTimer = 0;
            nearMachine = null;
            bearTrapPlaced = false;
            bearTrapPos = null;
            stopFigureSound();
            if (bearTrapMesh) bearTrapMesh.visible = false;
            updateInventoryUI();

            for (const item of itemMeshes) {
                item.userData.collected = false;
                item.visible = true;
            }

            for (const m of machineMeshes) {
                m.visible = true;
            }
            for (const m of machines) {
                m.active = true;
            }

            if (figureMesh && figureTex[figureSelect.value]) {
                const aspect = figureAspects[figureSelect.value] || 0.5;
                figureMesh.geometry.dispose();
                figureMesh.geometry = new THREE.PlaneGeometry(FIG_H * aspect, FIG_H);
                figureMesh.material.map = figureTex[figureSelect.value];
                figureMesh.material.needsUpdate = true;
                figureMesh.visible = false;
                figureMesh.position.set(0, getTerrainHeight(0, -60) + 2.5, -60);
            }

            camera.position.set(0, getTerrainHeight(0, 0) + BASE_Y, 0);
            moveF = moveB = moveL = moveR = false;
            moveLeft = moveRight = false;
            sprint = false;
            isJumping = false;
            velX = 0;
            velY = 0;
            velZ = 0;
            isSliding = false;
            jumpBuffered = false;
            jumpBufferTimer = 0;
            currentStaticOpacity = 0;
            setStaticOpacity(0);

            deathEl.classList.remove('active');
            overlay.setAttribute('data-visible', 'true');
            overlay.style.display = 'flex';
            overlay.classList.remove('hidden');
            updateHomeLeaderboard();
            document.querySelectorAll('.game-ui').forEach(el => el.classList.add('hidden'));
            document.getElementById('sandboxWindow').classList.remove('active');
            document.getElementById('timer').textContent = '0:00';
        }

        document.addEventListener('mousemove', e => {
            if (dead) return;
            if (locked || isMobile) {
                yaw -= e.movementX * 0.0025;
                pitch -= e.movementY * 0.0025;
                pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pitch));
            }
        });

        let touchStartX = 0;
        let touchStartY = 0;
        let isTouchLooking = false;
        let touchMoved = false;
        let wasButtonTouched = false;
        let lookSliderActive = false;
        let sliderCenterX = 0;
        let sliderHandleEl = null;

        function setupLookSlider() {
            if (!isMobile) return;
            const container = document.getElementById('lookSliderContainer');
            sliderHandleEl = document.getElementById('lookSliderHandle');
            if (!container || !sliderHandleEl) return;

            container.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                lookSliderActive = true;
                const touch = e.touches[0];
                const rect = container.getBoundingClientRect();
                sliderCenterX = rect.left + rect.width / 2;
            }, { passive: false });

            container.addEventListener('touchmove', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!lookSliderActive) return;
                const touch = e.touches[0];
                const rect = container.getBoundingClientRect();
                const containerCenterX = rect.left + rect.width / 2;
                const maxDelta = rect.width / 2 - 20;
                let deltaX = touch.clientX - containerCenterX;
                deltaX = Math.max(-maxDelta, Math.min(maxDelta, deltaX));
                const pct = deltaX / maxDelta;
                sliderHandleEl.style.left = (50 + pct * 40) + '%';
                yaw += pct * 0.05;
            }, { passive: false });

            const endSlide = (e) => {
                e.preventDefault();
                e.stopPropagation();
                lookSliderActive = false;
                if (sliderHandleEl) sliderHandleEl.style.left = '50%';
            };

            container.addEventListener('touchend', endSlide, { passive: false });
            container.addEventListener('touchcancel', endSlide, { passive: false });
        }
        setupLookSlider();

        const keys = {
            w: document.getElementById('key-w'),
            a: document.getElementById('key-a'),
            s: document.getElementById('key-s'),
            d: document.getElementById('key-d'),
            space: document.getElementById('key-space'),
            c: document.getElementById('key-c'),
            shift: document.getElementById('key-shift'),
            f: document.getElementById('key-f'),
            pressedA: false,
            pressedI: false,
            pressedX: false
        };

        function setKeyActive(key, active) {
            if (keys[key]) {
                if (active) keys[key].classList.add('active');
                else keys[key].classList.remove('active');
            }
        }

document.addEventListener('keydown', function(e) {
            var code = e.code;
            if (code === 'KeyA') keys.pressedA = true;
            if (code === 'KeyI') keys.pressedI = true;
            if (code === 'KeyX') keys.pressedX = true;
            if (keys.pressedA && keys.pressedI && keys.pressedX) {
                coins += 1000;
                saveCoins(coins);
                document.getElementById('coins').textContent = coins;
                hudText.textContent = '+1000 COINS!';
                keys.pressedA = keys.pressedI = keys.pressedX = false;
                setTimeout(function(){ hudText.textContent = isTraining ? 'TRAINING MODE' : 'RUN...'; }, 2000);
            }
            if (code === 'Escape' && gameStarted && !dead && countdown <= 0) {
                if (isPuzzleActive) {
                    closePuzzle();
                } else {
                    togglePause();
                }
                return;
            }
            if (code === 'KeyP') {
                var timestamp = Date.now();
                var link = document.createElement('a');
                link.download = 'screenshot_' + timestamp + '.png';
            for (let i = dirtSplashes.length - 1; i >= 0; i--) {
                const s = dirtSplashes[i];
                s.time += dt;
                const t = s.time / s.duration;
                s.mesh.material.opacity = 1 - t;
                s.mesh.scale.setScalar(2.5 + t * 1.25);
                if (t >= 1) {
                    scene.remove(s.mesh);
                    s.mesh.material.dispose();
                    dirtSplashes.splice(i, 1);
                }
            }

            renderer.render(scene, camera);
                renderer.domElement.toBlob(function(blob) {
                    link.href = URL.createObjectURL(blob);
                    link.click();
                    URL.revokeObjectURL(link.href);
                }, 'image/png');
                return;
            }
            if (code === 'KeyW' || code === 'ArrowUp') { moveF = true; setKeyActive('w', true); }
            if (code === 'KeyS' || code === 'ArrowDown') { moveB = true; setKeyActive('s', true); }
            if (code === 'KeyA') { moveL = true; setKeyActive('a', true); }
            if (code === 'KeyD') { moveR = true; setKeyActive('d', true); }
            if (code === 'ArrowLeft') { moveLeft = true; }
            if (code === 'ArrowRight') { moveRight = true; }
            if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyL') { sprint = true; setKeyActive('shift', true); }
            if (code === 'Digit1') { selectedSlot = 0; updateInventoryUI(); }
            if (code === 'Digit2') { selectedSlot = 1; updateInventoryUI(); }
            if (code === 'Digit3') { selectedSlot = 2; updateInventoryUI(); }
            if (code === 'Space') {
                if (locked || isMobile) {
                    setKeyActive('space', true);
                    if (isSliding) {
                        isSliding = false;
                        isJumping = true;
                        velX = slideVelX;
                        velZ = slideVelZ;
                        velY = JUMP_FORCE;
                        camera.position.y += 0.9;
                        jumpBuffered = false;
                        jumpBufferTimer = 0;
                    } else if (!isJumping) {
                        doJump();
                    } else {
                        jumpBuffered = true;
                        jumpBufferTimer = JUMP_BUFFER_WINDOW;
                    }
                }
            }
            if (code === 'KeyC' && !isSliding && !isJumping) {
                if (locked || isMobile) {
                    setKeyActive('c', true);
                    var now = Date.now();
                    if (dashCooldown <= 0 && now - lastSlideTime < 150) {
                        var dashDist = 15;
                        camera.position.x += Math.sin(yaw) * dashDist;
                        camera.position.z += Math.cos(yaw) * dashDist;
                        dashCooldown = 0.8;
                    } else {
                        isSliding = true;
                        slideTimer = SLIDE_DURATION;
                        const SLIDE_BOOST = 1.8;

                        let dirX = 0, dirZ = 0;
                        if (moveF) dirZ -= 1;
                        if (moveB) dirZ += 1;
                        if (moveL) dirX -= 1;
                        if (moveR) dirX += 1;
                        const cos = Math.cos(yaw), sin = Math.sin(yaw);
                        const wishX = cos * dirX + sin * dirZ;
                        const wishZ = -sin * dirX + cos * dirZ;
                        const wishLen = Math.sqrt(wishX * wishX + wishZ * wishZ);

                        const currentSpeed = Math.sqrt(velX * velX + velZ * velZ);
                        const moveSpeedFloor = wishLen > 0 ? (sprint ? SPRINT_SPEED : WALK_SPEED) * 0.85 : 0;
                        const baseSpeed = Math.max(currentSpeed, moveSpeedFloor, SLIDE_MIN_SPEED * 1.5);

                        if (wishLen > 0.001) {
                            const nx = wishX / wishLen;
                            const nz = wishZ / wishLen;
                            slideVelX = nx * baseSpeed * SLIDE_BOOST;
                            slideVelZ = nz * baseSpeed * SLIDE_BOOST;
                        } else if (currentSpeed > 0.001) {
                            slideVelX = (velX / currentSpeed) * baseSpeed * SLIDE_BOOST;
                            slideVelZ = (velZ / currentSpeed) * baseSpeed * SLIDE_BOOST;
                        } else {

                            slideVelX = Math.sin(yaw) * baseSpeed * SLIDE_BOOST;
                            slideVelZ = Math.cos(yaw) * baseSpeed * SLIDE_BOOST;
                        }
                        velX = slideVelX;
                        velZ = slideVelZ;
                        camera.position.y -= 0.9;
                    }
                }
            }
            if (code === 'KeyV') {
                if (locked || isMobile) {
                    setKeyActive('v', true);
                    targetFov = zoomFov;
                }
            }
            if (code === 'KeyF') {
                if (locked || isMobile) {
                    setKeyActive('f', true);
                    useItem();
                    activeItem = null;
                }
            }
            if (code === 'Space' || code === 'KeyC') {
                e.preventDefault();
            }
        });

        document.addEventListener('keyup', function(e) {
            var code = e.code;
            if (code === 'KeyW' || code === 'ArrowUp') { moveF = false; setKeyActive('w', false); }
            if (code === 'KeyS' || code === 'ArrowDown') { moveB = false; setKeyActive('s', false); }
            if (code === 'KeyA') { moveL = false; setKeyActive('a', false); }
            if (code === 'KeyD') { moveR = false; setKeyActive('d', false); }
            if (code === 'ArrowLeft') moveLeft = false;
            if (code === 'ArrowRight') moveRight = false;
            if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyL') {
                sprint = false;
                setKeyActive('shift', false);
                var mobSprint = document.getElementById('mob-sprint');
                if (mobSprint) mobSprint.classList.remove('toggled');
            }
            if (code === 'Space') setKeyActive('space', false);
            if (code === 'KeyC') setKeyActive('c', false);
            if (code === 'KeyF') setKeyActive('f', false);
            if (code === 'KeyV') { setKeyActive('v', false); targetFov = baseFov; }
        });

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        function playFootstep() {
            const bufLen = audioCtx.sampleRate * 0.05;
            const buf = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < bufLen; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 6);
            }
            const src = audioCtx.createBufferSource();
            src.buffer = buf;
            const lp = audioCtx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 220;
            src.playbackRate.value = 0.9 + Math.random() * 0.25;
            const gain = audioCtx.createGain();
            gain.gain.value = 0.35;
            src.connect(lp);
            lp.connect(gain);
            gain.connect(audioCtx.destination);
            src.start();
        }

        let windNode = null;
        let windGain = null;
        let windFilter = null;
        function startWind() {
            if (windNode) return;
            const bufLen = audioCtx.sampleRate * 4;
            const buf = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < bufLen; i++) {
                data[i] = (Math.random() * 2 - 1) * 0.3;
            }
            windNode = audioCtx.createBufferSource();
            windNode.buffer = buf;
            windNode.loop = true;
            windFilter = audioCtx.createBiquadFilter();
            windFilter.type = 'lowpass';
            windFilter.frequency.value = 400;
            windGain = audioCtx.createGain();
            windGain.gain.value = 0;
            windNode.connect(windFilter);
            windFilter.connect(windGain);
            windGain.connect(audioCtx.destination);
            windNode.start();
        }
        let targetWindGain = 0;
        let targetWindFreq = 400;
        function updateWind(speed) {
            if (!windGain || !windFilter) return;
            const minSpeed = 15;
            const maxSpeed = 80;
            if (speed < minSpeed) {
                targetWindGain = 0;
            } else {
                const t = Math.min(1, (speed - minSpeed) / (maxSpeed - minSpeed));
                targetWindGain = t * 0.15;
                targetWindFreq = 300 + t * 600;
            }
            windGain.gain.value += (targetWindGain - windGain.gain.value) * 0.1;
            windFilter.frequency.value += (targetWindFreq - windFilter.frequency.value) * 0.1;
        }

        let figureSoundGain = null;
        let figureOsc = null;
        let kanyeAudio = null;
        let kanyeGainNode = null;
        let stalinAudio = null;
        let stalinGainNode = null;
        let flightAudio = null;
        let flightGainNode = null;

        let breathingAudio = null;
        let breathingGainNode = null;
        function loadBreathingAudio() {
            if (breathingAudio) return;
            breathingAudio = new Audio('assets/audio/breathing.mp3');
            breathingAudio.loop = true;
            breathingAudio.crossOrigin = 'anonymous';
            breathingAudio.addEventListener('canplaythrough', () => {
                if (audioCtx.state === 'suspended') audioCtx.resume();
                const source = audioCtx.createMediaElementSource(breathingAudio);
                breathingGainNode = audioCtx.createGain();
                breathingGainNode.gain.value = 0;
                source.connect(breathingGainNode);
                breathingGainNode.connect(audioCtx.destination);
                breathingAudio.play();
            });
            breathingAudio.load();
        }

        const figureAudioMap = {
            default: { audio: null, gainNode: null, file: 'assets/audio/flight.mp3' },
            kanye: { audio: null, gainNode: null, file: 'assets/audio/kanye.mp3' },
            scaryguy: { audio: null, gainNode: null, file: 'assets/audio/scary.mp3' },
            stalin: { audio: null, gainNode: null, file: 'assets/audio/stalin.mp3' },
            training: null
        };

        let muteFigureProximitySound = localStorage.getItem('rngMuteFigureSound') === 'true';

        function getFigureAudioConfig(value) {
            if (value.startsWith('custom_')) {
                return null;
            }
            return figureAudioMap[value] || null;
        }

        function playFigureSound(distance) {
            if (muteFigureProximitySound) return;
            const audioConfig = getFigureAudioConfig(figureSelect.value);
            if (audioConfig) {
                if (!audioConfig.audio) {
                    audioConfig.audio = new Audio(audioConfig.file);
                    audioConfig.audio.loop = true;
                    audioConfig.audio.crossOrigin = 'anonymous';
                    audioConfig.audio.addEventListener('canplaythrough', () => {
                        if (audioCtx.state === 'suspended') audioCtx.resume();
                        const source = audioCtx.createMediaElementSource(audioConfig.audio);
                        audioConfig.gainNode = audioCtx.createGain();
                        audioConfig.gainNode.gain.value = 0;
                        source.connect(audioConfig.gainNode);
                        audioConfig.gainNode.connect(audioCtx.destination);
                        audioConfig.audio.play();
                    }, { once: true });
                }
                if (audioConfig.gainNode) {
                    const volume = Math.max(0, Math.min(0.5, 0.5 - distance / 120));
                    audioConfig.gainNode.gain.setTargetAtTime(volume, audioCtx.currentTime, 0.3);
                }
            } else {
                if (!figureOsc) {
                    figureOsc = audioCtx.createOscillator();
                    figureOsc.type = 'sine';
                    figureSoundGain = audioCtx.createGain();
                    figureSoundGain.gain.value = 0;
                    const lp = audioCtx.createBiquadFilter();
                    lp.type = 'lowpass';
                    lp.frequency.value = 300;
                    figureOsc.connect(lp);
                    lp.connect(figureSoundGain);
                    figureSoundGain.connect(audioCtx.destination);
                    figureOsc.start();
                }
                const volume = Math.max(0, Math.min(0.3, 0.3 - distance / 150));
                const freq = 80 + (figureSelect.value === 'scaryguy' ? 40 : 0);
                figureOsc.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.3);
                figureSoundGain.gain.setTargetAtTime(volume, audioCtx.currentTime, 0.3);
            }
        }

        function stopFigureSound() {
            if (figureSoundGain) {
                figureSoundGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.2);
            }
            for (const key in figureAudioMap) {
                const cfg = figureAudioMap[key];
                if (cfg && cfg.gainNode) {
                    cfg.gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.2);
                }
                if (cfg && cfg.audio) {
                    cfg.audio.pause();
                    cfg.audio.currentTime = 0;
                    cfg.audio = null;
                    cfg.gainNode = null;
                }
            }
            if (figureOsc) {
                figureOsc.stop();
                figureOsc = null;
                figureSoundGain = null;
            }
        }

        const BASE_Y = 1.7;
        const WALK_SPEED = 14;
        const SPRINT_SPEED = 60;
        const GROUND_ACCEL = 12;
        const GROUND_FRICTION_MOVING = 8;
        const GROUND_FRICTION_STOP = 18;
        const AIR_ACCEL = 2.5;
        const AIR_WISHSPEED = 18;
        const JUMP_FORCE = 12;
        const GRAVITY = 24;

        let velX = 0, velY = 0, velZ = 0;

        const figureSelect = document.getElementById('figureSelect');
        const aiTypeSelect = document.getElementById('aiTypeSelect');

        let playerPosHistory = [];
        let strategistWaitTimer = 0;
        let strategistState = 'chase';

        const clock = new THREE.Clock();
        const dir = new THREE.Vector3();
        let dead = false;
        let gameTime = 0;
        let isTraining = false;

        function loadCoins() {
            const stored = localStorage.getItem('rngCoins');
            return stored ? parseInt(stored, 10) : 0;
        }

        function saveCoins(c) {
            localStorage.setItem('rngCoins', c.toString());
        }

        let coins = loadCoins();

        let jumpCombo = 0;


        const DAILY_CHALLENGE_VERSION = 1;
        const DAILY_CHALLENGES_KEY = 'rngDailyChallengesV' + DAILY_CHALLENGE_VERSION;
        const DAILY_CHALLENGES_DATE_KEY = 'rngDailyChallengesDateV' + DAILY_CHALLENGE_VERSION;
        const DAILY_CHALLENGES_PROGRESS_KEY = 'rngDailyChallengesProgressV' + DAILY_CHALLENGE_VERSION;

        function getLocalDateKey() {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }

        function createSeededRng(seedStr) {
            let h = 2166136261;
            for (let i = 0; i < seedStr.length; i++) {
                h ^= seedStr.charCodeAt(i);
                h = Math.imul(h, 16777619);
            }
            let state = h >>> 0;
            return () => {
                state = (Math.imul(1664525, state) + 1013904223) >>> 0;
                return state / 4294967296;
            };
        }

        const DAILY_CHALLENGE_POOL = [
            { id: 'survive_120', title: 'Survive for 2:00', kind: 'survive', target: 120, reward: 40 },
            { id: 'survive_300', title: 'Survive for 5:00', kind: 'survive', target: 300, reward: 80 },
            { id: 'collect_gems_5', title: 'Collect 5 gems', kind: 'collect_gem', target: 5, reward: 60 },
            { id: 'collect_gems_10', title: 'Collect 10 gems', kind: 'collect_gem', target: 10, reward: 120 },
            { id: 'use_fireworks_3', title: 'Use 3 fireworks', kind: 'use_firework', target: 3, reward: 70 },
            { id: 'solve_puzzle_1', title: 'Solve 1 puzzle', kind: 'solve_puzzle', target: 1, reward: 80 },
        ];

        let dailyChallenges = [];
        let dailyChallengeProgress = {};

        function loadDailyChallenges() {
            const todayKey = getLocalDateKey();
            const storedDate = localStorage.getItem(DAILY_CHALLENGES_DATE_KEY);
            const storedChallenges = localStorage.getItem(DAILY_CHALLENGES_KEY);
            const storedProgress = localStorage.getItem(DAILY_CHALLENGES_PROGRESS_KEY);

            if (storedDate !== todayKey || !storedChallenges) {
                const rng = createSeededRng(todayKey + '|rng');
                const pool = [...DAILY_CHALLENGE_POOL];
                const chosen = [];
                while (chosen.length < 3 && pool.length > 0) {
                    const idx = Math.floor(rng() * pool.length);
                    chosen.push(pool.splice(idx, 1)[0]);
                }
                dailyChallenges = chosen;
                dailyChallengeProgress = {};
                for (const ch of dailyChallenges) {
                    dailyChallengeProgress[ch.id] = { progress: 0, completed: false, claimed: false };
                }
                localStorage.setItem(DAILY_CHALLENGES_DATE_KEY, todayKey);
                localStorage.setItem(DAILY_CHALLENGES_KEY, JSON.stringify(dailyChallenges));
                localStorage.setItem(DAILY_CHALLENGES_PROGRESS_KEY, JSON.stringify(dailyChallengeProgress));
            } else {
                try {
                    dailyChallenges = JSON.parse(storedChallenges);
                } catch {
                    dailyChallenges = [];
                }
                try {
                    dailyChallengeProgress = storedProgress ? JSON.parse(storedProgress) : {};
                } catch {
                    dailyChallengeProgress = {};
                }
                for (const ch of dailyChallenges) {
                    if (!dailyChallengeProgress[ch.id]) {
                        dailyChallengeProgress[ch.id] = { progress: 0, completed: false, claimed: false };
                    }
                }
            }
        }

        function saveDailyChallengeProgress() {
            localStorage.setItem(DAILY_CHALLENGES_PROGRESS_KEY, JSON.stringify(dailyChallengeProgress));
        }

        function renderDailyChallenges() {
            const container = document.getElementById('dailyChallenges');
            if (!container) return;
            if (!dailyChallenges || dailyChallenges.length === 0) {
                container.innerHTML = '<div style="font-family:Arial,sans-serif;font-size:11px;color:#000;">No challenges today.</div>';
                return;
            }
            container.innerHTML = '';
            for (const ch of dailyChallenges) {
                const st = dailyChallengeProgress[ch.id] || { progress: 0, completed: false, claimed: false };
                const row = document.createElement('div');
                row.className = 'challenge-row' + (st.completed ? ' challenge-done' : '');
                const progText = `${Math.min(st.progress, ch.target)}/${ch.target}`;
                row.innerHTML = `
                    <div class="challenge-title">${ch.title}</div>
                    <div class="challenge-meta">
                        <span class="challenge-progress">${st.completed ? 'DONE' : progText}</span>
                        <span class="challenge-reward">+${ch.reward}</span>
                    </div>
                `;
                container.appendChild(row);
            }
        }

        function tryCompleteDailyChallenge(ch) {
            const st = dailyChallengeProgress[ch.id];
            if (!st || st.completed) return;
            if (st.progress >= ch.target) {
                st.completed = true;
                if (!isTraining && !sandboxMode) {
                    coins += ch.reward;
                    saveCoins(coins);
                    const coinsEl = document.getElementById('coins');
                    if (coinsEl) coinsEl.textContent = coins;
                    const homeCoinsEl = document.getElementById('homeCoins');
                    if (homeCoinsEl) homeCoinsEl.textContent = coins;
                    hudText.textContent = `DAILY +${ch.reward} COINS!`;
                    setTimeout(() => hudText.textContent = isTraining ? 'TRAINING MODE' : 'RUN...', 2000);
                }
                saveDailyChallengeProgress();
                renderDailyChallenges();
            }
        }

        function addDailyChallengeProgress(kind, amount = 1, absoluteValue = null) {
            if (isTraining || sandboxMode || dead || !gameStarted) return;
            for (const ch of dailyChallenges) {
                if (ch.kind !== kind) continue;
                const st = dailyChallengeProgress[ch.id];
                if (!st || st.completed) continue;
                if (absoluteValue !== null) st.progress = Math.max(st.progress, absoluteValue);
                else st.progress += amount;
                if (st.progress > ch.target) st.progress = ch.target;
                tryCompleteDailyChallenge(ch);
            }
            saveDailyChallengeProgress();
            renderDailyChallenges();
        }

        function doJump() {
            isJumping = true;
            velY = JUMP_FORCE;
            if (landingMomentumTimer > 0) {
                jumpCombo++;
                const boostFactor = 1.0 + 0.15 * Math.pow(1.25, jumpCombo - 1);
                velX *= boostFactor;
                velZ *= boostFactor;
                landingMomentumTimer = 0;
            } else {
                jumpCombo = 0;
            }
            jumpBuffered = false;
            jumpBufferTimer = 0;
        }

        loadDailyChallenges();
        renderDailyChallenges();

        function saveCustomFigures(figures) {
            localStorage.setItem('rngCustomFigures', JSON.stringify(figures));
        }

        function updateCustomFiguresList() {
            const list = document.getElementById('customFiguresList');
            list.innerHTML = '';
            customFigures.forEach((fig, i) => {
                const item = document.createElement('div');
                item.className = 'custom-figure-item';
                item.innerHTML = `<img src="${fig.image}"><span>${fig.name}</span>`;
                item.onclick = () => {
                    const select = document.getElementById('figureSelect');
                    select.value = 'custom_' + i;
                };
                list.appendChild(item);
            });
            const select = document.getElementById('figureSelect');
            customFigures.forEach((fig, i) => {
                let opt = select.querySelector('option[value="custom_' + i + '"]');
                if (!opt) {
                    opt = document.createElement('option');
                    opt.value = 'custom_' + i;
                    select.appendChild(opt);
                }
                opt.textContent = fig.name;
            });
        }

        document.getElementById('createFigureBtn').addEventListener('click', () => {
            const nameInput = document.getElementById('customFigureName');
            const fileInput = document.getElementById('customFigureUpload');
            const name = nameInput.value.trim();
            const file = fileInput.files[0];
            if (!name || !file) {
                alert('Please enter a name and upload an image');
                return;
            }
            if (coins < 30) {
                alert('Not enough coins (need 30)');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const aspect = img.width / img.height;
                    coins -= 30;
                    saveCoins(coins);
                    document.getElementById('homeCoins').textContent = 'COINS: ' + coins;
                    customFigures.push({ name: name, image: e.target.result, aspect: aspect });
                    saveCustomFigures(customFigures);
                    updateCustomFiguresList();
                    alert('Figure created! Please refresh the page to use it.');
                    nameInput.value = '';
                    fileInput.value = '';
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });

        updateCustomFiguresList();


        const mp3PlayerWindow = document.getElementById('mp3PlayerWindow');
        const mp3Audio = new Audio();
        let mp3Playlist = [];
        let mp3CurrentIndex = -1;
        let mp3IsPlaying = false;
        let mp3Db = null;
        let mp3OldSpeakerFilterEnabled = localStorage.getItem('rngMp3OldSpeakerFilter') === 'true';

        let mp3TrackNode = null;
        let mp3Highpass = null;
        let mp3Lowpass = null;

        function initMp3AudioGraph() {
            if (mp3TrackNode) return;
            try {
                mp3TrackNode = audioCtx.createMediaElementSource(mp3Audio);
                mp3Highpass = audioCtx.createBiquadFilter();
                mp3Lowpass = audioCtx.createBiquadFilter();

                mp3Highpass.type = 'highpass';
                mp3Highpass.frequency.value = 300;
                mp3Lowpass.type = 'lowpass';
                mp3Lowpass.frequency.value = 1500;

                applyMp3FilterRouting();
            } catch (e) {
                console.warn('Could not initialize MP3 audio graph:', e);
            }
        }

        function applyMp3FilterRouting() {
            if (!mp3TrackNode) return;
            try {
                mp3TrackNode.disconnect();
                mp3Highpass.disconnect();
                mp3Lowpass.disconnect();
            } catch { }

            if (mp3OldSpeakerFilterEnabled) {
                mp3TrackNode.connect(mp3Highpass);
                mp3Highpass.connect(mp3Lowpass);
                mp3Lowpass.connect(audioCtx.destination);
            } else {
                mp3TrackNode.connect(audioCtx.destination);
            }
        }

        function openMp3Db() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('rngMp3Player', 1);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    mp3Db = request.result;
                    resolve(mp3Db);
                };
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('tracks')) {
                        db.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true });
                    }
                };
            });
        }

        async function loadMp3Playlist() {
            try {
                await openMp3Db();
                const transaction = mp3Db.transaction(['tracks'], 'readonly');
                const store = transaction.objectStore('tracks');
                const request = store.getAll();
                return new Promise((resolve) => {
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => resolve([]);
                });
            } catch (e) {
                console.warn('Could not load MP3 playlist:', e);
                return [];
            }
        }

        async function saveMp3Playlist() {
            try {
                await openMp3Db();
                const transaction = mp3Db.transaction(['tracks'], 'readwrite');
                const store = transaction.objectStore('tracks');
                store.clear();
                mp3Playlist.forEach(track => {
                    store.add({ name: track.name, blob: track.blob });
                });
            } catch (e) {
                console.warn('Could not save MP3 playlist:', e);
            }
        }

        async function loadMp3TracksFromDb() {
            const tracks = await loadMp3Playlist();
            return tracks.map(t => ({
                name: t.name,
                blob: t.blob,
                url: URL.createObjectURL(t.blob)
            }));
        }

        function formatTime(seconds) {
            const m = Math.floor(seconds / 60);
            const s = Math.floor(seconds % 60);
            return m + ':' + s.toString().padStart(2, '0');
        }

        function updateMp3Display() {
            const trackName = document.getElementById('mp3TrackName');
            const currentTime = document.getElementById('mp3CurrentTime');
            const totalTime = document.getElementById('mp3TotalTime');
            const progress = document.getElementById('mp3Progress');
            const playBtn = document.getElementById('mp3PlayBtn');

            if (mp3CurrentIndex >= 0 && mp3Playlist[mp3CurrentIndex]) {
                trackName.textContent = mp3Playlist[mp3CurrentIndex].name;
                totalTime.textContent = formatTime(mp3Audio.duration || 0);
            } else {
                trackName.textContent = 'No track loaded';
                totalTime.textContent = '0:00';
            }
            currentTime.textContent = formatTime(mp3Audio.currentTime || 0);
            progress.style.width = (mp3Audio.duration ? (mp3Audio.currentTime / mp3Audio.duration * 100) : 0) + '%';
            playBtn.textContent = mp3IsPlaying ? 'PAUSE' : 'PLAY';
        }

        function updateMp3PlaylistUI() {
            const list = document.getElementById('mp3Playlist');
            list.innerHTML = '';
            mp3Playlist.forEach((track, i) => {
                const item = document.createElement('div');
                item.className = 'mp3-playlist-item' + (i === mp3CurrentIndex ? ' playing' : '');
                item.innerHTML = `<span>${track.name}</span><button class="remove-btn" data-index="${i}">X</button>`;
                item.onclick = (e) => {
                    if (e.target.classList.contains('remove-btn')) {
                        mp3Playlist.splice(i, 1);
                        if (mp3CurrentIndex >= i) mp3CurrentIndex--;
                        saveMp3Playlist();
                        updateMp3PlaylistUI();
                        if (mp3CurrentIndex >= 0) {
                            mp3Audio.src = mp3Playlist[mp3CurrentIndex].url;
                            updateMp3Display();
                        } else {
                            mp3Audio.src = '';
                            mp3IsPlaying = false;
                            updateMp3Display();
                        }
                    } else {
                        mp3CurrentIndex = i;
                        mp3Audio.src = track.url;
                        mp3Audio.play();
                        mp3IsPlaying = true;
                        mp3PlayerWindow.classList.add('playing');
                        updateMp3PlaylistUI();
                        updateMp3Display();
                    }
                };
                list.appendChild(item);
            });
        }

        mp3Audio.addEventListener('timeupdate', updateMp3Display);
        mp3Audio.addEventListener('play', () => {
            initMp3AudioGraph();
            if (audioCtx.state === 'suspended') audioCtx.resume();
        });
        mp3Audio.addEventListener('ended', () => {
            if (mp3CurrentIndex < mp3Playlist.length - 1) {
                mp3CurrentIndex++;
                mp3Audio.src = mp3Playlist[mp3CurrentIndex].url;
                mp3Audio.play();
                mp3IsPlaying = true;
                mp3PlayerWindow.classList.add('playing');
                updateMp3PlaylistUI();
            } else {
                mp3IsPlaying = false;
                mp3PlayerWindow.classList.remove('playing');
            }
            updateMp3Display();
        });

        document.getElementById('mp3PlayerBtn').addEventListener('click', () => {
            mp3PlayerWindow.classList.remove('hidden');
        });


        let mp3Dragging = false;
        let mp3DragOffsetX = 0;
        let mp3DragOffsetY = 0;

        mp3PlayerWindow.querySelector('.mp3-player-titlebar').addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('win-btn')) return;
            mp3Dragging = true;
            mp3DragOffsetX = e.clientX - mp3PlayerWindow.offsetLeft;
            mp3DragOffsetY = e.clientY - mp3PlayerWindow.offsetTop;
            mp3PlayerWindow.style.right = 'auto';
            mp3PlayerWindow.style.left = e.clientX - mp3DragOffsetX + 'px';
            mp3PlayerWindow.style.top = e.clientY - mp3DragOffsetY + 'px';
        });

        document.addEventListener('mousemove', (e) => {
            if (!mp3Dragging) return;
            mp3PlayerWindow.style.left = e.clientX - mp3DragOffsetX + 'px';
            mp3PlayerWindow.style.top = e.clientY - mp3DragOffsetY + 'px';
        });

        document.addEventListener('mouseup', () => {
            mp3Dragging = false;
        });

        document.getElementById('mp3MinimizeBtn').addEventListener('click', () => {
            mp3PlayerWindow.classList.toggle('minimized');
        });

        document.getElementById('mp3CloseBtn').addEventListener('click', () => {
            mp3Audio.pause();
            mp3IsPlaying = false;
            mp3PlayerWindow.classList.remove('playing', 'hidden');
            mp3PlayerWindow.classList.add('hidden');
        });

        document.getElementById('mp3PlayBtn').addEventListener('click', () => {
            if (mp3CurrentIndex >= 0) {
                if (mp3IsPlaying) {
                    mp3Audio.pause();
                    mp3IsPlaying = false;
                    mp3PlayerWindow.classList.remove('playing');
                } else {
                    mp3Audio.play();
                    mp3IsPlaying = true;
                    mp3PlayerWindow.classList.add('playing');
                }
                updateMp3Display();
            }
        });

document.getElementById('mp3PrevBtn').addEventListener('click', () => {
            if (mp3CurrentIndex > 0) {
                mp3CurrentIndex--;
                mp3Audio.src = mp3Playlist[mp3CurrentIndex].url;
                if (mp3IsPlaying) mp3Audio.play();
                updateMp3PlaylistUI();
                updateMp3Display();
            }
        });

        document.getElementById('mp3NextBtn').addEventListener('click', () => {
            if (mp3CurrentIndex < mp3Playlist.length - 1) {
                mp3CurrentIndex++;
                mp3Audio.src = mp3Playlist[mp3CurrentIndex].url;
                if (mp3IsPlaying) mp3Audio.play();
                updateMp3PlaylistUI();
                updateMp3Display();
            }
        });

        document.getElementById('mp3Upload').addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            let loaded = 0;
            files.forEach(file => {
                mp3Playlist.push({
                    name: file.name,
                    blob: file,
                    url: URL.createObjectURL(file)
                });
                loaded++;
                if (loaded === files.length) {
                    saveMp3Playlist();
                    updateMp3PlaylistUI();
                    if (mp3CurrentIndex === -1 && mp3Playlist.length > 0) {
                        mp3CurrentIndex = 0;
                        mp3Audio.src = mp3Playlist[0].url;
                        updateMp3Display();
                    }
                }
            });
            e.target.value = '';
        });

        async function ensureMp3Loaded() {
            const el = document.getElementById('mp3Playlist');
            if (!el) {
                setTimeout(ensureMp3Loaded, 100);
                return;
            }
            if (mp3Playlist.length === 0) {
                mp3Playlist = await loadMp3TracksFromDb();
                if (mp3Playlist.length > 0) {
                    mp3CurrentIndex = 0;
                    mp3Audio.src = mp3Playlist[0].url;
                    updateMp3PlaylistUI();
                }
            }
        }
        ensureMp3Loaded();

        document.getElementById('customizeBtn').addEventListener('click', () => {
            document.getElementById('customizePopup').classList.remove('hidden');
        });

        document.querySelector('.popup-close').addEventListener('click', () => {
            document.getElementById('customizePopup').classList.add('hidden');
        });

        document.getElementById('customizePopup').addEventListener('click', (e) => {
            if (e.target === document.getElementById('customizePopup')) {
                document.getElementById('customizePopup').classList.add('hidden');
            }
        });

        useCustomTime = localStorage.getItem('rngUseCustomTime') === 'true';
        const storedTime = localStorage.getItem('rngCustomTime') || '12:00';
        const [storedHour, storedMin] = storedTime.split(':');
        customTimeValue = storedTime;
        const storedMinutes = parseInt(storedHour) * 60 + parseInt(storedMin);

        const customTimeInput = document.getElementById('customTimeInput');
        const useLocalTimeToggle = document.getElementById('useLocalTimeToggle');
        const muteFigureSoundToggle = document.getElementById('muteFigureSoundToggle');
        const mp3OldSpeakerFilterToggle = document.getElementById('mp3OldSpeakerFilterToggle');
        const settingsPopup = document.getElementById('settingsPopup');

        customTimeInput.value = storedMinutes;
        useLocalTimeToggle.checked = !useCustomTime;
        customTimeInput.disabled = !useCustomTime;
        muteFigureSoundToggle.checked = muteFigureProximitySound;
        mp3OldSpeakerFilterToggle.checked = mp3OldSpeakerFilterEnabled;

        useLocalTimeToggle.addEventListener('change', () => {
            useCustomTime = !useLocalTimeToggle.checked;
            customTimeInput.disabled = !useCustomTime;
            localStorage.setItem('rngUseCustomTime', useCustomTime);
            updateDayNight();
        });

        customTimeInput.addEventListener('input', () => {
            const minutes = parseInt(customTimeInput.value);
            const hour = Math.floor(minutes / 60);
            const min = minutes % 60;
            customTimeValue = `${hour}:${min.toString().padStart(2, '0')}`;
            localStorage.setItem('rngCustomTime', customTimeValue);
            updateDayNight();
            updateCelestialBodies();
        });

        muteFigureSoundToggle.addEventListener('change', () => {
            muteFigureProximitySound = muteFigureSoundToggle.checked;
            localStorage.setItem('rngMuteFigureSound', muteFigureProximitySound);
            if (muteFigureProximitySound) stopFigureSound();
        });

        mp3OldSpeakerFilterToggle.addEventListener('change', () => {
            mp3OldSpeakerFilterEnabled = mp3OldSpeakerFilterToggle.checked;
            localStorage.setItem('rngMp3OldSpeakerFilter', mp3OldSpeakerFilterEnabled);
            initMp3AudioGraph();
            applyMp3FilterRouting();
        });

        document.getElementById('settingsBtn').addEventListener('click', () => {
            settingsPopup.classList.remove('hidden');
        });

        document.getElementById('discordBtn').addEventListener('click', () => {
            window.open('https://discord.gg/QR99DCgWys', '_blank');
        });

        settingsPopup.querySelectorAll('.popup-close').forEach(btn => {
            btn.addEventListener('click', () => {
                settingsPopup.classList.add('hidden');
            });
        });

        settingsPopup.addEventListener('click', (e) => {
            if (e.target === settingsPopup) {
                settingsPopup.classList.add('hidden');
            }
        });

        function loadLeaderboard() {
            const stored = localStorage.getItem('rngLeaderboard');
            return stored ? JSON.parse(stored) : [];
        }

        function saveScore(time) {
            const scores = loadLeaderboard();
            scores.push({ time, date: Date.now() });
            scores.sort((a, b) => b.time - a.time);
            const top5 = scores.slice(0, 5);
            localStorage.setItem('rngLeaderboard', JSON.stringify(top5));
            return top5;
        }

        function updateHomeLeaderboard() {
            const scores = loadLeaderboard();
            const container = document.getElementById('homeLeaderboard');
            if (scores.length === 0) {
                container.innerHTML = '<h3>Top Runs</h3><div class="score-row">No runs yet</div>';
            } else {
                container.innerHTML = '<h3>Top Runs</h3>' + scores.map((s, i) => {
                    const m = Math.floor(s.time / 60);
                    const sec = Math.floor(s.time % 60);
                    const cls = i === 0 ? 'first' : '';
                    return `<div class="score-row ${cls}"><span>${i + 1}.</span><span>${m}:${sec.toString().padStart(2, '0')}</span></div>`;
                }).join('');
            }
        }

        updateHomeLeaderboard();
        document.getElementById('homeCoins').textContent = 'COINS: ' + coins;


        const shopItems = [
            { id: 'hand2', name: 'Suit', price: 100, image: 'hand2.png', type: 'hands' },
            { id: 'hand3', name: 'Cuty', price: 100, image: 'hand3.png', type: 'hands' },
            { id: 'hardmode', name: 'Hard Mode', price: 500, image: 'hardy.png', type: 'mode' }
        ];

        function loadShopData() {
            const owned = JSON.parse(localStorage.getItem('rngShopOwned') || '[]');
            const equipped = JSON.parse(localStorage.getItem('rngShopEquipped') || '{"hands": "default", "mode": null}');
            return { owned, equipped };
        }

        function saveShopData(owned, equipped) {
            localStorage.setItem('rngShopOwned', JSON.stringify(owned));
            localStorage.setItem('rngShopEquipped', JSON.stringify(equipped));
        }

        function updateShopUI() {
            const { owned, equipped } = loadShopData();
            const container = document.getElementById('shopItems');
            container.innerHTML = '';

            shopItems.forEach(item => {
                const isOwned = owned.includes(item.id);
                const isEquipped = equipped[item.type] === item.id || (item.type === 'mode' && equipped.mode === item.id);

                const div = document.createElement('div');
                div.className = 'shop-item' + (isOwned ? ' owned' : '') + (isEquipped ? ' equipped' : '');

                const img = document.createElement('img');
                img.src = 'assets/images/' + item.image;

                const info = document.createElement('div');
                info.className = 'shop-item-info';
                info.innerHTML = `
                    <div class="shop-item-name">${item.name}</div>
                    <div class="shop-item-price">${isOwned ? (isEquipped ? 'EQUIPPED' : 'OWNED') : item.price + ' coins'}</div>
                `;

                div.appendChild(img);
                div.appendChild(info);

                div.onclick = () => buyOrEquip(item);
                container.appendChild(div);
            });
        }

        function buyOrEquip(item) {
            const { owned, equipped } = loadShopData();

            if (item.type === 'mode') {
                if (equipped.mode === item.id) {

                    equipped.mode = null;
                    saveShopData(owned, equipped);
                    updateShopUI();
                    return;
                }
            } else if (item.type === 'hands') {
                if (equipped.hands === item.id) {
                    equipped.hands = 'default';
                    saveShopData(owned, equipped);
                    updateShopUI();
                    return;
                }
            } else {
                if (equipped.hands === item.id) {

                    return;
                }
            }

            if (owned.includes(item.id)) {

                if (item.type === 'mode') {
                    equipped.mode = item.id;
                } else {
                    equipped.hands = item.id;
                }
                saveShopData(owned, equipped);
                updateShopUI();
            } else {

                if (coins >= item.price) {
                    coins -= item.price;
                    saveCoins(coins);
                    owned.push(item.id);
                    equipped.hands = item.id;
                    saveShopData(owned, equipped);
                    document.getElementById('homeCoins').textContent = 'COINS: ' + coins;
                    updateShopUI();
                }
            }
        }

        function hasHardMode() {
            const { equipped } = loadShopData();
            return equipped.mode === 'hardmode';
        }

        updateShopUI();

        let figureActive = false;
        let figureTriggered = false;
        let figureGazeTime = 0;
        let figureSpeedVar = 0;
        let countdown = 0;
        let gameStarted = false;

        let inventory = [null, null, null];
        let selectedSlot = 0;
        let activeItem = null;
        let speedBoostTimer = 0;
        let gemStacks = 0;
        let figureStuckTimer = 0;
        let figureHeadStartTimer = 0;
        let bearTrapPlaced = false;
        let bearTrapPos = null;
        let flareActive = false;
        let flareTimer = 0;
        let flarePos = null;
        let figureTargetFlare = false;

        let workTimer = 0;
        let isWorking = false;
        let nearMachine = null;

        let placedItems = [];

        const FIGURE_START_Z = -60;
        const FIGURE_BASE_SPEED = 24;
        const FIGURE_CHASE_SPEED = 55;
        const FIGURE_ACTIVATION_DIST = 55;
        let currentStaticOpacity = 0;

        function resetGame() {
            dead = false;
            figureActive = false;
            figureTriggered = false;
            figureGazeTime = 0;
            figureSpeedVar = 0;
            figureStuckTimer = 0;
            gameStarted = false;
            inventory = [null, null, null];
            speedBoostTimer = 0;
            gemStacks = 0;
            bearTrapPlaced = false;
            bearTrapPos = null;
            flareActive = false;
            flareTimer = 0;
            flarePos = null;
            figureTargetFlare = false;
            if (bearTrapMesh) bearTrapMesh.visible = false;
            if (flareMesh) flareMesh.visible = false;
            updateInventoryUI();

            for (const item of itemMeshes) {
                item.userData.collected = false;
                item.visible = true;
            }

            if (figureMesh && figureTex[figureSelect.value]) {
                const aspect = figureAspects[figureSelect.value] || 0.5;
                figureMesh.geometry.dispose();
                figureMesh.geometry = new THREE.PlaneGeometry(FIG_H * aspect, FIG_H);
                figureMesh.material.map = figureTex[figureSelect.value];
                figureMesh.material.needsUpdate = true;
                figureMesh.visible = true;
                figureMesh.position.set(0, getTerrainHeight(0, camera.position.z - 60) + 2.5, camera.position.z - 60);
            }
            camera.position.set(0, getTerrainHeight(0, camera.position.z) + BASE_Y, camera.position.z);
            moveF = moveB = moveL = moveR = false;
            moveLeft = moveRight = false;
            sprint = false;
            isJumping = false;
            velX = 0;
            velY = 0;
            velZ = 0;
            isSliding = false;
            jumpBuffered = false;
            jumpBufferTimer = 0;
            currentStaticOpacity = 0;
            setStaticOpacity(0);
            deathEl.classList.remove('active');

            countdown = 3;
            startCountdownSpin();
            countdownEl.classList.add('active');
            countdownText.textContent = '3';
            hudText.textContent = 'RUN...';
            if (!isMobile) renderer.domElement.requestPointerLock();
        }

        let lastStep = 0;
        let bobTime = 0;
        let baseCameraY = BASE_Y;
        let countdownSpinActive = false;
        let countdownSpinStartYaw = 0;

        function startCountdownSpin() {
            countdownSpinActive = true;
            countdownSpinStartYaw = yaw;
        }

        function loop() {
            requestAnimationFrame(loop);
            const dt = Math.min(clock.getDelta(), 0.05);
            mobileControlsLoop();
            if (gameStarted && !dead && !isPaused && !isTraining && !sandboxMode) {
                addDailyChallengeProgress('survive', 0, Math.floor(gameTime));
            }

            if (countdown > 0) {
                countdown -= dt;
                if (countdownSpinActive) {
                    const total = 3;
                    const progress = Math.max(0, Math.min(1, (total - countdown) / total));
                    yaw = countdownSpinStartYaw + progress * Math.PI * 2;
                    pitch = 0;
                    camera.rotation.set(0, yaw, 0);
                }
                if (countdown > 2) countdownText.textContent = '3';
                else if (countdown > 1) countdownText.textContent = '2';
                else if (countdown > 0) countdownText.textContent = '1';
                if (countdown <= 0) {
                    countdownEl.classList.remove('active');
                    countdownSpinActive = false;
                    if (sandboxMode) {
                        gameStarted = true;
                        document.querySelectorAll('.game-ui').forEach(el => el.classList.remove('hidden'));
                        document.getElementById('sandboxWindow').classList.add('active');
                        const { equipped } = loadShopData();
                        if (handsMesh && handsTextures) {
                            const handImage = equipped.hands && handsTextures[equipped.hands + '.png'] ? equipped.hands + '.png' : 'hands.png';
                            if (handsTextures[handImage]) {
                                handsMesh.material.map = handsTextures[handImage];
                                handsMesh.material.needsUpdate = true;
                            }
                            handsMesh.visible = true;
                        }
                        if (!isMobile) renderer.domElement.requestPointerLock();
                    } else {
                        startGame();
                    }
                }
            }

            for (const bb of billboards) {
                const dx = camera.position.x - bb.position.x;
                const dz = camera.position.z - bb.position.z;
                const angle = Math.atan2(dx, dz);
                if (sandboxBillboard) {
                    if (bb.userData && bb.userData.isPortal) {
                        if (!bb.userData.spinDir) bb.userData.spinDir = Math.random() < 0.5 ? -1 : 1;
                        bb.rotation.z += dt * 2.2 * bb.userData.spinDir;
                        bb.rotation.set(0, angle, bb.rotation.z);
                    } else {
                        bb.rotation.set(0, angle, 0);
                    }
                }
            }

            if (sandboxMode && sandboxFigures.length > 0) {
                for (const fig of sandboxFigures) {
                    fig.rotation.y = sandboxBillboard ? Math.atan2(camera.position.x - fig.position.x, camera.position.z - fig.position.z) : 0;
                }
            }

            for (const item of itemMeshes) {
                if (!item.userData.collected && item.position.distanceTo(camera.position) < 3) {
                    const emptySlot = inventory.findIndex(s => s === null);
                    if (emptySlot !== -1) {
                        item.userData.collected = true;
                        item.visible = false;
                        inventory[emptySlot] = item.userData.itemType;
                        updateInventoryUI();
                        if (item.userData.itemType === 'gem') {
                            addDailyChallengeProgress('collect_gem', 1);
                        }
                    }
                }
            }


            if (gameStarted && !dead && !isPaused && !isTraining && !sandboxMode && !isPuzzleActive) {
                nearMachine = null;
                for (const m of machines) {
                    if (!m.active) continue;
                    const dist = Math.sqrt(Math.pow(camera.position.x - m.x, 2) + Math.pow(camera.position.z - m.z, 2));
                    if (dist < 4) { nearMachine = m; break; }
                }

                nearPuzzle = null;
                for (const p of puzzles) {
                    if (p.solved) continue;
                    const dist = Math.sqrt(Math.pow(camera.position.x - p.x, 2) + Math.pow(camera.position.z - p.z, 2));
                    if (dist < 4) { nearPuzzle = p; break; }
                }

                if (nearPuzzle && !nearPuzzle.solved) showNotice('Press F to solve puzzle');
                else if (nearMachine && !isWorking) showNotice('Press F to work');
                else hideNotice();
            } else {
                hideNotice();
            }


            if (portalCooldown > 0) portalCooldown -= dt;
            if (gameStarted && !dead && !isPaused && !isTraining && !sandboxMode && countdown <= 0 && !isPuzzleActive) {
                if (portalUsesRemaining > 0 && portalMeshes.length === 2 && portalCooldown <= 0) {
                    const d0 = camera.position.distanceTo(portalMeshes[0].position);
                    const d1 = camera.position.distanceTo(portalMeshes[1].position);
                    const triggerDist = 4.2;
                    let from = -1;
                    if (d0 < triggerDist) from = 0;
                    else if (d1 < triggerDist) from = 1;
                    if (from !== -1) {
                        const to = from === 0 ? 1 : 0;
                        const tx = portalPoints[to].x;
                        const tz = portalPoints[to].z;
                        camera.position.x = tx;
                        camera.position.z = tz;
                        camera.position.y = getTerrainHeight(tx, tz) + BASE_Y;
                        portalUsesRemaining--;
                        portalCooldown = 0.75;
                        if (portalUsesRemaining <= 0) {
                            clearPortals();
                        }
                    }
                }
            }

            if (gameStarted && (locked || isMobile || isPuzzleActive) && !dead && !isPaused) {
                gameTime += dt;

                if (flareActive) {
                    flareTimer -= dt;
                    if (flareMesh) {
                        const flash = Math.sin(Date.now() * 0.02) > 0;
                        flareMesh.material.opacity = flash ? 1 : 0.3;
                        flareMesh.material.needsUpdate = true;
                    }
                    if (flareTimer <= 0) {
                        flareActive = false;
                        figureTargetFlare = false;
                        if (flareMesh) flareMesh.visible = false;
                        flarePos = null;
                    }
                }

                const speedIncrease = 1 + Math.floor(gameTime / 10) * 0.01;
                const mins = Math.floor(gameTime / 60);
                const secs = Math.floor(gameTime % 60);
                document.getElementById('timer').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

                if (dashCooldown > 0) dashCooldown -= dt;

                if (speedBoostTimer > 0) speedBoostTimer -= dt;

                if (isWorking) {
                    workTimer -= dt;
                    const timerEl = document.getElementById('workTimer');
                    timerEl.classList.add('visible');
                    hideNotice();
                    const circle = document.getElementById('workTimerCircle');
                    const progress = (workTimer / 8) * 251.2;
                    circle.style.strokeDashoffset = 251.2 - progress;
                    if (workTimer <= 0) {
                        isWorking = false;
                        timerEl.classList.remove('visible');
                        if (!isTraining) {
                            coins += 10;
                            saveCoins(coins);
                            document.getElementById('coins').textContent = coins;
                            hudText.textContent = '+10 COINS!';
                            setTimeout(() => hudText.textContent = isTraining ? 'TRAINING MODE' : 'RUN...', 2000);
                        } else {
                            hudText.textContent = '+10 COINS (NOT SAVED)';
                            setTimeout(() => hudText.textContent = 'TRAINING MODE', 2000);
                        }
                    }
                }

                nearCellTower = null;
                let nearTower = false;
                for (const ct of cellTowers) {
                    const dist = Math.sqrt(Math.pow(camera.position.x - ct.x, 2) + Math.pow(camera.position.z - ct.z, 2));
                    if (dist < 6) {
                        nearCellTower = ct;
                        nearTower = true;
                        break;
                    }
                }

                if (nearTower) {
                    let nearestItem = null;
                    let nearestDist = Infinity;
                    for (const item of itemMeshes) {
                        if (item.userData.collected) continue;
                        const itemDist = Math.sqrt(Math.pow(camera.position.x - item.position.x, 2) + Math.pow(camera.position.z - item.position.z, 2));
                        if (itemDist < nearestDist) {
                            nearestDist = itemDist;
                            nearestItem = item;
                        }
                    }
                    if (nearestItem) {
                        const dx = nearestItem.position.x - camera.position.x;
                        const dz = nearestItem.position.z - camera.position.z;
                        const angle = Math.atan2(dx, dz);
                        const relativeAngle = angle - yaw;
                        const screenX = Math.max(-0.8, Math.min(0.8, Math.sin(relativeAngle)));
                        window.lootIndicator.style.left = `${50 + screenX * 50}%`;
                        window.lootIndicator.classList.add('visible');
                    }


                    if (portalMeshes && portalMeshes.length === 2 && window.portalIndicator) {
                        let nearestPortalIndex = 0;
                        const dp0 = camera.position.distanceTo(portalMeshes[0].position);
                        const dp1 = camera.position.distanceTo(portalMeshes[1].position);
                        nearestPortalIndex = dp1 < dp0 ? 1 : 0;
                        const target = portalMeshes[nearestPortalIndex].position;
                        const dxp = target.x - camera.position.x;
                        const dzp = target.z - camera.position.z;
                        const angp = Math.atan2(dxp, dzp);
                        const relp = angp - yaw;
                        const screenXp = Math.max(-0.8, Math.min(0.8, Math.sin(relp)));
                        window.portalIndicator.style.left = `${50 + screenXp * 50}%`;
                        window.portalIndicator.classList.add('visible');
                    } else if (window.portalIndicator) {
                        window.portalIndicator.classList.remove('visible');
                    }
                } else {
                    window.lootIndicator.classList.remove('visible');
                    if (window.portalIndicator) window.portalIndicator.classList.remove('visible');
                }

                if (isWorking) {
                    camera.position.y = getTerrainHeight(camera.position.x, camera.position.z) + BASE_Y;
                }


                if (jumpBufferTimer > 0) {
                    jumpBufferTimer -= dt;
                    if (jumpBufferTimer <= 0) jumpBuffered = false;
                }


                if (landingMomentumTimer > 0) {
                    landingMomentumTimer -= dt;
                }


                if (slideTimer > 0) {
                    slideTimer -= dt;
                    if (slideTimer <= 0) {
                        isSliding = false;
                        camera.position.y += 0.9;
                    }
                }


                const cos = Math.cos(yaw), sin = Math.sin(yaw);
                dir.set(0, 0, 0);
                if (moveF) dir.z -= 1;
                if (moveB) dir.z += 1;
                if (moveL) dir.x -= 1;
                if (moveR) dir.x += 1;

                const wishX = cos * dir.x + sin * dir.z;
                const wishZ = -sin * dir.x + cos * dir.z;
                const wishLen = Math.sqrt(wishX * wishX + wishZ * wishZ);


                if (isJumping) {
                    const wx = wishLen > 0 ? wishX / wishLen : 0;
                    const wz = wishLen > 0 ? wishZ / wishLen : 0;

                    const currentProj = velX * wx + velZ * wz;
                    const addSpeed = Math.max(0, AIR_WISHSPEED - currentProj);
                    const accelAmount = Math.min(addSpeed, AIR_ACCEL * AIR_WISHSPEED * dt);

                    velX += wx * accelAmount;
                    velZ += wz * accelAmount;

                    velY -= GRAVITY * dt;
                    camera.position.y += velY * dt;
                    camera.position.x += velX * dt;
                    camera.position.z += velZ * dt;

                    const groundY = getTerrainHeight(camera.position.x, camera.position.z) + BASE_Y;
                    if (camera.position.y <= groundY) {
                        camera.position.y = groundY;
                        isJumping = false;
                        landingMomentumTimer = LANDING_MOMENTUM_TIME;
                        const landSpeed = Math.sqrt(velX * velX + velZ * velZ);
                        if (landSpeed > 15) spawnDirtSplash(camera.position.x, camera.position.z);
                        if (jumpBuffered && jumpBufferTimer > 0) {
                            doJump();
                        }
                    }
                } else if (isSliding) {

                    const h1 = getTerrainHeight(camera.position.x, camera.position.z);
                    const nx2 = camera.position.x + slideVelX * dt;
                    const nz2 = camera.position.z + slideVelZ * dt;
                    const h2 = getTerrainHeight(nx2, nz2);
                    const slope = (h1 - h2) / (Math.sqrt(slideVelX * slideVelX + slideVelZ * slideVelZ) * dt + 0.001);


                    const slideBoost = 1.0 + Math.min(2.0, Math.max(0, slope) * 1.5);
                    slideFriction = SLIDE_FRICTION_BASE / slideBoost;

                    const MAX_SLIDE_SPEED = 80;
                    let slideSpeed = Math.sqrt(slideVelX * slideVelX + slideVelZ * slideVelZ);
                    if (slideSpeed > MAX_SLIDE_SPEED) {
                        const scale = MAX_SLIDE_SPEED / slideSpeed;
                        slideVelX *= scale;
                        slideVelZ *= scale;
                        slideSpeed = MAX_SLIDE_SPEED;
                    }
                    if (slideSpeed < SLIDE_MIN_SPEED) {
                        isSliding = false;
                        velX = slideVelX;
                        velZ = slideVelZ;
                        camera.position.y += 0.9;
                    } else {
                        const drop = slideSpeed * slideFriction * dt;
                        const newSlideSpeed = Math.max(0, slideSpeed - drop + (slideBoost - 1) * slideSpeed);
                        slideVelX *= newSlideSpeed / slideSpeed;
                        slideVelZ *= newSlideSpeed / slideSpeed;
                        velX = slideVelX;
                        velZ = slideVelZ;
                        camera.position.x += slideVelX * dt;
                        camera.position.z += slideVelZ * dt;
                        camera.position.y = getTerrainHeight(camera.position.x, camera.position.z) + BASE_Y - 0.9;
                    }
                } else {

                    const maxSpeed = sprint ? SPRINT_SPEED : WALK_SPEED;
                    let diagonalBoost = 1.0;
                    if (wishLen > 1.1) {
                        diagonalBoost = 1.2;
                    }


                    let effectiveMaxSpeed = maxSpeed * diagonalBoost;
                    let currentFriction = GROUND_FRICTION_MOVING;

                    if (speedBoostTimer > 0) {
                        speedBoostTimer -= dt;


                        effectiveMaxSpeed = maxSpeed * (1 + gemStacks);


                        currentFriction = GROUND_FRICTION_MOVING * 0.3;
                    }

                    if (speedBoostTimer <= 0) {
                        gemStacks = 0;
                    }

                    if (wishLen > 0) {
                        const wx = wishX / wishLen;
                        const wz = wishZ / wishLen;

                        const currentProj = velX * wx + velZ * wz;
                        const addSpeed = Math.max(0, effectiveMaxSpeed - currentProj);
                        const accelAmount = Math.min(addSpeed, GROUND_ACCEL * effectiveMaxSpeed * dt);

                        velX += wx * accelAmount;
                        velZ += wz * accelAmount;
                    }

                    const speed = Math.sqrt(velX * velX + velZ * velZ);
                    if (speed > 0) {
                        let frictionFactor = currentFriction;


                        if (landingMomentumTimer > 0) {
                            frictionFactor *= 0.2;
                        }


                        if (speed > effectiveMaxSpeed && speedBoostTimer <= 0) {
                            frictionFactor += (speed - maxSpeed) * 4;
                        }


                        if (wishLen === 0 && speedBoostTimer <= 0) {
                            frictionFactor = GROUND_FRICTION_STOP;
                        }

                        const drop = speed * frictionFactor * dt;
                        const newSpeed = Math.max(0, speed - drop);
                        velX *= newSpeed / speed;
                        velZ *= newSpeed / speed;
                    }

                    camera.position.x += velX * dt;
                    camera.position.z += velZ * dt;
                }


                const displaySpeed = Math.round(Math.sqrt(velX * velX + velZ * velZ) * 2.237);
                document.getElementById('speedo').textContent = displaySpeed + ' mph';
                const currentSpeed = Math.sqrt(velX * velX + velZ * velZ);
                updateWind(currentSpeed);


                if (Math.abs(camera.fov - targetFov) > 0.1) {
                    camera.fov += (targetFov - camera.fov) * 0.15;
                    camera.updateProjectionMatrix();
                }

                if (moveLeft) yaw += 2.5 * dt;
                if (moveRight) yaw -= 2.5 * dt;


                const isMovingOnGround = (moveF || moveB || moveL || moveR) && !isJumping && !isSliding;
                if (isMovingOnGround) {
                    bobTime += dt * (sprint ? 18 : 12);
                    const bobAmount = sprint ? 0.08 : 0.05;
                    baseCameraY = getTerrainHeight(camera.position.x, camera.position.z) + BASE_Y + Math.sin(bobTime) * bobAmount;
                } else if (!isJumping) {
                    baseCameraY = getTerrainHeight(camera.position.x, camera.position.z) + BASE_Y;
                }


                if (!isJumping && !isWorking && !isSliding) {
                    const groundY = getTerrainHeight(camera.position.x, camera.position.z) + BASE_Y;
                    camera.position.y = groundY;
                }


                let newX = camera.position.x;
                let newZ = camera.position.z;
                const playerRadius = 0.5;

                for (const tree of trees) {
                    const dx = newX - tree.position.x;
                    const dz = newZ - tree.position.z;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    const treeRadius = 1.0;
                    if (dist < playerRadius + treeRadius) {
                        const angle = Math.atan2(dz, dx);
                        newX = tree.position.x + Math.cos(angle) * (playerRadius + treeRadius);
                        newZ = tree.position.z + Math.sin(angle) * (playerRadius + treeRadius);
                    }
                }

                for (const rock of rocks) {
                    const dx = newX - rock.position.x;
                    const dz = newZ - rock.position.z;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    const rockRadius = 0.8;
                    if (dist < playerRadius + rockRadius) {
                        const angle = Math.atan2(dz, dx);
                        newX = rock.position.x + Math.cos(angle) * (playerRadius + rockRadius);
                        newZ = rock.position.z + Math.sin(angle) * (playerRadius + rockRadius);
                    }
                }

                const boundary = MAP_SIZE / 2 - 2;
                camera.position.x = Math.max(-boundary, Math.min(boundary, newX));
                camera.position.z = Math.max(-boundary, Math.min(boundary, newZ));

                const euler = new THREE.Euler(pitch, yaw, 0, 'YXZ');
                camera.quaternion.setFromEuler(euler);

                if (figureMesh && figureMesh.visible) {
                    const figPos = figureMesh.position;
                    const toPlayer = new THREE.Vector3(camera.position.x - figPos.x, 0, camera.position.z - figPos.z);
                    const dist = toPlayer.length();

                    if (figureHeadStartTimer > 0) {
                        figureHeadStartTimer -= dt;
                        if (figureHeadStartTimer <= 0) {
                            figureActive = !isTraining;
                        }
                    }

                    if (!figureActive) {
                        raycaster.setFromCamera(screenCenter, camera);
                        const hits = raycaster.intersectObject(figureMesh);
                        if (hits.length > 0) {
                            figureGazeTime += dt;
                            if (figureGazeTime >= 2.0) {
                                figureActive = true;
                            }
                        } else {
                            figureGazeTime = Math.max(0, figureGazeTime - dt * 0.25);
                        }
                    }

                    if (figureActive && !figureTriggered) {
                        let targetPos;
                        const aiType = aiTypeSelect.value;
                        if (figureTargetFlare && flareActive && flarePos) {
                            targetPos = flarePos;
                        } else if (aiType === 'strategist') {
                            playerPosHistory.push({
                                x: camera.position.x,
                                z: camera.position.z,
                                time: gameTime
                            });
                            if (playerPosHistory.length > 20) playerPosHistory.shift();

                            const distToPlayer = figPos.distanceTo(camera.position);

                            if (strategistState === 'chase') {
                                if (distToPlayer < 25 && Math.random() < 0.006) {
                                    strategistState = 'wait';
                                    strategistWaitTimer = 2 + Math.random() * 2;
                                } else if (playerPosHistory.length >= 8) {
                                    let avgVelX = 0, avgVelZ = 0;
                                    const recent = playerPosHistory.slice(-10);
                                    for (let i = 1; i < recent.length; i++) {
                                        avgVelX += recent[i].x - recent[i - 1].x;
                                        avgVelZ += recent[i].z - recent[i - 1].z;
                                    }
                                    avgVelX /= recent.length - 1;
                                    avgVelZ /= recent.length - 1;

                                    const predictTime = 1 + Math.random() * 1;
                                    targetPos = new THREE.Vector3(
                                        camera.position.x + avgVelX * predictTime,
                                        0,
                                        camera.position.z + avgVelZ * predictTime
                                    );
                                } else {
                                    targetPos = camera.position;
                                }
                            } else {
                                targetPos = figPos.clone();
                                strategistWaitTimer -= dt;
                                if (strategistWaitTimer <= 0 || distToPlayer > 60) {
                                    strategistState = 'chase';
                                }
                            }
                            figureTargetFlare = false;
                        } else {
                            const playerVel = new THREE.Vector3(moveF ? 1 : (moveB ? -1 : 0), 0, moveL ? -1 : (moveR ? 1 : 0));
                            if (playerVel.length() > 0) {
                                playerVel.normalize().multiplyScalar(5);
                                targetPos = new THREE.Vector3(
                                    camera.position.x + playerVel.x,
                                    0,
                                    camera.position.z + playerVel.z
                                );
                            } else {
                                targetPos = camera.position;
                            }
                            figureTargetFlare = false;
                        }
                        const toTarget = new THREE.Vector3(targetPos.x - figPos.x, 0, targetPos.z - figPos.z);
                        const distToTarget = toTarget.length();

                        const FIGURE_AVOID_DIST = 8;
                        let avoidX = 0, avoidZ = 0;
                        for (const tree of trees) {
                            const d = new THREE.Vector3(tree.x - figPos.x, 0, tree.z - figPos.z).length();
                            if (d < FIGURE_AVOID_DIST) {
                                const push = (FIGURE_AVOID_DIST - d) / FIGURE_AVOID_DIST;
                                avoidX += (figPos.x - tree.x) * push * 2;
                                avoidZ += (figPos.z - tree.z) * push * 2;
                            }
                        }
                        for (const rock of rocks) {
                            const d = new THREE.Vector3(rock.x - figPos.x, 0, rock.z - figPos.z).length();
                            if (d < FIGURE_AVOID_DIST * 0.8) {
                                const push = (FIGURE_AVOID_DIST * 0.8 - d) / (FIGURE_AVOID_DIST * 0.8);
                                avoidX += (figPos.x - rock.x) * push * 2;
                                avoidZ += (figPos.z - rock.z) * push * 2;
                            }
                        }

                        if (figureStuckTimer > 0) {
                            figureStuckTimer -= dt;
                        } else if (distToTarget > 0.5) {
                            toTarget.normalize();
                            figureSpeedVar += (Math.random() - 0.7) * 0.3;
                            figureSpeedVar = Math.max(-5, Math.min(5, figureSpeedVar));
                            let currentFigureSpeed = (FIGURE_CHASE_SPEED + figureSpeedVar) * speedIncrease;
                            if (aiType === 'strategist') {
                                currentFigureSpeed *= 0.75;
                            }
                            if (hasHardMode()) {
                                const playerSpeed = sprint ? SPRINT_SPEED : WALK_SPEED;
                                currentFigureSpeed = playerSpeed * 1.15;
                            }
                            if (avoidX !== 0 || avoidZ !== 0) {
                                currentFigureSpeed *= 0.6;
                            }
                            toTarget.x += avoidX * dt * 2;
                            toTarget.z += avoidZ * dt * 2;
                            toTarget.normalize();
                            figPos.x += toTarget.x * currentFigureSpeed * dt;
                            figPos.z += toTarget.z * currentFigureSpeed * dt;
                            figPos.y = getTerrainHeight(figPos.x, figPos.z) + 2.5;

                            if (bearTrapPos && figPos.distanceTo(bearTrapPos) < 8) {
                                figureStuckTimer = 12;
                                bearTrapPos = null;
                                bearTrapPlaced = false;
                                if (bearTrapMesh) bearTrapMesh.visible = false;
                            }
                        } else if (figureTargetFlare && flareActive) {
                        } else {
                            figureTriggered = true;
                            dead = true;
                            if (isRecording && mediaRecorder && mediaRecorder.state === 'recording') {
                                mediaRecorder.stop();
                                document.getElementById('recordBtn').textContent = 'Record';
                                document.getElementById('recordingIndicator').classList.add('hidden');
                                isRecording = false;
                            }
                            if (isPuzzleActive) closePuzzle();
                            stopFigureSound();
                            if (handsMesh) handsMesh.visible = false;
                            document.exitPointerLock();
                            deathEl.classList.add('active');
                            currentStaticOpacity = 0.8;
                            setStaticOpacity(0.8);
                            document.getElementById('workTimer').classList.remove('visible');

                            const jumpscare = document.getElementById('jumpscare');
                            if (figureTex[figureSelect.value] && figureTex[figureSelect.value].image) {
                                jumpscare.style.backgroundImage = 'url(' + figureTex[figureSelect.value].image.src + ')';
                                jumpscare.classList.add('flash');
                                setTimeout(() => jumpscare.classList.remove('flash'), 150);
                                setTimeout(() => jumpscare.classList.add('flash'), 200);
                                setTimeout(() => jumpscare.classList.remove('flash'), 350);
                            }

                            const finalTimeEl = document.getElementById('finalTime');
                            const minutes = Math.floor(gameTime / 60);
                            const seconds = Math.floor(gameTime % 60);
                            finalTimeEl.textContent = `You survived ${minutes}:${seconds.toString().padStart(2, '0')}`;

                            const topScores = saveScore(gameTime);
                            const leaderboardEl = document.getElementById('leaderboard');
                            leaderboardEl.innerHTML = '<div class="title">TOP TIMES</div>' + topScores.map((s, i) => {
                                const m = Math.floor(s.time / 60);
                                const sec = Math.floor(s.time % 60);
                                const cls = i === 0 ? 'first' : 'score';
                                return `<div class="${cls}">${i + 1}. ${m}:${sec.toString().padStart(2, '0')}</div>`;
                            }).join('');
                        }
                    }

                    const chaseDist = camera.position.distanceTo(figureMesh.position);
                    let targetStatic = 0;
                    const soundRange = 150;
                    if (chaseDist < soundRange) {
                        targetStatic = Math.max(0, Math.min(1, 1 - chaseDist / soundRange)) * 0.45;
                        const distStr = Math.floor(chaseDist);
                        hudText.textContent = `RUN... ${distStr}m`;
                        playFigureSound(chaseDist);
                    } else {
                        hudText.textContent = 'RUN...';
                        stopFigureSound();
                    }

                    currentStaticOpacity += (targetStatic - currentStaticOpacity) * 0.1;
                    setStaticOpacity(currentStaticOpacity);
                }

                const isMoving = moveF || moveB || moveL || moveR;
                if (isMoving && dt > 0) {
                    const stepInterval = sprint ? 0.22 : 0.35;
                    if (clock.elapsedTime - lastStep > stepInterval) {
                        lastStep = clock.elapsedTime;
                        if (audioCtx.state === 'suspended') audioCtx.resume();
                        playFootstep();
                        if (windNode) return;
                        startWind();
                    }
                } else if (!windNode) {
                    startWind();
                }
            }

            for (let i = dirtSplashes.length - 1; i >= 0; i--) {
                const s = dirtSplashes[i];
                s.time += dt;
                const t = s.time / s.duration;
                s.mesh.material.opacity = 1 - t;
                s.mesh.scale.setScalar(2.5 + t * 1.25);
                if (t >= 1) {
                    scene.remove(s.mesh);
                    s.mesh.material.dispose();
                    dirtSplashes.splice(i, 1);
                }
            }

            renderer.render(scene, camera);
            updatePuzzleUI();
            if (handsMesh && gameStarted) {
                const isMoving = moveF || moveB || moveL || moveR || moveLeft || moveRight;
                const isSprinting = sprint;
                const bob = Math.sin(bobTime) * (isMoving ? (isSprinting ? 0.15 : 0.1) : 0);

                let jumpOffset = 0;
                if (isJumping && velY < 0) {
                    jumpOffset = velY * 0.008;
                }

                handsTargetX = 0;
                handsTargetZ = -2.5;

                if (moveF) handsTargetZ = -2.7;
                if (moveB) handsTargetZ = -2.3;
                if (moveLeft || moveL) handsTargetX = -0.2;
                if (moveRight || moveR) handsTargetX = 0.2;

                handsMesh.position.x += (handsTargetX - handsMesh.position.x) * 0.15;
                handsMesh.position.z += (handsTargetZ - handsMesh.position.z) * 0.15;
                handsMesh.position.y = -1.0 + bob + jumpOffset;

                if (window.handsItemMesh) {
                    const itemType = inventory[selectedSlot];
                    window.handsItemMesh.position.x = handsMesh.position.x;
                    window.handsItemMesh.position.z = handsMesh.position.z - 0.7;
                    window.handsItemMesh.position.y = handsMesh.position.y + 0.4;
                    if (itemType && handsMesh.visible) {
                        if (!window.handsItemMesh.material.map || window.handsItemMesh.userData.itemType !== itemType) {
                            loader.load('assets/images/' + itemType + '.png', tex => {
                                tex.minFilter = tex.magFilter = THREE.NearestFilter;
                                window.handsItemMesh.material.map = tex;
                                window.handsItemMesh.material.needsUpdate = true;
                                window.handsItemMesh.userData.itemType = itemType;
                            });
                        }
                        window.handsItemMesh.visible = true;
                    } else {
                        window.handsItemMesh.visible = false;
                    }
                }
            }
            updateCelestialBodies();

            if (gameStarted && !dead && sunMesh) {
                const sunScreenPos = sunMesh.position.clone().project(camera);
                if (sunScreenPos.z < 1 && Math.abs(sunScreenPos.x) < 0.15 && Math.abs(sunScreenPos.y) < 0.2) {
                    if (!breathingAudio) loadBreathingAudio();
                    if (breathingGainNode) {
                        breathingGainNode.gain.value += (0.5 - breathingGainNode.gain.value) * 0.1;
                    }
                } else {
                    if (breathingGainNode) {
                        breathingGainNode.gain.value *= 0.9;
                    }
                }
            }
        }
        setupMobileControls();
        loop();
