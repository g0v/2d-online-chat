// From: https://mozdevs.github.io/gamedev-js-tiles/common.js
const API_URL = 'https://meet.jothon.online/api/';

const map = {
  cols: 30,
  rows: 30,
  tsize: 32,

  layers: {ground: [], wall: [], object: []},

  getTile: function(layer, col, row) {
    if (!this.layers[layer]) {
      return null;
    }
    return this.layers[layer][row * map.cols + col];
  },

  isSolidTileAtXY: function(x, y) {
    const col = Math.floor(x / this.tsize);
    const row = Math.floor(y / this.tsize);

    return this.getTile('wall', col, row);
  },

  getCol: function(x) {
    return Math.floor(x / this.tsize);
  },

  getRow: function(y) {
    return Math.floor(y / this.tsize);
  },

  getX: function(col) {
    return col * this.tsize;
  },

  getY: function(row) {
    return row * this.tsize;
  },
};

/**
 * Represents the area that will be shown on the screen.
 */
class Camera {
  constructor(map, width, height) {
    this.map = map;
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;
    this.maxX = map.cols * map.tsize - width;
    this.maxY = map.rows * map.tsize - height;
  }

  follow(sprite) {
    this.following = sprite;
    sprite.screenX = 0;
    sprite.screenY = 0;
  }

  update() {
    // assume followed sprite should be placed at the center of the screen
    // whenever possible
    this.following.screenX = this.width / 2;
    this.following.screenY = this.height / 2;

    // make the camera follow the sprite
    this.x = this.following.x - this.width / 2;
    this.y = this.following.y - this.height / 2;
    // clamp values
    this.x = Math.max(0, Math.min(this.x, this.maxX));
    this.y = Math.max(0, Math.min(this.y, this.maxY));

    // in map corners, the sprite cannot be placed in the center of the screen
    // and we have to change its screen coordinates

    // left and right sides
    if (this.following.x < this.width / 2 ||
        this.following.x > this.maxX + this.width / 2) {
      this.following.screenX = this.following.x - this.x;
    }
    // top and bottom sides
    if (this.following.y < this.height / 2 ||
        this.following.y > this.maxY + this.height / 2) {
      this.following.screenY = this.following.y - this.y;
    }
  }

  get startCol() {
    return this.map.getCol(this.x);
  }

  get startRow() {
    return this.map.getRow(this.y);
  }

  get endCol() {
    return Math.min(this.map.cols - 1, this.map.getCol(this.x + this.width));
  }

  get endRow() {
    return Math.min(this.map.rows - 1, this.map.getRow(this.y + this.height));
  }
}

const Loader = {
  images: {},
};

Loader.loadImage = function(key, src) {
  const img = new Image();

  const d = new Promise(function(resolve, reject) {
    img.onload = function() {
      this.images[key] = img;
      resolve(img);
    }.bind(this);

    img.onerror = function() {
      reject('Could not load image: ' + src, key, src);
    };
  }.bind(this));

  img.src = src;
  return d;
};

Loader.getImage = function(key) {
  return (key in this.images) ? this.images[key] : null;
};

//
// Keyboard handler
//

const Keyboard = {};

Keyboard.LEFT = 37;
Keyboard.RIGHT = 39;
Keyboard.UP = 38;
Keyboard.DOWN = 40;

Keyboard._keys = {};

Keyboard.listenForEvents = function(keys) {
  window.addEventListener('keydown', this._onKeyDown.bind(this));
  window.addEventListener('keyup', this._onKeyUp.bind(this));

  keys.forEach(function(key) {
    this._keys[key] = false;
  }.bind(this));
};

Keyboard._onKeyDown = function(event) {
  const keyCode = event.keyCode;
  if (keyCode in this._keys) {
    event.preventDefault();
    this._keys[keyCode] = true;
  }
};

Keyboard._onKeyUp = function(event) {
  const keyCode = event.keyCode;
  if (keyCode in this._keys) {
    event.preventDefault();
    this._keys[keyCode] = false;
  }
};

Keyboard.isDown = function(keyCode) {
  if (!keyCode in this._keys) {
    throw new Error('Keycode ' + keyCode + ' is not being listened to');
  }
  return this._keys[keyCode];
};

//
// Game object
//

const Game = {};

Game.run = function(context) {
  this.ctx = context;
  this._previousElapsed = 0;

  const p = this.load();
  this.isLoad = true;
  Promise.all(p).then(function(loaded) {
    this.init();
    window.requestAnimationFrame(this.tick);
  }.bind(this));
};

Game.stop = false;
Game.tick = function(elapsed) {
  if (Game.stop) return;
  window.requestAnimationFrame(this.tick);

  // clear previous frame
  this.ctx.clearRect(0, 0, 512, 512);

  // compute delta time in seconds -- also cap it
  let delta = (elapsed - this._previousElapsed) / 1000.0;
  delta = Math.min(delta, 0.25); // maximum delta of 250 ms
  this._previousElapsed = elapsed;

  this.update(delta);
  this.render();
}.bind(Game);

// override these methods to create the demo
Game.init = function() {};
Game.update = function(delta) {};
Game.render = function() {};

//
// start up function
//

window.onload = function() {
  const context = document.getElementById('game').getContext('2d');
  document.getElementById('game').onmousemove = function(e) {
    Game.mouse = [e.offsetX, e.offsetY];
  };
  document.getElementById('game').onmouseleave = function(e) {
    Game.mouse = null;
  };
  Game.run(context);
};

Game.getDrawingObjects = function() {
  const startCol = this.camera.startCol;
  const endCol = this.camera.endCol;
  const startRow = this.camera.startRow;
  const endRow = this.camera.endRow;
  const offsetX = -this.camera.x + map.getX(startCol);
  const offsetY = -this.camera.y + map.getY(startRow);

  const objects = [];
  for (let c = startCol; c <= endCol; c++) {
    for (let r = startRow; r <= endRow; r++) {
      const tile = map.getTile('object', c, r);
      const x = (c - startCol) * map.tsize + offsetX;
      const y = (r - startRow) * map.tsize + offsetY;
      if (tile !== null && 'undefined' !== typeof(TILE_MAP[tile])) {
        tileX = TILE_MAP[tile][0];
        tileY = TILE_MAP[tile][1];
        objects.push([
          r * 32,
          'drawImage',
          [
            this.tileAtlas, // image
            tileX * map.tsize, // source x
            tileY * map.tsize, // source y
            map.tsize, // source width
            map.tsize, // source height
            Math.round(x), // target x
            Math.round(y), // target y
            map.tsize, // target width
            map.tsize, // target height
          ],
        ]);
      }
    }
  }
  return objects;
};

Game.getDrawingCustomObjects = function() {
  const objects = [];
  for (const id in Game.objects) {
    const object = Game.objects[id];
    if (object.type == 'image') {
      const image = Loader.getImage('url:' + object.data.image_url);
      if (image === null) {
        Loader.loadImage(`url:${object.data.image_url}`, object.data.image_url)
            .then(
                function() {},
                function(err, key, src) {
                  Loader.images[key] = false;
                });
        continue;
      } else if (image === false) {
        continue;
      }
      if (image.width == 0 || image.height == 0) {
        continue;
      }
      const ratio = image.width / image.height;
      const canvasWidth = object.x2 - object.x + map.tsize;
      const canvasHeight = object.y2 - object.y + map.tsize;
      let targetWidth;
      let targetHeight;
      if (canvasHeight * ratio > canvasWidth) {
        targetWidth = canvasWidth;
        targetHeight = targetWidth / ratio;
      } else {
        targetHeight = canvasHeight;
        targetWidth = targetHeight * ratio;
      }

      if ('undefined' === typeof(object.data.image_type) ||
          object.data.image_type == 0) {
        level = object.y2 + 16;
      } else {
        level = 0;
      }
      objects.push([
        level,
        'drawImage',
        [image, 0, 0, image.width, image.height,
          (object.x + object.x2) / 2 - targetWidth / 2 - this.camera.x,
          (object.y + object.y2) / 2 - targetHeight / 2 - this.camera.y,
          targetWidth,
          targetHeight,
        ],
      ]);
    } else if (object.type == 'iframe') {
      if (!$('#iframe-' + id).length) {
        const iframeDom = $('<div></div>').attr('id', 'iframe-' + id);
        iframeDom.append($('<iframe allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"></iframe>').attr('src', object.data.iframe_url).css({'margin': 0, 'padding': 0, 'border': 0, 'width': '100%', 'height': '100%', 'z-index': 10}));
        iframeDom.append($('<div></div>').css({'position': 'absolute', 'left': 0, 'top': 0, 'width': '100%', 'height': '100%', 'z-index': 15, 'cursor': 'pointer'}).addClass('iframe-div-area'));
        $('body').append(iframeDom);
      }
      const canvasWidth = object.x2 - object.x + map.tsize;
      const canvasHeight = object.y2 - object.y + map.tsize;
      $('#iframe-' + id).css({
        width: canvasWidth,
        height: canvasHeight,
        position: 'absolute',
        left: object.x - map.tsize / 2 - this.camera.x + $('#game').offset().left,
        top: object.y - map.tsize / 2 - this.camera.y + $('#game').offset().top,
        border: '0px',
        margin: '0px',
        padding: '0px',
      });
    }
  }
  return objects;
};

Game._drawGrid = function() {
  const width = map.cols * map.tsize;
  const height = map.rows * map.tsize;
  let x; let y;
  this.ctx.lineWidth = 0.5;
  for (let r = 0; r < map.rows; r++) {
    x = - this.camera.x;
    y = r * map.tsize - this.camera.y;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(width, y);
    this.ctx.stroke();
  }
  for (let c = 0; c < map.cols; c++) {
    x = c * map.tsize - this.camera.x;
    y = - this.camera.y;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(x, height);
    this.ctx.stroke();
  }
};

function calculateWallLayer() {
  map.layers['calculate_wall'] = [];
  map.layers['calculate_wall_base'] = [];
  for (let c = map.cols - 1; c >= 0; c --) {
    for (let r = 0; r < map.rows; r ++) {
      if (true === map.layers['wall'][(r + 1) * map.cols + c]) {
        let t = 'roof_';
        if (true === map.layers['wall'][r * map.cols + c]) {
          t += 'u';
        }
        if (c < map.cols - 1 &&
            true === map.layers['wall'][(r + 1) * map.cols + c + 1]) {
          t += 'r';
        }
        if (true === map.layers['wall'][(r + 2) * map.cols + c]) {
          t += 'd';
        }
        if (c > 0 && true === map.layers['wall'][(r + 1) * map.cols + c - 1]) {
          t += 'l';
        }
        map.layers['calculate_wall'][r * map.cols + c] = t;
        map.layers['calculate_wall_base'][r * map.cols + c] = r + 1;
      } else if (true === map.layers['wall'][r * map.cols + c]) {
        t = 'wall_';
        if (c > 0 && true === map.layers['wall'][r * map.cols + c - 1]) {
          t += 'l';
        }
        if (c < map.cols - 1 &&
            true === map.layers['wall'][r * map.cols + c + 1]) {
          t += 'r';
        }
        map.layers['calculate_wall'][r * map.cols + c] = t;
        map.layers['calculate_wall_base'][r * map.cols + c] = r;
      } else {
        map.layers['calculate_wall'][r * map.cols + c] = false;
      }
    }
  }
};

const TILE_MAP = {
  'screen_lt': [34, 34],
  'screen_t': [36, 34],
  'screen_rt': [35, 34],
  'screen_l': [36, 35],
  'screen_c': [38, 34],
  'screen_r': [37, 34],
  'screen_lb': [34, 35],
  'screen_b': [37, 35],
  'screen_rb': [35, 35],
  'carpet1_1': [2, 11],
  'carpet1_2': [3, 11],
  'carpet1_3': [5, 11],
  'computer_table1': [12, 3],
  'computer_table2': [12, 4],
  'ground': [18, 1],
  'ground1': [1, 0],
  'ground2': [2, 0],
  'ground3': [3, 0],
  'ground4': [4, 0],
  'ground5': [5, 0],
  'ground6': [6, 0],
  'ground7': [7, 0],
  'pile': [7, 6],
  'wall_': [0, 2],
  'wall_l': [2, 2],
  'wall_r': [1, 2],
  'wall_lr': [3, 2],
  'roof_': [14, 1],
  'roof_u': [7, 2],
  'roof_r': [1, 1],
  'roof_ur': [8, 2],
  'roof_d': [7, 1],
  'roof_ud': [10, 2],
  'roof_rd': [8, 1],
  'roof_urd': [6, 1],
  'roof_l': [2, 1],
  'roof_ul': [9, 2],
  'roof_rl': [10, 1],
  'roof_url': [6, 2],
  'roof_dl': [9, 1],
  'roof_udl': [5, 2],
  'roof_rdl': [5, 1],
  'roof_urdl': [15, 2],
  'chair': [10, 13],
  'tableA_1': [6, 13],
  'tableA_2': [7, 13],
  'tableA_3': [6, 14],
  'tableA_4': [7, 14],
  'bar_u': [2, 12],
  'bar_l': [2, 13],
  'bar_r': [0, 14],
  'bar_ul': [12, 12],
  'bar_d': [13, 12],
  'bar_lr': [1, 14],
  'bar_ud': [3, 13],
  'food_a': [3, 5],
  'food_b': [3, 6],
  'food_c': [4, 6],
};

const TILE_GROUPS = {
  ground: [
    ['ground', 'ground1', 'ground2', 'ground3', 'ground4', 'ground5', 'ground6', 'ground7'],
  ],
  object: [
    ['chair', 'carpet1_1', 'carpet1_2', 'carpet1_3', 'tableA_1', 'tableA_2', 'food_a', 'food_b', 'food_c'],
    ['screen_lt', 'screen_t', 'screen_rt', 'computer_table1', 'tableA_3', 'tableA_4'],
    ['screen_l', 'screen_c', 'screen_r', 'computer_table2', 'bar_l', 'bar_d', 'bar_lr'],
    ['screen_lb', 'screen_b', 'screen_rb', 'bar_u', 'bar_r', 'bar_ul', 'bar_ud'],
  ],
};

Game.drawGroundLayer = function() {
  const startCol = this.camera.startCol;
  const endCol = this.camera.endCol;
  const startRow = this.camera.startRow;
  const endRow = this.camera.endRow;
  const offsetX = -this.camera.x + startCol * map.tsize;
  const offsetY = -this.camera.y + startRow * map.tsize;

  for (let c = startCol; c <= endCol; c++) {
    for (let r = startRow; r <= endRow; r++) {
      let tile = map.getTile('ground', c, r);
      const x = (c - startCol) * map.tsize + offsetX;
      const y = (r - startRow) * map.tsize + offsetY;
      if (tile !== null) {
        if ('undefined' === typeof(TILE_MAP[tile])) {
          tile = 'ground';
        }
        tileX = TILE_MAP[tile][0];
        tileY = TILE_MAP[tile][1];
        this.ctx.drawImage(
            this.tileAtlas, // image
            tileX * map.tsize, // source x
            tileY * map.tsize, // source y
            map.tsize, // source width
            map.tsize, // source height
            Math.round(x), // target x
            Math.round(y), // target y
            map.tsize, // target width
            map.tsize, // target height
        );
      }
    }
  }
};

Game.getDrawingWalls = function() {
  const startCol = this.camera.startCol;
  const endCol = this.camera.endCol;
  const startRow = this.camera.startRow;
  const endRow = this.camera.endRow;
  const offsetX = -this.camera.x + startCol * map.tsize;
  const offsetY = -this.camera.y + startRow * map.tsize;

  const objects = [];
  for (let c = startCol; c <= endCol; c++) {
    for (let r = startRow; r <= endRow; r++) {
      const tile = map.getTile('calculate_wall', c, r);
      const x = (c - startCol) * map.tsize + offsetX;
      const y = (r - startRow) * map.tsize + offsetY;
      if (false !== tile && 'undefined' !== typeof(tile) && 'undefined' !== typeof(TILE_MAP[tile])) {
        tileX = TILE_MAP[tile][0];
        tileY = TILE_MAP[tile][1];
        objects.push([
          (map.getTile('calculate_wall_base', c, r)) * map.tsize,
          'drawImage',
          [
            this.tileAtlas, // image
            tileX * map.tsize, // source x
            tileY * map.tsize, // source y
            map.tsize, // source width
            map.tsize, // source height
            Math.round(x), // target x
            Math.round(y), // target y
            map.tsize, // target width
            map.tsize, // target height
          ],
        ]);
      }
    }
  }
  return objects;
};

Game.getDrawingHeroes = function() {
  const objects = [];
  // heroes includes NPC and users.
  const heroes = [];
  for (const id in this.heroes) {
    const hero = this.heroes[id];
    heroes.push(hero);
  }
  for (const id in Game.objects) {
    const object = Game.objects[id];
    if (object.type != 'npc') continue;
    const hero = {width: map.tsize, height: map.tsize};
    hero.x = object.x;
    hero.y = object.y;
    hero.col = 0;
    hero.row = parseInt(object.data.row);
    hero.audioLevel = 0;
    hero.name = object.data.name;
    hero.messages = [];
    hero.say_type = object.data.say_type;
    switch (hero.say_type) {
      case '2':
      case '5':
        {
          const w = hero.x - Game.heroes.me.x;
          const h = hero.y - Game.heroes.me.y;
          if (w * w + h * h < 64 * 64) {
            hero.messages = object.data.say.split('\n').map(function(e) {
              return [e];
            });
          }
        }
        break;
      case '3':
      case '4':
        hero.messages = object.data.say.split('\n').map(function(e) {
          return [e];
        });
    }

    hero.messages = hero.messages.map(function(message) {
      if (message[0].match(/\$people/)) {
        if (room) {
          c = room.getParticipantCount();
        } else {
          c = 1;
        }
        message[0] = message[0].replace(/\$people/, c);
      }
      return message;
    });

    character = object.data.character;
    if ('undefined' === typeof(hero.image)) {
      const image = Loader.getImage('hero:' + character);
      if (!image) {
        Loader.loadImage(`hero:${character}`, `sprite/${character}.png`).then();
      } else {
        hero.image = image;
      }
    }
    heroes.push(hero);
  }

  for (const hero of heroes) {
    if ('undefined' === typeof(hero.image)) {
      continue;
    }
    hero.screenX = hero.x - Game.camera.x;
    hero.screenY = hero.y - Game.camera.y;
    col = Math.floor(hero.col / 50) % 3;
    objects.push([
      hero.y,
      'drawImage',
      [
        hero.image,
        col * map.tsize, hero.row * map.tsize, map.tsize, map.tsize,
        hero.screenX - hero.width / 2,
        hero.screenY - hero.height / 2,
        32, 32,
      ],
    ]);

    // audioLevel
    objects.push([
      hero.y,
      (function(hero, ctx) {
        const textSize = ctx.measureText(hero.name);
        const textHeight = textSize.actualBoundingBoxAscent +
            textSize.actualBoundingBoxDescent;
        ctx.fillStyle = 'rgba(255,0,0,' + hero.audioLevel + ')';

        ctx.fillRect(
            hero.screenX - textSize.width / 2,
            hero.screenY - 20 - textHeight,
            textSize.width,
            textHeight,
        );

        // name
        ctx.font = 'normal 12px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeText(hero.name,
            hero.screenX,
            hero.screenY + 28,
        );
        ctx.textAlign = 'center';
        ctx.fillStyle = hero.textColor || 'white';
        ctx.fillText(hero.name,
            hero.screenX,
            hero.screenY + 28,
        );

        // message
        if (hero.messages.length) {
          let width = 0;
          let height = 0;
          metric = ctx.measureText(hero.name + ':');
          width = Math.max(width, metric.width);
          height += metric.actualBoundingBoxAscent +
              metric.actualBoundingBoxDescent + 2;
          let messageIdx = -1;
          const duration = 4 + (hero.messages.length % 2);
          const now = (new Date()).getTime();
          switch (hero.say_type) {
            case '4':
            case '5':
              messageIdx = Math.floor(now / (1000 * duration)) %
                  hero.messages.length;
              metric = ctx.measureText(hero.messages[messageIdx][0]);
              width = Math.max(width, metric.width);
              height += metric.actualBoundingBoxAscent +
                  metric.actualBoundingBoxDescent + 2;
              break;
            default:
              for (const message of hero.messages) {
                metric = ctx.measureText(message[0]);
                width = Math.max(width, metric.width);
                height += metric.actualBoundingBoxAscent +
                    metric.actualBoundingBoxDescent + 2;
              }
          }

          ctx.beginPath();
          ctx.fillStyle = 'white';
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 2;

          const bubbleLeft = hero.screenX - width / 2 - 3;
          const bubbleTop = hero.screenY - 20 - height - 3;
          const bubbleRight = hero.screenX + width / 2 + 3;
          const bubbleBottom = hero.screenY - 20;

          const radius = 2;
          // left-top
          ctx.moveTo(bubbleLeft + radius, bubbleTop);
          // right-top
          ctx.lineTo(bubbleRight - radius, bubbleTop);
          ctx.quadraticCurveTo(
              bubbleRight, bubbleTop, bubbleRight, bubbleTop + radius);
          // right-bottom
          ctx.lineTo(bubbleRight, bubbleBottom - radius);
          ctx.quadraticCurveTo(
              bubbleRight, bubbleBottom, bubbleRight - radius, bubbleBottom);
          // angle
          ctx.lineTo((bubbleLeft+bubbleRight)/2 + 4, bubbleBottom);
          ctx.lineTo((bubbleLeft+bubbleRight)/2, bubbleBottom + 4);
          ctx.lineTo((bubbleLeft+bubbleRight)/2 - 4, bubbleBottom);

          // left-bottom
          ctx.lineTo(bubbleLeft + radius, bubbleBottom);
          ctx.quadraticCurveTo(
              bubbleLeft, bubbleBottom, bubbleLeft, bubbleBottom -radius);
          // back to left-top
          ctx.lineTo(bubbleLeft, bubbleTop + radius);
          ctx.quadraticCurveTo(
              bubbleLeft, bubbleTop, bubbleLeft + radius, bubbleTop);

          ctx.fill();
          ctx.stroke();

          ctx.textAlign = 'left';
          ctx.fillStyle = 'black';

          metric = ctx.measureText(hero.name + ':');
          height -= (metric.actualBoundingBoxAscent +
              metric.actualBoundingBoxDescent + 2);
          ctx.fillText(hero.name + ':',
              hero.screenX - width / 2,
              hero.screenY - 20 - height - 4,
          );
          switch (hero.say_type) {
            case '4':
            case '5':
              const m = hero.messages[messageIdx];
              metric = ctx.measureText(m[0]);
              height -= (metric.actualBoundingBoxAscent +
                  metric.actualBoundingBoxDescent + 2);
              ctx.fillText(m[0],
                  hero.screenX - width / 2,
                  hero.screenY - 20 - height - 4,
              );
              break;
            default:
              for (const message of hero.messages) {
                metric = ctx.measureText(message[0]);
                height -= (metric.actualBoundingBoxAscent +
                    metric.actualBoundingBoxDescent + 2);
                ctx.fillText(message[0],
                    hero.screenX - width / 2,
                    hero.screenY - 20 - height - 4,
                );
              }
          }
        }

        // video
        if (hero.videoDom) {
          const videoSettings = hero.video_track.getTrack().getSettings();
          const maxSide = Math.max(videoSettings.height, videoSettings.width);
          const width = Math.floor(100 * videoSettings.width / maxSide);
          const height = Math.floor(100 * videoSettings.height / maxSide);
          ctx.drawImage(hero.videoDom,
              hero.screenX - width / 2,
              hero.screenY - height - 40,
              width, height,
          );
        }
      }), [hero, this.ctx]]);
  }
  return objects;
};

