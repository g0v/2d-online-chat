const INIT_OPTIONS = {
  disableAudioLevels: false,

  // The ID of the jidesha extension for Chrome.
  desktopSharingChromeExtId: 'mbocklcggfhnbahlnepmldehdhpjfcjp',

  // Whether desktop sharing should be disabled on Chrome.
  desktopSharingChromeDisabled: false,

  // The media sources to use when using screen sharing with the Chrome
  // extension.
  desktopSharingChromeSources: ['screen', 'window'],

  // Required version of Chrome extension
  desktopSharingChromeMinExtVersion: '0.1',

  // Whether desktop sharing should be disabled on Firefox.
  desktopSharingFirefoxDisabled: true,
};

const initJitsiMeetJs = (
  function() {
    JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.ERROR);
    let INITIALIZED = false;
    return () => {
      if (INITIALIZED) return;
      JitsiMeetJS.init(INIT_OPTIONS);
      INITIALIZED = true;
    };
  }
)();

/**
 * A class to handle Jitsi connection of a room.
 */
class JitsiConnection {
  constructor() {
    this.connection = null;
    this.room = null;
    this.cameraTrack = null;
  }

  initConnection(onConnectionSuccess, onConnectionFailed) {
    initJitsiMeetJs();

    if (this.conenction) {
      // TODO(stimim): check if connection is still alive.
      return;
    }

    const options = {
      hosts: {
        domain: 'jitsi.jothon.online',
        muc: 'conference.jitsi.jothon.online',
        focus: 'focus.jitsi.jothon.online',
      },
      bosh: 'wss://jitsi.jothon.online/xmpp-websocket',
      websocket: 'wss://jitsi.jothon.online/xmpp-websocket',

      // The name of client node advertised in XEP-0115 'c' stanza
      clientNode: 'http://jitsi.org/jitsimeet',
    };

    this.connection = new JitsiMeetJS.JitsiConnection(null, null, options);

    // TODO(stimim): why???
    const onDisconnected = () => {
      this.connection.removeEventListener(
          JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
          onConnectionSuccess);
      this.connection.removeEventListener(
          JitsiMeetJS.events.connection.CONNECTION_FAILED,
          onConnectionFailed);
      this.connection.removeEventListener(
          JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
          onDisconnected);
    };

    this.connection.addEventListener(
        JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
        onConnectionSuccess);
    this.connection.addEventListener(
        JitsiMeetJS.events.connection.CONNECTION_FAILED,
        onConnectionFailed);
    this.connection.addEventListener(
        JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
        onDisconnected);

    this.connection.connect();
  }

  disconnect() {
    if (this.connection) {
      this.connection.disconnect();
      this.connection = null;
    }
  }

  initConferenceRoom(roomID, displayName, participantProperty, onTrackAdded,
      onConferenceJoined) {
    console.log(roomID);
    if (this.room) {
      return;
    }
    const confOptions = {
      openBridgeChannel: true,
      confID: `jitsi.jothon.online/${roomID}`,
    };

    this.room = this.connection.initJitsiConference(roomID, confOptions);

    this.room.setDisplayName(displayName);
    this.setLocalParticipantProperty(participantProperty);
    this.room.on(JitsiMeetJS.events.conference.TRACK_ADDED, onTrackAdded);
    this.room.on(JitsiMeetJS.events.conference.TRACK_REMOVED, (track) => {
      console.log(`track removed!!! ${track}`);
    });
    this.room.on(
        JitsiMeetJS.events.conference.CONFERENCE_JOINED,
        onConferenceJoined);

    this.room.join();

    JitsiMeetJS.createLocalTracks({devices: ['audio']})
        .then(onLocalTracks);
    return this.room;
  }

  setLocalParticipantProperty(properties) {
    if (this.room) {
      for (const key in properties) {
        this.room.setLocalParticipantProperty(key, properties[key]);
      }
    }
  }

  setDisplayName(name) {
    if (this.room) {
      this.room.setDisplayName(name);
    }
  }

  /**
   * One connection can only join one room at a time.
   * Keeping the lifecycle of connection and room the same should be easier.
   */
  disconnect() {
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
    if (this.connection) {
      this.connection.disconnect();
      this.connection = null;
    }
  }
}

