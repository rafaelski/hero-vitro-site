// ============================================================
//  FIDENZA — versão EMBED para iframe/Webflow
//  Interação: hover (mousemove) — sem clique
//  Canvas com pointer-events:none → scroll sempre livre
//  Atrator segue o mouse, decai quando o mouse sai
// ============================================================

// --- PARÂMETROS ---
let CANVAS_W = 800, CANVAS_H = 800;

let FIELD_SCALE     = 0.0018;
let FIELD_ANGLE     = 3.14159;
let FIELD_EVOLUTION = 0.0003;

let REPULSION_RADIUS   = 30;
let REPULSION_STRENGTH = 0.8;

let NUM_PARTICLES = 800;
let TRAIL_LENGTH  = 10;
let MIN_WIDTH     = 4;
let MAX_WIDTH     = 18;
let SPEED         = 4.0;
let WRAP_EDGES    = true;

let ATTRACTOR_RADIUS   = 180;
let ATTRACTOR_STRENGTH = 2.5;
let ATTRACTOR_DECAY    = 0.015; // um pouco mais rápido que o original pra hover ficar responsivo
let ORBIT_DISTANCE     = 60;
let SHOW_ATTRACTOR     = false; // sem círculo visual no embed

let DRAW_STYLE = "solid";
let SOFT_LINES = 8;
let FADE_TAIL  = true;

let PALETTE = [
  [210,  80,  50, 0.28],
  [ 60, 110, 190, 0.28],
  [220, 185,  50, 0.16],
  [190, 190, 190, 0.16],
  [ 40,  40,  40, 0.12],
];

let SAT_MULT = 1.0, LIGHT_MULT = 1.0;
let BG_COLOR = [245, 240, 228], BG_FADE = false, BG_FADE_ALPHA = 20;
let USE_FIXED_SEED = false, FIXED_SEED = 42;

// --- ESTADO ---
let attractor   = { x: 0, y: 0, strength: 0, active: false };
let particles   = [];
let spatialGrid = { cells: {}, cell: 30 };

// ============================================================
//  SETUP
// ============================================================
function setup() {
  CANVAS_W = document.body.clientWidth  || window.innerWidth;
  CANVAS_H = document.body.clientHeight || window.innerHeight;

  let cnv = createCanvas(CANVAS_W, CANVAS_H);
  cnv.elt.style.display        = 'block';
  cnv.elt.style.position       = 'absolute';
  cnv.elt.style.top            = '0';
  cnv.elt.style.left           = '0';

  // ── A chave de tudo ─────────────────────────────────────
  // O canvas é completamente transparente a eventos de mouse/touch.
  // Scroll, seleção de texto, cliques em links: tudo passa direto
  // para os elementos abaixo (o site do Webflow).
  cnv.elt.style.pointerEvents  = 'none';

  // O atrator é alimentado pelo mousemove do DOCUMENT,
  // que nunca bloqueia scroll nem interações do site.
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseleave', onMouseLeave);

  // Touch: captura posição mas sem preventDefault → scroll livre
  document.addEventListener('touchmove', onTouchMove, { passive: true });
  document.addEventListener('touchend',  onTouchEnd,  { passive: true });

  init();
  setupResizeObserver();
}

// ============================================================
//  HANDLERS DE MOUSE/TOUCH
// ============================================================
function onMouseMove(e) {
  // Converte coordenadas da janela para o canvas
  const rect = document.querySelector('canvas').getBoundingClientRect();
  attractor.x        = e.clientX - rect.left;
  attractor.y        = e.clientY - rect.top;
  attractor.strength = 1.0;
  attractor.active   = true;
}

function onMouseLeave() {
  // Mouse saiu do iframe → atrator decai naturalmente (não desliga de vez)
  // O decay no draw() já cuida disso
}

function onTouchMove(e) {
  const rect = document.querySelector('canvas').getBoundingClientRect();
  const t = e.touches[0];
  attractor.x        = t.clientX - rect.left;
  attractor.y        = t.clientY - rect.top;
  attractor.strength = 1.0;
  attractor.active   = true;
  // SEM preventDefault → scroll funciona normalmente
}

function onTouchEnd() {
  // Toque encerrado → deixa o atrator decair sozinho
}

// ============================================================
//  DRAW
// ============================================================
function draw() {
  if (BG_FADE) {
    fill(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2], BG_FADE_ALPHA);
    noStroke(); rect(0, 0, width, height);
  } else {
    background(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2]);
  }

  // Decai o atrator suavemente quando o mouse para
  if (attractor.strength > 0) {
    attractor.strength = max(0, attractor.strength - ATTRACTOR_DECAY);
    if (attractor.strength === 0) attractor.active = false;
  }

  buildSpatialGrid();
  for (let p of particles) { p.update(); p.draw(); }
}

// ============================================================
//  INIT / GRID / FIELD
// ============================================================
function init() {
  let s = USE_FIXED_SEED ? FIXED_SEED : floor(random(999999));
  randomSeed(s); noiseSeed(s);
  particles = [];
  for (let i = 0; i < NUM_PARTICLES; i++) particles.push(new Particle());
}

function buildSpatialGrid() {
  spatialGrid.cell  = max(1, REPULSION_RADIUS);
  spatialGrid.cells = {};
  for (let p of particles) {
    let cx = floor(p.x / spatialGrid.cell);
    let cy = floor(p.y / spatialGrid.cell);
    let k  = cx + ',' + cy;
    if (!spatialGrid.cells[k]) spatialGrid.cells[k] = [];
    spatialGrid.cells[k].push(p);
  }
}

function fieldAngle(x, y) {
  return noise(x * FIELD_SCALE, y * FIELD_SCALE, frameCount * FIELD_EVOLUTION) * FIELD_ANGLE;
}

// ============================================================
//  RESPONSIVIDADE
// ============================================================
function setupResizeObserver() {
  new ResizeObserver(entries => {
    for (const e of entries) {
      const nw = Math.floor(e.contentRect.width);
      const nh = Math.floor(e.contentRect.height);
      if (nw > 0 && nh > 0 && (nw !== CANVAS_W || nh !== CANVAS_H)) {
        CANVAS_W = nw; CANVAS_H = nh;
        resizeCanvas(CANVAS_W, CANVAS_H);
        init();
      }
    }
  }).observe(document.body);
}

function windowResized() {
  const nw = document.body.clientWidth  || window.innerWidth;
  const nh = document.body.clientHeight || window.innerHeight;
  if (nw !== CANVAS_W || nh !== CANVAS_H) {
    CANVAS_W = nw; CANVAS_H = nh;
    resizeCanvas(CANVAS_W, CANVAS_H);
    init();
  }
}

// ============================================================
//  CLASSE PARTÍCULA (idêntica ao original)
// ============================================================
class Particle {
  constructor() {
    this.x = random(CANVAS_W); this.y = random(CANVAS_H);
    this.wNorm = random(); this.colNorm = random();
    this.trail = []; this.vel = { x: 0, y: 0 };
  }

  update() {
    this.trail.push({ x: this.x, y: this.y });
    while (this.trail.length > TRAIL_LENGTH) this.trail.shift();

    let fieldA = fieldAngle(this.x, this.y);
    let fx = cos(fieldA), fy = sin(fieldA);

    if (attractor.active && attractor.strength > 0) {
      let dx = attractor.x - this.x, dy = attractor.y - this.y;
      let d  = sqrt(dx*dx + dy*dy);
      if (d < ATTRACTOR_RADIUS) {
        let inf = (1 - d / ATTRACTOR_RADIUS) * attractor.strength;
        if (d > 0.1) {
          let rf = (d - ORBIT_DISTANCE) / ATTRACTOR_RADIUS;
          let nx = dx/d, ny = dy/d, tx = -ny, ty = nx;
          let ax = (nx*rf + tx*0.8) * inf * ATTRACTOR_STRENGTH;
          let ay = (ny*rf + ty*0.8) * inf * ATTRACTOR_STRENGTH;
          fx = lerp(fx, ax, inf);
          fy = lerp(fy, ay, inf);
        }
      }
    }

    if (REPULSION_STRENGTH > 0) {
      let rx = 0, ry = 0;
      let cx = floor(this.x / spatialGrid.cell);
      let cy = floor(this.y / spatialGrid.cell);
      for (let ddx = -1; ddx <= 1; ddx++) for (let ddy = -1; ddy <= 1; ddy++) {
        let nb = spatialGrid.cells[(cx+ddx)+','+(cy+ddy)];
        if (!nb) continue;
        for (let o of nb) {
          if (o === this) continue;
          let ox = this.x-o.x, oy = this.y-o.y, d = sqrt(ox*ox+oy*oy);
          if (d > 0 && d < REPULSION_RADIUS) {
            let f = (1 - d/REPULSION_RADIUS) * REPULSION_STRENGTH;
            rx += ox/d*f; ry += oy/d*f;
          }
        }
      }
      fx += rx; fy += ry;
    }

    this.vel.x = lerp(this.vel.x, fx*SPEED, 0.25);
    this.vel.y = lerp(this.vel.y, fy*SPEED, 0.25);
    this.x += this.vel.x;
    this.y += this.vel.y;

    if (WRAP_EDGES) {
      let ox=0, oy=0;
      if (this.x < 0)        { ox= CANVAS_W; this.x+=CANVAS_W; }
      if (this.x > CANVAS_W) { ox=-CANVAS_W; this.x-=CANVAS_W; }
      if (this.y < 0)        { oy= CANVAS_H; this.y+=CANVAS_H; }
      if (this.y > CANVAS_H) { oy=-CANVAS_H; this.y-=CANVAS_H; }
      if (ox||oy) for (let pt of this.trail) { pt.x+=ox; pt.y+=oy; }
    } else {
      this.x = constrain(this.x, 0, CANVAS_W);
      this.y = constrain(this.y, 0, CANVAS_H);
    }
  }

  draw() {
    if (this.trail.length < 2) return;
    let [r,g,b] = pickColorFromNorm(this.colNorm);
    if      (DRAW_STYLE === "solid")    this._ribbon(this.trail, r, g, b);
    else if (DRAW_STYLE === "outlined") this._outlined(this.trail, r, g, b);
    else if (DRAW_STYLE === "soft")     this._soft(this.trail, r, g, b);
  }

  _ribbon(pts, r, g, b) {
    let left=[], right=[], n=pts.length;
    for (let i=0; i<n; i++) {
      let a = i<n-1
        ? atan2(pts[i+1].y-pts[i].y, pts[i+1].x-pts[i].x)
        : atan2(pts[i].y-pts[i-1].y, pts[i].x-pts[i-1].x);
      let perp=a+1.5708, t=FADE_TAIL?i/(n-1):1;
      let hw = lerp(MIN_WIDTH, MAX_WIDTH, this.wNorm)*t/2;
      left.push({x: pts[i].x+cos(perp)*hw, y: pts[i].y+sin(perp)*hw});
      right.push({x: pts[i].x-cos(perp)*hw, y: pts[i].y-sin(perp)*hw});
    }
    noStroke(); fill(r,g,b);
    beginShape();
    for (let p of left)            curveVertex(p.x, p.y);
    for (let p of right.reverse()) curveVertex(p.x, p.y);
    endShape(CLOSE);
  }

  _outlined(pts, r, g, b) {
    noFill(); stroke(r,g,b,180); strokeWeight(1.5);
    beginShape(); for (let p of pts) curveVertex(p.x, p.y); endShape();
  }

  _soft(pts, r, g, b) {
    let hw=lerp(MIN_WIDTH,MAX_WIDTH,this.wNorm)/2, n=pts.length;
    noFill();
    for (let li=0; li<SOFT_LINES; li++) {
      let off=map(li,0,SOFT_LINES-1,-hw,hw);
      let alpha=map(abs(off),0,hw,180,5);
      stroke(r,g,b,alpha); strokeWeight(1.0);
      beginShape();
      for (let i=0; i<n; i++) {
        let pt=pts[i], t=FADE_TAIL?i/(n-1):1;
        let a=i<n-1
          ? atan2(pts[i+1].y-pt.y, pts[i+1].x-pt.x)
          : atan2(pt.y-pts[i-1].y, pt.x-pts[i-1].x);
        curveVertex(pt.x+cos(a+1.5708)*off*t, pt.y+sin(a+1.5708)*off*t);
      }
      endShape();
    }
  }
}

// ============================================================
//  COR
// ============================================================
function pickColorFromNorm(norm) {
  let total=PALETTE.reduce((s,c)=>s+c[3],0), acc=0;
  for (let c of PALETTE) { acc+=c[3]/total; if(norm<=acc) return applyColorMods(c); }
  return applyColorMods(PALETTE[PALETTE.length-1]);
}

function applyColorMods(c) {
  let r=c[0]/255, g=c[1]/255, b=c[2]/255;
  let mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn, h=0, s=0, l=(mx+mn)/2;
  if(d>0){
    s=d/(1-Math.abs(2*l-1));
    if(mx===r) h=((g-b)/d+6)%6;
    else if(mx===g) h=(b-r)/d+2;
    else h=(r-g)/d+4;
    h/=6;
  }
  s=Math.min(1,s*SAT_MULT); l=Math.min(1,Math.max(0,l*LIGHT_MULT));
  let q=l<0.5?l*(1+s):l+s-l*s, p2=2*l-q;
  function hue(t){t=(t+1)%1;if(t<1/6)return p2+(q-p2)*6*t;if(t<1/2)return q;if(t<2/3)return p2+(q-p2)*(2/3-t)*6;return p2;}
  return [Math.round(hue(h+1/3)*255), Math.round(hue(h)*255), Math.round(hue(h-1/3)*255), c[3]];
}
