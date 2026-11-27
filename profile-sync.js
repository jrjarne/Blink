// ============================================================================
// PROFIL-PERSISTENZ: DOPPEL-SICHERUNG (localStorage + IndexedDB)
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

  let cachedDbPromise = null;
  function openVaultDB() {
    if (cachedDbPromise) return cachedDbPromise;
    cachedDbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('No IndexedDB'));
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onclose = () => { cachedDbPromise = null; };
        db.onversionchange = () => { db.close(); cachedDbPromise = null; };
        resolve(db);
      };
      req.onerror = () => {
        cachedDbPromise = null;
        reject(req.error);
      };
    });
    return cachedDbPromise;
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

  async function clearVault() {
    clearTimeout(mirrorTimer);
    try {
      const db = await openVaultDB();
      await new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(IDB_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
      });
    } catch (e) {}
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
    const el = document.getElementById('player-name-input');
    if (!el || el.dataset.instantNameBound) return;
    el.dataset.instantNameBound = '1';
    let t = null;
    el.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (typeof setPlayerName === 'function') setPlayerName(el.value);
      }, 250);
    });
  }
  bindInstantNameInputs();

  window.BlinkProfileSync = { clearVault };
})();
