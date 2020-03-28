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

$.get('room.json', function(room) {
    map.layers = room;
    calculateWallLayer();
}, 'json');

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

    var width = $('body').width();
    var height = window.innerHeight;
    $('#game').attr('width', width).attr('height', height);
    this.heroes = {};
    var character = $('#character').val();
	var name = $('#name').val();
	this.heroes.me = new Hero(map, 160, 160, character, name);
    this.camera = new Camera(map, width, height);
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

Game.render = function () {
    // draw map background layer
    this.drawGroundLayer();

    var objects = [];
    objects = objects.concat(this.getDrawingObjects());
    objects = objects.concat(this.getDrawingHeroes());
    objects = objects.concat(this.getDrawingWalls());
    objects = objects.sort(function(a,b) { return a[0] - b[0]; });

    var ctx = this.ctx;
    objects.map(function(object) {
        if ('function' === typeof(object[1])) {
            object[1].apply(null, object[2]);
        } else {
            Game.ctx[object[1]].apply(Game.ctx, object[2]);
        }
    });
};
