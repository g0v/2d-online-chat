// Stub JitsiMeetJS event constants so index.html doesn't need to change.
const JitsiMeetJS = {
  events: {
    conference: {
      USER_JOINED: 'USER_JOINED',
      MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
      USER_LEFT: 'USER_LEFT',
      PARTICIPANT_PROPERTY_CHANGED: 'PARTICIPANT_PROPERTY_CHANGED',
      ENDPOINT_MESSAGE_RECEIVED: 'ENDPOINT_MESSAGE_RECEIVED',
      DISPLAY_NAME_CHANGED: 'DISPLAY_NAME_CHANGED',
      TRACK_AUDIO_LEVEL_CHANGED: 'TRACK_AUDIO_LEVEL_CHANGED',
      TRACK_ADDED: 'TRACK_ADDED',
      TRACK_REMOVED: 'TRACK_REMOVED',
      CONFERENCE_JOINED: 'CONFERENCE_JOINED',
    },
  },
  createLocalTracks: () => Promise.resolve([]),
};

/**
 * Drop-in replacement for the Jitsi-based JitsiConnection class.
 * Uses wss://chatroom.openfun.app/ws instead.
 */
class JitsiConnection {
  constructor() {
    this.ws = null;
    this.room = null;
    this._members = {};   // keyed by userId
    this._myUserId = null;
    this._onConnectionFailed = null;
  }

  // Called by index.html before initConferenceRoom.
  // We just call onConnectionSuccess immediately — the real WS connects in initConferenceRoom.
  initConnection(onConnectionSuccess, onConnectionFailed) {
    this._onConnectionFailed = onConnectionFailed;
    setTimeout(onConnectionSuccess, 0);
  }

  // Compatibility shim — kept so index.html can set connection = wrappedConnection.connection
  get connection() { return this; }

  setLocalParticipantProperty(properties) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({type: 'set-meta', meta: properties}));
    }
  }

  setDisplayName(name) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({type: 'set-meta', meta: {name}}));
    }
  }

  initConferenceRoom(roomID, displayName, participantProperty, onTrackAdded, onConferenceJoined) {
    const members = this._members;
    const self = this;
    const handlers = {};

    const room = {
      // Proxy so callers can do: participants[id].getProperty(key) / getDisplayName()
      participants: new Proxy(members, {
        get(target, id) {
          const m = target[id];
          if (!m) return undefined;
          return {
            getProperty: (key) => (m.meta || {})[key],
            getDisplayName: () => m.username,
          };
        },
        has(target, id) { return id in target; },
        ownKeys(target) { return Object.keys(target); },
        getOwnPropertyDescriptor(target, id) {
          if (id in target) return {enumerable: true, configurable: true, value: target[id]};
        },
      }),
      on(eventName, handler) { handlers[eventName] = handler; },
      sendTextMessage(text) {
        if (!self.ws || self.ws.readyState !== WebSocket.OPEN) return;
        self.ws.send(JSON.stringify({type: 'say', payload: {type: 'chat', message: text}}));
      },
      broadcastEndpointMessage(msg) {
        if (!self.ws || self.ws.readyState !== WebSocket.OPEN) return;
        self.ws.send(JSON.stringify({type: 'say', payload: msg}));
      },
      setLocalParticipantProperty(key, value) {
        if (!self.ws || self.ws.readyState !== WebSocket.OPEN) return;
        const meta = {};
        meta[key] = value;
        self.ws.send(JSON.stringify({type: 'set-meta', meta}));
      },
      getParticipantCount() {
        return Object.keys(members).length;
      },
    };

    this.room = room;

    const ws = new WebSocket('wss://chatroom.openfun.app/ws');
    this.ws = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join',
        room: roomID,
        username: displayName,
        meta: participantProperty,
      }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'joined') {
        self._myUserId = msg.userId;
        (msg.members || []).forEach((m) => {
          if (m.userId !== self._myUserId) members[m.userId] = m;
        });
        onConferenceJoined();
        // Replay chat history
        (msg.history || []).forEach((h) => {
          if (h.type === 'say' && h.payload && h.payload.type === 'chat') {
            const handler = handlers[JitsiMeetJS.events.conference.MESSAGE_RECEIVED];
            if (handler) {
              const ts = h.timestamp ? new Date(h.timestamp).getTime() : undefined;
              handler(h.userId, h.payload.message, ts, h.username, {});
            }
          }
        });

      } else if (msg.type === 'user-joined') {
        members[msg.userId] = {userId: msg.userId, username: msg.username, meta: msg.meta || {}};
        const handler = handlers[JitsiMeetJS.events.conference.USER_JOINED];
        if (handler) handler(msg.userId, {getDisplayName: () => msg.username});

      } else if (msg.type === 'user-left') {
        const username = members[msg.userId] ? members[msg.userId].username : 'unknown';
        delete members[msg.userId];
        const handler = handlers[JitsiMeetJS.events.conference.USER_LEFT];
        if (handler) handler(msg.userId, {getDisplayName: () => username});

      } else if (msg.type === 'say') {
        if (msg.userId === self._myUserId) return;
        const payload = msg.payload || {};
        if (payload.type === 'chat') {
          const handler = handlers[JitsiMeetJS.events.conference.MESSAGE_RECEIVED];
          if (handler) {
            const ts = msg.timestamp ? new Date(msg.timestamp).getTime() : undefined;
            handler(msg.userId, payload.message, ts, msg.username, {});
          }
        } else {
          // teleport and any other endpoint messages
          const handler = handlers[JitsiMeetJS.events.conference.ENDPOINT_MESSAGE_RECEIVED];
          if (handler) handler({getId: () => msg.userId}, payload);
        }

      } else if (msg.type === 'meta-updated') {
        if (msg.userId === self._myUserId) return;
        if (!members[msg.userId]) {
          members[msg.userId] = {userId: msg.userId, username: msg.username || 'unknown', meta: {}};
        }
        Object.assign(members[msg.userId].meta, msg.meta || {});
        if (msg.username) members[msg.userId].username = msg.username;

        if (msg.meta) {
          // Fire PARTICIPANT_PROPERTY_CHANGED for each changed positional/appearance key
          const propHandler = handlers[JitsiMeetJS.events.conference.PARTICIPANT_PROPERTY_CHANGED];
          if (propHandler) {
            for (const key of ['top', 'left', 'character']) {
              if (msg.meta[key] !== undefined) {
                propHandler({getId: () => msg.userId}, key, undefined);
              }
            }
          }
          // Fire DISPLAY_NAME_CHANGED if name changed
          if (msg.meta.name) {
            const nameHandler = handlers[JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED];
            if (nameHandler) nameHandler(msg.userId, msg.meta.name);
          }
        }

      } else if (msg.type === 'error') {
        console.error('WS error:', msg.code);
      }
    };

    ws.onerror = () => {
      if (self._onConnectionFailed) self._onConnectionFailed();
    };

    ws.onclose = () => {
      self.room = null;
    };

    return room;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.room = null;
  }
}
