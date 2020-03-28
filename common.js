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

Game.stop = false;
Game.tick = function (elapsed) {
    if (Game.stop) return;
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

Game.getDrawingObjects = function () {
    var startCol = Math.floor(this.camera.x / map.tsize);
    var endCol = Math.min(map.cols - 1, startCol + (this.camera.width / map.tsize));
    var startRow = Math.floor(this.camera.y / map.tsize);
    var endRow = Math.min(map.rows - 1, startRow + (this.camera.height / map.tsize));
    var offsetX = -this.camera.x + startCol * map.tsize;
    var offsetY = -this.camera.y + startRow * map.tsize;

    var objects = [];
    for (var c = startCol; c <= endCol; c++) {
        for (var r = startRow; r <= endRow; r++) {
            var tile = map.getTile('object', c, r);
            var x = (c - startCol) * map.tsize + offsetX;
            var y = (r - startRow) * map.tsize + offsetY;
            if (tile !== null && 'undefined' !== typeof(tile_map[tile])) {
				tileX = tile_map[tile][0];
				tileY = tile_map[tile][1];
                objects.push([
                    r * 32,
                    'drawImage',
                    [
                    this.tileAtlas, // image
                    tileX * map.tsize, // source x
                    tileY * map.tsize, // source y
                    map.tsize, // source width
                    map.tsize, // source height
                    Math.round(x),  // target x
                    Math.round(y), // target y
                    map.tsize, // target width
                    map.tsize // target height
                    ]
                ]);
            }
        }
    }
    return objects;
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
    map.layers['calculate_wall_base'] = [];
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
                map.layers['calculate_wall_base'][r * map.cols + c] = r + 1;
			} else if (true === map.layers['wall'][r * map.cols + c]) {
				t = 'wall_';
				if (c > 0 && true === map.layers['wall'][ r * map.cols + c - 1]) {
					t += 'l';
				}
				if (c < map.cols - 1 && true === map.layers['wall'][ r * map.cols + c + 1]) {
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

var tile_map = {
    'screen_lt': [34,34],
    'screen_t': [36,34],
    'screen_rt': [35,34],
    'screen_l': [36,35],
    'screen_c': [38,34],
    'screen_r': [37,34],
    'screen_lb': [34,35],
    'screen_b': [37,35],
    'screen_rb': [35,35],
    'carpet1_1': [2,11],
    'carpet1_2': [3,11],
    'carpet1_3': [5,11],
    'computer_table1': [12,3],
    'computer_table2': [12,4],
	'ground': [18,1],
    'ground1': [1,0],
    'ground2': [2,0],
    'ground3': [3,0],
    'ground4': [4,0],
    'ground5': [5,0],
    'ground6': [6,0],
    'ground7': [7,0],
	'pile': [7,6],
	'wall_': [0,2],
	'wall_l': [2,2],
	'wall_r': [1,2],
	'wall_lr': [3,2],
	'roof_': [14,1],
	'roof_u': [7,2],
	'roof_r': [1,1],
	'roof_ur': [8,2],
	'roof_d': [7,1],
	'roof_ud': [10,2],
	'roof_rd': [8,1],
	'roof_urd': [6,1],
	'roof_l': [2,1],
	'roof_ul': [9,2],
	'roof_rl': [10,1],
	'roof_url': [6,2],
	'roof_dl': [9,1],
	'roof_udl': [5,2],
	'roof_rdl': [5,1],
	'roof_urdl': [15,2],
	'chair': [10, 13],
};

var tile_groups = {
    ground: [
        ['ground', 'ground1', 'ground2', 'ground3', 'ground4', 'ground5', 'ground6', 'ground7']
    ],
    object: [
        ['chair', 'carpet1_1', 'carpet1_2', 'carpet1_3'],
        ['screen_lt', 'screen_t', 'screen_rt', 'computer_table1'],
        ['screen_l', 'screen_c', 'screen_r', 'computer_table2'],
        ['screen_lb', 'screen_b', 'screen_rb'],
    ]
};

Game.drawGroundLayer = function () {
    var startCol = Math.floor(this.camera.x / map.tsize);
    var endCol = Math.min(map.cols - 1, startCol + (this.camera.width / map.tsize));
    var startRow = Math.floor(this.camera.y / map.tsize);
    var endRow = Math.min(map.rows - 1, startRow + (this.camera.height / map.tsize));
    var offsetX = -this.camera.x + startCol * map.tsize;
    var offsetY = -this.camera.y + startRow * map.tsize;

    for (var c = startCol; c <= endCol; c++) {
        for (var r = startRow; r <= endRow; r++) {
            var tile = map.getTile('ground', c, r);
            var x = (c - startCol) * map.tsize + offsetX;
            var y = (r - startRow) * map.tsize + offsetY;
            if (tile !== null) { // 'undefined' !== typeof(tile_map[tile])) { // 0 => empty tile
                if ('undefined' === typeof(tile_map[tile])) {
                    tile = 'ground';
                }
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

Game.getDrawingWalls = function () {
    var startCol = Math.floor(this.camera.x / map.tsize);
    var endCol = Math.min(map.cols - 1, startCol + (this.camera.width / map.tsize));
    var startRow = Math.floor(this.camera.y / map.tsize);
    var endRow = Math.min(map.rows - 1, startRow + (this.camera.height / map.tsize));
    var offsetX = -this.camera.x + startCol * map.tsize;
    var offsetY = -this.camera.y + startRow * map.tsize;

    var objects = [];
    for (var c = startCol; c <= endCol; c++) {
        for (var r = startRow; r <= endRow; r++) {
			var tile = map.getTile('calculate_wall', c, r);
            var x = (c - startCol) * map.tsize + offsetX;
            var y = (r - startRow) * map.tsize + offsetY;
            if (false !== tile && 'undefined' !== typeof(tile)) {
				tileX = tile_map[tile][0];
				tileY = tile_map[tile][1];
                objects.push([
                    (map.getTile('calculate_wall_base', c, r)) * 32,
                    'drawImage',
                    [
                    this.tileAtlas, // image
                    tileX * map.tsize, // source x
                    tileY * map.tsize, // source y
                    map.tsize, // source width
                    map.tsize, // source height
                    Math.round(x),  // target x
                    Math.round(y), // target y
                    map.tsize, // target width
                    map.tsize // target height
                    ]
                ]);
            }
        }
    }
    return objects;
};

