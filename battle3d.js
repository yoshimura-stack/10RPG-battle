import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.min.js';

const host = document.getElementById('battle-3d-stage');
const screen = document.getElementById('battle-screen');
let renderer, scene, camera, clock;
let visible = false;
let shake = 0;
let pulse = 0;
const animated = [];
const transient = [];

function neonMaterial(color, opacity=1){
  return new THREE.MeshBasicMaterial({color, transparent:opacity<1, opacity, blending:THREE.AdditiveBlending, depthWrite:false});
}
function standard(color, emissive=0x000000, rough=.45, metal=.55){
  return new THREE.MeshStandardMaterial({color, emissive, emissiveIntensity:1.25, roughness:rough, metalness:metal, transparent:true, opacity:.9});
}

function init(){
  if(!host || renderer) return;
  renderer = new THREE.WebGLRenderer({antialias:true, alpha:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.55));
  renderer.setSize(host.clientWidth || innerWidth, host.clientHeight || innerHeight, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  host.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x02030a, .047);
  clock = new THREE.Clock();
  camera = new THREE.PerspectiveCamera(48, (host.clientWidth||innerWidth)/(host.clientHeight||innerHeight), .1, 80);
  camera.position.set(0, 2.25, 13.5);

  scene.add(new THREE.HemisphereLight(0x5b7cff, 0x050106, .75));
  const keyL = new THREE.SpotLight(0x00eaff, 95, 28, Math.PI/5, .55, 1.35);
  keyL.position.set(-7,7,8); keyL.target.position.set(-2,0,-1); scene.add(keyL,keyL.target);
  const keyR = new THREE.SpotLight(0xff00db, 100, 28, Math.PI/5, .55, 1.35);
  keyR.position.set(7,7,8); keyR.target.position.set(2,0,-1); scene.add(keyR,keyR.target);
  const warm = new THREE.PointLight(0xffb100,22,15,1.7); warm.position.set(0,1,-5); scene.add(warm);

  // Main octagonal fighting platform.
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(7.15,7.45,.36,8,1,false,Math.PI/8), standard(0x080b12,0x060514,.31,.8));
  plate.position.set(0,-2.05,-.8); scene.add(plate);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(6.9,6.9,.035,8,1,false,Math.PI/8), new THREE.MeshStandardMaterial({color:0x0a0d14,metalness:.75,roughness:.22,transparent:true,opacity:.68}));
  top.position.set(0,-1.84,-.8); scene.add(top);

  // Perspective grid plane.
  const grid = new THREE.GridHelper(28,36,0x8bd8ff,0x23335e);
  grid.position.set(0,-1.80,-4); grid.material.transparent=true; grid.material.opacity=.29; scene.add(grid);
  animated.push({type:'grid',obj:grid});

  // Arena rings: multiple concentric layers create pseudo bloom.
  [6.75,6.55].forEach((r,i)=>{
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r,.035 + i*.025,8,128), neonMaterial(i?0xff00d9:0x00eaff,i?.24:.34));
    ring.rotation.x=Math.PI/2; ring.position.set(0,-1.75,-.8); scene.add(ring);
    animated.push({type:'ring',obj:ring,phase:i*1.7});
  });

  // Center energy lane and split-color edge lights.
  for(let i=0;i<9;i++){
    const z=2-i*1.35;
    const width=5.8 + i*.42;
    const beamL=new THREE.Mesh(new THREE.BoxGeometry(width,.018,.035), neonMaterial(0x00eaff,Math.max(.08,.24-i*.017)));
    beamL.position.set(-3.55,-1.73,z); beamL.rotation.y=.02; scene.add(beamL);
    const beamR=new THREE.Mesh(new THREE.BoxGeometry(width,.018,.035), neonMaterial(0xff00dc,Math.max(.08,.24-i*.017)));
    beamR.position.set(3.55,-1.73,z); beamR.rotation.y=-.02; scene.add(beamR);
  }

  // Receding gate frames make depth immediately readable.
  for(let i=0;i<7;i++){
    const z=-4-i*3.0, scale=1+i*.18;
    const group=new THREE.Group();
    const mat=neonMaterial(i%2?0x7b2cff:0x1ccfff,.16 + (6-i)*.015);
    const sideGeo=new THREE.BoxGeometry(.055,5.7*scale,.055);
    const topGeo=new THREE.BoxGeometry(13.4*scale,.055,.055);
    const a=new THREE.Mesh(sideGeo,mat), b=new THREE.Mesh(sideGeo,mat), c=new THREE.Mesh(topGeo,mat);
    a.position.x=-6.65*scale;b.position.x=6.65*scale;c.position.y=2.85*scale;
    group.add(a,b,c); group.position.set(0,-.9,z); scene.add(group);
  }

  // Vertical energy pylons on both sides.
  for(let side of [-1,1]) for(let i=0;i<4;i++){
    const x=side*(7.2+i*.65), z=-1-i*2.1;
    const pylon=new THREE.Mesh(new THREE.BoxGeometry(.09,4.8,.09),neonMaterial(side<0?0x00eaff:0xff00d9,.22));
    pylon.position.set(x,.25,z); scene.add(pylon);
  }

  // Suspended rings / holographic target reticles.
  for(let i=0;i<5;i++){
    const ret=new THREE.Mesh(new THREE.TorusGeometry(.7+i*.08,.018,6,48),neonMaterial(i%2?0xff44d8:0x41ddff,.12));
    ret.position.set((i-2)*3.2,1.15-(i%2)*.45,-7-i*1.8); ret.rotation.z=i*.31; scene.add(ret);
    animated.push({type:'reticle',obj:ret,phase:i*.8});
  }

  // Fine volumetric-style particles.
  const count=900, pos=new Float32Array(count*3), cols=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const side=Math.random()<.5?-1:1;
    pos[i*3]=(Math.random()*15-7.5); pos[i*3+1]=Math.random()*7-2; pos[i*3+2]=Math.random()*25-17;
    const c=new THREE.Color(side<0?0x28dfff:0xff38d4); cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;
  }
  const pg=new THREE.BufferGeometry(); pg.setAttribute('position',new THREE.BufferAttribute(pos,3)); pg.setAttribute('color',new THREE.BufferAttribute(cols,3));
  const pm=new THREE.PointsMaterial({size:.035,vertexColors:true,transparent:true,opacity:.62,blending:THREE.AdditiveBlending,depthWrite:false});
  const particles=new THREE.Points(pg,pm); scene.add(particles); animated.push({type:'particles',obj:particles});

  // Soft light discs behind each fighter, giving them separation from the photo background.
  for(const [x,c] of [[-3.6,0x00dfff],[3.6,0xff00cf]]){
    const glow=new THREE.Mesh(new THREE.CircleGeometry(2.7,64),neonMaterial(c,.055));
    glow.position.set(x,.25,-3.4); scene.add(glow); animated.push({type:'glow',obj:glow,phase:x});
  }

  window.addEventListener('resize', resize, {passive:true});
  renderer.setAnimationLoop(render);
}

function resize(){
  if(!renderer||!host) return;
  const w=host.clientWidth||innerWidth,h=host.clientHeight||innerHeight;
  camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h,false);
}

function show(){ init(); visible=true; host.style.opacity='1'; resize(); }
function hide(){ visible=false; if(host) host.style.opacity='0'; }

function burst(x,color,damage){
  if(!scene) return;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.72,.055,8,72),neonMaterial(color,.95));
  ring.position.set(x,.15,2.1); ring.userData.life=0; ring.userData.max=.55; scene.add(ring); transient.push({kind:'ring',obj:ring});
  const ring2=new THREE.Mesh(new THREE.TorusGeometry(.45,.022,6,64),neonMaterial(0xffffff,.9));
  ring2.position.copy(ring.position); ring2.userData.life=0; ring2.userData.max=.34; scene.add(ring2); transient.push({kind:'ring2',obj:ring2});
  const light=new THREE.PointLight(color,Math.min(180,65+damage*2),12,1.8); light.position.set(x,.3,2.8); light.userData.life=0;light.userData.max=.24;scene.add(light);transient.push({kind:'light',obj:light});

  const n=damage>=50?100:damage>=30?70:42;
  const pos=new Float32Array(n*3), vel=[];
  for(let i=0;i<n;i++){
    pos[i*3]=x;pos[i*3+1]=.15;pos[i*3+2]=2.0;
    const a=Math.random()*Math.PI*2, sp=.7+Math.random()*3.0;
    vel.push(new THREE.Vector3(Math.cos(a)*sp,(Math.random()-.35)*2.5,Math.sin(a)*sp));
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const m=new THREE.PointsMaterial({color,size:damage>=50?.085:.055,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false});
  const pts=new THREE.Points(g,m);pts.userData={life:0,max:.48,vel};scene.add(pts);transient.push({kind:'sparks',obj:pts});
}

function hit(side,damage=5){
  init();
  const x=side==='left'?-3.7:3.7;
  const color=side==='left'?0x00eaff:0xff00d7;
  shake=Math.max(shake,Math.min(.55,.08+damage*.008));
  pulse=Math.max(pulse,Math.min(1,damage/50));
  burst(x,color,damage);
  if(screen){
    screen.classList.remove('battle-impact'); void screen.offsetWidth; screen.classList.add('battle-impact');
    setTimeout(()=>screen.classList.remove('battle-impact'),180);
  }
}

function render(){
  if(!renderer||!scene||!camera||!visible) return;
  const t=clock.getElapsedTime(), dt=Math.min(clock.getDelta?.()||.016,.033);
  const baseX=Math.sin(t*.22)*.28;
  camera.position.x=baseX + (Math.random()-.5)*shake;
  camera.position.y=2.25 + Math.sin(t*.31)*.07 + (Math.random()-.5)*shake*.45;
  camera.position.z=13.5 + Math.sin(t*.18)*.12;
  camera.lookAt(0,-.15,-2.15);
  shake*=.86; pulse*=.92;
  for(const a of animated){
    if(a.type==='particles'){a.obj.rotation.y=t*.011;a.obj.position.z=Math.sin(t*.1)*.1;}
    else if(a.type==='reticle'){a.obj.rotation.z=t*.12+a.phase;a.obj.material.opacity=.09+(Math.sin(t*1.2+a.phase)+1)*.035;}
    else if(a.type==='ring'){a.obj.material.opacity=.24+(Math.sin(t*1.4+a.phase)+1)*.05 + pulse*.06;}
    else if(a.type==='glow'){const sc=1+Math.sin(t*.9+a.phase)*.06+pulse*.05;a.obj.scale.setScalar(sc);}
    else if(a.type==='grid'){a.obj.position.z=-4+(t*.22%1.35);}
  }
  for(let i=transient.length-1;i>=0;i--){
    const item=transient[i], o=item.obj; o.userData.life+=.016;
    const k=o.userData.life/o.userData.max;
    if(item.kind==='ring'||item.kind==='ring2'){o.scale.setScalar(1+k*3.8);o.material.opacity=Math.max(0,1-k);}
    else if(item.kind==='light'){o.intensity*=.82;}
    else if(item.kind==='sparks'){
      const arr=o.geometry.attributes.position.array;
      for(let j=0;j<o.userData.vel.length;j++){
        const v=o.userData.vel[j]; arr[j*3]+=v.x*.016;arr[j*3+1]+=v.y*.016;arr[j*3+2]+=v.z*.016;v.y-=1.9*.016;
      }
      o.geometry.attributes.position.needsUpdate=true;o.material.opacity=Math.max(0,1-k);
    }
    if(k>=1){scene.remove(o);o.geometry?.dispose?.();o.material?.dispose?.();transient.splice(i,1);}
  }
  renderer.render(scene,camera);
}

window.BattleArena3D={show,hide,hit};
init();
if(screen && !screen.classList.contains('d-none')) show(); else hide();
