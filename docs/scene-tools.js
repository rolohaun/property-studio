import {createTapTracker} from './pointer-gestures.js';
import * as THREE from './vendor/three.module.js';

export function distanceInFeet(a,b){return a.distanceTo(b)/.3048;}
export function formatFeet(feet){
 const inches=Math.round(feet*12),whole=Math.floor(inches/12);
 return `${feet.toFixed(2)} ft · ${whole}′ ${inches%12}″`;
}
export function isVisible(object){for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;}
function flagged(object,key){for(let p=object;p;p=p.parent)if(p.userData[key])return p.userData[key];return null;}
export function pickSurface(scene,camera,x,y,allowGhosts=false){
 scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
 const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(x*2-1,1-y*2),camera);
 return ray.intersectObjects(scene.children,true).find(hit=>hit.object.isMesh&&isVisible(hit.object)&&!flagged(hit.object,'toolOverlay')&&(!flagged(hit.object,'treeGhost')||allowGhosts))??null;
}

export function createSceneTools({scene,canvas,viewport,trees,getCamera,getLabelsVisible,activate,onTreesLayer,onModeChange=()=>{},onVisibilityChange=()=>{},invalidateShadows=()=>{}}){
 const $=s=>document.querySelector(s),overlay=new THREE.Group();overlay.userData.toolOverlay=true;scene.add(overlay);
 const marks=new THREE.Group();overlay.add(marks);
 const ghosts=new THREE.Group();scene.add(ghosts);
 const pointMaterial=new THREE.MeshBasicMaterial({color:0xf99d50,depthTest:false});
 const lineMaterial=new THREE.LineBasicMaterial({color:0xf49b51,depthTest:false});
 const treeById=new Map(trees.map(t=>[t.id,t]));let mode='navigate',points=[],selected=null;
 const readout=document.createElement('span');readout.className='label distance-label';readout.hidden=true;viewport.append(readout);
 const selection=new THREE.Box3Helper(new THREE.Box3(),0xe8a06d);selection.material.depthTest=false;selection.visible=false;overlay.add(selection);
 const selector=$('#tree-select');
 for(const tree of trees){const option=document.createElement('option');option.value=tree.id;option.textContent=tree.name;selector.append(option);
  const ghost=new THREE.Mesh(new THREE.CylinderGeometry(.30,.30,1.1,12,1,true),new THREE.MeshBasicMaterial({color:0xf0a263,wireframe:true,transparent:true,opacity:.8}));ghost.position.copy(tree.anchor).add(new THREE.Vector3(0,.55,0));ghost.userData.treeGhost=true;ghost.userData.treeId=tree.id;ghosts.add(ghost);tree.ghost=ghost;
 }
 function disposeMarks(){for(const object of [...marks.children]){marks.remove(object);object.geometry.dispose();}}
 function rebuild(){disposeMarks();for(const p of points){const dot=new THREE.Mesh(new THREE.SphereGeometry(.11,12,8),pointMaterial);dot.position.copy(p);dot.renderOrder=1001;marks.add(dot);}if(points.length===2){const segment=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),lineMaterial);segment.renderOrder=1000;marks.add(segment);}sync();}
 function sync(){invalidateShadows();
  for(const b of document.querySelectorAll('[data-tool]')){b.classList.toggle('active',b.dataset.tool===mode);b.setAttribute('aria-pressed',String(b.dataset.tool===mode));}
  $('#measure-panel').hidden=mode!=='measure';$('#tree-panel').hidden=mode!=='trees';canvas.style.cursor=mode==='measure'?'crosshair':mode==='trees'?'pointer':'';
  $('#measure-status').textContent=points.length===0?'Tap the first surface.':points.length===1?'First point set. Tap the second surface.':'Distance between selected points';
  $('#measure-result').textContent=points.length===2?formatFeet(distanceInFeet(...points)):'—';
  $('#measure-clear').disabled=points.length===0;$('#measure-undo').disabled=points.length===0;
  const item=treeById.get(selected);$('#tree-enabled').disabled=!item;$('#tree-enabled').checked=item?.group.visible??false;
  $('#tree-status').textContent=item?`${item.name} · ${item.group.visible?'visible':'hidden'}`:'Tap a tree, or choose one below.';
  selector.value=selected??'';for(const option of selector.options){const t=treeById.get(option.value);if(t)option.textContent=`${t.name}${t.group.visible?'':' (hidden)'}`;}
  $('#tree-hidden-count').textContent=`${trees.filter(t=>!t.group.visible).length} hidden`;
  update();
 }
 function setMode(value){if(!['navigate','measure','trees'].includes(value))throw new Error('Unknown scene tool');mode=value;taps.reset();onModeChange(value);if(value!=='navigate')activate();if(value==='trees')onTreesLayer();sync();}
 function setTreeVisible(id,visible){const tree=treeById.get(id);if(!tree||typeof visible!=='boolean')throw new Error('Invalid tree visibility');tree.group.visible=visible;selected=id;sync();onVisibilityChange();}
 function selectTree(id){if(id!==null&&!treeById.has(id))throw new Error('Unknown tree');selected=id;sync();}
 function clear(){points=[];rebuild();}
 function undo(){points.pop();rebuild();}
 function pick(x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>1||y<0||y>1)throw new Error('Pick must be inside the viewport');
  if(mode==='navigate')return null;
  const hit=pickSurface(scene,getCamera(),x,y,mode==='trees');
  if(!hit){if(mode==='measure')$('#measure-status').textContent='No surface here. Tap the model or ground.';return null;}
  if(mode==='trees'){const id=flagged(hit.object,'treeId');if(id)selectTree(id);else $('#tree-status').textContent='Tap a tree or its amber marker.';return {treeId:id};}
  if(points.length===2)points=[];points.push(hit.point.clone());rebuild();return {point:hit.point.toArray()};
 }
 const taps=createTapTracker();
 canvas.addEventListener('pointerdown',e=>{if(e.button===0)taps.down(e);});
 canvas.addEventListener('pointermove',e=>taps.move(e));
 canvas.addEventListener('pointerup',e=>{if(!taps.up(e)||e.button!==0)return;const r=canvas.getBoundingClientRect();pick((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);});
 for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>taps.cancel(e));
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#notes').open&&mode!=='navigate'){setMode('navigate');}});
 for(const b of document.querySelectorAll('[data-tool]'))b.onclick=()=>setMode(b.dataset.tool);
 $('#measure-clear').onclick=clear;$('#measure-undo').onclick=undo;
 selector.onchange=()=>selectTree(selector.value||null);
 $('#tree-enabled').onchange=e=>{if(selected)setTreeVisible(selected,e.target.checked);};
 $('#trees-restore').onclick=()=>{for(const tree of trees)tree.group.visible=true;sync();onVisibilityChange();};
 function update(){
  const parentVisible=trees[0]?.group.parent.visible??false;
  ghosts.visible=mode==='trees'&&parentVisible;for(const tree of trees)tree.ghost.visible=!tree.group.visible;
  const item=treeById.get(selected);selection.visible=mode==='trees'&&parentVisible&&!!item?.group.visible;
  if(selection.visible)selection.box.setFromObject(item.group);
  readout.hidden=points.length!==2||!getLabelsVisible();if(!readout.hidden){const p=points[0].clone().lerp(points[1],.5).project(getCamera());readout.hidden=p.z< -1||p.z>1||Math.abs(p.x)>1||Math.abs(p.y)>1;readout.style.left=`${(p.x*.5+.5)*viewport.clientWidth}px`;readout.style.top=`${(-p.y*.5+.5)*viewport.clientHeight-18}px`;readout.textContent=formatFeet(distanceInFeet(...points));}
 }
 function getState(){return {mode,points:points.map(p=>p.toArray()),distanceFeet:points.length===2?distanceInFeet(...points):null,selectedTree:selected,trees:trees.map(t=>({id:t.id,name:t.name,enabled:t.group.visible}))};}
 sync();return {setMode,setTreeVisible,selectTree,pick,clear,undo,update,getState};
}
