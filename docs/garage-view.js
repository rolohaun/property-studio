import * as THREE from './vendor/three.module.js';

import {garageMetrics} from './garage-clearance.js';
import {drivewayLayout,rearPanels,removedRearPanels} from './driveway-model.js';

import {FT,point,footprint,basis,wallInfo,wallPoint,wallCells,openingRect,fences,add} from './garage-model.js';


export function createGarageView({scene,materials:m,world,viewport,getCamera,getLabelsVisible,getDimensionsVisible,getRoofVisible}){

 const root=new THREE.Group(),guide=new THREE.Group(),roof=new THREE.Group();const pavement=new THREE.Group(),fenceGuide=new THREE.Group();fenceGuide.userData.toolOverlay=true;scene.add(root,guide,pavement,fenceGuide);guide.userData.toolOverlay=true;

 const edgeMat=new THREE.LineBasicMaterial({color:0x15a0b0}),sidingMat=new THREE.LineBasicMaterial({color:0xc4beaf});

 const fenceOffMat=new THREE.MeshBasicMaterial({color:0xe8a06d}),fenceOnMat=new THREE.MeshBasicMaterial({color:0x4ab7c5});

 const selectedMat=new THREE.MeshStandardMaterial({color:0x00aabb,transparent:true,opacity:.23,depthWrite:false,side:THREE.DoubleSide});

 const clearanceGroup=new THREE.Group();clearanceGroup.userData.toolOverlay=true;scene.add(clearanceGroup);const clearanceMat=new THREE.LineBasicMaterial({color:0xe8a06d,depthTest:false}),cornerMat=new THREE.MeshBasicMaterial({color:0xe8a06d,depthTest:false});
 const clearanceLabel=document.createElement('span');clearanceLabel.className='label clearance-label';clearanceLabel.hidden=true;viewport.append(clearanceLabel);let clearancePosition=null;
 const label=document.createElement('span');label.className='label garage-label';label.hidden=true;viewport.append(label);

 let current=null,active=false,labelPosition=null;

 function clear(group){group.traverse(o=>o.geometry?.dispose());group.clear();}

 function mesh(g,mat,parent=root,wall=null,opening=null){const o=new THREE.Mesh(g,mat);o.castShadow=o.receiveShadow=true;if(wall)o.userData.garageWall=wall;if(opening)o.userData.garageOpening=opening;parent.add(o);return o;}

 function box(w,h,d,p,mat,parent=root,angle=0,wall=null,opening=null){const o=mesh(new THREE.BoxGeometry(w,h,d),mat,parent,wall,opening);o.position.copy(p);o.rotation.y=angle;return o;}

 function segment(points,mat=sidingMat,parent=root){const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),mat);parent.add(o);return o;}

 function face(points,mat,parent=root){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flatMap(p=>p.toArray()),3));g.setAttribute('uv',new THREE.Float32BufferAttribute(points.flatMap(p=>[p.x,p.z]),2));g.setIndex(points.length===3?[0,1,2]:[0,1,2,0,2,3]);g.computeVertexNormals();return mesh(g,mat,parent);}

 function beam(a,b,w,h,mat,parent=root){const o=box(w,h,a.distanceTo(b),a.clone().lerp(b,.5),mat,parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),b.clone().sub(a).normalize());return o;}

 function rebuild(s,{editing=false,selectedWall=null,selectedOpening=null,drawing=false,fenceEditing=false}={}){

  clear(clearanceGroup);clearancePosition=null;clear(roof);clear(root);clear(guide);clear(pavement);clear(fenceGuide);root.add(roof);current=s;active=editing;labelPosition=null;

  const f=fences[s.fence],b=basis(s),p=(u,v,y=0)=>world(point(s,u,v),y),W=s.width*FT,D=s.depth*FT,H=(s.garageHeight+s.loftHeight)*FT,y0=.10;

  if(editing){segment([world(f.a,.18),world(f.b,.18)],edgeMat,guide);segment([world(add(f.a,f.inward,s.setback*FT),.18),world(add(f.b,f.inward,s.setback*FT),.18)],edgeMat,guide);segment([world(b.anchor,.2),world(b.origin,.2)],edgeMat,guide);}

  const drive=drivewayLayout(s);

  if(drive.active&&!drawing){

   const g=new THREE.BufferGeometry(),positions=[],uv=[],indices=[];

   for(const edge of drive.edges)for(const q of edge){positions.push(...world(q,.085).toArray());uv.push(...q);}

   for(let i=0;i<drive.edges.length-1;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}

   g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();mesh(g,m.concrete,pavement);

   for(const side of [0,1])segment(drive.edges.map(e=>world(e[side],.09)),sidingMat,pavement);

   let length=0;for(let i=1;i<drive.points.length;i++){length+=Math.hypot(...drive.points[i].map((v,j)=>v-drive.points[i-1][j]));if(length>2.5){segment(drive.edges[i].map(q=>world(q,.091)),sidingMat,pavement);length=0;}}

  }

  if(fenceEditing){const removed=new Set(removedRearPanels(s,drive)),f=fences.south;for(const panel of rearPanels){const q=world(add(f.a,f.tangent,(panel.start+panel.end)/2),.17),part=box(panel.end-panel.start-.12,.07,.65,q,removed.has(panel.id)?fenceOffMat:fenceOnMat,fenceGuide,-Math.atan2(-f.tangent[1],f.tangent[0]));part.userData.rearFencePanel=panel.id;}}

  if(!s.placed&&!drawing){update();return;}

  const outline=footprint(s).map(q=>world(q,.16));segment([...outline,outline[0]],edgeMat,guide);

  labelPosition=p(W/2,D/2,drawing?.3:H+1.3);label.textContent=`${s.width.toFixed(1)} × ${s.depth.toFixed(1)} ft · ${(s.width*s.depth).toFixed(0)} sq ft${editing?` · ${s.setback.toFixed(1)} ft setback`:''}`;

  if(drawing){update();return;}
  const metrics=garageMetrics(s),clearance=metrics?.clearance;
  if(clearance&&!clearance.overlaps){const a=world(clearance.corner.garagePoint,.22),b=world(clearance.corner.housePoint,.22);const distanceLine=segment([a,b],clearanceMat,clearanceGroup);distanceLine.renderOrder=20;for(const p of [a,b]){const mark=mesh(new THREE.SphereGeometry(.095,12,8),cornerMat,clearanceGroup);mark.position.copy(p);mark.renderOrder=21;}clearancePosition=a.clone().lerp(b,.5);clearancePosition.y=.7;clearanceLabel.textContent=`House clearance · ${(clearance.corner.distance/FT).toFixed(2)} ft`;}



  const b0=p(0,0),b1=p(W,0),angle=-Math.atan2(b1.z-b0.z,b1.x-b0.x);

  box(W,.1,D,p(W/2,D/2,.05),m.concrete,root,angle);

  for(const id of ['front','back','left','right']){

   const wall=wallInfo(s,id),a=world(wallPoint(s,id,0)),z=world(wallPoint(s,id,wall.length)),rotation=-Math.atan2(z.z-a.z,z.x-a.x),normal=new THREE.Vector3(wall.normal[0],0,-wall.normal[1]);

   const wp=(x,y,out=0)=>world(wallPoint(s,id,x),y+y0).addScaledVector(normal,out);

   for(const c of wallCells(s,id)){

    box(c.x1-c.x0,c.y1-c.y0,.13,wp((c.x0+c.x1)/2,(c.y0+c.y1)/2,-.065),m.wall,root,rotation,id);

    for(let y=Math.ceil(c.y0/.17)*.17;y<c.y1;y+=.17)if(y>c.y0+.008)segment([wp(c.x0,y,.004),wp(c.x1,y,.004)]);

   }

   box(wall.length,.1,.18,wp(wall.length/2,s.garageHeight*FT),m.trim,root,rotation,id);

   if(editing&&id===selectedWall){const highlight=box(wall.length,H,.01,wp(wall.length/2,H/2,.11),selectedMat,guide,rotation);highlight.userData.toolOverlay=true;}

   for(const o of s.openings.filter(o=>o.wall===id)){

    const r=openingRect(s,o);if(!r.active)continue;const w=r.right-r.left,h=r.top-r.bottom,x=(r.left+r.right)/2,y=(r.bottom+r.top)/2;

    const part=(cx,cy,width,height,depth,mat,out=.09)=>box(width,height,depth,wp(cx,cy,out),mat,root,rotation,id,o.id);

    part(x,y,w,h,.045,o.type==='window'?m.glass:m.trim,.015);

    part(r.left-.035,y,.07,h+.14,.12,m.trim);part(r.right+.035,y,.07,h+.14,.12,m.trim);part(x,r.top+.035,w+.14,.07,.12,m.trim);

    if(o.type==='window'){part(x,r.bottom-.035,w+.14,.07,.14,m.trim);part(x,y,.05,h,.08,m.trim);part(x,y,w,.045,.08,m.trim);}

    else if(o.type==='garage'){for(let y=r.bottom+.42;y<r.top;y+=.42)segment([wp(r.left,y,.045),wp(r.right,y,.045)]);for(let x=r.left+.7;x<r.right;x+=.7)part(x,(r.bottom+r.top)/2,.015,h-.12,.01,m.wall,.046);part(x,r.bottom+.85,.34,.06,.04,m.dark);}

    else{part(x,y+.3,w-.22,h*.36,.018,m.wall,.047);part(x,y-.5,w-.22,h*.30,.018,m.wall,.047);part(r.right-.13,r.bottom+.95,.06,.12,.08,m.dark,.10);}

    if(editing&&o.id===selectedOpening){segment([wp(r.left-.1,r.bottom,.2),wp(r.left-.1,r.top+.1,.2),wp(r.right+.1,r.top+.1,.2),wp(r.right+.1,r.bottom,.2),wp(r.left-.1,r.bottom,.2)],edgeMat,guide);}

   }

  }

  if(s.loftHeight>0)box(W,.12,D,p(W/2,D/2,s.garageHeight*FT+y0),m.trim,root,angle);


  const overhead=s.openings.find(o=>o.type==='garage');let ridge=s.ridge==='auto'?(overhead?(['front','back'].includes(overhead.wall)?'depth':'width'):(D>=W?'depth':'width')):s.ridge;

  const span=ridge==='depth'?W:D,run=ridge==='depth'?D:W,overhang=.38,rise=span*.125,eave=H+y0;

  const rp=(x,z,y)=>ridge==='depth'?p(x,z,y):p(z,x,y);

  const pts=[rp(-overhang,-overhang,eave),rp(span+overhang,-overhang,eave),rp(span+overhang,run+overhang,eave),rp(-overhang,run+overhang,eave),rp(span/2,-overhang,eave+rise),rp(span/2,run+overhang,eave+rise)];

  face([pts[0],pts[4],pts[5],pts[3]],m.roof,roof);face([pts[4],pts[1],pts[2],pts[5]],m.roof,roof);


  for(const z of [0,run]){const tri=face([rp(0,z,eave),rp(span,z,eave),rp(span/2,z,eave+rise)],m.wall);tri.material=m.wall;const reverse=face([rp(span/2,z,eave+rise),rp(span,z,eave),rp(0,z,eave)],m.wall);for(let y=.17;y<rise;y+=.17){const inset=span/2*y/rise;segment([rp(inset,z,eave+y),rp(span-inset,z,eave+y)]);}}

  for(const [a,b]of [[0,4],[4,1],[3,5],[5,2],[0,3],[1,2],[4,5]])beam(pts[a],pts[b],.12,.16,m.fascia,roof);

  update();

 }

 function update(){clearanceGroup.visible=active&&getDimensionsVisible();clearanceLabel.hidden=!active||!clearancePosition||!getLabelsVisible()||!getDimensionsVisible();if(!clearanceLabel.hidden){const v=clearancePosition.clone().project(getCamera());clearanceLabel.hidden=v.z< -1||v.z>1||Math.abs(v.x)>1||Math.abs(v.y)>1;clearanceLabel.style.left=`${(v.x*.5+.5)*viewport.clientWidth}px`;clearanceLabel.style.top=`${(-v.y*.5+.5)*viewport.clientHeight}px`;}roof.visible=getRoofVisible();guide.visible=active;label.hidden=!labelPosition||!getLabelsVisible()||!getDimensionsVisible();if(!label.hidden){const v=labelPosition.clone().project(getCamera());label.hidden=v.z< -1||v.z>1||Math.abs(v.x)>1||Math.abs(v.y)>1;label.style.left=`${(v.x*.5+.5)*viewport.clientWidth}px`;label.style.top=`${(-v.y*.5+.5)*viewport.clientHeight}px`;}}

 return {rebuild,update,root,guide,pavement};

}
