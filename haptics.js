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

    function beginPhysicsDrag() {
        const src = dragPhysics.sourceEl;
        const rect = src.getBoundingClientRect();
        resetCardTilt(src);

        const ghost = src.cloneNode(true);
        ghost.removeAttribute('id');
        ghost.classList.remove('selected-card', 'dragging-card', 'shake-invalid', 'is-tilting');
        ghost.classList.add('haptic-drag-ghost');
        ghost.style.position = 'fixed';
        ghost.style.left = '0px';
        ghost.style.top = '0px';
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.margin = '0';
        ghost.style.zIndex = '9999';
        ghost.style.pointerEvents = 'none';
        ghost.style.willChange = 'transform';

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

            const mag = findMagneticTarget(dragPhysics.ptrX, dragPhysics.ptrY);
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
            dragPhysics.ghostEl.style.transform =
                `translate3d(${dragPhysics.curX.toFixed(1)}px, ${dragPhysics.curY.toFixed(1)}px, 0) ` +
                `perspective(820px) rotateX(${dragPhysics.rotX.toFixed(2)}deg) rotateY(${dragPhysics.rotY.toFixed(2)}deg) rotateZ(${dragPhysics.rotZ.toFixed(2)}deg) scale(${dragScale})`;

            dragPhysics.rafId = requestAnimationFrame(loop);
        };
        dragPhysics.rafId = requestAnimationFrame(loop);
    }

    function animateGhostReturn(ghost, src) {
        if (!ghost) {
            if (src) src.classList.remove('haptic-drag-source-hidden');
            return;
        }
        playHapticFoley('return');
        const dst = src ? src.getBoundingClientRect() : null;
        if (!dst || dst.width <= 0) {
            ghost.remove();
            if (src) src.classList.remove('haptic-drag-source-hidden');
            return;
        }
        ghost.style.transition = 'transform 220ms cubic-bezier(0.22, 1.22, 0.36, 1), opacity 180ms ease';
        requestAnimationFrame(() => {
            ghost.style.transform = `translate3d(${dst.left.toFixed(1)}px, ${dst.top.toFixed(1)}px, 0) scale(1)`;
        });
        setTimeout(() => {
            ghost.remove();
            if (src) src.classList.remove('haptic-drag-source-hidden');
        }, 225);
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
        const src = dragPhysics.sourceEl;
        const ghost = dragPhysics.ghostEl;
        const mag = !cancelled ? findMagneticTarget(dragPhysics.ptrX, dragPhysics.ptrY) : null;

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

        if (!mag) {
            animateGhostReturn(ghost, src);
            return;
        }

        // Prüfen ob Drop direkt gültig ausgeführt werden kann
        let executed = false;

        if (mag.type === 'arena-pile' && typeof gameState !== 'undefined' && typeof tryPlaySelectedOnPile === 'function') {
            const card = gameState.playerHand[handIdx];
            const isLegal = typeof canPlayCardOnPile === 'function' ? canPlayCardOnPile(card, mag.idx) : true;
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

        } else if (mag.type === 'eg-pile' && typeof endgameState !== 'undefined' && typeof playEndgameOnPile === 'function') {
            const card = endgameState.hand[handIdx];
            const mode = endgameState.currentPuzzle ? endgameState.currentPuzzle.mode : 'normal';
            const isLegal = typeof canPlayEndgameCard === 'function' ? canPlayEndgameCard(card, endgameState.piles, mag.idx, mode) : true;
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