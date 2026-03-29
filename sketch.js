// ============================================================
//  FIDENZA v11 — Partículas + Flow Field + Atrator
//  Sem clique: seguem o flow field
//  Com clique: atrator orbita, decai sozinho
// ============================================================

// --- CANVAS ---
let CANVAS_W = 800;
let CANVAS_H = 800;

// --- FLOW FIELD ---
let FIELD_SCALE     = 0.0018;
let FIELD_ANGLE     = 3.14159;
let FIELD_EVOLUTION = 0.0003; // quão rápido o campo muda (0=fixo, 0.001=lento, 0.01=rápido)

// --- REPULSÃO ---
let REPULSION_RADIUS   = 30;   // raio de influência entre partículas (px)
let REPULSION_STRENGTH = 0.8;  // força de repulsão (0=desligado, 2=forte)

// --- PARTÍCULAS ---
let NUM_PARTICLES  = 800;   // quantidade de partículas
let TRAIL_LENGTH   = 10;    // comprimento da cauda (passos)
let MIN_WIDTH      = 4;     // espessura mínima
let MAX_WIDTH      = 18;    // espessura máxima
let SPEED          = 4.0;   // velocidade base
let WRAP_EDGES     = true;  // atravessa bordas

// --- ATRATOR ---
let ATTRACTOR_RADIUS   = 180;  // distância de influência (px)
let ATTRACTOR_STRENGTH = 2.5;  // força de orbita
let ATTRACTOR_DECAY    = 0.012; // quão rápido enfraquece após soltar (0.005=lento, 0.03=rápido)
let ORBIT_DISTANCE     = 60;   // raio da órbita ao redor do ponto
let SHOW_ATTRACTOR     = true; // mostra círculos do atrator

// --- ESTILO ---
let DRAW_STYLE  = "solid"; // "solid" | "soft" | "outlined"
let SOFT_LINES  = 8;
let FADE_TAIL   = true;    // cauda afina na ponta

// --- PALETA ---
let PALETTE = [
  [210,  80,  50, 0.28],
  [ 60, 110, 190, 0.28],
  [220, 185,  50, 0.16],
  [190, 190, 190, 0.16],
  [ 40,  40,  40, 0.12],
];

// Saturação e brilho globais (1.0 = original)
let SAT_MULT   = 1.0;
let LIGHT_MULT = 1.0;

// Paletas prontas
const PALETTES_PRESET = {
  'clássico':      [[210,80,50,0.28],[60,110,190,0.28],[220,185,50,0.16],[190,190,190,0.16],[40,40,40,0.12]],
  'pastel':        [[255,180,180,0.25],[180,220,255,0.25],[180,255,200,0.20],[255,240,180,0.20],[220,180,255,0.10]],
  'monocromático': [[30,30,30,0.30],[80,80,80,0.25],[140,140,140,0.25],[200,200,200,0.15],[240,240,240,0.05]],
  'vibrante':      [[255,50,50,0.25],[50,200,100,0.25],[50,100,255,0.20],[255,200,0,0.20],[200,0,200,0.10]],
  'terra':         [[180,100,40,0.30],[140,80,30,0.25],[200,160,80,0.20],[100,70,40,0.15],[230,200,140,0.10]],
  'oceano':        [[20,80,140,0.30],[40,140,180,0.25],[80,200,200,0.20],[20,40,80,0.15],[160,220,230,0.10]],
};

// --- FUNDO ---
let BG_COLOR       = [245, 240, 228];
let BG_FADE        = false;
let BG_FADE_ALPHA  = 20;

// --- SEED ---
let USE_FIXED_SEED = false;
let FIXED_SEED     = 42;

// ============================================================
//  ESTADO DO ATRATOR
// ============================================================

let attractor = {
  x:        0,
  y:        0,
  strength: 0,   // força atual (decai com o tempo)
  active:   false
};

// ============================================================
//  PARTÍCULAS
// ============================================================

let particles   = [];
let panel;
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

function setup() {
  CANVAS_W = windowWidth;
  CANVAS_H = windowHeight;
  let cnv = createCanvas(CANVAS_W, CANVAS_H);
  // Canvas fica no fundo, não intercepta eventos dos botões
  cnv.elt.style.position = 'fixed';
  cnv.elt.style.top = '0';
  cnv.elt.style.left = '0';
  cnv.elt.style.zIndex = '0';
  buildUI();
  init();
}

function windowResized() {
  CANVAS_W = windowWidth;
  CANVAS_H = windowHeight;
  resizeCanvas(CANVAS_W, CANVAS_H);
}

function draw() {
  if (BG_FADE) {
    fill(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2], BG_FADE_ALPHA);
    noStroke();
    rect(0, 0, width, height);
  } else {
    background(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2]);
  }

  // Decai o atrator
  if (attractor.strength > 0) {
    attractor.strength = max(0, attractor.strength - ATTRACTOR_DECAY);
    if (attractor.strength === 0) attractor.active = false;
  }

  // Mostra cursor do atrator
  if (attractor.active && SHOW_ATTRACTOR) {
    noFill();
    stroke(100, 100, 100, attractor.strength * 120);
    strokeWeight(1);
    circle(attractor.x, attractor.y, ORBIT_DISTANCE * 2);
    circle(attractor.x, attractor.y, ATTRACTOR_RADIUS * 2 * attractor.strength);
  }

  // Reconstrói grid espacial a cada frame
  buildSpatialGrid();

  for (let p of particles) {
    p.update();
    p.draw();
  }
}

// Toque/clique ativa o atrator
function mousePressed() {
  attractor.x        = mouseX;
  attractor.y        = mouseY;
  attractor.strength = 1.0;
  attractor.active   = true;
}

// Arrastar move o atrator
function mouseDragged() {
  attractor.x        = mouseX;
  attractor.y        = mouseY;
  attractor.strength = 1.0;
}

function keyPressed() {
  if (key === 's' || key === 'S') saveCanvas('fidenza', 'png');
  if (key === 'r' || key === 'R') init();
}

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
  // Terceira dimensão do noise = tempo → campo evolui, atratores se movem
  let t = frameCount * FIELD_EVOLUTION;
  return noise(x * FIELD_SCALE, y * FIELD_SCALE, t) * FIELD_ANGLE;
}

// ============================================================
//  CLASSE PARTÍCULA
// ============================================================

class Particle {
  constructor() {
    this.x     = random(CANVAS_W);
    this.y     = random(CANVAS_H);
    this.wNorm   = random(); // [0,1] → largura ao vivo
    this.colNorm = random(); // [0,1] → cor ao vivo via paleta atual
    this.trail = []; // histórico de posições
    this.vel   = { x: 0, y: 0 };
  }

  update() {
    // Salva posição na cauda
    this.trail.push({ x: this.x, y: this.y });
    while (this.trail.length > TRAIL_LENGTH) this.trail.shift();

    // --- FORÇA DO FLOW FIELD ---
    let fieldA = fieldAngle(this.x, this.y);
    let fx = cos(fieldA);
    let fy = sin(fieldA);

    // --- FORÇA DO ATRATOR ---
    let ax = 0, ay = 0;
    if (attractor.active && attractor.strength > 0) {
      let dx   = attractor.x - this.x;
      let dy   = attractor.y - this.y;
      let d    = sqrt(dx * dx + dy * dy);

      if (d < ATTRACTOR_RADIUS) {
        // Influência: 1 perto do atrator, 0 na borda do raio
        let influence = (1 - d / ATTRACTOR_RADIUS) * attractor.strength;

        if (d > 0.1) {
          // Componente radial: puxa para ORBIT_DISTANCE
          let radialForce = (d - ORBIT_DISTANCE) / ATTRACTOR_RADIUS;
          let nx = dx / d;
          let ny = dy / d;

          // Componente tangencial: faz orbitar
          let tx = -ny;
          let ty =  nx;

          ax = (nx * radialForce + tx * 0.8) * influence * ATTRACTOR_STRENGTH;
          ay = (ny * radialForce + ty * 0.8) * influence * ATTRACTOR_STRENGTH;
        }

        // Blende field e atrator pela influência
        fx = lerp(fx, ax, influence);
        fy = lerp(fy, ay, influence);
      }
    }

    // --- REPULSÃO via grid espacial ---
    if (REPULSION_STRENGTH > 0) {
      let rx = 0, ry = 0;
      let cellX = floor(this.x / spatialGrid.cell);
      let cellY = floor(this.y / spatialGrid.cell);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          let key = (cellX + dx) + ',' + (cellY + dy);
          let neighbors = spatialGrid.cells[key];
          if (!neighbors) continue;
          for (let other of neighbors) {
            if (other === this) continue;
            let ddx = this.x - other.x;
            let ddy = this.y - other.y;
            let d   = sqrt(ddx * ddx + ddy * ddy);
            if (d > 0 && d < REPULSION_RADIUS) {
              let force = (1 - d / REPULSION_RADIUS) * REPULSION_STRENGTH;
              rx += (ddx / d) * force;
              ry += (ddy / d) * force;
            }
          }
        }
      }
      fx += rx;
      fy += ry;
    }

    // Aplica velocidade suavizada
    this.vel.x = lerp(this.vel.x, fx * SPEED, 0.25);
    this.vel.y = lerp(this.vel.y, fy * SPEED, 0.25);

    this.x += this.vel.x;
    this.y += this.vel.y;

    // Bordas
    if (WRAP_EDGES) {
      let ox = 0, oy = 0;
      if (this.x < 0)        { ox =  CANVAS_W; this.x += CANVAS_W; }
      if (this.x > CANVAS_W) { ox = -CANVAS_W; this.x -= CANVAS_W; }
      if (this.y < 0)        { oy =  CANVAS_H; this.y += CANVAS_H; }
      if (this.y > CANVAS_H) { oy = -CANVAS_H; this.y -= CANVAS_H; }
      // Desloca toda a cauda pelo mesmo offset — sem apagar
      if (ox !== 0 || oy !== 0) {
        for (let p of this.trail) { p.x += ox; p.y += oy; }
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
    let n   = pts.length;

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
      let angle = i < n-1
        ? atan2(pts[i+1].y - pts[i].y, pts[i+1].x - pts[i].x)
        : atan2(pts[i].y - pts[i-1].y, pts[i].x - pts[i-1].x);
      let perp = angle + 1.5708;
      // Fade: cauda fina, cabeça larga
      let t  = FADE_TAIL ? i / (n - 1) : 1;
      let liveW = lerp(MIN_WIDTH, MAX_WIDTH, this.wNorm);
      let hw = liveW * t / 2;
      left.push({ x: pts[i].x + cos(perp)*hw, y: pts[i].y + sin(perp)*hw });
      right.push({ x: pts[i].x - cos(perp)*hw, y: pts[i].y - sin(perp)*hw });
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
      let offset = map(li, 0, SOFT_LINES-1, -hw, hw);
      let alpha  = map(abs(offset), 0, hw, 180, 5);
      stroke(r, g, b, alpha);
      strokeWeight(1.0);
      beginShape();
      for (let i = 0; i < n; i++) {
        let p = pts[i];
        let t = FADE_TAIL ? i / (n-1) : 1;
        let angle = i < n-1
          ? atan2(pts[i+1].y - p.y, pts[i+1].x - p.x)
          : atan2(p.y - pts[i-1].y, p.x - pts[i-1].x);
        let perp = angle + 1.5708;
        curveVertex(p.x + cos(perp)*offset*t, p.y + sin(perp)*offset*t);
      }
      endShape();
    }
  }
}

// ============================================================
//  UI
// ============================================================

// Helpers de cor
function rgbToHex(r,g,b){return'#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');}
function hexToRgb(h){let r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return{r,g,b};}

function buildUI() {
  let style = document.createElement('style');
  style.textContent = `
    * { box-sizing:border-box; margin:0; padding:0; }
    body { background:#000; overflow:hidden; font-family:monospace; }
    canvas { display:block; }

    /* Botão de toggle — canto superior esquerdo, sempre visível */
    #toggle-btn {
      position:fixed; top:10px; left:10px; z-index:100;
      background:rgba(30,30,30,0.85); color:#eee;
      border:1px solid #555; padding:6px 12px;
      cursor:pointer; font-family:monospace; font-size:12px;
      border-radius:4px; backdrop-filter:blur(4px);
      transition:opacity 0.2s;
    }
    #toggle-btn:hover { background:rgba(60,60,60,0.95); }

    /* Botão fullscreen — canto superior direito */
    #fullscreen-btn {
      position:fixed; top:10px; right:10px; z-index:100;
      background:rgba(30,30,30,0.85); color:#eee;
      border:1px solid #555; padding:6px 12px;
      cursor:pointer; font-family:monospace; font-size:12px;
      border-radius:4px; backdrop-filter:blur(4px);
    }
    #fullscreen-btn:hover { background:rgba(60,60,60,0.95); }

    /* Sidebar — overlay sobre o canvas */
    #ui-sidebar {
      position:fixed; top:0; left:0; z-index:99;
      width:0; height:100vh; overflow:hidden;
      transition:width 0.2s ease;
      background:rgba(20,20,20,0.92);
      border-right:1px solid #444;
      backdrop-filter:blur(8px);
    }
    #ui-sidebar.open { width:270px; }
    #ui-panel {
      display:flex; flex-direction:column; gap:6px;
      padding:52px 12px 12px 12px;
      min-width:260px; height:100vh;
      overflow-y:auto;
    }
    .sec { color:#aaa; font-size:10px; letter-spacing:2px; text-transform:uppercase; border-bottom:1px solid #444; padding-bottom:3px; margin-top:6px; }
    .ctrl { display:flex; flex-direction:column; gap:2px; }
    .ctrl label { color:#ccc; font-size:11px; display:flex; justify-content:space-between; }
    .ctrl label span { color:#f0a040; min-width:36px; text-align:right; }
    .ctrl input[type=range] { width:100%; accent-color:#f0a040; cursor:pointer; }
    .ctrl select,.ctrl input[type=checkbox] { background:#333; color:#eee; border:1px solid #555; padding:2px 4px; font-family:monospace; font-size:11px; cursor:pointer; }
    .btn-row { display:flex; gap:8px; margin-top:4px; }
    .btn-row button { flex:1; padding:6px; background:#333; color:#eee; border:1px solid #555; cursor:pointer; font-family:monospace; font-size:12px; border-radius:3px; }
    .btn-row button:hover { background:#f0a040; color:#111; }
  `;
  document.head.appendChild(style);

  let btn = document.createElement('button');
  btn.id = 'toggle-btn';
  btn.textContent = '☰  PARÂMETROS';
  btn.onclick = () => {
    sidebar.classList.toggle('open');
    btn.textContent = sidebar.classList.contains('open') ? '✕  FECHAR' : '☰  PARÂMETROS';
  };
  document.body.appendChild(btn);
  // Sidebar
  let sidebar = document.createElement('div');
  sidebar.id = 'ui-sidebar';
  document.body.insertBefore(sidebar, document.body.firstChild);

  panel = document.createElement('div');
  panel.id = 'ui-panel';
  sidebar.appendChild(panel);

  // Fullscreen button
  let fsBtn = document.createElement('button');
  fsBtn.id = 'fullscreen-btn';
  fsBtn.textContent = '⛶  FULLSCREEN';
  fsBtn.onclick = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(()=>{});
      fsBtn.textContent = '✕  SAIR';
    } else {
      document.exitFullscreen();
      fsBtn.textContent = '⛶  FULLSCREEN';
    }
  };
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) fsBtn.textContent = '⛶  FULLSCREEN';
  });
  document.body.appendChild(fsBtn);

  function sec(t) {
    let d = document.createElement('div'); d.className = 'sec'; d.textContent = t; panel.appendChild(d);
  }
  // slider helper that returns {inp, val} for external reset
  function sliderRef(label, get, set, mn, mx, step) {
    let div=document.createElement('div'); div.className='ctrl';
    let lbl=document.createElement('label');
    let txt=document.createTextNode(label+' ');
    let val=document.createElement('span');
    val.textContent=get().toFixed(step<0.01?4:step<1?2:0);
    lbl.appendChild(txt); lbl.appendChild(val);
    let inp=document.createElement('input');
    inp.type='range'; inp.min=mn; inp.max=mx; inp.step=step; inp.value=get();
    inp.oninput=()=>{ let v=parseFloat(inp.value); set(v); val.textContent=v.toFixed(step<0.01?4:step<1?2:0); };
    div.appendChild(lbl); div.appendChild(inp); panel.appendChild(div);
    return {inp, val};
  }

  function slider(label, get, set, mn, mx, step) {
    let div = document.createElement('div'); div.className = 'ctrl';
    let lbl = document.createElement('label');
    let txt = document.createTextNode(label + ' ');
    let val = document.createElement('span');
    val.textContent = get().toFixed(step < 0.01 ? 4 : step < 1 ? 2 : 0);
    lbl.appendChild(txt); lbl.appendChild(val);
    let inp = document.createElement('input');
    inp.type='range'; inp.min=mn; inp.max=mx; inp.step=step; inp.value=get();
    inp.oninput = () => { let v=parseFloat(inp.value); set(v); val.textContent=v.toFixed(step<0.01?4:step<1?2:0); };
    div.appendChild(lbl); div.appendChild(inp); panel.appendChild(div);
  }
  function sel(label, opts, get, set) {
    let div=document.createElement('div'); div.className='ctrl';
    let lbl=document.createElement('label'); lbl.textContent=label;
    let s=document.createElement('select');
    opts.forEach(o=>{let op=document.createElement('option');op.value=o;op.textContent=o;if(o===get())op.selected=true;s.appendChild(op);});
    s.onchange=()=>set(s.value);
    div.appendChild(lbl); div.appendChild(s); panel.appendChild(div);
  }
  function chk(label, get, set) {
    let div=document.createElement('div'); div.className='ctrl';
    let lbl=document.createElement('label'); lbl.textContent=label;
    let inp=document.createElement('input'); inp.type='checkbox'; inp.checked=get();
    inp.onchange=()=>set(inp.checked);
    div.appendChild(lbl); div.appendChild(inp); panel.appendChild(div);
  }

  sec('Flow Field');
  slider('field scale',     ()=>FIELD_SCALE,     v=>FIELD_SCALE=v,     0.0001, 0.008, 0.0001);
  slider('field angle',     ()=>FIELD_ANGLE,     v=>FIELD_ANGLE=v,     0.1, 9.0, 0.01);
  slider('field evolution', ()=>FIELD_EVOLUTION, v=>FIELD_EVOLUTION=v, 0, 0.1, 0.0001);

  sec('Repulsão');
  slider('raio',  ()=>REPULSION_RADIUS,   v=>REPULSION_RADIUS=v,   1, 100, 1);
  slider('força', ()=>REPULSION_STRENGTH, v=>REPULSION_STRENGTH=v, 0, 3.0, 0.05);

  sec('Partículas');
  slider('quantidade',   ()=>NUM_PARTICLES,  v=>{NUM_PARTICLES=Math.round(v); init();}, 10, 2000, 10);
  slider('cauda',        ()=>TRAIL_LENGTH,   v=>TRAIL_LENGTH=Math.round(v),  5, 150, 1);
  slider('min width',    ()=>MIN_WIDTH,      v=>MIN_WIDTH=v,    1, 50,  0.5);
  slider('max width',    ()=>MAX_WIDTH,      v=>MAX_WIDTH=v,    1, 100, 0.5);
  slider('speed',        ()=>SPEED,          v=>SPEED=v,        0.1, 18, 0.1);
  chk('wrap edges',      ()=>WRAP_EDGES,     v=>WRAP_EDGES=v);

  sec('Atrator');
  slider('raio',         ()=>ATTRACTOR_RADIUS,   v=>ATTRACTOR_RADIUS=v,   10, 500, 5);
  slider('força',        ()=>ATTRACTOR_STRENGTH, v=>ATTRACTOR_STRENGTH=v, 0.1, 16.0, 0.1);
  slider('decaimento',   ()=>ATTRACTOR_DECAY,    v=>ATTRACTOR_DECAY=v,    0.001, 0.05, 0.001);
  slider('raio órbita',  ()=>ORBIT_DISTANCE,     v=>ORBIT_DISTANCE=v,     5, 300, 5);
  chk('mostrar círculo',  ()=>SHOW_ATTRACTOR,     v=>SHOW_ATTRACTOR=v);

  sec('Estilo');
  sel('draw style', ['solid','soft','outlined'], ()=>DRAW_STYLE, v=>DRAW_STYLE=v);
  slider('soft lines', ()=>SOFT_LINES, v=>SOFT_LINES=Math.round(v), 2, 20, 1);
  chk('fade tail',     ()=>FADE_TAIL,  v=>FADE_TAIL=v);
  chk('bg fade',       ()=>BG_FADE,    v=>BG_FADE=v);
  slider('bg fade alpha', ()=>BG_FADE_ALPHA, v=>BG_FADE_ALPHA=v, 2, 60, 1);

  sec('Cores');

  // Seletor de paleta pronta
  let satSliderRef, lightSliderRef;
  {
    let div=document.createElement('div'); div.className='ctrl';
    let lbl=document.createElement('label'); lbl.textContent='paleta preset';
    let s=document.createElement('select');
    s.style.cssText='background:#333;color:#eee;border:1px solid #555;padding:2px 4px;font-family:monospace;font-size:11px;width:100%;';
    ['— custom —',...Object.keys(PALETTES_PRESET)].forEach(o=>{
      let op=document.createElement('option'); op.value=o; op.textContent=o; s.appendChild(op);
    });
    s.onchange=()=>{
      if(s.value==='— custom —') return;
      PALETTE = PALETTES_PRESET[s.value].map(c=>[...c]);
      SAT_MULT=1.0; LIGHT_MULT=1.0;
      if(satSliderRef)  { satSliderRef.inp.value=1.0;  satSliderRef.val.textContent='1.00'; }
      if(lightSliderRef){ lightSliderRef.inp.value=1.0; lightSliderRef.val.textContent='1.00'; }
      rebuildColorEditor();
    };
    // Expõe o select para que edições manuais possam trocar para "— custom —"
    window._paletteSelect = s;
    div.appendChild(lbl); div.appendChild(s); panel.appendChild(div);
  }

  // Saturação e brilho — guardamos refs para reset
  satSliderRef   = sliderRef('saturação', ()=>SAT_MULT,   v=>{ SAT_MULT=v;   if(window._paletteSelect) window._paletteSelect.value='— custom —'; }, 0, 2.0, 0.05);
  lightSliderRef = sliderRef('brilho',    ()=>LIGHT_MULT, v=>{ LIGHT_MULT=v; if(window._paletteSelect) window._paletteSelect.value='— custom —'; }, 0, 2.0, 0.05);

  // Cor do fundo
  {
    let div=document.createElement('div'); div.className='ctrl';
    let lbl=document.createElement('label'); lbl.textContent='cor do fundo';
    let cp=document.createElement('input'); cp.type='color';
    cp.value=rgbToHex(BG_COLOR[0],BG_COLOR[1],BG_COLOR[2]);
    cp.style.cssText='width:100%;height:24px;border:none;background:none;cursor:pointer;padding:0;';
    cp.oninput=()=>{ let rgb=hexToRgb(cp.value); BG_COLOR=[rgb.r,rgb.g,rgb.b]; };
    div.appendChild(lbl); div.appendChild(cp); panel.appendChild(div);
  }

  // Editor de paleta — container
  let colorEditorEl = document.createElement('div');
  colorEditorEl.id = 'color-editor';
  panel.appendChild(colorEditorEl);

  function rebuildColorEditor() {
    colorEditorEl.innerHTML='';
    // Normaliza probabilidades para somarem 1
    let total = PALETTE.reduce((s,c)=>s+c[3],0);
    if(total>0) PALETTE.forEach(c=>c[3]=c[3]/total);

    PALETTE.forEach((c,i)=>{
      let row=document.createElement('div');
      row.style.cssText='display:flex;align-items:center;gap:6px;margin-bottom:4px;';

      // Color picker — atualiza ao vivo
      let cp=document.createElement('input'); cp.type='color';
      cp.value=rgbToHex(c[0],c[1],c[2]);
      cp.style.cssText='width:36px;height:24px;border:none;background:none;cursor:pointer;padding:0;flex-shrink:0;';
      cp.oninput=()=>{
        let rgb=hexToRgb(cp.value);
        PALETTE[i][0]=rgb.r; PALETTE[i][1]=rgb.g; PALETTE[i][2]=rgb.b;
        if(window._paletteSelect) window._paletteSelect.value='— custom —';
      };

      // Probability slider — redistributes others proportionally
      let probWrap=document.createElement('div'); probWrap.style.cssText='flex:1;display:flex;flex-direction:column;gap:1px;';
      let probLbl=document.createElement('label');
      probLbl.style.cssText='color:#aaa;font-size:10px;display:flex;justify-content:space-between;';
      probLbl.appendChild(document.createTextNode('prob '));
      let probVal=document.createElement('span'); probVal.style.color='#f0a040';
      probVal.textContent=c[3].toFixed(2);
      probLbl.appendChild(probVal);

      let probInp=document.createElement('input'); probInp.type='range';
      probInp.min=0; probInp.max=1; probInp.step=0.01; probInp.value=c[3];
      probInp.style.cssText='width:100%;accent-color:#f0a040;';
      probInp.oninput=()=>{
        if(window._paletteSelect) window._paletteSelect.value='— custom —';
        let newVal = parseFloat(probInp.value);
        let oldVal = PALETTE[i][3];
        let delta  = newVal - oldVal;
        // Soma das outras
        let otherSum = 1 - oldVal;
        if(otherSum < 0.001) return; // todas as outras já em zero
        PALETTE[i][3] = newVal;
        // Redistribui delta inversamente nas outras
        PALETTE.forEach((cc,j)=>{
          if(j===i) return;
          cc[3] = Math.max(0, cc[3] - delta * (cc[3]/otherSum));
        });
        // Normaliza para garantir soma = 1
        let t=PALETTE.reduce((s,cc)=>s+cc[3],0);
        PALETTE.forEach(cc=>cc[3]=cc[3]/t);
        // Atualiza displays dos outros sliders
        updateProbDisplays();
        probVal.textContent=PALETTE[i][3].toFixed(2);
        probInp.value=PALETTE[i][3];
      };

      probWrap.appendChild(probLbl); probWrap.appendChild(probInp);
      row.appendChild(cp); row.appendChild(probWrap);
      colorEditorEl.appendChild(row);
    });
  }

  function updateProbDisplays() {
    let rows = colorEditorEl.children;
    PALETTE.forEach((c,i)=>{
      if(!rows[i]) return;
      let inp = rows[i].querySelector('input[type=range]');
      let val = rows[i].querySelector('span');
      if(inp) inp.value = c[3];
      if(val) val.textContent = c[3].toFixed(2);
    });
  }

  rebuildColorEditor();

  sec('Seed');
  chk('fixed seed',   ()=>USE_FIXED_SEED, v=>{USE_FIXED_SEED=v; init();});
  slider('seed',      ()=>FIXED_SEED,     v=>{FIXED_SEED=v; if(USE_FIXED_SEED) init();}, 1, 9999, 1);

  let row=document.createElement('div'); row.className='btn-row';
  let rb=document.createElement('button'); rb.textContent='⟳  REINICIAR'; rb.onclick=init;
  let sb=document.createElement('button'); sb.textContent='↓  PNG'; sb.onclick=()=>saveCanvas('fidenza','png');
  row.appendChild(rb); row.appendChild(sb); panel.appendChild(row);
}

function pickColor() {
  let r=random(), acc=0;
  for(let c of PALETTE){acc+=c[3];if(r<=acc)return applyColorMods(c);}
  return applyColorMods(PALETTE[PALETTE.length-1]);
}

// Resolve cor a partir de valor normalizado [0,1] usando a paleta atual
// Permite que mudanças na paleta reflitam imediatamente nas partículas
function pickColorFromNorm(norm) {
  // Normaliza probabilidades acumuladas
  let total = PALETTE.reduce((s,c)=>s+c[3], 0);
  let acc = 0;
  for (let c of PALETTE) {
    acc += c[3] / total;
    if (norm <= acc) return applyColorMods(c);
  }
  return applyColorMods(PALETTE[PALETTE.length-1]);
}

function applyColorMods(c) {
  // Converte RGB → HSL, aplica modificadores, volta pra RGB
  let r=c[0]/255, g=c[1]/255, b=c[2]/255;
  let mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn;
  let h=0, s=0, l=(mx+mn)/2;
  if(d>0){
    s = d/(1-Math.abs(2*l-1));
    if(mx===r) h=((g-b)/d+6)%6;
    else if(mx===g) h=(b-r)/d+2;
    else h=(r-g)/d+4;
    h/=6;
  }
  s = Math.min(1, s * SAT_MULT);
  l = Math.min(1, Math.max(0, l * LIGHT_MULT));
  // HSL → RGB
  let q=l<0.5?l*(1+s):l+s-l*s, p=2*l-q;
  function hue(t){t=(t+1)%1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;}
  return [Math.round(hue(h+1/3)*255), Math.round(hue(h)*255), Math.round(hue(h-1/3)*255), c[3]];
}
