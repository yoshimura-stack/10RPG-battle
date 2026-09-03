import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

console.info('[BattleArena3D] module loaded');
const host = document.getElementById('battle-3d-stage');
const screen = document.getElementById('battle-screen');
let renderer, scene, camera, clock, composer, bloom;
let visible = false, shake = 0, pulse = 0, freezeUntil = 0, impactSide = 0;
const animated = [], transient = [], attackAnims = [];

const CYAN = 0x00eaff, MAGENTA = 0xff00d9, GOLD = 0xffc928;
const v3 = new THREE.Vector3();

function neon(color, opacity=1){
  return new THREE.MeshBasicMaterial({color, transparent:true, opacity, blending:THREE.AdditiveBlending, depthWrite:false});
}
function metal(color=0x11151f, emissive=0x000000, emissiveIntensity=.7){
  return new THREE.MeshStandardMaterial({color, emissive, emissiveIntensity, metalness:.82, roughness:.22, transparent:true, opacity:.96});
}
function canvasText(text, color='#fff', sub=''){
  const c=document.createElement('canvas'); c.width=1024;c.height=512;const x=c.getContext('2d');
  x.clearRect(0,0,c.width,c.height);x.textAlign='center';x.textBaseline='middle';
  const g=x.createLinearGradient(0,0,c.width,0);g.addColorStop(0,'#00eaff');g.addColorStop(.5,'#ffffff');g.addColorStop(1,'#ff00d9');
  x.shadowBlur=36;x.shadowColor=color;x.fillStyle=g;x.font='900 116px Impact, Arial Black, sans-serif';x.fillText(text,512,218);
  if(sub){x.shadowBlur=16;x.fillStyle='#fff';x.font='800 42px Arial Black, sans-serif';x.fillText(sub,512,344);}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function addGlowPanel(x,y,z,w,h,color,opacity=.18){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),neon(color,opacity));m.position.set(x,y,z);scene.add(m);return m;
}
function beamMesh(color, opacity=.12){
  const geo=new THREE.ConeGeometry(.72,9,32,1,true);const mat=neon(color,opacity);const m=new THREE.Mesh(geo,mat);m.rotation.x=Math.PI;m.position.y=2.8;return m;
}
function addTruss(z){
  const g=new THREE.Group();const mat=metal(0x151925,0x050816,.35);
  const top=new THREE.Mesh(new THREE.BoxGeometry(15.5,.12,.12),mat);top.position.y=5.1;g.add(top);
  for(const x of [-7.65,7.65]){const p=new THREE.Mesh(new THREE.BoxGeometry(.12,7,.12),mat);p.position.set(x,1.65,0);g.add(p);}
  for(let x=-6.8;x<=6.8;x+=1.7){const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.1,.16,.34,16),metal(0x202838,0x111111,.8));lamp.position.set(x,4.86,.12);lamp.rotation.x=Math.PI/2;g.add(lamp);}
  g.position.z=z;scene.add(g);return g;
}
function addAudienceTier(side,zBase){
  const g=new THREE.Group();const sideColor=side<0?CYAN:MAGENTA;
  for(let tier=0;tier<4;tier++){
    const step=new THREE.Mesh(new THREE.BoxGeometry(5.2,.32,2.3),metal(0x070a11,sideColor,.12));
    step.position.set(side*(7.3+tier*.35),-1.05+tier*.62,zBase-tier*.72);step.rotation.y=side<0?.18:-.18;g.add(step);
    const rail=new THREE.Mesh(new THREE.BoxGeometry(5.0,.04,.04),neon(sideColor,.32));rail.position.set(step.position.x,-.68+tier*.62,step.position.z+1.0);rail.rotation.y=step.rotation.y;g.add(rail);
  }
  scene.add(g);return g;
}
function addCrowd(side){
  const count=720, pos=new Float32Array(count*3), cols=new Float32Array(count*3);const color=new THREE.Color(side<0?CYAN:MAGENTA);
  for(let i=0;i<count;i++){
    const tier=Math.floor(Math.random()*5);pos[i*3]=side*(6.2+Math.random()*7.7);pos[i*3+1]=-.25+tier*.7+Math.random()*.38;pos[i*3+2]=-5-tier*.75-Math.random()*17;
    const b=.45+Math.random()*.55;cols[i*3]=color.r*b;cols[i*3+1]=color.g*b;cols[i*3+2]=color.b*b;
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(cols,3));
  const pts=new THREE.Points(geo,new THREE.PointsMaterial({size:.065,vertexColors:true,transparent:true,opacity:.72,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(pts);animated.push({type:'crowd',obj:pts,side});
}
function addPortal(){
  const g=new THREE.Group();
  for(let i=0;i<5;i++){
    const r=3.45-i*.34;const shape=new THREE.Shape();for(let k=0;k<8;k++){const a=Math.PI/8+k*Math.PI/4;const x=Math.cos(a)*r,y=Math.sin(a)*r*.86;if(k===0)shape.moveTo(x,y);else shape.lineTo(x,y);}shape.closePath();
    const geo=new THREE.ShapeGeometry(shape);const line=new THREE.LineLoop(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:i%2?MAGENTA:CYAN,transparent:true,opacity:.27-i*.025,blending:THREE.AdditiveBlending}));line.position.z=-i*.06;g.add(line);
  }
  const door=new THREE.Mesh(new THREE.PlaneGeometry(4.3,3.15),new THREE.MeshBasicMaterial({color:0x02030a,transparent:true,opacity:.82}));door.position.z=-.2;g.add(door);
  const vs=new THREE.Mesh(new THREE.PlaneGeometry(3.2,1.6),new THREE.MeshBasicMaterial({map:canvasText('VS','#ff4dff'),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));vs.position.z=.12;g.add(vs);animated.push({type:'portal',obj:vs});
  const title=new THREE.Mesh(new THREE.PlaneGeometry(5.2,1.65),new THREE.MeshBasicMaterial({map:canvasText('RPG BATTLE','#00dfff','10 MINUTES FIGHT'),transparent:true,depthWrite:false}));title.position.set(0,3.85,-.1);g.add(title);
  g.position.set(0,.25,-13.8);scene.add(g);return g;
}
function addFloor(){
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(34,42,1,1),new THREE.MeshStandardMaterial({color:0x02040a,metalness:.9,roughness:.14,transparent:true,opacity:.95,emissive:0x02030a,emissiveIntensity:.8}));
  floor.rotation.x=-Math.PI/2;floor.position.set(0,-1.9,-7);scene.add(floor);
  const grid=new THREE.GridHelper(35,56,0x67d9ff,0x15233e);grid.position.set(0,-1.875,-7);grid.material.transparent=true;grid.material.opacity=.24;scene.add(grid);animated.push({type:'grid',obj:grid});
  for(let z=4;z>-24;z-=2){
    const fade=Math.max(.035,.18-(4-z)*.005);const c=z%4===0?CYAN:MAGENTA;const strip=new THREE.Mesh(new THREE.PlaneGeometry(15.5,.025),neon(c,fade));strip.rotation.x=-Math.PI/2;strip.position.set(0,-1.865,z);scene.add(strip);
  }
  for(const side of [-1,1]){
    const path=new THREE.Mesh(new THREE.PlaneGeometry(.08,40),neon(side<0?CYAN:MAGENTA,.35));path.rotation.x=-Math.PI/2;path.rotation.z=0;path.position.set(side*5.5,-1.855,-7);scene.add(path);
  }
  // Arena circle / reflection glow.
  for(const [r,c,o] of [[7.25,CYAN,.34],[7.05,MAGENTA,.27],[5.8,GOLD,.09]]){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.038,8,160),neon(c,o));ring.rotation.x=Math.PI/2;ring.position.set(0,-1.82,-.2);scene.add(ring);animated.push({type:'ring',obj:ring,phase:r});
  }
  const reflection=addGlowPanel(0,-1.84,-.5,13,5,GOLD,.035);reflection.rotation.x=-Math.PI/2;
}
function addCeilingAndLights(){
  [-2,-8,-14,-20].forEach(addTruss);
  const spots=[[-6.1,CYAN],[-3.5,0xffffff],[-1.3,CYAN],[1.3,MAGENTA],[3.5,0xffffff],[6.1,MAGENTA]];
  for(const [x,c] of spots){
    const beam=beamMesh(c,c===0xffffff?.035:.055);beam.position.x=x;beam.position.z=-3-Math.random()*8;beam.rotation.z=(x/6.1)*.14;scene.add(beam);animated.push({type:'beam',obj:beam,phase:Math.random()*6});
    const l=new THREE.SpotLight(c,72,28,Math.PI/9,.55,1.25);l.position.set(x,6.8,beam.position.z);l.target.position.set(x*.35,-1.4,-1.5);scene.add(l,l.target);
  }
}
function addBackPanels(){
  for(const side of [-1,1]){
    const col=side<0?CYAN:MAGENTA;
    for(let i=0;i<8;i++){
      const p=addGlowPanel(side*(4.5+i*.76),.5+(i%3)*.72,-9-i*.8,.58,.2,col,.075+Math.random()*.07);p.rotation.y=side<0?.16:-.16;animated.push({type:'led',obj:p,phase:Math.random()*6});
    }
  }
}

function init(){
  if(!host||renderer)return;
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.65));renderer.setSize(host.clientWidth||innerWidth,host.clientHeight||innerHeight,false);renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;host.appendChild(renderer.domElement);
  scene=new THREE.Scene();scene.background=new THREE.Color(0x010207);scene.fog=new THREE.FogExp2(0x02030a,.028);clock=new THREE.Clock();camera=new THREE.PerspectiveCamera(48,(host.clientWidth||innerWidth)/(host.clientHeight||innerHeight),.1,100);camera.position.set(0,1.75,14.7);
  scene.add(new THREE.HemisphereLight(0x7ca8ff,0x08020b,.62));
  const fill=new THREE.PointLight(GOLD,22,20,1.5);fill.position.set(0,.5,-2);scene.add(fill);
  addFloor();addCeilingAndLights();addAudienceTier(-1,-6);addAudienceTier(1,-6);addCrowd(-1);addCrowd(1);addBackPanels();addPortal();
  // ambient particles
  const n=1100,pos=new Float32Array(n*3),cols=new Float32Array(n*3);for(let i=0;i<n;i++){const side=Math.random()<.5?-1:1;pos[i*3]=Math.random()*18-9;pos[i*3+1]=Math.random()*8-2;pos[i*3+2]=Math.random()*32-22;const c=new THREE.Color(side<0?CYAN:MAGENTA),b=.35+Math.random()*.65;cols[i*3]=c.r*b;cols[i*3+1]=c.g*b;cols[i*3+2]=c.b*b;}
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));pg.setAttribute('color',new THREE.BufferAttribute(cols,3));const pts=new THREE.Points(pg,new THREE.PointsMaterial({size:.035,vertexColors:true,transparent:true,opacity:.62,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(pts);animated.push({type:'particles',obj:pts});
  composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));bloom=new UnrealBloomPass(new THREE.Vector2(host.clientWidth||innerWidth,host.clientHeight||innerHeight),1.02,.58,.48);composer.addPass(bloom);
  addEventListener('resize',resize,{passive:true});renderer.setAnimationLoop(render);
}
function resize(){if(!renderer||!host)return;const w=host.clientWidth||innerWidth,h=host.clientHeight||innerHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);composer?.setSize(w,h);}
function show(){init();visible=true;if(host)host.style.opacity='1';resize();console.info('[BattleArena3D] show');}
function hide(){visible=false;if(host)host.style.opacity='0';}

function screenToWorld(rect, zPlane=2.1){
  const cx=rect.left+rect.width*.5, cy=rect.top+rect.height*.50;const hr=host.getBoundingClientRect();const ndc=new THREE.Vector2(((cx-hr.left)/hr.width)*2-1,-(((cy-hr.top)/hr.height)*2-1));
  const ray=new THREE.Raycaster();ray.setFromCamera(ndc,camera);const plane=new THREE.Plane(new THREE.Vector3(0,0,1),-zPlane);const p=new THREE.Vector3();ray.ray.intersectPlane(plane,p);return p;
}
function fighterPoints(attackerType){
  const a=document.getElementById(attackerType===1?'fighter-1p':'fighter-2p'),b=document.getElementById(attackerType===1?'fighter-2p':'fighter-1p');
  if(!a||!b)return {start:new THREE.Vector3(attackerType===1?-4:4,0,2),end:new THREE.Vector3(attackerType===1?4:-4,0,2)};
  return {start:screenToWorld(a.getBoundingClientRect(),2.15),end:screenToWorld(b.getBoundingClientRect(),2.15)};
}
function register(obj, duration, update, done){const item={obj,t:0,duration,update,done};attackAnims.push(item);return item;}
function trailLine(color,length=.9){const geo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-length,0,0),new THREE.Vector3(0,0,0)]);return new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity:.7,blending:THREE.AdditiveBlending}));}
function makeAxe(color){
  const g=new THREE.Group();const handle=new THREE.Mesh(new THREE.CylinderGeometry(.06,.07,.92,12),metal(0x5c3a21));handle.rotation.z=Math.PI/2;g.add(handle);
  const bladeMat=metal(0xbecbda,color,1.8);for(const s of [-1,1]){const blade=new THREE.Mesh(new THREE.ConeGeometry(.30,.55,4),bladeMat);blade.rotation.z=s*Math.PI/2;blade.position.x=s*.34;blade.scale.z=.24;g.add(blade);}const aura=new THREE.Mesh(new THREE.TorusGeometry(.46,.035,8,48),neon(color,.75));aura.rotation.y=Math.PI/2;g.add(aura);return g;
}
function attackAxe(attackerType,damage){const {start,end}=fighterPoints(attackerType),color=attackerType===1?CYAN:MAGENTA,g=makeAxe(color);g.position.copy(start);g.scale.setScalar(1.2);scene.add(g);const dir=end.clone().sub(start);register(g,.76,(o,t)=>{const e=1-Math.pow(1-t,3);o.position.copy(start).addScaledVector(dir,e);o.rotation.x+=.32;o.rotation.y+=.45;o.rotation.z+=(attackerType===1?1:-1)*.58;},()=>impact(attackerType===1?'right':'left',damage,end));return 760;}
function attackPulse(attackerType,damage){const {start,end}=fighterPoints(attackerType),color=attackerType===1?0x4ef7ff:0xff4ee9,g=new THREE.Group();const core=new THREE.Mesh(new THREE.SphereGeometry(.28,28,20),neon(0xffffff,.95));g.add(core);for(let i=0;i<4;i++){const r=new THREE.Mesh(new THREE.TorusGeometry(.34+i*.10,.025,8,56),neon(color,.72-i*.11));r.rotation.set(Math.random()*2,Math.random()*2,Math.random()*2);g.add(r);}const tail=trailLine(color,1.5);g.add(tail);g.position.copy(start);scene.add(g);const dir=end.clone().sub(start);register(g,.62,(o,t)=>{const e=t*t*(3-2*t);o.position.copy(start).addScaledVector(dir,e);o.rotation.x+=.13;o.rotation.y+=.18;const s=1+Math.sin(t*Math.PI)*.65;o.scale.setScalar(s);},()=>impact(attackerType===1?'right':'left',damage,end));return 620;}
function makeCar(color){
  const g=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(1.65,.45,.72),metal(0xdfe8f0,color,.65));body.position.y=.18;g.add(body);const cabin=new THREE.Mesh(new THREE.BoxGeometry(.82,.36,.64),metal(0x35506d,color,.55));cabin.position.set(-.18,.52,0);g.add(cabin);for(const x of [-.55,.58])for(const z of [-.39,.39]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.10,18),metal(0x050505));w.rotation.x=Math.PI/2;w.position.set(x,0,z);g.add(w);}const light=new THREE.Mesh(new THREE.PlaneGeometry(.06,.24),neon(color,.9));light.position.set(.84,.24,0);light.rotation.y=Math.PI/2;g.add(light);return g;
}
function attackCar(attackerType,damage){const {start,end}=fighterPoints(attackerType),color=attackerType===1?CYAN:MAGENTA,g=makeCar(color);g.position.copy(start);g.position.y-=.28;g.rotation.y=attackerType===1?0:Math.PI;g.scale.setScalar(.85);scene.add(g);const dir=end.clone().sub(start);const trail=[];register(g,.86,(o,t)=>{const e=t<.2?2.5*t*t:1-Math.pow(1-t,3);o.position.copy(start).addScaledVector(dir,e);o.position.y-=.28;const s=.82+Math.sin(t*Math.PI)*.18;o.scale.setScalar(s);if(Math.random()<.48){const p=new THREE.Mesh(new THREE.PlaneGeometry(.5,.035),neon(color,.22));p.position.copy(o.position);p.position.x+=(attackerType===1?-1:1)*.8;p.rotation.z=(Math.random()-.5)*.25;scene.add(p);p.userData.life=.22;transient.push({kind:'fade',obj:p});}},()=>impact(attackerType===1?'right':'left',damage,end));return 860;}
function attackKame(attackerType,damage){
  const {start,end}=fighterPoints(attackerType),color=attackerType===1?0x48dfff:0xff52f4,dir=end.clone().sub(start),len=dir.length(),g=new THREE.Group();g.position.copy(start);scene.add(g);
  const charge=new THREE.Mesh(new THREE.SphereGeometry(.34,32,24),neon(0xffffff,.96));g.add(charge);for(let i=0;i<4;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.45+i*.13,.028,8,64),neon(color,.65));ring.rotation.y=Math.PI/2;g.add(ring);}
  let beam=null;register(g,1.35,(o,t)=>{if(t<.36){const c=t/.36,s=.5+c*1.55;o.scale.setScalar(s);o.rotation.z+=.12;}else{if(!beam){beam=new THREE.Group();const cyl=new THREE.Mesh(new THREE.CylinderGeometry(.34,.55,len,32,1,true),neon(color,.76));cyl.rotation.z=Math.PI/2;cyl.position.x=len/2;beam.add(cyl);const core=new THREE.Mesh(new THREE.CylinderGeometry(.12,.22,len,24),neon(0xffffff,.95));core.rotation.z=Math.PI/2;core.position.x=len/2;beam.add(core);o.add(beam);}const p=(t-.36)/.64;beam.scale.y=beam.scale.z=.35+p*.9;beam.scale.x=Math.min(1,p*2.1);o.position.copy(start);const targetDir=dir.clone().normalize();o.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),targetDir);}},()=>impact(attackerType===1?'right':'left',damage,end,true));return 1350;
}
function impact(side,damage,pos,critical=false){
  hit(side,damage,pos,critical);
}
function attack(type,attackerType,damage){init();if(!visible)return 0;const key=String(type||'').toLowerCase();if(key.includes('斧')||key.includes('axe'))return attackAxe(attackerType,damage);if(key.includes('パルス')||key.includes('pulse'))return attackPulse(attackerType,damage);if(key.includes('車')||key.includes('car'))return attackCar(attackerType,damage);if(key.includes('かめ')||key.includes('kame'))return attackKame(attackerType,damage);return 0;}

function burst(x,color,damage,pos){
  const p=pos||new THREE.Vector3(x,.1,2.0);const strength=Math.min(1,damage/50);
  for(const [r,tube,life,white] of [[.5,.05,.42,false],[.8,.025,.55,true],[1.2,.035,.7,false]]){const o=new THREE.Mesh(new THREE.TorusGeometry(r,tube,8,80),neon(white?0xffffff:color,white?.92:.78));o.position.copy(p);o.userData={life:0,max:life};scene.add(o);transient.push({kind:'ring',obj:o});}
  const flash=new THREE.PointLight(color,78+damage*3,15,1.5);flash.position.copy(p);flash.userData={life:0,max:.28};scene.add(flash);transient.push({kind:'light',obj:flash});
  const n=damage>=50?180:damage>=30?120:62,arr=new Float32Array(n*3),vel=[];for(let i=0;i<n;i++){arr[i*3]=p.x;arr[i*3+1]=p.y;arr[i*3+2]=p.z;const a=Math.random()*Math.PI*2,sp=.9+Math.random()*(3.5+strength*2.5);vel.push(new THREE.Vector3(Math.cos(a)*sp,(Math.random()-.25)*3.6,Math.sin(a)*sp));}
  const ge=new THREE.BufferGeometry();ge.setAttribute('position',new THREE.BufferAttribute(arr,3));const pts=new THREE.Points(ge,new THREE.PointsMaterial({color,size:damage>=50?.105:.065,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false}));pts.userData={life:0,max:.58,vel};scene.add(pts);transient.push({kind:'sparks',obj:pts});
}
function hit(side,damage=5,pos=null,critical=false){init();const x=side==='left'?-3.7:3.7,color=side==='left'?CYAN:MAGENTA,strength=Math.min(1,damage/50);shake=Math.max(shake,.08+strength*.56);pulse=Math.max(pulse,.28+strength*.8);impactSide=side==='left'?-1:1;freezeUntil=performance.now()+(damage>=50?115:damage>=30?82:damage>=10?56:38);burst(x,color,damage,pos);screen?.classList.remove('battle-impact');void screen?.offsetWidth;screen?.classList.add('battle-impact');setTimeout(()=>screen?.classList.remove('battle-impact'),190);}

function render(now=performance.now()){
  if(!renderer||!scene||!camera||!visible)return;const dt=Math.min(clock.getDelta(),.035),t=clock.elapsedTime;
  if(now<freezeUntil){composer.render();return;}
  const pan=Math.sin(t*.14)*.48, dolly=Math.sin(t*.095)*.20, impactKick=impactSide*shake*.45;camera.position.x=pan+impactKick+(Math.random()-.5)*shake*.18;camera.position.y=1.72+Math.sin(t*.11)*.10+(Math.random()-.5)*shake*.10;camera.position.z=14.65+dolly;camera.lookAt(Math.sin(t*.10)*.18,-.15,-3.8);shake*=.84;impactSide*=.82;pulse*=.90;
  for(const a of animated){if(a.type==='grid')a.obj.position.z=-7+(t*.34)%2;else if(a.type==='particles')a.obj.rotation.y=t*.002;else if(a.type==='crowd')a.obj.material.opacity=.58+(Math.sin(t*3.1+(a.side||0))+1)*.07;else if(a.type==='led')a.obj.material.opacity=.055+(Math.sin(t*2+a.phase)+1)*.038+pulse*.025;else if(a.type==='ring')a.obj.material.opacity=.19+(Math.sin(t*1.3+a.phase)+1)*.055+pulse*.08;else if(a.type==='beam')a.obj.material.opacity=.035+(Math.sin(t*.9+a.phase)+1)*.022;else if(a.type==='portal'){const s=1+Math.sin(t*1.6)*.025+pulse*.08;a.obj.scale.setScalar(s);}}
  for(let i=attackAnims.length-1;i>=0;i--){const a=attackAnims[i];a.t+=dt;const q=Math.min(1,a.t/a.duration);a.update?.(a.obj,q,dt);if(q>=1){a.done?.();scene.remove(a.obj);a.obj.traverse?.(c=>{c.geometry?.dispose?.();if(c.material){if(Array.isArray(c.material))c.material.forEach(m=>m.dispose?.());else c.material.dispose?.();}});attackAnims.splice(i,1);}}
  for(let i=transient.length-1;i>=0;i--){const a=transient[i],o=a.obj;o.userData.life=(o.userData.life||0)+dt;const q=o.userData.max?o.userData.life/o.userData.max:0;if(a.kind==='ring'){o.scale.setScalar(1+q*2.9);o.material.opacity=Math.max(0,.8*(1-q));o.rotation.z+=dt*1.8;}else if(a.kind==='light'){o.intensity*=.78;}else if(a.kind==='sparks'){const ar=o.geometry.attributes.position.array;for(let k=0;k<o.userData.vel.length;k++){const vv=o.userData.vel[k];ar[k*3]+=vv.x*dt;ar[k*3+1]+=vv.y*dt;ar[k*3+2]+=vv.z*dt;vv.y-=2.6*dt;}o.geometry.attributes.position.needsUpdate=true;o.material.opacity=1-q;}else if(a.kind==='fade'){o.userData.max=o.userData.max||o.userData.life;o.material.opacity*=.83;}if((o.userData.max&&q>=1)||(a.kind==='fade'&&o.material.opacity<.01)){scene.remove(o);transient.splice(i,1);}}
  composer.render();
}

window.BattleArena3D={show,hide,hit,attack};
new MutationObserver(()=>{if(!screen)return;screen.classList.contains('d-none')?hide():show();}).observe(screen,{attributes:true,attributeFilter:['class']});
if(screen&&!screen.classList.contains('d-none'))show();
