// ============================================================================
// BLINK REALTIME TRANSPORT (SUPABASE WEBSOCKET PORT 443)
// Ersetzt WebRTC/PeerJS nahtlos für eduroam, 5G & Firewalls (Arena, Verhör & Kursraum)
// ============================================================================
(function initBlinkRealtimeTransport() {
    if (window.__BLINK_REALTIME_TRANSPORT_READY) return;
    window.__BLINK_REALTIME_TRANSPORT_READY = true;

    const OriginalPeer = window.Peer;
    let sharedSupabaseClient = window.__blinkSupabaseClient || null;

    // 1. Supabase-Client automatisch aus cloud-auth.js abfangen (keine doppelten Keys nötig)
    if (window.supabase && typeof window.supabase.createClient === 'function' && !window.supabase.createClient.__blinkCaptured) {
        const origCreateClient = window.supabase.createClient.bind(window.supabase);
        const wrappedCreateClient = function (...args) {
            const client = origCreateClient(...args);
            if (client && typeof client.channel === 'function') {
                sharedSupabaseClient = client;
                window.__blinkSupabaseClient = client;
            }
            return client;
        };
        wrappedCreateClient.__blinkCaptured = true;
        try {
            window.supabase.createClient = wrappedCreateClient;
        } catch (e) {
            try {
                Object.defineProperty(window.supabase, 'createClient', {
                    value: wrappedCreateClient,
                    writable: true,
                    configurable: true
                });
            } catch (e2) { }
        }
    }

    function getSupabaseClient() {
        return sharedSupabaseClient || window.__blinkSupabaseClient || null;
    }

    function genGuestId() {
        return 'g-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    }

    // 2. Leichtgewichtiger Event-Emitter (PeerJS-kompatibel)
    class MiniEmitter {
        constructor() {
            this._listeners = Object.create(null);
        }
        on(event, fn) {
            if (typeof fn !== 'function') return this;
            if (!this._listeners[event]) this._listeners[event] = [];
            this._listeners[event].push(fn);
            return this;
        }
        off(event, fn) {
            const list = this._listeners[event];
            if (!list) return this;
            this._listeners[event] = list.filter(cb => cb !== fn);
            return this;
        }
        _emit(event, ...args) {
            const list = this._listeners[event];
            if (!list || list.length === 0) return;
            list.slice().forEach(fn => {
                try { fn(...args); } catch (err) { console.error('[BlinkRealtime]', err); }
            });
        }
    }

    // 3. PeerJS-kompatible DataConnection über Supabase Broadcast
    class RealtimeDataConnection extends MiniEmitter {
        constructor(peerInstance, remotePeerId, channel, isHostSide) {
            super();
            this._peerInstance = peerInstance;
            this.peer = String(remotePeerId);
            this._channel = channel;
            this._isHostSide = Boolean(isHostSide);
            this.open = false;
            this._destroyed = false;
            this._openFired = false;
            this._synTimer = null;
            this._timeoutTimer = null;
        }

        on(event, fn) {
            super.on(event, fn);
            if (event === 'open' && this.open && this._openFired && !this._destroyed) {
                queueMicrotask(() => {
                    if (this.open && !this._destroyed) {
                        try { fn(); } catch (err) { console.error('[BlinkRealtime]', err); }
                    }
                });
            }
            return this;
        }

        _fireOpen() {
            if (this._openFired || this._destroyed) return;
            this._openFired = true;
            this.open = true;
            this._emit('open');
        }

        send(data) {
            if (!this.open || this._destroyed || !this._channel) return;
            const res = this._channel.send({
                type: 'broadcast',
                event: 'msg',
                payload: {
                    from: this._peerInstance.id,
                    to: this.peer,
                    kind: 'DATA',
                    data
                }
            });
            if (res && typeof res.catch === 'function') res.catch(() => { });
        }

        close() {
            if (this._destroyed) return;
            this._destroyed = true;
            this.open = false;
            this._clearTimers();

            if (this._channel) {
                const ch = this._channel;
                const res = ch.send({
                    type: 'broadcast',
                    event: 'msg',
                    payload: {
                        from: this._peerInstance.id,
                        to: this.peer,
                        kind: 'CLOSE'
                    }
                });
                if (res && typeof res.catch === 'function') res.catch(() => { });

                if (!this._isHostSide) {
                    this._channel = null;
                    this._peerInstance._removeChannel(ch, 60);
                }
            }
            if (this._isHostSide) {
                this._peerInstance._conns.delete(this.peer);
            }
            this._listeners = Object.create(null);
        }

        _handleRemoteClose() {
            if (this._destroyed) return;
            this._destroyed = true;
            const wasOpen = this.open;
            this.open = false;
            this._clearTimers();

            if (this._isHostSide) {
                this._peerInstance._conns.delete(this.peer);
            } else if (this._channel) {
                const ch = this._channel;
                this._channel = null;
                this._peerInstance._removeChannel(ch, 0);
            }
            if (wasOpen) {
                this._emit('close');
            }
            this._listeners = Object.create(null);
        }

        _clearTimers() {
            if (this._synTimer) { clearInterval(this._synTimer); this._synTimer = null; }
            if (this._timeoutTimer) { clearTimeout(this._timeoutTimer); this._timeoutTimer = null; }
        }
    }

    // 4. Drop-In-Ersatz für `new Peer(...)` über Supabase Realtime (WSS Port 443)
    class SupabasePeer extends MiniEmitter {
        constructor(id, options) {
            const sb = getSupabaseClient();
            if (!sb) {
                if (typeof OriginalPeer === 'function') {
                    return new OriginalPeer(id, options);
                }
                super();
                setTimeout(() => this._emit('error', { type: 'server-error', message: 'Kein Transport verfügbar' }), 0);
                return;
            }

            super();
            this._sb = sb;
            this._isHost = Boolean(id);
            this.id = id ? String(id) : genGuestId();
            this.destroyed = false;
            this.disconnected = false;
            this._opened = false;
            this._channel = null;
            this._conns = new Map();
            this._guestConn = null;
            this._leaveTimers = new Map();

            if (this._isHost) {
                this._initHostChannel();
            } else {
                setTimeout(() => {
                    if (!this.destroyed) {
                        this._opened = true;
                        this._emit('open', this.id);
                    }
                }, 0);
            }
        }

        _removeChannel(ch, delayMs = 0) {
            if (!ch) return;
            if (this._channel === ch) this._channel = null;
            if (this._guestConn && this._guestConn._channel === ch) this._guestConn._channel = null;
            const doRemove = () => {
                try { this._sb.removeChannel(ch); } catch (e) { }
            };
            if (delayMs > 0) setTimeout(doRemove, delayMs);
            else doRemove();
        }

        _cleanupExistingChannel(channelName) {
            try {
                const list = typeof this._sb.getChannels === 'function' ? this._sb.getChannels() : [];
                list.forEach(ch => {
                    if (ch && ch.topic === `realtime:${channelName}`) {
                        try { this._sb.removeChannel(ch); } catch (e) { }
                    }
                });
            } catch (e) { }
        }

        _initHostChannel() {
            const channelName = `blink-rt:${this.id}`;
            this._cleanupExistingChannel(channelName);

            const channel = this._sb.channel(channelName, {
                config: {
                    private: false,
                    broadcast: { self: false, ack: false },
                    presence: { key: this.id }
                }
            });
            this._channel = channel;

            channel.on('broadcast', { event: 'msg' }, ({ payload }) => {
                if (this.destroyed || !payload || payload.to !== this.id) return;
                const from = String(payload.from || '');
                if (!from) return;

                if (payload.kind === 'SYN') {
                    const prevLeave = this._leaveTimers.get(from);
                    if (prevLeave) { clearTimeout(prevLeave); this._leaveTimers.delete(from); }

                    const existing = this._conns.get(from);
                    if (existing && existing.open && !existing._destroyed) {
                        const ackRes = channel.send({
                            type: 'broadcast',
                            event: 'msg',
                            payload: { from: this.id, to: from, kind: 'ACK' }
                        });
                        if (ackRes && typeof ackRes.catch === 'function') ackRes.catch(() => { });
                        return;
                    }

                    const conn = new RealtimeDataConnection(this, from, channel, true);
                    conn.open = true;
                    this._conns.set(from, conn);

                    // Host-App registriert hier synchron conn.on('open'/'data'/'close') oder ruft conn.close() auf
                    this._emit('connection', conn);
                    if (!conn.open || conn._destroyed) return;

                    const ackRes = channel.send({
                        type: 'broadcast',
                        event: 'msg',
                        payload: { from: this.id, to: from, kind: 'ACK' }
                    });
                    if (ackRes && typeof ackRes.catch === 'function') ackRes.catch(() => { });

                    setTimeout(() => {
                        if (conn.open && !conn._destroyed && !this.destroyed) {
                            conn._fireOpen();
                        }
                    }, 20);
                    return;
                }

                if (payload.kind === 'DATA') {
                    const conn = this._conns.get(from);
                    if (conn && conn.open && !conn._destroyed) {
                        conn._emit('data', payload.data);
                    }
                    return;
                }

                if (payload.kind === 'CLOSE') {
                    const conn = this._conns.get(from);
                    if (conn) conn._handleRemoteClose();
                }
            });

            // Erkennt Tab-Schließen oder Verbindungsabbruch eines Gastes automatisch
            channel.on('presence', { event: 'leave' }, ({ key }) => {
                if (this.destroyed || !key || key === this.id) return;
                if (!this._conns.has(key)) return;
                const prev = this._leaveTimers.get(key);
                if (prev) clearTimeout(prev);
                const t = setTimeout(() => {
                    this._leaveTimers.delete(key);
                    if (this.destroyed) return;
                    const pres = channel.presenceState ? channel.presenceState() : {};
                    if (!pres[key] || pres[key].length === 0) {
                        const conn = this._conns.get(key);
                        if (conn) conn._handleRemoteClose();
                    }
                }, 1800);
                this._leaveTimers.set(key, t);
            });

            channel.subscribe((status, err) => {
                if (this.destroyed) return;
                if (status === 'SUBSCRIBED') {
                    try {
                        const tr = channel.track({ role: 'host', id: this.id });
                        if (tr && typeof tr.catch === 'function') tr.catch(() => { });
                    } catch (e) { }
                    if (!this._opened) {
                        this._opened = true;
                        this._emit('open', this.id);
                    }
                } else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !this._opened) {
                    this._emit('error', {
                        type: 'network',
                        message: err?.message || 'Supabase Realtime nicht erreichbar'
                    });
                }
            });
        }

        connect(targetId) {
            if (this._guestConn) {
                this._guestConn.close();
                this._guestConn = null;
            }
            const hostId = String(targetId);
            const channelName = `blink-rt:${hostId}`;
            this._cleanupExistingChannel(channelName);

            const channel = this._sb.channel(channelName, {
                config: {
                    private: false,
                    broadcast: { self: false, ack: false },
                    presence: { key: this.id }
                }
            });

            const conn = new RealtimeDataConnection(this, hostId, channel, false);
            this._channel = channel;
            this._guestConn = conn;

            channel.on('broadcast', { event: 'msg' }, ({ payload }) => {
                if (this.destroyed || conn._destroyed || !payload) return;
                if (payload.to !== this.id || payload.from !== hostId) return;

                if (payload.kind === 'ACK') {
                    conn._clearTimers();
                    if (!conn.open) {
                        conn._fireOpen();
                    }
                    return;
                }

                if (payload.kind === 'DATA') {
                    if (conn.open) {
                        conn._emit('data', payload.data);
                    }
                    return;
                }

                if (payload.kind === 'CLOSE') {
                    conn._clearTimers();
                    if (!conn.open) {
                        conn._destroyed = true;
                        this._removeChannel(channel, 0);
                        const errObj = { type: 'room-full', message: 'Raum ist bereits voll' };
                        conn._emit('error', errObj);
                        this._emit('error', errObj);
                    } else {
                        conn._handleRemoteClose();
                    }
                }
            });

            // Erkennt Tab-Schließen oder Abbruch des Hosts
            channel.on('presence', { event: 'leave' }, ({ key }) => {
                if (this.destroyed || conn._destroyed || key !== hostId || !conn.open) return;
                const prev = this._leaveTimers.get(hostId);
                if (prev) clearTimeout(prev);
                const t = setTimeout(() => {
                    this._leaveTimers.delete(hostId);
                    if (this.destroyed || conn._destroyed || !conn.open) return;
                    const pres = channel.presenceState ? channel.presenceState() : {};
                    if (!pres[hostId] || pres[hostId].length === 0) {
                        conn._handleRemoteClose();
                    }
                }, 1800);
                this._leaveTimers.set(hostId, t);
            });

            channel.subscribe((status, err) => {
                if (this.destroyed || conn._destroyed) return;
                if (status === 'SUBSCRIBED') {
                    try {
                        const tr = channel.track({ role: 'guest', id: this.id });
                        if (tr && typeof tr.catch === 'function') tr.catch(() => { });
                    } catch (e) { }

                    const sendSyn = () => {
                        if (this.destroyed || conn._destroyed || conn.open) return;
                        const res = channel.send({
                            type: 'broadcast',
                            event: 'msg',
                            payload: { from: this.id, to: hostId, kind: 'SYN' }
                        });
                        if (res && typeof res.catch === 'function') res.catch(() => { });
                    };

                    sendSyn();
                    conn._synTimer = setInterval(() => {
                        if (this.destroyed || conn._destroyed || conn.open) {
                            clearInterval(conn._synTimer);
                            conn._synTimer = null;
                            return;
                        }
                        sendSyn();
                    }, 700);

                    conn._timeoutTimer = setTimeout(() => {
                        if (!conn.open && !conn._destroyed && !this.destroyed) {
                            conn._clearTimers();
                            conn._destroyed = true;
                            this._removeChannel(channel, 0);
                            const errObj = { type: 'peer-unavailable', message: 'Raum nicht gefunden' };
                            conn._emit('error', errObj);
                            this._emit('error', errObj);
                        }
                    }, 8000);
                } else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !conn.open) {
                    conn._clearTimers();
                    conn._destroyed = true;
                    this._removeChannel(channel, 0);
                    const errObj = { type: 'network', message: err?.message || 'Verbindung fehlgeschlagen' };
                    conn._emit('error', errObj);
                    this._emit('error', errObj);
                }
            });

            return conn;
        }

        destroy() {
            if (this.destroyed) return;
            this.destroyed = true;
            this.disconnected = true;

            this._leaveTimers.forEach(t => clearTimeout(t));
            this._leaveTimers.clear();

            if (this._isHost) {
                this._conns.forEach(conn => {
                    if (this._channel && !conn._destroyed) {
                        const res = this._channel.send({
                            type: 'broadcast',
                            event: 'msg',
                            payload: { from: this.id, to: conn.peer, kind: 'CLOSE' }
                        });
                        if (res && typeof res.catch === 'function') res.catch(() => { });
                    }
                    conn._destroyed = true;
                    conn.open = false;
                });
                this._conns.clear();
            } else if (this._guestConn) {
                this._guestConn.close();
                this._guestConn = null;
            }

            if (this._channel) {
                this._removeChannel(this._channel, 60);
            }
            this._listeners = Object.create(null);
        }
    }

    window.Peer = SupabasePeer;
})();