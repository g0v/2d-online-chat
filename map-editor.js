var map = {
    cols: 30,
    rows: 30,
    tsize: 32,
    layers: {ground: [], wall: [], object:[]},
    getTile: function (layer, col, row) {
        if ('undefined' === typeof(this.layers[layer])) {
            return null;
        }
        if ('undefined' === typeof(this.layers[layer][row * map.cols + col])) {
            return null;
        }
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

Game.loadSample = function(){
    $.get('room.json', function(ret) {
        map.layers = ret;
        updateLayerConfig();
    }, 'json');
};

function updateLayerConfig(){
    for (var id in map.layers) {
        if (id.match(/^calculate_/)) {
            delete(map.layers[id]);
        }
    }
    if (map.layers._cols) {
        map.cols = map.layers._cols;
    }
    if (map.layers._rows) {
        map.rows = map.layers._rows;
    }
    $('[name="rows"]').val(map.rows);
    $('[name="cols"]').val(map.cols);
    $('#result').val(JSON.stringify(map.layers));

    localStorage.setItem('config', JSON.stringify(map.layers));
    calculateWallLayer();
};

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

    if ('result' === $('[name="layer"]:checked').val()) {
        // check if we walked into a non-walkable tile
        this._collide(dirx, diry);
    }

    // clamp values
    var maxX = this.map.cols * this.map.tsize;
    var maxY = this.map.rows * this.map.tsize;
    this.x = Math.max(0, Math.min(this.x, maxX));
    this.y = Math.max(0, Math.min(this.y, maxY));
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
    Keyboard.SPACE = 32;
    Keyboard.listenForEvents(
        [Keyboard.LEFT, Keyboard.RIGHT, Keyboard.UP, Keyboard.DOWN, Keyboard.SPACE]);
    this.tileAtlas = Loader.getImage('tiles');

    this.heroes = {};
	this.heroes.me = new Hero(map, 160, 160, 'teachers/Headmaster fmale', 'cursor');
    this.camera = new Camera(map, 512, 512);
    this.camera.follow(this.heroes.me);
};

var prev_update_pos = null;

Game.spaceClick = function(){
    var c = Math.floor(this.heroes.me.x / 32);
    var r = Math.floor(this.heroes.me.y / 32);
    if ($('[name="layer"]:checked').val() == 'wall') {
        map.layers['wall'][r * map.cols + c] = !map.layers['wall'][r * map.cols + c];
        updateLayerConfig();
    } else if ($('.map-object.choosed').length) {
        var layer = $('[name="layer"]:checked').val();
        if (map.layers[layer][r * map.cols + c] == $('.map-object.choosed').data('object')) {
            map.layers[layer][r * map.cols + c] = null;
        } else {
            map.layers[layer][r * map.cols + c] = $('.map-object.choosed').data('object');
        }
        updateLayerConfig();
    }
};

Game.update = function (delta) {
    // handle hero movement with arrow keys
    var dirx = 0;
    var diry = 0;
    var row;

    if (Keyboard.isDown(Keyboard.LEFT)) {
        dirx = -1; row = 1;
    } else if (Keyboard.isDown(Keyboard.RIGHT)) {
        dirx = 1; row = 2;
    } else if (Keyboard.isDown(Keyboard.UP)) {
        diry = -1; row = 3;
    } else if (Keyboard.isDown(Keyboard.DOWN)) {
        diry = 1; row = 0;
    } else {
        row = this.heroes.me.row;
        Game.isWayClick = false; 
    } 

    if ($('[name="layer"]:checked').val() == 'result') {
        this.heroes.me.move(delta, dirx, diry);
        this.heroes.me.row = row;
    } else {
        if ((dirx || diry) && !Game.isWayClick) {
            Game.isWayClick = true;
            this.heroes.me.x += 32 * dirx;
            this.heroes.me.x = 32 * Math.floor(this.heroes.me.x / 32) + 16;
            this.heroes.me.y += 32 * diry;
            this.heroes.me.y = 32 * Math.floor(this.heroes.me.y / 32) + 16;
            this.heroes.me.move(delta, 0, 0);
        }
    }

    if (Keyboard.isDown(Keyboard.SPACE)) {
        if (!Game.isClick) {
            Game.spaceClick();
            Game.isClick = true;
        }
    } else {
        Game.isClick = false;
    }
    this.camera.update();
};

Game.drawBlackWall = function () {
    var startCol = Math.floor(this.camera.x / map.tsize);
    var endCol = startCol + (this.camera.width / map.tsize);
    var startRow = Math.floor(this.camera.y / map.tsize);
    var endRow = startRow + (this.camera.height / map.tsize);
    var offsetX = -this.camera.x + startCol * map.tsize;
    var offsetY = -this.camera.y + startRow * map.tsize;

    for (var c = startCol; c <= endCol; c++) {
        for (var r = startRow; r <= endRow; r++) {
			var tile = map.getTile('wall', c, r);
            var x = (c - startCol) * map.tsize + offsetX;
            var y = (r - startRow) * map.tsize + offsetY;
            if (false !== tile) {
                this.ctx.fillRect(
                    Math.round(x),  // target x
                    Math.round(y), // target y
                    map.tsize, // target width
                    map.tsize // target height
                );
            }
        }
    }
};

Game.render = function () {
    // draw map background layer
    var objects = [];
    this.drawGroundLayer();
    objects = objects.concat(this.getDrawingHeroes());
    if ($('[name="layer"]:checked').val() == 'result') {
        objects = objects.concat(this.getDrawingWalls());
        objects = objects.concat(this.getDrawingObjects());
    } else if ($('[name="layer"]:checked').val() == 'ground') {
        objects = objects.concat(this.getDrawingWalls().map(function(o) { o[3] = 0.5; return o}));
        objects = objects.concat(this.getDrawingObjects().map(function(o) { o[3] = 0.5; return o}));
    } else if ($('[name="layer"]:checked').val() == 'wall') {
        objects = objects.concat(this.getDrawingWalls().map(function(o) { o[3] = 0.5; return o}));
        objects = objects.concat(this.getDrawingObjects().map(function(o) { o[3] = 0.5; return o}));
        
    } else if ($('[name="layer"]:checked').val() == 'object') {
        objects = objects.concat(this.getDrawingWalls().map(function(o) { o[3] = 0.5; return o}));
        objects = objects.concat(this.getDrawingObjects());
    }

    objects = objects.sort(function(a,b) { return a[0] - b[0]; });

    var ctx = this.ctx;
    objects.map(function(object) {
        Game.ctx.save();
        if ('number' === typeof(object[3])) {
            Game.ctx.globalAlpha = object[3];
        } else {
            Game.ctx.globalAlpha = 1;
        }
        if ('function' === typeof(object[1])) {
            object[1].apply(null, object[2]);
        } else {
            Game.ctx[object[1]].apply(Game.ctx, object[2]);
        }
        Game.ctx.restore();
    });

    if ($('[name="layer"]:checked').val() == 'wall') {
        this.drawBlackWall();
    }
    this._drawGrid();
};
