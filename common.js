// From: https://mozdevs.github.io/gamedev-js-tiles/common.js
var api_url = 'https://meet.jothon.online/api/';

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
            reject('Could not load image: ' + src, key, src);
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
    document.getElementById('game').onmousemove = function(e){
        Game.mouse = [e.clientX, e.clientY];
    };
    document.getElementById('game').onmouseleave = function(e){
        Game.mouse = null;
    }
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

Game.getDrawingCustomObjects = function () {
    var objects = [];
    for (var id in Game.objects) {
        var object = Game.objects[id];
        if (object.type == 'image') {
            var image = Loader.getImage('url:' + object.data.image_url);
            if (image === null) {
                Loader.loadImage('url:' + object.data.image_url, object.data.image_url).then(function(){}, function(err, key, src){ Loader.images[key] = false; });
                continue;
            } else if (image === false) {
                continue;
            }
            if (image.width == 0 || image.height == 0) {
                continue;
            }
            var ratio = image.width / image.height
            var canvas_width = object.x2 - object.x + 32;
            var canvas_height = object.y2 - object.y + 32;
            if (canvas_height * ratio > canvas_width) {
                target_width = canvas_width;
                target_height = target_width / ratio;
            } else {
                target_height = canvas_height;
                target_width = target_height * ratio;
            }

            objects.push([
                object.y2 + 16,
                'drawImage',
                [image, 0, 0, image.width, image.height,
                (object.x + object.x2) / 2 - target_width / 2 - this.camera.x,
                (object.y + object.y2) / 2 - target_height / 2 - this.camera.y,
                target_width,
                target_height,
                ]
            ]);
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
    'tableA_1': [6,13],
    'tableA_2': [7,13],
    'tableA_3': [6,14],
    'tableA_4': [7,14],
    'bar_u': [2, 12],
    'bar_l': [2,13],
    'bar_r': [0,14],
    'bar_ul': [12,12],
    'bar_d': [13,12],
    'bar_lr': [1,14],
    'bar_ud': [3,13],
    'food_a': [3,5],
    'food_b': [3,6],
    'food_c':[4,6],
};

var tile_groups = {
    ground: [
        ['ground', 'ground1', 'ground2', 'ground3', 'ground4', 'ground5', 'ground6', 'ground7']
    ],
    object: [
        ['chair', 'carpet1_1', 'carpet1_2', 'carpet1_3', 'tableA_1', 'tableA_2', 'food_a', 'food_b', 'food_c'],
        ['screen_lt', 'screen_t', 'screen_rt', 'computer_table1', 'tableA_3', 'tableA_4'],
        ['screen_l', 'screen_c', 'screen_r', 'computer_table2', 'bar_l', 'bar_d', 'bar_lr'],
        ['screen_lb', 'screen_b', 'screen_rb', 'bar_u', 'bar_r','bar_ul', 'bar_ud'],
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

Game.getDrawingHeroes = function(){
    var objects = [];
    var heroes = [];
    for (var id in this.heroes) {
        var hero = this.heroes[id];
        heroes.push(hero);
    }
    for (var id in Game.objects) {
        var object = Game.objects[id];
        if (object.type != 'npc') continue;
        var hero = {width:32, height:32};
        hero.x = object.x;
        hero.y = object.y;
        hero.col = 0;
        hero.row = parseInt(object.data.row);
        hero.audioLevel = 0;
        hero.name = object.data.name;
        hero.messages = [];
        if (object.data.say_type == 3) {
            hero.messages = object.data.say.split("\n").map(function(e){ return [e]; });
        }
        character = object.data.character;
		if ('undefined' === typeof(hero.image)) {
            var image = Loader.getImage('hero:' + character);
            if (!image) {
                Loader.loadImage('hero:' + character, 'sprite/' + character + '.png').then();
            } else {
                hero.image = image;
            }
		}
        heroes.push(hero);
    }

	for (var hero of heroes) {
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
			col * 32, hero.row * 32, 32, 32,
			hero.screenX - hero.width / 2,
			hero.screenY - hero.height / 2,
			32, 32
            ]
		]);

		// audioLevel
		objects.push([
            hero.y,
            (function(hero, ctx){
                 var textSize = ctx.measureText(hero.name);
                 var textHeight = textSize.actualBoundingBoxAscent + textSize.actualBoundingBoxDescent;
                 ctx.fillStyle = 'rgba(255,0,0,' + hero.audioLevel + ')';
		
                 ctx.fillRect(
                     hero.screenX - textSize.width / 2,
                     hero.screenY - 20 - textHeight,
                     textSize.width,
                     textHeight
                 );

                 // name
                 ctx.font = 'normal 12px Arial';
                 ctx.textAlign = 'center';
                 ctx.strokeStyle = "black";
                 ctx.lineWidth = 3;
                 ctx.strokeText(hero.name, 
                     hero.screenX,
                     hero.screenY - 20
                 );
                 ctx.textAlign = 'center';
                 ctx.fillStyle = "white";
                 ctx.fillText(hero.name, 
                     hero.screenX,
                     hero.screenY - 20
                 );
		
                 // message
                 if (hero.messages.length) {
                     var width = 0;
                     var height = 0;
                     metric = ctx.measureText(hero.name + ':');
                     width = Math.max(width, metric.width);
                     height += metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent + 2;

                     for (var message of hero.messages) {
                         metric = ctx.measureText(message[0]);
                         width = Math.max(width, metric.width);
                         height += metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent + 2;
                     }

                     ctx.beginPath();
                     ctx.fillStyle = 'white';
                     ctx.strokeStyle = 'black';
                     ctx.lineWidth = 2;

                     var bubbleLeft = hero.screenX - width / 2 - 3;
                     var bubbleTop = hero.screenY - 20 - height - 3;
                     var bubbleRight = hero.screenX + width / 2 + 3;
                     var bubbleBottom = hero.screenY - 20;

                     var radius = 2;
                     //left-top
                     ctx.moveTo(bubbleLeft + radius, bubbleTop);
                     //right-top
                     ctx.lineTo(bubbleRight - radius, bubbleTop);
                     ctx.quadraticCurveTo(bubbleRight, bubbleTop, bubbleRight, bubbleTop + radius);
                     //right-bottom
                     ctx.lineTo(bubbleRight, bubbleBottom - radius);
                     ctx.quadraticCurveTo(bubbleRight, bubbleBottom, bubbleRight - radius, bubbleBottom);
                     //angle
                     ctx.lineTo((bubbleLeft+bubbleRight)/2 + 4, bubbleBottom);
                     ctx.lineTo((bubbleLeft+bubbleRight)/2, bubbleBottom + 4);
                     ctx.lineTo((bubbleLeft+bubbleRight)/2 - 4, bubbleBottom);

                     //left-bottom
                     ctx.lineTo(bubbleLeft + radius, bubbleBottom);
                     ctx.quadraticCurveTo(bubbleLeft, bubbleBottom, bubbleLeft, bubbleBottom -radius);
                     // back to left-top
                     ctx.lineTo(bubbleLeft, bubbleTop + radius);
                     ctx.quadraticCurveTo(bubbleLeft, bubbleTop, bubbleLeft + radius, bubbleTop);

                     ctx.fill();
                     ctx.stroke();

                     ctx.textAlign = 'left';
                     ctx.fillStyle = 'black';

                     metric = ctx.measureText(hero.name + ':');
                     height -= (metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent + 2);
                     ctx.fillText(hero.name + ':',
                             hero.screenX - width / 2,
                             hero.screenY - 20 - height - 4
                             );
                     for (var message of hero.messages) {
                         metric = ctx.measureText(message[0]);
                         height -= (metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent + 2);
                         ctx.fillText(message[0],
                                 hero.screenX - width / 2,
                                 hero.screenY - 20 - height - 4
                         );
                     }
                 }

                 // video
                 if (hero.video_dom) {
                     var videoSettings = hero.video_track.getTrack().getSettings();
                     var maxSide = Math.max(videoSettings.height, videoSettings.width);
                     var width = Math.floor(100 * videoSettings.width / maxSide);
                     var height = Math.floor(100 * videoSettings.height / maxSide);
                     ctx.drawImage(hero.video_dom,
                             hero.screenX - width / 2,
                             hero.screenY - height - 40,
                             width, height 
                     );
                 }
            }),[hero, this.ctx]]);
    }
    return objects;
};

