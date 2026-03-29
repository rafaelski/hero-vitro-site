// ============================================================
//  FIDENZA — versão EMBED (iframe / Webflow)
//  Usa p5 em MODO INSTÂNCIA para isolar eventos
//  O scroll da página pai nunca é bloqueado
// ============================================================

const sketch = function(p) {

  // --- PARÂMETROS (idênticos ao original) ---
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
  let ATTRACTOR_DECAY    = 0.012;
  let ORBIT_DISTANCE     = 60;
  let SHOW_ATTRACTOR     = true;

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

  let SAT_MULT   = 1.0;
  let LIGHT_MULT = 1.0;

  let BG_COLOR      = [245, 240, 228];
  let BG_FADE       = false;
  let BG_FADE_ALPHA = 20;

  let USE_FIXED_SEED = false;
  let FIXED_SEED     = 42;

  // --- ESTADO ---
  let attractor   = { x: 0, y: 0, strength: 0, active: false };
  let particles   = [];
  let spatialGrid = { cells: {}, cell: 30 };
  let container;

  // ============================================================
  //  SETUP
  // ============================================================
  p.setup = function() {
    container = document.getElementById('sketch-container');
    CANVAS_W  = container.clientWidth;
    CANVAS_H  = container.clientHeight;

    let cnv = p.createCanvas(CANVAS_W, CANVAS_H);
    cnv.parent('sketch-container');
    cnv.elt.style.display = 'block';

    // ── CHAVE DO SCROLL ──────────────────────────────────────
    // Remove os listeners de touch que o p5 coloca no document/window.
    // Esses listeners chamam preventDefault() e bloqueiam o scroll.
    // No modo instância o p5 ainda registra alguns no document.
    removep5TouchListeners(cnv.elt);

    // Registra nossos próprios listeners APENAS no canvas,
    // sem preventDefault(), para não bloquear scroll.
    cnv.elt.addEventListener('mousedown', onMouseDown, { passive: true });
    cnv.elt.addEventListener('mousemove', onMouseMove, { passive: true });
    cnv.elt.addEventListener('touchstart', onTouchStart, { passive: true });
    cnv.elt.addEventListener('touchmove',  onTouchMove,  { passive: true });

    init();
    setupResizeObserver();
  };

  // ── Remove os event listeners problemáticos do p5 ─────────
  function removep5TouchListeners(canvasEl) {
    // p5 registra touchstart/touchmove com preventDefault no window e document.
    // Substituímos por noop para liberar o scroll.
    // (Não afeta mouse — mouse não bloqueia scroll.)
    const noop = () => {};
    // Sobrescreve os handlers internos do p5 que estão no window
    if (window._p5TouchStarted)  window.removeEventListener('touchstart',  window._p5TouchStarted);
    if (window._p5TouchMoved)    window.removeEventListener('touchmove',   window._p5TouchMoved);
    if (window._p5TouchEnded)    window.removeEventListener('touchend',    window._p5TouchEnded);
    // Método mais robusto: redefine o touchAction no canvas e no html
    document.documentElement.style.touchAction = 'auto';
    document.body.style.touchAction            = 'auto';
    canvasEl.style.touchAction                 = 'auto';
  }

  // ── Handlers de evento (sem preventDefault) ───────────────
  function onMouseDown(e) {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    attractor.x = x; attractor.y = y;
    attractor.strength = 1.0; attractor.active = true;
  }

  function onMouseMove(e) {
    if (e.buttons === 0) return; // só se estiver com botão pressionado
    const rect = e.target.getBoundingClientRect();
    attractor.x = e.clientX - rect.left;
    attractor.y = e.clientY - rect.top;
    attractor.strength = 1.0;
  }

  function onTouchStart(e) {
    const rect = e.target.getBoundingClientRect();
    const t = e.touches[0];
    attractor.x = t.clientX - rect.left;
    attractor.y = t.clientY - rect.top;
    attractor.strength = 1.0; attractor.active = true;
    // NÃO chama preventDefault — scroll livre
  }

  function onTouchMove(e) {
    const rect = e.target.getBoundingClientRect();
    const t = e.touches[0];
    attractor.x = t.clientX - rect.left;
    attractor.y = t.clientY - rect.top;
    attractor.strength = 1.0;
    // NÃO chama preventDefault — scroll livre
  }

  // ============================================================
  //  DRAW
  // ============================================================
  p.draw = function() {
    if (BG_FADE) {
      p.fill(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2], BG_FADE_ALPHA);
      p.noStroke();
      p.rect(0, 0, p.width, p.height);
    } else {
      p.background(BG_COLOR[0], BG_COLOR[1], BG_COLOR[2]);
    }

    if (attractor.strength > 0) {
      attractor.strength = Math.max(0, attractor.strength - ATTRACTOR_DECAY);
      if (attractor.strength === 0) attractor.active = false;
    }

    if (attractor.active && SHOW_ATTRACTOR) {
      p.noFill();
      p.stroke(100, 100, 100, attractor.strength * 120);
      p.strokeWeight(1);
      p.circle(attractor.x, attractor.y, ORBIT_DISTANCE * 2);
      p.circle(attractor.x, attractor.y, ATTRACTOR_RADIUS * 2 * attractor.strength);
    }

    buildSpatialGrid();
    for (let pt of particles) { pt.update(); pt.draw(); }
  };

  // ============================================================
  //  INIT / GRID / FIELD
  // ============================================================
  function init() {
    let s = USE_FIXED_SEED ? FIXED_SEED : Math.floor(p.random(999999));
    p.randomSeed(s); p.noiseSeed(s);
    particles = [];
    for (let i = 0; i < NUM_PARTICLES; i++) particles.push(new Particle());
  }

  function buildSpatialGrid() {
    spatialGrid.cell  = Math.max(1, REPULSION_RADIUS);
    spatialGrid.cells = {};
    for (let pt of particles) {
      let cx  = Math.floor(pt.x / spatialGrid.cell);
      let cy  = Math.floor(pt.y / spatialGrid.cell);
      let key = cx + ',' + cy;
      if (!spatialGrid.cells[key]) spatialGrid.cells[key] = [];
      spatialGrid.cells[key].push(pt);
    }
  }

  function fieldAngle(x, y) {
    let t = p.frameCount * FIELD_EVOLUTION;
    return p.noise(x * FIELD_SCALE, y * FIELD_SCALE, t) * FIELD_ANGLE;
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
          CANVAS_W = newW; CANVAS_H = newH;
          p.resizeCanvas(CANVAS_W, CANVAS_H);
          init();
        }
      }
    });
    observer.observe(container);
  }

  // ============================================================
  //  CLASSE PARTÍCULA (idêntica ao original)
  // ============================================================
  class Particle {
    constructor() {
      this.x       = p.random(CANVAS_W);
      this.y       = p.random(CANVAS_H);
      this.wNorm   = p.random();
      this.colNorm = p.random();
      this.trail   = [];
      this.vel     = { x: 0, y: 0 };
    }

    update() {
      this.trail.push({ x: this.x, y: this.y });
      while (this.trail.length > TRAIL_LENGTH) this.trail.shift();

      let fieldA = fieldAngle(this.x, this.y);
      let fx = p.cos(fieldA), fy = p.sin(fieldA);

      if (attractor.active && attractor.strength > 0) {
        let dx = attractor.x - this.x, dy = attractor.y - this.y;
        let d  = Math.sqrt(dx*dx + dy*dy);
        if (d < ATTRACTOR_RADIUS) {
          let influence = (1 - d / ATTRACTOR_RADIUS) * attractor.strength;
          if (d > 0.1) {
            let radialForce = (d - ORBIT_DISTANCE) / ATTRACTOR_RADIUS;
            let nx = dx/d, ny = dy/d, tx = -ny, ty = nx;
            let ax = (nx * radialForce + tx * 0.8) * influence * ATTRACTOR_STRENGTH;
            let ay = (ny * radialForce + ty * 0.8) * influence * ATTRACTOR_STRENGTH;
            fx = p.lerp(fx, ax, influence);
            fy = p.lerp(fy, ay, influence);
          }
        }
      }

      if (REPULSION_STRENGTH > 0) {
        let rx = 0, ry = 0;
        let cellX = Math.floor(this.x / spatialGrid.cell);
        let cellY = Math.floor(this.y / spatialGrid.cell);
        for (let ddx = -1; ddx <= 1; ddx++) {
          for (let ddy = -1; ddy <= 1; ddy++) {
            let key = (cellX+ddx)+','+(cellY+ddy);
            let nb  = spatialGrid.cells[key];
            if (!nb) continue;
            for (let other of nb) {
              if (other === this) continue;
              let ox = this.x - other.x, oy = this.y - other.y;
              let d  = Math.sqrt(ox*ox + oy*oy);
              if (d > 0 && d < REPULSION_RADIUS) {
                let f = (1 - d/REPULSION_RADIUS) * REPULSION_STRENGTH;
                rx += (ox/d)*f; ry += (oy/d)*f;
              }
            }
          }
        }
        fx += rx; fy += ry;
      }

      this.vel.x = p.lerp(this.vel.x, fx * SPEED, 0.25);
      this.vel.y = p.lerp(this.vel.y, fy * SPEED, 0.25);
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
        this.x = p.constrain(this.x, 0, CANVAS_W);
        this.y = p.constrain(this.y, 0, CANVAS_H);
      }
    }

    draw() {
      if (this.trail.length < 2) return;
      let [r, g, b] = pickColorFromNorm(this.colNorm);
      if (DRAW_STYLE === "solid")    this._drawRibbon(this.trail, r, g, b);
      else if (DRAW_STYLE === "outlined") this._drawOutlined(this.trail, r, g, b);
      else if (DRAW_STYLE === "soft")     this._drawSoft(this.trail, r, g, b);
    }

    _drawRibbon(pts, r, g, b) {
      let left = [], right = [], n = pts.length;
      for (let i = 0; i < n; i++) {
        let angle = i < n-1
          ? Math.atan2(pts[i+1].y - pts[i].y, pts[i+1].x - pts[i].x)
          : Math.atan2(pts[i].y - pts[i-1].y, pts[i].x - pts[i-1].x);
        let perp = angle + 1.5708;
        let t    = FADE_TAIL ? i / (n-1) : 1;
        let hw   = p.lerp(MIN_WIDTH, MAX_WIDTH, this.wNorm) * t / 2;
        left.push({ x: pts[i].x + Math.cos(perp)*hw, y: pts[i].y + Math.sin(perp)*hw });
        right.push({ x: pts[i].x - Math.cos(perp)*hw, y: pts[i].y - Math.sin(perp)*hw });
      }
      p.noStroke(); p.fill(r, g, b);
      p.beginShape();
      for (let pt of left)            p.curveVertex(pt.x, pt.y);
      for (let pt of right.reverse()) p.curveVertex(pt.x, pt.y);
      p.endShape(p.CLOSE);
    }

    _drawOutlined(pts, r, g, b) {
      p.noFill(); p.stroke(r, g, b, 180); p.strokeWeight(1.5);
      p.beginShape();
      for (let pt of pts) p.curveVertex(pt.x, pt.y);
      p.endShape();
    }

    _drawSoft(pts, r, g, b) {
      let hw = p.lerp(MIN_WIDTH, MAX_WIDTH, this.wNorm) / 2;
      let n  = pts.length;
      p.noFill();
      for (let li = 0; li < SOFT_LINES; li++) {
        let offset = p.map(li, 0, SOFT_LINES-1, -hw, hw);
        let alpha  = p.map(Math.abs(offset), 0, hw, 180, 5);
        p.stroke(r, g, b, alpha); p.strokeWeight(1.0);
        p.beginShape();
        for (let i = 0; i < n; i++) {
          let pt = pts[i], t = FADE_TAIL ? i/(n-1) : 1;
          let angle = i < n-1
            ? Math.atan2(pts[i+1].y - pt.y, pts[i+1].x - pt.x)
            : Math.atan2(pt.y - pts[i-1].y, pt.x - pts[i-1].x);
          let perp = angle + 1.5708;
          p.curveVertex(pt.x + Math.cos(perp)*offset*t, pt.y + Math.sin(perp)*offset*t);
        }
        p.endShape();
      }
    }
  }

  // ============================================================
  //  COR
  // ============================================================
  function pickColorFromNorm(norm) {
    let total = PALETTE.reduce((s, c) => s + c[3], 0), acc = 0;
    for (let c of PALETTE) { acc += c[3]/total; if (norm <= acc) return applyColorMods(c); }
    return applyColorMods(PALETTE[PALETTE.length-1]);
  }

  function applyColorMods(c) {
    let r = c[0]/255, g = c[1]/255, b = c[2]/255;
    let mx = Math.max(r,g,b), mn = Math.min(r,g,b), d = mx-mn;
    let h=0, s=0, l=(mx+mn)/2;
    if (d > 0) {
      s = d/(1-Math.abs(2*l-1));
      if (mx===r) h=((g-b)/d+6)%6;
      else if (mx===g) h=(b-r)/d+2;
      else h=(r-g)/d+4;
      h/=6;
    }
    s = Math.min(1, s*SAT_MULT);
    l = Math.min(1, Math.max(0, l*LIGHT_MULT));
    let q = l<0.5 ? l*(1+s) : l+s-l*s, p2 = 2*l-q;
    function hue(t) { t=(t+1)%1; if(t<1/6)return p2+(q-p2)*6*t; if(t<1/2)return q; if(t<2/3)return p2+(q-p2)*(2/3-t)*6; return p2; }
    return [Math.round(hue(h+1/3)*255), Math.round(hue(h)*255), Math.round(hue(h-1/3)*255), c[3]];
  }

}; // fim do sketch

// Instancia o p5 dentro do div container (modo instância)
new p5(sketch);
