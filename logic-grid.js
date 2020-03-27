var map = {
    cols: 30,
    rows: 30,
    tsize: 32,
    layers: {ground: [], wall: [], object:[]},
    getTile: function (layer, col, row) {
        return this.layers[layer][row * map.cols + col];
    },
    isSolidTileAtXY: function (x, y) {
        var col = Math.floor(x / this.tsize);
        var row = Math.floor(y / this.tsize);

        return this.getTile('wall', col, row);
    },
    getCol: function (x) {
        return Math.floor(x / this.tsize);
    },
    getRow: function (y) {
        return Math.floor(y / this.tsize);
    },
    getX: function (col) {
        return col * this.tsize;
    },
    getY: function (row) {
        return row * this.tsize;
    }
};

var tile_map = {
	'ground': [18,1],
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
	'roof_urdl': [17,1],
	'chair': [10, 13],
};
for (var r = 0; r < map.rows; r ++) {
    for (var c = 0; c < map.cols; c ++) {
	if (!((c == 10 || c == 0 || c == map.cols - 1) && r == 0) && (c == 10 || r == 10 || c == 0 || r == 1 || c == map.cols - 1 || r == map.rows - 1)) {
         map.layers['ground'][r * map.cols + c] = 'ground';
         map.layers['wall'][r * map.cols + c] = true;
     } else {
         map.layers['ground'][r * map.cols + c] = 'ground';
         map.layers['wall'][r * map.cols + c] = false;
     }
  }
}

map.layers['wall'][10 * map.cols + 7] = false;
map.layers['wall'][10 * map.cols + 6] = false;
map.layers['wall'][13 * map.cols + 10] = false;
map.layers['wall'][14 * map.cols + 10] = false;
map.layers['wall'][6 * map.cols + 10] = false;
map.layers['wall'][7 * map.cols + 10] = false;
map.layers['object'][8 * map.cols + 8] = 'chair';

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
calculateWallLayer();

function Camera(map, width, height) {
    this.x = 0;
    this.y = 0;
    this.width = width;
    this.height = height;
    this.maxX = map.cols * map.tsize - width;
    this.maxY = map.rows * map.tsize - height;
}

Camera.prototype.follow = function (sprite) {
    this.following = sprite;
    sprite.screenX = 0;
    sprite.screenY = 0;
};

Camera.prototype.update = function () {
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
};

function Hero(map, x, y, character, name) {
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

	if (null !== Loader.getImage('hero:' + character)) {
		this.image = Loader.getImage('hero:' + character);
	} else {
		var current_hero = this;
		Loader.loadImage('hero:' + character, 'sprite/' + character + '.png').then(function(){
			current_hero.image = Loader.getImage('hero:' + character);
		});
	}
}

Hero.SPEED = 256; // pixels per second

Hero.prototype.changeCharacter = function(character) {
	this.character = character;
	if (null !== Loader.getImage('hero:' + character)) {
		this.image = Loader.getImage('hero:' + character);
	} else {
		var current_hero = this;
		Loader.loadImage('hero:' + character, 'sprite/' + character + '.png').then(function(){
			current_hero.image = Loader.getImage('hero:' + character);
		});
	}
};

Hero.prototype.move = function (delta, dirx, diry) {
    // move hero
    this.x += dirx * Hero.SPEED * delta;
    this.y += diry * Hero.SPEED * delta;
    if (dirx || diry) {
        this.col += Hero.SPEED * delta;
    }

    // check if we walked into a non-walkable tile
    this._collide(dirx, diry);

    // clamp values
    var maxX = this.map.cols * this.map.tsize;
    var maxY = this.map.rows * this.map.tsize;
    this.x = Math.max(0, Math.min(this.x, maxX));
    this.y = Math.max(0, Math.min(this.y, maxY));
};

Hero.prototype.otherMove = function (delta) {
	var deltaX = deltaY = 0;
	var row = 0;
	if (this.target_x != this.x) {
		var dirx = (this.target_x > this.x) ? 1 : -1;
		row = (this.target_x > this.x) ? 2 : 1;
		deltaX = Math.min(Hero.SPEED * delta, Math.abs(this.target_x - this.x)) * dirx;
	} else if (this.target_y != this.y) {
		var diry = (this.target_y > this.y) ? 1 : -1;
		deltaY = Math.min(Hero.SPEED * delta, Math.abs(this.target_y - this.y)) * diry;
		row = (this.target_y > this.y) ? 0 : 3;
	}
    // move hero
    this.x += deltaX;
    this.y += deltaY;
    if (deltaX || deltaY) {
		this.row = row;
        this.col += Math.max(deltaX, deltaY);
    }
};

Hero.prototype._collide = function (dirx, diry) {
    var row, col;
    // -1 in right and bottom is because image ranges from 0..63
    // and not up to 64
    var left = this.x - this.width / 2;
    var right = this.x + this.width / 2 - 1;
    var top = this.y - this.height / 2;
    var bottom = this.y + this.height / 2 - 1;

    // check for collisions on sprite sides
    var collision =
        this.map.isSolidTileAtXY(left, top) ||
        this.map.isSolidTileAtXY(right, top) ||
        this.map.isSolidTileAtXY(right, bottom) ||
        this.map.isSolidTileAtXY(left, bottom);
    if (!collision) { return; }

    if (diry > 0) {
        row = this.map.getRow(bottom);
        this.y = -this.height / 2 + this.map.getY(row);
    }
    else if (diry < 0) {
        row = this.map.getRow(top);
        this.y = this.height / 2 + this.map.getY(row + 1);
    }
    else if (dirx > 0) {
        col = this.map.getCol(right);
        this.x = -this.width / 2 + this.map.getX(col);
    }
    else if (dirx < 0) {
        col = this.map.getCol(left);
        this.x = this.width / 2 + this.map.getX(col + 1);
    }
};

Game.load = function () {
    return [
        Loader.loadImage('tiles', 'sprite/open_tileset.png'),
    ];
};

Game.init = function () {
    Keyboard.listenForEvents(
        [Keyboard.LEFT, Keyboard.RIGHT, Keyboard.UP, Keyboard.DOWN]);
    this.tileAtlas = Loader.getImage('tiles');

    this.heroes = {};
    var character = $('#character').val();
	var name = $('#name').val();
	this.heroes.me = new Hero(map, 160, 160, character, name);
    this.camera = new Camera(map, 512, 512);
    this.camera.follow(this.heroes.me);
};

var prev_update_pos = null;
Game.update = function (delta) {
    // handle hero movement with arrow keys
    var dirx = 0;
    var diry = 0;
    var row;
    if (Keyboard.isDown(Keyboard.LEFT)) { dirx = -1; row = 1; }
    else if (Keyboard.isDown(Keyboard.RIGHT)) { dirx = 1; row = 2; }
    else if (Keyboard.isDown(Keyboard.UP)) { diry = -1; row = 3; }
    else if (Keyboard.isDown(Keyboard.DOWN)) { diry = 1; row = 0; }
    else { row = this.heroes.me.row; } 

    this.heroes.me.move(delta, dirx, diry);
	var now = (new Date).getTime();
	for (var id in this.heroes) {
		this.heroes[id].messages = this.heroes[id].messages.filter(function(message) {
			return message[1] > now;
		});
		if (id == 'me') {
			continue;
		}
		this.heroes[id].otherMove(delta);
	}
    this.heroes.me.row = row;
    this.camera.update();

	if (room) {
		if (prev_update_pos === null || (new Date).getTime() - prev_update_pos > 100) {
			if (this.heroes.me.y_sent != this.heroes.me.y) {
				this.heroes.me.y_sent = this.heroes.me.y;
				room.setLocalParticipantProperty('top', parseInt(this.heroes.me.y));
			}
			if (this.heroes.me.x_sent != this.heroes.me.x) {
				this.heroes.me.x_sent = this.heroes.me.x;
				room.setLocalParticipantProperty('left', parseInt(this.heroes.me.x));
			}
			prev_update_pos = (new Date).getTime();
		}
	}
	
};

Game.drawWall = function () {
    var startCol = Math.floor(this.camera.x / map.tsize);
    var endCol = startCol + (this.camera.width / map.tsize);
    var startRow = Math.floor(this.camera.y / map.tsize);
    var endRow = startRow + (this.camera.height / map.tsize);
    var offsetX = -this.camera.x + startCol * map.tsize;
    var offsetY = -this.camera.y + startRow * map.tsize;

    for (var c = startCol; c <= endCol; c++) {
        for (var r = startRow; r <= endRow; r++) {
			var tile = map.getTile('calculate_wall', c, r);
            var x = (c - startCol) * map.tsize + offsetX;
            var y = (r - startRow) * map.tsize + offsetY;
            if (false !== tile && 'undefined' !== typeof(tile)) {
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

Game.drawGroundLayer = function () {
    var startCol = Math.floor(this.camera.x / map.tsize);
    var endCol = startCol + (this.camera.width / map.tsize);
    var startRow = Math.floor(this.camera.y / map.tsize);
    var endRow = startRow + (this.camera.height / map.tsize);
    var offsetX = -this.camera.x + startCol * map.tsize;
    var offsetY = -this.camera.y + startRow * map.tsize;

    for (var c = startCol; c <= endCol; c++) {
        for (var r = startRow; r <= endRow; r++) {
            var tile = map.getTile('ground', c, r);
            var x = (c - startCol) * map.tsize + offsetX;
            var y = (r - startRow) * map.tsize + offsetY;
            if (tile !== null) { // 'undefined' !== typeof(tile_map[tile])) { // 0 => empty tile
				tileX = tile_map['ground'][0];
				tileY = tile_map['ground'][1];
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

Game._drawHeroes = function(){
	var hero_y = [];
	for (var id in this.heroes) {
		hero_y.push([id, this.heroes[id].y]);
	}
	hero_y.sort(function(a,b) { return a[1] - b[1]; });
	for (var id_y of hero_y) {
		var id = id_y[0];
		if ('undefined' === typeof(this.heroes[id].image)) {
			continue;
		}
		if (id != 'me') {
			this.heroes[id].screenX = this.heroes[id].x - Game.camera.x;
			this.heroes[id].screenY = this.heroes[id].y - Game.camera.y;
		}
		col = Math.floor(this.heroes[id].col / 50) % 3;
		this.ctx.drawImage(
			this.heroes[id].image,
			col * 32, this.heroes[id].row * 32, 32, 32,
			this.heroes[id].screenX - this.heroes[id].width / 2,
			this.heroes[id].screenY - this.heroes[id].height / 2,
			32, 32
		);

		// audioLevel
		this.ctx.font = '14px';
		var textSize = this.ctx.measureText(this.heroes[id].name);
		var textHeight = textSize.actualBoundingBoxAscent + textSize.actualBoundingBoxDescent;
		this.ctx.fillStyle = 'rgba(255,0,0,' + this.heroes[id].audioLevel + ')';
		
		this.ctx.fillRect(
			this.heroes[id].screenX - textSize.width / 2,
			this.heroes[id].screenY - 20 - textHeight,
			textSize.width,
			textHeight
		);

 		// name
		this.ctx.textAlign = 'center';
		this.ctx.fillStyle = 'black';
		this.ctx.fillText(this.heroes[id].name, 
			this.heroes[id].screenX,
			this.heroes[id].screenY - 20
		);
		
		// message
		if (this.heroes[id].messages.length) {
			var width = 0;
			var height = 0;
			metric = this.ctx.measureText(this.heroes[id].name + ':');
			width = Math.max(width, metric.width);
			height += metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent + 2;

			for (var message of this.heroes[id].messages) {
				metric = this.ctx.measureText(message[0]);
				width = Math.max(width, metric.width);
				height += metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent + 2;
			}

			this.ctx.beginPath();
			this.ctx.fillStyle = 'white';
			this.ctx.strokeStyle = 'black';
			this.ctx.lineWidth = 2;

			var bubbleLeft = this.heroes[id].screenX - width / 2 - 3;
			var bubbleTop = this.heroes[id].screenY - 20 - height - 3;
			var bubbleRight = this.heroes[id].screenX + width / 2 + 3;
			var bubbleBottom = this.heroes[id].screenY - 20;

			var radius = 2;
			//left-top
			this.ctx.moveTo(bubbleLeft + radius, bubbleTop);
			//right-top
			this.ctx.lineTo(bubbleRight - radius, bubbleTop);
			this.ctx.quadraticCurveTo(bubbleRight, bubbleTop, bubbleRight, bubbleTop + radius);
			//right-bottom
			this.ctx.lineTo(bubbleRight, bubbleBottom - radius);
			this.ctx.quadraticCurveTo(bubbleRight, bubbleBottom, bubbleRight - radius, bubbleBottom);
			//angle
			this.ctx.lineTo((bubbleLeft+bubbleRight)/2 + 4, bubbleBottom);
			this.ctx.lineTo((bubbleLeft+bubbleRight)/2, bubbleBottom + 4);
			this.ctx.lineTo((bubbleLeft+bubbleRight)/2 - 4, bubbleBottom);

			//left-bottom
			this.ctx.lineTo(bubbleLeft + radius, bubbleBottom);
			this.ctx.quadraticCurveTo(bubbleLeft, bubbleBottom, bubbleLeft, bubbleBottom -radius);
			// back to left-top
			this.ctx.lineTo(bubbleLeft, bubbleTop + radius);
			this.ctx.quadraticCurveTo(bubbleLeft, bubbleTop, bubbleLeft + radius, bubbleTop);

			this.ctx.fill();
			this.ctx.stroke();

			this.ctx.textAlign = 'left';
			this.ctx.fillStyle = 'black';

			metric = this.ctx.measureText(this.heroes[id].name + ':');
			height -= (metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent + 2);
			this.ctx.fillText(this.heroes[id].name + ':',
				this.heroes[id].screenX - width / 2,
				this.heroes[id].screenY - 20 - height - 4
			);
			for (var message of this.heroes[id].messages) {
				metric = this.ctx.measureText(message[0]);
				height -= (metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent + 2);
				this.ctx.fillText(message[0],
					this.heroes[id].screenX - width / 2,
					this.heroes[id].screenY - 20 - height - 4
				);
			}
		}

		// video
		if (Game.heroes[id].video_dom) {
			var videoSettings = Game.heroes[id].video_track.getTrack().getSettings();
			var maxSide = Math.max(videoSettings.height, videoSettings.width);
			var width = Math.floor(100 * videoSettings.width / maxSide);
			var height = Math.floor(100 * videoSettings.height / maxSide);
			this.ctx.drawImage(Game.heroes[id].video_dom,
				this.heroes[id].screenX - width / 2,
				this.heroes[id].screenY - height - 40,
				width, height 
			);
		}
	}
};

Game.render = function () {
    // draw map background layer
    this.drawGroundLayer();
	this.drawObject();

    // draw main character

	this._drawHeroes();

    // draw map top layer
    this.drawWall();
	//this._drawGrid();
};
