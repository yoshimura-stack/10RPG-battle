import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.min.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/postprocessing/UnrealBloomPass.js';

const host = document.getElementById('battle-3d-stage');
const screen = document.getElementById('battle-screen');
let renderer, scene, camera, clock, composer;
let visible=false, shake=0, pulse=0, freezeUntil=0, impactSide=0;
const animated=[], transient=[];

function neonMaterial(color,opacity=1){return new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false});}
function standard(color,emissive=0x000000,rough=.45,metal=.55){return new THREE.MeshStandardMaterial({color,emissive,emissiveIntensity:1.2,roughness:rough,metalness:metal,transparent:true,opacity:.92});}
function addBar(x,y,z,w,h,color,opacity=.22){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,.035),neonMaterial(color,opacity));m.position.set(x,y,z);scene.add(m);return m;}

function init(){
  if(!host||renderer)return;
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.setSize(host.clientWidth||innerWidth,host.clientHeight||innerHeight,false);
  renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  host.appendChild(renderer.domElement);
  scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x02030a,.043);clock=new THREE.Clock();
  camera=new THREE.PerspectiveCamera(46,(host.clientWidth||innerWidth)/(host.clientHeight||innerHeight),.1,90);camera.position.set(0,2.2,13.7);

  scene.add(new THREE.HemisphereLight(0x6c83ff,0x08020a,.66));
  const keyL=new THREE.SpotLight(0x00eaff,110,32,Math.PI/5,.58,1.25);keyL.position.set(-7.5,7.5,8);keyL.target.position.set(-2.5,.2,-1);scene.add(keyL,keyL.target);
  const keyR=new THREE.SpotLight(0xff00dc,120,32,Math.PI/5,.58,1.25);keyR.position.set(7.5,7.5,8);keyR.target.position.set(2.5,.2,-1);scene.add(keyR,keyR.target);
  const warm=new THREE.PointLight(0xffbd20,28,17,1.6);warm.position.set(0,.5,-4.5);scene.add(warm);

  // Stage core.
  const plate=new THREE.Mesh(new THREE.CylinderGeometry(7.15,7.5,.36,8,1,false,Math.PI/8),standard(0x070a12,0x03030a,.28,.85));plate.position.set(0,-2.06,-.8);scene.add(plate);
  const top=new THREE.Mesh(new THREE.CylinderGeometry(6.92,6.92,.04,8,1,false,Math.PI/8),new THREE.MeshStandardMaterial({color:0x080c14,metalness:.82,roughness:.2,transparent:true,opacity:.76}));top.position.set(0,-1.84,-.8);scene.add(top);
  const grid=new THREE.GridHelper(31,42,0x8bd8ff,0x243765);grid.position.set(0,-1.80,-5);grid.material.transparent=true;grid.material.opacity=.27;scene.add(grid);animated.push({type:'grid',obj:grid});
  [6.8,6.56,5.7].forEach((r,i)=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.028+i*.014,8,144),neonMaterial(i===1?0xff00dc:0x00eaff,.22+i*.035));ring.rotation.x=Math.PI/2;ring.position.set(0,-1.75,-.8);scene.add(ring);animated.push({type:'ring',obj:ring,phase:i*1.3});});

  // Receding gates + top light bars create a real arena tunnel.
  for(let i=0;i<8;i++){
    const z=-4-i*3, s=1+i*.18, g=new THREE.Group(), c=i%2?0xff27db:0x27dfff, mat=neonMaterial(c,.11+(7-i)*.013);
    const sg=new THREE.BoxGeometry(.052,5.7*s,.052), tg=new THREE.BoxGeometry(13.4*s,.052,.052);
    const a=new THREE.Mesh(sg,mat),b=new THREE.Mesh(sg,mat),topg=new THREE.Mesh(tg,mat);a.position.x=-6.65*s;b.position.x=6.65*s;topg.position.y=2.85*s;g.add(a,b,topg);g.position.set(0,-.9,z);scene.add(g);
    addBar(0,2.45*s-.9,z+.05,5.0*s,.035,c,.07);
  }

  // LED wall panels in the back.
  for(let side of [-1,1]){
    for(let row=0;row<3;row++)for(let col=0;col<5;col++){
      const c=side<0?0x00dfff:0xff00d5; const p=new THREE.Mesh(new THREE.PlaneGeometry(.62,.22),neonMaterial(c,.06+Math.random()*.07));
      p.position.set(side*(3.7+col*.7),.3+row*.5,-12.5-Math.random()*2); p.rotation.y=side<0?.1:-.1;scene.add(p);animated.push({type:'led',obj:p,phase:Math.random()*6});
    }
  }

  // Audience light field: cheap but gives stadium scale.
  const crowdCount=520, cp=new Float32Array(crowdCount*3), cc=new Float32Array(crowdCount*3);
  for(let i=0;i<crowdCount;i++){
    const side=Math.random()<.5?-1:1, c=new THREE.Color(side<0?0x00cfff:0xff2bcf);
    cp[i*3]=side*(5.2+Math.random()*7);cp[i*3+1]=-1+Math.random()*4.5;cp[i*3+2]=-8-Math.random()*20;
    cc[i*3]=c.r;cc[i*3+1]=c.g;cc[i*3+2]=c.b;
  }
  const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.BufferAttribute(cp,3));cg.setAttribute('color',new THREE.BufferAttribute(cc,3));
  const cm=new THREE.PointsMaterial({size:.055,vertexColors:true,transparent:true,opacity:.52,blending:THREE.AdditiveBlending,depthWrite:false});const crowd=new THREE.Points(cg,cm);scene.add(crowd);animated.push({type:'crowd',obj:crowd});

  // Foreground atmosphere / haze planes.
  for(let i=0;i<7;i++){
    const haze=new THREE.Mesh(new THREE.PlaneGeometry(5+Math.random()*5,1.1+Math.random()*1.5),new THREE.MeshBasicMaterial({color:i%2?0x551166:0x083b4d,transparent:true,opacity:.025+Math.random()*.018,depthWrite:false,blending:THREE.AdditiveBlending}));
    haze.position.set((Math.random()-.5)*12,-1.1+Math.random()*2,-2-Math.random()*14);haze.rotation.z=(Math.random()-.5)*.2;scene.add(haze);animated.push({type:'haze',obj:haze,phase:Math.random()*8,speed:.04+Math.random()*.05});
  }

  // Fine particles across the full volume.
  const count=1050,pos=new Float32Array(count*3),cols=new Float32Array(count*3);
  for(let i=0;i<count;i++){const side=Math.random()<.5?-1:1;pos[i*3]=Math.random()*16-8;pos[i*3+1]=Math.random()*7-2;pos[i*3+2]=Math.random()*28-19;const c=new THREE.Color(side<0?0x28dfff:0xff38d4);cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;}
  const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pos,3));pg.setAttribute('color',new THREE.BufferAttribute(cols,3));
  const pm=new THREE.PointsMaterial({size:.034,vertexColors:true,transparent:true,opacity:.58,blending:THREE.AdditiveBlending,depthWrite:false});const particles=new THREE.Points(pg,pm);scene.add(particles);animated.push({type:'particles',obj:particles});

  // Back separation glows and pylons.
  for(const [x,c] of [[-3.7,0x00dfff],[3.7,0xff00cf]]){const glow=new THREE.Mesh(new THREE.CircleGeometry(2.9,64),neonMaterial(c,.045));glow.position.set(x,.2,-3.4);scene.add(glow);animated.push({type:'glow',obj:glow,phase:x});}
  for(let side of [-1,1])for(let i=0;i<5;i++){const pylon=new THREE.Mesh(new THREE.BoxGeometry(.08,4.7,.08),neonMaterial(side<0?0x00eaff:0xff00d9,.16));pylon.position.set(side*(7.15+i*.62),.15,-.8-i*2);scene.add(pylon);}

  // Cinematic bloom. If this module loads, it remains subtle enough for text/HUD above it.
  composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
  const bloom=new UnrealBloomPass(new THREE.Vector2(host.clientWidth||innerWidth,host.clientHeight||innerHeight),.72,.55,.68);composer.addPass(bloom);

  addEventListener('resize',resize,{passive:true});renderer.setAnimationLoop(render);
}

function resize(){if(!renderer||!host)return;const w=host.clientWidth||innerWidth,h=host.clientHeight||innerHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);composer?.setSize(w,h);}
function show(){init();visible=true;host.style.opacity='1';resize();}
function hide(){visible=false;if(host)host.style.opacity='0';}

function burst(x,color,damage){
  if(!scene)return; const strength=Math.min(1,damage/50);
  for(const [r,tube,life,white] of [[.56,.045,.42,false],[.38,.018,.28,true],[.95,.028,.58,false]]){
    const o=new THREE.Mesh(new THREE.TorusGeometry(r,tube,8,80),neonMaterial(white?0xffffff:color,white?.92:.8));o.position.set(x,.1,2.0);o.userData={life:0,max:life};scene.add(o);transient.push({kind:'ring',obj:o});
  }
  const flash=new THREE.PointLight(color,65+damage*2.7,14,1.6);flash.position.set(x,.25,2.8);flash.userData={life:0,max:.25};scene.add(flash);transient.push({kind:'light',obj:flash});
  const n=damage>=50?145:damage>=30?95:52,arr=new Float32Array(n*3),vel=[];
  for(let i=0;i<n;i++){arr[i*3]=x;arr[i*3+1]=.15;arr[i*3+2]=2;const a=Math.random()*Math.PI*2,sp=.8+Math.random()*(3+strength*2);vel.push(new THREE.Vector3(Math.cos(a)*sp,(Math.random()-.28)*3.2,Math.sin(a)*sp));}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(arr,3));const m=new THREE.PointsMaterial({color,size:damage>=50?.095:.06,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false});const pts=new THREE.Points(g,m);pts.userData={life:0,max:.52,vel};scene.add(pts);transient.push({kind:'sparks',obj:pts});
}

function hit(side,damage=5){
  init();const x=side==='left'?-3.7:3.7,color=side==='left'?0x00eaff:0xff00d7;
  const strength=Math.min(1,damage/50);shake=Math.max(shake,.07+strength*.52);pulse=Math.max(pulse,.25+strength*.75);impactSide=side==='left'?-1:1;
  freezeUntil=performance.now()+(damage>=50?105:damage>=30?78:damage>=10?55:38);
  burst(x,color,damage);
  screen?.classList.remove('battle-impact');void screen?.offsetWidth;screen?.classList.add('battle-impact');setTimeout(()=>screen?.classList.remove('battle-impact'),180);
}

function render(now=performance.now()){
  if(!renderer||!scene||!camera||!visible)return;const t=clock.getElapsedTime();
  // Hit-stop: intentionally hold one visual frame before the recoil/shake.
  if(now<freezeUntil){(composer||renderer).render?.(scene,camera);return;}
  const pan=Math.sin(t*.17)*.42,impactKick=impactSide*shake*.38;
  camera.position.x=pan+impactKick+(Math.random()-.5)*shake;
  camera.position.y=2.2+Math.sin(t*.27)*.065+(Math.random()-.5)*shake*.34;
  camera.position.z=13.65+Math.sin(t*.14)*.16+shake*.08;
  camera.lookAt(Math.sin(t*.12)*.16,-.18,-2.2);shake*=.84;impactSide*=.82;pulse*=.91;
  for(const a of animated){
    if(a.type==='particles'){a.obj.rotation.y=t*.009;a.obj.position.z=Math.sin(t*.1)*.11;}
    else if(a.type==='crowd'){a.obj.material.opacity=.40+(Math.sin(t*1.6)*.5+.5)*.14;}
    else if(a.type==='led'){a.obj.material.opacity=.045+(Math.sin(t*2.1+a.phase)+1)*.035+pulse*.02;}
    else if(a.type==='haze'){a.obj.position.x+=Math.sin(t*.18+a.phase)*a.speed*.02;a.obj.material.opacity=.018+(Math.sin(t*.35+a.phase)+1)*.012;}
    else if(a.type==='ring'){a.obj.material.opacity=.20+(Math.sin(t*1.35+a.phase)+1)*.045+pulse*.07;}
    else if(a.type==='glow'){const s=1+Math.sin(t*.82+a.phase)*.055+pulse*.055;a.obj.scale.setScalar(s);}
    else if(a.type==='grid'){a.obj.position.z=-5+(t*.20%1.33);}
  }
  for(let i=transient.length-1;i>=0;i--){const it=transient[i],o=it.obj;o.userData.life+=.016;const k=o.userData.life/o.userData.max;
    if(it.kind==='ring'){o.scale.setScalar(1+k*4.5);o.material.opacity=Math.max(0,1-k);}
    else if(it.kind==='light'){o.intensity*=.80;}
    else if(it.kind==='sparks'){const p=o.geometry.attributes.position.array;for(let j=0;j<o.userData.vel.length;j++){const v=o.userData.vel[j];p[j*3]+=v.x*.016;p[j*3+1]+=v.y*.016;p[j*3+2]+=v.z*.016;v.y-=2.1*.016;}o.geometry.attributes.position.needsUpdate=true;o.material.opacity=Math.max(0,1-k);}
    if(k>=1){scene.remove(o);o.geometry?.dispose?.();o.material?.dispose?.();transient.splice(i,1);}
  }
  if(composer)composer.render();else renderer.render(scene,camera);
}
window.BattleArena3D={show,hide,hit};init();if(screen&&!screen.classList.contains('d-none'))show();else hide();
