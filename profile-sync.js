// ============================================================================
// PROFIL-PERSISTENZ: DOPPEL-SICHERUNG (localStorage + IndexedDB) & BACKUP
// ============================================================================
(function initBlinkProfilePersistence() {
  if (window.__BLINK_PROFILE_SYNC_READY) return;
  window.__BLINK_PROFILE_SYNC_READY = true;

  const IDB_NAME = 'blink_profile_vault_v1';
  const IDB_STORE = 'snapshot';
  const IDB_KEY = 'latest';

  function isBlinkProfileKey(key) {
    if (!key || typeof key !== 'string') return false;
    if (key.startsWith('blink_')) return true;
    return /^(elo|player|ai_|brain|daily|sudoku|endgame|cascade|record)/i.test(key);
  }

  function collectProfileSnapshot() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (isBlinkProfileKey(k)) {
        data[k] = localStorage.getItem(k);
      }
    }
    return { v: 1, savedAt: Date.now(), data };
  }

  function openVaultDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('No IndexedDB'));
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveSnapshotToIDB(snapshot) {
    try {
      const db = await openVaultDB();
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(snapshot, IDB_KEY);
    } catch (e) {}
  }

  async function loadSnapshotFromIDB() {
    try {
      const db = await openVaultDB();
      return await new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }

  let mirrorTimer = null;
  function scheduleMirrorToIDB() {
    clearTimeout(mirrorTimer);
    mirrorTimer = setTimeout(() => {
      const snap = collectProfileSnapshot();
      if (Object.keys(snap.data).length > 0) saveSnapshotToIDB(snap);
    }, 150);
  }

  // 1. Browser um dauerhaften Speicher bitten (schützt vor automatischem Löschen)
  if (navigator.storage && typeof navigator.storage.persist === 'function') {
    navigator.storage.persist().catch(() => {});
  }

  // 2. Jeden Schreibvorgang in localStorage automatisch nach IndexedDB spiegeln
  const origSetItem = Storage.prototype.setItem;
  const origRemoveItem = Storage.prototype.removeItem;

  Storage.prototype.setItem = function (key, value) {
    origSetItem.call(this, key, value);
    if (this === window.localStorage && isBlinkProfileKey(key)) {
      scheduleMirrorToIDB();
    }
  };

  Storage.prototype.removeItem = function (key) {
    origRemoveItem.call(this, key);
    if (this === window.localStorage && isBlinkProfileKey(key)) {
      scheduleMirrorToIDB();
    }
  };

  // 3. Beim Laden: Falls localStorage leer ist, automatisch aus IndexedDB wiederherstellen
  async function syncOnStartup() {
    const hasElo = Boolean(localStorage.getItem('blink_player_elo_v1'));
    const hasName = Boolean(localStorage.getItem('blink_player_name_v1'));

    if (hasElo || hasName) {
      scheduleMirrorToIDB();
      return;
    }

    const saved = await loadSnapshotFromIDB();
    if (saved && saved.data && Object.keys(saved.data).length > 0) {
      Object.entries(saved.data).forEach(([k, v]) => {
        if (typeof v === 'string') origSetItem.call(localStorage, k, v);
      });
      if (!sessionStorage.getItem('blink_idb_restored')) {
        sessionStorage.setItem('blink_idb_restored', '1');
        window.location.reload();
      }
    }
  }
  syncOnStartup();

  // 4. Spielername sofort beim Tippen speichern (nicht erst nach Wegklicken)
  function bindInstantNameInputs() {
    ['player-name-input', 'settings-player-name-input'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el || el.dataset.instantNameBound) return;
      el.dataset.instantNameBound = '1';
      let t = null;
      el.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          if (typeof setPlayerName === 'function') setPlayerName(el.value);
        }, 250);
      });
    });
  }
  bindInstantNameInputs();

  // 5. UTF-8-sichere Kodierung für Backup-Codes & Datei-Export
  function encodeProfileCode(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return 'BLINK1:' + btoa(bin);
  }

  function decodeProfileCode(raw) {
    const clean = (raw || '').trim();
    if (!clean) throw new Error('Leerer Code');
    if (clean.startsWith('{')) return JSON.parse(clean);
    const b64 = clean.replace(/^BLINK1:/i, '').replace(/\s+/g, '');
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  async function applyRestoredSnapshot(parsed) {
    const data = parsed && parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
    if (!data || typeof data !== 'object') throw new Error('Ungültiges Format');

    let restoredCount = 0;
    Object.entries(data).forEach(([k, v]) => {
      if (isBlinkProfileKey(k) && typeof v === 'string') {
        origSetItem.call(localStorage, k, v);
        restoredCount++;
      }
    });
    if (restoredCount === 0) throw new Error('Keine Profil-Daten enthalten');

    await saveSnapshotToIDB(collectProfileSnapshot());
    if (typeof showSonnerToast === 'function') {
      showSonnerToast('Profil erfolgreich wiederhergestellt! Seite wird aktualisiert...', 'success');
    }
    setTimeout(() => window.location.reload(), 550);
  }

  window.copyProfileBackupCode = function () {
    const snap = collectProfileSnapshot();
    const code = encodeProfileCode(snap);
    const input = document.getElementById('profile-backup-input');
    if (input) input.value = code;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        if (typeof showSonnerToast === 'function') {
          showSonnerToast('Backup-Code kopiert! Sicher aufbewahren oder auf dem Handy einfügen.', 'success');
        }
      }).catch(() => {
        if (input) { input.select(); }
        if (typeof showSonnerToast === 'function') {
          showSonnerToast('Code im Feld angezeigt – bitte manuell kopieren.', 'neutral');
        }
      });
    }
  };

  window.restoreProfileBackupCode = async function () {
    const input = document.getElementById('profile-backup-input');
    const raw = input ? input.value : '';
    try {
      const parsed = decodeProfileCode(raw);
      await applyRestoredSnapshot(parsed);
    } catch (e) {
      if (typeof showSonnerToast === 'function') {
        showSonnerToast('Ungültiger Backup-Code – bitte vollständig einfügen.', 'warn');
      }
    }
  };

  window.downloadProfileBackupFile = function () {
    const snap = collectProfileSnapshot();
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const name = (typeof getPlayerName === 'function' ? getPlayerName() : 'blink').replace(/[^a-z0-9_-]/gi, '_');
    a.href = url;
    a.download = `blink-profil-${name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (typeof showSonnerToast === 'function') {
      showSonnerToast('Profil-Backup als JSON-Datei gespeichert.', 'success');
    }
  };

  window.importProfileBackupFile = function (fileInput) {
    const file = fileInput && fileInput.files ? fileInput.files[0] : null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = decodeProfileCode(String(reader.result || ''));
        await applyRestoredSnapshot(parsed);
      } catch (e) {
        if (typeof showSonnerToast === 'function') {
          showSonnerToast('Die gewählte Datei ist kein gültiges Blink-Backup.', 'warn');
        }
      }
    };
    reader.readAsText(file);
    fileInput.value = '';
  };
})();