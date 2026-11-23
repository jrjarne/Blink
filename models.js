        // 9. ERWEITERTES MODELL (5×5×5 = 125 KARTEN IM VEKTORRAUM F_5^3)
        // ============================================================================
        const MAGIC_CUBE_BASIS = {
            u: [1, 2, 3],
            v: [1, 3, 3],
            w: [1, 2, 2]
        };

        const advState = {
            initialized: false,
            structureMode: 'hyper120',
            layerX: null,
            siameseOrder: false,
            cubeSlice: 0,
            cubeHighlight: 'slice', // 'slice' | 'axes' | 'space-diag' | 'face-fail'
            splitLeftPercent: 46,
            highlightedLineKeys: null,
            selectedVec: [0, 0, 0],
            scene: null,
            camera: null,
            renderer: null,
            controls: null,
            gridGroup: null,
            nodesGroup: null,
            linesGroup: null
        };

        function getMagicCubeCard(r, s, t) {
            const { u, v, w } = MAGIC_CUBE_BASIS;
            return [
                ((r * u[0] + s * v[0] + t * w[0]) % 5 + 5) % 5,
                ((r * u[1] + s * v[1] + t * w[1]) % 5 + 5) % 5,
                ((r * u[2] + s * v[2] + t * w[2]) % 5 + 5) % 5
            ];
        }

        function getMagicCubeHighlightData() {
            const r = advState.cubeSlice;
            const mode = advState.cubeHighlight;
            const keys = new Set();
            const lineSegments = [];
            let lineColor = 0xc084fc;

            if (mode === 'slice') {
                for (let s = 0; s < 5; s++) {
                    for (let t = 0; t < 5; t++) {
                        const c = getMagicCubeCard(r, s, t);
                        keys.add(keyOf(c[0], c[1], c[2]));
                    }
                    for (let t = 0; t < 4; t++) {
                        lineSegments.push([getMagicCubeCard(r, s, t), getMagicCubeCard(r, s, t + 1)]);
                    }
                }
                for (let t = 0; t < 5; t++) {
                    for (let s = 0; s < 4; s++) {
                        lineSegments.push([getMagicCubeCard(r, s, t), getMagicCubeCard(r, s + 1, t)]);
                    }
                }
            } else if (mode === 'axes') {
                lineColor = 0x22d3ee;
                const centerS = 2, centerT = 2;
                // Zeile (t variiert), Spalte (s variiert) und Säule (r variiert) durch (r, 2, 2)
                const lines = [
                    [0, 1, 2, 3, 4].map(t => getMagicCubeCard(r, centerS, t)),
                    [0, 1, 2, 3, 4].map(s => getMagicCubeCard(r, s, centerT)),
                    [0, 1, 2, 3, 4].map(rr => getMagicCubeCard(rr, centerS, centerT))
                ];
                lines.forEach(line => {
                    line.forEach(c => keys.add(keyOf(c[0], c[1], c[2])));
                    for (let i = 0; i < 4; i++) lineSegments.push([line[i], line[i + 1]]);
                });
            } else if (mode === 'space-diag') {
                lineColor = 0x34d399;
                const signs = [[1, 1, 1], [1, 1, 4], [1, 4, 1], [4, 1, 1]];
                signs.forEach(([sr, ss, st]) => {
                    const line = [0, 1, 2, 3, 4].map(k => getMagicCubeCard((k * sr) % 5, (k * ss) % 5, (k * st) % 5));
                    line.forEach(c => keys.add(keyOf(c[0], c[1], c[2])));
                    for (let i = 0; i < 4; i++) lineSegments.push([line[i], line[i + 1]]);
                });
            } else if (mode === 'face-fail') {
                lineColor = 0xfb7185;
                // Hauptdiagonale D1 in Schicht r: Richtung v + w = (2, 0, 0) -> Y und Z bleiben konstant!
                const diag = [0, 1, 2, 3, 4].map(k => getMagicCubeCard(r, k, k));
                diag.forEach(c => keys.add(keyOf(c[0], c[1], c[2])));
                for (let i = 0; i < 4; i++) lineSegments.push([diag[i], diag[i + 1]]);
            }

            return { keys, lineSegments, lineColor };
        }

        function setAdvCubeSlice(rVal) {
            advState.cubeSlice = rVal;
            playSound('tick');
            updateAdv3DScene();
            renderAdv2DGrid();
        }

        function setAdvCubeHighlight(hlMode) {
            advState.cubeHighlight = hlMode;
            playSound('tick');
            updateAdv3DScene();
            renderAdv2DGrid();
        }

        function advGridToWorld(x, y, z) {
            const s = 2.35;
            return new THREE.Vector3((x - 2) * s, (y - 2) * s, (z - 2) * s);
        }

        function getAdvActiveCards() {
            const cards = [];
            if (advState.structureMode === 'all') {
                for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) for (let z = 0; z < 5; z++) cards.push([x, y, z]);
                return cards;
            }
            if (advState.structureMode === 'cube5') {
                for (let s = 0; s < 5; s++) {
                    for (let t = 0; t < 5; t++) {
                        cards.push(getMagicCubeCard(advState.cubeSlice, s, t));
                    }
                }
                return cards;
            }
            if (advState.structureMode === 'line') {
                for (let t = 0; t < 5; t++) cards.push([t % 5, (2 + 2 * t) % 5, (1 + 2 * t) % 5]);
                return cards;
            }
            if (advState.structureMode === 'arc5') {
                for (let t = 0; t < 5; t++) cards.push([t, (t * t * t) % 5, ((t + 1) * (t + 1) * (t + 1)) % 5]);
                return cards;
            }
            const is120 = advState.structureMode === 'hyper120';
            const x0 = is120 ? [0, 0, 0] : [3, 0, 4];
            const u  = is120 ? [1, 2, 3] : [2, 0, 1];
            const v  = is120 ? [2, 1, 1] : [2, 1, 0];

            for (let i = 0; i < 5; i++) {
                for (let j = 0; j < 5; j++) {
                    const s = advState.siameseOrder ? (i + 2 * j) % 5 : i;
                    const t = advState.siameseOrder ? (2 * i + j) % 5 : j;
                    const c = [
                        (x0[0] + s * u[0] + t * v[0]) % 5,
                        (x0[1] + s * u[1] + t * v[1]) % 5,
                        (x0[2] + s * u[2] + t * v[2]) % 5
                    ];
                    cards.push(c);
                }
            }
            return cards;
        }

        function initAdvancedModel() {
            advState.initialized = true;
            const advContainer = document.getElementById('adv-canvas-container');
            if (!advContainer) return;
            advState.scene = new THREE.Scene();
            advState.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
            advState.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            advState.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            advContainer.appendChild(advState.renderer.domElement);

            advState.controls = new THREE.OrbitControls(advState.camera, advState.renderer.domElement);
            advState.controls.enableDamping = true;
            advState.controls.dampingFactor = 0.08;

            advState.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
            const dl1 = new THREE.DirectionalLight(0xffffff, 0.88);
            dl1.position.set(16, 22, 20);
            advState.scene.add(dl1);

            advState.gridGroup = new THREE.Group();
            advState.nodesGroup = new THREE.Group();
            advState.linesGroup = new THREE.Group();
            advState.scene.add(advState.gridGroup, advState.nodesGroup, advState.linesGroup);

            if (typeof ResizeObserver !== 'undefined') {
                new ResizeObserver(() => resizeAdv3DCanvas()).observe(advContainer);
            }

            setupDraggableResizer('adv-split-resizer', 'adv-split-workspace', 'adv-split-drag-badge', (pct) => setAdvSplitPercentage(pct));

            advState.renderer.domElement.addEventListener('click', (event) => {
                const rect = advState.renderer.domElement.getBoundingClientRect();
                mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
                raycaster.setFromCamera(mouse, advState.camera);
                const hit = raycaster.intersectObjects(advState.nodesGroup.children).find(i => i.object.userData.isActive);
                if (hit) {
                    const { x, y, z } = hit.object.userData;
                    selectAdvCardVector(x, y, z);
                }
            });

            buildAdvGridAndAxes();
            selectAdvCardVector(0, 0, 0);
            updateAdv3DScene();
            renderAdv2DGrid();
        }

        function setAdvSplitPercentage(leftPct) {
            advState.splitLeftPercent = Math.max(20, Math.min(80, leftPct));
            const p3d = document.getElementById('panel-adv-3d');
            const badge = document.getElementById('adv-split-drag-badge');
            if (p3d) p3d.style.width = window.innerWidth >= 1024 ? `${advState.splitLeftPercent}%` : '100%';
            if (badge) badge.textContent = `3D: ${advState.splitLeftPercent}% | 2D: ${100 - advState.splitLeftPercent}%`;
            resizeAdv3DCanvas();
        }

        function resizeAdv3DCanvas() {
            const advContainer = document.getElementById('adv-canvas-container');
            if (!advState.renderer || !advContainer || advContainer.clientWidth <= 0) return;
            advState.camera.aspect = advContainer.clientWidth / advContainer.clientHeight;
            advState.camera.updateProjectionMatrix();
            advState.renderer.setSize(advContainer.clientWidth, advContainer.clientHeight);
        }

        function setAdvCameraView(mode, instant = false) {
            if (!advState.controls) return;
            const targetLook = new THREE.Vector3(0, 0, 0);
            const targetPos = new THREE.Vector3();

            if (mode === 'iso') targetPos.set(14.5, 11.5, 16.5);
            else if (mode === 'xy') targetPos.set(0, 0, 21);
            else if (mode === 'xz') targetPos.set(0, 21, 0.01);
            else if (mode === 'yz') targetPos.set(21, 0, 0);

            if (instant) {
                advState.controls.target.copy(targetLook);
                advState.camera.position.copy(targetPos);
                advState.controls.update();
            } else {
                animateCameraLerp(advState.camera, advState.controls, targetPos, targetLook, 420);
            }
        }

        function buildAdvGridAndAxes() {
            if (!advState.gridGroup) return;
            advState.gridGroup.clear();
            const isLight = state.theme === 'academic-light';
            const lineMat = new THREE.LineBasicMaterial({ color: isLight ? 0x64748b : 0x334155, transparent: true, opacity: 0.25 });
            const pts = [];
            for (let i = 0; i < 5; i++) {
                for (let j = 0; j < 5; j++) {
                    pts.push(advGridToWorld(0, i, j), advGridToWorld(4, i, j));
                    pts.push(advGridToWorld(i, 0, j), advGridToWorld(i, 4, j));
                    pts.push(advGridToWorld(i, j, 0), advGridToWorld(i, j, 4));
                }
            }
            advState.gridGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lineMat));

            if (!state.show3DLabels) return;
            for (let k = 0; k < 5; k++) {
                const lx = createTextSprite(`X=${k}`, '#38bdf8', 28, 1.0);
                lx.position.copy(advGridToWorld(k, -0.65, -0.65));
                const ly = createTextSprite(`Y=${k}:${PALETTE_Y[k].name}`, PALETTE_Y[k].strokeHex, 26, 1.05);
                ly.position.copy(advGridToWorld(-0.85, k, -0.65));
                const lz = createTextSprite(`Z=${k}:${PALETTE_Z[k].name}`, '#c084fc', 26, 1.05);
                lz.position.copy(advGridToWorld(-0.75, -0.65, k));
                advState.gridGroup.add(lx, ly, lz);
            }
        }

        function updateAdv3DScene() {
            if (!advState.initialized) return;
            advState.nodesGroup.clear();
            advState.linesGroup.clear();

            const isCube = advState.structureMode === 'cube5';
            const cubeData = isCube ? getMagicCubeHighlightData() : null;
            const activeCards = getAdvActiveCards();
            const activeSet = isCube ? cubeData.keys : new Set(activeCards.map(([x, y, z]) => keyOf(x, y, z)));
            const ghostElem = document.getElementById('adv-chk-ghost');
            const linesElem = document.getElementById('adv-chk-lines');
            const showGhost = ghostElem ? ghostElem.checked : true;
            const showLines = linesElem ? linesElem.checked : true;

            let count = 0;
            for (let x = 0; x < 5; x++) {
                for (let y = 0; y < 5; y++) {
                    for (let z = 0; z < 5; z++) {
                        const k = keyOf(x, y, z);
                        const inStruct = activeSet.has(k);
                        const inLayer = advState.layerX === null || advState.layerX === x;
                        const inLineFilter = !advState.highlightedLineKeys || advState.highlightedLineKeys.has(k);
                        const isActive = inStruct && inLayer && inLineFilter;

                        if (!isActive && !showGhost) continue;
                        if (isActive) count++;

                        const pos = advGridToWorld(x, y, z);
                        if (isActive) {
                            const isSel = advState.selectedVec[0] === x && advState.selectedVec[1] === y && advState.selectedVec[2] === z;
                            const isFailGlow = isCube && advState.cubeHighlight === 'face-fail';
                            const mat = new THREE.MeshStandardMaterial({
                                color: new THREE.Color(PALETTE_Y[y].hex),
                                roughness: 0.25,
                                metalness: 0.18,
                                emissive: new THREE.Color(isSel ? '#ffffff' : (isFailGlow ? '#fb7185' : PALETTE_Y[y].hex)),
                                emissiveIntensity: isSel ? 0.55 : (isFailGlow ? 0.4 : 0.2)
                            });
                            const mesh = new THREE.Mesh(cardSphereGeo, mat);
                            mesh.position.copy(pos);
                            if (isSel) mesh.scale.set(1.35, 1.35, 1.35);
                            mesh.userData = { x, y, z, isActive: true };
                            advState.nodesGroup.add(mesh);
                        } else {
                            const mesh = new THREE.Mesh(emptySphereGeo, new THREE.MeshBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.16 }));
                            mesh.position.copy(pos);
                            mesh.userData = { x, y, z, isActive: false };
                            advState.nodesGroup.add(mesh);
                        }
                    }
                }
            }

            if (showLines && isCube && cubeData) {
                const pts = [];
                cubeData.lineSegments.forEach(([c1, c2]) => {
                    pts.push(advGridToWorld(c1[0], c1[1], c1[2]), advGridToWorld(c2[0], c2[1], c2[2]));
                });
                advState.linesGroup.add(new THREE.LineSegments(
                    new THREE.BufferGeometry().setFromPoints(pts),
                    new THREE.LineBasicMaterial({ color: cubeData.lineColor, transparent: true, opacity: 0.85 })
                ));
            } else if (showLines && activeCards.length >= 5 && advState.structureMode !== 'all') {
                const pts = [];
                if (advState.structureMode === 'line' || advState.structureMode === 'arc5') {
                    for (let i = 0; i < activeCards.length; i++) {
                        const c1 = activeCards[i];
                        const c2 = activeCards[(i + 1) % activeCards.length];
                        pts.push(advGridToWorld(c1[0], c1[1], c1[2]), advGridToWorld(c2[0], c2[1], c2[2]));
                    }
                } else {
                    for (let r = 0; r < 5; r++) {
                        for (let c = 0; c < 4; c++) {
                            const c1 = activeCards[r * 5 + c];
                            const c2 = activeCards[r * 5 + c + 1];
                            pts.push(advGridToWorld(c1[0], c1[1], c1[2]), advGridToWorld(c2[0], c2[1], c2[2]));
                        }
                    }
                }
                advState.linesGroup.add(new THREE.LineSegments(
                    new THREE.BufferGeometry().setFromPoints(pts),
                    new THREE.LineBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.7 })
                ));
            }

            const counterEl = document.getElementById('adv-visible-counter');
            if (counterEl) counterEl.textContent = `${count} / 125`;
        }

        function selectAdvCardVector(x, y, z) {
            advState.selectedVec = [x, y, z];
            const prev = document.getElementById('adv-tt-card-preview');
            const coords = document.getElementById('adv-tt-coords');
            const status = document.getElementById('adv-tt-status');
            if (prev) prev.innerHTML = renderCardSymbolsHTML(x, y, z, 13);
            if (coords) coords.textContent = `Vektor (${x}, ${y}, ${z}) → ${PALETTE_X[x].count}× ${PALETTE_Y[y].name} ${PALETTE_Z[z].name}`;
            if (status) status.textContent = `Anzahl X=${x} (${PALETTE_X[x].word}) • Farbe Y=${y} • Symbol Z=${z}`;
            updateAdv3DScene();
        }

       function setAdvStructureMode(mode) {
            if (advState.structureMode !== mode) playSound('tick');
            advState.structureMode = mode;
            advState.highlightedLineKeys = null;
            ['all', 'line', 'hyper120', 'hyper15', 'arc5', 'cube5'].forEach(m => {
                const btn = document.getElementById(`adv-struct-${m}`);
                if (btn) btn.className = `relative z-10 px-3 py-1 rounded-full text-xs mono transition-colors ${m === mode ? 'pill-btn-active' : 'pill-btn-idle'}`;
            });
            moveSlidingPill('adv-struct-tabs', `adv-struct-${mode}`);
            const cubeCtrl = document.getElementById('adv-cube-controls');
            if (cubeCtrl) cubeCtrl.classList.toggle('hidden', mode !== 'cube5');
            updateAdv3DScene();
            renderAdv2DGrid();
        }

        function selectAdvPreset(val) {
            setAdvStructureMode(val);
        }

        function setAdvLayerX(xVal) {
            if (advState.layerX !== xVal) playSound('tick');
            advState.layerX = xVal;
            ['all', 0, 1, 2, 3, 4].forEach(k => {
                const btn = document.getElementById(`adv-x-${k}`);
                if (!btn) return;
                const active = (k === 'all' && xVal === null) || k === xVal;
                const pad = k === 'all' ? 'px-2.5' : 'px-2';
                btn.className = `relative z-10 ${pad} py-0.5 rounded-full transition-colors ${active ? 'pill-btn-active' : 'pill-btn-idle'}`;
            });
            moveSlidingPill('adv-layer-tabs', `adv-x-${xVal === null ? 'all' : xVal}`);
            updateAdv3DScene();
        }

        function toggleSiameseOrder() {
            advState.siameseOrder = !advState.siameseOrder;
            const btn = document.getElementById('btn-siamese-toggle');
            if (btn) btn.textContent = advState.siameseOrder ? 'Matrix: Siamese s=(i+2j), t=(2i+j)' : 'Matrix: Standard (s,t)';
            updateAdv3DScene();
            renderAdv2DGrid();
        }

        function highlightAdvLine(kind) {
            const cards = getAdvActiveCards();
            if (kind === 'all' || cards.length < 25) {
                advState.highlightedLineKeys = null;
            } else {
                const keys = new Set();
                for (let k = 0; k < 5; k++) {
                    let idx = 0;
                    if (kind === 'diag1') idx = k * 5 + k;
                    else if (kind === 'diag2') idx = k * 5 + (4 - k);
                    else if (kind === 'row0') idx = k;
                    else if (kind === 'col0') idx = k * 5;
                    const c = cards[idx];
                    keys.add(keyOf(c[0], c[1], c[2]));
                }
                advState.highlightedLineKeys = keys;
            }
            updateAdv3DScene();
            renderAdv2DGrid();
        }

        function renderAdv2DGrid() {
            const cards = getAdvActiveCards();
            const gridEl = document.getElementById('adv-cards-grid');
            const titleEl = document.getElementById('adv-grid-title');
            const subEl = document.getElementById('adv-grid-subtitle');
            const badgeEl = document.getElementById('adv-formula-badge');
            if (!gridEl) return;

            const isCube = advState.structureMode === 'cube5';
            const cubeData = isCube ? getMagicCubeHighlightData() : null;

            if (isCube) {
                if (titleEl) titleEl.textContent = `5×5×5 Magischer Würfel — Schicht r = ${advState.cubeSlice} (25 / 125 Karten)`;
                if (badgeEl) badgeEl.textContent = '• 384 klassische Würfel · 0 pan-magisch';

                [0, 1, 2, 3, 4].forEach(r => {
                    const b = document.getElementById(`cube-r-${r}`);
                    if (b) b.className = r === advState.cubeSlice
                        ? 'px-2 py-0.5 rounded-full bg-purple-500 text-slate-950 font-bold transition'
                        : 'px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-300 hover:text-white transition';
                });
                const hlStyles = {
                    'slice': 'bg-purple-500/25 border-purple-400/50 text-purple-200 font-bold',
                    'axes': 'bg-cyan-500/25 border-cyan-400/50 text-cyan-200 font-bold',
                    'space-diag': 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200 font-bold',
                    'face-fail': 'bg-rose-500/25 border-rose-400/60 text-rose-200 font-bold'
                };
                ['slice', 'axes', 'space-diag', 'face-fail'].forEach(m => {
                    const b = document.getElementById(`cube-hl-${m}`);
                    if (!b) return;
                    b.className = m === advState.cubeHighlight
                        ? `px-2.5 py-0.5 rounded-full border transition ${hlStyles[m]}`
                        : `px-2.5 py-0.5 rounded-full bg-white/[0.04] border ${m === 'face-fail' ? 'border-rose-500/30 text-rose-300' : 'border-white/10 text-slate-300'} hover:text-white transition`;
                });
                const noteEl = document.getElementById('adv-cube-status-note');
                if (noteEl) {
                    const notes = {
                        'slice': `Schicht r = ${advState.cubeSlice} mit Basis u=(1,2,3), v=(1,3,3), w=(1,2,2): Jede Zeile (w) und jede Spalte (v) ist ein strenges Cluster.`,
                        'axes': `Durch (r=${advState.cubeSlice}, s=2, t=2) verlaufen Zeile (w), Spalte (v) und Säule (u) — alle 75 Achsenlinien im Würfel sind strenge Cluster.`,
                        'space-diag': `Alle 4 Raumdiagonalen u±v±w sind nullfrei: (3,2,3), (1,3,4), (1,1,2) und (1,3,2) — jede bildet ein strenges Cluster im 3D-Raum.`,
                        'face-fail': `Unmöglichkeitssatz (Schubfachprinzip in F₅\\{0}): Die Flächendiagonale D₁ hat Richtung v+w = (2, 0, 0) — Farbe Y und Symbol Z bleiben starr konstant (kein Cluster!).`
                    };
                    noteEl.textContent = notes[advState.cubeHighlight] || '';
                }
            } else if (advState.structureMode === 'line') {
                if (titleEl) titleEl.textContent = '1D Strenges Cluster: Affine Gerade C = { x + t·d (mod 5) } (5 Karten)';
                if (subEl) subEl.textContent = 'x = (0,2,1), d = (1,2,2) nullfrei → dim(U) = 1';
                if (badgeEl) badgeEl.textContent = '1D Affine Gerade • ∑ c_j ≡ (0,0,0) (mod 5)';
            } else if (advState.structureMode === 'arc5') {
                if (titleEl) titleEl.textContent = '3D Räumliches schwaches Cluster / 5-Bogen γ(t) = (t, t³, (t+1)³)';
                if (subEl) subEl.textContent = 'Keine 4 Karten koplanar (det(u,v,w) ≠ 0 mod 5) → dim(U) = 3';
                if (badgeEl) badgeEl.textContent = '3D Räumlicher 5-Bogen • Kubische Kurve';
            } else if (advState.structureMode === 'hyper15') {
                if (titleEl) titleEl.textContent = '5×5 Schräge MDS-Ebene (25 Karten • 15 strenge Cluster)';
                if (subEl) subEl.textContent = 'x=(3,0,4), u=(2,0,1), v=(2,1,0) → Normalenvektor n=(1,3,3) nullfrei';
                if (badgeEl) badgeEl.textContent = 'n = (1,3,3) • 0 Nullen → 15 Cluster (MDS-Code)';
            } else {
                if (titleEl) titleEl.textContent = '5×5 Perfektes Hyper-Cluster & Strenges Magisches Kartenquadrat (25 Karten)';
                if (subEl) subEl.textContent = 'x=(0,0,0), u=(1,2,3), v=(2,1,1) → Alle Zeilen, Spalten & Diagonalen sind strenge Cluster';
                if (badgeEl) badgeEl.textContent = 'n = u × v = (4,2,0) • 1 Null → 120 Cluster';
            }

            const displayCards = cards.slice(0, 25);
            gridEl.innerHTML = displayCards.map(([x, y, z], idx) => {
                const k = keyOf(x, y, z);
                const cubeDimmed = isCube && advState.cubeHighlight !== 'slice' && !cubeData.keys.has(k);
                const cubeFailCard = isCube && advState.cubeHighlight === 'face-fail' && cubeData.keys.has(k);
                const cubeGoodCard = isCube && (advState.cubeHighlight === 'axes' || advState.cubeHighlight === 'space-diag') && cubeData.keys.has(k);
                const dimmed = cubeDimmed || (advState.highlightedLineKeys && !advState.highlightedLineKeys.has(k));
                const borderStyle = cubeFailCard
                    ? 'border-rose-500 ring-2 ring-rose-500/40'
                    : (cubeGoodCard ? 'border-emerald-400 ring-2 ring-emerald-400/35' : (dimmed ? 'opacity-25 border-slate-300' : 'border-slate-300 hover:border-purple-400'));
                const s = Math.floor(idx / 5), t = idx % 5;
                const posLabel = displayCards.length === 5 ? `t=${idx}` : `s=${s},t=${t}`;
                return `
                    <div onclick="selectAdvCardVector(${x},${y},${z})"
                         class="card-63-88 rounded-xl bg-white border-2 ${borderStyle} p-1.5 flex flex-col justify-between cursor-pointer shadow transition overflow-hidden">
                        ${renderLargePlayingCardInner([x, y, z], true, posLabel)}
                    </div>
                `;
            }).join('');
        }

        function setAdv2DTab(tab) {
            const gridView = document.getElementById('adv-view-grid');
            const theoryView = document.getElementById('adv-view-theory');
            const tabGrid = document.getElementById('adv-tab-grid');
            const tabTheory = document.getElementById('adv-tab-theory');
            if (gridView) gridView.classList.toggle('hidden', tab !== 'grid');
            if (theoryView) theoryView.classList.toggle('hidden', tab !== 'theory');
            if (tabGrid) tabGrid.className = tab === 'grid' ? 'px-3 py-1 rounded-lg font-bold transition bg-purple-500 text-slate-950' : 'px-3 py-1 rounded-lg font-semibold text-slate-300 hover:text-white transition';
            if (tabTheory) tabTheory.className = tab === 'theory' ? 'px-3 py-1 rounded-lg font-bold transition bg-purple-500 text-slate-950' : 'px-3 py-1 rounded-lg font-semibold text-slate-300 hover:text-white transition';
            
            if (tab === 'theory' && window.MathJax) {
                MathJax.typesetPromise();
            }
        }

        document.getElementById('select-color-mode').addEventListener('change', (e) => { state.colorMode = e.target.value; update3DScene(); });
        document.getElementById('chk-empty-nodes').addEventListener('change', (e) => { state.showEmptyNodes = e.target.checked; update3DScene(); });
        document.getElementById('chk-cycle-lines').addEventListener('change', (e) => { state.showCycleLines = e.target.checked; update3DScene(); });
        document.getElementById('chk-grid-box').addEventListener('change', (e) => { state.showGridBox = e.target.checked; update3DScene(); });
        const searchInput = document.getElementById('input-card-search');
        if (searchInput) searchInput.addEventListener('input', (e) => { state.searchQuery = e.target.value; renderCardList(); });

        window.addEventListener('resize', () => {
            if (state.currentPage === 'basic-model') setSplitPercentage(state.splitLeftPercent);
            if (state.currentPage === 'advanced-model') setAdvSplitPercentage(advState.splitLeftPercent);
        });

        function refreshAll() {
            update3DScene();
            render2DCycleGraphs();
            renderProjectionMatrices();
            renderCardList();
        }

        // ============================================================================
