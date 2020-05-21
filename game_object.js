SAY_TYPE_NOTHING = '1';
SAY_TYPE_NEARBY = '2';
SAY_TYPE_ALWAYS = '3';
SAY_TYPE_CAROUSEL = '4';
SAY_TYPE_NEARBY_AND_CAROUSEL = '5';

class NPC {
  constructor(object) {
    this.x = object.x;
    this.y = object.y;
    this.col = 0;
    this.row = object.data.row;
    this.name = object.data.name;
    this.say_type = object.data.say_type;
    // Remove last empty line.
    const lines = object.data.say.trim('\n');
    if (lines.length > 0) {
      // messages = [
      //   [ str_message_line, (optional) timestamp ]
      // ]
      this.messages = lines.split('\n').map(m => [m]);
    } else {
      this.messages = [];
    }
    this.character = object.data.character;
    this.audioLevel = 0;
    this.width = map.tsize;
    this.height = map.tsize;
  }

  /**
   * @param {Hero} me: the current user.
   * @param {int} now: timestamp in ms to decide carousel type message idx.
   */
  getMessages(me, now) {
    if (this.messages.length === 0 || this.say_type == SAY_TYPE_NOTHING) {
      return this.messages;
    }

    if (this.say_type == SAY_TYPE_NEARBY ||
        this.say_type == SAY_TYPE_NEARBY_AND_CAROUSEL) {
      const dx = this.x - me.x;
      const dy = this.y - me.y;
      if (Math.hypot(dx, dy) >= map.tsize * 2) {
        return [];
      }
    }

    if (this.say_type == SAY_TYPE_CAROUSEL ||
        this.say_type == SAY_TYPE_NEARBY_AND_CAROUSEL) {
      // Tick every 4 seconds
      const idx = Math.floor(now / (1000 * 4)) % this.messages.length;
      return [this.messages[idx]];
    }
    return this.messages;
  }
}
