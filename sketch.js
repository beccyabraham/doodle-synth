
const state = {
  ready: false,
  playing: false,
  lastMouseX: undefined,
  lastMouseY: undefined
};

const sampleRate = 44100;

let windows;
let buttons = [];


function setup() {
  createCanvas(500, 500);

  let window1 = new Window(50, 100, 400, 100);
  let window2 = new Window(50, 200, 400, 100);
  let window3 = new Window(50, 300, 400, 100);

  windows = [window1, window2, window3];

  windows.forEach((win) => win.populateBuffer());
}

function draw() {
  background("white");
  noFill();
  windows.forEach((win) => {
    rect(win.pos.x, win.pos.y, win.w, win.h);

    for (let i = 0; i < win.pixelWaveform.length; i += 1) {
      point(win.pos.x + i, win.mid + win.pixelWaveform[i]);
    }
  });
  buttons.forEach((button) => button.draw());
}

function mouseDragged() {
  windows.forEach((win) => {
    if (win.in(new Pt(mouseX, mouseY))) {
      if (state.lastMouseX && state.lastMouseY) {
        if (mouseX >= state.lastMouseX) {
          for (let i = state.lastMouseX + 1; i < mouseX; i += 1) {
            let pix = map(i, state.lastMouseX, mouseX, state.lastMouseY, mouseY);
            win.pixelWaveform[i - win.pos.x] = pix - win.mid;
          }
        } else {
          for (let i = state.lastMouseX + 1; i > mouseX; i -= 1) {
            let pix = map(i, state.lastMouseX, mouseX, state.lastMouseY, mouseY);
            win.pixelWaveform[i - win.pos.x] = pix - win.mid;
          }
        }
      }
      state.lastMouseX = mouseX;
      state.lastMouseY = mouseY;
      win.pixelWaveform[mouseX - win.pos.x] = mouseY - win.mid;
      win.updatePending = true;
    }
  });
}

function mouseMoved() {
  buttons.forEach((button) => {
    button.highlighted = button.in();
  });
}

function mouseReleased() {
  state.lastMouseX = undefined;
  state.lastMouseY = undefined;
  windows.forEach((win) => {
    if (win.updatePending) {
      win.populateBuffer();
      win.updatePending = false;
    }
  })
}

function mouseClicked() {
  if (! state.ready) {
    Tone.start().then(() => {
      state.ready = true;
    })
  }
  buttons.forEach((button) => {
    if (button.in()) {
      button.selected = ! button.selected;
      button.onClick(button.selected);
    }
  });
}

class Window {
  constructor(x, y, w, h) {
    this.pos = new Pt(x, y);
    this.w = w;
    this.h = h;
    this.mid = this.pos.y + (this.h / 2);
    this.updatePending = false;

    this.pixelWaveform = Array(w).fill(0);

    this.buffer = Tone.context.createBuffer(
      1,
      this.w,
      sampleRate
    );

    this.player = new Tone.Player(this.buffer).toDestination();
    this.player.loop = true;

    this.playButton = new CircleButton(this.pos.x + this.w + 20, this.pos.y, (play) => this.handlePlay(play));

    this.slider = createSlider(50, 1000, 440, 0);
    this.slider.position(this.pos.x + this.w + 20, this.pos.y + 20);
    this.slider.style('transform', 'rotate(270deg)');
    this.slider.style('height', '80px');
    this.slider.style('width', '80px');

    this.slider.changed(() => {
      this.handlePlay(this.playButton.selected);
    });
  }

  handlePlay(play) {
    if (play) {
      this.buffer = Tone.context.createBuffer(
        1,
        this.w,
        this.w * this.slider.value()
      );
      this.player.stop();
      this.player = new Tone.Player(this.buffer).toDestination();
      this.player.loop = true;
      this.player.fadeOut = 0.01;
      this.player.fadeIn = 0.05;
      this.populateBuffer();
      if (state.ready) {
        this.player.start();
      }
    } else {
      if (state.ready) {
        this.player.stop();
      }
    }
  }

  populateBuffer() {
    const nowBuffering = this.buffer.getChannelData(0);
    for(let i = 0; i < this.pixelWaveform.length; i++) {
      let val = this.pixelWaveform[i]
      nowBuffering[i] = val / (this.h / 2);
    }
    this.updatePending = false;
  }

  in(pt) {
    return pt.x >= this.pos.x 
      && pt.y >= this.pos.y 
      && pt.x <= (this.pos.x + this.w)
      && pt.y <= (this.pos.y + this.h);
  }
}

const buttonRadius = 10;

class CircleButton {
  constructor(x, y, onClick) {
    buttons.push(this);
    this.x = x;
    this.y = y;
    this.onClick = onClick;
    this.selected = false;
    this.highlighted = false;
  }

  draw() {
    if (this.selected) {
      fill("green");
    } else if (this.highlighted) {
      fill("gray");
    }
    circle(this.x, this.y, buttonRadius * 2);
    noFill();
  }

  in() {
    return (dist(mouseX, mouseY, this.x, this.y) < buttonRadius);
  }
}

class Pt {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}
