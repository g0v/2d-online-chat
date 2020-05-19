Game.loadSample = function() {
  $.get('room.json', function(ret) {
    map.layers = ret;
    updateLayerConfig();
  }, 'json');
};

function updateLayerConfig() {
  for (const id in map.layers) {
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

Game.load = function() {
  return [
    Loader.loadImage('tiles', 'sprite/open_tileset.png'),
  ];
};

Game.init = function() {
  Keyboard.SPACE = 32;
  Keyboard.listenForEvents([
    Keyboard.LEFT, Keyboard.RIGHT, Keyboard.UP, Keyboard.DOWN,
    Keyboard.SPACE]);
  this.tileAtlas = Loader.getImage('tiles');

  this.heroes = {};
  this.heroes.me = new Hero(
      map, 160, 160, 'teachers/Headmaster fmale', 'cursor');
  this.camera = new Camera(map, 512, 512);
  this.camera.follow(this.heroes.me);
};

Game.spaceClick = function() {
  const c = map.getCol(this.heros.me.x);
  const r = map.getRow(this.heros.me.y);
  if ($('[name="layer"]:checked').val() == 'wall') {
    map.layers['wall'][r * map.cols + c] =
        !map.layers['wall'][r * map.cols + c];
    updateLayerConfig();
  } else if ($('.map-object.choosed').length) {
    const layer = $('[name="layer"]:checked').val();
    const chosenObject = $('.map-object.choosed').data('object');
    if (map.layers[layer][r * map.cols + c] == chosenObject) {
      map.layers[layer][r * map.cols + c] = null;
    } else {
      map.layers[layer][r * map.cols + c] = chosenObject;
    }
    updateLayerConfig();
  }
};

Game.update = function(delta) {
  // handle hero movement with arrow keys
  let dirx = 0;
  let diry = 0;
  let row;

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
      this.heroes.me.x += map.tsize * dirx;
      this.heroes.me.x = map.getX(map.getCol(this.heroes.me.x)) + map.tsize / 2;
      this.heroes.me.y += map.tsize * diry;
      this.heroes.me.y = map.getY(map.getRow(this.heroes.me.y)) + map.tsize / 2;
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

Game.drawBlackWall = function() {
  const startCol = Math.floor(this.camera.x / map.tsize);
  const endCol = startCol + (this.camera.width / map.tsize);
  const startRow = Math.floor(this.camera.y / map.tsize);
  const endRow = startRow + (this.camera.height / map.tsize);
  const offsetX = -this.camera.x + startCol * map.tsize;
  const offsetY = -this.camera.y + startRow * map.tsize;

  for (let c = startCol; c <= endCol; c++) {
    for (let r = startRow; r <= endRow; r++) {
      const tile = map.getTile('wall', c, r);
      const x = (c - startCol) * map.tsize + offsetX;
      const y = (r - startRow) * map.tsize + offsetY;
      if (false !== tile) {
        this.ctx.fillRect(
            Math.round(x), // target x
            Math.round(y), // target y
            map.tsize, // target width
            map.tsize, // target height
        );
      }
    }
  }
};

Game.render = function() {
  // draw map background layer
  let objects = [];
  this.drawGroundLayer();
  objects = objects.concat(this.getDrawingHeroes());
  if ($('[name="layer"]:checked').val() == 'result') {
    objects = objects.concat(this.getDrawingWalls());
    objects = objects.concat(this.getDrawingObjects());
  } else if ($('[name="layer"]:checked').val() == 'ground') {
    objects = objects.concat(this.getDrawingWalls().map(function(o) {
      o[3] = 0.5; return o;
    }));
    objects = objects.concat(this.getDrawingObjects().map(function(o) {
      o[3] = 0.5; return o;
    }));
  } else if ($('[name="layer"]:checked').val() == 'wall') {
    objects = objects.concat(this.getDrawingWalls().map(function(o) {
      o[3] = 0.5; return o;
    }));
    objects = objects.concat(this.getDrawingObjects().map(function(o) {
      o[3] = 0.5; return o;
    }));
  } else if ($('[name="layer"]:checked').val() == 'object') {
    objects = objects.concat(this.getDrawingWalls().map(function(o) {
      o[3] = 0.5; return o;
    }));
    objects = objects.concat(this.getDrawingObjects());
  }

  objects = objects.sort(function(a, b) {
    return a[0] - b[0];
  });

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
      Game.ctx[object[1]](...object[2]);
    }
    Game.ctx.restore();
  });

  if ($('[name="layer"]:checked').val() == 'wall') {
    this.drawBlackWall();
  }
  this._drawGrid();
};
