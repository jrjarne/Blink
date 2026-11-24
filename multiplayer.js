// ============================================================================
// BLINK MULTIPLAYER 2.0
// 1) Auto-Link & QR-Code (Blink-Arena)
// 2) Das Verhör Online 1v1 (PeerJS, Link & QR-Code)
// 3) Kursraum / Kahoot-Modus für Daily Challenge & Blink-Sudoku (10–30+ Spieler)
// ============================================================================
(function initBlinkMultiplayerSuite() {
    if (window.__BLINK_MULTIPLAYER_READY) return;
    window.__BLINK_MULTIPLAYER_READY = true;

    const VH_PREFIX = 'blink-vh-p2p-';
    const CR_PREFIX = 'blink-cr-p2p-';

    // ------------------------------------------------------------------------
    // 0. GEMEINSAME HELFER: LINK-GENERATOR, SVG-QR-CODE, AVATAR & BEAMER-ZOOM
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

    function buildQrSvgHTML(text, sizePx = 152) {
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
                return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 ${total} ${total}" class="block rounded-lg bg-white" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#ffffff"/><g fill="#0f172a">${rects}</g></svg>`;
            } catch (e) {}
        }
        const enc = encodeURIComponent(text);
        return `<img src="https://api.qrserver.com/v1/create-qr-code/?size=${sizePx}x${sizePx}&margin=8&data=${enc}" width="${sizePx}" height="${sizePx}" alt="QR-Code" class="block rounded-lg bg-white" />`;
    }

    function copyTextToClipboard(text, toastMsg = 'Link kopiert!') {
        if (!text) return;
        const done = () => {
            if (typeof playSound === 'function') playSound('tick');
            if (typeof showSonnerToast === 'function') showSonnerToast(toastMsg, 'success');
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

    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        ta.remove();
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

    function openQrZoomModal(title, code, url) {
        const modal = document.getElementById('mp-qr-zoom-modal');
        if (!modal) return;
        const tEl = document.getElementById('mp-qr-zoom-title');
        const cEl = document.getElementById('mp-qr-zoom-code');
        const qEl = document.getElementById('mp-qr-zoom-svg');
        const uEl = document.getElementById('mp-qr-zoom-url');
        const copyBtn = document.getElementById('mp-qr-zoom-copy');

        if (tEl) tEl.textContent = title || 'Per QR-Code beitreten';
        if (cEl) cEl.textContent = code || '----';
        if (qEl) qEl.innerHTML = buildQrSvgHTML(url, 250);
        if (uEl) uEl.value = url;
        if (copyBtn) copyBtn.onclick = () => copyTextToClipboard(url, 'Einladungslink kopiert!');

        if (modal.classList.contains('hidden') && typeof toggleModalState === 'function') {
            toggleModalState('mp-qr-zoom-modal');
        }
    }

    function injectSharedModals() {
        if (document.getElementById('mp-qr-zoom-modal')) return;

        const wrap = document.createElement('div');
        wrap.innerHTML = `
            <!-- 1. BEAMER QR-CODE ZOOM MODAL -->
            <div id="mp-qr-zoom-modal" onclick="if(event.target === this) toggleModalState(this.id)" class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] hidden items-center justify-center p-4 transition-opacity duration-200 opacity-0">
                <div class="apple-settings-sheet fu-card rounded-[28px] max-w-md w-full p-6 shadow-2xl space-y-4 text-center transition-transform duration-200 scale-95">
                    <div class="flex items-center justify-between gap-2 pb-2 apple-set-header">
                        <div class="text-left min-w-0">
                            <h3 id="mp-qr-zoom-title" class="text-base font-extrabold text-white heading-font truncate">Per QR-Code beitreten</h3>
                            <p class="text-[11px] text-slate-400">Mit Kamera am Smartphone oder iPad scannen</p>
                        </div>
                        <button type="button" onclick="toggleModalState('mp-qr-zoom-modal')" class="modal-pill-cta px-3.5 py-1.5 rounded-full font-bold text-xs shrink-0">Fertig</button>
                    </div>
                    <div class="flex flex-col items-center gap-3 py-1">
                        <div id="mp-qr-zoom-svg" class="mp-qr-frame p-3"></div>
                        <div class="space-y-0.5">
                            <div class="text-[10px] uppercase tracking-widest text-slate-400 mono">Raum-Code</div>
                            <div id="mp-qr-zoom-code" class="text-3xl font-extrabold tracking-[0.25em] text-cyan-300 mono">----</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <input id="mp-qr-zoom-url" type="text" readonly onclick="this.select()" class="flex-1 min-w-0 bg-slate-950/80 border border-white/10 rounded-full px-3.5 py-2 text-[11px] mono text-slate-300 focus:outline-none">
                        <button type="button" id="mp-qr-zoom-copy" class="px-4 py-2 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs shrink-0 transition">Link kopieren</button>
                    </div>
                </div>
            </div>

            <!-- 2. DAS VERHÖR ONLINE 1v1 MODAL -->
            <div id="vh-online-modal" onclick="if(event.target === this) toggleModalState(this.id)" class="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 hidden items-center justify-center p-3 sm:p-5 transition-opacity duration-200 opacity-0">
                <div class="apple-settings-sheet fu-card rounded-[28px] max-w-[660px] w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92dvh] overflow-y-auto transition-transform duration-200 scale-95">
                    <div class="apple-set-header flex items-center justify-between gap-3 pb-3.5">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="apple-set-title-badge" aria-hidden="true">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </span>
                            <div class="min-w-0">
                                <h2 class="text-base sm:text-[17px] font-extrabold text-white heading-font leading-tight">Das Verhör · Online 1v1</h2>
                                <p class="text-[11px] text-slate-400 leading-tight mt-0.5">Direktes Duell über Link, QR-Code oder Raum-Code</p>
                            </div>
                        </div>
                        <button type="button" onclick="toggleModalState('vh-online-modal')" class="modal-pill-cta px-4 py-1.5 rounded-full font-bold text-xs shrink-0">Fertig</button>
                    </div>
                    <div id="vh-online-modal-body" class="space-y-4"></div>
                </div>
            </div>

            <!-- 3. KURSRAUM / KAHOOT-MODUS MODAL (DAILY CHALLENGE & BLINK-SUDOKU) -->
            <div id="cr-modal" onclick="if(event.target === this && !window.__CR_LOCK_CLOSE) toggleModalState(this.id)" class="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 hidden items-center justify-center p-3 sm:p-5 transition-opacity duration-200 opacity-0">
                <div class="apple-settings-sheet fu-card rounded-[28px] max-w-[840px] w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92dvh] overflow-y-auto transition-transform duration-200 scale-95">
                    <div class="apple-set-header flex items-center justify-between gap-3 pb-3.5">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="apple-set-title-badge" aria-hidden="true">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            </span>
                            <div class="min-w-0">
                                <h2 id="cr-modal-title" class="text-base sm:text-[17px] font-extrabold text-white heading-font leading-tight">Kursraum · Live-Wettkampf</h2>
                                <p id="cr-modal-subtitle" class="text-[11px] text-slate-400 leading-tight mt-0.5">Alle lösen gleichzeitig dasselbe Puzzle mit Live-Bestenliste</p>
                            </div>
                        </div>
                        <button type="button" onclick="toggleModalState('cr-modal')" class="modal-pill-cta px-4 py-1.5 rounded-full font-bold text-xs shrink-0">Schließen</button>
                    </div>
                    <div id="cr-modal-body" class="space-y-4"></div>
                </div>
            </div>

            <!-- 4. SYNCHRONER 3-2-1 COUNTDOWN OVERLAY -->
            <div id="cr-countdown-overlay" class="hidden fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[70] flex flex-col items-center justify-center p-6 text-center pointer-events-auto">
                <div class="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400 mono mb-3" id="cr-countdown-label">Kursraum startet gleich</div>
                <div id="cr-countdown-digit" class="text-7xl sm:text-8xl font-extrabold text-white heading-font">3</div>
            </div>
        `;
        while (wrap.firstElementChild) {
            document.body.appendChild(wrap.firstElementChild);
        }
    }

    // ------------------------------------------------------------------------
    // 1. BLINK-ARENA: AUTO-LINK & QR-CODE IM BESTEHENDEN P2P-PANEL
    // ------------------------------------------------------------------------
    function enhanceArenaP2PPanel() {
        const activeControls = document.getElementById('p2p-active-controls');
        if (!activeControls || document.getElementById('p2p-arena-share-box')) return;

        const shareBox = document.createElement('div');
        shareBox.id = 'p2p-arena-share-box';
        shareBox.className = 'hidden mp-share-card space-y-2.5';
        shareBox.innerHTML = `
            <div class="flex flex-col items-center gap-2">
                <div id="p2p-arena-qr-slot" class="mp-qr-frame" title="Klicken für Beamer-Ansicht"></div>
                <div class="text-[10px] text-slate-400 mono text-center">QR-Code scannen oder Link teilen</div>
            </div>
            <div class="flex items-center gap-1.5">
                <input id="p2p-arena-link-input" type="text" readonly onclick="this.select()" class="flex-1 min-w-0 bg-slate-950/90 border border-white/10 rounded-full px-3 py-1.5 text-[10.5px] mono text-slate-300 focus:outline-none">
                <button type="button" id="p2p-arena-copy-link" class="px-2.5 py-1.5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-[10.5px] shrink-0 transition">Link</button>
                <button type="button" id="p2p-arena-zoom-qr" class="px-2.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-slate-200 font-semibold text-[10.5px] shrink-0 transition" title="QR-Code groß anzeigen">Groß</button>
            </div>
            <div id="p2p-arena-file-note" class="hidden text-[10px] text-amber-300/90 leading-snug text-center">Hinweis: Auf GitHub Pages öffnet der Link direkt deine Online-Seite.</div>
        `;

        const disconnectBtn = activeControls.querySelector('button[onclick*="p2pDisconnect"]');
        if (disconnectBtn) activeControls.insertBefore(shareBox, disconnectBtn);
        else activeControls.appendChild(shareBox);

        if (typeof window.p2pUpdateUI === 'function' && !window.p2pUpdateUI.__qrWrapped) {
            const origUpdate = window.p2pUpdateUI;
            const wrapped = function (statusText = null, tone = 'idle') {
                origUpdate(statusText, tone);
                syncArenaQrShareBox();
            };
            wrapped.__qrWrapped = true;
            window.p2pUpdateUI = wrapped;
        }
        syncArenaQrShareBox();
    }

    function syncArenaQrShareBox() {
        const box = document.getElementById('p2p-arena-share-box');
        if (!box || typeof p2pState === 'undefined') return;
        const showQr = Boolean(p2pState.role === 'host' && p2pState.roomCode && !p2pState.connected);
        box.classList.toggle('hidden', !showQr);
        if (!showQr) return;

        const url = buildShareUrl('arena', 'join', p2pState.roomCode);
        const qrSlot = document.getElementById('p2p-arena-qr-slot');
        const linkInp = document.getElementById('p2p-arena-link-input');
        const copyBtn = document.getElementById('p2p-arena-copy-link');
        const zoomBtn = document.getElementById('p2p-arena-zoom-qr');
        const fileNote = document.getElementById('p2p-arena-file-note');

        if (qrSlot && qrSlot.dataset.lastUrl !== url) {
            qrSlot.dataset.lastUrl = url;
            qrSlot.innerHTML = buildQrSvgHTML(url, 138);
            qrSlot.onclick = () => openQrZoomModal('Blink-Arena · 1v1 beitreten', p2pState.roomCode, url);
        }
        if (linkInp) linkInp.value = url;
        if (copyBtn) copyBtn.onclick = () => copyTextToClipboard(url, 'Einladungslink kopiert!');
        if (zoomBtn) zoomBtn.onclick = () => openQrZoomModal('Blink-Arena · 1v1 beitreten', p2pState.roomCode, url);
        if (fileNote) fileNote.classList.toggle('hidden', !isLocalFileProtocol());
    }

    // ------------------------------------------------------------------------
    // 2. DAS VERHÖR ONLINE 1v1 (HOST-AUTORITATIV VIA PEERJS + LINK & QR)
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
        hostGame: null,
        viewMeta: {
            intStep: null,
            intDemand: null,
            intMatchIndices: [],
            oppSlotIndices: [],
            intAttackerIsMe: false
        }
    };

    function vhNetSend(payload) {
        if (vhNet.conn && vhNet.conn.open) {
            vhNet.conn.send(payload);
        }
    }

    function vhNetDisconnect(silent = false) {
        if (vhNet.conn) { try { vhNet.conn.close(); } catch (e) {} }
        if (vhNet.peer) { try { vhNet.peer.destroy(); } catch (e) {} }
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
        vhNet.hostGame = null;
        vhNet.viewMeta = { intStep: null, intDemand: null, intMatchIndices: [], oppSlotIndices: [], intAttackerIsMe: false };

        updateVerhoerOnlineButton();
        renderVerhoerOnlineModal();
        if (wasActive && typeof vhInitLobby === 'function') {
            vhInitLobby();
        }
        if (!silent && typeof showSonnerToast === 'function') {
            showSonnerToast('Verhör-Online-Verbindung getrennt.', 'neutral');
        }
    }

    function vhNetCreateRoom() {
        if (typeof Peer === 'undefined') {
            showSonnerToast('PeerJS nicht verfügbar (Internetverbindung nötig).', 'warn');
            return;
        }
        vhNetDisconnect(true);
        const code = genRoomCode(4);
        vhNet.active = true;
        vhNet.role = 'host';
        vhNet.roomCode = code;
        vhNet.statusText = 'Erstelle Raum...';
        renderVerhoerOnlineModal();
        updateVerhoerOnlineButton();

        const peer = new Peer(VH_PREFIX + code);
        vhNet.peer = peer;

        peer.on('open', () => {
            vhNet.statusText = 'Warte auf Gegner';
            renderVerhoerOnlineModal();
            updateVerhoerOnlineButton();
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

    function vhNetJoinRoom(forcedCode = null) {
        if (typeof Peer === 'undefined') {
            showSonnerToast('PeerJS nicht verfügbar (Internetverbindung nötig).', 'warn');
            return;
        }
        const inp = document.getElementById('vh-net-join-input');
        const code = (forcedCode || (inp ? inp.value : '')).trim().toUpperCase();
        if (code.length < 4) {
            showSonnerToast('Bitte gib den 4-stelligen Verhör-Code ein.', 'warn');
            return;
        }
        vhNetDisconnect(true);
        vhNet.active = true;
        vhNet.role = 'guest';
        vhNet.roomCode = code;
        vhNet.statusText = 'Verbinde...';
        renderVerhoerOnlineModal();
        updateVerhoerOnlineButton();

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
            updateVerhoerOnlineButton();
            renderVerhoerOnlineModal();
            if (typeof renderVerhoerStandaloneUI === 'function') renderVerhoerStandaloneUI();
            const msg = vhNet.role === 'host'
                ? 'Gegner im Verhör verbunden! Klicke auf „Spielen“.'
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
        const hand = g.hands[role];
        let slot = (typeof g.lastCleared[role] === 'number' && hand[g.lastCleared[role]] === null)
            ? g.lastCleared[role]
            : hand.findIndex(c => !c);
        if (slot === -1) {
            slot = hand.length;
            hand.push(card);
        } else {
            hand[slot] = card;
        }
        if (g.lastCleared[role] === slot) g.lastCleared[role] = null;
        return slot;
    }

    function vhHostPushLog(g, html) {
        g.logs.unshift(html);
        if (g.logs.length > 25) g.logs.pop();
    }

    function vhHostStartOnlineMatch() {
        if (!vhNet.active || vhNet.role !== 'host' || !vhNet.connected) {
            showSonnerToast('Verbinde dich zuerst mit einem Gegner im Online-Menü.', 'warn');
            openVerhoerOnlineModal();
            return;
        }
        const deck125 = shuffleArray(CARDS_125);
        const firstDiscard = deck125.pop();
        const hostStart = [...deck125.splice(0, 5), null];
        const guestStart = [...deck125.splice(0, 5), null];
        const starter = Math.random() < 0.5 ? 'host' : 'guest';
        const starterName = starter === 'host' ? getMyNameSafe() : (vhNet.oppName || 'Gegner');

        vhNet.hostGame = {
            isRunning: true,
            deck: deck125,
            discardHistory: [firstDiscard],
            hands: { host: hostStart, guest: guestStart },
            lastCleared: { host: 5, guest: 5 },
            trios: { host: [], guest: [] },
            turn: starter,
            phase: 'draw',
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

        const modal = document.getElementById('vh-online-modal');
        if (modal && !modal.classList.contains('hidden')) toggleModalState('vh-online-modal');

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
        let viewMatchIndices = [];

        if (g.phase === 'interrogation') {
            if (isAttacker) {
                viewIntStep = g.intStep === 'defender_pick' ? 'wait_defender' : g.intStep;
                if (g.intStep === 'decide') viewPendingCard = g.pendingCard;
            } else {
                viewIntStep = g.intStep === 'defender_pick' ? 'defender_pick' : 'wait_attacker';
                if (g.intStep === 'defender_pick') viewMatchIndices = g.intMatchIndices;
            }
        }

        return {
            isRunning: g.isRunning,
            isMyTurn: g.turn === targetRole,
            phase: g.phase,
            deckCount: g.deck.length,
            discardHistory: g.discardHistory.slice(-2),
            myHand: g.hands[targetRole],
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
            pendingCard: viewPendingCard,
            intNote: g.intNote,
            logs: g.logs,
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
        vhState.intType = view.intType || null;
        vhState.intStep = view.intStep || null;
        vhState.pendingCard = view.pendingCard || null;
        vhState.intNote = view.intNote || '';
        vhState.logs = view.logs || [];
        vhState.winInfo = view.winInfo || null;
        if (!view.isMyTurn || view.phase === 'interrogation' || view.phase === 'ended') {
            vhState.selectedIdx = null;
            vhState.sktDraftIndices = [];
        }

        vhNet.viewMeta = {
            intStep: view.intStep,
            intDemand: view.intDemand,
            intMatchIndices: view.intMatchIndices || [],
            oppSlotIndices: view.oppSlotIndices || [],
            intAttackerIsMe: Boolean(view.intAttackerIsMe)
        };

        if (!wasRunning && view.isRunning) {
            const modal = document.getElementById('vh-online-modal');
            if (modal && !modal.classList.contains('hidden')) toggleModalState('vh-online-modal');
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

        // 1. Cluster rufen (jederzeit im eigenen Zug oder sofort nach Fertigstellung)
        if (action.kind === 'CALL_CLUSTER') {
            const winClu = findValidCluster5FromPool(g.hands[role].filter(Boolean), g.trios[role]);
            if (!winClu) return;
            g.isRunning = false;
            g.phase = 'ended';
            g.winInfo = { winnerRole: role, winnerName: actorName, cluster: winClu };
            vhHostPushLog(g, `<span class="text-emerald-400 font-bold">${actorName} ruft Cluster!</span>`);
            vhHostBroadcastState(`${actorName} gewinnt mit einem 5er-Cluster!`, 'success');
            return;
        }

        // 2. Verteidiger wählt bei mehreren passenden Karten im Standard-Verhör eine Karte aus
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

        // Alle folgenden Aktionen sind nur am eigenen Zug erlaubt
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
            g.hands[role][idx] = null;
            g.lastCleared[role] = idx;
            g.discardHistory.push(card);
            g.recalledKey = null;

            if (g.phase === 'bonus_discard') {
                vhHostPushLog(g, `<span class="${actorColor} font-bold">${actorName}:</span> Tausch-Abwurf (${card.join(',')}) → M₁`);
                g.turn = oppRole;
                g.phase = 'draw';
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
                vhHostBroadcastState();
            } else if (dH === 2) {
                g.phase = 'interrogation';
                g.intType = 'standard';
                g.intStep = 'choose_prop';
                g.intAttacker = role;
                g.intDemand = null;
                g.intMatchIndices = [];
                vhHostBroadcastState(`Standard-Verhör von ${actorName}!`, 'neutral');
            } else {
                g.phase = 'interrogation';
                g.intType = 'strict';
                g.intStep = 'blind_pick';
                g.intAttacker = role;
                g.intDemand = null;
                vhHostBroadcastState(`⚡ Verschärftes Verhör von ${actorName}!`, 'warn');
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
            } else {
                g.intMatchIndices = matches;
                g.intStep = 'defender_pick';
                vhHostPushLog(g, `<span class="text-amber-300">Verhör:</span> ${actorName} fordert ${valName}`);
                vhHostBroadcastState();
            }
            return;
        }

        if (action.kind === 'BLIND_PICK' && g.phase === 'interrogation' && g.intStep === 'blind_pick') {
            const idx = action.idx;
            if (!g.hands[oppRole][idx]) return;
            g.pendingIdx = idx;
            g.pendingCard = g.hands[oppRole][idx];
            g.intStep = 'decide';
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
                vhHostBroadcastState();
            } else {
                g.discardHistory.push(card);
                g.turn = oppRole;
                g.phase = 'draw';
                g.intType = null;
                g.intAttacker = null;
                vhHostPushLog(g, `<span class="text-rose-400 font-bold">Strafabwurf:</span> ${oppName} muss (${card.join(',')}) abwerfen`);
                vhHostBroadcastState();
            }
            return;
        }

        if (action.kind === 'END_NO_MATCH' && g.phase === 'interrogation' && g.intStep === 'no_match') {
            g.turn = oppRole;
            g.phase = 'draw';
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
            renderVerhoerOnlineModal();
            if (typeof renderVerhoerStandaloneUI === 'function') renderVerhoerStandaloneUI();
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

    function openVerhoerOnlineModal() {
        renderVerhoerOnlineModal();
        const modal = document.getElementById('vh-online-modal');
        if (modal && modal.classList.contains('hidden')) {
            if (typeof playSound === 'function') playSound('tick');
            toggleModalState('vh-online-modal');
        }
    }

    function updateVerhoerOnlineButton() {
        const btn = document.getElementById('vh-btn-online-room');
        if (!btn) return;
        btn.classList.toggle('is-connected', vhNet.connected);
        const dot = btn.querySelector('.vh-net-dot');
        const lbl = btn.querySelector('.vh-net-lbl');
        if (dot) dot.className = `vh-net-dot w-2 h-2 rounded-full ${vhNet.connected ? 'bg-emerald-400 animate-pulse' : (vhNet.active ? 'bg-amber-400 animate-pulse' : 'bg-cyan-400')}`;
        if (lbl) lbl.textContent = vhNet.connected ? `Online (${vhNet.roomCode})` : (vhNet.active ? `Raum ${vhNet.roomCode}` : 'Online 1v1');
    }

    function renderVerhoerOnlineModal() {
        const body = document.getElementById('vh-online-modal-body');
        if (!body) return;

        if (!vhNet.active) {
            body.innerHTML = `
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="mp-share-card space-y-3 flex flex-col justify-between">
                        <div class="space-y-1">
                            <div class="text-[10.5px] font-bold uppercase tracking-widest text-cyan-400 mono">Neues Duell erstellen</div>
                            <h3 class="text-sm font-extrabold text-white">Host werden (Link &amp; QR)</h3>
                            <p class="text-[11.5px] text-slate-400 leading-relaxed">Erzeugt sofort einen Einladungslink und QR-Code für dein 1v1-Verhör im $\\mathbb{F}_5^3$.</p>
                        </div>
                        <button type="button" onclick="window.BlinkMultiplayer.vhCreateRoom()" class="w-full py-2.5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs transition shadow-lg shadow-cyan-500/15">
                            Raum erstellen (Link &amp; QR)
                        </button>
                    </div>

                    <div class="mp-share-card space-y-3 flex flex-col justify-between">
                        <div class="space-y-1">
                            <div class="text-[10.5px] font-bold uppercase tracking-widest text-purple-400 mono">Raum beitreten</div>
                            <h3 class="text-sm font-extrabold text-white">Mit Code verbinden</h3>
                            <p class="text-[11.5px] text-slate-400 leading-relaxed">Gib den 4-stelligen Code deines Gegners ein oder scanne einfach dessen QR-Code.</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <input id="vh-net-join-input" type="text" maxlength="6" placeholder="z. B. K7M4"
                                onkeydown="if(event.key==='Enter') window.BlinkMultiplayer.vhJoinRoom()"
                                class="flex-1 min-w-0 bg-slate-950/90 border border-white/10 focus:border-cyan-400 rounded-full px-3.5 py-2 text-xs mono uppercase tracking-widest text-white placeholder-slate-500 focus:outline-none">
                            <button type="button" onclick="window.BlinkMultiplayer.vhJoinRoom()" class="px-4 py-2 rounded-full bg-white text-slate-950 hover:bg-cyan-300 font-extrabold text-xs shrink-0 transition">Beitreten</button>
                        </div>
                    </div>
                </div>
            `;
            if (typeof safeRenderMathJax === 'function') safeRenderMathJax();
            return;
        }

        const url = buildShareUrl('verhoer', 'join', vhNet.roomCode);
        const oppDisplay = vhNet.connected ? escHtml(vhNet.oppName || 'Gegner') : 'Warte auf Gegner...';
        const isHost = vhNet.role === 'host';

        body.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div class="md:col-span-5 flex flex-col items-center gap-2.5 mp-share-card">
                    <div id="vh-net-qr-box" class="mp-qr-frame" title="Klicken für Beamer-Ansicht">${buildQrSvgHTML(url, 154)}</div>
                    <div class="text-center">
                        <div class="text-[9.5px] uppercase tracking-widest text-slate-400 mono">Verhör Raum-Code</div>
                        <div class="text-2xl font-extrabold tracking-[0.22em] text-cyan-300 mono">${escHtml(vhNet.roomCode)}</div>
                    </div>
                    <button type="button" id="vh-net-zoom-btn" class="px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-[11px] font-semibold text-slate-200 transition">QR-Code groß zeigen</button>
                </div>

                <div class="md:col-span-7 space-y-3">
                    <div class="mp-share-card space-y-2.5">
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-[10.5px] font-bold uppercase tracking-widest text-slate-400 mono">Status</span>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] mono font-bold ${vhNet.connected ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300' : 'bg-amber-500/15 border border-amber-400/40 text-amber-300'}">${escHtml(vhNet.statusText)}</span>
                        </div>

                        <div class="grid grid-cols-2 gap-2">
                            <div class="cr-player-tile">
                                <span class="shrink-0">${renderAvatarSafe(getMyProfileSafe(), 28)}</span>
                                <div class="min-w-0">
                                    <div class="text-xs font-bold text-white truncate">${escHtml(getMyNameSafe())}</div>
                                    <div class="text-[9.5px] mono text-cyan-300">${isHost ? 'Host (Du)' : 'Gast (Du)'}</div>
                                </div>
                            </div>
                            <div class="cr-player-tile">
                                <span class="shrink-0">${vhNet.connected ? renderAvatarSafe(vhNet.oppProfile, 28) : '<span class="w-7 h-7 rounded-full border border-dashed border-white/20 inline-flex items-center justify-center text-[11px] text-slate-500">?</span>'}</span>
                                <div class="min-w-0">
                                    <div class="text-xs font-bold text-white truncate">${oppDisplay}</div>
                                    <div class="text-[9.5px] mono text-slate-400">${vhNet.connected ? 'Bereit' : 'Offener Platz'}</div>
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center gap-1.5 pt-1">
                            <input type="text" readonly value="${escHtml(url)}" onclick="this.select()" class="flex-1 min-w-0 bg-slate-950/85 border border-white/10 rounded-full px-3 py-1.5 text-[10.5px] mono text-slate-300 focus:outline-none">
                            <button type="button" id="vh-net-copy-url" class="px-3.5 py-1.5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-[11px] shrink-0 transition">Link kopieren</button>
                        </div>
                        ${isLocalFileProtocol() ? '<div class="text-[10px] text-amber-300/90">Hinweis: Auf GitHub Pages öffnet der Link direkt deine Online-Seite.</div>' : ''}
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        ${isHost ? `
                            <button type="button" onclick="window.BlinkMultiplayer.vhStartOnline()" ${vhNet.connected ? '' : 'disabled'} class="flex-1 py-2.5 px-4 rounded-full bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-slate-950 font-extrabold text-xs transition">
                                ▶ Online-Verhör starten
                            </button>
                        ` : `
                            <div class="flex-1 py-2.5 px-4 rounded-full bg-white/[0.04] border border-white/10 text-center text-xs text-slate-300 mono">
                                ${vhNet.connected ? 'Warte auf Start durch Host...' : 'Verbinde...'}
                            </div>
                        `}
                        <button type="button" onclick="window.BlinkMultiplayer.vhDisconnect()" class="px-4 py-2.5 rounded-full border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs transition">
                            Trennen
                        </button>
                    </div>
                </div>
            </div>
        `;

        const copyBtn = document.getElementById('vh-net-copy-url');
        const qrBox = document.getElementById('vh-net-qr-box');
        const zoomBtn = document.getElementById('vh-net-zoom-btn');
        if (copyBtn) copyBtn.onclick = () => copyTextToClipboard(url, 'Verhör-Link kopiert!');
        if (qrBox) qrBox.onclick = () => openQrZoomModal('Das Verhör · 1v1 beitreten', vhNet.roomCode, url);
        if (zoomBtn) zoomBtn.onclick = () => openQrZoomModal('Das Verhör · 1v1 beitreten', vhNet.roomCode, url);
    }

    function enhanceVerhoerUIAndHooks() {
        // Online-1v1-Button in die Verhör-Kopfzeile einfügen
        const vhStartBtn = document.getElementById('vh-btn-start');
        if (vhStartBtn && !document.getElementById('vh-btn-online-room')) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.id = 'vh-btn-online-room';
            btn.onclick = openVerhoerOnlineModal;
            btn.className = 'mp-live-pill-btn px-3 py-1.5 rounded-full text-[11px] font-bold transition inline-flex items-center gap-1.5 shrink-0';
            btn.innerHTML = `<span class="vh-net-dot w-2 h-2 rounded-full bg-cyan-400"></span><span class="vh-net-lbl">Online 1v1</span>`;
            vhStartBtn.parentElement.insertBefore(btn, vhStartBtn);
        }

        // Zweiter Button direkt in der Verhör-Lobby
        const vhLobby = document.getElementById('vh-lobby-overlay');
        if (vhLobby && !document.getElementById('vh-lobby-online-btn')) {
            const playBtn = vhLobby.querySelector('button[onclick*="vhStartNewGame"]');
            if (playBtn && playBtn.parentElement) {
                playBtn.parentElement.classList.add('flex', 'flex-wrap', 'items-center', 'justify-center', 'gap-2.5');
                const ob = document.createElement('button');
                ob.type = 'button';
                ob.id = 'vh-lobby-online-btn';
                ob.onclick = openVerhoerOnlineModal;
                ob.className = 'mp-live-pill-btn px-5 py-3.5 rounded-full font-bold text-sm transition inline-flex items-center gap-2';
                ob.innerHTML = `<span>Online 1v1 (Link &amp; QR)</span>`;
                playBtn.parentElement.appendChild(ob);
            }
        }

        // Bestehende Verhör-Funktionen sauber für Online 1v1 ummanteln
        const wrapFn = (name, onlineHandler) => {
            if (typeof window[name] !== 'function' || window[name].__vhNetWrapped) return;
            const orig = window[name];
            const wrapped = function (...args) {
                if (vhNet.active) return onlineHandler.apply(this, args);
                return orig.apply(this, args);
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
                openVerhoerOnlineModal();
            }
        });

        wrapFn('vhAbortGame', () => {
            vhNetDispatchAction({ kind: 'ABORT' });
        });

        wrapFn('vhDrawFromDeck', () => {
            if (!vhState.isRunning || vhState.turn !== 'player' || vhState.phase !== 'draw') return;
            if (typeof playSound === 'function') playSound('play');
            vhNetDispatchAction({ kind: 'DRAW_DECK' });
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

        wrapFn('vhBlindPick', (slotIdx) => {
            if (typeof playSound === 'function') playSound('flip');
            vhNetDispatchAction({ kind: 'BLIND_PICK', idx: slotIdx });
        });

        wrapFn('vhResolveDecision', (takeCard) => {
            if (typeof playSound === 'function') playSound(takeCard ? 'play' : 'tick');
            vhNetDispatchAction({ kind: 'RESOLVE_DECISION', takeCard: Boolean(takeCard) });
        });

        wrapFn('vhEndPlayerTurn', () => {
            vhNetDispatchAction({ kind: 'END_NO_MATCH' });
        });

        wrapFn('vhValidateSktDraft', () => {
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

        // Post-Render-Hook für Verhör-UI (zeigt Gegner-Name/Avatar & Online-Verhör-Schritte)
        if (typeof window.renderVerhoerStandaloneUI === 'function' && !window.renderVerhoerStandaloneUI.__vhNetPost) {
            const origRender = window.renderVerhoerStandaloneUI;
            const wrappedRender = function () {
                origRender();
                postRenderVerhoerOnline();
            };
            wrappedRender.__vhNetPost = true;
            window.renderVerhoerStandaloneUI = wrappedRender;
        }
    }

    function postRenderVerhoerOnline() {
        const oppLabelEl = document.querySelector('#game-view-verhoer .xl\\:col-span-6 .text-xs.font-bold.text-white');
        const oppIconWrap = oppLabelEl ? oppLabelEl.closest('.flex.items-center.gap-2\\.5')?.firstElementChild : null;
        const xrayBtn = document.getElementById('vh-btn-xray');
        const xrayBody = document.getElementById('vh-xray-body');
        const botBarLbl = document.getElementById('vh-bar-bot-lbl');
        const botBar = document.getElementById('vh-bar-bot');

        if (!vhNet.active) {
            if (oppLabelEl) oppLabelEl.textContent = 'Taktik-Bot';
            if (xrayBtn) xrayBtn.classList.remove('hidden');
            return;
        }

        const oppName = vhNet.connected ? (vhNet.oppName || 'Online-Gegner') : 'Warte auf Gegner...';
        if (oppLabelEl) oppLabelEl.textContent = oppName;
        if (oppIconWrap && vhNet.connected) {
            oppIconWrap.innerHTML = renderAvatarSafe(vhNet.oppProfile, 28);
        }
        if (xrayBtn) xrayBtn.classList.add('hidden');
        if (xrayBody) xrayBody.classList.add('hidden');

        // Geheime Gegner-Hand nicht durch Fortschrittsbalken verraten
        if (botBarLbl) botBarLbl.textContent = `${vhState.aiTrios.length} SKT`;
        if (botBar) botBar.style.width = `${Math.min(100, vhState.aiTrios.length * 45)}%`;

        const bannerTxt = document.getElementById('vh-banner-text');
        if (bannerTxt && vhState.isRunning) {
            if (vhState.phase === 'interrogation') {
                if (vhNet.viewMeta.intStep === 'defender_pick') {
                    bannerTxt.textContent = `${oppName} fordert ${vhNet.viewMeta.intDemand?.label || 'eine Eigenschaft'} — wähle deine Karte!`;
                } else if (vhNet.viewMeta.intStep === 'wait_attacker') {
                    bannerTxt.textContent = `${oppName} führt gerade ein Verhör gegen dich aus...`;
                } else if (vhNet.viewMeta.intStep === 'wait_defender') {
                    bannerTxt.textContent = `Warte darauf, welche passende Karte ${oppName} vorzeigt...`;
                }
            } else if (vhState.turn === 'ai') {
                bannerTxt.textContent = `${oppName} ist am Zug...`;
            }
        }

        // Online-spezifische Verhör-Overlays rendern
        const intPanel = document.getElementById('vh-interrogation-panel');
        const intTitle = document.getElementById('vh-int-title');
        const intBadge = document.getElementById('vh-int-badge');
        const intBody = document.getElementById('vh-int-body');
        if (intPanel && intBody && vhState.phase === 'interrogation' && vhState.isRunning) {
            const step = vhNet.viewMeta.intStep;
            if (step === 'wait_attacker') {
                if (intTitle) intTitle.textContent = vhState.intType === 'strict' ? '⚡ Verschärftes Verhör läuft' : 'Standard-Verhör läuft';
                if (intBadge) intBadge.textContent = escHtml(oppName);
                intBody.innerHTML = `<div class="py-3 text-center space-y-1"><div class="text-sm font-bold text-white">${escHtml(oppName)} führt ein Verhör aus...</div><p class="text-xs text-slate-400">Bitte warte kurz auf die Auswahl deines Gegners.</p></div>`;
            } else if (step === 'wait_defender') {
                if (intTitle) intTitle.textContent = 'Standard-Verhör';
                if (intBadge) intBadge.textContent = 'Warte auf Gegner';
                intBody.innerHTML = `<div class="py-3 text-center space-y-1"><div class="text-sm font-bold text-white">${escHtml(oppName)} hat mehrere passende Karten</div><p class="text-xs text-slate-400">Dein Gegner wählt gerade aus, welche Karte er dir zeigt...</p></div>`;
            } else if (step === 'defender_pick') {
                if (intTitle) intTitle.textContent = `Verhör: ${vhNet.viewMeta.intDemand?.label || ''}`;
                if (intBadge) intBadge.textContent = 'Karte vorzeigen';
                const choices = (vhNet.viewMeta.intMatchIndices || []).map(slotIdx => {
                    const card = vhState.playerHand[slotIdx];
                    if (!card) return '';
                    return `
                        <button type="button" onclick="window.BlinkMultiplayer.vhDefenderPick(${slotIdx})" class="w-20 card-63-88 rounded-xl bg-white border-3 border-amber-400 hover:scale-105 p-1 flex flex-col justify-between shadow-lg transition overflow-hidden">
                            ${renderLargePlayingCardInner(card, true)}
                        </button>
                    `;
                }).join('');
                intBody.innerHTML = `
                    <p class="text-slate-300"><strong class="text-white">${escHtml(oppName)}</strong> fordert <strong class="text-amber-300">${escHtml(vhNet.viewMeta.intDemand?.label || '')}</strong>. Wähle, welche passende Karte du vorzeigst:</p>
                    <div class="flex flex-wrap items-center justify-center gap-3 pt-1">${choices}</div>
                `;
            } else if (step === 'blind_pick') {
                const slots = vhNet.viewMeta.oppSlotIndices || [];
                intBody.innerHTML = `
                    <p class="text-slate-300">Wähle blind eine verdeckte Karte aus der Hand von <strong class="text-white">${escHtml(oppName)}</strong>:</p>
                    <div class="flex flex-wrap gap-2.5">
                        ${slots.map((slotIdx, n) => `
                            <button type="button" onclick="vhBlindPick(${slotIdx})" class="w-16 card-63-88 rounded-xl bg-gradient-to-br from-rose-800 to-indigo-950 hover:from-amber-400 hover:to-amber-500 border-2 border-rose-400/60 hover:border-white flex flex-col items-center justify-center gap-1 shadow-lg transition group">
                                <span class="text-xs font-extrabold text-white group-hover:text-slate-950 mono">#${n + 1}</span>
                                <span class="text-[9px] text-rose-200 group-hover:text-slate-950 font-bold uppercase">Ziehen</span>
                            </button>
                        `).join('')}
                    </div>
                `;
            }
        }

        // End-Overlay-Text mit echtem Gegnernamen
        if (vhState.phase === 'ended' && vhState.winInfo) {
            const et = document.getElementById('vh-end-title');
            const ed = document.getElementById('vh-end-desc');
            if (et) et.textContent = vhState.winInfo.didWin ? 'Perfektes 5er-Cluster!' : `${vhState.winInfo.winnerName || oppName} gewinnt!`;
            if (ed) ed.textContent = vhState.winInfo.didWin
                ? `Du hast ${oppName} im Online-Verhör besiegt.`
                : `${oppName} hat zuerst ein vollständiges 5er-Cluster gebildet.`;
        }
    }

    // ------------------------------------------------------------------------
    // 3. KURSRAUM / KAHOOT-MODUS (DAILY CHALLENGE & BLINK-SUDOKU · 10–30+ SPIELER)
    // ------------------------------------------------------------------------
    const crState = {
        active: false,
        mode: 'daily', // 'daily' | 'sudoku'
        role: null,    // 'host' | 'guest'
        roomCode: '',
        peer: null,
        hostConn: null,        // Guest -> Host
        guestConns: new Map(), // Host -> Map<peerId, DataConnection>
        players: new Map(),    // Host -> Map<playerId, playerObj>
        leaderboard: [],
        phase: 'idle', // 'idle' | 'lobby' | 'playing' | 'results'
        roundNum: 0,
        hostPlays: true,
        timeLimitSec: 180,
        dailyVariant: 'random', // 'today' | 'random'
        sudokuEmptyCount: 10,
        sudokuDiffName: 'Leicht',
        roundStartAt: 0,
        timerHandle: null,
        broadcastTimer: null,
        myHintsUsed: 0,
        myFinished: false,
        myFinishSec: null,
        lastSentSig: '',
        selectedSetupMode: 'daily'
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
                try { conn.send(payload); } catch (e) {}
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
            const modal = document.getElementById('cr-modal');
            if (modal && !modal.classList.contains('hidden')) renderClassroomModal();

            // Automatisch beenden, wenn alle aktiven Spieler fertig sind
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
            crState.guestConns.forEach(c => { try { c.close(); } catch (e) {} });
        } else if (crState.hostConn) {
            try { crState.hostConn.close(); } catch (e) {}
        }
        if (crState.peer) { try { crState.peer.destroy(); } catch (e) {} }

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
        renderClassroomModal();
        if (!silent && typeof showSonnerToast === 'function') {
            showSonnerToast('Kursraum verlassen.', 'neutral');
        }
    }

    function crCreateRoom(mode) {
        if (typeof Peer === 'undefined') {
            showSonnerToast('PeerJS nicht verfügbar (Internetverbindung nötig).', 'warn');
            return;
        }
        crLeaveRoom(true);
        const code = genRoomCode(4);
        crState.active = true;
        crState.mode = mode === 'sudoku' ? 'sudoku' : 'daily';
        crState.selectedSetupMode = crState.mode;
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
            showSonnerToast(`Kursraum ${code} erstellt! QR-Code jetzt scanbar.`, 'success');
            updateClassroomLiveBars();
            renderClassroomModal();
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
            showSonnerToast(`Kursraum-Fehler: ${err.type || 'Verbindung fehlgeschlagen'}`, 'warn');
            crLeaveRoom(true);
        });

        renderClassroomModal();
        updateClassroomLiveBars();
    }

    function crJoinRoom(mode, forcedCode = null) {
        if (typeof Peer === 'undefined') {
            showSonnerToast('PeerJS nicht verfügbar (Internetverbindung nötig).', 'warn');
            return;
        }
        const inp = document.getElementById('cr-join-input');
        const code = (forcedCode || (inp ? inp.value : '')).trim().toUpperCase();
        if (code.length < 4) {
            showSonnerToast('Bitte gib den 4-stelligen Kursraum-Code ein.', 'warn');
            return;
        }
        crLeaveRoom(true);
        crState.active = true;
        crState.mode = mode === 'sudoku' ? 'sudoku' : 'daily';
        crState.selectedSetupMode = crState.mode;
        crState.role = 'guest';
        crState.roomCode = code;
        crState.phase = 'lobby';
        renderClassroomModal();

        const peer = new Peer();
        crState.peer = peer;

        const timeout = setTimeout(() => {
            if (crState.active && crState.role === 'guest' && (!crState.hostConn || !crState.hostConn.open)) {
                showSonnerToast(`Kursraum ${code} nicht erreichbar.`, 'warn');
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
                showSonnerToast(`Kursraum ${code} beigetreten!`, 'success');
                updateClassroomLiveBars();
                renderClassroomModal();
            });
            conn.on('data', (msg) => crGuestHandleHostMsg(msg));
            conn.on('close', () => {
                showSonnerToast('Kursraum wurde vom Host beendet.', 'warn');
                crLeaveRoom(true);
            });
        });

        peer.on('error', () => {
            clearTimeout(timeout);
            showSonnerToast(`Kursraum ${code} nicht gefunden.`, 'warn');
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
            if (typeof setGameSubTab === 'function' && labState.activeGameTab !== crState.mode) {
                setGameSubTab(crState.mode);
            }
            if (msg.phase === 'playing' && msg.activePuzzle) {
                crApplyPuzzlePayload(msg.activePuzzle, false);
                if (msg.remainingSec) {
                    crState.roundStartAt = performance.now() - ((crState.timeLimitSec - msg.remainingSec) * 1000);
                }
                crStartClockTicker();
            }
            updateClassroomLiveBars();
            renderClassroomModal();
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
            if (typeof setGameSubTab === 'function' && labState.activeGameTab !== crState.mode) {
                setGameSubTab(crState.mode);
            }
            crApplyPuzzlePayload(msg.puzzle, true);
            return;
        }

        if (msg.type === 'CR_LEADERBOARD') {
            crState.leaderboard = msg.leaderboard || [];
            if (msg.phase) crState.phase = msg.phase;
            updateClassroomLiveBars();
            const modal = document.getElementById('cr-modal');
            if (modal && !modal.classList.contains('hidden')) renderClassroomModal();
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
            showSonnerToast('Der Kursraum wurde vom Host geschlossen.', 'warn');
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
        renderClassroomModal();
    }

    function crHostSetSudokuDiff(emptyCount, diffName) {
        crState.sudokuEmptyCount = emptyCount;
        crState.sudokuDiffName = diffName;
        if (typeof playSound === 'function') playSound('tick');
        renderClassroomModal();
    }

    function crHostSetDailyVariant(variant) {
        crState.dailyVariant = variant;
        if (typeof playSound === 'function') playSound('tick');
        renderClassroomModal();
    }

    function crHostStartRound() {
        if (!crState.active || crState.role !== 'host') return;
        if (crState.players.size === 0) {
            showSonnerToast('Mindestens 1 Teilnehmender (oder „Host spielt mit“) wird benötigt.', 'warn');
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
                label: `Kursraum #${crState.roomCode} · Runde ${crState.roundNum}`
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
                label: `Kursraum #${crState.roomCode} · Runde ${crState.roundNum}`
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
            // Moderator-Modus am Beamer: Countdown + Live-Ranking offen lassen!
            crRunCountdown(() => {
                crState.roundStartAt = performance.now();
                crStartClockTicker();
                crHostScheduleLeaderboardBroadcast(true);
            });
        }
    }

    function crHostEndRound(reason = 'Runde vom Host ausgewertet!') {
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
        const modal = document.getElementById('cr-modal');
        if (modal && !modal.classList.contains('hidden')) toggleModalState('cr-modal');

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
            if (lbl) lbl.textContent = puzzle.label || 'Kursraum · Daily Challenge';
            const fb = document.getElementById('daily-feedback-text');
            if (fb) fb.textContent = `Kursraum aktiv! Finde alle ${dailyState.solutions.length} Cluster so schnell wie möglich.`;
            renderDailyUI();
        } else if (puzzle.mode === 'sudoku' && typeof sudokuState !== 'undefined') {
            sudokuState.emptyCount = puzzle.emptyCount;
            sudokuState.diffName = puzzle.diffName || 'Kursraum';
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
        renderClassroomModal();
        updateClassroomLiveBars();
        const modal = document.getElementById('cr-modal');
        if (modal && modal.classList.contains('hidden')) {
            toggleModalState('cr-modal');
        }
        if (typeof playSound === 'function') playSound('win');
        if (window.BlinkHaptics) {
            setTimeout(() => window.BlinkHaptics.burst(document.getElementById('cr-modal'), 'amber', 32), 180);
        }
    }

    function openClassroomModal(mode) {
        if (!crState.active) {
            crState.selectedSetupMode = mode === 'sudoku' ? 'sudoku' : 'daily';
        }
        renderClassroomModal();
        const modal = document.getElementById('cr-modal');
        if (modal && modal.classList.contains('hidden')) {
            if (typeof playSound === 'function') playSound('tick');
            toggleModalState('cr-modal');
        }
    }

    function updateClassroomLiveBars() {
        ['daily', 'sudoku'].forEach(m => {
            const btn = document.getElementById(`btn-cr-${m}`);
            const bar = document.getElementById(`cr-${m}-live-bar`);
            const isActiveHere = crState.active && crState.mode === m;

            if (btn) {
                btn.classList.toggle('is-connected', isActiveHere);
                const lbl = btn.querySelector('.cr-btn-lbl');
                if (lbl) {
                    lbl.textContent = isActiveHere
                        ? `Kursraum ${crState.roomCode} (${crState.leaderboard.length})`
                        : 'Kursraum (Live)';
                }
            }
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
                        <button type="button" onclick="window.BlinkMultiplayer.openClassroom('${m}')" class="px-3 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-[11px] font-bold text-white transition">
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

    function renderClassroomModal() {
        const body = document.getElementById('cr-modal-body');
        const titleEl = document.getElementById('cr-modal-title');
        const subEl = document.getElementById('cr-modal-subtitle');
        if (!body) return;

        const activeMode = crState.active ? crState.mode : crState.selectedSetupMode;
        const modeLabel = activeMode === 'sudoku' ? 'Blink-Sudoku' : 'Daily Challenge';
        if (titleEl) titleEl.textContent = `Kursraum · ${modeLabel}`;

        // 1. EINSTIEG (NOCH IN KEINEM RAUM)
        if (!crState.active) {
            if (subEl) subEl.textContent = 'Lade 10, 15 oder 20+ Personen per QR-Code oder Link ins gleiche Puzzle ein';
            body.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="mp-share-card space-y-3.5 flex flex-col justify-between">
                        <div class="space-y-2">
                            <div class="text-[10.5px] font-bold uppercase tracking-widest text-cyan-400 mono">Für Kursleitung / Host</div>
                            <h3 class="text-sm font-extrabold text-white">Neuen Kursraum eröffnen</h3>
                            <p class="text-[11.5px] text-slate-400 leading-relaxed">Erzeugt sofort einen QR-Code &amp; Link für den Beamer. Alle Teilnehmenden lösen exakt dasselbe ${modeLabel}-Rätsel gegen die Uhr.</p>
                            <div class="pt-1 space-y-2">
                                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">Zeitlimit</div>
                                <div class="grid grid-cols-4 gap-1.5">
                                    ${[0, 120, 180, 300].map(sec => `
                                        <button type="button" onclick="window.BlinkMultiplayer.crSetTime(${sec})" class="profile-chip ${crState.timeLimitSec === sec ? 'is-selected' : ''}">${sec === 0 ? 'Ohne' : `${sec / 60} Min`}</button>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        <button type="button" onclick="window.BlinkMultiplayer.crCreate('${activeMode}')" class="w-full py-3 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs transition shadow-lg shadow-cyan-500/15">
                            Kursraum starten (Link &amp; QR)
                        </button>
                    </div>

                    <div class="mp-share-card space-y-3.5 flex flex-col justify-between">
                        <div class="space-y-2">
                            <div class="text-[10.5px] font-bold uppercase tracking-widest text-purple-400 mono">Für Teilnehmende</div>
                            <h3 class="text-sm font-extrabold text-white">Kursraum beitreten</h3>
                            <p class="text-[11.5px] text-slate-400 leading-relaxed">Scanne den QR-Code vom Beamer mit deiner Kamera oder gib hier den 4-stelligen Raum-Code ein:</p>
                            <div class="apple-inset-group mt-2">
                                <div class="apple-set-row">
                                    <span class="text-xs text-slate-300 shrink-0">Dein Name</span>
                                    <input type="text" maxlength="18" value="${escHtml(getMyNameSafe())}" onchange="setPlayerName(this.value)" class="apple-inset-name-input flex-1 min-w-0 bg-transparent text-right text-xs font-bold text-white focus:outline-none">
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <input id="cr-join-input" type="text" maxlength="6" placeholder="Code (z. B. M8Q3)"
                                onkeydown="if(event.key==='Enter') window.BlinkMultiplayer.crJoin('${activeMode}')"
                                class="flex-1 min-w-0 bg-slate-950/90 border border-white/10 focus:border-cyan-400 rounded-full px-3.5 py-2.5 text-xs mono uppercase tracking-widest text-white placeholder-slate-500 focus:outline-none">
                            <button type="button" onclick="window.BlinkMultiplayer.crJoin('${activeMode}')" class="px-5 py-2.5 rounded-full bg-white text-slate-950 hover:bg-cyan-300 font-extrabold text-xs shrink-0 transition">Beitreten</button>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        const myId = crState.role === 'host' ? '__host__' : crState.myId;
        const url = buildShareUrl(crState.mode, 'room', crState.roomCode);

        // 2. KAHOOT-SIEGERPODIUM & BESTENLISTE (NACH RUNDENENDE)
        if (crState.phase === 'results') {
            if (subEl) subEl.textContent = crState.resultsReason || `Runde ${crState.roundNum} abgeschlossen · Offizielle Bestenliste`;
            const top3 = crState.leaderboard.slice(0, 3);
            const podiumOrder = [
                { rank: 2, p: top3[1], medal: '🥈' },
                { rank: 1, p: top3[0], medal: '🥇' },
                { rank: 3, p: top3[2], medal: '🥉' }
            ];

            const podiumHtml = `
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
            `;

            body.innerHTML = `
                ${podiumHtml}
                <div class="space-y-1.5 pt-2">
                    <div class="apple-set-section-label">Gesamtrangliste (${crState.leaderboard.length} Teilnehmende)</div>
                    <div class="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                        ${renderLeaderboardRowsHTML(crState.leaderboard, myId)}
                    </div>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.08]">
                    ${crState.role === 'host' ? `
                        <button type="button" onclick="window.BlinkMultiplayer.crStartRound()" class="px-5 py-2.5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs transition shadow-lg shadow-cyan-500/20">
                            ↻ Nächste Runde (Neues Puzzle)
                        </button>
                    ` : `
                        <span class="text-xs mono text-slate-400">Warte auf die nächste Runde des Hosts...</span>
                    `}
                    <button type="button" onclick="window.BlinkMultiplayer.crLeave()" class="px-4 py-2 rounded-full border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs transition">
                        ${crState.role === 'host' ? 'Raum schließen' : 'Raum verlassen'}
                    </button>
                </div>
            `;
            return;
        }

        // 3. LIVE-RANKING WÄHREND DER RUNDE
        if (crState.phase === 'playing') {
            if (subEl) subEl.textContent = `Runde ${crState.roundNum} läuft · Live-Fortschritt aller Teilnehmenden`;
            body.innerHTML = `
                <div class="space-y-3">
                    <div class="flex flex-wrap items-center justify-between gap-2 mp-share-card">
                        <div class="text-xs mono text-slate-300">Raum <strong class="text-cyan-300">${escHtml(crState.roomCode)}</strong> · ${crState.leaderboard.filter(p => p.finished).length} von ${crState.leaderboard.length} fertig</div>
                        <div class="flex items-center gap-2">
                            <button type="button" id="cr-live-qr-btn" class="px-3 py-1 rounded-full bg-white/[0.07] hover:bg-white/[0.15] text-[11px] font-semibold text-slate-200 transition">QR-Code</button>
                            ${crState.role === 'host' ? `
                                <button type="button" onclick="window.BlinkMultiplayer.crEndRound()" class="px-4 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs transition">Runde auswerten &amp; Podium</button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                        ${renderLeaderboardRowsHTML(crState.leaderboard, myId)}
                    </div>
                </div>
            `;
            const qBtn = document.getElementById('cr-live-qr-btn');
            if (qBtn) qBtn.onclick = () => openQrZoomModal(`Kursraum · ${modeLabel}`, crState.roomCode, url);
            return;
        }

        // 4. WARTE-LOBBY (VOR START: QR-CODE + EINLADUNGSLINK + LIVE-TEILNEHMERLISTE)
        if (subEl) subEl.textContent = crState.role === 'host'
            ? `Raum ${crState.roomCode} offen — Teilnehmende können per QR-Code oder Link beitreten`
            : `Verbunden mit Kursraum ${crState.roomCode} — warte auf den Start`;

        const tilesHtml = crState.leaderboard.length > 0
            ? crState.leaderboard.map(p => `
                <div class="cr-player-tile">
                    <span class="shrink-0">${renderAvatarSafe(p.profile, 28)}</span>
                    <span class="text-xs font-bold text-white truncate">${escHtml(p.name)}</span>
                    ${p.id === myId ? '<span class="ml-auto text-[9px] mono text-cyan-300 font-bold">Du</span>' : ''}
                </div>
            `).join('')
            : `<div class="col-span-full text-xs text-slate-400 text-center py-6 rounded-xl border border-dashed border-white/10">Warte auf Teilnehmende...</div>`;

        body.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                <!-- Links: QR-Code, Raum-Code & Einstellungen -->
                <div class="md:col-span-5 space-y-3">
                    <div class="mp-share-card flex flex-col items-center gap-2.5 text-center">
                        <div id="cr-lobby-qr-box" class="mp-qr-frame" title="Klicken für Beamer-Vollbild">${buildQrSvgHTML(url, 160)}</div>
                        <div>
                            <div class="text-[9.5px] uppercase tracking-widest text-slate-400 mono">Raum-Code</div>
                            <div class="text-2xl font-extrabold tracking-[0.22em] text-cyan-300 mono">${escHtml(crState.roomCode)}</div>
                        </div>
                        <div class="flex items-center gap-1.5 w-full">
                            <input type="text" readonly value="${escHtml(url)}" onclick="this.select()" class="flex-1 min-w-0 bg-slate-950/85 border border-white/10 rounded-full px-3 py-1.5 text-[10px] mono text-slate-300 focus:outline-none">
                            <button type="button" id="cr-lobby-copy-btn" class="px-3 py-1.5 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-[10.5px] shrink-0 transition">Link</button>
                            <button type="button" id="cr-lobby-zoom-btn" class="px-2.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-slate-200 font-semibold text-[10.5px] shrink-0 transition">Groß</button>
                        </div>
                    </div>

                    ${crState.role === 'host' ? `
                        <div class="mp-share-card space-y-2.5">
                            ${crState.mode === 'sudoku' ? `
                                <div class="space-y-1">
                                    <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">Schwierigkeit</div>
                                    <div class="grid grid-cols-3 gap-1.5">
                                        <button type="button" onclick="window.BlinkMultiplayer.crSetSudokuDiff(10,'Leicht')" class="profile-chip ${crState.sudokuEmptyCount === 10 ? 'is-selected' : ''}">Leicht (10)</button>
                                        <button type="button" onclick="window.BlinkMultiplayer.crSetSudokuDiff(14,'Mittel')" class="profile-chip ${crState.sudokuEmptyCount === 14 ? 'is-selected' : ''}">Mittel (14)</button>
                                        <button type="button" onclick="window.BlinkMultiplayer.crSetSudokuDiff(17,'Profi')" class="profile-chip ${crState.sudokuEmptyCount === 17 ? 'is-selected' : ''}">Profi (17)</button>
                                    </div>
                                </div>
                            ` : `
                                <div class="space-y-1">
                                    <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">Rätsel-Typ</div>
                                    <div class="grid grid-cols-2 gap-1.5">
                                        <button type="button" onclick="window.BlinkMultiplayer.crSetDailyVar('random')" class="profile-chip ${crState.dailyVariant === 'random' ? 'is-selected' : ''}">Neues Zufalls-Brett</button>
                                        <button type="button" onclick="window.BlinkMultiplayer.crSetDailyVar('today')" class="profile-chip ${crState.dailyVariant === 'today' ? 'is-selected' : ''}">Heutige Challenge</button>
                                    </div>
                                </div>
                            `}
                            <div class="space-y-1">
                                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mono">Zeitlimit</div>
                                <div class="grid grid-cols-4 gap-1.5">
                                    ${[0, 120, 180, 300].map(sec => `
                                        <button type="button" onclick="window.BlinkMultiplayer.crSetTime(${sec})" class="profile-chip ${crState.timeLimitSec === sec ? 'is-selected' : ''}">${sec === 0 ? 'Ohne' : `${sec / 60} Min`}</button>
                                    `).join('')}
                                </div>
                            </div>
                            <label class="flex items-center justify-between gap-2 pt-1 text-xs text-slate-200 cursor-pointer">
                                <span>Selbst mitspielen <span class="text-[10px] text-slate-400">(aus = Beamer-Host)</span></span>
                                <input type="checkbox" ${crState.hostPlays ? 'checked' : ''} onchange="window.BlinkMultiplayer.crToggleHostPlays(this.checked)">
                            </label>
                        </div>
                    ` : `
                        <div class="apple-inset-group">
                            <div class="apple-set-row">
                                <span class="text-xs text-slate-300 shrink-0">Dein Name</span>
                                <input type="text" maxlength="18" value="${escHtml(getMyNameSafe())}" onchange="setPlayerName(this.value)" class="apple-inset-name-input flex-1 min-w-0 bg-transparent text-right text-xs font-bold text-white focus:outline-none">
                            </div>
                        </div>
                    `}
                </div>

                <!-- Rechts: Live-Teilnehmerliste & Start-Button -->
                <div class="md:col-span-7 flex flex-col justify-between gap-3 h-full">
                    <div class="mp-share-card space-y-2.5 flex-1">
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-[10.5px] font-bold uppercase tracking-widest text-slate-400 mono">Teilnehmende im Raum</span>
                            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-[11px] mono font-extrabold text-emerald-300">${crState.leaderboard.length} bereit</span>
                        </div>
                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[250px] overflow-y-auto pr-1">
                            ${tilesHtml}
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        ${crState.role === 'host' ? `
                            <button type="button" onclick="window.BlinkMultiplayer.crStartRound()" class="flex-1 py-3 px-5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs tracking-wide transition shadow-lg shadow-emerald-500/20">
                                ▶ Runde für alle starten (${crState.leaderboard.length})
                            </button>
                        ` : `
                            <div class="flex-1 py-3 px-4 rounded-full bg-white/[0.04] border border-white/10 text-center text-xs text-slate-300 mono">
                                Warte auf den Start durch den Host...
                            </div>
                        `}
                        <button type="button" onclick="window.BlinkMultiplayer.crLeave()" class="px-4 py-3 rounded-full border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs transition">
                            ${crState.role === 'host' ? 'Schließen' : 'Verlassen'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        const copyBtn = document.getElementById('cr-lobby-copy-btn');
        const qrBox = document.getElementById('cr-lobby-qr-box');
        const zoomBtn = document.getElementById('cr-lobby-zoom-btn');
        if (copyBtn) copyBtn.onclick = () => copyTextToClipboard(url, 'Kursraum-Link kopiert!');
        if (qrBox) qrBox.onclick = () => openQrZoomModal(`Kursraum · ${modeLabel}`, crState.roomCode, url);
        if (zoomBtn) zoomBtn.onclick = () => openQrZoomModal(`Kursraum · ${modeLabel}`, crState.roomCode, url);
    }

    function enhanceClassroomUIAndHooks() {
        // 1. Daily Challenge Button & Live-Bar einfügen
        const dailySelPill = document.getElementById('daily-selection-pill');
        if (dailySelPill && !document.getElementById('btn-cr-daily')) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.id = 'btn-cr-daily';
            btn.onclick = () => openClassroomModal('daily');
            btn.className = 'mp-live-pill-btn px-3 py-1.5 rounded-full text-xs font-bold transition inline-flex items-center gap-1.5 shrink-0';
            btn.innerHTML = `<span class="w-2 h-2 rounded-full bg-cyan-400"></span><span class="cr-btn-lbl">Kursraum (Live)</span>`;
            dailySelPill.parentElement.appendChild(btn);
        }
        const dailyGrid = document.getElementById('daily-cards-grid');
        if (dailyGrid && !document.getElementById('cr-daily-live-bar')) {
            const bar = document.createElement('div');
            bar.id = 'cr-daily-live-bar';
            bar.className = 'hidden cr-live-bar';
            dailyGrid.parentElement.insertBefore(bar, dailyGrid);
        }

        // 2. Blink-Sudoku Button & Live-Bar einfügen
        const sdkDiff17 = document.getElementById('sdk-diff-17');
        if (sdkDiff17 && !document.getElementById('btn-cr-sudoku')) {
            const headerRow = sdkDiff17.closest('.flex.flex-wrap');
            if (headerRow) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.id = 'btn-cr-sudoku';
                btn.onclick = () => openClassroomModal('sudoku');
                btn.className = 'mp-live-pill-btn px-3 py-1.5 rounded-full text-xs font-bold transition inline-flex items-center gap-1.5 shrink-0';
                btn.innerHTML = `<span class="w-2 h-2 rounded-full bg-purple-400"></span><span class="cr-btn-lbl">Kursraum (Live)</span>`;
                headerRow.appendChild(btn);
            }
        }
        const sdkGrid = document.getElementById('sudoku-grid');
        if (sdkGrid && !document.getElementById('cr-sudoku-live-bar')) {
            const bar = document.createElement('div');
            bar.id = 'cr-sudoku-live-bar';
            bar.className = 'hidden cr-live-bar';
            sdkGrid.parentElement.insertBefore(bar, sdkGrid);
        }

        // 3. Fortschritts-Hooks für Daily Challenge
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

        // 4. Fortschritts-Hooks für Blink-Sudoku (deckt Klick, Drag-&-Drop & Rausziehen ab!)
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
    // 4. PROFIL- & NAMENS-SYNC + DEEP-LINK AUTO-JOIN + ESC-SCHLIESSEN
    // ------------------------------------------------------------------------
    function syncMyIdentityToActiveRooms() {
        const name = getMyNameSafe();
        const profile = getMyProfileSafe();

        if (vhNet.active && vhNet.connected) {
            vhNetSend({ type: 'VH_HELLO', name, profile });
            renderVerhoerOnlineModal();
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

        if (joinCode) {
            if (gameTab === 'verhoer') {
                if (typeof setGameSubTab === 'function') setGameSubTab('verhoer');
                openVerhoerOnlineModal();
                setTimeout(() => vhNetJoinRoom(joinCode), 120);
            } else {
                if (typeof setGameSubTab === 'function') setGameSubTab('arena');
                const modeSel = document.getElementById('select-game-mode');
                if (modeSel) {
                    modeSel.value = 'online';
                    if (typeof onGameConfigChange === 'function') onGameConfigChange();
                }
                const inp = document.getElementById('p2p-join-input');
                if (inp) inp.value = joinCode;
                setTimeout(() => {
                    if (typeof p2pJoinRoom === 'function') p2pJoinRoom();
                }, 150);
            }
            return;
        }

        if (roomCode) {
            const targetMode = gameTab === 'sudoku' ? 'sudoku' : 'daily';
            if (typeof setGameSubTab === 'function') setGameSubTab(targetMode);
            openClassroomModal(targetMode);
            setTimeout(() => crJoinRoom(targetMode, roomCode), 150);
        }
    }

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || window.__CR_LOCK_CLOSE) return;
        ['mp-qr-zoom-modal', 'vh-online-modal', 'cr-modal'].forEach(id => {
            const m = document.getElementById(id);
            if (m && !m.classList.contains('hidden') && !m.classList.contains('opacity-0')) {
                if (typeof toggleModalState === 'function') toggleModalState(id);
            }
        });
    });

    function bootMultiplayerSuite() {
        injectSharedModals();
        enhanceArenaP2PPanel();
        enhanceVerhoerUIAndHooks();
        enhanceClassroomUIAndHooks();
        wireIdentityHooks();
    }

    window.BlinkMultiplayer = {
        handleDeepLink,
        openQrZoom: openQrZoomModal,
        vhOpenModal: openVerhoerOnlineModal,
        vhCreateRoom: vhNetCreateRoom,
        vhJoinRoom: vhNetJoinRoom,
        vhStartOnline: vhHostStartOnlineMatch,
        vhDisconnect: () => vhNetDisconnect(false),
        vhDefenderPick: (slotIdx) => vhNetDispatchAction({ kind: 'DEFENDER_SHOW_CARD', idx: slotIdx }),
        openClassroom: openClassroomModal,
        crCreate: crCreateRoom,
        crJoin: crJoinRoom,
        crStartRound: crHostStartRound,
        crEndRound: () => crHostEndRound('Runde vom Host ausgewertet!'),
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