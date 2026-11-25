// 8. BLINK SPIELMODUS (INKL. STANDARD, CLUSTER & DAS VERHÖR)
// ============================================================================
const gameState = {
    initialized: false,
    mode: 'ai',
    ruleMode: 'normal', // 'normal' | 'cluster' | 'verhoer'
    aiIntervalMs: 2800,
    isRunning: false,
    centerPiles: [null, null],
    discardHistory: [],
    playerDeck: [],
    playerHand: [],
    aiDeck: [],
    aiHand: [],
    playerTrios: [],
    aiTrios: [],
    verhoerTurn: 'player', // 'player' | 'ai'
    verhoerPhase: 'draw',  // 'draw' | 'action' | 'interrogation' | 'bonus_discard'
    verhoerXRayOpen: false,
    aiMemory: { knownPlayerCards: [], demandedProps: [], lastBotThought: '' },
    recalledCardKey: null,
    pendingVerhoerCard: null,
    pendingVerhoerIdx: null,
    selectedHandIndex: null,
    draggedHandIndex: null,
    moveCount: 0,
    streak: 0,
    startTime: 0,
    timerInterval: null,
    aiTimer: null,
    isTrainingMatch: false,
    trainingPauseCount: 0,
    movesSincePause: 0,
    pauseStartedAt: 0,
    pendingPauseChoices: null,
    trainingSnapshot: null
};
// ============================================================================
// EINHEITLICHES ELO-SYSTEM (SPIELER, STANDARD-BOTS & TRAINIERTE KIs)
// ============================================================================
const BOT_ANCHOR_ELOS = {
    iron: 600,
    bronze: 775,
    silver: 925,
    gold: 1075,
    platinum: 1250,
    emerald: 1450,
    diamond: 1650,
    master: 1850,
    grandmaster: 2000
};

const BOT_DIFFICULTY_PRESETS = {
    iron: { intervalMs: 4800, label: 'Blink-Bot (Iron)' },
    bronze: { intervalMs: 4100, label: 'Blink-Bot (Bronze)' },
    silver: { intervalMs: 3450, label: 'Blink-Bot (Silver)' },
    gold: { intervalMs: 2850, label: 'Blink-Bot (Gold)' },
    platinum: { intervalMs: 2350, label: 'Blink-Bot (Platinum)' },
    emerald: { intervalMs: 1900, label: 'Blink-Bot (Emerald)' },
    diamond: { intervalMs: 1500, label: 'Blink-Bot (Diamond)' },
    master: { intervalMs: 1150, label: 'Blink-Bot (Master)' },
    grandmaster: { intervalMs: 880, label: 'Blink-Bot (Grandmaster)' }
};

function loadPlayerEloState() {
    try {
        const raw = localStorage.getItem('blink_player_elo_v1');
        if (raw) {
            const p = JSON.parse(raw);
            if (typeof p.elo === 'number') {
                if (p.elo === 1000 && !p.wins && !p.losses && !p.soloRuns) {
                    p.elo = 700;
                    p.history = [700];
                }
                return p;
            }
        }
    } catch (e) { }
    return { elo: 700, wins: 0, losses: 0, soloRuns: 0, history: [700] };
}

const playerEloState = loadPlayerEloState();

function savePlayerEloState() {
    try {
        localStorage.setItem('blink_player_elo_v1', JSON.stringify(playerEloState));
    } catch (e) { }
}

function getPlayerName() {
    const saved = (localStorage.getItem('blink_player_name_v1') || '').trim();
    return saved || 'Spieler';
}

function setPlayerName(rawName) {
    const clean = (rawName || '').trim().slice(0, 18);
    if (clean) {
        localStorage.setItem('blink_player_name_v1', clean);
    } else {
        localStorage.removeItem('blink_player_name_v1');
    }
    syncPlayerNameUI();
    if (typeof p2pState !== 'undefined' && p2pState.connected) {
        p2pSend({ type: 'ELO_SYNC', elo: playerEloState.elo, name: getPlayerName() });
    }
}

// ============================================================================
// SPIELER-PROFIL (MENSCHLICHE CHARAKTERE IM POKÉMON-VEKTORSTIL)
// ============================================================================
const PLAYER_SKINS = [
    { id: 's1', hex: '#fde2cf', label: 'Sehr hell' },
    { id: 's2', hex: '#f6c8a8', label: 'Hell' },
    { id: 's3', hex: '#e5aa7e', label: 'Warm' },
    { id: 's4', hex: '#c78758', label: 'Mittel' },
    { id: 's5', hex: '#995e3a', label: 'Dunkel' },
    { id: 's6', hex: '#6a3e26', label: 'Tiefbraun' }
];

const PLAYER_HAIR_COLORS = [
    '#1e293b', '#5c3a21', '#a16207', '#eab308',
    '#dc2626', '#cbd5e1', '#22d3ee', '#a855f7'
];

const PLAYER_OUTFIT_COLORS = [
    '#22d3ee', '#fb7185', '#34d399', '#a855f7',
    '#facc15', '#fb923c', '#3b82f6', '#52525b'
];

const PLAYER_HAIRSTYLES = [
    { id: 'spiky', name: 'Strubbelig' },
    { id: 'short', name: 'Kurz' },
    { id: 'parted', name: 'Scheitel' },
    { id: 'bob', name: 'Bob' },
    { id: 'ponytail', name: 'Zopf' },
    { id: 'bun', name: 'Dutt' },
    { id: 'curly', name: 'Locken' },
    { id: 'long', name: 'Lang' }
];

const PLAYER_EXPRESSIONS = [
    { id: 'smile', name: 'Lächeln' },
    { id: 'grin', name: 'Grinsen' },
    { id: 'wink', name: 'Zwinkern' },
    { id: 'focus', name: 'Fokus' }
];

const PLAYER_ACCESSORIES = [
    { id: 'none', name: 'Ohne' },
    { id: 'glasses', name: 'Brille' },
    { id: 'cap', name: 'Cap' },
    { id: 'headphones', name: 'Audio' },
    { id: 'beanie', name: 'Beanie' },
    { id: 'shades', name: 'Cool' }
];

const DEFAULT_PLAYER_PROFILE = {
    skin: '#f6c8a8',
    hair: 'spiky',
    hairColor: '#1e293b',
    outfitColor: '#22d3ee',
    expr: 'smile',
    acc: 'none'
};

function sanitizePlayerProfile(raw) {
    const p = raw && typeof raw === 'object' ? raw : {};
    const validHex = (v, fb) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) ? v : fb;
    return {
        skin: validHex(p.skin, DEFAULT_PLAYER_PROFILE.skin),
        hair: PLAYER_HAIRSTYLES.some(h => h.id === p.hair) ? p.hair : DEFAULT_PLAYER_PROFILE.hair,
        hairColor: validHex(p.hairColor, DEFAULT_PLAYER_PROFILE.hairColor),
        outfitColor: validHex(p.outfitColor, DEFAULT_PLAYER_PROFILE.outfitColor),
        expr: PLAYER_EXPRESSIONS.some(e => e.id === p.expr) ? p.expr : DEFAULT_PLAYER_PROFILE.expr,
        acc: PLAYER_ACCESSORIES.some(a => a.id === p.acc) ? p.acc : DEFAULT_PLAYER_PROFILE.acc
    };
}

function loadPlayerProfileState() {
    try {
        const raw = localStorage.getItem('blink_player_avatar_v1');
        if (raw) return sanitizePlayerProfile(JSON.parse(raw));
    } catch (e) { }
    return { ...DEFAULT_PLAYER_PROFILE };
}

const playerProfileState = loadPlayerProfileState();

function savePlayerProfileState() {
    try {
        localStorage.setItem('blink_player_avatar_v1', JSON.stringify(playerProfileState));
    } catch (e) { }
}

function getPlayerProfile() {
    return { ...playerProfileState };
}

function getPlayerAvatarSVG(prof = playerProfileState, size = 44) {
    const p = sanitizePlayerProfile(prof);
    const s = p.skin;
    const hc = p.hairColor;
    const oc = p.outfitColor;
    const hasHat = p.acc === 'cap' || p.acc === 'beanie';

    // 1. Hintere Haar-Ebene (hinter Ohren, Hals & Schultern)
    let backHair = '';
    if (p.hair === 'long') {
        backHair = `<path d="M14 27 C10 38 11 51 15 60 L49 60 C53 51 54 38 50 27 C48 16 40 12 32 12 C24 12 16 16 14 27 Z" fill="${hc}" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>`;
    } else if (p.hair === 'bob') {
        backHair = `<path d="M14 28 C11 38 13 49 20 51 L44 51 C51 49 53 38 50 28 C48 17 40 13 32 13 C24 13 16 17 14 28 Z" fill="${hc}" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>`;
    } else if (p.hair === 'ponytail') {
        backHair = `
                    <path d="M44 22 C54 19 60 29 56 42 C53 46 47 44 47 36 C47 31 45 27 43 25 Z" fill="${hc}" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
                    <ellipse cx="45.5" cy="23.5" rx="2.6" ry="3.4" transform="rotate(24 45.5 23.5)" fill="${oc}" stroke="#0f172a" stroke-width="1.6"/>
                    <circle cx="32" cy="28" r="17.5" fill="${hc}" stroke="#0f172a" stroke-width="2"/>`;
    } else if (p.hair === 'bun') {
        backHair = `${hasHat ? '' : `
                    <circle cx="32" cy="11.5" r="7.2" fill="${hc}" stroke="#0f172a" stroke-width="2"/>
                    <path d="M26 15.5 Q32 17.5 38 15.5" fill="none" stroke="${oc}" stroke-width="2.4" stroke-linecap="round"/>`}
                    <circle cx="32" cy="28" r="17.2" fill="${hc}" stroke="#0f172a" stroke-width="2"/>`;
    } else if (p.hair === 'curly') {
        backHair = `
                    <circle cx="15" cy="28" r="7" fill="${hc}" stroke="#0f172a" stroke-width="2"/>
                    <circle cx="49" cy="28" r="7" fill="${hc}" stroke="#0f172a" stroke-width="2"/>
                    <circle cx="15" cy="37" r="6" fill="${hc}" stroke="#0f172a" stroke-width="2"/>
                    <circle cx="49" cy="37" r="6" fill="${hc}" stroke="#0f172a" stroke-width="2"/>
                    <circle cx="21" cy="18" r="7.5" fill="${hc}" stroke="#0f172a" stroke-width="2"/>
                    <circle cx="43" cy="18" r="7.5" fill="${hc}" stroke="#0f172a" stroke-width="2"/>
                    <circle cx="32" cy="15.5" r="8" fill="${hc}" stroke="#0f172a" stroke-width="2"/>`;
    }

    // 2. Trainer-Jacke / Hoodie & Hals
    const body = `
                <path d="M12 62 C12 51.5 20.5 47.5 32 47.5 C43.5 47.5 52 51.5 52 62 Z" fill="${oc}" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
                <path d="M25.5 48 L32 56.5 L38.5 48 Z" fill="#ffffff" opacity="0.92" stroke="#0f172a" stroke-width="1.6" stroke-linejoin="round"/>
                <line x1="32" y1="56.5" x2="32" y2="62" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round"/>
                <rect x="28" y="43.5" width="8" height="6.8" rx="3" fill="${s}" stroke="#0f172a" stroke-width="1.8"/>`;

    // 3. Ohren, Kopf & dezente Wangenröte (gleicher Stil wie AI_LOGOS)
    const head = `
                <circle cx="15.5" cy="34.5" r="3.6" fill="${s}" stroke="#0f172a" stroke-width="2"/>
                <circle cx="48.5" cy="34.5" r="3.6" fill="${s}" stroke="#0f172a" stroke-width="2"/>
                <ellipse cx="32" cy="33.5" rx="16.2" ry="14.8" fill="${s}" stroke="#0f172a" stroke-width="2"/>
                <ellipse cx="20.8" cy="38" rx="2.8" ry="1.5" fill="#fb7185" opacity="0.48"/>
                <ellipse cx="43.2" cy="38" rx="2.8" ry="1.5" fill="#fb7185" opacity="0.48"/>`;

    // 4. Augen & Gesichtsausdruck
    let face = '';
    if (p.expr === 'grin') {
        face = `
                    <circle cx="24.8" cy="33.2" r="3.2" fill="#0f172a"/><circle cx="25.9" cy="32" r="1.15" fill="#ffffff"/>
                    <circle cx="39.2" cy="33.2" r="3.2" fill="#0f172a"/><circle cx="40.3" cy="32" r="1.15" fill="#ffffff"/>
                    <path d="M27.2 38.8 Q32 44.6 36.8 38.8 Z" fill="#ffffff" stroke="#0f172a" stroke-width="1.6" stroke-linejoin="round"/>`;
    } else if (p.expr === 'wink') {
        face = `
                    <circle cx="24.8" cy="33.2" r="3.2" fill="#0f172a"/><circle cx="25.9" cy="32" r="1.15" fill="#ffffff"/>
                    <path d="M36 33.4 Q39.2 30.2 42.4 33.4" fill="none" stroke="#0f172a" stroke-width="2.1" stroke-linecap="round"/>
                    <path d="M28.2 39.5 Q32 42.8 35.8 39.5" fill="none" stroke="#0f172a" stroke-width="1.7" stroke-linecap="round"/>`;
    } else if (p.expr === 'focus') {
        face = `
                    <path d="M21.2 28.4 L28 29.9" stroke="#0f172a" stroke-width="1.8" stroke-linecap="round"/>
                    <path d="M42.8 28.4 L36 29.9" stroke="#0f172a" stroke-width="1.8" stroke-linecap="round"/>
                    <circle cx="24.8" cy="33.6" r="3.0" fill="#0f172a"/><circle cx="25.8" cy="32.5" r="1.05" fill="#ffffff"/>
                    <circle cx="39.2" cy="33.6" r="3.0" fill="#0f172a"/><circle cx="40.2" cy="32.5" r="1.05" fill="#ffffff"/>
                    <path d="M28.8 40.3 Q32.5 41.6 35.6 39.4" fill="none" stroke="#0f172a" stroke-width="1.7" stroke-linecap="round"/>`;
    } else {
        face = `
                    <circle cx="24.8" cy="33.2" r="3.2" fill="#0f172a"/><circle cx="25.9" cy="32" r="1.15" fill="#ffffff"/>
                    <circle cx="39.2" cy="33.2" r="3.2" fill="#0f172a"/><circle cx="40.3" cy="32" r="1.15" fill="#ffffff"/>
                    <path d="M28.2 39.6 Q32 42.8 35.8 39.6" fill="none" stroke="#0f172a" stroke-width="1.7" stroke-linecap="round"/>`;
    }

    // 5. Vordere Frisur / Pony (sitzt bei Cap/Beanie sauber unter der Krempe)
    let frontHair = '';
    if (hasHat) {
        frontHair = `
                    <path d="M15.5 28 C16 24 19 22 23 23 L19 30 Z" fill="${hc}" stroke="#0f172a" stroke-width="1.6" stroke-linejoin="round"/>
                    <path d="M48.5 28 C48 24 45 22 41 23 L45 30 Z" fill="${hc}" stroke="#0f172a" stroke-width="1.6" stroke-linejoin="round"/>`;
    } else if (p.hair === 'spiky') {
        frontHair = `
                    <path d="M15 31 C13 21 18 14 25 15 L23 9 L32 14 L38 8 L40 15 C47 14 51 21 49 31 L46 25 L41 29 L36 22 L30 29 L25 23 L19 28 Z" fill="${hc}" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M23 19 Q31 15 39 18" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.28"/>`;
    } else if (p.hair === 'short') {
        frontHair = `
                    <path d="M15.5 31 C15 19 22 14 32 14 C42 14 49 19 48.5 31 C46 25 41 23 36 24 L33 27 L30 24 C24 23 18 25 15.5 31 Z" fill="${hc}" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M23 19 Q32 16 41 19" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.28"/>`;
    } else if (p.hair === 'parted') {
        frontHair = `
                    <path d="M15.5 31 C14.5 19 22 13.5 32 13.5 C42 13.5 49.5 19 48.5 31 C45 25 39 22.5 31 23.5 C26 24.5 22 27.5 15.5 31 Z" fill="${hc}" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M36 15 Q34 20 31 23.5" fill="none" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round"/>
                    <path d="M22 19 Q28 16.5 34 18" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.28"/>`;
    } else if (p.hair === 'bob') {
        frontHair = `
                    <path d="M15.5 31 C15.5 18 22 13.5 32 13.5 C42 13.5 48.5 18 48.5 31 L45 26.5 L19 26.5 Z" fill="${hc}" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M23 19 Q32 16.5 41 19" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.28"/>`;
    } else if (p.hair === 'ponytail' || p.hair === 'bun') {
        frontHair = `
                    <path d="M15.5 31 C15.5 18.5 22.5 14 32 14 C41.5 14 48.5 18.5 48.5 31 C44.5 24 38.5 21.5 32 23.5 C25.5 21.5 19.5 24 15.5 31 Z" fill="${hc}" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M23 18.5 Q32 16 41 18.5" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.28"/>`;
    } else if (p.hair === 'curly') {
        frontHair = `
                    <circle cx="20" cy="22.5" r="5.5" fill="${hc}" stroke="#0f172a" stroke-width="2"/>
                    <circle cx="28" cy="20.5" r="6" fill="${hc}" stroke="#0f172a" stroke-width="2"/>
                    <circle cx="37" cy="20.5" r="6" fill="${hc}" stroke="#0f172a" stroke-width="2"/>
                    <circle cx="44" cy="22.5" r="5.5" fill="${hc}" stroke="#0f172a" stroke-width="2"/>`;
    } else if (p.hair === 'long') {
        frontHair = `
                    <path d="M15 33 C14.5 18.5 22 13.5 32 13.5 C42 13.5 49.5 18.5 49 33 C46 26 40 22.5 32 23.5 C24 22.5 18 26 15 33 Z" fill="${hc}" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M22.5 19 Q32 16 41.5 19" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.28"/>`;
    }

    // 6. Accessoire-Ebene
    let acc = '';
    if (p.acc === 'glasses') {
        acc = `
                    <circle cx="24.8" cy="33.2" r="5.6" fill="rgba(255,255,255,0.22)" stroke="#0f172a" stroke-width="1.9"/>
                    <circle cx="39.2" cy="33.2" r="5.6" fill="rgba(255,255,255,0.22)" stroke="#0f172a" stroke-width="1.9"/>
                    <line x1="30.4" y1="33.2" x2="33.6" y2="33.2" stroke="#0f172a" stroke-width="1.9"/>
                    <line x1="16" y1="32.2" x2="19.2" y2="32.8" stroke="#0f172a" stroke-width="1.7"/>
                    <line x1="48" y1="32.2" x2="44.8" y2="32.8" stroke="#0f172a" stroke-width="1.7"/>`;
    } else if (p.acc === 'shades') {
        acc = `
                    <rect x="18" y="29" width="12.5" height="8.2" rx="3" fill="#0f172a" stroke="#0f172a" stroke-width="1.6"/>
                    <rect x="33.5" y="29" width="12.5" height="8.2" rx="3" fill="#0f172a" stroke="#0f172a" stroke-width="1.6"/>
                    <line x1="30.5" y1="32" x2="33.5" y2="32" stroke="#0f172a" stroke-width="2"/>
                    <line x1="20.5" y1="34.8" x2="24.5" y2="30.8" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity="0.55"/>
                    <line x1="36" y1="34.8" x2="40" y2="30.8" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity="0.55"/>`;
    } else if (p.acc === 'cap') {
        acc = `
                    <path d="M15 24.5 C15.5 14 23 10.5 32 10.5 C41 10.5 48.5 14 49 24.5 Z" fill="${oc}" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
                    <path d="M23 23.5 C24 15.5 27.5 13 32 13 C36.5 13 40 15.5 41 23.5 Z" fill="#ffffff" opacity="0.92" stroke="#0f172a" stroke-width="1.5"/>
                    <path d="M28.5 19.5 Q32 16.5 35.5 19.5" fill="none" stroke="${oc}" stroke-width="2.2" stroke-linecap="round"/>
                    <path d="M12.5 24.8 Q32 20.5 51.5 24.8 Q32 27.6 12.5 24.8 Z" fill="${oc}" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>`;
    } else if (p.acc === 'beanie') {
        acc = `
                    <path d="M15.5 24.5 C16 14 22.5 10 32 10 C41.5 10 48 14 48.5 24.5 Z" fill="${oc}" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
                    <circle cx="32" cy="8.2" r="3.4" fill="${oc}" stroke="#0f172a" stroke-width="1.8"/>
                    <rect x="14.5" y="20.5" width="35" height="6" rx="3" fill="${oc}" stroke="#0f172a" stroke-width="2"/>
                    <line x1="22" y1="21" x2="22" y2="26" stroke="#0f172a" stroke-width="1.4" opacity="0.55"/>
                    <line x1="32" y1="21" x2="32" y2="26" stroke="#0f172a" stroke-width="1.4" opacity="0.55"/>
                    <line x1="42" y1="21" x2="42" y2="26" stroke="#0f172a" stroke-width="1.4" opacity="0.55"/>`;
    } else if (p.acc === 'headphones') {
        acc = `
                    <path d="M14 32 C14 14 22 9.5 32 9.5 C42 9.5 50 14 50 32" fill="none" stroke="#0f172a" stroke-width="4.4" stroke-linecap="round"/>
                    <path d="M14 32 C14 14 22 9.5 32 9.5 C42 9.5 50 14 50 32" fill="none" stroke="${oc}" stroke-width="2" stroke-linecap="round"/>
                    <rect x="10.2" y="28.5" width="5.8" height="12.5" rx="2.9" fill="${oc}" stroke="#0f172a" stroke-width="2"/>
                    <rect x="48" y="28.5" width="5.8" height="12.5" rx="2.9" fill="${oc}" stroke="#0f172a" stroke-width="2"/>`;
    }

    return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" class="block">${backHair}${body}${head}${face}${frontHair}${acc}</svg>`;
}

function getOpponentAvatarSVG(size = 36) {
    if (gameState.mode === 'online' && p2pState.connected && p2pState.oppProfile) {
        return getPlayerAvatarSVG(p2pState.oppProfile, size);
    }
    if (gameState.useTrainedBrain && typeof getActiveTrainedAI === 'function' && typeof getAILogoSVG === 'function') {
        const ai = getActiveTrainedAI();
        if (ai) {
            const col = typeof getAIDominantColor === 'function' ? getAIDominantColor(ai) : '#fb7185';
            return getAILogoSVG(ai.logoId, col, size);
        }
    }
    return '';
}

function updatePlayerProfileField(key, value) {
    const next = sanitizePlayerProfile({ ...playerProfileState, [key]: value });
    Object.assign(playerProfileState, next);
    savePlayerProfileState();
    playSound('tick');
    syncPlayerProfileUI();
    renderProfileModalUI();
    p2pSyncPlayerProfile();
}

function randomizePlayerProfile() {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    Object.assign(playerProfileState, {
        skin: pick(PLAYER_SKINS).hex,
        hair: pick(PLAYER_HAIRSTYLES).id,
        hairColor: pick(PLAYER_HAIR_COLORS),
        outfitColor: pick(PLAYER_OUTFIT_COLORS),
        expr: pick(PLAYER_EXPRESSIONS).id,
        acc: pick(PLAYER_ACCESSORIES).id
    });
    savePlayerProfileState();
    playSound('flip');
    syncPlayerProfileUI();
    renderProfileModalUI();
    p2pSyncPlayerProfile();
}

function p2pSyncPlayerProfile() {
    if (typeof p2pState !== 'undefined' && p2pState.connected) {
        p2pSend({ type: 'ELO_SYNC', elo: playerEloState.elo, name: getPlayerName(), profile: getPlayerProfile() });
    }
}

function toggleProfileModal() {
    const modal = document.getElementById('profile-modal');
    const isOpening = modal && modal.classList.contains('hidden');
    if (isOpening) {
        playSound('tick');
        renderProfileModalUI();
    }
    toggleModalState('profile-modal');
}

function openProfileFromSettings() {
    const settings = document.getElementById('settings-modal');
    if (settings && !settings.classList.contains('hidden')) {
        toggleModalState('settings-modal');
    }
    setTimeout(() => toggleProfileModal(), 160);
}

function syncPlayerProfileUI() {
    const prof = playerProfileState;
    const col = prof.outfitColor || '#22d3ee';
    const pName = getPlayerName();

    const headerBtn = document.getElementById('header-profile-btn');
    if (headerBtn) {
        headerBtn.innerHTML = getPlayerAvatarSVG(prof, 28);
        headerBtn.style.borderColor = `${col}88`;
        headerBtn.style.background = `${col}1c`;
        headerBtn.title = `${pName} (Profil & Charakter ändern)`;
    }

    const arenaAvatar = document.getElementById('player-avatar-slot');
    if (arenaAvatar) {
        arenaAvatar.innerHTML = getPlayerAvatarSVG(prof, 38);
        arenaAvatar.style.borderColor = `${col}99`;
        arenaAvatar.style.background = `${col}20`;
    }

    const vhMini = document.getElementById('vh-player-mini-avatar');
    const vhName = document.getElementById('vh-player-name-lbl');
    if (vhMini) vhMini.innerHTML = getPlayerAvatarSVG(prof, 16);
    if (vhName) vhName.textContent = pName;

    const labAvatar = document.getElementById('lab-player-avatar-slot');
    if (labAvatar) {
        labAvatar.innerHTML = getPlayerAvatarSVG(prof, 32);
        labAvatar.style.borderColor = `${col}88`;
        labAvatar.style.background = `${col}1c`;
    }
}

function syncOpponentAvatarUI() {
    const slot = document.getElementById('opponent-avatar-slot');
    if (!slot) return;

    if (gameState.mode === 'online' && p2pState.connected && p2pState.oppProfile) {
        const col = p2pState.oppProfile.outfitColor || '#fb7185';
        slot.innerHTML = getPlayerAvatarSVG(p2pState.oppProfile, 38);
        slot.style.borderColor = `${col}99`;
        slot.style.background = `${col}20`;
        return;
    }
    if (gameState.useTrainedBrain && typeof getActiveTrainedAI === 'function' && typeof getAILogoSVG === 'function') {
        const ai = getActiveTrainedAI();
        if (ai) {
            const col = typeof getAIDominantColor === 'function' ? getAIDominantColor(ai) : '#fb7185';
            slot.innerHTML = getAILogoSVG(ai.logoId, col, 36);
            slot.style.borderColor = `${col}99`;
            slot.style.background = `${col}20`;
            return;
        }
    }
    slot.style.borderColor = '';
    slot.style.background = '';
    slot.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8.01" y2="16"></line><line x1="16" y1="16" x2="16.01" y2="16"></line></svg>`;
}

function renderProfileModalUI() {
    const prof = playerProfileState;
    const col = prof.outfitColor || '#22d3ee';
    const pName = getPlayerName();
    const rank = getEloRankInfo(playerEloState.elo);

    const hdrBadge = document.getElementById('profile-header-badge');
    if (hdrBadge) hdrBadge.innerHTML = getPlayerAvatarSVG(prof, 30);

    const prevAvatar = document.getElementById('profile-preview-avatar');
    if (prevAvatar) {
        prevAvatar.innerHTML = getPlayerAvatarSVG(prof, 84);
        prevAvatar.style.borderColor = `${col}99`;
        prevAvatar.style.background = `radial-gradient(circle at 50% 35%, ${col}30, rgba(15,23,42,0.45))`;
    }

    const prevName = document.getElementById('profile-preview-name');
    if (prevName) prevName.textContent = pName;

    const prevElo = document.getElementById('profile-preview-elo');
    if (prevElo) {
        prevElo.innerHTML = `${getEloRankSVG(rank.tier, 13)}<span>${rank.name} · ${playerEloState.elo}</span>`;
        prevElo.className = `inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] mono font-bold ${rank.cls}`;
    }

    const nameInp = document.getElementById('profile-name-input');
    if (nameInp && document.activeElement !== nameInp) nameInp.value = pName;

    const skinGrid = document.getElementById('profile-skin-grid');
    if (skinGrid) {
        skinGrid.innerHTML = PLAYER_SKINS.map(sk => `
                    <button type="button" onclick="updatePlayerProfileField('skin', '${sk.hex}')" title="${sk.label}"
                        class="profile-swatch ${prof.skin.toLowerCase() === sk.hex.toLowerCase() ? 'is-selected' : ''}"
                        style="background:${sk.hex}"></button>
                `).join('');
    }

    const exprGrid = document.getElementById('profile-expr-grid');
    if (exprGrid) {
        exprGrid.innerHTML = PLAYER_EXPRESSIONS.map(ex => `
                    <button type="button" onclick="updatePlayerProfileField('expr', '${ex.id}')"
                        class="profile-chip ${prof.expr === ex.id ? 'is-selected' : ''}">${ex.name}</button>
                `).join('');
    }

    const hairGrid = document.getElementById('profile-hair-grid');
    if (hairGrid) {
        hairGrid.innerHTML = PLAYER_HAIRSTYLES.map(h => `
                    <button type="button" onclick="updatePlayerProfileField('hair', '${h.id}')"
                        class="profile-hair-btn ${prof.hair === h.id ? 'is-selected' : ''}">
                        ${getPlayerAvatarSVG({ ...prof, hair: h.id, acc: prof.acc === 'cap' || prof.acc === 'beanie' ? 'none' : prof.acc }, 38)}
                        <span class="profile-hair-label">${h.name}</span>
                    </button>
                `).join('');
    }

    const renderColorGrid = (elId, list, currentHex, fieldKey) => {
        const el = document.getElementById(elId);
        if (!el) return;
        el.innerHTML = list.map(hex => `
                    <button type="button" onclick="updatePlayerProfileField('${fieldKey}', '${hex}')"
                        class="profile-swatch ${currentHex.toLowerCase() === hex.toLowerCase() ? 'is-selected' : ''}"
                        style="background:${hex}"></button>
                `).join('') + `
                    <label title="Eigene Farbe wählen" class="profile-swatch profile-swatch-custom">
                        <span>+</span>
                        <input type="color" value="${currentHex}" oninput="updatePlayerProfileField('${fieldKey}', this.value)" class="opacity-0 absolute inset-0 cursor-pointer">
                    </label>`;
    };
    renderColorGrid('profile-haircolor-grid', PLAYER_HAIR_COLORS, prof.hairColor, 'hairColor');
    renderColorGrid('profile-outfitcolor-grid', PLAYER_OUTFIT_COLORS, prof.outfitColor, 'outfitColor');

    const accGrid = document.getElementById('profile-acc-grid');
    if (accGrid) {
        accGrid.innerHTML = PLAYER_ACCESSORIES.map(a => `
                    <button type="button" onclick="updatePlayerProfileField('acc', '${a.id}')"
                        class="profile-chip ${prof.acc === a.id ? 'is-selected' : ''}">${a.name}</button>
                `).join('');
    }
}

function syncPlayerNameUI() {
    const pName = getPlayerName();
    const arenaInp = document.getElementById('player-name-input');
    const settingsInp = document.getElementById('settings-player-name-input');
    const barPlayer = document.getElementById('bar-player-name');
    const labHeading = document.getElementById('lab-player-name-heading');
    const oppLabelEl = document.getElementById('opponent-name-label');
    const barOpp = document.getElementById('bar-opponent-name');

    if (arenaInp && document.activeElement !== arenaInp) arenaInp.value = pName;
    if (settingsInp && document.activeElement !== settingsInp) settingsInp.value = pName;
    if (barPlayer) barPlayer.textContent = pName;
    if (labHeading) labHeading.textContent = `${pName} · Spieler-Elo`;
    if (barOpp && oppLabelEl) barOpp.textContent = oppLabelEl.textContent || 'Bot';
    const profInp = document.getElementById('profile-name-input');
    const profPrevName = document.getElementById('profile-preview-name');
    if (profInp && document.activeElement !== profInp) profInp.value = pName;
    if (profPrevName) profPrevName.textContent = pName;
    syncPlayerProfileUI();
    syncOpponentAvatarUI();
}

window.addEventListener('DOMContentLoaded', () => syncPlayerNameUI());

function getEloRankInfo(elo) {
    if (elo >= 1950) return { tier: 'grandmaster', name: 'Grandmaster', cls: 'bg-red-500/20 text-red-200 border-red-400/60' };
    if (elo >= 1750) return { tier: 'master', name: 'Master', cls: 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/50' };
    if (elo >= 1550) return { tier: 'diamond', name: 'Diamond', cls: 'bg-sky-500/20 text-sky-200 border-sky-400/50' };
    if (elo >= 1350) return { tier: 'emerald', name: 'Emerald', cls: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50' };
    if (elo >= 1150) return { tier: 'platinum', name: 'Platinum', cls: 'bg-teal-500/20 text-teal-200 border-teal-400/45' };
    if (elo >= 1000) return { tier: 'gold', name: 'Gold', cls: 'bg-amber-400/20 text-amber-200 border-amber-400/50' };
    if (elo >= 850) return { tier: 'silver', name: 'Silver', cls: 'bg-slate-400/20 text-slate-200 border-slate-300/45' };
    if (elo >= 700) return { tier: 'bronze', name: 'Bronze', cls: 'bg-orange-600/20 text-orange-300 border-orange-500/45' };
    return { tier: 'iron', name: 'Iron', cls: 'bg-stone-600/25 text-stone-300 border-stone-500/45' };
}

function getEloRankSVG(tier, size = 15) {
    const icons = {
        iron: `<path d="M12 2.5L19 6v6.5c0 4.2-2.9 7.5-7 9-4.1-1.5-7-4.8-7-9V6l7-3.5z" fill="#44403c" stroke="#a8a29e" stroke-width="1.5"/>
                       <path d="M12 5.5v12.5M8.5 9l3.5 2 3.5-2" stroke="#d6d3d1" stroke-width="1.2" fill="none" opacity="0.7"/>`,
        bronze: `<path d="M12 2.2L19.5 6v6.5c0 4.3-3.1 7.7-7.5 9.3-4.4-1.6-7.5-5-7.5-9.3V6L12 2.2z" fill="#7c2d12" stroke="#f59e0b" stroke-width="1.5"/>
                         <polygon points="12,6 15.5,12 12,17.5 8.5,12" fill="#d97706" stroke="#fde68a" stroke-width="1"/>`,
        silver: `<path d="M4 7.5l3 2.5-2 3.5L12 21.5l7-8-2-3.5 3-2.5-5.5 1L12 3 9.5 8.5 4 7.5z" fill="#475569" stroke="#e2e8f0" stroke-width="1.3" stroke-linejoin="round"/>
                         <polygon points="12,7.5 15,12 12,16.5 9,12" fill="#cbd5e1"/>`,
        gold: `<path d="M3.5 7l4 2.5L12 2.5l4.5 7 4-2.5-2 7.5L12 21.5l-6.5-7L3.5 7z" fill="#a16207" stroke="#fde047" stroke-width="1.4" stroke-linejoin="round"/>
                       <polygon points="12,7 15.5,12 12,17 8.5,12" fill="#facc15" stroke="#fef9c3" stroke-width="1"/>`,
        platinum: `<path d="M2.5 7.5L7 10l5-7.5L17 10l4.5-2.5-3 7.5L12 21.5 5.5 15l-3-7.5z" fill="#0f766e" stroke="#5eead4" stroke-width="1.4" stroke-linejoin="round"/>
                           <polygon points="12,6.5 16,12 12,17.5 8,12" fill="#2dd4bf" stroke="#ccfbf1" stroke-width="1"/>`,
        emerald: `<path d="M3 8l4.5 1.5L12 2.5l4.5 7L21 8l-2.5 7.5L12 21.5 5.5 15.5 3 8z" fill="#065f46" stroke="#34d399" stroke-width="1.4" stroke-linejoin="round"/>
                          <polygon points="12,5.5 16.2,10.5 14.5,16.5 9.5,16.5 7.8,10.5" fill="#10b981" stroke="#a7f3d0" stroke-width="1.1"/>`,
        diamond: `<path d="M2 8.5L6.5 9.5 12 2.2l5.5 7.3 4.5-1-3.2 7L12 21.8 5.2 15.5 2 8.5z" fill="#0369a1" stroke="#7dd3fc" stroke-width="1.4" stroke-linejoin="round"/>
                          <polygon points="12,5.5 16.5,11.5 12,18 7.5,11.5" fill="#38bdf8" stroke="#e0f2fe" stroke-width="1.2"/>
                          <path d="M7.5 11.5h9M12 5.5v12.5" stroke="#ffffff" stroke-width="0.8" opacity="0.65"/>`,
        master: `<path d="M2 7l4.5 3L9 4.5l3 3.5 3-3.5L17.5 10 22 7l-3 8.5L12 22l-7-6.5L2 7z" fill="#6b21a8" stroke="#e879f9" stroke-width="1.4" stroke-linejoin="round"/>
                         <polygon points="12,7.5 16,12.5 12,18 8,12.5" fill="#c084fc" stroke="#fae8ff" stroke-width="1.1"/>
                         <circle cx="12" cy="12.5" r="2.2" fill="#ffffff"/>`,
        grandmaster: `<path d="M1.5 6.5l5 3.2L9 3.5l3 3.5 3-3.5 2.5 6.2 5-3.2-3 9.2L12 22.2 4.5 15.7 1.5 6.5z" fill="#991b1b" stroke="#fbbf24" stroke-width="1.4" stroke-linejoin="round"/>
                              <polygon points="12,6.5 16.5,12 12,18.2 7.5,12" fill="#ef4444" stroke="#fef08a" stroke-width="1.2"/>
                              <polygon points="12,9.2 14.2,12 12,14.8 9.8,12" fill="#fef08a"/>`
    };
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" class="inline-block shrink-0" style="overflow:visible">${icons[tier] || icons.iron}</svg>`;
}

function calcExpectedWinProb(eloA, eloB) {
    return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

function getCurrentOpponentElo() {
    if (gameState.ruleMode === 'verhoer') return 1200;
    if (gameState.mode === 'online') return p2pState.oppElo || 1100;
    if (gameState.useTrainedBrain && typeof getActiveTrainedAI === 'function') {
        const ai = getActiveTrainedAI();
        return ai ? ai.elo : 1100;
    }
    const sel = document.getElementById('select-ai-difficulty');
    return BOT_ANCHOR_ELOS[sel ? sel.value : 'gold'] || 1075;
}

const ELO_RANK_TIERS = [
    { tier: 'iron', name: 'Iron', range: '< 700 Elo', min: 0, max: 699 },
    { tier: 'bronze', name: 'Bronze', range: '700 – 849 Elo', min: 700, max: 849 },
    { tier: 'silver', name: 'Silver', range: '850 – 999 Elo', min: 850, max: 999 },
    { tier: 'gold', name: 'Gold', range: '1000 – 1149 Elo', min: 1000, max: 1149 },
    { tier: 'platinum', name: 'Platinum', range: '1150 – 1349 Elo', min: 1150, max: 1349 },
    { tier: 'emerald', name: 'Emerald', range: '1350 – 1549 Elo', min: 1350, max: 1549 },
    { tier: 'diamond', name: 'Diamond', range: '1550 – 1749 Elo', min: 1550, max: 1749 },
    { tier: 'master', name: 'Master', range: '1750 – 1949 Elo', min: 1750, max: 1949 },
    { tier: 'grandmaster', name: 'Grandmaster', range: '≥ 1950 Elo', min: 1950, max: Infinity }
];

function toggleEloOverviewModal() {
    const modal = document.getElementById('elo-overview-modal');
    const isOpening = modal && modal.classList.contains('hidden');
    if (isOpening) {
        playSound('tick');
        renderEloOverviewModal();
    }
    toggleModalState('elo-overview-modal');
}

function renderEloOverviewModal() {
    const list = document.getElementById('elo-overview-list');
    if (!list) return;
    const pElo = playerEloState.elo;
    const pTier = getEloRankInfo(pElo).tier;
    const activeAI = typeof getActiveTrainedAI === 'function' ? getActiveTrainedAI() : null;
    const aiTier = activeAI ? getEloRankInfo(activeAI.elo).tier : null;
    const playerAvatar = (typeof getPlayerAvatarSVG === 'function' && typeof playerProfileState !== 'undefined')
        ? getPlayerAvatarSVG(playerProfileState, 15)
        : '';

    list.innerHTML = ELO_RANK_TIERS.map(t => {
        const isPlayer = t.tier === pTier;
        const isAI = activeAI && t.tier === aiTier;
        const rankStyle = getEloRankInfo(Math.max(t.min, 500)).cls;
        return `
                    <div class="apple-elo-card ${isPlayer ? 'is-player-tier' : ''}">
                        <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <span class="apple-elo-icon-box">${getEloRankSVG(t.tier, 20)}</span>
                                <div class="min-w-0">
                                    <div class="text-xs font-extrabold text-white leading-tight truncate">${t.name}</div>
                                    <div class="text-[10.5px] mono text-slate-400 leading-tight mt-0.5">${t.range}</div>
                                </div>
                            </div>
                            <span class="px-2 py-0.5 rounded-full border text-[9px] mono font-bold shrink-0 ${rankStyle}">${t.name}</span>
                        </div>
                        ${(isPlayer || isAI) ? `
                            <div class="flex flex-wrap items-center gap-1.5 pt-2 mt-2 apple-elo-badges-row">
                                ${isPlayer ? `<span class="inline-flex items-center gap-1 ${playerAvatar ? 'pl-1 pr-2' : 'px-2'} py-0.5 rounded-full bg-cyan-400 text-slate-950 text-[9.5px] mono font-extrabold">${playerAvatar}<span>${getPlayerName()} · ${pElo}</span></span>` : ''}
                                ${isAI ? `<span class="px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-400/40 text-emerald-300 text-[9.5px] mono font-bold">${activeAI.name} · ${activeAI.elo}</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                `;
    }).join('');
}

function renderEloBadgesInArena() {
    const pBadge = document.getElementById('player-elo-badge');
    const oBadge = document.getElementById('opponent-elo-badge');
    if (pBadge) {
        const rank = getEloRankInfo(playerEloState.elo);
        pBadge.innerHTML = `${getEloRankSVG(rank.tier, 13)}<span>${rank.name} · ${playerEloState.elo}</span>`;
        pBadge.className = `inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] mono font-bold cursor-pointer hover:opacity-85 transition ${rank.cls}`;
    }
    if (oBadge) {
        if (gameState.mode === 'online' && !p2pState.connected) {
            oBadge.innerHTML = `<span>Warte auf Gegner...</span>`;
            oBadge.className = `inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.04] text-slate-400 text-[10px] mono font-bold`;
        } else {
            const oppElo = getCurrentOpponentElo();
            const oppRank = getEloRankInfo(oppElo);
            oBadge.innerHTML = `${getEloRankSVG(oppRank.tier, 13)}<span>${oppRank.name} · ${oppElo}</span>`;
            oBadge.className = `inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] mono font-bold cursor-pointer hover:opacity-85 transition ${oppRank.cls}`;
        }
    }
    syncPlayerNameUI();
    if (typeof renderArenaH2HUI === 'function') renderArenaH2HUI();
    if (typeof renderBrainLabUI === 'function' && state.currentPage === 'lab') {
        renderBrainLabUI();
    }
}

function closeMatchSummaryOverlay() {
    const overlay = document.getElementById('match-summary-overlay');
    if (overlay) overlay.classList.add('hidden');
}

function showMatchSummaryOverlay({ didWin, oppLabel, beforePlayerElo, afterPlayerElo, playerDelta, beforeOppElo, afterOppElo, oppDelta }) {
    const overlay = document.getElementById('match-summary-overlay');
    const badgeEl = document.getElementById('match-summary-badge');
    const titleEl = document.getElementById('match-summary-title');
    const subEl = document.getElementById('match-summary-subtitle');
    const eloGrid = document.getElementById('match-summary-elo-grid');
    if (!overlay || !eloGrid) return;

    const fmtDelta = (d) => `${d >= 0 ? '+' : ''}${d}`;
    const deltaCls = (d) => d > 0 ? 'text-emerald-400' : (d < 0 ? 'text-rose-400' : 'text-slate-400');

    if (badgeEl) {
        badgeEl.textContent = didWin ? 'Sieg' : 'Niederlage';
        badgeEl.className = didWin
            ? 'inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/35 text-[10px] mono font-bold uppercase tracking-widest text-emerald-300'
            : 'inline-block px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-400/35 text-[10px] mono font-bold uppercase tracking-widest text-rose-300';
    }
    if (titleEl) titleEl.textContent = didWin ? `Sieg gegen ${oppLabel}!` : `Niederlage gegen ${oppLabel}`;

    if (subEl) {
        const rawSec = typeof gameState.lastMatchDuration === 'number'
            ? gameState.lastMatchDuration
            : (gameState.startTime ? (performance.now() - gameState.startTime) / 1000 : 0);
        const elapsed = formatElapsedTime(rawSec);
        const ruleMap = { normal: 'Standard', cluster: 'Cluster', verhoer: 'Das Verhör' };
        subEl.textContent = `${ruleMap[gameState.ruleMode] || 'Blink'} · Zeit: ${elapsed}`;
    }

    const h2hBanner = document.getElementById('match-summary-h2h-banner');
    if (h2hBanner) {
        const showH2H = gameState.mode === 'online' && typeof p2pState !== 'undefined' && p2pState.connected;
        h2hBanner.classList.toggle('hidden', !showH2H);
        if (showH2H) {
            const sc = getArenaH2HNumbers();
            h2hBanner.innerHTML = buildH2HBannerHTML(getPlayerName(), oppLabel, sc.myWins, sc.oppWins, 'resetArenaSeriesScore()');
        }
    }

    const pRank = getEloRankInfo(afterPlayerElo);
    const oRank = getEloRankInfo(afterOppElo);

    eloGrid.innerHTML = `
                <div class="rounded-2xl bg-slate-950/85 border border-white/[0.08] p-3.5 text-left space-y-1.5">
                    <div class="flex items-center justify-between gap-1">
                        <span class="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 mono truncate">${getPlayerAvatarSVG(playerProfileState, 18)}<span class="truncate">${getPlayerName()}</span></span>
                        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9.5px] mono font-bold ${pRank.cls}">${getEloRankSVG(pRank.tier, 12)}${pRank.name}</span>
                    </div>
                    <div class="flex items-baseline gap-2">
                        <span class="text-xl font-extrabold text-cyan-300 mono">${afterPlayerElo}</span>
                        <span class="text-xs font-bold mono ${deltaCls(playerDelta)}">(${fmtDelta(playerDelta)})</span>
                    </div>
                    <div class="text-[10px] mono text-slate-500">Vorher: ${beforePlayerElo} Elo</div>
                </div>
                <div class="rounded-2xl bg-slate-950/85 border border-white/[0.08] p-3.5 text-left space-y-1.5">
                    <div class="flex items-center justify-between gap-1">
                        <span class="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 mono truncate">${getOpponentAvatarSVG(18)}<span class="truncate">${oppLabel}</span></span>
                        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9.5px] mono font-bold ${oRank.cls}">${getEloRankSVG(oRank.tier, 12)}${oRank.name}</span>
                    </div>
                    <div class="flex items-baseline gap-2">
                        <span class="text-xl font-extrabold text-white mono">${afterOppElo}</span>
                        ${oppDelta !== 0 ? `<span class="text-xs font-bold mono ${deltaCls(oppDelta)}">(${fmtDelta(oppDelta)})</span>` : ''}
                    </div>
                    <div class="text-[10px] mono text-slate-500">${oppDelta !== 0 ? `Vorher: ${beforeOppElo} Elo` : 'Feste Gegner-Elo'}</div>
                </div>
            `;

    overlay.classList.remove('hidden');
}

function updatePlayerEloAfterMatch(oppElo, didWin, oppLabel, kFactor = 32) {
    const beforePlayerElo = playerEloState.elo;
    const beforeOppElo = oppElo;
    const expected = calcExpectedWinProb(playerEloState.elo, oppElo);
    const score = didWin ? 1 : 0;
    let delta = Math.round(kFactor * (score - expected));
    if (didWin && delta < 2) delta = 2;
    if (!didWin && delta > -2) delta = -2;

    playerEloState.elo = Math.max(400, playerEloState.elo + delta);
    if (didWin) playerEloState.wins++; else playerEloState.losses++;
    playerEloState.history.push(playerEloState.elo);
    if (playerEloState.history.length > 50) playerEloState.history.shift();
    savePlayerEloState();

    let oppDelta = 0;
    let afterOppElo = beforeOppElo;
    // Falls gegen deine eigene trainierte KI gespielt wurde, passt sich deren Elo leicht mit an
    if (gameState.mode === 'ai' && gameState.useTrainedBrain && typeof adjustActiveAIEloFromHuman === 'function') {
        oppDelta = -Math.round(delta * 0.45);
        adjustActiveAIEloFromHuman(oppDelta);
        const ai = typeof getActiveTrainedAI === 'function' ? getActiveTrainedAI() : null;
        if (ai) afterOppElo = ai.elo;
    } else if (gameState.mode === 'online') {
        oppDelta = -delta;
        afterOppElo = Math.max(400, beforeOppElo + oppDelta);
        p2pState.oppElo = afterOppElo;
    }

    renderEloBadgesInArena();
    const sign = delta >= 0 ? '+' : '';
    showSonnerToast(`${getPlayerName()}: ${playerEloState.elo} Elo (${sign}${delta}) vs. ${oppLabel}`, didWin ? 'success' : 'warn');

    if (!gameState.isTrainingMatch) {
        showMatchSummaryOverlay({
            didWin,
            oppLabel,
            beforePlayerElo,
            afterPlayerElo: playerEloState.elo,
            playerDelta: delta,
            beforeOppElo,
            afterOppElo,
            oppDelta
        });
    }
}


function shuffleArray(arr) {
    const copy = arr.map(c => [...c]);
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function getActivePileCount() {
    if (gameState.ruleMode === 'verhoer') return 1;
    return gameState.ruleMode === 'cluster' ? 3 : 2;
}

function hammingDistance(c1, c2) {
    if (!c1 || !c2) return 3;
    let d = 0;
    if (c1[0] !== c2[0]) d++;
    if (c1[1] !== c2[1]) d++;
    if (c1[2] !== c2[2]) d++;
    return d;
}

function areCardsCompletelyDifferent(c1, c2) {
    return hammingDistance(c1, c2) === 3;
}

// Sucht 3 Karten in einer Hand, die paarweise d_H = 3 erfüllen
function findValidTrioIndices(hand) {
    for (let i = 0; i < hand.length; i++) {
        for (let j = i + 1; j < hand.length; j++) {
            if (!areCardsCompletelyDifferent(hand[i], hand[j])) continue;
            for (let k = j + 1; k < hand.length; k++) {
                if (areCardsCompletelyDifferent(hand[i], hand[k]) && areCardsCompletelyDifferent(hand[j], hand[k])) {
                    return [i, j, k];
                }
            }
        }
    }
    return null;
}

// Prüft, ob aus Handkarten + ausgelegten Trios 5 Karten existieren, die ein perfektes Cluster (paarweise d_H = 3) bilden
function findValidCluster5FromPool(hand, trios) {
    const pool = [...hand];
    trios.forEach(trio => trio.forEach(c => pool.push(c)));
    const n = pool.length;
    if (n < 5) return null;

    for (let a = 0; a < n - 4; a++) {
        for (let b = a + 1; b < n - 3; b++) {
            if (!areCardsCompletelyDifferent(pool[a], pool[b])) continue;
            for (let c = b + 1; c < n - 2; c++) {
                if (!areCardsCompletelyDifferent(pool[a], pool[c]) || !areCardsCompletelyDifferent(pool[b], pool[c])) continue;
                for (let d = c + 1; d < n - 1; d++) {
                    if (!areCardsCompletelyDifferent(pool[a], pool[d]) || !areCardsCompletelyDifferent(pool[b], pool[d]) || !areCardsCompletelyDifferent(pool[c], pool[d])) continue;
                    for (let e = d + 1; e < n; e++) {
                        if (areCardsCompletelyDifferent(pool[a], pool[e]) &&
                            areCardsCompletelyDifferent(pool[b], pool[e]) &&
                            areCardsCompletelyDifferent(pool[c], pool[e]) &&
                            areCardsCompletelyDifferent(pool[d], pool[e])) {
                            return [pool[a], pool[b], pool[c], pool[d], pool[e]];
                        }
                    }
                }
            }
        }
    }
    return null;
}

// Berechnet, wie viele Karten (max 5) bereits paarweise cluster-kompatibel sind (für Fortschrittsanzeige)
function getMaxClusterSubsetSize(hand, trios) {
    const pool = [...hand];
    trios.forEach(t => t.forEach(c => pool.push(c)));
    if (findValidCluster5FromPool(hand, trios)) return 5;
    const n = pool.length;
    let best = Math.min(1, n);
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (!areCardsCompletelyDifferent(pool[i], pool[j])) continue;
            best = Math.max(best, 2);
            for (let k = j + 1; k < n; k++) {
                if (!areCardsCompletelyDifferent(pool[i], pool[k]) || !areCardsCompletelyDifferent(pool[j], pool[k])) continue;
                best = Math.max(best, 3);
                for (let l = k + 1; l < n; l++) {
                    if (areCardsCompletelyDifferent(pool[i], pool[l]) &&
                        areCardsCompletelyDifferent(pool[j], pool[l]) &&
                        areCardsCompletelyDifferent(pool[k], pool[l])) {
                        return 4;
                    }
                }
            }
        }
    }
    return best;
}

function drawValidClusterTrioFromDeck(deck) {
    for (let i = 0; i < deck.length; i++) {
        for (let j = i + 1; j < deck.length; j++) {
            if (!areCardsCompletelyDifferent(deck[i], deck[j])) continue;
            for (let k = j + 1; k < deck.length; k++) {
                if (areCardsCompletelyDifferent(deck[i], deck[k]) && areCardsCompletelyDifferent(deck[j], deck[k])) {
                    const c3 = deck.splice(k, 1)[0];
                    const c2 = deck.splice(j, 1)[0];
                    const c1 = deck.splice(i, 1)[0];
                    return [c1, c2, c3];
                }
            }
        }
    }
    return [deck.pop(), deck.pop(), deck.pop()];
}

function canPlayCardOnPile(card, pileIdx) {
    if (!card) return false;
    if (gameState.ruleMode === 'verhoer') {
        return pileIdx === 0;
    }
    if (gameState.ruleMode === 'cluster') {
        for (let i = 0; i < 3; i++) {
            if (i === pileIdx) continue;
            const otherPileCard = gameState.centerPiles[i];
            if (!areCardsCompletelyDifferent(card, otherPileCard)) {
                return false;
            }
        }
        return true;
    }
    const targetPileCard = gameState.centerPiles[pileIdx];
    if (!targetPileCard) return false;
    return card[0] === targetPileCard[0] || card[1] === targetPileCard[1] || card[2] === targetPileCard[2];
}

function getMatchingReasons(card, pileIdx) {
    if (!card) return [];
    if (gameState.ruleMode === 'cluster') {
        return ['Bildet Cluster-Trio mit M₁, M₂, M₃'];
    }
    const pileCard = gameState.centerPiles[pileIdx];
    if (!pileCard) return [];
    const reasons = [];
    if (card[0] === pileCard[0]) reasons.push(`Anzahl: ${PALETTE_X[card[0]].word}`);
    if (card[1] === pileCard[1]) reasons.push(`Farbe: ${PALETTE_Y[card[1]].name}`);
    if (card[2] === pileCard[2]) reasons.push(`Symbol: ${PALETTE_Z[card[2]].name}`);
    return reasons;
}

function initBlinkGameLobby() {
    pauseGameLoops();
    gameState.initialized = true;
    gameState.isRunning = false;
    gameState.selectedHandIndex = null;
    gameState.playerTrios = [];
    gameState.aiTrios = [];

    const numPiles = getActivePileCount();
    gameState.centerPiles = [[0, 0, 0], [1, 2, 3], [2, 4, 1]].slice(0, numPiles);
    gameState.discardHistory = [[0, 0, 0]];
    gameState.playerHand = gameState.ruleMode === 'verhoer'
        ? [[0, 0, 0], [1, 1, 1], [2, 2, 2], [3, 3, 4], [4, 1, 2]]
        : [[3, 1, 4], [4, 3, 2], [2, 0, 5]];
    gameState.playerDeck = new Array(gameState.ruleMode === 'verhoer' ? 114 : 26).fill([0, 0, 0]);
    gameState.aiHand = gameState.ruleMode === 'verhoer'
        ? [[1, 0, 2], [2, 3, 1], [3, 4, 0], [0, 2, 4], [4, 1, 3]]
        : [[1, 1, 1], [2, 2, 2], [3, 3, 3]];
    gameState.aiDeck = new Array(26).fill([0, 0, 0]);

    const overlay = document.getElementById('game-lobby-overlay');
    if (overlay) overlay.classList.remove('hidden');

    const vPanel = document.getElementById('verhoer-interaction-panel');
    if (vPanel) vPanel.classList.add('hidden');

    const timerDisp = document.getElementById('game-timer-display');
    const btnLbl = document.getElementById('btn-start-game-label');
    if (timerDisp) timerDisp.textContent = '00:00.0';
    if (btnLbl) btnLbl.textContent = 'Spielen';
    syncGameConfigUI();
    renderBlinkGameUI();
    renderEloBadgesInArena();
}

function renderArenaTrainedAIPicker() {
    const listEl = document.getElementById('arena-trained-ai-list');
    if (!listEl) return;
    const roster = (typeof brainState !== 'undefined' && Array.isArray(brainState.roster)) ? brainState.roster : [];
    if (roster.length === 0) {
        listEl.innerHTML = `
                    <div class="text-[11px] text-slate-400 leading-snug py-1">Noch keine eigene KI erstellt.</div>
                    <button type="button" onclick="navigateTo('lab'); setLabSubTab('brain'); openAICreator();" class="w-full py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs transition">
                        + KI im Labor erstellen
                    </button>
                `;
        return;
    }
    listEl.innerHTML = roster.map((item, idx) => {
        const active = idx === brainState.activeIdx;
        const col = typeof getAIDominantColor === 'function' ? getAIDominantColor(item) : '#22d3ee';
        const logoHtml = typeof getAILogoSVG === 'function' ? getAILogoSVG(item.logoId, col, 26) : '';
        return `
                    <button type="button" onclick="selectTrainedAIForArena(${idx})" class="w-full text-left px-2.5 py-2 rounded-xl border transition flex items-center gap-2.5 ${active ? 'border-emerald-400/70 bg-emerald-500/15' : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06]'}">
                        <div class="shrink-0">${logoHtml}</div>
                        <div class="min-w-0 flex-1">
                            <div class="text-xs font-bold text-white truncate">${item.name}</div>
                            <div class="text-[10px] mono text-slate-400">${item.elo} Elo · ${getEloRankInfo(item.elo).name}</div>
                        </div>
                        ${active ? '<span class="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>' : ''}
                    </button>
                `;
    }).join('');
}

function selectTrainedAIForArena(idx) {
    if (typeof brainState === 'undefined' || !brainState.roster[idx]) return;
    brainState.activeIdx = idx;
    if (typeof saveAIRosterState === 'function') saveAIRosterState();
    playSound('tick');
    updateAIDifficulty();
    renderArenaTrainedAIPicker();
}

function syncGameConfigUI() {
    const modeSel = document.getElementById('select-game-mode');
    const ruleSel = document.getElementById('select-rule-mode');
    const rawMode = modeSel ? modeSel.value : 'ai';
    if (ruleSel) gameState.ruleMode = ruleSel.value;

    let isVerhoer = gameState.ruleMode === 'verhoer';
    const isOnline = typeof p2pState !== 'undefined' && Boolean(p2pState.peer || p2pState.connected);
    const isTrainedAI = rawMode === 'trained-ai';

    gameState.mode = isOnline ? 'online' : 'ai';
    gameState.useTrainedBrain = (isTrainedAI || Boolean(gameState.isTrainingMatch)) && !isVerhoer && !isOnline;

    if (isOnline && isVerhoer) {
        gameState.ruleMode = 'normal';
        if (ruleSel) ruleSel.value = 'normal';
        isVerhoer = false;
        showSonnerToast('Online-P2P nutzt die Echtzeit-Modi (Standard oder Cluster).', 'neutral');
    } else if (isVerhoer) {
        gameState.mode = 'ai';
        gameState.useTrainedBrain = false;
        if (modeSel) modeSel.value = 'ai';
    }

    if (ruleSel) {
        const verhoerOpt = ruleSel.querySelector('option[value="verhoer"]');
        if (verhoerOpt) verhoerOpt.hidden = isOnline;
        const cWrap = ruleSel.closest('.fu-cselect');
        const verhoerBtn = cWrap ? cWrap.querySelector('.fu-cselect-option[data-val="verhoer"]') : null;
        if (verhoerBtn) verhoerBtn.classList.toggle('hidden', isOnline);
    }

    const hasOpponent = true;
    const isCluster = gameState.ruleMode === 'cluster';

    const modeWrap = document.getElementById('game-mode-select-wrapper');
    const speedCtrl = document.getElementById('ai-speed-controls');
    const trainedPicker = document.getElementById('trained-ai-picker-panel');
    const p2pPanel = document.getElementById('online-p2p-panel');
    const oppZone = document.getElementById('opponent-zone');
    const aiHandCont = document.getElementById('ai-hand-container');
    const aiWrap = document.getElementById('score-ai-wrapper');
    const soloZone = document.getElementById('solo-zone');
    const btnStocken = document.getElementById('btn-stocken');
    const autoDrawWrap = document.getElementById('auto-draw-label-wrap');
    const nameEl = document.getElementById('opponent-name-label');

    const isSparring = Boolean(gameState.isTrainingMatch);
    const normalTopBar = document.getElementById('game-top-tabs-bar');
    const sparringTopBar = document.getElementById('sparring-top-bar');
    if (normalTopBar) normalTopBar.classList.toggle('hidden', isSparring);
    if (sparringTopBar) sparringTopBar.classList.toggle('hidden', !isSparring);

    const ruleWrap = ruleSel ? (ruleSel.closest('.fu-cselect') || ruleSel) : null;
    if (ruleWrap) ruleWrap.classList.toggle('hidden', isSparring);

    if (modeWrap) modeWrap.classList.toggle('hidden', isVerhoer || isSparring || isOnline);
    if (speedCtrl) speedCtrl.classList.toggle('hidden', isOnline || isTrainedAI || isVerhoer || isSparring);
    if (trainedPicker) {
        const showPicker = isTrainedAI && !isVerhoer && !isSparring;
        trainedPicker.classList.toggle('hidden', !showPicker);
        if (showPicker) renderArenaTrainedAIPicker();
    }
    if (p2pPanel) p2pPanel.classList.toggle('hidden', !isOnline);
    if (oppZone) oppZone.classList.toggle('hidden', !hasOpponent);
    if (aiHandCont) aiHandCont.classList.toggle('hidden', !hasOpponent);
    if (aiWrap) aiWrap.classList.toggle('hidden', !hasOpponent);
    if (soloZone) soloZone.classList.toggle('hidden', hasOpponent);
    if (btnStocken) btnStocken.classList.toggle('hidden', isVerhoer);
    if (autoDrawWrap) autoDrawWrap.classList.toggle('hidden', isVerhoer || isOnline);
    if (isOnline && nameEl) {
        nameEl.textContent = p2pState.connected
            ? (p2pState.oppName || `Online-Gegner (${p2pState.roomCode})`)
            : 'Online-Gegner (Warte...)';
    }
    syncPlayerNameUI();

    const pile1Wrap = document.getElementById('center-pile-1-wrapper');
    const pile2Wrap = document.getElementById('center-pile-2-wrapper');
    const verhoerControls = document.getElementById('verhoer-table-controls');
    const verhoerPill = document.getElementById('verhoer-phase-pill');
    const lblPile0 = document.getElementById('label-pile-0');

    if (pile1Wrap) {
        pile1Wrap.classList.toggle('hidden', isVerhoer);
        pile1Wrap.classList.toggle('flex', !isVerhoer);
    }
    if (pile2Wrap) {
        pile2Wrap.classList.toggle('hidden', !isCluster);
        pile2Wrap.classList.toggle('flex', isCluster);
    }
    if (verhoerControls) {
        verhoerControls.classList.toggle('hidden', !isVerhoer);
        verhoerControls.classList.toggle('flex', isVerhoer);
    }
    if (verhoerPill) {
        verhoerPill.classList.toggle('hidden', !isVerhoer);
    }
    if (lblPile0) {
        lblPile0.textContent = isVerhoer ? 'Ablagestapel M₁' : 'Stapel M₁';
    }

    renderLeaderboard();
}

function onGameConfigChange() {
    syncGameConfigUI();
    gameState.isTrainingMatch = false;
    if (gameState.isRunning) {
        startNewBlinkGame();
    } else {
        initBlinkGameLobby();
        if (gameState.mode === 'online' && p2pState.role === 'host' && p2pState.connected) {
            p2pSend({ type: 'RULE_SYNC', ruleMode: gameState.ruleMode });
        }
    }
}

function updateAIDifficulty() {
    if (gameState.mode === 'online') {
        renderEloBadgesInArena();
        return;
    }
    const sel = document.getElementById('select-ai-difficulty');
    if (!sel) return;
    const isBrain = Boolean(gameState.useTrainedBrain);

    if (isBrain && typeof getActiveTrainedAI === 'function') {
        const ai = getActiveTrainedAI();
        if (ai) {
            gameState.aiIntervalMs = computeAIReflexIntervalMs(ai, 29, false, false);
            const nameEl = document.getElementById('opponent-name-label');
            if (nameEl) nameEl.textContent = gameState.ruleMode === 'verhoer'
                ? 'Taktik-Bot (Verhör-Duell)'
                : `${ai.name}${gameState.isTrainingMatch ? ' · Scrim' : ''}`;
        } else {
            gameState.useTrainedBrain = false;
            gameState.aiIntervalMs = 2800;
            const nameEl = document.getElementById('opponent-name-label');
            if (nameEl) nameEl.textContent = 'Keine KI erstellt (Mittel-Bot)';
        }
    } else {
        const preset = BOT_DIFFICULTY_PRESETS[sel.value] || BOT_DIFFICULTY_PRESETS.gold;
        gameState.aiIntervalMs = preset.intervalMs;
        const nameEl = document.getElementById('opponent-name-label');
        if (nameEl) nameEl.textContent = gameState.ruleMode === 'verhoer' ? 'Taktik-Bot (Verhör-Duell)' : preset.label;
    }
    renderEloBadgesInArena();
    if (gameState.isRunning && gameState.mode === 'ai' && gameState.ruleMode !== 'verhoer') restartAILoop();
}

function syncAbortButtonUI() {
    const btn = document.getElementById('btn-abort-game');
    if (btn) btn.classList.toggle('hidden', !gameState.isRunning);
}

function abortCurrentBlinkGame() {
    if (!gameState.isRunning) return;
    if (gameState.mode === 'online' && p2pState.role === 'guest') {
        p2pSend({ type: 'ABORT_REQ' });
    }
    const wasSparring = Boolean(gameState.isTrainingMatch);
    gameState.isRunning = false;
    gameState.isTrainingMatch = false;
    pauseGameLoops();
    if (typeof stopGameMusic === 'function') stopGameMusic();

    if (gameState.mode === 'online' && p2pState.role === 'host') {
        p2pSendStateSync('Die Partie wurde abgebrochen.', 'warn', null, true);
    }

    const timerDisp = document.getElementById('game-timer-display');
    if (timerDisp) {
        timerDisp.removeAttribute('data-flow-init');
        timerDisp.textContent = '00:00.0';
    }
    ['ai-training-pause-overlay', 'ai-training-summary-overlay', 'match-summary-overlay'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    initBlinkGameLobby();
    showSonnerToast('Partie beendet.', 'neutral');
    if (wasSparring && typeof exitSparringToLab === 'function') {
        exitSparringToLab();
    }
}

function pauseGameLoops() {
    syncAbortButtonUI();
    if (gameState.timerInterval) { clearInterval(gameState.timerInterval); gameState.timerInterval = null; }
    if (gameState.aiTimer) { clearTimeout(gameState.aiTimer); clearInterval(gameState.aiTimer); gameState.aiTimer = null; }
}

function scheduleNextAIMove(hadStreak = false, wasColorMatch = false) {
    if (gameState.aiTimer) { clearTimeout(gameState.aiTimer); gameState.aiTimer = null; }
    if (gameState.mode !== 'ai' || !gameState.isRunning || gameState.ruleMode === 'verhoer') return;

    let delay = gameState.aiIntervalMs;
    if (gameState.useTrainedBrain && typeof getActiveTrainedAI === 'function') {
        const ai = getActiveTrainedAI();
        if (ai) {
            const rem = gameState.aiDeck.length + gameState.aiHand.filter(Boolean).length;
            delay = computeAIReflexIntervalMs(ai, rem, hadStreak, wasColorMatch);
        }
    }
    gameState.aiTimer = setTimeout(() => executeAIMoveStep(), delay);
}

function restartAILoop() {
    scheduleNextAIMove(false, false);
}

function addMoveLogEntry(htmlContent) {
    gameState.moveCount++;
    const badge = document.getElementById('move-count-badge');
    if (badge) badge.textContent = `${gameState.moveCount} Züge`;
    const logEl = document.getElementById('game-move-log');
    if (logEl) {
        if (gameState.moveCount === 1) logEl.innerHTML = '';
        const entry = document.createElement('div');
        entry.className = 'p-1.5 rounded bg-slate-900 border border-slate-800/80 flex items-center justify-between gap-1 text-[10.5px]';
        entry.innerHTML = `<span class="text-slate-500">${gameState.moveCount}.</span> <div class="flex-1 truncate">${htmlContent}</div>`;
        logEl.prepend(entry);
    }
}
function startArenaTimerInterval() {
    if (gameState.timerInterval) clearInterval(gameState.timerInterval);
    gameState.timerInterval = setInterval(() => {
        if (!gameState.isRunning) return;
        const elapsed = (performance.now() - gameState.startTime) / 1000;
        const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const s = String(Math.floor(elapsed % 60)).padStart(2, '0');
        const ms = String(Math.floor((elapsed % 1) * 10));

        const updateDigit = (id, val) => {
            const col = document.getElementById(`flow-${id}`);
            if (col) col.style.transform = `translateY(-${val * 1.2}em)`;
        };
        updateDigit('m1', m[0]);
        updateDigit('m2', m[1]);
        updateDigit('s1', s[0]);
        updateDigit('s2', s[1]);
        updateDigit('ms', ms[0]);
    }, 100);
}

function maybeTriggerAITrainingPause(eventType) {
    if (!gameState.isTrainingMatch || !gameState.isRunning) return;
    if (gameState.trainingPauseCount >= 1) return; // Maximal 1 Lern-Pause pro Sparring-Match
    const ai = typeof getActiveTrainedAI === 'function' ? getActiveTrainedAI() : null;
    if (!ai) return;

    // Auslösen erst ab der Mitte der Partie (mind. 7–11 Züge)
    const shouldTrigger = (eventType === 'deadlock' && gameState.movesSincePause >= 7) ||
        (eventType === 'endgame' && gameState.movesSincePause >= 8) ||
        (gameState.movesSincePause >= 11);
    if (!shouldTrigger) return;

    gameState.movesSincePause = 0;
    gameState.trainingPauseCount++;
    gameState.pauseStartedAt = performance.now();
    pauseGameLoops();

    const scenarios = {
        deadlock: {
            tag: 'Lernmoment · Stocken (Deadlock)',
            title: `${ai.name} analysiert das Stocken`,
            desc: 'Beide Spieler konnten gerade nicht ablegen. Wie soll deine KI künftig auf solche Engpässe reagieren?',
            choices: [
                { label: 'Stapel-Vielfalt sichern', sub: '+3 Stabilität · +1 Kombo', deltas: { stabilitaet: 3, kombo: 1 } },
                { label: 'Gegner gezielt ausbremsen', sub: '+3 Sabotage · +1 Stabilität', deltas: { sabotage: 3, stabilitaet: 1 } }
            ]
        },
        streak: {
            tag: 'Lernmoment · Tempo-Serie',
            title: `${ai.name} studiert deine Serie!`,
            desc: 'Du hast mehrere Karten schnell hintereinander abgelegt. Was soll deine KI daraus mitnehmen?',
            choices: [
                { label: 'Reaktion schärfen', sub: '+3 Reflex · +1 Kombo', deltas: { reflex: 3, kombo: 1 } },
                { label: 'Eigene Ketten planen', sub: '+3 Kombo · +1 Reflex', deltas: { kombo: 3, reflex: 1 } }
            ]
        },
        endgame: {
            tag: 'Lernmoment · Endspiel-Druck',
            title: `Heiße Phase für ${ai.name}`,
            desc: 'Nur noch wenige Karten übrig! Worauf soll deine KI jetzt ihren Fokus legen?',
            choices: [
                { label: 'Endspiel-Fokus', sub: '+3 Reflex', deltas: { reflex: 3 } },
                { label: 'Kühler Kopf & Störfeuer', sub: '+2 Sabotage · +2 Stabilität', deltas: { sabotage: 2, stabilitaet: 2 } }
            ]
        },
        general: {
            tag: 'Lernmoment · Spielanalyse',
            title: `${ai.name} wertet die letzten Züge aus`,
            desc: 'Wähle den Trainings-Impuls, den deine KI noch in dieser Partie direkt anwenden soll:',
            choices: [
                { label: 'Reflex-Impuls', sub: '+2 Reflex · +1 Sabotage', deltas: { reflex: 2, sabotage: 1 } },
                { label: 'Taktik-Impuls', sub: '+2 Kombo · +1 Stabilität', deltas: { kombo: 2, stabilitaet: 1 } }
            ]
        }
    };

    const sc = scenarios[eventType] || scenarios.general;
    const choices = [...sc.choices];

    // Neue Spezial-Fähigkeit bei Elo-Meilensteinen (ab 1000 Elo für 2. Perk, ab 1400 Elo für 3. Perk)
    const canUnlockPerk = (ai.elo >= 1000 && ai.perks.length < 2) || (ai.elo >= 1400 && ai.perks.length < 3);
    if (canUnlockPerk && typeof AI_PERKS !== 'undefined') {
        const avail = AI_PERKS.filter(p => !ai.perks.includes(p.id));
        if (avail.length > 0) {
            const perk = avail[Math.floor(Math.random() * avail.length)];
            choices.push({
                label: `★ Fähigkeit lernen: ${perk.name}`,
                sub: perk.desc,
                perkId: perk.id
            });
        }
    }

    gameState.pendingPauseChoices = choices;

    const overlay = document.getElementById('ai-training-pause-overlay');
    const tagEl = document.getElementById('pause-event-tag');
    const titleEl = document.getElementById('pause-event-title');
    const descEl = document.getElementById('pause-event-desc');
    const gridEl = document.getElementById('pause-choices-grid');

    if (tagEl) tagEl.textContent = `${sc.tag}`;
    if (titleEl) titleEl.textContent = sc.title;
    if (descEl) descEl.textContent = sc.desc;
    if (gridEl) {
        gridEl.innerHTML = choices.map((c, idx) => `
                    <button onclick="applyTrainingPauseBonus(${idx})" class="w-full p-3.5 rounded-2xl border ${c.perkId ? 'border-amber-400/50 bg-amber-500/10 hover:bg-amber-500/20' : 'border-white/10 bg-white/[0.04] hover:bg-cyan-500/15 hover:border-cyan-400/60'} transition flex flex-col gap-0.5">
                        <span class="text-xs sm:text-sm font-extrabold ${c.perkId ? 'text-amber-300' : 'text-white'}">${c.label}</span>
                        <span class="text-[11px] text-slate-300">${c.sub}</span>
                    </button>
                `).join('');
    }
    if (overlay) overlay.classList.remove('hidden');
    playSound('flip');
}

function applyTrainingPauseBonus(choiceIdx) {
    const choices = gameState.pendingPauseChoices;
    const ai = typeof getActiveTrainedAI === 'function' ? getActiveTrainedAI() : null;
    if (!choices || !choices[choiceIdx] || !ai) return;

    const picked = choices[choiceIdx];
    if (picked.deltas) {
        Object.entries(picked.deltas).forEach(([k, v]) => {
            ai.traits[k] = Math.max(5, Math.min(100, ai.traits[k] + v));
        });
    }
    if (picked.perkId && !ai.perks.includes(picked.perkId)) {
        ai.perks.push(picked.perkId);
        playSound('win');
    } else {
        playSound('play');
    }

    if (typeof saveAIRosterState === 'function') saveAIRosterState();
    gameState.pendingPauseChoices = null;

    const overlay = document.getElementById('ai-training-pause-overlay');
    if (overlay) overlay.classList.add('hidden');

    // Pausenzeit aus der Stoppuhr herausrechnen & Partie fortsetzen
    const pausedMs = performance.now() - (gameState.pauseStartedAt || performance.now());
    gameState.startTime += pausedMs;
    startArenaTimerInterval();
    scheduleNextAIMove(false, false);

    showSonnerToast(`${ai.name} hat „${picked.label}“ gelernt — weiter geht's!`, 'success');
}
function startNewBlinkGame() {
    syncGameConfigUI();
    if (gameState.mode === 'online') {
        if (!p2pState.connected) {
            showSonnerToast('Verbinde dich zuerst rechts über einen Raum-Code mit einem Gegner!', 'warn');
            return;
        }
        if (p2pState.role === 'guest') {
            p2pSend({ type: 'REMATCH_REQ' });
            showSonnerToast('Anfrage an den Host gesendet — warte auf Spielstart...', 'neutral');
            return;
        }
    }

    pauseGameLoops();
    updateAIDifficulty();

    gameState.initialized = true;
    gameState.isRunning = true;
    gameState.selectedHandIndex = null;
    gameState.moveCount = 0;
    gameState.streak = 0;
    gameState.trainingPauseCount = 0;
    gameState.movesSincePause = 0;
    gameState.pendingPauseChoices = null;
    gameState.playerTrios = [];
    gameState.aiTrios = [];
    gameState.recalledCardKey = null;
    gameState.aiMemory = { knownPlayerCards: [], demandedProps: [], lastBotThought: 'Sammelt Start-Informationen über deine Hand.' };

    const overlay = document.getElementById('game-lobby-overlay');
    if (overlay) overlay.classList.add('hidden');
    const pauseOverlay = document.getElementById('ai-training-pause-overlay');
    if (pauseOverlay) pauseOverlay.classList.add('hidden');
    const summaryOverlay = document.getElementById('ai-training-summary-overlay');
    if (summaryOverlay) summaryOverlay.classList.add('hidden');
    const matchSummaryOverlay = document.getElementById('match-summary-overlay');
    if (matchSummaryOverlay) matchSummaryOverlay.classList.add('hidden');

    if (gameState.isTrainingMatch && typeof getActiveTrainedAI === 'function') {
        const ai = getActiveTrainedAI();
        if (ai) {
            gameState.trainingSnapshot = {
                aiElo: ai.elo,
                playerElo: playerEloState.elo,
                traits: { ...ai.traits },
                perks: [...(ai.perks || [])]
            };
            const spLbl = document.getElementById('sparring-top-label');
            if (spLbl) spLbl.textContent = `Scrim mit ${ai.name} (${ai.elo} Elo)`;
        }
    } else {
        gameState.trainingSnapshot = null;
    }
    const vPanel = document.getElementById('verhoer-interaction-panel');
    if (vPanel) vPanel.classList.add('hidden');
    const btnLbl = document.getElementById('btn-start-game-label');
    if (btnLbl) btnLbl.textContent = 'Neu starten';

    const logEl = document.getElementById('game-move-log');
    if (logEl) logEl.innerHTML = '<div class="text-slate-500 text-xs py-2 text-center">Partie läuft...</div>';
    const badge = document.getElementById('move-count-badge');
    if (badge) badge.textContent = '0 Züge';
    gameState.matchHistory = [];
    gameState.lastMatchDuration = null;
    gameState.lastMatchWinner = null;
    const analysisBtn = document.getElementById('btn-open-match-analysis');
    if (analysisBtn) analysisBtn.classList.add('hidden');

    if (gameState.ruleMode === 'verhoer') {
        const deck125 = shuffleArray(CARDS_125);
        const firstDiscard = deck125.pop();
        gameState.discardHistory = [firstDiscard];
        gameState.centerPiles = [firstDiscard];
        gameState.playerHand = deck125.splice(0, 5);
        gameState.aiHand = deck125.splice(0, 5);
        gameState.playerDeck = deck125;
        gameState.aiDeck = [];
        gameState.verhoerTurn = 'player';
        gameState.verhoerPhase = 'draw';
        setGameBanner('🕵️ Das Verhör: Ziehe zuerst deine 6. Karte (vom Nachziehstapel oder Rückruf von M₁)!', 'neutral');
    } else {
        const deck = shuffleArray(CARDS_60);
        if (gameState.ruleMode === 'cluster') {
            gameState.centerPiles = drawValidClusterTrioFromDeck(deck);
        } else {
            gameState.centerPiles = [deck.pop(), deck.pop()];
        }

        if (gameState.mode === 'ai' || gameState.mode === 'online') {
            const half = Math.floor(deck.length / 2);
            gameState.initialCardTotal = half;
            gameState.playerDeck = deck.slice(0, half);
            gameState.aiDeck = deck.slice(half, half * 2);
            gameState.playerHand = gameState.playerDeck.splice(0, 3);
            gameState.aiHand = gameState.aiDeck.splice(0, 3);
        } else {
            gameState.initialCardTotal = 30;
            gameState.playerDeck = deck.slice(0, 30);
            gameState.aiDeck = [];
            gameState.playerHand = gameState.playerDeck.splice(0, 3);
            gameState.aiHand = [];
        }
        gameState.matchHistory = [{
            step: 0,
            type: 'start',
            actor: null,
            t: 0,
            centerPiles: gameState.centerPiles.map(c => (c ? [...c] : null)),
            hostRem: gameState.playerDeck.length + gameState.playerHand.length,
            guestRem: gameState.aiDeck.length + gameState.aiHand.length
        }];

        const ruleText = gameState.ruleMode === 'cluster'
            ? 'Cluster-Modus aktiv: Alle 3 Mittelkarten (M₁, M₂, M₃) müssen paarweise komplett verschieden sein!'
            : 'Standard-Modus aktiv (2 Stapel • mind. 1 gleiche Eigenschaft)!';
        setGameBanner(ruleText, 'neutral');
    }

    gameState.startTime = performance.now();
    // Initiales Setup der rollenden Ziffern (Number Flow)
    const timerDisp = document.getElementById('game-timer-display');
    if (timerDisp && !timerDisp.hasAttribute('data-flow-init')) {
        timerDisp.innerHTML = '';
        const chars = ['m1', 'm2', 'colon', 's1', 's2', 'dot', 'ms'];
        chars.forEach(id => {
            const wrap = document.createElement('div');
            if (id === 'colon') { wrap.textContent = ':'; }
            else if (id === 'dot') { wrap.textContent = '.'; }
            else {
                wrap.className = 'number-flow-container';
                const col = document.createElement('div');
                col.className = 'number-flow-digit';
                col.id = `flow-${id}`;
                for (let i = 0; i <= 9; i++) {
                    const span = document.createElement('span');
                    span.textContent = i;
                    col.appendChild(span);
                }
                wrap.appendChild(col);
            }
            timerDisp.appendChild(wrap);
        });
        timerDisp.setAttribute('data-flow-init', 'true');
    }

    startArenaTimerInterval();
    if (typeof startGameMusic === 'function') startGameMusic('arena');

    if (gameState.mode === 'ai' && gameState.ruleMode !== 'verhoer') restartAILoop();
    renderBlinkGameUI();
    if (gameState.ruleMode !== 'verhoer') {
        checkDeadlockStatus();
        if (window.BlinkUnifiedPhysics) window.BlinkUnifiedPhysics.animateArenaOpeningDeal();
    }
    if (gameState.mode === 'online' && p2pState.role === 'host') {
        p2pSendStateSync('Online-Duell gestartet! Viel Erfolg.', 'success');
    }
}

const sonnerState = { toasts: [], maxVisible: 3 };

function showSonnerToast(message, tone = 'neutral') {
    const container = document.getElementById('sonner-toaster');
    if (!container) return;

    const icons = {
        success: '<span class="text-emerald-400 font-bold">✓</span>',
        warn: '<span class="text-rose-400 font-bold">✕</span>',
        ai: '<span class="inline-block w-2 h-2 rounded-full bg-rose-400 mt-1"></span>',
        neutral: '<span class="text-zinc-400">●</span>'
    };

    const el = document.createElement('div');
    el.className = 'sonner-toast';
    el.innerHTML = `
             <div class="mt-0.5 shrink-0">${icons[tone] || icons.neutral}</div>
             <div class="flex-1 font-medium">${message}</div>
             <button class="text-zinc-500 hover:text-zinc-200 text-xs font-bold px-1">✕</button>
         `;

    const toastObj = { el, timer: null };
    el.querySelector('button').onclick = () => dismissSonnerToast(toastObj);

    container.appendChild(el);
    sonnerState.toasts.unshift(toastObj);

    if (sonnerState.toasts.length > sonnerState.maxVisible) {
        const old = sonnerState.toasts.pop();
        dismissSonnerToast(old);
    }

    requestAnimationFrame(() => updateSonnerPositions());
    toastObj.timer = setTimeout(() => dismissSonnerToast(toastObj), 3800);
}

function updateSonnerPositions() {
    let currentOffsetY = 0;
    sonnerState.toasts.forEach((t, idx) => {
        t.el.style.setProperty('--index', idx);
        t.el.style.setProperty('--offset-y', currentOffsetY);
        t.el.classList.add('mounted');
        currentOffsetY += t.el.offsetHeight + 8;
    });
}

function dismissSonnerToast(toastObj) {
    if (!toastObj || toastObj.removing) return;
    toastObj.removing = true;
    clearTimeout(toastObj.timer);
    toastObj.el.classList.add('removing');
    sonnerState.toasts = sonnerState.toasts.filter(t => t !== toastObj);
    updateSonnerPositions();
    setTimeout(() => toastObj.el.remove(), 260);
}

function setGameBanner(text, tone = 'neutral') {
    // Zeigt die Nachrichten nur noch als aufpoppende Sonner-Toasts unten rechts an
    if (state.currentPage === 'game' && typeof showSonnerToast === 'function') {
        showSonnerToast(text, tone);
    }
}

function renderLargePlayingCardInner(card, compact = false, cornerMark = '') {
    if (!card) return `<div class="m-auto text-xs text-slate-400 pointer-events-none">Leer</div>`;
    const [x, y, z] = card;
    const anz = PALETTE_X[x], col = PALETTE_Y[y], sym = PALETTE_Z[z];
    const rightTag = `<span class="blink-card-badge">${cornerMark || `${anz.count}×`}</span>`;

    const topHeader = state.showGameCoords
        ? `<div class="blink-card-top">
                       <span>(${x},${y},${z})</span>
                       ${rightTag}
                   </div>`
        : `<div class="blink-card-top justify-end">${rightTag}</div>`;

    const bottomFooter = state.showGameCoords
        ? `<div class="blink-card-bot">
                       <span class="truncate">${col.name}</span>
                       <span class="truncate">${sym.name}</span>
                   </div>`
        : `<div class="h-1 pointer-events-none shrink-0"></div>`;

    return `
                <div class="blink-card-inner">
                    ${topHeader}
                    <div class="flex-1 w-full min-h-0 my-0.5 pointer-events-none overflow-hidden">
                        ${renderCardSymbolsHTML(x, y, z)}
                    </div>
                    ${bottomFooter}
                </div>
            `;
}

function renderMiniTrioGroupHTML(trios) {
    if (!trios || trios.length === 0) {
        return `<span class="text-[10px] text-slate-500 mono m-auto">Noch kein Trio</span>`;
    }
    return trios.map((trio, tIdx) => `
                <div class="flex items-center gap-1 bg-slate-950 px-1.5 py-1 rounded-lg border border-purple-500/40" title="Trio ${tIdx + 1}">
                    ${trio.map(([x, y, z]) => `
                        <div class="w-8 card-63-88 rounded bg-white border border-slate-300 flex flex-col items-center justify-center p-0.5 shadow-sm" title="(${x},${y},${z})">
                            ${renderCardSymbolsHTML(x, y, z, 8)}
                        </div>
                    `).join('')}
                </div>
            `).join('');
}

function renderBlinkGameUI() {
    syncAbortButtonUI();
    const isVerhoer = gameState.ruleMode === 'verhoer';
    const numPiles = getActivePileCount();

    for (let pileIdx = 0; pileIdx < numPiles; pileIdx++) {
        const pileEl = document.getElementById(`center-pile-${pileIdx}`);
        if (!pileEl) continue;
        pileEl.innerHTML = renderLargePlayingCardInner(gameState.centerPiles[pileIdx]);
        pileEl.className = 'w-[162px] sm:w-[190px] card-63-88 rounded-2xl bg-white border-4 border-slate-300 hover:border-slate-400 shadow-2xl flex flex-col justify-between p-3.5 cursor-pointer transition relative';
    }

    // Im Verhör-Modus: Phasen-Anzeige, Buttons & Trios aktualisieren
    if (isVerhoer) {
        const phasePill = document.getElementById('verhoer-phase-pill');
        const turnInd = document.getElementById('verhoer-turn-indicator');
        const btnDeck = document.getElementById('btn-verhoer-draw-deck');
        const btnDisc = document.getElementById('btn-verhoer-draw-discard');
        const btnTrio = document.getElementById('btn-verhoer-trio');
        const btnCluster = document.getElementById('btn-verhoer-cluster');

        const phaseLabels = {
            'draw': 'Phase 1: 6. Karte ziehen',
            'action': 'Phase 2 & 3: Trio melden / 1 Karte auf M₁ abwerfen',
            'interrogation': 'Phase 4: Verhör läuft',
            'bonus_discard': 'Verhör-Tausch: 1 eigene Handkarte abwerfen'
        };
        if (phasePill) phasePill.textContent = gameState.verhoerTurn === 'ai' ? '🤖 Bot ist am Zug...' : (phaseLabels[gameState.verhoerPhase] || '');
        if (turnInd) {
            turnInd.textContent = gameState.verhoerTurn === 'player' ? '👤 Dein Zug' : '🤖 Bot am Zug';
            turnInd.className = gameState.verhoerTurn === 'player' ? 'text-cyan-300 font-bold' : 'text-rose-400 font-bold';
        }

        const canDraw = gameState.isRunning && gameState.verhoerTurn === 'player' && gameState.verhoerPhase === 'draw';
        const hasTrio = findValidTrioIndices(gameState.playerHand) !== null;
        const hasCluster5 = findValidCluster5FromPool(gameState.playerHand, gameState.playerTrios) !== null;

        if (btnDeck) btnDeck.disabled = !canDraw;
        if (btnDisc) btnDisc.disabled = !canDraw || gameState.discardHistory.length === 0;
        if (btnTrio) {
            btnTrio.className = hasTrio && gameState.isRunning && gameState.verhoerTurn === 'player'
                ? 'px-3 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-extrabold text-xs transition flex items-center justify-center gap-1.5 shadow animate-pulse'
                : 'px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/40 font-bold text-xs transition flex items-center justify-center gap-1.5';
        }
        if (btnCluster) {
            btnCluster.className = hasCluster5 && gameState.isRunning
                ? 'px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs transition flex items-center justify-center gap-1.5 ring-2 ring-cyan-400/70 shadow-[0_0_20px_rgba(34,211,238,0.35)]'
                : 'px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition flex items-center justify-center gap-1.5 shadow';
        }

        const pTrioCount = document.getElementById('player-trio-count');
        const aTrioCount = document.getElementById('ai-trio-count');
        const pTrioCont = document.getElementById('player-trios-container');
        const aTrioCont = document.getElementById('ai-trios-container');
        if (pTrioCount) pTrioCount.textContent = gameState.playerTrios.length;
        if (aTrioCount) aTrioCount.textContent = gameState.aiTrios.length;
        if (pTrioCont) pTrioCont.innerHTML = renderMiniTrioGroupHTML(gameState.playerTrios);
        if (aTrioCont) aTrioCont.innerHTML = renderMiniTrioGroupHTML(gameState.aiTrios);
        renderVerhoerXRayUI();
    } else {
        const xrayPanel = document.getElementById('verhoer-ai-xray-panel');
        if (xrayPanel) xrayPanel.classList.add('hidden');
    }

    const handContainer = document.getElementById('player-hand-container');
    if (handContainer) {
        const cardWidthCls = isVerhoer
            ? 'flex-1 min-w-0 max-w-[112px]'
            : 'w-[126px] sm:w-[145px] md:w-[158px] shrink-0';

        handContainer.innerHTML = gameState.playerHand.map((card, idx) => {
            if (!card) {
                return `<div id="hand-card-el-${idx}" class="${cardWidthCls} card-63-88 rounded-2xl border-2 border-dashed border-white/[0.08] bg-white/[0.015] pointer-events-none opacity-40"></div>`;
            }
            const isSelected = gameState.selectedHandIndex === idx;
            const isRecalled = isVerhoer && gameState.recalledCardKey === keyOf(card[0], card[1], card[2]);
            const borderCls = isSelected ? 'border-cyan-400 selected-card' : 'border-slate-300 hover:border-slate-400';

            return `
                        <div id="hand-card-el-${idx}"
                             draggable="true"
                             ondragstart="onHandCardDragStart(event, ${idx})"
                             ondragend="onHandCardDragEnd(event, ${idx})"
                             onclick="selectPlayerHandCard(${idx})"
                             ondblclick="quickPlayHandCard(${idx})"
                             class="game-card ${cardWidthCls} card-63-88 rounded-2xl bg-white border-4 ${borderCls} shadow-xl flex flex-col justify-between p-1.5 sm:p-2 relative">
                            ${isRecalled ? `<span class="pointer-events-none absolute -top-2 right-1 px-1 py-0.5 rounded bg-amber-500 text-slate-950 text-[8.5px] font-extrabold mono shadow">M₁</span>` : ''}
                            ${renderLargePlayingCardInner(card, isVerhoer)}
                        </div>
                    `;
        }).join('');
    }

    const deckCountEl = document.getElementById('player-deck-count');
    const scorePrefixEl = document.getElementById('score-player-prefix');
    const scoreTotalEl = document.getElementById('score-player-total');
    const barLbl = document.getElementById('bar-player-label');
    const barProg = document.getElementById('bar-player-progress');
    const progTitle = document.getElementById('progress-box-title');

    if (deckCountEl) deckCountEl.textContent = gameState.playerDeck.length;

    if (isVerhoer) {
        const pClusterProg = getMaxClusterSubsetSize(gameState.playerHand, gameState.playerTrios);
        const aClusterProg = getMaxClusterSubsetSize(gameState.aiHand, gameState.aiTrios);
        if (progTitle) progTitle.textContent = 'Cluster-Fortschritt (Ziel: 5 / 5)';
        if (scorePrefixEl) scorePrefixEl.textContent = 'Cluster-Karten:';
        if (scoreTotalEl) scoreTotalEl.textContent = `${pClusterProg} / 5 kompatibel (${gameState.playerTrios.length} Trios)`;
        if (barLbl) barLbl.textContent = `${pClusterProg} / 5 Karten`;
        if (barProg) barProg.style.width = `${Math.round((pClusterProg / 5) * 100)}%`;

        const subStats = document.getElementById('opponent-sub-stats');
        const aiScore = document.getElementById('score-ai-total');
        const aiProg = document.getElementById('bar-ai-progress');
        const aiHC = document.getElementById('ai-hand-container');

        if (subStats) {
            subStats.innerHTML = `Geheime Hand: <strong class="text-rose-400">${gameState.aiHand.length} Karten</strong> • Offene Trios: <strong class="text-purple-300">${gameState.aiTrios.length}</strong>`;
        }
        if (aiScore) aiScore.textContent = `${aClusterProg} / 5 Karten`;
        if (aiProg) aiProg.style.width = `${Math.round((aClusterProg / 5) * 100)}%`;

        // Im Verhör-Modus sind die Handkarten des Gegners verdeckt!
        if (aiHC) {
            aiHC.innerHTML = gameState.aiHand.map((_, i) => `
                        <div class="w-10 sm:w-12 card-63-88 rounded-lg bg-gradient-to-br from-rose-900 via-slate-900 to-indigo-950 border-2 border-rose-400/50 p-1 flex flex-col items-center justify-center shadow" title="Verdeckte Gegnerkarte ${i + 1}">
                            <span class="text-[10px] font-extrabold text-rose-300 mono">?</span>
                        </div>
                    `).join('');
        }
    } else {
        const playerTotal = gameState.playerDeck.length + gameState.playerHand.length;
        const isVersus = gameState.mode === 'ai' || gameState.mode === 'online';
        const maxInitial = gameState.initialCardTotal || (isVersus ? (gameState.ruleMode === 'cluster' ? 28 : 29) : 30);
        const playerPct = Math.min(100, Math.max(0, Math.round((playerTotal / maxInitial) * 100)));
        if (progTitle) progTitle.textContent = 'Karten-Fortschritt';
        if (scorePrefixEl) scorePrefixEl.textContent = 'Karten übrig:';
        if (scoreTotalEl) scoreTotalEl.textContent = `${playerTotal} Karten`;
        if (barLbl) barLbl.textContent = `${playerTotal} Karten`;
        if (barProg) barProg.style.width = `${playerPct}%`;

        if (isVersus) {
            const aiTotal = gameState.aiDeck.length + gameState.aiHand.length;
            const aiPct = Math.min(100, Math.max(0, Math.round((aiTotal / maxInitial) * 100)));
            const subStats = document.getElementById('opponent-sub-stats');
            const aiScore = document.getElementById('score-ai-total');
            const aiProg = document.getElementById('bar-ai-progress');
            const aiHC = document.getElementById('ai-hand-container');

            if (subStats) {
                subStats.innerHTML = `Karten übrig: <strong id="ai-total-remaining" class="text-rose-400">${aiTotal}</strong> (Stapel: <span id="ai-deck-count">${gameState.aiDeck.length}</span> • Hand: <span id="ai-hand-count">${gameState.aiHand.length}</span>)`;
            }
            if (aiScore) aiScore.textContent = `${aiTotal} Karten`;
            if (aiProg) aiProg.style.width = `${aiPct}%`;

            if (aiHC) {
                aiHC.innerHTML = gameState.aiHand.filter(Boolean).map(([x, y, z]) => `
                            <div class="w-12 sm:w-14 card-63-88 rounded-lg bg-white border-2 border-slate-300 p-1 flex flex-col items-center justify-center shadow" title="KI-Handkarte">
                                ${renderCardSymbolsHTML(x, y, z, 11)}
                            </div>
                        `).join('');
            }
        } else {
            const streakEl = document.getElementById('solo-streak-count');
            if (streakEl) streakEl.textContent = `${gameState.streak}×`;
        }
    }
}

function triggerInvalidShake(elId, silent = false) {
    if (!silent) {
        playSound('error');
        if (window.BlinkHaptics) window.BlinkHaptics.vibrate([16, 28, 16]);
    }
    const el = document.getElementById(elId);
    if (!el) return;
    el.classList.remove('shake-invalid');
    void el.offsetWidth;
    el.classList.add('shake-invalid');
}

// ============================================================================
// SPEZIFISCHE LOGIK FÜR „BLINK: DAS VERHÖR“
// ============================================================================
function verhoerDrawFromDeck() {
    if (!gameState.isRunning || gameState.ruleMode !== 'verhoer') return;
    if (gameState.verhoerTurn !== 'player' || gameState.verhoerPhase !== 'draw') {
        setGameBanner('Du hast in diesem Zug bereits eine 6. Karte aufgenommen!', 'warn');
        return;
    }
    if (gameState.playerDeck.length === 0) {
        gameState.playerDeck = shuffleArray(CARDS_125);
    }
    const drawn = gameState.playerDeck.shift();
    gameState.playerHand.push(drawn);
    gameState.recalledCardKey = null;
    gameState.verhoerPhase = 'action';
    addMoveLogEntry(`<span class="text-cyan-400 font-bold">Du:</span> Blind vom Stapel gezogen`);
    setGameBanner('Karte gezogen (6 Handkarten). Melde optional ein Trio oder wirf 1 Karte auf M₁ ab!', 'neutral');
    renderBlinkGameUI();
}

function verhoerTakeFromDiscard() {
    if (!gameState.isRunning || gameState.ruleMode !== 'verhoer') return;
    if (gameState.verhoerTurn !== 'player' || gameState.verhoerPhase !== 'draw') {
        setGameBanner('Der taktische Rückruf ist nur zu Beginn deines Zuges (Phase 1) möglich!', 'warn');
        return;
    }
    if (gameState.discardHistory.length === 0 || !gameState.centerPiles[0]) {
        setGameBanner('Der Ablagestapel M₁ ist aktuell leer!', 'warn');
        return;
    }
    const taken = gameState.discardHistory.pop();
    gameState.playerHand.push(taken);
    gameState.recalledCardKey = keyOf(taken[0], taken[1], taken[2]);
    if (!gameState.aiMemory.knownPlayerCards.some(c => keyOf(...c) === keyOf(...taken))) {
        gameState.aiMemory.knownPlayerCards.push([...taken]);
    }
    gameState.centerPiles[0] = gameState.discardHistory.length > 0
        ? gameState.discardHistory[gameState.discardHistory.length - 1]
        : null;
    gameState.verhoerPhase = 'action';
    addMoveLogEntry(`<span class="text-amber-300 font-bold">Du:</span> Rückruf (${taken.join(',')}) von M₁`);
    setGameBanner(`Rückruf (${taken.join(',')}) aufgenommen! (Darf in diesem Zug nicht direkt wieder abgeworfen werden).`, 'neutral');
    renderBlinkGameUI();
}

function verhoerMeldTrio() {
    if (!gameState.isRunning || gameState.ruleMode !== 'verhoer') return;
    if (gameState.verhoerTurn !== 'player') return;
    const trioIdx = findValidTrioIndices(gameState.playerHand);
    if (!trioIdx) {
        setGameBanner('Kein gültiges 3er-Trio ($d_H=3$ paarweise) in deinen aktuellen Handkarten gefunden!', 'warn');
        return;
    }
    const [i, j, k] = trioIdx;
    const c3 = gameState.playerHand.splice(k, 1)[0];
    const c2 = gameState.playerHand.splice(j, 1)[0];
    const c1 = gameState.playerHand.splice(i, 1)[0];
    gameState.playerTrios.push([c1, c2, c3]);

    for (let d = 0; d < 3; d++) {
        if (gameState.playerDeck.length === 0) gameState.playerDeck = shuffleArray(CARDS_125);
        gameState.playerHand.push(gameState.playerDeck.shift());
    }
    gameState.selectedHandIndex = null;
    addMoveLogEntry(`<span class="text-purple-400 font-bold">Du:</span> 3er-Trio ausgelegt + 3 gezogen!`);
    setGameBanner(`Stark! Offenes 3er-Trio (${c1.join(',')}), (${c2.join(',')}), (${c3.join(',')}) gemeldet & 3 Karten nachgezogen!`, 'success');
    renderBlinkGameUI();
}

function verhoerCallCluster() {
    if (!gameState.isRunning || gameState.ruleMode !== 'verhoer') return;
    const winningCluster = findValidCluster5FromPool(gameState.playerHand, gameState.playerTrios);
    if (winningCluster) {
        gameState.isRunning = false;
        pauseGameLoops();
        if (typeof stopGameMusic === 'function') stopGameMusic();
        const elapsed = (performance.now() - gameState.startTime) / 1000;
        const timeStr = formatElapsedTime(elapsed);
        saveRecordTime('verhoer', elapsed, timeStr);
        playSound('win');
        updatePlayerEloAfterMatch(1200, true, 'Taktik-Bot (Verhör)', 28);
        const clusterStr = winningCluster.map(c => `(${c.join(',')})`).join(' • ');
        addMoveLogEntry(`<span class="text-emerald-400 font-bold">🏆 CLUSTER-SIEG:</span> ${clusterStr}`);
        setGameBanner(`🏆 CLUSTER! Du gewinnst mit dem perfekten Cluster: ${clusterStr}!`, 'success');
        renderBlinkGameUI();
    } else {
        setGameBanner('Noch kein vollständiges 5er-Cluster ($d_H = 3$ für alle 5 Karten) aus Hand & Trios vorhanden!', 'warn');
    }
}

function executeVerhoerDiscard(handIdx) {
    const card = gameState.playerHand[handIdx];
    if (!card) return;

    if (gameState.verhoerPhase === 'draw') {
        setGameBanner('Bitte ziehe zuerst deine 6. Karte (Button „📥 Blind ziehen“ oder „♻️ Rückruf“)!', 'warn');
        triggerInvalidShake(`hand-card-el-${handIdx}`);
        return;
    }

    // Falls der Spieler nach der Kartenübernahme im Verhör eine Karte abwirft:
    if (gameState.verhoerPhase === 'bonus_discard') {
        gameState.playerHand.splice(handIdx, 1);
        gameState.discardHistory.push(card);
        gameState.centerPiles[0] = card;
        gameState.selectedHandIndex = null;
        addMoveLogEntry(`<span class="text-cyan-400 font-bold">Du:</span> Tausch-Abwurf (${card.join(',')}) → M₁`);
        closeVerhoerPanelAndEndPlayerTurn();
        return;
    }

    if (gameState.verhoerPhase !== 'action') return;

    if (gameState.recalledCardKey && keyOf(card[0], card[1], card[2]) === gameState.recalledCardKey) {
        setGameBanner('Regel-Verstoß: Die gerade per Rückruf von M₁ genommene Karte darf nicht sofort wieder abgeworfen werden!', 'warn');
        triggerInvalidShake(`hand-card-el-${handIdx}`);
        return;
    }

    // Flug-Animation auslösen (Ziel ist immer M1 im Verhör)
    const cardEl = document.getElementById(`hand-card-el-${handIdx}`);
    const targetPile = document.getElementById(`center-pile-0`);

    if (cardEl && targetPile) {
        const startRect = cardEl.getBoundingClientRect();
        const targetRect = targetPile.getBoundingClientRect();

        cardEl.style.left = `${startRect.left}px`;
        cardEl.style.top = `${startRect.top}px`;
        cardEl.style.width = `${startRect.width}px`;
        cardEl.style.height = `${startRect.height}px`;
        cardEl.style.margin = '0';
        cardEl.classList.add('card-fly-discard');

        requestAnimationFrame(() => {
            cardEl.style.left = `${targetRect.left + (targetRect.width - startRect.width) / 2}px`;
            cardEl.style.top = `${targetRect.top + (targetRect.height - startRect.height) / 2}px`;
        });
    }

    setTimeout(() => {
        const prevTop = gameState.centerPiles[0];
        gameState.playerHand.splice(handIdx, 1);
        gameState.discardHistory.push(card);
        gameState.centerPiles[0] = card;
        gameState.selectedHandIndex = null;
        gameState.recalledCardKey = null;

        const dH = prevTop ? hammingDistance(card, prevTop) : 3;
        addMoveLogEntry(`<span class="text-cyan-400 font-bold">Du:</span> (${card.join(',')}) → M₁ [d_H=${dH}]`);
        renderBlinkGameUI();

        if (dH === 3) {
            setGameBanner(`Stiller Abwurf ($d_H = 3$ zu M₁) – kein Trigger. Der Bot ist am Zug...`, 'neutral');
            closeVerhoerPanelAndEndPlayerTurn();
        } else if (dH === 2) {
            openStandardVerhoerUI(card, prevTop);
        } else {
            openStrictVerhoerUI(card, prevTop);
        }
    }, 180);
}

function openStandardVerhoerUI(playedCard, prevCard) {
    gameState.verhoerPhase = 'interrogation';
    const panel = document.getElementById('verhoer-interaction-panel');
    const title = document.getElementById('verhoer-panel-title');
    const badge = document.getElementById('verhoer-panel-badge');
    const body = document.getElementById('verhoer-panel-body');
    if (!panel || !body) return;

    panel.classList.remove('hidden');
    title.textContent = '🕵️ Standard-Verhör ausgelöst (d_H = 2 • 1 gemeinsame Eigenschaft)';
    badge.textContent = 'Eigenschaft fordern';
    setGameBanner('🕵️ Standard-Verhör! Fordere gezielt eine Eigenschaftsausprägung vom Gegner.', 'success');

    const xBtns = [0, 1, 2, 3, 4].map(x => `<button onclick="verhoerDemandProperty(0, ${x})" class="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-slate-700 font-bold mono transition">${PALETTE_X[x].count}× (${PALETTE_X[x].word})</button>`).join('');
    const yBtns = [0, 1, 2, 3, 4].map(y => `<button onclick="verhoerDemandProperty(1, ${y})" class="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 border border-slate-700 font-bold mono transition flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full" style="background:${PALETTE_Y[y].hex}"></span>${PALETTE_Y[y].name}</button>`).join('');
    const zBtns = [0, 1, 2, 3, 4].map(z => `<button onclick="verhoerDemandProperty(2, ${z})" class="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-purple-500 hover:text-slate-950 text-purple-300 border border-slate-700 font-bold mono transition">${PALETTE_Z[z].name}</button>`).join('');

    body.innerHTML = `
                <p class="text-slate-300">Wähle <strong>genau eine Ausprägung</strong>, nach der du den Bot verhören möchtest:</p>
                <div class="space-y-2">
                    <div class="flex flex-wrap items-center gap-1.5"><span class="text-[10px] uppercase mono text-slate-400 w-16">Anzahl:</span>${xBtns}</div>
                    <div class="flex flex-wrap items-center gap-1.5"><span class="text-[10px] uppercase mono text-slate-400 w-16">Farbe:</span>${yBtns}</div>
                    <div class="flex flex-wrap items-center gap-1.5"><span class="text-[10px] uppercase mono text-slate-400 w-16">Symbol:</span>${zBtns}</div>
                </div>
            `;
    renderBlinkGameUI();
}

function verhoerDemandProperty(dim, val) {
    const body = document.getElementById('verhoer-panel-body');
    if (!body) return;
    const dimNames = ['Anzahl', 'Farbe', 'Symbol'];
    const valName = dim === 0 ? `${PALETTE_X[val].count}× (${PALETTE_X[val].word})` : (dim === 1 ? PALETTE_Y[val].name : PALETTE_Z[val].name);
    const propLabel = `${dimNames[dim]}: ${valName}`;
    if (!gameState.aiMemory.demandedProps.includes(propLabel)) {
        gameState.aiMemory.demandedProps.push(propLabel);
    }

    const matchingIndices = [];
    gameState.aiHand.forEach((c, idx) => {
        if (c[dim] === val) matchingIndices.push(idx);
    });

    if (matchingIndices.length === 0) {
        addMoveLogEntry(`<span class="text-amber-300">Verhör:</span> Bot hat keine Karte mit ${valName}`);
        body.innerHTML = `
                    <div class="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <span>🤖 <strong>Antwort des Bots:</strong> „Ich besitze <em>keine</em> Karte mit <strong>${dimNames[dim]}: ${valName}</strong>!“</span>
                        <button onclick="closeVerhoerPanelAndEndPlayerTurn()" class="px-4 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs">Zug beenden →</button>
                    </div>
                `;
        return;
    }

    // Bot wählt eine passende Karte zum Vorzeigen
    const chosenIdx = matchingIndices[0];
    const offeredCard = gameState.aiHand[chosenIdx];
    gameState.pendingVerhoerIdx = chosenIdx;
    gameState.pendingVerhoerCard = offeredCard;

    const [x, y, z] = offeredCard;
    addMoveLogEntry(`<span class="text-amber-300">Verhör:</span> Bot zeigt (${x},${y},${z})`);

    body.innerHTML = `
                <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div class="flex items-center gap-3">
                        <div class="w-16 card-63-88 rounded-xl bg-white border-2 border-amber-400 p-1.5 flex flex-col justify-between shadow-lg shrink-0">
                            <div class="text-[9px] font-bold mono text-slate-700 text-center">(${x},${y},${z})</div>
                            <div class="flex-1 flex items-center justify-center">${renderCardSymbolsHTML(x, y, z, 14)}</div>
                        </div>
                        <div class="space-y-1">
                            <div class="font-bold text-white">🤖 Bot zeigt dir: (${x},${y},${z}) → ${PALETTE_X[x].count}× ${PALETTE_Y[y].name} ${PALETTE_Z[z].name}</div>
                            <div class="text-[11px] text-slate-400">Möchtest du diese Karte auf deine Hand nehmen (und 1 eigene abwerfen) oder ablehnen (Bot muss sie auf M₁ abwerfen)?</div>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                        <button onclick="resolveVerhoerDecision(true)" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs">📥 Karte übernehmen</button>
                        <button onclick="resolveVerhoerDecision(false)" class="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs">🗑️ Ablehnen (Bot wirft ab)</button>
                    </div>
                </div>
            `;
}

function openStrictVerhoerUI() {
    gameState.verhoerPhase = 'interrogation';
    const panel = document.getElementById('verhoer-interaction-panel');
    const title = document.getElementById('verhoer-panel-title');
    const badge = document.getElementById('verhoer-panel-badge');
    const body = document.getElementById('verhoer-panel-body');
    if (!panel || !body) return;

    panel.classList.remove('hidden');
    title.textContent = '⚡ Verschärftes Verhör ausgelöst (d_H = 1 • 2 gemeinsame Eigenschaften!)';
    badge.textContent = 'Blinder Zugriff';
    setGameBanner('⚡ Verschärftes Verhör! Ziehe blind eine Karte direkt aus der Hand des Bots.', 'success');

    const cardButtons = gameState.aiHand.map((_, idx) => `
                <button onclick="verhoerBlindDrawFromAI(${idx})" class="w-16 card-63-88 rounded-xl bg-gradient-to-br from-rose-800 to-indigo-950 hover:from-amber-500 hover:to-amber-600 border-2 border-rose-400/60 hover:border-white flex flex-col items-center justify-center gap-1 shadow-lg transition group">
                    <span class="text-xs font-extrabold text-white group-hover:text-slate-950 mono">#${idx + 1}</span>
                    <span class="text-[9px] text-rose-200 group-hover:text-slate-950 uppercase font-bold">Ziehen</span>
                </button>
            `).join('');

    body.innerHTML = `
                <p class="text-slate-300">Wähle blind <strong>eine verdeckte Handkarte des Gegners</strong> zur geheimen Prüfung:</p>
                <div class="flex flex-wrap items-center gap-3 pt-1">${cardButtons}</div>
            `;
    renderBlinkGameUI();
}

function verhoerBlindDrawFromAI(idx) {
    const body = document.getElementById('verhoer-panel-body');
    if (!body || !gameState.aiHand[idx]) return;
    const drawnCard = gameState.aiHand[idx];
    gameState.pendingVerhoerIdx = idx;
    gameState.pendingVerhoerCard = drawnCard;
    const [x, y, z] = drawnCard;

    body.innerHTML = `
                <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div class="flex items-center gap-3">
                        <div class="w-16 card-63-88 rounded-xl bg-white border-2 border-cyan-400 p-1.5 flex flex-col justify-between shadow-lg shrink-0">
                            <div class="text-[9px] font-bold mono text-slate-700 text-center">(${x},${y},${z})</div>
                            <div class="flex-1 flex items-center justify-center">${renderCardSymbolsHTML(x, y, z, 14)}</div>
                        </div>
                        <div class="space-y-1">
                            <div class="font-bold text-white">🕵️ Geheime Prüfung: (${x},${y},${z}) → ${PALETTE_X[x].count}× ${PALETTE_Y[y].name} ${PALETTE_Z[z].name}</div>
                            <div class="text-[11px] text-slate-400">Behältst du diese Karte (und wirfst 1 eigene ab) oder zwingst du den Bot zur Zwangsentfernung auf M₁?</div>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                        <button onclick="resolveVerhoerDecision(true)" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs">📥 Behalten (+1 eigene abwerfen)</button>
                        <button onclick="resolveVerhoerDecision(false)" class="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs">🔥 Zwangsentfernung auf M₁</button>
                    </div>
                </div>
            `;
}

function resolveVerhoerDecision(takeCard) {
    const idx = gameState.pendingVerhoerIdx;
    const card = gameState.pendingVerhoerCard;
    if (idx === null || !card) return;

    // Entferne Karte beim Bot und lasse Bot 1 nachziehen
    gameState.aiHand.splice(idx, 1);
    if (gameState.playerDeck.length === 0) gameState.playerDeck = shuffleArray(CARDS_125);
    gameState.aiHand.push(gameState.playerDeck.shift());

    const panel = document.getElementById('verhoer-interaction-panel');
    if (panel) panel.classList.add('hidden');

    if (takeCard) {
        gameState.playerHand.push(card);
        gameState.verhoerPhase = 'bonus_discard';
        addMoveLogEntry(`<span class="text-emerald-400 font-bold">Du:</span> (${card.join(',')}) vom Bot übernommen`);
        setGameBanner(`Karte (${card.join(',')}) übernommen! Wirf jetzt zum Ausgleich 1 deiner 6 Handkarten auf M₁ ab.`, 'success');
        renderBlinkGameUI();
    } else {
        gameState.discardHistory.push(card);
        gameState.centerPiles[0] = card;
        addMoveLogEntry(`<span class="text-rose-400 font-bold">Strafabwurf:</span> Bot muss (${card.join(',')}) auf M₁ werfen`);
        setGameBanner(`Abgelehnt! Bot musste (${card.join(',')}) auf M₁ abwerfen und blind nachziehen.`, 'neutral');
        closeVerhoerPanelAndEndPlayerTurn();
    }
}

function closeVerhoerPanelAndEndPlayerTurn() {
    const panel = document.getElementById('verhoer-interaction-panel');
    if (panel) panel.classList.add('hidden');
    gameState.pendingVerhoerCard = null;
    gameState.pendingVerhoerIdx = null;
    gameState.verhoerTurn = 'ai';
    renderBlinkGameUI();

    setTimeout(() => {
        if (!gameState.isRunning || gameState.ruleMode !== 'verhoer') return;
        executeAIVerhoerTurn();
    }, 950);
}

function toggleVerhoerXRay() {
    gameState.verhoerXRayOpen = !gameState.verhoerXRayOpen;
    playSound('tick');
    renderVerhoerXRayUI();
}

function getBestCompatibleSubset(cards) {
    let best = [];
    function bt(start, cur) {
        if (cur.length > best.length) best = [...cur];
        if (best.length === 5) return;
        for (let i = start; i < cards.length; i++) {
            if (cur.every(c => areCardsCompletelyDifferent(c, cards[i]))) {
                cur.push(cards[i]);
                bt(i + 1, cur);
                cur.pop();
                if (best.length === 5) return;
            }
        }
    }
    bt(0, []);
    return best;
}

function syncBotKnownPlayerCards() {
    const actualKeys = new Set(gameState.playerHand.map(c => keyOf(...c)));
    gameState.aiMemory.knownPlayerCards = gameState.aiMemory.knownPlayerCards.filter(c => actualKeys.has(keyOf(...c)));
}

function renderVerhoerXRayUI() {
    const btn = document.getElementById('btn-verhoer-xray');
    const panel = document.getElementById('verhoer-ai-xray-panel');
    if (btn) {
        btn.textContent = gameState.verhoerXRayOpen ? 'KI-X-Ray: An' : 'KI-X-Ray: Aus';
        btn.className = gameState.verhoerXRayOpen
            ? 'px-2 py-0.5 rounded-full text-[10px] font-bold border border-purple-400/60 bg-purple-500/20 text-purple-200 transition'
            : 'px-2 py-0.5 rounded-full text-[10px] font-bold border border-white/15 bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 transition';
    }
    if (!panel) return;
    panel.classList.toggle('hidden', !gameState.verhoerXRayOpen || gameState.ruleMode !== 'verhoer');
    if (!gameState.verhoerXRayOpen || gameState.ruleMode !== 'verhoer') return;

    syncBotKnownPlayerCards();

    const pProg = getMaxClusterSubsetSize(gameState.playerHand, gameState.playerTrios);
    const aProg = getMaxClusterSubsetSize(gameState.aiHand, gameState.aiTrios);
    const evalDiff = (pProg + gameState.playerTrios.length * 0.4) - (aProg + gameState.aiTrios.length * 0.4);
    const pct = Math.max(12, Math.min(88, Math.round(50 + evalDiff * 14)));

    const evalBar = document.getElementById('xray-eval-bar');
    const evalLbl = document.getElementById('xray-eval-label');
    if (evalBar) evalBar.style.width = `${pct}%`;
    if (evalLbl) {
        const sign = evalDiff > 0.05 ? '+' : '';
        evalLbl.textContent = Math.abs(evalDiff) < 0.05
            ? 'Ausgeglichen (0.0)'
            : `${evalDiff > 0 ? 'Vorteil Du' : 'Vorteil Bot'} (${sign}${evalDiff.toFixed(1)})`;
    }

    const knownEl = document.getElementById('xray-known-player');
    const needsEl = document.getElementById('xray-suspected-needs');
    if (knownEl) {
        knownEl.innerHTML = gameState.aiMemory.knownPlayerCards.length > 0
            ? `Bekannt auf deiner Hand: ${gameState.aiMemory.knownPlayerCards.map(c => `<span class="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-200">(${c.join(',')})</span>`).join(' ')}`
            : 'Noch keine Handkarten sicher aufgedeckt (wird bei Rückruf von M₁ erkannt).';
    }
    if (needsEl) {
        const hints = [];
        if (gameState.playerTrios.length > 0) {
            const t0 = gameState.playerTrios[0];
            const missX = [0, 1, 2, 3, 4].filter(v => !t0.some(c => c[0] === v)).map(v => `${PALETTE_X[v].count}×`);
            const missY = [0, 1, 2, 3, 4].filter(v => !t0.some(c => c[1] === v)).map(v => PALETTE_Y[v].name);
            hints.push(`Fehlt zu deinem Trio #1: ${missX.join('/')} · ${missY.join('/')}`);
        }
        if (gameState.aiMemory.demandedProps.length > 0) {
            hints.push(`Gefordert im Verhör: ${gameState.aiMemory.demandedProps.slice(-3).join(', ')}`);
        }
        needsEl.textContent = hints.length > 0 ? hints.join(' | ') : 'Noch keine offenen Trio- oder Verhör-Signale ausgewertet.';
    }

    const botPool = [...gameState.aiHand];
    gameState.aiTrios.forEach(t => t.forEach(c => botPool.push(c)));
    const botCore = getBestCompatibleSubset(botPool);

    const coreEl = document.getElementById('xray-bot-core');
    const nextEl = document.getElementById('xray-bot-next');
    if (coreEl) {
        coreEl.innerHTML = `Cluster-Kern (${botCore.length}/5): ${botCore.map(c => `<span class="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-200">(${c.join(',')})</span>`).join(' ')}`;
    }
    if (nextEl) {
        nextEl.textContent = gameState.aiMemory.lastBotThought || 'Sucht passende Ergänzungen und prüft Verhör-Trigger auf M₁.';
    }
}

function executeAIVerhoerTurn() {
    if (!gameState.isRunning || gameState.ruleMode !== 'verhoer') return;
    syncBotKnownPlayerCards();

    // 1. Ziehen (Taktischer Rückruf von M₁, falls die Karte den Bot-Cluster-Kern vergrößert)
    const topDiscard = gameState.centerPiles[0];
    const curScore = getMaxClusterSubsetSize(gameState.aiHand, gameState.aiTrios);
    let recalledKey = null;
    if (topDiscard && gameState.discardHistory.length > 0 &&
        getMaxClusterSubsetSize([...gameState.aiHand, topDiscard], gameState.aiTrios) > curScore) {
        const taken = gameState.discardHistory.pop();
        gameState.aiHand.push(taken);
        recalledKey = keyOf(...taken);
        gameState.centerPiles[0] = gameState.discardHistory.length > 0 ? gameState.discardHistory[gameState.discardHistory.length - 1] : null;
        gameState.aiMemory.lastBotThought = `Hat (${taken.join(',')}) per Rückruf von M₁ genommen (verbessert Cluster-Kern auf ${curScore + 1}/5).`;
        addMoveLogEntry(`<span class="text-rose-400 font-bold">Bot:</span> Rückruf (${taken.join(',')}) von M₁`);
    } else {
        if (gameState.playerDeck.length === 0) gameState.playerDeck = shuffleArray(CARDS_125);
        gameState.aiHand.push(gameState.playerDeck.shift());
    }

    // 2. Prüfe ob Bot ein 3er-Trio auslegen kann
    const aiTrioIdx = findValidTrioIndices(gameState.aiHand);
    if (aiTrioIdx) {
        const [i, j, k] = aiTrioIdx;
        const c3 = gameState.aiHand.splice(k, 1)[0];
        const c2 = gameState.aiHand.splice(j, 1)[0];
        const c1 = gameState.aiHand.splice(i, 1)[0];
        gameState.aiTrios.push([c1, c2, c3]);
        for (let d = 0; d < 3; d++) {
            if (gameState.playerDeck.length === 0) gameState.playerDeck = shuffleArray(CARDS_125);
            gameState.aiHand.push(gameState.playerDeck.shift());
        }
        addMoveLogEntry(`<span class="text-rose-400 font-bold">Bot:</span> 3er-Trio offen ausgelegt!`);
    }

    // 3. Prüfe ob Bot gewonnen hat (5er-Cluster)
    const aiWinCluster = findValidCluster5FromPool(gameState.aiHand, gameState.aiTrios);
    if (aiWinCluster) {
        gameState.isRunning = false;
        pauseGameLoops();
        if (typeof stopGameMusic === 'function') stopGameMusic();
        const cStr = aiWinCluster.map(c => `(${c.join(',')})`).join(' • ');
        addMoveLogEntry(`<span class="text-rose-400 font-bold">BOT-CLUSTER:</span> ${cStr}`);
        setGameBanner(`Der Bot ruft „Cluster!“ und gewinnt mit: ${cStr}`, 'ai');
        updatePlayerEloAfterMatch(1200, false, 'Taktik-Bot (Verhör)', 28);
        renderBlinkGameUI();
        return;
    }

    // 4. Intelligenter Abwurf: schützt eigenen Cluster-Kern und sucht Verhör-Trigger (d_H <= 2)
    const prevTop = gameState.centerPiles[0];
    let bestDiscardIdx = gameState.aiHand.length - 1;
    let bestVal = -999;
    gameState.aiHand.forEach((cand, idx) => {
        if (recalledKey && keyOf(...cand) === recalledKey) return;
        const remHand = gameState.aiHand.filter((_, i) => i !== idx);
        const remScore = getMaxClusterSubsetSize(remHand, gameState.aiTrios);
        const dH = prevTop ? hammingDistance(cand, prevTop) : 3;
        const triggerBonus = dH === 1 ? 1.4 : (dH === 2 ? 0.9 : 0);
        const val = remScore * 3 + triggerBonus;
        if (val > bestVal) {
            bestVal = val;
            bestDiscardIdx = idx;
        }
    });

    const discardCard = gameState.aiHand.splice(bestDiscardIdx, 1)[0];
    gameState.discardHistory.push(discardCard);
    gameState.centerPiles[0] = discardCard;
    const dH = prevTop ? hammingDistance(discardCard, prevTop) : 3;

    let msg = `Bot wirft (${discardCard.join(',')}) auf M₁ ab (d_H=${dH}).`;
    addMoveLogEntry(`<span class="text-rose-400 font-bold">Bot:</span> (${discardCard.join(',')}) → M₁ [d_H=${dH}]`);

    // Falls Bot ein Verhör auslöst, sabotiert er gezielt bekannte Handkarten des Spielers
    if (dH <= 2 && gameState.playerHand.length > 0) {
        let targetIdx = -1;
        if (gameState.aiMemory.knownPlayerCards.length > 0) {
            const knownKey = keyOf(...gameState.aiMemory.knownPlayerCards[0]);
            targetIdx = gameState.playerHand.findIndex(c => keyOf(...c) === knownKey);
        }
        if (targetIdx === -1) targetIdx = Math.floor(Math.random() * gameState.playerHand.length);

        const forcedCard = gameState.playerHand.splice(targetIdx, 1)[0];
        gameState.discardHistory.push(forcedCard);
        gameState.centerPiles[0] = forcedCard;
        if (gameState.playerDeck.length === 0) gameState.playerDeck = shuffleArray(CARDS_125);
        gameState.playerHand.push(gameState.playerDeck.shift());
        gameState.aiMemory.lastBotThought = `Löst Verhör (d_H=${dH}) aus und zwingt gezielt (${forcedCard.join(',')}) aus deiner Hand auf M₁.`;
        msg = `Bot löst Verhör aus (d_H=${dH}) und zwingt deine Karte (${forcedCard.join(',')}) auf M₁! Du bist am Zug.`;
        addMoveLogEntry(`<span class="text-rose-400 font-bold">Bot-Verhör:</span> Deine (${forcedCard.join(',')}) → M₁`);
    } else {
        gameState.aiMemory.lastBotThought = `Warf (${discardCard.join(',')}) ab (d_H=${dH}), um seinen Cluster-Kern intakt zu halten.`;
        msg += ` Dein Zug: Ziehe deine 6. Karte!`;
    }

    gameState.verhoerTurn = 'player';
    gameState.verhoerPhase = 'draw';
    setGameBanner(msg, 'ai');
    renderBlinkGameUI();
}

function selectPlayerHandCard(handIdx) {
    if (!gameState.isRunning || !gameState.playerHand[handIdx]) return;
    if (gameState.selectedHandIndex === handIdx) {
        gameState.selectedHandIndex = null;
        renderBlinkGameUI();
        return;
    }
    gameState.selectedHandIndex = handIdx;
    const targetHint = gameState.ruleMode === 'verhoer' ? 'Ablagestapel M₁' : (gameState.ruleMode === 'cluster' ? 'M₁, M₂ oder M₃' : 'M₁ oder M₂');
    renderBlinkGameUI();
}

function sendGuestPlayRequest(handIdx, pileIdx, card) {
    const cardKey = keyOf(card[0], card[1], card[2]);
    const now = performance.now();
    if (p2pState.pendingPlayKey === cardKey && now < (p2pState.pendingPlayUntil || 0)) {
        return;
    }
    p2pState.pendingPlayKey = cardKey;
    p2pState.pendingPlayUntil = now + 450;
    gameState.selectedHandIndex = null;
    p2pSend({ type: 'PLAY_REQ', handIdx, pileIdx, card: [...card] });
    playSound('play');
}

function quickPlayHandCard(handIdx) {
    if (!gameState.isRunning || !gameState.playerHand[handIdx]) return;
    if (gameState.ruleMode === 'verhoer') {
        executeVerhoerDiscard(handIdx);
        return;
    }
    const card = gameState.playerHand[handIdx];
    const numPiles = getActivePileCount();
    for (let p = 0; p < numPiles; p++) {
        if (canPlayCardOnPile(card, p)) {
            if (gameState.mode === 'online' && p2pState.role === 'guest') {
                sendGuestPlayRequest(handIdx, p, card);
                return;
            }
            executeCardPlay('player', handIdx, p);
            return;
        }
    }
    gameState.streak = 0;
    triggerInvalidShake(`hand-card-el-${handIdx}`);
    if (window.BlinkHaptics) {
        window.BlinkHaptics.floatBadge(
            document.getElementById(`hand-card-el-${handIdx}`),
            gameState.ruleMode === 'cluster' ? 'Ungültiges Trio' : 'Kein Match',
            'rose'
        );
    }
}

function tryPlaySelectedOnPile(pileIdx) {
    if (!gameState.isRunning) return;
    if (gameState.ruleMode === 'verhoer') {
        if (gameState.verhoerTurn === 'player' && gameState.verhoerPhase === 'draw' && gameState.selectedHandIndex === null) {
            verhoerTakeFromDiscard();
            return;
        }
        if (gameState.selectedHandIndex !== null) {
            executeVerhoerDiscard(gameState.selectedHandIndex);
        }
        return;
    }
    if (gameState.selectedHandIndex === null) return;
    const handIdx = gameState.selectedHandIndex;
    const card = gameState.playerHand[handIdx];

    if (canPlayCardOnPile(card, pileIdx)) {
        if (gameState.mode === 'online' && p2pState.role === 'guest') {
            sendGuestPlayRequest(handIdx, pileIdx, card);
            return;
        }
        executeCardPlay('player', handIdx, pileIdx);
    } else {
        gameState.streak = 0;
        triggerInvalidShake(`center-pile-${pileIdx}`);
        triggerInvalidShake(`hand-card-el-${handIdx}`, true);
        if (window.BlinkHaptics) {
            window.BlinkHaptics.floatBadge(
                document.getElementById(`hand-card-el-${handIdx}`),
                gameState.ruleMode === 'cluster' ? 'Ungültiges Trio' : 'Kein Match',
                'rose'
            );
        }
    }
}

function executeCardPlay(actor, handIdx, pileIdx) {
    if (!gameState.isRunning) return;
    const hand = actor === 'player' ? gameState.playerHand : gameState.aiHand;
    const deck = actor === 'player' ? gameState.playerDeck : gameState.aiDeck;
    const playedCard = hand[handIdx];
    if (!playedCard || !canPlayCardOnPile(playedCard, pileIdx)) return;

    const prevCenterCard = gameState.centerPiles[pileIdx] ? [...gameState.centerPiles[pileIdx]] : null;
    const reasons = getMatchingReasons(playedCard, pileIdx);
    const tone = actor === 'player' ? (gameState.ruleMode === 'cluster' ? 'purple' : 'cyan') : 'rose';
    const skipFly = Boolean(window._hapticSkipNextFly);
    window._hapticSkipNextFly = false;

    if (actor === 'player') playSound('play');

    const targetPile = document.getElementById(`center-pile-${pileIdx}`);
    if (window.BlinkHaptics && targetPile) {
        if (actor === 'player' && !skipFly) {
            const cardEl = document.getElementById(`hand-card-el-${handIdx}`);
            if (cardEl) window.BlinkHaptics.flyCard(cardEl, targetPile, () => { }, { duration: 155, tone });
        } else if (actor === 'ai') {
            const aiHandBox = document.getElementById('ai-hand-container');
            const aiCardEl = aiHandBox && aiHandBox.children[handIdx] ? aiHandBox.children[handIdx] : aiHandBox;
            if (aiCardEl) window.BlinkHaptics.flyCard(aiCardEl, targetPile, () => { }, { duration: 145, tone: 'rose', hideSource: false });
        }
    }

    gameState.centerPiles[pileIdx] = [...playedCard];
    hand.splice(handIdx, 1);

    const autoDrawEl = document.getElementById('chk-auto-draw');
    const autoDraw = gameState.mode === 'online' || !autoDrawEl || autoDrawEl.checked;
    let drewCard = false;
    if (actor === 'ai' || autoDraw) {
        while (hand.length < 3 && deck.length > 0) {
            hand.push(deck.shift());
            drewCard = true;
        }
    }

    if (actor === 'player') {
        gameState.selectedHandIndex = null;
        gameState.streak++;
    } else if (gameState.selectedHandIndex !== null && gameState.selectedHandIndex >= gameState.playerHand.length) {
        gameState.selectedHandIndex = null;
    }

    if (!Array.isArray(gameState.matchHistory)) gameState.matchHistory = [];
    const elapsedSec = gameState.startTime ? Math.max(0, (performance.now() - gameState.startTime) / 1000) : 0;
    gameState.matchHistory.push({
        step: gameState.matchHistory.length,
        type: 'play',
        actor: actor === 'player' ? 'host' : 'guest',
        card: [...playedCard],
        prevCard: prevCenterCard,
        pileIdx,
        reason: reasons[0] || '',
        t: Number(elapsedSec.toFixed(2)),
        centerPiles: gameState.centerPiles.map(c => (c ? [...c] : null)),
        hostRem: gameState.playerDeck.length + gameState.playerHand.length,
        guestRem: gameState.aiDeck.length + gameState.aiHand.length
    });

    renderMoveLogFromHistory();
    renderBlinkGameUI();

    if (window.BlinkHaptics) {
        const pileEl = document.getElementById(`center-pile-${pileIdx}`);
        if (actor === 'player') {
            const badgeText = gameState.streak >= 3
                ? `${gameState.streak}× Flow · ${reasons[0].split(':')[0]}`
                : reasons[0];
            window.BlinkHaptics.floatBadge(pileEl, badgeText, gameState.streak >= 3 ? 'emerald' : tone);
            if (drewCard) {
                const freshEl = document.getElementById(`hand-card-el-${gameState.playerHand.length - 1}`);
                window.BlinkHaptics.stampPop(freshEl);
            }
        }
    }

    checkWinCondition();
    if (gameState.isRunning) checkDeadlockStatus();
    if (gameState.isRunning && gameState.isTrainingMatch) {
        gameState.movesSincePause++;
        const remMin = Math.min(gameState.playerDeck.length + gameState.playerHand.length, gameState.aiDeck.length + gameState.aiHand.length);
        if (remMin <= 9) maybeTriggerAITrainingPause('endgame');
        else if (actor === 'player' && gameState.streak >= 3) maybeTriggerAITrainingPause('streak');
        else maybeTriggerAITrainingPause('general');
    }

    if (gameState.mode === 'online' && p2pState.role === 'host' && gameState.isRunning) {
        p2pSendStateSync('', 'neutral');
    }
}

function manualDrawCard() {
    if (!gameState.isRunning || gameState.mode === 'online') return;
    if (gameState.ruleMode === 'verhoer') {
        verhoerDrawFromDeck();
        return;
    }
    if (gameState.playerDeck.length === 0) return;
    let emptySlot = (typeof gameState.lastClearedHandSlot === 'number' && gameState.playerHand[gameState.lastClearedHandSlot] === null)
        ? gameState.lastClearedHandSlot
        : gameState.playerHand.findIndex(c => !c);
    if (emptySlot === -1 && gameState.playerHand.length < 3) {
        emptySlot = gameState.playerHand.length;
    }
    if (emptySlot === -1) return;
    gameState.playerHand[emptySlot] = gameState.playerDeck.shift();
    if (gameState.lastClearedHandSlot === emptySlot) gameState.lastClearedHandSlot = null;
    renderBlinkGameUI();
    if (window.BlinkUnifiedPhysics) {
        window.BlinkUnifiedPhysics.animateDealFromDeck('player-draw-pile-btn', `hand-card-el-${emptySlot}`);
    }
    checkDeadlockStatus();
}

function executeAIMoveStep() {
    if (!gameState.isRunning || gameState.mode !== 'ai' || gameState.ruleMode === 'verhoer') return;
    const numPiles = getActivePileCount();

    if (gameState.useTrainedBrain && typeof getActiveTrainedAI === 'function' && typeof chooseTraitAIMove === 'function') {
        const ai = getActiveTrainedAI();
        const best = chooseTraitAIMove(ai, gameState.aiHand, gameState.centerPiles, gameState.playerHand, gameState.ruleMode);
        if (best) {
            const card = gameState.aiHand[best.handIdx];
            const pile = gameState.centerPiles[best.pileIdx];
            const isColorMatch = Boolean(card && pile && card[1] === pile[1]);
            executeCardPlay('ai', best.handIdx, best.pileIdx);
            scheduleNextAIMove(true, isColorMatch);
            return;
        }
        checkDeadlockStatus();
        scheduleNextAIMove(false, false);
        return;
    }

    for (let i = 0; i < gameState.aiHand.length; i++) {
        const c = gameState.aiHand[i];
        for (let p = 0; p < numPiles; p++) {
            if (canPlayCardOnPile(c, p)) {
                executeCardPlay('ai', i, p);
                scheduleNextAIMove(false, false);
                return;
            }
        }
    }
    checkDeadlockStatus();
    scheduleNextAIMove(false, false);
}

function hasAnyValidMove(hand) {
    const numPiles = getActivePileCount();
    return hand.some(c => {
        for (let p = 0; p < numPiles; p++) {
            if (canPlayCardOnPile(c, p)) return true;
        }
        return false;
    });
}

function checkDeadlockStatus() {
    if (!gameState.isRunning || gameState.ruleMode === 'verhoer') return;
    const playerCan = hasAnyValidMove(gameState.playerHand);
    const oppCan = (gameState.mode === 'ai' || gameState.mode === 'online') ? hasAnyValidMove(gameState.aiHand) : false;
    const btnStocken = document.getElementById('btn-stocken');
    if (!btnStocken) return;

    if (!playerCan && !oppCan) {
        btnStocken.className = 'w-full py-3 rounded-2xl text-xs font-extrabold bg-amber-400 text-slate-950 ring-2 ring-amber-300/60 shadow-[0_0_20px_rgba(251,191,36,0.35)] transition flex items-center justify-center gap-2';
        setGameBanner('Kein Zug möglich – klicke auf „Restock“ (oder Leertaste).', 'warn');
    } else {
        btnStocken.className = 'w-full py-3 rounded-2xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 transition flex items-center justify-center gap-2';
    }
}

function resolveDeadlockStocken() {
    if (!gameState.isRunning || gameState.ruleMode === 'verhoer') return;
    if (gameState.mode === 'online' && p2pState.role === 'guest') {
        p2pSend({ type: 'RESTOCK_REQ' });
        return;
    }
    gameState.selectedHandIndex = null;
    const randomPool = shuffleArray(CARDS_60);
    const hasOpp = gameState.mode === 'ai' || gameState.mode === 'online';

    if (gameState.ruleMode === 'cluster') {
        if (gameState.playerDeck.length > 0) gameState.playerDeck.shift();
        if (hasOpp && gameState.aiDeck.length > 0) gameState.aiDeck.shift();
        gameState.centerPiles = drawValidClusterTrioFromDeck(randomPool);
    } else {
        gameState.centerPiles = [
            gameState.playerDeck.length > 0 ? gameState.playerDeck.shift() : randomPool[0],
            (hasOpp && gameState.aiDeck.length > 0) ? gameState.aiDeck.shift() : randomPool[1]
        ];
    }

    if (!Array.isArray(gameState.matchHistory)) gameState.matchHistory = [];
    const restockElapsed = gameState.startTime ? Math.max(0, (performance.now() - gameState.startTime) / 1000) : 0;
    gameState.matchHistory.push({
        step: gameState.matchHistory.length,
        type: 'restock',
        actor: null,
        t: Number(restockElapsed.toFixed(2)),
        centerPiles: gameState.centerPiles.map(c => (c ? [...c] : null)),
        hostRem: gameState.playerDeck.length + gameState.playerHand.length,
        guestRem: gameState.aiDeck.length + gameState.aiHand.length
    });
    renderMoveLogFromHistory();
    setGameBanner(`Neue Mittelkarten aufgedeckt! Weiter geht's.`, 'neutral');
    renderBlinkGameUI();
    checkWinCondition();
    if (gameState.isRunning) checkDeadlockStatus();
    if (gameState.isRunning && gameState.isTrainingMatch) {
        maybeTriggerAITrainingPause('deadlock');
    }
    if (gameState.mode === 'online' && p2pState.role === 'host' && gameState.isRunning) {
        p2pSendStateSync('Restock: Neue Mittelkarten wurden aufgedeckt!', 'neutral');
    }
}

function checkWinCondition() {
    if (gameState.ruleMode === 'verhoer') return;
    const playerTotal = gameState.playerDeck.length + gameState.playerHand.filter(Boolean).length;
    const aiTotal = gameState.aiDeck.length + gameState.aiHand.filter(Boolean).length;
    const elapsed = (performance.now() - gameState.startTime) / 1000;
    const timeStr = formatElapsedTime(elapsed);
    const oppNameEl = document.getElementById('opponent-name-label');
    const oppLabel = oppNameEl ? oppNameEl.textContent : 'Gegner';

    if (playerTotal === 0) {
        gameState.isRunning = false;
        gameState.lastMatchDuration = elapsed;
        gameState.lastMatchWinner = 'host';
        pauseGameLoops();
        setGameBanner(`GEWONNEN! Du hast alle Karten in ${timeStr} abgelegt!`, 'success');
        if (typeof stopGameMusic === 'function') stopGameMusic();
        saveRecordTime(gameState.ruleMode, elapsed, timeStr);
        playSound('win');
        if (gameState.mode === 'online' && p2pState.role === 'host') {
            if (!p2pState.seriesScore) p2pState.seriesScore = { host: 0, guest: 0 };
            p2pState.seriesScore.host++;
            renderArenaH2HUI();
        }
        if (window.BlinkHaptics) window.BlinkHaptics.burst(document.getElementById('center-pile-0'), 'emerald', 26);
        updatePlayerEloAfterMatch(getCurrentOpponentElo(), true, oppLabel);
        if (gameState.isTrainingMatch && typeof finalizeAITrainingMatch === 'function') {
            finalizeAITrainingMatch(true);
        }
        if (gameState.mode === 'online' && p2pState.role === 'host') {
            p2pSendStateSync('Dein Online-Gegner hat alle Karten abgelegt und gewinnt!', 'ai', 'host');
        }
    } else if ((gameState.mode === 'ai' || gameState.mode === 'online') && aiTotal === 0) {
        gameState.isRunning = false;
        gameState.lastMatchDuration = elapsed;
        gameState.lastMatchWinner = 'guest';
        pauseGameLoops();
        if (typeof stopGameMusic === 'function') stopGameMusic();
        if (gameState.mode === 'online' && p2pState.role === 'host') {
            if (!p2pState.seriesScore) p2pState.seriesScore = { host: 0, guest: 0 };
            p2pState.seriesScore.guest++;
            renderArenaH2HUI();
        }
        const oppName = gameState.mode === 'online' ? 'Dein Online-Gegner' : 'Der Bot';
        setGameBanner(`${oppName} hat seine letzte Karte abgelegt und gewinnt diese Partie!`, 'ai');
        updatePlayerEloAfterMatch(getCurrentOpponentElo(), false, oppLabel);
        if (gameState.isTrainingMatch && typeof finalizeAITrainingMatch === 'function') {
            finalizeAITrainingMatch(false);
        }
        if (gameState.mode === 'online' && p2pState.role === 'host') {
            p2pSendStateSync(`GEWONNEN! Du hast das Online-Duell in ${timeStr} gewonnen!`, 'success', 'guest');
        }
    }
}

// ============================================================================
// PEER-TO-PEER ONLINE-MULTIPLAYER ENGINE (WEBRTC VIA PEERJS)
// ============================================================================
const P2P_PREFIX = 'blink-ma-p2p-';
const p2pState = {
    peer: null,
    conn: null,
    role: null, // 'host' | 'guest'
    roomCode: '',
    connected: false,
    oppElo: null,
    oppName: '',
    oppProfile: null,
    seriesScore: { host: 0, guest: 0 }
};

function getArenaH2HNumbers() {
    const sc = p2pState.seriesScore || { host: 0, guest: 0 };
    const isGuest = p2pState.role === 'guest';
    return {
        myWins: isGuest ? (sc.guest || 0) : (sc.host || 0),
        oppWins: isGuest ? (sc.host || 0) : (sc.guest || 0)
    };
}

function buildH2HBannerHTML(myName, oppName, myWins, oppWins, resetCall) {
    const total = myWins + oppWins;
    const esc = (s) => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    return `
        <div class="h2h-summary-banner">
            <div class="flex items-center justify-between gap-2 text-[10px] mono uppercase tracking-widest text-slate-400">
                <span>Head-to-Head · ${total} ${total === 1 ? 'Match' : 'Matches'}</span>
                <button type="button" onclick="${resetCall}" title="Head-to-Head zurücksetzen"
                    class="px-2 py-0.5 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-[9.5px] font-bold text-slate-300 hover:text-white transition">↺ Reset</button>
            </div>
            <div class="flex items-center justify-center gap-3 sm:gap-5 pt-1">
                <span class="text-xs font-bold text-cyan-300 truncate max-w-[120px]">${esc(myName)}</span>
                <div class="flex items-center gap-2 text-2xl sm:text-3xl font-extrabold mono leading-none">
                    <span class="text-cyan-300">${myWins}</span>
                    <span class="text-slate-500 text-lg">:</span>
                    <span class="text-rose-400">${oppWins}</span>
                </div>
                <span class="text-xs font-bold text-rose-300 truncate max-w-[120px]">${esc(oppName)}</span>
            </div>
        </div>
    `;
}

function renderArenaH2HUI() {
    const pill = document.getElementById('arena-h2h-pill');
    if (!pill) return;
    const show = gameState.mode === 'online' && p2pState.connected;
    pill.classList.toggle('hidden', !show);
    if (!show) return;

    const { myWins, oppWins } = getArenaH2HNumbers();
    pill.innerHTML = `
        <span class="text-[9.5px] uppercase tracking-wider text-slate-400 mono">H2H</span>
        <span class="text-xs sm:text-sm font-extrabold mono text-cyan-300">${myWins}</span>
        <span class="text-[11px] text-slate-500 font-bold">:</span>
        <span class="text-xs sm:text-sm font-extrabold mono text-rose-400">${oppWins}</span>
        <button type="button" onclick="resetArenaSeriesScore()" title="Serie auf 0 : 0 zurücksetzen"
            class="ml-0.5 w-4 h-4 rounded-full bg-white/[0.06] hover:bg-white/[0.18] text-[9.5px] text-slate-300 flex items-center justify-center transition">↺</button>
    `;
}

function resetArenaSeriesScore() {
    p2pState.seriesScore = { host: 0, guest: 0 };
    renderArenaH2HUI();
    const banner = document.getElementById('match-summary-h2h-banner');
    if (banner && !banner.classList.contains('hidden')) {
        const oppLabel = p2pState.oppName || 'Online-Gegner';
        banner.innerHTML = buildH2HBannerHTML(getPlayerName(), oppLabel, 0, 0, 'resetArenaSeriesScore()');
    }
    if (p2pState.connected) p2pSend({ type: 'H2H_RESET' });
    playSound('tick');
    showSonnerToast('Head-to-Head auf 0 : 0 zurückgesetzt.', 'neutral');
}

function generateP2PCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

function p2pUpdateUI(statusText = null, tone = 'idle') {
    const badge = document.getElementById('p2p-status-badge');
    const idleBox = document.getElementById('p2p-idle-controls');
    const activeBox = document.getElementById('p2p-active-controls');
    const codeEl = document.getElementById('p2p-room-code-display');
    const roleEl = document.getElementById('p2p-role-label');
    const nameEl = document.getElementById('opponent-name-label');

    if (badge && statusText) {
        badge.textContent = statusText;
        const clsMap = {
            idle: 'px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-[10px] mono text-slate-400',
            wait: 'px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-[10px] mono text-amber-300',
            ok: 'px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-[10px] mono text-emerald-300'
        };
        badge.className = clsMap[tone] || clsMap.idle;
    }

    const hasSession = Boolean(p2pState.peer || p2pState.connected);
    if (idleBox) idleBox.classList.toggle('hidden', hasSession);
    if (activeBox) activeBox.classList.toggle('hidden', !hasSession);
    if (codeEl) codeEl.textContent = p2pState.roomCode || '----';
    if (roleEl) roleEl.textContent = p2pState.role === 'host' ? 'Dein Raum-Code (Host)' : 'Verbunden als Gast';
    if (nameEl && gameState.mode === 'online') {
        nameEl.textContent = p2pState.connected
            ? (p2pState.oppName || `Online-Gegner (${p2pState.roomCode})`)
            : 'Online-Gegner (Warte...)';
    }
    syncPlayerNameUI();
}

function p2pCreateRoom() {
    if (typeof Peer === 'undefined') {
        showSonnerToast('PeerJS konnte nicht geladen werden (Internetverbindung nötig).', 'warn');
        return;
    }
    p2pDisconnect(true);
    const code = generateP2PCode();
    p2pState.role = 'host';
    p2pState.roomCode = code;
    p2pUpdateUI('Erstelle Raum...', 'wait');

    const peer = new Peer(P2P_PREFIX + code);
    p2pState.peer = peer;
    syncGameConfigUI();

    peer.on('open', () => {
        p2pUpdateUI('Warte auf Gegner', 'wait');
        showSonnerToast(`Raum ${code} offen! Gib den Code an deinen Gegner weiter.`, 'success');
    });

    peer.on('connection', (conn) => {
        if (p2pState.conn && p2pState.conn.open) {
            conn.close();
            return;
        }
        p2pAttachConnection(conn);
    });

    peer.on('error', (err) => {
        showSonnerToast(`P2P-Fehler: ${err.type || 'Verbindung fehlgeschlagen'}`, 'warn');
        p2pDisconnect(true);
    });
}

function p2pJoinRoom() {
    if (typeof Peer === 'undefined') {
        showSonnerToast('PeerJS konnte nicht geladen werden (Internetverbindung nötig).', 'warn');
        return;
    }
    const input = document.getElementById('p2p-join-input');
    const code = (input ? input.value : '').trim().toUpperCase();
    if (code.length < 4) {
        showSonnerToast('Bitte gib den 4-stelligen Raum-Code ein.', 'warn');
        return;
    }

    p2pDisconnect(true);
    p2pState.role = 'guest';
    p2pState.roomCode = code;
    p2pUpdateUI('Verbinde...', 'wait');

    const peer = new Peer();
    p2pState.peer = peer;
    syncGameConfigUI();

    const connectTimer = setTimeout(() => {
        if (p2pState.role === 'guest' && !p2pState.connected) {
            showSonnerToast(`Verbindung zu Raum ${code} zeitüberschritten (evtl. blockiert WLAN/Firewall P2P).`, 'warn');
            p2pDisconnect(true);
        }
    }, 10000);

    peer.on('open', () => {
        const conn = peer.connect(P2P_PREFIX + code, { reliable: true });
        conn.on('open', () => clearTimeout(connectTimer));
        conn.on('error', (err) => {
            clearTimeout(connectTimer);
            showSonnerToast(`Verbindungsfehler: ${err?.type || 'Datenkanal blockiert'}`, 'warn');
            p2pDisconnect(true);
        });
        p2pAttachConnection(conn);
    });

    peer.on('error', (err) => {
        clearTimeout(connectTimer);
        showSonnerToast(`Raum ${code}: ${err?.type || 'nicht gefunden oder nicht erreichbar'}.`, 'warn');
        p2pDisconnect(true);
    });
}

function p2pAttachConnection(conn) {
    p2pState.conn = conn;
    conn.on('open', () => {
        p2pState.connected = true;
        p2pUpdateUI('Verbunden', 'ok');
        playSound('win');
        const hint = p2pState.role === 'host'
            ? 'Gegner verbunden! Klicke auf „Spielen“, um das Online-Duell zu starten.'
            : 'Mit Host verbunden! Warte auf den Spielstart...';
        showSonnerToast(hint, 'success');
        p2pSend({ type: 'ELO_SYNC', elo: playerEloState.elo, name: getPlayerName(), profile: getPlayerProfile() });
        if (p2pState.role === 'host') {
            p2pSend({ type: 'RULE_SYNC', ruleMode: gameState.ruleMode });
        }
    });

    conn.on('data', (msg) => p2pHandleMessage(msg));

    conn.on('close', () => {
        showSonnerToast('Online-Verbindung wurde beendet.', 'warn');
        p2pDisconnect(true);
    });
}

function p2pSend(payload) {
    if (p2pState.conn && p2pState.conn.open) {
        p2pState.conn.send(payload);
    }
}

function p2pDisconnect(silent = false) {
    if (p2pState.conn) { try { p2pState.conn.close(); } catch (e) { } }
    if (p2pState.peer) { try { p2pState.peer.destroy(); } catch (e) { } }
    p2pState.conn = null;
    p2pState.peer = null;
    p2pState.connected = false;
    p2pState.syncSeq = 0;
    p2pState.lastAppliedSeq = 0;
    p2pState.pendingPlayKey = null;
    p2pState.pendingPlayUntil = 0;
    p2pState.role = null;
    p2pState.roomCode = '';
    p2pState.oppElo = null;
    p2pState.oppName = '';
    p2pState.oppProfile = null;
    p2pState.seriesScore = { host: 0, guest: 0 };
    syncOpponentAvatarUI();
    renderArenaH2HUI();
    syncGameConfigUI();
    p2pUpdateUI('Getrennt', 'idle');
    renderEloBadgesInArena();
    if (!silent) showSonnerToast('Verbindung getrennt.', 'neutral');
}

function p2pCopyRoomCode() {
    if (!p2pState.roomCode) return;
    navigator.clipboard?.writeText(p2pState.roomCode).then(() => {
        showSonnerToast(`Raum-Code ${p2pState.roomCode} kopiert!`, 'success');
    }).catch(() => { });
}

function p2pSendStateSync(bannerMsg = '', bannerTone = 'neutral', winner = null, aborted = false) {
            if (p2pState.role !== 'host' || !p2pState.connected) return;
            p2pState.syncSeq = (p2pState.syncSeq || 0) + 1;
            const elapsedSec = typeof gameState.lastMatchDuration === 'number'
                ? gameState.lastMatchDuration
                : (gameState.startTime ? Math.max(0, (performance.now() - gameState.startTime) / 1000) : 0);
            p2pSend({
                type: 'STATE_SYNC',
                seq: p2pState.syncSeq,
                ruleMode: gameState.ruleMode,
                isRunning: gameState.isRunning,
                initialCardTotal: gameState.initialCardTotal || (gameState.ruleMode === 'cluster' ? 28 : 29),
                centerPiles: gameState.centerPiles.map(c => (c ? [...c] : null)),
                yourHand: gameState.aiHand.filter(Boolean).map(c => [...c]),
                yourDeckCount: gameState.aiDeck.length,
                oppHand: gameState.playerHand.filter(Boolean).map(c => [...c]),
                oppDeckCount: gameState.playerDeck.length,
                matchHistory: Array.isArray(gameState.matchHistory) ? gameState.matchHistory : [],
                seriesScore: {
                    host: p2pState.seriesScore ? (p2pState.seriesScore.host || 0) : 0,
                    guest: p2pState.seriesScore ? (p2pState.seriesScore.guest || 0) : 0
                },
                elapsedSec: Number(elapsedSec.toFixed(2)),
                bannerMsg,
                bannerTone,
                winner,
                aborted: Boolean(aborted)
            });
        }

function p2pHandleMessage(msg) {
    if (!msg || !msg.type) return;

    if (msg.type === 'ELO_SYNC') {
        if (typeof msg.elo === 'number') p2pState.oppElo = msg.elo;
        if (typeof msg.name === 'string' && msg.name.trim()) p2pState.oppName = msg.name.trim().slice(0, 18);
        if (msg.profile && typeof msg.profile === 'object') p2pState.oppProfile = sanitizePlayerProfile(msg.profile);
        p2pUpdateUI();
        renderEloBadgesInArena();
        return;
    }

    if (msg.type === 'H2H_RESET') {
        p2pState.seriesScore = { host: 0, guest: 0 };
        renderArenaH2HUI();
        const banner = document.getElementById('match-summary-h2h-banner');
        if (banner && !banner.classList.contains('hidden')) {
            const oppLabel = p2pState.oppName || 'Online-Gegner';
            banner.innerHTML = buildH2HBannerHTML(getPlayerName(), oppLabel, 0, 0, 'resetArenaSeriesScore()');
        }
        showSonnerToast('Head-to-Head auf 0 : 0 zurückgesetzt.', 'neutral');
        return;
    }

    if (p2pState.role === 'host') {
                if (msg.type === 'PLAY_REQ' && gameState.isRunning) {
                    const { handIdx, pileIdx, card: reqCard } = msg;
                    let resolvedIdx = -1;
                    if (Array.isArray(reqCard) && reqCard.length === 3) {
                        const reqKey = keyOf(reqCard[0], reqCard[1], reqCard[2]);
                        if (gameState.aiHand[handIdx] && keyOf(...gameState.aiHand[handIdx]) === reqKey) {
                            resolvedIdx = handIdx;
                        } else {
                            resolvedIdx = gameState.aiHand.findIndex(c => c && keyOf(...c) === reqKey);
                        }
                    } else if (gameState.aiHand[handIdx]) {
                        resolvedIdx = handIdx;
                    }
                    const card = resolvedIdx >= 0 ? gameState.aiHand[resolvedIdx] : null;
                    if (!card) {
                        p2pSendStateSync('', 'neutral');
                    } else if (canPlayCardOnPile(card, pileIdx)) {
                        executeCardPlay('ai', resolvedIdx, pileIdx);
                    } else {
                        p2pSend({ type: 'PLAY_REJECT', handIdx, pileIdx });
                        p2pSendStateSync('Zu spät — Stapel hat sich gerade geändert!', 'warn');
                    }
                } else if (msg.type === 'ABORT_REQ' && gameState.isRunning) {
                    abortCurrentBlinkGame();
                } else if (msg.type === 'RESTOCK_REQ' && gameState.isRunning) {
                    resolveDeadlockStocken();
                } else if (msg.type === 'REMATCH_REQ') {
                    if (!gameState.isRunning) {
                        startNewBlinkGame();
                    } else {
                        showSonnerToast('Dein Online-Gegner möchte eine neue Partie starten!', 'neutral');
                    }
                }
                return;
            }

            if (msg.type === 'STATE_SYNC') {
                if (typeof msg.seq === 'number') {
                    if (msg.seq < (p2pState.lastAppliedSeq || 0)) return;
                    p2pState.lastAppliedSeq = msg.seq;
                }
                p2pState.pendingPlayKey = null;
                p2pState.pendingPlayUntil = 0;

                const wasRunning = gameState.isRunning;
                gameState.mode = 'online';
                gameState.ruleMode = msg.ruleMode;
                gameState.initialCardTotal = msg.initialCardTotal || (msg.ruleMode === 'cluster' ? 28 : 29);
                const modeSel = document.getElementById('select-game-mode');
                if (modeSel && modeSel.value !== 'online') modeSel.value = 'online';
                const ruleSel = document.getElementById('select-rule-mode');
                if (ruleSel && ruleSel.value !== msg.ruleMode) ruleSel.value = msg.ruleMode;
                syncGameConfigUI();

                gameState.isRunning = Boolean(msg.isRunning);
                gameState.centerPiles = Array.isArray(msg.centerPiles) ? msg.centerPiles : gameState.centerPiles;
                gameState.playerHand = Array.isArray(msg.yourHand) ? msg.yourHand : [];
                gameState.playerDeck = new Array(Math.max(0, msg.yourDeckCount || 0)).fill([0, 0, 0]);
                gameState.aiHand = Array.isArray(msg.oppHand) ? msg.oppHand : [];
                gameState.aiDeck = new Array(Math.max(0, msg.oppDeckCount || 0)).fill([0, 0, 0]);
                if (gameState.selectedHandIndex !== null && gameState.selectedHandIndex >= gameState.playerHand.length) {
                    gameState.selectedHandIndex = null;
                }

                if (msg.seriesScore && typeof msg.seriesScore === 'object') {
                    p2pState.seriesScore = {
                        host: msg.seriesScore.host || 0,
                        guest: msg.seriesScore.guest || 0
                    };
                    renderArenaH2HUI();
                }

                if (Array.isArray(msg.matchHistory)) {
                    gameState.matchHistory = msg.matchHistory;
                    renderMoveLogFromHistory();
                }

                const overlay = document.getElementById('game-lobby-overlay');
                if (overlay) {
                    if (msg.isRunning || msg.winner) overlay.classList.add('hidden');
                    else if (msg.aborted) overlay.classList.remove('hidden');
                }
                const matchSummary = document.getElementById('match-summary-overlay');
                if (matchSummary && (msg.isRunning || msg.aborted)) matchSummary.classList.add('hidden');

                if (!wasRunning && msg.isRunning) {
                    gameState.lastMatchDuration = null;
                    gameState.lastMatchWinner = null;
                    if (typeof startGameMusic === 'function') startGameMusic('arena');
                    pauseGameLoops();
                    gameState.startTime = performance.now() - ((msg.elapsedSec || 0) * 1000);
                    gameState.timerInterval = setInterval(() => {
                        if (!gameState.isRunning) return;
                        const elapsed = (performance.now() - gameState.startTime) / 1000;
                        const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
                        const s = String(Math.floor(elapsed % 60)).padStart(2, '0');
                        const ms = String(Math.floor((elapsed % 1) * 10));
                        const timerDisp = document.getElementById('game-timer-display');
                        if (timerDisp && !timerDisp.hasAttribute('data-flow-init')) {
                            timerDisp.textContent = `${m}:${s}.${ms}`;
                        } else {
                            const upd = (id, v) => {
                                const c = document.getElementById(`flow-${id}`);
                                if (c) c.style.transform = `translateY(-${v * 1.2}em)`;
                            };
                            upd('m1', m[0]); upd('m2', m[1]); upd('s1', s[0]); upd('s2', s[1]); upd('ms', ms[0]);
                        }
                    }, 100);
                } else if (!msg.isRunning) {
                    if (typeof stopGameMusic === 'function') stopGameMusic();
                    pauseGameLoops();
                    if (typeof msg.elapsedSec === 'number') gameState.lastMatchDuration = msg.elapsedSec;
                    if (msg.winner) gameState.lastMatchWinner = msg.winner;

                    if (typeof msg.elapsedSec === 'number') {
                        const tStr = formatElapsedTime(msg.elapsedSec);
                        const timerDisp = document.getElementById('game-timer-display');
                        if (timerDisp && !timerDisp.hasAttribute('data-flow-init')) timerDisp.textContent = tStr;
                    }

                    const oppLabel = p2pState.oppName || (p2pState.roomCode ? `Online-Gegner (${p2pState.roomCode})` : 'Online-Gegner');
                    if (wasRunning && msg.winner === 'guest') {
                        playSound('win');
                        if (window.BlinkHaptics) window.BlinkHaptics.burst(document.getElementById('center-pile-0'), 'emerald', 26);
                        updatePlayerEloAfterMatch(getCurrentOpponentElo(), true, oppLabel);
                    } else if (wasRunning && msg.winner === 'host') {
                        updatePlayerEloAfterMatch(getCurrentOpponentElo(), false, oppLabel);
                    }
                }

                if (msg.bannerMsg) setGameBanner(msg.bannerMsg, msg.bannerTone || 'neutral');
                renderBlinkGameUI();
                if (gameState.isRunning) checkDeadlockStatus();
            } else if (msg.type === 'RULE_SYNC') {
                gameState.ruleMode = msg.ruleMode;
                const ruleSel = document.getElementById('select-rule-mode');
                if (ruleSel && ruleSel.value !== msg.ruleMode) ruleSel.value = msg.ruleMode;
                if (!gameState.isRunning) {
                    initBlinkGameLobby();
                } else {
                    syncGameConfigUI();
                }
                const lbl = msg.ruleMode === 'cluster' ? 'Cluster-Regeln (3 Stapel)' : 'Standard-Regeln (2 Stapel)';
                showSonnerToast(`Host-Einstellung übernommen: ${lbl}`, 'neutral');
            } else if (msg.type === 'PLAY_REJECT') {
                p2pState.pendingPlayKey = null;
                p2pState.pendingPlayUntil = 0;
                triggerInvalidShake(`center-pile-${msg.pileIdx}`);
                triggerInvalidShake(`hand-card-el-${msg.handIdx}`, true);
            }
}

function formatElapsedTime(elapsed) {
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(Math.floor(elapsed % 60)).padStart(2, '0');
    const ms = String(Math.floor((elapsed % 1) * 10));
    return `${m}:${s}.${ms}`;
}

function saveRecordTime(ruleMode, timeInSeconds, timeString) {
    let records = JSON.parse(localStorage.getItem('blink_records_v3') || '{"normal":[], "cluster":[], "verhoer":[]}');
    if (!records[ruleMode]) records[ruleMode] = [];
    const cleanStr = formatElapsedTime(timeInSeconds);
    records[ruleMode].push({ time: timeInSeconds, str: cleanStr, date: new Date().toLocaleDateString() });
    records[ruleMode].sort((a, b) => a.time - b.time);
    records[ruleMode] = records[ruleMode].slice(0, 5);
    localStorage.setItem('blink_records_v3', JSON.stringify(records));
    renderLeaderboard();
}

function renderLeaderboard() {
    const listNormal = document.getElementById('leaderboard-normal-list');
    const listCluster = document.getElementById('leaderboard-cluster-list');
    const listVerhoer = document.getElementById('leaderboard-verhoer-list');
    if (!listNormal || !listCluster) return;

    let records = JSON.parse(localStorage.getItem('blink_records_v3') || '{"normal":[], "cluster":[], "verhoer":[]}');

    const renderList = (times, highlightColor) => {
        if (!times || times.length === 0) {
            return '<div class="text-slate-500 py-1">Keine Siege</div>';
        }
        return times.map((r, i) => {
            const displayTime = (r.str && r.str.length <= 10) ? r.str : formatElapsedTime(r.time || 0);
            return `
                        <div class="flex items-center justify-between p-1 rounded border border-slate-800 text-slate-300">
                            <span class="truncate pr-1">${i + 1}.</span>
                            <span class="${highlightColor} font-bold">${displayTime}</span>
                        </div>
                    `;
        }).join('');
    };

    listNormal.innerHTML = renderList(records.normal, 'text-cyan-400');
    listCluster.innerHTML = renderList(records.cluster, 'text-purple-400');
    if (listVerhoer) listVerhoer.innerHTML = renderList(records.verhoer, 'text-amber-400');
}

window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (state.currentPage !== 'game' || labState.activeGameTab !== 'arena' || !gameState.isRunning) return;
    if (e.key >= '1' && e.key <= '6') quickPlayHandCard(parseInt(e.key, 10) - 1);
    if (e.key === ' ' && gameState.ruleMode !== 'verhoer') { e.preventDefault(); resolveDeadlockStocken(); }
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        ['settings-modal', 'profile-modal', 'mapping-modal', 'game-info-modal', 'elo-overview-modal'].forEach(id => {
            const m = document.getElementById(id);
            if (m && !m.classList.contains('hidden')) toggleModalState(id);
        });
    }
});

function onHandCardDragStart(event, handIdx) {
    if (!gameState.isRunning || !gameState.playerHand[handIdx]) {
        event.preventDefault();
        return;
    }
    gameState.draggedHandIndex = handIdx;
    gameState.selectedHandIndex = handIdx;
    if (event.dataTransfer) {
        event.dataTransfer.setData('text/plain', String(handIdx));
        event.dataTransfer.effectAllowed = 'move';
    }
    const el = document.getElementById(`hand-card-el-${handIdx}`);
    if (el) setTimeout(() => el.classList.add('dragging-card'), 0);
}

function onHandCardDragEnd(event, handIdx) {
    const el = document.getElementById(`hand-card-el-${handIdx}`);
    if (el) el.classList.remove('dragging-card');
    [0, 1, 2].forEach(i => {
        const p = document.getElementById(`center-pile-${i}`);
        if (p) p.classList.remove('pile-drag-over');
    });
}

function onPileDragOver(event, pileIdx) {
    if (!gameState.isRunning) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const pileEl = document.getElementById(`center-pile-${pileIdx}`);
    if (pileEl && !pileEl.classList.contains('pile-drag-over')) {
        pileEl.classList.add('pile-drag-over');
    }
}

function onPileDragLeave(event, pileIdx) {
    const pileEl = document.getElementById(`center-pile-${pileIdx}`);
    if (pileEl) pileEl.classList.remove('pile-drag-over');
}

function onPileDrop(event, pileIdx) {
    event.preventDefault();
    const pileEl = document.getElementById(`center-pile-${pileIdx}`);
    if (pileEl) pileEl.classList.remove('pile-drag-over');
    if (!gameState.isRunning) return;

    let handIdx = gameState.draggedHandIndex;
    if ((handIdx === undefined || handIdx === null) && event.dataTransfer) {
        handIdx = parseInt(event.dataTransfer.getData('text/plain'), 10);
    }
    gameState.draggedHandIndex = null;

    if (isNaN(handIdx) || !gameState.playerHand[handIdx]) return;
    gameState.selectedHandIndex = handIdx;
    tryPlaySelectedOnPile(pileIdx);
}
// ============================================================================
        // PARTIE-ANALYSE & LIVE-ZUG-NOTATION (FÜR HOST, GAST & EINZELSPIELER)
        // ============================================================================

        function getAnalysisPerspective() {
            const isGuest = gameState.mode === 'online' && typeof p2pState !== 'undefined' && p2pState.role === 'guest';
            const myActor = isGuest ? 'guest' : 'host';
            const myName = typeof getPlayerName === 'function' ? getPlayerName() : 'Du';
            const oppEl = document.getElementById('opponent-name-label');
            const oppName = gameState.mode === 'online'
                ? (p2pState.oppName || 'Online-Gegner')
                : (oppEl ? oppEl.textContent : 'Bot');
            return { isGuest, myActor, myName, oppName };
        }

        function renderMoveLogFromHistory() {
            const hist = Array.isArray(gameState.matchHistory) ? gameState.matchHistory : [];
            const events = hist.filter(e => e.type === 'play' || e.type === 'restock');
            gameState.moveCount = events.filter(e => e.type === 'play').length;

            const badge = document.getElementById('move-count-badge');
            if (badge) badge.textContent = `${gameState.moveCount} Züge`;

            const analysisBtn = document.getElementById('btn-open-match-analysis');
            if (analysisBtn) analysisBtn.classList.toggle('hidden', events.length === 0);

            const logEl = document.getElementById('game-move-log');
            if (!logEl) return;
            if (events.length === 0) {
                logEl.innerHTML = `<div class="text-slate-500 text-xs py-6 text-center">${gameState.isRunning ? 'Partie läuft...' : 'Noch keine Züge gespielt.'}</div>`;
                return;
            }

            const { myActor, oppName } = getAnalysisPerspective();
            const reversed = [...events].reverse();
            let moveCounter = events.length;
            logEl.innerHTML = reversed.map(ev => {
                const num = moveCounter--;
                if (ev.type === 'restock') {
                    return `<div class="p-1.5 rounded bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-1 text-[10.5px]">
                        <span class="text-amber-400">${num}.</span>
                        <div class="flex-1 truncate text-amber-200 font-semibold">Restock · Neue Mittelkarten</div>
                        <span class="text-[9.5px] text-slate-400">${formatElapsedTime(ev.t || 0)}</span>
                    </div>`;
                }
                const isMe = ev.actor === myActor;
                const actorHtml = isMe
                    ? '<span class="text-cyan-400 font-bold">Du:</span>'
                    : `<span class="text-rose-400 font-bold">${oppName}:</span>`;
                return `<div class="p-1.5 rounded bg-slate-900 border border-slate-800/80 flex items-center justify-between gap-1 text-[10.5px]">
                    <span class="text-slate-500">${num}.</span>
                    <div class="flex-1 truncate">${actorHtml} <span>(${ev.card.join(',')}) → M${ev.pileIdx + 1}</span> <span class="text-emerald-400 text-[10px]">${ev.reason || ''}</span></div>
                </div>`;
            }).join('');
        }

        