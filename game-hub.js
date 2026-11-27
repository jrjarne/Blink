// ============================================================================
// BLINK 3-SPALTEN-LAYOUT & EINHEITLICHER FOKUSMODUS FÜR ALLE 6 SPIELMODI
// Vor Spielstart: Nur Setup · Im Spiel: Fokusmodus + Live-Tools · Einheitliches „Partie beenden“
// ============================================================================
(function initBlinkGameWorkspace() {
    if (window.__BLINK_GAME_HUB_READY) return;
    window.__BLINK_GAME_HUB_READY = true;

    const GAME_IDS = ['arena', 'verhoer', 'daily', 'sudoku', 'endgame', 'cascade'];
    const ONLINE_CAPABLE = new Set(['arena', 'verhoer', 'daily', 'sudoku']);
    const PUZZLE_MODES = new Set(['daily', 'sudoku', 'endgame', 'cascade']);

    const SPLIT_SPECS = [
        { id: 'daily',   board: '#daily-cards-grid', side: '#daily-found-list' },
        { id: 'sudoku',  board: '#sudoku-grid',      side: '#sdk-pick-x' },
        { id: 'endgame', board: '#eg-hand-container, #eg-piles-container', side: '#eg-rule-explainer' },
        { id: 'cascade', board: '#cas-grid',         side: '#cas-current-card' }
    ];

    const GAME_CATALOG = [
        {
            id: 'arena',
            group: 'duel',
            title: 'Blink-Arena',
            shortSub: 'Echtzeit · 2–3 Stapel',
            lobbyText: 'Wähle rechts deinen Gegner und die Regelvariante und starte direkt ins Duell.',
            accent: 'cyan',
            online: true,
            playModes: [
                { id: 'ai', label: 'Computer' },
                { id: 'trained-ai', label: 'Eigene KI' },
                { id: 'online', label: 'Freunde' }
            ],
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`
        },
        {
            id: 'verhoer',
            group: 'duel',
            title: 'Das Verhör',
            shortSub: 'Taktik · 125 Karten',
            lobbyText: 'Sammle zuerst ein vollständiges 5er-Cluster aus Hand und offenen SKTs.',
            accent: 'amber',
            online: true,
            playModes: [
                { id: 'ai', label: 'Computer' },
                { id: 'online', label: 'Freunde' }
            ],
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`
        },
        {
            id: 'daily',
            group: 'puzzle',
            title: 'Daily Challenge',
            shortSub: '4×3 Cluster-Suche',
            lobbyText: 'Finde alle versteckten 5er-Cluster im 4×3-Kartenfeld — allein oder live gegen Freunde.',
            accent: 'emerald',
            online: true,
            playModes: [
                { id: 'solo', label: 'Alleine' },
                { id: 'online', label: 'Freunde' }
            ],
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`
        },
        {
            id: 'sudoku',
            group: 'puzzle',
            title: 'Blink-Sudoku',
            shortSub: '5×5 Magisches Quadrat',
            lobbyText: 'Wähle rechts die Schwierigkeit oder spiele gegen Freunde — beim Start öffnet sich der Karten-Baukasten.',
            accent: 'purple',
            online: true,
            playModes: [
                { id: 'solo', label: 'Alleine' },
                { id: 'online', label: 'Freunde' }
            ],
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>`
        },
        {
            id: 'endgame',
            group: 'puzzle',
            title: 'Endgame-Puzzles',
            shortSub: 'Solo · Zugfolge',
            lobbyText: 'Löse enge Endspiele in der exakten Zugfolge ohne Stocken.',
            accent: 'sky',
            online: false,
            playModes: [],
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`
        },
        {
            id: 'cascade',
            group: 'puzzle',
            title: 'Cluster-Cascade',
            shortSub: 'Solo · 5×5 Fallspiel',
            lobbyText: 'Wirf Karten in 5 Spalten ein und löse 5er-Cluster-Kettenreaktionen aus.',
            accent: 'rose',
            online: false,
            playModes: [],
            icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`
        }
    ];

    const GAME_META = Object.fromEntries(GAME_CATALOG.map(g => [g.id, g]));

    const ARENA_DIFF_LEVELS = [
        { id: 'easy', label: 'Leicht', preset: 'bronze' },
        { id: 'medium', label: 'Mittel', preset: 'gold' },
        { id: 'hard', label: 'Schwer', preset: 'diamond' }
    ];

    const SUDOKU_DIFF_LEVELS = [
        { id: 'easy', label: 'Leicht', emptyCount: 10 },
        { id: 'medium', label: 'Mittel', emptyCount: 14 },
        { id: 'hard', label: 'Schwer', emptyCount: 17 }
    ];

    const hubState = {
        activeGame: 'arena',
        playChoice: {
            arena: 'ai',
            verhoer: 'ai',
            daily: 'solo',
            sudoku: 'solo',
            endgame: 'solo',
            cascade: 'solo'
        },
        puzzleFocus: {
            daily: false,
            sudoku: false,
            endgame: false,
            cascade: false
        },
        puzzleCompletedView: {
            daily: false,
            sudoku: false,
            endgame: false,
            cascade: false
        },
        puzzleAutoExitTimers: {},
        arenaDiff: 'medium',
        arenaRule: 'normal',
        dailySoloVariant: 'today', // 'today' | 'practice'
        sudokuDiff: 'easy',
        joinCodeDraft: '',
        restockAlert: false,
        lastArenaRunning: false,
        lastVerhoerRunning: false,
        domReady: false
    };

    function escHtml(str) {
        return String(str || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    function getFullSession() {
        if (window.BlinkMultiplayer && typeof window.BlinkMultiplayer.getFullSession === 'function') {
            return window.BlinkMultiplayer.getFullSession();
        }
        return null;
    }

    function getOnlineSettings() {
        if (window.BlinkMultiplayer && typeof window.BlinkMultiplayer.getOnlineSettings === 'function') {
            return window.BlinkMultiplayer.getOnlineSettings();
        }
        return { timeLimitSec: 180, dailyVariant: 'random', sudokuEmptyCount: 10, hostPlays: true };
    }

    function renderAvatarSafe(prof, size = 22) {
        if (typeof getPlayerAvatarSVG === 'function') return getPlayerAvatarSVG(prof || undefined, size);
        return `<span class="inline-flex items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 font-bold mono" style="width:${size}px;height:${size}px">●</span>`;
    }

    function fmtMMSS(sec) {
        const s = Math.max(0, sec || 0);
        const m = String(Math.floor(s / 60)).padStart(2, '0');
        const r = String(Math.floor(s % 60)).padStart(2, '0');
        const t = String(Math.floor((s % 1) * 10));
        return `${m}:${r}.${t}`;
    }

    function resolveArenaBotValue(diffId) {
        const sel = document.getElementById('select-ai-difficulty');
        const target = ARENA_DIFF_LEVELS.find(d => d.id === diffId) || ARENA_DIFF_LEVELS[1];
        if (!sel || !sel.options.length) return target.preset;
        const vals = Array.from(sel.options).map(o => o.value);
        if (vals.includes(target.preset)) return target.preset;
        if (diffId === 'easy') return vals[0];
        if (diffId === 'hard') return vals[vals.length - 1];
        return vals[Math.floor(vals.length / 2)];
    }

    function getArenaMoveCount() {
        if (typeof gameState === 'undefined' || !Array.isArray(gameState.matchHistory)) return 0;
        return gameState.matchHistory.filter(e => e.type === 'play').length;
    }

    function isArenaRunning() {
        return typeof gameState !== 'undefined' && Boolean(gameState.isRunning);
    }

    function isVerhoerRunning() {
        return typeof vhState !== 'undefined' && Boolean(vhState.isRunning);
    }

    function isPuzzleInFocus(modeId) {
        if (!PUZZLE_MODES.has(modeId)) return false;
        const session = getFullSession();
        if (session && session.kind === modeId && session.phase === 'playing') return true;
        return Boolean(hubState.puzzleFocus[modeId]);
    }

    function isCurrentModeInFocus() {
        const id = hubState.activeGame;
        if (id === 'arena') return isArenaRunning();
        if (id === 'verhoer') return isVerhoerRunning();
        return isPuzzleInFocus(id);
    }

    function getHeaderStatHTML(gameId) {
        const session = getFullSession();
        if (session && session.kind === gameId) {
            return `<span class="g3-live-badge"><span class="w-1.5 h-1.5 rounded-full ${session.connected ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse"></span><span>${escHtml(session.code)}</span></span>`;
        }
        if (gameId === 'arena' && typeof playerEloState !== 'undefined' && typeof getEloRankInfo === 'function') {
            const rank = getEloRankInfo(playerEloState.elo);
            const icon = typeof getEloRankSVG === 'function' ? getEloRankSVG(rank.tier, 11) : '';
            return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] mono font-bold ${rank.cls}">${icon}<span>${playerEloState.elo}</span></span>`;
        }
        if (gameId === 'daily' && typeof dailyState !== 'undefined' && Array.isArray(dailyState.solutions) && dailyState.solutions.length > 0) {
            const found = dailyState.foundKeys ? dailyState.foundKeys.size : 0;
            const total = dailyState.solutions.length;
            return `<span class="g3-stat-pill ${found >= total ? 'is-done' : ''}">${found >= total ? '✓ Gelöst' : `${found}/${total}`}</span>`;
        }
        if (gameId === 'cascade' && typeof cascadeState !== 'undefined' && cascadeState.highScore > 0) {
            return `<span class="g3-stat-pill">${cascadeState.highScore} Pkt.</span>`;
        }
        return '';
    }

    // ------------------------------------------------------------------------
    // DOM-HELFER: NAME/ELO-STACK, KARTEN-ZÄHLER AUSBLENDEN & „PARTIE BEENDEN“
    // ------------------------------------------------------------------------
    function findSplitColumns(viewEl, boardSel, sideSel) {
        if (!viewEl) return null;
        const boardAnchor = viewEl.querySelector(boardSel);
        const sideAnchor = viewEl.querySelector(sideSel);
        if (!boardAnchor || !sideAnchor) return null;

        let sideCol = sideAnchor;
        while (sideCol && sideCol.parentElement) {
            const parent = sideCol.parentElement;
            if (parent.contains(boardAnchor)) {
                let boardCol = boardAnchor;
                while (boardCol.parentElement && boardCol.parentElement !== parent) {
                    boardCol = boardCol.parentElement;
                }
                if (boardCol === sideCol) return null;
                return { container: parent, boardCol, sideCol };
            }
            if (parent === viewEl) break;
            sideCol = parent;
        }
        return null;
    }

    function findSubCardInSidebar(sidebar, innerSel, forbidSels) {
        const el = sidebar ? sidebar.querySelector(innerSel) : null;
        if (!el) return null;
        let cur = el;
        while (cur && cur.parentElement && cur.parentElement !== sidebar) {
            const p = cur.parentElement;
            if (forbidSels.some(sel => p.querySelector(sel))) break;
            cur = p;
        }
        if (forbidSels.some(sel => cur.querySelector(sel))) return null;
        return cur;
    }

    function hideArenaPlayerAndBotSublines() {
        const oppSub = document.getElementById('opponent-sub-stats');
        if (oppSub && !oppSub.querySelector('#opponent-name-label')) {
            oppSub.classList.add('g3-hidden-ctrl');
        }

        const aiRem = document.getElementById('ai-total-remaining');
        if (aiRem && aiRem.parentElement && !aiRem.parentElement.querySelector('#opponent-name-label')) {
            aiRem.parentElement.classList.add('g3-hidden-ctrl');
        }

        const playerTotal = document.getElementById('score-player-total');
        if (playerTotal && playerTotal.parentElement && !playerTotal.parentElement.querySelector('#player-name-input')) {
            playerTotal.parentElement.classList.add('g3-hidden-ctrl');
        }

        const stackNameAndElo = (nameId, badgeId) => {
            const nameEl = document.getElementById(nameId);
            const badgeEl = document.getElementById(badgeId);
            if (!nameEl || !badgeEl) return;
            let host = nameEl.parentElement;
            for (let depth = 0; depth < 3 && host; depth++) {
                if (host.contains(badgeEl)) {
                    if (!host.querySelector('#player-avatar-slot, #opponent-avatar-slot, #game-timer-display')) {
                        host.classList.add('g3-name-elo-stack');
                    }
                    break;
                }
                host = host.parentElement;
            }
        };
        stackNameAndElo('opponent-name-label', 'opponent-elo-badge');
        stackNameAndElo('player-name-input', 'player-elo-badge');
    }

    const RULES_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

    function unifyRulesButtons() {
        const vhRules = document.querySelectorAll('#game-view-verhoer button[onclick*="toggleGameInfoModal"], #game-view-verhoer .game-rules-pill-btn');
        vhRules.forEach((btn, idx) => {
            if (idx > 0) {
                btn.classList.add('g3-hidden-ctrl');
                return;
            }
            btn.className = 'g3-rules-icon-btn g3-verhoer-focus-rules shrink-0';
            btn.title = 'Spielregeln öffnen';
            btn.setAttribute('aria-label', 'Spielregeln öffnen');
            btn.innerHTML = RULES_ICON_SVG;
        });

        const legacySelectors = [
            '#g3-center-stage .game-rules-pill-btn:not(.g3-verhoer-focus-rules)',
            '#g3-center-stage button[onclick*="toggleGameInfoModal"]:not(.g3-verhoer-focus-rules)',
            '#g3-right-dock .game-rules-pill-btn',
            '#g3-right-dock button[onclick*="toggleGameInfoModal"]'
        ];
        document.querySelectorAll(legacySelectors.join(', ')).forEach(btn => {
            btn.classList.add('g3-hidden-ctrl');
        });
    }

    function unifyAbortButtons() {
        const selectors = [
            '#vh-btn-abort',
            '#btn-abort-game',
            '#game-view-verhoer button[onclick*="vhAbortGame"]',
            '#game-view-arena button[onclick*="abortCurrentBlinkGame"]'
        ];
        document.querySelectorAll(selectors.join(', ')).forEach(btn => {
            btn.classList.add('g3-abort-btn');
            if (btn.textContent.trim() !== 'Partie beenden') {
                btn.textContent = 'Partie beenden';
            }
        });
        unifyRulesButtons();
    }

    // ------------------------------------------------------------------------
    // 1. 3-SPALTEN-SHELL AUFBAUEN, RÄTSEL-OVERLAYS & DOCK EINRICHTEN
    // ------------------------------------------------------------------------
    function ensureWorkspaceDOM() {
        if (hubState.domReady) return;
        const pageGame = document.getElementById('page-game');
        const arenaView = document.getElementById('game-view-arena');
        if (!pageGame || !arenaView || !arenaView.parentElement) return;

        hubState.domReady = true;

        const oldBar = document.getElementById('game-top-tabs-bar');
        if (oldBar) oldBar.classList.add('g3-hidden-ctrl');

        const viewsContainer = arenaView.parentElement;
        const hostParent = viewsContainer.parentElement;
        if (!hostParent || document.getElementById('g3-shell')) return;

        const shell = document.createElement('div');
        shell.id = 'g3-shell';
        shell.className = 'g3-shell';

        const leftRail = document.createElement('aside');
        leftRail.id = 'g3-left-modes';
        leftRail.className = 'g3-left';

        const centerCol = document.createElement('div');
        centerCol.id = 'g3-center-stage';
        centerCol.className = 'g3-center';

        const rightCol = document.createElement('aside');
        rightCol.id = 'g3-right-panel';
        rightCol.className = 'g3-right';
        rightCol.innerHTML = `
            <div id="g3-right-card-wrap" class="aceternity-bento-card g3-right-card p-4 sm:p-5 space-y-4">
                <div id="g3-right-dynamic" class="space-y-3.5"></div>
                <div id="g3-right-arena-progress" class="g3-merged-section hidden"></div>
            </div>
            <div id="g3-focus-puzzle-bar" class="hidden aceternity-bento-card g3-focus-mini-bar"></div>
            <div id="g3-right-dock" class="g3-right-dock hidden"></div>
        `;

        hostParent.insertBefore(shell, viewsContainer);
        centerCol.appendChild(viewsContainer);
        shell.appendChild(leftRail);
        shell.appendChild(centerCol);
        shell.appendChild(rightCol);

        const arenaProgEl = document.getElementById('g3-right-arena-progress');
        const dockEl = document.getElementById('g3-right-dock');

        // A) BLINK-ARENA: Kartenfortschritt (nur im Fokusmodus) + Bestenliste ins Abschluss-Pop-up
        const arenaSplit = findSplitColumns(
            arenaView,
            '#center-pile-0, #opponent-zone',
            '#select-game-mode, #game-move-log, #btn-stocken'
        );
        if (arenaSplit) {
            const { container, boardCol, sideCol } = arenaSplit;

            const progressCard = findSubCardInSidebar(
                sideCol,
                '#bar-player-progress',
                ['#select-game-mode', '#game-move-log', '#btn-stocken', '#leaderboard-normal-list']
            );
            const leaderboardCard = findSubCardInSidebar(
                sideCol,
                '#leaderboard-normal-list',
                ['#select-game-mode', '#game-move-log', '#btn-stocken', '#bar-player-progress']
            );

            if (progressCard && arenaProgEl) {
                progressCard.classList.add('g3-merged-subcard');
                arenaProgEl.appendChild(progressCard);
            }

            if (leaderboardCard) {
                const summaryEloGrid = document.getElementById('match-summary-elo-grid');
                if (summaryEloGrid && summaryEloGrid.parentElement) {
                    leaderboardCard.classList.add('g3-summary-leaderboard');
                    summaryEloGrid.insertAdjacentElement('afterend', leaderboardCard);
                } else {
                    leaderboardCard.classList.add('g3-hidden-ctrl');
                }
            }

            sideCol.classList.add('g3-hidden-ctrl');
            container.classList.add('g3-single-col-grid');
            boardCol.classList.add('g3-full-span');
        }

        // B) DAILY, SUDOKU, ENDGAME & CASCADE:
        //    - Werkzeug-Block in #g3-right-dock andocken (wird ERST im Fokusmodus sichtbar!)
        //    - Einheitliches Start-Overlay über dem mittleren Spielfeld vor Spielstart
        SPLIT_SPECS.forEach(spec => {
            const view = document.getElementById(`game-view-${spec.id}`);
            const split = findSplitColumns(view, spec.board, spec.side);
            if (!split || !dockEl) return;

            split.container.classList.add('g3-single-col-grid');
            split.boardCol.classList.add('g3-full-span', 'g3-puzzle-board-host');

            split.sideCol.setAttribute('data-g3-dock-for', spec.id);
            split.sideCol.classList.add('g3-dock-item', 'hidden');
            dockEl.appendChild(split.sideCol);

            if (!document.getElementById(`g3-lobby-overlay-${spec.id}`)) {
                const meta = GAME_META[spec.id];
                const ov = document.createElement('div');
                ov.id = `g3-lobby-overlay-${spec.id}`;
                ov.className = `g3-puzzle-lobby-overlay g3-accent-${meta.accent}`;
                ov.innerHTML = `
                    <div class="w-full max-w-[540px] flex flex-col items-center gap-3.5 text-center">
                        <div id="g3-demo-stage-${spec.id}" class="arena-demo-stage is-${meta.accent} w-full" aria-hidden="true"></div>
                        <div class="space-y-1 max-w-md">
                            <h3 class="text-lg sm:text-xl font-extrabold text-white heading-font leading-tight">${meta.title}</h3>
                            <p class="text-[11.5px] sm:text-xs text-slate-300 leading-relaxed">${meta.lobbyText}</p>
                        </div>
                    </div>
                `;
                split.boardCol.appendChild(ov);
            }
        });

        // C) Deadlock-Highlight beobachten
        const origStocken = document.getElementById('btn-stocken');
        if (origStocken && typeof MutationObserver !== 'undefined') {
            const syncStocken = () => {
                const isAlert = origStocken.className.includes('bg-amber-400');
                if (hubState.restockAlert !== isAlert) {
                    hubState.restockAlert = isAlert;
                    syncArenaActionButtons();
                }
            };
            const obs = new MutationObserver(syncStocken);
            obs.observe(origStocken, { attributes: true, attributeFilter: ['class'] });
            syncStocken();
        }

        hideArenaPlayerAndBotSublines();
        unifyAbortButtons();

        if (typeof labState !== 'undefined' && GAME_IDS.includes(labState.activeGameTab)) {
            hubState.activeGame = labState.activeGameTab;
        }
        renderWorkspaceSidebars();
    }

    // ------------------------------------------------------------------------
    // 2B. LIVE-VORSCHAU-ANIMATIONEN FÜR ALLE 6 SPIELMODI (VOR SPIELSTART)
    // ------------------------------------------------------------------------
    const ARENA_DEMO_SCENARIOS = {
        normal: {
            badge: 'Standard · 2 Stapel',
            descHtml: 'Lege schneller als dein Gegner passende Karten nach <strong>Farbe</strong>, <strong>Symbol</strong> oder <strong>Anzahl</strong> ab.',
            initialPiles: [[3, 1, 0], [2, 3, 1]],
            initialHand: [[1, 1, 2], [4, 2, 3], [2, 4, 3]],
            initialBotCount: 29,
            initialPlayerCount: 29,
            steps: [
                { actor: 'player', slot: 0, pile: 0, card: [1, 1, 2], refill: [3, 2, 2], reason: '✓ Gleiche Farbe · Rot', tone: 'cyan' },
                { actor: 'bot',    slot: 1, pile: 1, card: [2, 2, 4], refill: null,      reason: 'Bot · Gleiche Anzahl (2×)', tone: 'rose' },
                { actor: 'player', slot: 0, pile: 0, card: [3, 2, 2], refill: [4, 4, 3], reason: '✓ Gleiches Symbol · Tropfen', tone: 'cyan' },
                { actor: 'player', slot: 1, pile: 1, card: [4, 2, 3], refill: [1, 3, 4], reason: '⚡ Kombo! Farbe · Grün', tone: 'emerald' }
            ]
        },
        cluster: {
            badge: 'Cluster · 3 Stapel',
            descHtml: 'Alle <strong>3 Mittelkarten</strong> müssen in Anzahl, Farbe und Symbol <strong>paarweise komplett verschieden</strong> sein.',
            initialPiles: [[1, 1, 1], [2, 2, 4], [3, 3, 3]],
            initialHand: [[4, 4, 0], [0, 1, 3], [1, 5, 2]],
            initialBotCount: 28,
            initialPlayerCount: 28,
            steps: [
                { actor: 'player', slot: 0, pile: 0, card: [4, 4, 0], refill: [0, 0, 5], reason: '✦ Cluster · Alle 3 verschieden!', tone: 'purple' },
                { actor: 'bot',    slot: 1, pile: 1, card: [1, 1, 2], refill: null,      reason: 'Bot · Neues Cluster auf M₂', tone: 'rose' },
                { actor: 'player', slot: 0, pile: 2, card: [0, 0, 5], refill: [2, 3, 1], reason: '✦ Cluster-Treffer auf M₃!', tone: 'purple' }
            ]
        }
    };

    const lobbyDemo = {
        running: false,
        mode: null,
        variant: null,
        runToken: 0,
        timers: [],
        observersBound: false
    };

    function renderDemoCardHTML(card, showBadge = true) {
        if (!card) return '';
        const [x, y, z] = card;
        const count = (typeof PALETTE_X !== 'undefined' && PALETTE_X[x]) ? PALETTE_X[x].count : (x === 0 ? 5 : x);
        const symbols = typeof renderCardSymbolsHTML === 'function' ? renderCardSymbolsHTML(x, y, z) : '';
        return `
            ${showBadge ? `<div class="arena-demo-card-top"><span class="arena-demo-card-badge">${count}×</span></div>` : ''}
            <div class="arena-demo-card-art">${symbols}</div>
        `;
    }

    function clearLobbyDemoTimers() {
        lobbyDemo.timers.forEach(id => clearTimeout(id));
        lobbyDemo.timers = [];
        document.querySelectorAll('.arena-demo-flyer').forEach(el => el.remove());
    }

    function scheduleDemo(fn, ms, token) {
        const id = setTimeout(() => {
            if (!lobbyDemo.running || lobbyDemo.runToken !== token) return;
            fn();
        }, ms);
        lobbyDemo.timers.push(id);
        return id;
    }

    function stopArenaLobbyDemo() {
        lobbyDemo.running = false;
        lobbyDemo.mode = null;
        lobbyDemo.variant = null;
        lobbyDemo.runToken += 1;
        clearLobbyDemoTimers();
    }

    function getDemoStageEl(modeId) {
        return document.getElementById(`g3-demo-stage-${modeId}`);
    }

    function getOverlayElForMode(modeId) {
        if (modeId === 'arena') return document.getElementById('game-lobby-overlay');
        if (modeId === 'verhoer') return document.getElementById('vh-lobby-overlay');
        return document.getElementById(`g3-lobby-overlay-${modeId}`);
    }

    function getActiveDemoTarget() {
        if (document.hidden) return null;
        const pageGame = document.getElementById('page-game');
        if (!pageGame || pageGame.classList.contains('hidden')) return null;

        const mode = hubState.activeGame;
        if (!GAME_IDS.includes(mode)) return null;
        if (isCurrentModeInFocus()) return null;

        const overlay = getOverlayElForMode(mode);
        if (!overlay || overlay.classList.contains('hidden')) return null;
        const stage = getDemoStageEl(mode);
        if (!stage) return null;

        const variant = mode === 'arena' ? (hubState.arenaRule === 'cluster' ? 'cluster' : 'normal') : 'default';
        return { mode, variant, stage };
    }

    function setDemoReason(stage, text, tone = 'cyan') {
        const el = stage ? stage.querySelector('[data-demo-reason]') : null;
        if (!el) return;
        if (!text) {
            el.classList.remove('is-visible');
            return;
        }
        el.className = `arena-demo-reason is-visible is-tone-${tone}`;
        el.textContent = text;
    }

    function setDemoDots(stage, activeIdx) {
        if (!stage) return;
        stage.querySelectorAll('.arena-demo-dot').forEach((d, i) => {
            d.classList.toggle('is-active', i === activeIdx);
            d.classList.toggle('is-done', i < activeIdx);
        });
    }

    function animateDemoCardFlight(stage, srcEl, dstEl, card, opts, token, onLand) {
        const stageRect = stage.getBoundingClientRect();
        const srcRect = srcEl.getBoundingClientRect();
        const dstRect = dstEl.getBoundingClientRect();
        if (dstRect.width < 8 || srcRect.width < 8) {
            onLand();
            return;
        }
        const flyer = document.createElement('div');
        flyer.className = `arena-demo-card arena-demo-flyer card-63-88 ${opts.extraClass || ''}`;
        flyer.innerHTML = renderDemoCardHTML(card, opts.showBadge !== false);
        flyer.style.width = `${dstRect.width}px`;
        flyer.style.height = `${dstRect.height}px`;
        flyer.style.left = `${srcRect.left - stageRect.left + (srcRect.width - dstRect.width) / 2}px`;
        flyer.style.top = `${srcRect.top - stageRect.top + (srcRect.height - dstRect.height) / 2}px`;
        stage.appendChild(flyer);

        const dx = (dstRect.left + dstRect.width / 2) - (srcRect.left + srcRect.width / 2);
        const dy = (dstRect.top + dstRect.height / 2) - (srcRect.top + srcRect.height / 2);
        const tilt = opts.noTilt ? 0 : (dx >= 0 ? 7 : -7);
        const arcY = opts.arcY != null ? opts.arcY : -14;
        const scaleFrom = Math.max(0.55, srcRect.width / Math.max(1, dstRect.width));

        const anim = flyer.animate([
            { transform: `translate(0px, 0px) scale(${scaleFrom}) rotate(0deg)`, opacity: 0.96 },
            { transform: `translate(${dx * 0.52}px, ${dy * 0.52 + arcY}px) scale(${opts.midScale || 1.07}) rotate(${tilt}deg)`, opacity: 1, offset: 0.52 },
            { transform: `translate(${dx}px, ${dy}px) scale(1) rotate(0deg)`, opacity: 1 }
        ], {
            duration: opts.duration || 460,
            easing: opts.easing || 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'forwards'
        });

        anim.onfinish = () => {
            flyer.remove();
            if (!lobbyDemo.running || lobbyDemo.runToken !== token) return;
            onLand();
        };
    }

    function scheduleDemoReset(stage, restartFn, token, holdMs = 1550) {
        scheduleDemo(() => {
            stage.classList.add('is-resetting');
            scheduleDemo(() => {
                stage.classList.remove('is-resetting');
                restartFn();
            }, 260, token);
        }, holdMs, token);
    }

    // --- 1. BLINK-ARENA DEMO (STANDARD 2 STAPEL & CLUSTER 3 STAPEL) ---
    function runArenaDemo(stage, ruleKey, token) {
        const spec = ARENA_DEMO_SCENARIOS[ruleKey] || ARENA_DEMO_SCENARIOS.normal;
        const isCluster = ruleKey === 'cluster';
        const piles = spec.initialPiles.map(c => [...c]);
        const hand = spec.initialHand.map(c => [...c]);
        let botCount = spec.initialBotCount;
        let playerCount = spec.initialPlayerCount;

        const descEl = document.getElementById('arena-lobby-rule-desc');
        if (descEl) descEl.innerHTML = spec.descHtml;

        const pileLabels = ['M₁', 'M₂', 'M₃'];
        stage.className = `arena-demo-stage w-full ${isCluster ? 'is-cluster' : ''}`;
        stage.innerHTML = `
            <div class="arena-demo-topbar">
                <span class="arena-demo-live-pill">
                    <span class="arena-demo-live-dot"></span>
                    <span>Vorschau · ${spec.badge}</span>
                </span>
                <div class="arena-demo-topbar-right">
                    <span class="arena-demo-score-pill">
                        <span class="text-rose-300">Bot <strong data-demo-bot-cnt>${botCount}</strong></span>
                        <span class="opacity-35">·</span>
                        <span class="text-cyan-300">Du <strong data-demo-player-cnt>${playerCount}</strong></span>
                    </span>
                    <div class="arena-demo-dots" aria-hidden="true">
                        ${spec.steps.map(() => `<span class="arena-demo-dot"></span>`).join('')}
                    </div>
                </div>
            </div>
            <div class="arena-demo-bot-row">
                <span class="arena-demo-side-tag is-bot">Bot</span>
                <div class="arena-demo-bot-hand">
                    ${[0, 1, 2].map(i => `<div class="arena-demo-bot-card card-63-88" data-demo-bot="${i}"><span></span></div>`).join('')}
                </div>
            </div>
            <div class="arena-demo-center-zone">
                <div data-demo-reason class="arena-demo-reason"></div>
                <div class="arena-demo-piles">
                    ${piles.map((card, i) => `
                        <div class="arena-demo-pile-slot">
                            <span class="arena-demo-pile-lbl ${i === 2 ? 'text-purple-300' : ''}">${pileLabels[i]}</span>
                            <div class="arena-demo-card is-pile card-63-88" data-demo-pile="${i}">${renderDemoCardHTML(card)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="arena-demo-player-row">
                <span class="arena-demo-side-tag is-player">Du</span>
                <div class="arena-demo-player-hand">
                    ${hand.map((card, i) => `
                        <div class="arena-demo-card is-hand card-63-88" data-demo-hand="${i}">${renderDemoCardHTML(card)}</div>
                    `).join('')}
                </div>
            </div>
        `;

        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setDemoReason(stage, spec.steps[0].reason, spec.steps[0].tone);
            return;
        }

        const runStep = (idx) => {
            if (idx >= spec.steps.length) {
                scheduleDemoReset(stage, () => runArenaDemo(stage, ruleKey, token), token);
                return;
            }
            const step = spec.steps[idx];
            setDemoDots(stage, idx);

            const srcEl = step.actor === 'player'
                ? stage.querySelector(`[data-demo-hand="${step.slot}"]`)
                : stage.querySelector(`[data-demo-bot="${step.slot}"]`);
            const dstEl = stage.querySelector(`[data-demo-pile="${step.pile}"]`);
            if (!srcEl || !dstEl) return;

            srcEl.classList.add(step.actor === 'player' ? 'is-demo-pick-player' : 'is-demo-pick-bot');
            dstEl.classList.add(step.actor === 'player' ? 'is-demo-target-player' : 'is-demo-target-bot');

            scheduleDemo(() => {
                srcEl.classList.remove('is-demo-pick-player', 'is-demo-pick-bot');
                dstEl.classList.remove('is-demo-target-player', 'is-demo-target-bot');
                srcEl.classList.add('is-demo-ghost');

                animateDemoCardFlight(stage, srcEl, dstEl, step.card, {
                    extraClass: step.actor === 'bot' ? 'is-bot-flyer' : ''
                }, token, () => {
                    piles[step.pile] = [...step.card];
                    dstEl.innerHTML = renderDemoCardHTML(step.card);
                    dstEl.classList.remove('is-demo-hit-cyan', 'is-demo-hit-rose', 'is-demo-hit-purple', 'is-demo-hit-emerald');
                    void dstEl.offsetWidth;
                    dstEl.classList.add(`is-demo-hit-${step.tone}`);
                    setDemoReason(stage, step.reason, step.tone);

                    if (step.actor === 'player') {
                        playerCount = Math.max(0, playerCount - 1);
                        const el = stage.querySelector('[data-demo-player-cnt]');
                        if (el) el.textContent = playerCount;
                        if (step.refill) {
                            hand[step.slot] = [...step.refill];
                            srcEl.innerHTML = renderDemoCardHTML(step.refill);
                        }
                    } else {
                        botCount = Math.max(0, botCount - 1);
                        const el = stage.querySelector('[data-demo-bot-cnt]');
                        if (el) el.textContent = botCount;
                    }

                    srcEl.classList.remove('is-demo-ghost', 'is-demo-deal');
                    void srcEl.offsetWidth;
                    srcEl.classList.add('is-demo-deal');
                    scheduleDemo(() => runStep(idx + 1), 1250, token);
                });
            }, 400, token);
        };

        scheduleDemo(() => runStep(0), 600, token);
    }

    // --- 2. DAS VERHÖR DEMO (ABWURF → VERHÖR → 5ER-CLUSTER) ---
    function runVerhoerDemo(stage, token) {
        const hand = [[0, 0, 0], [1, 1, 1], [2, 2, 2], [1, 3, 4]];
        const discardStart = [1, 2, 4];
        const botSecretCard = [3, 3, 3];
        const finalCard = [4, 4, 4];

        stage.className = 'arena-demo-stage is-amber w-full';
        stage.innerHTML = `
            <div class="arena-demo-topbar">
                <span class="arena-demo-live-pill">
                    <span class="arena-demo-live-dot"></span>
                    <span>Vorschau · 125 Karten (𝔽₅³)</span>
                </span>
                <div class="arena-demo-topbar-right">
                    <span class="arena-demo-score-pill">
                        <span class="text-amber-300">Cluster <strong data-vh-prog>3 / 5</strong></span>
                    </span>
                    <div class="arena-demo-dots" aria-hidden="true">
                        <span class="arena-demo-dot"></span>
                        <span class="arena-demo-dot"></span>
                        <span class="arena-demo-dot"></span>
                    </div>
                </div>
            </div>
            <div class="arena-demo-bot-row">
                <span class="arena-demo-side-tag is-bot">Bot</span>
                <div class="arena-demo-bot-hand">
                    <div class="arena-demo-bot-card card-63-88" data-vh-bot="0"><span></span></div>
                    <div class="arena-demo-bot-card card-63-88" data-vh-bot="1"><span></span></div>
                    <div class="arena-demo-bot-card card-63-88" data-vh-bot="2"><span></span></div>
                </div>
            </div>
            <div class="arena-demo-center-zone">
                <div data-demo-reason class="arena-demo-reason"></div>
                <div class="arena-demo-piles">
                    <div class="arena-demo-pile-slot">
                        <span class="arena-demo-pile-lbl text-amber-300">Abwurf M₁</span>
                        <div class="arena-demo-card is-pile card-63-88" data-vh-discard>${renderDemoCardHTML(discardStart)}</div>
                    </div>
                    <div class="arena-demo-pile-slot">
                        <span class="arena-demo-pile-lbl">Nachziehen</span>
                        <div class="arena-demo-deck-card card-63-88" data-vh-deck>
                            <span class="text-[11px] font-extrabold mono">𝔽₅³</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="arena-demo-player-row">
                <span class="arena-demo-side-tag is-player">Du</span>
                <div class="arena-demo-player-hand is-compact">
                    ${hand.map((c, i) => `<div class="arena-demo-card is-hand-sm card-63-88" data-vh-hand="${i}">${renderDemoCardHTML(c)}</div>`).join('')}
                    <div class="arena-demo-card is-hand-sm is-slot-empty card-63-88" data-vh-hand="4"></div>
                </div>
            </div>
        `;

        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setDemoReason(stage, '🔍 Abwurf löst Verhör aus · Ziel: 5er-Cluster', 'amber');
            return;
        }

        // Schritt 1: Abwurf mit 2 Gemeinsamkeiten → Verhör ausgelöst
        scheduleDemo(() => {
            setDemoDots(stage, 0);
            const src = stage.querySelector('[data-vh-hand="3"]');
            const dst = stage.querySelector('[data-vh-discard]');
            if (!src || !dst) return;
            src.classList.add('is-demo-pick-amber');
            dst.classList.add('is-demo-target-amber');

            scheduleDemo(() => {
                src.classList.remove('is-demo-pick-amber');
                dst.classList.remove('is-demo-target-amber');
                src.classList.add('is-demo-ghost');
                animateDemoCardFlight(stage, src, dst, hand[3], { extraClass: 'is-amber-flyer' }, token, () => {
                    dst.innerHTML = renderDemoCardHTML(hand[3]);
                    dst.classList.add('is-demo-hit-amber');
                    setDemoReason(stage, '🔍 2 Gemeinsamkeiten · Verhör!', 'amber');

                    // Schritt 2: Gegner-Karte wird aufgedeckt & getauscht
                    scheduleDemo(() => {
                        setDemoDots(stage, 1);
                        const botCard = stage.querySelector('[data-vh-bot="1"]');
                        if (!botCard) return;
                        botCard.className = 'arena-demo-card is-hand-sm card-63-88 is-demo-pick-amber';
                        botCard.innerHTML = renderDemoCardHTML(botSecretCard);

                        scheduleDemo(() => {
                            botCard.classList.add('is-demo-ghost');
                            animateDemoCardFlight(stage, botCard, src, botSecretCard, { extraClass: 'is-amber-flyer' }, token, () => {
                                src.classList.remove('is-demo-ghost');
                                src.innerHTML = renderDemoCardHTML(botSecretCard);
                                src.classList.add('is-demo-deal', 'is-demo-hit-cyan');
                                const prog = stage.querySelector('[data-vh-prog]');
                                if (prog) prog.textContent = '4 / 5';
                                setDemoReason(stage, '✓ Karte ertauscht · 4/5 Cluster', 'cyan');

                                // Schritt 3: 5. Karte ziehen → 5er-Cluster komplett!
                                scheduleDemo(() => {
                                    setDemoDots(stage, 2);
                                    const deck = stage.querySelector('[data-vh-deck]');
                                    const slot4 = stage.querySelector('[data-vh-hand="4"]');
                                    if (!deck || !slot4) return;
                                    animateDemoCardFlight(stage, deck, slot4, finalCard, { extraClass: 'is-emerald-flyer' }, token, () => {
                                        slot4.classList.remove('is-slot-empty');
                                        slot4.innerHTML = renderDemoCardHTML(finalCard);
                                        if (prog) prog.textContent = '5 / 5';
                                        stage.querySelectorAll('[data-vh-hand]').forEach(el => el.classList.add('is-demo-cluster-win'));
                                        setDemoReason(stage, '★ 5er-Cluster komplett · Sieg!', 'emerald');
                                        scheduleDemoReset(stage, () => runVerhoerDemo(stage, token), token, 1700);
                                    });
                                }, 1150, token);
                            });
                        }, 520, token);
                    }, 1150, token);
                });
            }, 400, token);
        }, 600, token);
    }

    // --- 3. DAILY CHALLENGE DEMO (4×3-FELD · 5ER-CLUSTER FINDEN) ---
    function runDailyDemo(stage, token) {
        const cards = [
            [0, 0, 0], [1, 0, 3], [1, 1, 1], [3, 1, 4],
            [0, 2, 1], [2, 2, 2], [4, 3, 0], [2, 4, 1],
            [3, 3, 3], [1, 2, 0], [3, 0, 2], [4, 4, 4]
        ];
        const clusterIdxs = [0, 2, 5, 8, 11];

        stage.className = 'arena-demo-stage is-emerald w-full';
        stage.innerHTML = `
            <div class="arena-demo-topbar">
                <span class="arena-demo-live-pill">
                    <span class="arena-demo-live-dot"></span>
                    <span>Vorschau · 4×3 Cluster-Suche</span>
                </span>
                <div class="arena-demo-topbar-right">
                    <span class="arena-demo-score-pill">
                        <span class="text-emerald-300">Gefunden <strong data-daily-cnt>0 / 2</strong></span>
                    </span>
                    <div class="arena-demo-dots" aria-hidden="true">
                        <span class="arena-demo-dot"></span>
                        <span class="arena-demo-dot"></span>
                        <span class="arena-demo-dot"></span>
                    </div>
                </div>
            </div>
            <div class="arena-demo-center-zone">
                <div data-demo-reason class="arena-demo-reason"></div>
                <div class="demo-daily-grid">
                    ${cards.map((c, i) => `
                        <div class="arena-demo-card is-mini-tile card-63-88" data-daily-cell="${i}">
                            ${renderDemoCardHTML(c, false)}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            clusterIdxs.forEach(i => stage.querySelector(`[data-daily-cell="${i}"]`)?.classList.add('is-demo-cluster-win'));
            setDemoReason(stage, '✦ 5 paarweise verschiedene Karten = 1 Cluster', 'emerald');
            return;
        }

        const pickCell = (idx) => {
            const el = stage.querySelector(`[data-daily-cell="${idx}"]`);
            if (el) el.classList.add('is-demo-selected-emerald');
        };

        scheduleDemo(() => {
            setDemoDots(stage, 0);
            pickCell(clusterIdxs[0]);
            setDemoReason(stage, '1 / 5 · Alle Eigenschaften verschieden halten', 'cyan');
            scheduleDemo(() => {
                pickCell(clusterIdxs[1]);
                setDemoReason(stage, '2 / 5 · Keine doppelte Zahl, Farbe oder Form', 'cyan');

                scheduleDemo(() => {
                    setDemoDots(stage, 1);
                    pickCell(clusterIdxs[2]);
                    setDemoReason(stage, '3 / 5 · Cluster wächst…', 'cyan');
                    scheduleDemo(() => {
                        pickCell(clusterIdxs[3]);
                        setDemoReason(stage, '4 / 5 · Noch 1 passende Karte!', 'emerald');

                        scheduleDemo(() => {
                            setDemoDots(stage, 2);
                            pickCell(clusterIdxs[4]);
                            stage.querySelectorAll('[data-daily-cell]').forEach((el, i) => {
                                if (clusterIdxs.includes(i)) {
                                    el.classList.add('is-demo-cluster-win');
                                } else {
                                    el.classList.add('is-demo-dimmed');
                                }
                            });
                            const cnt = stage.querySelector('[data-daily-cnt]');
                            if (cnt) cnt.textContent = '1 / 2';
                            setDemoReason(stage, '✦ 5er-Cluster gefunden! (+100)', 'emerald');
                            scheduleDemoReset(stage, () => runDailyDemo(stage, token), token, 1750);
                        }, 800, token);
                    }, 550, token);
                }, 750, token);
            }, 550, token);
        }, 550, token);
    }

    // --- 4. BLINK-SUDOKU DEMO (5×5 MAGISCHES QUADRAT IM 𝔽₅³) ---
    function runSudokuDemo(stage, token) {
        // Exaktes 5×5 MDS-Quadrat: x=(r+c)%5, y=(r+2c)%5, z=(r+3c)%5
        const cellCard = (r, c) => [(r + c) % 5, (r + 2 * c) % 5, (r + 3 * c) % 5];
        const holes = [
            { r: 1, c: 2, card: cellCard(1, 2), label: '✓ (3, 0, 2) · 3× Braun Tropfen' },
            { r: 3, c: 4, card: cellCard(3, 4), label: '✦ Magisches Quadrat komplett!' }
        ];
        const isHole = (r, c) => holes.some(h => h.r === r && h.c === c);

        let gridHtml = '';
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                const empty = isHole(r, c);
                gridHtml += `
                    <div class="demo-sdk-cell ${empty ? 'is-empty' : ''}" data-sdk-r="${r}" data-sdk-c="${c}">
                        ${empty ? '<span class="demo-sdk-q">?</span>' : renderDemoCardHTML(cellCard(r, c), false)}
                    </div>
                `;
            }
        }

        stage.className = 'arena-demo-stage is-purple w-full';
        stage.innerHTML = `
            <div class="arena-demo-topbar">
                <span class="arena-demo-live-pill">
                    <span class="arena-demo-live-dot"></span>
                    <span>Vorschau · 5×5 Magisches Quadrat</span>
                </span>
                <div class="arena-demo-topbar-right">
                    <span class="arena-demo-score-pill">
                        <span class="text-purple-300">Offen <strong data-sdk-open>2</strong></span>
                    </span>
                    <div class="arena-demo-dots" aria-hidden="true">
                        <span class="arena-demo-dot"></span>
                        <span class="arena-demo-dot"></span>
                        <span class="arena-demo-dot"></span>
                    </div>
                </div>
            </div>
            <div class="arena-demo-center-zone">
                <div data-demo-reason class="arena-demo-reason"></div>
                <div class="demo-sdk-layout">
                    <div class="demo-sdk-grid">${gridHtml}</div>
                    <div class="demo-sdk-builder">
                        <span class="arena-demo-pile-lbl text-purple-300">Baukasten</span>
                        <div class="arena-demo-card is-hand-sm card-63-88" data-sdk-next>
                            ${renderDemoCardHTML(holes[0].card, true)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setDemoReason(stage, 'Jede Zeile & Spalte bildet ein 5er-Cluster', 'purple');
            return;
        }

        const highlightCross = (r, c, on) => {
            stage.querySelectorAll('.demo-sdk-cell').forEach(el => {
                const er = Number(el.dataset.sdkR);
                const ec = Number(el.dataset.sdkC);
                el.classList.toggle('is-guide', on && (er === r || ec === c) && !(er === r && ec === c));
                el.classList.toggle('is-focus-hole', on && er === r && ec === c);
            });
        };

        // Schritt 1: Zeile & Spalte für Lücke 1 prüfen
        scheduleDemo(() => {
            setDemoDots(stage, 0);
            highlightCross(holes[0].r, holes[0].c, true);
            setDemoReason(stage, 'Zeile & Spalte prüfen · Fehlende Karte bauen', 'purple');

            // Schritt 2: Karte 1 einsetzen
            scheduleDemo(() => {
                setDemoDots(stage, 1);
                const src = stage.querySelector('[data-sdk-next]');
                const dst = stage.querySelector(`[data-sdk-r="${holes[0].r}"][data-sdk-c="${holes[0].c}"]`);
                if (!src || !dst) return;
                animateDemoCardFlight(stage, src, dst, holes[0].card, { showBadge: false, extraClass: 'is-purple-flyer' }, token, () => {
                    highlightCross(holes[0].r, holes[0].c, false);
                    dst.classList.remove('is-empty');
                    dst.classList.add('is-placed');
                    dst.innerHTML = renderDemoCardHTML(holes[0].card, false);
                    const openEl = stage.querySelector('[data-sdk-open]');
                    if (openEl) openEl.textContent = '1';
                    setDemoReason(stage, holes[0].label, 'cyan');

                    // Schritt 3: Lücke 2 füllen → Gelöst!
                    src.innerHTML = renderDemoCardHTML(holes[1].card, true);
                    src.classList.remove('is-demo-deal');
                    void src.offsetWidth;
                    src.classList.add('is-demo-deal');

                    scheduleDemo(() => {
                        setDemoDots(stage, 2);
                        highlightCross(holes[1].r, holes[1].c, true);
                        const dst2 = stage.querySelector(`[data-sdk-r="${holes[1].r}"][data-sdk-c="${holes[1].c}"]`);
                        if (!dst2) return;
                        scheduleDemo(() => {
                            animateDemoCardFlight(stage, src, dst2, holes[1].card, { showBadge: false, extraClass: 'is-emerald-flyer' }, token, () => {
                                highlightCross(holes[1].r, holes[1].c, false);
                                dst2.classList.remove('is-empty');
                                dst2.classList.add('is-placed');
                                dst2.innerHTML = renderDemoCardHTML(holes[1].card, false);
                                if (openEl) openEl.textContent = '0';
                                stage.querySelectorAll('.demo-sdk-cell').forEach(el => el.classList.add('is-solved-glow'));
                                setDemoReason(stage, holes[1].label, 'emerald');
                                scheduleDemoReset(stage, () => runSudokuDemo(stage, token), token, 1750);
                            });
                        }, 420, token);
                    }, 950, token);
                });
            }, 900, token);
        }, 550, token);
    }

    // --- 5. ENDGAME-PUZZLES DEMO (EXAKTE 3-ZUG-BRÜCKENFOLGE OHNE DEADLOCK) ---
    function runEndgameDemo(stage, token) {
        const piles = [[1, 1, 0], [2, 3, 1]];
        const hand = [[4, 1, 4], [3, 2, 4], [3, 4, 5]];
        const steps = [
            { slot: 0, pile: 0, card: [4, 1, 4], reason: '1/3 · Rot öffnet Blume-Brücke', tone: 'cyan' },
            { slot: 1, pile: 0, card: [3, 2, 4], reason: '2/3 · Blume öffnet 3×-Anschluss', tone: 'cyan' },
            { slot: 2, pile: 0, card: [3, 4, 5], reason: '★ Gelöst! Alle 3 Karten ohne Stocken', tone: 'emerald' }
        ];

        stage.className = 'arena-demo-stage is-sky w-full';
        stage.innerHTML = `
            <div class="arena-demo-topbar">
                <span class="arena-demo-live-pill">
                    <span class="arena-demo-live-dot"></span>
                    <span>Vorschau · Brücken-Zugfolge</span>
                </span>
                <div class="arena-demo-topbar-right">
                    <span class="arena-demo-score-pill">
                        <span class="text-sky-300">Zug <strong data-eg-cnt>0 / 3</strong></span>
                    </span>
                    <div class="arena-demo-dots" aria-hidden="true">
                        <span class="arena-demo-dot"></span>
                        <span class="arena-demo-dot"></span>
                        <span class="arena-demo-dot"></span>
                    </div>
                </div>
            </div>
            <div class="arena-demo-center-zone">
                <div data-demo-reason class="arena-demo-reason"></div>
                <div class="arena-demo-piles">
                    <div class="arena-demo-pile-slot">
                        <span class="arena-demo-pile-lbl">M₁</span>
                        <div class="arena-demo-card is-pile card-63-88" data-eg-pile="0">${renderDemoCardHTML(piles[0])}</div>
                    </div>
                    <div class="arena-demo-pile-slot">
                        <span class="arena-demo-pile-lbl">M₂</span>
                        <div class="arena-demo-card is-pile card-63-88" data-eg-pile="1">${renderDemoCardHTML(piles[1])}</div>
                    </div>
                </div>
            </div>
            <div class="arena-demo-player-row">
                <span class="arena-demo-side-tag is-player">Hand</span>
                <div class="arena-demo-player-hand">
                    ${hand.map((c, i) => `
                        <div class="arena-demo-card is-hand card-63-88" data-eg-hand="${i}">${renderDemoCardHTML(c)}</div>
                    `).join('')}
                </div>
            </div>
        `;

        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setDemoReason(stage, 'Lege alle 3 Karten in der exakten Reihenfolge ab', 'cyan');
            return;
        }

        const runStep = (idx) => {
            if (idx >= steps.length) {
                scheduleDemoReset(stage, () => runEndgameDemo(stage, token), token, 1750);
                return;
            }
            const step = steps[idx];
            setDemoDots(stage, idx);
            const src = stage.querySelector(`[data-eg-hand="${step.slot}"]`);
            const dst = stage.querySelector(`[data-eg-pile="${step.pile}"]`);
            if (!src || !dst) return;

            src.classList.add('is-demo-pick-player');
            dst.classList.add('is-demo-target-player');

            scheduleDemo(() => {
                src.classList.remove('is-demo-pick-player');
                dst.classList.remove('is-demo-target-player');
                src.classList.add('is-slot-empty');
                src.innerHTML = '';

                animateDemoCardFlight(stage, src, dst, step.card, {}, token, () => {
                    dst.innerHTML = renderDemoCardHTML(step.card);
                    dst.classList.remove('is-demo-hit-cyan', 'is-demo-hit-emerald');
                    void dst.offsetWidth;
                    dst.classList.add(`is-demo-hit-${step.tone}`);
                    const cnt = stage.querySelector('[data-eg-cnt]');
                    if (cnt) cnt.textContent = `${idx + 1} / 3`;
                    setDemoReason(stage, step.reason, step.tone);
                    scheduleDemo(() => runStep(idx + 1), 1200, token);
                });
            }, 420, token);
        };

        scheduleDemo(() => runStep(0), 600, token);
    }

    // --- 6. CLUSTER-CASCADE DEMO (5-SPALTEN-FALLSPIEL & CLUSTER-KETTENREAKTION) ---
    function runCascadeDemo(stage, token) {
        // 3 sichtbare Zeilen × 5 Spalten (Zeile 2 = Boden)
        const board = [
            [null, null, null, null, null],
            [[1, 3, 2], null, null, [4, 0, 1], null],
            [[0, 0, 0], [1, 1, 1], null, [3, 3, 3], null]
        ];
        const drop1 = { col: 2, row: 2, card: [2, 2, 2] };
        const drop2 = { col: 4, row: 2, card: [4, 4, 4] };

        const renderCells = () => {
            let html = '';
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 5; c++) {
                    const card = board[r][c];
                    html += `
                        <div class="demo-cas-cell ${card ? 'has-card' : ''}" data-cas-r="${r}" data-cas-c="${c}">
                            ${card ? renderDemoCardHTML(card, false) : ''}
                        </div>
                    `;
                }
            }
            return html;
        };

        stage.className = 'arena-demo-stage is-rose w-full';
        stage.innerHTML = `
            <div class="arena-demo-topbar">
                <span class="arena-demo-live-pill">
                    <span class="arena-demo-live-dot"></span>
                    <span>Vorschau · 5×5 Fallspiel</span>
                </span>
                <div class="arena-demo-topbar-right">
                    <span class="arena-demo-score-pill">
                        <span class="text-rose-300">Punkte <strong data-cas-pts>0</strong></span>
                    </span>
                    <div class="arena-demo-dots" aria-hidden="true">
                        <span class="arena-demo-dot"></span>
                        <span class="arena-demo-dot"></span>
                        <span class="arena-demo-dot"></span>
                    </div>
                </div>
            </div>
            <div class="arena-demo-center-zone">
                <div data-demo-reason class="arena-demo-reason"></div>
                <div class="demo-cas-triggers">
                    ${[0, 1, 2, 3, 4].map(c => `<div class="demo-cas-trig" data-cas-trig="${c}">↓</div>`).join('')}
                </div>
                <div class="demo-cas-grid" data-cas-grid>${renderCells()}</div>
            </div>
        `;

        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setDemoReason(stage, 'Wirf Karten ein & löse 5er-Cluster auf!', 'rose');
            return;
        }

        const doDrop = (drop, onDone) => {
            const trig = stage.querySelector(`[data-cas-trig="${drop.col}"]`);
            const dst = stage.querySelector(`[data-cas-r="${drop.row}"][data-cas-c="${drop.col}"]`);
            if (!trig || !dst) return;
            trig.classList.add('is-active');
            scheduleDemo(() => {
                trig.classList.remove('is-active');
                animateDemoCardFlight(stage, trig, dst, drop.card, {
                    showBadge: false,
                    noTilt: true,
                    arcY: 0,
                    midScale: 1.02,
                    duration: 420,
                    easing: 'cubic-bezier(0.32, 0, 0.25, 1)',
                    extraClass: 'is-bot-flyer'
                }, token, () => {
                    board[drop.row][drop.col] = [...drop.card];
                    dst.classList.add('has-card', 'is-demo-hit-rose');
                    dst.innerHTML = renderDemoCardHTML(drop.card, false);
                    onDone();
                });
            }, 340, token);
        };

        // Schritt 1: Drop in Spalte 3
        scheduleDemo(() => {
            setDemoDots(stage, 0);
            setDemoReason(stage, '↓ Einwurf in Spalte 3 · 4/5 Cluster', 'rose');
            doDrop(drop1, () => {
                // Schritt 2: Drop in Spalte 5 → 5er-Cluster voll!
                scheduleDemo(() => {
                    setDemoDots(stage, 1);
                    setDemoReason(stage, '↓ Einwurf in Spalte 5 · Zeile komplett!', 'rose');
                    doDrop(drop2, () => {
                        // Schritt 3: Cluster-Burst & Gravitation!
                        scheduleDemo(() => {
                            setDemoDots(stage, 2);
                            for (let c = 0; c < 5; c++) {
                                stage.querySelector(`[data-cas-r="2"][data-cas-c="${c}"]`)?.classList.add('is-cascade-burst');
                            }
                            const pts = stage.querySelector('[data-cas-pts]');
                            if (pts) pts.textContent = '+250';
                            setDemoReason(stage, '✦ 5er-Cluster aufgelöst! +250 Pkt.', 'emerald');

                            scheduleDemo(() => {
                                // Obere Karten fallen 1 Zeile nach unten
                                board[2] = board[1].map(x => (x ? [...x] : null));
                                board[1] = [null, null, null, null, null];
                                const grid = stage.querySelector('[data-cas-grid]');
                                if (grid) {
                                    grid.innerHTML = renderCells();
                                    grid.querySelectorAll('.demo-cas-cell.has-card').forEach(el => el.classList.add('is-demo-deal'));
                                }
                                scheduleDemoReset(stage, () => runCascadeDemo(stage, token), token, 1400);
                            }, 620, token);
                        }, 480, token);
                    });
                }, 850, token);
            });
        }, 550, token);
    }

    function getVerhoerLayoutParts() {
        const vhView = document.getElementById('game-view-verhoer');
        if (!vhView) return null;
        const topHud = vhView.firstElementChild;
        const grid = vhView.querySelector(':scope > div.grid');
        const leftSkt = document.getElementById('vh-player-skt-box');
        const vhLobbyOv = document.getElementById('vh-lobby-overlay');
        const centerCard = vhLobbyOv ? vhLobbyOv.parentElement : null;
        const rightSkt = grid ? Array.from(grid.children).find(el => el.tagName === 'ASIDE' && el !== leftSkt) : null;
        return { vhView, topHud, grid, leftSkt, centerCard, rightSkt, vhLobbyOv };
    }

    function animateVerhoerFocusTransition(parts, entering, beforeRect) {
        if (!parts || !parts.centerCard) return;
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (typeof parts.centerCard.animate !== 'function') return;

        const spring = 'cubic-bezier(0.22, 1, 0.36, 1)';
        const { topHud, leftSkt, centerCard, rightSkt, vhLobbyOv } = parts;

        if (beforeRect && beforeRect.width > 40 && beforeRect.height > 40) {
            const afterRect = centerCard.getBoundingClientRect();
            if (afterRect.width > 40 && afterRect.height > 40) {
                const dx = (beforeRect.left + beforeRect.width / 2) - (afterRect.left + afterRect.width / 2);
                const dy = (beforeRect.top + beforeRect.height / 2) - (afterRect.top + afterRect.height / 2);
                const sx = Math.max(0.45, Math.min(1.65, beforeRect.width / afterRect.width));
                const sy = Math.max(0.55, Math.min(1.45, beforeRect.height / afterRect.height));
                centerCard.animate([
                    { transform: `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})` },
                    { transform: 'translate3d(0, 0, 0) scale(1, 1)' }
                ], {
                    duration: entering ? 420 : 340,
                    easing: spring
                });
            }
        }

        if (entering) {
            if (topHud) {
                topHud.animate([
                    { opacity: 0, transform: 'translate3d(0, -14px, 0) scale(0.985)' },
                    { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }
                ], { duration: 360, delay: 35, easing: spring, fill: 'backwards' });
            }
            if (leftSkt) {
                leftSkt.animate([
                    { opacity: 0, transform: 'translate3d(-34px, 0, 0) scale(0.96)' },
                    { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }
                ], { duration: 430, delay: 75, easing: spring, fill: 'backwards' });
            }
            if (rightSkt) {
                rightSkt.animate([
                    { opacity: 0, transform: 'translate3d(34px, 0, 0) scale(0.96)' },
                    { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }
                ], { duration: 430, delay: 75, easing: spring, fill: 'backwards' });
            }
            const upperZone = document.getElementById('vh-upper-table-zone');
            const handZone = document.getElementById('vh-player-hand');
            [upperZone, handZone].forEach((el, idx) => {
                if (!el) return;
                el.animate([
                    { opacity: 0, transform: 'translate3d(0, 10px, 0)' },
                    { opacity: 1, transform: 'translate3d(0, 0, 0)' }
                ], { duration: 320, delay: 80 + idx * 45, easing: spring, fill: 'backwards' });
            });
        } else if (vhLobbyOv && !vhLobbyOv.classList.contains('hidden')) {
            vhLobbyOv.animate([
                { opacity: 0 },
                { opacity: 1 }
            ], { duration: 260, delay: 40, easing: 'ease-out', fill: 'backwards' });
        }
    }

    function syncVerhoerLobbyLayout(allowAnimate = true) {
        const parts = getVerhoerLayoutParts();
        if (!parts) return;
        const { vhView, centerCard, vhLobbyOv } = parts;
        const isLobby = !isVerhoerRunning() && Boolean(vhLobbyOv && !vhLobbyOv.classList.contains('hidden'));
        const wasLobby = vhView.classList.contains('is-vh-lobby');
        if (wasLobby === isLobby) return;

        const visible = !vhView.classList.contains('hidden');
        const beforeRect = (allowAnimate && visible && centerCard) ? centerCard.getBoundingClientRect() : null;
        vhView.classList.toggle('is-vh-lobby', isLobby);
        if (allowAnimate && visible) {
            animateVerhoerFocusTransition(parts, !isLobby, beforeRect);
        }
    }

    function syncArenaLobbyDemo(forceRestart = false) {
        syncVerhoerLobbyLayout();
        if (!lobbyDemo.observersBound && typeof MutationObserver !== 'undefined') {
            lobbyDemo.observersBound = true;
            const obs = new MutationObserver(() => syncArenaLobbyDemo(false));
            ['page-game', 'game-lobby-overlay', 'vh-lobby-overlay', 'g3-lobby-overlay-daily', 'g3-lobby-overlay-sudoku', 'g3-lobby-overlay-endgame', 'g3-lobby-overlay-cascade'].forEach(id => {
                const el = document.getElementById(id);
                if (el) obs.observe(el, { attributes: true, attributeFilter: ['class'] });
            });
            document.addEventListener('visibilitychange', () => syncArenaLobbyDemo(false));
        }

        const target = getActiveDemoTarget();
        if (!target) {
            if (lobbyDemo.running) stopArenaLobbyDemo();
            return;
        }

        if (lobbyDemo.running && lobbyDemo.mode === target.mode && lobbyDemo.variant === target.variant && !forceRestart) {
            return;
        }

        stopArenaLobbyDemo();
        lobbyDemo.running = true;
        lobbyDemo.mode = target.mode;
        lobbyDemo.variant = target.variant;
        const token = ++lobbyDemo.runToken;

        if (target.mode === 'arena') runArenaDemo(target.stage, target.variant, token);
        else if (target.mode === 'verhoer') runVerhoerDemo(target.stage, token);
        else if (target.mode === 'daily') runDailyDemo(target.stage, token);
        else if (target.mode === 'sudoku') runSudokuDemo(target.stage, token);
        else if (target.mode === 'endgame') runEndgameDemo(target.stage, token);
        else if (target.mode === 'cascade') runCascadeDemo(target.stage, token);
    }

    // ------------------------------------------------------------------------
    // 2. FOKUSMODUS-STEUERUNG (ALLE 6 SPIELMODI · WERKZEUGE ERST IM FOKUSMODUS)
    // ------------------------------------------------------------------------
    function syncFocusModeClasses() {
        const shell = document.getElementById('g3-shell');
        if (!shell) return;

        const id = hubState.activeGame;
        const isSparring = typeof gameState !== 'undefined' && Boolean(gameState.isTrainingMatch);
        const inFocus = !isSparring && isCurrentModeInFocus();
        const isPuzzleFocus = inFocus && PUZZLE_MODES.has(id);

        // Für „Das Verhör“: Ausgangsposition VOR dem Verbreitern / Aufklappen der SKT-Spalten messen (FLIP)
        const vhParts = id === 'verhoer' ? getVerhoerLayoutParts() : null;
        const vhVisible = Boolean(vhParts && !vhParts.vhView.classList.contains('hidden'));
        const vhNextLobby = vhParts ? (!isVerhoerRunning() && Boolean(vhParts.vhLobbyOv && !vhParts.vhLobbyOv.classList.contains('hidden'))) : false;
        const vhStateChanged = Boolean(vhParts && vhVisible && vhParts.vhView.classList.contains('is-vh-lobby') !== vhNextLobby);
        const vhBeforeRect = (vhStateChanged && vhParts.centerCard) ? vhParts.centerCard.getBoundingClientRect() : null;

        shell.classList.toggle('is-sparring', isSparring);
        shell.classList.toggle('is-focus-mode', inFocus);
        shell.classList.toggle('is-focus-arena', inFocus && id === 'arena');
        shell.classList.toggle('is-focus-verhoer', inFocus && id === 'verhoer');
        shell.classList.toggle('is-focus-puzzle', isPuzzleFocus);

        if (vhParts) {
            vhParts.vhView.classList.toggle('is-vh-lobby', vhNextLobby);
            if (vhStateChanged) {
                animateVerhoerFocusTransition(vhParts, !vhNextLobby, vhBeforeRect);
            }
        }

        // Kartenfortschritt in der Arena nur während laufender Partie zeigen
        const arenaProgEl = document.getElementById('g3-right-arena-progress');
        if (arenaProgEl) {
            const showProg = id === 'arena' && isArenaRunning() && arenaProgEl.children.length > 0;
            arenaProgEl.classList.toggle('hidden', !showProg);
        }

        // Bei Rätselmodi: Vor dem Start NUR Setup-Karte zeigen; im Fokusmodus NUR Fokus-Leiste + Werkzeug-Dock!
        const cardWrap = document.getElementById('g3-right-card-wrap');
        const puzzleFocusBar = document.getElementById('g3-focus-puzzle-bar');
        if (cardWrap) {
            cardWrap.classList.toggle('hidden', isPuzzleFocus);
        }
        if (puzzleFocusBar) {
            puzzleFocusBar.classList.toggle('hidden', !isPuzzleFocus);
            if (isPuzzleFocus) {
                const meta = GAME_META[id] || GAME_CATALOG[0];
                const session = getFullSession();
                const isLiveGroup = Boolean(session && session.kind === id && session.phase === 'playing');
                puzzleFocusBar.innerHTML = `
                    <div class="space-y-2.5">
                        <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2 min-w-0">
                                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                                <span class="text-xs font-extrabold text-white truncate">${meta.title}</span>
                                ${getHeaderStatHTML(id)}
                            </div>
                            <button type="button" onclick="toggleGameInfoModal('${id}')" title="Spielregeln" class="g3-rules-icon-btn shrink-0">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                            </button>
                        </div>
                        <div class="flex items-center gap-2">
                            ${isLiveGroup && session.isHost ? `
                                <button type="button" onclick="window.BlinkMultiplayer.crEndRound()" class="flex-1 py-2 px-3 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs transition">Runde auswerten</button>
                            ` : ''}
                            <button type="button" onclick="window.BlinkGameHub.exitFocusMode()" class="${isLiveGroup && session.isHost ? '' : 'w-full'} g3-abort-btn">
                                Partie beenden
                            </button>
                        </div>
                    </div>
                `;
            }
        }

        // Start-Overlays über den 4 Rätsel-Spielfeldern synchronisieren
        PUZZLE_MODES.forEach(modeId => {
            const ov = document.getElementById(`g3-lobby-overlay-${modeId}`);
            if (!ov) return;
            const showOverlay = !isPuzzleInFocus(modeId) && !hubState.puzzleCompletedView[modeId];
            ov.classList.toggle('hidden', !showOverlay);
        });

        updateDockVisibility();
        hideArenaPlayerAndBotSublines();
        unifyAbortButtons();
        syncArenaLobbyDemo();
    }

    // Werkzeug-Blöcke (Tagesstatus, Karten-Baukasten, Endgame-Info, Nächste Karte) NUR im Fokusmodus anzeigen!
    function updateDockVisibility() {
        const dockEl = document.getElementById('g3-right-dock');
        if (!dockEl) return;

        const id = hubState.activeGame;
        const showForActivePuzzle = PUZZLE_MODES.has(id) && isPuzzleInFocus(id);

        let visibleCount = 0;
        dockEl.querySelectorAll('[data-g3-dock-for]').forEach(el => {
            const show = showForActivePuzzle && el.getAttribute('data-g3-dock-for') === id;
            el.classList.toggle('hidden', !show);
            if (show) visibleCount++;
        });
        dockEl.classList.toggle('hidden', visibleCount === 0);
    }

    function syncArenaActionButtons() {
        const restockBtn = document.getElementById('g3-btn-restock');
        if (restockBtn) {
            const running = isArenaRunning();
            restockBtn.disabled = !running;
            restockBtn.classList.toggle('is-deadlock', Boolean(running && hubState.restockAlert));
        }

        const analysisBtn = document.getElementById('g3-btn-analysis');
        const analysisCnt = document.getElementById('g3-analysis-count');
        if (analysisBtn) {
            const moves = getArenaMoveCount();
            analysisBtn.disabled = moves === 0;
            if (analysisCnt) {
                analysisCnt.textContent = moves > 0 ? `${moves}` : '';
                analysisCnt.classList.toggle('hidden', moves === 0);
            }
        }
    }

    function clearPuzzleAutoExit(modeId) {
        if (hubState.puzzleAutoExitTimers[modeId]) {
            clearTimeout(hubState.puzzleAutoExitTimers[modeId]);
            hubState.puzzleAutoExitTimers[modeId] = null;
        }
    }

    function scheduleAutoExitPuzzleFocus(modeId, delayMs = 1350) {
        if (!hubState.puzzleFocus[modeId] || hubState.puzzleAutoExitTimers[modeId]) return;
        hubState.puzzleAutoExitTimers[modeId] = setTimeout(() => {
            hubState.puzzleAutoExitTimers[modeId] = null;
            if (!hubState.puzzleFocus[modeId]) return;
            hubState.puzzleFocus[modeId] = false;
            hubState.puzzleCompletedView[modeId] = true; // Gelöstes Brett bleibt sichtbar
            if (hubState.activeGame === modeId) {
                renderWorkspaceSidebars();
            }
        }, delayMs);
    }

    function exitFocusMode(silent = false) {
        const id = hubState.activeGame;
        if (!silent && typeof playSound === 'function') playSound('tick');

        if (id === 'arena' && isArenaRunning() && typeof abortCurrentBlinkGame === 'function') {
            abortCurrentBlinkGame();
            return;
        }
        if (id === 'verhoer' && isVerhoerRunning() && typeof vhAbortGame === 'function') {
            vhAbortGame();
            return;
        }
        if (PUZZLE_MODES.has(id)) {
            clearPuzzleAutoExit(id);
            const session = getFullSession();
            if (session && session.kind === id && session.phase === 'playing') {
                if (session.isHost && window.BlinkMultiplayer && typeof window.BlinkMultiplayer.crEndRound === 'function') {
                    window.BlinkMultiplayer.crEndRound();
                } else if (window.BlinkMultiplayer && typeof window.BlinkMultiplayer.leaveSession === 'function') {
                    window.BlinkMultiplayer.leaveSession(id);
                }
            }
            hubState.puzzleFocus[id] = false;
            hubState.puzzleCompletedView[id] = false;
            if (typeof stopGameMusic === 'function') stopGameMusic();
            renderWorkspaceSidebars();
        }
    }

    // ------------------------------------------------------------------------
    // 3. LINKE SPALTE: MODUSAUSWAHL
    // ------------------------------------------------------------------------
    function renderLeftModes() {
        const leftEl = document.getElementById('g3-left-modes');
        if (!leftEl) return;

        const session = getFullSession();
        const duels = GAME_CATALOG.filter(g => g.group === 'duel');
        const puzzles = GAME_CATALOG.filter(g => g.group === 'puzzle');

        const renderBtn = (item) => {
            const isSel = item.id === hubState.activeGame;
            const isLive = Boolean(session && session.kind === item.id);
            return `
                <button type="button" onclick="window.BlinkGameHub.selectMode('${item.id}')"
                    class="g3-mode-btn g3-accent-${item.accent} ${isSel ? 'is-active' : ''}">
                    <span class="g3-mode-icon">${item.icon}</span>
                    <span class="g3-mode-name">${item.title}</span>
                    ${isLive ? `<span class="g3-live-dot ${session.connected ? 'is-ok' : 'is-wait'}" title="Raum ${escHtml(session.code)}"></span>` : ''}
                </button>
            `;
        };

        leftEl.innerHTML = `
            <div class="aceternity-bento-card g3-rail-card">
                <div class="g3-rail-group">
                    <div class="g3-rail-heading">Duelle</div>
                    ${duels.map(renderBtn).join('')}
                </div>
                <div class="g3-rail-group">
                    <div class="g3-rail-heading">Rätsel</div>
                    ${puzzles.map(renderBtn).join('')}
                </div>
            </div>
        `;
    }

    // ------------------------------------------------------------------------
    // 4. RECHTE SPALTE: SETUP (VOR START) ODER SCHLANKE LIVE-HUD (ARENA)
    // ------------------------------------------------------------------------
    function renderSeg(items, activeId, onClickFn) {
        return `
            <div class="g3-seg-rail">
                ${items.map(it => `
                    <button type="button" onclick="${onClickFn(it.id)}" class="g3-seg-btn ${activeId === it.id ? 'is-active' : ''}">
                        ${it.dot ? `<span class="w-1.5 h-1.5 rounded-full ${it.dot} shrink-0"></span>` : ''}
                        <span>${escHtml(it.label)}</span>
                    </button>
                `).join('')}
            </div>
        `;
    }

    function renderSettingBlock(label, controlHtml) {
        return `
            <div class="g3-setting-block">
                <div class="g3-setting-label">${label}</div>
                ${controlHtml}
            </div>
        `;
    }

    function buildInlineOnlineHTML(session) {
        const isGroup = session.kind === 'daily' || session.kind === 'sudoku';

        if (isGroup && (session.phase === 'playing' || session.phase === 'results')) {
            const list = session.leaderboard || [];
            const rows = list.map((p, idx) => {
                const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx + 1}`));
                const pct = p.total > 0 ? Math.min(100, Math.round((p.progress / p.total) * 100)) : 0;
                return `
                    <div class="cr-lb-row ${p.id === session.myId ? 'is-me' : ''}">
                        <div class="flex items-center gap-2 min-w-0 flex-1">
                            <span class="w-5 text-center text-[11px] font-extrabold mono shrink-0">${medal}</span>
                            <span class="shrink-0">${renderAvatarSafe(p.profile, 20)}</span>
                            <div class="min-w-0 flex-1">
                                <div class="text-[11px] font-bold text-white truncate">${escHtml(p.name)}</div>
                                <div class="w-full h-1 rounded-full bg-white/[0.08] overflow-hidden mt-1">
                                    <div class="h-full rounded-full ${p.finished ? 'bg-emerald-400' : 'bg-cyan-400'}" style="width:${pct}%"></div>
                                </div>
                            </div>
                        </div>
                        <div class="text-right mono shrink-0">
                            <div class="text-[11px] font-extrabold text-white">${(p.score || 0).toLocaleString('de-DE')}</div>
                            <div class="text-[9px] text-slate-400">${p.finished && p.finishSec ? fmtMMSS(p.finishSec) : `${p.progress}/${p.total || '?'}`}</div>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="g3-online-box space-y-2.5">
                    <div class="flex items-center justify-between gap-2 text-[11px]">
                        <span class="font-extrabold text-white">${session.phase === 'results' ? 'Ergebnis' : `Live · ${escHtml(session.code)}`}</span>
                        <span class="mono text-slate-400">${list.filter(p => p.finished).length}/${list.length} fertig</span>
                    </div>
                    <div class="space-y-1 max-h-[190px] overflow-y-auto pr-0.5">${rows}</div>
                    <div class="space-y-1.5 pt-1">
                        ${session.isHost ? (
                            session.phase === 'playing'
                                ? `<button type="button" onclick="window.BlinkMultiplayer.crEndRound()" class="w-full py-2.5 px-4 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs transition">Runde auswerten</button>`
                                : `<button type="button" onclick="window.BlinkGameHub.startInlineOnline()" class="w-full py-2.5 px-4 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs transition">▶ Nächste Runde</button>`
                        ) : ''}
                        <button type="button" onclick="window.BlinkGameHub.leaveInlineOnline()" class="w-full g3-abort-btn">
                            ${session.isHost ? 'Raum schließen' : 'Raum verlassen'}
                        </button>
                    </div>
                </div>
            `;
        }

        const playersHtml = isGroup
            ? `<div class="space-y-1 max-h-[110px] overflow-y-auto pr-0.5">
                ${(session.leaderboard || []).map(p => `
                    <div class="g3-player-chip">
                        <span class="shrink-0">${renderAvatarSafe(p.profile, 20)}</span>
                        <span class="text-[11px] font-bold text-white truncate">${escHtml(p.name)}</span>
                        ${p.id === session.myId ? '<span class="ml-auto text-[9px] mono text-cyan-300 font-bold">Du</span>' : ''}
                    </div>
                `).join('')}
               </div>`
            : `<div class="space-y-1.5">
                <div class="g3-player-chip">
                    <span class="shrink-0">${renderAvatarSafe(typeof getPlayerProfile === 'function' ? getPlayerProfile() : null, 20)}</span>
                    <span class="text-[11px] font-bold text-white truncate flex-1">${escHtml(typeof getPlayerName === 'function' ? getPlayerName() : 'Du')}</span>
                    <span class="text-[9px] mono text-cyan-300">${session.isHost ? 'Host' : 'Gast'}</span>
                </div>
                <div class="g3-player-chip">
                    <span class="shrink-0">${session.connected ? renderAvatarSafe(session.oppProfile, 20) : '<span class="w-5 h-5 rounded-full border border-dashed border-white/25 inline-flex items-center justify-center text-[9px] text-slate-500">?</span>'}</span>
                    <span class="text-[11px] font-bold text-white truncate flex-1">${session.connected ? escHtml(session.oppName || 'Gegner') : 'Warte auf Gegner…'}</span>
                    <span class="text-[9px] mono ${session.connected ? 'text-emerald-300' : 'text-slate-400'}">${session.connected ? 'Bereit' : 'Offen'}</span>
                </div>
               </div>`;

        const canStart = isGroup ? (session.leaderboard || []).length > 0 : session.connected;
        const showQr = !session.connected || isGroup;

        return `
            <div class="g3-online-box space-y-3">
                <div class="flex items-center justify-between gap-2">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mono">Raum ${escHtml(session.code)}</span>
                    <span class="text-[10px] mono font-bold ${session.connected ? 'text-emerald-300' : 'text-amber-300'}">
                        ${isGroup ? `${(session.leaderboard || []).length} bereit` : (session.connected ? '● Verbunden' : '● Warte…')}
                    </span>
                </div>

                ${showQr ? `
                    <div class="flex flex-col items-center gap-2">
                        <div class="mp-qr-frame p-1.5">${session.qrHtml || ''}</div>
                        <div class="flex items-center gap-1.5 w-full">
                            <button type="button" id="g3-copy-code" title="Code kopieren"
                                class="flex-1 py-1.5 px-2.5 rounded-full g3-code-pill text-xs font-extrabold tracking-[0.2em] text-cyan-300 mono transition">
                                ${escHtml(session.code)}
                            </button>
                            <button type="button" id="g3-copy-link"
                                class="py-1.5 px-3 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-[11px] font-bold text-white shrink-0 transition">
                                Link
                            </button>
                        </div>
                    </div>
                ` : ''}

                ${playersHtml}

                ${isGroup && session.isHost ? `
                    <label class="flex items-center justify-between gap-2 text-[11px] text-slate-300 cursor-pointer">
                        <span>Selbst mitspielen</span>
                        <input type="checkbox" ${session.hostPlays ? 'checked' : ''} onchange="window.BlinkMultiplayer.crToggleHostPlays(this.checked)">
                    </label>
                ` : ''}

                <div class="space-y-1.5 pt-1">
                    ${session.isHost ? `
                        <button type="button" onclick="window.BlinkGameHub.startInlineOnline()" ${canStart ? '' : 'disabled'}
                            class="w-full py-2.5 px-4 rounded-full bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-extrabold text-xs tracking-wide transition shadow-lg">
                            ▶ Jetzt spielen
                        </button>
                    ` : `
                        <div class="w-full py-2 px-3 rounded-full bg-white/[0.04] border border-white/10 text-center text-[11px] mono text-slate-300">
                            ${session.connected ? 'Verbunden · Warte auf Start…' : 'Verbinde…'}
                        </div>
                    `}
                    <button type="button" onclick="window.BlinkGameHub.leaveInlineOnline()" class="w-full g3-abort-btn">
                        Verbindung trennen
                    </button>
                </div>
            </div>
        `;
    }

    function wireInlineCopyButtons() {
        const session = getFullSession();
        if (!session || session.kind !== hubState.activeGame) return;
        const codeBtn = document.getElementById('g3-copy-code');
        const linkBtn = document.getElementById('g3-copy-link');
        if (codeBtn && window.BlinkMultiplayer && typeof window.BlinkMultiplayer.copyCode === 'function') {
            codeBtn.onclick = () => window.BlinkMultiplayer.copyCode(session.code, codeBtn);
        }
        if (linkBtn && window.BlinkMultiplayer && typeof window.BlinkMultiplayer.copyLink === 'function') {
            linkBtn.onclick = () => window.BlinkMultiplayer.copyLink(session.url, linkBtn);
        }
    }

    function renderRightPanel() {
        const dynEl = document.getElementById('g3-right-dynamic');
        const cardWrap = document.getElementById('g3-right-card-wrap');
        if (!dynEl) return;

        const id = hubState.activeGame;
        const meta = GAME_META[id] || GAME_CATALOG[0];
        const arenaRunning = id === 'arena' && isArenaRunning();

        if (cardWrap) {
            cardWrap.className = `aceternity-bento-card g3-right-card g3-accent-${meta.accent} ${arenaRunning ? 'p-3.5 space-y-3' : 'p-4 sm:p-5 space-y-4'}`;
        }

        // FOKUSMODUS BLINK-ARENA: Nur Live-HUD + Kartenfortschritt + Restock + Partie beenden
        if (arenaRunning) {
            const ruleLbl = (typeof gameState !== 'undefined' && gameState.ruleMode === 'cluster') ? 'Cluster (3)' : 'Standard (2)';
            dynEl.innerHTML = `
                <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                        <span class="text-xs font-extrabold text-white truncate">${ruleLbl}</span>
                    </div>
                    <button type="button" onclick="toggleGameInfoModal('arena')" title="Spielregeln" class="g3-rules-icon-btn shrink-0">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    </button>
                </div>

                <button type="button" id="g3-btn-restock" onclick="if(typeof resolveDeadlockStocken==='function') resolveDeadlockStocken()"
                    title="Neue Mittelkarten aufdecken (Leertaste)"
                    class="w-full g3-action-btn ${hubState.restockAlert ? 'is-deadlock' : ''}">
                    <span>↻ Restock</span>
                    <span class="text-[10px] mono opacity-60">[Space]</span>
                </button>

                <button type="button" onclick="if(typeof abortCurrentBlinkGame==='function') abortCurrentBlinkGame()"
                    class="w-full g3-abort-btn">
                    Partie beenden
                </button>
            `;
            syncFocusModeClasses();
            syncArenaActionButtons();
            return;
        }

        // SETUP-ANSICHT (VOR SPIELSTART / NACH SPIELENDE — ALLE 6 MODI EINHEITLICH)
        const choice = meta.playModes.length ? (hubState.playChoice[id] || meta.playModes[0].id) : 'solo';
        const session = getFullSession();
        const isThisOnlineActive = Boolean(session && session.kind === id);
        const mpOpts = getOnlineSettings();
        const blocks = [];

        if (meta.playModes.length > 1) {
            blocks.push(renderSettingBlock('Modus', renderSeg(
                meta.playModes.map(pm => ({ id: pm.id, label: pm.label, dot: pm.id === 'online' ? 'bg-emerald-400' : '' })),
                choice,
                val => `window.BlinkGameHub.setPlayChoice('${id}','${val}')`
            )));
        }

        if (id === 'arena') {
            if (!isThisOnlineActive || session.isHost) {
                blocks.push(renderSettingBlock('Regeln', renderSeg(
                    [{ id: 'normal', label: 'Standard (2)' }, { id: 'cluster', label: 'Cluster (3)' }],
                    hubState.arenaRule,
                    val => `window.BlinkGameHub.setArenaRule('${val}')`
                )));
            }
            if (choice === 'ai') {
                blocks.push(renderSettingBlock('Schwierigkeit', renderSeg(
                    ARENA_DIFF_LEVELS.map(d => ({ id: d.id, label: d.label })),
                    hubState.arenaDiff,
                    val => `window.BlinkGameHub.setArenaDiff('${val}')`
                )));
            } else if (choice === 'trained-ai') {
                const roster = (typeof brainState !== 'undefined' && Array.isArray(brainState.roster)) ? brainState.roster : [];
                if (roster.length > 0) {
                    const activeIdx = brainState.activeIdx || 0;
                    blocks.push(renderSettingBlock('Gegner-KI', `
                        <div class="space-y-1.5">
                            ${roster.map((ai, idx) => `
                                <button type="button" onclick="window.BlinkGameHub.onTrainedAIChange(${idx})"
                                    class="g3-ai-item ${idx === activeIdx ? 'is-active' : ''}">
                                    <span class="truncate font-bold text-xs">${escHtml(ai.name)}</span>
                                    <span class="text-[10px] mono opacity-75 shrink-0">${ai.elo} Elo</span>
                                </button>
                            `).join('')}
                        </div>
                    `));
                } else {
                    blocks.push(renderSettingBlock('Gegner-KI', `
                        <button type="button" onclick="navigateTo('ai'); openAICreator();"
                            class="w-full py-2 px-3 rounded-xl border border-emerald-400/40 bg-emerald-500/10 text-emerald-300 text-xs font-bold transition">
                            + Neue KI erstellen
                        </button>
                    `));
                }
            }
        } else if (id === 'daily') {
            if (choice === 'solo') {
                blocks.push(renderSettingBlock('Rätsel', renderSeg(
                    [{ id: 'today', label: 'Heutige Challenge' }, { id: 'practice', label: 'Übungsbrett' }],
                    hubState.dailySoloVariant,
                    val => `window.BlinkGameHub.setDailySoloVar('${val}')`
                )));
            } else if (!isThisOnlineActive || session.isHost) {
                blocks.push(renderSettingBlock('Rätsel', renderSeg(
                    [{ id: 'random', label: 'Neues Brett' }, { id: 'today', label: 'Heute' }],
                    mpOpts.dailyVariant,
                    val => `window.BlinkGameHub.setDailyOnlineVar('${val}')`
                )));
                blocks.push(renderSettingBlock('Zeitlimit', renderSeg(
                    [{ id: '0', label: 'Ohne' }, { id: '120', label: '2m' }, { id: '180', label: '3m' }, { id: '300', label: '5m' }],
                    String(mpOpts.timeLimitSec),
                    val => `window.BlinkGameHub.setOnlineTime(${val})`
                )));
            }
        } else if (id === 'sudoku') {
            if (!isThisOnlineActive || session.isHost) {
                blocks.push(renderSettingBlock('Schwierigkeit', renderSeg(
                    SUDOKU_DIFF_LEVELS.map(d => ({ id: d.id, label: d.label })),
                    hubState.sudokuDiff,
                    val => `window.BlinkGameHub.setSudokuDiff('${val}')`
                )));
            }
            if (choice === 'online' && (!isThisOnlineActive || session.isHost)) {
                blocks.push(renderSettingBlock('Zeitlimit', renderSeg(
                    [{ id: '0', label: 'Ohne' }, { id: '120', label: '2m' }, { id: '180', label: '3m' }, { id: '300', label: '5m' }],
                    String(mpOpts.timeLimitSec),
                    val => `window.BlinkGameHub.setOnlineTime(${val})`
                )));
            }
        }

        // Einheitlicher Aktions-Button „▶ Jetzt spielen“ (oder Online-Steuerung)
        let actionHtml = '';
        if (choice === 'online') {
            if (isThisOnlineActive) {
                actionHtml = buildInlineOnlineHTML(session);
            } else {
                actionHtml = `
                    <div class="g3-online-box space-y-2.5">
                        <button type="button" onclick="window.BlinkGameHub.launchOnlineCreate('${id}')"
                            class="w-full py-2.5 px-4 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs tracking-wide transition shadow-lg">
                            Raum erstellen (QR &amp; Link)
                        </button>
                        <div class="flex items-center gap-1.5">
                            <input id="g3-online-code-input" type="text" maxlength="6"
                                value="${escHtml(hubState.joinCodeDraft)}"
                                oninput="window.BlinkGameHub.onJoinCodeInput(this.value)"
                                onkeydown="if(event.key==='Enter') window.BlinkGameHub.launchOnlineJoin('${id}')"
                                placeholder="Code (K7M4)"
                                class="flex-1 min-w-0 g3-code-input rounded-full px-3.5 py-2 text-xs font-bold mono uppercase tracking-widest focus:outline-none">
                            <button type="button" onclick="window.BlinkGameHub.launchOnlineJoin('${id}')"
                                class="px-3.5 py-2 rounded-full bg-white text-slate-950 hover:bg-cyan-300 font-extrabold text-xs shrink-0 transition">
                                Join
                            </button>
                        </div>
                    </div>
                `;
            }
        } else {
            const rosterEmpty = id === 'arena' && choice === 'trained-ai' && !(typeof brainState !== 'undefined' && Array.isArray(brainState.roster) && brainState.roster.length > 0);
            actionHtml = `
                <button type="button" onclick="window.BlinkGameHub.launchOfflineGame()" ${rosterEmpty ? 'disabled' : ''}
                    class="w-full py-3 px-5 rounded-full bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-extrabold text-xs sm:text-sm tracking-wide transition shadow-lg">
                    ▶ Jetzt spielen
                </button>
            `;
        }

        // Nach einer gespielten Arena-Partie: Analyse-Button
        let postMatchBtnHtml = '';
        if (id === 'arena') {
            const moves = getArenaMoveCount();
            if (moves > 0) {
                postMatchBtnHtml = `
                    <button type="button" id="g3-btn-analysis" onclick="if(typeof openMatchAnalysisModal==='function') openMatchAnalysisModal()"
                        class="w-full g3-action-btn">
                        <span>Letzte Partie analysieren</span>
                        <span id="g3-analysis-count" class="g3-count-pill">${moves}</span>
                    </button>
                `;
            }
        }

        dynEl.innerHTML = `
            <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <h2 class="text-base font-extrabold text-white heading-font leading-tight">${meta.title}</h2>
                        ${getHeaderStatHTML(id)}
                    </div>
                    <p class="text-[11px] text-slate-400 mt-0.5">${meta.shortSub}</p>
                </div>
                <button type="button" onclick="toggleGameInfoModal('${id}')" title="Spielregeln öffnen" class="g3-rules-icon-btn shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                </button>
            </div>

            ${blocks.length ? `<div class="space-y-3">${blocks.join('')}</div>` : ''}
            ${actionHtml}
            ${postMatchBtnHtml}
        `;

        wireInlineCopyButtons();
        syncFocusModeClasses();
        syncArenaActionButtons();
    }

    function renderWorkspaceSidebars() {
        renderLeftModes();
        renderRightPanel();
    }

    // ------------------------------------------------------------------------
    // 5. STEUERUNGS-AKTIONEN
    // ------------------------------------------------------------------------
    function selectMode(gameId) {
        if (!GAME_IDS.includes(gameId)) return;
        ensureWorkspaceDOM();
        PUZZLE_MODES.forEach(m => {
            clearPuzzleAutoExit(m);
            hubState.puzzleFocus[m] = false;
            hubState.puzzleCompletedView[m] = false;
        });
        hubState.activeGame = gameId;
        const session = getFullSession();
        if (session && session.kind === gameId) {
            hubState.playChoice[gameId] = 'online';
        }
        if (typeof window.setGameSubTab === 'function') {
            window.setGameSubTab(gameId);
        } else {
            renderWorkspaceSidebars();
        }
    }

    function setPlayChoice(gameId, choice) {
        if (!GAME_IDS.includes(gameId)) return;
        hubState.playChoice[gameId] = choice;
        if (typeof playSound === 'function') playSound('tick');

        if (gameId === 'arena' && choice !== 'online') {
            if (typeof p2pState !== 'undefined' && (p2pState.peer || p2pState.connected)) {
                if (typeof p2pDisconnect === 'function') p2pDisconnect(true);
            }
            const modeSel = document.getElementById('select-game-mode');
            if (modeSel) {
                modeSel.value = choice === 'trained-ai' ? 'trained-ai' : 'ai';
                if (typeof onGameConfigChange === 'function') onGameConfigChange();
            }
        }
        renderRightPanel();
    }

    function setArenaRule(rule) {
        hubState.arenaRule = rule === 'cluster' ? 'cluster' : 'normal';
        const ruleSel = document.getElementById('select-rule-mode');
        if (ruleSel) {
            ruleSel.value = hubState.arenaRule;
            if (typeof onGameConfigChange === 'function') onGameConfigChange();
        }
        if (typeof playSound === 'function') playSound('tick');
        renderRightPanel();
        syncArenaLobbyDemo(true);
    }

    function setArenaDiff(diffId) {
        if (!ARENA_DIFF_LEVELS.some(d => d.id === diffId)) return;
        hubState.arenaDiff = diffId;
        const sel = document.getElementById('select-ai-difficulty');
        if (sel) {
            sel.value = resolveArenaBotValue(diffId);
            if (typeof updateAIDifficulty === 'function') updateAIDifficulty();
        }
        if (typeof playSound === 'function') playSound('tick');
        renderRightPanel();
    }

    function setDailySoloVar(variant) {
        hubState.dailySoloVariant = variant === 'practice' ? 'practice' : 'today';
        if (typeof playSound === 'function') playSound('tick');
        renderRightPanel();
    }

    function setSudokuDiff(diffId) {
        const d = SUDOKU_DIFF_LEVELS.find(x => x.id === diffId) || SUDOKU_DIFF_LEVELS[0];
        hubState.sudokuDiff = d.id;
        if (window.BlinkMultiplayer && typeof window.BlinkMultiplayer.crSetSudokuDiff === 'function') {
            window.BlinkMultiplayer.crSetSudokuDiff(d.emptyCount, d.label);
        }
        if (typeof playSound === 'function') playSound('tick');
        renderRightPanel();
    }

    function setOnlineTime(sec) {
        if (window.BlinkMultiplayer && typeof window.BlinkMultiplayer.crSetTime === 'function') {
            window.BlinkMultiplayer.crSetTime(sec);
        }
        renderRightPanel();
    }

    function setDailyOnlineVar(variant) {
        if (window.BlinkMultiplayer && typeof window.BlinkMultiplayer.crSetDailyVar === 'function') {
            window.BlinkMultiplayer.crSetDailyVar(variant);
        }
        renderRightPanel();
    }

    function onTrainedAIChange(idx) {
        if (typeof selectTrainedAIForArena === 'function') selectTrainedAIForArena(idx);
        renderRightPanel();
    }

    function onJoinCodeInput(val) {
        hubState.joinCodeDraft = String(val || '').toUpperCase().slice(0, 6);
    }

    function launchOfflineGame() {
        const id = hubState.activeGame;
        const choice = hubState.playChoice[id] || 'solo';

        if (id === 'arena') {
            const modeSel = document.getElementById('select-game-mode');
            if (modeSel) modeSel.value = choice === 'trained-ai' ? 'trained-ai' : 'ai';
            const ruleSel = document.getElementById('select-rule-mode');
            if (ruleSel) ruleSel.value = hubState.arenaRule;
            const diffSel = document.getElementById('select-ai-difficulty');
            if (diffSel && choice === 'ai') diffSel.value = resolveArenaBotValue(hubState.arenaDiff);
            if (typeof onGameConfigChange === 'function') onGameConfigChange();
            if (typeof startNewBlinkGame === 'function') startNewBlinkGame();
            renderWorkspaceSidebars();
            return;
        }
        if (id === 'verhoer') {
            if (typeof vhStartNewGame === 'function') vhStartNewGame();
            if (typeof syncActiveGameModeMusic === 'function') syncActiveGameModeMusic();
            renderWorkspaceSidebars();
            return;
        }
        if (id === 'daily') {
            clearPuzzleAutoExit('daily');
            hubState.puzzleCompletedView.daily = false;
            hubState.puzzleFocus.daily = true;
            if (hubState.dailySoloVariant === 'practice' && typeof startPracticeDaily === 'function') {
                startPracticeDaily();
            } else if (typeof initDailyChallenge === 'function') {
                initDailyChallenge();
            } else if (typeof dailyState !== 'undefined' && Array.isArray(dailyState.solutions) && dailyState.solutions.length > 0 && dailyState.foundKeys.size >= dailyState.solutions.length && typeof startPracticeDaily === 'function') {
                startPracticeDaily();
            }
            if (typeof playSound === 'function') playSound('play');
            if (typeof syncActiveGameModeMusic === 'function') syncActiveGameModeMusic();
            renderWorkspaceSidebars();
            return;
        }
        if (id === 'sudoku') {
            clearPuzzleAutoExit('sudoku');
            hubState.puzzleCompletedView.sudoku = false;
            hubState.puzzleFocus.sudoku = true;
            const d = SUDOKU_DIFF_LEVELS.find(x => x.id === hubState.sudokuDiff) || SUDOKU_DIFF_LEVELS[0];
            if (typeof startSudokuGame === 'function') startSudokuGame(d.emptyCount, d.label);
            if (typeof playSound === 'function') playSound('play');
            if (typeof syncActiveGameModeMusic === 'function') syncActiveGameModeMusic();
            renderWorkspaceSidebars();
            return;
        }
        if (id === 'endgame') {
            clearPuzzleAutoExit('endgame');
            hubState.puzzleCompletedView.endgame = false;
            hubState.puzzleFocus.endgame = true;
            if (typeof endgameState !== 'undefined' && endgameState.solved && typeof nextEndgamePuzzle === 'function') {
                nextEndgamePuzzle();
            }
            if (typeof playSound === 'function') playSound('play');
            if (typeof syncActiveGameModeMusic === 'function') syncActiveGameModeMusic();
            renderWorkspaceSidebars();
            return;
        }
        if (id === 'cascade') {
            clearPuzzleAutoExit('cascade');
            hubState.puzzleCompletedView.cascade = false;
            hubState.puzzleFocus.cascade = true;
            if (typeof initCascadeGame === 'function') initCascadeGame();
            if (typeof playSound === 'function') playSound('play');
            if (typeof syncActiveGameModeMusic === 'function') syncActiveGameModeMusic();
            renderWorkspaceSidebars();
            return;
        }
    }

    function launchOnlineCreate(gameId) {
        if (gameId === 'arena') {
            const ruleSel = document.getElementById('select-rule-mode');
            if (ruleSel) ruleSel.value = hubState.arenaRule;
        } else if (gameId === 'sudoku') {
            const d = SUDOKU_DIFF_LEVELS.find(x => x.id === hubState.sudokuDiff) || SUDOKU_DIFF_LEVELS[0];
            if (window.BlinkMultiplayer && typeof window.BlinkMultiplayer.crSetSudokuDiff === 'function') {
                window.BlinkMultiplayer.crSetSudokuDiff(d.emptyCount, d.label);
            }
        }
        if (window.BlinkMultiplayer && typeof window.BlinkMultiplayer.createInline === 'function') {
            window.BlinkMultiplayer.createInline(gameId);
        }
        renderWorkspaceSidebars();
    }

    function launchOnlineJoin(gameId) {
        const inp = document.getElementById('g3-online-code-input');
        const code = (inp ? inp.value : hubState.joinCodeDraft).trim().toUpperCase();
        hubState.joinCodeDraft = code;
        if (window.BlinkMultiplayer && typeof window.BlinkMultiplayer.joinInline === 'function') {
            window.BlinkMultiplayer.joinInline(gameId, code);
        }
        renderWorkspaceSidebars();
    }

    function startInlineOnline() {
        const session = getFullSession();
        if (!session) return;
        if (PUZZLE_MODES.has(session.kind)) {
            clearPuzzleAutoExit(session.kind);
            hubState.puzzleCompletedView[session.kind] = false;
            hubState.puzzleFocus[session.kind] = true;
        }
        if (window.BlinkMultiplayer && typeof window.BlinkMultiplayer.startSession === 'function') {
            window.BlinkMultiplayer.startSession(session.kind);
        }
        renderWorkspaceSidebars();
    }

    function leaveInlineOnline() {
        const session = getFullSession();
        if (!session) return;
        hubState.joinCodeDraft = '';
        if (PUZZLE_MODES.has(session.kind)) {
            clearPuzzleAutoExit(session.kind);
            hubState.puzzleFocus[session.kind] = false;
            hubState.puzzleCompletedView[session.kind] = false;
        }
        if (window.BlinkMultiplayer && typeof window.BlinkMultiplayer.leaveSession === 'function') {
            window.BlinkMultiplayer.leaveSession(session.kind);
        }
        renderWorkspaceSidebars();
    }

    function syncOnlineInline() {
        const session = getFullSession();
        if (session && PUZZLE_MODES.has(session.kind)) {
            const playing = session.phase === 'playing';
            hubState.puzzleFocus[session.kind] = playing;
            if (session.phase === 'results') hubState.puzzleCompletedView[session.kind] = true;
        }
        renderLeftModes();
        const activeEl = document.activeElement;
        if (activeEl && activeEl.id === 'g3-online-code-input' && (!session || session.kind !== hubState.activeGame)) {
            syncFocusModeClasses();
            return;
        }
        renderRightPanel();
    }

    function openOnlineSection(modeId) {
        const target = GAME_IDS.includes(modeId) ? modeId : hubState.activeGame;
        if (typeof state !== 'undefined' && state.currentPage !== 'game' && typeof window.navigateTo === 'function') {
            window.navigateTo('game');
        }
        ensureWorkspaceDOM();
        if (ONLINE_CAPABLE.has(target)) hubState.playChoice[target] = 'online';
        selectMode(target);
        const rightEl = document.getElementById('g3-right-panel');
        if (rightEl && window.innerWidth < 1180) {
            rightEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function handleOnlineDeepLink(gameId, code) {
        if (!GAME_IDS.includes(gameId)) return;
        if (typeof window.navigateTo === 'function') window.navigateTo('game');
        ensureWorkspaceDOM();
        hubState.activeGame = gameId;
        hubState.playChoice[gameId] = 'online';
        hubState.joinCodeDraft = String(code || '').trim().toUpperCase();
        if (typeof window.setGameSubTab === 'function') window.setGameSubTab(gameId);
        renderWorkspaceSidebars();
        setTimeout(() => {
            if (window.BlinkMultiplayer && typeof window.BlinkMultiplayer.joinInline === 'function') {
                window.BlinkMultiplayer.joinInline(gameId, hubState.joinCodeDraft);
            }
        }, 140);
    }

    // ------------------------------------------------------------------------
    // 6. HOOKS: FOKUSMODUS & EINHEITLICHE BUTTONS FÜR ALLE 6 MODI
    // ------------------------------------------------------------------------
    function wireHooks() {
        const wrapAfter = (fnName, afterFn) => {
            if (typeof window[fnName] !== 'function' || window[fnName].__g3Wrapped) return;
            const orig = window[fnName];
            const wrapped = function (...args) {
                const res = orig.apply(this, args);
                afterFn(...args);
                return res;
            };
            wrapped.__g3Wrapped = true;
            window[fnName] = wrapped;
        };

        wrapAfter('setGameSubTab', (tabName) => {
            ensureWorkspaceDOM();
            if (GAME_IDS.includes(tabName)) hubState.activeGame = tabName;
            renderWorkspaceSidebars();
        });

        wrapAfter('navigateTo', (pageId) => {
            if (pageId !== 'game') {
                PUZZLE_MODES.forEach(m => {
                    clearPuzzleAutoExit(m);
                    hubState.puzzleFocus[m] = false;
                });
                syncFocusModeClasses();
                stopArenaLobbyDemo();
            } else {
                requestAnimationFrame(() => syncArenaLobbyDemo(false));
            }
        });

        wrapAfter('syncGameConfigUI', () => {
            if (hubState.domReady) syncFocusModeClasses();
        });

        // Arena
        wrapAfter('renderBlinkGameUI', () => {
            hideArenaPlayerAndBotSublines();
            const nowRun = isArenaRunning();
            if (nowRun !== hubState.lastArenaRunning) {
                hubState.lastArenaRunning = nowRun;
                if (hubState.activeGame === 'arena') renderWorkspaceSidebars();
            }
        });
        wrapAfter('startNewBlinkGame', () => {
            hubState.lastArenaRunning = isArenaRunning();
            if (hubState.activeGame === 'arena') renderWorkspaceSidebars();
        });
        wrapAfter('abortCurrentBlinkGame', () => {
            hubState.lastArenaRunning = false;
            if (hubState.activeGame === 'arena') renderWorkspaceSidebars();
        });
        wrapAfter('checkWinCondition', () => {
            const nowRun = isArenaRunning();
            if (nowRun !== hubState.lastArenaRunning) {
                hubState.lastArenaRunning = nowRun;
                if (hubState.activeGame === 'arena') renderWorkspaceSidebars();
            }
        });
        wrapAfter('showMatchSummaryOverlay', () => {
            if (typeof renderLeaderboard === 'function') renderLeaderboard();
        });
        wrapAfter('renderMoveLogFromHistory', () => {
            if (hubState.activeGame === 'arena') syncArenaActionButtons();
        });

        // Das Verhör
        wrapAfter('renderVerhoerStandaloneUI', () => {
            unifyAbortButtons();
            const nowRun = isVerhoerRunning();
            if (nowRun !== hubState.lastVerhoerRunning) {
                hubState.lastVerhoerRunning = nowRun;
                if (hubState.activeGame === 'verhoer') renderWorkspaceSidebars();
            }
        });
        wrapAfter('vhStartNewGame', () => {
            hubState.lastVerhoerRunning = isVerhoerRunning();
            if (hubState.activeGame === 'verhoer') renderWorkspaceSidebars();
        });
        wrapAfter('vhAbortGame', () => {
            hubState.lastVerhoerRunning = false;
            if (hubState.activeGame === 'verhoer') renderWorkspaceSidebars();
        });

        // Daily Challenge
        wrapAfter('renderDailyUI', () => {
            if (hubState.puzzleFocus.daily && typeof dailyState !== 'undefined' && Array.isArray(dailyState.solutions) && dailyState.solutions.length > 0 && dailyState.foundKeys.size >= dailyState.solutions.length) {
                scheduleAutoExitPuzzleFocus('daily', 1350);
            }
        });

        // Blink-Sudoku
        wrapAfter('renderSudokuUI', () => {
            if (hubState.puzzleFocus.sudoku && typeof sudokuState !== 'undefined' && sudokuState.solved) {
                scheduleAutoExitPuzzleFocus('sudoku', 1350);
            }
        });
        wrapAfter('startSudokuGame', (emptyCount) => {
            const match = SUDOKU_DIFF_LEVELS.find(d => d.emptyCount === emptyCount);
            if (match && hubState.sudokuDiff !== match.id) {
                hubState.sudokuDiff = match.id;
                if (hubState.activeGame === 'sudoku') renderRightPanel();
            }
        });

        // Endgame-Puzzles
        wrapAfter('renderEndgameUI', () => {
            if (hubState.puzzleFocus.endgame && typeof endgameState !== 'undefined' && endgameState.solved) {
                scheduleAutoExitPuzzleFocus('endgame', 1350);
            }
        });

        // Cluster-Cascade
        wrapAfter('renderCascadeUI', () => {
            if (hubState.puzzleFocus.cascade && typeof cascadeState !== 'undefined' && cascadeState.gameOver) {
                scheduleAutoExitPuzzleFocus('cascade', 800);
            }
        });
    }

    wireHooks();

    window.BlinkGameHub = {
        selectMode,
        openGame: selectMode,
        openGallery: () => {},
        openOverlay: openOnlineSection,
        openOnlineOverlay: openOnlineSection,
        closeOverlay: () => {},
        exitFocusMode,
        setPlayChoice,
        setArenaRule,
        setArenaDiff,
        setDailySoloVar,
        setSudokuDiff,
        setOnlineTime,
        setDailyOnlineVar,
        onTrainedAIChange,
        onJoinCodeInput,
        launchOfflineGame,
        launchOnlineCreate,
        launchOnlineJoin,
        startInlineOnline,
        leaveInlineOnline,
        syncOnlineInline,
        handleOnlineDeepLink,
        isPuzzleActive: (id) => Boolean(isPuzzleInFocus(id)),
        isGalleryOpen: () => false
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureWorkspaceDOM);
    } else {
        ensureWorkspaceDOM();
    }
})();
// ============================================================================
// EINHEITLICHE WORKSPACES FÜR MODELLE (3-SPALTEN-CLEAN), LABOR & KURS
// ============================================================================
(function initBlinkWorkspaceRails() {
    if (window.__BLINK_WORKSPACE_RAILS_READY) return;
    window.__BLINK_WORKSPACE_RAILS_READY = true;

    const ICONS = {
        basic:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
        advanced: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`,
        deck:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"></rect><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>`,
        space:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2"></circle><circle cx="18" cy="6" r="2"></circle><circle cx="6" cy="18" r="2"></circle><circle cx="18" cy="18" r="2"></circle><circle cx="12" cy="12" r="2.2"></circle></svg>`,
        struct:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.5"></circle><circle cx="18" cy="6" r="2.5"></circle><circle cx="12" cy="18" r="2.5"></circle><line x1="8.2" y1="7.2" x2="15.8" y2="7.2"></line><line x1="7.2" y1="8.2" x2="10.8" y2="15.8"></line><line x1="16.8" y1="8.2" x2="13.2" y2="15.8"></line></svg>`,
        mc:       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
        phase:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
        brain:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>`
    };

    const SHORT_LABELS = {
        'adv-struct-all':      'Vollraum (125)',
        'adv-struct-line':     'Strenges Cluster',
        'adv-struct-hyper120': 'Hyper-Cluster',
        'adv-struct-hyper15':  'MDS-Ebene (15)',
        'adv-struct-arc5':     '5-Bogen (3D)',
        'adv-struct-cube5':    '5×5×5 Würfel'
    };

    const LAB_ITEMS = [
        { id: 'montecarlo', title: 'Monte-Carlo',   accent: 'cyan',    icon: ICONS.mc },
        { id: 'phase',      title: 'Clusterdichte', accent: 'purple',  icon: ICONS.phase }
    ];

    const LAB_SPLIT_SPECS = [
        { id: 'montecarlo', ctrl: '#mc-exp-deadlock, #mc-custom-slider, #mc-n-5000', main: '#mc-result-title, #mc-bars-container, #mc-kpi-grid' },
        { id: 'phase',      ctrl: '#phase-m-slider, #phase-met-prob, #phase-met-expected', main: '#phase-curve-svg, #phase-kpi-grid' }
    ];

    const modelViewState = {
        basicView: '3d',   // '3d' | 'ring' | 'bipartite' | 'matrix' | 'matrices'
        basicCam: 'iso',
        basicOptsOpen: true,
        advView: '3d',     // '3d' | 'theory'
        advCam: 'iso',
        advOptsOpen: true
    };

    function escHtml(str) {
        return String(str || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    function isOrigBtnActive(btn) {
        if (!btn) return false;
        const c = btn.className || '';
        return c.includes('pill-btn-active') || c.includes('bg-purple-500') || c.includes('bg-cyan-400') || c.includes('is-active') || btn.getAttribute('aria-pressed') === 'true';
    }

    function getSourceTabButtons(containerId, fallbackBtnId) {
        let host = document.getElementById(containerId);
        if (!host && fallbackBtnId) {
            const fb = document.getElementById(fallbackBtnId);
            host = fb ? fb.parentElement : null;
        }
        if (!host) return { host: null, buttons: [] };
        return { host, buttons: Array.from(host.querySelectorAll('button')) };
    }

    function findTwoColumns(viewEl, firstSel, secondSel) {
        if (!viewEl) return null;
        const a = viewEl.querySelector(firstSel);
        const b = viewEl.querySelector(secondSel);
        if (!a || !b) return null;

        let firstCol = a;
        while (firstCol && firstCol.parentElement) {
            const parent = firstCol.parentElement;
            if (parent.contains(b)) {
                let secondCol = b;
                while (secondCol.parentElement && secondCol.parentElement !== parent) {
                    secondCol = secondCol.parentElement;
                }
                if (firstCol === secondCol) return null;
                return { container: parent, firstCol, secondCol };
            }
            if (parent === viewEl) break;
            firstCol = parent;
        }
        return null;
    }

    function triggerModelCanvasResize() {
        const run = () => {
            const cur = typeof state !== 'undefined' ? state.currentPage : '';
            if (cur === 'basic-model' && typeof resize3DCanvas === 'function') resize3DCanvas();
            if (cur === 'advanced-model' && typeof resizeAdv3DCanvas === 'function') resizeAdv3DCanvas();
            if (typeof syncAllSlidingPills === 'function') syncAllSlidingPills();
        };
        requestAnimationFrame(run);
        setTimeout(run, 75);
        setTimeout(run, 200);
    }

    // ------------------------------------------------------------------------
    // 1. MODELLREITER: 3-SPALTEN-LAYOUT (LINKS MODUS · MITTE GROSS · RECHTS INSPECTOR)
    // ------------------------------------------------------------------------
    function setupBasicModel3Col() {
        const page = document.getElementById('page-basic-model');
        if (!page || document.getElementById('ws-rail-basic-model')) return;

        const sharedBar = document.getElementById('models-shared-bar');
        if (sharedBar) sharedBar.classList.add('g3-hidden-ctrl');

        const shell = document.createElement('div');
        shell.className = 'ws-model-shell';

        const leftRail = document.createElement('aside');
        leftRail.id = 'ws-rail-basic-model';
        leftRail.className = 'g3-left ws-model-left';

        const centerPane = document.createElement('div');
        centerPane.id = 'ws-basic-pane';
        centerPane.className = 'ws-model-pane ws-mview-3d';

        const rightCol = document.createElement('aside');
        rightCol.id = 'ws-right-basic-model';
        rightCol.className = 'g3-right ws-model-right';
        rightCol.innerHTML = `
            <div class="aceternity-bento-card g3-right-card g3-accent-cyan ws-inspector-card">
                <div id="ws-basic-ins-head" class="ws-ins-head"></div>
                <div class="ws-ins-scroll">
                    <div id="ws-basic-ins-views"></div>
                    <div id="ws-basic-ins-layers"></div>
                    <div id="ws-basic-ins-cam"></div>
                    <div id="ws-basic-ins-anim" class="hidden space-y-1"></div>
                    <div id="ws-basic-ins-opts-wrap" class="ws-ins-section">
                        <div class="g3-setting-label !m-0">3D-Optionen</div>
                        <div id="ws-basic-ins-opts-dock" class="ws-docked-opts"></div>
                    </div>
                </div>
                <div id="ws-basic-ins-card-wrap" class="ws-docked-active-card">
                    <div class="g3-setting-label mb-1">Aktive Karte</div>
                    <div id="ws-basic-ins-card-dock" class="ws-active-card-box"></div>
                </div>
            </div>
        `;

        const existingChildren = Array.from(page.children);
        if (existingChildren[0] && existingChildren[0].querySelector('#basic-layer-tabs, #layout-btn-split')) {
            existingChildren[0].classList.add('g3-hidden-ctrl');
        }
        existingChildren.forEach(ch => centerPane.appendChild(ch));

        shell.appendChild(leftRail);
        shell.appendChild(centerPane);
        shell.appendChild(rightCol);
        page.appendChild(shell);

        // Native 3D-Optionen, Aktive Karte & 2D-Animationsleiste sauber nach rechts docken
        const optsBody = document.getElementById('info-box-3d-body');
        const optsDock = document.getElementById('ws-basic-ins-opts-dock');
        if (optsBody && optsDock) {
            optsBody.classList.remove('hidden');
            optsDock.appendChild(optsBody);
        }

        const ttBody = document.getElementById('node-tooltip-body');
        const cardDock = document.getElementById('ws-basic-ins-card-dock');
        if (ttBody && cardDock) {
            ttBody.classList.remove('hidden');
            cardDock.appendChild(ttBody);
        }

        const panel2d = document.getElementById('panel-2d');
        const animBtn = document.getElementById('btn-anim-play');
        const animDock = document.getElementById('ws-basic-ins-anim');
        if (panel2d) {
            const sub2dBar = panel2d.firstElementChild;
            if (animBtn && animBtn.parentElement && animDock) {
                const animGroup = animBtn.parentElement;
                animDock.innerHTML = `<div class="g3-setting-label">Zyklus-Animation</div>`;
                animGroup.classList.add('ws-anim-row');
                animDock.appendChild(animGroup);
            }
            if (sub2dBar && sub2dBar.querySelector('#sub2d-btn-ring, #basic-2d-tabs')) {
                sub2dBar.classList.add('g3-hidden-ctrl');
            }
        }

        // Zurück-Button in 60er-Galerie ausblenden (Ansicht wird rechts gewechselt)
        const matWs = document.getElementById('basic-matrices-workspace');
        if (matWs) {
            matWs.querySelectorAll('button[onclick*="setLayoutMode"]').forEach(b => b.classList.add('g3-hidden-ctrl'));
        }

        // Beobachter für Vollraum-Button, Schicht-Tabs & Zähler
        const fullBtn = document.getElementById('btn-basic-fullspace');
        const layerTabs = document.getElementById('basic-layer-tabs');
        const counterEl = document.getElementById('visible-counter');
        if (typeof MutationObserver !== 'undefined') {
            if (fullBtn) {
                new MutationObserver(() => renderModelRail('basic-model'))
                    .observe(fullBtn, { attributes: true, attributeFilter: ['class', 'aria-pressed'] });
            }
            if (layerTabs) {
                new MutationObserver(() => renderBasicRightInspector())
                    .observe(layerTabs, { subtree: true, attributes: true, attributeFilter: ['class'] });
            }
            if (counterEl) {
                new MutationObserver(() => syncModelCounter('basic'))
                    .observe(counterEl, { childList: true, characterData: true, subtree: true });
            }
        }

        if (typeof ResizeObserver !== 'undefined') {
            let tick = null;
            new ResizeObserver(() => {
                if (tick) cancelAnimationFrame(tick);
                tick = requestAnimationFrame(() => {
                    if (typeof resize3DCanvas === 'function') resize3DCanvas();
                });
            }).observe(centerPane);
        }

        applyBasicModelView('3d', true);
    }

    function setupAdvModel3Col() {
        const page = document.getElementById('page-advanced-model');
        if (!page || document.getElementById('ws-rail-advanced-model')) return;

        const sharedBar = document.getElementById('models-shared-bar');
        if (sharedBar) sharedBar.classList.add('g3-hidden-ctrl');

        const shell = document.createElement('div');
        shell.className = 'ws-model-shell';

        const leftRail = document.createElement('aside');
        leftRail.id = 'ws-rail-advanced-model';
        leftRail.className = 'g3-left ws-model-left';

        const centerPane = document.createElement('div');
        centerPane.id = 'ws-adv-pane';
        centerPane.className = 'ws-model-pane ws-mview-3d';

        const rightCol = document.createElement('aside');
        rightCol.id = 'ws-right-advanced-model';
        rightCol.className = 'g3-right ws-model-right';
        rightCol.innerHTML = `
            <div class="aceternity-bento-card g3-right-card g3-accent-purple ws-inspector-card">
                <div id="ws-adv-ins-head" class="ws-ins-head"></div>
                <div class="ws-ins-scroll">
                    <div id="ws-adv-ins-views"></div>
                    <div id="ws-adv-ins-layers"></div>
                    <div id="ws-adv-ins-cam"></div>
                    <div id="ws-adv-ins-cube-dock"></div>
                    <div id="ws-adv-ins-opts-wrap" class="ws-ins-section">
                        <div class="g3-setting-label !m-0">3D-Optionen</div>
                        <div id="ws-adv-ins-opts-dock" class="ws-docked-opts"></div>
                    </div>
                </div>
                <div id="ws-adv-ins-card-wrap" class="ws-docked-active-card">
                    <div class="g3-setting-label mb-1">Aktiver Vektor · 𝔽₅³</div>
                    <div id="ws-adv-ins-card-dock" class="ws-active-card-box"></div>
                </div>
            </div>
        `;

        const existingChildren = Array.from(page.children);
        if (existingChildren[0] && existingChildren[0].querySelector('#adv-struct-tabs, #adv-struct-all, #adv-layer-tabs, #adv-x-all')) {
            existingChildren[0].classList.add('g3-hidden-ctrl');
        }
        existingChildren.forEach(ch => centerPane.appendChild(ch));

        shell.appendChild(leftRail);
        shell.appendChild(centerPane);
        shell.appendChild(rightCol);
        page.appendChild(shell);

        // Native 3D-Optionen & Aktive-Vektor-Vorschau nach rechts docken
        const advOptsDock = document.getElementById('ws-adv-ins-opts-dock');
        const advOptsBody = document.getElementById('adv-3d-opts')
            || (document.getElementById('adv-chk-ghost')?.closest('.apple-inset-group'))
            || (document.getElementById('adv-chk-ghost')?.closest('div.flex'));
        if (advOptsBody && advOptsDock) {
            advOptsBody.classList.remove('hidden');
            advOptsDock.appendChild(advOptsBody);
        }

        const advPrev = document.getElementById('adv-tt-card-preview');
        const advCardDock = document.getElementById('ws-adv-ins-card-dock');
        if (advPrev && advPrev.parentElement && advCardDock) {
            const row = advPrev.parentElement;
            row.classList.remove('hidden');
            advCardDock.appendChild(row);
        }

        // Würfel-Steuerung (5×5×5 Würfel) aus #panel-adv-2d sauber in den rechten Inspector holen
        const cubeCtrl = document.getElementById('adv-cube-controls');
        const cubeDock = document.getElementById('ws-adv-ins-cube-dock');
        if (cubeCtrl && cubeDock) {
            cubeCtrl.classList.add('ws-docked-cube-ctrl');
            cubeDock.appendChild(cubeCtrl);
        }

        // Alte 2D-Sub-Leiste in #panel-adv-2d ausblenden
        const panelAdv2d = document.getElementById('panel-adv-2d');
        if (panelAdv2d && panelAdv2d.firstElementChild && panelAdv2d.firstElementChild.querySelector('#adv-tab-grid')) {
            panelAdv2d.firstElementChild.classList.add('g3-hidden-ctrl');
        }

        const { host: structHost } = getSourceTabButtons('adv-struct-tabs', 'adv-struct-all');
        const { host: layerHost } = getSourceTabButtons('adv-layer-tabs', 'adv-x-all');
        const advCounter = document.getElementById('adv-visible-counter');
        if (typeof MutationObserver !== 'undefined') {
            if (structHost) {
                new MutationObserver(() => renderModelRail('advanced-model'))
                    .observe(structHost, { subtree: true, attributes: true, attributeFilter: ['class'] });
            }
            if (layerHost) {
                new MutationObserver(() => renderAdvRightInspector())
                    .observe(layerHost, { subtree: true, attributes: true, attributeFilter: ['class'] });
            }
            if (advCounter) {
                new MutationObserver(() => syncModelCounter('adv'))
                    .observe(advCounter, { childList: true, characterData: true, subtree: true });
            }
        }

        if (typeof ResizeObserver !== 'undefined') {
            let tick = null;
            new ResizeObserver(() => {
                if (tick) cancelAnimationFrame(tick);
                tick = requestAnimationFrame(() => {
                    if (typeof resizeAdv3DCanvas === 'function') resizeAdv3DCanvas();
                });
            }).observe(centerPane);
        }

        applyAdvModelView('3d', true);
    }

    function syncModelCounter(which) {
        const src = document.getElementById(which === 'basic' ? 'visible-counter' : 'adv-visible-counter');
        const dst = document.getElementById(which === 'basic' ? 'ws-basic-counter-mirror' : 'ws-adv-counter-mirror');
        if (src && dst) dst.textContent = src.textContent;
    }

    function renderModelRail(pageId) {
        const isBasic = pageId === 'basic-model';
        const railEl = document.getElementById(isBasic ? 'ws-rail-basic-model' : 'ws-rail-advanced-model');
        if (!railEl) return;

        let subGroupHtml = '';
        if (isBasic) {
            const fullBtn = document.getElementById('btn-basic-fullspace');
            const isFull = isOrigBtnActive(fullBtn);
            subGroupHtml = `
                <div class="g3-rail-group">
                    <div class="g3-rail-heading">Kartenraum</div>
                    <button type="button" onclick="window.BlinkWorkspaceRails.setBasicFullSpace(true)"
                        class="g3-mode-btn g3-accent-sky ${isFull ? 'is-active' : ''}">
                        <span class="g3-mode-icon">${ICONS.space}</span>
                        <span class="g3-mode-name">Vollraum (180)</span>
                    </button>
                    <button type="button" onclick="window.BlinkWorkspaceRails.setBasicFullSpace(false)"
                        class="g3-mode-btn g3-accent-cyan ${!isFull ? 'is-active' : ''}">
                        <span class="g3-mode-icon">${ICONS.deck}</span>
                        <span class="g3-mode-name">60er-Deck</span>
                    </button>
                </div>
            `;
        } else {
            const { buttons } = getSourceTabButtons('adv-struct-tabs', 'adv-struct-all');
            if (buttons.length > 0) {
                subGroupHtml = `
                    <div class="g3-rail-group">
                        <div class="g3-rail-heading">Struktur · 𝔽₅³</div>
                        ${buttons.map((btn, idx) => {
                            const rawText = (btn.textContent || '').trim();
                            const label = SHORT_LABELS[btn.id] || rawText;
                            const active = isOrigBtnActive(btn);
                            const keyArg = btn.id ? `'${btn.id}'` : String(idx);
                            return `
                                <button type="button" title="${escHtml(rawText)}"
                                    onclick="window.BlinkWorkspaceRails.clickAdvStruct(${keyArg})"
                                    class="g3-mode-btn g3-accent-purple ${active ? 'is-active' : ''}">
                                    <span class="g3-mode-icon">${ICONS.struct}</span>
                                    <span class="g3-mode-name">${escHtml(label)}</span>
                                </button>
                            `;
                        }).join('')}
                    </div>
                `;
            }
        }

        railEl.innerHTML = `
            <div class="aceternity-bento-card g3-rail-card">
                <div class="g3-rail-group">
                    <div class="g3-rail-heading">Modelle</div>
                    <button type="button" onclick="navigateTo('basic-model')"
                        class="g3-mode-btn g3-accent-cyan ${isBasic ? 'is-active' : ''}">
                        <span class="g3-mode-icon">${ICONS.basic}</span>
                        <span class="g3-mode-name">Grundlegend</span>
                    </button>
                    <button type="button" onclick="navigateTo('advanced-model')"
                        class="g3-mode-btn g3-accent-purple ${!isBasic ? 'is-active' : ''}">
                        <span class="g3-mode-icon">${ICONS.advanced}</span>
                        <span class="g3-mode-name">Erweitert (𝔽₅³)</span>
                    </button>
                </div>
                ${subGroupHtml}
            </div>
        `;
    }

    function renderLayerPickerHTML(which, layerBtns) {
        if (!layerBtns || layerBtns.length === 0) return '';
        const activeBtn = layerBtns.find(b => isOrigBtnActive(b));
        const activeTitle = activeBtn ? (activeBtn.title || (activeBtn.textContent || '').trim()) : 'Alle';
        const allBtn = layerBtns[0];
        const numBtns = layerBtns.slice(1);
        const railClass = numBtns.length <= 5 ? 'ws-layer-rail ws-layer-rail-5' : 'ws-layer-rail ws-layer-rail-6';

        return `
            <div class="g3-setting-block ws-ins-block">
                <div class="ws-sec-row">
                    <span class="g3-setting-label !m-0">Schicht X</span>
                    <span class="ws-sec-hint truncate" title="${escHtml(activeTitle)}">${escHtml(activeTitle)}</span>
                </div>
                <div class="${railClass}">
                    ${allBtn ? `
                        <button type="button" title="${escHtml(allBtn.title || 'Alle Schichten')}"
                            onclick="window.BlinkWorkspaceRails.clickLayerBtn('${which}', ${allBtn.id ? `'${allBtn.id}'` : 0})"
                            class="g3-seg-btn ws-layer-all-pill ${isOrigBtnActive(allBtn) ? 'is-active' : ''}">Alle</button>
                    ` : ''}
                    ${numBtns.map((b, idx) => `
                        <button type="button" title="${escHtml(b.title || '')}"
                            onclick="window.BlinkWorkspaceRails.clickLayerBtn('${which}', ${b.id ? `'${b.id}'` : (idx + 1)})"
                            class="g3-seg-btn ws-layer-pill ${isOrigBtnActive(b) ? 'is-active' : ''}">${escHtml((b.textContent || '').trim())}</button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderCameraPickerHTML(which, activeCam) {
        const cams = [
            { id: 'iso', label: 'Iso',   title: 'Isometrische Standardansicht (Reset)', reset: true },
            { id: 'xy',  label: '(X,Y)', title: 'Draufsicht X–Y Ebene' },
            { id: 'xz',  label: '(X,Z)', title: 'Seitenansicht X–Z Ebene' },
            { id: 'yz',  label: '(Y,Z)', title: 'Frontansicht Y–Z Ebene' }
        ];
        return `
            <div class="g3-setting-block ws-ins-block">
                <div class="g3-setting-label !m-0">Kamera</div>
                <div class="g3-seg-rail ws-cam-rail">
                    ${cams.map(c => `
                        <button type="button" title="${c.title}" onclick="window.BlinkWorkspaceRails.setCam('${which}', '${c.id}')"
                            class="g3-seg-btn ws-cam-pill ${c.reset ? '' : 'mono'} ${activeCam === c.id ? 'is-active' : ''}">
                            ${c.reset ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path></svg>` : ''}
                            <span>${c.label}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderBasicRightInspector() {
        const head = document.getElementById('ws-basic-ins-head');
        const views = document.getElementById('ws-basic-ins-views');
        const layers = document.getElementById('ws-basic-ins-layers');
        const cam = document.getElementById('ws-basic-ins-cam');
        const animDock = document.getElementById('ws-basic-ins-anim');
        const optsWrap = document.getElementById('ws-basic-ins-opts-wrap');
        if (!head || !views) return;

        const curCount = document.getElementById('visible-counter')?.textContent || '60 / 60';
        const v = modelViewState.basicView;
        const show3D = v === '3d';
        const show2D = v === 'ring' || v === 'bipartite' || v === 'matrix';

        head.innerHTML = `
            <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                    <h2 class="text-[14px] font-extrabold text-white heading-font leading-tight">Grundmodell</h2>
                    <p class="text-[10px] text-slate-400 leading-tight mt-0.5">5×6×6 Raum · 60 Spielkarten</p>
                </div>
                <span id="ws-basic-counter-mirror" class="g3-stat-pill shrink-0">${escHtml(curCount)}</span>
            </div>
        `;

        const viewItems = [
            { id: '3d',        label: '3D-Raum',      full: true },
            { id: 'ring',      label: 'Ring-Zyklus',  full: false },
            { id: 'bipartite', label: 'Bipartit',     full: false },
            { id: 'matrix',    label: '6×6 Matrix',   full: false },
            { id: 'matrices',  label: '60er-Galerie', full: false }
        ];
        views.innerHTML = `
            <div class="g3-setting-block ws-ins-block">
                <div class="g3-setting-label !m-0">Ansicht</div>
                <div class="ws-view-grid">
                    ${viewItems.map(it => `
                        <button type="button" onclick="window.BlinkWorkspaceRails.setBasicView('${it.id}')"
                            class="g3-seg-btn ws-grid-pill ${it.full ? 'ws-grid-pill-full' : ''} ${v === it.id ? 'is-active' : ''}">${it.label}</button>
                    `).join('')}
                </div>
            </div>
        `;

        const { buttons: layerBtns } = getSourceTabButtons('basic-layer-tabs', 'basic-x-all');
        if (layers && layerBtns.length > 0) {
            layers.innerHTML = renderLayerPickerHTML('basic', layerBtns);
        }

        if (cam) {
            cam.classList.toggle('hidden', !show3D);
            if (show3D) {
                cam.innerHTML = renderCameraPickerHTML('basic', modelViewState.basicCam);
            }
        }

        if (animDock) animDock.classList.toggle('hidden', !show2D);
        if (optsWrap) optsWrap.classList.toggle('hidden', !show3D);
    }

    function renderAdvRightInspector() {
        const head = document.getElementById('ws-adv-ins-head');
        const views = document.getElementById('ws-adv-ins-views');
        const layers = document.getElementById('ws-adv-ins-layers');
        const cam = document.getElementById('ws-adv-ins-cam');
        const optsWrap = document.getElementById('ws-adv-ins-opts-wrap');
        if (!head || !views) return;

        const curCount = document.getElementById('adv-visible-counter')?.textContent || '25 / 125';
        const hasTheory = Boolean(document.getElementById('adv-view-theory'));
        if (!hasTheory && modelViewState.advView !== '3d') modelViewState.advView = '3d';
        const v = modelViewState.advView;
        const show3D = v === '3d';

        head.innerHTML = `
            <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                    <h2 class="text-[14px] font-extrabold text-white heading-font leading-tight">Erweitert · 𝔽₅³</h2>
                    <p class="text-[10px] text-slate-400 leading-tight mt-0.5">5×5×5 Vektorraum · 125 Karten</p>
                </div>
                <span id="ws-adv-counter-mirror" class="g3-stat-pill shrink-0">${escHtml(curCount)}</span>
            </div>
        `;

        views.classList.toggle('hidden', !hasTheory);
        if (hasTheory) {
            const viewItems = [
                { id: '3d',     label: '3D-Raum' },
                { id: 'theory', label: 'Theorie' }
            ];
            views.innerHTML = `
                <div class="g3-setting-block ws-ins-block">
                    <div class="g3-setting-label !m-0">Ansicht</div>
                    <div class="g3-seg-rail ws-cam-rail">
                        ${viewItems.map(it => `
                            <button type="button" onclick="window.BlinkWorkspaceRails.setAdvView('${it.id}')"
                                class="g3-seg-btn ws-cam-pill ${v === it.id ? 'is-active' : ''}">${it.label}</button>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            views.innerHTML = '';
        }

        const { buttons: layerBtns } = getSourceTabButtons('adv-layer-tabs', 'adv-x-all');
        if (layers && layerBtns.length > 0) {
            layers.innerHTML = renderLayerPickerHTML('adv', layerBtns);
        }

        if (cam) {
            cam.classList.toggle('hidden', !show3D);
            if (show3D) {
                cam.innerHTML = renderCameraPickerHTML('adv', modelViewState.advCam);
            }
        }

        if (optsWrap) optsWrap.classList.toggle('hidden', !show3D);
    }

    function applyBasicModelView(viewId, silent = false) {
        const valid = ['3d', 'ring', 'bipartite', 'matrix', 'matrices'];
        const nextView = valid.includes(viewId) ? viewId : '3d';
        if (!silent && modelViewState.basicView !== nextView && typeof playSound === 'function') playSound('tick');
        modelViewState.basicView = nextView;

        const pane = document.getElementById('ws-basic-pane');
        if (pane) {
            pane.classList.remove('ws-mview-3d', 'ws-mview-2d', 'ws-mview-matrices');
            if (nextView === '3d') pane.classList.add('ws-mview-3d');
            else if (nextView === 'matrices') pane.classList.add('ws-mview-matrices');
            else pane.classList.add('ws-mview-2d');
        }

        if (nextView === 'matrices') {
            const matBtn = document.getElementById('layout-btn-matrices');
            if (matBtn) matBtn.click();
            else if (typeof setLayoutMode === 'function') setLayoutMode('matrices');
        } else {
            const matWs = document.getElementById('basic-matrices-workspace');
            if (matWs && !matWs.classList.contains('hidden')) {
                const splitBtn = document.getElementById('layout-btn-split');
                if (splitBtn) splitBtn.click();
                else if (typeof setLayoutMode === 'function') setLayoutMode('split');
            }
            if (nextView === 'ring' || nextView === 'bipartite' || nextView === 'matrix') {
                const subBtn = document.getElementById(`sub2d-btn-${nextView}`);
                if (subBtn) subBtn.click();
                else if (typeof set2DSubView === 'function') set2DSubView(nextView);
            }
        }

        renderBasicRightInspector();
        triggerModelCanvasResize();
    }

    function applyAdvModelView(viewId, silent = false) {
        const hasTheory = Boolean(document.getElementById('adv-view-theory'));
        const nextView = (viewId === 'theory' && hasTheory) ? 'theory' : '3d';
        if (!silent && modelViewState.advView !== nextView && typeof playSound === 'function') playSound('tick');
        modelViewState.advView = nextView;

        const pane = document.getElementById('ws-adv-pane');
        if (pane) {
            pane.classList.remove('ws-mview-3d', 'ws-mview-2d');
            pane.classList.add(nextView === '3d' ? 'ws-mview-3d' : 'ws-mview-2d');
        }

        if (nextView === 'theory') {
            const tabBtn = document.getElementById('adv-tab-theory');
            if (tabBtn) tabBtn.click();
            else if (typeof setAdv2DTab === 'function') setAdv2DTab('theory');
        }

        renderAdvRightInspector();
        triggerModelCanvasResize();
    }

    function setBasicFullSpace(wantFull) {
        const fullBtn = document.getElementById('btn-basic-fullspace');
        const currentlyFull = isOrigBtnActive(fullBtn);
        if (currentlyFull !== Boolean(wantFull)) {
            if (fullBtn) fullBtn.click();
            else if (typeof toggleBasicFullSpace === 'function') toggleBasicFullSpace();
        }
        renderModelRail('basic-model');
    }

    function clickAdvStruct(idOrIdx) {
        const { buttons } = getSourceTabButtons('adv-struct-tabs', 'adv-struct-all');
        const target = typeof idOrIdx === 'string' ? document.getElementById(idOrIdx) : buttons[idOrIdx];
        if (target) target.click();
        renderModelRail('advanced-model');
    }

    function clickLayerBtn(which, idOrIdx) {
        const { buttons } = which === 'basic'
            ? getSourceTabButtons('basic-layer-tabs', 'basic-x-all')
            : getSourceTabButtons('adv-layer-tabs', 'adv-x-all');
        const target = typeof idOrIdx === 'string' ? document.getElementById(idOrIdx) : buttons[idOrIdx];
        if (target) target.click();
        if (which === 'basic') renderBasicRightInspector();
        else renderAdvRightInspector();
    }

    function setCam(which, mode) {
        if (typeof playSound === 'function') playSound('tick');
        if (which === 'basic') {
            modelViewState.basicCam = mode;
            if (typeof setCameraView === 'function') setCameraView(mode);
            renderBasicRightInspector();
        } else {
            modelViewState.advCam = mode;
            if (typeof setAdvCameraView === 'function') setAdvCameraView(mode);
            renderAdvRightInspector();
        }
    }

    function toggleModelOpts(which) {
        const isBasic = which === 'basic';
        const key = isBasic ? 'basicOptsOpen' : 'advOptsOpen';
        modelViewState[key] = !modelViewState[key];
        if (typeof playSound === 'function') playSound('tick');

        const dock = document.getElementById(isBasic ? 'ws-basic-ins-opts-dock' : 'ws-adv-ins-opts-dock');
        const btn = document.getElementById(isBasic ? 'ws-basic-opts-toggle' : 'ws-adv-opts-toggle');
        if (dock) dock.classList.toggle('hidden', !modelViewState[key]);
        if (btn) btn.classList.toggle('is-open', modelViewState[key]);
    }

    // ------------------------------------------------------------------------
    // 2. LABORREITER: KOMBINIERTE LINKE KARTE & SPIELERPROFIL IM KI-TRAINING ENTFERNT
    // ------------------------------------------------------------------------
    function hideLabPlayerProfileCard() {
        const brainView = document.getElementById('lab-view-brain');
        const subdock = document.getElementById('ws-lab-subdock');
        const roots = [subdock, brainView].filter(Boolean);
        roots.forEach(root => {
            const anchor = root.querySelector('#lab-player-elo-val, #lab-player-name-heading, #lab-player-avatar-slot');
            if (!anchor) return;
            let cur = anchor;
            while (cur && cur.parentElement && cur.parentElement !== root) {
                const p = cur.parentElement;
                if (p.querySelector('#ai-roster-list, #ai-radar-svg, #ai-avatar-box, #ws-lab-nav-slot')) break;
                if (cur.classList.contains('aceternity-bento-card') || cur.classList.contains('fu-card') || cur.classList.contains('ws-lab-sub-card')) {
                    break;
                }
                cur = p;
            }
            if (cur && !cur.querySelector('#ai-roster-list, #ai-radar-svg, #ai-avatar-box')) {
                cur.classList.add('g3-hidden-ctrl');
            }
        });

        // Falls im KI-Kader-Dock jetzt nur noch 1 sichtbare Karte liegt, nahtlos glätten
        const brainDockItem = document.querySelector('[data-ws-lab-ctrl="brain"]');
        if (brainDockItem) {
            const visibleCards = Array.from(brainDockItem.children).filter(el => !el.classList.contains('g3-hidden-ctrl') && !el.classList.contains('hidden'));
            if (visibleCards.length === 1) {
                visibleCards[0].classList.remove('ws-lab-sub-card');
                visibleCards[0].classList.add('ws-lab-flat-card');
            }
        }
    }

    function setupLabShell() {
        const pageLab = document.getElementById('page-lab');
        const mcView = document.getElementById('lab-view-montecarlo');
        if (!pageLab || !mcView || document.getElementById('ws-rail-lab')) return;

        const oldTopBar = pageLab.firstElementChild;
        if (oldTopBar && oldTopBar.querySelector('#lab-mode-tabs')) {
            oldTopBar.classList.add('g3-hidden-ctrl');
        }

        const viewsContainer = mcView.parentElement;
        const scrollHost = viewsContainer ? viewsContainer.parentElement : null;
        if (!viewsContainer || !scrollHost) return;

        scrollHost.classList.add('ws-scroll-host');

        const shell = document.createElement('div');
        shell.id = 'ws-shell-lab';
        shell.className = 'ws-shell ws-shell-lab';

        const leftRail = document.createElement('aside');
        leftRail.id = 'ws-rail-lab';
        leftRail.className = 'g3-left ws-lab-left';
        leftRail.innerHTML = `
            <div class="aceternity-bento-card g3-rail-card ws-lab-unified-card">
                <div id="ws-lab-nav-slot" class="g3-rail-group"></div>
                <div id="ws-lab-subdock" class="ws-lab-subdock"></div>
            </div>
        `;

        const mainCol = document.createElement('div');
        mainCol.className = 'ws-main';

        scrollHost.insertBefore(shell, viewsContainer);
        mainCol.appendChild(viewsContainer);
        shell.appendChild(leftRail);
        shell.appendChild(mainCol);

        const subdock = document.getElementById('ws-lab-subdock');
        LAB_SPLIT_SPECS.forEach(spec => {
            const view = document.getElementById(`lab-view-${spec.id}`);
            const split = findTwoColumns(view, spec.ctrl, spec.main);
            if (!split || !subdock) return;

            const { container, firstCol: ctrlCol, secondCol: resCol } = split;
            container.classList.add('g3-single-col-grid');
            resCol.classList.add('g3-full-span');

            ctrlCol.setAttribute('data-ws-lab-ctrl', spec.id);
            ctrlCol.classList.add('ws-lab-ctrl-item');

            const nestedCards = ctrlCol.classList.contains('aceternity-bento-card')
                ? [ctrlCol]
                : Array.from(ctrlCol.children).filter(el => el.classList.contains('aceternity-bento-card') || el.classList.contains('fu-card'));
            if (nestedCards.length === 1) {
                nestedCards[0].classList.add('ws-lab-flat-card');
            } else {
                nestedCards.forEach(c => c.classList.add('ws-lab-sub-card'));
            }

            subdock.appendChild(ctrlCol);
        });

        hideLabPlayerProfileCard();
    }

    function renderLabRail() {
        const navSlot = document.getElementById('ws-lab-nav-slot');
        const subdock = document.getElementById('ws-lab-subdock');
        if (!navSlot) return;

        const activeTab = (typeof phaseState !== 'undefined' && phaseState.activeTab)
            ? phaseState.activeTab
            : 'montecarlo';

        navSlot.innerHTML = `
            <div class="g3-rail-heading">Labor</div>
            ${LAB_ITEMS.map(item => `
                <button type="button" onclick="window.BlinkWorkspaceRails.selectLab('${item.id}')"
                    class="g3-mode-btn g3-accent-${item.accent} ${activeTab === item.id ? 'is-active' : ''}">
                    <span class="g3-mode-icon">${item.icon}</span>
                    <span class="g3-mode-name">${item.title}</span>
                </button>
            `).join('')}
        `;

        if (subdock) {
            let visible = 0;
            subdock.querySelectorAll('[data-ws-lab-ctrl]').forEach(el => {
                const show = el.getAttribute('data-ws-lab-ctrl') === activeTab;
                el.classList.toggle('hidden', !show);
                if (show) visible++;
            });
            subdock.classList.toggle('hidden', visible === 0);
        }
        hideLabPlayerProfileCard();
    }

    function selectLab(tabId) {
        if (typeof window.setLabSubTab === 'function') {
            window.setLabSubTab(tabId);
        } else {
            document.getElementById(`lab-tab-${tabId}`)?.click();
        }
        renderLabRail();
    }

    // ------------------------------------------------------------------------
    // 3. KURSREITER (SITZUNG 1 – 8)
    // ------------------------------------------------------------------------
    function setupLessonShell() {
        const pageLesson = document.getElementById('page-lesson');
        const dynContent = document.getElementById('lesson-dynamic-content');
        if (!pageLesson || !dynContent || document.getElementById('ws-rail-lesson')) return;

        const oldTopBar = pageLesson.firstElementChild;
        if (oldTopBar && oldTopBar.querySelector('#lesson-mode-tabs')) {
            oldTopBar.classList.add('g3-hidden-ctrl');
        }

        const scrollHost = Array.from(pageLesson.children).find(ch => ch !== oldTopBar && ch.contains(dynContent));
        if (!scrollHost) return;

        const contentWrapper = scrollHost.firstElementChild;
        if (!contentWrapper) return;

        scrollHost.classList.add('ws-scroll-host');

        const shell = document.createElement('div');
        shell.id = 'ws-shell-lesson';
        shell.className = 'ws-shell';

        const leftRail = document.createElement('aside');
        leftRail.id = 'ws-rail-lesson';
        leftRail.className = 'g3-left';

        const mainCol = document.createElement('div');
        mainCol.className = 'ws-main ws-lesson-main';

        scrollHost.insertBefore(shell, contentWrapper);
        mainCol.appendChild(contentWrapper);
        shell.appendChild(leftRail);
        shell.appendChild(mainCol);
    }

    function renderLessonRail() {
        const railEl = document.getElementById('ws-rail-lesson');
        if (!railEl) return;

        const current = (typeof state !== 'undefined' && state.currentLesson) ? state.currentLesson : 1;
        let itemsHtml = '';
        for (let i = 1; i <= 8; i++) {
            itemsHtml += `
                <button type="button" onclick="openLessonPage(${i})"
                    class="g3-mode-btn g3-accent-amber ${current === i ? 'is-active' : ''}">
                    <span class="g3-mode-icon mono text-[10.5px] font-extrabold">U${i}</span>
                    <span class="g3-mode-name">Sitzung ${i}</span>
                </button>
            `;
        }

        railEl.innerHTML = `
            <div class="aceternity-bento-card g3-rail-card">
                <div class="g3-rail-group">
                    <div class="g3-rail-heading">Kursreihe</div>
                    ${itemsHtml}
                </div>
            </div>
        `;
    }

    // ------------------------------------------------------------------------
    // 4. HOOKS & INITIALISIERUNG
    // ------------------------------------------------------------------------
    function syncAllRails() {
        renderModelRail('basic-model');
        renderModelRail('advanced-model');
        renderBasicRightInspector();
        renderAdvRightInspector();
        renderLabRail();
        renderLessonRail();
    }

    function wireRailsHooks() {
        const wrapAfter = (fnName, afterFn) => {
            if (typeof window[fnName] !== 'function' || window[fnName].__wsRailWrapped) return;
            const orig = window[fnName];
            const wrapped = function (...args) {
                const res = orig.apply(this, args);
                afterFn(...args);
                return res;
            };
            wrapped.__wsRailWrapped = true;
            window[fnName] = wrapped;
        };

        wrapAfter('navigateTo', (pageId) => {
            if (pageId === 'basic-model') {
                renderModelRail('basic-model');
                renderBasicRightInspector();
                triggerModelCanvasResize();
            } else if (pageId === 'advanced-model') {
                renderModelRail('advanced-model');
                renderAdvRightInspector();
                triggerModelCanvasResize();
            } else if (pageId === 'lab') {
                renderLabRail();
            } else if (pageId === 'lesson') {
                renderLessonRail();
            }
        });

        wrapAfter('setLabSubTab', () => renderLabRail());
        wrapAfter('renderBrainLabUI', () => hideLabPlayerProfileCard());
        wrapAfter('openLessonPage', () => renderLessonRail());
        wrapAfter('setAdvStructureMode', () => renderModelRail('advanced-model'));
        wrapAfter('toggleBasicFullSpace', () => renderModelRail('basic-model'));
    }

    function initAllRails() {
        setupBasicModel3Col();
        setupAdvModel3Col();
        setupLabShell();
        setupLessonShell();
        wireRailsHooks();
        syncAllRails();
    }

    window.BlinkWorkspaceRails = {
        setBasicView: applyBasicModelView,
        setAdvView: applyAdvModelView,
        setBasicFullSpace,
        clickAdvStruct,
        clickLayerBtn,
        setCam,
        toggleModelOpts,
        selectLab,
        syncAllRails
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAllRails);
    } else {
        initAllRails();
    }
    window.addEventListener('load', () => {
        syncAllRails();
        triggerModelCanvasResize();
    });
})();