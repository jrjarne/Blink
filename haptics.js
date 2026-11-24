// ============================================================================
// KOMPROMISSLOSE HAPTIK-ENGINE (BALATRO × APPLE TACTILE SYSTEM)
// 3D-Karten-Tilt & Glare · Physik-Drag-&-Drop · Parabol-Flug · Foley-Audio
// ============================================================================

(function initBlinkHapticsEngine() {
    if (window.__BLINK_HAPTICS_READY) return;
    window.__BLINK_HAPTICS_READY = true;

    window._hapticSkipNextFly = false;
    window._hapticSuppressClickUntil = 0;

    // ------------------------------------------------------------------------
    // 1. TAKTILES FOLEY-AUDIO & DEVICE-VIBRATION (RESPEKTIERT AUDIO-SETTINGS)
    // ------------------------------------------------------------------------
    let noiseBufferCache = null;
    let lastMicroTickAt = 0;

    function getFoleyNoiseBuffer(ctx) {
        if (noiseBufferCache && noiseBufferCache.sampleRate === ctx.sampleRate) {
            return noiseBufferCache;
        }
        const len = Math.floor(ctx.sampleRate * 0.12);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        let prev = 0;
        for (let i = 0; i < len; i++) {
            const white = Math.random() * 2 - 1;
            prev = prev * 0.45 + white * 0.55;
            data[i] = prev;
        }
        noiseBufferCache = buf;
        return buf;
    }

    function hapticVibrate(pattern) {
        try {
            if (navigator && typeof navigator.vibrate === 'function') {
                navigator.vibrate(pattern);
            }
        } catch (e) {}
    }

    function playHapticFoley(kind = 'detent', pitchShift = 1.0) {
        if (typeof soundEnabled === 'undefined' || !soundEnabled) return;
        if (typeof getAudioContext !== 'function') return;

        const nowMs = performance.now();
        if (kind === 'detent' || kind === 'hover') {
            if (nowMs - lastMicroTickAt < 38) return;
            lastMicroTickAt = nowMs;
        }

        try {
            const ctx = getAudioContext();
            const masterDest = (typeof audioMasterBus !== 'undefined' && audioMasterBus)
                ? audioMasterBus
                : (typeof audioOutputGain !== 'undefined' ? audioOutputGain : null);
            if (!ctx || !masterDest) return;
            const now = ctx.currentTime;
            const musicRunning = typeof gameMusicState !== 'undefined' && gameMusicState.active && typeof musicEnabled !== 'undefined' && musicEnabled;

            if (kind === 'cardLift') {
                // Hauchzartes, warm gefiltertes Papier-Abheben
                const src = ctx.createBufferSource();
                src.buffer = getFoleyNoiseBuffer(ctx);
                const bp = ctx.createBiquadFilter();
                bp.type = 'bandpass';
                bp.frequency.setValueAtTime(1100 * pitchShift, now);
                bp.frequency.exponentialRampToValueAtTime(1850 * pitchShift, now + 0.036);
                bp.Q.value = 1.4;

                const g = ctx.createGain();
                const peak = musicRunning ? 0.008 : 0.042;
                g.gain.setValueAtTime(0.0001, now);
                g.gain.linearRampToValueAtTime(peak, now + 0.008);
                g.gain.exponentialRampToValueAtTime(0.0001, now + 0.044);

                src.connect(bp);
                bp.connect(g);
                g.connect(masterDest);
                src.start(now);
                src.stop(now + 0.055);

            } else if (kind === 'cardSnap') {
                // Sanfter, tiefer Samt-Aufschlag, der das Orchester nie durchschneidet
                const osc = ctx.createOscillator();
                const og = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(118 * pitchShift, now);
                osc.frequency.exponentialRampToValueAtTime(48, now + 0.052);
                const thumpPeak = musicRunning ? 0.011 : 0.064;
                og.gain.setValueAtTime(0.0001, now);
                og.gain.linearRampToValueAtTime(thumpPeak, now + 0.005);
                og.gain.exponentialRampToValueAtTime(0.0001, now + 0.062);
                osc.connect(og);
                og.connect(masterDest);
                osc.start(now);
                osc.stop(now + 0.07);

                const src = ctx.createBufferSource();
                src.buffer = getFoleyNoiseBuffer(ctx);
                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.setValueAtTime(980 * pitchShift, now);
                const ng = ctx.createGain();
                const brushPeak = musicRunning ? 0.006 : 0.038;
                ng.gain.setValueAtTime(0.0001, now);
                ng.gain.linearRampToValueAtTime(brushPeak, now + 0.004);
                ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.034);
                src.connect(lp);
                lp.connect(ng);
                ng.connect(masterDest);
                src.start(now);
                src.stop(now + 0.045);

            } else if (kind === 'magnet') {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.028);
                g.gain.setValueAtTime(0.0001, now);
                g.gain.linearRampToValueAtTime(musicRunning ? 0.016 : 0.035, now + 0.005);
                g.gain.exponentialRampToValueAtTime(0.0001, now + 0.036);
                osc.connect(g);
                g.connect(masterDest);
                osc.start(now);
                osc.stop(now + 0.045);

            } else if (kind === 'detent') {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1280 * pitchShift, now);
                osc.frequency.exponentialRampToValueAtTime(580, now + 0.014);
                g.gain.setValueAtTime(0.0001, now);
                g.gain.linearRampToValueAtTime(0.042, now + 0.002);
                g.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
                osc.connect(g);
                g.connect(masterDest);
                osc.start(now);
                osc.stop(now + 0.024);

            } else if (kind === 'return') {
                const src = ctx.createBufferSource();
                src.buffer = getFoleyNoiseBuffer(ctx);
                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.setValueAtTime(1100, now);
                lp.frequency.exponentialRampToValueAtTime(380, now + 0.055);
                const g = ctx.createGain();
                g.gain.setValueAtTime(0.0001, now);
                g.gain.linearRampToValueAtTime(musicRunning ? 0.022 : 0.055, now + 0.008);
                g.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
                src.connect(lp);
                lp.connect(g);
                g.connect(masterDest);
                src.start(now);
                src.stop(now + 0.07);
            }
        } catch (e) {}
    }

    // ------------------------------------------------------------------------
    // 2. VISUELLE HAPTIK-BAUSTEINE (PARABOL-FLUG, THUMP, BADGE, PARTIKEL)
    // ------------------------------------------------------------------------
    function hapticPileImpact(targetEl, tone = 'cyan') {
        if (!targetEl) return;
        playHapticFoley('cardSnap', tone === 'purple' ? 1.12 : (tone === 'amber' ? 0.94 : 1.0));
        if (window.BlinkUnifiedPhysics) window.BlinkUnifiedPhysics.applyPileScatter(targetEl);
        hapticVibrate(9);

        targetEl.classList.remove('haptic-pile-thump');
        void targetEl.offsetWidth;
        targetEl.classList.add('haptic-pile-thump');
        setTimeout(() => targetEl.classList.remove('haptic-pile-thump'), 320);

        // Sauberer optischer Impact-Ring am Zielstapel
        const rect = targetEl.getBoundingClientRect();
        if (rect.width <= 0) return;

        const ring = document.createElement('div');
        ring.className = `haptic-impact-ring haptic-ring-${tone}`;
        ring.style.left = `${rect.left}px`;
        ring.style.top = `${rect.top}px`;
        ring.style.width = `${rect.width}px`;
        ring.style.height = `${rect.height}px`;
        ring.style.borderRadius = getComputedStyle(targetEl).borderRadius || '16px';
        document.body.appendChild(ring);
        requestAnimationFrame(() => ring.classList.add('is-expanding'));
        setTimeout(() => ring.remove(), 440);
    }

    function hapticFloatingBadge(anchorEl, text, tone = 'cyan') {
        if (!anchorEl || !text) return;
        const rect = anchorEl.getBoundingClientRect();
        if (rect.width <= 0) return;

        const pill = document.createElement('div');
        pill.className = `haptic-float-badge haptic-badge-${tone}`;
        pill.textContent = text;
        pill.style.left = `${rect.left + rect.width / 2}px`;
        pill.style.top = `${rect.top + 8}px`;
        document.body.appendChild(pill);

        requestAnimationFrame(() => pill.classList.add('is-rising'));
        setTimeout(() => pill.remove(), 820);
    }

    function hapticCelebrationBurst(anchorEl, tone = 'emerald', count = 22) {
        hapticVibrate([12, 35, 18]);
        let cx = window.innerWidth / 2;
        let cy = window.innerHeight * 0.45;
        if (anchorEl && typeof anchorEl.getBoundingClientRect === 'function') {
            const r = anchorEl.getBoundingClientRect();
            if (r.width > 0) {
                cx = r.left + r.width / 2;
                cy = r.top + r.height / 2;
            }
        }

        const palettes = {
            emerald: ['#34d399', '#22d3ee', '#f8fafc', '#a7f3d0'],
            purple:  ['#c084fc', '#a855f7', '#22d3ee', '#f8fafc'],
            amber:   ['#fbbf24', '#fde047', '#22d3ee', '#ffffff'],
            cyan:    ['#22d3ee', '#38bdf8', '#34d399', '#ffffff']
        };
        const colors = palettes[tone] || palettes.emerald;

        const host = document.createElement('div');
        host.className = 'haptic-burst-layer';
        document.body.appendChild(host);

        for (let i = 0; i < count; i++) {
            const shard = document.createElement('span');
            shard.className = 'haptic-burst-shard';
            const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.25;
            const dist = 58 + Math.random() * 96;
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist - 14;
            const rot = Math.round((Math.random() - 0.5) * 260);
            const size = 4 + Math.random() * 5;

            shard.style.left = `${cx}px`;
            shard.style.top = `${cy}px`;
            shard.style.width = `${size}px`;
            shard.style.height = `${size * (Math.random() > 0.5 ? 1.8 : 1)}px`;
            shard.style.backgroundColor = colors[i % colors.length];
            shard.style.setProperty('--dx', `${dx.toFixed(1)}px`);
            shard.style.setProperty('--dy', `${dy.toFixed(1)}px`);
            shard.style.setProperty('--rot', `${rot}deg`);
            host.appendChild(shard);
        }

        requestAnimationFrame(() => host.classList.add('is-bursting'));
        setTimeout(() => host.remove(), 760);
    }

    // Parabolischer GPU-Kartenflug von Startelement (oder Rechteck) zum Zielelement
    function hapticFlyCard(fromEl, toEl, onLand, opts = {}) {
        const duration = opts.duration || 185;
        const tone = opts.tone || 'cyan';

        if (!fromEl || !toEl) {
            if (typeof onLand === 'function') onLand();
            return;
        }

        const startRect = fromEl.getBoundingClientRect();
        const endRect = toEl.getBoundingClientRect();
        if (startRect.width <= 0 || endRect.width <= 0) {
            if (typeof onLand === 'function') onLand();
            return;
        }

        const clone = fromEl.cloneNode(true);
        clone.removeAttribute('id');
        clone.classList.remove('selected-card', 'dragging-card', 'shake-invalid');
        clone.classList.add('haptic-flight-clone');
        clone.style.position = 'fixed';
        clone.style.left = `${startRect.left}px`;
        clone.style.top = `${startRect.top}px`;
        clone.style.width = `${startRect.width}px`;
        clone.style.height = `${startRect.height}px`;
        clone.style.margin = '0';
        clone.style.zIndex = '9998';
        clone.style.pointerEvents = 'none';
        clone.style.transformOrigin = 'center center';
        clone.style.transition = 'none';
        document.body.appendChild(clone);

        if (opts.hideSource !== false) {
            fromEl.style.visibility = 'hidden';
        }

        playHapticFoley('cardLift', 1.05);

        const dx = (endRect.left + endRect.width / 2) - (startRect.left + startRect.width / 2);
        const dy = (endRect.top + endRect.height / 2) - (startRect.top + startRect.height / 2);
        const scaleX = endRect.width / startRect.width;
        const arcLift = Math.min(72, Math.max(24, Math.hypot(dx, dy) * 0.14));
        const tiltZ = Math.max(-14, Math.min(14, dx * 0.035));
        const t0 = performance.now();

        function step(now) {
            const p = Math.min(1, (now - t0) / duration);
            // Snappy ease-out-cubic mit natürlichem Bogen
            const ease = 1 - Math.pow(1 - p, 3);
            const arc = Math.sin(p * Math.PI) * arcLift;
            const curX = dx * ease;
            const curY = dy * ease - arc;
            const curScale = 1 + (scaleX - 1) * ease + Math.sin(p * Math.PI) * 0.07;
            const curRot = tiltZ * Math.sin(p * Math.PI);

            clone.style.transform = `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) rotateZ(${curRot.toFixed(2)}deg) scale(${curScale.toFixed(3)})`;

            if (p < 1) {
                requestAnimationFrame(step);
            } else {
                clone.remove();
                if (typeof onLand === 'function') onLand();
                hapticPileImpact(toEl, tone);
            }
        }
        requestAnimationFrame(step);
    }

    function hapticStampPop(el) {
        if (!el) return;
        el.classList.remove('haptic-deal-pop');
        void el.offsetWidth;
        el.classList.add('haptic-deal-pop');
        setTimeout(() => el.classList.remove('haptic-deal-pop'), 340);
    }

    // ------------------------------------------------------------------------
    // 3. BALATRO 3D-TILT & SPECULAR-GLARE FÜR ALLE KARTEN + FÄCHER-LAYOUT
    // ------------------------------------------------------------------------
    const TILT_CARD_SELECTOR = [
        '.game-card',
        '#center-pile-0', '#center-pile-1', '#center-pile-2',
        '#vh-discard-pile', '#vh-deck-btn', '#player-draw-pile-btn',
        '[id^="vh-card-"]',
        '[id^="daily-card-"]',
        '[id^="eg-pile-"]',
        '#cas-current-card',
        '#cas-grid > button.bg-white',
        '#sudoku-grid > button.bg-white',
        '#sdk-picker-preview.bg-white',
        '#vh-skt-dropzone > button',
        '#vh-player-trios .card-63-88',
        '#card-list-grid > button',
        '#adv-cards-grid > div'
    ].join(',');

    let activeTiltCard = null;

    function resetCardTilt(card) {
        if (!card) return;
        card.style.setProperty('--tilt-rx', '0deg');
        card.style.setProperty('--tilt-ry', '0deg');
        card.style.setProperty('--glare-op', '0');
        card.style.setProperty('--shadow-x', '0px');
        card.style.setProperty('--shadow-y', '12px');
        card.classList.remove('is-tilting');
    }

    function updateHandFanAngles() {
        const handContainers = [
            { id: 'player-hand-container', itemSel: '.game-card', maxDeg: 0, dropPx: 0 },
            { id: 'eg-hand-container', itemSel: '.game-card', maxDeg: 0, dropPx: 0 }
        ];
        handContainers.forEach(({ id, itemSel, maxDeg, dropPx }) => {
            const cont = document.getElementById(id);
            if (!cont) return;
            const cards = cont.querySelectorAll(itemSel);
            const n = cards.length;
            if (n <= 1) {
                cards.forEach(c => {
                    c.style.setProperty('--card-fan-rot', '0deg');
                    c.style.setProperty('--card-fan-y', '0px');
                });
                return;
            }
            const mid = (n - 1) / 2;
            cards.forEach((c, idx) => {
                const norm = mid > 0 ? (idx - mid) / mid : 0; // -1 .. +1
                const rot = norm * maxDeg;
                const drop = norm * norm * dropPx;
                c.style.setProperty('--card-fan-rot', `${rot.toFixed(2)}deg`);
                c.style.setProperty('--card-fan-y', `${drop.toFixed(1)}px`);
            });
        });
    }

    // Beobachtet Karten-Container, damit Fächerbogen nach jedem Render automatisch sitzt
    function observeHandFanContainers() {
        if (typeof MutationObserver === 'undefined') return;
        const obs = new MutationObserver(() => updateHandFanAngles());
        ['player-hand-container', 'eg-hand-container'].forEach(id => {
            const el = document.getElementById(id);
            if (el) obs.observe(el, { childList: true });
        });
        updateHandFanAngles();
    }

    // ------------------------------------------------------------------------
    // 4. BALATRO PHYSIK-DRAG-&-DROP ENGINE (MAUS + TOUCH, VELOCITY-TILT, MAGNET)
    // ------------------------------------------------------------------------
    const dragPhysics = {
        active: false,
        dragging: false,
        pointerId: null,
        context: null, // 'arena' | 'verhoer' | 'endgame'
        handIdx: -1,
        sourceEl: null,
        ghostEl: null,
        startX: 0,
        startY: 0,
        grabOffsetX: 0,
        grabOffsetY: 0,
        ptrX: 0,
        ptrY: 0,
        curX: 0,
        curY: 0,
        prevX: 0,
        prevY: 0,
        rotZ: 0,
        rotX: 0,
        rotY: 0,
        rafId: null,
        targets: [],
        hoveredTarget: null
    };

    function identifyDraggableCard(targetNode) {
        if (!targetNode || !targetNode.closest) return null;

        // 1. Arena Handkarte
        const arenaCard = targetNode.closest('[id^="hand-card-el-"]');
        if (arenaCard && typeof gameState !== 'undefined' && gameState.isRunning) {
            const idx = parseInt(arenaCard.id.replace('hand-card-el-', ''), 10);
            if (!isNaN(idx) && gameState.playerHand[idx]) {
                return { context: 'arena', handIdx: idx, el: arenaCard };
            }
        }

        // 2. Verhör Handkarte
        const vhCard = targetNode.closest('[id^="vh-card-"]');
        if (vhCard && typeof vhCanUseSktDrop === 'function' && vhCanUseSktDrop()) {
            const idx = parseInt(vhCard.id.replace('vh-card-', ''), 10);
            if (!isNaN(idx) && typeof vhState !== 'undefined' && vhState.playerHand[idx] && !vhState.sktDraftIndices.includes(idx)) {
                return { context: 'verhoer', handIdx: idx, el: vhCard };
            }
        }

        // 3a. Blink-Sudoku Vorschaukarte direkt auf ein Feld ziehen
        const sdkPrev = targetNode.closest('#sdk-picker-preview');
        if (sdkPrev && typeof sudokuState !== 'undefined' && !sudokuState.solved && sudokuState.inputMode === 'card') {
            return { context: 'sudoku', handIdx: 0, el: sdkPrev };
        }

        // 3a-2. Bereits eingesetzte (nicht fixierte) Karte aus dem Blink-Sudoku rausziehen / verschieben
        const sdkGrid = document.getElementById('sudoku-grid');
        const sdkCell = targetNode.closest('#sudoku-grid > button');
        if (sdkGrid && sdkCell && typeof sudokuState !== 'undefined' && !sudokuState.solved) {
            const cellIdx = Array.from(sdkGrid.children).indexOf(sdkCell);
            if (cellIdx >= 0 && !sudokuState.fixed[cellIdx] && sudokuState.board[cellIdx]) {
                return { context: 'sudoku-remove', handIdx: cellIdx, el: sdkCell };
            }
        }

        // 3b. Cluster-Cascade aktive Karte direkt über Spalte 1–5 ziehen
        const casCard = targetNode.closest('#cas-current-card');
        if (casCard && typeof cascadeState !== 'undefined' && !cascadeState.gameOver && !cascadeState.isAnimating && !cascadeState.rotateMode) {
            return { context: 'cascade', handIdx: 0, el: casCard };
        }

        // 3. Endgame Handkarte
        const egCard = targetNode.closest('[id^="eg-hand-"]');
        if (egCard && typeof endgameState !== 'undefined' && endgameState.status === 'playing') {
            const idx = parseInt(egCard.id.replace('eg-hand-', ''), 10);
            if (!isNaN(idx) && endgameState.hand[idx]) {
                return { context: 'endgame', handIdx: idx, el: egCard };
            }
        }

        return null;
    }

    function collectDropTargets(context) {
        const list = [];
        if (context === 'arena') {
            const count = typeof getActivePileCount === 'function' ? getActivePileCount() : 2;
            for (let i = 0; i < count; i++) {
                const el = document.getElementById(`center-pile-${i}`);
                if (el && el.offsetParent !== null) list.push({ type: 'arena-pile', idx: i, el });
            }
        } else if (context === 'verhoer') {
            const disc = document.getElementById('vh-discard-pile');
            const skt = document.getElementById('vh-player-skt-box');
            if (disc && disc.offsetParent !== null) list.push({ type: 'vh-discard', idx: 0, el: disc });
            if (skt && skt.offsetParent !== null) list.push({ type: 'vh-skt', idx: 1, el: skt });
        } else if (context === 'sudoku') {
            const grid = document.getElementById('sudoku-grid');
            if (grid && typeof sudokuState !== 'undefined') {
                Array.from(grid.children).forEach((el, i) => {
                    if (!sudokuState.fixed[i] && el.offsetParent !== null) {
                        list.push({ type: 'sudoku-cell', idx: i, el });
                    }
                });
            }
        } else if (context === 'sudoku-remove') {
            const grid = document.getElementById('sudoku-grid');
            if (grid && typeof sudokuState !== 'undefined') {
                Array.from(grid.children).forEach((el, i) => {
                    if (i !== dragPhysics.handIdx && !sudokuState.fixed[i] && el.offsetParent !== null) {
                        list.push({ type: 'sudoku-move-cell', idx: i, el });
                    }
                });
            }
        } else if (context === 'cascade') {
            const grid = document.getElementById('cas-grid');
            const triggers = document.getElementById('cas-col-triggers');
            if (grid && typeof cascadeState !== 'undefined') {
                for (let c = 0; c < 5; c++) {
                    let targetRow = -1;
                    for (let r = 4; r >= 0; r--) {
                        if (cascadeState.board[r] && cascadeState.board[r][c] === null) {
                            targetRow = r;
                            break;
                        }
                    }
                    if (targetRow !== -1) {
                        for (let r = 0; r <= targetRow; r++) {
                            const cellEl = grid.children[r * 5 + c];
                            if (cellEl && cellEl.offsetParent !== null) {
                                list.push({ type: 'cascade-col', idx: c, el: cellEl });
                            }
                        }
                        const trigEl = triggers ? triggers.children[c] : null;
                        if (trigEl && trigEl.offsetParent !== null) {
                            list.push({ type: 'cascade-col', idx: c, el: trigEl });
                        }
                    }
                }
            }
        } else if (context === 'endgame') {
            const n = (typeof endgameState !== 'undefined' && endgameState.piles) ? endgameState.piles.length : 0;
            for (let i = 0; i < n; i++) {
                const el = document.getElementById(`eg-pile-${i}`);
                if (el && el.offsetParent !== null) list.push({ type: 'eg-pile', idx: i, el });
            }
        }
        return list;
    }

    function findMagneticTarget(px, py) {
        let best = null;
        let bestDist = Infinity;
        const pad = 26;

        for (const t of dragPhysics.targets) {
            const r = t.el.getBoundingClientRect();
            if (px >= r.left - pad && px <= r.right + pad && py >= r.top - pad && py <= r.bottom + pad) {
                const cx = r.left + r.width / 2;
                const cy = r.top + r.height / 2;
                const d = Math.hypot(px - cx, py - cy);
                if (d < bestDist) {
                    bestDist = d;
                    best = { ...t, rect: r, cx, cy };
                }
            }
        }
        return best;
    }

    function resolveLiveDragSource(context, handIdx, fallbackEl) {
        if (fallbackEl && fallbackEl.isConnected) return fallbackEl;
        if (context === 'arena') return document.getElementById(`hand-card-el-${handIdx}`);
        if (context === 'verhoer') return document.getElementById(`vh-card-${handIdx}`);
        if (context === 'endgame') return document.getElementById(`eg-hand-${handIdx}`);
        if (context === 'sudoku') return document.getElementById('sdk-picker-preview');
        if (context === 'sudoku-remove') return document.getElementById('sudoku-grid')?.children[handIdx] || null;
        if (context === 'cascade') return document.getElementById('cas-current-card');
        return null;
    }

    function beginPhysicsDrag() {
        const src = resolveLiveDragSource(dragPhysics.context, dragPhysics.handIdx, dragPhysics.sourceEl);
        if (!src || !src.isConnected) {
            dragPhysics.active = false;
            return;
        }
        dragPhysics.sourceEl = src;
        const rect = src.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            dragPhysics.active = false;
            return;
        }
        resetCardTilt(src);

        const ghost = src.cloneNode(true);
        ghost.removeAttribute('id');
        ghost.classList.remove(
            'game-card', 'selected-card', 'dragging-card', 'shake-invalid', 'is-tilting',
            'haptic-deal-pop', 'haptic-pile-thump', 'haptic-drag-source-hidden',
            'phys-magnet-repel', 'phys-sudoku-resonance', 'phys-cascade-falling', 'phys-cascade-shock'
        );
        ghost.classList.add('haptic-drag-ghost');
        ghost.style.setProperty('position', 'fixed', 'important');
        ghost.style.setProperty('animation', 'none', 'important');
        ghost.style.left = `${rect.left.toFixed(1)}px`;
        ghost.style.top = `${rect.top.toFixed(1)}px`;
        ghost.style.width = `${rect.width.toFixed(1)}px`;
        ghost.style.height = `${rect.height.toFixed(1)}px`;
        ghost.style.margin = '0';
        ghost.style.zIndex = '9999';
        ghost.style.pointerEvents = 'none';
        ghost.style.visibility = 'visible';
        ghost.style.opacity = '1';
        ghost.style.willChange = 'left, top, transform';
        ghost.style.transform = 'perspective(820px) scale(1.06)';

        document.body.appendChild(ghost);
        src.classList.add('haptic-drag-source-hidden');

        dragPhysics.dragging = true;
        dragPhysics.ghostEl = ghost;
        dragPhysics.grabOffsetX = dragPhysics.startX - rect.left;
        dragPhysics.grabOffsetY = dragPhysics.startY - rect.top;
        dragPhysics.curX = rect.left;
        dragPhysics.curY = rect.top;
        dragPhysics.prevX = rect.left;
        dragPhysics.prevY = rect.top;
        dragPhysics.rotZ = 0;
        dragPhysics.rotX = 0;
        dragPhysics.rotY = 0;
        dragPhysics.targets = collectDropTargets(dragPhysics.context);
        dragPhysics.hoveredTarget = null;

        document.body.classList.add('haptic-is-dragging');
        playHapticFoley('cardLift', 1.0);
        hapticVibrate(6);

        const loop = () => {
            if (!dragPhysics.dragging || !dragPhysics.ghostEl) return;

            let targetX = dragPhysics.ptrX - dragPhysics.grabOffsetX;
            let targetY = dragPhysics.ptrY - dragPhysics.grabOffsetY;

            let mag = findMagneticTarget(dragPhysics.ptrX, dragPhysics.ptrY);
            if (dragPhysics.context === 'sudoku-remove') {
                const grid = document.getElementById('sudoku-grid');
                if (grid) {
                    const gr = grid.getBoundingClientRect();
                    const isOutside = dragPhysics.ptrX < gr.left || dragPhysics.ptrX > gr.right || dragPhysics.ptrY < gr.top || dragPhysics.ptrY > gr.bottom;
                    dragPhysics.ghostEl.classList.toggle('phys-drag-discarding', isOutside);
                    if (isOutside) mag = null;
                }
            }
            const prevEl = dragPhysics.hoveredTarget ? dragPhysics.hoveredTarget.el : null;
            const nextEl = mag ? mag.el : null;

            if (prevEl !== nextEl) {
                if (prevEl) prevEl.classList.remove('haptic-drop-magnet');
                if (nextEl) {
                    nextEl.classList.add('haptic-drop-magnet');
                    playHapticFoley('magnet');
                    hapticVibrate(5);
                }
                dragPhysics.hoveredTarget = mag;
            }

            // Sanfte magnetische Anziehung zum Zentrum der Zielzone
            if (mag) {
                const snapX = mag.cx - rect.width / 2;
                const snapY = mag.cy - rect.height / 2;
                targetX = targetX * 0.74 + snapX * 0.26;
                targetY = targetY * 0.74 + snapY * 0.26;
            }

            // Feder-Interpolation (knackig & unmittelbar)
            dragPhysics.curX += (targetX - dragPhysics.curX) * 0.44;
            dragPhysics.curY += (targetY - dragPhysics.curY) * 0.44;

            const vx = dragPhysics.curX - dragPhysics.prevX;
            dragPhysics.lastVx = vx;
            dragPhysics.lastVy = dragPhysics.curY - dragPhysics.prevY;
            const vy = dragPhysics.curY - dragPhysics.prevY;
            dragPhysics.prevX = dragPhysics.curX;
            dragPhysics.prevY = dragPhysics.curY;

            // Balatro Velocity-Tilt (kippt physikalisch in Bewegungsrichtung)
            const goalRotZ = Math.max(-18, Math.min(18, vx * 0.95));
            const goalRotY = Math.max(-16, Math.min(16, vx * 0.60));
            const goalRotX = Math.max(-14, Math.min(14, -vy * 0.48));
            dragPhysics.rotZ += (goalRotZ - dragPhysics.rotZ) * 0.28;
            dragPhysics.rotY += (goalRotY - dragPhysics.rotY) * 0.28;
            dragPhysics.rotX += (goalRotX - dragPhysics.rotX) * 0.28;

            const dragScale = mag ? 1.04 : 1.085;
            dragPhysics.ghostEl.style.left = `${dragPhysics.curX.toFixed(1)}px`;
            dragPhysics.ghostEl.style.top = `${dragPhysics.curY.toFixed(1)}px`;
            dragPhysics.ghostEl.style.transform =
                `perspective(820px) rotateX(${dragPhysics.rotX.toFixed(2)}deg) rotateY(${dragPhysics.rotY.toFixed(2)}deg) rotateZ(${dragPhysics.rotZ.toFixed(2)}deg) scale(${dragScale})`;

            dragPhysics.rafId = requestAnimationFrame(loop);
        };
        dragPhysics.rafId = requestAnimationFrame(loop);
    }

    function animateGhostReturn(ghost, src) {
        const reboundEl = dragPhysics._reboundEl || null;
        dragPhysics._reboundEl = null;
        if (reboundEl && ghost && window.BlinkUnifiedPhysics) {
            window.BlinkUnifiedPhysics.animateReboundReturn(ghost, src, reboundEl);
            return;
        }
        if (!ghost) {
            if (src) src.classList.remove('haptic-drag-source-hidden');
            return;
        }
        playHapticFoley('return');
        const dst = (src && src.isConnected) ? src.getBoundingClientRect() : null;
        if (!dst || dst.width <= 0) {
            ghost.remove();
            if (src) src.classList.remove('haptic-drag-source-hidden');
            return;
        }
        ghost.classList.remove('haptic-drag-ghost');
        ghost.style.transition = 'left 220ms cubic-bezier(0.22, 1.22, 0.36, 1), top 220ms cubic-bezier(0.22, 1.22, 0.36, 1), transform 220ms cubic-bezier(0.22, 1.22, 0.36, 1), opacity 180ms ease';
        requestAnimationFrame(() => {
            ghost.style.left = `${dst.left.toFixed(1)}px`;
            ghost.style.top = `${dst.top.toFixed(1)}px`;
            ghost.style.transform = 'scale(1)';
        });
        setTimeout(() => {
            ghost.remove();
            if (src) src.classList.remove('haptic-drag-source-hidden');
        }, 230);
    }

    function finishPhysicsDrag(cancelled = false) {
        if (!dragPhysics.active) return;

        if (dragPhysics.rafId) {
            cancelAnimationFrame(dragPhysics.rafId);
            dragPhysics.rafId = null;
        }

        const wasDragging = dragPhysics.dragging;
        const ctxName = dragPhysics.context;
        const handIdx = dragPhysics.handIdx;
        const src = resolveLiveDragSource(ctxName, handIdx, dragPhysics.sourceEl);
        const ghost = dragPhysics.ghostEl;
        let mag = !cancelled ? findMagneticTarget(dragPhysics.ptrX, dragPhysics.ptrY) : null;
        if (!mag && !cancelled && window.BlinkUnifiedPhysics) {
            mag = window.BlinkUnifiedPhysics.resolveFlickTarget(dragPhysics, findMagneticTarget);
        }

        dragPhysics.targets.forEach(t => t.el.classList.remove('haptic-drop-magnet'));
        document.body.classList.remove('haptic-is-dragging');

        dragPhysics.active = false;
        dragPhysics.dragging = false;
        dragPhysics.pointerId = null;
        dragPhysics.ghostEl = null;
        dragPhysics.sourceEl = null;
        dragPhysics.hoveredTarget = null;
        dragPhysics.targets = [];

        if (!wasDragging) return;

        window._hapticSuppressClickUntil = performance.now() + 140;

        if (ctxName === 'sudoku-remove' && !cancelled && typeof sudokuState !== 'undefined') {
            const grid = document.getElementById('sudoku-grid');
            const gr = grid ? grid.getBoundingClientRect() : null;
            const isOutside = gr && (dragPhysics.ptrX < gr.left || dragPhysics.ptrX > gr.right || dragPhysics.ptrY < gr.top || dragPhysics.ptrY > gr.bottom);
            if (isOutside) {
                const vx = dragPhysics.lastVx || 0;
                const vy = dragPhysics.lastVy || 0;
                if (ghost) {
                    ghost.classList.remove('haptic-drag-ghost');
                    ghost.style.transition = 'left 200ms cubic-bezier(0.22, 1, 0.36, 1), top 200ms cubic-bezier(0.22, 1, 0.36, 1), transform 200ms cubic-bezier(0.22, 1, 0.36, 1), opacity 190ms ease';
                    const tx = dragPhysics.curX + Math.max(-90, Math.min(90, vx * 5));
                    const ty = dragPhysics.curY + Math.max(-90, Math.min(90, vy * 5)) + 16;
                    const rot = dragPhysics.rotZ + (vx >= 0 ? 14 : -14);
                    requestAnimationFrame(() => {
                        ghost.style.left = `${tx.toFixed(1)}px`;
                        ghost.style.top = `${ty.toFixed(1)}px`;
                        ghost.style.transform = `rotateZ(${rot.toFixed(1)}deg) scale(0.72)`;
                        ghost.style.opacity = '0';
                    });
                    setTimeout(() => ghost.remove(), 210);
                }
                if (src) src.classList.remove('haptic-drag-source-hidden');
                sudokuState.board[handIdx] = null;
                sudokuState.selectedCell = handIdx;
                playHapticFoley('return', 1.05);
                hapticVibrate(8);
                if (typeof playSound === 'function') playSound('tick');
                if (typeof renderSudokuUI === 'function') renderSudokuUI();
                return;
            }
        }

        if (!mag) {
            animateGhostReturn(ghost, src);
            return;
        }

        // Prüfen ob Drop direkt gültig ausgeführt werden kann
        let executed = false;

        if (mag.type === 'arena-pile' && typeof gameState !== 'undefined' && typeof tryPlaySelectedOnPile === 'function') {
            const card = gameState.playerHand[handIdx];
            const isLegal = typeof canPlayCardOnPile === 'function' ? canPlayCardOnPile(card, mag.idx) : true;
            dragPhysics._reboundEl = isLegal ? null : mag.el;
            if (isLegal) {
                executed = true;
                if (ghost) ghost.remove();
                if (src) src.classList.remove('haptic-drag-source-hidden');
                window._hapticSkipNextFly = true;
                gameState.selectedHandIndex = handIdx;
                tryPlaySelectedOnPile(mag.idx);
                hapticPileImpact(mag.el, gameState.ruleMode === 'cluster' ? 'purple' : 'cyan');
            } else {
                animateGhostReturn(ghost, src);
                gameState.selectedHandIndex = handIdx;
                tryPlaySelectedOnPile(mag.idx);
                return;
            }

        } else if (mag.type === 'vh-discard' && typeof vhState !== 'undefined') {
            const canDrop = vhState.isRunning && vhState.turn === 'player' && (vhState.phase === 'action' || vhState.phase === 'bonus_discard');
            const card = vhState.playerHand[handIdx];
            const isRecallLocked = vhState.phase === 'action' && vhState.recalledKey && card && keyOf(...card) === vhState.recalledKey;

            if (canDrop && card && !isRecallLocked && typeof vhConfirmSelectedDiscard === 'function') {
                executed = true;
                if (ghost) ghost.remove();
                if (src) src.classList.remove('haptic-drag-source-hidden');
                window._hapticSkipNextFly = true;
                vhConfirmSelectedDiscard(handIdx);
                hapticPileImpact(mag.el, 'amber');
            } else {
                animateGhostReturn(ghost, src);
                if (vhState.phase === 'draw' && typeof showSonnerToast === 'function') {
                    showSonnerToast('Schritt 1: Ziehe zuerst eine 6. Karte (Stapel oder M₁)!', 'warn');
                } else if (isRecallLocked && typeof triggerInvalidShake === 'function') {
                    triggerInvalidShake('vh-discard-pile');
                    if (typeof showSonnerToast === 'function') {
                        showSonnerToast('Die gerade von M₁ zurückgerufene Karte darf nicht sofort wieder abgeworfen werden.', 'warn');
                    }
                }
                return;
            }

        } else if (mag.type === 'vh-skt' && typeof vhAddIndexToSktDraft === 'function') {
            executed = true;
            if (ghost) ghost.remove();
            if (src) src.classList.remove('haptic-drag-source-hidden');
            vhAddIndexToSktDraft(handIdx);
            hapticPileImpact(mag.el, 'purple');

        } else if (mag.type === 'sudoku-move-cell' && typeof sudokuState !== 'undefined') {
            executed = true;
            if (ghost) ghost.remove();
            if (src) src.classList.remove('haptic-drag-source-hidden');
            const prevLines = window.BlinkModePhysics ? window.BlinkModePhysics.getSudokuCompletedLineKeys() : null;
            const movedCard = sudokuState.board[handIdx];
            const swapCard = sudokuState.board[mag.idx];
            sudokuState.board[mag.idx] = movedCard;
            sudokuState.board[handIdx] = swapCard || null;
            sudokuState.notes[mag.idx] = typeof createEmptySudokuNote === 'function' ? createEmptySudokuNote() : { x: [], y: [], z: [] };
            sudokuState.selectedCell = mag.idx;
            if (typeof playSound === 'function') playSound('play');
            if (typeof renderSudokuUI === 'function') renderSudokuUI();
            if (window.BlinkModePhysics) {
                requestAnimationFrame(() => window.BlinkModePhysics.onSudokuCardPlaced(mag.idx, prevLines));
            }
            const destCell = document.getElementById('sudoku-grid')?.children[mag.idx];
            if (destCell) hapticPileImpact(destCell, 'purple');

        } else if (mag.type === 'sudoku-cell' && typeof sudokuState !== 'undefined' && typeof placePickedCardInSudoku === 'function') {
            executed = true;
            if (ghost) ghost.remove();
            if (src) src.classList.remove('haptic-drag-source-hidden');
            window._hapticSkipNextFly = true;
            sudokuState.selectedCell = mag.idx;
            placePickedCardInSudoku();
            hapticPileImpact(mag.el, 'purple');

        } else if (mag.type === 'cascade-col' && typeof cascadeState !== 'undefined' && typeof onCascadeColumnClick === 'function') {
            executed = true;
            if (ghost) ghost.remove();
            if (src) src.classList.remove('haptic-drag-source-hidden');
            onCascadeColumnClick(mag.idx);

        } else if (mag.type === 'eg-pile' && typeof endgameState !== 'undefined' && typeof playEndgameOnPile === 'function') {
            const card = endgameState.hand[handIdx];
            const mode = endgameState.currentPuzzle ? endgameState.currentPuzzle.mode : 'normal';
            const isLegal = typeof canPlayEndgameCard === 'function' ? canPlayEndgameCard(card, endgameState.piles, mag.idx, mode) : true;
            dragPhysics._reboundEl = isLegal ? null : mag.el;
            if (isLegal) {
                executed = true;
                if (ghost) ghost.remove();
                if (src) src.classList.remove('haptic-drag-source-hidden');
                window._hapticSkipNextFly = true;
                endgameState.selectedHandIdx = handIdx;
                playEndgameOnPile(mag.idx);
                hapticPileImpact(mag.el, mode === 'cluster' ? 'purple' : 'cyan');
            } else {
                animateGhostReturn(ghost, src);
                endgameState.selectedHandIdx = handIdx;
                playEndgameOnPile(mag.idx);
                return;
            }
        }

        if (!executed) {
            animateGhostReturn(ghost, src);
        }
    }

    // Native Browser-Drag-Geister auf unseren Physik-Karten unterdrücken
    document.addEventListener('dragstart', (e) => {
        if (identifyDraggableCard(e.target)) {
            e.preventDefault();
        }
    }, true);

    // Klick unmittelbar nach beendetem Drag unterdrücken
    document.addEventListener('click', (e) => {
        if (performance.now() < window._hapticSuppressClickUntil) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }, true);

    document.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        // Taktiles Mikro-Feedback auf Buttons & Controls
        const btn = e.target.closest('button, .fu-cselect-trigger, .fu-cselect-option');
        if (btn && !btn.disabled) {
            hapticVibrate(4);
        }

        const hit = identifyDraggableCard(e.target);
        if (!hit) return;

        dragPhysics.active = true;
        dragPhysics.dragging = false;
        dragPhysics.pointerId = e.pointerId;
        dragPhysics.context = hit.context;
        dragPhysics.handIdx = hit.handIdx;
        dragPhysics.sourceEl = hit.el;
        dragPhysics.startX = e.clientX;
        dragPhysics.startY = e.clientY;
        dragPhysics.ptrX = e.clientX;
        dragPhysics.ptrY = e.clientY;
    }, { passive: true });

    // Globales Spotlight-Tracking (throttled per rAF) + 3D-Card-Tilt + Drag-Move
    let spotlightQueued = false;
    let lastSpotX = 0, lastSpotY = 0;

    function flushGlobalSpotlight() {
        spotlightQueued = false;
        const cards = document.querySelectorAll('.aceternity-bento-card');
        for (let i = 0; i < cards.length; i++) {
            const c = cards[i];
            if (c.offsetParent === null) continue;
            const r = c.getBoundingClientRect();
            c.style.setProperty('--mouse-x', `${(lastSpotX - r.left).toFixed(0)}px`);
            c.style.setProperty('--mouse-y', `${(lastSpotY - r.top).toFixed(0)}px`);
        }
    }

    window.addEventListener('pointermove', (e) => {
        // 1. Physik-Drag aktualisieren
        if (dragPhysics.active && e.pointerId === dragPhysics.pointerId) {
            dragPhysics.ptrX = e.clientX;
            dragPhysics.ptrY = e.clientY;
            if (!dragPhysics.dragging) {
                const dist = Math.hypot(e.clientX - dragPhysics.startX, e.clientY - dragPhysics.startY);
                if (dist >= 7) {
                    beginPhysicsDrag();
                }
            }
            return;
        }

        // 2. Globales Spotlight auf allen Bento-Cards (Start, Labor, Spielen, Kurs)
        if (e.pointerType === 'mouse') {
            lastSpotX = e.clientX;
            lastSpotY = e.clientY;
            if (!spotlightQueued) {
                spotlightQueued = true;
                requestAnimationFrame(flushGlobalSpotlight);
            }

            // 3. Balatro 3D-Tilt & Specular Glare für die Karte unter dem Mauszeiger
            const card = e.target && e.target.closest ? e.target.closest(TILT_CARD_SELECTOR) : null;
            if (card !== activeTiltCard) {
                if (activeTiltCard) resetCardTilt(activeTiltCard);
                activeTiltCard = card;
            }
            if (card && !card.disabled && !card.classList.contains('haptic-drag-source-hidden')) {
                const rect = card.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    const rxNorm = ((e.clientX - rect.left) / rect.width) * 2 - 1;  // -1 .. 1
                    const ryNorm = ((e.clientY - rect.top) / rect.height) * 2 - 1;  // -1 .. 1
                    const rotY = rxNorm * 11.5;
                    const rotX = -ryNorm * 11.5;
                    const glareX = 50 + rxNorm * 42;
                    const glareY = 50 + ryNorm * 42;
                    const shX = -rxNorm * 10;
                    const shY = 14 - ryNorm * 6;

                    card.classList.add('is-tilting');
                    card.style.setProperty('--tilt-rx', `${rotX.toFixed(2)}deg`);
                    card.style.setProperty('--tilt-ry', `${rotY.toFixed(2)}deg`);
                    card.style.setProperty('--glare-x', `${glareX.toFixed(1)}%`);
                    card.style.setProperty('--glare-y', `${glareY.toFixed(1)}%`);
                    card.style.setProperty('--glare-op', '1');
                    card.style.setProperty('--shadow-x', `${shX.toFixed(1)}px`);
                    card.style.setProperty('--shadow-y', `${shY.toFixed(1)}px`);
                }
            }
        }
    }, { passive: true });

    window.addEventListener('pointerup', (e) => {
        if (dragPhysics.active && e.pointerId === dragPhysics.pointerId) {
            dragPhysics.ptrX = e.clientX;
            dragPhysics.ptrY = e.clientY;
            finishPhysicsDrag(false);
        }
    });

    window.addEventListener('pointercancel', (e) => {
        if (dragPhysics.active && e.pointerId === dragPhysics.pointerId) {
            finishPhysicsDrag(true);
        }
    });

    window.addEventListener('blur', () => {
        if (dragPhysics.active) finishPhysicsDrag(true);
        if (activeTiltCard) {
            resetCardTilt(activeTiltCard);
            activeTiltCard = null;
        }
    });

    // ------------------------------------------------------------------------
    // 5. APPLE-SLIDER RAST-HAPTIK (DETENT-TICK BEIM SCHIEBEN)
    // ------------------------------------------------------------------------
    const sliderLastValues = new WeakMap();
    document.addEventListener('input', (e) => {
        const el = e.target;
        if (!el || el.tagName !== 'INPUT' || el.type !== 'range') return;
        const min = parseFloat(el.min || '0');
        const max = parseFloat(el.max || '100');
        const val = parseFloat(el.value || '0');
        const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
        el.style.setProperty('--range-fill', `${pct.toFixed(1)}%`);

        // Spürbares Rast-Klicken bei diskreten Stufen (nicht bei 1000er-Log-Slider bei jedem Pixel)
        const bucket = (max - min) > 40 ? Math.round(pct / 4) : val;
        const prev = sliderLastValues.get(el);
        if (prev !== undefined && prev !== bucket) {
            playHapticFoley('detent', 0.92 + (pct / 100) * 0.24);
            hapticVibrate(3);
        }
        sliderLastValues.set(el, bucket);
    });

    function syncAllRangeFills() {
        document.querySelectorAll('input[type="range"]').forEach(el => {
            const min = parseFloat(el.min || '0');
            const max = parseFloat(el.max || '100');
            const val = parseFloat(el.value || '0');
            const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
            el.style.setProperty('--range-fill', `${pct.toFixed(1)}%`);
        });
    }

    // ------------------------------------------------------------------------
    // 6. GLOBALE API & INITIALISIERUNG
    // ------------------------------------------------------------------------
    window.BlinkHaptics = {
        foley: playHapticFoley,
        vibrate: hapticVibrate,
        pileImpact: hapticPileImpact,
        floatBadge: hapticFloatingBadge,
        burst: hapticCelebrationBurst,
        flyCard: hapticFlyCard,
        stampPop: hapticStampPop,
        syncRanges: syncAllRangeFills,
        updateFans: updateHandFanAngles
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            syncAllRangeFills();
            observeHandFanContainers();
        });
    } else {
        syncAllRangeFills();
        observeHandFanContainers();
    }
})();
// ============================================================================
// UI 2027 MODULE — AMBIENT SYNC · IOS-SHEET-DEPTH · LIVE-ACTIVITY · ⌘K PALETTE
// ============================================================================
(function initBlink2027UI() {
    if (window.__BLINK_2027_READY) return;
    window.__BLINK_2027_READY = true;

    const MODAL_IDS = ['settings-modal', 'mapping-modal', 'game-info-modal', 'elo-overview-modal'];
    const PAGE_IDS = ['home', 'basic-model', 'advanced-model', 'lab', 'game', 'lesson'];


    // ------------------------------------------------------------------------
    // 1. MIKRO-KORN, KONTEXT-SEITEN-SYNC & NAV-GLASKAPSEL AUSRICHTUNG
    // ------------------------------------------------------------------------
    function ensureGrainLayer() {
        if (document.querySelector('.ui27-grain-layer')) return;
        const grain = document.createElement('div');
        grain.className = 'ui27-grain-layer';
        grain.setAttribute('aria-hidden', 'true');
        document.body.appendChild(grain);
    }

    function syncActivePageAttr() {
        let active = 'home';
        for (const p of PAGE_IDS) {
            const el = document.getElementById(`page-${p}`);
            if (el && !el.classList.contains('hidden')) {
                active = p;
                break;
            }
        }
        document.body.dataset.page = active;
    }

    function syncNavGlassIndicator() {
        const navBar = document.getElementById('main-nav-bar');
        const indicator = document.getElementById('nav-indicator');
        if (!navBar || !indicator) return;
        const page = document.body.dataset.page || (typeof state !== 'undefined' ? state.currentPage : 'home');
        const btnMap = {
            'home': 'nav-btn-home',
            'basic-model': 'nav-btn-models',
            'advanced-model': 'nav-btn-models',
            'lab': 'nav-btn-lab',
            'lesson': 'nav-btn-lessons',
            'game': 'nav-btn-game'
        };
        const btn = document.getElementById(btnMap[page] || 'nav-btn-home');
        if (!btn) return;
        const navRect = navBar.getBoundingClientRect();
        const targetRect = btn.getBoundingClientRect();
        if (targetRect.width <= 0) return;
        if (window.BlinkModePhysics) {
            window.BlinkModePhysics.animateNavPill(indicator, targetRect.left - navRect.left, targetRect.width);
            return;
        }
        indicator.style.width = `${Math.round(targetRect.width)}px`;
        indicator.style.left = `${Math.round(targetRect.left - navRect.left)}px`;
    }

    function syncModalSheetDepth() {
        const anyModalOpen = MODAL_IDS.some(id => {
            const m = document.getElementById(id);
            return m && !m.classList.contains('hidden') && !m.classList.contains('opacity-0');
        });
        document.body.classList.toggle('modal-sheet-open', anyModalOpen);
        if (anyModalOpen && window.BlinkHaptics) window.BlinkHaptics.syncRanges();
    }

    function setupObservers() {
        if (typeof MutationObserver === 'undefined') return;

        const pageObs = new MutationObserver(() => {
            syncActivePageAttr();
            requestAnimationFrame(syncNavGlassIndicator);
        });
        PAGE_IDS.forEach(p => {
            const el = document.getElementById(`page-${p}`);
            if (el) pageObs.observe(el, { attributes: true, attributeFilter: ['class'] });
        });

        const modalObs = new MutationObserver(syncModalSheetDepth);
        MODAL_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) modalObs.observe(el, { attributes: true, attributeFilter: ['class'] });
        });

        syncActivePageAttr();
        syncModalSheetDepth();
        requestAnimationFrame(syncNavGlassIndicator);

        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => requestAnimationFrame(syncNavGlassIndicator));
        }
        window.addEventListener('resize', () => requestAnimationFrame(syncNavGlassIndicator));
    }

    // ------------------------------------------------------------------------
    // 2. ESC-TASTE SCHLIESST ALLE OFFENEN MODALS
    // ------------------------------------------------------------------------
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        for (const id of MODAL_IDS) {
            const m = document.getElementById(id);
            if (m && !m.classList.contains('hidden') && !m.classList.contains('opacity-0')) {
                e.preventDefault();
                if (typeof toggleModalState === 'function') {
                    toggleModalState(id);
                }
                break;
            }
        }
    });

    function boot2027UI() {
        ensureGrainLayer();
        window.addEventListener('load', () => { if (window.BlinkHaptics) window.BlinkHaptics.syncRanges(); });
        setupObservers();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot2027UI);
    } else {
        boot2027UI();
    }
})();
// ============================================================================
// UI 2027 FINAL POLISH — INSET GROUPS · SF SYMBOLS · APPLE-STOCKS CHARTS
// ============================================================================
(function initBlinkFinalPolish() {
    if (window.__BLINK_FINAL_POLISH_READY) return;
    window.__BLINK_FINAL_POLISH_READY = true;

    // ------------------------------------------------------------------------
    // 1. APPLE INSET GROUPED LISTS IM EINSTELLUNGS-MODAL
    // ------------------------------------------------------------------------
    function upgradeSettingsToInsetGroups() {
        const modal = document.getElementById('settings-modal');
        if (!modal || modal.dataset.insetUpgraded === '1') return;
        modal.dataset.insetUpgraded = '1';

        // Block 0: Spielername als eigene Apple-Inset-Group (Profil-Zeile)
        const nameInput = document.getElementById('settings-player-name-input');
        if (nameInput && nameInput.parentElement && !nameInput.closest('.apple-inset-group')) {
            const nameSection = nameInput.parentElement;
            nameSection.classList.remove('pb-2', 'border-b', 'border-slate-800');
            const group = document.createElement('div');
            group.className = 'apple-inset-group';
            const row = document.createElement('div');
            row.className = 'flex items-center justify-between gap-3';
            const rowLbl = document.createElement('span');
            rowLbl.className = 'text-xs text-slate-300 shrink-0';
            rowLbl.textContent = 'Anzeigename';
            nameInput.className = 'apple-inset-name-input flex-1 min-w-0 bg-transparent text-right text-xs font-bold text-white placeholder-slate-500 focus:outline-none';
            row.appendChild(rowLbl);
            row.appendChild(nameInput);
            group.appendChild(row);
            nameSection.appendChild(group);
        }

        // Block 1: Design-Theme (vorhandenes 3er-Grid direkt als Gruppe stylen)
        const themeBtn = document.getElementById('theme-btn-onyx-oled');
        if (themeBtn && themeBtn.parentElement) {
            themeBtn.parentElement.classList.remove('gap-2');
            themeBtn.parentElement.classList.add('apple-inset-group');
        }

        // Block 2 (Audio) & Block 3 (Darstellung): Zeilen nach der Überschrift bündeln
        ['chk-sound-enabled', 'chk-game-coords'].forEach(anchorId => {
            const inp = document.getElementById(anchorId);
            const firstRow = inp ? inp.closest('label') : null;
            const section = firstRow ? firstRow.parentElement : null;
            if (!section || section.querySelector('.apple-inset-group')) return;

            const group = document.createElement('div');
            group.className = 'apple-inset-group';
            const heading = section.firstElementChild;
            const rows = Array.from(section.children).filter(el => el !== heading);
            rows.forEach(r => group.appendChild(r));
            section.appendChild(group);
        });
    }

    // ------------------------------------------------------------------------
    // 2. EINHEITLICH VERTIEFTE SEGMENTED-CONTROL-SCHIENEN
    // ------------------------------------------------------------------------
    function upgradeSegmentedControlRails() {
        const anchorIds = [
            'sdk-diff-10',
            'sdk-mode-card',
            'eg-switch-normal',
            'mc-dist-any',
            'phase-met-prob',
            'brain-rule-normal',
            'cube-r-0'
        ];
        anchorIds.forEach(id => {
            const btn = document.getElementById(id);
            if (btn && btn.parentElement) {
                btn.parentElement.classList.add('apple-seg-rail');
            }
        });
    }

    // ------------------------------------------------------------------------
    // 3. SF-SYMBOLS-LOOK (EINHEITLICHE 1,75PX-LINIEN-SVGS STATT UNICODE)
    // ------------------------------------------------------------------------
    const SF_SVGS = {
        play:  '<svg class="sf-sym-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>',
        reset: '<svg class="sf-sym-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path></svg>',
        check: '<svg class="sf-sym-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
        edit:  '<svg class="sf-sym-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>',
        close: '<svg class="sf-sym-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
        left:  '<svg class="sf-sym-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>',
        right: '<svg class="sf-sym-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>'
    };

    function upgradeButtonSymbolsToSF() {
        document.querySelectorAll('button').forEach(btn => {
            if (btn.dataset.sfUpgraded === '1' || btn.querySelector('svg')) return;
            const raw = (btn.textContent || '').trim();
            if (!raw) return;

            let html = null;
            if (raw === '✕') {
                html = SF_SVGS.close;
            } else if (raw.startsWith('▶ ')) {
                html = `${SF_SVGS.play}<span>${raw.slice(2)}</span>`;
            } else if (raw.startsWith('↻ ')) {
                html = `${SF_SVGS.reset}<span>${raw.slice(2)}</span>`;
            } else if (raw.startsWith('✓ ')) {
                html = `${SF_SVGS.check}<span>${raw.slice(2)}</span>`;
            } else if (raw.startsWith('✎ ')) {
                html = `${SF_SVGS.edit}<span>${raw.slice(2)}</span>`;
            } else if (raw.startsWith('← ')) {
                html = `${SF_SVGS.left}<span>${raw.slice(2)}</span>`;
            } else if (raw.endsWith(' →')) {
                html = `<span>${raw.slice(0, -2)}</span>${SF_SVGS.right}`;
            }

            if (html) {
                btn.dataset.sfUpgraded = '1';
                btn.innerHTML = html;
                if (!btn.classList.contains('flex') && !btn.classList.contains('inline-flex')) {
                    btn.classList.add('inline-flex', 'items-center', 'justify-center', 'gap-1.5');
                }
            }
        });
    }

    // ------------------------------------------------------------------------
    // 4. APPLE-STOCKS / HEALTH INTERAKTIVE DIAGRAMME (CROSSHAIR & GLASS-TOOLTIP)
    // ------------------------------------------------------------------------
    function createChartOverlayStage(svgEl) {
        if (!svgEl || !svgEl.parentNode) return null;
        if (svgEl.parentElement.classList.contains('apple-chart-stage')) {
            return svgEl.parentElement;
        }
        const stage = document.createElement('div');
        stage.className = 'apple-chart-stage';
        svgEl.parentNode.insertBefore(stage, svgEl);
        stage.appendChild(svgEl);

        const line = document.createElement('div');
        line.className = 'apple-chart-hairline';
        const dots = document.createElement('div');
        dots.className = 'apple-chart-dots';
        const tip = document.createElement('div');
        tip.className = 'apple-chart-tooltip';

        stage.appendChild(line);
        stage.appendChild(dots);
        stage.appendChild(tip);
        return stage;
    }

    function positionTooltipSmart(tipEl, stageW, xPct) {
        const px = (xPct / 100) * stageW;
        const tipW = tipEl.offsetWidth || 195;
        const placeLeft = px > stageW * 0.56;
        let leftPx = placeLeft ? (px - tipW - 14) : (px + 14);
        leftPx = Math.max(8, Math.min(stageW - tipW - 8, leftPx));
        tipEl.style.left = `${leftPx.toFixed(1)}px`;
    }

    function setupPhaseInteractiveChart() {
        const svg = document.getElementById('phase-curve-svg');
        const stage = createChartOverlayStage(svg);
        if (!stage || stage.dataset.chartWired === '1') return;
        stage.dataset.chartWired = '1';

        const line = stage.querySelector('.apple-chart-hairline');
        const dots = stage.querySelector('.apple-chart-dots');
        const tip = stage.querySelector('.apple-chart-tooltip');

        const W = 640, H = 270, padL = 50, padR = 18, padT = 22, padB = 40;
        const plotW = W - padL - padR;
        const plotH = H - padT - padB;
        let lastHoverM = null;

        line.style.top = `${(padT / H) * 100}%`;
        line.style.height = `${(plotH / H) * 100}%`;

        function handlePointer(e, shouldCommit) {
            if (typeof getPhaseStats !== 'function' || typeof phaseState === 'undefined') return;
            const rect = stage.getBoundingClientRect();
            if (rect.width <= 0) return;

            const svgX = Math.max(padL, Math.min(W - padR, ((e.clientX - rect.left) / rect.width) * W));
            const m = Math.max(5, Math.min(25, Math.round(5 + ((svgX - padL) / plotW) * 20)));

            if (m !== lastHoverM) {
                lastHoverM = m;
                if (window.BlinkHaptics) window.BlinkHaptics.foley('detent', 0.92 + ((m - 5) / 20) * 0.24);
                if (shouldCommit && typeof setPhaseM === 'function') setPhaseM(m);
            }

            const isProb = phaseState.metric === 'prob';
            const sh = getPhaseStats('hyper25', m);
            const sf = getPhaseStats('full125', m);
            const maxExp = getPhaseStats('hyper25', 25).expected;
            const maxY = isProb ? 100 : Math.ceil(maxExp / 20) * 20;

            const xSvg = padL + ((m - 5) / 20) * plotW;
            const vh = isProb ? sh.probApprox : sh.expected;
            const vf = isProb ? sf.probApprox : sf.expected;
            const yh = padT + plotH - (Math.min(vh, maxY) / maxY) * plotH;
            const yf = padT + plotH - (Math.min(vf, maxY) / maxY) * plotH;

            const xPct = (xSvg / W) * 100;
            line.style.left = `${xPct.toFixed(2)}%`;
            line.style.opacity = '1';

            dots.innerHTML = `
                <span class="apple-chart-dot" style="left:${xPct.toFixed(2)}%;top:${((yh / H) * 100).toFixed(2)}%;background:#a855f7;color:#a855f7;"></span>
                <span class="apple-chart-dot" style="left:${xPct.toFixed(2)}%;top:${((yf / H) * 100).toFixed(2)}%;background:#22d3ee;color:#22d3ee;"></span>
            `;

            const fmtVal = (v) => isProb
                ? (v >= 100 ? '100 %' : `${v.toFixed(v < 1 ? 2 : 1)} %`)
                : (v < 0.1 ? v.toFixed(4) : v.toFixed(2));

            tip.innerHTML = `
                <div class="apple-chart-tt-head">m = ${m} offene Karten</div>
                <div class="apple-chart-tt-row">
                    <span class="apple-chart-tt-label"><span class="apple-chart-tt-swatch" style="background:#a855f7"></span>Hyper-Cluster</span>
                    <span class="apple-chart-tt-val">${fmtVal(vh)}</span>
                </div>
                <div class="apple-chart-tt-row">
                    <span class="apple-chart-tt-label"><span class="apple-chart-tt-swatch" style="background:#22d3ee"></span>Vollraum</span>
                    <span class="apple-chart-tt-val">${fmtVal(vf)}</span>
                </div>
                <div class="apple-chart-tt-foot">Ziehen oder klicken zum Fixieren</div>
            `;
            tip.classList.add('is-visible');
            positionTooltipSmart(tip, rect.width, xPct);
        }

        stage.addEventListener('pointermove', (e) => handlePointer(e, e.buttons === 1));
        stage.addEventListener('pointerdown', (e) => handlePointer(e, true));
        stage.addEventListener('pointerleave', () => {
            lastHoverM = null;
            line.style.opacity = '0';
            dots.innerHTML = '';
            tip.classList.remove('is-visible');
        });
    }

    function setupMcInteractiveChart() {
        const svg = document.getElementById('mc-convergence-svg');
        const stage = createChartOverlayStage(svg);
        if (!stage || stage.dataset.chartWired === '1') return;
        stage.dataset.chartWired = '1';

        const line = stage.querySelector('.apple-chart-hairline');
        const dots = stage.querySelector('.apple-chart-dots');
        const tip = stage.querySelector('.apple-chart-tooltip');

        const W = 640, H = 220, padL = 50, padR = 16, padT = 18, padB = 40;
        const plotW = W - padL - padR;
        const plotH = H - padT - padB;

        line.style.top = `${(padT / H) * 100}%`;
        line.style.height = `${(plotH / H) * 100}%`;

        stage.addEventListener('pointermove', (e) => {
            const snap = window._mcConvSnapshot;
            if (!snap || !snap.series || snap.series.length === 0 || !snap.series[0].points.length) return;

            const rect = stage.getBoundingClientRect();
            if (rect.width <= 0) return;

            const svgX = Math.max(padL, Math.min(W - padR, ((e.clientX - rect.left) / rect.width) * W));
            const totalN = Math.max(1, snap.totalN || 1);
            const targetN = totalN <= 1 ? 1 : 1 + ((svgX - padL) / plotW) * (totalN - 1);

            const refPts = snap.series[0].points;
            let bestIdx = 0;
            let bestDiff = Infinity;
            for (let i = 0; i < refPts.length; i++) {
                const d = Math.abs(refPts[i].n - targetN);
                if (d < bestDiff) {
                    bestDiff = d;
                    bestIdx = i;
                }
            }

            let peakVal = 20;
            snap.series.forEach(s => {
                if (typeof s.theory === 'number') peakVal = Math.max(peakVal, s.theory * 1.15);
                s.points.forEach(pt => { if (pt.y > peakVal) peakVal = pt.y; });
            });
            const maxY = peakVal <= 25 ? 25 : (peakVal <= 50 ? 50 : (peakVal <= 75 ? 75 : 100));

            const curN = refPts[bestIdx].n;
            const xSvg = totalN <= 1 ? padL + plotW : padL + ((curN - 1) / (totalN - 1)) * plotW;
            const xPct = (xSvg / W) * 100;

            line.style.left = `${xPct.toFixed(2)}%`;
            line.style.opacity = '1';

            let dotsHtml = '';
            let rowsHtml = '';
            snap.series.forEach(s => {
                const pt = s.points[Math.min(bestIdx, s.points.length - 1)];
                if (!pt) return;
                const ySvg = padT + plotH - (Math.min(maxY, Math.max(0, pt.y)) / maxY) * plotH;
                dotsHtml += `<span class="apple-chart-dot" style="left:${xPct.toFixed(2)}%;top:${((ySvg / H) * 100).toFixed(2)}%;background:${s.color};color:${s.color};"></span>`;
                rowsHtml += `
                    <div class="apple-chart-tt-row">
                        <span class="apple-chart-tt-label"><span class="apple-chart-tt-swatch" style="background:${s.color}"></span>${s.label}</span>
                        <span class="apple-chart-tt-val">${pt.y.toFixed(2)} %</span>
                    </div>
                `;
            });

            dots.innerHTML = dotsHtml;
            tip.innerHTML = `
                <div class="apple-chart-tt-head">Durchlauf n = ${curN.toLocaleString('de-DE')}</div>
                ${rowsHtml}
            `;
            tip.classList.add('is-visible');
            positionTooltipSmart(tip, rect.width, xPct);
        });

        stage.addEventListener('pointerleave', () => {
            line.style.opacity = '0';
            dots.innerHTML = '';
            tip.classList.remove('is-visible');
        });
    }

    function bootFinalPolish() {
        upgradeSettingsToInsetGroups();
        upgradeSegmentedControlRails();
        upgradeButtonSymbolsToSF();
        setupPhaseInteractiveChart();
        setupMcInteractiveChart();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootFinalPolish);
    } else {
        bootFinalPolish();
    }
})();
// ============================================================================
// HERO 3D PHYSIK-ENGINE — FEDER-DÄMPFER · PARALLAXE · FOKUS · 3D-KANTE · SCHATTEN
// ============================================================================
(function initBlinkHeroPhysics() {
    if (window.__BLINK_HERO_PHYSICS_READY) return;
    window.__BLINK_HERO_PHYSICS_READY = true;

    const SIDES = ['left', 'center', 'right'];

    // Gestaffelte Feder-Masse & Parallaxe pro Karte (vorn knackig, hinten weicher nachziehend)
    const CARD_SPEC = {
        center: {
            k: 176, d: 16.5,
            base: { x: 52, y: 26, z: 86, rz: 0 },
            floatPhase: 0.0, floatAmp: 9.5, floatRot: 1.1,
            parallax: { x: 11, y: 7, rx: 4.5, ry: 5.5 }
        },
        right: {
            k: 132, d: 14.5,
            base: { x: 112, y: 34, z: -14, rz: 14 },
            floatPhase: 2.1, floatAmp: 10.5, floatRot: 1.5,
            parallax: { x: -7, y: -5, rx: -3.2, ry: -3.8 }
        },
        left: {
            k: 108, d: 13.0,
            base: { x: -88, y: 20, z: -34, rz: -10 },
            floatPhase: 4.2, floatAmp: 10.0, floatRot: -1.5,
            parallax: { x: -9, y: -6, rx: -3.8, ry: -4.4 }
        }
    };

    // Fokus-Offsets (mathematisch so abgestimmt, dass keine Karte beim Vorfahren clippt)
    const FOCUS_OFFSETS = {
        left: {
            left:   { x:  36, y: -15, z: 124, rx: -11, ry: 14, rz:   8, s: 1.08 },
            center: { x:  16, y:   6, z: -52, rx:   2, ry: -5, rz:   3, s: 0.96 },
            right:  { x:  16, y:   8, z: -18, rx:   2, ry: -6, rz:   4, s: 0.95 }
        },
        center: {
            center: { x:  -4, y: -14, z:  34, rx: -11, ry: 14, rz:   0, s: 1.075 },
            left:   { x: -24, y:   6, z: -18, rx:   2, ry:  5, rz:  -5, s: 0.96 },
            right:  { x:  24, y:   6, z: -18, rx:   2, ry: -5, rz:   5, s: 0.96 }
        },
        right: {
            right:  { x:  46, y: -15, z: 106, rx: -11, ry: 13, rz: -11, s: 1.08 },
            center: { x: -22, y:   6, z: -52, rx:   2, ry:  5, rz:  -3, s: 0.96 },
            left:   { x: -16, y:   8, z: -16, rx:   2, ry:  6, rz:  -4, s: 0.95 }
        }
    };

    const makeSpring = (v) => ({ v, vel: 0 });
    function stepSpring(s, target, k, d, dt) {
        const acc = (target - s.v) * k - s.vel * d;
        s.vel += acc * dt;
        s.v += s.vel * dt;
    }

    function bootHeroPhysics() {
        const wrapper = document.getElementById('hero-3d-wrapper');
        const group = wrapper ? wrapper.querySelector('.hero-card-group') : null;
        if (!wrapper || !group) return;

        const slots = {};
        const cards = {};
        const shadows = {};
        const cardSprings = {};

        wrapper.classList.add('hero-physics-active');

        // 1. Echte 3D-Kartenkante (5 laminierte Schichten) in jede Hero-Karte einfügen
        const edgeDepths = [-1.6, -0.8, 0, 0.8, 1.6];
        SIDES.forEach(side => {
            const slot = wrapper.querySelector(`.hero-slot.${side}`);
            const card = slot ? slot.querySelector('.hero-card') : null;
            if (!slot || !card) return;
            slots[side] = slot;
            cards[side] = card;

            if (!card.querySelector('.hero-card-edge-slice')) {
                const firstFace = card.firstChild;
                edgeDepths.forEach(z => {
                    const slice = document.createElement('div');
                    slice.className = z === 0 ? 'hero-card-edge-slice is-core' : 'hero-card-edge-slice';
                    slice.setAttribute('aria-hidden', 'true');
                    slice.style.transform = `translateZ(${z}px)`;
                    card.insertBefore(slice, firstFace);
                });
            }

            const b = CARD_SPEC[side].base;
            cardSprings[side] = {
                x: makeSpring(b.x),
                y: makeSpring(b.y),
                z: makeSpring(b.z),
                rx: makeSpring(0),
                ry: makeSpring(0),
                rz: makeSpring(b.rz),
                s: makeSpring(1),
                glareOp: makeSpring(0)
            };
        });

        // 2. Dynamische Bodenschatten-Ebene unterhalb der 3 Karten anlegen
        let shadowPlane = wrapper.querySelector('.hero-ground-shadow-plane');
        if (!shadowPlane) {
            shadowPlane = document.createElement('div');
            shadowPlane.className = 'hero-ground-shadow-plane';
            shadowPlane.setAttribute('aria-hidden', 'true');
            SIDES.forEach(side => {
                const sh = document.createElement('div');
                sh.className = `hero-floor-shadow ${side}`;
                shadowPlane.appendChild(sh);
                shadows[side] = sh;
            });
            wrapper.insertBefore(shadowPlane, group);
        }

        // 3. Gruppen-Federzustand & Pointer-Status
        const groupSprings = {
            rotX: makeSpring(22),
            rotY: makeSpring(-24),
            panX: makeSpring(0),
            panY: makeSpring(0)
        };

        let isHovering = false;
        let ptrX = 0;
        let ptrY = 0;
        let focusedSide = null;
        let unfocusTimer = null;
        let rafId = null;
        let lastFrameTime = 0;
        const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function applyFocusClasses(nextFocus) {
            if (focusedSide === nextFocus) return;
            const prev = focusedSide;
            focusedSide = nextFocus;

            SIDES.forEach(side => {
                const slot = slots[side];
                if (!slot) return;
                slot.classList.toggle('is-hero-focused', nextFocus === side);
                slot.classList.toggle('is-hero-dimmed', Boolean(nextFocus) && nextFocus !== side);
                slot.style.zIndex = nextFocus === side ? '30' : (side === 'center' ? '15' : '10');
            });

            if (nextFocus && prev !== nextFocus && window.BlinkHaptics) {
                const pitch = nextFocus === 'left' ? 0.94 : (nextFocus === 'right' ? 1.08 : 1.01);
                window.BlinkHaptics.foley('cardLift', pitch);
            }
        }

        wrapper.addEventListener('pointermove', (e) => {
            if (e.pointerType === 'touch') return;
            const rect = wrapper.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;

            isHovering = true;
            ptrX = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
            ptrY = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height) * 2 - 1));

            const hitSlot = e.target && e.target.closest ? e.target.closest('.hero-slot') : null;
            let hitSide = null;
            if (hitSlot) {
                if (hitSlot.classList.contains('left')) hitSide = 'left';
                else if (hitSlot.classList.contains('center')) hitSide = 'center';
                else if (hitSlot.classList.contains('right')) hitSide = 'right';
            }

            if (hitSide) {
                if (unfocusTimer) { clearTimeout(unfocusTimer); unfocusTimer = null; }
                applyFocusClasses(hitSide);
            } else if (focusedSide && !unfocusTimer) {
                unfocusTimer = setTimeout(() => {
                    unfocusTimer = null;
                    applyFocusClasses(null);
                }, 110);
            }
        }, { passive: true });

        wrapper.addEventListener('pointerleave', () => {
            isHovering = false;
            ptrX = 0;
            ptrY = 0;
            if (unfocusTimer) { clearTimeout(unfocusTimer); unfocusTimer = null; }
            applyFocusClasses(null);
        });

        // 4. Shuffle-Impuls beim Klick auf die Hero-Karten
        window.BlinkHeroPhysics = {
            onShuffle(turboLevel = 0) {
                const boost = 1 + Math.min(4, turboLevel) * 0.22;
                groupSprings.rotX.vel -= 75 * boost;
                SIDES.forEach(side => {
                    const cs = cardSprings[side];
                    if (!cs) return;
                    cs.y.vel -= (210 + (side === 'center' ? 45 : 0)) * boost;
                    cs.z.vel += (side === 'center' ? 150 : 95) * boost;
                    cs.x.vel += (side === 'left' ? -130 : (side === 'right' ? 130 : 0)) * boost;
                    cs.rz.vel += (side === 'left' ? -40 : (side === 'right' ? 40 : 0)) * boost;
                });
            }
        };

        // 5. Haupt-Simulationsschleife (pausiert automatisch auf allen Unterseiten)
        function isHeroVisible() {
            if (document.visibilityState === 'hidden') return false;
            const home = document.getElementById('page-home');
            return Boolean(home && !home.classList.contains('hidden'));
        }

        function tick(now) {
            if (!isHeroVisible()) {
                rafId = null;
                return;
            }
            const dt = lastFrameTime ? Math.min(0.032, Math.max(0.004, (now - lastFrameTime) / 1000)) : 0.016;
            lastFrameTime = now;
            const tSec = now * 0.001;

            const wrapW = wrapper.clientWidth || 420;
            const mobScale = wrapW < 310 ? 0.70 : (wrapW < 370 ? 0.84 : 1.0);

            // Gruppen-Zielwinkel (sanfte Trägheit + Rückführung bei Einzelkarten-Fokus)
            const focusDamp = focusedSide ? 0.58 : 1.0;
            const targetGroupRx = 22 - (isHovering ? ptrY * 16 * focusDamp : 0);
            const targetGroupRy = -24 + (isHovering ? ptrX * 22 * focusDamp : 0);
            const targetPanX = isHovering ? ptrX * 6 : 0;
            const targetPanY = isHovering ? ptrY * 4 : 0;

            stepSpring(groupSprings.rotX, targetGroupRx, 92, 13.5, dt);
            stepSpring(groupSprings.rotY, targetGroupRy, 92, 13.5, dt);
            stepSpring(groupSprings.panX, targetPanX, 85, 13.0, dt);
            stepSpring(groupSprings.panY, targetPanY, 85, 13.0, dt);

            const gRx = groupSprings.rotX.v;
            const gRy = groupSprings.rotY.v;
            const gRyRad = (gRy * Math.PI) / 180;
            const cosRy = Math.cos(gRyRad);
            const sinRy = Math.sin(gRyRad);

            group.style.transform =
                `translate3d(${groupSprings.panX.v.toFixed(2)}px, ${groupSprings.panY.v.toFixed(2)}px, 0) ` +
                `rotateX(${gRx.toFixed(2)}deg) rotateY(${gRy.toFixed(2)}deg)`;

            // Einzelkarten-Federn, Parallaxe, Magnet-Fächer, Glanz & Bodenschatten
            SIDES.forEach(side => {
                const slot = slots[side];
                const card = cards[side];
                const cs = cardSprings[side];
                if (!slot || !card || !cs) return;

                const spec = CARD_SPEC[side];
                const b = spec.base;

                // Organisches, phasenversetztes Schweben
                const breathe = reducedMotion ? 0 : Math.sin(tSec * 1.15 + spec.floatPhase);
                const floatY = breathe * spec.floatAmp * (focusedSide === side ? 0.35 : 1.0);
                const floatRz = reducedMotion ? 0 : Math.cos(tSec * 0.9 + spec.floatPhase) * spec.floatRot;

                // Magnetisches Auffächern bei Container-Hover
                const fanX = isHovering ? (side === 'left' ? -15 : (side === 'right' ? 15 : 0)) : 0;
                const fanY = isHovering && side === 'center' ? -4 : 0;
                const fanZ = isHovering && side === 'center' ? 8 : 0;
                const fanRz = isHovering ? (side === 'left' ? -3.2 : (side === 'right' ? 3.2 : 0)) : 0;

                // Tiefen-Parallaxe relativ zur Maus
                const parX = isHovering ? ptrX * spec.parallax.x : 0;
                const parY = isHovering ? ptrY * spec.parallax.y : 0;
                const parRx = isHovering ? -ptrY * spec.parallax.rx : 0;
                const parRy = isHovering ? ptrX * spec.parallax.ry : 0;

                // Einzelkarten-Fokus
                const foc = focusedSide ? FOCUS_OFFSETS[focusedSide][side] : null;
                const tx = (b.x + fanX + parX + (foc ? foc.x : 0)) * mobScale;
                const ty = (b.y + fanY + parY + floatY + (foc ? foc.y : 0)) * mobScale;
                const tz = (b.z + fanZ + (foc ? foc.z : 0)) * mobScale;
                const trx = parRx + (foc ? foc.rx : 0);
                const tryDeg = parRy + (foc ? foc.ry : 0);
                const trz = b.rz + fanRz + floatRz + (foc ? foc.rz : 0);
                const ts = foc ? foc.s : (isHovering ? 1.015 : 1.0);
                const tGlareOp = focusedSide === side ? 1.0 : (isHovering ? 0.52 : 0.0);

                stepSpring(cs.x, tx, spec.k, spec.d, dt);
                stepSpring(cs.y, ty, spec.k, spec.d, dt);
                stepSpring(cs.z, tz, spec.k, spec.d, dt);
                stepSpring(cs.rx, trx, spec.k * 0.9, spec.d, dt);
                stepSpring(cs.ry, tryDeg, spec.k * 0.9, spec.d, dt);
                stepSpring(cs.rz, trz, spec.k * 0.85, spec.d, dt);
                stepSpring(cs.s, ts, spec.k, spec.d, dt);
                stepSpring(cs.glareOp, tGlareOp, 110, 18, dt);

                slot.style.setProperty('--hs-x', `${cs.x.v.toFixed(2)}px`);
                slot.style.setProperty('--hs-y', `${cs.y.v.toFixed(2)}px`);
                slot.style.setProperty('--hs-z', `${cs.z.v.toFixed(2)}px`);
                slot.style.setProperty('--hs-rx', `${cs.rx.v.toFixed(2)}deg`);
                slot.style.setProperty('--hs-ry', `${cs.ry.v.toFixed(2)}deg`);
                slot.style.setProperty('--hs-rz', `${cs.rz.v.toFixed(2)}deg`);
                slot.style.setProperty('--hs-s', `${cs.s.v.toFixed(4)}`);

                // Individueller holografischer Lichtglanz pro Karte aus realem Neigungswinkel
                const totalRx = gRx + cs.rx.v;
                const totalRy = gRy + cs.ry.v;
                const gx = Math.max(8, Math.min(92, 50 + (totalRy + 24) * 1.35 + ptrX * 14));
                const gy = Math.max(8, Math.min(92, 50 - (totalRx - 22) * 1.45 + ptrY * 14));
                card.style.setProperty('--glare-x', `${gx.toFixed(1)}%`);
                card.style.setProperty('--glare-y', `${gy.toFixed(1)}%`);
                card.style.setProperty('--glare-bg-x', `${(100 - gx).toFixed(1)}%`);
                card.style.setProperty('--glare-bg-y', `${(100 - gy).toFixed(1)}%`);
                card.style.setProperty('--glare-opacity', `${Math.max(0, Math.min(1, cs.glareOp.v)).toFixed(3)}`);

                // Dynamischer direkter Kartenschatten abhängig von Neigung & Höhe
                const liftFactor = Math.max(0, (34 - cs.y.v) * 0.25 + (cs.z.v + 34) * 0.08);
                const shX = -totalRy * 0.42;
                const shY = 16 + totalRx * 0.34 + liftFactor * 0.35;
                const shBlur = 26 + liftFactor * 0.65;
                const isLight = document.documentElement.getAttribute('data-theme') === 'academic-light';
                const baseAlpha = isLight ? 0.17 : 0.44;
                const shAlpha = Math.max(isLight ? 0.08 : 0.22, baseAlpha - liftFactor * 0.003);
                card.style.setProperty('--hero-sh-x', `${shX.toFixed(1)}px`);
                card.style.setProperty('--hero-sh-y', `${shY.toFixed(1)}px`);
                card.style.setProperty('--hero-sh-blur', `${shBlur.toFixed(1)}px`);
                card.style.setProperty('--hero-sh-alpha', `${shAlpha.toFixed(3)}`);

                // Dynamischer Bodenschatten pro Karte (driftet & weicht mit Höhe/Tiefe)
                const floorSh = shadows[side];
                if (floorSh) {
                    const projX = (cs.x.v * cosRy + cs.z.v * sinRy) * 0.92 + groupSprings.panX.v - 14 * mobScale - totalRy * 0.32;
                    const projY = (cs.z.v * -0.05) + 4;
                    const heightNorm = Math.max(0, Math.min(1.6, (44 - cs.y.v) / 48));
                    const scX = (0.86 + heightNorm * 0.24) * mobScale;
                    const scY = (0.78 + heightNorm * 0.28) * mobScale;
                    const floorOp = Math.max(0.24, 0.92 - heightNorm * 0.34);
                    floorSh.style.transform = `translate3d(${projX.toFixed(1)}px, ${projY.toFixed(1)}px, 0) scale(${scX.toFixed(3)}, ${scY.toFixed(3)})`;
                    floorSh.style.opacity = floorOp.toFixed(3);
                }
            });

            rafId = requestAnimationFrame(tick);
        }

        function ensureRunning() {
            if (!rafId && isHeroVisible()) {
                lastFrameTime = 0;
                rafId = requestAnimationFrame(tick);
            }
        }

        const homeEl = document.getElementById('page-home');
        if (homeEl && typeof MutationObserver !== 'undefined') {
            new MutationObserver(ensureRunning).observe(homeEl, { attributes: true, attributeFilter: ['class'] });
        }
        document.addEventListener('visibilitychange', ensureRunning);
        ensureRunning();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootHeroPhysics);
    } else {
        bootHeroPhysics();
    }
})();
// ============================================================================
// ERWEITERTE PHYSIK — LIQUID STRETCH · CASCADE GRAVITY · DAILY · SUDOKU MAGNET
// ============================================================================
(function initBlinkModePhysics() {
    if (window.__BLINK_MODE_PHYSICS_READY) return;
    window.__BLINK_MODE_PHYSICS_READY = true;

    const prefersReducedMotion = () =>
        Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // ------------------------------------------------------------------------
    // 1. „LIQUID STRETCH“ AUF ALLEN GLEITENDEN PILLS (DUAL-EDGE SPRING ENGINE)
    // ------------------------------------------------------------------------
    const pillStates = new WeakMap();
    let lastResizeAt = 0;
    window.addEventListener('resize', () => { lastResizeAt = performance.now(); }, { passive: true });

    function stepEdge(val, vel, target, k, d, dt) {
        const acc = (target - val) * k - vel * d;
        const nv = vel + acc * dt;
        return [val + nv * dt, nv];
    }

    function animateLiquidBox(el, targetX, targetY, targetW, targetH, isNav) {
        if (!el || targetW <= 0) return;
        const tx = Math.round(targetX);
        const ty = Math.round(targetY);
        const tw = Math.round(targetW);
        const th = targetH !== null ? Math.round(targetH) : null;

        let st = pillStates.get(el);
        const isResizing = (performance.now() - lastResizeAt) < 140;
        const hiddenNow = parseFloat(getComputedStyle(el).opacity || '1') < 0.05;

        el.classList.add('is-liquid-spring');
        if (isNav) el.style.left = '0px';

        const applyBox = (l, r, top, h, sy) => {
            const w = Math.max(16, r - l);
            el.style.width = `${w.toFixed(2)}px`;
            if (!isNav && h !== null) el.style.height = `${h.toFixed(2)}px`;
            el.style.transform = `translate3d(${l.toFixed(2)}px, ${top.toFixed(2)}px, 0) scaleY(${sy.toFixed(4)})`;
            el.style.opacity = '1';
        };

        if (!st || !st.initialized || isResizing || hiddenNow || prefersReducedMotion()) {
            if (st && st.rafId) cancelAnimationFrame(st.rafId);
            st = {
                initialized: true,
                left: tx, vLeft: 0,
                right: tx + tw, vRight: 0,
                top: ty, vTop: 0,
                height: th,
                tLeft: tx, tRight: tx + tw, tTop: ty, tHeight: th,
                dir: 0, rafId: null, lastTime: 0
            };
            pillStates.set(el, st);
            applyBox(tx, tx + tw, ty, th, 1);
            return;
        }

        const prevCenter = (st.left + st.right) * 0.5;
        const nextCenter = tx + tw * 0.5;
        const delta = nextCenter - prevCenter;

        // Idempotent: gleiches Ziel nicht neu anstoßen
        if (
            Math.abs(tx - st.tLeft) < 0.6 &&
            Math.abs((tx + tw) - st.tRight) < 0.6 &&
            Math.abs(ty - st.tTop) < 0.6
        ) {
            applyBox(st.left, st.right, st.top, st.height, 1);
            return;
        }

        st.tLeft = tx;
        st.tRight = tx + tw;
        st.tTop = ty;
        st.tHeight = th;
        st.dir = Math.abs(delta) > 2 ? (delta > 0 ? 1 : -1) : 0;

        // Sofort aktuellen Zustand synchron schreiben (verhindert 1-Frame-Sprung)
        applyBox(st.left, st.right, st.top, st.height, 1);

        if (st.rafId) return;
        st.lastTime = 0;

        const tick = (now) => {
            if (!el.isConnected) { st.rafId = null; return; }
            const dt = st.lastTime ? Math.min(0.026, Math.max(0.004, (now - st.lastTime) / 1000)) : 0.016;
            st.lastTime = now;

            // Vordere Kante schnellt vor, hintere Kante zieht elastisch nach (Tropfen-Stretch)
            const kLead = 450, dLead = 25;
            const kTrail = 165, dTrail = 19.5;
            const kLeft = st.dir < 0 ? kLead : (st.dir > 0 ? kTrail : 340);
            const dLeft = st.dir < 0 ? dLead : (st.dir > 0 ? dTrail : 24);
            const kRight = st.dir > 0 ? kLead : (st.dir < 0 ? kTrail : 340);
            const dRight = st.dir > 0 ? dLead : (st.dir < 0 ? dTrail : 24);

            [st.left, st.vLeft] = stepEdge(st.left, st.vLeft, st.tLeft, kLeft, dLeft, dt);
            [st.right, st.vRight] = stepEdge(st.right, st.vRight, st.tRight, kRight, dRight, dt);
            [st.top, st.vTop] = stepEdge(st.top, st.vTop, st.tTop, 360, 26, dt);
            if (!isNav && st.tHeight !== null && st.height !== null) {
                st.height += (st.tHeight - st.height) * Math.min(1, dt * 18);
            }

            // Kanten dürfen sich nie überkreuzen
            const minW = Math.min(st.tRight - st.tLeft, 24);
            if (st.right - st.left < minW) {
                const mid = (st.left + st.right) * 0.5;
                st.left = mid - minW * 0.5;
                st.right = mid + minW * 0.5;
            }

            // Volumenerhaltende leichte Stauchung in Y während des horizontalen Stretches
            const curW = st.right - st.left;
            const goalW = Math.max(24, st.tRight - st.tLeft);
            const stretchRatio = Math.max(0, (curW - goalW) / Math.max(goalW, 54));
            const scaleY = Math.max(0.84, 1 - stretchRatio * 0.125);

            applyBox(st.left, st.right, st.top, st.height, scaleY);

            const settled =
                Math.abs(st.tLeft - st.left) < 0.25 &&
                Math.abs(st.tRight - st.right) < 0.25 &&
                Math.abs(st.tTop - st.top) < 0.25 &&
                Math.abs(st.vLeft) < 1.2 &&
                Math.abs(st.vRight) < 1.2;

            if (settled) {
                st.left = st.tLeft;
                st.right = st.tRight;
                st.top = st.tTop;
                st.height = st.tHeight;
                st.vLeft = 0;
                st.vRight = 0;
                st.vTop = 0;
                st.rafId = null;
                applyBox(st.left, st.right, st.top, st.height, 1);
                return;
            }
            st.rafId = requestAnimationFrame(tick);
        };
        st.rafId = requestAnimationFrame(tick);
    }

    // ------------------------------------------------------------------------
    // 2. CLUSTER-CASCADE: ECHTE SCHWERKRAFT, SQUASH & STRETCH, DRUCKWELLE
    // ------------------------------------------------------------------------
    function getCascadeCell(row, col) {
        const grid = document.getElementById('cas-grid');
        return grid ? grid.children[row * 5 + col] || null : null;
    }

    function getCascadeRowStepPx() {
        const c0 = getCascadeCell(0, 0);
        const c1 = getCascadeCell(1, 0);
        if (c0 && c1) {
            const dy = c1.getBoundingClientRect().top - c0.getBoundingClientRect().top;
            if (dy > 20) return dy;
        }
        return c0 ? c0.getBoundingClientRect().height + 8 : 96;
    }

    function nudgeElementY(el, pushPx) {
        if (!el || !el.isConnected) return;
        let y = pushPx, vy = 0, last = 0;
        el.classList.add('phys-cascade-shock');
        const step = (now) => {
            if (!el.isConnected) return;
            const dt = last ? Math.min(0.028, (now - last) / 1000) : 0.016;
            last = now;
            [y, vy] = stepEdge(y, vy, 0, 420, 22, dt);
            el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
            if (Math.abs(y) < 0.12 && Math.abs(vy) < 1.2) {
                el.style.transform = '';
                el.classList.remove('phys-cascade-shock');
                return;
            }
            requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    function playCascadeMultiDrop(drops, onDone) {
        if (!drops || drops.length === 0 || prefersReducedMotion()) {
            if (typeof onDone === 'function') onDone();
            return;
        }
        const stepY = getCascadeRowStepPx();
        const startAt = performance.now();
        let lastSnapSound = 0;

        const bodies = drops.map((d) => {
            const el = getCascadeCell(d.row, d.col);
            const belowEl = (drops.length === 1 && d.row < 4) ? getCascadeCell(d.row + 1, d.col) : null;
            const dist = Math.max(1, d.rows) * stepY;
            const delay = drops.length === 1 ? 0 : (d.col * 16 + (4 - d.row) * 14);
            if (el) {
                el.classList.add('phys-cascade-falling');
                el.style.transformOrigin = 'center bottom';
                el.style.transform = `translate3d(0, ${(-dist).toFixed(1)}px, 0)`;
            }
            return {
                el, belowEl, rows: d.rows,
                delay, landed: false, done: false,
                y: -dist, vy: drops.length === 1 ? 190 : 80,
                sx: 1, vsx: 0, sy: 1, vsy: 0,
                landedAt: 0
            };
        }).filter(b => b.el);

        if (bodies.length === 0) {
            if (typeof onDone === 'function') onDone();
            return;
        }

        const G = drops.length === 1 ? 5600 : 4900;
        let last = 0;

        const tick = (now) => {
            const dt = last ? Math.min(0.028, Math.max(0.004, (now - last) / 1000)) : 0.016;
            last = now;
            let allDone = true;

            for (const b of bodies) {
                if (b.done || !b.el.isConnected) continue;
                allDone = false;

                if (now - startAt < b.delay) continue;

                if (!b.landed) {
                    b.vy += G * dt;
                    b.y += b.vy * dt;
                    if (b.y >= 0) {
                        b.y = 0;
                        b.landed = true;
                        b.landedAt = now;
                        const impact = Math.min(1.35, Math.max(0.55, Math.sqrt(b.rows / 2.6)));
                        b.sx = 1 + 0.14 * impact;
                        b.sy = 1 - 0.15 * impact;
                        b.vsx = 0.6 * impact;
                        b.vsy = -0.7 * impact;

                        if (now - lastSnapSound > 32 && window.BlinkHaptics) {
                            lastSnapSound = now;
                            window.BlinkHaptics.foley('cardSnap', Math.max(0.82, 1.12 - b.rows * 0.05));
                            window.BlinkHaptics.vibrate(Math.round(5 + b.rows * 1.8));
                        }
                        if (b.belowEl) nudgeElementY(b.belowEl, 3.8 * impact);
                    } else {
                        const stretch = Math.min(0.07, (b.vy / 2200) * 0.06);
                        b.el.style.transform = `translate3d(0, ${b.y.toFixed(1)}px, 0) scale(${(1 - stretch * 0.65).toFixed(3)}, ${(1 + stretch).toFixed(3)})`;
                        continue;
                    }
                }

                // Squash & Stretch Feder nach Aufprall
                [b.sx, b.vsx] = stepEdge(b.sx, b.vsx, 1, 440, 20, dt);
                [b.sy, b.vsy] = stepEdge(b.sy, b.vsy, 1, 440, 20, dt);
                b.el.style.transform = `translate3d(0, 0, 0) scale(${b.sx.toFixed(4)}, ${b.sy.toFixed(4)})`;

                if (now - b.landedAt > 155 || (Math.abs(1 - b.sx) < 0.004 && Math.abs(1 - b.sy) < 0.004 && Math.abs(b.vsy) < 0.05)) {
                    b.done = true;
                    b.el.style.transform = '';
                    b.el.style.transformOrigin = '';
                    b.el.classList.remove('phys-cascade-falling');
                }
            }

            if (allDone) {
                if (typeof onDone === 'function') onDone();
            } else {
                requestAnimationFrame(tick);
            }
        };
        requestAnimationFrame(tick);
    }

    function playCascadeDrop(row, col, rowsFallen, onDone) {
        playCascadeMultiDrop([{ row, col, rows: rowsFallen }], onDone);
    }

    function playCascadeShockwave(clearingSet, isStrict = false) {
        if (!clearingSet || clearingSet.size === 0 || prefersReducedMotion()) return;
        const grid = document.getElementById('cas-grid');
        if (!grid) return;

        // Schwerpunkt der aufgelösten Zellen berechnen
        let sumX = 0, sumY = 0, cnt = 0;
        clearingSet.forEach(k => {
            const [r, c] = k.split(',').map(Number);
            const el = getCascadeCell(r, c);
            if (!el) return;
            const rect = el.getBoundingClientRect();
            sumX += rect.left + rect.width * 0.5;
            sumY += rect.top + rect.height * 0.5;
            cnt++;
        });
        if (cnt === 0) return;
        const cx = sumX / cnt;
        const cy = sumY / cnt;

        // Optischer Druckwellen-Ring vom Explosionszentrum
        const gridRect = grid.getBoundingClientRect();
        const maxDia = Math.max(gridRect.width, gridRect.height) * 1.15;
        const ring = document.createElement('div');
        ring.className = `phys-shockwave-ring${isStrict ? ' is-strict' : ''}`;
        ring.style.left = `${cx}px`;
        ring.style.top = `${cy}px`;
        ring.style.width = `${maxDia}px`;
        ring.style.height = `${maxDia}px`;
        document.body.appendChild(ring);
        requestAnimationFrame(() => ring.classList.add('is-expanding'));
        setTimeout(() => ring.remove(), 520);

        // Nachbarkarten radial von der Druckwelle anstoßen (zeitversetzt nach Abstand)
        const waveItems = [];
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (clearingSet.has(`${r},${c}`)) continue;
                const card = (typeof cascadeState !== 'undefined' && cascadeState.board[r]) ? cascadeState.board[r][c] : null;
                if (!card) continue;
                const el = getCascadeCell(r, c);
                if (!el) continue;
                const rect = el.getBoundingClientRect();
                const dx = (rect.left + rect.width * 0.5) - cx;
                const dy = (rect.top + rect.height * 0.5) - cy;
                const dist = Math.max(1, Math.hypot(dx, dy));
                const amp = Math.max(3.5, 14.5 - dist * 0.032);
                waveItems.push({
                    el,
                    delay: Math.min(165, dist * 0.44),
                    kickVx: (dx / dist) * amp * 16,
                    kickVy: (dy / dist) * amp * 16,
                    kickVrot: (dx >= 0 ? 1 : -1) * (amp * 6.5),
                    triggered: false, done: false,
                    x: 0, vx: 0, y: 0, vy: 0, rot: 0, vrot: 0
                });
            }
        }
        if (waveItems.length === 0) return;

        const t0 = performance.now();
        let last = 0;
        const tick = (now) => {
            const dt = last ? Math.min(0.028, Math.max(0.004, (now - last) / 1000)) : 0.016;
            last = now;
            let active = false;

            for (const w of waveItems) {
                if (w.done || !w.el.isConnected) continue;
                active = true;
                if (!w.triggered) {
                    if (now - t0 < w.delay) continue;
                    w.triggered = true;
                    w.vx = w.kickVx;
                    w.vy = w.kickVy;
                    w.vrot = w.kickVrot;
                    w.el.classList.add('phys-cascade-shock');
                }
                [w.x, w.vx] = stepEdge(w.x, w.vx, 0, 290, 15, dt);
                [w.y, w.vy] = stepEdge(w.y, w.vy, 0, 290, 15, dt);
                [w.rot, w.vrot] = stepEdge(w.rot, w.vrot, 0, 260, 14, dt);
                w.el.style.transform = `translate3d(${w.x.toFixed(2)}px, ${w.y.toFixed(2)}px, 0) rotateZ(${w.rot.toFixed(2)}deg)`;

                if (now - t0 > w.delay + 340 || (Math.abs(w.x) < 0.12 && Math.abs(w.y) < 0.12 && Math.abs(w.vx) < 1 && Math.abs(w.vy) < 1)) {
                    w.done = true;
                    w.el.style.transform = '';
                    w.el.classList.remove('phys-cascade-shock');
                }
            }
            if (active) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    // ------------------------------------------------------------------------
    // 3. DAILY CHALLENGE: GUMMIBAND-ANZIEHUNG ZUM SCHWERPUNKT & ZÄHLER-SNAP
    // ------------------------------------------------------------------------
    function playDailyRubberBand(indices, isStrict, onComplete) {
        if (!indices || indices.length !== 5 || prefersReducedMotion()) {
            if (typeof onComplete === 'function') onComplete();
            return;
        }

        const sources = indices.map(i => document.getElementById(`daily-card-${i}`)).filter(Boolean);
        if (sources.length !== 5) {
            if (typeof onComplete === 'function') onComplete();
            return;
        }

        const rects = sources.map(el => el.getBoundingClientRect());
        const cx = rects.reduce((s, r) => s + r.left + r.width * 0.5, 0) / 5;
        const cy = rects.reduce((s, r) => s + r.top + r.height * 0.5, 0) / 5;

        const targetEl = document.getElementById('daily-progress-count') || document.getElementById('daily-found-list');
        const targetRect = targetEl ? targetEl.getBoundingClientRect() : null;
        const dstX = targetRect && targetRect.width > 0 ? targetRect.left + targetRect.width * 0.5 : cx;
        const dstY = targetRect && targetRect.height > 0 ? targetRect.top + targetRect.height * 0.5 : cy - 80;

        const isLight = document.documentElement.getAttribute('data-theme') === 'academic-light';
        const isOnyx = document.documentElement.getAttribute('data-theme') === 'onyx-oled';
        const bandColor = isLight ? '#18181b' : (isOnyx ? '#f4f4f5' : (isStrict ? '#22d3ee' : '#c084fc'));

        const layer = document.createElement('div');
        layer.className = 'phys-daily-rubber-layer';

        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', String(window.innerWidth));
        svg.setAttribute('height', String(window.innerHeight));
        svg.style.position = 'absolute';
        svg.style.inset = '0';

        const knot = document.createElementNS(svgNS, 'circle');
        knot.setAttribute('cx', String(cx));
        knot.setAttribute('cy', String(cy));
        knot.setAttribute('r', '5');
        knot.setAttribute('fill', bandColor);
        knot.setAttribute('opacity', '0.85');
        svg.appendChild(knot);

        const items = sources.map((src, i) => {
            const r = rects[i];
            const clone = src.cloneNode(true);
            clone.removeAttribute('id');
            clone.classList.add('phys-daily-rubber-clone');
            clone.style.width = `${r.width}px`;
            clone.style.height = `${r.height}px`;
            clone.style.boxShadow = `0 18px 34px -10px rgba(0,0,0,0.55), 0 0 0 2px ${bandColor}`;
            layer.appendChild(clone);
            src.style.opacity = '0.22';

            const band = document.createElementNS(svgNS, 'path');
            band.setAttribute('fill', 'none');
            band.setAttribute('stroke', bandColor);
            band.setAttribute('stroke-width', '2.5');
            band.setAttribute('stroke-linecap', 'round');
            band.setAttribute('opacity', '0.78');
            svg.appendChild(band);

            const fanOff = (i - 2) * 7;
            const fanRot = (i - 2) * 5.5;
            return {
                src, clone, band,
                w: r.width, h: r.height,
                x: r.left + r.width * 0.5,
                y: r.top + r.height * 0.5,
                vx: 0, vy: 0,
                goalX: cx + fanOff,
                goalY: cy + Math.abs(i - 2) * 2.5,
                rot: 0, vrot: 0, goalRot: fanRot,
                s: 1, vs: 0
            };
        });

        layer.appendChild(svg);
        document.body.appendChild(layer);

        if (window.BlinkHaptics) {
            window.BlinkHaptics.foley('cardLift', 1.08);
            window.BlinkHaptics.vibrate(8);
        }

        const t0 = performance.now();
        const PULL_MS = 285;
        const ZIP_MS = 235;
        let snappedAtCenter = false;
        let last = 0;

        const tick = (now) => {
            const dt = last ? Math.min(0.028, Math.max(0.004, (now - last) / 1000)) : 0.016;
            last = now;
            const elapsed = now - t0;

            if (elapsed < PULL_MS) {
                // Phase 1: Hooke-Feder zieht alle 5 Karten samt Gummibändern zum Schwerpunkt
                let avgDist = 0;
                for (const it of items) {
                    [it.x, it.vx] = stepEdge(it.x, it.vx, it.goalX, 235, 16, dt);
                    [it.y, it.vy] = stepEdge(it.y, it.vy, it.goalY, 235, 16, dt);
                    [it.rot, it.vrot] = stepEdge(it.rot, it.vrot, it.goalRot, 210, 15, dt);
                    [it.s, it.vs] = stepEdge(it.s, it.vs, 0.84, 210, 16, dt);

                    const dx = cx - it.x;
                    const dy = cy - it.y;
                    const dist = Math.hypot(dx, dy);
                    avgDist += dist;

                    // Elastische Gummiband-Kurve mit leichter Seitenbiegung
                    const mx = (it.x + cx) * 0.5 - dy * 0.08;
                    const my = (it.y + cy) * 0.5 + dx * 0.08;
                    it.band.setAttribute('d', `M ${it.x.toFixed(1)} ${it.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)}`);
                    it.band.setAttribute('stroke-width', Math.max(1.2, Math.min(4.2, 1.4 + dist * 0.011)).toFixed(2));

                    it.clone.style.transform =
                        `translate3d(${(it.x - it.w * 0.5).toFixed(1)}px, ${(it.y - it.h * 0.5).toFixed(1)}px, 0) ` +
                        `rotateZ(${it.rot.toFixed(2)}deg) scale(${it.s.toFixed(3)})`;
                }
                const knotR = Math.min(18, 5 + Math.max(0, 12 - avgDist / 38));
                knot.setAttribute('r', knotR.toFixed(1));
                requestAnimationFrame(tick);
                return;
            }

            if (!snappedAtCenter) {
                snappedAtCenter = true;
                svg.style.opacity = '0';
                svg.style.transition = 'opacity 110ms ease';
                if (window.BlinkHaptics) {
                    window.BlinkHaptics.foley('cardSnap', isStrict ? 1.15 : 1.02);
                    window.BlinkHaptics.vibrate(10);
                }
                // Ausgangspositionen für Phase 2 fixieren
                for (const it of items) {
                    it.zipStartX = it.x;
                    it.zipStartY = it.y;
                    it.zipStartS = it.s;
                }
            }

            // Phase 2: Gebündeltes 5er-Cluster schnellt bogenförmig in den Zähler
            const p = Math.min(1, (elapsed - PULL_MS) / ZIP_MS);
            const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
            const arcLift = Math.sin(p * Math.PI) * 34;

            for (const it of items) {
                const curX = it.zipStartX + (dstX - it.zipStartX) * ease;
                const curY = it.zipStartY + (dstY - it.zipStartY) * ease - arcLift;
                const curS = it.zipStartS * (1 - ease * 0.72);
                const curOp = p > 0.65 ? Math.max(0, 1 - (p - 0.65) / 0.35) : 1;
                it.clone.style.opacity = curOp.toFixed(3);
                it.clone.style.transform =
                    `translate3d(${(curX - it.w * 0.5).toFixed(1)}px, ${(curY - it.h * 0.5).toFixed(1)}px, 0) ` +
                    `rotateZ(${(it.rot * (1 - ease)).toFixed(2)}deg) scale(${curS.toFixed(3)})`;
            }

            if (p < 1) {
                requestAnimationFrame(tick);
            } else {
                layer.remove();
                sources.forEach(s => { s.style.opacity = ''; });
                if (targetEl) {
                    targetEl.classList.remove('phys-counter-pop');
                    void targetEl.offsetWidth;
                    targetEl.classList.add('phys-counter-pop');
                    setTimeout(() => targetEl.classList.remove('phys-counter-pop'), 380);
                }
                if (typeof onComplete === 'function') onComplete();
            }
        };
        requestAnimationFrame(tick);
    }

    // ------------------------------------------------------------------------
    // 4. 5×5-BLINK-SUDOKU: MAGNET-ABSTOSSUNG & SYNCHRONE RESONANZ-WELLE
    // ------------------------------------------------------------------------
    function getSudokuLines() {
        const lines = [];
        for (let r = 0; r < 5; r++) lines.push({ key: `r${r}`, label: `Zeile ${r + 1} komplett!`, indices: [0, 1, 2, 3, 4].map(c => r * 5 + c) });
        for (let c = 0; c < 5; c++) lines.push({ key: `c${c}`, label: `Spalte ${c + 1} komplett!`, indices: [0, 1, 2, 3, 4].map(r => r * 5 + c) });
        lines.push({ key: 'd0', label: 'Diagonale komplett!', indices: [0, 6, 12, 18, 24] });
        lines.push({ key: 'd1', label: 'Diagonale komplett!', indices: [4, 8, 12, 16, 20] });
        return lines;
    }

    function getSudokuCompletedLineKeys() {
        const set = new Set();
        if (typeof sudokuState === 'undefined' || !Array.isArray(sudokuState.board)) return set;
        if (typeof isValidCluster5 !== 'function') return set;
        getSudokuLines().forEach(line => {
            const cards = line.indices.map(i => sudokuState.board[i]);
            if (cards.every(Boolean) && isValidCluster5(cards)) set.add(line.key);
        });
        return set;
    }

    function flashMagneticFieldArcs(placedEl, conflictEls) {
        const pRect = placedEl.getBoundingClientRect();
        const px = pRect.left + pRect.width * 0.5;
        const py = pRect.top + pRect.height * 0.5;

        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', String(window.innerWidth));
        svg.setAttribute('height', String(window.innerHeight));
        svg.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9993;transition:opacity 340ms ease;';

        conflictEls.slice(0, 4).forEach(el => {
            const r = el.getBoundingClientRect();
            const ox = r.left + r.width * 0.5;
            const oy = r.top + r.height * 0.5;
            const dx = ox - px;
            const dy = oy - py;
            const mx = (px + ox) * 0.5;
            const my = (py + oy) * 0.5;

            [-1, 1].forEach(sign => {
                const path = document.createElementNS(svgNS, 'path');
                const ctrlX = mx - dy * 0.18 * sign;
                const ctrlY = my + dx * 0.18 * sign;
                path.setAttribute('d', `M ${px.toFixed(1)} ${py.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${ox.toFixed(1)} ${oy.toFixed(1)}`);
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke', '#f43f5e');
                path.setAttribute('stroke-width', '2');
                path.setAttribute('stroke-dasharray', '5,4');
                path.setAttribute('opacity', '0.72');
                svg.appendChild(path);
            });
        });

        document.body.appendChild(svg);
        requestAnimationFrame(() => { svg.style.opacity = '0'; });
        setTimeout(() => svg.remove(), 380);
    }

    function triggerMagnetRepulsion(placedEl, conflictEls) {
        const pRect = placedEl.getBoundingClientRect();
        const px = pRect.left + pRect.width * 0.5;
        const py = pRect.top + pRect.height * 0.5;

        flashMagneticFieldArcs(placedEl, conflictEls);

        let sumPushX = 0, sumPushY = 0;
        const bodies = [];

        conflictEls.forEach(el => {
            const r = el.getBoundingClientRect();
            const dx = (r.left + r.width * 0.5) - px;
            const dy = (r.top + r.height * 0.5) - py;
            const dist = Math.max(1, Math.hypot(dx, dy));
            const ux = dx / dist;
            const uy = dy / dist;
            sumPushX -= ux;
            sumPushY -= uy;

            el.classList.add('phys-magnet-repel');
            bodies.push({
                el, x: 0, y: 0, rot: 0,
                vx: ux * 235, vy: uy * 235,
                vrot: (ux >= 0 ? 1 : -1) * 95
            });
        });

        const pDist = Math.max(0.01, Math.hypot(sumPushX, sumPushY));
        placedEl.classList.add('phys-magnet-repel');
        bodies.push({
            el: placedEl, x: 0, y: 0, rot: 0,
            vx: (sumPushX / pDist) * 215,
            vy: (sumPushY / pDist) * 215,
            vrot: ((sumPushX / pDist) >= 0 ? 1 : -1) * 85
        });

        if (window.BlinkHaptics) {
            window.BlinkHaptics.foley('return', 0.85);
            window.BlinkHaptics.vibrate([10, 26, 8]);
        }

        const t0 = performance.now();
        let last = 0;
        const tick = (now) => {
            const dt = last ? Math.min(0.028, Math.max(0.004, (now - last) / 1000)) : 0.016;
            last = now;
            let active = false;

            for (const b of bodies) {
                if (!b.el.isConnected) continue;
                [b.x, b.vx] = stepEdge(b.x, b.vx, 0, 340, 14, dt);
                [b.y, b.vy] = stepEdge(b.y, b.vy, 0, 340, 14, dt);
                [b.rot, b.vrot] = stepEdge(b.rot, b.vrot, 0, 310, 14, dt);
                b.el.style.transform = `translate3d(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px, 0) rotateZ(${b.rot.toFixed(2)}deg)`;

                if (now - t0 < 400 && (Math.abs(b.x) > 0.15 || Math.abs(b.y) > 0.15 || Math.abs(b.vx) > 1.5 || Math.abs(b.vy) > 1.5)) {
                    active = true;
                }
            }

            if (active) {
                requestAnimationFrame(tick);
            } else {
                bodies.forEach(b => {
                    if (!b.el.isConnected) return;
                    b.el.style.transform = '';
                    b.el.classList.remove('phys-magnet-repel');
                });
            }
        };
        requestAnimationFrame(tick);
    }

    function onSudokuCardPlaced(placedIdx, prevCompletedLines) {
        if (prefersReducedMotion()) return;
        if (typeof sudokuState === 'undefined' || !sudokuState.board[placedIdx]) return;
        const grid = document.getElementById('sudoku-grid');
        if (!grid || !grid.children[placedIdx]) return;

        const placed = sudokuState.board[placedIdx];
        const placedEl = grid.children[placedIdx];
        const lines = getSudokuLines();

        // 1. Konflikte auf gemeinsamen Linien (Zeile/Spalte/Diagonale) & exakte Duplikate finden
        const conflictIdxSet = new Set();
        lines.forEach(line => {
            if (!line.indices.includes(placedIdx)) return;
            line.indices.forEach(otherIdx => {
                if (otherIdx === placedIdx) return;
                const other = sudokuState.board[otherIdx];
                if (!other) return;
                if (other[0] === placed[0] || other[1] === placed[1] || other[2] === placed[2]) {
                    conflictIdxSet.add(otherIdx);
                }
            });
        });
        sudokuState.board.forEach((other, otherIdx) => {
            if (otherIdx !== placedIdx && other && other[0] === placed[0] && other[1] === placed[1] && other[2] === placed[2]) {
                conflictIdxSet.add(otherIdx);
            }
        });

        if (conflictIdxSet.size > 0) {
            const conflictEls = [...conflictIdxSet].map(i => grid.children[i]).filter(Boolean);
            if (conflictEls.length > 0) {
                triggerMagnetRepulsion(placedEl, conflictEls);
            }
            return;
        }

        // 2. Neu vollendete gültige Linien → synchrone Resonanz-Welle
        const prev = prevCompletedLines || new Set();
        const newlyCompleted = lines.filter(line => {
            if (prev.has(line.key) || !line.indices.includes(placedIdx)) return false;
            const cards = line.indices.map(i => sudokuState.board[i]);
            return cards.every(Boolean) && typeof isValidCluster5 === 'function' && isValidCluster5(cards);
        });

        if (newlyCompleted.length > 0) {
            const pRow = Math.floor(placedIdx / 5), pCol = placedIdx % 5;
            newlyCompleted.forEach((line, lIdx) => {
                const ordered = [...line.indices].sort((a, b) => {
                    const da = Math.hypot(Math.floor(a / 5) - pRow, (a % 5) - pCol);
                    const db = Math.hypot(Math.floor(b / 5) - pRow, (b % 5) - pCol);
                    return da - db;
                });
                ordered.forEach((cellIdx, stepIdx) => {
                    setTimeout(() => {
                        const cellEl = grid.children[cellIdx];
                        if (!cellEl) return;
                        cellEl.classList.remove('phys-sudoku-resonance');
                        void cellEl.offsetWidth;
                        cellEl.classList.add('phys-sudoku-resonance');
                        setTimeout(() => cellEl.classList.remove('phys-sudoku-resonance'), 500);
                        if (lIdx === 0 && window.BlinkHaptics) {
                            window.BlinkHaptics.foley('detent', 0.94 + stepIdx * 0.13);
                        }
                    }, stepIdx * 65);
                });
            });

            if (window.BlinkHaptics) {
                const badgeText = newlyCompleted.length > 1
                    ? `${newlyCompleted.length} Linien komplett!`
                    : newlyCompleted[0].label;
                window.BlinkHaptics.floatBadge(placedEl, badgeText, 'emerald');
                window.BlinkHaptics.vibrate([8, 22, 12]);
            }
        } else if (window.BlinkHaptics) {
            window.BlinkHaptics.stampPop(placedEl);
        }
    }

    window.BlinkModePhysics = {
        animatePill: (el, x, y, w, h) => animateLiquidBox(el, x, y, w, h, false),
        animateNavPill: (el, x, w) => animateLiquidBox(el, x, 0, w, null, true),
        playCascadeDrop,
        playCascadeMultiDrop,
        playCascadeShockwave,
        playDailyRubberBand,
        getSudokuCompletedLineKeys,
        onSudokuCardPlaced
    };
})();
// ============================================================================
// EINHEITLICHE KARTENPHYSIK FÜR ALLE 6 SPIELMODI
// Flick-to-Play · Abpraller · Ablage-Drehung · Hand-Ausweichen · Deck-Flug
// ============================================================================
(function initBlinkUnifiedCardPhysics() {
    if (window.__BLINK_UNIFIED_PHYSICS_READY) return;
    window.__BLINK_UNIFIED_PHYSICS_READY = true;

    const prefersReducedMotion = () =>
        Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    const resolveEl = (idOrSel) => {
        if (!idOrSel) return null;
        if (typeof idOrSel !== 'string') return idOrSel;
        return /^[#.\[]/.test(idOrSel) ? document.querySelector(idOrSel) : document.getElementById(idOrSel);
    };

    // ------------------------------------------------------------------------
    // 1. ORGANISCHE ABLAGE-DREHUNG & STAPEL-TIEFE (ARENA, VERHÖR, ENDGAMES)
    // ------------------------------------------------------------------------
    const PILE_IDS = new Set(['center-pile-0', 'center-pile-1', 'center-pile-2', 'vh-discard-pile', 'eg-pile-0', 'eg-pile-1', 'eg-pile-2']);
    const pileScatterState = {};

    function applyPileScatter(el, reset = false) {
        if (!el || !el.id || !PILE_IDS.has(el.id)) return;
        if (reset) {
            pileScatterState[el.id] = { rot: 0, depth: 1 };
        } else {
            const prev = pileScatterState[el.id] || { rot: 0, depth: 1 };
            const sign = prev.rot >= 0 ? -1 : 1;
            const nextRot = 0;
            pileScatterState[el.id] = { rot: nextRot, depth: Math.min(6, prev.depth + 1) };
        }
        const st = pileScatterState[el.id];
        el.style.setProperty('--card-fan-rot', `${st.rot.toFixed(2)}deg`);
        el.style.setProperty('--pile-depth', String(st.depth));
        el.classList.add('phys-scattered-pile');
    }

    function restorePileScatter(container) {
        if (!container) return;
        container.querySelectorAll('[id^="eg-pile-"], [id^="center-pile-"], #vh-discard-pile').forEach(el => {
            const st = pileScatterState[el.id];
            if (!st) return;
            el.style.setProperty('--card-fan-rot', `${st.rot.toFixed(2)}deg`);
            el.style.setProperty('--pile-depth', String(st.depth));
            el.classList.add('phys-scattered-pile');
        });
    }

    // ------------------------------------------------------------------------
    // 2. ELASTISCHES HAND-AUSWEICHEN (ARENA, DAS VERHÖR, ENDGAMES)
    // ------------------------------------------------------------------------
    const HAND_CONTAINERS = ['player-hand-container', 'vh-player-hand', 'eg-hand-container'];

    function clearHandParting(container) {
        if (!container) return;
        container.querySelectorAll('.game-card, [id^="vh-card-"]').forEach(c => {
            c.style.setProperty('--hand-shift-x', '0px');
        });
    }

    function setupHandParting() {
        return;
        const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        if (isCoarse) return;

        HAND_CONTAINERS.forEach(id => {
            const cont = document.getElementById(id);
            if (!cont || cont.dataset.partingWired === '1') return;
            cont.dataset.partingWired = '1';

            cont.addEventListener('pointerover', (e) => {
                if (e.pointerType === 'touch' || document.body.classList.contains('haptic-is-dragging')) return;
                const card = e.target.closest('.game-card, [id^="vh-card-"]');
                if (!card || !cont.contains(card)) return;
                const cards = Array.from(cont.querySelectorAll('.game-card, [id^="vh-card-"]'));
                const idx = cards.indexOf(card);
                if (idx === -1) return;
                cards.forEach((c, i) => {
                    const diff = i - idx;
                    const shift = diff === 0 ? 0 : (diff < 0 ? -Math.max(4, 11 - Math.abs(diff) * 3) : Math.max(4, 11 - Math.abs(diff) * 3));
                    c.style.setProperty('--hand-shift-x', `${shift}px`);
                });
            }, { passive: true });

            cont.addEventListener('pointerleave', () => clearHandParting(cont));
        });
    }

    // ------------------------------------------------------------------------
    // 3. FLICK-TO-PLAY & ELASTISCHER ABPRALLER BEI UNGÜLTIGEM ZUG
    // ------------------------------------------------------------------------
    function resolveFlickTarget(dragState, findTargetFn) {
        if (!dragState || prefersReducedMotion()) return null;
        const vx = dragState.lastVx || 0;
        const vy = dragState.lastVy || 0;
        const speed = Math.hypot(vx, vy);
        if (speed < 9.5) return null;

        for (let step = 3; step <= 13; step += 2) {
            const hit = findTargetFn(dragState.ptrX + vx * step, dragState.ptrY + vy * step);
            if (hit) return hit;
        }
        return null;
    }

    function animateReboundReturn(ghost, src, pileEl) {
        if (!ghost) {
            if (src) src.classList.remove('haptic-drag-source-hidden');
            return;
        }
        const gRect = ghost.getBoundingClientRect();
        const pRect = pileEl ? pileEl.getBoundingClientRect() : null;
        const dst = src ? src.getBoundingClientRect() : null;
        if (!dst || dst.width <= 0) {
            ghost.remove();
            if (src) src.classList.remove('haptic-drag-source-hidden');
            return;
        }

        const gx = gRect.left + gRect.width * 0.5;
        const gy = gRect.top + gRect.height * 0.5;
        const px = pRect ? pRect.left + pRect.width * 0.5 : gx;
        const py = pRect ? pRect.top + pRect.height * 0.5 : gy - 40;
        const dx = gx - px;
        const dy = gy - py;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const bounceX = gRect.left + (dx / dist) * 34;
        const bounceY = gRect.top + (dy / dist) * 34 + 14;
        const spin = dx >= 0 ? 11 : -11;

        if (window.BlinkHaptics) window.BlinkHaptics.foley('return', 0.86);

        ghost.classList.remove('haptic-drag-ghost');
        ghost.style.transition = 'left 115ms cubic-bezier(0.2, 0.85, 0.35, 1), top 115ms cubic-bezier(0.2, 0.85, 0.35, 1), transform 115ms cubic-bezier(0.2, 0.85, 0.35, 1)';
        requestAnimationFrame(() => {
            ghost.style.left = `${bounceX.toFixed(1)}px`;
            ghost.style.top = `${bounceY.toFixed(1)}px`;
            ghost.style.transform = `rotateZ(${spin}deg) scale(1.03)`;
        });

        setTimeout(() => {
            if (!ghost.isConnected) return;
            ghost.style.transition = 'left 250ms cubic-bezier(0.22, 1.24, 0.36, 1), top 250ms cubic-bezier(0.22, 1.24, 0.36, 1), transform 250ms cubic-bezier(0.22, 1.24, 0.36, 1)';
            ghost.style.left = `${dst.left.toFixed(1)}px`;
            ghost.style.top = `${dst.top.toFixed(1)}px`;
            ghost.style.transform = 'rotateZ(0deg) scale(1)';
            setTimeout(() => {
                ghost.remove();
                if (src) src.classList.remove('haptic-drag-source-hidden');
            }, 255);
        }, 115);
    }

    // ------------------------------------------------------------------------
    // 4. DECK-RÜCKSTOSS, PARABOL-FLUG & AUSTEIL-WELLEN (ALLE MODI)
    // ------------------------------------------------------------------------
    function recoilDeck(idOrSel) {
        const el = resolveEl(idOrSel);
        if (!el || prefersReducedMotion()) return;
        el.classList.remove('phys-deck-recoil');
        void el.offsetWidth;
        el.classList.add('phys-deck-recoil');
        setTimeout(() => el.classList.remove('phys-deck-recoil'), 260);
    }

    function flyCloneBetweenRects(templateEl, startRect, targetEl, opts = {}) {
        if (!templateEl || !startRect || !targetEl || prefersReducedMotion()) {
            if (typeof opts.onLand === 'function') opts.onLand();
            return;
        }
        const endRect = targetEl.getBoundingClientRect();
        if (startRect.width <= 0 || endRect.width <= 0) {
            if (typeof opts.onLand === 'function') opts.onLand();
            return;
        }

        const duration = opts.duration || 175;
        const clone = templateEl.cloneNode(true);
        clone.removeAttribute('id');
        clone.classList.remove('selected-card', 'dragging-card', 'shake-invalid', 'is-tilting');
        clone.style.position = 'fixed';
        clone.style.left = `${startRect.left}px`;
        clone.style.top = `${startRect.top}px`;
        clone.style.width = `${startRect.width}px`;
        clone.style.height = `${startRect.height}px`;
        clone.style.margin = '0';
        clone.style.zIndex = '9998';
        clone.style.pointerEvents = 'none';
        clone.style.transition = 'none';
        clone.style.transformOrigin = 'center center';
        document.body.appendChild(clone);

        if (opts.hideTarget !== false) targetEl.style.visibility = 'hidden';
        if (window.BlinkHaptics) window.BlinkHaptics.foley('cardLift', opts.pitch || 1.04);

        const dx = (endRect.left + endRect.width * 0.5) - (startRect.left + startRect.width * 0.5);
        const dy = (endRect.top + endRect.height * 0.5) - (startRect.top + startRect.height * 0.5);
        const scaleX = endRect.width / startRect.width;
        const arcLift = Math.min(64, Math.max(20, Math.hypot(dx, dy) * 0.14));
        const tiltZ = Math.max(-13, Math.min(13, dx * 0.032));
        const t0 = performance.now();

        const step = (now) => {
            const p = Math.min(1, (now - t0) / duration);
            const ease = 1 - Math.pow(1 - p, 3);
            const arc = Math.sin(p * Math.PI) * arcLift;
            const curX = dx * ease;
            const curY = dy * ease - arc;
            const curScale = 1 + (scaleX - 1) * ease + Math.sin(p * Math.PI) * 0.06;
            const curRot = tiltZ * Math.sin(p * Math.PI);
            clone.style.transform = `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) rotateZ(${curRot.toFixed(2)}deg) scale(${curScale.toFixed(3)})`;

            if (p < 1) {
                requestAnimationFrame(step);
            } else {
                clone.remove();
                if (targetEl.isConnected) targetEl.style.visibility = '';
                if (opts.impactTone && window.BlinkHaptics) {
                    window.BlinkHaptics.pileImpact(targetEl, opts.impactTone);
                } else if (window.BlinkHaptics) {
                    window.BlinkHaptics.stampPop(targetEl);
                }
                if (typeof opts.onLand === 'function') opts.onLand();
            }
        };
        requestAnimationFrame(step);
    }

    function animateDealFromDeck(deckIdOrSel, cardIdOrSel, tone = null, onLand = null) {
        const deckEl = resolveEl(deckIdOrSel);
        const cardEl = resolveEl(cardIdOrSel);
        if (!cardEl) {
            if (typeof onLand === 'function') onLand();
            return;
        }
        if (!deckEl || prefersReducedMotion()) {
            if (window.BlinkHaptics) window.BlinkHaptics.stampPop(cardEl);
            if (typeof onLand === 'function') onLand();
            return;
        }
        const srcEl = (deckEl.id === 'vh-bot-hand' && deckEl.children.length > 0)
            ? deckEl.children[Math.floor(deckEl.children.length / 2)]
            : deckEl;
        recoilDeck(deckEl);
        flyCloneBetweenRects(cardEl, srcEl.getBoundingClientRect(), cardEl, {
            duration: 175,
            impactTone: tone,
            onLand
        });
    }

    function animateCardOntoPile(sourceIdOrSel, pileIdOrSel, tone = 'rose') {
        const srcWrap = resolveEl(sourceIdOrSel);
        const pileEl = resolveEl(pileIdOrSel);
        if (!pileEl) return;
        if (!srcWrap || prefersReducedMotion()) {
            if (window.BlinkHaptics) window.BlinkHaptics.pileImpact(pileEl, tone);
            return;
        }
        const srcEl = srcWrap.children.length > 0
            ? srcWrap.children[Math.floor(srcWrap.children.length / 2)]
            : srcWrap;
        flyCloneBetweenRects(pileEl, srcEl.getBoundingClientRect(), pileEl, {
            duration: 185,
            impactTone: tone,
            pitch: 0.96
        });
    }

    function animateRectToSelector(startRect, targetSel, tone = 'purple') {
        const targetEl = resolveEl(targetSel);
        if (!targetEl || !startRect) return;
        flyCloneBetweenRects(targetEl, startRect, targetEl, {
            duration: 155,
            impactTone: tone
        });
    }

    function animateGridDealWave(selector, staggerMs = 22) {
        if (prefersReducedMotion()) return;
        const nodes = document.querySelectorAll(selector);
        nodes.forEach((el, i) => {
            el.style.opacity = '0';
            el.style.transform = 'perspective(760px) translate3d(0, 14px, 0) scale(0.9)';
            setTimeout(() => {
                if (!el.isConnected) return;
                el.style.opacity = '';
                el.style.transform = '';
                if (window.BlinkHaptics) window.BlinkHaptics.stampPop(el);
                if (i % 4 === 0 && window.BlinkHaptics) window.BlinkHaptics.foley('cardLift', 0.94 + Math.min(0.24, i * 0.015));
            }, i * staggerMs);
        });
    }

    function animateArenaOpeningDeal() {
        const numPiles = typeof getActivePileCount === 'function' ? getActivePileCount() : 2;
        for (let i = 0; i < numPiles; i++) {
            applyPileScatter(document.getElementById(`center-pile-${i}`), true);
            setTimeout(() => animateDealFromDeck('player-draw-pile-btn', `center-pile-${i}`, 'cyan'), i * 75);
        }
        for (let h = 0; h < 3; h++) {
            setTimeout(() => animateDealFromDeck('player-draw-pile-btn', `hand-card-el-${h}`), 110 + h * 70);
        }
    }

    function animateArenaRestock() {
        const numPiles = typeof getActivePileCount === 'function' ? getActivePileCount() : 2;
        for (let i = 0; i < numPiles; i++) {
            setTimeout(() => animateDealFromDeck('player-draw-pile-btn', `center-pile-${i}`, 'amber'), i * 65);
        }
    }

    function animateEndgameDealWave() {
        document.querySelectorAll('[id^="eg-pile-"]').forEach(p => applyPileScatter(p, true));
        animateGridDealWave('#eg-piles-container [id^="eg-pile-"], #eg-hand-container .game-card', 45);
    }

    // ------------------------------------------------------------------------
    // 5. DAILY CHALLENGE: KARTEN-POP & SCHWERPUNKT-ABSTOSSUNG BEI FEHLER
    // ------------------------------------------------------------------------
    function popSelectedCard(id) {
        const el = document.getElementById(id);
        if (!el || prefersReducedMotion()) return;
        if (window.BlinkHaptics) {
            window.BlinkHaptics.foley('cardLift', 1.06);
            window.BlinkHaptics.stampPop(el);
        }
    }

    function playDailyRepulsion(indices) {
        if (!indices || indices.length === 0) return;
        if (typeof playSound === 'function') playSound('error');
        if (window.BlinkHaptics) window.BlinkHaptics.vibrate([14, 24, 14]);
        if (prefersReducedMotion()) return;

        const els = indices.map(i => document.getElementById(`daily-card-${i}`)).filter(Boolean);
        if (els.length === 0) return;

        const rects = els.map(el => el.getBoundingClientRect());
        const cx = rects.reduce((s, r) => s + r.left + r.width * 0.5, 0) / rects.length;
        const cy = rects.reduce((s, r) => s + r.top + r.height * 0.5, 0) / rects.length;

        const bodies = els.map((el, i) => {
            const dx = (rects[i].left + rects[i].width * 0.5) - cx;
            const dy = (rects[i].top + rects[i].height * 0.5) - cy;
            const d = Math.max(1, Math.hypot(dx, dy));
            el.classList.add('phys-magnet-repel');
            return { el, x: 0, y: 0, rot: 0, vx: (dx / d) * 220, vy: (dy / d) * 220, vrot: (dx >= 0 ? 1 : -1) * 90 };
        });

        const t0 = performance.now();
        let last = 0;
        const tick = (now) => {
            const dt = last ? Math.min(0.028, (now - last) / 1000) : 0.016;
            last = now;
            let active = false;
            for (const b of bodies) {
                if (!b.el.isConnected) continue;
                b.vx += (-b.x * 320 - b.vx * 14) * dt;
                b.vy += (-b.y * 320 - b.vy * 14) * dt;
                b.vrot += (-b.rot * 300 - b.vrot * 14) * dt;
                b.x += b.vx * dt;
                b.y += b.vy * dt;
                b.rot += b.vrot * dt;
                b.el.style.transform = `translate3d(${b.x.toFixed(2)}px, ${b.y.toFixed(2)}px, 0) rotateZ(${b.rot.toFixed(2)}deg)`;
                if (now - t0 < 410 && (Math.abs(b.x) > 0.15 || Math.abs(b.y) > 0.15 || Math.abs(b.vx) > 1.5)) active = true;
            }
            if (active) {
                requestAnimationFrame(tick);
            } else {
                bodies.forEach(b => {
                    if (!b.el.isConnected) return;
                    b.el.style.transform = '';
                    b.el.classList.remove('phys-magnet-repel');
                });
            }
        };
        requestAnimationFrame(tick);
    }

    // ------------------------------------------------------------------------
    // 6. SUDOKU-FLUG-KOORDINATION, ENDGAME-DOPPELKLICK & CASCADE-ROTATE/SKIP
    // ------------------------------------------------------------------------
    let pendingSudokuFlightIdx = -1;

    function scheduleSudokuFlight(idx) {
        pendingSudokuFlightIdx = idx;
    }

    function wireSudokuFlightHook() {
        if (!window.BlinkModePhysics || typeof window.BlinkModePhysics.onSudokuCardPlaced !== 'function') return;
        const orig = window.BlinkModePhysics.onSudokuCardPlaced;
        window.BlinkModePhysics.onSudokuCardPlaced = function (placedIdx, prevCompletedLines) {
            if (pendingSudokuFlightIdx === placedIdx && !prefersReducedMotion()) {
                pendingSudokuFlightIdx = -1;
                animateDealFromDeck('sdk-picker-preview', `#sudoku-grid > button:nth-child(${placedIdx + 1})`, 'purple', () => {
                    orig(placedIdx, prevCompletedLines);
                });
                return;
            }
            pendingSudokuFlightIdx = -1;
            orig(placedIdx, prevCompletedLines);
        };
    }

    window.quickPlayEndgameHandCard = function (handIdx) {
        if (typeof endgameState === 'undefined' || endgameState.status !== 'playing' || !endgameState.hand[handIdx]) return;
        const card = endgameState.hand[handIdx];
        const mode = endgameState.currentPuzzle ? endgameState.currentPuzzle.mode : 'normal';
        for (let p = 0; p < endgameState.piles.length; p++) {
            if (typeof canPlayEndgameCard === 'function' && canPlayEndgameCard(card, endgameState.piles, p, mode)) {
                endgameState.selectedHandIdx = handIdx;
                playEndgameOnPile(p);
                return;
            }
        }
        if (typeof triggerInvalidShake === 'function') triggerInvalidShake(`eg-hand-${handIdx}`);
    };

    function animateCascadeSkip() {
        const curEl = document.getElementById('cas-current-card');
        if (!curEl || prefersReducedMotion()) return;
        const r = curEl.getBoundingClientRect();
        if (r.width <= 0) return;
        const clone = curEl.cloneNode(true);
        clone.removeAttribute('id');
        clone.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;z-index:9995;pointer-events:none;transition:transform 240ms cubic-bezier(0.22,1,0.36,1),opacity 220ms ease;`;
        document.body.appendChild(clone);
        requestAnimationFrame(() => {
            clone.style.transform = 'translate3d(78px, -18px, 0) rotateZ(18deg) scale(0.84)';
            clone.style.opacity = '0';
        });
        setTimeout(() => clone.remove(), 260);
        requestAnimationFrame(() => {
            if (window.BlinkHaptics) window.BlinkHaptics.stampPop(document.getElementById('cas-current-card'));
        });
    }

    function animateCascadeRotate(col, count, onDone) {
        const grid = document.getElementById('cas-grid');
        if (!grid || count < 2 || prefersReducedMotion()) {
            if (typeof onDone === 'function') onDone();
            return;
        }
        const topRow = 5 - count;
        const c0 = grid.children[topRow * 5 + col];
        const c1 = grid.children[(topRow + 1) * 5 + col];
        const stepY = (c0 && c1) ? Math.max(40, c1.getBoundingClientRect().top - c0.getBoundingClientRect().top) : 88;
        const topEl = grid.children[topRow * 5 + col];

        // Die nach unten gerutschten Karten federnd einschwingen lassen
        for (let r = topRow + 1; r < 5; r++) {
            const el = grid.children[r * 5 + col];
            if (!el) continue;
            el.classList.add('phys-cascade-falling');
            el.style.transform = `translate3d(0, ${(-stepY).toFixed(1)}px, 0)`;
            requestAnimationFrame(() => {
                el.style.transition = 'transform 220ms cubic-bezier(0.22, 1.24, 0.36, 1)';
                el.style.transform = 'translate3d(0, 0, 0)';
                setTimeout(() => {
                    el.style.transition = '';
                    el.style.transform = '';
                    el.classList.remove('phys-cascade-falling');
                }, 235);
            });
        }

        // Die von ganz unten nach oben gerückte Karte im Bogen einfliegen lassen
        if (topEl) {
            const bRect = grid.children[4 * 5 + col]?.getBoundingClientRect();
            flyCloneBetweenRects(topEl, bRect, topEl, {
                duration: 215,
                impactTone: 'purple',
                onLand: onDone
            });
        } else if (typeof onDone === 'function') {
            setTimeout(onDone, 230);
        }
    }

    // ------------------------------------------------------------------------
    // 7. INITIALISIERUNG & OBSERVER
    // ------------------------------------------------------------------------
    function bootUnifiedPhysics() {
        setupHandParting();
        wireSudokuFlightHook();

        if (typeof MutationObserver !== 'undefined') {
            const egPiles = document.getElementById('eg-piles-container');
            if (egPiles) new MutationObserver(() => restorePileScatter(egPiles)).observe(egPiles, { childList: true });
        }
    }

    window.BlinkUnifiedPhysics = {
        applyPileScatter,
        resolveFlickTarget,
        animateReboundReturn,
        recoilDeck,
        animateDealFromDeck,
        animateCardOntoPile,
        animateRectToSelector,
        animateGridDealWave,
        animateArenaOpeningDeal,
        animateArenaRestock,
        animateEndgameDealWave,
        popSelectedCard,
        playDailyRepulsion,
        scheduleSudokuFlight,
        animateCascadeSkip,
        animateCascadeRotate
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootUnifiedPhysics);
    } else {
        bootUnifiedPhysics();
    }
})();