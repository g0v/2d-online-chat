/**
 * Load room data.
 *
 * @param {string} roomId value of room id.
 */
function loadRoomData(roomId) {
  $.ajax({
    url: API_URL + 'rpg/getroom?room=' + encodeURIComponent(roomId),
    success: function(ret) {
      map.version = ret.data.room_data.updated_at;
      map.layers = ret.data.room_data.data;
      if (map.layers._cols) {
        map.cols = parseInt(map.layers._cols);
      }
      if (map.layers._rows) {
        map.rows = parseInt(map.layers._rows);
      }
      if (Game.camera) {
        Game.camera.maxX = map.cols * map.tsize - Game.camera.width;
        Game.camera.maxY = map.rows * map.tsize - Game.camera.height;
      }
      Game.objects = {};
      $('#object-list').html('');
      $('.room-custom-object').remove();
      ret.data.objects.map(function(o) {
        if ('undefined' === typeof(o.data)) {
          return;
        }
        if (null === o.data) {
          return;
        }
        let text = `${o.object_id}.[${o.data.type}]`;
        if (o.data.type == 'npc') {
          text += o.data.data.name;
        } else if (o.data.type == 'image') {
          text += o.data.data.image_url.substr(0, 10) + '...';
        }

        const li = $('<li></li>').text(text).attr('title',
            JSON.stringify(o.data)).data('id', o.object_id);
        li.append($('<button type="button">EDIT</button>').addClass(
            'button-edit-object'));
        li.append($('<button type="button">DELETE</button>').addClass(
            'button-delete-object'));
        $('#object-list').append(li);
        if (null !== o.data) {
          Game.objects[o.object_id] = o.data;
        }
      });

      $('#object-count').text(ret.data.objects.length).data(ret.data.objects);
      calculateWallLayer();
    },
    error: function(XMLHttpRequest, textStatus, errorThrown) {
      $.get('room.json', function(room) {
        map.layers = room;
        calculateWallLayer();
      }, 'json');
    },
  });
};

const LOAD_FUNCTIONS = [Loader.loadImage('tiles', 'sprite/open_tileset.png')];
Game.onload = function(callback) {
  if (this.isLoad) {
    callback();
  } else {
    LOAD_FUNCTIONS.push(callback());
  }
};

Game.load = function() {
  return LOAD_FUNCTIONS;
};

Game.objects = {};
Game.init = function() {
  Keyboard.listenForEvents(
      [Keyboard.LEFT, Keyboard.RIGHT, Keyboard.UP, Keyboard.DOWN]);
  this.tileAtlas = Loader.getImage('tiles');

  const width = $('#game').width();
  const height = $('#game').height();
  $('#game').attr('width', width).attr('height', height);
  const character = $('#character').val();
  const name = $('#name').val();
  gameCore.initCurrentUser(map, name, character);
  gameCore.me.textColor = 'orange';
  this.camera = new Camera(map, width, height);
  this.camera.follow(gameCore.me);

  document.getElementById('game').onmouseup = function() {
    const x = map.getX(map.getCol(Game.mouse[0] + Game.camera.x));
    const y = map.getY(map.getRow(Game.mouse[1] + Game.camera.y));
    if (Game.mouse_click == 'add-object-point') {
      const type = $('#add-object-step-1 [name="type"]').val();
      $('#add-object-step-2 [name="x"]').val(x);
      $('#add-object-step-2 [name="y"]').val(y);
      $('#add-object-pos').text(x + ' ' + y);
      if (type == 'npc') {
        Game.mouse_click = false;
        add_object_step3_enable('preview');
        $('#button-pos').text('Click me and click the map');
      } else {
        Game.mouse_click = 'add-object-point-2';
        $('#button-pos').text('Click the right-bottom').prop('disabled', true);
      }
    } else if (Game.mouse_click == 'add-object-point-2') {
      Game.mouse_click = false;
      $('#add-object-step-2 [name="x2"]').val(x);
      $('#add-object-step-2 [name="y2"]').val(y);
      const oldXY = $('#add-object-pos').text();
      $('#add-object-pos').text(oldXY + ' to ' + x + ' ' + y);
      $('#button-pos').text(
          'Click me and click the map').prop('disabled', false);
      add_object_step3_enable('preview');
    } else {
      gameCore.me.x = x;
      gameCore.me.y = y;
      if (room) {
        room.broadcastEndpointMessage({type: 'teleport', message: [x, y]});
      }
    }
  };
};

Game.previousAskedTargetRoomID = null;
Game.previousAskedTimestamp = 0;
Game.confirmTeleport = function(targetRoomID) {
  const now = (new Date).getTime();

  const dialog = $('#confirm-teleport-dialog');
  if ((Game.previousAskedTargetRoomID === targetRoomID &&
      now < Game.previousAskedTimestamp + 60 * 1000) ||
      dialog.is(':visible')) {
    // don't span the user
    return;
  }

  console.log(`Portal triggered, going to ${targetRoomID}`);
  Game.previousAskedTimestamp = now;
  Game.previousAskedTargetRoomID = targetRoomID;

  // Enable backdrop somehow cause the UI to freeze.
  dialog.modal({backdrop: false});
  $('#target-portal-room-id').html(targetRoomID);
}

Game.pendingTask = [];
let prevUpdateTime = null;
Game.update = function(delta) {
  if (Game.pendingTask) {
    const tasks = [...Game.pendingTask];
    // Just in case a pendingTask want to add new tasks.
    Game.pendingTask = [];
    tasks.map((task) => {
      if (typeof(task) !== 'function') {
        // really?
        console.log(
            `pendingTasks should be functions, but this is: ${typeof(task)}`);
        return;
      }
      task();
    });
  }

  // handle hero movement with arrow keys
  let dirX = 0;
  let dirY = 0;
  let row;
  if (Keyboard.isDown(Keyboard.LEFT)) {
    dirX = -1; row = 1;
  } else if (Keyboard.isDown(Keyboard.RIGHT)) {
    dirX = 1; row = 2;
  } else if (Keyboard.isDown(Keyboard.UP)) {
    dirY = -1; row = 3;
  } else if (Keyboard.isDown(Keyboard.DOWN)) {
    dirY = 1; row = 0;
  } else {
    row = gameCore.me.row;
  }

  gameCore.me.move(delta, dirX, dirY);
  const now = (new Date).getTime();
  for (const id in gameCore.members) {
    if (!(gameCore.members[id] instanceof Hero)) {
      continue;
    }
    gameCore.members[id].messages = gameCore.members[id].messages.filter(
        function(message) {
          return message[1] > now;
        });
    if (id == 'me') {
      continue;
    }
    gameCore.members[id].otherMove(delta);
  }
  gameCore.me.row = row;
  this.camera.update();

  if (room) {
    let wait = 100;
    const c = room.getParticipantCount();
    if (c < 100) {
      wait = 100;
    } else {
      wait = c;
    }

    const now = (new Date).getTime();
    if (prevUpdateTime === null || now - prevUpdateTime > wait) {
      if (gameCore.me.y_sent != gameCore.me.y) {
        gameCore.me.y_sent = gameCore.me.y;
        room.setLocalParticipantProperty('top', parseInt(gameCore.me.y));
      }
      if (gameCore.me.x_sent != gameCore.me.x) {
        gameCore.me.x_sent = gameCore.me.x;
        room.setLocalParticipantProperty('left', parseInt(gameCore.me.x));
      }
      prevUpdateTime = now;
    }
  }
};

Game.render = function() {
  // draw map background layer
  this.drawGroundLayer();

  let objects = [];
  objects = objects.concat(this.getDrawingHeroes());
  objects = objects.concat(this.getDrawingWalls());
  objects = objects.concat(this.getDrawingObjects());
  objects = objects.concat(this.getDrawingCustomObjects());
  objects = objects.sort(function(a, b) {
    return a[0] - b[0];
  });

  objects.map((object) => {
    if ('function' === typeof(object[1])) {
      object[1].apply(null, object[2]);
    } else {
      this.ctx[object[1]](...object[2]);
    }
  });
  // Highlight mouse pointing cell.
  if (null !== Game.mouse && 'undefined' !== typeof(Game.mouse)) {
    const x = map.getX(map.getCol(Game.mouse[0] + this.camera.x));
    const y = map.getY(map.getRow(Game.mouse[1] + this.camera.y));
    this.ctx.strokeStyle = 'black';
    if (x < map.cols * map.tsize && y < map.rows * map.tsize) {
      this.ctx.beginPath();
      this.ctx.rect(x - this.camera.x, y - this.camera.y, map.tsize, map.tsize);
      this.ctx.stroke();
    }
  }
};

