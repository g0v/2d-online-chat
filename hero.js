// We probably want to move "map" and moving function to another place.
// These functions is only used in 2d version.
class Hero {
  constructor(map, x, y, character, name) {
    this.map = map;
    if (Number.isNaN(x)) {
      x = 0;
    }
    if (Number.isNaN(y)) {
      y = 0;
    }
    this.target_x = this.x = x;
    this.target_y = this.y = y;
    this.audioLevel = 0;
    this.width = map.tsize;
    this.height = map.tsize;
    this.row = 0;
    this.col = 0;
    this.character = character;
    this.name = name;
    this.messages = [];

    this.loadImage();
  }

  // Pixels per second.
  // This is a little stupid...,
  // But static member variable is not standardized yet.
  get SPEED() {
    return 256; // Pixels per second
  }

  loadImage() {
    if (!this.character) return;
    const char = this.character;
    const img = Loader.getImage('hero:' + char);
    if (null !== img) {
      this.image = img;
    } else {
      Loader.loadImage(`hero:${char}`, `sprite/${char}.png`).then(
          () => {
            this.image = Loader.getImage('hero:' + char);
          },
      );
    }
  }

  getMessages(me, now) {
    return this.messages;
  }

  changeCharacter(character) {
    this.character = character;
    this.loadImage();
  }

  move(delta, dirX, dirY) {
    // move hero
    this.x += dirX * this.SPEED * delta;
    this.y += dirY * this.SPEED * delta;
    if (dirX || dirY) {
      this.col += this.SPEED * delta;
    }

    // check if we walked into a non-walkable tile
    this._collide(dirX, dirY);

    // clamp values
    const maxX = this.map.cols * this.map.tsize;
    const maxY = this.map.rows * this.map.tsize;
    this.x = Math.max(0, Math.min(this.x, maxX));
    this.y = Math.max(0, Math.min(this.y, maxY));
  }

  otherMove(delta) {
    let deltaX = 0;
    let deltaY = 0;
    let row = 0;
    if (this.target_x != this.x) {
      const dirX = (this.target_x > this.x) ? 1 : -1;
      row = (this.target_x > this.x) ? 2 : 1;
      deltaX = Math.min(
          this.SPEED * delta, Math.abs(this.target_x - this.x)) * dirX;
    } else if (this.target_y != this.y) {
      const dirY = (this.target_y > this.y) ? 1 : -1;
      deltaY = Math.min(
          this.SPEED * delta, Math.abs(this.target_y - this.y)) * dirY;
      row = (this.target_y > this.y) ? 0 : 3;
    }
    // move hero
    this.x += deltaX;
    this.y += deltaY;
    if (deltaX || deltaY) {
      this.row = row;
      this.col += Math.max(deltaX, deltaY);
    }
  }

  _collide(dirX, dirY) {
    let row;
    let col;
    // -1 in right and bottom is because image ranges from 0..63
    // and not up to 64
    const left = this.x - this.width / 2;
    const right = this.x + this.width / 2 - 1;
    const top = this.y - this.height / 2;
    const bottom = this.y + this.height / 2 - 1;

    // check for collisions on sprite sides
    const collision =
      this.map.isSolidTileAtXY(left, top) ||
      this.map.isSolidTileAtXY(right, top) ||
      this.map.isSolidTileAtXY(right, bottom) ||
      this.map.isSolidTileAtXY(left, bottom);
    if (!collision) {
      return;
    }

    if (dirY > 0) {
      row = this.map.getRow(bottom);
      this.y = -this.height / 2 + this.map.getY(row);
    } else if (dirY < 0) {
      row = this.map.getRow(top);
      this.y = this.height / 2 + this.map.getY(row + 1);
    } else if (dirX > 0) {
      col = this.map.getCol(right);
      this.x = -this.width / 2 + this.map.getX(col);
    } else if (dirX < 0) {
      col = this.map.getCol(left);
      this.x = this.width / 2 + this.map.getX(col + 1);
    }
  }
}
