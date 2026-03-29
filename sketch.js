// ============================================================
//  FIDENZA — versão EMBED (iframe / Webflow)
//  Baseado no sketch.js original v11
//  - Sem UI (painel, toggle, fullscreen)
//  - Canvas adapta ao container pai, não à janela
//  - Scroll da página pai funciona normalmente
//  - Clique/toque ativa o atrator
// ============================================================

// --- CANVAS ---
let CANVAS_W = 800;
let CANVAS_H = 800;

// --- FLOW FIELD ---
let FIELD_SCALE     = 0.0018;
let FIELD_ANGLE     = 3.14159;
let FIELD_EVOLUTION = 0.0003;

// --- REPULSÃO ---
let REPULSION_RADIUS   = 30;
let REPULSION_STRENGTH = 0.8;

// --- PARTÍCULAS ---
let NUM_PARTICLES = 800;
let TRAIL_LENGTH  = 10;
let MIN_WIDTH     = 4;
let MAX_WIDTH     = 18;
let SPEED         = 4.0;
let WRAP_EDGES    = true;

// --- ATRATOR ---
let ATTRACTOR_RADIUS   = 180;
let ATTRACTOR_STRENGTH = 2.5;
let ATTRACTOR_DECAY    = 0.012;
let ORBIT_DISTANCE     = 60;
let SHOW_ATTRACTOR     = true;

// --- ESTILO ---
let DRAW_STYLE = "solid";
let SOFT_LINES = 8;
let FADE_TAIL  = true;

// --- PALETA ---
let PALETTE = [
  [210,  80,  50, 0.28],
  [ 60, 110, 190, 0.28],
  [220, 185,  50, 0.16],
  [190, 190, 190, 0.16],
  [ 40,  40,  40, 0.12],
];

let SAT_MULT   = 1.0;
let LIGHT_MULT = 1.0;

// --- FUNDO ---
let BG_COLOR      = [245, 240, 228];
let BG_FADE       = false;
let BG_FADE_ALPHA = 20;

// --- SEED ---
let USE_FIXED_SEED = false;
let FIXED_SEED     = 42;

// ============================================================
//  ESTADO DO ATRATOR
// ============================================================

let attractor = {
  x: 0, y: 0,
  strength: 0,
  active: false
};

// ============================================================
//  PARTÍCULAS
// ============================================================

let particles   = [];
let spatialGrid = { cells: {}, cell: 30 };

function buildSpatialGrid() {
  spatialGrid.cell  = max(1, REPULSION_RADIUS);
  spatialGrid.cells = {};
  for (let p of particles) {
    let cx  = floor(p.x / spatialGrid.cell);
    let cy  = floor(p.y / spatialGrid.cell);
    let key = cx + ',' + cy;
    if (!spatialGrid.cells[key]) spatialGrid.cells[key] = [];
    spatialGrid.cells[key].push(p);
  }
}

// ============================================================
//  SETUP
// ============================================================

function setup() {
  CANVAS_W = document.body.clientWidth  || window.innerWidth;
  CANVAS_H = document.body.clientHeight || window.innerHeight;

  let cnv = createCanvas(CANVAS_W, CANVAS_H);

  // Canvas no fluxo normal — sem position:fixed que bloqueia scroll
  cnv.elt.style.display    = 'block';
  cnv.elt.style.position   = 'relative';
  cnv.elt.style.top        = '0';
  cnv.elt.style.left       = '0';
  cnv.elt.style.zIndex     = '0';
  // Deixa scroll vertical passar para o documento pai
  cnv.elt.style.touchAction = 'pan-y';

  init();
  setupResizeObserver();
}

// ============================================================
//  DRAW
// ============================================================

function draw() {
  if (BG_FADE) {
    fill(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2], BG_FADE_ALPHA);
    noStroke();
    rect(0, 0, width, height);
  } else {
    background(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2]);
  }

  if (attractor.strength > 0) {
    attractor.strength = max(0, attractor.strength - ATTRACTOR_DECAY);
    if (attractor.strength === 0) attractor.active = false;
  }

  if (attractor.active && SHOW_ATTRACTOR) {
    noFill();
    stroke(100, 100, 100, attractor.strength * 120);
    strokeWeight(1);
    circle(attractor.x, attractor.y, ORBIT_DISTANCE * 2);
    circle(attractor.x, attractor.y, ATTRACTOR_RADIUS * 2 * attractor.strength);
  }

  buildSpatialGrid();

  for (let p of particles) {
    p.update();
    p.draw();
  }
}

// ============================================================
//  INTERAÇÃO
// ============================================================

function mousePressed() {
  attractor.x        = mouseX;
  attractor.y        = mouseY;
  attractor.strength = 1.0;
  attractor.active   = true;
}

function mouseDragged() {
  attractor.x        = mouseX;
  attractor.y        = mouseY;
  attractor.strength = 1.0;
}

// Touch: NÃO retorna false → scroll vertical do site funciona
function touchStarted() {
  if (touches.length > 0) {
    attractor.x        = touches[0].x;
    attractor.y        = touches[0].y;
    attractor.strength = 1.0;
    attractor.active   = true;
  }
}

function touchMoved() {
  if (touches.length > 0) {
    attractor.x        = touches[0].x;
    attractor.y        = touches[0].y;
    attractor.strength = 1.0;
  }
}

// ============================================================
//  INIT
// ============================================================

function init() {
  let s = USE_FIXED_SEED ? FIXED_SEED : floor(random(999999));
  randomSeed(s);
  noiseSeed(s);
  particles = [];
  for (let i = 0; i < NUM_PARTICLES; i++) {
    particles.push(new Particle());
  }
}

// ============================================================
//  FLOW FIELD
// ============================================================

function fieldAngle(x, y) {
  let t = frameCount * FIELD_EVOLUTION;
  return noise(x * FIELD_SCALE, y * FIELD_SCALE, t) * FIELD_ANGLE;
}

// ============================================================
//  CLASSE PARTÍCULA (idêntica ao original)
// ============================================================

class Particle {
  constructor() {
    this.x       = random(CANVAS_W);
    this.y       = random(CANVAS_H);
    this.wNorm   = random();
    this.colNorm = random();
    this.trail   = [];
    this.vel     = { x: 0, y: 0 };
  }

  update() {
    this.trail.push({ x: this.x, y: this.y });
    while (this.trail.length > TRAIL_LENGTH) this.trail.shift();

    let fieldA = fieldAngle(this.x, this.y);
    let fx = cos(fieldA);
    let fy = sin(fieldA);

    if (attractor.active && attractor.strength > 0) {
      let dx = attractor.x - this.x;
      let dy = attractor.y - this.y;
      let d  = sqrt(dx * dx + dy * dy);

      if (d < ATTRACTOR_RADIUS) {
        let influence = (1 - d / ATTRACTOR_RADIUS) * attractor.strength;

        if (d > 0.1) {
          let radialForce = (d - ORBIT_DISTANCE) / ATTRACTOR_RADIUS;
          let nx = dx / d;
          let ny = dy / d;
          let tx = -ny;
          let ty =  nx;

          let ax = (nx * radialForce + tx * 0.8) * influence * ATTRACTOR_STRENGTH;
          let ay = (ny * radialForce + ty * 0.8) * influence * ATTRACTOR_STRENGTH;

          fx = lerp(fx, ax, influence);
          fy = lerp(fy, ay, influence);
        }
      }
    }

    if (REPULSION_STRENGTH > 0) {
      let rx = 0, ry = 0;
      let cellX = floor(this.x / spatialGrid.cell);
      let cellY = floor(this.y / spatialGrid.cell);
      for (let ddx = -1; ddx <= 1; ddx++) {
        for (let ddy = -1; ddy <= 1; ddy++) {
          let key = (cellX + ddx) + ',' + (cellY + ddy);
          let neighbors = spatialGrid.cells[key];
          if (!neighbors) continue;
          for (let other of neighbors) {
            if (other === this) continue;
            let ox = this.x - other.x;
            let oy = this.y - other.y;
            let d  = sqrt(ox * ox + oy * oy);
            if (d > 0 && d < REPULSION_RADIUS) {
              let force = (1 - d / REPULSION_RADIUS) * REPULSION_STRENGTH;
              rx += (ox / d) * force;
              ry += (oy / d) * force;
            }
          }
        }
      }
      fx += rx;
      fy += ry;
    }

    this.vel.x = lerp(this.vel.x, fx * SPEED, 0.25);
    this.vel.y = lerp(this.vel.y, fy * SPEED, 0.25);

    this.x += this.vel.x;
    this.y += this.vel.y;

    if (WRAP_EDGES) {
      let ox = 0, oy = 0;
      if (this.x < 0)        { ox =  CANVAS_W; this.x += CANVAS_W; }
      if (this.x > CANVAS_W) { ox = -CANVAS_W; this.x -= CANVAS_W; }
      if (this.y < 0)        { oy =  CANVAS_H; this.y += CANVAS_H; }
      if (this.y > CANVAS_H) { oy = -CANVAS_H; this.y -= CANVAS_H; }
      if (ox !== 0 || oy !== 0) {
        for (let pt of this.trail) { pt.x += ox; pt.y += oy; }
      }
    } else {
      this.x = constrain(this.x, 0, CANVAS_W);
      this.y = constrain(this.y, 0, CANVAS_H);
    }
  }

  draw() {
    if (this.trail.length < 2) return;
    let [r, g, b] = pickColorFromNorm(this.colNorm);
    let pts = this.trail;

    if (DRAW_STYLE === "solid") {
      this._drawRibbon(pts, r, g, b);
    } else if (DRAW_STYLE === "outlined") {
      noFill();
      stroke(r, g, b, 180);
      strokeWeight(1.5);
      beginShape();
      for (let p of pts) curveVertex(p.x, p.y);
      endShape();
    } else if (DRAW_STYLE === "soft") {
      this._drawSoft(pts, r, g, b);
    }
  }

  _drawRibbon(pts, r, g, b) {
    let left = [], right = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      let angle = i < n - 1
        ? atan2(pts[i+1].y - pts[i].y, pts[i+1].x - pts[i].x)
        : atan2(pts[i].y - pts[i-1].y, pts[i].x - pts[i-1].x);
      let perp  = angle + 1.5708;
      let t     = FADE_TAIL ? i / (n - 1) : 1;
      let liveW = lerp(MIN_WIDTH, MAX_WIDTH, this.wNorm);
      let hw    = liveW * t / 2;
      left.push({ x: pts[i].x + cos(perp) * hw, y: pts[i].y + sin(perp) * hw });
      right.push({ x: pts[i].x - cos(perp) * hw, y: pts[i].y - sin(perp) * hw });
    }
    noStroke();
    fill(r, g, b);
    beginShape();
    for (let p of left)            curveVertex(p.x, p.y);
    for (let p of right.reverse()) curveVertex(p.x, p.y);
    endShape(CLOSE);
  }

  _drawSoft(pts, r, g, b) {
    let liveW = lerp(MIN_WIDTH, MAX_WIDTH, this.wNorm);
    let n = pts.length, hw = liveW / 2;
    noFill();
    for (let li = 0; li < SOFT_LINES; li++) {
      let offset = map(li, 0, SOFT_LINES - 1, -hw, hw);
      let alpha  = map(abs(offset), 0, hw, 180, 5);
      stroke(r, g, b, alpha);
      strokeWeight(1.0);
      beginShape();
      for (let i = 0; i < n; i++) {
        let p = pts[i];
        let t = FADE_TAIL ? i / (n - 1) : 1;
        let angle = i < n - 1
          ? atan2(pts[i+1].y - p.y, pts[i+1].x - p.x)
          : atan2(p.y - pts[i-1].y, p.x - pts[i-1].x);
        let perp = angle + 1.5708;
        curveVertex(p.x + cos(perp) * offset * t, p.y + sin(perp) * offset * t);
      }
      endShape();
    }
  }
}

// ============================================================
//  COR
// ============================================================

function pickColorFromNorm(norm) {
  let total = PALETTE.reduce((s, c) => s + c[3], 0);
  let acc   = 0;
  for (let c of PALETTE) {
    acc += c[3] / total;
    if (norm <= acc) return applyColorMods(c);
  }
  return applyColorMods(PALETTE[PALETTE.length - 1]);
}

function applyColorMods(c) {
  let r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
  let mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0, s = 0, l = (mx + mn) / 2;
  if (d > 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (mx === r) h = ((g - b) / d + 6) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  s = Math.min(1, s * SAT_MULT);
  l = Math.min(1, Math.max(0, l * LIGHT_MULT));
  let q = l < 0.5 ? l * (1 + s) : l + s - l * s, p2 = 2 * l - q;
  function hue(t) {
    t = (t + 1) % 1;
    if (t < 1/6) return p2 + (q - p2) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p2 + (q - p2) * (2/3 - t) * 6;
    return p2;
  }
  return [Math.round(hue(h + 1/3) * 255), Math.round(hue(h) * 255), Math.round(hue(h - 1/3) * 255), c[3]];
}

// ============================================================
//  RESPONSIVIDADE
// ============================================================

function setupResizeObserver() {
  const observer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const newW = Math.floor(entry.contentRect.width);
      const newH = Math.floor(entry.contentRect.height);
      if (newW > 0 && newH > 0 && (newW !== CANVAS_W || newH !== CANVAS_H)) {
        CANVAS_W = newW;
        CANVAS_H = newH;
        resizeCanvas(CANVAS_W, CANVAS_H);
        init();
      }
    }
  });
  observer.observe(document.body);
}

function windowResized() {
  const newW = document.body.clientWidth  || window.innerWidth;
  const newH = document.body.clientHeight || window.innerHeight;
  if (newW !== CANVAS_W || newH !== CANVAS_H) {
    CANVAS_W = newW;
    CANVAS_H = newH;
    resizeCanvas(CANVAS_W, CANVAS_H);
    init();
  }
}
