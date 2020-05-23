/**
 * The core part of the game, which doesn't touch the UI.
 */
class GameCore {
  constructor(connection) {
    this.connection = connection;
    this.me = null;
    this.members = {};
    this.onMemberListChangedCallback = [];
  }

  run(context) {
    this.ctx = context;
    this.previousElapsed = 0;
    this.stop = false;

    const p = this.load();
    this.isLoad = true;
    Promise.all(p).then((loaded) => {
      this.init();
      window.requestAnimationFrame(this.tick);
    });
  }

  initCurrentUser(map, name, character) {
    this.me = new Hero(map, 160, 160, character, name);
  }

  updateMemberList() {
    if (!this.connection || !this.connection.room) return;

    let changed = false;
    const room = this.connection.room;
    const participants = room.participants;

    for (const id in participants) {
      if (!participants.hasOwnProperty(id)) continue;

      const participant = participants[id];

      if (this.members[id] === undefined) {
        const x = parseInt(participant.getProperty('left'));
        const y = parseInt(participant.getProperty('top'));
        this.members[id] = new Hero(
            map, x, y,
            participant.getProperty('character'),
            participant.getDisplayName());
        changed = true;
      }
    }

    for (const id in this.members) {
      if (!this.members.hasOwnProperty(id)) continue;
      if (!participants.hasOwnProperty(id) && id !== 'me') {
        // Somehow, this user has left, but onUserLeft is not triggered.
        delete this.members[id];
        changed = true;
      }
    }

    if (changed) {
      this.onMemberListChangedCallback.map((callback) => {
        callback(this.members);
      });
    }
  }

  updateMember(id, {name}) {
    if (name !== undefined) {
      this.members[id].name = name || 'nobody';
    }
  }

  onUserJoined(id, user) {
    addLog(`${user.getDisplayName()} joined`);
    this.updateMemberList();
  }

  onMessageReceived(id, text, timestamp, nick, other) {
    if (this.members[id] === undefined) return;
    const now = (new Date).getTime();
    if (timestamp === undefined) {
      timestamp = now;
    } else {
      timestamp = (new Date(timestamp)).getTime();
    }
    if (timestamp + 20 * 1000 < now) return;
    this.members[id].messages.push([text, timestamp + 20 * 2000]);
  }

  onUserLeft(id, user) {
    addLog(`${user.getDisplayName()} left`);
    delete this.members[id];
    this.updateMemberList();
  }

  onParticipantPropertyChanged(user, text, timestamp) {
    if (['top', 'left', 'character'].indexOf(text) === -1) {
      console.log(text);
      return;
    }
    const id = user.getId();
    if (this.members[id] === undefined) {
      console.log(`received message from unknown user: ${id}`);
    }
    if (!this.connection || !this.connection.room) {
      // Really??
      return;
    }
    const room = this.connection.room;
    const x = parseInt(room.participants[id].getProperty('left'));
    const y = parseInt(room.participants[id].getProperty('top'));
    if (!Number.isNaN(x) && !Number.isNaN(y)) {
      this.members[id].target_x = x;
      this.members[id].target_y = y;
      if (this.members[id].x === 0 && this.members[id].y === 0) {
        this.members[id].x = x;
        this.members[id].y = y;
      }
    }
    const roomCharacter = room.participants[id].getProperty('character');
    if (this.members[id].character != roomCharacter) {
      this.members[id].changeCharacter(roomCharacter);
      this.updateMemberList();
    }
  }

  onEndpointMessageReceived(participant, message) {
    if (message.type === 'teleport') {
      const id = participant.getId();
      if (this.members[id] !== undefined) {
        this.members[id].x = this.members[id].target_x = message.message[0];
        this.members[id].y = this.members[id].target_y = message.message[1];
      }
    }
  }

  onDisplayNameChanged(id, name) {
    addLog(`${this.members[id].name} changed name to ${name}`);
    if (this.members[id] !== undefined) {
      this.members[id].name = name;
    }
    this.updateMemberList();
  }

  onTrackAudioLevelChanged(id, audioLevel) {
    if (this.members[id] !== undefined) {
      this.members[id].audioLevel = audioLevel;
    }
  }

  registerOnMemberListChanged(callback) {
    this.onMemberListChangedCallback.push(callback);
  }
}
