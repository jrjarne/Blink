// ============================================================================
// BLINK CLOUD-KONTO (SUPABASE AUTH + AUTO-SYNC ALLER SPIELSTÄNDE)
// Synchronisiert: Name · Charakter · Elo · Trainierte KIs · Daily · Cascade · Theme
// ============================================================================
(function initBlinkCloudAuth() {
    if (window.__BLINK_CLOUD_AUTH_READY) return;
    window.__BLINK_CLOUD_AUTH_READY = true;

    // >>> HIER DEINE BEIDEN WERTE AUS SUPABASE EINTRAGEN <<<
    const SUPABASE_URL = 'https://yhrygshzcsxqtazthqoh.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_FxNo8kmUXxW55Ol3vJPyUg_Tlldy6ag';

    const SYNTHETIC_DOMAIN = 'blink-account.app';
    const STORAGE_PREFIX = 'blink_';

    const cloudState = {
        client: null,
        configured: false,
        user: null,
        username: '',
        busy: false,
        lastSyncAt: null,
        statusMsg: '',
        statusTone: 'neutral', // 'neutral' | 'ok' | 'err'
        activeTab: 'avatar',   // 'avatar' | 'account'
        syncTimer: null,
        isRestoring: false
    };

    function isConfigured() {
        return Boolean(
            SUPABASE_URL &&
            SUPABASE_PUBLISHABLE_KEY &&
            !SUPABASE_URL.includes('DEINE-PROJEKT-ID') &&
            !SUPABASE_PUBLISHABLE_KEY.includes('DEIN_KEY_HIER') &&
            window.supabase &&
            typeof window.supabase.createClient === 'function'
        );
    }

    function esc(str) {
        return String(str || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    function normalizeUsername(raw) {
        return String(raw || '').trim().toLowerCase();
    }

    function usernameToEmail(username) {
        return `${normalizeUsername(username)}@${SYNTHETIC_DOMAIN}`;
    }

    function emailToUsername(email) {
        return String(email || '').split('@')[0] || '';
    }

    function validateCredentials(rawUser, password) {
        const u = normalizeUsername(rawUser);
        if (!/^[a-z0-9._-]{3,20}$/.test(u)) {
            return { ok: false, error: 'Benutzername: 3–20 Zeichen (Buchstaben, Zahlen, . _ - ohne Leerzeichen).' };
        }
        if (!password || password.length < 6) {
            return { ok: false, error: 'Das Passwort muss mindestens 6 Zeichen lang sein.' };
        }
        return { ok: true, username: u };
    }

    // ------------------------------------------------------------------------
    // 1. LOKALEN SPIELSTAND SAMMELN & WIEDERHERSTELLEN (ALLE blink_*-KEYS)
    // ------------------------------------------------------------------------
    function collectLocalSaveData() {
        const data = {};
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (!k || !k.startsWith(STORAGE_PREFIX)) continue;
                data[k] = localStorage.getItem(k);
            }
        } catch (e) {}
        return data;
    }

    function clearLocalBlinkKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
        }
        keys.forEach(k => localStorage.removeItem(k));
    }

    function applyCloudSaveData(saveData) {
        if (!saveData || typeof saveData !== 'object') return;
        cloudState.isRestoring = true;
        try {
            clearLocalBlinkKeys();
            Object.entries(saveData).forEach(([k, v]) => {
                if (k.startsWith(STORAGE_PREFIX) && typeof v === 'string') {
                    localStorage.setItem(k, v);
                }
            });
        } finally {
            cloudState.isRestoring = false;
        }
    }

    function readSummaryFromLocal() {
        let displayName = 'Spieler';
        let elo = 700;
        let avatar = null;
        try {
            const n = (localStorage.getItem('blink_player_name_v1') || '').trim();
            if (n) displayName = n;
            const rawElo = localStorage.getItem('blink_player_elo_v1');
            if (rawElo) {
                const parsed = JSON.parse(rawElo);
                if (typeof parsed.elo === 'number') elo = Math.round(parsed.elo);
            }
            const rawAv = localStorage.getItem('blink_player_avatar_v1');
            if (rawAv) avatar = JSON.parse(rawAv);
        } catch (e) {}
        return { displayName, elo, avatar };
    }

    // ------------------------------------------------------------------------
    // 2. CLOUD-SYNC (PUSH & PULL)
    // ------------------------------------------------------------------------
    async function pushToCloud(silent = true) {
        if (!cloudState.client || !cloudState.user || cloudState.isRestoring) return false;
        const saveData = collectLocalSaveData();
        const summary = readSummaryFromLocal();
        const payload = {
            id: cloudState.user.id,
            username: cloudState.username || emailToUsername(cloudState.user.email),
            display_name: summary.displayName,
            elo: summary.elo,
            avatar: summary.avatar,
            save_data: saveData,
            updated_at: new Date().toISOString()
        };

        const { error } = await cloudState.client
            .from('blink_profiles')
            .upsert(payload, { onConflict: 'id' });

        if (error) {
            if (!silent) {
                setCloudFeedback(`Sync fehlgeschlagen: ${error.message}`, 'err');
                if (typeof showSonnerToast === 'function') showSonnerToast('Cloud-Sync fehlgeschlagen.', 'warn');
            }
            return false;
        }

        cloudState.lastSyncAt = new Date();
        if (!silent) {
            setCloudFeedback('Spielstand erfolgreich in der Cloud gespeichert.', 'ok');
            if (typeof showSonnerToast === 'function') showSonnerToast('Cloud-Spielstand synchronisiert!', 'success');
        }
        renderCloudAccountView();
        updateHeaderCloudDot();
        return true;
    }

    async function pullFromCloud() {
        if (!cloudState.client || !cloudState.user) return null;
        const { data, error } = await cloudState.client
            .from('blink_profiles')
            .select('username, display_name, elo, avatar, save_data, updated_at')
            .eq('id', cloudState.user.id)
            .maybeSingle();

        if (error) return null;
        return data || null;
    }

    function scheduleAutoSync() {
        if (!cloudState.client || !cloudState.user || cloudState.isRestoring) return;
        if (cloudState.syncTimer) clearTimeout(cloudState.syncTimer);
        cloudState.syncTimer = setTimeout(() => {
            cloudState.syncTimer = null;
            pushToCloud(true);
        }, 1400);
    }

    function hookLocalStorageAutoSync() {
        if (Storage.prototype.__blinkCloudHooked) return;
        const origSet = Storage.prototype.setItem;
        const origRemove = Storage.prototype.removeItem;

        Storage.prototype.setItem = function (key, value) {
            origSet.apply(this, arguments);
            if (this === window.localStorage && typeof key === 'string' && key.startsWith(STORAGE_PREFIX)) {
                scheduleAutoSync();
            }
        };
        Storage.prototype.removeItem = function (key) {
            origRemove.apply(this, arguments);
            if (this === window.localStorage && typeof key === 'string' && key.startsWith(STORAGE_PREFIX)) {
                scheduleAutoSync();
            }
        };
        Storage.prototype.__blinkCloudHooked = true;

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && cloudState.user) {
                pushToCloud(true);
            }
        });
    }

    // ------------------------------------------------------------------------
    // 3. AUTH-AKTIONEN: REGISTRIEREN · ANMELDEN · PASSWORT · ABMELDEN
    // ------------------------------------------------------------------------
    function translateAuthError(msg) {
        const m = String(msg || '').toLowerCase();
        if (m.includes('invalid login credentials')) return 'Benutzername oder Passwort stimmt nicht.';
        if (m.includes('already registered')) return 'Dieser Benutzername ist bereits vergeben.';
        if (m.includes('email not confirmed')) return 'In Supabase ist „Confirm email“ noch aktiv — bitte dort ausschalten.';
        if (m.includes('rate limit')) return 'Zu viele Versuche — bitte kurz warten.';
        return msg || 'Unbekannter Fehler bei der Anmeldung.';
    }

    function setCloudFeedback(msg, tone = 'neutral') {
        cloudState.statusMsg = msg;
        cloudState.statusTone = tone;
        renderCloudAccountView();
    }

    async function handleRegister() {
        if (!cloudState.client || cloudState.busy) return;
        const uInp = document.getElementById('cloud-user-input');
        const pInp = document.getElementById('cloud-pass-input');
        const check = validateCredentials(uInp?.value, pInp?.value);
        if (!check.ok) {
            setCloudFeedback(check.error, 'err');
            return;
        }

        cloudState.busy = true;
        setCloudFeedback('Erstelle Konto & sichere deinen aktuellen Stand...', 'neutral');

        // Wenn Spieler noch Standardnamen hat, übernehmen wir den Benutzernamen als Anzeigenamen
        if (!localStorage.getItem('blink_player_name_v1')) {
            if (typeof setPlayerName === 'function') setPlayerName(check.username);
            else localStorage.setItem('blink_player_name_v1', check.username);
        }

        const { data, error } = await cloudState.client.auth.signUp({
            email: usernameToEmail(check.username),
            password: pInp.value
        });

        cloudState.busy = false;
        if (error) {
            setCloudFeedback(translateAuthError(error.message), 'err');
            return;
        }
        if (!data.session) {
            setCloudFeedback('Konto angelegt, aber „Confirm email“ ist in Supabase noch an. Bitte dort ausschalten und neu anmelden.', 'err');
            return;
        }

        cloudState.user = data.user;
        cloudState.username = check.username;
        await pushToCloud(true);
        if (typeof playSound === 'function') playSound('win');
        if (typeof showSonnerToast === 'function') showSonnerToast(`Konto „${check.username}“ erstellt & synchronisiert!`, 'success');
        setCloudFeedback('Konto aktiv — alle Änderungen werden automatisch gespeichert.', 'ok');
        updateHeaderCloudDot();
    }

    async function handleLogin() {
        if (!cloudState.client || cloudState.busy) return;
        const uInp = document.getElementById('cloud-user-input');
        const pInp = document.getElementById('cloud-pass-input');
        const check = validateCredentials(uInp?.value, pInp?.value);
        if (!check.ok) {
            setCloudFeedback(check.error, 'err');
            return;
        }

        cloudState.busy = true;
        setCloudFeedback('Melde an & lade deinen Cloud-Spielstand...', 'neutral');

        const { data, error } = await cloudState.client.auth.signInWithPassword({
            email: usernameToEmail(check.username),
            password: pInp.value
        });

        cloudState.busy = false;
        if (error) {
            setCloudFeedback(translateAuthError(error.message), 'err');
            return;
        }

        cloudState.user = data.user;
        cloudState.username = check.username;
        const remote = await pullFromCloud();
        if (remote && remote.save_data && Object.keys(remote.save_data).length > 0) {
            applyCloudSaveData(remote.save_data);
            if (typeof showSonnerToast === 'function') showSonnerToast(`Willkommen zurück, ${remote.display_name || check.username}!`, 'success');
            setTimeout(() => window.location.reload(), 420);
        } else {
            await pushToCloud(true);
            setCloudFeedback('Angemeldet & aktuellen Stand gesichert.', 'ok');
            updateHeaderCloudDot();
        }
    }

    async function handlePasswordChange() {
        if (!cloudState.client || !cloudState.user || cloudState.busy) return;
        const newPassInp = document.getElementById('cloud-newpass-input');
        const np = newPassInp ? newPassInp.value : '';
        if (np.length < 6) {
            setCloudFeedback('Neues Passwort muss mindestens 6 Zeichen lang sein.', 'err');
            return;
        }
        cloudState.busy = true;
        setCloudFeedback('Aktualisiere Passwort...', 'neutral');
        const { error } = await cloudState.client.auth.updateUser({ password: np });
        cloudState.busy = false;
        if (error) {
            setCloudFeedback(translateAuthError(error.message), 'err');
            return;
        }
        if (newPassInp) newPassInp.value = '';
        if (typeof playSound === 'function') playSound('tick');
        setCloudFeedback('Passwort erfolgreich geändert!', 'ok');
    }

    async function handleLogout(resetDevice = false) {
        if (!cloudState.client || cloudState.busy) return;
        cloudState.busy = true;
        await pushToCloud(true);
        await cloudState.client.auth.signOut();
        cloudState.user = null;
        cloudState.username = '';
        cloudState.lastSyncAt = null;
        cloudState.busy = false;

        if (resetDevice) {
            clearLocalBlinkKeys();
            if (typeof showSonnerToast === 'function') showSonnerToast('Abgemeldet & Gerät zurückgesetzt.', 'neutral');
            setTimeout(() => window.location.reload(), 380);
            return;
        }

        updateHeaderCloudDot();
        setCloudFeedback('Erfolgreich abgemeldet. Lokaler Stand bleibt auf diesem Gerät.', 'neutral');
        if (typeof showSonnerToast === 'function') showSonnerToast('Aus Cloud-Konto abgemeldet.', 'neutral');
    }

    // ------------------------------------------------------------------------
    // 4. UI-INTEGRATION DIREKT IM BESTEHENDEN #profile-modal (APPLE SHEET)
    // ------------------------------------------------------------------------
    function updateHeaderCloudDot() {
        const btn = document.getElementById('header-profile-btn');
        if (!btn) return;
        btn.style.position = 'relative';
        btn.style.overflow = 'visible';
        let dot = document.getElementById('header-cloud-dot');
        if (!dot) {
            dot = document.createElement('span');
            dot.id = 'header-cloud-dot';
            dot.className = 'cloud-status-dot';
            btn.appendChild(dot);
        }
        dot.classList.toggle('is-online', Boolean(cloudState.user));
        dot.title = cloudState.user ? `Cloud aktiv (${cloudState.username})` : 'Nicht angemeldet (nur lokal)';
    }

    function setProfileSheetTab(tab = 'avatar', silent = false) {
        cloudState.activeTab = tab === 'account' ? 'account' : 'avatar';
        if (!silent && typeof playSound === 'function') playSound('tick');

        const avatarBody = document.getElementById('profile-avatar-editor-body');
        const cloudBody = document.getElementById('profile-cloud-account-body');
        if (avatarBody) avatarBody.classList.toggle('hidden', cloudState.activeTab !== 'avatar');
        if (cloudBody) cloudBody.classList.toggle('hidden', cloudState.activeTab !== 'account');

        ['avatar', 'account'].forEach(t => {
            const b = document.getElementById(`profile-sheet-tab-${t}`);
            if (b) b.className = `relative z-10 px-3.5 py-1 rounded-full text-[11px] transition-colors ${t === cloudState.activeTab ? 'pill-btn-active' : 'pill-btn-idle'}`;
        });

        if (typeof moveSlidingPill === 'function') {
            requestAnimationFrame(() => moveSlidingPill('profile-sheet-tabs', `profile-sheet-tab-${cloudState.activeTab}`));
        }
        if (cloudState.activeTab === 'account') renderCloudAccountView();
    }

    function injectProfileSheetTabs() {
        const modal = document.getElementById('profile-modal');
        if (!modal || document.getElementById('profile-sheet-tabs')) return;

        const sheet = modal.querySelector('.apple-profile-sheet');
        const header = sheet ? sheet.querySelector('.apple-set-header') : null;
        const editorGrid = sheet ? sheet.querySelector('.grid.grid-cols-1') : null;
        if (!sheet || !header || !editorGrid) return;

        editorGrid.id = 'profile-avatar-editor-body';

        const tabWrap = document.createElement('div');
        tabWrap.className = 'flex items-center justify-between gap-2 flex-wrap';
        tabWrap.innerHTML = `
            <div id="profile-sheet-tabs" class="relative inline-flex items-center bg-slate-950/85 p-1 rounded-full border border-white/10 gap-1">
                <div class="sliding-pill-bg sliding-pill-cyan"></div>
                <button type="button" id="profile-sheet-tab-avatar" onclick="window.BlinkCloudAuth.setTab('avatar')" class="relative z-10 px-3.5 py-1 rounded-full text-[11px] transition-colors pill-btn-active">Charakter &amp; Name</button>
                <button type="button" id="profile-sheet-tab-account" onclick="window.BlinkCloudAuth.setTab('account')" class="relative z-10 px-3.5 py-1 rounded-full text-[11px] transition-colors pill-btn-idle">Cloud-Konto</button>
            </div>
            <span id="profile-cloud-pill-badge" class="text-[10.5px] mono text-slate-400"></span>
        `;

        const cloudBody = document.createElement('div');
        cloudBody.id = 'profile-cloud-account-body';
        cloudBody.className = 'hidden space-y-4';

        header.insertAdjacentElement('afterend', tabWrap);
        editorGrid.insertAdjacentElement('afterend', cloudBody);

        // Beim Öffnen des Profil-Modals Pill-Position sauber synchronisieren
        if (typeof window.toggleProfileModal === 'function' && !window.toggleProfileModal.__cloudWrapped) {
            const origToggle = window.toggleProfileModal;
            const wrapped = function () {
                origToggle();
                requestAnimationFrame(() => setProfileSheetTab(cloudState.activeTab, true));
            };
            wrapped.__cloudWrapped = true;
            window.toggleProfileModal = wrapped;
        }
    }

    function renderCloudAccountView() {
        const box = document.getElementById('profile-cloud-account-body');
        const badge = document.getElementById('profile-cloud-pill-badge');

        if (badge) {
            if (!cloudState.configured) {
                badge.innerHTML = `<span class="text-amber-300">● Supabase-Keys fehlen noch</span>`;
            } else if (cloudState.user) {
                badge.innerHTML = `<span class="text-emerald-400 font-bold">● Angemeldet: ${esc(cloudState.username)}</span>`;
            } else {
                badge.innerHTML = `<span>○ Nur lokal gespeichert</span>`;
            }
        }
        if (!box) return;

        const feedbackHtml = cloudState.statusMsg ? `
            <div class="px-3.5 py-2.5 rounded-xl text-xs font-medium border ${
                cloudState.statusTone === 'err' ? 'bg-rose-500/12 border-rose-500/35 text-rose-300' :
                (cloudState.statusTone === 'ok' ? 'bg-emerald-500/12 border-emerald-400/35 text-emerald-300' : 'bg-white/[0.04] border-white/10 text-slate-300')
            }">${esc(cloudState.statusMsg)}</div>
        ` : '';

        if (!cloudState.configured) {
            box.innerHTML = `
                <div class="mp-share-card space-y-2.5">
                    <div class="text-xs font-extrabold text-amber-300 mono uppercase tracking-wider">Einrichtung fast fertig</div>
                    <p class="text-xs text-slate-300 leading-relaxed">
                        Trage ganz oben in <span class="mono text-white font-bold">cloud-auth.js</span> deine <strong class="text-white">SUPABASE_URL</strong> und deinen <strong class="text-white">SUPABASE_PUBLISHABLE_KEY</strong> ein und lade die Seite neu. Danach kannst du dich hier direkt mit Benutzername &amp; Passwort anmelden.
                    </p>
                </div>
            `;
            return;
        }

        if (cloudState.user) {
            const summary = readSummaryFromLocal();
            const syncLabel = cloudState.lastSyncAt
                ? cloudState.lastSyncAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : 'aktiv';

            box.innerHTML = `
                ${feedbackHtml}
                <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div class="md:col-span-6 space-y-3">
                        <div class="apple-set-section-label">Aktives Cloud-Konto</div>
                        <div class="apple-inset-group">
                            <div class="apple-set-row">
                                <span class="text-xs text-slate-400">Benutzername</span>
                                <span class="text-xs font-extrabold text-cyan-300 mono">${esc(cloudState.username)}</span>
                            </div>
                            <div class="apple-set-row">
                                <span class="text-xs text-slate-400">Anzeigename &amp; Elo</span>
                                <span class="text-xs font-bold text-white mono">${esc(summary.displayName)} · ${summary.elo} Elo</span>
                            </div>
                            <div class="apple-set-row">
                                <span class="text-xs text-slate-400">Letzter Auto-Sync</span>
                                <span class="text-xs font-bold text-emerald-300 mono">${esc(syncLabel)}</span>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <button type="button" onclick="window.BlinkCloudAuth.syncNow()" ${cloudState.busy ? 'disabled' : ''} class="flex-1 py-2.5 px-4 rounded-full bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 font-extrabold text-xs transition">
                                Jetzt synchronisieren
                            </button>
                            <button type="button" onclick="window.BlinkCloudAuth.logout(false)" ${cloudState.busy ? 'disabled' : ''} class="py-2.5 px-4 rounded-full border border-white/15 bg-white/[0.05] hover:bg-white/[0.12] text-slate-200 font-semibold text-xs transition">
                                Abmelden
                            </button>
                        </div>
                    </div>

                    <div class="md:col-span-6 space-y-3">
                        <div class="apple-set-section-label">Sicherheit &amp; Leih-Geräte</div>
                        <div class="apple-inset-group">
                            <div class="apple-set-row">
                                <label for="cloud-newpass-input" class="text-xs text-slate-300 shrink-0">Neues Passwort</label>
                                <input id="cloud-newpass-input" type="password" minlength="6" placeholder="Min. 6 Zeichen" class="apple-inset-name-input flex-1 min-w-0 bg-transparent text-right text-xs font-bold text-white placeholder-slate-500 focus:outline-none">
                            </div>
                        </div>
                        <button type="button" onclick="window.BlinkCloudAuth.changePassword()" ${cloudState.busy ? 'disabled' : ''} class="w-full py-2 rounded-full bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 text-xs font-bold text-white transition">
                            Passwort speichern
                        </button>
                        <button type="button" onclick="window.BlinkCloudAuth.logout(true)" ${cloudState.busy ? 'disabled' : ''} class="w-full py-2 rounded-full border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition">
                            Abmelden &amp; lokales Gerät leeren (für Leih-iPads)
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        // Ausgeloggte Ansicht: Login & Registrieren
        box.innerHTML = `
            ${feedbackHtml}
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                <div class="md:col-span-7 space-y-3">
                    <div class="apple-set-section-label">Anmelden oder neues Konto erstellen</div>
                    <div class="apple-inset-group">
                        <div class="apple-set-row">
                            <label for="cloud-user-input" class="text-xs font-medium text-slate-300 shrink-0">Benutzername</label>
                            <input id="cloud-user-input" type="text" maxlength="20" autocomplete="username" placeholder="z. B. jarne99"
                                class="apple-inset-name-input flex-1 min-w-0 bg-transparent text-right text-xs font-bold text-white placeholder-slate-500 focus:outline-none">
                        </div>
                        <div class="apple-set-row">
                            <label for="cloud-pass-input" class="text-xs font-medium text-slate-300 shrink-0">Passwort</label>
                            <input id="cloud-pass-input" type="password" autocomplete="current-password" placeholder="Mindestens 6 Zeichen"
                                onkeydown="if(event.key==='Enter') window.BlinkCloudAuth.login()"
                                class="apple-inset-name-input flex-1 min-w-0 bg-transparent text-right text-xs font-bold text-white placeholder-slate-500 focus:outline-none">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2.5 pt-0.5">
                        <button type="button" onclick="window.BlinkCloudAuth.login()" ${cloudState.busy ? 'disabled' : ''} class="py-2.5 px-4 rounded-full bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 font-extrabold text-xs transition shadow-lg shadow-cyan-500/15">
                            Anmelden
                        </button>
                        <button type="button" onclick="window.BlinkCloudAuth.register()" ${cloudState.busy ? 'disabled' : ''} class="py-2.5 px-4 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 disabled:opacity-50 text-white font-bold text-xs transition">
                            Konto erstellen
                        </button>
                    </div>
                </div>

                <div class="md:col-span-5 space-y-2">
                    <div class="apple-set-section-label">Was wird gespeichert?</div>
                    <div class="mp-share-card space-y-2 text-[11.5px] text-slate-300 leading-relaxed">
                        <div>✓ <strong class="text-white">Name &amp; Charakter</strong> (Frisur, Farben, Accessoire)</div>
                        <div>✓ <strong class="text-white">Spieler-Elo &amp; Rang</strong> + Verlauf</div>
                        <div>✓ <strong class="text-white">Trainierte KIs</strong> (Logos, Werte &amp; KI-Elo)</div>
                        <div>✓ <strong class="text-white">Daily-Streak, Cascade &amp; Theme</strong></div>
                        <p class="text-[10.5px] text-slate-400 pt-1 border-t border-white/[0.08]">Beim Erstellen eines Kontos wird dein aktueller Spielstand auf diesem Gerät direkt übernommen.</p>
                    </div>
                </div>
            </div>
        `;
    }

    // ------------------------------------------------------------------------
    // 5. BOOT & BESTEHENDE SESSION PRÜFEN
    // ------------------------------------------------------------------------
    async function bootCloudAuth() {
        injectProfileSheetTabs();
        hookLocalStorageAutoSync();

        if (!isConfigured()) {
            cloudState.configured = false;
            renderCloudAccountView();
            updateHeaderCloudDot();
            return;
        }

        cloudState.configured = true;
        cloudState.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

        try {
            const { data } = await cloudState.client.auth.getSession();
            if (data && data.session && data.session.user) {
                cloudState.user = data.session.user;
                cloudState.username = emailToUsername(data.session.user.email);

                // Beim Laden prüfen, ob in der Cloud ein neuerer Spielstand liegt
                const remote = await pullFromCloud();
                if (remote && remote.save_data) {
                    const localSig = JSON.stringify(collectLocalSaveData());
                    const remoteSig = JSON.stringify(remote.save_data);
                    if (remoteSig !== localSig && Object.keys(remote.save_data).length > 0 && !sessionStorage.getItem('blink_cloud_hydrated')) {
                        sessionStorage.setItem('blink_cloud_hydrated', '1');
                        applyCloudSaveData(remote.save_data);
                        window.location.reload();
                        return;
                    }
                }
                cloudState.lastSyncAt = new Date();
            }
        } catch (e) {}

        updateHeaderCloudDot();
        renderCloudAccountView();
    }

    window.BlinkCloudAuth = {
        setTab: setProfileSheetTab,
        login: handleLogin,
        register: handleRegister,
        syncNow: () => pushToCloud(false),
        changePassword: handlePasswordChange,
        logout: handleLogout
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootCloudAuth);
    } else {
        bootCloudAuth();
    }
})();