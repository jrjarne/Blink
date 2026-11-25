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
                    <div class="max-w-sm space-y-3.5 text-center">
                        <div class="g3-lobby-icon-badge mx-auto">${meta.icon}</div>
                        <h3 class="text-xl sm:text-2xl font-extrabold text-white heading-font">Bereit für ${meta.title}?</h3>
                        <p class="text-xs sm:text-[13px] text-slate-300 leading-relaxed">${meta.lobbyText}</p>
                        <div class="pt-1">
                            <button type="button" onclick="window.BlinkGameHub.launchOfflineGame()"
                                class="px-7 py-3 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-sm transition shadow-xl">
                                ▶ Jetzt spielen
                            </button>
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
    // 2. FOKUSMODUS-STEUERUNG (ALLE 6 SPIELMODI · WERKZEUGE ERST IM FOKUSMODUS)
    // ------------------------------------------------------------------------
    function syncFocusModeClasses() {
        const shell = document.getElementById('g3-shell');
        if (!shell) return;

        const id = hubState.activeGame;
        const isSparring = typeof gameState !== 'undefined' && Boolean(gameState.isTrainingMatch);
        const inFocus = !isSparring && isCurrentModeInFocus();
        const isPuzzleFocus = inFocus && PUZZLE_MODES.has(id);

        shell.classList.toggle('is-sparring', isSparring);
        shell.classList.toggle('is-focus-mode', inFocus);
        shell.classList.toggle('is-focus-arena', inFocus && id === 'arena');
        shell.classList.toggle('is-focus-verhoer', inFocus && id === 'verhoer');
        shell.classList.toggle('is-focus-puzzle', isPuzzleFocus);

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
                        <button type="button" onclick="navigateTo('lab'); setLabSubTab('brain'); openAICreator();"
                            class="w-full py-2 px-3 rounded-xl border border-emerald-400/40 bg-emerald-500/10 text-emerald-300 text-xs font-bold transition">
                            + KI im Labor erstellen
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
            renderWorkspaceSidebars();
            return;
        }
        if (id === 'cascade') {
            clearPuzzleAutoExit('cascade');
            hubState.puzzleCompletedView.cascade = false;
            hubState.puzzleFocus.cascade = true;
            if (typeof initCascadeGame === 'function') initCascadeGame();
            if (typeof playSound === 'function') playSound('play');
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
        isGalleryOpen: () => false
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureWorkspaceDOM);
    } else {
        ensureWorkspaceDOM();
    }
})();
// ============================================================================
// EINHEITLICHE LINKE MODUS-LEISTE FÜR MODELLE, LABOR (KOMBINIERT) & KURS
// ============================================================================
(function initBlinkWorkspaceRails() {
    if (window.__BLINK_WORKSPACE_RAILS_READY) return;
    window.__BLINK_WORKSPACE_RAILS_READY = true;

    const ICONS = {
        basic:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
        advanced: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`,
        view:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="12" y1="3" x2="12" y2="21"></line></svg>`,
        struct:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.5"></circle><circle cx="18" cy="6" r="2.5"></circle><circle cx="12" cy="18" r="2.5"></circle><line x1="8.2" y1="7.2" x2="15.8" y2="7.2"></line><line x1="7.2" y1="8.2" x2="10.8" y2="15.8"></line><line x1="16.8" y1="8.2" x2="13.2" y2="15.8"></line></svg>`,
        mc:       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
        phase:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
        brain:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>`
    };

    const SHORT_LABELS = {
        'layout-btn-split':    '3D & 2D Split',
        'layout-btn-3d':       'Fokus 3D',
        'layout-btn-2d':       'Fokus 2D',
        'layout-btn-matrices': '60er-Galerie',
        'adv-struct-all':      'Vollraum (125)',
        'adv-struct-line':     'Strenges Cluster',
        'adv-struct-hyper120': 'Hyper-Cluster',
        'adv-struct-hyper15':  'MDS-Ebene (15)',
        'adv-struct-arc5':     '5-Bogen (3D)',
        'adv-struct-cube5':    '5×5×5 Würfel'
    };

    const LAB_ITEMS = [
        { id: 'montecarlo', title: 'Monte-Carlo',   accent: 'cyan',    icon: ICONS.mc },
        { id: 'phase',      title: 'Clusterdichte', accent: 'purple',  icon: ICONS.phase },
        { id: 'brain',      title: 'KI-Training',   accent: 'emerald', icon: ICONS.brain }
    ];

    const LAB_SPLIT_SPECS = [
        {
            id: 'montecarlo',
            ctrl: '#mc-exp-deadlock, #mc-custom-slider, #mc-n-5000',
            main: '#mc-result-title, #mc-bars-container, #mc-kpi-grid'
        },
        {
            id: 'phase',
            ctrl: '#phase-m-slider, #phase-met-prob, #phase-met-expected',
            main: '#phase-curve-svg, #phase-kpi-grid'
        },
        {
            id: 'brain',
            ctrl: '#ai-roster-list, #lab-player-elo-val, #brain-rule-normal',
            main: '#ai-radar-svg, #ai-traits-bars, #ai-avatar-box'
        }
    ];

    function escHtml(str) {
        return String(str || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    function isOrigBtnActive(btn) {
        if (!btn) return false;
        const c = btn.className || '';
        return c.includes('pill-btn-active') || c.includes('bg-purple-500') || c.includes('bg-cyan-400') || c.includes('is-active');
    }

    function getSourceTabButtons(containerId, fallbackBtnId) {
        let host = document.getElementById(containerId);
        if (!host && fallbackBtnId) {
            const fb = document.getElementById(fallbackBtnId);
            host = fb ? fb.parentElement : null;
        }
        if (!host) return { host: null, buttons: [] };
        return {
            host,
            buttons: Array.from(host.querySelectorAll('button'))
        };
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
        setTimeout(run, 90);
        setTimeout(run, 240);
    }

    // ------------------------------------------------------------------------
    // 1. MODELLREITER (VOLLE BREITE + AUTO-RESIZE FÜR 3D & 2D)
    // ------------------------------------------------------------------------
    function setupModelPageShell(pageId, railId, subTabsId, fallbackBtnId) {
        const page = document.getElementById(pageId);
        if (!page || document.getElementById(railId)) return;

        const sharedBar = document.getElementById('models-shared-bar');
        if (sharedBar) sharedBar.classList.add('g3-hidden-ctrl');

        const { host: subTabsHost } = getSourceTabButtons(subTabsId, fallbackBtnId);
        if (subTabsHost) subTabsHost.classList.add('g3-hidden-ctrl');

        const shell = document.createElement('div');
        shell.className = 'ws-model-shell';

        const leftRail = document.createElement('aside');
        leftRail.id = railId;
        leftRail.className = 'g3-left ws-model-left';

        const mainPane = document.createElement('div');
        mainPane.className = 'ws-model-pane';

        const existingChildren = Array.from(page.children);
        if (existingChildren[0]) {
            existingChildren[0].classList.add('ws-model-toolbar');
        }
        existingChildren.forEach(ch => mainPane.appendChild(ch));

        shell.appendChild(leftRail);
        shell.appendChild(mainPane);
        page.appendChild(shell);

        if (subTabsHost && typeof MutationObserver !== 'undefined') {
            const obs = new MutationObserver(() => renderModelRail(pageId));
            obs.observe(subTabsHost, { subtree: true, attributes: true, attributeFilter: ['class'] });
        }

        if (typeof ResizeObserver !== 'undefined') {
            let resizeTick = null;
            const ro = new ResizeObserver(() => {
                if (resizeTick) cancelAnimationFrame(resizeTick);
                resizeTick = requestAnimationFrame(() => {
                    if (pageId === 'page-basic-model' && typeof resize3DCanvas === 'function') resize3DCanvas();
                    if (pageId === 'page-advanced-model' && typeof resizeAdv3DCanvas === 'function') resizeAdv3DCanvas();
                });
            });
            ro.observe(mainPane);
        }
    }

    function renderModelRail(pageId) {
        const isBasic = pageId === 'basic-model';
        const railId = isBasic ? 'ws-rail-basic-model' : 'ws-rail-advanced-model';
        const railEl = document.getElementById(railId);
        if (!railEl) return;

        const { buttons } = isBasic
            ? getSourceTabButtons('basic-layout-tabs', 'layout-btn-split')
            : getSourceTabButtons('adv-struct-tabs', 'adv-struct-all');

        const subHeading = isBasic ? 'Ansicht' : 'Struktur · 𝔽₅³';
        const subAccent = isBasic ? 'cyan' : 'purple';
        const subIcon = isBasic ? ICONS.view : ICONS.struct;

        const subBtnsHtml = buttons.map((btn, idx) => {
            const rawText = (btn.textContent || '').trim();
            const label = SHORT_LABELS[btn.id] || rawText;
            const active = isOrigBtnActive(btn);
            const targetKey = btn.id ? `'${btn.id}'` : String(idx);
            return `
                <button type="button" title="${escHtml(rawText)}"
                    onclick="window.BlinkWorkspaceRails.clickModelSub('${pageId}', ${targetKey})"
                    class="g3-mode-btn g3-accent-${subAccent} ${active ? 'is-active' : ''}">
                    <span class="g3-mode-icon">${subIcon}</span>
                    <span class="g3-mode-name">${escHtml(label)}</span>
                </button>
            `;
        }).join('');

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
                ${subBtnsHtml ? `
                    <div class="g3-rail-group">
                        <div class="g3-rail-heading">${subHeading}</div>
                        ${subBtnsHtml}
                    </div>
                ` : ''}
            </div>
        `;
    }

    function clickModelSub(pageId, idOrIdx) {
        const isBasic = pageId === 'basic-model';
        const { buttons } = isBasic
            ? getSourceTabButtons('basic-layout-tabs', 'layout-btn-split')
            : getSourceTabButtons('adv-struct-tabs', 'adv-struct-all');

        const target = typeof idOrIdx === 'string'
            ? document.getElementById(idOrIdx)
            : buttons[idOrIdx];

        if (target) target.click();
        renderModelRail(pageId);
        triggerModelCanvasResize();
    }

    // ------------------------------------------------------------------------
    // 2. LABORREITER: BLOCK 1 (MODI) + BLOCK 2 (STEUERUNG) IN EINER KARTE VEREINT
    // ------------------------------------------------------------------------
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

        // Die Steuerungs-Spalte (Block 2) jedes Labor-Tabs direkt unter den Modus-Buttons andocken
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
            if (pageId === 'basic-model' || pageId === 'advanced-model') {
                renderModelRail(pageId);
                triggerModelCanvasResize();
            } else if (pageId === 'lab') {
                renderLabRail();
            } else if (pageId === 'lesson') {
                renderLessonRail();
            }
        });

        wrapAfter('setLabSubTab', () => renderLabRail());
        wrapAfter('openLessonPage', () => renderLessonRail());
        wrapAfter('setAdvStructureMode', () => renderModelRail('advanced-model'));
        wrapAfter('setBasicLayout', () => {
            renderModelRail('basic-model');
            triggerModelCanvasResize();
        });
    }

    function initAllRails() {
        setupModelPageShell('page-basic-model', 'ws-rail-basic-model', 'basic-layout-tabs', 'layout-btn-split');
        setupModelPageShell('page-advanced-model', 'ws-rail-advanced-model', 'adv-struct-tabs', 'adv-struct-all');
        setupLabShell();
        setupLessonShell();
        wireRailsHooks();
        syncAllRails();
    }

    window.BlinkWorkspaceRails = {
        clickModelSub,
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