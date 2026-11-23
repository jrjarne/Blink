// ============================================================================
// MATCH-ANALYSE ENGINE (CHESS.COM-STYLE GAME REVIEW FÜR BLINK-ARENA)
// ============================================================================

const matchAnalysisState = {
  active: false,
  ruleMode: 'normal',
  oppLabel: 'Blink-Bot',
  startedAt: 0,
  lastPlayerMoveAt: 0,
  events: [],       // { t, type: 'play'|'mistake'|'restock', actor, card, pileIdx, reason, propType, reactionMs, playerRem, oppRem, adv, quality }
  timeline: [],     // { t, playerRem, oppRem, adv }
  mistakes: 0,
  restocks: 0,
  maxStreak: 0,
  currentStreak: 0,
  lastReport: null
};

function resetMatchAnalysisTracker() {
  const isVersus = gameState.mode === 'ai' || gameState.mode === 'online';
  const startCards = isVersus ? 29 : 30;
  const oppNameEl = document.getElementById('opponent-name-label');

  matchAnalysisState.active = gameState.ruleMode !== 'verhoer';
  matchAnalysisState.ruleMode = gameState.ruleMode;
  matchAnalysisState.oppLabel = oppNameEl ? oppNameEl.textContent : 'Gegner';
  matchAnalysisState.startedAt = performance.now();
  matchAnalysisState.lastPlayerMoveAt = matchAnalysisState.startedAt;
  matchAnalysisState.events = [];
  matchAnalysisState.timeline = [{ t: 0, playerRem: startCards, oppRem: startCards, adv: 0 }];
  matchAnalysisState.mistakes = 0;
  matchAnalysisState.restocks = 0;
  matchAnalysisState.maxStreak = 0;
  matchAnalysisState.currentStreak = 0;
}

function classifyBlinkMove(reactionMs, streakAfter, playerRemAfter, ruleMode) {
  const fastLimit = ruleMode === 'cluster' ? 1700 : 1050;
  const goodLimit = ruleMode === 'cluster' ? 2800 : 1850;
  const slowLimit = ruleMode === 'cluster' ? 4800 : 3400;

  if (reactionMs <= fastLimit && (streakAfter >= 3 || playerRemAfter <= 3)) {
    return { key: 'brilliant', symbol: '!!', label: 'Brillant', cls: 'text-cyan-300 bg-cyan-500/15 border-cyan-400/40' };
  }
  if (reactionMs <= goodLimit) {
    return { key: 'great', symbol: '!', label: 'Stark', cls: 'text-emerald-300 bg-emerald-500/15 border-emerald-400/40' };
  }
  if (reactionMs <= slowLimit) {
    return { key: 'good', symbol: '✓', label: 'Solide', cls: 'text-slate-300 bg-white/[0.05] border-white/10' };
  }
  return { key: 'inaccuracy', symbol: '?!', label: 'Langsam', cls: 'text-amber-300 bg-amber-500/15 border-amber-400/40' };
}

function detectPropType(reasonStr) {
  if (!reasonStr) return 'other';
  if (reasonStr.startsWith('Anzahl')) return 'x';
  if (reasonStr.startsWith('Farbe')) return 'y';
  if (reasonStr.startsWith('Symbol')) return 'z';
  if (reasonStr.includes('Cluster')) return 'cluster';
  return 'other';
}

function recordAnalysisPlay(actor, playedCard, pileIdx, reasons) {
  if (!matchAnalysisState.active || !gameState.isRunning) return;
  const now = performance.now();
  const t = Math.max(0.1, (now - matchAnalysisState.startedAt) / 1000);

  // Verbleibende Karten nach diesem Zug (1 Karte weniger für den ziehenden Akteur)
  const pRemNow = gameState.playerDeck.length + gameState.playerHand.length - (actor === 'player' ? 1 : 0);
  const oRemNow = gameState.aiDeck.length + gameState.aiHand.length - (actor === 'ai' ? 1 : 0);
  const playerRem = Math.max(0, pRemNow);
  const oppRem = Math.max(0, oRemNow);
  const adv = oppRem - playerRem;

  let reactionMs = null;
  let quality = null;
  if (actor === 'player') {
    reactionMs = Math.max(120, Math.round(now - matchAnalysisState.lastPlayerMoveAt));
    matchAnalysisState.lastPlayerMoveAt = now;
    matchAnalysisState.currentStreak++;
    if (matchAnalysisState.currentStreak > matchAnalysisState.maxStreak) {
      matchAnalysisState.maxStreak = matchAnalysisState.currentStreak;
    }
    quality = classifyBlinkMove(reactionMs, matchAnalysisState.currentStreak, playerRem, matchAnalysisState.ruleMode);
  }

  const reason = (reasons && reasons[0]) ? reasons[0] : '';
  matchAnalysisState.events.push({
    t,
    type: 'play',
    actor,
    card: playedCard ? [...playedCard] : null,
    pileIdx,
    reason,
    propType: detectPropType(reason),
    reactionMs,
    playerRem,
    oppRem,
    adv,
    quality
  });
  matchAnalysisState.timeline.push({ t, playerRem, oppRem, adv });
}

function recordAnalysisMistake() {
  if (!matchAnalysisState.active || !gameState.isRunning) return;
  const t = Math.max(0.1, (performance.now() - matchAnalysisState.startedAt) / 1000);
  const playerRem = gameState.playerDeck.length + gameState.playerHand.length;
  const oppRem = gameState.aiDeck.length + gameState.aiHand.length;
  matchAnalysisState.mistakes++;
  matchAnalysisState.currentStreak = 0;

  matchAnalysisState.events.push({
    t,
    type: 'mistake',
    actor: 'player',
    card: null,
    pileIdx: null,
    reason: 'Ungültiger Ablegeversuch',
    propType: 'none',
    reactionMs: null,
    playerRem,
    oppRem,
    adv: oppRem - playerRem,
    quality: { key: 'mistake', symbol: '✕', label: 'Fehler', cls: 'text-rose-300 bg-rose-500/15 border-rose-400/40' }
  });
}

function recordAnalysisRestock() {
  if (!matchAnalysisState.active || !gameState.isRunning) return;
  const t = Math.max(0.1, (performance.now() - matchAnalysisState.startedAt) / 1000);
  const playerRem = Math.max(0, gameState.playerDeck.length + gameState.playerHand.length);
  const oppRem = Math.max(0, gameState.aiDeck.length + gameState.aiHand.length);
  matchAnalysisState.restocks++;

  matchAnalysisState.events.push({
    t,
    type: 'restock',
    actor: 'system',
    card: null,
    pileIdx: null,
    reason: 'Stocken (Deadlock) → Restock',
    propType: 'none',
    reactionMs: null,
    playerRem,
    oppRem,
    adv: oppRem - playerRem,
    quality: { key: 'restock', symbol: '↻', label: 'Restock', cls: 'text-amber-300 bg-amber-500/15 border-amber-400/40' }
  });
  matchAnalysisState.timeline.push({ t, playerRem, oppRem, adv: oppRem - playerRem });
}

function timeToBaseElo(normSec) {
  // Orientiert an den Bot-Abschlusszeiten (29 Karten): 25s ≈ Grandmaster (2000), 33s ≈ Master (1800) usw.
  const anchors = [
    [12, 2350],
    [18, 2180],
    [25, 2000],
    [33, 1800],
    [43, 1600],
    [55, 1400],
    [68, 1200],
    [83, 1050],
    [100, 900],
    [119, 750],
    [145, 550],
    [180, 450]
  ];
  if (normSec <= anchors[0][0]) return anchors[0][1] + (anchors[0][0] - normSec) * 35;
  for (let i = 1; i < anchors.length; i++) {
    const [t1, e1] = anchors[i - 1];
    const [t2, e2] = anchors[i];
    if (normSec <= t2) {
      const ratio = (normSec - t1) / (t2 - t1);
      return e1 + ratio * (e2 - e1);
    }
  }
  return 450;
}

function buildMatchAnalysisReport(meta) {
  const playerPlays = matchAnalysisState.events.filter(e => e.type === 'play' && e.actor === 'player');
  const oppPlays = matchAnalysisState.events.filter(e => e.type === 'play' && e.actor === 'ai');
  const totalAttempts = playerPlays.length + matchAnalysisState.mistakes;
  const durationSec = Math.max(1, (performance.now() - matchAnalysisState.startedAt) / 1000);
  const didWin = meta ? Boolean(meta.didWin) : false;

  // Reaktionszeiten
  const reactions = playerPlays.map(e => e.reactionMs).filter(v => typeof v === 'number');
  const avgReactionMs = reactions.length ? Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length) : 0;
  const bestReactionMs = reactions.length ? Math.min(...reactions) : 0;

  // Qualitäts-Zähler
  const counts = { brilliant: 0, great: 0, good: 0, inaccuracy: 0, mistake: matchAnalysisState.mistakes };
  playerPlays.forEach(e => {
    if (e.quality && counts[e.quality.key] !== undefined) counts[e.quality.key]++;
  });

  // Genauigkeit (0–100 %)
  const hitRatio = totalAttempts > 0 ? (playerPlays.length / totalAttempts) : 1;
  const slowPenalty = playerPlays.length > 0 ? (counts.inaccuracy / playerPlays.length) * 14 : 0;
  const brilliantBonus = playerPlays.length > 0 ? Math.min(6, (counts.brilliant / playerPlays.length) * 18) : 0;
  const accuracy = Math.max(15, Math.min(99.9, +(hitRatio * 100 - slowPenalty + brilliantBonus).toFixed(1)));

  // --------------------------------------------------------------------------
  // SPIEL-RATING: HAUPTKRITERIUM = ABSCHLUSSZEIT, SEKUNDÄR = DEADLOCKS & FEHLER
  // --------------------------------------------------------------------------
  const isVersus = (typeof gameState !== 'undefined') && (gameState.mode === 'ai' || gameState.mode === 'online');
  const isCluster = matchAnalysisState.ruleMode === 'cluster';
  const totalCards = isCluster ? 28 : (isVersus ? 29 : 30);

  // Bei Sieg zählt die echte Zeit; bei Niederlage wird auf alle Karten hochgerechnet
  let effectiveSec = durationSec;
  if (!didWin) {
    const cleared = Math.max(1, playerPlays.length + Math.min(matchAnalysisState.restocks, 3));
    effectiveSec = durationSec * (totalCards / cleared);
  }

  // Deadlock-Ausgleich: Unverschuldete Restocks kosten Zeit → faire Zeitgutschrift (max. 4×)
  const legitimatePlays = playerPlays.length >= Math.round(totalCards * 0.65);
  const deadlockCredit = (legitimatePlays && matchAnalysisState.restocks <= 5)
    ? Math.min(matchAnalysisState.restocks, 4) * (isCluster ? 3.5 : 2.5)
    : 0;
  const adjustedSec = Math.max(8, effectiveSec - deadlockCredit);

  // Cluster-Modus dauert kognitiv länger → auf Standard-Skala normieren
  const normSec = isCluster ? (adjustedSec / 1.45) : adjustedSec;
  const baseTimeElo = timeToBaseElo(normSec);

  // Sekundäre Feinjustierung (Fehler, fehlerfreie Partie, Flow, Restock-Spam-Schutz)
  const mistakeAdj = matchAnalysisState.mistakes === 0 && playerPlays.length >= 15
    ? 35
    : -Math.min(140, matchAnalysisState.mistakes * 18);
  const flowBonus = Math.min(25, Math.max(0, (matchAnalysisState.maxStreak - 3) * 4));
  const lossAdj = didWin ? 0 : -40;
  const excessRestockPenalty = matchAnalysisState.restocks > 5 ? -(matchAnalysisState.restocks - 5) * 40 : 0;

  const perfElo = Math.max(450, Math.round(baseTimeElo + mistakeAdj + flowBonus + lossAdj + excessRestockPenalty));

  // Eigenschafts-Profil (Anzahl / Farbe / Symbol)
  const props = { x: 0, y: 0, z: 0, cluster: 0 };
  playerPlays.forEach(e => {
    if (props[e.propType] !== undefined) props[e.propType]++;
  });

  // Schlüsselmoment ermitteln
  let keyMoment = 'Konstante Partie ohne größere Einbrüche.';
  let maxLead = -99, minLead = 99;
  matchAnalysisState.timeline.forEach(pt => {
    if (pt.adv > maxLead) maxLead = pt.adv;
    if (pt.adv < minLead) minLead = pt.adv;
  });
  if (didWin && normSec <= 25) {
    keyMoment = `Grandmaster-Tempo: ${formatElapsedTime(durationSec)}${deadlockCredit > 0 ? ` (inkl. ${deadlockCredit.toFixed(1)}s Deadlock-Ausgleich)` : ''}.`;
  } else if (didWin && minLead <= -3) {
    keyMoment = `Starkes Comeback: Trotz ${Math.abs(minLead)} Karten Rückstand noch gedreht.`;
  } else if (!didWin && maxLead >= 3) {
    keyMoment = `Knapper Wendepunkt: Du lagst zwischenzeitlich +${maxLead} Karten vorn.`;
  } else if (matchAnalysisState.mistakes >= 4) {
    keyMoment = `${matchAnalysisState.mistakes} Fehlversuche haben Tempo und Flow gekostet.`;
  } else if (counts.brilliant >= 3) {
    keyMoment = `Starke Tempo-Phase mit ${counts.brilliant} brillanten Zügen und ${matchAnalysisState.maxStreak}× Flow-Serie.`;
  } else if (matchAnalysisState.restocks >= 2) {
    keyMoment = `${matchAnalysisState.restocks}× Stocken (Deadlock) – im Spiel-Rating fair ausgeglichen.`;
  }

  matchAnalysisState.lastReport = {
    meta: meta || {},
    didWin,
    ruleMode: matchAnalysisState.ruleMode,
    oppLabel: (meta && meta.oppLabel) || matchAnalysisState.oppLabel,
    durationSec,
    playerMoves: playerPlays.length,
    oppMoves: oppPlays.length,
    avgReactionMs,
    bestReactionMs,
    maxStreak: matchAnalysisState.maxStreak,
    restocks: matchAnalysisState.restocks,
    accuracy,
    perfElo,
    counts,
    props,
    keyMoment,
    timeline: [...matchAnalysisState.timeline],
    events: [...matchAnalysisState.events]
  };
  return matchAnalysisState.lastReport;
}

function renderEvalChartSVG(report) {
  const pts = report.timeline;
  if (!pts || pts.length < 2) {
    return '<div class="text-xs text-slate-500 py-8 text-center mono">Zu wenig Daten für einen Verlaufsgraphen.</div>';
  }

  const W = 640, H = 190, padL = 36, padR = 16, padT = 18, padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxT = Math.max(1, pts[pts.length - 1].t, report.durationSec);
  const maxAbsAdv = Math.max(4, ...pts.map(p => Math.abs(p.adv)));

  const xOf = (t) => padL + (t / maxT) * plotW;
  const yOf = (adv) => padT + plotH / 2 - (adv / maxAbsAdv) * (plotH / 2 - 4);
  const midY = padT + plotH / 2;

  const lineCoords = pts.map(p => `${xOf(p.t).toFixed(1)},${yOf(p.adv).toFixed(1)}`).join(' ');
  const areaCoords = `${xOf(pts[0].t).toFixed(1)},${midY.toFixed(1)} ${lineCoords} ${xOf(pts[pts.length - 1].t).toFixed(1)},${midY.toFixed(1)}`;

  // Restock- & Fehler-Marker auf der Zeitachse
  const restockLines = report.events
    .filter(e => e.type === 'restock')
    .map(e => {
      const x = xOf(e.t).toFixed(1);
      return `<line x1="${x}" y1="${padT}" x2="${x}" y2="${H - padB}" stroke="#fbbf24" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.65"/>`;
    }).join('');

  const mistakeDots = report.events
    .filter(e => e.type === 'mistake')
    .map(e => {
      const x = xOf(e.t).toFixed(1);
      const y = yOf(e.adv).toFixed(1);
      return `<circle cx="${x}" cy="${y}" r="3.5" fill="#fb7185" stroke="#0f172a" stroke-width="1.2"/>`;
    }).join('');

  const tMid = (maxT / 2).toFixed(0);
  const tEnd = maxT.toFixed(0);

  return `
    <svg viewBox="0 0 ${W} ${H}" class="w-full h-auto block select-none">
      <defs>
        <clipPath id="ma-clip-pos"><rect x="${padL}" y="${padT}" width="${plotW}" height="${plotH / 2}"/></clipPath>
        <clipPath id="ma-clip-neg"><rect x="${padL}" y="${midY}" width="${plotW}" height="${plotH / 2}"/></clipPath>
        <linearGradient id="ma-grad-pos" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="#22d3ee" stop-opacity="0.02"/>
        </linearGradient>
        <linearGradient id="ma-grad-neg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fb7185" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#fb7185" stop-opacity="0.45"/>
        </linearGradient>
      </defs>

      <!-- Horizontale Hilfslinien -->
      <line x1="${padL}" y1="${padT}" x2="${W - padR}" y2="${padT}" stroke="currentColor" opacity="0.08"/>
      <line x1="${padL}" y1="${midY}" x2="${W - padR}" y2="${midY}" stroke="currentColor" opacity="0.28" stroke-dasharray="4 4"/>
      <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="currentColor" opacity="0.08"/>

      <!-- Flächen oben (Du vorn) & unten (Gegner vorn) -->
      <polygon points="${areaCoords}" fill="url(#ma-grad-pos)" clip-path="url(#ma-clip-pos)"/>
      <polygon points="${areaCoords}" fill="url(#ma-grad-neg)" clip-path="url(#ma-clip-neg)"/>

      <!-- Restock-Markierungen -->
      ${restockLines}

      <!-- Hauptkurve -->
      <polyline points="${lineCoords}" fill="none" stroke="#22d3ee" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>

      <!-- Fehler-Punkte -->
      ${mistakeDots}

      <!-- Y-Achsen-Labels -->
      <text x="${padL - 6}" y="${padT + 4}" text-anchor="end" font-size="9.5" fill="#22d3ee" font-family="JetBrains Mono, monospace">+${maxAbsAdv}</text>
      <text x="${padL - 6}" y="${midY + 3}" text-anchor="end" font-size="9.5" fill="#94a3b8" font-family="JetBrains Mono, monospace">0</text>
      <text x="${padL - 6}" y="${H - padB + 3}" text-anchor="end" font-size="9.5" fill="#fb7185" font-family="JetBrains Mono, monospace">-${maxAbsAdv}</text>

      <!-- X-Achsen-Labels -->
      <text x="${padL}" y="${H - 7}" text-anchor="start" font-size="9.5" fill="#64748b" font-family="JetBrains Mono, monospace">0s</text>
      <text x="${padL + plotW / 2}" y="${H - 7}" text-anchor="middle" font-size="9.5" fill="#64748b" font-family="JetBrains Mono, monospace">${tMid}s</text>
      <text x="${W - padR}" y="${H - 7}" text-anchor="end" font-size="9.5" fill="#64748b" font-family="JetBrains Mono, monospace">${tEnd}s</text>
    </svg>
  `;
}

function openMatchAnalysisModal() {
  const report = matchAnalysisState.lastReport;
  if (!report) {
    showSonnerToast('Spiele zuerst eine Partie in der Blink-Arena, um sie zu analysieren.', 'neutral');
    return;
  }

  closeMatchSummaryOverlay();
  renderMatchAnalysisModal(report);
  if (typeof toggleModalState === 'function') {
    const m = document.getElementById('match-analysis-modal');
    if (m && m.classList.contains('hidden')) toggleModalState('match-analysis-modal');
  }
  playSound('tick');
}

function closeMatchAnalysisModal() {
  const m = document.getElementById('match-analysis-modal');
  if (m && !m.classList.contains('hidden') && typeof toggleModalState === 'function') {
    toggleModalState('match-analysis-modal');
  }
}

function renderMatchAnalysisModal(report) {
  const subEl = document.getElementById('ma-subtitle');
  const kpiEl = document.getElementById('ma-kpi-grid');
  const chartEl = document.getElementById('ma-eval-chart');
  const keyEl = document.getElementById('ma-key-moment');
  const qualEl = document.getElementById('ma-quality-grid');
  const propEl = document.getElementById('ma-prop-bars');
  const listEl = document.getElementById('ma-move-timeline');

  const ruleLabel = report.ruleMode === 'cluster' ? 'Cluster (3 Stapel)' : 'Standard (2 Stapel)';
  if (subEl) {
    subEl.textContent = `${report.didWin ? 'Sieg' : 'Niederlage'} vs. ${report.oppLabel} · ${ruleLabel} · ${formatElapsedTime(report.durationSec)}`;
  }

  const perfRank = getEloRankInfo(report.perfElo);
  if (kpiEl) {
    kpiEl.innerHTML = `
      <div class="rounded-2xl bg-slate-950/80 border border-white/[0.08] p-3">
        <div class="text-[9.5px] uppercase tracking-wider text-slate-500 mono">Genauigkeit</div>
        <div class="text-xl font-extrabold text-cyan-300 mono mt-0.5">${report.accuracy.toFixed(1)} %</div>
        <div class="text-[10px] text-slate-400 mono">${report.playerMoves} Treffer · ${report.counts.mistake} Fehler</div>
      </div>
      <div class="rounded-2xl bg-slate-950/80 border border-white/[0.08] p-3">
        <div class="text-[9.5px] uppercase tracking-wider text-slate-500 mono">Spiel-Rating</div>
        <div class="text-xl font-extrabold text-white mono mt-0.5">${report.perfElo}</div>
        <div class="text-[10px] text-slate-400 mono">${perfRank.name}-Niveau</div>
      </div>
      <div class="rounded-2xl bg-slate-950/80 border border-white/[0.08] p-3">
        <div class="text-[9.5px] uppercase tracking-wider text-slate-500 mono">Ø Tempo</div>
        <div class="text-xl font-extrabold text-emerald-300 mono mt-0.5">${(report.avgReactionMs / 1000).toFixed(2)}s</div>
        <div class="text-[10px] text-slate-400 mono">Best: ${(report.bestReactionMs / 1000).toFixed(2)}s</div>
      </div>
      <div class="rounded-2xl bg-slate-950/80 border border-white/[0.08] p-3">
        <div class="text-[9.5px] uppercase tracking-wider text-slate-500 mono">Max. Flow</div>
        <div class="text-xl font-extrabold text-purple-300 mono mt-0.5">${report.maxStreak}×</div>
        <div class="text-[10px] text-slate-400 mono">${report.restocks}× Restock</div>
      </div>
    `;
  }

  if (chartEl) chartEl.innerHTML = renderEvalChartSVG(report);
  if (keyEl) keyEl.textContent = report.keyMoment;

  if (qualEl) {
    const items = [
      { sym: '!!', label: 'Brillant', val: report.counts.brilliant, cls: 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10' },
      { sym: '!',  label: 'Stark',    val: report.counts.great,     cls: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10' },
      { sym: '✓',  label: 'Solide',   val: report.counts.good,      cls: 'text-slate-300 border-white/10 bg-white/[0.04]' },
      { sym: '?!', label: 'Langsam',  val: report.counts.inaccuracy,cls: 'text-amber-300 border-amber-400/30 bg-amber-500/10' },
      { sym: '✕',  label: 'Fehler',   val: report.counts.mistake,   cls: 'text-rose-300 border-rose-400/30 bg-rose-500/10' }
    ];
    qualEl.innerHTML = items.map(it => `
      <div class="rounded-xl border px-2.5 py-2 text-center ${it.cls}">
        <div class="text-sm font-extrabold mono">${it.val}</div>
        <div class="text-[9.5px] mono opacity-85">${it.sym} ${it.label}</div>
      </div>
    `).join('');
  }

  if (propEl) {
    if (report.ruleMode === 'cluster') {
      propEl.innerHTML = `<div class="text-xs text-slate-400">Im Cluster-Modus wurden <strong class="text-purple-300">${report.props.cluster} gültige Cluster-Trios</strong> ($d_H = 3$) gespielt.</div>`;
    } else {
      const sum = Math.max(1, report.props.x + report.props.y + report.props.z);
      const rows = [
        { lbl: 'Anzahl (X)', val: report.props.x, color: 'bg-cyan-400' },
        { lbl: 'Farbe (Y)',  val: report.props.y, color: 'bg-emerald-400' },
        { lbl: 'Symbol (Z)', val: report.props.z, color: 'bg-purple-400' }
      ];
      propEl.innerHTML = rows.map(r => {
        const pct = Math.round((r.val / sum) * 100);
        return `
          <div class="space-y-1">
            <div class="flex justify-between text-[11px] mono">
              <span class="text-slate-300">${r.lbl}</span>
              <span class="text-slate-400">${r.val}× (${pct} %)</span>
            </div>
            <div class="w-full h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
              <div class="h-full ${r.color} rounded-full" style="width:${pct}%"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  if (listEl) {
    const filtered = report.events.filter(e => e.actor === 'player' || e.type === 'restock');
    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="text-xs text-slate-500 text-center py-4">Keine Züge aufgezeichnet.</div>';
    } else {
      listEl.innerHTML = filtered.map((e, i) => {
        const q = e.quality || { symbol: '•', label: '', cls: 'text-slate-400 bg-white/5 border-white/10' };
        const cardTxt = e.card ? `(${e.card.join(',')}) → M${e.pileIdx + 1}` : e.reason;
        const speedTxt = e.reactionMs ? `${(e.reactionMs / 1000).toFixed(2)}s` : '';
        const advTxt = e.adv > 0 ? `+${e.adv}` : `${e.adv}`;
        const advCls = e.adv > 0 ? 'text-cyan-300' : (e.adv < 0 ? 'text-rose-400' : 'text-slate-500');
        return `
          <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-950/75 border border-white/[0.06] text-[11px] mono">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-slate-500 w-9 shrink-0">${e.t.toFixed(1)}s</span>
              <span class="px-1.5 py-0.5 rounded-md border text-[9.5px] font-extrabold shrink-0 ${q.cls}">${q.symbol}</span>
              <span class="text-slate-200 truncate">${cardTxt}</span>
            </div>
            <div class="flex items-center gap-2.5 shrink-0">
              ${speedTxt ? `<span class="text-[10px] text-slate-400">${speedTxt}</span>` : ''}
              <span class="text-[10px] font-bold w-7 text-right ${advCls}">${advTxt}</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

// ============================================================================
// AUTOMATISCHE ANBINDUNG AN GAMES.JS (OHNE GAMES.JS ÄNDERN ZU MÜSSEN)
// ============================================================================
(function attachMatchAnalysisHooks() {
  if (window.__BLINK_ANALYSIS_HOOKED) return;
  window.__BLINK_ANALYSIS_HOOKED = true;

  if (typeof startNewBlinkGame === 'function') {
    const _origStart = startNewBlinkGame;
    window.startNewBlinkGame = function () {
      const res = _origStart.apply(this, arguments);
      if (gameState.isRunning) resetMatchAnalysisTracker();
      return res;
    };
  }

  if (typeof executeCardPlay === 'function') {
    const _origPlay = executeCardPlay;
    window.executeCardPlay = function (actor, handIdx, pileIdx) {
      const hand = actor === 'player' ? gameState.playerHand : gameState.aiHand;
      const card = hand && hand[handIdx] ? [...hand[handIdx]] : null;
      const reasons = card ? getMatchingReasons(card, pileIdx) : [];
      if (card) recordAnalysisPlay(actor, card, pileIdx, reasons);
      return _origPlay.apply(this, arguments);
    };
  }

  if (typeof triggerInvalidShake === 'function') {
    const _origShake = triggerInvalidShake;
    window.triggerInvalidShake = function (elId, silent = false) {
      if (!silent) recordAnalysisMistake();
      return _origShake.apply(this, arguments);
    };
  }

  if (typeof resolveDeadlockStocken === 'function') {
    const _origRestock = resolveDeadlockStocken;
    window.resolveDeadlockStocken = function () {
      const res = _origRestock.apply(this, arguments);
      recordAnalysisRestock();
      return res;
    };
  }

  if (typeof showMatchSummaryOverlay === 'function') {
    const _origSummary = showMatchSummaryOverlay;
    window.showMatchSummaryOverlay = function (payload) {
      if (matchAnalysisState.active) {
        const rep = buildMatchAnalysisReport(payload);
        const btn = document.getElementById('btn-open-match-analysis');
        if (btn) btn.classList.toggle('hidden', !rep || rep.playerMoves === 0);
      }
      return _origSummary.apply(this, arguments);
    };
  }

  // Escape schließt auch das Analyse-Modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMatchAnalysisModal();
  });
})();