import {createDesignStore} from './design-storage.js';
import {createTapTracker} from './pointer-gestures.js';
import * as THREE from './vendor/three.module.js';
import {pickSurface} from './scene-tools.js';
import {FT,newDesign,basis,point,footprint,wallInfo,wallPoint,openingRect,nearestFence,fences,clamp,dot,sub,warnings,validateDesign,inside} from './garage-model.js';
import {drivewayLayout,rearPanels,removedRearPanels} from './driveway-model.js';
import {garageMetrics} from './garage-clearance.js';
import {formatFeet} from './scene-tools.js';
import {createGarageView} from './garage-view.js';

const openingId=()=>globalThis.crypto.randomUUID?.()??Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16).padStart(8,'0')).join('-');

export function createGarageDesigner(ctx){
 const {scene,canvas,viewport,world,getCamera,activate,focusPlan,focusGarage,setCapture,trees,getLayer,setLayer,getLabelsVisible,setLabels}=ctx;
 const $=s=>document.querySelector(s);let s=newDesign(),editing=false,fenceEditing=false,phase='idle',selectedWall='front',selectedOpening=null,slide=null,backup=null,message='Pick a fence, set your setback, then draw a rectangle.';
 const store=createDesignStore();
 const restored=store.initialize(s,ctx.getDisplay());s=restored.design;ctx.restoreDisplay(restored.display);
 const taps=createTapTracker();
 const view=createGarageView(ctx),panel=$('#garage-designer');
 panel.innerHTML=`<div class="designer-heading"><div><span class="eyebrow">BACKYARD PLANNER</span><h2>Design your garage</h2></div><button id="garage-close" aria-label="Close garage designer">×</button></div>
 <p class="designer-intro">Snap to a fence, draw a footprint, then add openings.</p><p id="garage-autosave" class="autosave-status" role="status" aria-live="polite"></p><p class="field-help">Autosave stays on this browser. Export a file for a backup or another device.</p><div class="designer-display"><label><input id="designer-trees" type="checkbox">Trees</label><label><input id="designer-shed" type="checkbox">Shed</label><label><input id="designer-roof" type="checkbox">Roof</label><label><input id="designer-labels" type="checkbox">Labels</label></div>
 <div id="garage-metrics" class="garage-metrics" aria-live="polite">
 <div><span>Garage footprint</span><output id="design-garage-area">—</output><small>Exterior area · loft excluded</small></div>
 <div><span>Nearest corner → south wall</span><output id="design-house-clearance">—</output><small id="design-corner-detail">Place a garage to measure.</small></div>
 <p id="design-clearance-target">Your planning target: 10 ft</p><p id="design-minimum-gap" hidden></p></div>
 <details class="clearance-reference"><summary>How clearance is measured</summary><p>Horizontal distance from the nearest garage corner to the south house wall. Roof overhangs are excluded. The target indicator checks the shortest gap between the two wall footprints. The 10 ft target is illustrative; check local requirements separately.</p></details>
 <div class="designer-status" id="garage-status" role="status"></div>
 <section><h3>1 · Position & footprint</h3>
 <label>Reference fence<select id="garage-fence"><option value="south">South / rear</option><option value="west">West</option><option value="east">East</option></select></label>
 <div class="input-pair"><label>Setback (ft)<input id="garage-setback" type="number" inputmode="decimal" min="0" max="30" step=".25" value="5"></label><label>Along fence (ft)<input id="garage-station" type="number" inputmode="decimal" min="0" step=".25" value="32"></label></div>
 <p class="field-help">Setback is square to the fence, to the nearest wall. Along fence starts at the south corner.</p>
 <div class="input-pair"><label>Width · along fence (ft)<input id="garage-width" type="number" inputmode="decimal" min="8" max="60" step=".5" value="20"></label><label>Depth · into yard (ft)<input id="garage-depth" type="number" inputmode="decimal" min="8" max="60" step=".5" value="24"></label></div>
 <div class="designer-actions"><button id="garage-draw" class="primary">Draw footprint</button><button id="garage-place">Place this size</button></div><button id="garage-cancel" class="secondary" hidden>Cancel drawing</button>
 <div class="designer-actions"><button id="garage-reverse">Reverse along fence</button><button id="garage-plan">Plan view</button></div>
 </section><section><h3>2 · Walls & roof</h3><div class="input-pair"><label>Garage walls (ft)<input id="garage-garageHeight" type="number" inputmode="decimal" min="7" max="16" step=".5" value="9"></label><label>Loft walls (ft)<input id="garage-loftHeight" type="number" inputmode="decimal" min="0" max="12" step=".5" value="7"></label></div>
 <label>Roof ridge<select id="garage-ridge"><option value="auto">Auto · face garage door</option><option value="depth">Along depth</option><option value="width">Along width</option></select></label><p class="field-help">Set loft height to 0 for no loft. Siding, shingles and trim match the house.</p><button id="garage-3d" class="primary wide">Inspect in 3D</button>
 </section><section><h3>3 · Doors & windows</h3><p class="field-help">Tap a garage wall or choose it here.</p><div id="garage-walls" class="wall-buttons"></div><div class="opening-buttons"><button data-add-opening="garage">Garage door</button><button data-add-opening="door">Man door</button><button data-add-opening="window">Window</button></div>
 <label>Selected opening<select id="garage-opening"><option value="">Select an opening…</option></select></label>
 <div id="opening-editor" hidden><label>Position along wall <output id="opening-position-label"></output><input id="opening-position" type="range" step=".01"></label><p class="field-help">Use this slider to move the opening along its wall. With a mouse or pencil, you can also drag it in 3D.</p>
 <div id="opening-size-fields"><div class="input-pair"><label>Width (ft)<input id="opening-width" type="number" inputmode="decimal" min="1" max="20" step=".25"></label><label>Height (ft)<input id="opening-height" type="number" inputmode="decimal" min="1" max="12" step="any"></label></div></div>
 <div id="window-fields"><label>Window level<select id="opening-level"><option value="garage">Garage</option><option value="loft">Office loft</option></select></label><label>Sill above floor (ft)<input id="opening-sill" type="number" inputmode="decimal" min="0" max="10" step=".25"></label></div>
 <p id="opening-size" class="field-help"></p><button id="opening-remove" class="secondary">Remove opening</button></div>
 </section><section><h3>4 · Driveway & alley</h3>
 <label class="inline-check"><input id="driveway-enabled" type="checkbox">Add driveway to south alley</label>
 <p class="field-help">Follows the garage door. Side doors create a curved turn; a rear-facing door connects directly.</p>
 <div id="driveway-fields" hidden><div class="input-pair"><label>Driveway width (ft)<input id="driveway-width" type="number" inputmode="decimal" min="6" max="40" step=".5"></label><label>Alley connection (ft)<input id="driveway-exit" type="number" inputmode="decimal" min="0" max="100" step=".01"></label></div>
 <p class="field-help">Alley connection is measured along the south fence from the southwest corner.</p>
 <div class="designer-actions"><button id="driveway-match">Match door width</button><button id="driveway-auto">Auto connection</button></div>
 <label class="inline-check"><input id="driveway-fence" type="checkbox" checked>Open fence at driveway</label></div>
 <p id="driveway-status" class="field-help" role="status"></p>
 <div class="designer-actions"><button id="fence-edit" aria-pressed="false">Edit rear fence panels</button><button id="fence-restore">Restore all panels</button></div>
 <p class="field-help">In fence editing, tap a panel or its ground marker to remove or restore it. Amber = removed. Blue = retained.</p>
 </section><section><h3>Design summary</h3><output id="garage-summary"></output><ul id="garage-warnings"></ul><p class="field-help">Concept dimensions. Setbacks measure walls; roof overhangs extend a further 1¼ ft.</p><div class="designer-actions"><button id="garage-save">Export design</button><button id="garage-load">Load design</button></div><input id="garage-file" type="file" accept="application/json,.json" hidden><p class="field-help">Changes save automatically on this browser. Export a JSON file to keep a separate copy, then load it on your iPad or computer.</p><button id="garage-remove" class="secondary">Remove garage</button></section>`;
 const fileDialog=document.createElement('dialog');fileDialog.id='garage-file-dialog';fileDialog.innerHTML=`<div class="dialog-head"><span class="eyebrow">GARAGE DESIGN FILE</span><button id="design-file-close" aria-label="Close design file">×</button></div><h2 id="design-file-title">Save your design</h2><p>Download a JSON file, or copy the design text into a file. To restore it, load the file or paste its text here.</p><label for="design-file-text">Design JSON</label><textarea id="design-file-text" rows="10" spellcheck="false"></textarea><p id="design-file-status" role="status"></p><div class="file-actions"><button id="design-download">Download JSON</button><button id="design-copy">Copy text</button><button id="design-apply">Load this design</button><button id="design-browse">Choose file</button></div>`;document.body.append(fileDialog);
 const wallButtons=$('#garage-walls');for(const id of ['front','back','left','right']){const b=document.createElement('button');b.dataset.wall=id;b.onclick=()=>selectWall(id);wallButtons.append(b);}
 function persist(){
  const result=store.save(s,ctx.getDisplay(),{phase}),el=$('#garage-autosave');
  const time=result.savedAt?new Date(result.savedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'';
  el.dataset.status=result.status;
  el.textContent=({empty:'Autosave ready · create or load a design.',restored:`Saved design restored · ${time}`,saved:`Saved on this browser · ${time}`,draft:'Finish drawing to save the new footprint.',unavailable:'Browser save unavailable. Export a file to keep your design.',invalid:'Saved data could not be restored. Load a backup or start a new design.', 'invalid-edit':'This edit could not be saved. Your previous save is retained.'})[result.status];
 }
 function selected(){return s.openings.find(o=>o.id===selectedOpening);}
 function setField(id,value){const el=$(id);if(document.activeElement!==el)el.value=String(value);}
 function sync(){
  $('#draw-hint').hidden=!editing||(phase==='idle'&&!fenceEditing);$('#draw-hint-text').textContent=message;$('#draw-hint-cancel').textContent=fenceEditing?'Done':'Cancel';
  panel.hidden=!editing;$('#baseline-controls').hidden=editing;document.body.classList.toggle('designing',editing);$('#garage-toggle').classList.toggle('active',editing);$('#garage-toggle').setAttribute('aria-pressed',String(editing));$('#garage-status').textContent=message;
  for(const key of ['fence','setback','station','width','depth','garageHeight','loftHeight','ridge'])setField(`#garage-${key}`,s[key]);
  $('#designer-trees').checked=getLayer('trees');$('#designer-shed').checked=getLayer('shed');$('#designer-roof').checked=getLayer('roof');$('#designer-labels').checked=getLabelsVisible();
  const metrics=garageMetrics(s),clearance=metrics?.clearance;
  $('#design-garage-area').textContent=metrics?`${metrics.areaSqFt.toLocaleString('en-CA',{maximumFractionDigits:1})} sq ft`:'—';
  $('#design-house-clearance').textContent=clearance?`${(clearance.corner.distance/FT).toFixed(2)} ft`:'—';
  $('#design-corner-detail').textContent=clearance?`${formatFeet(clearance.corner.distance/FT).split(' · ')[1]} · horizontal distance`:'Place a garage to measure.';
  $('#garage-metrics').dataset.status=!clearance?'empty':clearance.overlaps?'overlap':clearance.meetsTarget?'meets':'below';
  $('#design-clearance-target').textContent=!clearance?'Your planning target: 10 ft':clearance.overlaps?'House footprints overlap — move the garage.':clearance.meetsTarget?'Meets your 10 ft spacing target':'Below your 10 ft spacing target';
  const showMinimum=clearance&&!clearance.overlaps&&clearance.corner.distance-clearance.minimum.distance>.003;
  $('#design-minimum-gap').hidden=!showMinimum;if(showMinimum)$('#design-minimum-gap').textContent=`A wall edge is closer: ${(clearance.minimum.distance/FT).toFixed(2)} ft minimum building gap.`;
  const driveway=drivewayLayout(s);$('#driveway-enabled').checked=s.driveway.enabled;$('#driveway-enabled').disabled=!s.placed;$('#driveway-fields').hidden=!s.driveway.enabled;
  const door=s.openings.find(o=>o.type==='garage');setField('#driveway-width',s.driveway.width||(door?openingRect(s,door).width:18));setField('#driveway-exit',Number((driveway.exitStation??s.driveway.exitStation??0).toFixed(2)));$('#driveway-exit').max=(fences.south.length/FT).toFixed(2);$('#driveway-fence').checked=s.driveway.openFence;
  $('#fence-edit').classList.toggle('active',fenceEditing);$('#fence-edit').setAttribute('aria-pressed',String(fenceEditing));$('#fence-edit').textContent=fenceEditing?'Finish fence editing':'Edit rear fence panels';
  $('#driveway-status').textContent=driveway.active?`${driveway.width.toFixed(1)} ft wide · ${removedRearPanels(s,driveway).length} rear panels removed${s.driveway.width===0?' · width follows door':''}`:s.driveway.enabled?'Add a garage door to draw its driveway.':`${removedRearPanels(s).length} rear panels removed. South alley shown at an estimated 20 ft wide.`;
  $('#garage-station').max=(fences[s.fence].length/FT).toFixed(2);$('#garage-cancel').hidden=phase==='idle';
  for(const b of wallButtons.children){b.textContent=`${wallInfo(s,b.dataset.wall).name} wall`;b.classList.toggle('active',b.dataset.wall===selectedWall);b.setAttribute('aria-pressed',String(b.dataset.wall===selectedWall));b.disabled=!s.placed;}
  for(const b of panel.querySelectorAll('[data-add-opening]'))b.disabled=!s.placed;
  $('#garage-3d').disabled=$('#garage-save').disabled=$('#garage-remove').disabled=!s.placed;
  const selector=$('#garage-opening');selector.replaceChildren(new Option('Select an opening…',''));for(const [i,o]of s.openings.entries())selector.add(new Option(`${i+1}. ${o.type==='garage'?'Garage door':o.type==='door'?'Man door':'Window'} · ${wallInfo(s,o.wall).name}`,o.id));selector.value=selectedOpening??'';
  const o=selected();$('#opening-editor').hidden=!o;if(o){const r=openingRect(s,o),len=wallInfo(s,o.wall).length/FT,slider=$('#opening-position');slider.min=(r.width/2+.25).toFixed(3);slider.max=(len-r.width/2-.25).toFixed(3);slider.disabled=o.type==='garage';setField('#opening-position',r.offset);$('#opening-position-label').textContent=`${r.offset.toFixed(1)} ft from wall start`;for(const key of ['width','height','sill','level'])setField(`#opening-${key}`,key==='level'?o.level:r[key]);$('#opening-size-fields').hidden=o.type==='garage';$('#window-fields').hidden=o.type!=='window';$('#opening-size').textContent=o.type==='garage'?`${r.width.toFixed(1)} ft wide × ${r.height.toFixed(1)} ft tall. Width follows this wall minus 2 ft.`:`${r.width.toFixed(1)} × ${r.height.toFixed(1)} ft opening.`;}
  $('#garage-summary').textContent=s.placed?`${s.width.toFixed(1)} × ${s.depth.toFixed(1)} ft · ${(s.width*s.depth).toFixed(0)} sq ft footprint · ${(s.garageHeight+s.loftHeight).toFixed(1)} ft to eaves`:'No garage placed yet.';
  const warn=designWarnings();if(s.placed)for(const tree of trees){const p=[tree.anchor.x+17,14-tree.anchor.z];if(tree.group.visible&&tree.group.parent.visible&&inside(p,footprint(s)))warn.push(`Footprint contains ${tree.name.toLowerCase()}.`);}
  $('#garage-warnings').replaceChildren(...warn.map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));
  canvas.style.cursor=editing?(phase!=='idle'?'crosshair':slide?'ew-resize':'pointer'):'';
 }
 function designWarnings(){const drive=drivewayLayout(s),list=[...warnings(s,{shedVisible:getLayer('shed')}),...drive.warnings];if(drive.active&&drive.shedOverlap&&getLayer('shed'))list.push('The driveway overlaps the existing shed.');if(drive.active&&!s.driveway.openFence&&rearPanels.some(p=>p.end>drive.opening.start&&p.start<drive.opening.end&&!s.removedFencePanels.includes(p.id)))list.push('The rear fence is still closed across part of the driveway.');return list;}
 function rebuild(){ctx.invalidateShadows();ctx.updateRearFence(s);view.rebuild(s,{editing,selectedWall,selectedOpening,drawing:phase==='width'||phase==='depth',fenceEditing:editing&&fenceEditing});sync();persist();}
 function open(){ctx.showControls();activate();editing=true;message=s.placed?'Select a wall to add doors and windows.':'Set a setback, then tap Draw footprint.';rebuild();if(!s.placed)focusPlan();}
 function close(){taps.reset();if(phase!=='idle')cancel();editing=false;fenceEditing=false;slide=null;setCapture(false);rebuild();}
 function begin(place=false){if(phase!=='idle')cancel();ctx.revealScene();fenceEditing=false;backup=structuredClone(s);phase=place?'place':'anchor';editing=true;activate();setCapture(true);message='Tap a fence at your starting position. The blue line shows the wall setback.';focusPlan();rebuild();}
 function cancel(){taps.reset();if(backup)s=backup;backup=null;phase='idle';slide=null;setCapture(false);message='Drawing cancelled. Your previous design is unchanged.';rebuild();}
 function selectWall(id){selectedWall=id;selectedOpening=null;message=`${wallInfo(s,id).name} wall selected. Add a garage door, man door or window.`;rebuild();}
 function addOpening(type){if(!s.placed)return;const existing=type==='garage'?s.openings.find(o=>o.type==='garage'):null;if(existing){existing.wall=selectedWall;selectedOpening=existing.id;message=`Garage door placed on the ${wallInfo(s,selectedWall).name.toLowerCase()} wall.`;rebuild();return;}const o={id:openingId(),wall:selectedWall,type,level:'garage',width:type==='window'?4:type==='door'?3:16,height:type==='window'?3:type==='door'?80/12:8,offset:wallInfo(s,selectedWall).length/FT/2,sill:type==='window'?3:0};s.openings.push(o);selectedOpening=o.id;message=`${type==='door'?'Man door':type==='window'?'Window':'Garage door'} added on the ${wallInfo(s,selectedWall).name.toLowerCase()} wall.`;rebuild();}
 function ray(x,y){const r=new THREE.Raycaster();getCamera().updateMatrixWorld();r.setFromCamera(new THREE.Vector2(x*2-1,1-y*2),getCamera());return r;}
 function ground(x,y){const p=ray(x,y).ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-.1),new THREE.Vector3());return p?[p.x+17,14-p.z]:null;}
 function pick(x,y){if(!editing)return null;const p=ground(x,y);if(!p)return null;
  if(fenceEditing){let obj=pickSurface(scene,getCamera(),x,y)?.object;while(obj&&obj.userData.rearFencePanel===undefined)obj=obj.parent;const f=fences.south,d=sub(p,f.a),station=dot(d,f.tangent);const id=obj?.userData.rearFencePanel??(Math.abs(dot(d,f.inward))<1?rearPanels.find(v=>station>=v.start&&station<=v.end)?.id:undefined);if(id!==undefined){const removed=new Set(removedRearPanels(s));if(s.driveway.openFence){s.removedFencePanels=[...removed];s.driveway.openFence=false;}if(removed.has(id))s.removedFencePanels=s.removedFencePanels.filter(v=>v!==id);else s.removedFencePanels.push(id);message=`Rear panel ${id+1} ${removed.has(id)?'restored':'removed'}.`;rebuild();return {panel:id,removed:!removed.has(id)};}return null;}

  if(phase==='anchor'||phase==='place'){const f=nearestFence(p);if(f.distance>1.8){message='Tap closer to a fence line to snap the starting point.';sync();return null;}s.fence=f.id;s.station=clamp(Math.round(f.station*4)/4,0,fences[f.id].length/FT);s.direction=1;selectedOpening=null;selectedWall='front';if(phase==='place'){s.placed=true;phase='idle';backup=null;setCapture(false);message='Garage placed. Edit dimensions or inspect it in 3D.';}else{phase='width';s.placed=false;message='Tap along the blue setback line to set the width. Drawing snaps to 6 inches.';}rebuild();return {stage:phase};}
  if(phase==='width'){preview(p);phase='depth';message='Tap into the yard to set the depth and finish the garage.';rebuild();return {stage:phase};}
  if(phase==='depth'){preview(p);s.placed=true;phase='idle';backup=null;setCapture(false);message='Garage created. Adjust dimensions below, then tap Inspect in 3D.';rebuild();return {stage:phase};}
  const hit=pickSurface(scene,getCamera(),x,y);let object=hit?.object;while(object&&!object.userData.garageWall)object=object.parent;
  if(object){selectedWall=object.userData.garageWall;selectedOpening=object.userData.garageOpening??null;message=`${wallInfo(s,selectedWall).name} wall selected.`;rebuild();return {wall:selectedWall,opening:selectedOpening};}
  if(getCamera().isOrthographicCamera&&s.placed){const hits=['front','back','left','right'].map(id=>{const a=wallPoint(s,id,0),b=wallPoint(s,id,wallInfo(s,id).length),v=sub(b,a),t=clamp(dot(sub(p,a),v)/dot(v,v),0,1),q=a.map((v,i)=>v+(b[i]-v)*t);return {id,distance:Math.hypot(...sub(p,q))};}).sort((a,b)=>a.distance-b.distance);if(hits[0].distance<.8){selectWall(hits[0].id);return {wall:hits[0].id};}}
  return null;
 }
 function preview(p){const b=basis(s),delta=sub(p,b.origin);if(phase==='width'){const f=fences[s.fence],w=dot(delta,f.tangent)/FT;s.direction=w<0?-1:1;s.width=clamp(Math.round(Math.abs(w)*2)/2,8,60);}else if(phase==='depth')s.depth=clamp(Math.round(dot(delta,b.v)/FT*2)/2,8,60);rebuild();}
 function coords(e){const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height];}
 canvas.addEventListener('pointerdown',e=>{if(!editing||e.button!==0)return;taps.down(e);if(phase!=='idle'||fenceEditing){if(e.pointerType!=='touch')e.stopImmediatePropagation();return;}const [x,y]=coords(e),hit=pickSurface(scene,getCamera(),x,y);if(hit?.object.userData.garageOpening){const o=s.openings.find(o=>o.id===hit.object.userData.garageOpening);selectedOpening=o.id;selectedWall=o.wall;if(e.pointerType!=='touch'&&o.type!=='garage'&&!getCamera().isOrthographicCamera){slide={id:o.id};setCapture(true);canvas.setPointerCapture(e.pointerId);e.stopImmediatePropagation();}rebuild();}},true);
 canvas.addEventListener('pointermove',e=>{if(!editing)return;taps.move(e);const [x,y]=coords(e);if(slide){const o=selected(),w=wallInfo(s,o.wall),normal=new THREE.Vector3(w.normal[0],0,-w.normal[1]),plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,world(wallPoint(s,o.wall,0))),p=ray(x,y).ray.intersectPlane(plane,new THREE.Vector3());if(p){const a=wallPoint(s,o.wall,0),b=wallPoint(s,o.wall,w.length),axis=sub(b,a).map(v=>v/w.length);o.offset=dot(sub([p.x+17,14-p.z],a),axis)/FT;const r=openingRect(s,o);o.offset=r.offset;rebuild();}e.stopImmediatePropagation();}else if(e.pointerType!=='touch'&&(phase==='width'||phase==='depth')){const p=ground(x,y);if(p)preview(p);e.stopImmediatePropagation();}},true);
 canvas.addEventListener('pointerup',e=>{const tap=taps.up(e);if(!editing)return;if(slide){slide=null;setCapture(false);e.stopImmediatePropagation();rebuild();return;}if(tap&&e.button===0){pick(...coords(e));if(phase!=='idle'&&e.pointerType!=='touch')e.stopImmediatePropagation();}},true);
 for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{taps.cancel(e);if(slide){slide=null;setCapture(phase!=='idle'||fenceEditing);}});
 $('#designer-trees').onchange=e=>{setLayer('trees',e.target.checked);sync();};$('#designer-shed').onchange=e=>setLayer('shed',e.target.checked);$('#designer-roof').onchange=e=>setLayer('roof',e.target.checked);$('#designer-labels').onchange=e=>setLabels(e.target.checked);
 $('#draw-hint-cancel').onclick=()=>{if(fenceEditing){fenceEditing=false;setCapture(false);message='Fence changes kept in your design.';rebuild();}else cancel();};
 $('#garage-toggle').onclick=()=>editing?close():open();$('#garage-close').onclick=close;$('#garage-draw').onclick=()=>begin(false);$('#garage-place').onclick=()=>begin(true);$('#garage-cancel').onclick=cancel;$('#garage-plan').onclick=()=>{focusPlan();ctx.revealScene();};$('#garage-3d').onclick=()=>{if(phase!=='idle')cancel();fenceEditing=false;setCapture(false);rebuild();focusGarage(s);ctx.revealScene();};
 $('#driveway-enabled').onchange=e=>{s.driveway.enabled=e.target.checked;rebuild();};
 $('#driveway-width').oninput=e=>{if(e.target.value&&e.target.validity.valid){s.driveway.width=Number(e.target.value);rebuild();}};
 $('#driveway-exit').oninput=e=>{if(e.target.value&&e.target.validity.valid){s.driveway.exitStation=Number(e.target.value);rebuild();}};
 $('#driveway-match').onclick=()=>{s.driveway.width=0;rebuild();};$('#driveway-auto').onclick=()=>{s.driveway.exitStation=null;rebuild();};$('#driveway-fence').onchange=e=>{s.driveway.openFence=e.target.checked;rebuild();};
 $('#fence-edit').onclick=()=>{if(phase!=='idle')cancel();fenceEditing=!fenceEditing;setCapture(fenceEditing);if(fenceEditing){ctx.revealScene();setLayer('fence',true);focusPlan();message='Tap a rear fence panel or its ground marker. Tap again to restore it.';}else message='Fence changes kept in your design.';rebuild();};
 $('#fence-restore').onclick=()=>{s.removedFencePanels=[];s.driveway.openFence=false;message='All rear fence panels restored.';rebuild();};
 $('#garage-reverse').onclick=()=>{s.direction*=-1;rebuild();};
 for(const key of ['setback','station','width','depth','garageHeight','loftHeight'])$(`#garage-${key}`).addEventListener('input',e=>{const el=e.target;if(!el.value||!el.validity.valid)return;s[key]=Number(el.value);rebuild();});
 $('#garage-fence').onchange=e=>{s.fence=e.target.value;s.station=Math.min(s.station,fences[s.fence].length/FT);rebuild();};$('#garage-ridge').onchange=e=>{s.ridge=e.target.value;rebuild();};
 for(const b of panel.querySelectorAll('[data-add-opening]'))b.onclick=()=>addOpening(b.dataset.addOpening);
 $('#garage-opening').onchange=e=>{selectedOpening=e.target.value||null;const o=selected();if(o)selectedWall=o.wall;rebuild();};
 $('#opening-position').oninput=e=>{const o=selected();if(o){o.offset=Number(e.target.value);rebuild();}};
 for(const key of ['width','height','sill'])$(`#opening-${key}`).oninput=e=>{const o=selected();if(o&&e.target.value&&e.target.validity.valid){o[key]=Number(e.target.value);rebuild();}};
 $('#opening-level').onchange=e=>{const o=selected();if(o){o.level=e.target.value;rebuild();}};$('#opening-remove').onclick=()=>{s.openings=s.openings.filter(o=>o.id!==selectedOpening);selectedOpening=null;rebuild();};
 $('#garage-remove').onclick=()=>{if(phase!=='idle')cancel();s.placed=false;s.openings=[];selectedOpening=null;message='Garage removed. Draw another footprint whenever you are ready.';rebuild();};
 function loadText(text){const next=validateDesign(JSON.parse(text));s=next;phase='idle';fenceEditing=false;backup=null;selectedOpening=null;setCapture(false);message='Design loaded.';fileDialog.close();rebuild();focusGarage(s);}
 $('#garage-save').onclick=()=>{$('#design-file-title').textContent='Export your design';$('#design-file-text').value=JSON.stringify(backup??s,null,2);$('#design-file-status').textContent='';fileDialog.showModal();};
 $('#garage-load').onclick=()=>{$('#design-file-title').textContent='Load a design';$('#design-file-text').value='';$('#design-file-status').textContent='';fileDialog.showModal();};
 $('#design-file-close').onclick=()=>fileDialog.close();
 $('#design-download').onclick=()=>{try{const text=$('#design-file-text').value;validateDesign(JSON.parse(text));const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='property-garage-design.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);$('#design-file-status').textContent='Download requested. If your browser does not download files, use Copy text.';}catch(error){$('#design-file-status').textContent=error.message;}};
 $('#design-copy').onclick=async()=>{const area=$('#design-file-text');try{await navigator.clipboard.writeText(area.value);$('#design-file-status').textContent='Design text copied.';}catch{area.focus();area.select();$('#design-file-status').textContent='Select and copy this design text using your device’s copy command.';}};
 $('#design-apply').onclick=()=>{try{loadText($('#design-file-text').value);}catch(error){$('#design-file-status').textContent='Could not load design: '+error.message;}};
 $('#design-browse').onclick=()=>$('#garage-file').click();$('#garage-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100000)throw new Error('Design file is too large.');loadText(await file.text());}catch(error){$('#design-file-status').textContent=error.message;}e.target.value='';};
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&editing&&!fileDialog.open){if(phase!=='idle')cancel();else if(slide){slide=null;setCapture(false);}else close();}});
 for(const input of panel.querySelectorAll('input[type="number"]'))input.addEventListener('change',()=>{if(!input.value||!input.validity.valid){message='Enter a value within the field’s minimum and maximum. The previous size is retained.';input.blur();sync();}});
 function getState(){return {editing,phase,selectedWall,selectedOpening,design:structuredClone(s),metrics:garageMetrics(s),warnings:designWarnings(),driveway:drivewayLayout(s),removedRearPanels:removedRearPanels(s),fenceEditing,footprint:s.placed?footprint(s):[]};}
 rebuild();return {open,close,begin,pick,selectWall,addOpening,getState,syncLayers:()=>{sync();persist();},cancelDrawing:()=>{if(phase!=='idle')cancel();},update:view.update,isCapturing:()=>editing&&(phase!=='idle'||!!slide||fenceEditing),contains:p=>s.placed&&inside(p,footprint(s))};
}
