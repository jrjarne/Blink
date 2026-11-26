// ============================================================================
// BLINK MULTIPLAYER 3.0 — EINHEITLICHER ONLINE-HUB
// Ein fester Button oben · Ein einheitliches Fenster für alle 4 Online-Modi:
// 1) Blink-Arena (1v1 Echtzeit)
// 2) Das Verhör (1v1 Taktik)
// 3) Daily Challenge (Gruppe / Live)
// 4) Blink-Sudoku (Gruppe / Live)
// ============================================================================
(function initBlinkMultiplayerSuite() {
    if (window.__BLINK_MULTIPLAYER_READY) return;
    window.__BLINK_MULTIPLAYER_READY = true;

    const VH_PREFIX = 'blink-vh-p2p-';
    const CR_PREFIX = 'blink-cr-p2p-';

    const ONLINE_MODES = [
        { id: 'arena', label: 'Blink-Arena', sub: '1v1 · Echtzeit' },
        { id: 'verhoer', label: 'Das Verhör', sub: '1v1 · Taktik' },
        { id: 'daily', label: 'Daily Challenge', sub: 'Gruppe · Live' },
        { id: 'sudoku', label: 'Blink-Sudoku', sub: 'Gruppe · Live' }
    ];

    const mpHub = {
        selectedMode: 'arena',
        suppressAutoOpen: false
    };

    // ------------------------------------------------------------------------
    // 0. GEMEINSAME HELFER: CODE, LINK, QR-CODE, AVATAR & ZEIT
    // ------------------------------------------------------------------------
    function genRoomCode(len = 4) {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let out = '';
        for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
        return out;
    }

    function escHtml(str) {
        return String(str || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    function buildShareUrl(gameTab, paramKey, code) {
        const cleanCode = String(code || '').trim().toUpperCase();
        const base = window.location.href.split('#')[0].split('?')[0];
        return `${base}#/spielen/${gameTab}?${paramKey}=${encodeURIComponent(cleanCode)}`;
    }

    function isLocalFileProtocol() {
        return window.location.protocol === 'file:';
    }

    function buildQrSvgHTML(text, sizePx = 196) {
        if (typeof qrcode === 'function') {
            try {
                const qr = qrcode(0, 'M');
                qr.addData(text);
                qr.make();
                const count = qr.getModuleCount();
                const margin = 2;
                const total = count + margin * 2;
                let rects = '';
                for (let r = 0; r < count; r++) {
                    for (let c = 0; c < count; c++) {
                        if (qr.isDark(r, c)) {
                            rects += `<rect x="${c + margin}" y="${r + margin}" width="1.03" height="1.03" rx="0.16"/>`;
                        }
                    }
                }
                return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 ${total} ${total}" class="block rounded-xl bg-white" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#ffffff"/><g fill="#0f172a">${rects}</g></svg>`;
            } catch (e) { }
        }
        const enc = encodeURIComponent(text);
        return `<img src="https://api.qrserver.com/v1/create-qr-code/?size=${sizePx}x${sizePx}&margin=8&data=${enc}" width="${sizePx}" height="${sizePx}" alt="QR-Code" class="block rounded-xl bg-white" />`;
    }

    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) { }
        ta.remove();
    }

    function copyTextToClipboard(text, toastMsg = 'Kopiert!', btnEl = null, flashLabel = '✓ Kopiert!') {
        if (!text) return;
        const done = () => {
            if (typeof playSound === 'function') playSound('tick');
            if (typeof showSonnerToast === 'function') showSonnerToast(toastMsg, 'success');
            if (btnEl) {
                if (!btnEl.dataset.origHtml) btnEl.dataset.origHtml = btnEl.innerHTML;
                btnEl.innerHTML = flashLabel;
                clearTimeout(btnEl._copyResetTimer);
                btnEl._copyResetTimer = setTimeout(() => {
                    if (btnEl.dataset.origHtml) btnEl.innerHTML = btnEl.dataset.origHtml;
                }, 1700);
            }
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(() => {
                fallbackCopy(text);
                done();
            });
        } else {
            fallbackCopy(text);
            done();
        }
    }

    function getMyNameSafe() {
        return typeof getPlayerName === 'function' ? getPlayerName() : 'Spieler';
    }

    function getMyProfileSafe() {
        return typeof getPlayerProfile === 'function' ? getPlayerProfile() : null;
    }

    function renderAvatarSafe(prof, size = 28) {
        if (typeof getPlayerAvatarSVG === 'function') {
            return getPlayerAvatarSVG(prof || undefined, size);
        }
        return `<span class="inline-flex items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 font-bold mono" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px">●</span>`;
    }

    function fmtSecondsMMSS(sec) {
        const s = Math.max(0, sec || 0);
        const m = String(Math.floor(s / 60)).padStart(2, '0');
        const rem = String(Math.floor(s % 60)).padStart(2, '0');
        const tenths = String(Math.floor((s % 1) * 10));
        return `${m}:${rem}.${tenths}`;
    }

    function getCurrentTabOnlineDefault() {
        const tab = (typeof labState !== 'undefined' && labState.activeGameTab) ? labState.activeGameTab : 'arena';
        if (['arena', 'verhoer', 'daily', 'sudoku'].includes(tab)) return tab;
        return mpHub.selectedMode || 'arena';
    }

    function getActiveOnlineSession() {
        if (typeof p2pState !== 'undefined' && (p2pState.peer || p2pState.connected)) {
            return {
                kind: 'arena',
                label: 'Blink-Arena',
                code: p2pState.roomCode || '----',
                connected: Boolean(p2pState.connected),
                isHost: p2pState.role === 'host',
                count: p2pState.connected ? 2 : 1,
                phase: (typeof gameState !== 'undefined' && gameState.isRunning) ? 'playing' : 'lobby'
            };
        }
        if (vhNet.active) {
            return {
                kind: 'verhoer',
                label: 'Das Verhör',
                code: vhNet.roomCode || '----',
                connected: Boolean(vhNet.connected),
                isHost: vhNet.role === 'host',
                count: vhNet.connected ? 2 : 1,
                phase: (typeof vhState !== 'undefined' && vhState.isRunning) ? 'playing' : 'lobby'
            };
        }
        if (crState.active) {
            return {
                kind: crState.mode,
                label: crState.mode === 'sudoku' ? 'Blink-Sudoku' : 'Daily Challenge',
                code: crState.roomCode || '----',
                connected: true,
                isHost: crState.role === 'host',
                count: crState.leaderboard.length,
                phase: crState.phase
            };
        }
        return null;
    }

    function closeAllOtherSessionsExcept(keepKind) {
        if (keepKind !== 'arena' && typeof p2pState !== 'undefined' && (p2pState.peer || p2pState.connected)) {
            if (typeof p2pDisconnect === 'function') p2pDisconnect(true);
        }
        if (keepKind !== 'verhoer' && vhNet.active) {
            vhNetDisconnect(true);
        }
        if (keepKind !== 'daily' && keepKind !== 'sudoku' && crState.active) {
            crLeaveRoom(true);
        }
    }

    // ------------------------------------------------------------------------
    // 1. GEMEINSAME DOM-ELEMENTE: EIN MODAL, EIN COUNTDOWN, EIN VERHÖR-POPUP
    // ------------------------------------------------------------------------
    function injectSharedModals() {
        if (document.getElementById('mp-unified-modal')) return;

        const wrap = document.createElement('div');
        wrap.innerHTML = `
            <!-- 1. EINHEITLICHES ONLINE-FENSTER (FÜR ALLE 4 ONLINE-MODI) -->
            <div id="mp-unified-modal" onclick="if(event.target === this && !window.__CR_LOCK_CLOSE) window.BlinkMultiplayer.closeHub()" class="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 hidden items-center justify-center p-3 sm:p-5 transition-opacity duration-200 opacity-0">
                <div class="apple-settings-sheet fu-card rounded-[28px] max-w-[740px] w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92dvh] overflow-y-auto transition-transform duration-200 scale-95">
                    <div class="apple-set-header flex items-center justify-between gap-3 pb-3.5">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="apple-set-title-badge" aria-hidden="true">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            </span>
                            <div class="min-w-0">
                                <h2 id="mp-hub-title" class="text-base sm:text-[17px] font-extrabold text-white heading-font leading-tight">Online spielen</h2>
                                <p id="mp-hub-subtitle" class="text-[11px] text-slate-400 leading-tight mt-0.5 truncate">Raum öffnen oder mit Code beitreten</p>
                            </div>
                        </div>
                        <button type="button" onclick="window.BlinkMultiplayer.closeHub()" class="modal-pill-cta px-4 py-1.5 rounded-full font-bold text-xs shrink-0">Fertig</button>
                    </div>
                    <div id="mp-hub-body" class="space-y-4"></div>
                </div>
            </div>

            <!-- 2. SYNCHRONER 3-2-1 COUNTDOWN OVERLAY (GRUPPEN-MODI) -->
            <div id="cr-countdown-overlay" class="hidden fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[70] flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
                <div class="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400 mono mb-3" id="cr-countdown-label">Runde startet gleich</div>
                <div id="cr-countdown-digit" class="text-7xl sm:text-8xl font-extrabold text-white heading-font">3</div>
            </div>

            <!-- 3. VERHÖR ZUG-POPUP („DU BIST DRAN!“ MIT INTERSTELLAR-SOUND) -->
            <div id="vh-turn-toast" class="vh-turn-toast pointer-events-none" aria-live="polite">
                <span id="vh-turn-toast-dot" class="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0 animate-pulse"></span>
                <div class="min-w-0 text-left">
                    <div id="vh-turn-toast-title" class="text-xs sm:text-sm font-extrabold text-white leading-tight">Du bist dran!</div>
                    <div id="vh-turn-toast-sub" class="text-[10.5px] mono text-slate-300 leading-tight mt-0.5">Ziehe vom Stapel oder rufe M₁ zurück</div>
                </div>
            </div>
        `;
        while (wrap.firstElementChild) {
            document.body.appendChild(wrap.firstElementChild);
        }
    }

    function openUnifiedOnlineModal(preferredMode = null) {
        if (window.BlinkGameHub && typeof window.BlinkGameHub.openOnlineOverlay === 'function') {
            const session = getActiveOnlineSession();
            const target = session ? session.kind : (preferredMode || getCurrentTabOnlineDefault());
            window.BlinkGameHub.openOnlineOverlay(target);
            return;
        }
        const session = getActiveOnlineSession();
        if (!session) {
            mpHub.selectedMode = preferredMode || getCurrentTabOnlineDefault();
        }
        renderUnifiedModal();
        const modal = document.getElementById('mp-unified-modal');
        if (modal && modal.classList.contains('hidden')) {
            if (typeof playSound === 'function') playSound('tick');
            if (typeof toggleModalState === 'function') toggleModalState('mp-unified-modal');
        }
    }

    function closeUnifiedOnlineModal() {
        if (window.BlinkGameHub && typeof window.BlinkGameHub.closeOverlay === 'function') {
            window.BlinkGameHub.closeOverlay(true);
        }
        const modal = document.getElementById('mp-unified-modal');
        if (modal && !modal.classList.contains('hidden') && typeof toggleModalState === 'function') {
            toggleModalState('mp-unified-modal');
        }
    }

    function isUnifiedModalOpen() {
        const modal = document.getElementById('mp-unified-modal');
        return Boolean(modal && !modal.classList.contains('hidden'));
    }

    // ------------------------------------------------------------------------
    // 2. EIN FESTER BUTTON OBEN IN DER SPIEL-LEISTE + CLEANES ARENA-SIDEBAR-UPDATE
    // ------------------------------------------------------------------------
    function injectGlobalOnlineButton() {
        if (document.getElementById('mp-global-online-btn')) return;
        const topBar = document.getElementById('game-top-tabs-bar') || document.getElementById('game-mode-tabs')?.parentElement;
        if (!topBar) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'mp-global-online-btn';
        btn.onclick = () => openUnifiedOnlineModal();
        btn.className = 'mp-live-pill-btn mp-global-online-btn px-3.5 py-2 rounded-full text-xs font-bold transition inline-flex items-center gap-2 shrink-0';
        btn.innerHTML = `
            <span id="mp-global-dot" class="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 opacity-85" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span id="mp-global-lbl">Online spielen</span>
        `;
        topBar.appendChild(btn);
        updateGlobalOnlineButton();
    }

    function updateGlobalOnlineButton() {
        const btn = document.getElementById('mp-global-online-btn');
        const dot = document.getElementById('mp-global-dot');
        const lbl = document.getElementById('mp-global-lbl');
        if (!btn || !dot || !lbl) return;

        const session = getActiveOnlineSession();
        if (!session) {
            btn.classList.remove('is-connected', 'is-waiting');
            dot.className = 'w-2 h-2 rounded-full bg-cyan-400 shrink-0';
            lbl.textContent = 'Online spielen';
            return;
        }

        if (session.connected) {
            btn.classList.add('is-connected');
            btn.classList.remove('is-waiting');
            dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0';
            lbl.textContent = (session.kind === 'daily' || session.kind === 'sudoku')
                ? `Live · ${session.code} (${session.count})`
                : `Online · ${session.code}`;
        } else {
            btn.classList.remove('is-connected');
            btn.classList.add('is-waiting');
            dot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0';
            lbl.textContent = `Warte · ${session.code}`;
        }
        if (window.BlinkGameHub && typeof window.BlinkGameHub.syncOnlineInline === 'function') {
            window.BlinkGameHub.syncOnlineInline();
        }
    }

    function enhanceArenaP2PHooks() {
        const panel = document.getElementById('online-p2p-panel');
        if (panel && !document.getElementById('mp-arena-clean-card')) {
            // Versteckt das alte kleinteilige Sidebar-Formular (Elemente bleiben für games.js im DOM)
            const idleBox = document.getElementById('p2p-idle-controls');
            const activeBox = document.getElementById('p2p-active-controls');
            if (idleBox) idleBox.classList.add('mp-legacy-hidden');
            if (activeBox) activeBox.classList.add('mp-legacy-hidden');

            const card = document.createElement('div');
            card.id = 'mp-arena-clean-card';
            card.className = 'space-y-2.5';
            panel.appendChild(card);
        }

        const modeSel = document.getElementById('select-game-mode');
        if (modeSel && !modeSel.__mpCleanBound) {
            modeSel.__mpCleanBound = true;
            modeSel.addEventListener('change', () => {
                if (modeSel.value === 'online' && !mpHub.suppressAutoOpen && typeof p2pState !== 'undefined' && !p2pState.connected && !p2pState.peer) {
                    openUnifiedOnlineModal('arena');
                }
                syncArenaSidebarCard();
            });
        }

        if (typeof window.p2pUpdateUI === 'function' && !window.p2pUpdateUI.__mpHubWrapped) {
            const origUpdate = window.p2pUpdateUI;
            const wrapped = function (statusText = null, tone = 'idle') {
                origUpdate(statusText, tone);
                syncArenaSidebarCard();
                updateGlobalOnlineButton();
                if (isUnifiedModalOpen()) renderUnifiedModal();
            };
            wrapped.__mpHubWrapped = true;
            window.p2pUpdateUI = wrapped;
        }

        if (typeof window.p2pHandleMessage === 'function' && !window.p2pHandleMessage.__mpHubWrapped) {
            const origMsg = window.p2pHandleMessage;
            const wrappedMsg = function (msg) {
                origMsg(msg);
                if (msg && msg.type === 'STATE_SYNC' && msg.isRunning) {
                    closeUnifiedOnlineModal();
                    if (window.BlinkGameHub && typeof window.BlinkGameHub.openGame === 'function') {
                        window.BlinkGameHub.openGame('arena');
                    }
                }
                syncArenaSidebarCard();
                updateGlobalOnlineButton();
                if (isUnifiedModalOpen()) renderUnifiedModal();
            };
            wrappedMsg.__mpHubWrapped = true;
            window.p2pHandleMessage = wrappedMsg;
        }

        if (typeof window.setGameSubTab === 'function' && !window.setGameSubTab.__mpHubWrapped) {
            const origTab = window.setGameSubTab;
            const wrappedTab = function (tab) {
                const res = origTab.apply(this, arguments);
                if (!getActiveOnlineSession() && ['arena', 'verhoer', 'daily', 'sudoku'].includes(tab)) {
                    mpHub.selectedMode = tab;
                }
                updateGlobalOnlineButton();
                return res;
            };
            wrappedTab.__mpHubWrapped = true;
            window.setGameSubTab = wrappedTab;
        }

        syncArenaSidebarCard();
    }

    function syncArenaSidebarCard() {
        const card = document.getElementById('mp-arena-clean-card');
        if (!card || typeof p2pState === 'undefined') return;

        if (p2pState.connected) {
            const opp = escHtml(p2pState.oppName || 'Online-Gegner');
            card.innerHTML = `
                <div class="text-xs text-slate-300 leading-snug">
                    Verbunden mit <strong class="text-white">${opp}</strong> · Code <span class="mono font-bold text-cyan-300">${escHtml(p2pState.roomCode)}</span>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" onclick="window.BlinkMultiplayer.openHub('arena')" class="flex-1 py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white font-bold text-xs transition">Online-Raum</button>
                    <button type="button" onclick="window.BlinkMultiplayer.disconnectArena()" class="px-3 py-2 rounded-full border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs transition">Trennen</button>
                </div>
            `;
        } else if (p2pState.peer && p2pState.roomCode) {
            card.innerHTML = `
                <div class="text-xs text-amber-200 leading-snug">
                    Raum <strong class="mono">${escHtml(p2pState.roomCode)}</strong> ist offen — warte auf Gegner.
                </div>
                <button type="button" onclick="window.BlinkMultiplayer.openHub('arena')" class="w-full py-2 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs transition">QR-Code &amp; Link zeigen</button>
            `;
        } else {
            card.innerHTML = `
                <button type="button" onclick="window.BlinkMultiplayer.openHub('arena')" class="w-full py-2.5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs transition">Online-Raum öffnen</button>
            `;
        }
    }

   // Arena-Aktionen (mit stayInHub bleibt der Nutzer sauber in der Inline-Lobby)
    function hubCreateArenaRoom(stayInHub = false) {
        closeAllOtherSessionsExcept('arena');
        if (!stayInHub && typeof setGameSubTab === 'function' && typeof labState !== 'undefined' && labState.activeGameTab !== 'arena') {
            setGameSubTab('arena');
        }
        if (typeof p2pCreateRoom === 'function') p2pCreateRoom();
        if (typeof syncGameConfigUI === 'function') syncGameConfigUI();
        syncArenaSidebarCard();
        if (isUnifiedModalOpen()) renderUnifiedModal();
        updateGlobalOnlineButton();
    }

    function hubJoinArenaRoom(code, stayInHub = false) {
        const clean = String(code || '').trim().toUpperCase();
        if (clean.length < 4) {
            if (typeof showSonnerToast === 'function') showSonnerToast('Bitte gib den 4-stelligen Raum-Code ein.', 'warn');
            return;
        }
        closeAllOtherSessionsExcept('arena');
        if (!stayInHub && typeof setGameSubTab === 'function' && typeof labState !== 'undefined' && labState.activeGameTab !== 'arena') {
            setGameSubTab('arena');
        }
        const inp = document.getElementById('p2p-join-input');
        if (inp) inp.value = clean;
        if (typeof p2pJoinRoom === 'function') p2pJoinRoom();
        if (typeof syncGameConfigUI === 'function') syncGameConfigUI();
        syncArenaSidebarCard();
        if (isUnifiedModalOpen()) renderUnifiedModal();
        updateGlobalOnlineButton();
    }

    function hubStartArenaMatch() {
        closeUnifiedOnlineModal();
        if (typeof setGameSubTab === 'function' && typeof labState !== 'undefined' && labState.activeGameTab !== 'arena') {
            setGameSubTab('arena');
        }
        if (typeof startNewBlinkGame === 'function') startNewBlinkGame();
    }

    function hubDisconnectArena() {
        if (typeof p2pDisconnect === 'function') p2pDisconnect(false);
        if (typeof initBlinkGameLobby === 'function') initBlinkGameLobby();
        syncArenaSidebarCard();
        updateGlobalOnlineButton();
        renderUnifiedModal();
    }

    function hubSetArenaRule(rule) {
        const ruleSel = document.getElementById('select-rule-mode');
        if (ruleSel) {
            ruleSel.value = rule === 'cluster' ? 'cluster' : 'normal';
            if (typeof onGameConfigChange === 'function') onGameConfigChange();
        }
        if (typeof playSound === 'function') playSound('tick');
        renderUnifiedModal();
    }

    // ------------------------------------------------------------------------
    // 3. DAS VERHÖR ONLINE 1v1 (HOST-AUTORITATIV + INTERSTELLAR-SOUND + H2H)
    // ------------------------------------------------------------------------
    const vhNet = {
        active: false,
        peer: null,
        conn: null,
        role: null, // 'host' | 'guest'
        roomCode: '',
        connected: false,
        statusText: 'Getrennt',
        oppName: '',
        oppProfile: null,
        seriesScore: { host: 0, guest: 0 },
        hostGame: null,
        viewMeta: {
            intStep: null,
            intDemand: null,
            intMatchIndices: [],
            oppSlotIndices: [],
            intAttackerIsMe: false,
            pendingIdx: null
        }
    };

    function vhNetSend(payload) {
        if (vhNet.conn && vhNet.conn.open) {
            vhNet.conn.send(payload);
        }
    }

    function vhNetDisconnect(silent = false) {
        if (vhNet.conn) { try { vhNet.conn.close(); } catch (e) { } }
        if (vhNet.peer) { try { vhNet.peer.destroy(); } catch (e) { } }
        const wasActive = vhNet.active;
        vhNet.conn = null;
        vhNet.peer = null;
        vhNet.active = false;
        vhNet.connected = false;
        vhNet.role = null;
        vhNet.roomCode = '';
        vhNet.statusText = 'Getrennt';
        vhNet.oppName = '';
        vhNet.oppProfile = null;
        vhNet.seriesScore = { host: 0, guest: 0 };
        vhNet.hostGame = null;
        vhNet.viewMeta = { intStep: null, intDemand: null, intMatchIndices: [], oppSlotIndices: [], intAttackerIsMe: false, pendingIdx: null };

        updateGlobalOnlineButton();
        if (isUnifiedModalOpen()) renderUnifiedModal();
        if (wasActive && typeof vhInitLobby === 'function') {
            vhInitLobby();
        }
        if (!silent && typeof showSonnerToast === 'function') {
            showSonnerToast('Verhör-Online-Verbindung getrennt.', 'neutral');
        }
    }

   function vhNetCreateRoom(stayInHub = false) {
        if (typeof Peer === 'undefined') {
            showSonnerToast('Online-Transport nicht verfügbar (Internetverbindung nötig).', 'warn');
            return;
        }
        closeAllOtherSessionsExcept('verhoer');
        vhNetDisconnect(true);
        if (!stayInHub && typeof setGameSubTab === 'function' && typeof labState !== 'undefined' && labState.activeGameTab !== 'verhoer') {
            setGameSubTab('verhoer');
        }

        const code = genRoomCode(4);
        vhNet.active = true;
        vhNet.role = 'host';
        vhNet.roomCode = code;
        vhNet.statusText = 'Erstelle Raum...';
        updateGlobalOnlineButton();
        if (isUnifiedModalOpen()) renderUnifiedModal();

        const peer = new Peer(VH_PREFIX + code);
        vhNet.peer = peer;

        peer.on('open', () => {
            vhNet.statusText = 'Warte auf Gegner';
            updateGlobalOnlineButton();
            if (isUnifiedModalOpen()) renderUnifiedModal();
            showSonnerToast(`Verhör-Raum ${code} geöffnet!`, 'success');
        });

        peer.on('connection', (conn) => {
            if (vhNet.conn && vhNet.conn.open) {
                conn.close();
                return;
            }
            vhNetAttachConn(conn);
        });

        peer.on('error', (err) => {
            showSonnerToast(`Online-Fehler: ${err.type || 'Raum nicht erreichbar'}`, 'warn');
            vhNetDisconnect(true);
        });
    }

    function vhNetJoinRoom(forcedCode = null, stayInHub = false) {
        if (typeof Peer === 'undefined') {
            showSonnerToast('Online-Transport nicht verfügbar (Internetverbindung nötig).', 'warn');
            return;
        }
        const inp = document.getElementById('mp-hub-join-input');
        const code = (forcedCode || (inp ? inp.value : '')).trim().toUpperCase();
        if (code.length < 4) {
            showSonnerToast('Bitte gib den 4-stelligen Raum-Code ein.', 'warn');
            return;
        }
        closeAllOtherSessionsExcept('verhoer');
        vhNetDisconnect(true);
        if (!stayInHub && typeof setGameSubTab === 'function' && typeof labState !== 'undefined' && labState.activeGameTab !== 'verhoer') {
            setGameSubTab('verhoer');
        }

        vhNet.active = true;
        vhNet.role = 'guest';
        vhNet.roomCode = code;
        vhNet.statusText = 'Verbinde...';
        updateGlobalOnlineButton();
        renderUnifiedModal();

        const peer = new Peer();
        vhNet.peer = peer;

        const connectTimer = setTimeout(() => {
            if (vhNet.active && !vhNet.connected && vhNet.role === 'guest') {
                showSonnerToast(`Verhör-Raum ${code} antwortet nicht.`, 'warn');
                vhNetDisconnect(true);
            }
        }, 10000);

        peer.on('open', () => {
            const conn = peer.connect(VH_PREFIX + code, { reliable: true });
            conn.on('open', () => clearTimeout(connectTimer));
            vhNetAttachConn(conn);
        });

        peer.on('error', () => {
            clearTimeout(connectTimer);
            showSonnerToast(`Verhör-Raum ${code} nicht gefunden.`, 'warn');
            vhNetDisconnect(true);
        });
    }

    function vhNetAttachConn(conn) {
        vhNet.conn = conn;
        conn.on('open', () => {
            vhNet.connected = true;
            vhNet.statusText = 'Verbunden';
            if (typeof playSound === 'function') playSound('win');
            vhNetSend({ type: 'VH_HELLO', name: getMyNameSafe(), profile: getMyProfileSafe() });
            updateGlobalOnlineButton();
            if (isUnifiedModalOpen()) renderUnifiedModal();
            if (typeof renderVerhoerStandaloneUI === 'function') renderVerhoerStandaloneUI();
            const msg = vhNet.role === 'host'
                ? 'Gegner im Verhör verbunden! Klicke auf „Spiel starten“.'
                : 'Verbunden! Warte auf den Start durch den Host...';
            showSonnerToast(msg, 'success');
        });

        conn.on('data', (msg) => vhNetHandleMessage(msg));

        conn.on('close', () => {
            showSonnerToast('Verhör-Gegner hat die Verbindung getrennt.', 'warn');
            vhNetDisconnect(true);
        });
    }

    function vhHostPlaceCard(g, role, card) {
        g.hands[role] = g.hands[role].filter(Boolean);
        g.hands[role].push(card);
        g.lastCleared[role] = null;
        return g.hands[role].length - 1;
    }

    function vhHostPushLog(g, html) {
        g.logs.unshift(html);
        if (g.logs.length > 25) g.logs.pop();
    }

    function vhHostStartOnlineMatch() {
        if (!vhNet.active || vhNet.role !== 'host' || !vhNet.connected) {
            showSonnerToast('Verbinde dich zuerst mit einem Gegner im Online-Menü.', 'warn');
            openUnifiedOnlineModal('verhoer');
            return;
        }
        const deck125 = shuffleArray(CARDS_125);
        const firstDiscard = deck125.pop();
        const hostStart = deck125.splice(0, 5);
        const guestStart = deck125.splice(0, 5);
        const starter = Math.random() < 0.5 ? 'host' : 'guest';
        const starterName = starter === 'host' ? getMyNameSafe() : (vhNet.oppName || 'Gegner');

        vhNet.hostGame = {
            isRunning: true,
            deck: deck125,
            discardHistory: [firstDiscard],
            hands: { host: hostStart, guest: guestStart },
            lastCleared: { host: null, guest: null },
            trios: { host: [], guest: [] },
            turn: starter,
            phase: 'draw',
            sktMeldedThisTurn: false,
            recalledKey: null,
            intType: null,
            intStep: null,
            intAttacker: null,
            intDemand: null,
            intMatchIndices: [],
            pendingIdx: null,
            pendingCard: null,
            intNote: '',
            logs: [
                `<span class="text-cyan-300 font-bold">${escHtml(starterName)}</span> beginnt · M₁: (${firstDiscard.join(',')})`
            ],
            winInfo: null
        };

        closeUnifiedOnlineModal();
        if (typeof setGameSubTab === 'function' && typeof labState !== 'undefined' && labState.activeGameTab !== 'verhoer') {
            setGameSubTab('verhoer');
        }
        if (typeof playSound === 'function') playSound('flip');
        vhHostBroadcastState('Online-Verhör gestartet!', 'success');
    }

    function vhHostBuildViewFor(targetRole) {
        const g = vhNet.hostGame;
        const oppRole = targetRole === 'host' ? 'guest' : 'host';
        const oppLiveSlots = g.hands[oppRole].map((c, i) => (c ? i : -1)).filter(i => i !== -1);
        const isAttacker = g.intAttacker === targetRole;

        let viewIntStep = null;
        let viewPendingCard = null;
        let viewPendingIdx = null;
        let viewMatchIndices = [];
        let viewStrictMatches = [];

        if (g.phase === 'interrogation') {
            if (isAttacker) {
                viewIntStep = g.intStep === 'defender_pick' ? 'wait_defender' : g.intStep;
                if (g.intStep === 'decide') viewPendingCard = g.pendingCard;
                if (g.intStep === 'strict_pick') {
                    viewStrictMatches = (g.intMatchIndices || [])
                        .filter(i => Boolean(g.hands[oppRole][i]))
                        .map(i => ({ idx: i, card: g.hands[oppRole][i] }));
                }
            } else {
                if (g.intStep === 'defender_pick') {
                    viewIntStep = 'defender_pick';
                    viewMatchIndices = g.intMatchIndices;
                } else if (g.intStep === 'strict_pick') {
                    viewIntStep = 'wait_strict_pick';
                    viewMatchIndices = g.intMatchIndices;
                } else if (g.intStep === 'decide') {
                    viewIntStep = 'wait_decision';
                    viewPendingCard = g.pendingCard;
                    viewPendingIdx = g.pendingIdx;
                } else if (g.intStep === 'no_match') {
                    viewIntStep = 'wait_no_match';
                } else {
                    viewIntStep = 'wait_attacker';
                }
            }
        }

        return {
            isRunning: g.isRunning,
            isMyTurn: g.turn === targetRole,
            phase: g.phase,
            sktMeldedThisTurn: g.turn === targetRole ? Boolean(g.sktMeldedThisTurn) : false,
            deckCount: g.deck.length,
            discardHistory: g.discardHistory.slice(-2),
            myHand: g.hands[targetRole].filter(Boolean),
            oppHandCount: oppLiveSlots.length,
            oppSlotIndices: oppLiveSlots,
            myTrios: g.trios[targetRole],
            oppTrios: g.trios[oppRole],
            recalledKey: g.turn === targetRole ? g.recalledKey : null,
            intType: g.intType,
            intStep: viewIntStep,
            intAttackerIsMe: isAttacker,
            intDemand: g.intDemand,
            intMatchIndices: viewMatchIndices,
            strictMatches: viewStrictMatches,
            pendingCard: viewPendingCard,
            pendingIdx: viewPendingIdx,
            intNote: g.intNote,
            logs: g.logs,
            seriesScore: {
                host: vhNet.seriesScore ? (vhNet.seriesScore.host || 0) : 0,
                guest: vhNet.seriesScore ? (vhNet.seriesScore.guest || 0) : 0
            },
            winInfo: g.winInfo ? { didWin: g.winInfo.winnerRole === targetRole, cluster: g.winInfo.cluster, winnerName: g.winInfo.winnerName } : null
        };
    }

    function vhHostBroadcastState(toastMsg = '', toastTone = 'neutral') {
        if (!vhNet.hostGame) return;
        const hostView = vhHostBuildViewFor('host');
        const guestView = vhHostBuildViewFor('guest');
        vhApplyOnlineView(hostView, toastMsg, toastTone);
        vhNetSend({ type: 'VH_SYNC', view: guestView, toastMsg, toastTone });
    }

    function vhApplyOnlineView(view, toastMsg = '', toastTone = 'neutral') {
        if (typeof vhState === 'undefined' || !view) return;
        const wasRunning = vhState.isRunning;

        vhState.isRunning = view.isRunning;
        vhState.turn = view.isMyTurn ? 'player' : 'ai';
        vhState.phase = view.phase;
        vhState.deck = new Array(view.deckCount).fill([0, 0, 0]);
        vhState.discardHistory = view.discardHistory || [];
        vhState.playerHand = view.myHand || [];
        vhState.aiHand = new Array(view.oppHandCount || 0).fill([0, 0, 0]);
        vhState.playerTrios = view.myTrios || [];
        vhState.aiTrios = view.oppTrios || [];
        vhState.recalledKey = view.recalledKey || null;
        vhState.sktMeldedThisTurn = Boolean(view.sktMeldedThisTurn);
        vhState.intType = view.intType || null;
        vhState.intStep = view.intStep || null;
        vhState.strictMatches = Array.isArray(view.strictMatches) ? view.strictMatches : [];
        vhState.intDemandLabel = view.intDemand?.label || '';
        vhState.pendingCard = view.pendingCard || null;
        vhState.intNote = view.intNote || '';
        vhState.logs = view.logs || [];
        vhState.winInfo = view.winInfo || null;
        if (view.seriesScore && typeof view.seriesScore === 'object') {
            vhNet.seriesScore = {
                host: view.seriesScore.host || 0,
                guest: view.seriesScore.guest || 0
            };
        }
        if (!view.isMyTurn || view.phase === 'interrogation' || view.phase === 'ended') {
            vhState.selectedIdx = null;
            vhState.sktDraftIndices = [];
        }

        vhNet.viewMeta = {
            intStep: view.intStep,
            intDemand: view.intDemand,
            intMatchIndices: view.intMatchIndices || [],
            oppSlotIndices: view.oppSlotIndices || [],
            intAttackerIsMe: Boolean(view.intAttackerIsMe),
            pendingIdx: typeof view.pendingIdx === 'number' ? view.pendingIdx : null
        };

        if (!wasRunning && view.isRunning) {
            closeUnifiedOnlineModal();
            if (window.BlinkGameHub && typeof window.BlinkGameHub.openGame === 'function') {
                window.BlinkGameHub.openGame('verhoer');
            }
            if (typeof syncActiveGameModeMusic === 'function') syncActiveGameModeMusic();
        } else if (wasRunning && !view.isRunning) {
            if (typeof stopGameMusic === 'function') stopGameMusic();
            if (view.winInfo) {
                if (typeof playSound === 'function') playSound(view.winInfo.didWin ? 'win' : 'error');
                if (view.winInfo.didWin && window.BlinkHaptics) {
                    window.BlinkHaptics.burst(document.getElementById('vh-discard-pile'), 'emerald', 28);
                }
            }
        }

        if (toastMsg && typeof showSonnerToast === 'function') {
            showSonnerToast(toastMsg, toastTone);
        }
        if (typeof renderVerhoerStandaloneUI === 'function') renderVerhoerStandaloneUI();
    }

    function vhHostProcessAction(role, action) {
        const g = vhNet.hostGame;
        if (!g || !action || !action.kind) return;
        const oppRole = role === 'host' ? 'guest' : 'host';
        const actorName = escHtml(role === 'host' ? getMyNameSafe() : (vhNet.oppName || 'Gegner'));
        const oppName = escHtml(oppRole === 'host' ? getMyNameSafe() : (vhNet.oppName || 'Gegner'));
        const actorColor = role === 'host' ? 'text-cyan-400' : 'text-rose-400';

        if (action.kind === 'ABORT') {
            g.isRunning = false;
            g.phase = 'idle';
            g.winInfo = null;
            vhHostBroadcastState(`${actorName} hat die Partie beendet.`, 'warn');
            return;
        }
        if (!g.isRunning) return;

        if (action.kind === 'CALL_CLUSTER') {
            const winClu = findValidCluster5FromPool(g.hands[role].filter(Boolean), g.trios[role]);
            if (!winClu) return;
            if (!vhNet.seriesScore) vhNet.seriesScore = { host: 0, guest: 0 };
            vhNet.seriesScore[role] = (vhNet.seriesScore[role] || 0) + 1;
            g.isRunning = false;
            g.phase = 'ended';
            g.winInfo = { winnerRole: role, winnerName: actorName, cluster: winClu };
            vhHostPushLog(g, `<span class="text-emerald-400 font-bold">${actorName} ruft Cluster!</span>`);
            vhHostBroadcastState(`${actorName} gewinnt mit einem 5er-Cluster!`, 'success');
            return;
        }

        if (action.kind === 'DEFENDER_SHOW_CARD' && g.phase === 'interrogation' && g.intStep === 'defender_pick' && g.intAttacker === oppRole) {
            const idx = action.idx;
            if (!g.intMatchIndices.includes(idx) || !g.hands[role][idx]) return;
            g.pendingIdx = idx;
            g.pendingCard = g.hands[role][idx];
            g.intStep = 'decide';
            vhHostPushLog(g, `<span class="text-amber-300">Verhör:</span> ${actorName} zeigt (${g.pendingCard.join(',')})`);
            vhHostBroadcastState();
            return;
        }

        if (g.turn !== role) return;

        if (action.kind === 'DRAW_DECK' && g.phase === 'draw') {
            if (g.deck.length === 0) g.deck = shuffleArray(CARDS_125);
            const card = g.deck.shift();
            vhHostPlaceCard(g, role, card);
            g.recalledKey = null;
            g.phase = 'action';
            vhHostPushLog(g, `<span class="${actorColor} font-bold">${actorName}:</span> Zieht blind vom Stapel`);
            vhHostBroadcastState();
            return;
        }

        if (action.kind === 'RECALL' && g.phase === 'draw' && g.discardHistory.length > 0) {
            const taken = g.discardHistory.pop();
            vhHostPlaceCard(g, role, taken);
            g.recalledKey = keyOf(...taken);
            g.phase = 'action';
            vhHostPushLog(g, `<span class="text-amber-300 font-bold">${actorName}:</span> Rückruf (${taken.join(',')}) von M₁`);
            vhHostBroadcastState();
            return;
        }

        if (action.kind === 'MELD_SKT' && g.phase !== 'interrogation' && g.phase !== 'ended') {
            if (g.sktMeldedThisTurn) return;
            const indices = Array.isArray(action.indices) ? [...new Set(action.indices)] : [];
            if (indices.length !== 3) return;
            const cards = indices.map(i => g.hands[role][i]).filter(Boolean);
            if (cards.length !== 3) return;
            const [c1, c2, c3] = cards;
            if (!areCardsCompletelyDifferent(c1, c2) || !areCardsCompletelyDifferent(c1, c3) || !areCardsCompletelyDifferent(c2, c3)) return;

            indices.sort((a, b) => a - b);
            g.trios[role].push(indices.map(i => g.hands[role][i]));
            indices.forEach(i => {
                if (g.deck.length === 0) g.deck = shuffleArray(CARDS_125);
                g.hands[role][i] = g.deck.shift();
            });
            g.sktMeldedThisTurn = true;
            vhHostPushLog(g, `<span class="text-purple-300 font-bold">${actorName}:</span> SKT ausgelegt (+3)`);
            vhHostBroadcastState(`${actorName} legt ein 3er-SKT aus!`, 'success');
            return;
        }

        if (action.kind === 'DISCARD' && (g.phase === 'action' || g.phase === 'bonus_discard')) {
            const idx = action.idx;
            const card = g.hands[role][idx];
            if (!card) return;
            if (g.phase === 'action' && g.recalledKey && keyOf(...card) === g.recalledKey) return;

            const prevTop = g.discardHistory.length > 0 ? g.discardHistory[g.discardHistory.length - 1] : null;
            g.hands[role].splice(idx, 1);
            g.lastCleared[role] = null;
            g.discardHistory.push(card);
            g.recalledKey = null;

            if (g.phase === 'bonus_discard') {
                vhHostPushLog(g, `<span class="${actorColor} font-bold">${actorName}:</span> Tausch-Abwurf (${card.join(',')}) → M₁`);
                g.turn = oppRole;
                g.phase = 'draw';
                g.sktMeldedThisTurn = false;
                g.intType = null;
                g.intStep = null;
                g.intAttacker = null;
                vhHostBroadcastState();
                return;
            }

            const dH = prevTop ? hammingDistance(card, prevTop) : 3;
            vhHostPushLog(g, `<span class="${actorColor} font-bold">${actorName}:</span> (${card.join(',')}) → M₁`);

            if (dH === 3) {
                g.turn = oppRole;
                g.phase = 'draw';
                g.sktMeldedThisTurn = false;
                vhHostBroadcastState();
            } else {
                g.phase = 'interrogation';
                g.intType = dH === 2 ? 'standard' : 'strict';
                g.intStep = 'choose_prop';
                g.intAttacker = role;
                g.intDemand = null;
                g.intMatchIndices = [];
                vhHostBroadcastState(
                    dH === 2 ? `Standard-Verhör von ${actorName}!` : `⚡ Verschärftes Verhör von ${actorName}!`,
                    dH === 2 ? 'neutral' : 'warn'
                );
            }
            return;
        }

        if (action.kind === 'DEMAND_PROP' && g.phase === 'interrogation' && g.intStep === 'choose_prop') {
            const { dim, val } = action;
            const dimNames = ['Anzahl', 'Farbe', 'Symbol'];
            const valName = dim === 0 ? `${PALETTE_X[val].count}× (${PALETTE_X[val].word})` : (dim === 1 ? PALETTE_Y[val].name : PALETTE_Z[val].name);
            const label = `${dimNames[dim]}: ${valName}`;
            g.intDemand = { dim, val, label };

            const matches = g.hands[oppRole]
                .map((c, i) => (c && c[dim] === val) ? i : -1)
                .filter(i => i !== -1);

            if (matches.length === 0) {
                g.intStep = 'no_match';
                g.intNote = `${oppName} besitzt keine Karte mit ${label}.`;
                vhHostPushLog(g, `<span class="text-amber-300">Verhör:</span> ${oppName} hat kein ${valName}`);
                vhHostBroadcastState();
            } else if (matches.length === 1) {
                g.pendingIdx = matches[0];
                g.pendingCard = g.hands[oppRole][matches[0]];
                g.intStep = 'decide';
                vhHostPushLog(g, `<span class="text-amber-300">Verhör:</span> ${oppName} zeigt (${g.pendingCard.join(',')})`);
                vhHostBroadcastState();
            } else if (g.intType === 'strict') {
                g.intMatchIndices = matches;
                g.intStep = 'strict_pick';
                vhHostPushLog(g, `<span class="text-amber-300">⚡ Verschärftes Verhör:</span> ${oppName} zeigt alle ${matches.length} Karten (${valName})`);
                vhHostBroadcastState();
            } else {
                g.intMatchIndices = matches;
                g.intStep = 'defender_pick';
                vhHostPushLog(g, `<span class="text-amber-300">Verhör:</span> ${actorName} fordert ${valName}`);
                vhHostBroadcastState();
            }
            return;
        }

        if ((action.kind === 'STRICT_PICK' || action.kind === 'BLIND_PICK') && g.phase === 'interrogation' && g.intStep === 'strict_pick') {
            const idx = action.idx;
            if (!g.intMatchIndices.includes(idx) || !g.hands[oppRole][idx]) return;
            g.pendingIdx = idx;
            g.pendingCard = g.hands[oppRole][idx];
            g.intStep = 'decide';
            vhHostPushLog(g, `<span class="text-amber-300">⚡ Auswahl:</span> ${actorName} wählt (${g.pendingCard.join(',')})`);
            vhHostBroadcastState();
            return;
        }

        if (action.kind === 'RESOLVE_DECISION' && g.phase === 'interrogation' && g.intStep === 'decide') {
            const idx = g.pendingIdx;
            const card = g.pendingCard;
            if (idx === null || !card) return;

            if (g.deck.length === 0) g.deck = shuffleArray(CARDS_125);
            g.hands[oppRole][idx] = g.deck.shift();
            g.pendingIdx = null;
            g.pendingCard = null;
            g.intStep = null;
            g.intDemand = null;
            g.intMatchIndices = [];

            if (action.takeCard) {
                vhHostPlaceCard(g, role, card);
                g.phase = 'bonus_discard';
                vhHostPushLog(g, `<span class="text-emerald-400 font-bold">${actorName}:</span> Übernimmt (${card.join(',')})`);
                vhHostBroadcastState(`${actorName} übernimmt (${card.join(',')}) auf die Hand.`, 'neutral');
            } else {
                g.discardHistory.push(card);
                g.turn = oppRole;
                g.phase = 'draw';
                g.sktMeldedThisTurn = false;
                g.intType = null;
                g.intAttacker = null;
                vhHostPushLog(g, `<span class="text-rose-400 font-bold">Strafabwurf:</span> ${oppName} muss (${card.join(',')}) abwerfen`);
                vhHostBroadcastState(`${actorName} lehnt (${card.join(',')}) ab → Ablagestapel M₁.`, 'warn');
            }
            return;
        }

        if (action.kind === 'END_NO_MATCH' && g.phase === 'interrogation' && g.intStep === 'no_match') {
            g.turn = oppRole;
            g.phase = 'draw';
            g.sktMeldedThisTurn = false;
            g.intType = null;
            g.intStep = null;
            g.intAttacker = null;
            g.intDemand = null;
            vhHostBroadcastState();
        }
    }

    function vhNetDispatchAction(action) {
        if (!vhNet.active) return;
        if (vhNet.role === 'host') {
            vhHostProcessAction('host', action);
        } else {
            vhNetSend({ type: 'VH_ACTION', action });
        }
    }

    function vhNetHandleMessage(msg) {
        if (!msg || !msg.type) return;

        if (msg.type === 'VH_HELLO') {
            if (typeof msg.name === 'string' && msg.name.trim()) vhNet.oppName = msg.name.trim().slice(0, 18);
            if (msg.profile && typeof msg.profile === 'object') vhNet.oppProfile = msg.profile;
            if (isUnifiedModalOpen()) renderUnifiedModal();
            if (window.BlinkGameHub && typeof window.BlinkGameHub.syncOnlineInline === 'function') {
                window.BlinkGameHub.syncOnlineInline();
            }
            if (typeof renderVerhoerStandaloneUI === 'function') renderVerhoerStandaloneUI();
            return;
        }

        if (msg.type === 'VH_H2H_RESET') {
            vhNet.seriesScore = { host: 0, guest: 0 };
            if (typeof renderVerhoerStandaloneUI === 'function') renderVerhoerStandaloneUI();
            if (isUnifiedModalOpen()) renderUnifiedModal();
            showSonnerToast('Verhör Head-to-Head auf 0 : 0 zurückgesetzt.', 'neutral');
            return;
        }

        if (vhNet.role === 'host') {
            if (msg.type === 'VH_ACTION') {
                vhHostProcessAction('guest', msg.action);
            } else if (msg.type === 'VH_REMATCH_REQ') {
                if (!vhNet.hostGame || !vhNet.hostGame.isRunning) {
                    vhHostStartOnlineMatch();
                } else {
                    showSonnerToast(`${vhNet.oppName || 'Gegner'} möchte eine neue Verhör-Partie starten.`, 'neutral');
                }
            }
            return;
        }

        if (msg.type === 'VH_SYNC') {
            vhApplyOnlineView(msg.view, msg.toastMsg, msg.toastTone);
        }
    }

    function enhanceVerhoerHooks() {
        const ensureOfflineDrawSlot = () => {
            if (typeof vhState === 'undefined' || !Array.isArray(vhState.playerHand)) return;
            const liveCount = vhState.playerHand.filter(Boolean).length;
            if (liveCount < 6 && !vhState.playerHand.some(c => !c)) {
                vhState.playerHand.push(null);
            }
        };

        const wrapFn = (name, onlineHandler, offlinePrep = null) => {
            if (typeof window[name] !== 'function' || window[name].__vhNetWrapped) return;
            const orig = window[name];
            const wrapped = function (...args) {
                if (vhNet.active) return onlineHandler.apply(this, args);
                if (typeof offlinePrep === 'function') offlinePrep.apply(this, args);
                const res = orig.apply(this, args);
                compactVerhoerHandIfNeeded();
                return res;
            };
            wrapped.__vhNetWrapped = true;
            window[name] = wrapped;
        };

        wrapFn('vhStartNewGame', () => {
            if (vhNet.role === 'host') vhHostStartOnlineMatch();
            else if (vhNet.connected) {
                vhNetSend({ type: 'VH_REMATCH_REQ' });
                showSonnerToast('Rematch-Anfrage an den Host gesendet...', 'neutral');
            } else {
                openUnifiedOnlineModal('verhoer');
            }
        });

        wrapFn('vhAbortGame', () => {
            vhNetDispatchAction({ kind: 'ABORT' });
        });

        wrapFn('vhDrawFromDeck', () => {
            if (!vhState.isRunning || vhState.turn !== 'player' || vhState.phase !== 'draw') return;
            if (typeof playSound === 'function') playSound('play');
            vhNetDispatchAction({ kind: 'DRAW_DECK' });
        }, () => {
            if (vhState.isRunning && vhState.turn === 'player' && vhState.phase === 'draw') {
                ensureOfflineDrawSlot();
            }
        });

        wrapFn('vhOnDiscardPileClick', () => {
            if (!vhState.isRunning || vhState.turn !== 'player') return;
            if (vhState.phase === 'draw') {
                if (vhState.discardHistory.length === 0) return;
                if (typeof playSound === 'function') playSound('flip');
                vhNetDispatchAction({ kind: 'RECALL' });
                return;
            }
            if ((vhState.phase === 'action' || vhState.phase === 'bonus_discard') && vhState.selectedIdx !== null) {
                vhConfirmSelectedDiscard();
            }
        }, () => {
            if (vhState.isRunning && vhState.turn === 'player' && vhState.phase === 'draw') {
                ensureOfflineDrawSlot();
            }
        });

        wrapFn('vhConfirmSelectedDiscard', (forceIdx = null) => {
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
            const sendIt = () => {
                if (typeof playSound === 'function') playSound('play');
                vhNetDispatchAction({ kind: 'DISCARD', idx });
            };
            if (!skipFly && window.BlinkHaptics) {
                const cardEl = document.getElementById(`vh-card-${idx}`);
                const discEl = document.getElementById('vh-discard-pile');
                if (cardEl && discEl) {
                    window.BlinkHaptics.flyCard(cardEl, discEl, sendIt, { duration: 175, tone: 'amber' });
                    return;
                }
            }
            sendIt();
        });

        wrapFn('vhDemandProperty', (dim, val) => {
            if (typeof playSound === 'function') playSound('tick');
            vhNetDispatchAction({ kind: 'DEMAND_PROP', dim, val });
        });

        wrapFn('vhStrictPick', (slotIdx) => {
            if (typeof playSound === 'function') playSound('flip');
            vhNetDispatchAction({ kind: 'STRICT_PICK', idx: slotIdx });
        });

        wrapFn('vhResolveDecision', (takeCard) => {
            if (typeof playSound === 'function') playSound(takeCard ? 'play' : 'tick');
            vhNetDispatchAction({ kind: 'RESOLVE_DECISION', takeCard: Boolean(takeCard) });
        }, (takeCard) => {
            if (takeCard) ensureOfflineDrawSlot();
        });

        wrapFn('vhEndPlayerTurn', () => {
            vhNetDispatchAction({ kind: 'END_NO_MATCH' });
        });

        wrapFn('vhValidateSktDraft', () => {
            if (vhState.sktMeldedThisTurn) {
                vhState.sktDraftIndices = [];
                showSonnerToast('Pro Runde darf maximal 1 SKT ausgelegt werden.', 'warn');
                renderVerhoerStandaloneUI();
                return;
            }
            const indices = [...vhState.sktDraftIndices];
            const cards = indices.map(i => vhState.playerHand[i]).filter(Boolean);
            if (cards.length !== 3) {
                vhState.sktDraftIndices = [];
                renderVerhoerStandaloneUI();
                return;
            }
            const [c1, c2, c3] = cards;
            const ok = areCardsCompletelyDifferent(c1, c2) && areCardsCompletelyDifferent(c1, c3) && areCardsCompletelyDifferent(c2, c3);
            if (ok) {
                vhState.sktDraftIndices = [];
                vhState.selectedIdx = null;
                if (typeof playSound === 'function') playSound('flip');
                if (window.BlinkHaptics) window.BlinkHaptics.burst(document.getElementById('vh-player-skt-box'), 'purple', 18);
                vhNetDispatchAction({ kind: 'MELD_SKT', indices });
            } else {
                triggerInvalidShake('vh-player-skt-box');
                showSonnerToast('Kein gültiges SKT (paarweise d_H = 3 nötig)!', 'warn');
                setTimeout(() => {
                    vhState.sktDraftIndices = [];
                    renderVerhoerStandaloneUI();
                }, 520);
            }
        });

        wrapFn('vhCallCluster', () => {
            if (!vhState.isRunning) return;
            const winCluster = findValidCluster5FromPool(vhState.playerHand.filter(Boolean), vhState.playerTrios);
            if (!winCluster) {
                showSonnerToast('Noch kein vollständiges 5er-Cluster vorhanden!', 'warn');
                return;
            }
            vhNetDispatchAction({ kind: 'CALL_CLUSTER' });
        });

        if (typeof window.renderVerhoerStandaloneUI === 'function' && !window.renderVerhoerStandaloneUI.__vhNetPost) {
            const origRender = window.renderVerhoerStandaloneUI;
            const wrappedRender = function () {
                compactVerhoerHandIfNeeded();
                origRender();
                postRenderVerhoerOnline();
            };
            wrappedRender.__vhNetPost = true;
            window.renderVerhoerStandaloneUI = wrappedRender;
        }
    }

    const vhTurnAlert = {
        wasMyTurn: false,
        wasDefenderPick: false,
        hideTimer: null,
        audioCtx: null
    };

    function playVerhoerTurnChime(kind = 'turn') {
        const soundChk = document.getElementById('chk-sound-enabled');
        if (soundChk && !soundChk.checked) return;
        const volEl = document.getElementById('range-sound-volume');
        const vol = Math.max(0.08, Math.min(1, (volEl ? parseFloat(volEl.value) : 25) / 100));

        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) {
                if (typeof playSound === 'function') playSound('flip');
                return;
            }
            if (!vhTurnAlert.audioCtx) vhTurnAlert.audioCtx = new Ctx();
            const ctx = vhTurnAlert.audioCtx;
            if (ctx.state === 'suspended') ctx.resume();

            const now = ctx.currentTime;
            const master = ctx.createGain();
            master.gain.setValueAtTime(0.85 * vol, now);
            master.connect(ctx.destination);

            const padFilter = ctx.createBiquadFilter();
            padFilter.type = 'lowpass';
            padFilter.frequency.setValueAtTime(520, now);
            padFilter.connect(master);

            const padFreqs = kind === 'interrogation' ? [87.31, 130.81, 220.0] : [110.0, 164.81, 220.0];
            padFreqs.forEach((f, idx) => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = idx === 0 ? 'sawtooth' : 'triangle';
                osc.frequency.setValueAtTime(f, now);
                osc.detune.setValueAtTime(idx === 1 ? 4 : (idx === 2 ? -3 : 0), now);
                g.gain.setValueAtTime(0.0001, now);
                g.gain.linearRampToValueAtTime((idx === 0 ? 0.055 : 0.045), now + 0.16);
                g.gain.exponentialRampToValueAtTime(0.0001, now + 1.38);
                osc.connect(g);
                g.connect(padFilter);
                osc.start(now);
                osc.stop(now + 1.42);
            });

            const arpNotes = kind === 'interrogation'
                ? [493.88, 659.25, 523.25, 659.25, 587.33, 659.25]
                : [440.0, 659.25, 493.88, 659.25, 523.25];
            const stepSec = kind === 'interrogation' ? 0.105 : 0.122;

            const triggerPianoNote = (freq, startAt, level, dur) => {
                const oscMain = ctx.createOscillator();
                const oscHarm = ctx.createOscillator();
                const gMain = ctx.createGain();
                const gHarm = ctx.createGain();

                oscMain.type = 'triangle';
                oscMain.frequency.setValueAtTime(freq, startAt);
                oscHarm.type = 'sine';
                oscHarm.frequency.setValueAtTime(freq * 2, startAt);

                gMain.gain.setValueAtTime(0.0001, startAt);
                gMain.gain.linearRampToValueAtTime(level, startAt + 0.011);
                gMain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);

                gHarm.gain.setValueAtTime(0.0001, startAt);
                gHarm.gain.linearRampToValueAtTime(level * 0.24, startAt + 0.008);
                gHarm.gain.exponentialRampToValueAtTime(0.0001, startAt + dur * 0.52);

                oscMain.connect(gMain);
                oscHarm.connect(gHarm);
                gMain.connect(master);
                gHarm.connect(master);

                oscMain.start(startAt);
                oscHarm.start(startAt);
                oscMain.stop(startAt + dur + 0.03);
                oscHarm.stop(startAt + dur + 0.03);
            };

            arpNotes.forEach((freq, i) => {
                const t = now + i * stepSec;
                const isLast = i === arpNotes.length - 1;
                triggerPianoNote(freq, t, isLast ? 0.20 : 0.16, isLast ? 0.92 : 0.56);
                triggerPianoNote(freq, t + 0.24, 0.038, 0.50);
            });
        } catch (e) {
            if (typeof playSound === 'function') playSound('flip');
        }
    }

    function showVerhoerTurnPopup(title, subtitle, kind = 'turn') {
        const view = document.getElementById('game-view-verhoer');
        const page = document.getElementById('page-game');
        if (!view || view.classList.contains('hidden') || !page || page.classList.contains('hidden')) return;

        const toast = document.getElementById('vh-turn-toast');
        const titleEl = document.getElementById('vh-turn-toast-title');
        const subEl = document.getElementById('vh-turn-toast-sub');
        const dotEl = document.getElementById('vh-turn-toast-dot');
        if (!toast) return;

        if (titleEl) titleEl.textContent = title;
        if (subEl) subEl.textContent = subtitle;
        if (dotEl) {
            dotEl.className = `w-2.5 h-2.5 rounded-full shrink-0 animate-pulse ${kind === 'interrogation' ? 'bg-amber-400' : 'bg-cyan-400'}`;
        }
        toast.classList.toggle('is-interrogation', kind === 'interrogation');
        toast.classList.remove('is-visible');
        void toast.offsetWidth;
        toast.classList.add('is-visible');

        playVerhoerTurnChime(kind);
        if (window.BlinkHaptics && typeof window.BlinkHaptics.vibrate === 'function') {
            window.BlinkHaptics.vibrate(kind === 'interrogation' ? [22, 35, 22] : [16, 28, 16]);
        }

        if (vhTurnAlert.hideTimer) clearTimeout(vhTurnAlert.hideTimer);
        vhTurnAlert.hideTimer = setTimeout(() => {
            toast.classList.remove('is-visible');
        }, 2400);
    }

    function replaceBotTextInTree(rootEl, oppName) {
        if (!rootEl || !oppName) return;
        const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            if (!/bot/i.test(node.nodeValue)) continue;
            node.nodeValue = node.nodeValue
                .replace(/\bdes\s+Taktik-Bots\b/gi, `von ${oppName}`)
                .replace(/\bvom\s+Taktik-Bot\b/gi, `von ${oppName}`)
                .replace(/\bbeim\s+Taktik-Bot\b/gi, `bei ${oppName}`)
                .replace(/\bzum\s+Taktik-Bot\b/gi, `zu ${oppName}`)
                .replace(/\b(?:den|dem|der)\s+Taktik-Bot\b/gi, oppName)
                .replace(/\bTaktik-Bot\b/gi, oppName)
                .replace(/\bdes\s+Bots\b/gi, `von ${oppName}`)
                .replace(/\bvom\s+Bot\b/gi, `von ${oppName}`)
                .replace(/\bbeim\s+Bot\b/gi, `bei ${oppName}`)
                .replace(/\bzum\s+Bot\b/gi, `zu ${oppName}`)
                .replace(/\b(?:den|dem|der)\s+Bot\b/gi, oppName)
                .replace(/\bBots\b/g, `${oppName}s`)
                .replace(/\bBot\b/g, oppName);
        }
    }

    function updateVerhoerTurnFeedback(oppName) {
        const handBox = document.getElementById('vh-player-hand-box');
        const handHint = document.getElementById('vh-hand-hint');
        const isDefenderPick = Boolean(vhNet.active && vhState.isRunning && vhState.phase === 'interrogation' && vhNet.viewMeta.intStep === 'defender_pick');
        const isMyDrawTurn = Boolean(vhState.isRunning && vhState.turn === 'player' && vhState.phase === 'draw');
        const isMyTurnNow = Boolean(vhState.isRunning && (vhState.turn === 'player' || isDefenderPick) && vhState.phase !== 'ended');

        if (handBox) {
            handBox.classList.toggle('vh-my-turn-glow', isMyTurnNow && vhState.phase !== 'interrogation');
            handBox.classList.toggle('vh-int-hand-focus', vhState.isRunning && vhState.phase === 'interrogation');
        }
        if (handHint && vhState.isRunning && vhState.phase === 'interrogation') {
            handHint.textContent = 'Deine Handkarten zum Vergleichen sichtbar';
        }

        if (!vhState.isRunning) {
            vhTurnAlert.wasMyTurn = false;
            vhTurnAlert.wasDefenderPick = false;
            const toast = document.getElementById('vh-turn-toast');
            if (toast) toast.classList.remove('is-visible');
            return;
        }

        if (isMyDrawTurn && !vhTurnAlert.wasMyTurn) {
            showVerhoerTurnPopup('Du bist dran!', 'Ziehe vom Nachziehstapel oder rufe M₁ zurück', 'turn');
        } else if (isDefenderPick && !vhTurnAlert.wasDefenderPick) {
            const demandLbl = vhNet.viewMeta.intDemand?.label || 'eine Eigenschaft';
            showVerhoerTurnPopup('Verhör · Du bist gefragt!', `${oppName} fordert ${demandLbl}`, 'interrogation');
        }

        vhTurnAlert.wasMyTurn = vhState.turn === 'player';
        vhTurnAlert.wasDefenderPick = isDefenderPick;
    }

    function compactVerhoerHandIfNeeded() {
        if (typeof vhState === 'undefined' || !Array.isArray(vhState.playerHand)) return;
        if (!vhState.playerHand.some(c => !c)) return;
        const idxMap = new Map();
        const compacted = [];
        vhState.playerHand.forEach((c, oldIdx) => {
            if (c) {
                idxMap.set(oldIdx, compacted.length);
                compacted.push(c);
            }
        });
        vhState.playerHand = compacted;
        if (vhState.selectedIdx !== null) {
            vhState.selectedIdx = idxMap.has(vhState.selectedIdx) ? idxMap.get(vhState.selectedIdx) : null;
        }
        if (Array.isArray(vhState.sktDraftIndices) && vhState.sktDraftIndices.length > 0) {
            vhState.sktDraftIndices = vhState.sktDraftIndices
                .map(oldIdx => (idxMap.has(oldIdx) ? idxMap.get(oldIdx) : -1))
                .filter(i => i !== -1);
        }
        if ('lastClearedSlot' in vhState) vhState.lastClearedSlot = null;
    }

    function applyVerhoerNeutralClusterBtnAndHandRow() {
        const handEl = document.getElementById('vh-player-hand');
        if (handEl) {
            handEl.classList.add('vh-hand-compact-row');
            handEl.classList.remove('grid', 'grid-cols-3', 'sm:grid-cols-6', 'gap-2');
        }
        const deckBtn = document.getElementById('vh-deck-btn');
        if (deckBtn && typeof vhState !== 'undefined') {
            deckBtn.disabled = !(vhState.isRunning && vhState.turn === 'player' && vhState.phase === 'draw');
        }
        const intPanel = document.getElementById('vh-interrogation-panel');
        if (intPanel && typeof vhState !== 'undefined') {
            intPanel.classList.toggle('hidden', !(vhState.isRunning && vhState.phase === 'interrogation'));
        }
        const tagClu = document.getElementById('vh-btn-cluster-tag');
        if (tagClu) {
            tagClu.textContent = '';
            tagClu.classList.add('hidden');
        }
        const btnClu = document.getElementById('vh-btn-cluster');
        if (btnClu) {
            const active = typeof vhState !== 'undefined' && Boolean(vhState.isRunning);
            btnClu.disabled = !active;
            btnClu.className = active
                ? 'vh-cluster-cta-btn px-5 py-2.5 rounded-full font-extrabold text-xs sm:text-sm tracking-wide transition inline-flex items-center gap-2 cursor-pointer'
                : 'vh-cluster-cta-btn is-idle px-5 py-2.5 rounded-full font-extrabold text-xs sm:text-sm tracking-wide transition inline-flex items-center gap-2 opacity-50 cursor-default';
        }
    }

    function postRenderVerhoerOnline() {
        applyVerhoerNeutralClusterBtnAndHandRow();
        document.querySelectorAll('#vh-player-hand .vh-card-under-review').forEach(el => {
            el.classList.remove('vh-card-under-review');
        });
        const oppLabelEl = document.getElementById('vh-opp-name-label') || document.querySelector('#game-view-verhoer .xl\\:col-span-6 .text-xs.font-bold.text-white');
        const oppIconWrap = document.getElementById('vh-opp-avatar-slot') || (oppLabelEl ? oppLabelEl.closest('.flex.items-center.gap-2\\.5')?.firstElementChild : null);
        const botBarName = document.getElementById('vh-bar-bot-name') || document.getElementById('vh-bar-bot-lbl')?.previousElementSibling;
        const botSktOwner = document.getElementById('vh-bot-skt-owner');
        const step3El = document.getElementById('vh-step-3');
        const lobbyDesc = document.getElementById('vh-lobby-desc');
        const xrayBtn = document.getElementById('vh-btn-xray');
        const xrayBody = document.getElementById('vh-xray-body');
        const botBarLbl = document.getElementById('vh-bar-bot-lbl');
        const botBar = document.getElementById('vh-bar-bot');

        if (oppIconWrap && !oppIconWrap.dataset.botSvg) oppIconWrap.dataset.botSvg = oppIconWrap.innerHTML;
        if (lobbyDesc && !lobbyDesc.dataset.botHtml) lobbyDesc.dataset.botHtml = lobbyDesc.innerHTML;

        if (!vhNet.active) {
            if (oppLabelEl) oppLabelEl.textContent = 'Taktik-Bot';
            if (oppIconWrap && oppIconWrap.dataset.botSvg) oppIconWrap.innerHTML = oppIconWrap.dataset.botSvg;
            if (botBarName) botBarName.textContent = 'Bot';
            if (botSktOwner) botSktOwner.textContent = 'Bot';
            if (step3El) step3El.textContent = '3. Verhör / Bot';
            if (lobbyDesc && lobbyDesc.dataset.botHtml) lobbyDesc.innerHTML = lobbyDesc.dataset.botHtml;
            if (xrayBtn) xrayBtn.classList.remove('hidden');
            renderVerhoerH2HUI('');
            updateVerhoerTurnFeedback('Taktik-Bot');
            return;
        }

        const oppName = vhNet.connected ? (vhNet.oppName || 'Online-Gegner') : 'Gegner';
        const oppDisplay = vhNet.connected ? oppName : 'Warte auf Gegner...';

        if (oppLabelEl) oppLabelEl.textContent = oppDisplay;
        if (oppIconWrap) {
            if (vhNet.connected) oppIconWrap.innerHTML = renderAvatarSafe(vhNet.oppProfile, 28);
            else if (oppIconWrap.dataset.botSvg) oppIconWrap.innerHTML = oppIconWrap.dataset.botSvg;
        }
        if (botBarName) botBarName.textContent = oppName;
        if (botSktOwner) botSktOwner.textContent = oppName;
        if (step3El) step3El.textContent = `3. Verhör / ${oppName.slice(0, 12)}`;
        if (lobbyDesc) {
            lobbyDesc.innerHTML = vhNet.connected
                ? `Online-Duell gegen <strong class="text-white">${escHtml(oppName)}</strong> im <strong>$\\mathbb{F}_5^3$ (125 Karten)</strong> — sammle als Erster ein vollständiges <strong>5er-Cluster</strong> aus Hand und SKTs.`
                : `Raum <strong class="text-cyan-300 mono">${escHtml(vhNet.roomCode)}</strong> ist offen — warte auf deinen Online-Gegner im <strong>$\\mathbb{F}_5^3$</strong>.`;
            if (typeof safeRenderMathJax === 'function') safeRenderMathJax();
        }
        if (xrayBtn) xrayBtn.classList.add('hidden');
        if (xrayBody) xrayBody.classList.add('hidden');

        if (botBarLbl) botBarLbl.textContent = `${vhState.aiTrios.length} SKT`;
        if (botBar) botBar.style.width = `${Math.min(100, vhState.aiTrios.length * 45)}%`;

        const bannerTxt = document.getElementById('vh-banner-text');
        if (bannerTxt) {
            if (!vhState.isRunning && vhState.phase === 'idle') {
                bannerTxt.textContent = vhNet.connected
                    ? (vhNet.role === 'host'
                        ? `Verbunden mit ${oppName} — klicke auf „Spielen“, um zu starten.`
                        : `Verbunden mit ${oppName} — warte auf den Spielstart...`)
                    : `Online-Raum ${vhNet.roomCode} offen — warte auf Gegner...`;
            } else if (vhState.isRunning) {
                if (vhState.phase === 'interrogation') {
                    if (vhNet.viewMeta.intStep === 'defender_pick') {
                        bannerTxt.textContent = `${oppName} fordert ${vhNet.viewMeta.intDemand?.label || 'eine Eigenschaft'} — wähle deine Karte!`;
                    } else if (vhNet.viewMeta.intStep === 'wait_decision') {
                        const cTxt = vhState.pendingCard ? ` (${vhState.pendingCard.join(',')})` : '';
                        bannerTxt.textContent = `${oppName} prüft deine Karte${cTxt} — Übernehmen oder Abwurf auf M₁?`;
                    } else if (vhNet.viewMeta.intStep === 'wait_no_match') {
                        bannerTxt.textContent = `Keine passende Karte bei dir — Zug wechselt gleich...`;
                    } else if (vhNet.viewMeta.intStep === 'wait_attacker') {
                        bannerTxt.textContent = `${oppName} führt gerade ein Verhör gegen dich aus...`;
                    } else if (vhNet.viewMeta.intStep === 'wait_defender') {
                        bannerTxt.textContent = `Warte darauf, welche passende Karte ${oppName} vorzeigt...`;
                    }
                } else if (vhState.turn === 'ai') {
                    bannerTxt.textContent = `${oppName} ist am Zug...`;
                }
            }
            replaceBotTextInTree(bannerTxt, oppName);
        }

        const intPanel = document.getElementById('vh-interrogation-panel');
        const intTitle = document.getElementById('vh-int-title');
        const intBadge = document.getElementById('vh-int-badge');
        const intBody = document.getElementById('vh-int-body');
        if (intPanel && intBody && vhState.phase === 'interrogation' && vhState.isRunning) {
            const step = vhNet.viewMeta.intStep;
            const isStrict = vhState.intType === 'strict';
            const modeLabel = isStrict ? 'Verschärftes Verhör' : 'Standard-Verhör';
            intPanel.classList.toggle('is-strict', isStrict);

            if (step === 'wait_attacker') {
                if (intTitle) intTitle.textContent = modeLabel;
                if (intBadge) intBadge.textContent = escHtml(oppName);
                intBody.innerHTML = `<div class="vh-int-wait"><span class="vh-int-dot animate-pulse"></span><span><strong class="text-white">${escHtml(oppName)}</strong> wählt eine Ausprägung…</span></div>`;
            } else if (step === 'wait_decision') {
                const c = vhState.pendingCard;
                if (intTitle) intTitle.textContent = modeLabel;
                if (intBadge) intBadge.textContent = `${oppName} entscheidet`;
                if (c) {
                    const [x, y, z] = c;
                    intBody.innerHTML = `
                        <div class="vh-int-decide">
                            <div class="vh-int-decide-meta">
                                <div class="vh-int-preview-card card-63-88">
                                    ${renderLargePlayingCardInner(c, true)}
                                </div>
                                <div class="min-w-0 space-y-0.5">
                                    <div class="text-xs sm:text-sm font-bold text-white truncate">${PALETTE_X[x].count}× ${PALETTE_Y[y].name} ${PALETTE_Z[z].name}</div>
                                    <div class="text-[11px] mono text-slate-400">(${x}, ${y}, ${z})</div>
                                    <p class="vh-int-lead pt-0.5"><strong>${escHtml(oppName)}</strong> entscheidet über Aufnahme oder Abwurf auf M₁…</p>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    intBody.innerHTML = `<div class="vh-int-wait"><span class="vh-int-dot animate-pulse"></span><span><strong class="text-white">${escHtml(oppName)}</strong> entscheidet über deine Karte…</span></div>`;
                }
                if (typeof vhNet.viewMeta.pendingIdx === 'number') {
                    const reviewedEl = document.getElementById(`vh-card-${vhNet.viewMeta.pendingIdx}`);
                    if (reviewedEl) reviewedEl.classList.add('vh-card-under-review');
                }
            } else if (step === 'wait_no_match') {
                if (intTitle) intTitle.textContent = modeLabel;
                if (intBadge) intBadge.textContent = 'Kein Treffer';
                intBody.innerHTML = `<div class="vh-int-wait"><span>Keine passende Karte für <strong class="text-white">${escHtml(vhNet.viewMeta.intDemand?.label || '')}</strong> — Zug wechselt…</span></div>`;
            } else if (step === 'wait_defender') {
                if (intTitle) intTitle.textContent = 'Standard-Verhör';
                if (intBadge) intBadge.textContent = `Warte auf ${oppName}`;
                intBody.innerHTML = `<div class="vh-int-wait"><span class="vh-int-dot animate-pulse"></span><span><strong class="text-white">${escHtml(oppName)}</strong> wählt eine passende Karte zum Vorzeigen…</span></div>`;
            } else if (step === 'defender_pick') {
                if (intTitle) intTitle.textContent = 'Standard-Verhör';
                if (intBadge) intBadge.textContent = 'Karte zeigen';
                const choices = (vhNet.viewMeta.intMatchIndices || []).map(slotIdx => {
                    const card = vhState.playerHand[slotIdx];
                    if (!card) return '';
                    return `
                        <button type="button" onclick="window.BlinkMultiplayer.vhDefenderPick(${slotIdx})" class="vh-int-card-choice card-63-88">
                            ${renderLargePlayingCardInner(card, true)}
                        </button>
                    `;
                }).join('');
                intBody.innerHTML = `
                    <p class="vh-int-lead"><strong>${escHtml(oppName)}</strong> fordert <strong>${escHtml(vhNet.viewMeta.intDemand?.label || '')}</strong> — wähle eine Karte:</p>
                    <div class="vh-int-card-row">${choices}</div>
                `;
            } else if (step === 'wait_strict_pick') {
                const matchList = vhNet.viewMeta.intMatchIndices || [];
                if (intTitle) intTitle.textContent = 'Verschärftes Verhör';
                if (intBadge) intBadge.textContent = `${matchList.length} gezeigt`;
                intBody.innerHTML = `<div class="vh-int-wait"><span class="vh-int-dot animate-pulse"></span><span><strong class="text-white">${escHtml(oppName)}</strong> sieht deine ${matchList.length} passenden Karten und wählt aus…</span></div>`;
                matchList.forEach(slotIdx => {
                    const el = document.getElementById(`vh-card-${slotIdx}`);
                    if (el) el.classList.add('vh-card-under-review');
                });
            }
            replaceBotTextInTree(intPanel, oppName);
        }

        replaceBotTextInTree(document.getElementById('vh-bot-trios'), oppName);

        if (vhState.phase === 'ended' && vhState.winInfo) {
            const et = document.getElementById('vh-end-title');
            const ed = document.getElementById('vh-end-desc');
            if (et) et.textContent = vhState.winInfo.didWin ? 'Perfektes 5er-Cluster!' : `${vhState.winInfo.winnerName || oppName} gewinnt!`;
            if (ed) ed.textContent = vhState.winInfo.didWin
                ? `Du hast ${oppName} im Online-Verhör besiegt.`
                : `${oppName} hat zuerst ein vollständiges 5er-Cluster gebildet.`;
        }

        renderVerhoerH2HUI(oppName);
        updateVerhoerTurnFeedback(oppName);
    }

    function renderVerhoerH2HUI(oppName) {
        const pill = document.getElementById('vh-h2h-pill');
        const endBanner = document.getElementById('vh-end-h2h-banner');
        const show = Boolean(vhNet.active && vhNet.connected);

        if (pill) pill.classList.toggle('hidden', !show);
        if (endBanner) endBanner.classList.toggle('hidden', !(show && vhState.phase === 'ended'));
        if (!show) return;

        const sc = vhNet.seriesScore || { host: 0, guest: 0 };
        const isGuest = vhNet.role === 'guest';
        const myWins = isGuest ? (sc.guest || 0) : (sc.host || 0);
        const oppWins = isGuest ? (sc.host || 0) : (sc.guest || 0);

        if (pill) {
            pill.innerHTML = `
                <span class="text-[9.5px] uppercase tracking-wider text-slate-400 mono">H2H</span>
                <span class="text-xs sm:text-sm font-extrabold mono text-cyan-300">${myWins}</span>
                <span class="text-[11px] text-slate-500 font-bold">:</span>
                <span class="text-xs sm:text-sm font-extrabold mono text-rose-400">${oppWins}</span>
                <button type="button" onclick="window.BlinkMultiplayer.vhResetH2H()" title="Serie auf 0 : 0 zurücksetzen"
                    class="ml-0.5 w-4 h-4 rounded-full bg-white/[0.06] hover:bg-white/[0.18] text-[9.5px] text-slate-300 flex items-center justify-center transition">↺</button>
            `;
        }

        if (endBanner && vhState.phase === 'ended' && typeof buildH2HBannerHTML === 'function') {
            endBanner.innerHTML = buildH2HBannerHTML(getMyNameSafe(), oppName || 'Gegner', myWins, oppWins, 'window.BlinkMultiplayer.vhResetH2H()');
        }
    }

    function resetVerhoerSeriesScore() {
        vhNet.seriesScore = { host: 0, guest: 0 };
        if (vhNet.connected) vhNetSend({ type: 'VH_H2H_RESET' });
        if (typeof playSound === 'function') playSound('tick');
        if (typeof renderVerhoerStandaloneUI === 'function') renderVerhoerStandaloneUI();
        if (isUnifiedModalOpen()) renderUnifiedModal();
        if (typeof showSonnerToast === 'function') showSonnerToast('Verhör Head-to-Head auf 0 : 0 zurückgesetzt.', 'neutral');
    }

    // ------------------------------------------------------------------------
    // 4. GRUPPEN-MODUS (DAILY CHALLENGE & BLINK-SUDOKU · 2–30+ SPIELER)
    // ------------------------------------------------------------------------
    const crState = {
        active: false,
        mode: 'daily', // 'daily' | 'sudoku'
        role: null,    // 'host' | 'guest'
        roomCode: '',
        peer: null,
        hostConn: null,
        guestConns: new Map(),
        players: new Map(),
        leaderboard: [],
        phase: 'idle', // 'idle' | 'lobby' | 'playing' | 'results'
        roundNum: 0,
        hostPlays: true,
        timeLimitSec: 180,
        dailyVariant: 'random',
        sudokuEmptyCount: 10,
        sudokuDiffName: 'Leicht',
        roundStartAt: 0,
        timerHandle: null,
        broadcastTimer: null,
        myHintsUsed: 0,
        myFinished: false,
        myFinishSec: null,
        lastSentSig: '',
        resultsReason: ''
    };

    function computeKahootScore(p, mode) {
        if (mode === 'daily') {
            let pts = (p.progress || 0) * 200;
            if (p.finished) {
                pts += 500;
                const sec = p.finishSec || 999;
                pts += Math.max(0, Math.round(600 * Math.exp(-sec / 120)));
            }
            pts -= (p.mistakes || 0) * 35;
            pts -= (p.hints || 0) * 80;
            return Math.max(0, Math.round(pts));
        } else {
            let pts = (p.progress || 0) * 80 + (p.linesDone || 0) * 50;
            if (p.finished) {
                pts += 600;
                const sec = p.finishSec || 999;
                pts += Math.max(0, Math.round(700 * Math.exp(-sec / 180)));
            }
            pts -= (p.hints || 0) * 100;
            return Math.max(0, Math.round(pts));
        }
    }

    function buildSortedLeaderboard() {
        const arr = Array.from(crState.players.values()).map(p => ({
            ...p,
            score: computeKahootScore(p, crState.mode)
        }));
        arr.sort((a, b) => {
            if (a.finished !== b.finished) return a.finished ? -1 : 1;
            if (b.score !== a.score) return b.score - a.score;
            if (b.progress !== a.progress) return b.progress - a.progress;
            return (a.finishSec || 99999) - (b.finishSec || 99999);
        });
        return arr;
    }

    function crHostBroadcast(payload) {
        crState.guestConns.forEach(conn => {
            if (conn && conn.open) {
                try { conn.send(payload); } catch (e) { }
            }
        });
    }

    function crHostScheduleLeaderboardBroadcast(immediate = false) {
        if (crState.role !== 'host') return;
        const doSend = () => {
            crState.broadcastTimer = null;
            crState.leaderboard = buildSortedLeaderboard();
            const remainingSec = crGetRemainingSeconds();
            crHostBroadcast({
                type: 'CR_LEADERBOARD',
                phase: crState.phase,
                leaderboard: crState.leaderboard,
                remainingSec
            });
            updateClassroomLiveBars();
            updateGlobalOnlineButton();
            if (isUnifiedModalOpen()) renderUnifiedModal();

            if (crState.phase === 'playing' && crState.leaderboard.length > 0) {
                const activePlayers = crState.leaderboard.filter(p => p.online);
                if (activePlayers.length > 0 && activePlayers.every(p => p.finished)) {
                    setTimeout(() => {
                        if (crState.phase === 'playing') crHostEndRound('Alle Teilnehmenden sind fertig!');
                    }, 900);
                }
            }
        };

        if (immediate) {
            if (crState.broadcastTimer) clearTimeout(crState.broadcastTimer);
            doSend();
        } else if (!crState.broadcastTimer) {
            crState.broadcastTimer = setTimeout(doSend, 280);
        }
    }

    function crGetRemainingSeconds() {
        if (crState.phase !== 'playing' || !crState.timeLimitSec || !crState.roundStartAt) return null;
        const elapsed = (performance.now() - crState.roundStartAt) / 1000;
        return Math.max(0, Math.ceil(crState.timeLimitSec - elapsed));
    }

    function crStartClockTicker() {
        if (crState.timerHandle) clearInterval(crState.timerHandle);
        crState.timerHandle = setInterval(() => {
            if (crState.phase !== 'playing') return;
            updateClassroomLiveBars();
            if (crState.role === 'host' && crState.timeLimitSec > 0) {
                const rem = crGetRemainingSeconds();
                if (rem !== null && rem <= 0) {
                    crHostEndRound('Die Zeit ist abgelaufen!');
                }
            }
        }, 500);
    }

    function crLeaveRoom(silent = false) {
        if (crState.timerHandle) { clearInterval(crState.timerHandle); crState.timerHandle = null; }
        if (crState.broadcastTimer) { clearTimeout(crState.broadcastTimer); crState.broadcastTimer = null; }
        if (crState.role === 'host') {
            crHostBroadcast({ type: 'CR_CLOSED' });
            crState.guestConns.forEach(c => { try { c.close(); } catch (e) { } });
        } else if (crState.hostConn) {
            try { crState.hostConn.close(); } catch (e) { }
        }
        if (crState.peer) { try { crState.peer.destroy(); } catch (e) { } }

        crState.active = false;
        crState.role = null;
        crState.roomCode = '';
        crState.peer = null;
        crState.hostConn = null;
        crState.guestConns.clear();
        crState.players.clear();
        crState.leaderboard = [];
        crState.phase = 'idle';
        crState.roundStartAt = 0;
        crState.myHintsUsed = 0;
        crState.myFinished = false;
        crState.myFinishSec = null;
        crState.lastSentSig = '';

        updateClassroomLiveBars();
        updateGlobalOnlineButton();
        if (isUnifiedModalOpen()) renderUnifiedModal();
        if (!silent && typeof showSonnerToast === 'function') {
            showSonnerToast('Raum verlassen.', 'neutral');
        }
    }

    function crCreateRoom(mode, stayInHub = false) {
        if (typeof Peer === 'undefined') {
            showSonnerToast('Online-Transport nicht verfügbar (Internetverbindung nötig).', 'warn');
            return;
        }
        const targetMode = mode === 'sudoku' ? 'sudoku' : 'daily';
        closeAllOtherSessionsExcept(targetMode);
        crLeaveRoom(true);
        if (!stayInHub && typeof setGameSubTab === 'function' && typeof labState !== 'undefined' && labState.activeGameTab !== targetMode) {
            setGameSubTab(targetMode);
        }

        const code = genRoomCode(4);
        crState.active = true;
        crState.mode = targetMode;
        crState.role = 'host';
        crState.roomCode = code;
        crState.phase = 'lobby';
        crState.roundNum = 0;
        crState.players.clear();

        if (crState.hostPlays) {
            crState.players.set('__host__', {
                id: '__host__',
                name: getMyNameSafe(),
                profile: getMyProfileSafe(),
                progress: 0, total: 0, linesDone: 0,
                mistakes: 0, hints: 0,
                finished: false, finishSec: null,
                online: true, isHost: true
            });
        }
        crState.leaderboard = buildSortedLeaderboard();

        const peer = new Peer(CR_PREFIX + code);
        crState.peer = peer;

        peer.on('open', () => {
            showSonnerToast(`Raum ${code} geöffnet! QR-Code jetzt scanbar.`, 'success');
            updateClassroomLiveBars();
            updateGlobalOnlineButton();
            renderUnifiedModal();
        });

        peer.on('connection', (conn) => {
            const pid = conn.peer || ('g-' + Math.random().toString(36).slice(2, 8));
            crState.guestConns.set(pid, conn);

            conn.on('data', (msg) => crHostHandleGuestMsg(pid, conn, msg));
            conn.on('close', () => {
                crState.guestConns.delete(pid);
                const p = crState.players.get(pid);
                if (p) {
                    if (crState.phase === 'lobby') crState.players.delete(pid);
                    else p.online = false;
                    crHostScheduleLeaderboardBroadcast(false);
                }
            });
        });

        peer.on('error', (err) => {
            showSonnerToast(`Online-Fehler: ${err.type || 'Verbindung fehlgeschlagen'}`, 'warn');
            crLeaveRoom(true);
        });

        updateClassroomLiveBars();
        updateGlobalOnlineButton();
        renderUnifiedModal();
    }

    function crJoinRoom(mode, forcedCode = null) {
        if (typeof Peer === 'undefined') {
            showSonnerToast('Online-Transport nicht verfügbar (Internetverbindung nötig).', 'warn');
            return;
        }
        const inp = document.getElementById('mp-hub-join-input');
        const code = (forcedCode || (inp ? inp.value : '')).trim().toUpperCase();
        if (code.length < 4) {
            showSonnerToast('Bitte gib den 4-stelligen Raum-Code ein.', 'warn');
            return;
        }
        const targetMode = mode === 'sudoku' ? 'sudoku' : 'daily';
        closeAllOtherSessionsExcept(targetMode);
        crLeaveRoom(true);

        crState.active = true;
        crState.mode = targetMode;
        crState.role = 'guest';
        crState.roomCode = code;
        crState.phase = 'lobby';
        updateGlobalOnlineButton();
        renderUnifiedModal();

        const peer = new Peer();
        crState.peer = peer;

        const timeout = setTimeout(() => {
            if (crState.active && crState.role === 'guest' && (!crState.hostConn || !crState.hostConn.open)) {
                showSonnerToast(`Raum ${code} nicht erreichbar.`, 'warn');
                crLeaveRoom(true);
            }
        }, 10000);

        peer.on('open', () => {
            const conn = peer.connect(CR_PREFIX + code, { reliable: true });
            crState.hostConn = conn;
            conn.on('open', () => {
                clearTimeout(timeout);
                if (typeof playSound === 'function') playSound('win');
                conn.send({ type: 'CR_JOIN', name: getMyNameSafe(), profile: getMyProfileSafe() });
                showSonnerToast(`Raum ${code} beigetreten!`, 'success');
                updateClassroomLiveBars();
                updateGlobalOnlineButton();
                renderUnifiedModal();
            });
            conn.on('data', (msg) => crGuestHandleHostMsg(msg));
            conn.on('close', () => {
                showSonnerToast('Raum wurde vom Host beendet.', 'warn');
                crLeaveRoom(true);
            });
        });

        peer.on('error', () => {
            clearTimeout(timeout);
            showSonnerToast(`Raum ${code} nicht gefunden.`, 'warn');
            crLeaveRoom(true);
        });
    }

    function crHostHandleGuestMsg(pid, conn, msg) {
        if (!msg || !msg.type) return;

        if (msg.type === 'CR_JOIN') {
            const cleanName = (typeof msg.name === 'string' && msg.name.trim()) ? msg.name.trim().slice(0, 18) : `Gast ${crState.players.size + 1}`;
            const existing = crState.players.get(pid);
            crState.players.set(pid, {
                id: pid,
                name: cleanName,
                profile: msg.profile || null,
                progress: existing ? existing.progress : 0,
                total: existing ? existing.total : (crState.lastPuzzlePayload?.total || 0),
                linesDone: existing ? existing.linesDone : 0,
                mistakes: existing ? existing.mistakes : 0,
                hints: existing ? existing.hints : 0,
                finished: existing ? existing.finished : false,
                finishSec: existing ? existing.finishSec : null,
                online: true,
                isHost: false
            });
            conn.send({
                type: 'CR_WELCOME',
                myId: pid,
                mode: crState.mode,
                roomCode: crState.roomCode,
                phase: crState.phase,
                timeLimitSec: crState.timeLimitSec,
                roundNum: crState.roundNum,
                leaderboard: buildSortedLeaderboard(),
                activePuzzle: crState.phase === 'playing' ? crState.lastPuzzlePayload : null,
                remainingSec: crGetRemainingSeconds()
            });
            crHostScheduleLeaderboardBroadcast(true);
            return;
        }

        if (msg.type === 'CR_PROFILE_UPDATE') {
            const p = crState.players.get(pid);
            if (p) {
                if (typeof msg.name === 'string' && msg.name.trim()) p.name = msg.name.trim().slice(0, 18);
                if (msg.profile) p.profile = msg.profile;
                crHostScheduleLeaderboardBroadcast(false);
            }
            return;
        }

        if (msg.type === 'CR_PROGRESS' && crState.phase === 'playing') {
            const p = crState.players.get(pid);
            if (!p) return;
            p.progress = Math.max(0, msg.progress || 0);
            if (typeof msg.total === 'number') p.total = msg.total;
            p.linesDone = Math.max(0, msg.linesDone || 0);
            p.mistakes = Math.max(0, msg.mistakes || 0);
            p.hints = Math.max(0, msg.hints || 0);
            if (msg.finished && !p.finished) {
                p.finished = true;
                p.finishSec = Math.max(0.5, msg.finishSec || ((performance.now() - crState.roundStartAt) / 1000));
            }
            crHostScheduleLeaderboardBroadcast(Boolean(msg.finished));
        }
    }

    function crGuestHandleHostMsg(msg) {
        if (!msg || !msg.type) return;

        if (msg.type === 'CR_WELCOME') {
            crState.myId = msg.myId;
            crState.mode = msg.mode;
            crState.phase = msg.phase;
            crState.timeLimitSec = msg.timeLimitSec || 0;
            crState.roundNum = msg.roundNum || 0;
            crState.leaderboard = msg.leaderboard || [];
            if (msg.phase === 'playing' && msg.activePuzzle) {
                if (typeof setGameSubTab === 'function') setGameSubTab(crState.mode);
                crApplyPuzzlePayload(msg.activePuzzle, false);
                if (msg.remainingSec) {
                    crState.roundStartAt = performance.now() - ((crState.timeLimitSec - msg.remainingSec) * 1000);
                }
                crStartClockTicker();
            }
            updateClassroomLiveBars();
            updateGlobalOnlineButton();
            if (isUnifiedModalOpen()) renderUnifiedModal();
            return;
        }

        if (msg.type === 'CR_START') {
            crState.mode = msg.mode;
            crState.phase = 'playing';
            crState.roundNum = msg.roundNum || 1;
            crState.timeLimitSec = msg.timeLimitSec || 0;
            crState.myHintsUsed = 0;
            crState.myFinished = false;
            crState.myFinishSec = null;
            crState.lastSentSig = '';
            if (typeof setGameSubTab === 'function' && typeof labState !== 'undefined' && labState.activeGameTab !== crState.mode) {
                setGameSubTab(crState.mode);
            }
            crApplyPuzzlePayload(msg.puzzle, true);
            return;
        }

        if (msg.type === 'CR_LEADERBOARD') {
            crState.leaderboard = msg.leaderboard || [];
            if (msg.phase) crState.phase = msg.phase;
            updateClassroomLiveBars();
            updateGlobalOnlineButton();
            if (isUnifiedModalOpen()) renderUnifiedModal();
            return;
        }

        if (msg.type === 'CR_END') {
            crState.phase = 'results';
            crState.leaderboard = msg.leaderboard || crState.leaderboard;
            if (crState.timerHandle) { clearInterval(crState.timerHandle); crState.timerHandle = null; }
            if (typeof stopGameMusic === 'function') stopGameMusic();
            crOpenResultsPodium(msg.reason || 'Runde beendet!');
            return;
        }

        if (msg.type === 'CR_CLOSED') {
            showSonnerToast('Der Raum wurde vom Host geschlossen.', 'warn');
            crLeaveRoom(true);
        }
    }

    function crHostToggleHostPlays(val) {
        if (crState.role !== 'host') return;
        crState.hostPlays = Boolean(val);
        if (crState.hostPlays) {
            crState.players.set('__host__', {
                id: '__host__',
                name: getMyNameSafe(),
                profile: getMyProfileSafe(),
                progress: 0, total: 0, linesDone: 0,
                mistakes: 0, hints: 0,
                finished: false, finishSec: null,
                online: true, isHost: true
            });
        } else {
            crState.players.delete('__host__');
        }
        crHostScheduleLeaderboardBroadcast(true);
    }

    function crHostSetTimeLimit(sec) {
        crState.timeLimitSec = parseInt(sec, 10) || 0;
        if (typeof playSound === 'function') playSound('tick');
        renderUnifiedModal();
    }

    function crHostSetSudokuDiff(emptyCount, diffName) {
        crState.sudokuEmptyCount = emptyCount;
        crState.sudokuDiffName = diffName;
        if (typeof playSound === 'function') playSound('tick');
        renderUnifiedModal();
    }

    function crHostSetDailyVariant(variant) {
        crState.dailyVariant = variant;
        if (typeof playSound === 'function') playSound('tick');
        renderUnifiedModal();
    }

    function crHostStartRound() {
        if (!crState.active || crState.role !== 'host') return;
        if (crState.players.size === 0) {
            showSonnerToast('Mindestens 1 Teilnehmender (oder „Selbst mitspielen“) wird benötigt.', 'warn');
            return;
        }

        crState.roundNum++;
        crState.phase = 'playing';
        crState.myHintsUsed = 0;
        crState.myFinished = false;
        crState.myFinishSec = null;
        crState.lastSentSig = '';

        let puzzlePayload = null;
        if (crState.mode === 'daily') {
            const seed = crState.dailyVariant === 'today'
                ? parseInt(getTodayDateKey().replace(/-/g, ''), 10) * 2654435761
                : Math.floor(Math.random() * 1000000000);
            const rng = createSeededRNG(seed);
            const { board, sols } = generateDailyBoard(rng);
            puzzlePayload = {
                mode: 'daily',
                cards: board,
                total: sols.length,
                label: `Live-Raum #${crState.roomCode} · Runde ${crState.roundNum}`
            };
        } else {
            const solution = generateMagicSquare25();
            const fixed = new Array(25).fill(true);
            const indices = Array.from({ length: 25 }, (_, i) => i);
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            for (let k = 0; k < crState.sudokuEmptyCount; k++) {
                fixed[indices[k]] = false;
            }
            puzzlePayload = {
                mode: 'sudoku',
                solution,
                fixed,
                emptyCount: crState.sudokuEmptyCount,
                diffName: crState.sudokuDiffName,
                total: crState.sudokuEmptyCount,
                label: `Live-Raum #${crState.roomCode} · Runde ${crState.roundNum}`
            };
        }

        crState.lastPuzzlePayload = puzzlePayload;
        crState.players.forEach(p => {
            p.progress = 0;
            p.total = puzzlePayload.total;
            p.linesDone = 0;
            p.mistakes = 0;
            p.hints = 0;
            p.finished = false;
            p.finishSec = null;
        });

        crHostBroadcast({
            type: 'CR_START',
            mode: crState.mode,
            roundNum: crState.roundNum,
            timeLimitSec: crState.timeLimitSec,
            puzzle: puzzlePayload
        });

        if (crState.hostPlays) {
            crApplyPuzzlePayload(puzzlePayload, true);
        } else {
            crRunCountdown(() => {
                crState.roundStartAt = performance.now();
                crStartClockTicker();
                crHostScheduleLeaderboardBroadcast(true);
            });
        }
    }

    function crHostEndRound(reason = 'Runde ausgewertet!') {
        if (!crState.active || crState.role !== 'host') return;
        crState.phase = 'results';
        if (crState.timerHandle) { clearInterval(crState.timerHandle); crState.timerHandle = null; }
        crState.leaderboard = buildSortedLeaderboard();
        crHostBroadcast({
            type: 'CR_END',
            leaderboard: crState.leaderboard,
            reason
        });
        if (typeof stopGameMusic === 'function') stopGameMusic();
        crOpenResultsPodium(reason);
    }

    function crRunCountdown(onGo) {
        const ov = document.getElementById('cr-countdown-overlay');
        const dig = document.getElementById('cr-countdown-digit');
        const lbl = document.getElementById('cr-countdown-label');
        if (!ov || !dig) {
            if (typeof onGo === 'function') onGo();
            return;
        }
        window.__CR_LOCK_CLOSE = true;
        if (lbl) lbl.textContent = crState.mode === 'daily' ? `Daily Challenge · Runde ${crState.roundNum}` : `Blink-Sudoku · Runde ${crState.roundNum}`;
        ov.classList.remove('hidden');

        const steps = ['3', '2', '1', 'LOS!'];
        let i = 0;
        const showStep = () => {
            dig.classList.remove('cr-countdown-num');
            void dig.offsetWidth;
            dig.textContent = steps[i];
            dig.classList.add('cr-countdown-num');
            if (typeof playSound === 'function') playSound(i === 3 ? 'flip' : 'tick');
            i++;
            if (i < steps.length) {
                setTimeout(showStep, 760);
            } else {
                setTimeout(() => {
                    ov.classList.add('hidden');
                    window.__CR_LOCK_CLOSE = false;
                    if (typeof onGo === 'function') onGo();
                }, 520);
            }
        };
        showStep();
    }

    function crApplyPuzzlePayload(puzzle, withCountdown = true) {
        closeUnifiedOnlineModal();

        if (puzzle.mode === 'daily' && typeof dailyState !== 'undefined') {
            dailyState.isPractice = true;
            dailyState.isAnimating = false;
            dailyState._rubberDone = false;
            dailyState.cards = puzzle.cards.map(c => [...c]);
            dailyState.solutions = getAllClustersInBoard(dailyState.cards);
            dailyState.foundKeys = new Set();
            dailyState.selectedIndices = [];
            dailyState.mistakes = 0;
            dailyState.hintIndices = [];

            const lbl = document.getElementById('daily-date-label');
            if (lbl) lbl.textContent = puzzle.label || 'Live · Daily Challenge';
            const fb = document.getElementById('daily-feedback-text');
            if (fb) fb.textContent = `Live-Runde aktiv! Finde alle ${dailyState.solutions.length} Cluster so schnell wie möglich.`;
            renderDailyUI();
        } else if (puzzle.mode === 'sudoku' && typeof sudokuState !== 'undefined') {
            sudokuState.emptyCount = puzzle.emptyCount;
            sudokuState.diffName = puzzle.diffName || 'Live';
            sudokuState.solved = false;
            sudokuState.solution = puzzle.solution.map(c => [...c]);
            sudokuState.fixed = [...puzzle.fixed];
            sudokuState.board = sudokuState.solution.map((c, idx) => sudokuState.fixed[idx] ? [...c] : null);
            sudokuState.notes = Array.from({ length: 25 }, () => createEmptySudokuNote());
            sudokuState.inputMode = 'card';
            sudokuState.selectedCell = sudokuState.fixed.findIndex(f => !f);
            renderSudokuUI();
        }

        const startPlaying = () => {
            crState.roundStartAt = performance.now();
            crStartClockTicker();
            if (typeof syncActiveGameModeMusic === 'function') syncActiveGameModeMusic();
            updateClassroomLiveBars();
            crReportMyProgress(true);
        };

        if (withCountdown) crRunCountdown(startPlaying);
        else startPlaying();
    }

    function crReportMyProgress(force = false) {
        if (!crState.active || crState.phase !== 'playing') return;
        if (crState.role === 'host' && !crState.hostPlays) return;

        let progress = 0, total = 0, linesDone = 0, mistakes = 0, finished = false;
        if (crState.mode === 'daily' && typeof dailyState !== 'undefined') {
            progress = dailyState.foundKeys.size;
            total = dailyState.solutions.length;
            mistakes = dailyState.mistakes || 0;
            finished = total > 0 && progress >= total;
        } else if (crState.mode === 'sudoku' && typeof sudokuState !== 'undefined') {
            const evalRes = evaluateSudokuLines();
            linesDone = evalRes.validRows + evalRes.validCols + evalRes.validDiags;
            total = sudokuState.emptyCount || 10;
            finished = Boolean(sudokuState.solved || (evalRes.validRows === 5 && evalRes.validCols === 5 && evalRes.validDiags === 2 && !evalRes.hasDuplicate));
            if (finished) {
                progress = total;
            } else {
                let filledOk = 0;
                sudokuState.board.forEach((c, idx) => {
                    if (!sudokuState.fixed[idx] && c && !evalRes.errorCells.has(idx)) filledOk++;
                });
                progress = filledOk;
            }
        }

        if (finished && !crState.myFinished) {
            crState.myFinished = true;
            crState.myFinishSec = Math.max(0.5, (performance.now() - crState.roundStartAt) / 1000);
        }

        const sig = `${progress}|${total}|${linesDone}|${mistakes}|${crState.myHintsUsed}|${crState.myFinished}`;
        if (!force && sig === crState.lastSentSig) return;
        crState.lastSentSig = sig;

        if (crState.role === 'host') {
            const me = crState.players.get('__host__');
            if (me) {
                me.progress = progress;
                me.total = total;
                me.linesDone = linesDone;
                me.mistakes = mistakes;
                me.hints = crState.myHintsUsed;
                if (crState.myFinished && !me.finished) {
                    me.finished = true;
                    me.finishSec = crState.myFinishSec;
                }
                crHostScheduleLeaderboardBroadcast(crState.myFinished);
            }
        } else if (crState.hostConn && crState.hostConn.open) {
            crState.hostConn.send({
                type: 'CR_PROGRESS',
                progress, total, linesDone, mistakes,
                hints: crState.myHintsUsed,
                finished: crState.myFinished,
                finishSec: crState.myFinishSec
            });
        }
    }

    function crOpenResultsPodium(reasonText = '') {
        crState.resultsReason = reasonText;
        updateClassroomLiveBars();
        updateGlobalOnlineButton();
        openUnifiedOnlineModal(crState.mode);
        if (typeof playSound === 'function') playSound('win');
        if (window.BlinkHaptics) {
            setTimeout(() => window.BlinkHaptics.burst(document.getElementById('mp-unified-modal'), 'amber', 32), 180);
        }
    }

    function updateClassroomLiveBars() {
        ['daily', 'sudoku'].forEach(m => {
            const bar = document.getElementById(`cr-${m}-live-bar`);
            const isActiveHere = crState.active && crState.mode === m;
            if (!bar) return;
            bar.classList.toggle('hidden', !isActiveHere);
            if (!isActiveHere) return;

            const myId = crState.role === 'host' ? '__host__' : crState.myId;
            const myRankIdx = crState.leaderboard.findIndex(p => p.id === myId);
            const myRankTxt = myRankIdx >= 0 ? `#${myRankIdx + 1} / ${crState.leaderboard.length}` : `${crState.leaderboard.length} Teiln.`;
            const finishedCnt = crState.leaderboard.filter(p => p.finished).length;
            const remSec = crGetRemainingSeconds();
            const timerTxt = crState.phase === 'playing'
                ? (remSec !== null ? `⏱ ${Math.floor(remSec / 60)}:${String(remSec % 60).padStart(2, '0')}` : `⏱ ${fmtSecondsMMSS((performance.now() - crState.roundStartAt) / 1000)}`)
                : (crState.phase === 'results' ? 'Ausgewertet' : 'Warte-Lobby');

            bar.innerHTML = `
                <div class="flex flex-wrap items-center justify-between gap-2.5">
                    <div class="flex flex-wrap items-center gap-2 text-xs mono">
                        <span class="w-2 h-2 rounded-full ${crState.phase === 'playing' ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}"></span>
                        <span class="font-extrabold text-white">Raum ${escHtml(crState.roomCode)}</span>
                        <span class="opacity-35">·</span>
                        <span class="text-cyan-300 font-bold">${myRankTxt}</span>
                        <span class="opacity-35">·</span>
                        <span class="text-slate-300">${finishedCnt}/${crState.leaderboard.length} fertig</span>
                        <span class="opacity-35">·</span>
                        <span class="font-bold ${remSec !== null && remSec <= 15 ? 'text-rose-400' : 'text-amber-300'}">${timerTxt}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button type="button" onclick="window.BlinkMultiplayer.openHub('${m}')" class="px-3 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-[11px] font-bold text-white transition">
                            ${crState.phase === 'results' ? 'Podium' : 'Live-Ranking'}
                        </button>
                        ${crState.role === 'host' && crState.phase === 'playing' ? `
                            <button type="button" onclick="window.BlinkMultiplayer.crEndRound()" class="px-3 py-1 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-[11px] transition">Auswerten</button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
    }

    function enhanceClassroomHooks() {
        const dailyGrid = document.getElementById('daily-cards-grid');
        if (dailyGrid && !document.getElementById('cr-daily-live-bar')) {
            const bar = document.createElement('div');
            bar.id = 'cr-daily-live-bar';
            bar.className = 'hidden cr-live-bar';
            dailyGrid.parentElement.insertBefore(bar, dailyGrid);
        }

        const sdkGrid = document.getElementById('sudoku-grid');
        if (sdkGrid && !document.getElementById('cr-sudoku-live-bar')) {
            const bar = document.createElement('div');
            bar.id = 'cr-sudoku-live-bar';
            bar.className = 'hidden cr-live-bar';
            sdkGrid.parentElement.insertBefore(bar, sdkGrid);
        }

        if (typeof window.evaluateDailySelection === 'function' && !window.evaluateDailySelection.__crWrapped) {
            const origEval = window.evaluateDailySelection;
            const wrapped = function () {
                const res = origEval.apply(this, arguments);
                if (crState.active && crState.mode === 'daily' && crState.phase === 'playing') {
                    setTimeout(() => crReportMyProgress(false), 40);
                }
                return res;
            };
            wrapped.__crWrapped = true;
            window.evaluateDailySelection = wrapped;
        }

        if (typeof window.giveDailyHint === 'function' && !window.giveDailyHint.__crWrapped) {
            const origHint = window.giveDailyHint;
            const wrapped = function () {
                if (crState.active && crState.mode === 'daily' && crState.phase === 'playing') {
                    crState.myHintsUsed++;
                    setTimeout(() => crReportMyProgress(false), 40);
                }
                return origHint.apply(this, arguments);
            };
            wrapped.__crWrapped = true;
            window.giveDailyHint = wrapped;
        }

        if (typeof window.renderSudokuUI === 'function' && !window.renderSudokuUI.__crWrapped) {
            const origRender = window.renderSudokuUI;
            const wrapped = function () {
                const res = origRender.apply(this, arguments);
                if (crState.active && crState.mode === 'sudoku' && crState.phase === 'playing') {
                    crReportMyProgress(false);
                }
                return res;
            };
            wrapped.__crWrapped = true;
            window.renderSudokuUI = wrapped;
        }

        if (typeof window.giveSudokuHint === 'function' && !window.giveSudokuHint.__crWrapped) {
            const origHint = window.giveSudokuHint;
            const wrapped = function () {
                if (crState.active && crState.mode === 'sudoku' && crState.phase === 'playing') {
                    crState.myHintsUsed++;
                }
                return origHint.apply(this, arguments);
            };
            wrapped.__crWrapped = true;
            window.giveSudokuHint = wrapped;
        }
    }

    // ------------------------------------------------------------------------
    // 5. EINHEITLICHER MODAL-RENDERER (SETUP · LOBBY · LIVE-RANKING · PODIUM)
    // ------------------------------------------------------------------------
    function renderLeaderboardRowsHTML(list, highlightMyId) {
        if (!list || list.length === 0) {
            return `<div class="text-xs text-slate-400 text-center py-6 rounded-2xl border border-dashed border-white/10">Noch keine Teilnehmenden im Raum.</div>`;
        }
        return list.map((p, idx) => {
            const isMe = p.id === highlightMyId;
            const pct = p.total > 0 ? Math.min(100, Math.round((p.progress / p.total) * 100)) : 0;
            const unit = crState.mode === 'daily' ? 'Cluster' : 'Felder';
            const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx + 1}`));
            const timeBadge = p.finished && p.finishSec
                ? `<span class="text-emerald-300 font-bold">${fmtSecondsMMSS(p.finishSec)}</span>`
                : `<span class="text-slate-400">${p.progress}/${p.total || '?'} ${unit}</span>`;
            return `
                <div class="cr-lb-row ${isMe ? 'is-me' : ''}">
                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                        <span class="w-7 text-center text-xs font-extrabold mono shrink-0">${medal}</span>
                        <span class="shrink-0">${renderAvatarSafe(p.profile, 28)}</span>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-1.5">
                                <span class="text-xs font-bold text-white truncate">${escHtml(p.name)}</span>
                                ${isMe ? '<span class="px-1.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 text-[9px] mono font-bold">Du</span>' : ''}
                                ${p.finished ? '<span class="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] mono font-bold">Fertig</span>' : ''}
                            </div>
                            <div class="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden mt-1">
                                <div class="h-full rounded-full ${p.finished ? 'bg-emerald-400' : 'bg-cyan-400'} transition-all duration-300" style="width:${pct}%"></div>
                            </div>
                        </div>
                    </div>
                    <div class="text-right mono shrink-0">
                        <div class="text-xs font-extrabold text-white">${p.score.toLocaleString('de-DE')} Pkt.</div>
                        <div class="text-[10px]">${timeBadge}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderInviteColumnHTML(code, url) {
        return `
            <div class="md:col-span-5 mp-share-card flex flex-col items-center text-center gap-3">
                <div class="mp-qr-frame p-2.5">${buildQrSvgHTML(url, 196)}</div>
                <button type="button" id="mp-hub-copy-code" title="Klicken zum Kopieren"
                    class="mp-code-display-btn group px-4 py-1.5 rounded-2xl transition">
                    <div class="text-[9.5px] uppercase tracking-widest text-slate-400 mono">Raum-Code (Klick zum Kopieren)</div>
                    <div class="text-3xl font-extrabold tracking-[0.26em] text-cyan-300 mono mt-0.5 pl-1">${escHtml(code)}</div>
                </button>
                <button type="button" id="mp-hub-copy-link"
                    class="w-full py-2.5 px-4 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs transition inline-flex items-center justify-center gap-2">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                    <span>Einladungslink kopieren</span>
                </button>
                ${isLocalFileProtocol() ? '<div class="text-[10px] text-amber-300/90 leading-snug">Hinweis: Direktlinks funktionieren ab GitHub Pages.</div>' : ''}
            </div>
        `;
    }

    function wireInviteColumnButtons(code, url) {
        const codeBtn = document.getElementById('mp-hub-copy-code');
        const linkBtn = document.getElementById('mp-hub-copy-link');
        if (codeBtn) {
            codeBtn.onclick = () => copyTextToClipboard(code, `Raum-Code ${code} kopiert!`, codeBtn, '<div class="text-[9.5px] uppercase tracking-widest text-emerald-300 mono">Kopiert!</div><div class="text-3xl font-extrabold tracking-[0.26em] text-emerald-300 mono mt-0.5 pl-1">✓ ' + escHtml(code) + '</div>');
        }
        if (linkBtn) {
            linkBtn.onclick = () => copyTextToClipboard(url, 'Einladungslink kopiert!', linkBtn, '✓ Link kopiert!');
        }
    }

    function renderUnifiedModal() {
        const body = document.getElementById('mp-hub-body');
        const titleEl = document.getElementById('mp-hub-title');
        const subEl = document.getElementById('mp-hub-subtitle');
        if (!body) return;

        const session = getActiveOnlineSession();

        // --------------------------------------------------------------------
        // ANSICHT 1: KEIN RAUM AKTIV -> EINHEITLICHES START-MENÜ (ALLE 4 MODI)
        // --------------------------------------------------------------------
        if (!session) {
            const m = mpHub.selectedMode || getCurrentTabOnlineDefault();
            const modeObj = ONLINE_MODES.find(x => x.id === m) || ONLINE_MODES[0];
            if (titleEl) titleEl.textContent = `${modeObj.label} · Online gegen Freunde`;
            if (subEl) subEl.textContent = 'Raum eröffnen (QR & Link) oder mit 4-stelligem Code beitreten';

            const curArenaRule = (typeof gameState !== 'undefined' && gameState.ruleMode === 'cluster') ? 'cluster' : 'normal';
            let modeOptionsHtml = '';
            if (m === 'arena') {
                modeOptionsHtml = `
                    <div class="space-y-1.5">
                        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">Regelvariante</div>
                        <div class="grid grid-cols-2 gap-1.5">
                            <button type="button" onclick="window.BlinkMultiplayer.setArenaRule('normal')" class="profile-chip ${curArenaRule === 'normal' ? 'is-selected' : ''}">Standard (2 Stapel)</button>
                            <button type="button" onclick="window.BlinkMultiplayer.setArenaRule('cluster')" class="profile-chip ${curArenaRule === 'cluster' ? 'is-selected' : ''}">Cluster (3 Stapel)</button>
                        </div>
                    </div>
                `;
            } else if (m === 'daily') {
                modeOptionsHtml = `
                    <div class="space-y-1.5">
                        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">Zeitlimit</div>
                        <div class="grid grid-cols-4 gap-1.5">
                            ${[0, 120, 180, 300].map(sec => `
                                <button type="button" onclick="window.BlinkMultiplayer.crSetTime(${sec})" class="profile-chip ${crState.timeLimitSec === sec ? 'is-selected' : ''}">${sec === 0 ? 'Ohne' : `${sec / 60} Min`}</button>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else if (m === 'sudoku') {
                modeOptionsHtml = `
                    <div class="space-y-2">
                        <div class="space-y-1">
                            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">Schwierigkeit</div>
                            <div class="grid grid-cols-3 gap-1.5">
                                <button type="button" onclick="window.BlinkMultiplayer.crSetSudokuDiff(10,'Leicht')" class="profile-chip ${crState.sudokuEmptyCount === 10 ? 'is-selected' : ''}">Leicht</button>
                                <button type="button" onclick="window.BlinkMultiplayer.crSetSudokuDiff(14,'Mittel')" class="profile-chip ${crState.sudokuEmptyCount === 14 ? 'is-selected' : ''}">Mittel</button>
                                <button type="button" onclick="window.BlinkMultiplayer.crSetSudokuDiff(17,'Profi')" class="profile-chip ${crState.sudokuEmptyCount === 17 ? 'is-selected' : ''}">Profi</button>
                            </div>
                        </div>
                        <div class="space-y-1">
                            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">Zeitlimit</div>
                            <div class="grid grid-cols-4 gap-1.5">
                                ${[0, 120, 180, 300].map(sec => `
                                    <button type="button" onclick="window.BlinkMultiplayer.crSetTime(${sec})" class="profile-chip ${crState.timeLimitSec === sec ? 'is-selected' : ''}">${sec === 0 ? 'Ohne' : `${sec / 60} Min`}</button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
            }

            const descMap = {
                arena: 'Spiele direkt 1v1 in Echtzeit gegeneinander — inkl. Live-Elo und Head-to-Head.',
                verhoer: 'Spiele das taktische 1v1-Verhör im 125er-Deck mit verdeckten Handkarten.',
                daily: 'Alle lösen gleichzeitig dasselbe Cluster-Brett gegeneinander mit Live-Ranking.',
                sudoku: 'Alle lösen gleichzeitig dasselbe 5×5-Blink-Sudoku mit Live-Ranking und Podium.'
            };

            body.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="mp-share-card space-y-3.5 flex flex-col justify-between">
                        <div class="space-y-2.5">
                            <div class="text-[10px] font-bold uppercase tracking-widest text-cyan-400 mono">Neuer Raum</div>
                            <h3 class="text-sm font-extrabold text-white">${modeObj.label} eröffnen</h3>
                            <p class="text-[11.5px] text-slate-400 leading-relaxed">${descMap[m]}</p>
                            ${modeOptionsHtml}
                        </div>
                        <button type="button" onclick="window.BlinkMultiplayer.createActive()"
                            class="w-full py-3 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs tracking-wide transition shadow-lg shadow-cyan-500/15">
                            Raum erstellen
                        </button>
                    </div>

                    <div class="mp-share-card space-y-3.5 flex flex-col justify-between">
                        <div class="space-y-2.5">
                            <div class="text-[10px] font-bold uppercase tracking-widest text-purple-400 mono">Mitspielen</div>
                            <h3 class="text-sm font-extrabold text-white">Mit Raum-Code beitreten</h3>
                            <div class="apple-inset-group">
                                <div class="apple-set-row">
                                    <span class="text-xs text-slate-300 shrink-0">Dein Name</span>
                                    <input type="text" maxlength="18" value="${escHtml(getMyNameSafe())}" onchange="setPlayerName(this.value)"
                                        class="apple-inset-name-input flex-1 min-w-0 bg-transparent text-right text-xs font-bold text-white focus:outline-none">
                                </div>
                            </div>
                            <p class="text-[11px] text-slate-400 leading-relaxed">
                                Gib den 4-stelligen Code ein oder scanne einfach den QR-Code vom anderen Gerät mit der Kamera.
                            </p>
                        </div>
                        <div class="flex items-center gap-2">
                            <input id="mp-hub-join-input" type="text" maxlength="6" placeholder="K 7 M 4"
                                onkeydown="if(event.key==='Enter') window.BlinkMultiplayer.joinActive()"
                                class="flex-1 min-w-0 bg-slate-950/90 border border-white/10 focus:border-cyan-400 rounded-full px-4 py-2.5 text-center text-sm font-extrabold mono uppercase tracking-[0.22em] text-white placeholder-slate-500 focus:outline-none">
                            <button type="button" onclick="window.BlinkMultiplayer.joinActive()"
                                class="px-5 py-2.5 rounded-full bg-white text-slate-950 hover:bg-cyan-300 font-extrabold text-xs shrink-0 transition">
                                Beitreten
                            </button>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        // --------------------------------------------------------------------
        // ANSICHT 2: 1v1-SESSION AKTIV (BLINK-ARENA ODER DAS VERHÖR)
        // --------------------------------------------------------------------
        if (session.kind === 'arena' || session.kind === 'verhoer') {
            const isArena = session.kind === 'arena';
            const isHost = session.isHost;
            const connected = session.connected;
            const url = buildShareUrl(session.kind, 'join', session.code);
            const oppName = connected
                ? escHtml(isArena ? (p2pState.oppName || 'Online-Gegner') : (vhNet.oppName || 'Online-Gegner'))
                : 'Warte auf Gegner...';
            const oppProf = connected ? (isArena ? p2pState.oppProfile : vhNet.oppProfile) : null;
            const statusText = connected ? 'Verbunden' : (isHost ? 'Warte auf Gegner' : 'Verbinde...');

            if (titleEl) titleEl.textContent = `${session.label} · Online`;
            if (subEl) subEl.textContent = connected
                ? `Verbunden mit ${oppName} · Raum ${session.code}`
                : `Raum ${session.code} offen — QR-Code scannen oder Link teilen`;

            const curArenaRule = (typeof gameState !== 'undefined' && gameState.ruleMode === 'cluster') ? 'cluster' : 'normal';
            const arenaRuleBlock = (isArena && isHost) ? `
                <div class="space-y-1.5 pt-1">
                    <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">Regelvariante</div>
                    <div class="grid grid-cols-2 gap-1.5">
                        <button type="button" onclick="window.BlinkMultiplayer.setArenaRule('normal')" class="profile-chip ${curArenaRule === 'normal' ? 'is-selected' : ''}">Standard (2 Stapel)</button>
                        <button type="button" onclick="window.BlinkMultiplayer.setArenaRule('cluster')" class="profile-chip ${curArenaRule === 'cluster' ? 'is-selected' : ''}">Cluster (3 Stapel)</button>
                    </div>
                </div>
            ` : '';

            const sc = isArena
                ? (typeof getArenaH2HNumbers === 'function' ? getArenaH2HNumbers() : { myWins: 0, oppWins: 0 })
                : (() => {
                    const s = vhNet.seriesScore || { host: 0, guest: 0 };
                    const isG = vhNet.role === 'guest';
                    return { myWins: isG ? (s.guest || 0) : (s.host || 0), oppWins: isG ? (s.host || 0) : (s.guest || 0) };
                })();
            const h2hLine = (connected && (sc.myWins > 0 || sc.oppWins > 0))
                ? `<div class="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs mono">
                        <span class="text-slate-400">Head-to-Head</span>
                        <span class="font-extrabold"><span class="text-cyan-300">${sc.myWins}</span> : <span class="text-rose-400">${sc.oppWins}</span></span>
                   </div>`
                : '';

            const startCall = isArena ? 'window.BlinkMultiplayer.startArenaOnline()' : 'window.BlinkMultiplayer.vhStartOnline()';
            const disconnectCall = isArena ? 'window.BlinkMultiplayer.disconnectArena()' : 'window.BlinkMultiplayer.vhDisconnect()';

            body.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                    ${renderInviteColumnHTML(session.code, url)}

                    <div class="md:col-span-7 flex flex-col justify-between gap-3">
                        <div class="mp-share-card space-y-3 flex-1">
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mono">Spieler im Raum</span>
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] mono font-bold ${connected ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300' : 'bg-amber-500/15 border border-amber-400/40 text-amber-300'}">${statusText}</span>
                            </div>

                            <div class="grid grid-cols-2 gap-2">
                                <div class="cr-player-tile">
                                    <span class="shrink-0">${renderAvatarSafe(getMyProfileSafe(), 30)}</span>
                                    <div class="min-w-0">
                                        <div class="text-xs font-bold text-white truncate">${escHtml(getMyNameSafe())}</div>
                                        <div class="text-[9.5px] mono text-cyan-300">${isHost ? 'Host (Du)' : 'Gast (Du)'}</div>
                                    </div>
                                </div>
                                <div class="cr-player-tile">
                                    <span class="shrink-0">${connected ? renderAvatarSafe(oppProf, 30) : '<span class="w-7 h-7 rounded-full border border-dashed border-white/25 inline-flex items-center justify-center text-[11px] text-slate-500">?</span>'}</span>
                                    <div class="min-w-0">
                                        <div class="text-xs font-bold text-white truncate">${oppName}</div>
                                        <div class="text-[9.5px] mono text-slate-400">${connected ? 'Bereit' : 'Offener Platz'}</div>
                                    </div>
                                </div>
                            </div>

                            ${arenaRuleBlock}
                            ${h2hLine}
                        </div>

                        <div class="flex flex-wrap items-center gap-2">
                            ${isHost ? `
                                <button type="button" onclick="${startCall}" ${connected ? '' : 'disabled'}
                                    class="flex-1 py-3 px-5 rounded-full bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-slate-950 font-extrabold text-xs tracking-wide transition shadow-lg shadow-emerald-500/15">
                                    ▶ Spiel starten
                                </button>
                            ` : `
                                <div class="flex-1 py-3 px-4 rounded-full bg-white/[0.04] border border-white/10 text-center text-xs text-slate-300 mono">
                                    ${connected ? 'Verbunden · Warte auf Start...' : 'Verbinde mit Raum...'}
                                </div>
                            `}
                            <button type="button" onclick="${disconnectCall}"
                                class="px-4 py-3 rounded-full border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs transition">
                                Trennen
                            </button>
                        </div>
                    </div>
                </div>
            `;
            wireInviteColumnButtons(session.code, url);
            return;
        }

        // --------------------------------------------------------------------
        // ANSICHT 3: GRUPPEN-SESSION AKTIV (DAILY CHALLENGE / BLINK-SUDOKU)
        // --------------------------------------------------------------------
        const myId = crState.role === 'host' ? '__host__' : crState.myId;
        const url = buildShareUrl(crState.mode, 'room', crState.roomCode);
        if (titleEl) titleEl.textContent = `${session.label} · Live`;

        // 3A. PODIUM & ENDERGEBNIS
        if (crState.phase === 'results') {
            if (subEl) subEl.textContent = crState.resultsReason || `Runde ${crState.roundNum} abgeschlossen`;
            const top3 = crState.leaderboard.slice(0, 3);
            const podiumOrder = [
                { rank: 2, p: top3[1], medal: '🥈' },
                { rank: 1, p: top3[0], medal: '🥇' },
                { rank: 3, p: top3[2], medal: '🥉' }
            ];
            body.innerHTML = `
                <div class="cr-podium-stage max-w-xl mx-auto">
                    ${podiumOrder.map(({ rank, p, medal }) => {
                        if (!p) return `<div class="cr-podium-col opacity-25"><div class="cr-podium-block rank-${rank}"><span class="text-lg font-extrabold mono">${rank}.</span></div></div>`;
                        return `
                            <div class="cr-podium-col">
                                <div class="w-12 h-12 rounded-2xl bg-slate-950/80 border border-white/15 flex items-center justify-center shadow-lg overflow-hidden">
                                    ${renderAvatarSafe(p.profile, 42)}
                                </div>
                                <div class="text-xs font-extrabold text-white truncate max-w-full px-1">${escHtml(p.name)}</div>
                                <div class="cr-podium-block rank-${rank}">
                                    <span class="text-lg leading-none">${medal}</span>
                                    <span class="text-sm font-extrabold text-white mono">${p.score.toLocaleString('de-DE')}</span>
                                    <span class="text-[9.5px] mono text-slate-300">${p.finished && p.finishSec ? fmtSecondsMMSS(p.finishSec) : `${p.progress}/${p.total}`}</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="space-y-1.5 pt-2">
                    <div class="apple-set-section-label">Gesamtrangliste (${crState.leaderboard.length})</div>
                    <div class="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                        ${renderLeaderboardRowsHTML(crState.leaderboard, myId)}
                    </div>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.08]">
                    ${crState.role === 'host' ? `
                        <button type="button" onclick="window.BlinkMultiplayer.crStartRound()" class="px-5 py-2.5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs transition shadow-lg shadow-cyan-500/20">
                            ↻ Nächste Runde starten
                        </button>
                    ` : `
                        <span class="text-xs mono text-slate-400">Warte auf die nächste Runde...</span>
                    `}
                    <button type="button" onclick="window.BlinkMultiplayer.crLeave()" class="px-4 py-2 rounded-full border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs transition">
                        ${crState.role === 'host' ? 'Raum schließen' : 'Verlassen'}
                    </button>
                </div>
            `;
            return;
        }

        // 3B. LIVE-RANKING WÄHREND DER RUNDE
        if (crState.phase === 'playing') {
            if (subEl) subEl.textContent = `Runde ${crState.roundNum} läuft · Raum ${crState.roomCode}`;
            body.innerHTML = `
                <div class="space-y-3">
                    <div class="flex flex-wrap items-center justify-between gap-2 mp-share-card">
                        <div class="text-xs mono text-slate-300">
                            Code <strong class="text-cyan-300">${escHtml(crState.roomCode)}</strong> · ${crState.leaderboard.filter(p => p.finished).length} von ${crState.leaderboard.length} fertig
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" id="mp-live-copy-link" class="px-3 py-1.5 rounded-full bg-white/[0.07] hover:bg-white/[0.15] text-[11px] font-semibold text-slate-200 transition">Link kopieren</button>
                            ${crState.role === 'host' ? `
                                <button type="button" onclick="window.BlinkMultiplayer.crEndRound()" class="px-4 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs transition">Auswerten &amp; Podium</button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                        ${renderLeaderboardRowsHTML(crState.leaderboard, myId)}
                    </div>
                </div>
            `;
            const liveCopy = document.getElementById('mp-live-copy-link');
            if (liveCopy) liveCopy.onclick = () => copyTextToClipboard(url, 'Einladungslink kopiert!', liveCopy, '✓ Kopiert!');
            return;
        }

        // 3C. GRUPPEN-LOBBY (EXAKT SELBES 2-SPALTEN-LAYOUT WIE 1v1!)
        if (subEl) subEl.textContent = `Raum ${crState.roomCode} · ${crState.leaderboard.length} bereit`;
        const tilesHtml = crState.leaderboard.length > 0
            ? crState.leaderboard.map(p => `
                <div class="cr-player-tile">
                    <span class="shrink-0">${renderAvatarSafe(p.profile, 26)}</span>
                    <span class="text-xs font-bold text-white truncate">${escHtml(p.name)}</span>
                    ${p.id === myId ? '<span class="ml-auto text-[9px] mono text-cyan-300 font-bold">Du</span>' : ''}
                </div>
            `).join('')
            : `<div class="col-span-full text-xs text-slate-400 text-center py-6 rounded-xl border border-dashed border-white/10">Warte auf Teilnehmende...</div>`;

        body.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                ${renderInviteColumnHTML(crState.roomCode, url)}

                <div class="md:col-span-7 flex flex-col justify-between gap-3">
                    <div class="mp-share-card space-y-2.5 flex-1">
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mono">Teilnehmende</span>
                            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-[10.5px] mono font-extrabold text-emerald-300">${crState.leaderboard.length} bereit</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 max-h-[175px] overflow-y-auto pr-1">
                            ${tilesHtml}
                        </div>

                        ${crState.role === 'host' ? `
                            <div class="pt-2 border-t border-white/[0.08] space-y-2">
                                ${crState.mode === 'sudoku' ? `
                                    <div class="grid grid-cols-3 gap-1.5">
                                        <button type="button" onclick="window.BlinkMultiplayer.crSetSudokuDiff(10,'Leicht')" class="profile-chip ${crState.sudokuEmptyCount === 10 ? 'is-selected' : ''}">Leicht</button>
                                        <button type="button" onclick="window.BlinkMultiplayer.crSetSudokuDiff(14,'Mittel')" class="profile-chip ${crState.sudokuEmptyCount === 14 ? 'is-selected' : ''}">Mittel</button>
                                        <button type="button" onclick="window.BlinkMultiplayer.crSetSudokuDiff(17,'Profi')" class="profile-chip ${crState.sudokuEmptyCount === 17 ? 'is-selected' : ''}">Profi</button>
                                    </div>
                                ` : `
                                    <div class="grid grid-cols-2 gap-1.5">
                                        <button type="button" onclick="window.BlinkMultiplayer.crSetDailyVar('random')" class="profile-chip ${crState.dailyVariant === 'random' ? 'is-selected' : ''}">Neues Brett</button>
                                        <button type="button" onclick="window.BlinkMultiplayer.crSetDailyVar('today')" class="profile-chip ${crState.dailyVariant === 'today' ? 'is-selected' : ''}">Heutige Challenge</button>
                                    </div>
                                `}
                                <div class="grid grid-cols-4 gap-1.5">
                                    ${[0, 120, 180, 300].map(sec => `
                                        <button type="button" onclick="window.BlinkMultiplayer.crSetTime(${sec})" class="profile-chip ${crState.timeLimitSec === sec ? 'is-selected' : ''}">${sec === 0 ? 'Ohne Zeit' : `${sec / 60} Min`}</button>
                                    `).join('')}
                                </div>
                                <label class="flex items-center justify-between gap-2 text-xs text-slate-200 cursor-pointer pt-0.5">
                                    <span>Selbst mitspielen <span class="text-[10px] text-slate-400">(aus = nur Beamer)</span></span>
                                    <input type="checkbox" ${crState.hostPlays ? 'checked' : ''} onchange="window.BlinkMultiplayer.crToggleHostPlays(this.checked)">
                                </label>
                            </div>
                        ` : ''}
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        ${crState.role === 'host' ? `
                            <button type="button" onclick="window.BlinkMultiplayer.crStartRound()" class="flex-1 py-3 px-5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs tracking-wide transition shadow-lg shadow-emerald-500/15">
                                ▶ Runde starten (${crState.leaderboard.length})
                            </button>
                        ` : `
                            <div class="flex-1 py-3 px-4 rounded-full bg-white/[0.04] border border-white/10 text-center text-xs text-slate-300 mono">
                                Verbunden · Warte auf Start...
                            </div>
                        `}
                        <button type="button" onclick="window.BlinkMultiplayer.crLeave()" class="px-4 py-3 rounded-full border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs transition">
                            ${crState.role === 'host' ? 'Schließen' : 'Verlassen'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        wireInviteColumnButtons(crState.roomCode, url);
    }

    // ------------------------------------------------------------------------
    // 6. PROFIL-SYNC, DEEP-LINK AUTO-JOIN & ESC
    // ------------------------------------------------------------------------
    function syncMyIdentityToActiveRooms() {
        const name = getMyNameSafe();
        const profile = getMyProfileSafe();

        if (vhNet.active && vhNet.connected) {
            vhNetSend({ type: 'VH_HELLO', name, profile });
            if (isUnifiedModalOpen()) renderUnifiedModal();
        }

        if (crState.active) {
            if (crState.role === 'host') {
                const me = crState.players.get('__host__');
                if (me) {
                    me.name = name;
                    me.profile = profile;
                    crHostScheduleLeaderboardBroadcast(false);
                }
            } else if (crState.hostConn && crState.hostConn.open) {
                crState.hostConn.send({ type: 'CR_PROFILE_UPDATE', name, profile });
            }
        }
    }

    function wireIdentityHooks() {
        ['setPlayerName', 'updatePlayerProfileField', 'randomizePlayerProfile'].forEach(fnName => {
            if (typeof window[fnName] === 'function' && !window[fnName].__mpIdWrapped) {
                const orig = window[fnName];
                const wrapped = function (...args) {
                    const r = orig.apply(this, args);
                    syncMyIdentityToActiveRooms();
                    return r;
                };
                wrapped.__mpIdWrapped = true;
                window[fnName] = wrapped;
            }
        });
    }

    function handleDeepLink(gameTab, params) {
        if (!params) return;
        const joinCode = (params.get('join') || '').trim().toUpperCase();
        const roomCode = (params.get('room') || '').trim().toUpperCase();
        const useInline = Boolean(window.BlinkGameHub && typeof window.BlinkGameHub.handleOnlineDeepLink === 'function');

        if (joinCode) {
            const target = gameTab === 'verhoer' ? 'verhoer' : 'arena';
            if (useInline) {
                window.BlinkGameHub.handleOnlineDeepLink(target, joinCode);
            } else {
                openUnifiedOnlineModal(target);
                setTimeout(() => target === 'verhoer' ? vhNetJoinRoom(joinCode) : hubJoinArenaRoom(joinCode), 150);
            }
            return;
        }

        if (roomCode) {
            const target = gameTab === 'sudoku' ? 'sudoku' : 'daily';
            if (useInline) {
                window.BlinkGameHub.handleOnlineDeepLink(target, roomCode);
            } else {
                openUnifiedOnlineModal(target);
                setTimeout(() => crJoinRoom(target, roomCode), 150);
            }
        }
    }

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || window.__CR_LOCK_CLOSE) return;
        if (isUnifiedModalOpen()) closeUnifiedOnlineModal();
    });

    function bootMultiplayerSuite() {
        injectSharedModals();
        injectGlobalOnlineButton();
        enhanceArenaP2PHooks();
        enhanceVerhoerHooks();
        enhanceClassroomHooks();
        wireIdentityHooks();
    }

    function getFullOnlineSession() {
        const s = getActiveOnlineSession();
        if (!s) return null;
        const paramKey = (s.kind === 'daily' || s.kind === 'sudoku') ? 'room' : 'join';
        const url = buildShareUrl(s.kind, paramKey, s.code);
        const base = {
            ...s,
            url,
            qrHtml: buildQrSvgHTML(url, 146)
        };
        if (s.kind === 'arena') {
            return {
                ...base,
                oppName: p2pState.oppName || '',
                oppProfile: p2pState.oppProfile || null
            };
        }
        if (s.kind === 'verhoer') {
            return {
                ...base,
                oppName: vhNet.oppName || '',
                oppProfile: vhNet.oppProfile || null
            };
        }
        return {
            ...base,
            leaderboard: crState.leaderboard || [],
            myId: crState.role === 'host' ? '__host__' : crState.myId,
            timeLimitSec: crState.timeLimitSec,
            dailyVariant: crState.dailyVariant,
            sudokuEmptyCount: crState.sudokuEmptyCount,
            hostPlays: crState.hostPlays
        };
    }

    window.BlinkMultiplayer = {
        handleDeepLink,
        openHub: openUnifiedOnlineModal,
        closeHub: closeUnifiedOnlineModal,
        getSession: getActiveOnlineSession,
        getFullSession: getFullOnlineSession,
        getOnlineSettings: () => ({
            timeLimitSec: crState.timeLimitSec,
            dailyVariant: crState.dailyVariant,
            sudokuEmptyCount: crState.sudokuEmptyCount,
            hostPlays: crState.hostPlays
        }),
        copyCode: (code, btnEl) => copyTextToClipboard(code, `Raum-Code ${code} kopiert!`, btnEl, '✓ ' + escHtml(code)),
        copyLink: (url, btnEl) => copyTextToClipboard(url, 'Einladungslink kopiert!', btnEl, '✓ Kopiert!'),
        createInline: (modeId) => {
            if (!ONLINE_MODES.some(m => m.id === modeId)) return;
            mpHub.selectedMode = modeId;
            if (modeId === 'arena') hubCreateArenaRoom(true);
            else if (modeId === 'verhoer') vhNetCreateRoom(true);
            else crCreateRoom(modeId, true);
        },
        joinInline: (modeId, code) => {
            if (!ONLINE_MODES.some(m => m.id === modeId)) return;
            const clean = String(code || '').trim().toUpperCase();
            if (clean.length < 4) {
                if (typeof showSonnerToast === 'function') showSonnerToast('Bitte gib den 4-stelligen Raum-Code ein.', 'warn');
                return;
            }
            mpHub.selectedMode = modeId;
            if (modeId === 'arena') hubJoinArenaRoom(clean, true);
            else if (modeId === 'verhoer') vhNetJoinRoom(clean, true);
            else crJoinRoom(modeId, clean);
        },
        startSession: (modeId) => {
            if (modeId === 'arena') hubStartArenaMatch();
            else if (modeId === 'verhoer') vhHostStartOnlineMatch();
            else crHostStartRound();
        },
        leaveSession: (modeId) => {
            if (modeId === 'arena') hubDisconnectArena();
            else if (modeId === 'verhoer') vhNetDisconnect(false);
            else crLeaveRoom(false);
        },
        selectMode: (modeId) => {
            if (!ONLINE_MODES.some(m => m.id === modeId)) return;
            mpHub.selectedMode = modeId;
            if (typeof playSound === 'function') playSound('tick');
            renderUnifiedModal();
        },
        createActive: () => {
            const m = mpHub.selectedMode || 'arena';
            if (m === 'arena') hubCreateArenaRoom();
            else if (m === 'verhoer') vhNetCreateRoom();
            else crCreateRoom(m);
        },
        joinActive: () => {
            const inp = document.getElementById('mp-hub-join-input');
            const code = inp ? inp.value : '';
            const m = mpHub.selectedMode || 'arena';
            if (m === 'arena') hubJoinArenaRoom(code);
            else if (m === 'verhoer') vhNetJoinRoom(code);
            else crJoinRoom(m, code);
        },
        setArenaRule: hubSetArenaRule,
        startArenaOnline: hubStartArenaMatch,
        disconnectArena: hubDisconnectArena,
        // Rückwärtskompatibilität für bestehende Aufrufe
        vhOpenModal: () => openUnifiedOnlineModal('verhoer'),
        vhCreateRoom: vhNetCreateRoom,
        vhJoinRoom: vhNetJoinRoom,
        vhStartOnline: vhHostStartOnlineMatch,
        vhDisconnect: () => vhNetDisconnect(false),
        vhResetH2H: resetVerhoerSeriesScore,
        vhDefenderPick: (slotIdx) => vhNetDispatchAction({ kind: 'DEFENDER_SHOW_CARD', idx: slotIdx }),
        openClassroom: (m) => openUnifiedOnlineModal(m || 'daily'),
        crCreate: crCreateRoom,
        crJoin: crJoinRoom,
        crStartRound: crHostStartRound,
        crEndRound: () => crHostEndRound('Runde ausgewertet!'),
        crLeave: () => crLeaveRoom(false),
        crSetTime: crHostSetTimeLimit,
        crSetSudokuDiff: crHostSetSudokuDiff,
        crSetDailyVar: crHostSetDailyVariant,
        crToggleHostPlays: crHostToggleHostPlays
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootMultiplayerSuite);
    } else {
        bootMultiplayerSuite();
    }
})();