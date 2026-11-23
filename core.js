        function safeRenderMathJax() {
            if (typeof MathJax !== 'undefined' && typeof MathJax.typesetPromise === 'function') {
                MathJax.typesetPromise().catch((err) => console.log('MathJax Error:', err));
            }
        }

       // ============================================================================
        // CINEMATIC SOUND-DESIGN (INTERSTELLAR „CORNFIELD CHASE“ · WEB AUDIO API)
        // ============================================================================
        let audioCtx = null;
        let audioOutputGain = null;
        let audioMasterBus = null;
        let audioOrganBus = null;
        let audioReverbBus = null;
        let soundEnabled = localStorage.getItem('blink_sound_enabled') === 'true';
        let musicEnabled = localStorage.getItem('blink_music_enabled') === 'true';
        let soundVolume = parseFloat(localStorage.getItem('blink_sound_volume') || '0.20');
        if (isNaN(soundVolume)) soundVolume = 0.20;
        let cornfieldStep = 0; // Lässt Klicks musikalisch durch das Motiv wandern

        function createCathedralReverb(ctx, duration = 2.8, decay = 2.5) {
            const rate = ctx.sampleRate;
            const preDelay = Math.floor(rate * 0.032); // 32 ms Pre-Delay (Temple Church Raumgefühl)
            const length = Math.floor(rate * duration);
            const impulse = ctx.createBuffer(2, length, rate);

            for (let ch = 0; ch < 2; ch++) {
                const data = impulse.getChannelData(ch);
                let lpState = 0;
                for (let i = 0; i < length; i++) {
                    if (i < preDelay) { data[i] = 0; continue; }
                    const t = (i - preDelay) / (length - preDelay);
                    const env = Math.pow(1 - t, decay);
                    const white = Math.random() * 2 - 1;
                    lpState = lpState * 0.86 + white * 0.14;
                    data[i] = lpState * env * 2.5;
                }
            }
            const convolver = ctx.createConvolver();
            convolver.buffer = impulse;
            return convolver;
        }

        function getAudioContext() {
            if (!audioCtx) {
                const AudioCtor = window.AudioContext || window.webkitAudioContext;
                if (AudioCtor) {
                    audioCtx = new AudioCtor();

                    // Master-Lautstärke (wird über die Einstellungen geregelt)
                    audioOutputGain = audioCtx.createGain();
                    audioOutputGain.gain.value = soundVolume;
                    audioOutputGain.connect(audioCtx.destination);

                    // Transparenter Master-Kompressor für große Dynamik ohne Clipping
                    const comp = audioCtx.createDynamicsCompressor();
                    comp.threshold.value = -15;
                    comp.knee.value = 24;
                    comp.ratio.value = 4.5;
                    comp.attack.value = 0.012;
                    comp.release.value = 0.24;
                    comp.connect(audioOutputGain);

                    audioMasterBus = audioCtx.createGain();
                    audioMasterBus.gain.value = 0.35;
                    audioMasterBus.connect(comp);

                    // Warmer Kirchenorgel-Bus mit sanfter Tiefen-Anhebung
                    const organWarmth = audioCtx.createBiquadFilter();
                    organWarmth.type = 'lowshelf';
                    organWarmth.frequency.value = 170;
                    organWarmth.gain.value = 4.0;

                    audioOrganBus = audioCtx.createGain();
                    audioOrganBus.gain.value = 0.90;
                    audioOrganBus.connect(organWarmth);
                    organWarmth.connect(audioMasterBus);

                    // Kathedralen-Hall (2,8 s, seidig & weit)
                    const reverb = createCathedralReverb(audioCtx, 2.8, 2.5);
                    const hp = audioCtx.createBiquadFilter();
                    hp.type = 'highpass';
                    hp.frequency.value = 125;
                    const lp = audioCtx.createBiquadFilter();
                    lp.type = 'lowpass';
                    lp.frequency.value = 2200;

                    audioReverbBus = audioCtx.createGain();
                    audioReverbBus.gain.value = 0.68;
                    audioReverbBus.connect(reverb);
                    reverb.connect(hp);
                    hp.connect(lp);
                    lp.connect(comp);
                }
            }
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => {});
            }
            return audioCtx;
        }

        function routeCornfield(ctx, node, { pan = 0, wet = 0.72, toOrgan = false } = {}) {
            let target = node;
            if (typeof ctx.createStereoPanner === 'function' && pan !== 0) {
                const panner = ctx.createStereoPanner();
                panner.pan.value = Math.max(-1, Math.min(1, pan));
                node.connect(panner);
                target = panner;
            }
            target.connect(toOrgan ? audioOrganBus : audioMasterBus);
            if (wet > 0 && audioReverbBus) {
                const send = ctx.createGain();
                send.gain.value = wet * 0.35;
                target.connect(send);
                send.connect(audioReverbBus);
            }
        }

        // Glasklares, intimes Interstellar-Klavier / Celesta (mit zartem Filz-Anschlag)
        function playCornfieldKey(ctx, freq, start, duration, volume = 0.075, pan = 0, wet = 0.78) {
            const env = ctx.createGain();
            env.gain.setValueAtTime(0.0001, start);
            env.gain.linearRampToValueAtTime(volume, start + 0.010);
            env.gain.exponentialRampToValueAtTime(0.0001, start + duration);

            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.Q.value = 0.6;
            lp.frequency.setValueAtTime(Math.min(4600, freq * 5.5), start);
            lp.frequency.exponentialRampToValueAtTime(Math.max(320, freq * 1.6), start + duration);

            env.connect(lp);
            routeCornfield(ctx, lp, { pan, wet, toOrgan: false });

            // Reine, glockenklare Obertöne (Klavier + Hauch von Celesta)
            [
                { mult: 1, amp: 1.00, wave: 'sine',     det:  0 },
                { mult: 1, amp: 0.28, wave: 'triangle', det:  2.5 },
                { mult: 2, amp: 0.24, wave: 'sine',     det: -1.5 },
                { mult: 3, amp: 0.08, wave: 'sine',     det:  0 }
            ].forEach(p => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = p.wave;
                osc.frequency.setValueAtTime(freq * p.mult, start);
                if (p.det) osc.detune.setValueAtTime(p.det, start);
                g.gain.value = p.amp;
                osc.connect(g);
                g.connect(env);
                osc.start(start);
                osc.stop(start + duration + 0.04);
            });
        }

        // Echte Temple-Church-Kirchenorgel (Register: 16' Sub, 8' Prinzipal, 4' Oktave, 2 2/3' Quinte)
        function playTempleOrgan(ctx, freq, start, attack, hold, release, { volume = 0.065, maxFilter = 1900, wet = 0.92, fullStops = true } = {}) {
            const total = attack + hold + release;
            const stops = fullStops
                ? [
                    { mult: 0.5, pan:  0.00, det:  0, wave: 'sine',     amp: 0.65 }, // 16' Sub-Pedal
                    { mult: 1.0, pan: -0.62, det: -5, wave: 'triangle', amp: 0.55 }, // 8' Links
                    { mult: 1.0, pan:  0.62, det:  5, wave: 'triangle', amp: 0.55 }, // 8' Rechts
                    { mult: 1.0, pan:  0.00, det:  0, wave: 'sawtooth', amp: 0.22 }, // 8' Zungen-Wärme
                    { mult: 2.0, pan: -0.35, det:  3, wave: 'sine',     amp: 0.28 }, // 4' Oktave
                    { mult: 3.0, pan:  0.35, det: -3, wave: 'sine',     amp: 0.12 }  // 2 2/3' Quinte (Kathedralen-Glanz)
                ]
                : [
                    { mult: 0.5, pan:  0.00, det:  0, wave: 'sine',     amp: 0.55 },
                    { mult: 1.0, pan: -0.50, det: -4, wave: 'triangle', amp: 0.50 },
                    { mult: 1.0, pan:  0.50, det:  4, wave: 'triangle', amp: 0.50 },
                    { mult: 2.0, pan:  0.00, det:  0, wave: 'sine',     amp: 0.20 }
                ];

            stops.forEach(s => {
                const osc = ctx.createOscillator();
                const lp = ctx.createBiquadFilter();
                const g = ctx.createGain();

                osc.type = s.wave;
                osc.frequency.setValueAtTime(freq * s.mult, start);
                if (s.det) osc.detune.setValueAtTime(s.det, start);

                // Sanfte Orgel-Schwellkasten-Dynamik (öffnet sich nach oben!)
                lp.type = 'lowpass';
                lp.Q.value = 0.75;
                lp.frequency.setValueAtTime(220, start);
                lp.frequency.exponentialRampToValueAtTime(maxFilter, start + attack + hold * 0.6);
                lp.frequency.exponentialRampToValueAtTime(280, start + total);

                g.gain.setValueAtTime(0.0001, start);
                g.gain.linearRampToValueAtTime(volume * s.amp, start + attack);
                g.gain.setValueAtTime(volume * s.amp, start + attack + hold);
                g.gain.exponentialRampToValueAtTime(0.0001, start + total);

                osc.connect(lp);
                lp.connect(g);
                routeCornfield(ctx, g, { pan: s.pan, wet, toOrgan: true });

                osc.start(start);
                osc.stop(start + total + 0.06);
            });
        }

        // Subtiler, organischer Uhrwerk-Impuls (Interstellar Zeit-Motiv)
        function playClockPulse(ctx, start, volume = 0.025) {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1180, start);
            osc.frequency.exponentialRampToValueAtTime(420, start + 0.018);
            g.gain.setValueAtTime(0.0001, start);
            g.gain.linearRampToValueAtTime(volume, start + 0.002);
            g.gain.exponentialRampToValueAtTime(0.0001, start + 0.024);
            osc.connect(g);
            routeCornfield(ctx, g, { pan: 0, wet: 0.25, toOrgan: false });
            osc.start(start);
            osc.stop(start + 0.03);
        }

        // Gemeinsame Cornfield-Chase-Progression (a-Moll: Fmaj7 → G6 → Am → Em/G)
        // Wird sowohl vom Soundtrack als auch von den Karten-Sounds (passend & unpassend) genutzt
       const CORNFIELD_BARS = [
            {
                bass: 87.31, pad: 174.61, fifth: 261.63, // F2 / F3 / C4
                arp: [440.00, 659.25, 440.00, 659.25, 440.00, 659.25], // A4 - E5 Pendel
                high: [880.00, 659.25], top: 880.00,
                goodNotes: [523.25, 659.25, 440.00], // C5, E5, A4 (sanft im selben Register)
                errPair: [349.23, 329.63]            // F4 → E4 (rein diatonisch a-Moll)
            },
            {
                bass: 98.00, pad: 196.00, fifth: 293.66, // G2 / G3 / D4
                arp: [493.88, 659.25, 493.88, 659.25, 493.88, 659.25], // H4 - E5 Pendel
                high: [987.77, 659.25], top: 987.77,
                goodNotes: [587.33, 659.25, 493.88], // D5, E5, H4
                errPair: [293.66, 261.63]            // D4 → C4 (rein diatonisch a-Moll)
            },
            {
                bass: 110.00, pad: 220.00, fifth: 329.63, // A2 / A3 / E4
                arp: [523.25, 659.25, 523.25, 659.25, 523.25, 659.25], // C5 - E5 Pendel
                high: [1046.50, 659.25], top: 1046.50,
                goodNotes: [523.25, 659.25, 440.00], // C5, E5, A4
                errPair: [261.63, 246.94]            // C4 → H3 (rein diatonisch a-Moll)
            },
            {
                bass: 98.00, pad: 196.00, fifth: 329.63, // G2 / G3 / E4 (Em/G Schwebung)
                arp: [587.33, 659.25, 523.25, 659.25, 493.88, 659.25], // D5-E5-C5-E5-H4-E5 Abstieg
                high: [1174.66, 987.77], top: 987.77,
                goodNotes: [587.33, 493.88, 659.25], // D5, H4, E5
                errPair: [329.63, 293.66]            // E4 → D4 (rein diatonisch a-Moll)
            }
        ];

        function getQuantizedSoundTime(ctx, maxSnapSec = 0.085) {
            const now = ctx.currentTime;
            if (!gameMusicState.active || !gameMusicState.nextNoteTime) return now;
            const eighth = gameMusicState.eighthSec || 0.254;
            const halfStep = eighth * 0.5;
            let t = gameMusicState.nextNoteTime;
            while (t - halfStep > now + 0.005) t -= halfStep;
            const delta = t - now;
            return (delta > 0.004 && delta <= maxSnapSec) ? t : now;
        }

        function playSoftOrchestralPlayTone(ctx, dest, freq, startTime) {
            const osc = ctx.createOscillator();
            const lp = ctx.createBiquadFilter();
            const env = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);
            lp.type = 'lowpass';
            lp.Q.value = 0.5;
            lp.frequency.setValueAtTime(1050, startTime);
            lp.frequency.exponentialRampToValueAtTime(420, startTime + 0.42);
            env.gain.setValueAtTime(0.0001, startTime);
            env.gain.linearRampToValueAtTime(0.014, startTime + 0.026);
            env.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.44);
            osc.connect(lp);
            lp.connect(env);
            env.connect(dest);
            if (audioReverbBus) {
                const send = ctx.createGain();
                send.gain.value = 0.58;
                env.connect(send);
                send.connect(audioReverbBus);
            }
            osc.start(startTime);
            osc.stop(startTime + 0.48);
        }

        function playSoftOrchestralErrorTone(ctx, dest, bassFreq, hiErr, loErr, startTime) {
            // Tiefer, gedämpfter Cello-/Kontrabass-Impuls auf dem Grundton des laufenden Takts
            const lowOsc = ctx.createOscillator();
            const lowLp = ctx.createBiquadFilter();
            const lowEnv = ctx.createGain();
            lowOsc.type = 'triangle';
            lowOsc.frequency.setValueAtTime(bassFreq, startTime);
            lowLp.type = 'lowpass';
            lowLp.frequency.setValueAtTime(260, startTime);
            lowLp.frequency.exponentialRampToValueAtTime(125, startTime + 0.30);
            lowEnv.gain.setValueAtTime(0.0001, startTime);
            lowEnv.gain.linearRampToValueAtTime(0.022, startTime + 0.022);
            lowEnv.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.32);
            lowOsc.connect(lowLp);
            lowLp.connect(lowEnv);
            lowEnv.connect(dest);
            if (audioReverbBus) {
                const send = ctx.createGain();
                send.gain.value = 0.38;
                lowEnv.connect(send);
                send.connect(audioReverbBus);
            }
            lowOsc.start(startTime);
            lowOsc.stop(startTime + 0.36);

            // Sehr leiser, eine Oktave tiefer gedämpfter Seufzer (lässt die obere Klavier-Melodie unberührt)
            const sighOsc = ctx.createOscillator();
            const sighLp = ctx.createBiquadFilter();
            const sighEnv = ctx.createGain();
            sighOsc.type = 'sine';
            sighOsc.frequency.setValueAtTime(hiErr * 0.5, startTime);
            sighOsc.frequency.exponentialRampToValueAtTime(loErr * 0.5, startTime + 0.22);
            sighLp.type = 'lowpass';
            sighLp.frequency.setValueAtTime(380, startTime);
            sighEnv.gain.setValueAtTime(0.0001, startTime);
            sighEnv.gain.linearRampToValueAtTime(0.011, startTime + 0.024);
            sighEnv.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.28);
            sighOsc.connect(sighLp);
            sighLp.connect(sighEnv);
            sighEnv.connect(dest);
            sighOsc.start(startTime);
            sighOsc.stop(startTime + 0.32);
        }

        function playSound(type = 'tick') {
            // Bei Sieg darf der warme Schlussakkord auch erklingen, wenn nur der Soundtrack an war
            const allowMusicResolution = (type === 'win') && musicEnabled &&
                (gameMusicState.active || (performance.now() - (gameMusicState.lastStopAt || 0) < 1200));
            if (!soundEnabled && !allowMusicResolution) return;
            try {
                const ctx = getAudioContext();
                if (!ctx || !audioMasterBus) return;
                const now = ctx.currentTime;

                const motifLow = [440.00, 493.88, 523.25, 493.88];
                const motifBass = [174.61, 196.00, 220.00, 196.00];
                const activeBarIdx = gameMusicState.active ? gameMusicState.currentBarIdx : (cornfieldStep % 4);
                const bar = CORNFIELD_BARS[activeBarIdx] || CORNFIELD_BARS[0];
                const musicPlaying = Boolean(gameMusicState.active && musicEnabled);

                if (type === 'tick') {
                    const step = cornfieldStep % 4;
                    cornfieldStep++;
                    if (musicPlaying) {
                        // Wenn Musik läuft: nur ein hauchzarter Impuls, damit nichts übertönt oder hakt
                        playClockPulse(ctx, now, 0.011);
                        playCornfieldKey(ctx, bar.arp[step % bar.arp.length], now, 0.35, 0.014, 0, 0.88);
                    } else {
                        playClockPulse(ctx, now, 0.022);
                        playCornfieldKey(ctx, motifLow[step], now, 0.58, 0.052, -0.25, 0.72);
                        playCornfieldKey(ctx, 659.25, now + 0.065, 0.62, 0.034, 0.25, 0.80);
                        playTempleOrgan(ctx, motifBass[step], now, 0.06, 0.04, 0.36, { volume: 0.026, maxFilter: 720, wet: 0.75, fullStops: false });
                    }

                } else if (type === 'play') {
                    // Passende Karte: organischer Orchester-Akzent exakt auf den Akkordtönen des laufenden Takts
                    const noteIdx = cornfieldStep % bar.goodNotes.length;
                    cornfieldStep++;
                    const qTime = musicPlaying ? getQuantizedSoundTime(ctx, 0.075) : now;
                    const pan = (cornfieldStep % 2 === 0) ? -0.22 : 0.22;

                    if (musicPlaying && gameMusicState.musicGain) {
                        const dest = gameMusicState.musicGain;
                        playSoftOrchestralPlayTone(ctx, dest, bar.goodNotes[noteIdx], qTime);
                    } else {
                        playCornfieldKey(ctx, bar.goodNotes[noteIdx], now, 0.78, 0.028, pan, 0.90);
                        playTempleOrgan(ctx, bar.pad, now, 0.08, 0.08, 0.40, { volume: 0.015, maxFilter: 680, wet: 0.90, fullStops: false });
                    }

                } else if (type === 'flip') {
                    playTempleOrgan(ctx, 87.31, now, 0.28, 0.22, 0.75, { volume: 0.070, maxFilter: 1250, wet: 0.90, fullStops: true });
                    playTempleOrgan(ctx, 98.00, now + 0.36, 0.26, 0.20, 0.78, { volume: 0.072, maxFilter: 1550, wet: 0.92, fullStops: true });

                    const wave = [
                        { f: 440.00, t: 0.00, p: -0.40 },
                        { f: 659.25, t: 0.11, p:  0.40 },
                        { f: 493.88, t: 0.22, p: -0.35 },
                        { f: 659.25, t: 0.33, p:  0.35 },
                        { f: 523.25, t: 0.44, p: -0.25 },
                        { f: 659.25, t: 0.55, p:  0.25 }
                    ];
                    wave.forEach(n => playCornfieldKey(ctx, n.f, now + n.t, 0.92, 0.058, n.p, 0.86));

                } else if (type === 'error') {
                    // Unpassende Karte: gedämpfter, dunkler Orchester-Vorhalt in a-Moll (klar hörbar, aber Teil des Themes)
                    const [hiErr, loErr] = bar.errPair;
                    const qTime = musicPlaying ? getQuantizedSoundTime(ctx, 0.07) : now;

                    if (musicPlaying && gameMusicState.musicGain) {
                        const dest = gameMusicState.musicGain;
                        playSoftOrchestralErrorTone(ctx, dest, bar.bass, hiErr, loErr, qTime);
                    } else {
                        playTempleOrgan(ctx, bar.bass, now, 0.05, 0.10, 0.42, { volume: 0.032, maxFilter: 340, wet: 0.88, fullStops: false });
                        playCornfieldKey(ctx, hiErr, now, 0.32, 0.026, -0.16, 0.86);
                        playCornfieldKey(ctx, loErr, now + 0.085, 0.46, 0.022, 0.16, 0.90);
                    }

                } else if (type === 'win') {
                    // Warme Auflösung in einen leuchtenden A-Dur(add9)-Kathedralen-Schlussakkord
                    const arp = [
                        { f: 440.00, t: 0.00, p: -0.42 }, // A4
                        { f: 659.25, t: 0.13, p:  0.42 }, // E5
                        { f: 554.37, t: 0.26, p: -0.32 }, // C#5 (warme Dur-Aufhellung!)
                        { f: 659.25, t: 0.39, p:  0.32 }, // E5
                        { f: 880.00, t: 0.54, p:  0.00 }  // A5 Gipfel
                    ];
                    arp.forEach((n, idx) => {
                        const v = 0.046 + idx * 0.004;
                        playCornfieldKey(ctx, n.f, now + n.t, idx === arp.length - 1 ? 2.4 : 1.15, v, n.p, 0.92);
                    });

                    // Warmer, weit ausklingender Kathedralen-Schlussakkord (A2 + A3 + E4 + H4 + C#5)
                    playTempleOrgan(ctx, 110.00, now + 0.18, 0.45, 0.95, 2.00, { volume: 0.095, maxFilter: 2250, wet: 0.95, fullStops: true });  // A2 + 16' A1
                    playTempleOrgan(ctx, 220.00, now + 0.22, 0.45, 0.90, 1.95, { volume: 0.068, maxFilter: 2400, wet: 0.95, fullStops: true });  // A3
                    playTempleOrgan(ctx, 329.63, now + 0.26, 0.45, 0.88, 1.90, { volume: 0.056, maxFilter: 2500, wet: 0.95, fullStops: false }); // E4
                    playTempleOrgan(ctx, 493.88, now + 0.32, 0.48, 0.82, 1.85, { volume: 0.032, maxFilter: 2550, wet: 0.95, fullStops: false }); // H4 (add9)
                    playTempleOrgan(ctx, 554.37, now + 0.38, 0.52, 0.80, 1.85, { volume: 0.036, maxFilter: 2450, wet: 0.95, fullStops: false }); // C#5 (warme Auflösung)
                }
            } catch (e) {}
        }

        function updateSoundButtonUI() {
            const chk = document.getElementById('chk-sound-enabled');
            const slider = document.getElementById('range-sound-volume');
            const lbl = document.getElementById('sound-volume-label');
            const pct = Math.round(soundVolume * 100);
            if (chk) chk.checked = soundEnabled;
            const mChk = document.getElementById('chk-music-enabled');
            if (mChk) mChk.checked = musicEnabled;
            if (slider) { slider.value = pct; slider.style.setProperty('--range-fill', `${pct}%`); }
            if (lbl) lbl.textContent = `${pct} %`;
        }

        function setSoundEnabled(enabled) {
            soundEnabled = Boolean(enabled);
            localStorage.setItem('blink_sound_enabled', soundEnabled ? 'true' : 'false');
            updateSoundButtonUI();
            if (soundEnabled) playSound('tick');
        }

        function setSoundVolume(rawPct) {
            const pct = Math.max(0, Math.min(100, parseInt(rawPct, 10) || 0));
            soundVolume = pct / 100;
            localStorage.setItem('blink_sound_volume', String(soundVolume));
            if (audioOutputGain && audioCtx) {
                audioOutputGain.gain.setTargetAtTime(soundVolume, audioCtx.currentTime, 0.02);
            }
            const lbl = document.getElementById('sound-volume-label');
            if (lbl) lbl.textContent = `${pct} %`;
        }

        function playTestSound() {
            if (!soundEnabled) {
                setSoundEnabled(true);
            } else {
                playSound('flip');
            }
        }

        function toggleSoundEnabled() {
            setSoundEnabled(!soundEnabled);
        }

        // ============================================================================
        // ADAPTIVER CORNFIELD-CHASE-SOUNDTRACK (LIVE-SPANNUNGS-ENGINE)
        // ============================================================================
        const gameMusicState = {
            active: false,
            mode: null,
            timer: null,
            step: 0,
            nextNoteTime: 0,
            eighthSec: 60 / 118 / 2,
            currentBarIdx: 0,
            currentTension: 0,
            targetTension: 0.08,
            lastStopAt: 0,
            musicGain: null
        };

        function computeLiveMusicTension(mode) {
            try {
                if (mode === 'arena' && typeof gameState !== 'undefined' && gameState.isRunning) {
                    const pRem = (gameState.playerDeck ? gameState.playerDeck.length : 0) + (gameState.playerHand ? gameState.playerHand.length : 0);
                    const hasOpp = gameState.mode === 'ai' || gameState.mode === 'online';
                    const aRem = hasOpp ? ((gameState.aiDeck ? gameState.aiDeck.length : 0) + (gameState.aiHand ? gameState.aiHand.length : 0)) : 99;
                    const minRem = Math.min(pRem, aRem);

                    let t = 0;
                    if (minRem <= 2) t = 1.0;
                    else if (minRem <= 5) t = 0.78 + ((5 - minRem) / 3) * 0.18;
                    else if (minRem <= 12) t = 0.36 + ((12 - minRem) / 7) * 0.42;
                    else if (minRem <= 22) t = ((22 - minRem) / 10) * 0.36;

                    const elapsed = gameState.startTime ? (performance.now() - gameState.startTime) / 1000 : 0;
                    if (elapsed > 35) t += Math.min(0.22, (elapsed - 35) / 140);
                    if (gameState.streak >= 3) t += 0.10;
                    return Math.min(1, Math.max(0, t));
                }

                if (mode === 'verhoer' && typeof vhState !== 'undefined' && vhState.isRunning && typeof getMaxClusterSubsetSize === 'function') {
                    const pProg = getMaxClusterSubsetSize(vhState.playerHand, vhState.playerTrios);
                    const bProg = getMaxClusterSubsetSize(vhState.aiHand, vhState.aiTrios);
                    const maxProg = Math.max(pProg, bProg);
                    let t = maxProg <= 2 ? 0.04 : (maxProg === 3 ? 0.42 : (maxProg === 4 ? 0.88 : 1.0));
                    if (vhState.phase === 'interrogation') t = Math.min(1.0, t + 0.22);
                    return t;
                }

                if (mode === 'daily' && typeof dailyState !== 'undefined' && dailyState.solutions.length > 0) {
                    const left = dailyState.solutions.length - dailyState.foundKeys.size;
                    if (left <= 1) return 0.94;
                    return Math.min(0.88, (dailyState.foundKeys.size / dailyState.solutions.length) * 0.92);
                }

                if (mode === 'sudoku' && typeof sudokuState !== 'undefined' && !sudokuState.solved) {
                    const filled = sudokuState.board.filter(Boolean).length;
                    const totalEmpty = Math.max(1, sudokuState.emptyCount || 10);
                    const placed = Math.max(0, filled - (25 - totalEmpty));
                    const ratio = placed / totalEmpty;
                    return ratio >= 0.82 ? 0.92 : ratio * 0.82;
                }

                if (mode === 'endgame' && typeof endgameState !== 'undefined' && endgameState.status === 'playing') {
                    const rem = endgameState.hand.length;
                    if (rem <= 1) return 0.95;
                    if (rem === 2) return 0.72;
                    if (rem === 3) return 0.40;
                    return 0.10;
                }

                if (mode === 'cascade' && typeof cascadeState !== 'undefined' && !cascadeState.gameOver) {
                    let filled = 0;
                    let topDanger = false;
                    for (let r = 0; r < 5; r++) {
                        for (let c = 0; c < 5; c++) {
                            if (cascadeState.board[r] && cascadeState.board[r][c]) {
                                filled++;
                                if (r <= 1) topDanger = true;
                            }
                        }
                    }
                    let t = Math.max(0, (filled - 6) / 14);
                    if (topDanger) t = Math.max(t, 0.84);
                    return Math.min(1, t);
                }
            } catch (e) {}
            return 0.08;
        }

        function ensureMusicGain(ctx) {
            if (!gameMusicState.musicGain && ctx && audioOutputGain) {
                gameMusicState.musicGain = ctx.createGain();
                gameMusicState.musicGain.gain.value = 0.0001;
                gameMusicState.musicGain.connect(audioOutputGain);
            }
            return gameMusicState.musicGain;
        }

        function playMusicKey(ctx, dest, freq, start, duration, volume, pan = 0, brightness = 4.2) {
            const env = ctx.createGain();
            env.gain.setValueAtTime(0.0001, start);
            env.gain.linearRampToValueAtTime(volume, start + 0.009);
            env.gain.exponentialRampToValueAtTime(volume * 0.42, start + duration * 0.35);
            env.gain.exponentialRampToValueAtTime(0.0001, start + duration);

            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.Q.value = 0.65;
            lp.frequency.setValueAtTime(Math.min(4200, freq * brightness), start);
            lp.frequency.exponentialRampToValueAtTime(Math.max(280, freq * 1.35), start + duration);

            env.connect(lp);
            let target = lp;
            if (typeof ctx.createStereoPanner === 'function' && pan !== 0) {
                const panner = ctx.createStereoPanner();
                panner.pan.value = pan;
                lp.connect(panner);
                target = panner;
            }
            target.connect(dest);
            if (audioReverbBus) {
                const send = ctx.createGain();
                send.gain.value = 0.48;
                target.connect(send);
                send.connect(audioReverbBus);
            }

            // Warmes, intimes Filz-Klavier mit zartem Oberton-Schimmer
            [
                { mult: 1, amp: 1.00, wave: 'sine', det: 0 },
                { mult: 1, amp: 0.28, wave: 'triangle', det: 2.2 },
                { mult: 2, amp: 0.22, wave: 'sine', det: -1.6 },
                { mult: 3, amp: 0.06, wave: 'sine', det: 1.0 }
            ].forEach(p => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.type = p.wave;
                osc.frequency.setValueAtTime(freq * p.mult, start);
                if (p.det) osc.detune.setValueAtTime(p.det, start);
                g.gain.value = p.amp;
                osc.connect(g);
                g.connect(env);
                osc.start(start);
                osc.stop(start + duration + 0.05);
            });
        }

        function playMusicOrganPad(ctx, dest, freq, start, duration, volume, maxFilter = 1100, fullStops = false) {
            const stops = fullStops
                ? [
                    { mult: 0.5, amp: 0.62, wave: 'sine',     det:  0, pan:  0.00 }, // 16' Sub-Pedal
                    { mult: 1.0, amp: 0.50, wave: 'triangle', det: -5, pan: -0.55 }, // 8' Links
                    { mult: 1.0, amp: 0.50, wave: 'triangle', det:  5, pan:  0.55 }, // 8' Rechts
                    { mult: 1.0, amp: 0.22, wave: 'sawtooth', det:  0, pan:  0.00 }, // 8' Zungen-Wärme
                    { mult: 2.0, amp: 0.24, wave: 'sine',     det:  3, pan: -0.30 }, // 4' Oktave
                    { mult: 3.0, amp: 0.09, wave: 'sine',     det: -3, pan:  0.30 }  // 2 2/3' Kathedralen-Glanz
                ]
                : [
                    { mult: 0.5, amp: 0.58, wave: 'sine',     det:  0, pan:  0.00 },
                    { mult: 1.0, amp: 0.48, wave: 'triangle', det: -4, pan: -0.45 },
                    { mult: 1.0, amp: 0.48, wave: 'triangle', det:  4, pan:  0.45 },
                    { mult: 2.0, amp: 0.16, wave: 'sine',     det:  0, pan:  0.00 }
                ];

            stops.forEach(s => {
                const osc = ctx.createOscillator();
                const lp = ctx.createBiquadFilter();
                const g = ctx.createGain();

                osc.type = s.wave;
                osc.frequency.setValueAtTime(freq * s.mult, start);
                if (s.det) osc.detune.setValueAtTime(s.det, start);

                // Typische Temple-Church-Schwellkasten-Kurve
                lp.type = 'lowpass';
                lp.Q.value = 0.7;
                lp.frequency.setValueAtTime(190, start);
                lp.frequency.exponentialRampToValueAtTime(maxFilter, start + duration * 0.48);
                lp.frequency.exponentialRampToValueAtTime(240, start + duration);

                g.gain.setValueAtTime(0.0001, start);
                g.gain.linearRampToValueAtTime(volume * s.amp, start + duration * 0.26);
                g.gain.setValueAtTime(volume * s.amp, start + duration * 0.68);
                g.gain.exponentialRampToValueAtTime(0.0001, start + duration);

                osc.connect(lp);
                lp.connect(g);

                let target = g;
                if (typeof ctx.createStereoPanner === 'function' && s.pan !== 0) {
                    const panner = ctx.createStereoPanner();
                    panner.pan.value = s.pan;
                    g.connect(panner);
                    target = panner;
                }
                target.connect(dest);
                if (audioReverbBus) {
                    const send = ctx.createGain();
                    send.gain.value = fullStops ? 0.58 : 0.44;
                    target.connect(send);
                    send.connect(audioReverbBus);
                }

                osc.start(start);
                osc.stop(start + duration + 0.08);
            });
        }

        function playMusicPulseBass(ctx, dest, freq, start, duration, volume = 0.028, cutoff = 420) {
            const osc = ctx.createOscillator();
            const lp = ctx.createBiquadFilter();
            const g = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, start);
            lp.type = 'lowpass';
            lp.frequency.setValueAtTime(cutoff, start);
            lp.frequency.exponentialRampToValueAtTime(135, start + duration);
            g.gain.setValueAtTime(0.0001, start);
            g.gain.linearRampToValueAtTime(volume, start + 0.014);
            g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
            osc.connect(lp);
            lp.connect(g);
            g.connect(dest);
            osc.start(start);
            osc.stop(start + duration + 0.03);
        }

        function playMusicTick(ctx, dest, start, volume = 0.016) {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1180, start);
            osc.frequency.exponentialRampToValueAtTime(410, start + 0.015);
            g.gain.setValueAtTime(0.0001, start);
            g.gain.linearRampToValueAtTime(volume, start + 0.002);
            g.gain.exponentialRampToValueAtTime(0.0001, start + 0.022);
            osc.connect(g);
            g.connect(dest);
            osc.start(start);
            osc.stop(start + 0.03);
        }

        function startGameMusic(mode = 'arena') {
            if (!musicEnabled) return;
            if (gameMusicState.active && gameMusicState.mode === mode) return;
            stopGameMusic(true);

            try {
                const ctx = getAudioContext();
                if (!ctx) return;
                const dest = ensureMusicGain(ctx);
                if (!dest) return;

                const now = ctx.currentTime;
                dest.gain.cancelScheduledValues(now);
                dest.gain.setValueAtTime(Math.max(0.0001, dest.gain.value), now);
                dest.gain.linearRampToValueAtTime(0.85, now + 1.2);

                const bpm = 118;
                const eighthSec = 60 / bpm / 2;

                gameMusicState.active = true;
                gameMusicState.mode = mode;
                gameMusicState.step = 0;
                gameMusicState.eighthSec = eighthSec;
                gameMusicState.nextNoteTime = now + 0.05;
                gameMusicState.currentBarIdx = 0;
                gameMusicState.currentTension = 0;
                gameMusicState.targetTension = computeLiveMusicTension(mode);

                const scheduleStep = (t) => {
                    const s = gameMusicState.step;
                    const barIdx = Math.floor(s / 6) % 4;
                    const beatInBar = s % 6;
                    gameMusicState.currentBarIdx = barIdx;
                    const bar = CORNFIELD_BARS[barIdx];

                    // Spannung nur einmal pro Takt neu berechnen (verhindert Ruckler im Verhör-Modus)
                    if (beatInBar === 0) {
                        gameMusicState.targetTension = computeLiveMusicTension(gameMusicState.mode);
                    }
                    gameMusicState.currentTension += (gameMusicState.targetTension - gameMusicState.currentTension) * 0.16;
                    const tension = gameMusicState.currentTension;

                    // 1. Zartes Filz-Klavier (3/4-Pendel)
                    const pan = (beatInBar % 2 === 0) ? -0.28 : 0.28;
                    const accent = beatInBar === 0 ? 1.18 : (beatInBar === 3 ? 1.04 : 0.88);
                    const baseKeyVol = 0.040 + tension * 0.017;
                    const brightness = 3.4 + tension * 2.1;
                    playMusicKey(
                        audioCtx, dest, bar.arp[beatInBar], t,
                        eighthSec * (3.2 - tension * 0.65),
                        baseKeyVol * accent, pan, brightness
                    );

                    // 2. Uhrwerk-Tick
                    if (beatInBar % 2 === 0) {
                        playMusicTick(audioCtx, dest, t, (beatInBar === 0 ? 0.015 : 0.008) + tension * 0.006);
                    } else if (tension >= 0.72) {
                        playMusicTick(audioCtx, dest, t, 0.007 + (tension - 0.72) * 0.014);
                    }

                    // 3. Gedämpfter Bass-Puls ab mittlerer Spannung
                    if (tension >= 0.30) {
                        const bassFactor = Math.min(1, (tension - 0.30) / 0.70);
                        const pulseVol = 0.008 + bassFactor * 0.024;
                        const cutoff = 260 + bassFactor * 260;
                        playMusicPulseBass(audioCtx, dest, bar.bass, t, eighthSec * 0.92, beatInBar === 0 ? pulseVol * 1.25 : pulseVol, cutoff);
                    }

                    // 4. Temple-Church-Kathedralen-Orgel
                    if (beatInBar === 0 && tension >= 0.18) {
                        const barDur = eighthSec * 6.35;
                        const orgFactor = Math.min(1, (tension - 0.18) / 0.82);
                        const fullStops = tension >= 0.55;
                        const bassVol = 0.020 + orgFactor * 0.060;
                        const bassFilter = 460 + orgFactor * 1650;

                        playMusicOrganPad(audioCtx, dest, bar.bass, t, barDur, bassVol, bassFilter, fullStops);
                        if (tension >= 0.36) {
                            playMusicOrganPad(audioCtx, dest, bar.pad, t, barDur, 0.016 + orgFactor * 0.032, 820 + orgFactor * 1350, tension >= 0.78);
                        }
                        if (tension >= 0.66) {
                            playMusicOrganPad(audioCtx, dest, bar.fifth, t, barDur, 0.012 + orgFactor * 0.018, 1250 + orgFactor * 1050, false);
                        }
                    }

                    // 5. Hohe Oktav-Gegenmelodie bei hoher Spannung
                    if (tension >= 0.55 && (beatInBar === 0 || (tension >= 0.82 && beatInBar === 4))) {
                        const note = beatInBar === 0 ? bar.high[0] : bar.high[1];
                        const highVol = 0.015 + Math.min(1, (tension - 0.55) / 0.45) * 0.018;
                        playMusicKey(audioCtx, dest, note, t, eighthSec * 4.5, highVol, 0.14, 4.9);
                    }

                    gameMusicState.step++;
                };

                // Hardware-Audio-Lookahead (180 ms Puffer) — bleibt auch bei DOM-Updates absolut flüssig
                const runScheduler = () => {
                    if (!gameMusicState.active || !musicEnabled || !audioCtx) return;
                    const nowTime = audioCtx.currentTime;
                    if (gameMusicState.nextNoteTime < nowTime - 0.25) {
                        gameMusicState.nextNoteTime = nowTime + 0.03;
                    }
                    const scheduleAheadSec = 0.18;
                    while (gameMusicState.nextNoteTime < nowTime + scheduleAheadSec) {
                        scheduleStep(gameMusicState.nextNoteTime);
                        gameMusicState.nextNoteTime += eighthSec;
                    }
                };

                runScheduler();
                gameMusicState.timer = setInterval(runScheduler, 40);
            } catch (e) {}
        }

        function stopGameMusic(immediate = false) {
            if (gameMusicState.timer) {
                clearInterval(gameMusicState.timer);
                gameMusicState.timer = null;
            }
            const wasActive = gameMusicState.active;
            const lastBar = CORNFIELD_BARS[gameMusicState.currentBarIdx] || CORNFIELD_BARS[2];
            if (wasActive) {
                gameMusicState.lastStopAt = performance.now();
            }
            gameMusicState.active = false;
            gameMusicState.mode = null;

            if (gameMusicState.musicGain && audioCtx) {
                try {
                    const now = audioCtx.currentTime;
                    const dest = gameMusicState.musicGain;
                    dest.gain.cancelScheduledValues(now);
                    dest.gain.setValueAtTime(Math.max(0.0001, dest.gain.value), now);
                    if (immediate) {
                        dest.gain.setValueAtTime(0.0001, now);
                    } else {
                        // Sanftes, musikalisches Ausklingen (2,8 s + leiser, verhallender Schlusston)
                        if (wasActive) {
                            const tailStart = Math.max(now + 0.02, gameMusicState.nextNoteTime || now + 0.02);
                            playMusicKey(audioCtx, dest, 440.00, tailStart, 1.9, 0.032, -0.15, 3.0);
                            playMusicKey(audioCtx, dest, 659.25, tailStart + 0.26, 2.1, 0.020, 0.15, 2.8);
                            playMusicOrganPad(audioCtx, dest, lastBar.bass, tailStart, 2.4, 0.024, 520, false);
                        }
                        dest.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
                    }
                } catch (e) {}
            }
        }

        function setMusicEnabled(enabled) {
            musicEnabled = Boolean(enabled);
            localStorage.setItem('blink_music_enabled', musicEnabled ? 'true' : 'false');
            updateSoundButtonUI();
            if (!musicEnabled) {
                stopGameMusic();
            } else if (typeof syncActiveGameModeMusic === 'function') {
                syncActiveGameModeMusic();
            }
        }

        // ============================================================================
        // GLEITENDE AUSWAHL-PILLS (STEUERUNG FÜR ALLE MODELL-SCHALTER)
        // ============================================================================
        function moveSlidingPill(containerId, activeBtnId) {
            const container = document.getElementById(containerId);
            const btn = document.getElementById(activeBtnId);
            if (!container || !btn) return;
            container.dataset.activeBtn = activeBtnId;
            const pill = container.querySelector('.sliding-pill-bg');
            if (!pill) return;

            requestAnimationFrame(() => {
                if (btn.offsetWidth === 0) return;
                pill.style.width = `${btn.offsetWidth}px`;
                pill.style.height = `${btn.offsetHeight}px`;
                pill.style.transform = `translate3d(${btn.offsetLeft}px, ${btn.offsetTop}px, 0)`;
                pill.style.opacity = '1';
            });
        }

        function syncAllSlidingPills() {
            const defaults = {
                'basic-layer-tabs': 'basic-x-all',
                'basic-layout-tabs': 'layout-btn-split',
                'basic-2d-tabs': 'sub2d-btn-ring',
                'adv-struct-tabs': 'adv-struct-hyper120',
                'adv-layer-tabs': 'adv-x-all',
                'game-mode-tabs': 'game-tab-arena',
                'lab-mode-tabs': 'lab-tab-montecarlo',
                'models-mode-tabs': 'model-tab-basic-model',
                'lesson-mode-tabs': 'lesson-tab-1'
            };
            Object.entries(defaults).forEach(([cid, fallbackBtn]) => {
                const c = document.getElementById(cid);
                if (c) moveSlidingPill(cid, c.dataset.activeBtn || fallbackBtn);
            });
        }

        function openModelsPage() {
            if (state.currentPage === 'basic-model' || state.currentPage === 'advanced-model') return;
            navigateTo(state.lastModelPage || 'basic-model');
        }

        function updateModelsSharedBar(modelPageId) {
            const isAdv = modelPageId === 'advanced-model';
            ['basic-model', 'advanced-model'].forEach(m => {
                const btn = document.getElementById(`model-tab-${m}`);
                if (btn) btn.className = `relative z-10 px-3.5 py-1 rounded-full text-xs transition-colors ${m === modelPageId ? 'pill-btn-active' : 'pill-btn-idle'}`;
            });
            const pill = document.getElementById('models-sliding-pill');
            if (pill) {
                pill.classList.toggle('sliding-pill-cyan', !isAdv);
                pill.classList.toggle('sliding-pill-purple', isAdv);
            }
            const dot = document.getElementById('models-meta-dot');
            const metaText = document.getElementById('models-meta-text');
            if (dot) dot.className = `w-1.5 h-1.5 rounded-full ${isAdv ? 'bg-purple-400' : 'bg-cyan-400'}`;
            if (metaText) metaText.textContent = isAdv ? 'Vektorraum F₅³ · 125 Karten' : '5×6×6 Raum · 60 Spielkarten';

            moveSlidingPill('models-mode-tabs', `model-tab-${modelPageId}`);
        }

        window.addEventListener('resize', syncAllSlidingPills);

        const CARDS_60 = [
            [1,4,0],[4,2,2],[1,5,2],[0,2,4],[4,1,1],[0,0,5],[0,1,3],[0,2,0],[4,4,0],[4,4,3],
            [4,1,4],[4,0,1],[3,0,4],[2,0,2],[4,2,3],[2,2,0],[2,5,5],[0,3,1],[1,4,1],[4,5,4],
            [0,5,3],[0,5,5],[1,5,3],[4,3,0],[3,2,1],[2,4,3],[3,4,5],[1,0,0],[1,1,2],[1,2,3],
            [1,1,1],[4,0,5],[4,3,5],[2,3,0],[3,1,0],[2,0,1],[0,3,2],[1,2,5],[1,0,4],[1,3,4],
            [0,4,1],[2,3,1],[2,2,4],[2,5,4],[2,1,3],[0,1,4],[3,2,2],[3,3,3],[3,5,1],[0,0,0],
            [3,5,0],[2,4,2],[4,5,2],[3,1,5],[3,0,3],[3,3,2],[2,1,5],[1,3,5],[3,4,4],[0,4,2]
        ];

        const CARDS_125 = [];
        for (let x = 0; x < 5; x++) {
            for (let y = 0; y < 5; y++) {
                for (let z = 0; z < 5; z++) {
                    CARDS_125.push([x, y, z]);
                }
            }
        }

        const PALETTE_X = [
            { hex: '#38bdf8', word: 'Fünf', count: 5, name: 'X=0 (Fünf • 5 Symbole)', short: 'X=0 (Fünf)' },
            { hex: '#34d399', word: 'Eins', count: 1, name: 'X=1 (Eins • 1 Symbol)',  short: 'X=1 (Eins)' },
            { hex: '#facc15', word: 'Zwei', count: 2, name: 'X=2 (Zwei • 2 Symbole)', short: 'X=2 (Zwei)' },
            { hex: '#fb923c', word: 'Drei', count: 3, name: 'X=3 (Drei • 3 Symbole)', short: 'X=3 (Drei)' },
            { hex: '#f472b6', word: 'Vier', count: 4, name: 'X=4 (Vier • 4 Symbole)', short: 'X=4 (Vier)' },
            { hex: '#c084fc', word: 'Komplement', count: 6, name: 'X=5* (Komplement)', short: 'X=5* (Kompl.)' }
        ];

        const PALETTE_Y = [
            { hex: '#92400E', strokeHex: '#B45309', cardStroke: '#451A03', name: 'Braun', label: 'Y=0 (Braun)' },
            { hex: '#EF4444', strokeHex: '#F87171', cardStroke: '#7F1D1D', name: 'Rot',   label: 'Y=1 (Rot)' },
            { hex: '#22C55E', strokeHex: '#4ADE80', cardStroke: '#14532D', name: 'Grün',  label: 'Y=2 (Grün)' },
            { hex: '#3B82F6', strokeHex: '#60A5FA', cardStroke: '#1E3A8A', name: 'Blau',  label: 'Y=3 (Blau)' },
            { hex: '#FACC15', strokeHex: '#FDE047', cardStroke: '#713F12', name: 'Gelb',  label: 'Y=4 (Gelb)' },
            { hex: '#94A3B8', strokeHex: '#CBD5E1', cardStroke: '#334155', name: 'Grau',  label: 'Y=5 (Grau)' }
        ];

        const PALETTE_Z = [
            { hex: '#F8FAFC', nodeStroke: '#CBD5E1', threeHex: '#38bdf8', name: 'Stern',   label: 'Z=0 (Stern)' },
            { hex: '#F8FAFC', nodeStroke: '#CBD5E1', threeHex: '#a855f7', name: 'Dreieck', label: 'Z=1 (Dreieck)' },
            { hex: '#F8FAFC', nodeStroke: '#CBD5E1', threeHex: '#06b6d4', name: 'Tropfen', label: 'Z=2 (Tropfen)' },
            { hex: '#F8FAFC', nodeStroke: '#CBD5E1', threeHex: '#f59e0b', name: 'Mond',    label: 'Z=3 (Mond)' },
            { hex: '#F8FAFC', nodeStroke: '#CBD5E1', threeHex: '#ec4899', name: 'Blume',   label: 'Z=4 (Blume)' },
            { hex: '#F8FAFC', nodeStroke: '#CBD5E1', threeHex: '#6366f1', name: 'Blitz',   label: 'Z=5 (Blitz)' }
        ];

        const CARD_SLOTS_BY_X = {
            1: ['pos-3'],
            2: ['pos-1', 'pos-5'],
            3: ['pos-1', 'pos-3', 'pos-5'],
            4: ['pos-1', 'pos-2', 'pos-4', 'pos-5'],
            0: ['pos-1', 'pos-2', 'pos-3', 'pos-4', 'pos-5'],
            5: ['pos-1', 'pos-2', 'pos-6l', 'pos-6r', 'pos-4', 'pos-5']
        };

        function getSymbolInnerSVG(zIndex, fillColor, strokeColor = '#0f172a', strokeWidth = 1.2) {
            switch (zIndex) {
                case 0: // Stern
                    return `<polygon points="12,1.8 15.1,8.2 22.2,9.2 17,14.1 18.3,21.2 12,17.8 5.7,21.2 7,14.1 1.8,9.2 8.9,8.2" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`;
                case 1: // Dreieck
                    return `<polygon points="12,2.5 21.8,20.2 2.2,20.2" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.3" stroke-linejoin="round"/>`;
                case 2: // Tropfen
                    return `<path d="M12,2 C12,2 4.8,11.2 4.8,16.2 C4.8,20.1 8,22.8 12,22.8 C16,22.8 19.2,20.1 19.2,16.2 C19.2,11.2 12,2 12,2 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.3" stroke-linejoin="round"/>`;
                case 3: // Kräftiger, voluminöser Halbmond
                    return `<path d="M18.0,2.2 A10.5,10.5 0 1,0 18.0,21.8 A5.2,5.2 0 1,1 18.0,2.2 Z" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.3" stroke-linejoin="round"/>`;
                case 4: // Blume
                    return `<g fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.1">
                        <circle cx="12" cy="6.2" r="4.3"/>
                        <circle cx="12" cy="17.8" r="4.3"/>
                        <circle cx="6.2" cy="12" r="4.3"/>
                        <circle cx="17.8" cy="12" r="4.3"/>
                        <circle cx="12" cy="12" r="3.3"/>
                    </g>`;
                case 5: // Blitz
                    return `<polygon points="13.8,1.8 5.2,13.2 11.4,13.2 9.6,22.4 19.2,10.4 13.0,10.4" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.3" stroke-linejoin="round"/>`;
                default:
                    return `<circle cx="12" cy="12" r="8" fill="${fillColor}"/>`;
            }
        }

        function getSymbolSVG(zIndex, fillColor, size = 18, strokeColor = '#0f172a', strokeWidth = 1.2) {
            return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" class="inline-block shrink-0" style="overflow:visible">${getSymbolInnerSVG(zIndex, fillColor, strokeColor, strokeWidth)}</svg>`;
        }

        function renderCardSymbolsHTML(x, y, z) {
            const colorHex = PALETTE_Y[y].hex;
            const strokeCol = PALETTE_Y[y].cardStroke;
            const slots = CARD_SLOTS_BY_X[x] || ['pos-3'];
            const singleSvg = `<svg viewBox="0 0 24 24" class="w-full h-full block" style="overflow:visible">${getSymbolInnerSVG(z, colorHex, strokeCol, 1.25)}</svg>`;

            const slotsHTML = slots
                .map(pos => `<div class="blink-slot ${pos}">${singleSvg}</div>`)
                .join('');

            return `<div class="blink-symbol-stage">${slotsHTML}</div>`;
        }

        const state = {
            currentPage: 'home',
            currentLesson: 1,
            theme: 'onyx-oled',
            showGameCoords: true,
            show3DLabels: true,
            subView2D: 'ring',
            splitLeftPercent: 48,
            filterX: null,
            filterY: null,
            filterZ: null,
            cycleLayer: 0,
            colorMode: 'y',
            showEmptyNodes: true,
            showCycleLines: true,
            showGridBox: true,
            highlightedCard: null,
            highlightedProp: null,
            animTimer: null,
            animStepIndex: -1,
            animSequence: [],
            searchQuery: ''
        };

        function keyOf(x, y, z) { return `${x},${y},${z}`; }

       function toggleModalState(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            const innerCard = modal.children[0];
            
            if (modal.classList.contains('hidden')) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                requestAnimationFrame(() => {
                    modal.classList.remove('opacity-0');
                    innerCard.classList.remove('scale-95');
                    innerCard.classList.add('scale-100');
                });
            } else {
                modal.classList.add('opacity-0');
                innerCard.classList.remove('scale-100');
                innerCard.classList.add('scale-95');
                setTimeout(() => {
                    modal.classList.remove('flex');
                    modal.classList.add('hidden');
                }, 200);
            }
        }

        function toggleGameInfoModal() {
            toggleModalState('game-info-modal');
            safeRenderMathJax();
        }

        function toggleSettingsModal() {
            toggleModalState('settings-modal');
        }

        function applyTheme(themeId) {
            state.theme = themeId;
            localStorage.setItem('blink_theme', themeId);
            document.documentElement.setAttribute('data-theme', themeId);
            ['foerde-midnight', 'academic-light', 'onyx-oled'].forEach(t => {
                const btn = document.getElementById(`theme-btn-${t}`);
                if (!btn) return;
                const isActive = t === themeId;
                btn.className = isActive
                    ? 'p-3 rounded-xl border-2 border-cyan-400 bg-slate-950 text-left flex items-center justify-between transition'
                    : 'p-3 rounded-xl border border-slate-800 bg-slate-900 hover:border-slate-600 text-left flex items-center justify-between transition';
                
                // "Aktiv"-Anzeige im Modal aktualisieren
                let badge = btn.querySelector('.theme-active-badge');
                if (isActive && !badge) {
                    const span = document.createElement('span');
                    span.className = 'theme-active-badge text-[10px] mono font-bold text-cyan-400';
                    span.textContent = 'Aktiv';
                    btn.appendChild(span);
                } else if (!isActive && badge) {
                    badge.remove();
                }
            });
            buildGridAndAxes();
            if (advState.initialized) buildAdvGridAndAxes();
        }

        function toggleGameCoords(checked) {
            state.showGameCoords = checked;
            if (gameState.initialized) renderBlinkGameUI();
        }

        function toggle3DLabels(checked) {
            state.show3DLabels = checked;
            buildGridAndAxes();
            if (advState.initialized) buildAdvGridAndAxes();
        }

        function initNavigationAndModal() {
            const homeGrid = document.getElementById('home-lessons-grid');
            let gridHtml = '';
            for (let i = 1; i <= 8; i++) {
                const num = String(i).padStart(2, '0');
                gridHtml += `
                    <button onclick="openLessonPage(${i})" class="group text-left rounded-2xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-cyan-400/40 px-4 py-3.5 transition-all duration-200 flex items-center justify-between gap-3">
                        <div class="flex items-center gap-3">
                            <span class="mono text-xs font-bold text-slate-500 group-hover:text-cyan-400 transition-colors">${num}</span>
                            <span class="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">Sitzung ${i}</span>
                        </div>
                        <svg class="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                `;
            }
            homeGrid.innerHTML = gridHtml;

            setMappingModalMode('basic', true);
            enhanceCustomSelects();
        }

        function setMappingModalMode(mode = 'basic', silent = false) {
            if (!silent) playSound('tick');
            const isAdv = mode === 'advanced';

            const rowsBasic = [
                { anzW: 'Eins', anzI: 1, colW: 'Rot',   colI: 1, symW: 'Dreieck', symI: 1 },
                { anzW: 'Zwei', anzI: 2, colW: 'Grün',  colI: 2, symW: 'Tropfen', symI: 2 },
                { anzW: 'Drei', anzI: 3, colW: 'Blau',  colI: 3, symW: 'Mond',    symI: 3 },
                { anzW: 'Vier', anzI: 4, colW: 'Gelb',  colI: 4, symW: 'Blume',   symI: 4 },
                { anzW: 'Fünf', anzI: 0, colW: 'Grau',  colI: 5, symW: 'Blitz',   symI: 5 },
                { anzW: '',     anzI: '', colW: 'Braun', colI: 0, symW: 'Stern',  symI: 0 }
            ];

            const rowsAdv = [
                { anzW: 'Fünf', anzI: 0, colW: 'Braun', colI: 0, symW: 'Stern',   symI: 0 },
                { anzW: 'Eins', anzI: 1, colW: 'Rot',   colI: 1, symW: 'Dreieck', symI: 1 },
                { anzW: 'Zwei', anzI: 2, colW: 'Grün',  colI: 2, symW: 'Tropfen', symI: 2 },
                { anzW: 'Drei', anzI: 3, colW: 'Blau',  colI: 3, symW: 'Mond',    symI: 3 },
                { anzW: 'Vier', anzI: 4, colW: 'Gelb',  colI: 4, symW: 'Blume',   symI: 4 }
            ];

            const rows = isAdv ? rowsAdv : rowsBasic;
            const tbody = document.getElementById('modal-table-body');
            if (tbody) {
                tbody.innerHTML = rows.map(r => `
                    <tr class="hover:bg-slate-800/50">
                        <td class="py-2.5 px-3 font-medium text-white">${r.anzW}</td>
                        <td class="py-2.5 px-3 border-r border-slate-800 mono font-bold ${isAdv ? 'text-purple-300' : 'text-cyan-300'}">${r.anzI}</td>
                        <td class="py-2.5 px-3 font-medium text-white">
                            <span class="inline-flex flex-col items-center justify-center gap-1">
                                <span class="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm" style="background:${PALETTE_Y[r.colI].hex}"></span>
                                <span class="text-[11px]">${r.colW}</span>
                            </span>
                        </td>
                        <td class="py-2.5 px-3 border-r border-slate-800 mono font-bold text-emerald-300">${r.colI}</td>
                        <td class="py-2.5 px-3 font-medium text-white">
                            <span class="inline-flex flex-col items-center justify-center gap-1">
                                ${getSymbolSVG(r.symI, '#F8FAFC', 16, '#0f172a', 1.0)}
                                <span class="text-[11px]">${r.symW}</span>
                            </span>
                        </td>
                        <td class="py-2.5 px-3 mono font-bold text-slate-200">${r.symI}</td>
                    </tr>
                `).join('');
            }

            const sub = document.getElementById('mapping-modal-subtitle');
            const note = document.getElementById('mapping-modal-note');
            if (sub) {
                sub.textContent = isAdv
                    ? 'Erweitertes Modell (125 Karten)'
                    : 'Grundlegendes Modell (180 Karten)';
            }
            

            ['basic', 'advanced'].forEach(m => {
                const btn = document.getElementById(`mapping-tab-${m}`);
                if (btn) btn.className = `relative z-10 px-3 py-1 rounded-full text-[11px] transition-colors ${m === mode ? 'pill-btn-active' : 'pill-btn-idle'}`;
            });

            const pill = document.getElementById('mapping-sliding-pill');
            if (pill) {
                pill.classList.toggle('sliding-pill-cyan', !isAdv);
                pill.classList.toggle('sliding-pill-purple', isAdv);
            }

            requestAnimationFrame(() => moveSlidingPill('mapping-mode-tabs', `mapping-tab-${mode}`));
        }

        function closeAllCustomSelects(exceptWrap = null) {
            document.querySelectorAll('.fu-cselect.open').forEach(el => {
                if (el !== exceptWrap) el.classList.remove('open');
            });
        }

        function enhanceCustomSelects() {
            const valDesc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');

            document.querySelectorAll('select.fu-select').forEach(select => {
                if (select.dataset.cselectReady === '1') return;
                select.dataset.cselectReady = '1';

                const isFull = select.classList.contains('w-full');
                const isMono = select.classList.contains('mono');

                const wrap = document.createElement('div');
                wrap.className = `fu-cselect${isFull ? ' fu-cselect-full' : ''}`;

                // Trigger-Button übernimmt Schriftgröße & Padding des Originals
                const trigger = document.createElement('button');
                trigger.type = 'button';
                const copiedClasses = [...select.classList].filter(c => c !== 'fu-select' && c !== 'appearance-none');
                trigger.className = `fu-cselect-trigger ${copiedClasses.join(' ')}`;

                const labelSpan = document.createElement('span');
                labelSpan.className = 'truncate';

                const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                chevron.setAttribute('viewBox', '0 0 24 24');
                chevron.setAttribute('fill', 'none');
                chevron.setAttribute('stroke', 'currentColor');
                chevron.setAttribute('stroke-width', '2.2');
                chevron.setAttribute('stroke-linecap', 'round');
                chevron.setAttribute('stroke-linejoin', 'round');
                chevron.setAttribute('class', 'fu-cselect-chevron');
                chevron.innerHTML = '<polyline points="6 9 12 15 18 9"></polyline>';

                trigger.append(labelSpan, chevron);

                const menu = document.createElement('div');
                menu.className = 'fu-cselect-menu';

                const syncUI = () => {
                    const activeOpt = select.options[select.selectedIndex] || select.options[0];
                    labelSpan.textContent = activeOpt ? activeOpt.textContent : '';
                    menu.querySelectorAll('.fu-cselect-option').forEach(btn => {
                        btn.classList.toggle('is-selected', btn.dataset.val === select.value);
                    });
                };

                Array.from(select.options).forEach(opt => {
                    const item = document.createElement('button');
                    item.type = 'button';
                    item.dataset.val = opt.value;
                    item.className = `fu-cselect-option${isMono ? ' mono text-xs' : ''}`;
                    item.innerHTML = `
                        <span class="truncate">${opt.textContent}</span>
                        <svg class="fu-cselect-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    `;
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const changed = select.value !== opt.value;
                        select.value = opt.value;
                        syncUI();
                        wrap.classList.remove('open');
                        playSound('tick');
                        if (changed) {
                            select.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });
                    menu.appendChild(item);
                });

                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const wasOpen = wrap.classList.contains('open');
                    closeAllCustomSelects(wrap);
                    const lessonMenu = document.getElementById('lessons-dropdown-menu');
                    if (lessonMenu) lessonMenu.classList.add('hidden');
                    wrap.classList.toggle('open', !wasOpen);
                    playSound('tick');
                });

                // Hält das Custom-Menü synchron, auch wenn select.value per JS gesetzt wird
                if (valDesc && valDesc.get && valDesc.set) {
                    Object.defineProperty(select, 'value', {
                        get() { return valDesc.get.call(this); },
                        set(v) { valDesc.set.call(this, v); syncUI(); }
                    });
                }

                select.classList.add('hidden');
                select.parentNode.insertBefore(wrap, select);
                wrap.append(trigger, menu, select);
                syncUI();
            });

            if (!window._fuCustomSelectBound) {
                window._fuCustomSelectBound = true;
                window.addEventListener('click', () => closeAllCustomSelects());
                window.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') closeAllCustomSelects();
                });
            }
        }

        function handleAceternitySpotlight(e) {
            const cards = document.querySelectorAll('.aceternity-bento-card');
            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
            });
        }

        

     let _isApplyingHashRoute = false;
        let _lastSyncedHash = '';

        function buildRouteHash() {
            const p = state.currentPage || 'home';
            if (p === 'home') return '#/start';
            if (p === 'basic-model') return '#/modelle/grundlegend';
            if (p === 'advanced-model') return '#/modelle/erweitert';
            if (p === 'lesson') return `#/kurs/${state.currentLesson || 1}`;
            if (p === 'lab') {
                const sub = (typeof phaseState !== 'undefined' && phaseState.activeTab) ? phaseState.activeTab : 'montecarlo';
                const labMap = { montecarlo: 'montecarlo', phase: 'clusterdichte', brain: 'ki' };
                return `#/labor/${labMap[sub] || 'montecarlo'}`;
            }
            if (p === 'game') {
                const sub = (typeof labState !== 'undefined' && labState.activeGameTab) ? labState.activeGameTab : 'arena';
                return `#/spielen/${sub}`;
            }
            return '#/start';
        }

        function syncUrlHash(replace = false) {
            if (_isApplyingHashRoute) return;
            const nextHash = buildRouteHash();
            if (window.location.hash === nextHash) {
                _lastSyncedHash = nextHash;
                return;
            }
            _lastSyncedHash = nextHash;
            try {
                if (replace && window.history && typeof window.history.replaceState === 'function') {
                    window.history.replaceState(null, '', nextHash);
                } else {
                    window.location.hash = nextHash;
                }
            } catch (e) {
                window.location.hash = nextHash;
            }
        }

        function applyRouteFromHash(isInitial = false) {
            const raw = (window.location.hash || '').replace(/^#\/?/, '').trim().toLowerCase();
            const parts = raw ? raw.split('/').filter(Boolean) : [];
            const main = parts[0] || 'start';
            const sub = parts[1] || '';

            _isApplyingHashRoute = true;
            try {
                if (main === 'modelle' || main === 'models') {
                    navigateTo(sub === 'erweitert' || sub === 'advanced' ? 'advanced-model' : 'basic-model');
                } else if (main === 'labor' || main === 'lab') {
                    navigateTo('lab');
                    const subMap = { montecarlo: 'montecarlo', clusterdichte: 'phase', phase: 'phase', ki: 'brain', brain: 'brain' };
                    if (typeof setLabSubTab === 'function') setLabSubTab(subMap[sub] || 'montecarlo');
                } else if (main === 'kurs' || main === 'lesson') {
                    const num = Math.max(1, Math.min(8, parseInt(sub, 10) || 1));
                    openLessonPage(num);
                } else if (main === 'spielen' || main === 'game') {
                    navigateTo('game');
                    const validGameTabs = ['arena', 'verhoer', 'daily', 'sudoku', 'endgame', 'cascade'];
                    if (typeof setGameSubTab === 'function') setGameSubTab(validGameTabs.includes(sub) ? sub : 'arena');
                } else {
                    navigateTo('home');
                }
            } finally {
                _isApplyingHashRoute = false;
            }
            syncUrlHash(isInitial);
        }

        window.addEventListener('hashchange', () => {
            if (window.location.hash === _lastSyncedHash) return;
            applyRouteFromHash(false);
        });

        function navigateTo(pageId) {
    const prevPage = state.currentPage;
            const isModelSubSwitch = (prevPage === 'basic-model' || prevPage === 'advanced-model') && (pageId === 'basic-model' || pageId === 'advanced-model');
            const skipPageEnter = (prevPage === pageId) || isModelSubSwitch;
            state.currentPage = pageId;
            syncUrlHash();
    if (pageId !== 'game' && typeof stopGameMusic === 'function') stopGameMusic();
    if (navigateTo._ready) playSound('tick');
    navigateTo._ready = true;

    // 1. Seiten ein-/ausblenden mit sanfter Transition
    ['home', 'basic-model', 'advanced-model', 'lab', 'game', 'lesson'].forEach(p => {
        const el = document.getElementById(`page-${p}`);
        if (!el) return;
        const isTarget = (p === pageId);
        el.classList.toggle('hidden', !isTarget);
        if (isTarget) {
            el.classList.remove('page-enter');
            void el.offsetWidth;
            if (!skipPageEnter) el.classList.add('page-enter');
        }
    });

    // 2. Stagger-Animation auf Startseite neu auslösen
    if (pageId === 'home') {
        document.querySelectorAll('#page-home .stagger-item').forEach(item => {
            item.style.animation = 'none';
            void item.offsetHeight;
            item.style.animation = null;
        });
    }

   // 3. Navigation & Indikator (respektiert das aktive Theme)
    const isModelPage = (pageId === 'basic-model' || pageId === 'advanced-model');
    if (isModelPage) state.lastModelPage = pageId;

    const modelsBar = document.getElementById('models-shared-bar');
    if (modelsBar) {
        modelsBar.classList.toggle('hidden', !isModelPage);
        if (isModelPage) updateModelsSharedBar(pageId);
    }

    const navKey = isModelPage ? 'models' : pageId;
    const navButtons = {
        'home': 'nav-btn-home',
        'models': 'nav-btn-models',
        'lab': 'nav-btn-lab',
        'lesson': 'nav-btn-lessons',
        'game': 'nav-btn-game'
    };

    const navBar = document.getElementById('main-nav-bar');
    const indicator = document.getElementById('nav-indicator');
    const isMonochromeTheme = state.theme === 'academic-light' || state.theme === 'onyx-oled';

    Object.entries(navButtons).forEach(([key, btnId]) => {
                const btn = document.getElementById(btnId);
                if (!btn) return;
                const isSpecial = (key === 'game');

                if (key === navKey) {
                    btn.className = `nav-item-clean font-bold ${isSpecial ? 'text-emerald-400' : 'text-cyan-400'}`;
                    if (indicator && navBar) {
                        requestAnimationFrame(() => {
                            const navRect = navBar.getBoundingClientRect();
                            const targetRect = btn.getBoundingClientRect();
                            indicator.style.width = `${Math.round(targetRect.width)}px`;
                            indicator.style.left = `${Math.round(targetRect.left - navRect.left)}px`;

                            if (isMonochromeTheme) {
                                indicator.style.backgroundColor = 'var(--border-focus)';
                                indicator.style.boxShadow = 'none';
                            } else {
                                indicator.style.backgroundColor = isSpecial ? '#34d399' : '#22d3ee';
                                indicator.style.boxShadow = `0 0 10px ${isSpecial ? 'rgba(52,211,153,0.7)' : 'rgba(34,211,238,0.7)'}`;
                            }
                        });
                    }
                } else {
                    btn.className = `nav-item-clean ${isSpecial ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-400 hover:text-white'}`;
                }
            });

    // 4. Einmalige, saubere Canvas-Initialisierung & Pill-Sync nach Sichtbarwerden
    if (pageId === 'basic-model') {
        requestAnimationFrame(() => {
            resize3DCanvas();
            setCameraView('iso', true);
            refreshAll();
            syncAllSlidingPills();
        });
    } else if (pageId === 'advanced-model') {
        if (!advState.initialized) initAdvancedModel();
        requestAnimationFrame(() => {
            resizeAdv3DCanvas();
            setAdvCameraView('iso', true);
            updateAdv3DScene();
            renderAdv2DGrid();
            syncAllSlidingPills();
        });
    } else if (pageId === 'lab') {
        initStochastikLabIfNeeded();
    } else if (pageId === 'game') {
                if (!gameState.initialized) initBlinkGameLobby();
                initGameModesIfNeeded();
                requestAnimationFrame(() => syncAllSlidingPills());
            } else if (pageId === 'lesson') {
                requestAnimationFrame(() => moveSlidingPill('lesson-mode-tabs', `lesson-tab-${state.currentLesson}`));
            }
        }
        function openLessonPage(lessonNum) {
            state.currentLesson = Math.max(1, Math.min(8, lessonNum));
            const numStr = String(state.currentLesson).padStart(2, '0');
            const badgeEl = document.getElementById('lesson-badge-number');
            const titleEl = document.getElementById('lesson-title-heading');
            if (badgeEl) badgeEl.textContent = numStr;
            if (titleEl) titleEl.textContent = `Kurssitzung ${state.currentLesson}`;

            for (let i = 1; i <= 8; i++) {
                const btn = document.getElementById(`lesson-tab-${i}`);
                if (btn) {
                    btn.className = `relative z-10 px-3 py-1 rounded-full text-xs transition-colors ${i === state.currentLesson ? 'pill-btn-active' : 'pill-btn-idle'}`;
                }
            }

            const contentEl = document.getElementById('lesson-dynamic-content');
            if (contentEl) {
                contentEl.innerHTML = `
                    <div class="rounded-2xl border border-dashed border-white/[0.10] bg-white/[0.015] min-h-[280px] flex flex-col items-center justify-center text-center p-8 space-y-2.5">
                        <span class="mono text-[11px] font-bold uppercase tracking-widest text-slate-500">Sitzung ${numStr} / 08</span>
                        <p class="text-xs text-slate-400 max-w-sm leading-relaxed">
                            Dieser Bereich ist für die Inhalte von Kurssitzung ${state.currentLesson} vorbereitet.
                        </p>
                    </div>
                `;
            }

            safeRenderMathJax();
            navigateTo('lesson');
        }

        function stepLesson(delta) {
            let next = state.currentLesson + delta;
            if (next < 1) next = 8;
            if (next > 8) next = 1;
            openLessonPage(next);
        }

        function toggleMappingModal() {
            const modal = document.getElementById('mapping-modal');
            const isOpening = modal && modal.classList.contains('hidden');
            toggleModalState('mapping-modal');
            if (isOpening) {
                const defaultMode = (state.currentPage === 'advanced-model') ? 'advanced' : 'basic';
                setMappingModalMode(defaultMode, true);
            }
        }

        function setupDraggableResizer(resizerId, workspaceId, badgeId, onPercentChange) {
            const resizer = document.getElementById(resizerId);
            const workspace = document.getElementById(workspaceId);
            const badge = document.getElementById(badgeId);
            let isDragging = false;

            resizer.addEventListener('pointerdown', (e) => {
                isDragging = true;
                resizer.setPointerCapture(e.pointerId);
                resizer.classList.add('dragging');
                badge.classList.remove('hidden');
                document.body.style.cursor = 'col-resize';
            });

            resizer.addEventListener('pointermove', (e) => {
                if (!isDragging) return;
                const rect = workspace.getBoundingClientRect();
                if (rect.width <= 0) return;
                const relX = e.clientX - rect.left;
                const pct = Math.max(20, Math.min(80, Math.round((relX / rect.width) * 100)));
                onPercentChange(pct);
            });

            const finishDrag = () => {
                if (!isDragging) return;
                isDragging = false;
                resizer.classList.remove('dragging');
                badge.classList.add('hidden');
                document.body.style.cursor = '';
            };

            resizer.addEventListener('pointerup', finishDrag);
            resizer.addEventListener('pointercancel', finishDrag);
        }

        function setSplitPercentage(leftPct) {
            state.splitLeftPercent = Math.max(20, Math.min(80, leftPct));
            const p3d = document.getElementById('panel-3d');
            const badge = document.getElementById('split-drag-badge');
            p3d.style.width = window.innerWidth >= 1024 ? `${state.splitLeftPercent}%` : '100%';
            if (badge) badge.textContent = `3D: ${state.splitLeftPercent}% | 2D: ${100 - state.splitLeftPercent}%`;
            resize3DCanvas();
        }

        function getCardsForLayer(layerIdx) {
            if (layerIdx >= 0 && layerIdx <= 4) return CARDS_60.filter(c => c[0] === layerIdx);
            const counts = Array.from({ length: 6 }, () => Array(6).fill(0));
            for (const [x, y, z] of CARDS_60) counts[y][z]++;
            const comp = [];
            for (let y = 0; y < 6; y++) {
                for (let z = 0; z < 6; z++) if (counts[y][z] === 1) comp.push([5, y, z]);
            }
            return comp;
        }

        function computeLayerCycles(layerIdx) {
            const layerCards = getCardsForLayer(layerIdx);
            const adjY = Array.from({ length: 6 }, () => []);
            const adjZ = Array.from({ length: 6 }, () => []);

            layerCards.forEach(([x, y, z]) => {
                adjY[y].push({ z, card: [x, y, z] });
                adjZ[z].push({ y, card: [x, y, z] });
            });

            const visitedEdges = new Set();
            const cycles = [];

            for (let startY = 0; startY < 6; startY++) {
                for (const edge of adjY[startY]) {
                    const firstEdgeKey = `${startY}-${edge.z}`;
                    if (visitedEdges.has(firstEdgeKey)) continue;

                    const cycleNodes = [];
                    let currY = startY;
                    let currZ = edge.z;
                    let currCard = edge.card;

                    while (true) {
                        visitedEdges.add(`${currY}-${currZ}`);
                        cycleNodes.push({ nodeType: 'Y', id: currY, outCard: currCard, nextType: 'Z', nextId: currZ });

                        const zNeighbors = adjZ[currZ];
                        let nextEdge = zNeighbors.find(n => !visitedEdges.has(`${n.y}-${currZ}`));
                        if (!nextEdge) break;

                        visitedEdges.add(`${nextEdge.y}-${currZ}`);
                        cycleNodes.push({ nodeType: 'Z', id: currZ, outCard: nextEdge.card, nextType: 'Y', nextId: nextEdge.y });

                        currY = nextEdge.y;
                        if (currY === startY) break;

                        const yNeighbors = adjY[currY];
                        const nextYEdge = yNeighbors.find(n => !visitedEdges.has(`${currY}-${n.z}`));
                        if (!nextYEdge) break;
                        currZ = nextYEdge.z;
                        currCard = nextYEdge.card;
                    }
                    cycles.push(cycleNodes);
                }
            }
            cycles.sort((a, b) => b.length - a.length);
            return cycles;
        }

        const container = document.getElementById('canvas-container');
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;

        scene.add(new THREE.AmbientLight(0xffffff, 0.78));
        const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.88);
        dirLight1.position.set(18, 25, 22);
        scene.add(dirLight1);
        const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.35);
        dirLight2.position.set(-18, -15, -15);
        scene.add(dirLight2);

        const SPACING = 2.2;
        function gridToWorld(x, y, z) {
            return new THREE.Vector3(x * SPACING - 2.0 * SPACING, y * SPACING - 2.5 * SPACING, z * SPACING - 2.5 * SPACING);
        }

        const gridGroup = new THREE.Group();
        const nodesGroup = new THREE.Group();
        const cycleLinesGroup = new THREE.Group();
        const highlight3DGroup = new THREE.Group();
        scene.add(gridGroup, nodesGroup, cycleLinesGroup, highlight3DGroup);

        function createTextSprite(text, color = '#e2e8f0', fontSize = 36, scale = 1.45) {
            const canvas = document.createElement('canvas');
            canvas.width = 320;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = color;
            ctx.fillText(text, 160, 64);

            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
            const sprite = new THREE.Sprite(material);
            sprite.scale.set(scale * 2.3, scale, 1);
            return sprite;
        }

        function buildGridAndAxes() {
            gridGroup.clear();
            const isLight = state.theme === 'academic-light';
            const lineMat = new THREE.LineBasicMaterial({ color: isLight ? 0x64748b : 0x334155, transparent: true, opacity: isLight ? 0.35 : 0.25 });
            const points = [];

            for (let y = 0; y < 6; y++) for (let z = 0; z < 6; z++) points.push(gridToWorld(0, y, z), gridToWorld(4, y, z));
            for (let x = 0; x < 5; x++) for (let z = 0; z < 6; z++) points.push(gridToWorld(x, 0, z), gridToWorld(x, 5, z));
            for (let x = 0; x < 5; x++) for (let y = 0; y < 6; y++) points.push(gridToWorld(x, y, 0), gridToWorld(x, y, 5));
            gridGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), lineMat));

            if (!state.show3DLabels) return;
            const origin = gridToWorld(-0.45, -0.45, -0.45);
            const xCol = isLight ? '#0284c7' : '#38bdf8';
            const yCol = isLight ? '#059669' : '#34d399';
            const zCol = isLight ? '#7c3aed' : '#c084fc';

            gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([origin, gridToWorld(4.65, -0.45, -0.45)]), new THREE.LineBasicMaterial({ color: xCol })));
            for (let x = 0; x < 5; x++) {
                const lbl = createTextSprite(`${x}:${PALETTE_X[x].word}`, xCol, 30, 1.15);
                lbl.position.copy(gridToWorld(x, -0.68, -0.55));
                gridGroup.add(lbl);
            }

            gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([origin, gridToWorld(-0.45, 5.65, -0.45)]), new THREE.LineBasicMaterial({ color: yCol })));
            for (let y = 0; y < 6; y++) {
                const lbl = createTextSprite(`${y}:${PALETTE_Y[y].name}`, isLight ? '#0f172a' : PALETTE_Y[y].strokeHex, 28, 1.15);
                lbl.position.copy(gridToWorld(-0.82, y, -0.55));
                gridGroup.add(lbl);
            }

            gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([origin, gridToWorld(-0.45, -0.45, 5.65)]), new THREE.LineBasicMaterial({ color: zCol })));
            for (let z = 0; z < 6; z++) {
                const lbl = createTextSprite(`${z}:${PALETTE_Z[z].name}`, zCol, 28, 1.15);
                lbl.position.copy(gridToWorld(-0.78, -0.68, z));
                gridGroup.add(lbl);
            }
        }

        const cardSphereGeo = new THREE.SphereGeometry(0.43, 28, 28);
        const emptySphereGeo = new THREE.SphereGeometry(0.13, 10, 10);
        const haloRingGeo = new THREE.OctahedronGeometry(0.72, 1);

        function update3DScene() {
            nodesGroup.clear();
            cycleLinesGroup.clear();
            highlight3DGroup.clear();

            const activeSet = new Set(CARDS_60.map(([x, y, z]) => keyOf(x, y, z)));
            let visibleCount = 0;

            for (let x = 0; x < 5; x++) {
                for (let y = 0; y < 6; y++) {
                    for (let z = 0; z < 6; z++) {
                        const key = keyOf(x, y, z);
                        const isCard = activeSet.has(key);
                        const matchesSlice = (state.filterX === null || state.filterX === x) &&
                                             (state.filterY === null || state.filterY === y) &&
                                             (state.filterZ === null || state.filterZ === z);

                        const isHighlightedCard = state.highlightedCard && state.highlightedCard.x === x && state.highlightedCard.y === y && state.highlightedCard.z === z;
                        const isHighlightedByProp = state.highlightedProp && isCard && (state.cycleLayer === x) &&
                            ((state.highlightedProp.type === 'Y' && state.highlightedProp.index === y) ||
                             (state.highlightedProp.type === 'Z' && state.highlightedProp.index === z));
                        const isEmphasized = isHighlightedCard || isHighlightedByProp;

                        if (!isCard && !state.showEmptyNodes && !isHighlightedCard) continue;
                        const pos = gridToWorld(x, y, z);

                        if (isCard) {
                            if (matchesSlice) visibleCount++;
                            let hexColor = PALETTE_Y[y].hex;
                            if (state.colorMode === 'x') hexColor = PALETTE_X[x].hex;
                            if (state.colorMode === 'z') hexColor = PALETTE_Z[z].threeHex;

                            let opacity = matchesSlice ? 1.0 : 0.10;
                            if ((state.highlightedCard || state.highlightedProp) && matchesSlice && !isEmphasized) opacity = 0.30;
                            if (isEmphasized) opacity = 1.0;

                            const mat = new THREE.MeshStandardMaterial({
                                color: new THREE.Color(hexColor),
                                roughness: 0.25,
                                metalness: 0.18,
                                emissive: new THREE.Color(isEmphasized ? '#ffffff' : hexColor),
                                emissiveIntensity: isEmphasized ? 0.55 : (matchesSlice ? 0.22 : 0.02),
                                transparent: true,
                                opacity
                            });

                            const mesh = new THREE.Mesh(cardSphereGeo, mat);
                            mesh.position.copy(pos);
                            if (isEmphasized) mesh.scale.set(1.38, 1.38, 1.38);
                            mesh.userData = { x, y, z, isCard: true, matchesSlice, hexColor };
                            nodesGroup.add(mesh);

                            if (isEmphasized) {
                                const halo = new THREE.Mesh(haloRingGeo, new THREE.MeshBasicMaterial({ color: 0xfacc15, wireframe: true, transparent: true, opacity: 0.9 }));
                                halo.position.copy(pos);
                                halo.userData = { isRotatingHalo: true };
                                highlight3DGroup.add(halo);
                            }
                        } else {
                            const mesh = new THREE.Mesh(emptySphereGeo, new THREE.MeshBasicMaterial({ color: 0x64748b, transparent: true, opacity: matchesSlice ? 0.18 : 0.03 }));
                            mesh.position.copy(pos);
                            mesh.userData = { x, y, z, isCard: false, matchesSlice };
                            nodesGroup.add(mesh);
                        }
                    }
                }
            }

            if (state.showCycleLines) {
                for (let x = 0; x < 5; x++) {
                    if (state.filterX !== null && state.filterX !== x) continue;
                    const cycles = computeLayerCycles(x);
                    const layerColor = new THREE.Color(PALETTE_X[x].hex);
                    const baseOpacity = state.filterX === x ? 0.85 : 0.35;

                    cycles.forEach(cycle => {
                        const segPoints = [];
                        for (let i = 0; i < cycle.length; i++) {
                            const c1 = cycle[i].outCard;
                            const c2 = cycle[(i + 1) % cycle.length].outCard;
                            segPoints.push(gridToWorld(c1[0], c1[1], c1[2]), gridToWorld(c2[0], c2[1], c2[2]));
                        }
                        cycleLinesGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(segPoints), new THREE.LineBasicMaterial({ color: layerColor, transparent: true, opacity: baseOpacity })));
                    });
                }
            }

            gridGroup.visible = state.showGridBox;
            document.getElementById('visible-counter').textContent = `${visibleCount} / 60`;
            update3DLegend();
        }

        function update3DLegend() {
            const legendEl = document.getElementById('color-legend');
            let items = [];
            if (state.colorMode === 'y') items = PALETTE_Y.map((p, i) => ({ hex: p.hex, name: `Y=${i} ${p.name}` }));
            else if (state.colorMode === 'x') items = PALETTE_X.slice(0, 5).map((p, i) => ({ hex: p.hex, name: `X=${i} (${p.word})` }));
            else items = PALETTE_Z.map((p, i) => ({ hex: p.threeHex, name: `Z=${i} ${p.name}` }));

            legendEl.innerHTML = items.map(item => `
                <div class="flex items-center gap-1 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/70">
                    <span class="w-2.5 h-2.5 rounded-full" style="background:${item.hex}"></span>
                    <span class="text-slate-300">${item.name}</span>
                </div>
            `).join('');
        }

        function resize3DCanvas() {
            if (!container || container.clientWidth <= 0 || container.clientHeight <= 0) return;
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }

        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(() => resize3DCanvas()).observe(container);
        }

        function toggle3DInfoBox(forceExpand = null) {
            const body = document.getElementById('info-box-3d-body');
            const label = document.getElementById('info-box-3d-toggle-text');
            const shouldExpand = forceExpand !== null ? forceExpand : body.classList.contains('hidden');
            body.classList.toggle('hidden', !shouldExpand);
            label.textContent = shouldExpand ? 'Einklappen ▴' : 'Optionen ▾';
        }

        function toggleTooltipBox() {
            const preview = document.getElementById('tt-card-preview');
            const status = document.getElementById('tt-status');
            const btn = document.getElementById('btn-toggle-tooltip');
            const isHidden = preview.classList.contains('hidden');
            preview.classList.toggle('hidden', !isHidden);
            status.classList.toggle('hidden', !isHidden);
            btn.textContent = isHidden ? 'Minimieren ▾' : 'Vorschau ▴';
        }

        function animateCameraLerp(cam, ctrl, targetPos, targetLookAt, duration = 420) {
            if (cam._lerpRaf) cancelAnimationFrame(cam._lerpRaf);
            const startPos = cam.position.clone();
            const startLook = ctrl.target.clone();
            const startTime = performance.now();

            // Bricht den Flug sofort ab, falls der Nutzer manuell mit der Maus eingreift
            const cancelOnUserDrag = () => {
                if (cam._lerpRaf) {
                    cancelAnimationFrame(cam._lerpRaf);
                    cam._lerpRaf = null;
                }
                ctrl.removeEventListener('start', cancelOnUserDrag);
            };
            ctrl.addEventListener('start', cancelOnUserDrag);

            function step(now) {
                const t = Math.min((now - startTime) / duration, 1);
                // Weiches Abbremsen am Ziel (easeOutCubic)
                const ease = 1 - Math.pow(1 - t, 3);

                cam.position.lerpVectors(startPos, targetPos, ease);
                ctrl.target.lerpVectors(startLook, targetLookAt, ease);
                ctrl.update();

                if (t < 1) {
                    cam._lerpRaf = requestAnimationFrame(step);
                } else {
                    cam._lerpRaf = null;
                    ctrl.removeEventListener('start', cancelOnUserDrag);
                }
            }
            cam._lerpRaf = requestAnimationFrame(step);
        }

        function setCameraView(mode, instant = false) {
            const aspect = container.clientWidth / Math.max(container.clientHeight, 1);
            const distScale = aspect < 1.05 ? 1.24 : 1.0;
            const targetLook = new THREE.Vector3(0, -0.3, 0);
            const targetPos = new THREE.Vector3();

            if (mode === 'iso') targetPos.set(16.5 * distScale, 13.0 * distScale, 18.5 * distScale);
            else if (mode === 'xy') targetPos.set(0, -0.3, 25 * distScale);
            else if (mode === 'xz') targetPos.set(0, 25 * distScale, 0.01);
            else if (mode === 'yz') targetPos.set(25 * distScale, -0.3, 0);

            if (instant) {
                controls.target.copy(targetLook);
                camera.position.copy(targetPos);
                controls.update();
            } else {
                animateCameraLerp(camera, controls, targetPos, targetLook, 420);
            }
        }

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let hovered3DMesh = null;

        renderer.domElement.addEventListener('pointermove', (event) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const hit = raycaster.intersectObjects(nodesGroup.children).find(i => i.object.userData.matchesSlice && i.object.userData.isCard);

            if (hit) {
                const { x, y, z } = hit.object.userData;
                renderer.domElement.style.cursor = 'pointer';
                if (hovered3DMesh !== hit.object) {
                    hovered3DMesh = hit.object;
                    highlightCardAcrossViews(x, y, z, false);
                }
            } else {
                renderer.domElement.style.cursor = 'grab';
                if (hovered3DMesh && !state.animTimer) {
                    hovered3DMesh = null;
                    clearHighlights();
                }
            }
        });

        renderer.domElement.addEventListener('click', () => {
            if (hovered3DMesh) {
                const { x, y, z } = hovered3DMesh.userData;
                if (state.cycleLayer !== x) selectCycleLayer(x, false);
                highlightCardAcrossViews(x, y, z, false);
            }
        });

        function set2DSubView(subMode) {
            if (state.subView2D !== subMode) playSound('tick');
            state.subView2D = subMode;
            ['ring', 'bipartite', 'matrix'].forEach(m => {
                const btn = document.getElementById(`sub2d-btn-${m}`);
                if (btn) btn.className = `relative z-10 px-3 py-1 rounded-full transition-colors ${m === subMode ? 'pill-btn-active' : 'pill-btn-idle'}`;
            });
            moveSlidingPill('basic-2d-tabs', `sub2d-btn-${subMode}`);

            document.getElementById('card-2d-ring').classList.toggle('hidden', subMode !== 'ring');
            document.getElementById('card-2d-bipartite').classList.toggle('hidden', subMode !== 'bipartite');
            document.getElementById('card-2d-matrix').classList.toggle('hidden', subMode !== 'matrix');
        }

        function render2DCycleGraphs() {
            const layer = state.cycleLayer;
            const layerCards = getCardsForLayer(layer);
            const cycles = computeLayerCycles(layer);

            for (let i = 0; i <= 5; i++) {
                const btn = document.getElementById(`cyc-layer-${i}`);
                if (btn) btn.className = i === layer
                    ? 'px-1.5 py-0.5 rounded text-[10px] font-bold mono border transition bg-amber-400 text-slate-950 border-amber-300'
                    : 'px-1.5 py-0.5 rounded text-[10px] font-semibold mono border transition bg-slate-900 text-slate-400 border-slate-800 hover:text-white';
            }

            const summaryBadge = document.getElementById('cycle-summary-badge');
            const layerInfo = PALETTE_X[layer];
            if (cycles.length === 1) {
                summaryBadge.textContent = `${layerInfo.short}: 1 Hamilton-Ring (12er)`;
                summaryBadge.className = 'hidden sm:inline-block text-[11px] mono font-semibold px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
            } else {
                summaryBadge.textContent = `${layerInfo.short}: ${cycles.length} Ringe (${cycles.map(c => `${c.length}er`).join(' + ')})`;
                summaryBadge.className = 'hidden sm:inline-block text-[11px] mono font-semibold px-2 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30';
            }

            renderBipartiteSVG(layer, layerCards);
            renderCycleRingSVG(layer, cycles);
            renderCycleChainsList(layer, cycles);
            renderLayerIncidenceMatrix(layer, layerCards);
        }

        function isCardHighlighted(x, y, z) {
            if (state.highlightedCard) return state.highlightedCard.x === x && state.highlightedCard.y === y && state.highlightedCard.z === z;
            if (state.highlightedProp) return (state.highlightedProp.type === 'Y' && state.highlightedProp.index === y) || (state.highlightedProp.type === 'Z' && state.highlightedProp.index === z);
            return false;
        }

        function isPropNodeHighlighted(type, idx) {
            if (state.highlightedProp) return state.highlightedProp.type === type && state.highlightedProp.index === idx;
            if (state.highlightedCard) return (type === 'Y' && state.highlightedCard.y === idx) || (type === 'Z' && state.highlightedCard.z === idx);
            return false;
        }

        function renderBipartiteSVG(layer, layerCards) {
            const svg = document.getElementById('svg-bipartite');
            if (!svg) return;
            const hasAnyHighlight = Boolean(state.highlightedCard || state.highlightedProp);
            const leftX = 95, rightX = 445, startY = 58, stepY = 62;

            const incidentColorsForZ = Array.from({ length: 6 }, () => []);
            layerCards.forEach(([x, y, z]) => incidentColorsForZ[z].push(y));

            let html = `
                <rect x="10" y="6" width="170" height="24" rx="6" fill="#0f172a" stroke="#1e293b"/>
                <text x="95" y="22" text-anchor="middle" fill="#38bdf8" font-size="10.5" font-weight="bold" class="mono">KNOTEN: 6 FARBEN (Y)</text>
                <rect x="188" y="6" width="164" height="24" rx="6" fill="#0f172a" stroke="#1e293b"/>
                <text x="270" y="22" text-anchor="middle" fill="#facc15" font-size="10.5" font-weight="bold" class="mono">KANTEN: 12 KARTEN (X,Y,Z)</text>
                <rect x="360" y="6" width="170" height="24" rx="6" fill="#0f172a" stroke="#1e293b"/>
                <text x="445" y="22" text-anchor="middle" fill="#e2e8f0" font-size="10.5" font-weight="bold" class="mono">KNOTEN: 6 SYMBOLE (Z)</text>
            `;

            const badgePositions = [];
            layerCards.forEach(([x, y, z]) => {
                const y1 = startY + y * stepY;
                const y2 = startY + z * stepY;
                const active = isCardHighlighted(x, y, z);
                const strokeColor = active ? '#ffffff' : PALETTE_Y[y].hex;
                const opacity = hasAnyHighlight ? (active ? 1.0 : 0.16) : 0.82;
                const ctrlX1 = leftX + 120, ctrlX2 = rightX - 120;

                html += `<path d="M ${leftX} ${y1} C ${ctrlX1} ${y1}, ${ctrlX2} ${y2}, ${rightX} ${y2}" fill="none" stroke="${strokeColor}" stroke-width="${active ? 4.2 : 2.5}" stroke-opacity="${opacity}" class="svg-edge-line" />`;

                const t = 0.24 + ((y * 2 + z) % 7) * 0.085;
                const mt = 1 - t;
                const bx = mt*mt*mt*leftX + 3*mt*mt*t*ctrlX1 + 3*mt*t*t*ctrlX2 + t*t*t*rightX;
                const by = mt*mt*mt*y1 + 3*mt*mt*t*y1 + 3*mt*t*t*y2 + t*t*t*y2;
                badgePositions.push({ x, y, z, bx, by, active });
            });

            badgePositions.sort((a, b) => (a.active ? 1 : 0) - (b.active ? 1 : 0));
            badgePositions.forEach(({ x, y, z, bx, by, active }) => {
                const badgeOpacity = hasAnyHighlight ? (active ? 1.0 : 0.25) : 0.98;
                const labelStr = x === 5 ? `*(${y},${z})` : `(${x},${y},${z})`;
                html += `
                    <g class="svg-card-badge" style="opacity:${badgeOpacity}"
                       onmouseenter="highlightCardAcrossViews(${x},${y},${z}, false)"
                       onmouseout="if(!this.contains(event.relatedTarget)) clearHighlights()"
                       onclick="highlightCardAcrossViews(${x},${y},${z}, true)">
                        <rect x="${bx - 36}" y="${by - 11}" width="72" height="22" rx="6" fill="${active ? '#1e293b' : '#090d16'}" stroke="${active ? '#ffffff' : PALETTE_Y[y].strokeHex}" stroke-width="${active ? 2.4 : 1.6}" />
                        <svg x="${bx - 32}" y="${by - 8}" width="16" height="16" viewBox="0 0 24 24">${getSymbolInnerSVG(z, PALETTE_Y[y].hex, '#020617', 1.1)}</svg>
                        <text x="${bx + 7}" y="${by + 3.5}" text-anchor="middle" fill="${active ? '#fde047' : '#f8fafc'}" font-size="10" font-weight="bold" class="mono">${labelStr}</text>
                    </g>
                `;
            });

            for (let y = 0; y < 6; y++) {
                const cy = startY + y * stepY;
                const active = isPropNodeHighlighted('Y', y);
                const col = PALETTE_Y[y];
                html += `
                    <g class="svg-prop-node" style="opacity:${hasAnyHighlight ? (active ? 1.0 : 0.35) : 1.0}"
                       onmouseenter="highlightPropertyAcrossViews('Y', ${y})"
                       onmouseout="if(!this.contains(event.relatedTarget)) clearHighlights()"
                       onclick="highlightPropertyAcrossViews('Y', ${y})">
                        <circle cx="${leftX}" cy="${cy}" r="${active ? 22 : 19}" fill="#0f172a" stroke="${active ? '#ffffff' : col.strokeHex}" stroke-width="${active ? 3.5 : 2.6}" />
                        <circle cx="${leftX - 34}" cy="${cy}" r="7.5" fill="${col.hex}" stroke="#ffffff" stroke-width="1" />
                        <text x="${leftX}" y="${cy - 2}" text-anchor="middle" fill="#ffffff" font-size="10.5" font-weight="bold" class="mono">Y=${y}</text>
                        <text x="${leftX}" y="${cy + 10}" text-anchor="middle" fill="${col.strokeHex}" font-size="9" font-weight="700">${col.name}</text>
                    </g>
                `;
            }

            for (let z = 0; z < 6; z++) {
                const cz = startY + z * stepY;
                const active = isPropNodeHighlighted('Z', z);
                const sym = PALETTE_Z[z];
                const r = active ? 21 : 18;
                const incY = incidentColorsForZ[z];
                html += `
                    <g class="svg-prop-node" style="opacity:${hasAnyHighlight ? (active ? 1.0 : 0.35) : 1.0}"
                       onmouseenter="highlightPropertyAcrossViews('Z', ${z})"
                      onmouseout="if(!this.contains(event.relatedTarget)) clearHighlights()"
                       onclick="highlightPropertyAcrossViews('Z', ${z})">
                        <rect x="${rightX - r}" y="${cz - r}" width="${r * 2}" height="${r * 2}" rx="8" fill="#0f172a" stroke="${active ? '#ffffff' : '#94a3b8'}" stroke-width="${active ? 3.5 : 2.2}" />
                        <svg x="${rightX + 24}" y="${cz - 11}" width="21" height="21" viewBox="0 0 24 24">${getSymbolInnerSVG(z, '#F8FAFC', '#0f172a', 1.1)}</svg>
                        <circle cx="${rightX + 52}" cy="${cz - 5}" r="4" fill="${incY[0] !== undefined ? PALETTE_Y[incY[0]].hex : '#cbd5e1'}" stroke="#0f172a" stroke-width="1"/>
                        <circle cx="${rightX + 52}" cy="${cz + 5}" r="4" fill="${incY[1] !== undefined ? PALETTE_Y[incY[1]].hex : '#cbd5e1'}" stroke="#0f172a" stroke-width="1"/>
                        <text x="${rightX}" y="${cz - 2}" text-anchor="middle" fill="#ffffff" font-size="10.5" font-weight="bold" class="mono">Z=${z}</text>
                        <text x="${rightX}" y="${cz + 10}" text-anchor="middle" fill="#cbd5e1" font-size="8.5" font-weight="700">${sym.name}</text>
                    </g>
                `;
            }
            svg.innerHTML = html;
        }

        function renderCycleRingSVG(layer, cycles) {
            const svg = document.getElementById('svg-cycle-ring');
            if (!svg) return;
            const hasAnyHighlight = Boolean(state.highlightedCard || state.highlightedProp);
            let html = '';

            const circleConfigs = cycles.length === 1
                ? [{ cx: 270, cy: 222, r: 158, ringStroke: '#38bdf8', title: `Hamilton-Zyklus (${PALETTE_X[layer].short})` }]
                : cycles.map((c, idx) => idx === 0
                    ? { cx: 165, cy: 225, r: 116, ringStroke: '#38bdf8', title: `Zyklus 1 (${c.length}er-Ring)` }
                    : { cx: 416, cy: 225, r: 80,  ringStroke: '#c084fc', title: `Zyklus 2 (${c.length}er-Ring)` });

            cycles.forEach((cycle, cIdx) => {
                const { cx, cy, r, ringStroke, title } = circleConfigs[cIdx];
                const n = cycle.length;

                html += `
                    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ringStroke}" stroke-opacity="0.25" stroke-width="1.8" stroke-dasharray="5,5" />
                    <text x="${cx}" y="${cy - r - 28}" text-anchor="middle" fill="#e2e8f0" font-size="11" font-weight="bold" class="mono">${title}</text>
                    <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="#94a3b8" font-size="10" font-weight="bold" class="mono">X=${layer === 5 ? '5*' : layer} (${PALETTE_X[layer].word})</text>
                `;

                const pts = cycle.map((step, i) => {
                    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
                    return { ...step, px: cx + r * Math.cos(angle), py: cy + r * Math.sin(angle), angle };
                });

                pts.forEach((p1, i) => {
                    const p2 = pts[(i + 1) % n];
                    const [kx, ky, kz] = p1.outCard;
                    const active = isCardHighlighted(kx, ky, kz);

                    html += `<line x1="${p1.px}" y1="${p1.py}" x2="${p2.px}" y2="${p2.py}" stroke="${active ? '#ffffff' : PALETTE_Y[ky].hex}" stroke-width="${active ? 4.2 : 2.8}" stroke-opacity="${hasAnyHighlight ? (active ? 1.0 : 0.22) : 0.9}" class="svg-edge-line" />`;

                    const midAngle = p1.angle + Math.PI / n;
                    const badgeR = r + (cycles.length === 1 ? 16 : 14);
                    const bx = cx + badgeR * Math.cos(midAngle);
                    const by = cy + badgeR * Math.sin(midAngle);
                    const labelStr = kx === 5 ? `*(${ky},${kz})` : `(${kx},${ky},${kz})`;

                    html += `
                        <g class="svg-card-badge" style="opacity:${hasAnyHighlight ? (active ? 1.0 : 0.28) : 0.98}"
                           onmouseenter="highlightCardAcrossViews(${kx},${ky},${kz}, false)"
                           onmouseleave="if(!state.animTimer) clearHighlights()"
                           onclick="highlightCardAcrossViews(${kx},${ky},${kz}, true)">
                            <rect x="${bx - 32}" y="${by - 10}" width="64" height="20" rx="5" fill="${active ? '#1e293b' : '#090d16'}" stroke="${active ? '#ffffff' : PALETTE_Y[ky].strokeHex}" stroke-width="${active ? 2.2 : 1.5}" />
                            <svg x="${bx - 29}" y="${by - 7}" width="14" height="14" viewBox="0 0 24 24">${getSymbolInnerSVG(kz, PALETTE_Y[ky].hex, '#020617', 1.1)}</svg>
                            <text x="${bx + 6}" y="${by + 3.5}" text-anchor="middle" fill="${active ? '#fde047' : '#f8fafc'}" font-size="9" font-weight="bold" class="mono">${labelStr}</text>
                        </g>
                    `;
                });

                pts.forEach((p) => {
                    const active = isPropNodeHighlighted(p.nodeType, p.id);
                    const nodeOpacity = hasAnyHighlight ? (active ? 1.0 : 0.32) : 1.0;

                    if (p.nodeType === 'Y') {
                        const col = PALETTE_Y[p.id];
                        const rad = active ? 21 : 18;
                        html += `
                            <g class="svg-prop-node" style="opacity:${nodeOpacity}"
                               onmouseenter="highlightPropertyAcrossViews('Y', ${p.id})"
                               onmouseout="if(!this.contains(event.relatedTarget)) clearHighlights()"
                               onclick="highlightPropertyAcrossViews('Y', ${p.id})">
                                <circle cx="${p.px}" cy="${p.py}" r="${rad}" fill="#0f172a" stroke="${active ? '#ffffff' : col.strokeHex}" stroke-width="${active ? 3.5 : 2.6}" />
                                <circle cx="${p.px}" cy="${p.py - 9}" r="3.5" fill="${col.hex}" />
                                <text x="${p.px}" y="${p.py + 2}" text-anchor="middle" fill="#ffffff" font-size="9.5" font-weight="bold" class="mono">Y=${p.id}</text>
                                <text x="${p.px}" y="${p.py + 11}" text-anchor="middle" fill="${col.strokeHex}" font-size="8" font-weight="700">${col.name}</text>
                            </g>
                        `;
                    } else {
                        const s = active ? 20 : 17;
                        html += `
                            <g class="svg-prop-node" style="opacity:${nodeOpacity}"
                               onmouseenter="highlightPropertyAcrossViews('Z', ${p.id})"
                              onmouseout="if(!this.contains(event.relatedTarget)) clearHighlights()"
                               onclick="highlightPropertyAcrossViews('Z', ${p.id})">
                                <rect x="${p.px - s}" y="${p.py - s}" width="${s * 2}" height="${s * 2}" rx="6" fill="#0f172a" stroke="${active ? '#ffffff' : '#cbd5e1'}" stroke-width="${active ? 3.5 : 2.2}" />
                                <svg x="${p.px - 7}" y="${p.py - 14}" width="14" height="14" viewBox="0 0 24 24">${getSymbolInnerSVG(p.id, '#F8FAFC', '#0f172a', 1.0)}</svg>
                                <text x="${p.px}" y="${p.py + 10}" text-anchor="middle" fill="#ffffff" font-size="8.5" font-weight="bold" class="mono">Z=${p.id}</text>
                            </g>
                        `;
                    }
                });
            });
            svg.innerHTML = html;
        }

        function renderCycleChainsList(layer, cycles) {
            const listEl = document.getElementById('cycle-chains-list');
            if (!listEl) return;
            listEl.innerHTML = cycles.map((cycle, idx) => {
                const stepsHtml = cycle.map(step => {
                    const [kx, ky, kz] = step.outCard;
                    const nodeContent = step.nodeType === 'Y'
                        ? `<span class="w-2.5 h-2.5 rounded-full inline-block" style="background:${PALETTE_Y[step.id].hex}"></span> Y=${step.id}`
                        : `${getSymbolSVG(step.id, '#F8FAFC', 12)} Z=${step.id}`;
                    const cardLabel = kx === 5 ? `*(${ky},${kz})` : `(${kx},${ky},${kz})`;
                    return `
                        <button onclick="highlightPropertyAcrossViews('${step.nodeType}', ${step.id})" class="px-1.5 py-0.5 rounded border text-[11px] mono inline-flex items-center gap-1 bg-slate-950 text-slate-200 border-slate-700">${nodeContent}</button>
                        <span class="text-slate-500 text-[10px]">─</span>
                        <button onclick="highlightCardAcrossViews(${kx},${ky},${kz}, true)" class="px-1.5 py-0.5 rounded border text-[11px] mono inline-flex items-center gap-1 bg-slate-800 text-cyan-200 border-slate-700">${getSymbolSVG(kz, PALETTE_Y[ky].hex, 12, '#0f172a', 1.2)}<span>${cardLabel}</span></button>
                        <span class="text-slate-500 text-[10px]">→</span>
                    `;
                }).join('');
                return `<div class="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800"><div class="text-[11px] font-bold text-amber-300 mb-1.5 mono">Zyklus ${idx + 1} (${cycle.length} Karten):</div><div class="flex flex-wrap items-center gap-1">${stepsHtml}<span class="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 text-[11px] mono font-bold">↺ Y=${cycle[0].id}</span></div></div>`;
            }).join('');
        }

        function renderLayerIncidenceMatrix(layer, layerCards) {
            const titleEl = document.getElementById('layer-matrix-title');
            const matEl = document.getElementById('layer-incidence-matrix');
            if (!titleEl || !matEl) return;
            titleEl.textContent = layer === 5 ? `6×6 Komplement-Matrix (X=5*)` : `6×6 Schicht-Matrix X=${layer} (${PALETTE_X[layer].word})`;
            const grid = Array.from({ length: 6 }, () => Array(6).fill(null));
            layerCards.forEach(([x, y, z]) => grid[y][z] = [x, y, z]);

            let html = `<table class="w-full text-center mono text-[11px] border-separate border-spacing-1"><thead><tr><th class="text-[10px] text-slate-500">Y \\ Z</th>`;
            for (let z = 0; z < 6; z++) html += `<th class="text-slate-200 pb-0.5"><span class="text-[10px]">Z=${z} (${PALETTE_Z[z].name})</span></th>`;
            html += `<th class="text-[10px] text-slate-400">∑</th></tr></thead><tbody>`;

            for (let y = 0; y < 6; y++) {
                html += `<tr><td class="text-left pr-1 text-[10px] text-slate-200 font-semibold"><span class="inline-block w-2.5 h-2.5 rounded-full mr-1" style="background:${PALETTE_Y[y].hex}"></span>Y=${y} (${PALETTE_Y[y].name})</td>`;
                for (let z = 0; z < 6; z++) {
                    const card = grid[y][z];
                    if (card) {
                        const [kx, ky, kz] = card;
                        const active = isCardHighlighted(kx, ky, kz);
                        const lbl = kx === 5 ? `*${ky},${kz}` : `${kx},${ky},${kz}`;
                        html += `<td><button onclick="highlightCardAcrossViews(${kx},${ky},${kz}, true)" class="w-full py-1 px-0.5 rounded border text-[9.5px] flex items-center justify-center gap-1 ${active ? 'bg-amber-400 text-slate-950 font-bold border-white' : 'bg-slate-800/90 text-slate-100 border-slate-600'}">${getSymbolSVG(kz, PALETTE_Y[ky].hex, 13, '#0f172a', 1.2)}<span>(${lbl})</span></button></td>`;
                    } else {
                        html += `<td class="py-1 rounded border border-slate-800/70 bg-slate-900/40 text-slate-600">·</td>`;
                    }
                }
                html += `<td class="text-emerald-400 font-bold">2</td></tr>`;
            }
            html += `</tbody></table>`;
            matEl.innerHTML = html;
        }

        function updatePhysicalCardPreview(x, y, z) {
            const prev = document.getElementById('tt-card-preview');
            if (prev) prev.innerHTML = renderCardSymbolsHTML(x, y, z, 13);
        }

        function highlightCardAcrossViews(x, y, z, lockLayer = false) {
            if (lockLayer && x <= 4 && state.cycleLayer !== x) state.cycleLayer = x;
            state.highlightedCard = { x, y, z };
            state.highlightedProp = null;
            const anz = PALETTE_X[x], col = PALETTE_Y[y], sym = PALETTE_Z[z];
            updatePhysicalCardPreview(x, y, z);
            const coordsEl = document.getElementById('tt-coords');
            const statusEl = document.getElementById('tt-status');
            if (coordsEl) coordsEl.textContent = x === 5 ? `Komplement *(${y}, ${z})` : `Karte (${x}, ${y}, ${z}) → ${anz.count}× ${col.name} ${sym.name}`;
            if (statusEl) statusEl.textContent = `X=${x} (${anz.word}) • Y=${y} (${col.name}) • Z=${z} (${sym.name})`;
            update3DScene();
            render2DCycleGraphs();
        }

        function highlightPropertyAcrossViews(type, index) {
            state.highlightedProp = { type, index };
            state.highlightedCard = null;
            update3DScene();
            render2DCycleGraphs();
        }

        function clearHighlights() {
            state.highlightedCard = null;
            state.highlightedProp = null;
            update3DScene();
            render2DCycleGraphs();
        }

        function renderProjectionMatrices() {
            const matXY = Array.from({ length: 5 }, () => Array(6).fill(0));
            const matXZ = Array.from({ length: 5 }, () => Array(6).fill(0));
            const matYZ = Array.from({ length: 6 }, () => Array(6).fill(0));
            for (const [x, y, z] of CARDS_60) { matXY[x][y]++; matXZ[x][z]++; matYZ[y][z]++; }

            let htmlXY = `<table class="w-full text-center mono text-xs border-separate border-spacing-1"><thead><tr><th>X\\Y</th>${[0,1,2,3,4,5].map(y => `<th>Y=${y}</th>`).join('')}</tr></thead><tbody>`;
            for (let x = 0; x < 5; x++) htmlXY += `<tr><td class="text-cyan-300 font-bold">X=${x}</td>${[0,1,2,3,4,5].map(y => `<td class="py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold">${matXY[x][y]}</td>`).join('')}</tr>`;
            const mxy = document.getElementById('matrix-xy');
            if (mxy) mxy.innerHTML = htmlXY + `</tbody></table>`;

            let htmlXZ = `<table class="w-full text-center mono text-xs border-separate border-spacing-1"><thead><tr><th>X\\Z</th>${[0,1,2,3,4,5].map(z => `<th>Z=${z}</th>`).join('')}</tr></thead><tbody>`;
            for (let x = 0; x < 5; x++) htmlXZ += `<tr><td class="text-cyan-300 font-bold">X=${x}</td>${[0,1,2,3,4,5].map(z => `<td class="py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold">${matXZ[x][z]}</td>`).join('')}</tr>`;
            const mxz = document.getElementById('matrix-xz');
            if (mxz) mxz.innerHTML = htmlXZ + `</tbody></table>`;

            let htmlYZ = `<table class="w-full text-center mono text-xs border-separate border-spacing-1"><thead><tr><th>Y\\Z</th>${[0,1,2,3,4,5].map(z => `<th>Z=${z}</th>`).join('')}</tr></thead><tbody>`;
            for (let y = 0; y < 6; y++) htmlYZ += `<tr><td class="text-slate-200 font-bold">Y=${y}</td>${[0,1,2,3,4,5].map(z => `<td class="py-1 rounded ${matYZ[y][z] === 2 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-purple-500/25 text-purple-200 font-bold'}">${matYZ[y][z]}</td>`).join('')}</tr>`;
            const myz = document.getElementById('matrix-yz');
            if (myz) myz.innerHTML = htmlYZ + `</tbody></table>`;
        }

        function renderCardList() {
            const countEl = document.getElementById('card-list-count');
            const gridEl = document.getElementById('card-list-grid');
            if (!countEl || !gridEl) return;
            const q = state.searchQuery.trim().toLowerCase();
            const sorted = [...CARDS_60].sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
            const filtered = sorted.filter(([x, y, z]) => `(${x},${y},${z}) ${PALETTE_X[x].word.toLowerCase()} ${PALETTE_Y[y].name.toLowerCase()} ${PALETTE_Z[z].name.toLowerCase()}`.includes(q));
            countEl.textContent = `${filtered.length} / 60 Karten`;
            gridEl.innerHTML = filtered.map(([x, y, z]) => `
                <button onclick="selectCycleLayer(${x}); setLayoutMode('split'); highlightCardAcrossViews(${x},${y},${z}, true);" class="card-63-88 p-1.5 rounded-xl border-2 border-slate-300 bg-white text-left flex flex-col justify-between shadow hover:border-cyan-400 transition overflow-hidden">
                    <div class="blink-card-inner">
                        <div class="blink-card-top">
                            <span>(${x},${y},${z})</span>
                            <span class="blink-card-badge">${PALETTE_X[x].count}×</span>
                        </div>
                        <div class="flex-1 w-full min-h-0 my-0.5 pointer-events-none overflow-hidden">
                            ${renderCardSymbolsHTML(x, y, z)}
                        </div>
                        <div class="blink-card-bot">
                            <span class="truncate">${PALETTE_Y[y].name}</span>
                            <span class="truncate">${PALETTE_Z[z].name}</span>
                        </div>
                    </div>
                </button>
            `).join('');
        }

        function selectActiveLayer(layerVal) {
            playSound('tick');
            if (layerVal === 'all') {
                state.filterX = null;
                if (state.cycleLayer === 5) state.cycleLayer = 0;
            } else {
                const num = parseInt(layerVal, 10);
                if (num === 5) { state.filterX = null; state.cycleLayer = 5; }
                else { state.filterX = num; state.cycleLayer = num; }
            }
            updateGlobalLayerButtons();
            refreshAll();
        }

        function selectCycleLayer(layerIdx, sync3DFilter = true) {
            state.cycleLayer = layerIdx;
            if (sync3DFilter) state.filterX = layerIdx <= 4 ? layerIdx : null;
            updateGlobalLayerButtons();
            refreshAll();
        }

        function updateGlobalLayerButtons() {
            let activeKey = 'all';
            if (state.cycleLayer === 5 && state.filterX === null) {
                activeKey = '5';
            } else if (state.filterX !== null) {
                activeKey = String(state.filterX);
            }

            ['all', '0', '1', '2', '3', '4', '5'].forEach(k => {
                const btn = document.getElementById(`basic-x-${k}`);
                if (!btn) return;
                const active = (k === activeKey);
                const pad = k === 'all' ? 'px-2.5' : 'px-2';
                btn.className = `relative z-10 ${pad} py-0.5 rounded-full transition-colors ${active ? 'pill-btn-active' : 'pill-btn-idle'}`;
            });
            moveSlidingPill('basic-layer-tabs', `basic-x-${activeKey}`);
        }

        function setLayoutMode(mode) {
            const splitWorkspace = document.getElementById('basic-split-workspace');
            const matWorkspace = document.getElementById('basic-matrices-workspace');
            const p3d = document.getElementById('panel-3d');
            const p2d = document.getElementById('panel-2d');
            const resizer = document.getElementById('split-resizer');

            playSound('tick');
            ['split', '3d', '2d', 'matrices'].forEach(m => {
                const btn = document.getElementById(`layout-btn-${m}`);
                if (btn) btn.className = `relative z-10 px-3 py-1 rounded-full transition-colors ${m === mode ? 'pill-btn-active' : 'pill-btn-idle'}`;
            });
            moveSlidingPill('basic-layout-tabs', `layout-btn-${mode}`);
            if (mode === 'matrices') {
                splitWorkspace.classList.add('hidden');
                matWorkspace.classList.remove('hidden');
                return;
            }
            splitWorkspace.classList.remove('hidden');
            matWorkspace.classList.add('hidden');

            p3d.classList.toggle('hidden', mode === '2d');
            p2d.classList.toggle('hidden', mode === '3d');
            resizer.classList.toggle('lg:flex', mode === 'split');
            resizer.classList.toggle('lg:hidden', mode !== 'split');
            if (mode === '3d') p3d.style.width = '100%';
            else if (mode === 'split') setSplitPercentage(state.splitLeftPercent);

            setTimeout(() => { resize3DCanvas(); setCameraView('iso'); }, 40);
        }

        // ============================================================================
