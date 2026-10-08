import * as THREE from 'three';
import {pointerFrame,planGesture} from './pointer-gestures.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {survey,localToSurvey,arcPoints,lotPolygon} from './survey.js';
import {addModelDetails} from './model-details.js';
import {createSceneTools} from './scene-tools.js';
import {rearLayout} from './rear-layout.js';
import {shedLayout} from './shed-layout.js';
import {westTree} from './landscape.js';
import {rearPanels,removedRearPanels} from './driveway-model.js';
import {fences as designFences,add as add2} from './garage-model.js';
import {createGarageDesigner} from './garage-designer.js';
import {basis as garageBasis,point as garagePoint,FT} from './garage-model.js';
import {FEET_PER_METRE,homeArea,garageArea,combinedArea,lengthText,areaText,fenceEnds} from './measurements.js';

const $=s=>document.querySelector(s), viewport=$('#viewport');
const touchDevice=navigator.maxTouchPoints>0||matchMedia('(any-pointer: coarse)').matches;
const compactLayout=matchMedia('(max-width: 1000px)');
function setControlsOpen(open){$('#property-controls').hidden=!open;$('#controls-toggle').textContent=open?'Hide controls':'Controls';$('#controls-toggle').setAttribute('aria-expanded',String(open));$('#sidebar-scrim').hidden=!open||!compactLayout.matches;}
function revealScene(){if(compactLayout.matches)setControlsOpen(false);}
$('#controls-toggle').onclick=()=>setControlsOpen($('#property-controls').hidden);$('#sidebar-scrim').onclick=()=>setControlsOpen(false);
compactLayout.addEventListener('change',()=>setControlsOpen(!compactLayout.matches));setControlsOpen(!compactLayout.matches);
const orbitHint=touchDevice?'One finger: orbit · Two fingers: pan / pinch to zoom':'Drag to orbit · Right-drag to pan · Scroll to zoom';
$('#orbit-instructions').textContent=orbitHint;
if(touchDevice)document.body.classList.add('touch-input');
let renderer;
try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:false}); }
catch { $('#loading').textContent='Your browser could not start the 3D view. Enable hardware acceleration or open this page in a WebGL-capable browser.'; $('#loading').classList.add('error'); throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio,touchDevice?1.5:2)); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
const invalidateShadows=()=>{renderer.shadowMap.needsUpdate=true;};invalidateShadows();
let contextLost=false;renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;$('#render-status').hidden=false;});renderer.domElement.addEventListener('webglcontextrestored',()=>{contextLost=false;invalidateShadows();$('#render-status').hidden=true;resize();});
renderer.setClearColor(0xe6edef); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.25;
viewport.prepend(renderer.domElement);
const scene=new THREE.Scene(); scene.fog=new THREE.Fog(0xe6edef,100,200);
const camera=new THREE.PerspectiveCamera(40,1,.1,300);
const ortho=new THREE.OrthographicCamera(-25,25,25,-25,.1,250);
let activeCamera=camera, currentView='overview', walk=false, units='metres', labelsVisible=true;
let designer=null;
const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.dampingFactor=.08; controls.maxPolarAngle=Math.PI/2-.04; controls.minDistance=7; controls.maxDistance=145; controls.target.set(0,0,0);
scene.add(new THREE.HemisphereLight(0xf0f8ff,0x647359,2.5));
const sun=new THREE.DirectionalLight(0xfff2db,3.7);sun.position.set(-28,48,-25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-38,right:38,top:38,bottom:-38,near:1,far:120});sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;scene.add(sun);
const materials={wall:new THREE.MeshStandardMaterial({color:0xe3e1d8,roughness:.85}),base:new THREE.MeshStandardMaterial({color:0x8c9898,roughness:.9}),trim:new THREE.MeshStandardMaterial({color:0xf0ede6,roughness:.65}),roof:new THREE.MeshStandardMaterial({color:0x35474d,roughness:.75}),roofLine:new THREE.MeshStandardMaterial({color:0x536268,roughness:.8}),wood:new THREE.MeshStandardMaterial({color:0xa88763,roughness:.95}),dark:new THREE.MeshStandardMaterial({color:0x334249,roughness:.7}),glass:new THREE.MeshStandardMaterial({color:0x547e90,metalness:.3,roughness:.19}),concrete:new THREE.MeshStandardMaterial({color:0xc9ceca,roughness:1}),grass:new THREE.MeshStandardMaterial({color:0x94ac78,roughness:1}),soil:new THREE.MeshStandardMaterial({color:0x6c7364,roughness:1})};
const groups={shed:new THREE.Group(),roof:new THREE.Group(),fence:new THREE.Group(),dimensions:new THREE.Group(),grid:new THREE.Group(),trees:new THREE.Group()};Object.values(groups).forEach(g=>scene.add(g));
const center=[17,14];
const world=(p,y=0)=>new THREE.Vector3(p[0]-center[0],y,center[1]-p[1]);
const pt=(u,d,y=0)=>world(localToSurvey(u,d),y);
function mesh(geometry,material,parent=scene){const m=new THREE.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(w,h,d,position,material,parent=scene){const m=mesh(new THREE.BoxGeometry(w,h,d),material,parent);m.position.copy(position);return m;}
function line(points,color=0xa57b53,parent=scene){const m=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color}));parent.add(m);return m;}
function flatPolygon(points,height,material,parent=scene){const shape=new THREE.Shape(points.map(p=>new THREE.Vector2(p[0]-center[0],p[1]-center[1])));const geo=new THREE.ShapeGeometry(shape);geo.rotateX(-Math.PI/2);const m=mesh(geo,material,parent);m.position.y=height;return m;}
function slab(points,height,depth,material,parent=scene){const shape=new THREE.Shape(points.map(p=>new THREE.Vector2(p[0]-center[0],p[1]-center[1])));const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false});geo.rotateX(-Math.PI/2);const m=mesh(geo,material,parent);m.position.y=height;return m;}
function localBox(u,d,w,depth,height,y,material,parent=scene){const m=box(w,height,depth,pt(u,d,y),material,parent);m.rotation.y=THREE.MathUtils.degToRad(-survey.building.bearing);return m;}
function beam(a,b,width,height,material,parent=scene){const mid=a.clone().add(b).multiplyScalar(.5);const m=box(width,height,a.distanceTo(b),mid,material,parent);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),b.clone().sub(a).normalize());return m;}

const base=mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshStandardMaterial({color:0xe0e8eb,roughness:1}));base.rotation.x=-Math.PI/2;base.position.y=-.38;base.receiveShadow=true;
slab(lotPolygon(),-.3,.30,materials.soil);
flatPolygon(lotPolygon(),.015,materials.grass);
const rearFence=designFences.south,alleyWidth=20*FT;
const alleyPoint=(station,depth)=>add2(add2(rearFence.a,rearFence.tangent,station),rearFence.inward,-depth);
const alleyCanvas=document.createElement('canvas');alleyCanvas.width=alleyCanvas.height=128;const ag=alleyCanvas.getContext('2d');let grain=47;
for(let y=0;y<128;y++)for(let x=0;x<128;x++){grain=(grain*1664525+1013904223)>>>0;const v=90+grain%35;ag.fillStyle=`rgb(${v},${v},${v-3})`;ag.fillRect(x,y,1,1);}
const alleyMap=new THREE.CanvasTexture(alleyCanvas);alleyMap.wrapS=alleyMap.wrapT=THREE.RepeatWrapping;alleyMap.repeat.set(.8,.8);alleyMap.colorSpace=THREE.SRGBColorSpace;
flatPolygon([alleyPoint(-18,0),alleyPoint(rearFence.length+18,0),alleyPoint(rearFence.length+18,alleyWidth),alleyPoint(-18,alleyWidth)],.028,new THREE.MeshStandardMaterial({map:alleyMap,roughness:1}));
for(const depth of [.12,alleyWidth-.12])line([world(alleyPoint(-18,depth),.033),world(alleyPoint(rearFence.length+18,depth),.033)],0xa29f8f);
const arc=arcPoints(60),c=survey.lot.arcCenter;
const ring=(r1,r2,extend=.5)=>{const t0=Math.atan2(survey.lot.nw[1]-c[1],survey.lot.nw[0]-c[0])-extend,t1=Math.atan2(survey.lot.ne[1]-c[1],survey.lot.ne[0]-c[0])+extend;const p=[];for(let i=0;i<=80;i++){const t=t0+(t1-t0)*i/80;p.push([c[0]+Math.cos(t)*r1,c[1]+Math.sin(t)*r1]);}for(let i=80;i>=0;i--){const t=t0+(t1-t0)*i/80;p.push([c[0]+Math.cos(t)*r2,c[1]+Math.sin(t)*r2]);}return p;};
flatPolygon(ring(11.6,16.4),-.13,new THREE.MeshStandardMaterial({color:0xb9c7ce,roughness:1}));
flatPolygon(ring(16.4,17.65),-.08,materials.concrete);
line(arc.map(p=>world(p,.045)),0xb68b61);
line([survey.lot.nw,survey.lot.sw,survey.lot.se,survey.lot.ne].map(p=>world(p,.045)),0xb68b61);

flatPolygon([[-.2,0],[6.35,0],[6.35,-10.8],[-.2,-10.8]].map(p=>localToSurvey(...p)),.035,materials.concrete);
for(let d=-9;d<0;d+=2.4)line([pt(-.2,d,.041),pt(6.35,d,.041)],0xb1bbb8);
flatPolygon([[6.15,-.5],[7.6,-.5],[7.6,6.65],[12.4,7.6],[14.35,8.2],[14.35,18.7],[13.75,18.45],[13.75,8.5],[7.35,7.2],[6.15,7.2]].map(p=>localToSurvey(...p)),.045,materials.concrete);
const rearWalkStart=localToSurvey(12.25,20.05),rearWalkEnd=[survey.lot.se[0]*.74,survey.lot.se[1]*.74];
const walkDirection=new THREE.Vector2(rearWalkEnd[0]-rearWalkStart[0],rearWalkEnd[1]-rearWalkStart[1]).normalize();
const walkSide=[-walkDirection.y*.38,walkDirection.x*.38];
flatPolygon([[rearWalkStart,1],[rearWalkEnd,1],[rearWalkEnd,-1],[rearWalkStart,-1]].map(([p,s])=>[p[0]+s*walkSide[0],p[1]+s*walkSide[1]]),.05,materials.concrete);
flatPolygon([[7.65,7.25],[11.4,7.95],[12.8,8.18],[7.65,8.18]].map(p=>localToSurvey(...p)),.12,materials.soil);
localBox(9.8,7.9,4.4,.12,.23,.13,materials.base);

const footprint=survey.building.footprint.map(p=>localToSurvey(...p));
const sh=shedLayout;
const {sp,address,trees,shedRoof}=addModelDetails({scene,groups,materials,mesh,box,localBox,beam,line,slab,flatPolygon,pt,world});

const gateMaterial=new THREE.MeshStandardMaterial({color:0x807368,roughness:1});
function fenceSegment(a,b,height=1.8,gate=false,parent=groups.fence){
 const p=world(a),q=world(b),length=p.distanceTo(q),n=Math.max(1,Math.ceil(length/1.8));
 for(let i=0;i<=n;i++){const v=p.clone().lerp(q,i/n);v.y=height/2+.025;box(.12,height+.05,.12,v,gate?gateMaterial:materials.wood,parent);}
 for(let i=0;i<n;i++){const a1=p.clone().lerp(q,i/n),b1=p.clone().lerp(q,(i+1)/n);for(const y of [.24,height-.2]){a1.y=y;b1.y=y;beam(a1,b1,.07,.09,gate?gateMaterial:materials.wood,parent);}}
 const boards=Math.ceil(length/.145);for(let i=0;i<boards;i++){const v=p.clone().lerp(q,(i+.5)/boards);v.y=height/2+.03;const m=box(.12,height-.08,.055,v,gate?gateMaterial:materials.wood,parent);m.rotation.y=-Math.atan2(q.z-p.z,q.x-p.x);}
}
const L=survey.lot;
fenceSegment(L.sw,fenceEnds.westBoundary);
fenceSegment(fenceEnds.westBoundary,fenceEnds.westHouse,1.8,true);
fenceSegment(L.se,fenceEnds.eastBoundary);
fenceSegment(fenceEnds.eastBoundary,fenceEnds.eastHouse,1.8,true);
const lerp2=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
const rearPanelGroups=rearPanels.map(panel=>{const group=new THREE.Group();group.userData.rearFencePanel=panel.id;groups.fence.add(group);fenceSegment(add2(L.sw,rearFence.tangent,panel.start),add2(L.sw,rearFence.tangent,panel.end),1.8,panel.gate,group);return group;});
function updateRearFence(design){const removed=new Set(removedRearPanels(design));rearPanelGroups.forEach((group,i)=>group.visible=!removed.has(i));}

const annotations=[];
const shedDimensions=new THREE.Group();groups.dimensions.add(shedDimensions);
function label(text,position,type='dimension',owner=null){const el=document.createElement('span');el.className=`label ${type}`;el.textContent=typeof text==='number'?lengthText(text,units):typeof text==='function'?text():text;$('#labels').append(el);annotations.push({el,position,type,text,owner});return el;}
function dimension(a,b,text,offset,parent=groups.dimensions,owner=null){const ap=a.clone().add(offset),bp=b.clone().add(offset);line([a,ap,bp,b],0xb18359,parent);const tick=b.clone().sub(a).normalize();const cross=new THREE.Vector3(-tick.z,0,tick.x).multiplyScalar(.25);for(const p of [ap,bp])line([p.clone().sub(cross),p.clone().add(cross)],0xb18359,parent);label(text,ap.clone().lerp(bp,.5),'dimension',owner);}
dimension(world(L.sw,.09),world(L.se,.09),30.48,new THREE.Vector3(-.2,0,2.3));
dimension(world(L.sw,.09),world(L.nw,.09),37.88,new THREE.Vector3(-2,0,-1));
dimension(world(L.ne,.09),world(L.se,.09),32.32,new THREE.Vector3(2.3,0,0));
label(()=>`${lengthText(10.40,units)} arc · R ${lengthText(18.27,units)}`,world(arc[32],.22).add(new THREE.Vector3(0,0,-1.5)));
dimension(pt(.594,17.964,.14),pt(13.518,17.964,.14),12.92,new THREE.Vector3(-.2,0,1.0));
dimension(pt(0,0,3.15),pt(6.146,0,3.15),6.15,new THREE.Vector3(0,0,-.8));
for(const measurement of sh.rearMeasurements)dimension(world(measurement.corner,.12),world(measurement.fencePoint,.12),measurement.distance,new THREE.Vector3(),shedDimensions,groups.shed);
dimension(sp(0,0,.14),sp(sh.width,0,.14),sh.width,sp(0,-.85).sub(sp(0,0)),shedDimensions,groups.shed);
dimension(sp(sh.width,0,.14),sp(sh.width,sh.depth,.14),sh.depth,sp(.85,0).sub(sp(0,0)),shedDimensions,groups.shed);
dimension(world(westTree.southReference,.16),world(westTree.position,.16),westTree.distanceFromSouth,new THREE.Vector3());
label('FRONT STREET',world([26.5,37.2],.03),'place');label('SOUTH BACK ALLEY',world(alleyPoint(rearFence.length/2,alleyWidth/2),.04),'place');
label('DWELLING',pt(8,13.2,5.35),'building');label('ATTACHED GARAGE',pt(3.0,3.9,4.85),'building');label('EXISTING SHED',sp(sh.width/2,sh.depth/2,3.25),'building',groups.shed);const mainEntryLabel=label('Main entrance',pt(7.4,6.7,1.4),'building small');const rearEntryLabel=label('Rear entrance',pt(rearLayout.doorCenter,18.35,2.6),'building small');
function rebuildGrid(){for(const child of [...groups.grid.children]){groups.grid.remove(child);child.geometry.dispose();child.material.dispose();}const spacing=units==='feet'?.3048:1,divisions=units==='feet'?230:70;const grid=new THREE.GridHelper(spacing*divisions,divisions,0x96a9b2,0xbbc9cf);grid.position.y=.065;grid.material.transparent=true;grid.material.opacity=.35;groups.grid.add(grid);}
rebuildGrid();groups.grid.visible=false;
function setLabels(visible){if(typeof visible!=='boolean')throw new Error('Invalid labels setting');labelsVisible=visible;$('#labels-toggle').checked=visible;address.visible=visible;designer?.syncLayers();}
$('#labels-toggle').addEventListener('change',e=>setLabels(e.target.checked));
function setUnits(value){if(!['metres','feet'].includes(value))throw new Error('Invalid units');units=value;document.querySelectorAll('[data-unit]').forEach(b=>{b.classList.toggle('active',b.dataset.unit===units);b.setAttribute('aria-pressed',String(b.dataset.unit===units));});for(const a of annotations)a.el.textContent=typeof a.text==='number'?lengthText(a.text,units):typeof a.text==='function'?a.text():a.text;document.querySelectorAll('[data-metres]').forEach(el=>el.textContent=lengthText(Number(el.dataset.metres),units));$('#grid-label').textContent=units==='feet'?'1 foot grid':'1 metre grid';$('#home-area').textContent='≈ '+areaText(homeArea,units);$('#garage-area').textContent='≈ '+areaText(garageArea,units);const other=units==='feet'?'metres':'feet';$('#alternate-areas').textContent=`Home ≈ ${areaText(homeArea,other)} · Garage ≈ ${areaText(garageArea,other)}`;$('#unit-symbol').textContent=units==='feet'?'ft':'m';$('#unit-note').textContent=`Dimensions in ${units}.`;if(walk)$('#view-description').textContent=`Eye height · ${lengthText(1.7,units)}`;rebuildGrid();designer?.syncLayers();}
document.querySelectorAll('[data-unit]').forEach(b=>b.onclick=()=>setUnits(b.dataset.unit));setUnits('metres');

const views={overview:{pos:[33,37,-48],target:[0,0,0],title:'The whole picture.',description:'A measured starting point for what comes next.'},front:{pos:[12,13,-41],target:[5,1,-8],title:'Welcome home.',description:'The north-facing garage and recessed main entrance.'},backyard:{pos:[-29,23,39],target:[-1,0,4],title:'Room for what’s next.',description:'The rear yard, existing shed and lane access.'},plan:{title:'Every dimension matters.',description:'North-up plan · property boundaries and building footprints.'}};
let transition=null;
function setView(name){if(!views[name])throw new Error('Unknown view');leaveWalk();currentView=name;const v=views[name];$('#view-title').textContent=v.title;$('#view-description').textContent=v.description;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===name);b.setAttribute('aria-pressed',String(b.dataset.view===name));});
 if(name==='plan'){transition=null;controls.enabled=false;activeCamera=ortho;ortho.position.set(0,70,0);ortho.up.set(0,0,-1);ortho.lookAt(0,0,0);ortho.zoom=1;resize();}
 else{activeCamera=camera;controls.enabled=true;transition={start:performance.now(),from:camera.position.clone(),to:new THREE.Vector3(...v.pos),targetFrom:controls.target.clone(),targetTo:new THREE.Vector3(...v.target)};resize();}}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{designer?.cancelDrawing();setView(b.dataset.view);revealScene();}));
function setLayer(name,visible){if(!Object.hasOwn(groups,name)||typeof visible!=='boolean')throw new Error('Invalid layer');groups[name].visible=visible;invalidateShadows();$(`#${name}-toggle`).checked=visible;if(name==='shed')shedDimensions.visible=visible;if(name==='roof')shedRoof.visible=visible;designer?.syncLayers();}
Object.keys(groups).forEach(name=>$(`#${name}-toggle`).addEventListener('change',e=>setLayer(name,e.target.checked)));
$('#reset-button').onclick=()=>{designer?.cancelDrawing();setView('overview');};
function zoom(amount){if(walk)return;if(activeCamera===ortho){ortho.zoom=THREE.MathUtils.clamp(ortho.zoom*amount,.5,4);ortho.updateProjectionMatrix();}else{transition=null;camera.position.sub(controls.target).multiplyScalar(1/amount).clampLength(7,145).add(controls.target);}}
$('#zoom-in').onclick=()=>zoom(1.2);$('#zoom-out').onclick=()=>zoom(1/1.2);
viewport.addEventListener('wheel',e=>{if(activeCamera===ortho){e.preventDefault();zoom(e.deltaY<0?1.1:1/1.1);}},{passive:false});
const keys=new Set();let yaw=0,pitch=0,mouseMode='paused',lockFailure='';
const gesturePointers=new Map();
function updateWalkHUD(){const locked=document.pointerLockElement===renderer.domElement;$('#crosshair').hidden=!walk||!locked;$('#walk-guide').classList.toggle('captured',locked);$('#resume-walk').hidden=!walk||locked||mouseMode==='touch'||mouseMode==='fallback';$('#walk-state').textContent=locked?'First-person · mouse captured':mouseMode==='paused'?'First-person paused':'First-person view';$('#walk-instructions').textContent=locked?'Move mouse to look · WASD to walk · Shift to go faster · Esc to release':mouseMode==='touch'?'Drag to look · Use the arrow buttons to walk':mouseMode==='fallback'?'Move the mouse over the scene to look · WASD to walk · Esc to pause. Open in a full browser for locked, unrestricted mouse movement.':'Resume mouse control to look freely and walk. Esc releases the mouse.';}
function requestMouseControl(){if(!walk)return;if(touchDevice){mouseMode='touch';updateWalkHUD();return;}if(!renderer.domElement.requestPointerLock){mouseMode='fallback';updateWalkHUD();return;}mouseMode='pending';try{const result=renderer.domElement.requestPointerLock();if(result?.catch)result.catch(error=>{lockFailure=String(error);if(walk&&document.pointerLockElement!==renderer.domElement){mouseMode='fallback';updateWalkHUD();}});}catch(error){lockFailure=String(error);mouseMode='fallback';updateWalkHUD();}}
function startWalk(){revealScene();document.body.classList.add('walking');designer?.close();sceneTools.setMode('navigate');viewport.setAttribute('aria-label','First-person property view. Move mouse to look, use WASD to walk and Escape to release or pause.');transition=null;walk=true;activeCamera=camera;controls.enabled=false;camera.fov=70;camera.position.copy(pt(7.08,-3.6,1.7));const facing=pt(6.784,7.0,1.65).sub(camera.position).normalize();yaw=Math.atan2(-facing.x,-facing.z);pitch=0;camera.quaternion.setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));$('#walk-guide').hidden=false;$('#view-title').textContent='Take a look around.';$('#view-description').textContent=`Eye height · ${lengthText(1.7,units)}`;$('#orbit-instructions').textContent='First-person · Esc releases mouse';document.querySelectorAll('[data-view]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});viewport.focus({preventScroll:true});resize();requestMouseControl();updateWalkHUD();}
function leaveWalk(){if(!walk)return;document.body.classList.remove('walking');viewport.setAttribute('aria-label','Interactive 3D property. Drag to orbit, right drag to pan, scroll to zoom.');walk=false;keys.clear();gesturePointers.clear();camera.fov=40;if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();mouseMode='paused';$('#walk-guide').hidden=true;$('#crosshair').hidden=true;$('#orbit-instructions').textContent=orbitHint;}
$('#walk-button').onclick=startWalk;$('#exit-walk').onclick=()=>setView('overview');$('#resume-walk').onclick=()=>{viewport.focus({preventScroll:true});requestMouseControl();};
document.addEventListener('pointerlockchange',()=>{keys.clear();gesturePointers.clear();mouseMode=document.pointerLockElement===renderer.domElement?'locked':'paused';updateWalkHUD();});
document.addEventListener('pointerlockerror',()=>{if(walk){mouseMode='fallback';keys.clear();updateWalkHUD();}});
function look(dx,dy){yaw-=dx*.0021;pitch=THREE.MathUtils.clamp(pitch-dy*.0021,-1.42,1.42);camera.quaternion.setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));}
document.addEventListener('mousemove',e=>{if(walk&&document.pointerLockElement===renderer.domElement)look(e.movementX,e.movementY);});
window.addEventListener('keydown',e=>{if(!walk||$('#notes').open)return;const k=e.key.toLowerCase();if(k==='escape'){keys.clear();if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();else if(mouseMode==='paused')setView('overview');else{mouseMode='paused';updateWalkHUD();}return;}if(['locked','touch','fallback'].includes(mouseMode)&&['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(k)){e.preventDefault();keys.add(k);}});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{gesturePointers.clear();keys.clear();if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();});document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();gesturePointers.clear();}});
viewport.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;
 if(walk&&mouseMode==='paused'){requestMouseControl();return;}
 if(!((walk&&mouseMode==='touch')||activeCamera===ortho))return;
 if(designer?.isCapturing()&&e.pointerType!=='touch')return;
 gesturePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});renderer.domElement.setPointerCapture(e.pointerId);
});
viewport.addEventListener('pointermove',e=>{
 if(walk&&mouseMode==='fallback'){look(e.movementX,e.movementY);return;}
 const old=gesturePointers.get(e.pointerId);if(!old||document.pointerLockElement===renderer.domElement)return;
 const before=pointerFrame(gesturePointers),first=gesturePointers.keys().next().value;
 gesturePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(walk){if(first===e.pointerId)look((e.clientX-old.x)*1.7,(e.clientY-old.y)*1.7);return;}
 if(activeCamera!==ortho||(designer?.isCapturing()&&gesturePointers.size<2))return;
 const after=pointerFrame(gesturePointers),r=viewport.getBoundingClientRect();
 const change=planGesture({...before,x:before.x-r.left,y:before.y-r.top},{...after,x:after.x-r.left,y:after.y-r.top},ortho.zoom,ortho.top-ortho.bottom,r.width,r.height);
 ortho.zoom=change.zoom;ortho.position.x+=change.x;ortho.position.z+=change.z;ortho.updateProjectionMatrix();
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(event,e=>gesturePointers.delete(e.pointerId));
document.querySelectorAll('[data-move]').forEach(b=>{const k={forward:'w',back:'s',left:'a',right:'d'}[b.dataset.move];b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(k);};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>keys.delete(k);});
function inPolygon(p,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
const shedFoot=sh.footprint;
function moveWalk(dt){if(!walk||$('#notes').open||!['locked','touch','fallback'].includes(mouseMode))return;const forward=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown')),side=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));const v=new THREE.Vector3(side,0,-forward);if(v.lengthSq()){v.normalize().applyAxisAngle(new THREE.Vector3(0,1,0),yaw).multiplyScalar(dt*(keys.has('shift')?5:2.7));const test=camera.position.clone().add(v),p=[test.x+center[0],center[1]-test.z];if(!inPolygon(p,footprint)&&!(groups.shed.visible&&inPolygon(p,shedFoot))&&!designer?.contains(p)&&Math.abs(test.x)<65&&Math.abs(test.z)<65)camera.position.copy(test);}}
$('#info-button').onclick=$('#source-button').onclick=()=>{keys.clear();if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();$('#notes').showModal();};$('#close-notes').onclick=()=>$('#notes').close();$('#notes').addEventListener('click',e=>{if(e.target===$('#notes')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.zoom=walk?1:Math.min(1,(w/h)/.95);camera.updateProjectionMatrix();const half=Math.max(23,22/(w/h));ortho.left=-half*w/h;ortho.right=half*w/h;ortho.top=half;ortho.bottom=-half;ortho.updateProjectionMatrix();}
const sceneTools=createSceneTools({onVisibilityChange:()=>designer?.syncLayers(),invalidateShadows,scene,canvas:renderer.domElement,viewport,trees,getCamera:()=>activeCamera,getLabelsVisible:()=>labelsVisible,onTreesLayer:()=>setLayer('trees',true),onModeChange:mode=>{if(mode!=='navigate')designer?.close();},activate:()=>{transition=null;if(walk){const target=camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(8));leaveWalk();controls.target.copy(target);controls.enabled=true;resize();}}});
designer=createGarageDesigner({
 getDisplay:()=>({layers:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.visible])),labels:labelsVisible,units,trees:trees.map(t=>({id:t.id,enabled:t.group.visible}))}),
 restoreDisplay:display=>{for(const [name,visible] of Object.entries(display.layers??{}))setLayer(name,visible);if(display.labels!==undefined)setLabels(display.labels);if(display.units)setUnits(display.units);for(const t of display.trees??[])if(trees.some(tree=>tree.id===t.id))sceneTools.setTreeVisible(t.id,t.enabled);sceneTools.selectTree(null);},
 invalidateShadows,revealScene,showControls:()=>setControlsOpen(true),scene,canvas:renderer.domElement,viewport,materials,world,trees,updateRearFence,getLayer:name=>groups[name].visible,setLayer,setLabels,getCamera:()=>activeCamera,getLabelsVisible:()=>labelsVisible,getDimensionsVisible:()=>groups.dimensions.visible,getRoofVisible:()=>groups.roof.visible,
 activate:()=>{leaveWalk();sceneTools.setMode('navigate');transition=null;},
 setCapture:captured=>{controls.enabled=!captured&&!walk&&activeCamera===camera;},
 focusPlan:()=>{setView('plan');ortho.position.set(-3,70,8);ortho.zoom=1.45;ortho.updateProjectionMatrix();},
 focusGarage:s=>{leaveWalk();transition=null;activeCamera=camera;currentView='backyard';const b=garageBasis(s),target=world(garagePoint(s,s.width*FT/2,s.depth*FT/2),(s.garageHeight+s.loftHeight)*FT*.45),distance=Math.max(s.width*FT,s.depth*FT,(s.garageHeight+s.loftHeight)*FT)*2+7;controls.target.copy(target);camera.position.copy(target).add(new THREE.Vector3(-b.v[0]*distance+b.u[0]*distance*.38,distance*.68,b.v[1]*distance-b.u[1]*distance*.38));controls.enabled=true;camera.lookAt(target);$('#view-title').textContent='Your new garage.';$('#view-description').textContent='Click a wall to place doors and windows.';document.querySelectorAll('[data-view]').forEach(el=>{el.classList.remove('active');el.setAttribute('aria-pressed','false');});resize();}
});
new ResizeObserver(resize).observe(viewport);camera.position.set(...views.overview.pos);resize();
function updateLabels(){const w=viewport.clientWidth,h=viewport.clientHeight;activeCamera.updateMatrixWorld();for(const a of annotations){const v=a.position.clone().project(activeCamera),entryVisible=a.el===mainEntryLabel?activeCamera.position.clone().sub(pt(6.784,7.168)).dot(pt(0,1).sub(pt(0,0)))<0:a.el===rearEntryLabel?activeCamera.position.clone().sub(pt(0,17.964)).dot(pt(0,1).sub(pt(0,0)))>0:true,show=(!a.owner||a.owner.visible)&&entryVisible&&labelsVisible&&!walk&&(a.type.includes('dimension')?groups.dimensions.visible:true)&&v.z<1&&v.z>-1&&Math.abs(v.x)<1&&Math.abs(v.y)<1;a.el.style.display=show?'block':'none';if(show){a.el.style.left=`${(v.x*.5+.5)*w}px`;a.el.style.top=`${(-v.y*.5+.5)*h}px`;}}
const north=world([17,19]).project(activeCamera),origin=world([17,14]).project(activeCamera);const angle=Math.atan2(north.x-origin.x,north.y-origin.y);$('#compass-arrow').style.transform=`rotate(${angle}rad)`;
const placed=[];for(const a of annotations){if(a.el.style.display==='none')continue;const x=parseFloat(a.el.style.left),y=parseFloat(a.el.style.top),aw=a.el.offsetWidth,ah=a.el.offsetHeight;const bounds={left:x-aw/2-3,right:x+aw/2+3,top:y-ah/2-3,bottom:y+ah/2+3};if(placed.some(b=>bounds.left<b.right&&bounds.right>b.left&&bounds.top<b.bottom&&bounds.bottom>b.top))a.el.style.display='none';else placed.push(bounds);}
const p1=new THREE.Vector3(0,0,0).project(activeCamera),p2=new THREE.Vector3(units==='feet'?20/FEET_PER_METRE:5,0,0).project(activeCamera);const px=Math.hypot((p2.x-p1.x)*w/2,(p2.y-p1.y)*h/2);$('#scale-line').style.width=`${px}px`;$('.scale').style.visibility=!labelsVisible||walk||px>180||px<10?'hidden':'visible';$('#scale-text').textContent=(units==='feet'?'20 ft':'5 m')+(activeCamera===ortho?'':' at centre');}
let last=performance.now();function animate(now){requestAnimationFrame(animate);if(document.hidden||contextLost||now-last<16)return;const dt=Math.min((now-last)/1000,.05);last=now;if(transition){let t=Math.min((now-transition.start)/850,1);t=1-Math.pow(1-t,3);camera.position.lerpVectors(transition.from,transition.to,t);controls.target.lerpVectors(transition.targetFrom,transition.targetTo,t);if(t>=1)transition=null;}if(controls.enabled)controls.update();moveWalk(dt);updateLabels();sceneTools.update();designer.update();renderer.render(scene,activeCamera);}requestAnimationFrame(animate);$('#loading').remove();
window.propertyStudio={survey,setView,setLayer,setUnits,setLabels,getState:()=>({tools:sceneTools.getState(),garageDesigner:designer.getState(),westTree,rearLayout,shedLayout,view:walk?'ground':currentView,layers:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.visible])),units,labelsVisible,visibleSceneLabels:annotations.filter(a=>a.el.style.display!=='none').length,camera:activeCamera.position.toArray(),look:{yaw,pitch},mouseMode,lockFailure,pointerLocked:document.pointerLockElement===renderer.domElement,areas:{homeSqM:homeArea,garageSqM:garageArea,totalSqM:combinedArea},fenceEnds,footprint:footprint.map(p=>[...p])})};
if(document.modelContext?.registerTool){const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
 register({name:'read_property_state',title:'Read property view',description:'Read the current units, label visibility, first-person state, camera and estimated areas.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>window.propertyStudio.getState()});
 register({name:'use_scene_tool',title:'Use scene tools',description:'Choose measurement or tree mode, pick a point on the visible viewport (normalised x/y), clear/undo a measurement, or change an individual tree. Uses the same raycast and state as the on-screen controls.',inputSchema:{type:'object',properties:{mode:{type:'string',enum:['navigate','measure','trees']},action:{type:'string',enum:['pick','clear','undo','tree']},x:{type:'number',minimum:0,maximum:1},y:{type:'number',minimum:0,maximum:1},treeId:{type:'string'},enabled:{type:'boolean'}},additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(input.mode)sceneTools.setMode(input.mode);if(input.action==='pick')sceneTools.pick(input.x,input.y);if(input.action==='clear')sceneTools.clear();if(input.action==='undo')sceneTools.undo();if(input.action==='tree')sceneTools.setTreeVisible(input.treeId,input.enabled);return sceneTools.getState();}});
 register({name:'configure_property_view',title:'Configure property view',description:'Change the current view, unit system, scene labels or visible layers.',inputSchema:{type:'object',properties:{view:{type:'string',enum:['overview','plan','front','backyard']},units:{type:'string',enum:['metres','feet']},labels:{type:'boolean'},layers:{type:'object',properties:{shed:{type:'boolean'},roof:{type:'boolean'},fence:{type:'boolean'},dimensions:{type:'boolean'},grid:{type:'boolean'},trees:{type:'boolean'}},additionalProperties:false}},additionalProperties:false},annotations:{readOnlyHint:false},execute:async input=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['view','units','labels','layers'].includes(k)))throw new Error('Invalid configuration');if(input.view!==undefined&&!Object.hasOwn(views,input.view))throw new Error('Invalid view');if(input.units!==undefined&&!['metres','feet'].includes(input.units))throw new Error('Invalid units');if(input.labels!==undefined&&typeof input.labels!=='boolean')throw new Error('Invalid labels');if(input.layers!==undefined&&(!input.layers||typeof input.layers!=='object'||Array.isArray(input.layers)||Object.entries(input.layers).some(([k,v])=>!Object.hasOwn(groups,k)||typeof v!=='boolean')))throw new Error('Invalid layers');if(input.view)setView(input.view);if(input.units)setUnits(input.units);if(input.labels!==undefined)setLabels(input.labels);for(const[k,v]of Object.entries(input.layers??{}))setLayer(k,v);await new Promise(resolve=>setTimeout(resolve,950));return window.propertyStudio.getState();}});
}
