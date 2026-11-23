        // 10. INTERAKTIVES LABOR (DAILY BLINK CHALLENGE & BLINK-SUDOKU)
        // ============================================================================
        const labState = {
            gameModesInitialized: false,
            stochastikInitialized: false,
            activeGameTab: 'arena'
        };

        function isValidCluster5(cards) {
            if (!cards || cards.length !== 5) return false;
            return new Set(cards.map(c => c[0])).size === 5 &&
                   new Set(cards.map(c => c[1])).size === 5 &&
                   new Set(cards.map(c => c[2])).size === 5;
        }

        function isStrictCluster5(cards) {
            if (!isValidCluster5(cards)) return false;
            const v0 = cards[0], v1 = cards[1];
            const d = [0, 1, 2].map(i => (v1[i] - v0[i] + 5) % 5);
            const lineKeys = new Set();
            for (let t = 0; t < 5; t++) {
                lineKeys.add(keyOf((v0[0] + t * d[0]) % 5, (v0[1] + t * d[1]) % 5, (v0[2] + t * d[2]) % 5));
            }
            return cards.every(c => lineKeys.has(keyOf(c[0], c[1], c[2])));
        }

        function initGameModesIfNeeded() {
            if (labState.gameModesInitialized) return;
            labState.gameModesInitialized = true;
            vhStartNewGame(true);
            initDailyChallenge(false);
            startSudokuGame(10, 'Leicht');
            loadEndgamePuzzle(0);
            initCascadeGame();
            safeRenderMathJax();
        }

        function initStochastikLabIfNeeded() {
            if (!labState.stochastikInitialized) {
                labState.stochastikInitialized = true;
                runMonteCarloSim();
                renderPhaseCurveUI();
            }
            requestAnimationFrame(() => syncAllSlidingPills());
        }

        const phaseState = {
            activeTab: 'montecarlo',
            m: 13,
            metric: 'prob', // 'prob' | 'expected'
            liveSample: null // { hyper25: number, full125: number }
        };

        function setLabSubTab(tabName) {
            if (phaseState.activeTab !== tabName) playSound('tick');
            phaseState.activeTab = tabName;
            if (tabName !== 'brain' && brainState.isTraining) stopBrainTraining();
            ['montecarlo', 'phase', 'brain'].forEach(t => {
                const btn = document.getElementById(`lab-tab-${t}`);
                const view = document.getElementById(`lab-view-${t}`);
                if (btn) btn.className = `relative z-10 px-3.5 py-1 rounded-full text-xs transition-colors ${t === tabName ? 'pill-btn-active' : 'pill-btn-idle'}`;
                if (view) view.classList.toggle('hidden', t !== tabName);
            });
            moveSlidingPill('lab-mode-tabs', `lab-tab-${tabName}`);

            const metaDot = document.getElementById('lab-meta-dot');
            const metaText = document.getElementById('lab-meta-text');
            const labMeta = {
                montecarlo: { dot: 'bg-cyan-400', text: 'Monte-Carlo-Engine · 180 & 125 Karten' },
                phase:      { dot: 'bg-purple-400', text: 'Clusterdichte · Hyper-Cluster vs. Vollraum' },
                brain:      { dot: 'bg-emerald-400', text: 'KI-Training · Live-Scrims & Elo-System' }
            }[tabName];
            if (labMeta && metaDot && metaText) {
                metaDot.className = `w-1.5 h-1.5 rounded-full ${labMeta.dot}`;
                metaText.textContent = labMeta.text;
            }

            if (typeof syncUrlHash === 'function') syncUrlHash();
            if (tabName === 'phase') renderPhaseCurveUI();
            if (tabName === 'brain') {
                initBrainLabIfNeeded();
                renderBrainLabUI();
            }
            safeRenderMathJax();
        }

        // ============================================================================
        // BLINK-KI-TRAINER: ERSTELLER, LOGOS, LIVE-SPARRING & ELO-LIGA
        // ============================================================================
        const AI_TRAIT_META = [
            { key: 'reflex',      label: 'Reflex',      sub: 'Reaktionstempo (ms)', color: '#facc15', bar: 'bg-amber-400' },
            { key: 'kombo',       label: 'Kombo',       sub: 'Kettenblick auf Hand', color: '#22d3ee', bar: 'bg-cyan-400' },
            { key: 'sabotage',    label: 'Sabotage',    sub: 'Störfeuer (d_H = 3)',  color: '#fb7185', bar: 'bg-rose-400' },
            { key: 'stabilitaet', label: 'Stabilität',  sub: 'Anti-Stocken-Schutz',  color: '#34d399', bar: 'bg-emerald-400' }
        ];

        const AI_COLORS = [
            '#22d3ee', '#fb7185', '#facc15', '#34d399',
            '#a855f7', '#fb923c', '#38bdf8', '#f472b6'
        ];

        const AI_LOGOS = [
            {
                id: 'fox', name: 'Fuchs',
                svg: (c) => `
                    <path d="M16 30 L10 10 L27 21 Z" fill="${c}" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M48 30 L54 10 L37 21 Z" fill="${c}" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M16 25 L13 15 L23 22 Z" fill="#fef3c7" opacity="0.85"/>
                    <path d="M48 25 L51 15 L41 22 Z" fill="#fef3c7" opacity="0.85"/>
                    <ellipse cx="32" cy="37" rx="19" ry="16" fill="${c}" stroke="#0f172a" stroke-width="2"/>
                    <path d="M21 43 Q32 54 43 43 Q32 39 21 43 Z" fill="#ffffff" opacity="0.88"/>
                    <circle cx="24" cy="35" r="3.4" fill="#0f172a"/><circle cx="25.1" cy="33.8" r="1.2" fill="#fff"/>
                    <circle cx="40" cy="35" r="3.4" fill="#0f172a"/><circle cx="41.1" cy="33.8" r="1.2" fill="#fff"/>
                    <ellipse cx="19" cy="40" rx="3" ry="1.8" fill="#fb7185" opacity="0.55"/>
                    <ellipse cx="45" cy="40" rx="3" ry="1.8" fill="#fb7185" opacity="0.55"/>
                    <polygon points="30,39 34,39 32,41.5" fill="#0f172a"/>
                    <path d="M29 43.5 Q32 46 35 43.5" fill="none" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round"/>`
            },
            {
                id: 'cat', name: 'Katze',
                svg: (c) => `
                    <polygon points="15,28 13,12 27,20" fill="${c}" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
                    <polygon points="49,28 51,12 37,20" fill="${c}" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
                    <polygon points="17,24 16,16 24,21" fill="#fda4af" opacity="0.85"/>
                    <polygon points="47,24 48,16 40,21" fill="#fda4af" opacity="0.85"/>
                    <circle cx="32" cy="37" r="18" fill="${c}" stroke="#0f172a" stroke-width="2"/>
                    <polygon points="32,22 35,26 32,30 29,26" fill="#fef08a" stroke="#0f172a" stroke-width="1.2"/>
                    <circle cx="24" cy="36" r="3.5" fill="#0f172a"/><circle cx="25.2" cy="34.8" r="1.3" fill="#fff"/>
                    <circle cx="40" cy="36" r="3.5" fill="#0f172a"/><circle cx="41.2" cy="34.8" r="1.3" fill="#fff"/>
                    <path d="M29 41.5 Q32 44.5 32 41.5 Q32 44.5 35 41.5" fill="none" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round"/>
                    <path d="M12 37 L18 38 M12 41 L18 41 M52 37 L46 38 M52 41 L46 41" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round"/>`
            },
            {
                id: 'owl', name: 'Eule',
                svg: (c) => `
                    <polygon points="16,22 14,11 25,17" fill="${c}" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
                    <polygon points="48,22 50,11 39,17" fill="${c}" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
                    <ellipse cx="32" cy="36" rx="19" ry="18" fill="${c}" stroke="#0f172a" stroke-width="2"/>
                    <ellipse cx="32" cy="44" rx="11" ry="8" fill="#ffffff" opacity="0.85"/>
                    <circle cx="24" cy="32" r="6.5" fill="#ffffff" stroke="#0f172a" stroke-width="1.6"/>
                    <circle cx="40" cy="32" r="6.5" fill="#ffffff" stroke="#0f172a" stroke-width="1.6"/>
                    <circle cx="24.5" cy="32" r="3.2" fill="#0f172a"/><circle cx="25.5" cy="31" r="1.1" fill="#fff"/>
                    <circle cx="39.5" cy="32" r="3.2" fill="#0f172a"/><circle cx="40.5" cy="31" r="1.1" fill="#fff"/>
                    <polygon points="29.5,35.5 34.5,35.5 32,40" fill="#fb923c" stroke="#0f172a" stroke-width="1.3" stroke-linejoin="round"/>`
            },
            {
                id: 'dragon', name: 'Drache',
                svg: (c) => `
                    <path d="M14 34 L4 24 L9 40 Z" fill="${c}" stroke="#0f172a" stroke-width="1.8" stroke-linejoin="round"/>
                    <path d="M50 34 L60 24 L55 40 Z" fill="${c}" stroke="#0f172a" stroke-width="1.8" stroke-linejoin="round"/>
                    <polygon points="21,20 17,9 26,17" fill="#fef08a" stroke="#0f172a" stroke-width="1.8" stroke-linejoin="round"/>
                    <polygon points="43,20 47,9 38,17" fill="#fef08a" stroke="#0f172a" stroke-width="1.8" stroke-linejoin="round"/>
                    <ellipse cx="32" cy="37" rx="18" ry="16" fill="${c}" stroke="#0f172a" stroke-width="2"/>
                    <ellipse cx="32" cy="45" rx="11" ry="6.5" fill="#fef3c7" opacity="0.9"/>
                    <circle cx="24" cy="33" r="3.4" fill="#0f172a"/><circle cx="25.2" cy="31.8" r="1.2" fill="#fff"/>
                    <circle cx="40" cy="33" r="3.4" fill="#0f172a"/><circle cx="41.2" cy="31.8" r="1.2" fill="#fff"/>
                    <circle cx="29" cy="39" r="1" fill="#0f172a"/><circle cx="35" cy="39" r="1" fill="#0f172a"/>
                    <path d="M27 43 Q32 46.5 37 43" fill="none" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round"/>`
            },
            {
                id: 'ghost', name: 'Geist',
                svg: (c) => `
                    <path d="M14 38 C14 20 20 12 32 12 C44 12 50 20 50 38 L50 52 L43 47 L37 52 L32 47 L27 52 L21 47 L14 52 Z" fill="${c}" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
                    <circle cx="25" cy="31" r="3.8" fill="#0f172a"/><circle cx="26.2" cy="29.8" r="1.4" fill="#fff"/>
                    <circle cx="39" cy="31" r="3.8" fill="#0f172a"/><circle cx="40.2" cy="29.8" r="1.4" fill="#fff"/>
                    <ellipse cx="19.5" cy="36" rx="2.8" ry="1.6" fill="#fda4af" opacity="0.65"/>
                    <ellipse cx="44.5" cy="36" rx="2.8" ry="1.6" fill="#fda4af" opacity="0.65"/>
                    <path d="M28 38 Q32 42 36 38" fill="none" stroke="#0f172a" stroke-width="1.7" stroke-linecap="round"/>`
            },
            {
                id: 'slime', name: 'Schleim',
                svg: (c) => `
                    <path d="M32 13 C38 22 52 28 52 42 C52 50 44 54 32 54 C20 54 12 50 12 42 C12 28 26 22 32 13 Z" fill="${c}" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
                    <ellipse cx="24" cy="29" rx="3" ry="5" transform="rotate(-24 24 29)" fill="#ffffff" opacity="0.45"/>
                    <circle cx="24" cy="39" r="3.4" fill="#0f172a"/><circle cx="25.1" cy="37.8" r="1.2" fill="#fff"/>
                    <circle cx="40" cy="39" r="3.4" fill="#0f172a"/><circle cx="41.1" cy="37.8" r="1.2" fill="#fff"/>
                    <ellipse cx="18" cy="43" rx="3" ry="1.6" fill="#fb7185" opacity="0.55"/>
                    <ellipse cx="46" cy="43" rx="3" ry="1.6" fill="#fb7185" opacity="0.55"/>
                    <path d="M29 44 Q32 47 35 44" fill="none" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round"/>`
            },
            {
                id: 'bunny', name: 'Hase',
                svg: (c) => `
                    <ellipse cx="23" cy="18" rx="5.5" ry="12" transform="rotate(-10 23 18)" fill="${c}" stroke="#0f172a" stroke-width="2"/>
                    <ellipse cx="41" cy="18" rx="5.5" ry="12" transform="rotate(10 41 18)" fill="${c}" stroke="#0f172a" stroke-width="2"/>
                    <ellipse cx="23" cy="19" rx="2.6" ry="7" transform="rotate(-10 23 19)" fill="#fda4af" opacity="0.8"/>
                    <ellipse cx="41" cy="19" rx="2.6" ry="7" transform="rotate(10 41 19)" fill="#fda4af" opacity="0.8"/>
                    <ellipse cx="32" cy="40" rx="18" ry="15" fill="${c}" stroke="#0f172a" stroke-width="2"/>
                    <circle cx="24" cy="38" r="3.3" fill="#0f172a"/><circle cx="25.1" cy="36.8" r="1.2" fill="#fff"/>
                    <circle cx="40" cy="38" r="3.3" fill="#0f172a"/><circle cx="41.1" cy="36.8" r="1.2" fill="#fff"/>
                    <ellipse cx="32" cy="42" rx="2.2" ry="1.5" fill="#fb7185"/>
                    <path d="M29 45 Q32 47.5 35 45" fill="none" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round"/>`
            },
            {
                id: 'axolotl', name: 'Axolotl',
                svg: (c) => `
                    <path d="M14 29 L6 23 M13 35 L4 35 M14 41 L6 46" stroke="${c}" stroke-width="4" stroke-linecap="round"/>
                    <path d="M50 29 L58 23 M51 35 L60 35 M50 41 L58 46" stroke="${c}" stroke-width="4" stroke-linecap="round"/>
                    <ellipse cx="32" cy="36" rx="19" ry="16" fill="${c}" stroke="#0f172a" stroke-width="2"/>
                    <ellipse cx="32" cy="38" rx="15" ry="12" fill="#ffffff" opacity="0.22"/>
                    <circle cx="23" cy="34" r="3.4" fill="#0f172a"/><circle cx="24.2" cy="32.8" r="1.2" fill="#fff"/>
                    <circle cx="41" cy="34" r="3.4" fill="#0f172a"/><circle cx="42.2" cy="32.8" r="1.2" fill="#fff"/>
                    <ellipse cx="18" cy="39" rx="3" ry="1.8" fill="#fb7185" opacity="0.55"/>
                    <ellipse cx="46" cy="39" rx="3" ry="1.8" fill="#fb7185" opacity="0.55"/>
                    <path d="M26 41 Q32 46 38 41" fill="none" stroke="#0f172a" stroke-width="1.8" stroke-linecap="round"/>`
            },
            {
                id: 'bear', name: 'Bär',
                svg: (c) => `
                    <circle cx="17" cy="21" r="7.5" fill="${c}" stroke="#0f172a" stroke-width="2"/>
                    <circle cx="47" cy="21" r="7.5" fill="${c}" stroke="#0f172a" stroke-width="2"/>
                    <circle cx="17" cy="21" r="3.6" fill="#fef3c7" opacity="0.8"/>
                    <circle cx="47" cy="21" r="3.6" fill="#fef3c7" opacity="0.8"/>
                    <circle cx="32" cy="37" r="18" fill="${c}" stroke="#0f172a" stroke-width="2"/>
                    <ellipse cx="32" cy="42" rx="7.5" ry="5.5" fill="#fef3c7" opacity="0.92"/>
                    <circle cx="24" cy="34" r="3.2" fill="#0f172a"/><circle cx="25.1" cy="32.9" r="1.1" fill="#fff"/>
                    <circle cx="40" cy="34" r="3.2" fill="#0f172a"/><circle cx="41.1" cy="32.9" r="1.1" fill="#fff"/>
                    <ellipse cx="32" cy="40" rx="2.8" ry="2" fill="#0f172a"/>
                    <path d="M29 44 Q32 46.5 35 44" fill="none" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round"/>`
            },
            {
                id: 'spider', name: 'Spinne',
                svg: (c) => `
                    <line x1="32" y1="2" x2="32" y2="15" stroke="#cbd5e1" stroke-width="1.6" stroke-dasharray="2.5,2"/>
                    <path d="M21 28 L10 17 L6 24 M19 33 L7 28 L4 36 M19 38 L7 39 L5 47 M22 43 L11 49 L9 57" fill="none" stroke="#0f172a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M43 28 L54 17 L58 24 M45 33 L57 28 L60 36 M45 38 L57 39 L59 47 M42 43 L53 49 L55 57" fill="none" stroke="#0f172a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
                    <ellipse cx="32" cy="24" rx="11" ry="9" fill="${c}" stroke="#0f172a" stroke-width="2"/>
                    <polygon points="32,18 35,23 32,28 29,23" fill="#ffffff" opacity="0.55"/>
                    <circle cx="32" cy="39" r="13" fill="${c}" stroke="#0f172a" stroke-width="2"/>
                    <circle cx="26.5" cy="38" r="3.4" fill="#0f172a"/><circle cx="27.5" cy="36.8" r="1.2" fill="#fff"/>
                    <circle cx="37.5" cy="38" r="3.4" fill="#0f172a"/><circle cx="38.5" cy="36.8" r="1.2" fill="#fff"/>
                    <circle cx="20.5" cy="36.5" r="2" fill="#0f172a"/><circle cx="21.1" cy="35.8" r="0.7" fill="#fff"/>
                    <circle cx="43.5" cy="36.5" r="2" fill="#0f172a"/><circle cx="44.1" cy="35.8" r="0.7" fill="#fff"/>
                    <path d="M27.5 45 L29 48.5 L30.5 45 M33.5 45 L35 48.5 L36.5 45" fill="#ffffff" stroke="#0f172a" stroke-width="1.2" stroke-linejoin="round"/>`
            }
        ];

        const AI_PERKS = [
            { id: 'color_hunter',   name: 'Farb-Jäger',       desc: 'Erkennt Farb-Matches 22 % schneller.' },
            { id: 'flow_state',     name: 'Flow-State',       desc: 'Nach jedem Zug kommt der nächste 18 % schneller.' },
            { id: 'ice_cold',       name: 'Eiskalt',          desc: 'Unter 8 Restkarten +22 % Reflex-Tempo.' },
            { id: 'chain_master',   name: 'Ketten-Meister',   desc: 'Starker Bonus für direkte 2er-Hand-Kombos.' },
            { id: 'disruptor',      name: 'Störsender',       desc: 'Sabotiert gezielt die Hand des Gegners.' },
            { id: 'deadlock_sense', name: 'Deadlock-Riecher', desc: 'Vermeidet riskante Züge bei Engpässen.' }
        ];

        

        function loadAIRosterState() {
            try {
                const raw = localStorage.getItem('blink_ai_roster_v2');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed.roster)) return parsed;
                }
            } catch (e) {}
            return { activeIdx: 0, ruleMode: 'normal', roster: [] };
        }

        const brainState = {
            ...loadAIRosterState(),
            initialized: false,
            isTraining: false,
            creatorOpen: false,
            logoPickerOpen: false
        };

        const aiCreatorState = {
            name: '',
            logoId: 'fox',
            color: '#22d3ee',
            pointsLeft: 20,
            traits: { reflex: 15, kombo: 15, sabotage: 15, stabilitaet: 15 },
            starterPerk: 'flow_state'
        };

        function stopBrainTraining() { brainState.isTraining = false; }

        function saveAIRosterState() {
            try {
                localStorage.setItem('blink_ai_roster_v2', JSON.stringify({
                    activeIdx: brainState.activeIdx,
                    ruleMode: brainState.ruleMode,
                    roster: brainState.roster
                }));
            } catch (e) {}
        }

        function getActiveTrainedAI() {
            if (!brainState.roster || brainState.roster.length === 0) return null;
            if (brainState.activeIdx >= brainState.roster.length) brainState.activeIdx = 0;
            return brainState.roster[brainState.activeIdx];
        }

        function adjustActiveAIEloFromHuman(delta) {
            const ai = getActiveTrainedAI();
            if (!ai) return;
            ai.elo = Math.max(400, ai.elo + delta);
            saveAIRosterState();
        }

        function computeAIReflexIntervalMs(agent, remainingCards = 29, hadStreak = false, isColorMatch = false) {
            const reflex = Math.max(0, Math.min(100, agent.traits.reflex));
            let ms = 4630 - (reflex / 100) * 3580;
            const perks = agent.perks || [];
            if (hadStreak && perks.includes('flow_state')) ms *= 0.82;
            if (remainingCards <= 8 && perks.includes('ice_cold')) ms *= 0.78;
            if (isColorMatch && perks.includes('color_hunter')) ms *= 0.78;
            const jitter = 0.88 + Math.random() * 0.24;
            return Math.max(780, Math.round(ms * jitter));
        }

        function aiIsLegalMove(card, pileIdx, piles, ruleMode) {
            if (!card) return false;
            if (ruleMode === 'cluster') {
                for (let i = 0; i < 3; i++) {
                    if (i === pileIdx) continue;
                    const o = piles[i];
                    if (!o || card[0] === o[0] || card[1] === o[1] || card[2] === o[2]) return false;
                }
                return true;
            }
            const t = piles[pileIdx];
            return Boolean(t && (card[0] === t[0] || card[1] === t[1] || card[2] === t[2]));
        }

        function chooseTraitAIMove(agent, hand, piles, oppHand, ruleMode) {
            const numPiles = ruleMode === 'cluster' ? 3 : 2;
            const t = agent.traits;
            const perks = agent.perks || [];

            const wKombo = (t.kombo / 100) * (perks.includes('chain_master') ? 1.55 : 1.0);
            const wSabo  = (t.sabotage / 100) * (perks.includes('disruptor') ? 1.55 : 1.0);
            const wStab  = (t.stabilitaet / 100) * (perks.includes('deadlock_sense') ? 1.55 : 1.0);
            const tunnelNoise = Math.max(0.05, (t.reflex - t.stabilitaet * 0.6) / 140);

            let best = null, bestScore = -999;
            for (let i = 0; i < hand.length; i++) {
                const c = hand[i];
                for (let p = 0; p < numPiles; p++) {
                    if (!aiIsLegalMove(c, p, piles, ruleMode)) continue;

                    let chainCnt = 0;
                    for (let j = 0; j < hand.length; j++) {
                        if (j === i) continue;
                        const d = hammingDistance(hand[j], c);
                        if (ruleMode === 'cluster' ? d === 3 : d <= 2) chainCnt++;
                    }
                    const komboScore = chainCnt / Math.max(1, hand.length - 1);

                    let blockCnt = 0;
                    if (oppHand && oppHand.length > 0) {
                        for (let j = 0; j < oppHand.length; j++) {
                            const d = hammingDistance(c, oppHand[j]);
                            if (ruleMode === 'cluster' ? d < 3 : d === 3) blockCnt++;
                        }
                    }
                    const saboScore = oppHand && oppHand.length > 0 ? blockCnt / oppHand.length : 0.4;

                    let divSum = 0;
                    for (let q = 0; q < numPiles; q++) {
                        if (q === p || !piles[q]) continue;
                        divSum += hammingDistance(c, piles[q]) / 3;
                    }
                    const stabScore = divSum / Math.max(1, numPiles - 1);
                    const colorBonus = (perks.includes('color_hunter') && piles[p] && c[1] === piles[p][1]) ? 0.25 : 0;

                    const score = wKombo * komboScore * 1.4
                                + wSabo  * saboScore  * 1.25
                                + wStab  * stabScore  * 1.15
                                + colorBonus
                                + (Math.random() - 0.5) * tunnelNoise;

                    if (score > bestScore) { bestScore = score; best = { handIdx: i, pileIdx: p }; }
                }
            }
            return best;
        }

        function simulateRealtimeBlinkDuel(agentA, agentB, ruleMode) {
            const deck = shuffleArray(CARDS_60);
            const piles = ruleMode === 'cluster' ? drawValidClusterTrioFromDeck(deck) : [deck.pop(), deck.pop()];
            const half = Math.floor(deck.length / 2);
            const aDeck = deck.slice(0, half), bDeck = deck.slice(half, half * 2);
            const aHand = aDeck.splice(0, 3), bHand = bDeck.splice(0, 3);

            let timeA = computeAIReflexIntervalMs(agentA, 29, false, false);
            let timeB = computeAIReflexIntervalMs(agentB, 29, false, false);
            let streakA = false, streakB = false;

            for (let step = 0; step < 220; step++) {
                if (aDeck.length + aHand.length === 0) return true;
                if (bDeck.length + bHand.length === 0) return false;

                const aFirst = timeA <= timeB;
                const nowT = aFirst ? timeA : timeB;

                if (aFirst) {
                    const mv = chooseTraitAIMove(agentA, aHand, piles, bHand, ruleMode);
                    if (mv) {
                        const card = aHand.splice(mv.handIdx, 1)[0];
                        const isCol = piles[mv.pileIdx] && card[1] === piles[mv.pileIdx][1];
                        piles[mv.pileIdx] = card;
                        while (aHand.length < 3 && aDeck.length > 0) aHand.push(aDeck.shift());
                        streakA = true;
                        timeA = nowT + computeAIReflexIntervalMs(agentA, aDeck.length + aHand.length, streakA, isCol);
                        continue;
                    }
                    streakA = false;
                } else {
                    const mv = chooseTraitAIMove(agentB, bHand, piles, aHand, ruleMode);
                    if (mv) {
                        const card = bHand.splice(mv.handIdx, 1)[0];
                        const isCol = piles[mv.pileIdx] && card[1] === piles[mv.pileIdx][1];
                        piles[mv.pileIdx] = card;
                        while (bHand.length < 3 && bDeck.length > 0) bHand.push(bDeck.shift());
                        streakB = true;
                        timeB = nowT + computeAIReflexIntervalMs(agentB, bDeck.length + bHand.length, streakB, isCol);
                        continue;
                    }
                    streakB = false;
                }

                const otherMv = aFirst
                    ? chooseTraitAIMove(agentB, bHand, piles, aHand, ruleMode)
                    : chooseTraitAIMove(agentA, aHand, piles, bHand, ruleMode);
                if (!otherMv) {
                    const pool = shuffleArray(CARDS_60);
                    if (ruleMode === 'cluster') {
                        if (aDeck.length > 0) aDeck.shift();
                        if (bDeck.length > 0) bDeck.shift();
                        const trio = drawValidClusterTrioFromDeck(pool);
                        piles[0] = trio[0]; piles[1] = trio[1]; piles[2] = trio[2];
                    } else {
                        piles[0] = aDeck.length > 0 ? aDeck.shift() : pool[0];
                        piles[1] = bDeck.length > 0 ? bDeck.shift() : pool[1];
                    }
                    timeA = nowT + 600 + computeAIReflexIntervalMs(agentA, aDeck.length + aHand.length, false, false) * 0.4;
                    timeB = nowT + 600 + computeAIReflexIntervalMs(agentB, bDeck.length + bHand.length, false, false) * 0.4;
                } else {
                    if (aFirst) timeA = timeB + 150; else timeB = timeA + 150;
                }
            }
            return (aDeck.length + aHand.length) <= (bDeck.length + bHand.length);
        }

        function evaluateAIEloBenchmark(ai, smoothUpdate = false) {
            if (!ai) return 700;
            const oldElo = ai.elo || 700;
            const t = ai.traits;
            const weighted = t.reflex * 0.55 + t.kombo * 0.18 + t.sabotage * 0.14 + t.stabilitaet * 0.13;
            const extraPerks = Math.max(0, (ai.perks ? ai.perks.length : 0) - 1);
            const targetElo = Math.max(500, Math.min(2150, Math.round(450 + weighted * 14 + extraPerks * 75)));

            if (smoothUpdate) {
                const rawDelta = Math.round((targetElo - oldElo) * 0.45);
                const clampedDelta = Math.max(-15, Math.min(35, rawDelta));
                ai.elo = Math.max(500, oldElo + clampedDelta);
            } else {
                ai.elo = targetElo;
            }

            saveAIRosterState();
            return ai.elo;
        }

        function initBrainLabIfNeeded() {
            if (brainState.initialized) return;
            brainState.initialized = true;
            renderBrainLabUI();
        }

        function openAICreator() {
            if (brainState.roster.length >= 4) {
                showSonnerToast('Deine KI-Box ist voll (max. 4 KIs). Lass zuerst eine KI frei.', 'warn');
                return;
            }
            aiCreatorState.name = '';
            aiCreatorState.logoId = AI_LOGOS[brainState.roster.length % AI_LOGOS.length].id;
            aiCreatorState.color = AI_COLORS[brainState.roster.length % AI_COLORS.length];
            aiCreatorState.pointsLeft = 20;
            aiCreatorState.traits = { reflex: 15, kombo: 15, sabotage: 15, stabilitaet: 15 };
            aiCreatorState.starterPerk = AI_PERKS[0].id;
            brainState.creatorOpen = true;
            playSound('tick');
            renderBrainLabUI();
            setTimeout(() => document.getElementById('creator-name-input')?.focus(), 40);
        }

        function closeAICreator() {
            brainState.creatorOpen = false;
            playSound('tick');
            renderBrainLabUI();
        }

        function selectCreatorLogo(logoId) {
            aiCreatorState.logoId = logoId;
            playSound('tick');
            renderBrainLabUI();
        }

        function selectCreatorColor(hex) {
            aiCreatorState.color = hex;
            playSound('tick');
            renderBrainLabUI();
        }

        function selectCreatorPerk(perkId) {
            aiCreatorState.starterPerk = perkId;
            playSound('tick');
            renderBrainLabUI();
        }

        function adjustCreatorTrait(key, delta) {
            const cur = aiCreatorState.traits[key];
            if (delta > 0 && aiCreatorState.pointsLeft < delta) return;
            if (delta < 0 && cur + delta < 10) return;
            if (cur + delta > 60) return;
            aiCreatorState.traits[key] = cur + delta;
            aiCreatorState.pointsLeft -= delta;
            playSound('tick');
            renderBrainLabUI();
        }

        function confirmCreateAI() {
            const inp = document.getElementById('creator-name-input');
            const rawName = (inp ? inp.value : aiCreatorState.name).trim();
            const finalName = rawName || `Blink-KI ${brainState.roster.length + 1}`;

            const newAI = {
                id: 'ai-' + Date.now(),
                name: finalName.slice(0, 18),
                logoId: aiCreatorState.logoId,
                color: aiCreatorState.color,
                matchesTrained: 0,
                elo: 700,
                traits: { ...aiCreatorState.traits },
                perks: [aiCreatorState.starterPerk]
            };
            brainState.roster.push(newAI);
            brainState.activeIdx = brainState.roster.length - 1;
            brainState.creatorOpen = false;
            saveAIRosterState();
            playSound('win');
            renderBrainLabUI();
            showSonnerToast(`„${newAI.name}“ wurde erschaffen (${newAI.elo} Elo)! Starte jetzt ein Scrim.`, 'success');
        }

        function selectTrainedAI(idx) {
            if (idx < 0 || idx >= brainState.roster.length) return;
            brainState.activeIdx = idx;
            brainState.creatorOpen = false;
            brainState.logoPickerOpen = false;
            saveAIRosterState();
            playSound('tick');
            renderBrainLabUI();
            if (typeof updateAIDifficulty === 'function') updateAIDifficulty();
        }

        function toggleProfileLogoPicker() {
            brainState.logoPickerOpen = !brainState.logoPickerOpen;
            playSound('tick');
            renderBrainLabUI();
        }

        function changeActiveAILogo(logoId) {
            const ai = getActiveTrainedAI();
            if (!ai) return;
            ai.logoId = logoId;
            saveAIRosterState();
            playSound('tick');
            renderBrainLabUI();
        }

        function changeActiveAIColor(hex) {
            const ai = getActiveTrainedAI();
            if (!ai) return;
            ai.color = hex;
            saveAIRosterState();
            playSound('tick');
            renderBrainLabUI();
        }

        function renameActiveAI(newName) {
            const ai = getActiveTrainedAI();
            if (!ai) return;
            const clean = (newName || '').trim();
            if (clean) ai.name = clean.slice(0, 18);
            saveAIRosterState();
            renderBrainLabUI();
        }

        function deleteActiveTrainedAI() {
            if (brainState.roster.length === 0) return;
            const target = brainState.roster[brainState.activeIdx];
            if (!target) return;
            if (!confirm(`Möchtest du „${target.name}“ (${target.elo} Elo) wirklich dauerhaft freilassen?`)) {
                return;
            }
            const removed = brainState.roster.splice(brainState.activeIdx, 1)[0];
            brainState.activeIdx = Math.max(0, brainState.activeIdx - 1);
            brainState.logoPickerOpen = false;
            saveAIRosterState();
            playSound('tick');
            renderBrainLabUI();
            showSonnerToast(`„${removed.name}“ wurde freigelassen.`, 'neutral');
        }

        function setBrainRuleMode(mode) {
            if (brainState.ruleMode === mode) return;
            brainState.ruleMode = mode;
            playSound('tick');
            const ai = getActiveTrainedAI();
            if (ai) evaluateAIEloBenchmark(ai);
            renderBrainLabUI();
        }

        function finalizeAITrainingMatch(didPlayerWin = true) {
            const ai = getActiveTrainedAI();
            if (!ai) return;

            const snap = gameState.trainingSnapshot || {
                aiElo: ai.elo,
                playerElo: playerEloState.elo,
                traits: { ...ai.traits },
                perks: [...(ai.perks || [])]
            };

            ai.matchesTrained = (ai.matchesTrained || 0) + 1;
            const newAiElo = evaluateAIEloBenchmark(ai, true);
            saveAIRosterState();
            if (typeof renderEloBadgesInArena === 'function') renderEloBadgesInArena();

            const aiEloDelta = newAiElo - snap.aiElo;
            const pEloDelta = playerEloState.elo - snap.playerElo;
            const fmtDelta = (d) => `${d >= 0 ? '+' : ''}${d}`;
            const deltaCls = (d) => d > 0 ? 'text-emerald-400' : (d < 0 ? 'text-rose-400' : 'text-slate-400');

            const titleEl = document.getElementById('summary-title');
            const subEl = document.getElementById('summary-subtitle');
            const eloGrid = document.getElementById('summary-elo-grid');
            const traitsGrid = document.getElementById('summary-traits-grid');
            const perksBox = document.getElementById('summary-perks-box');
            const perksList = document.getElementById('summary-perks-list');
            const overlay = document.getElementById('ai-training-summary-overlay');

            if (titleEl) titleEl.textContent = didPlayerWin ? `Sieg im Scrim gegen ${ai.name}!` : `${ai.name} hat den Scrim gewonnen!`;
            if (subEl) subEl.textContent = `Scrim #${ai.matchesTrained} abgeschlossen`;

            if (eloGrid) {
                const aiRank = getEloRankInfo(newAiElo);
                const pRank = getEloRankInfo(playerEloState.elo);
                eloGrid.innerHTML = `
                    <div class="rounded-2xl bg-slate-950/85 border border-white/[0.08] p-3.5 text-left space-y-1.5">
                        <div class="flex items-center justify-between gap-1">
                            <span class="text-[10px] uppercase tracking-wider text-slate-500 mono truncate">KI (${ai.name})</span>
                            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9.5px] mono font-bold ${aiRank.cls}">${getEloRankSVG(aiRank.tier, 12)}${aiRank.name}</span>
                        </div>
                        <div class="flex items-baseline gap-2">
                            <span class="text-xl font-extrabold text-white mono">${newAiElo}</span>
                            <span class="text-xs font-bold mono ${deltaCls(aiEloDelta)}">(${fmtDelta(aiEloDelta)})</span>
                        </div>
                        <div class="text-[10px] mono text-slate-500">Vorher: ${snap.aiElo} Elo</div>
                    </div>
                    <div class="rounded-2xl bg-slate-950/85 border border-white/[0.08] p-3.5 text-left space-y-1.5">
                        <div class="flex items-center justify-between gap-1">
                            <span class="text-[10px] uppercase tracking-wider text-slate-500 mono">Deine Elo</span>
                            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9.5px] mono font-bold ${pRank.cls}">${getEloRankSVG(pRank.tier, 12)}${pRank.name}</span>
                        </div>
                        <div class="flex items-baseline gap-2">
                            <span class="text-xl font-extrabold text-cyan-300 mono">${playerEloState.elo}</span>
                            <span class="text-xs font-bold mono ${deltaCls(pEloDelta)}">(${fmtDelta(pEloDelta)})</span>
                        </div>
                        <div class="text-[10px] mono text-slate-500">Vorher: ${snap.playerElo} Elo</div>
                    </div>
                `;
            }

            if (traitsGrid) {
                traitsGrid.innerHTML = AI_TRAIT_META.map(m => {
                    const before = snap.traits[m.key] ?? ai.traits[m.key];
                    const after = ai.traits[m.key];
                    const diff = after - before;
                    return `
                        <div class="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 flex items-center justify-between text-xs">
                            <span class="font-bold text-slate-200">${m.label}</span>
                            <span class="mono font-bold">
                                <span class="text-slate-400">${before} →</span>
                                <span class="text-white">${after}</span>
                                ${diff !== 0 ? `<span class="ml-1 ${deltaCls(diff)}">(${fmtDelta(diff)})</span>` : ''}
                            </span>
                        </div>
                    `;
                }).join('');
            }

            const newPerks = (ai.perks || []).filter(p => !(snap.perks || []).includes(p));
            if (perksBox && perksList) {
                perksBox.classList.toggle('hidden', newPerks.length === 0);
                if (newPerks.length > 0) {
                    perksList.innerHTML = newPerks.map(pid => {
                        const p = AI_PERKS.find(x => x.id === pid);
                        return p ? `<span class="px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-xs font-bold text-amber-200">★ ${p.name}</span>` : '';
                    }).join('');
                }
            }

            if (overlay) overlay.classList.remove('hidden');
        }

        function exitSparringToLab() {
            if (typeof stopGameMusic === 'function') stopGameMusic();
            pauseGameLoops();
            gameState.isRunning = false;
            gameState.isTrainingMatch = false;
            gameState.trainingSnapshot = null;
            document.getElementById('ai-training-pause-overlay')?.classList.add('hidden');
            document.getElementById('ai-training-summary-overlay')?.classList.add('hidden');
            syncGameConfigUI();
            navigateTo('lab');
            setLabSubTab('brain');
            renderBrainLabUI();
        }

        function startAITrainingMatch() {
            const ai = getActiveTrainedAI();
            if (!ai) { openAICreator(); return; }
            gameState.isTrainingMatch = true;
            const modeSel = document.getElementById('select-game-mode');
            const ruleSel = document.getElementById('select-rule-mode');
            if (modeSel) modeSel.value = 'trained-ai';
            if (ruleSel) ruleSel.value = brainState.ruleMode;

            openGameTab('arena');
            setTimeout(() => {
                startNewBlinkGame();
                showSonnerToast(`Scrim mit ${ai.name} gestartet — achte auf die Lern-Pausen!`, 'success');
            }, 80);
        }

       

        function runAIvsAIShowmatch() {
            if (brainState.roster.length < 2) {
                showSonnerToast('Erstelle mindestens 2 KIs (+ Erstellen), um sie gegeneinander antreten zu lassen!', 'warn');
                return;
            }
            const aiA = getActiveTrainedAI();
            const aiB = brainState.roster[(brainState.activeIdx + 1) % brainState.roster.length];
            let winsA = 0;
            for (let i = 0; i < 15; i++) if (simulateRealtimeBlinkDuel(aiA, aiB, brainState.ruleMode)) winsA++;
            playSound(winsA >= 8 ? 'win' : 'flip');
            showSonnerToast(`KI-Showmatch (15 Partien): ${aiA.name} (${aiA.elo}) ${winsA} : ${15 - winsA} ${aiB.name} (${aiB.elo})`, 'success');
        }

        function getAILogoSVG(logoId, colorHex = '#22d3ee', size = 44) {
            const logo = AI_LOGOS.find(l => l.id === logoId) || AI_LOGOS[0];
            return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" class="block">${logo.svg(colorHex)}</svg>`;
        }

        function getAIDominantColor(ai) {
            if (ai && ai.color) return ai.color;
            const dom = AI_TRAIT_META.reduce((b, c) => ai.traits[c.key] > ai.traits[b.key] ? c : b, AI_TRAIT_META[0]);
            return dom.color;
        }

        

        function renderBrainLabUI() {
            const ai = getActiveTrainedAI();

            const pEloEl = document.getElementById('lab-player-elo-val');
            const pRecEl = document.getElementById('lab-player-record');
            const pRankEl = document.getElementById('lab-player-rank-pill');
            const pOddsEl = document.getElementById('lab-player-odds');
            if (pEloEl) pEloEl.textContent = String(playerEloState.elo);
            if (pRecEl) pRecEl.textContent = `${playerEloState.wins} Siege · ${playerEloState.losses} Niederlagen`;
            if (pRankEl) {
                const r = getEloRankInfo(playerEloState.elo);
                pRankEl.innerHTML = `${getEloRankSVG(r.tier, 14)}<span>${r.name}</span>`;
                pRankEl.className = `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] mono font-bold border ${r.cls}`;
            }
            if (pOddsEl) {
                if (ai) {
                    const pct = Math.round(calcExpectedWinProb(playerEloState.elo, ai.elo) * 100);
                    pOddsEl.textContent = `${pct} % Siegchance`;
                    pOddsEl.className = `text-sm font-extrabold mono mt-0.5 ${pct >= 50 ? 'text-emerald-400' : 'text-rose-400'}`;
                } else {
                    pOddsEl.textContent = 'Keine KI aktiv';
                    pOddsEl.className = 'text-xs mono text-slate-500 mt-1';
                }
            }

            const rosterEl = document.getElementById('ai-roster-grid');
            if (rosterEl) {
                let html = brainState.roster.map((item, idx) => {
                    const active = !brainState.creatorOpen && idx === brainState.activeIdx;
                    return `
                        <button onclick="selectTrainedAI(${idx})" class="text-left p-2.5 rounded-2xl border transition flex items-center gap-2.5 ${active ? 'border-cyan-400/70 bg-cyan-500/10' : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06]'}">
                            <div class="shrink-0">${getAILogoSVG(item.logoId, getAIDominantColor(item), 30)}</div>
                            <div class="min-w-0 flex-1">
                                <div class="text-xs font-bold text-white truncate">${item.name}</div>
                                <div class="text-[10px] mono text-slate-400"><span class="text-emerald-400 font-bold">${item.elo}</span> · ${getEloRankInfo(item.elo).name}</div>
                            </div>
                        </button>
                    `;
                }).join('');
                for (let k = brainState.roster.length; k < 4; k++) {
                    html += `
                        <button onclick="openAICreator()" class="p-2.5 rounded-2xl border border-dashed border-white/10 hover:border-cyan-400/40 bg-white/[0.01] text-slate-500 hover:text-cyan-300 text-[11px] mono flex items-center justify-center transition">
                            + Slot ${k + 1}
                        </button>
                    `;
                }
                rosterEl.innerHTML = html;
            }

            ['normal', 'cluster'].forEach(m => {
                const b = document.getElementById(`brain-rule-${m}`);
                if (!b) return;
                b.className = m === brainState.ruleMode
                    ? 'py-2 px-3 rounded-2xl text-xs font-bold bg-white text-slate-950 transition'
                    : 'py-2 px-3 rounded-2xl text-xs font-semibold border border-white/10 bg-white/[0.03] text-slate-300 hover:text-white transition';
            });

            const sideActions = document.getElementById('ai-sidebar-actions');
            if (sideActions) sideActions.classList.toggle('hidden', !ai || brainState.creatorOpen);

            const emptyPanel = document.getElementById('ai-empty-state');
            const creatorPanel = document.getElementById('ai-creator-panel');
            const profilePanel = document.getElementById('ai-profile-panel');

            if (emptyPanel) emptyPanel.classList.toggle('hidden', Boolean(ai) || brainState.creatorOpen);
            if (creatorPanel) creatorPanel.classList.toggle('hidden', !brainState.creatorOpen);
            if (profilePanel) profilePanel.classList.toggle('hidden', !ai || brainState.creatorOpen);

            if (brainState.creatorOpen) {
                const cColors = document.getElementById('creator-color-grid');
                if (cColors) {
                    cColors.innerHTML = AI_COLORS.map(hex => `
                        <button type="button" onclick="selectCreatorColor('${hex}')" class="w-6 h-6 rounded-full border-2 transition ${aiCreatorState.color === hex ? 'border-white scale-110 shadow' : 'border-white/20 hover:scale-105'}" style="background:${hex}"></button>
                    `).join('') + `
                        <label title="Eigene Farbe wählen" class="w-6 h-6 rounded-full border border-dashed border-white/40 flex items-center justify-center text-[10px] text-slate-300 cursor-pointer hover:border-cyan-400 overflow-hidden relative">
                            <span>+</span>
                            <input type="color" value="${aiCreatorState.color}" onchange="selectCreatorColor(this.value)" class="opacity-0 absolute inset-0 cursor-pointer">
                        </label>
                    `;
                }
                const cLogos = document.getElementById('creator-logo-grid');
                if (cLogos) {
                    cLogos.innerHTML = AI_LOGOS.map(l => `
                        <button type="button" onclick="selectCreatorLogo('${l.id}')" title="${l.name}" class="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${aiCreatorState.logoId === l.id ? 'border-cyan-400 bg-cyan-500/15 scale-[1.03]' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.06]'}">
                            ${getAILogoSVG(l.id, aiCreatorState.color, 34)}
                            <span class="text-[9px] mono text-slate-400 truncate max-w-full">${l.name}</span>
                        </button>
                    `).join('');
                }
                const ptsBadge = document.getElementById('creator-points-badge');
                if (ptsBadge) ptsBadge.textContent = `${aiCreatorState.pointsLeft} Punkte übrig`;

                const alloc = document.getElementById('creator-traits-allocator');
                if (alloc) {
                    alloc.innerHTML = AI_TRAIT_META.map(m => `
                        <div class="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3 flex items-center justify-between gap-2">
                            <div class="min-w-0">
                                <div class="text-xs font-bold text-white">${m.label}</div>
                                <div class="text-[10px] text-slate-500 truncate">${m.sub}</div>
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0">
                                <button onclick="adjustCreatorTrait('${m.key}', -5)" class="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] text-white font-bold text-xs">−</button>
                                <span class="w-7 text-center mono text-xs font-extrabold text-white">${aiCreatorState.traits[m.key]}</span>
                                <button onclick="adjustCreatorTrait('${m.key}', 5)" class="w-7 h-7 rounded-lg bg-cyan-400/20 hover:bg-cyan-400 hover:text-slate-950 text-cyan-300 font-bold text-xs">+</button>
                            </div>
                        </div>
                    `).join('');
                }

                const sPerks = document.getElementById('creator-starter-perks');
                if (sPerks) {
                    sPerks.innerHTML = AI_PERKS.slice(0, 3).map(p => `
                        <button onclick="selectCreatorPerk('${p.id}')" class="text-left p-3 rounded-xl border transition space-y-1 ${aiCreatorState.starterPerk === p.id ? 'border-cyan-400 bg-cyan-500/15' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.06]'}">
                            <div class="text-xs font-bold text-white">${p.name}</div>
                            <div class="text-[10.5px] text-slate-400 leading-snug">${p.desc}</div>
                        </button>
                    `).join('');
                }
                return;
            }

            if (!ai) return;

            const domCol = getAIDominantColor(ai);
            const avatarBox = document.getElementById('ai-avatar-box');
            const nameInp = document.getElementById('ai-name-input');
            const eloEl = document.getElementById('ai-elo-val');
            const rankEl = document.getElementById('ai-rank-pill');
            const mTrained = document.getElementById('ai-matches-trained');

            if (avatarBox) avatarBox.innerHTML = getAILogoSVG(ai.logoId, domCol, 60);
            if (nameInp && document.activeElement !== nameInp) nameInp.value = ai.name;
            if (eloEl) eloEl.textContent = String(ai.elo);
            if (mTrained) mTrained.textContent = `${ai.matchesTrained || 0} Scrim-Partien`;
            if (rankEl) {
                const r = getEloRankInfo(ai.elo);
                rankEl.innerHTML = `${getEloRankSVG(r.tier, 14)}<span>${r.name}</span>`;
                rankEl.className = `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] mono font-bold border ${r.cls}`;
            }

            const logoPicker = document.getElementById('ai-profile-logo-picker');
            const pLogoGrid = document.getElementById('profile-logo-grid');
            const pColorGrid = document.getElementById('profile-color-grid');
            if (logoPicker && pLogoGrid) {
                logoPicker.classList.toggle('hidden', !brainState.logoPickerOpen);
                if (brainState.logoPickerOpen) {
                    if (pColorGrid) {
                        pColorGrid.innerHTML = AI_COLORS.map(hex => `
                            <button type="button" onclick="changeActiveAIColor('${hex}')" class="w-6 h-6 rounded-full border-2 transition ${domCol === hex ? 'border-white scale-110 shadow' : 'border-white/20 hover:scale-105'}" style="background:${hex}"></button>
                        `).join('') + `
                            <label title="Eigene Farbe wählen" class="w-6 h-6 rounded-full border border-dashed border-white/40 flex items-center justify-center text-[10px] text-slate-300 cursor-pointer hover:border-cyan-400 overflow-hidden relative">
                                <span>+</span>
                                <input type="color" value="${domCol}" onchange="changeActiveAIColor(this.value)" class="opacity-0 absolute inset-0 cursor-pointer">
                            </label>
                        `;
                    }
                    pLogoGrid.innerHTML = AI_LOGOS.map(l => `
                        <button type="button" onclick="changeActiveAILogo('${l.id}')" title="${l.name}" class="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${ai.logoId === l.id ? 'border-cyan-400 bg-cyan-500/15' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.08]'}">
                            ${getAILogoSVG(l.id, domCol, 34)}
                            <span class="text-[9px] mono text-slate-400 truncate max-w-full">${l.name}</span>
                        </button>
                    `).join('');
                }
            }

            const radarSvg = document.getElementById('ai-radar-svg');
            if (radarSvg) {
                const cx = 120, cy = 100, maxR = 64;
                const angles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
                let html = '';
                [0.33, 0.66, 1.0].forEach(scale => {
                    const r = maxR * scale;
                    const pts = angles.map(a => `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`).join(' ');
                    html += `<polygon points="${pts}" fill="none" stroke="rgba(148,163,184,0.18)" stroke-width="1"/>`;
                });
                angles.forEach(a => {
                    html += `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(a) * maxR).toFixed(1)}" y2="${(cy + Math.sin(a) * maxR).toFixed(1)}" stroke="rgba(148,163,184,0.22)" stroke-width="1"/>`;
                });
                const valPts = AI_TRAIT_META.map((m, i) => {
                    const r = (Math.max(8, ai.traits[m.key]) / 100) * maxR;
                    return { x: cx + Math.cos(angles[i]) * r, y: cy + Math.sin(angles[i]) * r, m };
                });
                html += `<polygon points="${valPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" fill="rgba(34,211,238,0.22)" stroke="#22d3ee" stroke-width="2.2"/>`;
                valPts.forEach(p => html += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${p.m.color}" stroke="#0f172a" stroke-width="1.5"/>`);
                html += `<text x="${cx}" y="20" text-anchor="middle" fill="#facc15" font-size="10" font-weight="bold" class="mono">Reflex</text>`;
                html += `<text x="${cx + maxR + 10}" y="${cy + 3}" text-anchor="start" fill="#22d3ee" font-size="10" font-weight="bold" class="mono">Kombo</text>`;
                html += `<text x="${cx}" y="${cy + maxR + 18}" text-anchor="middle" fill="#fb7185" font-size="10" font-weight="bold" class="mono">Sabotage</text>`;
                html += `<text x="${cx - maxR - 8}" y="${cy + 3}" text-anchor="end" fill="#34d399" font-size="10" font-weight="bold" class="mono">Stabilität</text>`;
                radarSvg.innerHTML = html;
            }

            const barsEl = document.getElementById('ai-traits-bars');
            if (barsEl) {
                barsEl.innerHTML = AI_TRAIT_META.map(m => `
                    <div class="space-y-1">
                        <div class="flex items-center justify-between text-[11px]">
                            <span class="font-bold text-slate-200">${m.label} <span class="text-slate-500 font-normal">· ${m.sub}</span></span>
                            <span class="mono font-bold text-white">${ai.traits[m.key]}</span>
                        </div>
                        <div class="w-full h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                                <div class="h-full rounded-full ${m.bar} transition-all duration-300" style="width:${ai.traits[m.key]}%"></div>
                            </div>
                    </div>
                `).join('');
            }

            const perksEl = document.getElementById('ai-active-perks');
            if (perksEl) {
                perksEl.innerHTML = ai.perks.map(pid => {
                    const p = AI_PERKS.find(x => x.id === pid);
                    return p ? `<span title="${p.desc}" class="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/35 text-[10.5px] font-bold text-amber-200">${p.name}</span>` : '';
                }).join('');
            }

            
        }
        function nCr(n, r) {
            if (r < 0 || r > n) return 0;
            let num = 1, den = 1;
            for (let i = 1; i <= r; i++) {
                num *= (n - i + 1);
                den *= i;
            }
            return num / den;
        }

        function getPhaseDeckConfig(deckKey) {
            if (deckKey === 'hyper25') {
                return {
                    n: 25, totalClusters: 120, strictClusters: 20, capSetMax: 20,
                    minM: 5, maxM: 21, thresholdM: 11,
                    color: '#a855f7', label: 'Perfektes Hyper-Cluster (25 Karten · 120 Cluster)'
                };
            }
            return {
                n: 125, totalClusters: 14400, strictClusters: 400, capSetMax: 100,
                minM: 5, maxM: 30, thresholdM: 21,
                color: '#22d3ee', label: 'Vollraum F₅³ (125 Karten · 14.400 Cluster)'
            };
        }

        function getPhaseStats(deckKey, m) {
            const cfg = getPhaseDeckConfig(deckKey);
            const denom = nCr(cfg.n, 5);
            const expected = cfg.totalClusters * (nCr(m, 5) / denom);
            const expectedStrict = cfg.strictClusters * (nCr(m, 5) / denom);
            const probApprox = (m > cfg.capSetMax) ? 100 : Math.min(99.9, (1 - Math.exp(-expected)) * 100);
            return { expected, expectedStrict, probApprox, cfg };
        }

        function setPhaseM(val) {
            phaseState.m = Math.max(5, Math.min(25, parseInt(val, 10) || 13));
            phaseState.liveSample = null;
            const slider = document.getElementById('phase-m-slider');
            if (slider) slider.value = phaseState.m;
            renderPhaseCurveUI();
        }

        function setPhaseMetric(metric) {
            phaseState.metric = metric;
            playSound('tick');
            renderPhaseCurveUI();
        }

        function runPhaseLiveSample() {
            playSound('play');
            const hyperDeck = [];
            for (let s = 0; s < 5; s++) {
                for (let t = 0; t < 5; t++) {
                    hyperDeck.push([(s + 2 * t) % 5, (2 * s + t) % 5, (3 * s + t) % 5]);
                }
            }

            const trials = 400;
            let hitsHyper = 0;
            let hitsFull = 0;
            for (let i = 0; i < trials; i++) {
                if (findClusterInCardsFast(sampleDistinctCards(hyperDeck, phaseState.m), false).hasAny) hitsHyper++;
                if (findClusterInCardsFast(sampleDistinctCards(CARDS_125, phaseState.m), false).hasAny) hitsFull++;
            }
            phaseState.liveSample = {
                hyper25: (hitsHyper / trials) * 100,
                full125: (hitsFull / trials) * 100
            };
            renderPhaseCurveUI();
        }

        function renderPhaseCurveUI() {
            const mCur = phaseState.m;
            const isProb = phaseState.metric === 'prob';
            const stHyper = getPhaseStats('hyper25', mCur);
            const stFull = getPhaseStats('full125', mCur);

            ['prob', 'expected'].forEach(met => {
                const b = document.getElementById(`phase-met-${met}`);
                if (!b) return;
                b.className = met === phaseState.metric
                    ? 'py-2 rounded-full text-xs font-bold bg-white text-slate-950 transition'
                    : 'py-2 rounded-full text-xs font-semibold border border-white/10 bg-white/[0.03] text-slate-300 hover:text-white transition';
            });

            const mBadge = document.getElementById('phase-m-badge');
            const slider = document.getElementById('phase-m-slider');
            const capEl = document.getElementById('phase-svg-caption');
            if (mBadge) mBadge.textContent = `m = ${mCur}`;
            if (slider) slider.value = mCur;
            if (capEl) capEl.textContent = isProb
                ? 'Treffer-Wahrscheinlichkeit P(X_m ≥ 1) in % — Hyper-Cluster vs. Vollraum'
                : 'Erwartete Cluster-Anzahl E[X_m] — Hyper-Cluster vs. Vollraum (36,8× dichter)';

            const kpiGrid = document.getElementById('phase-kpi-grid');
            if (kpiGrid) {
                const fmtExp = (v) => v < 0.1 ? v.toFixed(4) : v.toFixed(2);
                const fmtProb = (v) => v >= 100 ? '100 %' : `${v.toFixed(v < 1 ? 2 : 1)} %`;
                const liveH = phaseState.liveSample ? ` · Live: ${phaseState.liveSample.hyper25.toFixed(1)} %` : '';
                const liveF = phaseState.liveSample ? ` · Live: ${phaseState.liveSample.full125.toFixed(1)} %` : '';

                kpiGrid.innerHTML = `
                    <div class="rounded-2xl bg-slate-950/75 border border-purple-400/35 p-4 space-y-1">
                        <div class="flex items-center justify-between gap-2">
                            <span class="inline-flex items-center gap-1.5 text-[11px] font-bold text-purple-300 mono uppercase tracking-wider">
                                <span class="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                                Hyper-Cluster (25 Karten)
                            </span>
                            <span class="text-[10px] mono text-slate-500">120 Cluster</span>
                        </div>
                        <div class="text-3xl font-extrabold mono text-white pt-0.5">
                            ${isProb ? fmtProb(stHyper.probApprox) : fmtExp(stHyper.expected)}
                        </div>
                        <div class="text-[11px] mono text-purple-200">
                            ${isProb ? `Erwartung E[X_${mCur}] = ${fmtExp(stHyper.expected)}${liveH}` : `Chance P(X_${mCur} ≥ 1) ≈ ${fmtProb(stHyper.probApprox)}${liveH}`}
                        </div>
                        <div class="text-[10px] text-slate-500">Schwelle E ≥ 1 bei m = 11 · ab m = 21 garantiert (100 %)</div>
                    </div>
                    <div class="rounded-2xl bg-slate-950/75 border border-cyan-400/30 p-4 space-y-1">
                        <div class="flex items-center justify-between gap-2">
                            <span class="inline-flex items-center gap-1.5 text-[11px] font-bold text-cyan-300 mono uppercase tracking-wider">
                                <span class="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                                Vollraum (125 Karten)
                            </span>
                            <span class="text-[10px] mono text-slate-500">14.400 Cluster</span>
                        </div>
                        <div class="text-3xl font-extrabold mono text-white pt-0.5">
                            ${isProb ? fmtProb(stFull.probApprox) : fmtExp(stFull.expected)}
                        </div>
                        <div class="text-[11px] mono text-cyan-200">
                            ${isProb ? `Erwartung E[X_${mCur}] = ${fmtExp(stFull.expected)}${liveF}` : `Chance P(X_${mCur} ≥ 1) ≈ ${fmtProb(stFull.probApprox)}${liveF}`}
                        </div>
                        <div class="text-[10px] text-slate-500">Schwelle E ≥ 1 erst bei m = 21 · ab m = 101 garantiert</div>
                    </div>
                `;
            }

            const svg = document.getElementById('phase-curve-svg');
            if (!svg) return;
            const W = 640, H = 270, padL = 50, padR = 18, padT = 22, padB = 40;
            const plotW = W - padL - padR;
            const plotH = H - padT - padB;
            const minM = 5, maxM = 25;

            const ptsHyper = [];
            const ptsFull = [];
            for (let m = minM; m <= maxM; m++) {
                const sh = getPhaseStats('hyper25', m);
                const sf = getPhaseStats('full125', m);
                ptsHyper.push({ m, val: isProb ? sh.probApprox : sh.expected });
                ptsFull.push({ m, val: isProb ? sf.probApprox : sf.expected });
            }

            const maxY = isProb ? 100 : Math.ceil(ptsHyper[ptsHyper.length - 1].val / 20) * 20;
            const xOf = (m) => padL + ((m - minM) / (maxM - minM)) * plotW;
            const yOf = (v) => padT + plotH - (Math.min(v, maxY) / maxY) * plotH;

            let html = '';

            // Achsen-Beschriftungen
            html += `<text x="${padL}" y="12" fill="#94a3b8" font-size="9" class="mono">${isProb ? 'Chance P(X ≥ 1) in %' : 'Erwartete Cluster E[X_m]'}</text>`;
            html += `<text x="${padL + plotW / 2}" y="${H - 5}" text-anchor="middle" fill="#64748b" font-size="9" class="mono">Offene Karten (m)</text>`;

            // Horizontale Hilfslinien & Y-Achse
            const ticksY = isProb ? [0, 25, 50, 75, 100] : [0, maxY * 0.25, maxY * 0.5, maxY * 0.75, maxY];
            ticksY.forEach(ty => {
                const yy = yOf(ty);
                html += `<line x1="${padL}" y1="${yy.toFixed(1)}" x2="${W - padR}" y2="${yy.toFixed(1)}" stroke="rgba(148,163,184,0.14)" stroke-width="1"/>`;
                html += `<text x="${padL - 8}" y="${(yy + 3).toFixed(1)}" text-anchor="end" fill="#64748b" font-size="9.5" class="mono">${isProb ? `${Math.round(ty)}%` : Math.round(ty)}</text>`;
            });

            // Schwellenlinie (50 % bzw. E[X] = 1)
            const threshYVal = isProb ? 50 : 1;
            const threshY = yOf(threshYVal);
            html += `<line x1="${padL}" y1="${threshY.toFixed(1)}" x2="${W - padR}" y2="${threshY.toFixed(1)}" stroke="#34d399" stroke-width="1.3" stroke-dasharray="5,4" opacity="0.75"/>`;
            html += `<text x="${W - padR - 4}" y="${(threshY - 5).toFixed(1)}" text-anchor="end" fill="#34d399" font-size="9" font-weight="bold" class="mono">${isProb ? '50 %-Schwelle' : 'E[X] = 1'}</text>`;

            // Beide Kurven + sanfte Flächenfüllung
            const drawCurve = (pts, color, opacity) => {
                const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.m).toFixed(1)} ${yOf(p.val).toFixed(1)}`).join(' ');
                const areaD = `${pathD} L ${xOf(maxM).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${xOf(minM).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;
                html += `<path d="${areaD}" fill="${color}" opacity="${opacity}"/>`;
                html += `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`;
            };
            drawCurve(ptsHyper, '#a855f7', 0.13);
            drawCurve(ptsFull, '#22d3ee', 0.11);

            // Vertikale Linie beim aktiven m
            const ax = xOf(mCur);
            html += `<line x1="${ax.toFixed(1)}" y1="${padT}" x2="${ax.toFixed(1)}" y2="${padT + plotH}" stroke="#e2e8f0" stroke-width="1.2" stroke-dasharray="3,3" opacity="0.65"/>`;

            // Klickbare Spalten + Punkte + X-Labels
            const colW = plotW / (maxM - minM);
            for (let i = 0; i < ptsHyper.length; i++) {
                const ph = ptsHyper[i];
                const pf = ptsFull[i];
                const px = xOf(ph.m);
                const isSel = ph.m === mCur;

                if (ph.m % 5 === 0 || ph.m === 11 || ph.m === 21 || isSel) {
                    html += `<text x="${px.toFixed(1)}" y="${padT + plotH + 15}" text-anchor="middle" fill="${isSel ? '#ffffff' : '#64748b'}" font-size="9.5" font-weight="${isSel ? 'bold' : 'normal'}" class="mono">${ph.m}</text>`;
                }

                // Unsichtbare Klick-Spalte für bequemes Anklicken von m
                html += `<rect x="${(px - colW / 2).toFixed(1)}" y="${padT}" width="${colW.toFixed(1)}" height="${plotH}" fill="transparent" class="cursor-pointer" onclick="setPhaseM(${ph.m})"><title>m = ${ph.m} · Hyper-Cluster: ${ph.val.toFixed(1)}${isProb ? '%' : ''} · Vollraum: ${pf.val.toFixed(1)}${isProb ? '%' : ''}</title></rect>`;

                html += `<circle cx="${px.toFixed(1)}" cy="${yOf(ph.val).toFixed(1)}" r="${isSel ? 5.2 : 2.6}" fill="${isSel ? '#ffffff' : '#a855f7'}" stroke="#a855f7" stroke-width="${isSel ? 2.4 : 1}" pointer-events="none"/>`;
                html += `<circle cx="${px.toFixed(1)}" cy="${yOf(pf.val).toFixed(1)}" r="${isSel ? 5.2 : 2.6}" fill="${isSel ? '#ffffff' : '#22d3ee'}" stroke="#22d3ee" stroke-width="${isSel ? 2.4 : 1}" pointer-events="none"/>`;
            }

            // Optional: Live-Stichproben-Marker auf der vertikalen m-Linie (bei Chance %)
            if (isProb && phaseState.liveSample) {
                const yh = yOf(phaseState.liveSample.hyper25);
                const yf = yOf(phaseState.liveSample.full125);
                html += `<rect x="${(ax - 4).toFixed(1)}" y="${(yh - 4).toFixed(1)}" width="8" height="8" transform="rotate(45 ${ax.toFixed(1)} ${yh.toFixed(1)})" fill="#facc15" stroke="#0f172a" stroke-width="1.2" pointer-events="none"/>`;
                html += `<rect x="${(ax - 4).toFixed(1)}" y="${(yf - 4).toFixed(1)}" width="8" height="8" transform="rotate(45 ${ax.toFixed(1)} ${yf.toFixed(1)})" fill="#facc15" stroke="#0f172a" stroke-width="1.2" pointer-events="none"/>`;
            }

            svg.innerHTML = html;

            const legEl = document.getElementById('phase-curve-legend');
            if (legEl) {
                const liveLeg = (isProb && phaseState.liveSample)
                    ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.02] border border-white/[0.06] text-amber-300"><span class="w-2 h-2 rotate-45 bg-amber-400 shrink-0"></span><span>Live-Stichprobe (400×)</span></span>`
                    : '';
                legEl.innerHTML = `
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-purple-400/25">
                        <span class="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0"></span>
                        <span class="text-slate-300">Hyper-Cluster (25 Karten)</span>
                    </span>
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-cyan-400/25">
                        <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0"></span>
                        <span class="text-slate-300">Vollraum (125 Karten)</span>
                    </span>
                    ${liveLeg}
                `;
            }
        }
        function openGameTab(tabName) {
            navigateTo('game');
            setGameSubTab(tabName);
        }

        function syncActiveGameModeMusic() {
            if (typeof startGameMusic !== 'function' || typeof stopGameMusic !== 'function') return;
            if (state.currentPage !== 'game') { stopGameMusic(); return; }
            const t = labState.activeGameTab;
            if (t === 'arena' && gameState.isRunning) startGameMusic('arena');
            else if (t === 'verhoer' && vhState.isRunning) startGameMusic('verhoer');
            else if (t === 'daily' && dailyState.solutions.length > 0 && dailyState.foundKeys.size < dailyState.solutions.length) startGameMusic('daily');
            else if (t === 'sudoku' && !sudokuState.solved) startGameMusic('sudoku');
            else if (t === 'endgame' && endgameState.status === 'playing') startGameMusic('endgame');
            else if (t === 'cascade' && !cascadeState.gameOver) startGameMusic('cascade');
            else stopGameMusic();
        }

        function setGameSubTab(tabName) {
            if (labState.activeGameTab !== tabName) playSound('tick');
            labState.activeGameTab = tabName;
            ['arena', 'verhoer', 'daily', 'sudoku', 'endgame', 'cascade'].forEach(t => {
                const btn = document.getElementById(`game-tab-${t}`);
                const view = document.getElementById(`game-view-${t}`);
                if (btn) btn.className = `relative z-10 px-3.5 py-1 rounded-full text-xs transition-colors ${t === tabName ? 'pill-btn-active' : 'pill-btn-idle'}`;
                if (view) view.classList.toggle('hidden', t !== tabName);
            });
            moveSlidingPill('game-mode-tabs', `game-tab-${tabName}`);
            if (typeof syncUrlHash === 'function') syncUrlHash();
            if (tabName === 'verhoer') renderVerhoerStandaloneUI();
            syncActiveGameModeMusic();
            safeRenderMathJax();
        }

        // ============================================================================
        // EIGENSTÄNDIGER SPIELMODUS: BLINK – DAS VERHÖR (ÜBERSICHTLICHE UI)
        // ============================================================================
       const vhState = {
            isRunning: false,
            turn: 'player',         // 'player' | 'ai'
            phase: 'draw',          // 'draw' | 'action' | 'interrogation' | 'bonus_discard' | 'ended'
            deck: [],
            discardHistory: [],
            playerHand: [],
            aiHand: [],
            playerTrios: [],
            aiTrios: [],
            selectedIdx: null,
            draggedHandIdx: null,
            sktDraftIndices: [],
            recalledKey: null,
            pendingCard: null,
            pendingIdx: null,
            intType: null,          // 'standard' | 'strict'
            intStep: null,          // 'choose_prop' | 'no_match' | 'decide' | 'blind_pick'
            intNote: '',
            xrayOpen: false,
            aiMemory: { knownPlayerCards: [], lastBotThought: '' },
            logs: [],
            startTime: 0,
            winInfo: null
        };

        function vhTopDiscard() {
            return vhState.discardHistory.length > 0 ? vhState.discardHistory[vhState.discardHistory.length - 1] : null;
        }

        function vhAddLog(html) {
            vhState.logs.unshift(html);
            if (vhState.logs.length > 25) vhState.logs.pop();
        }

        function vhStartNewGame(silent = false) {
            const deck125 = shuffleArray(CARDS_125);
            const firstDiscard = deck125.pop();
            vhState.isRunning = true;
            vhState.turn = 'player';
            vhState.phase = 'draw';
            vhState.discardHistory = [firstDiscard];
            vhState.playerHand = deck125.splice(0, 5);
            vhState.aiHand = deck125.splice(0, 5);
            vhState.deck = deck125;
            vhState.playerTrios = [];
            vhState.aiTrios = [];
            vhState.selectedIdx = null;
            vhState.draggedHandIdx = null;
            vhState.sktDraftIndices = [];
            vhState.recalledKey = null;
            vhState.pendingCard = null;
            vhState.pendingIdx = null;
            vhState.intType = null;
            vhState.intStep = null;
            vhState.aiMemory = { knownPlayerCards: [], lastBotThought: 'Beobachtet deinen ersten Zug.' };
            vhState.logs = [`<span class="text-slate-400">Startkarte auf M₁: (${firstDiscard.join(',')})</span>`];
            vhState.startTime = performance.now();
            vhState.winInfo = null;
            if (!silent) { playSound('flip'); syncActiveGameModeMusic(); }
            renderVerhoerStandaloneUI();
        }

        function vhDrawFromDeck() {
            if (!vhState.isRunning || vhState.turn !== 'player' || vhState.phase !== 'draw') return;
            if (vhState.deck.length === 0) vhState.deck = shuffleArray(CARDS_125);
            const card = vhState.deck.shift();
            vhState.playerHand.push(card);
            vhState.recalledKey = null;
            vhState.selectedIdx = null;
            vhState.phase = 'action';
            playSound('play');
            vhAddLog(`<span class="text-cyan-400 font-bold">Du:</span> Blind vom Stapel gezogen`);
            renderVerhoerStandaloneUI();
        }

        function vhOnDiscardPileClick() {
            if (!vhState.isRunning || vhState.turn !== 'player') return;
            if (vhState.phase === 'draw') {
                if (vhState.discardHistory.length === 0) return;
                const taken = vhState.discardHistory.pop();
                vhState.playerHand.push(taken);
                vhState.recalledKey = keyOf(...taken);
                vhState.selectedIdx = null;
                vhState.phase = 'action';
                if (!vhState.aiMemory.knownPlayerCards.some(c => keyOf(...c) === keyOf(...taken))) {
                    vhState.aiMemory.knownPlayerCards.push([...taken]);
                }
                playSound('flip');
                vhAddLog(`<span class="text-amber-300 font-bold">Du:</span> Rückruf (${taken.join(',')}) von M₁`);
                renderVerhoerStandaloneUI();
                return;
            }
            if ((vhState.phase === 'action' || vhState.phase === 'bonus_discard') && vhState.selectedIdx !== null) {
                vhConfirmSelectedDiscard();
            }
        }

        function vhSelectHandCard(idx) {
            if (!vhState.isRunning || vhState.turn !== 'player') return;
            if (vhState.phase !== 'action' && vhState.phase !== 'bonus_discard') {
                if (vhState.phase === 'draw') showSonnerToast('Schritt 1: Ziehe zuerst eine 6. Karte (Stapel oder M₁)!', 'warn');
                return;
            }
            const card = vhState.playerHand[idx];
            if (!card) return;
            if (vhState.phase === 'action' && vhState.recalledKey && keyOf(...card) === vhState.recalledKey) {
                triggerInvalidShake(`vh-card-${idx}`);
                showSonnerToast('Die gerade von M₁ zurückgerufene Karte darf nicht sofort wieder abgeworfen werden.', 'warn');
                return;
            }
            vhState.selectedIdx = (vhState.selectedIdx === idx) ? null : idx;
            playSound('tick');
            renderVerhoerStandaloneUI();
        }

        function vhConfirmSelectedDiscard(forceIdx = null) {
            const idx = forceIdx !== null ? forceIdx : vhState.selectedIdx;
            if (idx === null || !vhState.isRunning || vhState.turn !== 'player') return;
            if (vhState.phase !== 'action' && vhState.phase !== 'bonus_discard') return;
            const card = vhState.playerHand[idx];
            if (!card) return;

            if (vhState.phase === 'action' && vhState.recalledKey && keyOf(...card) === vhState.recalledKey) {
                triggerInvalidShake(`vh-card-${idx}`);
                return;
            }

            const skipFly = Boolean(window._hapticSkipNextFly);
            window._hapticSkipNextFly = false;

            const commitDiscard = () => {
                const prevTop = vhTopDiscard();
                vhState.playerHand.splice(idx, 1);
                vhState.discardHistory.push(card);
                vhState.selectedIdx = null;
                vhState.sktDraftIndices = [];
                vhState.recalledKey = null;
                playSound('play');

                if (vhState.phase === 'bonus_discard') {
                    vhAddLog(`<span class="text-cyan-400 font-bold">Du:</span> Tausch-Abwurf (${card.join(',')}) → M₁`);
                    vhEndPlayerTurn();
                    return;
                }

                const dH = prevTop ? hammingDistance(card, prevTop) : 3;
                vhAddLog(`<span class="text-cyan-400 font-bold">Du:</span> (${card.join(',')}) → M₁`);

                if (window.BlinkHaptics) {
                    const discEl = document.getElementById('vh-discard-pile');
                    if (dH === 1) window.BlinkHaptics.floatBadge(discEl, '⚡ Verschärftes Verhör!', 'amber');
                    else if (dH === 2) window.BlinkHaptics.floatBadge(discEl, 'Standard-Verhör', 'cyan');
                }

                if (dH === 3) {
                    vhEndPlayerTurn();
                } else if (dH === 2) {
                    vhState.phase = 'interrogation';
                    vhState.intType = 'standard';
                    vhState.intStep = 'choose_prop';
                    renderVerhoerStandaloneUI();
                } else {
                    vhState.phase = 'interrogation';
                    vhState.intType = 'strict';
                    vhState.intStep = 'blind_pick';
                    renderVerhoerStandaloneUI();
                }
            };

            if (!skipFly && window.BlinkHaptics) {
                const cardEl = document.getElementById(`vh-card-${idx}`);
                const discEl = document.getElementById('vh-discard-pile');
                if (cardEl && discEl) {
                    window.BlinkHaptics.flyCard(cardEl, discEl, commitDiscard, { duration: 185, tone: 'amber' });
                    return;
                }
            }

            commitDiscard();
        }
        function vhDemandProperty(dim, val) {
            const dimNames = ['Anzahl', 'Farbe', 'Symbol'];
            const valName = dim === 0 ? `${PALETTE_X[val].count}× (${PALETTE_X[val].word})` : (dim === 1 ? PALETTE_Y[val].name : PALETTE_Z[val].name);
            const matchIdx = vhState.aiHand.findIndex(c => c[dim] === val);
            playSound('tick');

            if (matchIdx === -1) {
                vhState.intStep = 'no_match';
                vhState.intNote = `Der Bot besitzt keine Karte mit ${dimNames[dim]}: ${valName}.`;
                vhAddLog(`<span class="text-amber-300">Verhör:</span> Bot hat kein ${valName}`);
                renderVerhoerStandaloneUI();
                return;
            }
            vhState.pendingIdx = matchIdx;
            vhState.pendingCard = vhState.aiHand[matchIdx];
            vhState.intStep = 'decide';
            vhAddLog(`<span class="text-amber-300">Verhör:</span> Bot zeigt (${vhState.pendingCard.join(',')})`);
            renderVerhoerStandaloneUI();
        }

        function vhBlindPick(idx) {
            if (!vhState.aiHand[idx]) return;
            vhState.pendingIdx = idx;
            vhState.pendingCard = vhState.aiHand[idx];
            vhState.intStep = 'decide';
            playSound('flip');
            renderVerhoerStandaloneUI();
        }

        function vhResolveDecision(takeCard) {
            const idx = vhState.pendingIdx;
            const card = vhState.pendingCard;
            if (idx === null || !card) return;

            vhState.aiHand.splice(idx, 1);
            if (vhState.deck.length === 0) vhState.deck = shuffleArray(CARDS_125);
            vhState.aiHand.push(vhState.deck.shift());
            vhState.pendingIdx = null;
            vhState.pendingCard = null;
            vhState.intStep = null;

            if (takeCard) {
                vhState.playerHand.push(card);
                vhState.phase = 'bonus_discard';
                playSound('play');
                vhAddLog(`<span class="text-emerald-400 font-bold">Du:</span> (${card.join(',')}) übernommen`);
                renderVerhoerStandaloneUI();
            } else {
                vhState.discardHistory.push(card);
                playSound('tick');
                vhAddLog(`<span class="text-rose-400 font-bold">Strafabwurf:</span> Bot wirft (${card.join(',')}) auf M₁`);
                vhEndPlayerTurn();
            }
        }

        function vhCanUseSktDrop() {
            return vhState.isRunning && vhState.turn === 'player' && vhState.phase !== 'interrogation' && vhState.phase !== 'ended';
        }

        function vhOnHandDragStart(event, idx) {
            if (!vhCanUseSktDrop() || !vhState.playerHand[idx]) {
                event.preventDefault();
                return;
            }
            vhState.draggedHandIdx = idx;
            if (event.dataTransfer) {
                event.dataTransfer.setData('text/plain', String(idx));
                event.dataTransfer.effectAllowed = 'move';
            }
            const el = document.getElementById(`vh-card-${idx}`);
            if (el) setTimeout(() => el.classList.add('dragging-card'), 0);
        }

        function vhOnHandDragEnd(event, idx) {
            const el = document.getElementById(`vh-card-${idx}`);
            if (el) el.classList.remove('dragging-card');
            document.getElementById('vh-player-skt-box')?.classList.remove('pile-drag-over');
            document.getElementById('vh-discard-pile')?.classList.remove('pile-drag-over');
        }

        function vhOnDiscardDragOver(event) {
            if (!vhState.isRunning || vhState.turn !== 'player') return;
            if (vhState.phase !== 'action' && vhState.phase !== 'bonus_discard') return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
            document.getElementById('vh-discard-pile')?.classList.add('pile-drag-over');
        }

        function vhOnDiscardDragLeave(event) {
            const pile = document.getElementById('vh-discard-pile');
            if (pile && !pile.contains(event.relatedTarget)) {
                pile.classList.remove('pile-drag-over');
            }
        }

        function vhOnDiscardDrop(event) {
            event.preventDefault();
            document.getElementById('vh-discard-pile')?.classList.remove('pile-drag-over');
            if (!vhState.isRunning || vhState.turn !== 'player') return;

            if (vhState.phase !== 'action' && vhState.phase !== 'bonus_discard') {
                if (vhState.phase === 'draw') {
                    showSonnerToast('Schritt 1: Ziehe zuerst eine 6. Karte (Stapel oder M₁)!', 'warn');
                }
                return;
            }

            let idx = vhState.draggedHandIdx;
            if ((idx === null || idx === undefined) && event.dataTransfer) {
                idx = parseInt(event.dataTransfer.getData('text/plain'), 10);
            }
            vhState.draggedHandIdx = null;
            if (isNaN(idx) || !vhState.playerHand[idx]) return;

            const card = vhState.playerHand[idx];
            if (vhState.phase === 'action' && vhState.recalledKey && keyOf(...card) === vhState.recalledKey) {
                triggerInvalidShake('vh-discard-pile');
                triggerInvalidShake(`vh-card-${idx}`);
                showSonnerToast('Die gerade von M₁ zurückgerufene Karte darf nicht sofort wieder abgeworfen werden.', 'warn');
                return;
            }

            vhConfirmSelectedDiscard(idx);
        }

        function vhOnSktDragOver(event) {
            if (!vhCanUseSktDrop()) return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
            document.getElementById('vh-player-skt-box')?.classList.add('pile-drag-over');
        }

        function vhOnSktDragLeave(event) {
            const box = document.getElementById('vh-player-skt-box');
            if (box && !box.contains(event.relatedTarget)) {
                box.classList.remove('pile-drag-over');
            }
        }

        function vhOnSktDrop(event) {
            event.preventDefault();
            document.getElementById('vh-player-skt-box')?.classList.remove('pile-drag-over');
            if (!vhCanUseSktDrop()) return;

            let idx = vhState.draggedHandIdx;
            if ((idx === null || idx === undefined) && event.dataTransfer) {
                idx = parseInt(event.dataTransfer.getData('text/plain'), 10);
            }
            vhState.draggedHandIdx = null;
            if (isNaN(idx) || !vhState.playerHand[idx]) return;

            vhAddIndexToSktDraft(idx);
        }

        function vhAddSelectedToSktDraft() {
            if (!vhCanUseSktDrop() || vhState.selectedIdx === null) return;
            vhAddIndexToSktDraft(vhState.selectedIdx);
        }

        function vhAddIndexToSktDraft(idx) {
            if (!vhCanUseSktDrop() || !vhState.playerHand[idx]) return;
            if (vhState.sktDraftIndices.includes(idx)) return;
            if (vhState.sktDraftIndices.length >= 3) return;

            vhState.sktDraftIndices.push(idx);
            if (vhState.selectedIdx === idx) vhState.selectedIdx = null;
            playSound('tick');
            renderVerhoerStandaloneUI();

            if (vhState.sktDraftIndices.length === 3) {
                vhValidateSktDraft();
            }
        }

        function vhRemoveFromSktDraft(draftPos) {
            if (!vhCanUseSktDrop()) return;
            vhState.sktDraftIndices.splice(draftPos, 1);
            playSound('tick');
            renderVerhoerStandaloneUI();
        }

        function vhValidateSktDraft() {
            const indices = [...vhState.sktDraftIndices];
            const cards = indices.map(i => vhState.playerHand[i]).filter(Boolean);
            if (cards.length !== 3) {
                vhState.sktDraftIndices = [];
                renderVerhoerStandaloneUI();
                return;
            }

            const [c1, c2, c3] = cards;
            const isValid = areCardsCompletelyDifferent(c1, c2) &&
                            areCardsCompletelyDifferent(c1, c3) &&
                            areCardsCompletelyDifferent(c2, c3);

            if (isValid) {
                const sortedDesc = [...indices].sort((a, b) => b - a);
                const removed = sortedDesc.map(i => vhState.playerHand.splice(i, 1)[0]).reverse();
                vhState.playerTrios.push(removed);
                for (let d = 0; d < 3; d++) {
                    if (vhState.deck.length === 0) vhState.deck = shuffleArray(CARDS_125);
                    vhState.playerHand.push(vhState.deck.shift());
                }
                vhState.sktDraftIndices = [];
                vhState.selectedIdx = null;
                playSound('flip');
 if (window.BlinkHaptics) {
 const box = document.getElementById('vh-player-skt-box');
 window.BlinkHaptics.burst(box, 'purple', 18);
 window.BlinkHaptics.floatBadge(box, 'SKT gemeldet +3', 'purple');
 }
 vhAddLog(`<span class="text-purple-300 font-bold">Du:</span> SKT gemeldet (+3 gezogen)`);
 showSonnerToast('Gültiges SKT gemeldet! (+3 Karten gezogen)', 'success');
 renderVerhoerStandaloneUI();
            } else {
                const reasons = [];
                if (new Set(cards.map(c => c[0])).size < 3) reasons.push('Anzahl');
                if (new Set(cards.map(c => c[1])).size < 3) reasons.push('Farbe');
                if (new Set(cards.map(c => c[2])).size < 3) reasons.push('Symbol');
                triggerInvalidShake('vh-player-skt-box');
                showSonnerToast(`Kein gültiges SKT! Dopplung bei: ${reasons.join(', ')}.`, 'warn');
                setTimeout(() => {
                    vhState.sktDraftIndices = [];
                    renderVerhoerStandaloneUI();
                }, 550);
            }
        }

        function vhCallCluster() {
            if (!vhState.isRunning) return;
            const winCluster = findValidCluster5FromPool(vhState.playerHand, vhState.playerTrios);
            if (!winCluster) {
                showSonnerToast('Noch kein vollständiges 5er-Cluster vorhanden!', 'warn');
                return;
            }
            vhFinishMatch(true, winCluster);
        }

        function vhFinishMatch(didWin, cluster) {
            vhState.isRunning = false;
            vhState.phase = 'ended';
            if (typeof stopGameMusic === 'function') stopGameMusic();
            const elapsed = (performance.now() - vhState.startTime) / 1000;
            if (didWin) {
                saveRecordTime('verhoer', elapsed, formatElapsedTime(elapsed));
                playSound('win');
            } else {
                playSound('error');
            }
            vhState.winInfo = { didWin, cluster };
            renderVerhoerStandaloneUI();
        }

        function vhEndPlayerTurn() {
            vhState.turn = 'ai';
            vhState.phase = 'draw';
            vhState.intStep = null;
            vhState.sktDraftIndices = [];
            renderVerhoerStandaloneUI();
            setTimeout(() => vhExecuteBotTurn(), 900);
        }

        function vhExecuteBotTurn() {
            if (!vhState.isRunning || vhState.turn !== 'ai') return;
            const actualKeys = new Set(vhState.playerHand.map(c => keyOf(...c)));
            vhState.aiMemory.knownPlayerCards = vhState.aiMemory.knownPlayerCards.filter(c => actualKeys.has(keyOf(...c)));

            const top = vhTopDiscard();
            const curScore = getMaxClusterSubsetSize(vhState.aiHand, vhState.aiTrios);
            let recalledKey = null;
            if (top && getMaxClusterSubsetSize([...vhState.aiHand, top], vhState.aiTrios) > curScore) {
                const taken = vhState.discardHistory.pop();
                vhState.aiHand.push(taken);
                recalledKey = keyOf(...taken);
                vhState.aiMemory.lastBotThought = `Nahm (${taken.join(',')}) von M₁ für seinen Cluster-Kern.`;
                vhAddLog(`<span class="text-rose-400 font-bold">Bot:</span> Rückruf (${taken.join(',')}) von M₁`);
            } else {
                if (vhState.deck.length === 0) vhState.deck = shuffleArray(CARDS_125);
                vhState.aiHand.push(vhState.deck.shift());
            }

            const aiTrio = findValidTrioIndices(vhState.aiHand);
            if (aiTrio) {
                const [i, j, k] = aiTrio;
                const c3 = vhState.aiHand.splice(k, 1)[0];
                const c2 = vhState.aiHand.splice(j, 1)[0];
                const c1 = vhState.aiHand.splice(i, 1)[0];
                vhState.aiTrios.push([c1, c2, c3]);
                for (let d = 0; d < 3; d++) {
                    if (vhState.deck.length === 0) vhState.deck = shuffleArray(CARDS_125);
                    vhState.aiHand.push(vhState.deck.shift());
                }
                vhAddLog(`<span class="text-rose-400 font-bold">Bot:</span> SKT offen ausgelegt`);
            }

            const botWin = findValidCluster5FromPool(vhState.aiHand, vhState.aiTrios);
            if (botWin) {
                vhAddLog(`<span class="text-rose-400 font-bold">Bot ruft Cluster!</span>`);
                vhFinishMatch(false, botWin);
                return;
            }

            const prevTop = vhTopDiscard();
            let bestIdx = vhState.aiHand.length - 1, bestVal = -999;
            vhState.aiHand.forEach((cand, idx) => {
                if (recalledKey && keyOf(...cand) === recalledKey) return;
                const rem = vhState.aiHand.filter((_, i) => i !== idx);
                const dH = prevTop ? hammingDistance(cand, prevTop) : 3;
                const val = getMaxClusterSubsetSize(rem, vhState.aiTrios) * 3 + (dH === 1 ? 1.4 : (dH === 2 ? 0.9 : 0));
                if (val > bestVal) { bestVal = val; bestIdx = idx; }
            });

            const disc = vhState.aiHand.splice(bestIdx, 1)[0];
            vhState.discardHistory.push(disc);
            const dH = prevTop ? hammingDistance(disc, prevTop) : 3;
            vhAddLog(`<span class="text-rose-400 font-bold">Bot:</span> (${disc.join(',')}) → M₁`);

            if (dH <= 2 && vhState.playerHand.length > 0) {
                let tIdx = -1;
                if (vhState.aiMemory.knownPlayerCards.length > 0) {
                    const k = keyOf(...vhState.aiMemory.knownPlayerCards[0]);
                    tIdx = vhState.playerHand.findIndex(c => keyOf(...c) === k);
                }
                if (tIdx === -1) tIdx = Math.floor(Math.random() * vhState.playerHand.length);
                const forced = vhState.playerHand.splice(tIdx, 1)[0];
                vhState.discardHistory.push(forced);
                if (vhState.deck.length === 0) vhState.deck = shuffleArray(CARDS_125);
                vhState.playerHand.push(vhState.deck.shift());
                vhState.aiMemory.lastBotThought = `Löst Verhör aus und zwingt deine (${forced.join(',')}) auf M₁.`;
                vhAddLog(`<span class="text-rose-400 font-bold">Bot-Verhör:</span> Deine (${forced.join(',')}) → M₁`);
            } else {
                vhState.aiMemory.lastBotThought = `Warf (${disc.join(',')}) still ab, um seinen Kern zu schützen.`;
            }

            vhState.turn = 'player';
            vhState.phase = 'draw';
            renderVerhoerStandaloneUI();
        }

        function vhToggleXRay() {
            vhState.xrayOpen = !vhState.xrayOpen;
            playSound('tick');
            renderVerhoerStandaloneUI();
        }

        function vhRenderSKTGroupHTML(skts) {
            if (!skts || skts.length === 0) {
                return `<div class="text-[11px] text-slate-500 mono text-center py-6 rounded-xl border border-dashed border-white/[0.07]">Noch kein SKT</div>`;
            }
            return skts.map((skt, sIdx) => `
                <div class="grid grid-cols-3 gap-1.5 bg-slate-900/90 p-2 rounded-xl border border-purple-500/45 shadow" title="SKT ${sIdx + 1}">
                    ${skt.map(card => `
                        <div class="w-full card-63-88 rounded-lg bg-white border-2 border-slate-300 p-1 flex flex-col justify-between shadow overflow-hidden">
                            ${renderLargePlayingCardInner(card, true)}
                        </div>
                    `).join('')}
                </div>
            `).join('');
        }

        function renderVerhoerStandaloneUI() {
            // 1. Schritt-Leiste & klares Handlungs-Banner
            const activeStep = vhState.turn === 'ai' || vhState.phase === 'interrogation' ? 3 : (vhState.phase === 'draw' ? 1 : 2);
            [1, 2, 3].forEach(n => {
                const el = document.getElementById(`vh-step-${n}`);
                if (!el) return;
                el.className = n === activeStep
                    ? 'px-2.5 py-1 rounded-full border border-cyan-400/70 bg-cyan-500/20 text-cyan-200 font-bold'
                    : (n < activeStep
                        ? 'px-2.5 py-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 text-emerald-300'
                        : 'px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.03] text-slate-500');
            });

            const bannerTxt = document.getElementById('vh-banner-text');
            const bannerDot = document.getElementById('vh-banner-dot');
            if (bannerTxt) {
                if (vhState.phase === 'ended') {
                    bannerTxt.textContent = vhState.winInfo?.didWin ? 'Partie gewonnen — perfektes 5er-Cluster!' : 'Der Taktik-Bot hat ein 5er-Cluster vollendet.';
                } else if (vhState.turn === 'ai') {
                    bannerTxt.textContent = 'Taktik-Bot ist am Zug und plant seinen Abwurf...';
                } else if (vhState.phase === 'draw') {
                    bannerTxt.textContent = 'Schritt 1: Ziehe eine 6. Karte — klicke links auf den Nachziehstapel oder rechts auf M₁ (Rückruf).';
                } else if (vhState.phase === 'action') {
                    bannerTxt.textContent = 'Schritt 2: Melde optional ein SKT oder wähle eine Handkarte zum Abwerfen auf M₁.';
                } else if (vhState.phase === 'interrogation') {
                    bannerTxt.textContent = vhState.intType === 'strict'
                        ? ' Verschärftes Verhör: Wähle blind eine Karte aus der Hand des Bots!'
                        : ' Standard-Verhör: Fordere eine Eigenschaft vom Bot!';
                } else if (vhState.phase === 'bonus_discard') {
                    bannerTxt.textContent = 'Tausch-Ausgleich: Du hast 6 Karten — wirf jetzt 1 beliebige Handkarte auf M₁ ab.';
                }
            }
            if (bannerDot) {
                bannerDot.className = `w-2.5 h-2.5 rounded-full shrink-0 ${vhState.turn === 'ai' ? 'bg-rose-400 animate-pulse' : (vhState.phase === 'interrogation' ? 'bg-amber-400 animate-pulse' : 'bg-cyan-400 animate-pulse')}`;
            }

            // 2. Bot-Leiste
            const botSub = document.getElementById('vh-bot-substats');
            const botHandEl = document.getElementById('vh-bot-hand');
            if (botSub) botSub.textContent = `${vhState.aiHand.length} geheime Karten · ${vhState.aiTrios.length} SKT`;
            if (botHandEl) {
                botHandEl.innerHTML = vhState.aiHand.map(() => `
                    <div class="w-8 sm:w-9 card-63-88 rounded-lg bg-gradient-to-br from-rose-900 via-slate-900 to-indigo-950 border border-rose-400/50 flex items-center justify-center shadow">
                        <span class="text-[10px] font-bold text-rose-300 mono">?</span>
                    </div>
                `).join('');
            }

            // 3. Nachziehstapel & M1
            const isDrawPhase = vhState.isRunning && vhState.turn === 'player' && vhState.phase === 'draw';
            const deckBtn = document.getElementById('vh-deck-btn');
            const deckCnt = document.getElementById('vh-deck-count');
            const deckHint = document.getElementById('vh-deck-hint');
            if (deckCnt) deckCnt.textContent = String(vhState.deck.length);
            if (deckBtn) {
                deckBtn.disabled = !isDrawPhase;
                deckBtn.className = isDrawPhase
                    ? 'w-[100px] sm:w-[114px] card-63-88 rounded-2xl bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-900 border-4 border-cyan-300 ring-4 ring-cyan-400/25 shadow-2xl flex flex-col items-center justify-center gap-1 transition hover:scale-[1.04] cursor-pointer'
                    : 'w-[100px] sm:w-[114px] card-63-88 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-white/10 opacity-60 flex flex-col items-center justify-center gap-1 cursor-default';
            }
            if (deckHint) deckHint.textContent = isDrawPhase ? 'Klicken zum Ziehen' : 'Warte...';

            const top = vhTopDiscard();
            const discEl = document.getElementById('vh-discard-pile');
            const discHint = document.getElementById('vh-discard-hint');
            if (discEl) {
                discEl.innerHTML = renderLargePlayingCardInner(top, false);
                const canRecall = isDrawPhase && Boolean(top);
                const canDrop = vhState.isRunning && vhState.turn === 'player' && (vhState.phase === 'action' || vhState.phase === 'bonus_discard') && vhState.selectedIdx !== null;
                discEl.className = canRecall
                    ? 'w-[100px] sm:w-[114px] card-63-88 rounded-2xl bg-white border-4 border-amber-400 ring-4 ring-amber-400/20 shadow-2xl flex flex-col justify-between p-2 cursor-pointer hover:scale-[1.04] transition relative overflow-hidden'
                    : (canDrop
                        ? 'w-[100px] sm:w-[114px] card-63-88 rounded-2xl bg-white border-4 border-cyan-400 ring-4 ring-cyan-400/25 shadow-2xl flex flex-col justify-between p-2 cursor-pointer hover:scale-[1.04] transition relative overflow-hidden'
                        : 'w-[100px] sm:w-[114px] card-63-88 rounded-2xl bg-white border-4 border-slate-300 shadow-xl flex flex-col justify-between p-2 transition relative overflow-hidden');
            }
            if (discHint) {
                const canDropPhase = vhState.isRunning && vhState.turn === 'player' && (vhState.phase === 'action' || vhState.phase === 'bonus_discard');
                discHint.textContent = isDrawPhase && top
                    ? 'Klicken für Rückruf'
                    : (canDropPhase ? 'Karte hierhin ziehen / klicken' : 'Oberste Karte');
            }

            // 4. Interaktives Verhör-Panel
            const intPanel = document.getElementById('vh-interrogation-panel');
            const intTitle = document.getElementById('vh-int-title');
            const intBadge = document.getElementById('vh-int-badge');
            const intBody = document.getElementById('vh-int-body');
            if (intPanel && intBody) {
                const showInt = vhState.phase === 'interrogation' && vhState.isRunning;
                intPanel.classList.toggle('hidden', !showInt);
                if (showInt) {
                    if (vhState.intStep === 'choose_prop') {
                        if (intTitle) intTitle.textContent = ' Standard-Verhör (1 gleiche Eigenschaft)';
                        if (intBadge) intBadge.textContent = 'Eigenschaft fordern';
                        const xBtns = [0,1,2,3,4].map(x => `<button type="button" onclick="vhDemandProperty(0,${x})" class="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-cyan-400 hover:text-slate-950 text-cyan-300 border border-white/10 font-bold mono transition">${PALETTE_X[x].count}× ${PALETTE_X[x].word}</button>`).join('');
                        const yBtns = [0,1,2,3,4].map(y => `<button type="button" onclick="vhDemandProperty(1,${y})" class="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-400 hover:text-slate-950 text-emerald-300 border border-white/10 font-bold mono transition inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background:${PALETTE_Y[y].hex}"></span>${PALETTE_Y[y].name}</button>`).join('');
                        const zBtns = [0,1,2,3,4].map(z => `<button type="button" onclick="vhDemandProperty(2,${z})" class="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-purple-400 hover:text-slate-950 text-purple-300 border border-white/10 font-bold mono transition">${PALETTE_Z[z].name}</button>`).join('');
                        intBody.innerHTML = `
                            <p class="text-slate-300">Wähle eine Eigenschaft — hat der Bot eine passende Karte, muss er sie dir zeigen:</p>
                            <div class="space-y-2">
                                <div class="flex flex-wrap items-center gap-1.5"><span class="text-[10px] mono text-slate-500 w-14">Anzahl</span>${xBtns}</div>
                                <div class="flex flex-wrap items-center gap-1.5"><span class="text-[10px] mono text-slate-500 w-14">Farbe</span>${yBtns}</div>
                                <div class="flex flex-wrap items-center gap-1.5"><span class="text-[10px] mono text-slate-500 w-14">Symbol</span>${zBtns}</div>
                            </div>
                        `;
                    } else if (vhState.intStep === 'no_match') {
                        if (intBadge) intBadge.textContent = 'Kein Treffer';
                        intBody.innerHTML = `
                            <div class="flex flex-wrap items-center justify-between gap-3">
                                <span class="text-slate-200">${vhState.intNote}</span>
                                <button type="button" onclick="vhEndPlayerTurn()" class="px-4 py-2 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs transition">Zug beenden →</button>
                            </div>
                        `;
                    } else if (vhState.intStep === 'blind_pick') {
                        if (intTitle) intTitle.textContent = '⚡ Verschärftes Verhör (2 gleiche Eigenschaften)';
                        if (intBadge) intBadge.textContent = 'Blinder Zugriff';
                        intBody.innerHTML = `
                            <p class="text-slate-300">Wähle eine verdeckte Karte aus der Hand des Bots:</p>
                            <div class="flex flex-wrap gap-2.5">
                                ${vhState.aiHand.map((_, i) => `
                                    <button type="button" onclick="vhBlindPick(${i})" class="w-16 card-63-88 rounded-xl bg-gradient-to-br from-rose-800 to-indigo-950 hover:from-amber-400 hover:to-amber-500 border-2 border-rose-400/60 hover:border-white flex flex-col items-center justify-center gap-1 shadow-lg transition group">
                                        <span class="text-xs font-extrabold text-white group-hover:text-slate-950 mono">#${i + 1}</span>
                                        <span class="text-[9px] text-rose-200 group-hover:text-slate-950 font-bold uppercase">Ziehen</span>
                                    </button>
                                `).join('')}
                            </div>
                        `;
                    } else if (vhState.intStep === 'decide' && vhState.pendingCard) {
                        const [x, y, z] = vhState.pendingCard;
                        if (intBadge) intBadge.textContent = 'Entscheidung';
                        intBody.innerHTML = `
                            <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-16 card-63-88 rounded-xl bg-white border-2 border-amber-400 p-1 flex flex-col justify-between shadow-lg shrink-0 overflow-hidden">
                                        ${renderLargePlayingCardInner([x, y, z], true)}
                                    </div>
                                    <div class="space-y-1">
                                        <div class="font-bold text-white">Aufgedeckte Bot-Karte: (${x},${y},${z})</div>
                                        <div class="text-[11px] text-slate-400">${PALETTE_X[x].count}× ${PALETTE_Y[y].name} ${PALETTE_Z[z].name} — Übernehmen (und 1 eigene abwerfen) oder den Bot zum Abwurf zwingen?</div>
                                    </div>
                                </div>
                                <div class="flex flex-col gap-2 w-full sm:w-auto shrink-0">
                                    <button type="button" onclick="vhResolveDecision(true)" class="px-4 py-2 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs transition"> Übernehmen</button>
                                    <button type="button" onclick="vhResolveDecision(false)" class="px-4 py-2 rounded-full bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition"> Auf M₁ zwingen</button>
                                </div>
                            </div>
                        `;
                    }
                }
            }

            // 5. Offene SKT & 3er-Dropzone (vergrößerte Karten)
            const pTrioCnt = document.getElementById('vh-player-trio-count');
            const bTrioCnt = document.getElementById('vh-bot-trio-count');
            const pTrioEl = document.getElementById('vh-player-trios');
            const bTrioEl = document.getElementById('vh-bot-trios');
            const dropzoneEl = document.getElementById('vh-skt-dropzone');
            const draftHint = document.getElementById('vh-skt-draft-hint');
            if (pTrioCnt) pTrioCnt.textContent = String(vhState.playerTrios.length);
            if (bTrioCnt) bTrioCnt.textContent = String(vhState.aiTrios.length);
            if (pTrioEl) pTrioEl.innerHTML = vhState.playerTrios.length > 0 ? vhRenderSKTGroupHTML(vhState.playerTrios) : '';
            if (bTrioEl) bTrioEl.innerHTML = vhRenderSKTGroupHTML(vhState.aiTrios);
            if (draftHint) {
                draftHint.textContent = vhState.sktDraftIndices.length > 0
                    ? `${vhState.sktDraftIndices.length} / 3 Karten im Prüffeld`
                    : '3 Karten hierhin ziehen';
            }
            if (dropzoneEl) {
                let slotsHtml = '';
                for (let s = 0; s < 3; s++) {
                    const hIdx = vhState.sktDraftIndices[s];
                    const card = (hIdx !== undefined && vhState.playerHand[hIdx]) ? vhState.playerHand[hIdx] : null;
                    if (card) {
                        slotsHtml += `
                            <button type="button" onclick="vhRemoveFromSktDraft(${s})" title="Klicken zum Zurücklegen"
                                    class="w-full card-63-88 rounded-lg bg-white border-2 border-purple-400 p-1 flex flex-col justify-between shadow relative overflow-hidden hover:opacity-80 transition">
                                ${renderLargePlayingCardInner(card, true)}
                            </button>
                        `;
                    } else {
                        slotsHtml += `
                            <div onclick="vhAddSelectedToSktDraft()"
                                 class="w-full card-63-88 rounded-lg border border-dashed border-white/15 bg-white/[0.02] flex flex-col items-center justify-center text-[9px] mono text-slate-500 ${vhState.selectedIdx !== null ? 'cursor-pointer hover:border-purple-400/60 hover:text-purple-300' : ''}">
                                <span>SKT ${s + 1}</span>
                            </div>
                        `;
                    }
                }
                dropzoneEl.innerHTML = slotsHtml;
            }

            // 6. Eigene Handkarten (ziehbar fürs SKT-Feld, ohne Hamming-Abstand)
            const handCnt = document.getElementById('vh-hand-count');
            const handHint = document.getElementById('vh-hand-hint');
            const handEl = document.getElementById('vh-player-hand');
            const canDiscard = vhState.isRunning && vhState.turn === 'player' && (vhState.phase === 'action' || vhState.phase === 'bonus_discard');
            const canDragSkt = vhCanUseSktDrop();
            if (handCnt) handCnt.textContent = String(vhState.playerHand.length);
            if (handHint) handHint.textContent = canDiscard
                ? 'Klick: Abwerfen · Ins SKT-Feld ziehen: SKT prüfen'
                : (isDrawPhase ? 'Erst oben 6. Karte ziehen (oder SKT ziehen)' : 'Warte...');

            if (handEl) {
                handEl.innerHTML = vhState.playerHand.map((card, idx) => {
                    const isSel = vhState.selectedIdx === idx;
                    const isInSkt = vhState.sktDraftIndices.includes(idx);
                    const isLocked = vhState.phase === 'action' && vhState.recalledKey === keyOf(...card);
                    const badgeHtml = isInSkt
                        ? `<span class="mt-1.5 inline-block px-2 py-0.5 rounded-full text-[9.5px] mono font-bold bg-purple-500/25 text-purple-200">Im SKT-Feld</span>`
                        : (isLocked
                            ? `<span class="mt-1.5 inline-block px-2 py-0.5 rounded-full text-[9.5px] mono font-bold bg-rose-500/20 text-rose-300">Gesperrt (M₁)</span>`
                            : '');

                    const cardCls = isInSkt
                        ? 'border-purple-400 opacity-45 scale-95 cursor-default'
                        : (isSel
                            ? 'border-cyan-400 -translate-y-2 ring-2 ring-cyan-400/50 cursor-grab'
                            : ((canDiscard && !isLocked) || canDragSkt
                                ? 'border-slate-300 hover:border-cyan-400 hover:-translate-y-1 cursor-grab'
                                : 'border-slate-300 opacity-70 cursor-default'));

                    return `
                        <div class="flex flex-col items-center">
                            <div role="button" tabindex="0" id="vh-card-${idx}"
                                 draggable="${canDragSkt && !isInSkt ? 'true' : 'false'}"
                                 ondragstart="vhOnHandDragStart(event, ${idx})"
                                 ondragend="vhOnHandDragEnd(event, ${idx})"
                                 onclick="${isInSkt ? '' : `vhSelectHandCard(${idx})`}"
                                 ondblclick="${isInSkt ? '' : `vhConfirmSelectedDiscard(${idx})`}"
                                 class="w-full card-63-88 rounded-xl bg-white border-3 p-1.5 flex flex-col justify-between shadow-lg transition relative overflow-hidden ${cardCls}">
                                ${renderLargePlayingCardInner(card, true)}
                            </div>
                            ${badgeHtml}
                        </div>
                    `;
                }).join('');
            }

            const confirmBar = document.getElementById('vh-discard-confirm-bar');
            const selInfo = document.getElementById('vh-selected-card-info');
            if (confirmBar && selInfo) {
                const showBar = canDiscard && vhState.selectedIdx !== null && vhState.playerHand[vhState.selectedIdx];
                confirmBar.classList.toggle('hidden', !showBar);
                if (showBar) {
                    const [x, y, z] = vhState.playerHand[vhState.selectedIdx];
                    selInfo.innerHTML = `Gewählt: <strong class="text-white mono">(${x},${y},${z})</strong> · <span class="text-slate-300">${PALETTE_X[x].count}× ${PALETTE_Y[y].name} ${PALETTE_Z[z].name}</span>`;
                }
            }

            // 7. Fortschritt & SKT-/Cluster-Buttons rechts
            const pProg = getMaxClusterSubsetSize(vhState.playerHand, vhState.playerTrios);
            const bProg = getMaxClusterSubsetSize(vhState.aiHand, vhState.aiTrios);
            const hasCluster = findValidCluster5FromPool(vhState.playerHand, vhState.playerTrios) !== null;

            const pill = document.getElementById('vh-progress-pill');
            const pLbl = document.getElementById('vh-bar-player-lbl');
            const bLbl = document.getElementById('vh-bar-bot-lbl');
            const pBar = document.getElementById('vh-bar-player');
            const bBar = document.getElementById('vh-bar-bot');
            if (pill) pill.textContent = `${pProg} / 5`;
            if (pLbl) pLbl.textContent = `${pProg} / 5`;
            if (bLbl) bLbl.textContent = `${bProg} / 5`;
            if (pBar) pBar.style.width = `${Math.round((pProg / 5) * 100)}%`;
            if (bBar) bBar.style.width = `${Math.round((bProg / 5) * 100)}%`;

            const btnClu = document.getElementById('vh-btn-cluster');
            const tagClu = document.getElementById('vh-btn-cluster-tag');
            if (btnClu && tagClu) {
                const ready = hasCluster && vhState.isRunning;
                btnClu.className = ready
                    ? 'px-3.5 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs transition flex items-center gap-2 shadow-lg ring-2 ring-cyan-400/60'
                    : 'px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-slate-400 font-semibold text-xs transition flex items-center gap-2 opacity-75';
                tagClu.textContent = ready ? 'Jetzt rufen!' : `${pProg}/5`;
            }

            // 8. X-Ray & Log
            const xBtn = document.getElementById('vh-btn-xray');
            const xBody = document.getElementById('vh-xray-body');
            if (xBtn) xBtn.textContent = vhState.xrayOpen ? 'X-Ray: An' : 'X-Ray: Aus';
            if (xBody) {
                xBody.classList.toggle('hidden', !vhState.xrayOpen);
                if (vhState.xrayOpen) {
                    const knownEl = document.getElementById('vh-xray-known');
                    const botEl = document.getElementById('vh-xray-bot');
                    if (knownEl) {
                        knownEl.textContent = vhState.aiMemory.knownPlayerCards.length > 0
                            ? `Bekannt bei dir: ${vhState.aiMemory.knownPlayerCards.map(c => `(${c.join(',')})`).join(', ')}`
                            : 'Bot kennt noch keine deiner Handkarten.';
                    }
                    if (botEl) botEl.textContent = vhState.aiMemory.lastBotThought;
                }
            }

            const logEl = document.getElementById('vh-log-list');
            if (logEl) {
                logEl.innerHTML = vhState.logs.map(l => `<div class="py-1 border-b border-white/[0.04] last:border-0">${l}</div>`).join('');
            }

            // 9. End-Overlay (ohne Elo)
            const endOv = document.getElementById('vh-end-overlay');
            if (endOv) {
                const ended = vhState.phase === 'ended' && vhState.winInfo;
                endOv.classList.toggle('hidden', !ended);
                if (ended) {
                    const { didWin, cluster } = vhState.winInfo;
                    const eb = document.getElementById('vh-end-badge');
                    const et = document.getElementById('vh-end-title');
                    const ed = document.getElementById('vh-end-desc');
                    const ec = document.getElementById('vh-end-cluster');
                    if (eb) {
                        eb.textContent = didWin ? 'Sieg' : 'Niederlage';
                        eb.className = didWin
                            ? 'inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] mono font-bold uppercase tracking-widest'
                            : 'inline-block px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-[10px] mono font-bold uppercase tracking-widest';
                    }
                    if (et) et.textContent = didWin ? 'Perfektes 5er-Cluster!' : 'Der Taktik-Bot gewinnt!';
                    if (ed) ed.textContent = didWin
                        ? 'Alle 5 Karten unterscheiden sich paarweise in Anzahl, Farbe und Symbol.'
                        : 'Der Bot konnte zuerst ein vollständiges 5er-Cluster bilden.';
                    if (ec && cluster) {
                        ec.innerHTML = cluster.map(c => `<div class="w-16 card-63-88 rounded-lg bg-white border-2 border-emerald-400 p-1 overflow-hidden shadow">${renderLargePlayingCardInner(c, true)}</div>`).join('');
                    }
                }
            }
        }

        // --- E) CLUSTER-CASCADE (5×5-FALLSPIEL) ---
        const cascadeState = {
            board: [], // 5x5: board[row][col], row 0 = oben, row 4 = unten
            currentCard: null,
            nextCard: null,
            score: 0,
            highScore: parseInt(localStorage.getItem('blink_cascade_hs_v1') || '0', 10),
            clears: 0,
            skipsLeft: 3,
            rotatesLeft: 3,
            rotateMode: false,
            isAnimating: false,
            gameOver: false,
            clearingCells: new Set()
        };

        function drawSmartCascadeCard() {
            const onBoard = new Set();
            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 5; c++) {
                    if (cascadeState.board[r] && cascadeState.board[r][c]) {
                        onBoard.add(keyOf(...cascadeState.board[r][c]));
                    }
                }
            }

            // 55 % Chance: Karte gezielt kompatibel zu einer bestehenden, noch nicht vollen Linie generieren
            if (Math.random() < 0.55) {
                const lines = [];
                for (let r = 0; r < 5; r++) lines.push([0,1,2,3,4].map(c => cascadeState.board[r][c]).filter(Boolean));
                for (let c = 0; c < 5; c++) lines.push([0,1,2,3,4].map(r => cascadeState.board[r][c]).filter(Boolean));
                const promising = lines.filter(l => l.length >= 2 && l.length <= 4 &&
                    new Set(l.map(k => k[0])).size === l.length &&
                    new Set(l.map(k => k[1])).size === l.length &&
                    new Set(l.map(k => k[2])).size === l.length);

                if (promising.length > 0) {
                    const chosenLine = promising[Math.floor(Math.random() * promising.length)];
                    const usedX = new Set(chosenLine.map(c => c[0]));
                    const usedY = new Set(chosenLine.map(c => c[1]));
                    const usedZ = new Set(chosenLine.map(c => c[2]));
                    const availX = [0,1,2,3,4].filter(v => !usedX.has(v));
                    const availY = [0,1,2,3,4].filter(v => !usedY.has(v));
                    const availZ = [0,1,2,3,4].filter(v => !usedZ.has(v));
                    const cand = [
                        availX[Math.floor(Math.random() * availX.length)],
                        availY[Math.floor(Math.random() * availY.length)],
                        availZ[Math.floor(Math.random() * availZ.length)]
                    ];
                    if (!onBoard.has(keyOf(...cand))) return cand;
                }
            }

            for (let tries = 0; tries < 50; tries++) {
                const cand = CARDS_125[Math.floor(Math.random() * CARDS_125.length)];
                if (!onBoard.has(keyOf(...cand))) return [...cand];
            }
            return [...CARDS_125[Math.floor(Math.random() * CARDS_125.length)]];
        }

        function initCascadeGame() {
            cascadeState.board = Array.from({ length: 5 }, () => Array(5).fill(null));
            cascadeState.score = 0;
            cascadeState.clears = 0;
            cascadeState.skipsLeft = 3;
            cascadeState.rotatesLeft = 3;
            cascadeState.rotateMode = false;
            cascadeState.isAnimating = false;
            cascadeState.gameOver = false;
            cascadeState.clearingCells = new Set();

            // Start-Basis: 5 kompatible Karten unten zufällig verteilt (nicht als fertiges Cluster)
            const starter = shuffleArray(CARDS_125).slice(0, 5);
            for (let c = 0; c < 5; c++) cascadeState.board[4][c] = starter[c];
            if (isValidCluster5(cascadeState.board[4])) {
                cascadeState.board[4][4] = [cascadeState.board[4][0][0], cascadeState.board[4][4][1], cascadeState.board[4][4][2]];
            }

            cascadeState.currentCard = drawSmartCascadeCard();
            cascadeState.nextCard = drawSmartCascadeCard();

            const stEl = document.getElementById('cas-status-text');
            if (stEl) stEl.textContent = 'Wirf Karten in Spalte 1–5 ein, um 5er-Cluster aufzulösen.';
            const pill = document.getElementById('cas-combo-pill');
            if (pill) pill.textContent = 'Läuft';

            renderCascadeUI();
            syncActiveGameModeMusic();
        }

        function toggleCascadeRotateMode() {
            if (cascadeState.gameOver || cascadeState.isAnimating) return;
            if (cascadeState.rotatesLeft <= 0) {
                playSound('error');
                return;
            }
            cascadeState.rotateMode = !cascadeState.rotateMode;
            playSound('tick');
            renderCascadeUI();
        }

        function skipCascadeCard() {
            if (cascadeState.gameOver || cascadeState.isAnimating || cascadeState.skipsLeft <= 0) return;
            cascadeState.skipsLeft--;
            cascadeState.currentCard = cascadeState.nextCard;
            cascadeState.nextCard = drawSmartCascadeCard();
            cascadeState.rotateMode = false;
            playSound('tick');
            renderCascadeUI();
        }

        function onCascadeColumnClick(col) {
            if (cascadeState.gameOver || cascadeState.isAnimating) return;

            if (cascadeState.rotateMode) {
                const colCards = [];
                for (let r = 0; r < 5; r++) if (cascadeState.board[r][col]) colCards.push(cascadeState.board[r][col]);
                if (colCards.length < 2) {
                    playSound('error');
                    return;
                }
                const bottom = colCards.pop();
                colCards.unshift(bottom);
                for (let r = 0; r < 5; r++) cascadeState.board[r][col] = null;
                for (let i = 0; i < colCards.length; i++) {
                    cascadeState.board[5 - colCards.length + i][col] = colCards[i];
                }
                cascadeState.rotatesLeft--;
                cascadeState.rotateMode = false;
                playSound('flip');
                resolveCascadeMatches(1);
                return;
            }

            let targetRow = -1;
            for (let r = 4; r >= 0; r--) {
                if (cascadeState.board[r][col] === null) {
                    targetRow = r;
                    break;
                }
            }
            if (targetRow === -1) {
                playSound('error');
                const stEl = document.getElementById('cas-status-text');
                if (stEl) stEl.textContent = `Spalte ${col + 1} ist voll! Wähle eine andere Spalte.`;
                return;
            }

            cascadeState.board[targetRow][col] = [...cascadeState.currentCard];
            cascadeState.currentCard = cascadeState.nextCard;
            cascadeState.nextCard = drawSmartCascadeCard();
            playSound('play');
            resolveCascadeMatches(1);
        }

        function resolveCascadeMatches(comboStep) {
            const lines = [];
            for (let r = 0; r < 5; r++) lines.push([0,1,2,3,4].map(c => [r, c]));
            for (let c = 0; c < 5; c++) lines.push([0,1,2,3,4].map(r => [r, c]));
            lines.push([[0,0],[1,1],[2,2],[3,3],[4,4]]);
            lines.push([[0,4],[1,3],[2,2],[3,1],[4,0]]);

            const matchedLines = [];
            lines.forEach(coords => {
                const cards = coords.map(([r, c]) => cascadeState.board[r][c]);
                if (cards.every(Boolean) && isValidCluster5(cards)) {
                    matchedLines.push({ coords, strict: isStrictCluster5(cards) });
                }
            });

            if (matchedLines.length === 0) {
                const anySpace = cascadeState.board[0].some(cell => cell === null);
                if (!anySpace) {
                    cascadeState.gameOver = true;
                    if (typeof stopGameMusic === 'function') stopGameMusic();
                    playSound('error');
                    const stEl = document.getElementById('cas-status-text');
                    if (stEl) stEl.textContent = 'Spielfeld voll — Game Over! Klicke auf Neustart.';
                    const pill = document.getElementById('cas-combo-pill');
                    if (pill) pill.textContent = 'Game Over';
                }
                renderCascadeUI();
                return;
            }

            cascadeState.isAnimating = true;
            cascadeState.clearingCells = new Set();
            let gained = 0;
            let strictCount = 0;

            matchedLines.forEach(m => {
                m.coords.forEach(([r, c]) => cascadeState.clearingCells.add(`${r},${c}`));
                gained += (m.strict ? 250 : 100) * comboStep;
                if (m.strict) strictCount++;
            });

            cascadeState.score += gained;
            cascadeState.clears += matchedLines.length;
            if (comboStep >= 2) {
                cascadeState.skipsLeft = Math.min(5, cascadeState.skipsLeft + 1);
                cascadeState.rotatesLeft = Math.min(5, cascadeState.rotatesLeft + 1);
            }
            if (cascadeState.score > cascadeState.highScore) {
                cascadeState.highScore = cascadeState.score;
                localStorage.setItem('blink_cascade_hs_v1', String(cascadeState.highScore));
            }

            playSound('win');
 if (window.BlinkHaptics) {
 const gridEl = document.getElementById('cas-grid');
 window.BlinkHaptics.burst(gridEl, strictCount > 0 ? 'purple' : 'emerald', 22);
 window.BlinkHaptics.floatBadge(gridEl, comboStep > 1 ? `CASCADE ×${comboStep}! +${gained}` : `+${gained} Pkt.`, strictCount > 0 ? 'purple' : 'emerald');
 }
 const pill = document.getElementById('cas-combo-pill');
 if (pill) pill.textContent = comboStep > 1 ? `Cascade ×${comboStep}! +${gained}` : `+${gained} Pkt.`;
            const stEl = document.getElementById('cas-status-text');
            if (stEl) stEl.textContent = `${matchedLines.length} Cluster aufgelöst${strictCount > 0 ? ' (inkl. strenges Cluster!)' : ''} — Karten rutschen nach...`;

            renderCascadeUI();

            setTimeout(() => {
                cascadeState.clearingCells.forEach(k => {
                    const [r, c] = k.split(',').map(Number);
                    cascadeState.board[r][c] = null;
                });
                cascadeState.clearingCells = new Set();

                // Schwerkraft pro Spalte anwenden
                for (let c = 0; c < 5; c++) {
                    const stack = [];
                    for (let r = 4; r >= 0; r--) {
                        if (cascadeState.board[r][c]) stack.push(cascadeState.board[r][c]);
                        cascadeState.board[r][c] = null;
                    }
                    stack.forEach((card, idx) => {
                        cascadeState.board[4 - idx][c] = card;
                    });
                }

                cascadeState.isAnimating = false;
                resolveCascadeMatches(comboStep + 1);
            }, 380);
        }

        function renderCascadeUI() {
            const triggers = document.getElementById('cas-col-triggers');
            if (triggers) {
                triggers.innerHTML = [0, 1, 2, 3, 4].map(c => {
                    const isFull = cascadeState.board[0] && cascadeState.board[0][c] !== null;
                    const label = cascadeState.rotateMode ? `↻ ${c + 1}` : `↓ ${c + 1}`;
                    const cls = cascadeState.rotateMode
                        ? 'py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/35 border border-purple-400/50 text-purple-200 font-bold text-xs mono transition'
                        : (isFull
                            ? 'py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-slate-600 text-xs mono cursor-not-allowed'
                            : 'py-1.5 rounded-xl bg-white/[0.04] hover:bg-cyan-400 hover:text-slate-950 border border-white/10 text-cyan-300 font-bold text-xs mono transition');
                    return `<button onclick="onCascadeColumnClick(${c})" class="${cls}">${label}</button>`;
                }).join('');
            }

            const grid = document.getElementById('cas-grid');
            if (grid) {
                let html = '';
                for (let r = 0; r < 5; r++) {
                    for (let c = 0; c < 5; c++) {
                        const card = cascadeState.board[r] ? cascadeState.board[r][c] : null;
                        const isClearing = cascadeState.clearingCells.has(`${r},${c}`);
                        if (!card) {
                            html += `<button onclick="onCascadeColumnClick(${c})" class="card-63-88 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.015] hover:border-cyan-400/40 transition"></button>`;
                        } else {
                            const borderCls = isClearing
                                ? 'border-emerald-400 ring-2 ring-emerald-400/60 scale-95 opacity-75'
                                : 'border-slate-300 hover:border-cyan-400';
                            html += `
                                <button onclick="onCascadeColumnClick(${c})" class="card-63-88 rounded-xl bg-white border-2 ${borderCls} p-1 flex flex-col justify-between shadow transition-all duration-200 overflow-hidden text-left">
                                    ${renderLargePlayingCardInner(card, true)}
                                </button>
                            `;
                        }
                    }
                }
                grid.innerHTML = html;
            }

            const curEl = document.getElementById('cas-current-card');
            const nxtEl = document.getElementById('cas-next-card');
            const coordsEl = document.getElementById('cas-current-coords');
            const descEl = document.getElementById('cas-current-desc');

            if (cascadeState.currentCard) {
                const [x, y, z] = cascadeState.currentCard;
                if (curEl) curEl.innerHTML = renderLargePlayingCardInner(cascadeState.currentCard, true);
                if (coordsEl) coordsEl.textContent = `(${x}, ${y}, ${z})`;
                if (descEl) descEl.textContent = `${PALETTE_X[x].count}× ${PALETTE_Y[y].name} ${PALETTE_Z[z].name}`;
            }
            if (nxtEl && cascadeState.nextCard) {
                nxtEl.innerHTML = renderCardSymbolsHTML(...cascadeState.nextCard);
            }

            const sc = document.getElementById('cas-score');
            const cl = document.getElementById('cas-clears');
            const hs = document.getElementById('cas-highscore');
            const sk = document.getElementById('cas-skips-left');
            const ro = document.getElementById('cas-rotates-left');
            const rotBtn = document.getElementById('btn-cas-rotate');

            if (sc) sc.textContent = String(cascadeState.score);
            if (cl) cl.textContent = String(cascadeState.clears);
            if (hs) hs.textContent = String(cascadeState.highScore);
            if (sk) sk.textContent = String(cascadeState.skipsLeft);
            if (ro) ro.textContent = String(cascadeState.rotatesLeft);
            if (rotBtn) {
                rotBtn.className = cascadeState.rotateMode
                    ? 'py-2.5 px-3 rounded-full bg-purple-500 text-slate-950 font-extrabold text-xs transition shadow-lg'
                    : 'py-2.5 px-3 rounded-full border border-purple-400/35 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 font-semibold text-xs transition';
            }
        }

        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            if (state.currentPage === 'game' && labState.activeGameTab === 'cascade' && !cascadeState.gameOver) {
                if (e.key >= '1' && e.key <= '5') onCascadeColumnClick(parseInt(e.key, 10) - 1);
            }
        });

        // --- A) DAILY BLINK CHALLENGE ---
        const dailyState = {
            isPractice: false,
            dateKey: '',
            cards: [],
            solutions: [],
            foundKeys: new Set(),
            selectedIndices: [],
            mistakes: 0,
            hintIndices: []
        };

        function createSeededRNG(seedNum) {
            let a = seedNum >>> 0;
            return function () {
                a |= 0;
                a = (a + 0x6D2B79F5) | 0;
                let t = Math.imul(a ^ (a >>> 15), 1 | a);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        }

        function getTodayDateKey() {
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }

        function getAllClustersInBoard(boardCards) {
            const found = [];
            const n = boardCards.length;
            for (let a = 0; a < n - 4; a++) {
                for (let b = a + 1; b < n - 3; b++) {
                    for (let c = b + 1; c < n - 2; c++) {
                        for (let d = c + 1; d < n - 1; d++) {
                            for (let e = d + 1; e < n; e++) {
                                const sub = [boardCards[a], boardCards[b], boardCards[c], boardCards[d], boardCards[e]];
                                if (isValidCluster5(sub)) {
                                    const indices = [a, b, c, d, e];
                                    const canonical = sub.map(k => keyOf(k[0], k[1], k[2])).sort().join('|');
                                    found.push({
                                        key: canonical,
                                        indices,
                                        cards: sub,
                                        strict: isStrictCluster5(sub)
                                    });
                                }
                            }
                        }
                    }
                }
            }
            return found;
        }

        function generateDailyBoard(rng) {
            for (let attempt = 0; attempt < 80; attempt++) {
                const x0 = [Math.floor(rng() * 5), Math.floor(rng() * 5), Math.floor(rng() * 5)];
                const dir = [1 + Math.floor(rng() * 4), 1 + Math.floor(rng() * 4), 1 + Math.floor(rng() * 4)];
                const line = [];
                for (let t = 0; t < 5; t++) {
                    line.push([(x0[0] + t * dir[0]) % 5, (x0[1] + t * dir[1]) % 5, (x0[2] + t * dir[2]) % 5]);
                }

                // Kombinierte Z- und Y-Tausche auf disjunkten Paaren erzeugen zuverlässig 6 bis 10 Cluster (streng & schwach)
                const extras = [
                    [line[0][0], line[0][1], line[1][2]],
                    [line[1][0], line[1][1], line[0][2]],
                    [line[2][0], line[2][1], line[3][2]],
                    [line[3][0], line[3][1], line[2][2]],
                    [line[0][0], line[4][1], line[0][2]],
                    [line[4][0], line[0][1], line[4][2]]
                ];

                const board = [...line];
                const used = new Set(board.map(c => keyOf(c[0], c[1], c[2])));
                extras.forEach(c => {
                    const k = keyOf(c[0], c[1], c[2]);
                    if (!used.has(k)) {
                        used.add(k);
                        board.push(c);
                    }
                });

                // Auf 12 Karten (4×3-Feld) auffüllen
                while (board.length < 12) {
                    const cand = [Math.floor(rng() * 5), Math.floor(rng() * 5), Math.floor(rng() * 5)];
                    const k = keyOf(cand[0], cand[1], cand[2]);
                    if (!used.has(k)) {
                        used.add(k);
                        board.push(cand);
                    }
                }

                // Deterministisch mischen
                for (let i = board.length - 1; i > 0; i--) {
                    const j = Math.floor(rng() * (i + 1));
                    [board[i], board[j]] = [board[j], board[i]];
                }

                const sols = getAllClustersInBoard(board);
                if (sols.length >= 6 && sols.length <= 10) {
                    return { board, sols };
                }
            }
            return { board: CARDS_125.slice(0, 12), sols: [] };
        }

        function initDailyChallenge(isPractice = false) {
            dailyState.isPractice = isPractice;
            dailyState.dateKey = getTodayDateKey();
            dailyState.selectedIndices = [];
            dailyState.foundKeys = new Set();
            dailyState.mistakes = 0;
            dailyState.hintIndices = [];

            const seed = isPractice
                ? Math.floor(Math.random() * 1000000000)
                : parseInt(dailyState.dateKey.replace(/-/g, ''), 10) * 2654435761;
            const rng = createSeededRNG(seed);
            const { board, sols } = generateDailyBoard(rng);
            dailyState.cards = board;
            dailyState.solutions = sols;

            const lbl = document.getElementById('daily-date-label');
            if (lbl) lbl.textContent = isPractice ? 'Zufalls-Training · 4×3 Feld' : `Daily Challenge · ${dailyState.dateKey}`;
            const fb = document.getElementById('daily-feedback-text');
            if (fb) fb.textContent = `In diesem 4×3-Feld sind genau ${sols.length} Cluster versteckt.`;

            renderDailyUI();
            syncActiveGameModeMusic();
        }

        function toggleDailyCard(idx) {
            const pos = dailyState.selectedIndices.indexOf(idx);
            if (pos >= 0) {
                dailyState.selectedIndices.splice(pos, 1);
                playSound('tick');
                renderDailyUI();
                return;
            }
            if (dailyState.selectedIndices.length >= 5) return;
            dailyState.selectedIndices.push(idx);
            playSound('tick');
            renderDailyUI();

            if (dailyState.selectedIndices.length === 5) {
                evaluateDailySelection();
            }
        }

        function clearDailySelection() {
            dailyState.selectedIndices = [];
            renderDailyUI();
        }

        function giveDailyHint() {
            const missing = dailyState.solutions.find(s => !dailyState.foundKeys.has(s.key));
            if (!missing) return;
            dailyState.hintIndices = missing.indices.slice(0, 2);
            playSound('tick');
            const fb = document.getElementById('daily-feedback-text');
            if (fb) fb.textContent = `Tipp: Die 2 markierten Karten gehören zu einem ${missing.strict ? 'strengen' : 'schwachen'} Cluster.`;
            renderDailyUI();
        }

        function evaluateDailySelection() {
            const chosen = dailyState.selectedIndices.map(i => dailyState.cards[i]);
            const fb = document.getElementById('daily-feedback-text');

            if (!isValidCluster5(chosen)) {
                dailyState.mistakes++;
                playSound('error');
                const dupX = new Set(chosen.map(c => c[0])).size < 5;
                const dupY = new Set(chosen.map(c => c[1])).size < 5;
                const dupZ = new Set(chosen.map(c => c[2])).size < 5;
                const reasons = [];
                if (dupX) reasons.push('Anzahl');
                if (dupY) reasons.push('Farbe');
                if (dupZ) reasons.push('Symbol');
                if (fb) fb.textContent = `Kein Cluster – Dopplung bei: ${reasons.join(', ')}.`;

                dailyState.selectedIndices.forEach(i => triggerInvalidShake(`daily-card-${i}`));
                setTimeout(() => {
                    dailyState.selectedIndices = [];
                    renderDailyUI();
                }, 520);
                renderDailyUI();
                return;
            }

            const canonical = chosen.map(c => keyOf(c[0], c[1], c[2])).sort().join('|');
            if (dailyState.foundKeys.has(canonical)) {
                if (fb) fb.textContent = 'Dieses Cluster hast du bereits entdeckt.';
                dailyState.selectedIndices = [];
                renderDailyUI();
                return;
            }

            dailyState.foundKeys.add(canonical);
            dailyState.hintIndices = [];
            dailyState.selectedIndices = [];
            const isStrict = isStrictCluster5(chosen);

            if (dailyState.foundKeys.size === dailyState.solutions.length) {
 if (typeof stopGameMusic === 'function') stopGameMusic();
 playSound('win');
 if (window.BlinkHaptics) window.BlinkHaptics.burst(document.getElementById('daily-cards-grid'), 'emerald', 28);
 if (!dailyState.isPractice) updateDailyStreak();
 if (fb) fb.textContent = 'Alle Cluster gefunden! Starke Analyse.';
 showSonnerToast('Alle Cluster dieser Challenge erfolgreich gefunden!', 'success');
 } else {
 playSound('play');
 if (window.BlinkHaptics) {
 const gridEl = document.getElementById('daily-cards-grid');
 window.BlinkHaptics.burst(gridEl, isStrict ? 'cyan' : 'purple', 16);
 window.BlinkHaptics.floatBadge(gridEl, isStrict ? 'Strenges Cluster!' : 'Cluster gefunden!', isStrict ? 'cyan' : 'purple');
 }
 if (fb) fb.textContent = `Treffer! ${isStrict ? 'Strenges Cluster (affine Gerade)' : 'Schwaches Cluster (nicht-kollinear)'} entdeckt.`;
 }
            renderDailyUI();
        }

        function updateDailyStreak() {
            const data = JSON.parse(localStorage.getItem('blink_daily_streak_v1') || '{"lastDate":"","streak":0}');
            if (data.lastDate === dailyState.dateKey) return;
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
            data.streak = (data.lastDate === yKey) ? (data.streak + 1) : 1;
            data.lastDate = dailyState.dateKey;
            localStorage.setItem('blink_daily_streak_v1', JSON.stringify(data));
        }

        function renderDailyUI() {
            const grid = document.getElementById('daily-cards-grid');
            if (grid) {
                grid.innerHTML = dailyState.cards.map(([x, y, z], idx) => {
                    const isSel = dailyState.selectedIndices.includes(idx);
                    const isHint = dailyState.hintIndices.includes(idx);
                    const ringCls = isSel
                        ? 'border-cyan-400 -translate-y-1.5 shadow-[0_12px_28px_-6px_rgba(34,211,238,0.45)]'
                        : (isHint ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-slate-300 hover:border-cyan-400/70 hover:-translate-y-0.5');

                    return `
                        <button id="daily-card-${idx}" onclick="toggleDailyCard(${idx})" class="card-63-88 rounded-2xl bg-white border-4 ${ringCls} p-2 flex flex-col justify-between shadow-lg transition-all duration-150 relative text-left overflow-hidden">
                            ${renderLargePlayingCardInner([x, y, z])}
                        </button>
                    `;
                }).join('');
            }

            const selPill = document.getElementById('daily-selection-pill');
            if (selPill) selPill.textContent = `${dailyState.selectedIndices.length} / 5 gewählt`;

            const progEl = document.getElementById('daily-progress-count');
            if (progEl) progEl.textContent = `${dailyState.foundKeys.size} / ${dailyState.solutions.length}`;

            const errEl = document.getElementById('daily-mistakes-count');
            if (errEl) errEl.textContent = String(dailyState.mistakes);

            const streakData = JSON.parse(localStorage.getItem('blink_daily_streak_v1') || '{"streak":0}');
            const streakBadge = document.getElementById('daily-streak-badge');
            if (streakBadge) streakBadge.textContent = `Streak: ${streakData.streak || 0} Tage`;

            const listEl = document.getElementById('daily-found-list');
            if (listEl) {
                const discovered = dailyState.solutions.filter(s => dailyState.foundKeys.has(s.key));
                if (discovered.length === 0) {
                    listEl.innerHTML = `<div class="text-xs text-slate-500 py-3 text-center rounded-xl border border-dashed border-white/10">Noch kein Cluster gefunden.</div>`;
                } else {
                    listEl.innerHTML = discovered.map((sol, idx) => `
                        <div class="p-2.5 rounded-xl bg-slate-950/80 border border-white/[0.08] space-y-1.5">
                            <div class="flex items-center justify-between text-[10px] mono font-bold">
                                <span class="text-slate-300">Cluster #${idx + 1}</span>
                                <span class="${sol.strict ? 'text-cyan-300' : 'text-purple-300'}">${sol.strict ? 'Streng · Gerade' : 'Schwach · Nicht-Gerade'}</span>
                            </div>
                            <div class="flex flex-wrap gap-1 text-[10px] mono text-slate-400">
                                ${sol.cards.map(c => `<span class="px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-200">(${c.join(',')})</span>`).join('')}
                            </div>
                        </div>
                    `).join('');
                }
            }
        }

        // --- B) MAGISCHES-QUADRAT-PUZZLE (BLINK-SUDOKU) ---
        const sudokuState = {
            emptyCount: 10,
            diffName: 'Leicht',
            solution: [],
            board: [],
            fixed: [],
            notes: [],
            inputMode: 'card', // 'card' | 'note'
            selectedCell: null,
            picker: { x: 1, y: 1, z: 1 },
            solved: false
        };

        function createEmptySudokuNote() {
            return { x: [], y: [], z: [] };
        }

        function hasSudokuNote(note) {
            return Boolean(note && (note.x.length > 0 || note.y.length > 0 || note.z.length > 0));
        }

        function setSudokuInputMode(mode) {
            if (mode !== 'card' && mode !== 'note') return;
            sudokuState.inputMode = mode;
            if (mode === 'card') {
                const note = sudokuState.notes[sudokuState.selectedCell];
                if (note) {
                    if (note.x.length === 1) sudokuState.picker.x = note.x[0];
                    if (note.y.length === 1) sudokuState.picker.y = note.y[0];
                    if (note.z.length === 1) sudokuState.picker.z = note.z[0];
                }
            }
            playSound('tick');
            renderSudokuPickerUI();
        }

        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (state.currentPage === 'game' && labState.activeGameTab === 'sudoku' && e.key.toLowerCase() === 'n') {
                setSudokuInputMode(sudokuState.inputMode === 'card' ? 'note' : 'card');
            }
        });

        function generateMagicSquare25() {
            const baseU = [1, 2, 3];
            const baseV = [2, 1, 1];
            const shift = [Math.floor(Math.random() * 5), Math.floor(Math.random() * 5), Math.floor(Math.random() * 5)];
            const scale = [1 + Math.floor(Math.random() * 4), 1 + Math.floor(Math.random() * 4), 1 + Math.floor(Math.random() * 4)];
            const perm = [0, 1, 2];
            for (let i = 2; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [perm[i], perm[j]] = [perm[j], perm[i]];
            }

            const cards = [];
            for (let s = 0; s < 5; s++) {
                for (let t = 0; t < 5; t++) {
                    const raw = [0, 1, 2].map(k => (shift[k] + scale[k] * (s * baseU[k] + t * baseV[k])) % 5);
                    cards.push([raw[perm[0]], raw[perm[1]], raw[perm[2]]]);
                }
            }
            return cards;
        }

        function startSudokuGame(emptyCount = 10, diffName = 'Leicht') {
            sudokuState.emptyCount = emptyCount;
            sudokuState.diffName = diffName;
            sudokuState.solved = false;
            sudokuState.solution = generateMagicSquare25();
            sudokuState.board = sudokuState.solution.map(c => [...c]);
            sudokuState.fixed = new Array(25).fill(true);
            sudokuState.notes = Array.from({ length: 25 }, () => createEmptySudokuNote());
            sudokuState.inputMode = 'card';

            const indices = Array.from({ length: 25 }, (_, i) => i);
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            for (let k = 0; k < emptyCount; k++) {
                const idx = indices[k];
                sudokuState.board[idx] = null;
                sudokuState.fixed[idx] = false;
            }

            sudokuState.selectedCell = sudokuState.fixed.findIndex(f => !f);

            [10, 14, 17].forEach(n => {
                const btn = document.getElementById(`sdk-diff-${n}`);
                if (!btn) return;
                btn.className = n === emptyCount
                    ? 'px-3 py-1 rounded-full text-xs font-bold bg-white text-slate-950 transition'
                    : 'px-3 py-1 rounded-full text-xs font-semibold border border-white/10 bg-white/[0.03] text-slate-300 hover:text-white transition';
            });

            renderSudokuUI();
            syncActiveGameModeMusic();
        }

        function selectSudokuCell(idx) {
            if (sudokuState.fixed[idx]) return;
            sudokuState.selectedCell = idx;
            const current = sudokuState.board[idx];
            if (current) {
                sudokuState.picker = { x: current[0], y: current[1], z: current[2] };
            } else {
                const note = sudokuState.notes[idx];
                if (note) {
                    if (note.x.length === 1) sudokuState.picker.x = note.x[0];
                    if (note.y.length === 1) sudokuState.picker.y = note.y[0];
                    if (note.z.length === 1) sudokuState.picker.z = note.z[0];
                }
            }
            playSound('tick');
            renderSudokuUI();
        }

        function setSudokuPicker(dim, val) {
            if (sudokuState.inputMode === 'note') {
                const idx = sudokuState.selectedCell;
                if (idx === null || idx < 0 || sudokuState.fixed[idx]) return;
                if (sudokuState.board[idx]) {
                    showSonnerToast('Leere das Feld zuerst, um Merkhilfen zu setzen.', 'warn');
                    return;
                }
                if (!sudokuState.notes[idx]) sudokuState.notes[idx] = createEmptySudokuNote();
                const arr = sudokuState.notes[idx][dim];
                const pos = arr.indexOf(val);
                if (pos >= 0) arr.splice(pos, 1);
                else arr.push(val);
                playSound('tick');
                renderSudokuUI();
                return;
            }
            sudokuState.picker[dim] = val;
            playSound('tick');
            renderSudokuPickerUI();
        }

        function placePickedCardInSudoku() {
            if (sudokuState.inputMode === 'note') {
                setSudokuInputMode('card');
                return;
            }
            const idx = sudokuState.selectedCell;
            if (idx === null || idx < 0 || sudokuState.fixed[idx]) return;
            sudokuState.board[idx] = [sudokuState.picker.x, sudokuState.picker.y, sudokuState.picker.z];
            sudokuState.notes[idx] = createEmptySudokuNote();
            playSound('play');

            const nextEmpty = sudokuState.board.findIndex((c, i) => !sudokuState.fixed[i] && c === null);
            if (nextEmpty !== -1) sudokuState.selectedCell = nextEmpty;

            renderSudokuUI();
        }

        function clearSelectedSudokuCell() {
            const idx = sudokuState.selectedCell;
            if (idx === null || idx < 0 || sudokuState.fixed[idx]) return;
            if (sudokuState.board[idx]) {
                sudokuState.board[idx] = null;
            } else {
                sudokuState.notes[idx] = createEmptySudokuNote();
            }
            playSound('tick');
            renderSudokuUI();
        }

        function giveSudokuHint() {
            let target = sudokuState.selectedCell;
            if (target === null || sudokuState.fixed[target] || (sudokuState.board[target] && keyOf(...sudokuState.board[target]) === keyOf(...sudokuState.solution[target]))) {
                target = sudokuState.board.findIndex((c, i) => !sudokuState.fixed[i] && (!c || keyOf(...c) !== keyOf(...sudokuState.solution[i])));
            }
            if (target === -1) return;
            sudokuState.board[target] = [...sudokuState.solution[target]];
            sudokuState.fixed[target] = true;
            sudokuState.notes[target] = createEmptySudokuNote();
            sudokuState.selectedCell = sudokuState.board.findIndex((c, i) => !sudokuState.fixed[i] && c === null);
            playSound('play');
            renderSudokuUI();
        }

        function evaluateSudokuLines() {
            const lines = [];
            for (let r = 0; r < 5; r++) lines.push({ type: 'row', indices: [0, 1, 2, 3, 4].map(c => r * 5 + c) });
            for (let c = 0; c < 5; c++) lines.push({ type: 'col', indices: [0, 1, 2, 3, 4].map(r => r * 5 + c) });
            lines.push({ type: 'diag', indices: [0, 6, 12, 18, 24] });
            lines.push({ type: 'diag', indices: [4, 8, 12, 16, 20] });

            const errorCells = new Set();
            let validRows = 0, validCols = 0, validDiags = 0;

            lines.forEach(line => {
                const cards = line.indices.map(i => sudokuState.board[i]);
                if (cards.some(c => c === null)) return;
                if (isValidCluster5(cards)) {
                    if (line.type === 'row') validRows++;
                    else if (line.type === 'col') validCols++;
                    else validDiags++;
                } else {
                    line.indices.forEach(i => errorCells.add(i));
                }
            });

            const seen = new Map();
            let hasDuplicate = false;
            sudokuState.board.forEach((c, i) => {
                if (!c) return;
                const k = keyOf(c[0], c[1], c[2]);
                if (seen.has(k)) {
                    hasDuplicate = true;
                    errorCells.add(i);
                    errorCells.add(seen.get(k));
                } else {
                    seen.set(k, i);
                }
            });

            return { validRows, validCols, validDiags, errorCells, hasDuplicate };
        }

       function renderSudokuNoteInnerHTML(note, isMini = false) {
            const order = [1, 2, 3, 4, 0];
            const xs = order.filter(v => note.x.includes(v));
            const ys = order.filter(v => note.y.includes(v));
            const zs = order.filter(v => note.z.includes(v));

            const singleColorHex = ys.length === 1 ? PALETTE_Y[ys[0]].hex : null;
            const symFill = singleColorHex || '#94a3b8';
            const symStroke = singleColorHex ? '#0f172a' : '#475569';
            const symSize = zs.length === 1 ? (isMini ? 22 : 24) : (zs.length <= 3 ? 14 : 11);

            const xHtml = xs.length > 0
                ? `<div class="text-[10px] sm:text-[11px] font-extrabold mono tracking-tight text-slate-200 leading-none">${xs.length === 1 ? `${PALETTE_X[xs[0]].count}×` : xs.map(v => PALETTE_X[v].count).join('·')}</div>`
                : '';

            const zHtml = zs.length > 0
                ? `<div class="flex flex-wrap items-center justify-center gap-0.5 max-w-full">${zs.map(v => getSymbolSVG(v, symFill, symSize, symStroke, 1.05)).join('')}</div>`
                : '';

            const dotCls = ys.length === 1 ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5';
            const yHtml = ys.length > 0
                ? `<div class="flex flex-wrap items-center justify-center gap-1">${ys.map(v => `<span class="${dotCls} rounded-full ring-1 ring-black/25 shadow-sm" style="background:${PALETTE_Y[v].hex}"></span>`).join('')}</div>`
                : '';

            return `<div class="flex flex-col items-center justify-center gap-1.5 w-full h-full px-1">${xHtml}${zHtml}${yHtml}</div>`;
        }

        function renderSudokuPickerUI() {
            const isNote = sudokuState.inputMode === 'note';
            const idx = sudokuState.selectedCell;
            const activeNote = (idx !== null && sudokuState.notes[idx]) ? sudokuState.notes[idx] : createEmptySudokuNote();
            const { x, y, z } = sudokuState.picker;

            const btnCard = document.getElementById('sdk-mode-card');
            const btnNote = document.getElementById('sdk-mode-note');
            if (btnCard && btnNote) {
                btnCard.className = !isNote
                    ? 'py-1.5 rounded-full text-xs font-bold bg-white text-slate-950 transition'
                    : 'py-1.5 rounded-full text-xs font-semibold text-slate-400 hover:text-white transition';
                btnNote.className = isNote
                    ? 'py-1.5 rounded-full text-xs font-bold bg-white text-slate-950 transition'
                    : 'py-1.5 rounded-full text-xs font-semibold text-slate-400 hover:text-white transition';
            }

            const prev = document.getElementById('sdk-picker-preview');
            const kicker = document.getElementById('sdk-preview-kicker');
            const coords = document.getElementById('sdk-picker-coords');
            const desc = document.getElementById('sdk-picker-desc');
            const btnPrimary = document.getElementById('sdk-btn-primary');
            const btnClear = document.getElementById('sdk-btn-clear');

            if (isNote) {
                const hasAny = hasSudokuNote(activeNote);
                if (prev) {
                    prev.className = 'w-24 card-63-88 rounded-xl bg-slate-900/90 border-2 border-dashed border-cyan-400/50 p-1.5 flex items-center justify-center shadow-lg shrink-0 overflow-hidden';
                    prev.innerHTML = hasAny
                        ? renderSudokuNoteInnerHTML(activeNote, false)
                        : '<span class="text-[10px] mono text-slate-500 text-center leading-tight">Keine<br>Notiz</span>';
                }
                if (kicker) kicker.textContent = 'Merkhilfe-Modus · Direkt ins Feld';
                if (coords) {
                    const rr = idx !== null && idx >= 0 ? Math.floor(idx / 5) + 1 : '–';
                    const cc = idx !== null && idx >= 0 ? (idx % 5) + 1 : '–';
                    coords.textContent = `Feld (${rr}, ${cc})`;
                }
                if (desc) {
                    const parts = [];
                    if (activeNote.x.length) parts.push(activeNote.x.map(v => `${PALETTE_X[v].count}×`).join('/'));
                    if (activeNote.y.length) parts.push(activeNote.y.map(v => PALETTE_Y[v].name).join('/'));
                    if (activeNote.z.length) parts.push(activeNote.z.map(v => PALETTE_Z[v].name).join('/'));
                    desc.textContent = parts.length ? parts.join(' · ') : 'Eigenschaften unten antippen zum Anheften';
                }
                if (btnPrimary) btnPrimary.textContent = 'Zurück zu „Karte setzen“';
                if (btnClear) btnClear.textContent = 'Notizen leeren';
            } else {
                if (prev) {
                    prev.className = 'w-24 card-63-88 rounded-xl bg-white border-2 border-slate-300 p-1.5 flex flex-col justify-between shadow-lg shrink-0 overflow-hidden';
                    prev.innerHTML = renderLargePlayingCardInner([x, y, z]);
                }
                if (kicker) kicker.textContent = 'Aktuelle Auswahl';
                if (coords) coords.textContent = `(${x}, ${y}, ${z})`;
                if (desc) desc.textContent = `${PALETTE_X[x].count}× ${PALETTE_Y[y].name} ${PALETTE_Z[z].name}`;
                if (btnPrimary) btnPrimary.textContent = 'Einsetzen';
                if (btnClear) btnClear.textContent = 'Leeren';
            }

            const px = document.getElementById('sdk-pick-x');
            if (px) {
                px.innerHTML = [1, 2, 3, 4, 0].map(val => {
                    const active = isNote ? activeNote.x.includes(val) : (x === val);
                    return `
                        <button onclick="setSudokuPicker('x', ${val})" class="py-2 rounded-xl text-xs font-bold mono transition ${active ? (isNote ? 'bg-amber-400/20 border-2 border-amber-400 text-white' : 'bg-cyan-400 text-slate-950') : 'bg-white/[0.04] border border-white/10 text-slate-300 hover:bg-white/[0.09]'}">${PALETTE_X[val].count}×</button>
                    `;
                }).join('');
            }
            const py = document.getElementById('sdk-pick-y');
            if (py) {
                py.innerHTML = [1, 2, 3, 4, 0].map(val => {
                    const active = isNote ? activeNote.y.includes(val) : (y === val);
                    return `
                        <button onclick="setSudokuPicker('y', ${val})" class="py-2 rounded-xl text-[11px] font-semibold flex flex-col items-center gap-1 transition ${active ? (isNote ? 'bg-amber-400/20 border-2 border-amber-400 text-white' : 'bg-cyan-400/20 border-2 border-cyan-400 text-white') : 'bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white'}">
                            <span class="w-3.5 h-3.5 rounded-full border border-white/30" style="background:${PALETTE_Y[val].hex}"></span>
                            <span class="text-[9.5px]">${PALETTE_Y[val].name}</span>
                        </button>
                    `;
                }).join('');
            }
            const pz = document.getElementById('sdk-pick-z');
            if (pz) {
                pz.innerHTML = [1, 2, 3, 4, 0].map(val => {
                    const active = isNote ? activeNote.z.includes(val) : (z === val);
                    return `
                        <button onclick="setSudokuPicker('z', ${val})" class="py-2 rounded-xl flex flex-col items-center gap-1 transition ${active ? (isNote ? 'bg-amber-400/20 border-2 border-amber-400 text-white' : 'bg-cyan-400/20 border-2 border-cyan-400 text-white') : 'bg-white/[0.04] border border-white/10 text-slate-400 hover:text-white'}">
                            ${getSymbolSVG(val, '#F8FAFC', 15, '#0f172a', 1.0)}
                            <span class="text-[9px]">${PALETTE_Z[val].name}</span>
                        </button>
                    `;
                }).join('');
            }
        }

        function renderSudokuUI() {
            const { validRows, validCols, validDiags, errorCells, hasDuplicate } = evaluateSudokuLines();
            const grid = document.getElementById('sudoku-grid');
            if (grid) {
                grid.innerHTML = sudokuState.board.map((card, idx) => {
                    const isFixed = sudokuState.fixed[idx];
                    const isSel = sudokuState.selectedCell === idx;
                    const isErr = errorCells.has(idx);
                    const r = Math.floor(idx / 5) + 1, c = (idx % 5) + 1;

                    if (!card) {
                        const note = sudokuState.notes[idx];
                        if (hasSudokuNote(note)) {
                            const singleColor = note.y.length === 1 ? PALETTE_Y[note.y[0]].hex : null;
                            const tintStyle = (!isSel && singleColor) ? `style="border-color:${singleColor}88"` : '';
                            return `
                                <button onclick="selectSudokuCell(${idx})" ${tintStyle} class="card-63-88 rounded-xl border-2 border-dashed ${isSel ? 'border-cyan-400 bg-cyan-500/15 shadow-[0_0_18px_rgba(34,211,238,0.28)]' : 'border-slate-500/45 bg-slate-900/70 hover:border-slate-400'} relative flex items-center justify-center p-1 transition overflow-hidden">
                                    <span class="absolute top-1 right-1.5 text-[8px] mono text-slate-500 opacity-75">${r},${c}</span>
                                    ${renderSudokuNoteInnerHTML(note, true)}
                                </button>
                            `;
                        }
                        return `
                            <button onclick="selectSudokuCell(${idx})" class="card-63-88 rounded-xl border-2 border-dashed ${isSel ? 'border-cyan-400 bg-cyan-500/15 shadow-[0_0_18px_rgba(34,211,238,0.28)]' : 'border-white/20 bg-white/[0.02] hover:border-white/40'} flex flex-col items-center justify-center gap-1 transition">
                                <span class="text-lg font-bold ${isSel ? 'text-cyan-300' : 'text-slate-600'}">+</span>
                                <span class="text-[9px] mono text-slate-500">${r},${c}</span>
                            </button>
                        `;
                    }

                    const [x, y, z] = card;
                    const borderCls = isErr
                        ? 'border-rose-500 ring-2 ring-rose-500/40'
                        : (isSel ? 'border-cyan-400 ring-2 ring-cyan-400/50' : (isFixed ? 'border-slate-300 opacity-95' : 'border-purple-400'));

                    return `
                        <button onclick="selectSudokuCell(${idx})" class="card-63-88 rounded-xl bg-white border-2 ${borderCls} p-1 flex flex-col justify-between shadow transition text-left relative overflow-hidden ${isFixed ? 'cursor-default' : 'cursor-pointer hover:-translate-y-0.5'}">
                            ${renderLargePlayingCardInner([x, y, z], false, isFixed ? '' : '✎')}
                        </button>
                    `;
                }).join('');
            }

            const rEl = document.getElementById('sdk-stat-rows');
            const cEl = document.getElementById('sdk-stat-cols');
            const dEl = document.getElementById('sdk-stat-diags');
            const dupEl = document.getElementById('sdk-dup-warning');
            if (rEl) {
                rEl.textContent = `Zeilen: ${validRows}/5`;
                rEl.className = validRows === 5 ? 'text-emerald-400 font-bold' : 'text-slate-300';
            }
            if (cEl) {
                cEl.textContent = `Spalten: ${validCols}/5`;
                cEl.className = validCols === 5 ? 'text-emerald-400 font-bold' : 'text-slate-300';
            }
            if (dEl) {
                dEl.textContent = `Diagonalen: ${validDiags}/2`;
                dEl.className = validDiags === 2 ? 'text-emerald-400 font-bold' : 'text-slate-300';
            }
            if (dupEl) dupEl.classList.toggle('hidden', !hasDuplicate);

            const selLbl = document.getElementById('sdk-selected-cell-label');
            if (selLbl) {
                if (sudokuState.selectedCell !== null && sudokuState.selectedCell >= 0) {
                    const rr = Math.floor(sudokuState.selectedCell / 5) + 1;
                    const cc = (sudokuState.selectedCell % 5) + 1;
                    selLbl.textContent = `Aktives Feld: Zeile ${rr}, Spalte ${cc}`;
                } else {
                    selLbl.textContent = 'Alle Felder ausgefüllt';
                }
            }

            renderSudokuPickerUI();

            if (!sudokuState.solved && validRows === 5 && validCols === 5 && validDiags === 2 && !hasDuplicate) {
 sudokuState.solved = true;
 if (typeof stopGameMusic === 'function') stopGameMusic();
 playSound('win');
 if (window.BlinkHaptics) window.BlinkHaptics.burst(document.getElementById('sudoku-grid'), 'purple', 30);
 showSonnerToast('Magisches Quadrat komplett gelöst! Alle 12 Linien sind gültige Cluster.', 'success');
 }
        }

     // --- C) TAKTISCHER TRAININGSMODUS (ENDGAME-PUZZLES: 5× STANDARD & 5× CLUSTER) ---
        const ENDGAME_PUZZLES = [
            // === STANDARD-MODUS (2 STAPEL, STUFE 1 BIS 5) ===
            {
                id: 'eg-std-1',
                level: 1,
                diffLabel: 'Stufe 1 · Leicht · 3 Züge',
                title: '#1 — Erste Brücke',
                mode: 'normal',
                piles: [[0, 0, 0], [1, 1, 1]],
                hand: [[0, 1, 2], [3, 0, 4], [2, 2, 2]],
                hint: 'Lege (0,1,2) auf M₂ statt auf M₁ — so bleibt M₁ für (3,0,4) erhalten und (2,2,2) passt auf M₂.'
            },
            {
                id: 'eg-std-2',
                level: 2,
                diffLabel: 'Stufe 2 · Einfach · 4 Züge',
                title: '#2 — Brücken-Schutz',
                mode: 'normal',
                piles: [[0, 0, 0], [1, 1, 1]],
                hand: [[0, 1, 2], [4, 0, 3], [2, 2, 2], [4, 4, 4]],
                hint: 'Lege (0,1,2) nicht auf M₁ — sonst verlierst du die Farbe Y=0 für (4,0,3) und (4,4,4).'
            },
            {
                id: 'eg-std-3',
                level: 3,
                diffLabel: 'Stufe 3 · Mittel · 4 Züge',
                title: '#3 — Einbahnstraße',
                mode: 'normal',
                piles: [[0, 0, 0], [1, 1, 1]],
                hand: [[0, 2, 2], [1, 0, 3], [3, 4, 3], [2, 4, 0]],
                hint: 'Spiele (0,2,2) auf M₁ und (1,0,3) auf M₂ — legst du (1,0,3) oder (2,4,0) auf M₁, ist (0,2,2) blockiert.'
            },
            {
                id: 'eg-std-4',
                level: 4,
                diffLabel: 'Stufe 4 · Schwer · 5 Züge',
                title: '#4 — Lange Kette',
                mode: 'normal',
                piles: [[0, 0, 0], [1, 1, 1]],
                hand: [[0, 4, 2], [2, 0, 3], [3, 4, 1], [2, 2, 4], [4, 3, 2]],
                hint: 'Starte auf M₂ mit (3,4,1), um (0,4,2) dort abzulegen — M₁ muss für (2,0,3) erhalten bleiben.'
            },
            {
                id: 'eg-std-5',
                level: 5,
                diffLabel: 'Stufe 5 · Meister · 6 Züge',
                title: '#5 — Doppelte Verzahnung',
                mode: 'normal',
                piles: [[0, 0, 0], [1, 1, 1]],
                hand: [[0, 1, 2], [2, 0, 3], [3, 2, 2], [4, 3, 3], [3, 4, 4], [4, 2, 1]],
                hint: 'Falle auf M₂: Spiele (4,2,1) nicht sofort auf M₂! Baue erst (0,1,2) → (3,2,2) → (3,4,4) auf M₂ und (2,0,3) → (4,3,3) → (4,2,1) auf M₁.'
            },

            // === CLUSTER-MODUS (3 STAPEL, STUFE 1 BIS 5) ===
            {
                id: 'eg-clu-1',
                level: 1,
                diffLabel: 'Stufe 1 · Leicht · 3 Züge',
                title: '#1 — Erstes Freiräumen',
                mode: 'cluster',
                piles: [[0, 0, 0], [1, 1, 1], [2, 2, 2]],
                hand: [[3, 3, 2], [2, 0, 4], [4, 2, 0]],
                hint: 'Zwei Karten sind anfangs blockiert: Räume zuerst M₃ mit (3,3,2) frei, dann öffnen sich M₁ und M₂.'
            },
            {
                id: 'eg-clu-2',
                level: 2,
                diffLabel: 'Stufe 2 · Einfach · 4 Züge',
                title: '#2 — SKT-Umbau',
                mode: 'cluster',
                piles: [[0, 0, 0], [1, 1, 1], [2, 2, 2]],
                hand: [[3, 3, 2], [2, 4, 3], [0, 2, 4], [4, 1, 0]],
                hint: 'Beginne mit (3,3,2) auf M₃, um X=2 für (2,4,3) auf M₁ freizuräumen.'
            },
            {
                id: 'eg-clu-3',
                level: 3,
                diffLabel: 'Stufe 3 · Mittel · 4 Züge',
                title: '#3 — Doppelte Sperre',
                mode: 'cluster',
                piles: [[0, 0, 0], [1, 1, 1], [2, 2, 2]],
                hand: [[3, 3, 2], [2, 4, 4], [0, 1, 3], [4, 2, 0]],
                hint: 'Befreie zuerst M₃ mit (3,3,2) und dann M₁ mit (2,4,4) — erst danach ist (0,1,3) spielbar.'
            },
            {
                id: 'eg-clu-4',
                level: 4,
                diffLabel: 'Stufe 4 · Schwer · 5 Züge',
                title: '#4 — Dreifach-Rotation',
                mode: 'cluster',
                piles: [[0, 0, 0], [1, 1, 1], [2, 2, 2]],
                hand: [[3, 3, 2], [2, 4, 4], [0, 1, 3], [4, 2, 0], [1, 0, 2]],
                hint: '(1,0,2) kollidiert anfangs mit allen 3 Stapeln! Baue M₃ → M₁ → M₂ → M₃ um, bevor (1,0,2) auf M₁ passt.'
            },
            {
                id: 'eg-clu-5',
                level: 5,
                diffLabel: 'Stufe 5 · Meister · 6 Züge',
                title: '#5 — Totale Blockade',
                mode: 'cluster',
                piles: [[0, 0, 0], [1, 1, 1], [2, 2, 2]],
                hand: [[3, 3, 2], [2, 4, 4], [0, 1, 3], [4, 2, 0], [1, 0, 2], [0, 4, 1]],
                hint: '(0,4,1) ist die ersten 5 Züge komplett gesperrt! Erst nach der vollen Kette M₃ → M₁ → M₂ → M₃ → M₁ passt sie auf M₂.'
            }
        ];

        const endgameState = {
            activeMode: 'normal', // 'normal' | 'cluster'
            currentPuzzle: null,
            piles: [],
            hand: [],
            selectedHandIdx: null,
            draggedHandIdx: null,
            movesMade: 0,
            status: 'playing', // 'playing' | 'won' | 'deadlock'
            solvedIds: new Set(JSON.parse(localStorage.getItem('blink_endgame_solved_v1') || '[]'))
        };

        function setEndgameMode(mode) {
            if (mode !== 'normal' && mode !== 'cluster') return;
            endgameState.activeMode = mode;
            playSound('tick');
            const modePuzzles = ENDGAME_PUZZLES.filter(p => p.mode === mode);
            const firstUnsolved = modePuzzles.find(p => !endgameState.solvedIds.has(p.id)) || modePuzzles[0];
            if (firstUnsolved) loadEndgamePuzzle(firstUnsolved);
        }

        function onEndgameHandDragStart(event, handIdx) {
            if (endgameState.status !== 'playing' || !endgameState.hand[handIdx]) {
                event.preventDefault();
                return;
            }
            endgameState.draggedHandIdx = handIdx;
            endgameState.selectedHandIdx = handIdx;
            if (event.dataTransfer) {
                event.dataTransfer.setData('text/plain', String(handIdx));
                event.dataTransfer.effectAllowed = 'move';
            }
            const el = document.getElementById(`eg-hand-${handIdx}`);
            if (el) setTimeout(() => el.classList.add('dragging-card'), 0);
        }

        function onEndgameHandDragEnd(event, handIdx) {
            const el = document.getElementById(`eg-hand-${handIdx}`);
            if (el) el.classList.remove('dragging-card');
            endgameState.piles.forEach((_, i) => {
                const p = document.getElementById(`eg-pile-${i}`);
                if (p) p.classList.remove('pile-drag-over');
            });
        }

        function onEndgamePileDragOver(event, pileIdx) {
            if (endgameState.status !== 'playing') return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
            const pileEl = document.getElementById(`eg-pile-${pileIdx}`);
            if (pileEl && !pileEl.classList.contains('pile-drag-over')) {
                pileEl.classList.add('pile-drag-over');
            }
        }

        function onEndgamePileDragLeave(event, pileIdx) {
            const pileEl = document.getElementById(`eg-pile-${pileIdx}`);
            if (pileEl) pileEl.classList.remove('pile-drag-over');
        }

        function onEndgamePileDrop(event, pileIdx) {
            event.preventDefault();
            const pileEl = document.getElementById(`eg-pile-${pileIdx}`);
            if (pileEl) pileEl.classList.remove('pile-drag-over');
            if (endgameState.status !== 'playing') return;

            let handIdx = endgameState.draggedHandIdx;
            if ((handIdx === undefined || handIdx === null) && event.dataTransfer) {
                handIdx = parseInt(event.dataTransfer.getData('text/plain'), 10);
            }
            endgameState.draggedHandIdx = null;

            if (isNaN(handIdx) || !endgameState.hand[handIdx]) return;
            endgameState.selectedHandIdx = handIdx;
            playEndgameOnPile(pileIdx);
        }

        function canPlayEndgameCard(card, piles, pileIdx, mode) {
            if (!card) return false;
            if (mode === 'normal') return hammingDistance(card, piles[pileIdx]) <= 2;
            for (let i = 0; i < piles.length; i++) {
                if (i === pileIdx) continue;
                if (!areCardsCompletelyDifferent(card, piles[i])) return false;
            }
            return true;
        }

        function analyzeEndgameDFS(piles, hand, mode) {
            const wins = [], deads = [];
            function dfs(curPiles, remHand, path) {
                if (remHand.length === 0) {
                    wins.push(path);
                    return;
                }
                let moved = false;
                for (let i = 0; i < remHand.length; i++) {
                    for (let p = 0; p < curPiles.length; p++) {
                        if (canPlayEndgameCard(remHand[i], curPiles, p, mode)) {
                            moved = true;
                            const nextPiles = curPiles.map((c, idx) => idx === p ? remHand[i] : c);
                            const nextHand = remHand.filter((_, idx) => idx !== i);
                            dfs(nextPiles, nextHand, [...path, { card: remHand[i], pileIdx: p }]);
                            if (wins.length > 4 && deads.length > 4) return;
                        }
                    }
                }
                if (!moved) deads.push(path);
            }
            dfs(piles, hand, []);
            return { wins, deads };
        }

        function loadEndgamePuzzle(indexOrObj) {
            const puz = typeof indexOrObj === 'number' ? ENDGAME_PUZZLES[indexOrObj] : indexOrObj;
            if (!puz) return;
            endgameState.activeMode = puz.mode;
            endgameState.currentPuzzle = puz;
            endgameState.piles = puz.piles.map(c => [...c]);
            endgameState.hand = puz.hand.map(c => [...c]);
            endgameState.selectedHandIdx = null;
            endgameState.movesMade = 0;
            endgameState.status = 'playing';

            const fb = document.getElementById('eg-feedback-text');
            if (fb) fb.textContent = `Lege alle ${puz.hand.length} Handkarten in der richtigen Reihenfolge ab, ohne ein Deadlock auszulösen.`;
            renderEndgameUI();
            syncActiveGameModeMusic();
        }

        function resetEndgamePuzzle() {
            if (!endgameState.currentPuzzle) return;
            playSound('tick');
            loadEndgamePuzzle(endgameState.currentPuzzle);
        }

        function generateRandomEndgamePuzzle(mode) {
            playSound('tick');
            for (let attempt = 0; attempt < 5000; attempt++) {
                let piles = [], hand = [];
                if (mode === 'normal') {
                    const pool = shuffleArray(CARDS_125);
                    piles = pool.slice(0, 2);
                    hand = pool.slice(2, 6);
                } else {
                    const pool = shuffleArray(CARDS_125);
                    piles = drawValidClusterTrioFromDeck(pool);
                    hand = pool.slice(0, 4);
                }
                const { wins, deads } = analyzeEndgameDFS(piles, hand, mode);
                if (wins.length >= 1 && wins.length <= 2 && deads.length >= 3) {
                    const winFirst = new Set(wins.map(w => `${w[0].card.join(',')}-${w[0].pileIdx}`));
                    const trapFirst = deads.filter(d => d.length > 0 && !winFirst.has(`${d[0].card.join(',')}-${d[0].pileIdx}`));
                    if (trapFirst.length >= 2) {
                        const firstMove = wins[0][0];
                        loadEndgamePuzzle({
                            id: 'custom-' + Date.now(),
                            title: `Zufalls-Endspiel · 4 Züge (${mode === 'cluster' ? 'Cluster' : 'Standard'})`,
                            mode,
                            piles,
                            hand,
                            hint: `Der entscheidende erste Zug ist (${firstMove.card.join(',')}) auf Stapel M${firstMove.pileIdx + 1}.`
                        });
                        return;
                    }
                }
            }
            const fallback = ENDGAME_PUZZLES.find(p => p.mode === mode) || ENDGAME_PUZZLES[0];
            loadEndgamePuzzle(fallback);
        }

        function selectEndgameHandCard(idx) {
            if (endgameState.status !== 'playing' || !endgameState.hand[idx]) return;
            endgameState.selectedHandIdx = (endgameState.selectedHandIdx === idx) ? null : idx;
            playSound('tick');
            renderEndgameUI();
        }

        function playEndgameOnPile(pileIdx) {
            if (endgameState.status !== 'playing' || endgameState.selectedHandIdx === null) return;
            const hIdx = endgameState.selectedHandIdx;
            const card = endgameState.hand[hIdx];
            const mode = endgameState.currentPuzzle.mode;

            if (!canPlayEndgameCard(card, endgameState.piles, pileIdx, mode)) {
                triggerInvalidShake(`eg-pile-${pileIdx}`);
                triggerInvalidShake(`eg-hand-${hIdx}`);
                const fb = document.getElementById('eg-feedback-text');
                if (fb) fb.textContent = mode === 'cluster'
                    ? `Ungültig: (${card.join(',')}) teilt eine Eigenschaft mit einem der anderen beiden Mittelstapel.`
                    : `Ungültig: (${card.join(',')}) hat keine gemeinsame Eigenschaft mit M${pileIdx + 1}.`;
                return;
            }

            const skipFly = Boolean(window._hapticSkipNextFly);
 window._hapticSkipNextFly = false;
 const targetPileEl = document.getElementById(`eg-pile-${pileIdx}`);
 const srcHandEl = document.getElementById(`eg-hand-${hIdx}`);
 const egTone = mode === 'cluster' ? 'purple' : 'cyan';

 const commitEndgameMove = () => {
 endgameState.piles[pileIdx] = card;
 endgameState.hand.splice(hIdx, 1);
 endgameState.selectedHandIdx = null;
 endgameState.movesMade++;

 const fb = document.getElementById('eg-feedback-text');
 if (endgameState.hand.length === 0) {
 endgameState.status = 'won';
 if (typeof stopGameMusic === 'function') stopGameMusic();
 playSound('win');
 if (window.BlinkHaptics) window.BlinkHaptics.burst(document.getElementById(`eg-pile-${pileIdx}`), 'emerald', 26);
 if (ENDGAME_PUZZLES.some(p => p.id === endgameState.currentPuzzle.id)) {
 endgameState.solvedIds.add(endgameState.currentPuzzle.id);
 localStorage.setItem('blink_endgame_solved_v1', JSON.stringify([...endgameState.solvedIds]));
 }
 if (fb) fb.textContent = `Perfekt gelöst! Alle ${endgameState.currentPuzzle.hand.length} Handkarten ohne Deadlock ausgespielt.`;
 showSonnerToast('Endgame-Puzzle gelöst!', 'success');
 } else {
 const anyMoveLeft = endgameState.hand.some(c =>
 endgameState.piles.some((_, pIdx) => canPlayEndgameCard(c, endgameState.piles, pIdx, mode))
 );
 if (!anyMoveLeft) {
 endgameState.status = 'deadlock';
 if (typeof stopGameMusic === 'function') stopGameMusic();
 playSound('error');
 if (fb) fb.textContent = 'Deadlock! Kein legaler Zug mehr möglich — klicke auf „Zurücksetzen“ und probiere eine andere Reihenfolge.';
 } else {
 playSound('play');
 if (fb) fb.textContent = `Zug ${endgameState.movesMade} gespielt (${card.join(',')} → M${pileIdx + 1}). Weiter!`;
 }
 }
 renderEndgameUI();
 };

 if (!skipFly && window.BlinkHaptics && srcHandEl && targetPileEl) {
 window.BlinkHaptics.flyCard(srcHandEl, targetPileEl, commitEndgameMove, { duration: 175, tone: egTone });
 return;
 }
 commitEndgameMove();
}


        function giveEndgameHint() {
            if (!endgameState.currentPuzzle) return;
            playSound('tick');
            const { wins } = analyzeEndgameDFS(endgameState.piles, endgameState.hand, endgameState.currentPuzzle.mode);
            const fb = document.getElementById('eg-feedback-text');
            if (!fb) return;
            if (wins.length > 0 && endgameState.status === 'playing') {
                const nextStep = wins[0][0];
                fb.textContent = `Tipp: Lege (${nextStep.card.join(',')}) auf Stapel M${nextStep.pileIdx + 1}.`;
            } else {
                fb.textContent = `Hinweis: ${endgameState.currentPuzzle.hint} (Klicke ggf. auf Zurücksetzen.)`;
            }
        }

        function renderEndgameUI() {
            const puz = endgameState.currentPuzzle;
            if (!puz) return;
            const isCluster = puz.mode === 'cluster';

            const badge = document.getElementById('eg-mode-badge');
            const title = document.getElementById('eg-title');
            const pill = document.getElementById('eg-moves-pill');
            const ruleEl = document.getElementById('eg-rule-explainer');
            const fbBox = document.getElementById('eg-feedback-box');

            if (badge) {
                badge.textContent = isCluster ? 'Cluster-Regeln · 3 Stapel (d_H = 3)' : 'Standard-Regeln · 2 Stapel (d_H ≤ 2)';
                badge.className = `text-[10.5px] font-bold uppercase tracking-widest mono ${isCluster ? 'text-purple-400' : 'text-cyan-400'}`;
            }
           const totalMoves = puz.hand.length;
            const handHeading = document.getElementById('eg-hand-heading');
            if (handHeading) handHeading.textContent = `Deine ${totalMoves} Endspiel-Karten`;
            if (title) title.textContent = puz.title;
            if (pill) pill.textContent = endgameState.status === 'won' ? `Gelöst · ${totalMoves} / ${totalMoves}` : (endgameState.status === 'deadlock' ? 'Deadlock' : `Zug ${endgameState.movesMade} / ${totalMoves}`);
            if (ruleEl) {
                ruleEl.textContent = isCluster
                    ? 'Im Cluster-Modus darf eine Karte nur auf einen Stapel gelegt werden, wenn sie sich in allen drei Eigenschaften von den beiden anderen Mittelstapeln unterscheidet.'
                    : 'Im Standard-Modus muss die abgelegte Karte in mindestens einer Eigenschaft (Anzahl, Farbe oder Symbol) mit dem Zielstapel übereinstimmen.';
            }
            if (fbBox) {
                fbBox.className = endgameState.status === 'won'
                    ? 'rounded-2xl bg-emerald-500/10 border border-emerald-400/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs'
                    : (endgameState.status === 'deadlock'
                        ? 'rounded-2xl bg-rose-500/10 border border-rose-400/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs'
                        : 'rounded-2xl bg-slate-950/75 border border-white/[0.08] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs');
            }

            const pilesCont = document.getElementById('eg-piles-container');
            if (pilesCont) {
                pilesCont.innerHTML = endgameState.piles.map((card, idx) => `
                    <div class="flex flex-col items-center gap-2">
                        <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mono">Stapel M${idx + 1}</span>
                        <div id="eg-pile-${idx}"
                             onclick="playEndgameOnPile(${idx})"
                             ondragover="onEndgamePileDragOver(event, ${idx})"
                             ondragleave="onEndgamePileDragLeave(event, ${idx})"
                             ondrop="onEndgamePileDrop(event, ${idx})"
                             class="w-[140px] sm:w-[158px] card-63-88 rounded-2xl bg-white border-4 ${endgameState.selectedHandIdx !== null ? 'border-cyan-400/80 hover:scale-[1.03]' : 'border-slate-300 hover:border-slate-400'} shadow-2xl flex flex-col justify-between p-2.5 cursor-pointer transition text-left overflow-hidden">
                            ${renderLargePlayingCardInner(card, false)}
                        </div>
                    </div>
                `).join('');
            }

            const handCont = document.getElementById('eg-hand-container');
            if (handCont) {
                if (endgameState.hand.length === 0) {
                    handCont.innerHTML = `<div class="w-full py-10 text-center text-xs mono text-emerald-300 rounded-2xl border border-dashed border-emerald-400/30 bg-emerald-500/5">Hand komplett geleert — perfektes Endspiel!</div>`;
                } else {
                    handCont.innerHTML = endgameState.hand.map((card, idx) => {
                        const isSel = endgameState.selectedHandIdx === idx;
                        return `
                            <div id="eg-hand-${idx}"
                                 draggable="true"
                                 ondragstart="onEndgameHandDragStart(event, ${idx})"
                                 ondragend="onEndgameHandDragEnd(event, ${idx})"
                                 onclick="selectEndgameHandCard(${idx})"
                                 class="game-card flex-1 min-w-0 max-w-[126px] card-63-88 rounded-2xl bg-white border-4 ${isSel ? 'border-cyan-400 selected-card' : 'border-slate-300 hover:border-slate-400'} shadow-xl flex flex-col justify-between p-1.5 sm:p-2 text-left relative overflow-hidden">
                                ${renderLargePlayingCardInner(card, true)}
                            </div>
                        `;
                    }).join('');
                }
            }

            const swNorm = document.getElementById('eg-switch-normal');
            const swClu = document.getElementById('eg-switch-cluster');
            if (swNorm && swClu) {
                const modeIsClu = endgameState.activeMode === 'cluster';
                swNorm.className = !modeIsClu
                    ? 'py-1.5 rounded-full text-xs font-bold bg-white text-slate-950 transition'
                    : 'py-1.5 rounded-full text-xs font-semibold text-slate-400 hover:text-white transition';
                swClu.className = modeIsClu
                    ? 'py-1.5 rounded-full text-xs font-bold bg-white text-slate-950 transition'
                    : 'py-1.5 rounded-full text-xs font-semibold text-slate-400 hover:text-white transition';
            }

            const modePuzzles = ENDGAME_PUZZLES.filter(item => item.mode === endgameState.activeMode);
            const solvedInMode = modePuzzles.filter(item => endgameState.solvedIds.has(item.id)).length;
            const listEl = document.getElementById('eg-puzzle-list');
            const solvedEl = document.getElementById('eg-solved-counter');
            if (solvedEl) solvedEl.textContent = `${solvedInMode} / ${modePuzzles.length} gelöst`;
            if (listEl) {
                listEl.innerHTML = modePuzzles.map(item => {
                    const globalIdx = ENDGAME_PUZZLES.indexOf(item);
                    const active = item.id === puz.id;
                    const done = endgameState.solvedIds.has(item.id);
                    const activeCls = endgameState.activeMode === 'cluster'
                        ? 'border-purple-400/60 bg-purple-500/10 text-white'
                        : 'border-cyan-400/60 bg-cyan-500/10 text-white';
                    return `
                        <button onclick="playSound('tick'); loadEndgamePuzzle(${globalIdx})" class="w-full text-left px-3.5 py-2.5 rounded-xl border transition flex items-center justify-between gap-2 ${active ? activeCls : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.06] text-slate-300'}">
                            <div class="min-w-0">
                                <div class="text-xs font-bold truncate">${item.title}</div>
                                <div class="text-[10px] mono text-slate-500">${item.diffLabel}</div>
                            </div>
                            <span class="w-2 h-2 rounded-full shrink-0 ${done ? 'bg-emerald-400' : (active ? (endgameState.activeMode === 'cluster' ? 'bg-purple-400' : 'bg-cyan-400') : 'bg-slate-700')}"></span>
                        </button>
                    `;
                }).join('');
            }
        }

       // --- D) MONTE-CARLO-SIMULATIONSLABOR (LIVE-KONVERGENZ & INTERAKTIVE PARAMETER) ---
        const mcState = {
            experiment: 'deadlock',
            trials: 1000,
            deadlockHandSize: 3,   // 1 .. 6 Handkarten pro Spieler
            deadlockPileDist: 'any', // 'any' | 1 | 2 | 3
            clusterK: 5,           // 3 .. 15 gezogene Karten
            runId: 0,
            rafId: null
        };

        const CARDS_180 = [];
        for (let x = 0; x < 5; x++) {
            for (let y = 0; y < 6; y++) {
                for (let z = 0; z < 6; z++) {
                    CARDS_180.push([x, y, z]);
                }
            }
        }

        let mcDistLookup180 = null;
        let mcDistLookup125 = null;

        function ensureMcDistLookups() {
            const build = (deck) => deck.map((c1, i) => {
                const map = { 1: [], 2: [], 3: [] };
                for (let j = 0; j < deck.length; j++) {
                    if (i === j) continue;
                    const d = hammingDistance(c1, deck[j]);
                    if (map[d]) map[d].push(j);
                }
                return map;
            });
            if (!mcDistLookup180 && CARDS_180.length > 0) mcDistLookup180 = build(CARDS_180);
            if (!mcDistLookup125 && CARDS_125.length > 0) mcDistLookup125 = build(CARDS_125);
        }

        function sampleDistinctCards(deck, k) {
            const n = deck.length;
            const out = [];
            const used = [];
            while (out.length < k) {
                const idx = Math.floor(Math.random() * n);
                if (!used.includes(idx)) {
                    used.push(idx);
                    out.push(deck[idx]);
                }
            }
            return out;
        }

        function samplePilesAndHands(deck, lookup, pileDist, totalHandCards) {
            const n = deck.length;
            const i1 = Math.floor(Math.random() * n);
            let i2;
            if (pileDist !== 'any' && lookup && lookup[i1] && lookup[i1][pileDist].length > 0) {
                const cands = lookup[i1][pileDist];
                i2 = cands[Math.floor(Math.random() * cands.length)];
            } else {
                do { i2 = Math.floor(Math.random() * n); } while (i2 === i1);
            }
            const used = [i1, i2];
            const hand = [];
            while (hand.length < totalHandCards) {
                const idx = Math.floor(Math.random() * n);
                if (!used.includes(idx)) {
                    used.push(idx);
                    hand.push(deck[idx]);
                }
            }
            return { p1: deck[i1], p2: deck[i2], hand };
        }

        function findClusterInCardsFast(cards, checkStrict = true) {
            const n = cards.length;
            if (n < 5) return { hasAny: false, hasStrict: false };
            let hasAny = false;
            let hasStrict = false;
            const chosen = [];
            function bt(start, xm, ym, zm) {
                if (chosen.length === 5) {
                    hasAny = true;
                    if (checkStrict && isStrictCluster5(chosen)) hasStrict = true;
                    return;
                }
                if (hasAny && (!checkStrict || hasStrict)) return;
                for (let i = start; i <= n - (5 - chosen.length); i++) {
                    const c = cards[i];
                    const bx = 1 << c[0], by = 1 << c[1], bz = 1 << c[2];
                    if ((xm & bx) || (ym & by) || (zm & bz)) continue;
                    chosen.push(c);
                    bt(i + 1, xm | bx, ym | by, zm | bz);
                    chosen.pop();
                    if (hasAny && (!checkStrict || hasStrict)) return;
                }
            }
            bt(0, 0, 0, 0);
            return { hasAny, hasStrict };
        }

        function calcMcDeadlockTheory180(h, pDist) {
            const denom = nCr(178, h);
            if (!denom) return 0;
            const pD1 = (4 * nCr(75, h) + 10 * nCr(80, h)) / (14 * denom);
            const pD2 = (40 * nCr(60, h) + 25 * nCr(64, h)) / (65 * denom);
            const pD3 = nCr(48, h) / denom;
            if (pDist === 1) return pD1 * 100;
            if (pDist === 2) return pD2 * 100;
            if (pDist === 3) return pD3 * 100;
            return ((14 * pD1 + 65 * pD2 + 100 * pD3) / 179) * 100;
        }

        function calcMcDeadlockTheoryClu125(h) {
            const denom = nCr(122, h);
            return denom ? (nCr(60, h) / denom) * 100 : 0;
        }

        function calcMcSktTheory(deckSize, k) {
            if (k < 3) return 0;
            const is180 = deckSize === 180;
            const T3 = is180 ? 144000 : 36000;
            const mu = T3 * (nCr(k, 3) / nCr(deckSize, 3));
            if (k === 3) return mu * 100;

            // Exakte Anzahlen geordneter Paare verschiedener SKTs nach Vereinigungsgröße (4, 5, 6)
            const M4 = is180 ? 20304000 : 2808000;
            const M5 = is180 ? 995760000 : 87588000;
            const K4 = is180 ? 648000 : 72000;

            // k = 4: 100 % exakte Inklusion-Exklusion
            if (k === 4) {
                const denom4 = nCr(deckSize, 4);
                const S2 = (M4 / 2) / denom4;
                const S3minusS4 = (3 * K4) / denom4;
                return Math.min(100, Math.max(0, (mu - S2 + S3minusS4) * 100));
            }

            // k >= 5: Exaktes 2. Moment E[X(X-1)] -> überlappungskorrigierte Negativ-Binomial-Formel
            const M6 = Math.max(0, T3 * (T3 - 1) - M4 - M5);
            const exx1 = M4 * (nCr(k, 4) / nCr(deckSize, 4))
                       + M5 * (nCr(k, 5) / nCr(deckSize, 5))
                       + (k >= 6 ? M6 * (nCr(k, 6) / nCr(deckSize, 6)) : 0);
            const variance = exx1 + mu - mu * mu;

            if (variance > mu + 1e-9) {
                const r = (mu * mu) / (variance - mu);
                return Math.min(100, (1 - Math.pow(mu / variance, r)) * 100);
            }
            return Math.min(100, (1 - Math.exp(-mu)) * 100);
        }

        function calcMcClusterTheory(deckSize, k) {
            if (k < 5) return 0;
            const is180 = deckSize === 180;
            const T5 = is180 ? 518400 : 14400;
            const mu = T5 * (nCr(k, 5) / nCr(deckSize, 5));
            if (k === 5) return mu * 100;

            // Exakte geordnete Paar-Überlappungen (4 bzw. 3 gemeinsame Karten)
            const M6 = is180 ? 7776000 : 0;
            const M7 = is180 ? 150336000 : 432000;
            const M8 = is180 ? 0 : 3744000;
            const Mrest = Math.max(0, T5 * (T5 - 1) - M6 - M7 - M8);

            const exx1 = (k >= 6 ? M6 * (nCr(k, 6) / nCr(deckSize, 6)) : 0)
                       + (k >= 7 ? M7 * (nCr(k, 7) / nCr(deckSize, 7)) : 0)
                       + (k >= 8 ? M8 * (nCr(k, 8) / nCr(deckSize, 8)) : 0)
                       + (k >= 10 ? Mrest * (nCr(k, 10) / nCr(deckSize, 10)) : 0);
            const variance = exx1 + mu - mu * mu;

            if (variance > mu + 1e-9) {
                const r = (mu * mu) / (variance - mu);
                return Math.min(100, (1 - Math.pow(mu / variance, r)) * 100);
            }
            return Math.min(100, (1 - Math.exp(-mu)) * 100);
        }

        function syncMcParamsUI() {
            const dlBox = document.getElementById('mc-params-deadlock');
            const cluBox = document.getElementById('mc-params-cluster');
            const nBlock = document.getElementById('mc-n-block');
            const hasExtraParams = mcState.experiment !== 'verhoer';

            if (dlBox) dlBox.classList.toggle('hidden', mcState.experiment !== 'deadlock');
            if (cluBox) cluBox.classList.toggle('hidden', mcState.experiment !== 'cluster');
            if (nBlock) {
                nBlock.className = hasExtraParams
                    ? 'space-y-2 pt-3 border-t border-white/[0.07]'
                    : 'space-y-2';
            }

            const hVal = document.getElementById('mc-dl-hand-val');
            const hSld = document.getElementById('mc-dl-hand-slider');
            if (hVal) hVal.textContent = `${mcState.deadlockHandSize} ${mcState.deadlockHandSize === 1 ? 'Karte' : 'Karten'}`;
            if (hSld) hSld.value = mcState.deadlockHandSize;

            ['any', 1, 2, 3].forEach(d => {
                const btn = document.getElementById(`mc-dist-${d}`);
                if (!btn) return;
                const active = mcState.deadlockPileDist === d;
                btn.className = active
                    ? 'py-1.5 rounded-xl text-[11px] mono font-bold bg-white text-slate-950 transition'
                    : 'py-1.5 rounded-xl text-[11px] mono font-semibold border border-white/10 bg-white/[0.03] text-slate-300 hover:text-white transition';
            });

            const kVal = document.getElementById('mc-clu-k-val');
            const kSld = document.getElementById('mc-clu-k-slider');
            if (kVal) kVal.textContent = `${mcState.clusterK} Karten`;
            if (kSld) kSld.value = mcState.clusterK;
        }

        function setMcDeadlockHandSize(val) {
            mcState.deadlockHandSize = Math.max(1, Math.min(6, parseInt(val, 10) || 3));
            syncMcParamsUI();
            runMonteCarloSim();
        }

        function setMcDeadlockPileDist(dist) {
            mcState.deadlockPileDist = dist;
            playSound('tick');
            syncMcParamsUI();
            runMonteCarloSim();
        }

        function setMcClusterK(val) {
            mcState.clusterK = Math.max(3, Math.min(15, parseInt(val, 10) || 5));
            syncMcParamsUI();
            runMonteCarloSim();
        }

        function selectMcExperiment(expId) {
            mcState.experiment = expId;
            playSound('tick');
            ['deadlock', 'verhoer', 'cluster'].forEach(id => {
                const btn = document.getElementById(`mc-exp-${id}`);
                if (!btn) return;
                btn.className = id === expId
                    ? 'w-full text-left p-3.5 rounded-2xl border border-cyan-400/50 bg-cyan-500/10 transition space-y-1'
                    : 'w-full text-left p-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] transition space-y-1';
            });
            syncMcParamsUI();
            runMonteCarloSim();
        }

        const MC_MAX_TRIALS = 10000;

        function clampMcTrials(rawVal) {
            const parsed = parseInt(rawVal, 10);
            if (isNaN(parsed)) return 10;
            return Math.max(1, Math.min(MC_MAX_TRIALS, parsed));
        }

        function mcSliderPosToTrials(pos) {
            const p = Math.max(0, Math.min(1000, parseFloat(pos) || 0));
            return Math.max(1, Math.min(MC_MAX_TRIALS, Math.round(Math.pow(10, (p / 1000) * 4))));
        }

        function mcTrialsToSliderPos(n) {
            const clamped = Math.max(1, Math.min(MC_MAX_TRIALS, n));
            return Math.round((Math.log10(clamped) / 4) * 1000);
        }

        function syncMcTrialsControls(n) {
            const inp = document.getElementById('mc-custom-input');
            const sld = document.getElementById('mc-custom-slider');
            if (inp && document.activeElement !== inp) inp.value = n;
            if (sld) sld.value = mcTrialsToSliderPos(n);
        }

        function previewMcTrials(rawVal) {
            const parsed = parseInt(rawVal, 10);
            if (isNaN(parsed)) return;
            const n = Math.max(1, Math.min(MC_MAX_TRIALS, parsed));
            mcState.trials = n;
            syncMcTrialsControls(n);
        }

        function previewMcTrialsFromSlider(pos) {
            const n = mcSliderPosToTrials(pos);
            mcState.trials = n;
            const inp = document.getElementById('mc-custom-input');
            if (inp) inp.value = n;
        }

        function setMcTrialsFromSlider(pos) {
            setMcTrials(mcSliderPosToTrials(pos));
        }

        function setMcTrials(rawVal) {
            const n = clampMcTrials(rawVal);
            mcState.trials = n;
            playSound('tick');
            const inp = document.getElementById('mc-custom-input');
            if (inp) inp.value = n;
            syncMcTrialsControls(n);
            runMonteCarloSim();
        }

       function renderMcConvergenceSVG(series, done, totalN, isFinished) {
            window._mcConvSnapshot = { series, done, totalN, isFinished };
            const svg = document.getElementById('mc-convergence-svg');
            const legendEl = document.getElementById('mc-conv-legend');
            const statusEl = document.getElementById('mc-conv-status');
            if (!svg) return;

            if (statusEl) {
                statusEl.textContent = isFinished
                    ? `Fertig · ${done.toLocaleString('de-DE')} Durchläufe`
                    : `Läuft... ${done.toLocaleString('de-DE')} / ${totalN.toLocaleString('de-DE')}`;
            }

            const W = 640, H = 220, padL = 50, padR = 16, padT = 18, padB = 40;
            const plotW = W - padL - padR;
            const plotH = H - padT - padB;

            let peakVal = 20;
            series.forEach(s => {
                if (typeof s.theory === 'number') peakVal = Math.max(peakVal, s.theory * 1.15);
                s.points.forEach(pt => { if (pt.y > peakVal) peakVal = pt.y; });
            });
            const maxY = peakVal <= 25 ? 25 : (peakVal <= 50 ? 50 : (peakVal <= 75 ? 75 : 100));

            const xOf = (n) => totalN <= 1 ? padL + plotW : padL + ((n - 1) / (totalN - 1)) * plotW;
            const yOf = (v) => padT + plotH - (Math.min(maxY, Math.max(0, v)) / maxY) * plotH;

            let html = '';

            // Achsen-Titel (Y & X)
            html += `<text x="${padL}" y="10" fill="#94a3b8" font-size="9" class="mono">Anteil in %</text>`;
            html += `<text x="${padL + plotW / 2}" y="${H - 4}" text-anchor="middle" fill="#64748b" font-size="9" class="mono">Anzahl der Durchläufe (n)</text>`;

            // Horizontale Hilfslinien & Y-Achse
            const ySteps = [0, maxY * 0.25, maxY * 0.5, maxY * 0.75, maxY];
            ySteps.forEach(val => {
                const yy = yOf(val);
                html += `<line x1="${padL}" y1="${yy.toFixed(1)}" x2="${W - padR}" y2="${yy.toFixed(1)}" stroke="rgba(148,163,184,0.13)" stroke-width="1"/>`;
                html += `<text x="${padL - 8}" y="${(yy + 3).toFixed(1)}" text-anchor="end" fill="#64748b" font-size="9.5" class="mono">${Math.round(val)}%</text>`;
            });

            // X-Achsen-Ticks
            const xTicks = totalN <= 10
                ? [1, Math.max(1, Math.round(totalN / 2)), totalN]
                : [1, Math.round(totalN * 0.25), Math.round(totalN * 0.5), Math.round(totalN * 0.75), totalN];
            const uniqTicks = [...new Set(xTicks)];
            uniqTicks.forEach(t => {
                const xx = xOf(t);
                html += `<line x1="${xx.toFixed(1)}" y1="${padT}" x2="${xx.toFixed(1)}" y2="${padT + plotH}" stroke="rgba(148,163,184,0.08)" stroke-width="1"/>`;
                html += `<text x="${xx.toFixed(1)}" y="${padT + plotH + 15}" text-anchor="middle" fill="#64748b" font-size="9.5" class="mono">${t.toLocaleString('de-DE')}</text>`;
            });

            // Gestrichelte Erwartungswert-Linien
            series.forEach(s => {
                if (typeof s.theory === 'number') {
                    const ty = yOf(s.theory);
                    html += `<line x1="${padL}" y1="${ty.toFixed(1)}" x2="${W - padR}" y2="${ty.toFixed(1)}" stroke="${s.color}" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.75"><title>Erwartungswert ${s.label}: ${s.theory.toFixed(2)}%</title></line>`;
                }
            });

            // Konvergenz-Kurven
            series.forEach(s => {
                if (s.points.length === 0) return;
                const d = s.points.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${xOf(pt.n).toFixed(1)} ${yOf(pt.y).toFixed(1)}`).join(' ');
                html += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"/>`;
                const last = s.points[s.points.length - 1];
                html += `<circle cx="${xOf(last.n).toFixed(1)}" cy="${yOf(last.y).toFixed(1)}" r="4" fill="#ffffff" stroke="${s.color}" stroke-width="2"/>`;
            });

            svg.innerHTML = html;

            if (legendEl) {
                const itemsHtml = series.map(s => {
                    const cur = s.points.length ? s.points[s.points.length - 1].y.toFixed(2) : '0.00';
                    return `
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.08]">
                            <span class="w-2 h-2 rounded-full shrink-0" style="background:${s.color}"></span>
                            <span class="text-slate-300">${s.label}: <strong class="text-white">${cur}%</strong></span>
                        </span>
                    `;
                }).join('');
                const dashLegend = `
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.02] border border-white/[0.06] text-slate-400">
                        <span class="w-4 border-t-2 border-dashed border-slate-400"></span>
                        <span>Erwartungswert</span>
                    </span>
                `;
                legendEl.innerHTML = itemsHtml + dashLegend;
            }
        }

        function runMonteCarloSim() {
            syncMcParamsUI();
            ensureMcDistLookups();

            if (mcState.rafId) {
                cancelAnimationFrame(mcState.rafId);
                mcState.rafId = null;
            }
            const thisRunId = ++mcState.runId;
            const t0 = performance.now();
            const N = mcState.trials;
            const exp = mcState.experiment;
            const h = mcState.deadlockHandSize;
            const pDist = mcState.deadlockPileDist;
            const kClu = mcState.clusterK;

         // Zähler je Experiment
            const counts = {
                std180_1p: 0, std180_2p: 0, std125_1p: 0, std125_2p: 0, clu125_1p: 0, clu125_2p: 0,
                d1_125: 0, d2_125: 0, d3_125: 0, d1_180: 0, d2_180: 0, d3_180: 0,
                trioInK: 0, clusterInK: 0, strictInK: 0,
                trioInK_180: 0, clusterInK_180: 0
            };

            // Kurven-Serien für das Live-Konvergenzdiagramm (inkl. Erwartungswert)
            let series = [];
            if (exp === 'deadlock') {
                const dLbl = pDist === 'any' ? 'Zufall' : `d=${pDist}`;
                series = [
                    { key: 'std180_1p', label: `Standard 180er (${h}K, ${dLbl})`, color: '#22d3ee', theory: calcMcDeadlockTheory180(h, pDist), points: [] },
                    { key: 'clu125_1p', label: `Cluster 125er (${h}K)`, color: '#a855f7', theory: calcMcDeadlockTheoryClu125(h), points: [] }
                ];
            } else if (exp === 'verhoer') {
                series = [
                    { key: 'd1_125', label: 'Verschärftes Verhör', color: '#fb7185', theory: (12 / 124) * 100, points: [] },
                    { key: 'd2_125', label: 'Standard-Verhör', color: '#fbbf24', theory: (48 / 124) * 100, points: [] },
                    { key: 'd3_125', label: 'Stiller Abwurf', color: '#22d3ee', theory: (64 / 124) * 100, points: [] }
                ];
            } else {
                series = [
                    { key: 'trioInK', label: `SKT 125er (k=${kClu})`, color: '#34d399', theory: calcMcSktTheory(125, kClu), points: [] },
                    { key: 'trioInK_180', label: `SKT 180er (k=${kClu})`, color: '#22d3ee', theory: calcMcSktTheory(180, kClu), points: [] }
                ];
                if (kClu >= 5) {
                    series.push(
                        { key: 'clusterInK', label: `Cluster 125er (k=${kClu})`, color: '#a855f7', theory: calcMcClusterTheory(125, kClu), points: [] },
                        { key: 'clusterInK_180', label: `Cluster 180er (k=${kClu})`, color: '#f472b6', theory: calcMcClusterTheory(180, kClu), points: [] }
                    );
                }
            }

            // Messpunkte für die Kurve (dicht am Anfang, insgesamt max. ~140 Punkte)
            const sampleStep = Math.max(1, Math.floor(N / 120));
            const targetFrames = N <= 25 ? N : 36;
            const batchSize = Math.max(1, Math.ceil(N / targetFrames));
            let done = 0;

            const buildDisplayData = (curN) => {
                const pct = (v) => curN > 0 ? (v / curN) * 100 : 0;
                const fmt = (v) => v.toLocaleString('de-DE');
                if (exp === 'deadlock') {
                    return {
                        title: `Deadlock-Wahrscheinlichkeit`,
                        subtitle: `Anteil der ${fmt(curN)} Zufallssituationen, in denen keine Handkarte legal ablegbar ist.`,
                        groups: [
                            {
                                heading: 'Grundlegendes Modell (180 Karten)',
                                badge: 'Standard-Regeln',
                                accent: 'text-cyan-300',
                                bars: [
                                    { title: 'Standard · 1 Spieler blockiert', count: counts.std180_1p, total: curN, pct: pct(counts.std180_1p), color: 'bg-cyan-400' },
                                    { title: 'Standard · beide Spieler blockiert', count: counts.std180_2p, total: curN, pct: pct(counts.std180_2p), color: 'bg-cyan-300/75' }
                                ]
                            },
                            {
                                heading: 'Erweitertes Modell (125 Karten)',
                                badge: 'Standard & Cluster',
                                accent: 'text-purple-300',
                                bars: [
                                    { title: 'Standard · 1 Spieler blockiert', count: counts.std125_1p, total: curN, pct: pct(counts.std125_1p), color: 'bg-sky-400' },
                                    { title: 'Standard · beide Spieler blockiert', count: counts.std125_2p, total: curN, pct: pct(counts.std125_2p), color: 'bg-sky-300/75' },
                                    { title: 'Cluster · 1 Spieler blockiert', count: counts.clu125_1p, total: curN, pct: pct(counts.clu125_1p), color: 'bg-purple-400' },
                                    { title: 'Cluster · beide Spieler blockiert', count: counts.clu125_2p, total: curN, pct: pct(counts.clu125_2p), color: 'bg-emerald-400' }
                                ]
                            }
                        ]
                    };
                } else if (exp === 'verhoer') {
                    return {
                        title: 'Verhör-Trigger beim Abwurf',
                        subtitle: `Wie oft zwei zufällige Karten genau 2, 1 oder 0 Eigenschaften teilen.`,
                        groups: [
                            {
                                heading: 'Erweitertes Modell (125 Karten)',
                                badge: 'Das Verhör',
                                accent: 'text-cyan-300',
                                bars: [
                                    { title: 'Verschärftes Verhör (2 Gemeinsamkeiten)', count: counts.d1_125, total: curN, pct: pct(counts.d1_125), color: 'bg-rose-400' },
                                    { title: 'Standard-Verhör (1 Gemeinsamkeit)', count: counts.d2_125, total: curN, pct: pct(counts.d2_125), color: 'bg-amber-400' },
                                    { title: 'Stiller Abwurf (0 Gemeinsamkeiten)', count: counts.d3_125, total: curN, pct: pct(counts.d3_125), color: 'bg-cyan-400' }
                                ]
                            },
                            {
                                heading: 'Grundlegendes Modell (180 Karten)',
                                badge: 'Vergleich',
                                accent: 'text-slate-300',
                                bars: [
                                    { title: '2 gleiche Eigenschaften', count: counts.d1_180, total: curN, pct: pct(counts.d1_180), color: 'bg-rose-400/75' },
                                    { title: '1 gleiche Eigenschaft', count: counts.d2_180, total: curN, pct: pct(counts.d2_180), color: 'bg-amber-400/75' },
                                    { title: '0 Gemeinsamkeiten', count: counts.d3_180, total: curN, pct: pct(counts.d3_180), color: 'bg-cyan-400/75' }
                                ]
                            }
                        ]
                    };
                } else {
                    return {
                        title: `SKTs & Cluster (Handgröße k = ${kClu})`,
                        subtitle: `Anteil der ${fmt(curN)} zufälligen ${kClu}-Karten-Hände mit mindestens einem gültigen Muster.`,
                        groups: [
                            {
                                heading: 'Erweitertes Modell (125 Karten)',
                                badge: `${kClu} Karten`,
                                accent: 'text-purple-300',
                                bars: [
                                    { title: `Mindestens ein SKT in ${kClu} Karten`, count: counts.trioInK, total: curN, pct: pct(counts.trioInK), color: 'bg-emerald-400' },
                                    { title: `Mindestens ein Cluster in ${kClu} Karten`, count: counts.clusterInK, total: curN, pct: pct(counts.clusterInK), color: 'bg-purple-400' },
                                    { title: `Davon strenges 5er-Cluster (affine Gerade)`, count: counts.strictInK, total: curN, pct: pct(counts.strictInK), color: 'bg-amber-400' }
                                ]
                            },
                            {
                                heading: 'Grundlegendes Modell (180 Karten)',
                                badge: `${kClu} Karten`,
                                accent: 'text-cyan-300',
                                bars: [
                                    { title: `Mindestens ein SKT in ${kClu} Karten`, count: counts.trioInK_180, total: curN, pct: pct(counts.trioInK_180), color: 'bg-cyan-400' },
                                    { title: `Mindestens ein 5er-Cluster in ${kClu} Karten`, count: counts.clusterInK_180, total: curN, pct: pct(counts.clusterInK_180), color: 'bg-pink-400' },
                                    { title: `Strenges 5er-Cluster (affine Gerade)`, infoOnly: 'Im 180er-Modell nicht definiert (kein Körper)' }
                                ]
                            }
                        ]
                    };
                }
            };

            const stepChunk = () => {
                if (thisRunId !== mcState.runId) return;
                const chunkStart = performance.now();
                const target = Math.min(N, done + batchSize);

                while (done < target) {
                    if (exp === 'deadlock') {
                        // Grundlegendes 180er-Modell (5×6×6)
                        const s180 = samplePilesAndHands(CARDS_180, mcDistLookup180, pDist, h * 2);
                        let ok1 = false;
                        for (let j = 0; j < h; j++) {
                            if (hammingDistance(s180.hand[j], s180.p1) <= 2 || hammingDistance(s180.hand[j], s180.p2) <= 2) { ok1 = true; break; }
                        }
                        let ok2 = ok1;
                        if (!ok2) {
                            for (let j = h; j < h * 2; j++) {
                                if (hammingDistance(s180.hand[j], s180.p1) <= 2 || hammingDistance(s180.hand[j], s180.p2) <= 2) { ok2 = true; break; }
                            }
                        }
                        if (!ok1) counts.std180_1p++;
                        if (!ok2) counts.std180_2p++;

                        // Standard 125er-Modell (1 Spieler & beide Spieler)
                        const s125 = samplePilesAndHands(CARDS_125, mcDistLookup125, pDist, h * 2);
                        let ok125_1 = false;
                        for (let j = 0; j < h; j++) {
                            if (hammingDistance(s125.hand[j], s125.p1) <= 2 || hammingDistance(s125.hand[j], s125.p2) <= 2) { ok125_1 = true; break; }
                        }
                        let ok125_2 = ok125_1;
                        if (!ok125_2) {
                            for (let j = h; j < h * 2; j++) {
                                if (hammingDistance(s125.hand[j], s125.p1) <= 2 || hammingDistance(s125.hand[j], s125.p2) <= 2) { ok125_2 = true; break; }
                            }
                        }
                        if (!ok125_1) counts.std125_1p++;
                        if (!ok125_2) counts.std125_2p++;

                        // Cluster 125er Deck (gültiges SKT aus 3 Stapeln)
                        const c1 = CARDS_125[Math.floor(Math.random() * 125)];
                        let c2;
                        do { c2 = CARDS_125[Math.floor(Math.random() * 125)]; } while (!areCardsCompletelyDifferent(c1, c2));
                        let c3;
                        do { c3 = CARDS_125[Math.floor(Math.random() * 125)]; } while (!areCardsCompletelyDifferent(c1, c3) || !areCardsCompletelyDifferent(c2, c3));
                        const usedKeys = new Set([keyOf(...c1), keyOf(...c2), keyOf(...c3)]);
                        const cHands = [];
                        while (cHands.length < h * 2) {
                            const cand = CARDS_125[Math.floor(Math.random() * 125)];
                            const k = keyOf(...cand);
                            if (!usedKeys.has(k)) { usedKeys.add(k); cHands.push(cand); }
                        }
                        const canClu = (card) =>
                            (areCardsCompletelyDifferent(card, c2) && areCardsCompletelyDifferent(card, c3)) ||
                            (areCardsCompletelyDifferent(card, c1) && areCardsCompletelyDifferent(card, c3)) ||
                            (areCardsCompletelyDifferent(card, c1) && areCardsCompletelyDifferent(card, c2));
                        let cOk1 = false;
                        for (let j = 0; j < h; j++) if (canClu(cHands[j])) { cOk1 = true; break; }
                        let cOk2 = cOk1;
                        if (!cOk2) {
                            for (let j = h; j < h * 2; j++) if (canClu(cHands[j])) { cOk2 = true; break; }
                        }
                        if (!cOk1) counts.clu125_1p++;
                        if (!cOk2) counts.clu125_2p++;

                    } else if (exp === 'verhoer') {
                        const p125 = sampleDistinctCards(CARDS_125, 2);
                        const h125 = hammingDistance(p125[0], p125[1]);
                        if (h125 === 1) counts.d1_125++; else if (h125 === 2) counts.d2_125++; else counts.d3_125++;

                        const p180 = sampleDistinctCards(CARDS_180, 2);
                        const h180 = hammingDistance(p180[0], p180[1]);
                        if (h180 === 1) counts.d1_180++; else if (h180 === 2) counts.d2_180++; else counts.d3_180++;

                    } else {
                        const handK125 = sampleDistinctCards(CARDS_125, kClu);
                        if (findValidTrioIndices(handK125) !== null) counts.trioInK++;
                        if (kClu >= 5) {
                            const res = findClusterInCardsFast(handK125, true);
                            if (res.hasAny) counts.clusterInK++;
                            if (res.hasStrict) counts.strictInK++;
                        }

                        const handK180 = sampleDistinctCards(CARDS_180, kClu);
                        if (findValidTrioIndices(handK180) !== null) counts.trioInK_180++;
                        if (kClu >= 5) {
                            const res180 = findClusterInCardsFast(handK180, false);
                            if (res180.hasAny) counts.clusterInK_180++;
                        }
                    }

                    done++;
                    if (done <= 24 || done % sampleStep === 0 || done === N) {
                        series.forEach(s => {
                            s.points.push({ n: done, y: (counts[s.key] / done) * 100 });
                        });
                    }
                    // Frame-Budget (~16 ms), damit auch große N flüssig bleiben
                    if (performance.now() - chunkStart > 16) break;
                }

                const isFinished = done >= N;
                const elapsedMs = Math.max(1, Math.round(performance.now() - t0));
                const display = buildDisplayData(done);

                renderMcResults(display, done, elapsedMs, isFinished);
                renderMcConvergenceSVG(series, done, N, isFinished);

                if (!isFinished) {
                    mcState.rafId = requestAnimationFrame(stepChunk);
                } else {
                    mcState.rafId = null;
                    safeRenderMathJax();
                }
            };

            mcState.rafId = requestAnimationFrame(stepChunk);
        }

       function renderMcResults(display, N, elapsedMs, isFinished = true) {
            const titleEl = document.getElementById('mc-result-title');
            const subEl = document.getElementById('mc-result-subtitle');
            const rtEl = document.getElementById('mc-runtime-pill');
            const barsEl = document.getElementById('mc-bars-container');

            if (titleEl) titleEl.innerHTML = display.title;
            if (subEl) subEl.textContent = display.subtitle || '';
            if (rtEl) rtEl.textContent = isFinished
                ? `N = ${N.toLocaleString('de-DE')} · ${elapsedMs} ms`
                : `Läuft: ${N.toLocaleString('de-DE')} / ${mcState.trials.toLocaleString('de-DE')}`;
            if (barsEl) {
                const groups = display.groups || [{ heading: '', badge: '', accent: 'text-slate-300', bars: display.bars || [] }];
                barsEl.innerHTML = groups.map(g => `
                    <div class="rounded-xl bg-white/[0.02] border border-white/[0.07] p-3.5 space-y-3">
                        ${g.heading ? `
                            <div class="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
                                <span class="text-[11px] font-bold uppercase tracking-wider mono ${g.accent || 'text-slate-300'}">${g.heading}</span>
                                ${g.badge ? `<span class="text-[10px] mono text-slate-500">${g.badge}</span>` : ''}
                            </div>
                        ` : ''}
                        <div class="space-y-3">
                            ${g.bars.map(b => b.infoOnly ? `
                                <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 pt-1 opacity-60">
                                    <span class="text-xs font-medium text-slate-400">${b.title}</span>
                                    <span class="text-[11px] mono text-slate-500">${b.infoOnly}</span>
                                </div>
                            ` : `
                                <div class="space-y-1.5">
                                    <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                                        <span class="text-xs sm:text-sm font-semibold text-slate-200 min-w-0">${b.title}</span>
                                        <div class="mono text-xs shrink-0 flex items-center gap-2">
                                            <span class="text-slate-400">${b.count.toLocaleString('de-DE')} / ${b.total.toLocaleString('de-DE')}</span>
                                            <strong class="text-white text-sm w-16 text-right">${b.pct.toFixed(2)}%</strong>
                                        </div>
                                    </div>
                                    <div class="w-full h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                                        <div class="h-full rounded-full ${b.color} transition-all duration-150" style="width: ${Math.max(1.2, Math.min(100, b.pct))}%"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('');
            }
        }
window.onload = function () {
            initNavigationAndModal();
            setupDraggableResizer('split-resizer', 'basic-split-workspace', 'split-drag-badge', (pct) => setSplitPercentage(pct));
            
            // Gespeichertes Design wiederherstellen (falls vorhanden)
            const savedTheme = localStorage.getItem('blink_theme');
            applyTheme(savedTheme || 'onyx-oled');

            updateGlobalLayerButtons();
            updatePhysicalCardPreview(0, 0, 0);
            set2DSubView('ring');
            refreshAll();
            applyRouteFromHash(true);
let heroSpinCount = 0;
        let heroLastClickTime = 0;
        let heroTurboLevel = 0;
        let heroFlipTimers = [];
        let heroBadgeTimer = null;

        window.shuffleHeroCluster = function(isInitial = false) {
            const sides = ['left', 'center', 'right'];
            const badge = document.getElementById('hero-cluster-badge');

            if (isInitial) {
                const startTrio = [[3, 1, 1], [0, 4, 0], [2, 3, 3]];
                sides.forEach((side, i) => {
                    const frontEl = document.getElementById(`hero-card-${side}-front`);
                    if (frontEl) frontEl.innerHTML = renderLargePlayingCardInner(startTrio[i], true);
                });
                return;
            }

            // Laufende Verzögerungen abbrechen, damit schnelles Klicken nie hakt
            heroFlipTimers.forEach(t => clearTimeout(t));
            heroFlipTimers = [];

            const now = performance.now();
            const dt = now - heroLastClickTime;
            heroLastClickTime = now;

            // Bei schnellem Weiterklicken beschleunigt sich die Drehung (Turbo-Schwung)
            if (dt < 650) {
                heroTurboLevel = Math.min(5, heroTurboLevel + 1);
            } else {
                heroTurboLevel = 0;
            }

            const durationSec = Math.max(0.22, 0.78 - heroTurboLevel * 0.11);
            const staggerMs = heroTurboLevel >= 2 ? 0 : Math.max(0, 65 - heroTurboLevel * 30);

            playSound('flip');

            heroSpinCount += 1; if (window.BlinkHeroPhysics) window.BlinkHeroPhysics.onShuffle(heroTurboLevel);
            const deg = heroSpinCount * 180;
            const targetSide = (heroSpinCount % 2 === 1) ? 'back' : 'front';

            const deck = shuffleArray(CARDS_125.length > 0 ? CARDS_125 : CARDS_60);
            const trio = drawValidClusterTrioFromDeck(deck);

            if (badge) {
                if (heroBadgeTimer) clearTimeout(heroBadgeTimer);
                badge.textContent = heroTurboLevel >= 3 ? `Turbo-Spin ×${heroTurboLevel + 1}!` : `Neues SKT generiert!`;
                badge.classList.remove('text-slate-300', 'text-cyan-400');
                badge.classList.add('text-emerald-400');
                heroBadgeTimer = setTimeout(() => {
                    badge.textContent = `Klicken für ein neues SKT`;
                    badge.classList.remove('text-emerald-400');
                    badge.classList.add('text-slate-300');
                }, 1200);
            }

            sides.forEach((side, i) => {
                const flipper = document.getElementById(`hero-flipper-${side}`);
                const faceEl = document.getElementById(`hero-card-${side}-${targetSide}`);
                if (faceEl) faceEl.innerHTML = renderLargePlayingCardInner(trio[i], true);

                const applySpin = () => {
                    if (!flipper) return;
                    flipper.style.transitionDuration = `${durationSec.toFixed(2)}s`;
                    flipper.style.transform = `rotateY(${deg}deg)`;
                };

                if (staggerMs === 0) {
                    applySpin();
                } else {
                    heroFlipTimers.push(setTimeout(applySpin, i * staggerMs));
                }
            });
        };

       // Direkt beim Laden einmal initialisieren (inklusive Reveal-Animation)
        shuffleHeroCluster(true);
        
        // Den Reveal der Hero-Karten sauber nach dem ersten Rendern auslösen
        setTimeout(() => {
            const heroWrapper = document.getElementById('hero-3d-wrapper');
            if (heroWrapper) {
                heroWrapper.classList.add('reveal-hero-ready');
            }
        }, 150);
        
        // --- Interaktiver 3D-Tilt-Effekt + Holografischer Lichtglanz ---
            updateSoundButtonUI();
            const hero3DContainer = null;
            const heroCardGroup = document.querySelector('.hero-card-group');

            if (hero3DContainer && heroCardGroup) {
                hero3DContainer.addEventListener('mousemove', (e) => {
                    const rect = hero3DContainer.getBoundingClientRect();
                    const xRel = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
                    const yRel = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);

                    const newRotX = 25 - (yRel * 20);
                    const newRotY = -30 + (xRel * 30);

                    heroCardGroup.style.transform = `rotateX(${newRotX}deg) rotateY(${newRotY}deg)`;
                    heroCardGroup.style.setProperty('--glare-x', `${Math.round(50 + xRel * 45)}%`);
                    heroCardGroup.style.setProperty('--glare-y', `${Math.round(50 + yRel * 45)}%`);
                    heroCardGroup.style.setProperty('--glare-bg-x', `${Math.round(50 - xRel * 45)}%`);
                    heroCardGroup.style.setProperty('--glare-bg-y', `${Math.round(50 - yRel * 45)}%`);
                    heroCardGroup.style.setProperty('--glare-opacity', '1');
                });

                hero3DContainer.addEventListener('mouseleave', () => {
                    heroCardGroup.style.transform = `rotateX(25deg) rotateY(-30deg)`;
                    heroCardGroup.style.setProperty('--glare-opacity', '0');
                });
            }
            
            function animate() {
                requestAnimationFrame(animate);
                if (state.currentPage === 'basic-model') {
                    controls.update();
                    highlight3DGroup.children.forEach(child => {
                        if (child.userData.isRotatingHalo) {
                            child.rotation.y += 0.025;
                            child.rotation.x += 0.015;
                        }
                    });
                    renderer.render(scene, camera);
                } else if (state.currentPage === 'advanced-model' && advState.initialized) {
                    advState.controls.update();
                    advState.renderer.render(advState.scene, advState.camera);
                }
            }
            animate();
        };
    