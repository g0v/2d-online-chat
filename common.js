// From: https://mozdevs.github.io/gamedev-js-tiles/common.js

var Loader = {
    images: {}
};

Loader.loadImage = function (key, src) {
    var img = new Image();

    var d = new Promise(function (resolve, reject) {
        img.onload = function () {
            this.images[key] = img;
            resolve(img);
        }.bind(this);

        img.onerror = function () {
            reject('Could not load image: ' + src);
        };
    }.bind(this));

    img.src = src;
    return d;
};

Loader.getImage = function (key) {
    return (key in this.images) ? this.images[key] : null;
};

//
// Keyboard handler
//

var Keyboard = {};

Keyboard.LEFT = 37;
Keyboard.RIGHT = 39;
Keyboard.UP = 38;
Keyboard.DOWN = 40;

Keyboard._keys = {};

Keyboard.listenForEvents = function (keys) {
    window.addEventListener('keydown', this._onKeyDown.bind(this));
    window.addEventListener('keyup', this._onKeyUp.bind(this));

    keys.forEach(function (key) {
        this._keys[key] = false;
    }.bind(this));
}

Keyboard._onKeyDown = function (event) {
    var keyCode = event.keyCode;
    if (keyCode in this._keys) {
        event.preventDefault();
        this._keys[keyCode] = true;
    }
};

Keyboard._onKeyUp = function (event) {
    var keyCode = event.keyCode;
    if (keyCode in this._keys) {
        event.preventDefault();
        this._keys[keyCode] = false;
    }
};

Keyboard.isDown = function (keyCode) {
    if (!keyCode in this._keys) {
        throw new Error('Keycode ' + keyCode + ' is not being listened to');
    }
    return this._keys[keyCode];
};

//
// Game object
//

var Game = {};

Game.run = function (context) {
    this.ctx = context;
    this.ctx.font = '14px sans-serif';
    this._previousElapsed = 0;

    var p = this.load();
    Promise.all(p).then(function (loaded) {
        this.init();
        window.requestAnimationFrame(this.tick);
    }.bind(this));
};

Game.tick = function (elapsed) {
    window.requestAnimationFrame(this.tick);

    // clear previous frame
    this.ctx.clearRect(0, 0, 512, 512);

    // compute delta time in seconds -- also cap it
    var delta = (elapsed - this._previousElapsed) / 1000.0;
    delta = Math.min(delta, 0.25); // maximum delta of 250 ms
    this._previousElapsed = elapsed;

    this.update(delta);
    this.render();
}.bind(Game);

// override these methods to create the demo
Game.init = function () {};
Game.update = function (delta) {};
Game.render = function () {};

//
// start up function
//

window.onload = function () {
    var context = document.getElementById('game').getContext('2d');
    Game.run(context);
};

Game.drawObject = function () {
    var startCol = Math.floor(this.camera.x / map.tsize);
    var endCol = startCol + (this.camera.width / map.tsize);
    var startRow = Math.floor(this.camera.y / map.tsize);
    var endRow = startRow + (this.camera.height / map.tsize);
    var offsetX = -this.camera.x + startCol * map.tsize;
    var offsetY = -this.camera.y + startRow * map.tsize;

    for (var c = startCol; c <= endCol; c++) {
        for (var r = startRow; r <= endRow; r++) {
            var tile = map.getTile('object', c, r);
            var x = (c - startCol) * map.tsize + offsetX;
            var y = (r - startRow) * map.tsize + offsetY;
            if (tile !== null && 'undefined' !== typeof(tile_map[tile])) {
				tileX = tile_map[tile][0];
				tileY = tile_map[tile][1];
                this.ctx.drawImage(
                    this.tileAtlas, // image
                    tileX * map.tsize, // source x
                    tileY * map.tsize, // source y
                    map.tsize, // source width
                    map.tsize, // source height
                    Math.round(x),  // target x
                    Math.round(y), // target y
                    map.tsize, // target width
                    map.tsize // target height
                );
            }
        }
    }
};

Game._drawGrid = function () {
	var width = map.cols * map.tsize;
    var height = map.rows * map.tsize;
    var x, y;
    this.ctx.lineWidth = 0.5;
    for (var r = 0; r < map.rows; r++) {
        x = - this.camera.x;
        y = r * map.tsize - this.camera.y;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(width, y);
        this.ctx.stroke();
    }
    for (var c = 0; c < map.cols; c++) {
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
	for (var c = map.cols - 1; c >= 0; c --) {
		for (var r = 0; r < map.rows; r ++) {
			if (true === map.layers['wall'][(r + 1) * map.cols + c]) {
				var t = 'roof_'
				if (true === map.layers['wall'][r * map.cols + c]) {
					t += 'u';
				}
				if (c < map.cols - 1 && true === map.layers['wall'][(r + 1) * map.cols + c + 1]) {
				    t += 'r';
				}
				if (true === map.layers['wall'][(r + 2) * map.cols + c]) {
					t += 'd';
				}
				if (c > 0 && true === map.layers['wall'][(r + 1) * map.cols + c - 1]) {
					t += 'l';
				}
				map.layers['calculate_wall'][r * map.cols + c] = t;
			} else if (true === map.layers['wall'][r * map.cols + c]) {
				t = 'wall_';
				if (c > 0 && true === map.layers['wall'][ r * map.cols + c - 1]) {
					t += 'l';
				}
				if (c < map.cols - 1 && true === map.layers['wall'][ r * map.cols + c + 1]) {
					t += 'r';
				}
				map.layers['calculate_wall'][r * map.cols + c] = t;
			} else {
				map.layers['calculate_wall'][r * map.cols + c] = false;
			}
		}
	}
};

