const INITTHRESH = 70;
const PSYCHWAITTIME = 8000;
const MOTION_LINE = 1;
const MOTION_REV = 2;

let app = {
	pixelSize: 4,
  nodeDim: 15,
  numNodes: 3,
  nodeCollideThresh: 35,
	drawSquare: true,
	noiseScale: 0.1,
  thresh: 0,
  useShader: false,
  motion: MOTION_LINE,
  ns: .01
};

let saved = []; // array of PsychPixs
let nodes = []; // array of PixNodes

function setup() {
	createCanvas(640, 480);
	capture = createCapture(VIDEO);
	capture.hide();

  app.thresh = INITTHRESH;
	
  colorMode(HSB, 100);

  for (let i = 0; i < app.numNodes; i++) {
    let speed = parseInt(random(10)) % 2 == 0 ? app.pixelSize : -app.pixelSize;
    speed += parseInt(random(0, 2));
    let div = 100/app.numNodes;
    let c = color(parseInt(div*(i+1)), 50, 75);
    nodes[i] = new PixNode(app.nodeDim, random(width), random(height), app.pixelSize*2, c);
  }
}

function draw() {
  let ns = app.ns;

  saved = [];
	background(255);
  colorMode(RGB, 255);

  // Flip screen on x axis 
  push();
  scale(-1,1);
  image(capture.get(),-width,0);
  pop();

  capture.loadPixels();
  
	for (let x = 0; x < capture.width; x += app.pixelSize) {
  	for (let y = 0; y < capture.height; y += app.pixelSize) {
      let c = getLocColor(x, y);

      if (brightness(c) > app.thresh) {
        if (!saved[x]) {
          saved[x] = [];
        }

        saved[x][y] = new PsychPix(width-x-1, y);
        let node = saved[x][y].getNode();

        if (!node || node == null) {
          let div = height / nodes.length;
          let idx = null;
          for (let i = 0; i < nodes.length; i++) {
            if (y >= div*i && y < div * (i+1)) {
              idx = i;
              break;
            }
          }
          saved[x][y].setNode(nodes[idx]);
        }  
      } else {
        if (saved[x] && saved[x][y] != null) {
          saved[x][y].hide();
        }
        continue;
      }
 
      saved[x][y].setColor(c, ns);
	  }
  }

  for (let x = 0; x < capture.width; x += app.pixelSize) {
    for (let y = 0; y < capture.height; y += app.pixelSize) {
      if (saved[x] && saved[x][y]) {
        saved[x][y].display();
      }
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    nodes[i].draw();
    nodes[i].move();
  }

  for (let i = 0; i < nodes.length; i++) {
    for (let j = 0; j < nodes.length; j++) {
      if (i != j && !nodes[i].collision && !nodes[j].collision && (abs(nodes[i].location.x - nodes[j].location.x) < app.nodeCollideThresh && 
        abs(nodes[i].location.y - nodes[j].location.y) < app.nodeCollideThresh)) 
      {
        nodes[i].collide(nodes[j]);
      }
    }
  }
}

class PixNode {
  constructor(nodeDim, initX, initY, initSpeed, color) {
    this.location = createVector(initX, initY);
    this.velocity = createVector(initSpeed, initSpeed);
    this.dim = nodeDim; // w/h of visible node circle
    this.speed = initSpeed;
    this.color = color;
    this.collision = false;
    this.angle = 0;
    this.angleDir = 1;
  }
  move() {
    if (app.motion == MOTION_LINE) {
      this.location.add(this.velocity);
      
      if (this.location.x >= width) {
        this.location.x = width-1;
        this.velocity.x = -this.velocity.x - parseInt(random(-2, 2));
      }
      if (this.location.x <= 0) {
        this.location.x = 0;
        this.velocity.x = abs(this.velocity.x) + parseInt(random(-2, 2));
      }
      if (this.location.y >= height) {
        this.location.y = height - 1;
        this.velocity.y = -this.velocity.y - parseInt(random(-2, 2));
      }
      if (this.location.y <= 0) {
        this.location.y = 0;
        this.velocity.y = abs(this.velocity.y) + parseInt(random(-2, 2));
      } 
    } else if (app.motion == MOTION_REV) {
      push();
      translate(this.location.x, this.location.y);
      this.location.rotate(this.angle);  
      //rotate(this.angle);
      if (this.angleDir == 0) {
        this.angle -= 0.001;
        if (this.angle <= 0) {
          this.angleDir = 1;
          this.angle = 0;
        }
      } else {
        this.angle += 0.001;
        if (this.angle >= 1) {
          this.angleDir = 0;
          this.angle = 1;
        }
      }

      //if (this.angle >= 1) this.angle = 0;
      pop();
    }
  }
  collide(node) {
    if (app.motion == MOTION_LINE) {
      let self = this;
      let saved = createVector(this.velocity.x, this.velocity.y);

      this.velocity.set(node.velocity.x, node.velocity.y);
      node.velocity.set(saved.x, saved.y);
      node.collision = true;
      this.collision = true;

      console.log('COLLISION!');

      setTimeout(function() {
        node.collision = false;
        self.collision = false;
      }, 100);
    }
  }
  draw() {
    fill(this.color);
    noStroke();
    ellipse(this.location.x, this.location.y, this.dim, this.dim);
  }
}

class PsychPix {
  constructor(x, y){
    this.location = createVector(x, y);
    this.velocity = createVector(0, 0);
    this.add = true;
    this.amt = 10;
    this.sum = 0;
    this.node = null;
    this.color = null;
  }

  getNode() {
    return this.node;
  }

  setNode(node) {
    this.node = node;
  }

  move(){
    this.velocity = createVector(this.amt, this.amt);

    if (this.add) {
      this.location.add(this.velocity);
      this.sum += this.amt;
    } else {
      this.location.sub(this.velocity);
      this.sum -= this.amt;
    }

    if (this.sum > 100 && this.add) {
      this.add = false;
    } else if (this.sum <= 0 && !this.add) {
      this.add = true;
    }
  }
  setColor(c, ns) {
    //colorMode(HSB, 100);
    if (app.useShader) {
      c = getRGBShader(c, this.location.x, this.location.y, ns);
    }
  // c = getShaderColor(c, this.location.x, this.location.y, ns);
    this.color = c;
  }
  
  display(){
    stroke(this.color);
    strokeWeight(app.pixelSize);
    line(this.node.location.x, this.node.location.y, this.location.x, this.location.y);
  }
  hide() {

  }
}

function keyPressed() {
  for (let i = 0; i < nodes.length; i++) {
    if (keyCode == 81) {  // q
      nodes[i].velocity.x *= 2;
      nodes[i].velocity.y *= 2;
    } else if (keyCode == 87) {  //w
      nodes[i].velocity.x = parseInt(nodes[i].velocity.x / 2);
      nodes[i].velocity.y = parseInt(nodes[i].velocity.y / 2);
      if (nodes[i].velocity.x <= 0) nodes[i].velocity.x = 1;
      if (nodes[i].velocity.y <= 0) nodes[i].velocity.y = 1;
    } else if (keyCode == 90) {  //z
      app.useShader = !app.useShader;
    } else if (keyCode == 88) { // x
      if (app.motion == MOTION_LINE) {
        app.motion = MOTION_REV;
      } else if (app.motion == MOTION_REV) {
        app.motion = MOTION_LINE;
      }
    } else if (keyCode == 65) { // a
      app.ns = random(0, 1) / 100;
    }
  }
}

function drawPixel(pixelSize, drawSquare, x, y) {
  noStroke();
  if (drawSquare) {
      square(x , y, pixelSize);
    } else {
      ellipse(x, y, pixelSize, pixelSize);
    }
}

function getLocColor(x, y) {
  let loc = (x + (y*capture.width))*4;
  let r = capture.pixels[loc];
  let g = capture.pixels[loc+1];
  let b = capture.pixels[loc+2];
  return color(r, g, b);
}

function getShaderColor(c, i, j, noiseScale) {
  let h = hue(c);
  let s = saturation(c);
  let b = brightness(c);
  let noiseVal1 = noise((h+i)*noiseScale, (h+j)*noiseScale);
  let noiseVal2 = noise((s+i)*noiseScale, (s+j)*noiseScale);
  let noiseVal3 = noise((b+i)*noiseScale, (b+j)*noiseScale);
  c = color(
    (h*noiseVal1), 
    (s*noiseVal2), 
    (b*noiseVal3*2)
  );
    
  return c;
}

function getRGBShader(c, i, j, noiseScale) {
  let r = red(c);
  let g = green(c);
  let b = blue(c);

  if (noiseScale) {
    let noiseVal1 = noise((r+i)*noiseScale, (r+j)*noiseScale);
    let noiseVal2 = noise((g+i)*noiseScale, (g+j)*noiseScale);
    let noiseVal3 = noise((b+i)*noiseScale, (b+j)*noiseScale);
    c = color(
      (r*noiseVal1), 
      (g*noiseVal2), 
      (b*noiseVal3)
    );

    colorMode(HSB, 100);
    c = color(hue(c), saturation(c), brightness(c)*2);
    colorMode(RGB, 255);
  }
  return c;
}
