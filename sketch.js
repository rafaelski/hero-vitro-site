// FIDENZA EMBED - hover interaction, pointer-events:none, scroll livre
let CANVAS_W=800,CANVAS_H=800,FIELD_SCALE=0.0018,FIELD_ANGLE=3.14159,FIELD_EVOLUTION=0.0003;
let REPULSION_RADIUS=30,REPULSION_STRENGTH=0.8,NUM_PARTICLES=800,TRAIL_LENGTH=10;
let MIN_WIDTH=4,MAX_WIDTH=18,SPEED=4.0,WRAP_EDGES=true;
let ATTRACTOR_RADIUS=180,ATTRACTOR_STRENGTH=2.5,ATTRACTOR_DECAY=0.015,ORBIT_DISTANCE=60;
let DRAW_STYLE="solid",FADE_TAIL=true;
let PALETTE=[[210,80,50,0.28],[60,110,190,0.28],[220,185,50,0.16],[190,190,190,0.16],[40,40,40,0.12]];
let SAT_MULT=1.0,LIGHT_MULT=1.0,BG_COLOR=[245,240,228],BG_FADE=false,BG_FADE_ALPHA=20;
let USE_FIXED_SEED=false,FIXED_SEED=42;
let attractor={x:0,y:0,strength:0,active:false};
let particles=[],spatialGrid={cells:{},cell:30};

function setup(){
  CANVAS_W=document.body.clientWidth||window.innerWidth;
  CANVAS_H=document.body.clientHeight||window.innerHeight;
  let cnv=createCanvas(CANVAS_W,CANVAS_H);
  cnv.elt.style.cssText='display:block;position:absolute;top:0;left:0;pointer-events:none;';
  document.addEventListener('mousemove',function(e){
    let r=cnv.elt.getBoundingClientRect();
    attractor.x=e.clientX-r.left;attractor.y=e.clientY-r.top;
    attractor.strength=1.0;attractor.active=true;
  });
  document.addEventListener('touchmove',function(e){
    let r=cnv.elt.getBoundingClientRect();
    attractor.x=e.touches[0].clientX-r.left;attractor.y=e.touches[0].clientY-r.top;
    attractor.strength=1.0;attractor.active=true;
  },{passive:true});
  init();
  new ResizeObserver(function(es){
    for(let e of es){
      let nw=Math.floor(e.contentRect.width),nh=Math.floor(e.contentRect.height);
      if(nw>0&&nh>0&&(nw!==CANVAS_W||nh!==CANVAS_H)){CANVAS_W=nw;CANVAS_H=nh;resizeCanvas(CANVAS_W,CANVAS_H);init();}
    }
  }).observe(document.body);
}

function draw(){
  if(BG_FADE){fill(BG_COLOR[0],BG_COLOR[1],BG_COLOR[2],BG_FADE_ALPHA);noStroke();rect(0,0,width,height);}
  else{background(BG_COLOR[0],BG_COLOR[1],BG_COLOR[2]);}
  if(attractor.strength>0){attractor.strength=max(0,attractor.strength-ATTRACTOR_DECAY);if(attractor.strength===0)attractor.active=false;}
  buildSpatialGrid();
  for(let p of particles){p.update();p.draw();}
}

function init(){
  let s=USE_FIXED_SEED?FIXED_SEED:floor(random(999999));
  randomSeed(s);noiseSeed(s);particles=[];
  for(let i=0;i<NUM_PARTICLES;i++)particles.push(new Particle());
}

function buildSpatialGrid(){
  spatialGrid.cell=max(1,REPULSION_RADIUS);spatialGrid.cells={};
  for(let p of particles){
    let cx=floor(p.x/spatialGrid.cell),cy=floor(p.y/spatialGrid.cell),k=cx+','+cy;
    if(!spatialGrid.cells[k])spatialGrid.cells[k]=[];
    spatialGrid.cells[k].push(p);
  }
}

function fieldAngle(x,y){return noise(x*FIELD_SCALE,y*FIELD_SCALE,frameCount*FIELD_EVOLUTION)*FIELD_ANGLE;}

function windowResized(){
  CANVAS_W=document.body.clientWidth||window.innerWidth;
  CANVAS_H=document.body.clientHeight||window.innerHeight;
  resizeCanvas(CANVAS_W,CANVAS_H);
}

class Particle{
  constructor(){
    this.x=random(CANVAS_W);this.y=random(CANVAS_H);
    this.wNorm=random();this.colNorm=random();
    this.trail=[];this.vel={x:0,y:0};
  }
  update(){
    this.trail.push({x:this.x,y:this.y});
    while(this.trail.length>TRAIL_LENGTH)this.trail.shift();
    let fa=fieldAngle(this.x,this.y),fx=cos(fa),fy=sin(fa);
    if(attractor.active&&attractor.strength>0){
      let dx=attractor.x-this.x,dy=attractor.y-this.y,d=sqrt(dx*dx+dy*dy);
      if(d<ATTRACTOR_RADIUS){
        let inf=(1-d/ATTRACTOR_RADIUS)*attractor.strength;
        if(d>0.1){
          let rf=(d-ORBIT_DISTANCE)/ATTRACTOR_RADIUS,nx=dx/d,ny=dy/d,tx=-ny,ty=nx;
          let ax=(nx*rf+tx*0.8)*inf*ATTRACTOR_STRENGTH,ay=(ny*rf+ty*0.8)*inf*ATTRACTOR_STRENGTH;
          fx=lerp(fx,ax,inf);fy=lerp(fy,ay,inf);
        }
      }
    }
    if(REPULSION_STRENGTH>0){
      let rx=0,ry=0,cx=floor(this.x/spatialGrid.cell),cy=floor(this.y/spatialGrid.cell);
      for(let ddx=-1;ddx<=1;ddx++)for(let ddy=-1;ddy<=1;ddy++){
        let nb=spatialGrid.cells[(cx+ddx)+','+(cy+ddy)];if(!nb)continue;
        for(let o of nb){
          if(o===this)continue;
          let ox=this.x-o.x,oy=this.y-o.y,od=sqrt(ox*ox+oy*oy);
          if(od>0&&od<REPULSION_RADIUS){let f=(1-od/REPULSION_RADIUS)*REPULSION_STRENGTH;rx+=ox/od*f;ry+=oy/od*f;}
        }
      }
      fx+=rx;fy+=ry;
    }
    this.vel.x=lerp(this.vel.x,fx*SPEED,0.25);this.vel.y=lerp(this.vel.y,fy*SPEED,0.25);
    this.x+=this.vel.x;this.y+=this.vel.y;
    if(WRAP_EDGES){
      let ox=0,oy=0;
      if(this.x<0){ox=CANVAS_W;this.x+=CANVAS_W;}if(this.x>CANVAS_W){ox=-CANVAS_W;this.x-=CANVAS_W;}
      if(this.y<0){oy=CANVAS_H;this.y+=CANVAS_H;}if(this.y>CANVAS_H){oy=-CANVAS_H;this.y-=CANVAS_H;}
      if(ox||oy)for(let pt of this.trail){pt.x+=ox;pt.y+=oy;}
    }else{this.x=constrain(this.x,0,CANVAS_W);this.y=constrain(this.y,0,CANVAS_H);}
  }
  draw(){
    if(this.trail.length<2)return;
    let col=pickColorFromNorm(this.colNorm),r=col[0],g=col[1],b=col[2];
    let pts=this.trail,left=[],right=[],n=pts.length;
    for(let i=0;i<n;i++){
      let a=i<n-1?atan2(pts[i+1].y-pts[i].y,pts[i+1].x-pts[i].x):atan2(pts[i].y-pts[i-1].y,pts[i].x-pts[i-1].x);
      let perp=a+1.5708,t=FADE_TAIL?i/(n-1):1,hw=lerp(MIN_WIDTH,MAX_WIDTH,this.wNorm)*t/2;
      left.push({x:pts[i].x+cos(perp)*hw,y:pts[i].y+sin(perp)*hw});
      right.push({x:pts[i].x-cos(perp)*hw,y:pts[i].y-sin(perp)*hw});
    }
    noStroke();fill(r,g,b);beginShape();
    for(let p of left)curveVertex(p.x,p.y);
    for(let p of right.reverse())curveVertex(p.x,p.y);
    endShape(CLOSE);
  }
}

function pickColorFromNorm(norm){
  let total=PALETTE.reduce((s,c)=>s+c[3],0),acc=0;
  for(let c of PALETTE){acc+=c[3]/total;if(norm<=acc)return applyColorMods(c);}
  return applyColorMods(PALETTE[PALETTE.length-1]);
}
function applyColorMods(c){
  let r=c[0]/255,g=c[1]/255,b=c[2]/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,h=0,s=0,l=(mx+mn)/2;
  if(d>0){s=d/(1-Math.abs(2*l-1));if(mx===r)h=((g-b)/d+6)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h/=6;}
  s=Math.min(1,s*SAT_MULT);l=Math.min(1,Math.max(0,l*LIGHT_MULT));
  let q=l<0.5?l*(1+s):l+s-l*s,p2=2*l-q;
  function hue(t){t=(t+1)%1;if(t<1/6)return p2+(q-p2)*6*t;if(t<1/2)return q;if(t<2/3)return p2+(q-p2)*(2/3-t)*6;return p2;}
  return[Math.round(hue(h+1/3)*255),Math.round(hue(h)*255),Math.round(hue(h-1/3)*255),c[3]];
}
