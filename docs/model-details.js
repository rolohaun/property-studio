import * as THREE from 'three';
import {roofFaces,roofPerimeter,roofHeight} from './house-roof.js';
import {survey,localToSurvey} from './survey.js';
import {westTree} from './landscape.js';
import {rearLayout as rear} from './rear-layout.js';
import {shedLayout,shedToSurvey} from './shed-layout.js';

export function addModelDetails(ctx){
 const {scene,groups,materials:m,mesh,box,localBox,beam,line,slab,flatPolygon,pt,world}=ctx;
 let seed=7439;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 function texture(kind){const c=document.createElement('canvas');c.width=c.height=512;const g=c.getContext('2d');
  if(kind==='brick'){g.fillStyle='#aca69a';g.fillRect(0,0,512,512);for(let row=0;row<12;row++)for(let col=-1;col<5;col++){const x=col*128+(row%2)*64,y=row*512/12;const dark=rnd()<.19;g.fillStyle=dark?`hsl(15 17% ${23+rnd()*13}%)`:`hsl(${12+rnd()*9} ${32+rnd()*19}% ${35+rnd()*12}%)`;g.fillRect(x+3,y+3,122,36);for(let j=0;j<35;j++){g.fillStyle=rnd()<.5?'#ead9bd35':'#381d192c';g.fillRect(x+rnd()*120,y+4+rnd()*30,3+rnd()*8,1+rnd()*3);}}}
  else {const base=kind==='roof'?98:kind==='ground'?106:150;for(let y=0;y<512;y+=2)for(let x=0;x<512;x+=2){const v=base+(rnd()-.5)*(kind==='ground'?45:35);g.fillStyle=kind==='ground'?`rgb(${v*.90},${v},${v*.66})`:`rgb(${v},${v},${v*.98})`;g.fillRect(x,y,2,2);}if(kind==='roof'){g.strokeStyle='#24292b';g.lineWidth=2;for(let y=0;y<512;y+=64){g.beginPath();g.moveTo(0,y);g.lineTo(512,y);g.stroke();for(let x=(y/64%2)*85;x<512;x+=170){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+64);g.stroke();}}}}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
 }
 m.brick=new THREE.MeshStandardMaterial({map:texture('brick'),roughness:.98});
 m.fascia=new THREE.MeshStandardMaterial({color:0xb0c2c9,roughness:.87});
 m.metal=new THREE.MeshStandardMaterial({color:0x9faeae,metalness:.6,roughness:.5});
 m.wall.color.set(0xe5dfce);m.trim.color.set(0xe6e9e4);m.roof.map=texture('roof');m.roof.color.set(0xd2d0c7);m.roof.roughness=1;m.roof.bumpMap=m.roof.map;m.roof.bumpScale=.012;
 m.base.map=texture('concrete');m.base.color.set(0xb8b6ac);m.grass.map=texture('ground');m.grass.map.repeat.set(10,10);m.grass.color.set(0xf1edc7);
 m.wood.color.set(0x807368);m.glass.color.set(0x43545a);m.glass.roughness=.17;
 function mappedBox(u,d,w,depth,h,y,mat,parent=scene){const a=localBox(u,d,w,depth,h,y,mat,parent);if(mat.map){const uv=a.geometry.attributes.uv;const sizes=[[depth,h],[depth,h],[w,depth],[w,depth],[w,h],[w,h]];for(let i=0;i<uv.count;i++){const s=sizes[Math.floor(i/4)];uv.setXY(i,uv.getX(i)*s[0],uv.getY(i)*s[1]);}uv.needsUpdate=true;}return a;}
 const fp=survey.building.footprint.map(p=>localToSurvey(...p));
 slab(fp,.03,.66,m.base);slab(fp,.69,2.60,m.wall);
 for(let y=.84;y<3.30;y+=.17){const points=survey.building.footprint.map(p=>pt(...p,y));line([...points,points[0]],0xc4beaf);}
 const H=3.34;
 function roofFace(points,material=m.roof){
  const projected=points.map(p=>new THREE.Vector2(p[0],p[1]));
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flatMap(p=>pt(...p).toArray()),3));g.setAttribute('uv',new THREE.Float32BufferAttribute(points.flatMap(p=>[p[0],p[1]]),2));g.setIndex(THREE.ShapeUtils.triangulateShape(projected,[]).flat());g.computeVertexNormals();return mesh(g,material,groups.roof);
 }
 m.roof.side=THREE.DoubleSide;for(const face of roofFaces)roofFace(face);
 const soffit=m.trim.clone();soffit.side=THREE.DoubleSide;for(const face of roofFaces)roofFace(face.map(([u,d,y])=>[u,d,y-.07]),soffit);
 for(let i=0;i<roofPerimeter.length;i++)if(i!==3&&i!==4){let a=roofPerimeter[i];const b=roofPerimeter[(i+1)%roofPerimeter.length];if(i===5)a=[8.26,7.586,roofHeight(14.112-8.26)];beam(pt(...a),pt(...b),.14,.20,m.fascia,groups.roof);}
 function gableFill(points){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flatMap(p=>pt(...p).toArray()),3));g.setIndex(THREE.ShapeUtils.triangulateShape(points.map(p=>new THREE.Vector2(p[0],p[2])),[]).flat());g.computeVertexNormals();const mat=m.wall.clone();mat.side=THREE.DoubleSide;mesh(g,mat,groups.roof);}
 gableFill([[0,0,3.29],[7.8,0,3.29],[7.8,0,roofHeight(-.34)],[3.73,0,roofHeight(3.73)],[0,0,roofHeight(0)]]);
 gableFill([[.594,17.964,3.29],[13.518,17.964,3.29],[13.518,17.964,roofHeight(.594)],[7.056,17.964,roofHeight(7.056)],[.594,17.964,roofHeight(.594)]]);
 gableFill([[3.73,7.586,roofHeight(3.73)],[8.26,7.586,roofHeight(-.8)],[14.318,7.586,3.34],[7.056,7.586,roofHeight(7.056)]]);
 beam(pt(-.18,7.22,3.14),pt(.46,7.56,2.72),.09,.09,m.trim);mappedBox(.46,7.56,.09,.10,2.55,1.44,m.trim);
 mappedBox(6.97,3.55,1.78,7.35,.10,H-.16,m.trim,groups.roof);
 for(let d=.1;d<7.15;d+=.20)line([pt(6.2,d,H-.22),pt(7.75,d,H-.22)],0xb3b7b3,groups.roof);
 for(const d of [.16,4.92])mappedBox(7.58,d,.64,.32,3.26,1.68,m.brick);
 for(const u of [.18,5.97])mappedBox(u,-.06,.36,.18,3.24,1.66,m.brick);
 mappedBox(3.073,-.074,5.43,.10,2.48,1.29,m.trim);
 mappedBox(3.073,-.142,5.19,.08,2.30,1.22,m.wall);
 for(let row=0;row<4;row++)for(let col=0;col<6;col++){const u=.92+col*.861,y=.38+row*.565;mappedBox(u,-.199,.72,.025,.40,y,m.trim);mappedBox(u,-.22,.62,.018,.30,y,m.wall);}
 for(let row=1;row<4;row++)line([pt(.48,-.224,.10+row*.565),pt(5.67,-.224,.10+row*.565)],0xc3c5c0);
 mappedBox(6.784,7.11,1.12,.12,2.38,1.66,m.trim);mappedBox(6.784,7.025,.96,.08,2.24,1.63,m.dark);
 mappedBox(6.784,6.972,.72,.028,1.44,1.91,m.glass);mappedBox(6.784,6.964,.69,.021,.43,.87,m.dark);
 mappedBox(7.12,6.935,.035,.04,.27,1.39,m.metal);
 for(let i=0;i<3;i++)mappedBox(6.78,6.01+i*.35,1.3,1.15-i*.32,.16*(i+1),.08*(i+1),m.concrete);
 function sconce(u,d,y){mappedBox(u,d,.16,.12,.33,y,m.dark);mappedBox(u,d-.06,.21,.15,.20,y+.18,m.trim);}
 sconce(.2,-.20,2.25);sconce(5.97,-.20,2.25);
 for(const d of [1.15,5.65]){mappedBox(6.86,d,.24,.24,.07,3.08,m.metal);mappedBox(6.86,d,.18,.18,.12,3.0,m.trim);}
 const addressCanvas=document.createElement('canvas');addressCanvas.width=512;addressCanvas.height=128;const ac=addressCanvas.getContext('2d');ac.fillStyle='#e3dfd2';ac.fillRect(0,0,512,128);ac.fillStyle='#52606a';ac.font='68px sans-serif';ac.textAlign='center';ac.fillText('DEMO',256,92);
 const am=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(addressCanvas)});const address=mesh(new THREE.PlaneGeometry(1.16,.29),am);address.position.copy(pt(6.88,-.34,3.0));address.rotation.y=Math.PI-THREE.MathUtils.degToRad(survey.building.bearing);
 mappedBox(10.45,8.33,6.03,.15,1.10,1.13,m.brick);
 function frontWindow(u,d,w,h,y){mappedBox(u,d,w+.15,.12,h+.15,y,m.trim);mappedBox(u,d-.075,w,.06,h,y,m.glass);for(const x of [-.32,.32])mappedBox(u+w*x,d-.118,.048,.035,h,y,m.trim);mappedBox(u,d-.117,w,.035,.045,y+h*.27,m.trim);mappedBox(u,d-.16,w+.2,.20,.055,y-h/2-.055,m.trim);}
 frontWindow(10.47,8.20,5.10,1.58,2.40);
 mappedBox(10.45,7.15,5.72,.17,.56,.32,m.brick);mappedBox(7.66,7.66,.18,1.22,.56,.32,m.brick);mappedBox(13.24,7.66,.18,1.22,.56,.32,m.brick);
 flatPolygon([[7.76,7.28],[13.14,7.28],[13.14,8.17],[7.76,8.17]].map(p=>localToSurvey(...p)),.56,m.soil);
 function rearWindow(u,d,w,h,y){mappedBox(u,d,w+.14,.12,h+.14,y,m.trim);mappedBox(u,d+.077,w,.05,h,y,m.glass);mappedBox(u,d+.108,.052,.035,h,y,m.trim);mappedBox(u,d+.13,w+.18,.15,.06,y-h/2-.06,m.trim);}
 rearWindow(2.24,18.014,1.82,1.12,2.25);rearWindow(7.22,18.014,1.36,1.12,2.25);rearWindow(rear.upperCenter,18.014,rear.upperGlassWidth,1.1,2.25);
 rearWindow(6.4,18.025,1.30,.43,.39);rearWindow(rear.basementCenter,18.025,1.05,.43,.39);
 mappedBox(rear.doorCenter,18.03,rear.doorWidth,.13,2.27,1.20,m.trim);mappedBox(rear.doorCenter,18.11,.9,.08,2.12,1.2,m.wall);mappedBox(rear.doorCenter,18.162,.74,.025,1.22,1.58,m.glass);mappedBox(rear.doorCenter,18.176,.75,.025,.046,1.13,m.trim);mappedBox(rear.doorCenter-.34,18.19,.05,.06,.20,1.12,m.dark);
 sconce(rear.doorCenter-.8,18.2,2.52);
 function sideWindow(u,d,w,h,y,out=1){mappedBox(u,d,.12,w+.14,h+.14,y,m.trim);mappedBox(u+out*.075,d,.05,w,h,y,m.glass);mappedBox(u+out*.11,d,.03,.045,h,y,m.trim);}
 sideWindow(13.56,12.45,1.12,1.14,2.35);sideWindow(13.56,10.95,1.14,.43,.38);sideWindow(.55,10.2,1.5,1.1,2.2,-1);sideWindow(.55,14.1,1.4,1.1,2.2,-1);
 for(const [u,d]of [[.16,.15],[13.75,8.7],[.37,17.9]]){mappedBox(u,d,.09,.10,2.95,1.73,m.trim);beam(pt(u,d,.27),pt(u+.18,d+.36,.12),.08,.08,m.trim);}
 for(const u of [3.7,4.25,8.9])mappedBox(u,18.04,.25,.06,.24,.9,m.metal);
 mappedBox(5.0,18.2,.38,.20,.31,1.03,m.metal);for(const u of [4.77,5.23])mappedBox(u,18.16,.055,.06,.86,.88,m.metal);
 const pad=rear.patio;
 mappedBox((pad.west+pad.east)/2,(pad.front+pad.back)/2,pad.width,pad.depth,.10,.08,m.concrete);
 const sh=shedLayout,sp=(u,d,y=0)=>world(shedToSurvey(u,d),y);
 slab(sh.footprint,.03,2.36,m.wall,groups.shed);
 const pts=[sp(-.6,-.6,2.39),sp(sh.width+.6,-.6,2.39),sp(sh.width+.6,sh.depth+.6,2.39),sp(-.6,sh.depth+.6,2.39),sp(sh.width/2,-.6,2.91),sp(sh.width/2,sh.depth+.6,2.91)];const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(pts.flatMap(p=>p.toArray()),3));sg.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,3,0,3,4,0,4,1.5,0,1.5,4],2));sg.setIndex([0,4,5,0,5,3,4,1,2,4,2,5,0,1,4,3,5,2]);sg.computeVertexNormals();const shedRoof=mesh(sg,m.roof,groups.shed);
 const shedBox=(u,d,w,h,depth,y,material)=>{const part=box(w,h,depth,sp(u,d,y),material,groups.shed);part.rotation.y=-THREE.MathUtils.degToRad(sh.bearing);return part;};
 const doorCentre=sh.width/2,doorWidth=3*.3048,doorHeight=80*.0254,doorBottom=.07;
 shedBox(doorCentre,-.035,doorWidth+.14,doorHeight+.10,.10,doorBottom+doorHeight/2,m.trim);
 shedBox(doorCentre,-.095,doorWidth,doorHeight,.045,doorBottom+doorHeight/2,m.dark);
 shedBox(doorCentre,-.125,doorWidth-.035,doorHeight-.035,.035,doorBottom+doorHeight/2,m.wall);
 for(const y of [.62,1.55])shedBox(doorCentre,-.15,doorWidth-.19,.71,.025,y,m.trim);
 for(const y of [.45,1.10,1.80])shedBox(doorCentre-doorWidth/2+.035,-.17,.08,.12,.025,y,m.metal);
 shedBox(doorCentre+doorWidth*.35,-.19,.045,.16,.07,1.08,m.dark);
 shedBox(doorCentre,-.09,doorWidth+.1,.035,.22,.055,m.metal);
 for(let y=.25;y<2.35;y+=.2)line([sp(0,0,y),sp(sh.width,0,y),sp(sh.width,sh.depth,y),sp(0,sh.depth,y),sp(0,0,y)],0xbdbdb2,groups.shed);

 const leafInstances=[],branchInstances=[],trees=[];let activeTree=groups.trees;
 function tree(id,name,build){const group=new THREE.Group();group.userData.treeId=id;groups.trees.add(group);activeTree=group;build();trees.push({id,name,group,anchor:group.userData.anchor});activeTree=groups.trees;}
 function branch(a,b,r,color=0x665447){branchInstances.push({a,b,r,color,parent:activeTree});}
 function tuft(p,scale,color){leafInstances.push({p,scale,color,parent:activeTree});}
 function conifer(u,d,height,width,cedar=false){const base=pt(u,d,.03);activeTree.userData.anchor=base;branch(base,base.clone().add(new THREE.Vector3(0,height*.93,0)),.12);const levels=cedar?12:11;
  for(let j=0;j<levels;j++){const t=j/(levels-1),y=.45+t*(height-.6),radius=width*(cedar?Math.sin((.12+t*.8)*Math.PI):Math.pow(1-t,.72));for(let k=0;k<12;k++){const ang=k/12*Math.PI*2+j*.85,len=radius*(.72+rnd()*.28);const root=base.clone().add(new THREE.Vector3(0,y,0)),end=base.clone().add(new THREE.Vector3(Math.cos(ang)*len,y+.10,Math.sin(ang)*len));if(j%2===0)branch(root,end,.021*(1-t)+.007);for(let q=1;q<=6;q++){const p=root.clone().lerp(end,q/6);p.y+=(rnd()-.4)*.2;tuft(p,[.12+len*.09,.12+height*.018,.24+len*.09],new THREE.Color().setHSL(.27+rnd()*.055,.22+rnd()*.2,.20+rnd()*.15));}}}
 }
 function measuredTrunk(base,height,radius){
  const c=document.createElement('canvas');c.width=256;c.height=512;const g=c.getContext('2d');g.fillStyle='#71675a';g.fillRect(0,0,256,512);
  let barkSeed=8201;const noise=()=>{barkSeed=(barkSeed*1664525+1013904223)>>>0;return barkSeed/4294967296;};
  for(let i=0;i<130;i++){const x=noise()*256,y=noise()*512;g.strokeStyle=i%3?'#403c35':'#a1957e';g.lineWidth=.7+noise()*3.5;g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x-5,y+35,x+8,y+80,x-2,y+110+noise()*90);g.stroke();}
  const map=new THREE.CanvasTexture(c);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(2,2);map.colorSpace=THREE.SRGBColorSpace;
  const bark=new THREE.MeshStandardMaterial({map,bumpMap:map,bumpScale:.045,roughness:1});
  const geometry=new THREE.CylinderGeometry(radius*.60,radius,height*.66,36,14),positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++){const y=positions.getY(i)+height*.33,t=y/(height*.66),a=Math.atan2(positions.getZ(i),positions.getX(i));if(Math.hypot(positions.getX(i),positions.getZ(i))<.001)continue;const profile=t<.35?1:1-(t-.35)*.40/.65;const r=radius*profile*(.985+.015*Math.cos(a*9+t*4));positions.setX(i,Math.cos(a)*r);positions.setZ(i,Math.sin(a)*r);}
  geometry.computeVertexNormals();const trunk=mesh(geometry,bark,activeTree);trunk.position.copy(base).add(new THREE.Vector3(0,height*.33,0));
  for(let i=0;i<5;i++){const angle=i*Math.PI*2/5+.4,a=base.clone().add(new THREE.Vector3(0,height*.31,0)),b=base.clone().add(new THREE.Vector3(Math.cos(angle)*1.25,height*(.66+(i%2)*.055),Math.sin(angle)*1.25));const fork=mesh(new THREE.CylinderGeometry(radius*.15,radius*.48,a.distanceTo(b),12),bark,activeTree);fork.position.copy(a).lerp(b,.5);fork.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());}
 }
 function broadleaf(u,d,height,width,birch=false,measuredRadius=0){const p=pt(u,d,.04);activeTree.userData.anchor=p;if(measuredRadius)measuredTrunk(p,height,measuredRadius);else branch(p,p.clone().add(new THREE.Vector3(.1,height*.72,0)),birch?.135:.20,birch?0xd4d0ba:0x665447);for(let i=0;i<9;i++){const a=i/9*Math.PI*2;branch(p.clone().add(new THREE.Vector3(0,height*.33,0)),p.clone().add(new THREE.Vector3(Math.cos(a)*width*.6,height*(.64+rnd()*.2),Math.sin(a)*width*.6)),.055,birch?0xa49e89:0x665447);}
  for(let i=0;i<1100;i++){const angle=rnd()*Math.PI*2,z=rnd()*2-1,rad=Math.cbrt(rnd()),r=Math.sqrt(1-z*z);const leaf=p.clone().add(new THREE.Vector3(Math.cos(angle)*r*rad*width,height*.73+z*rad*height*.27,Math.sin(angle)*r*rad*width));tuft(leaf,[.11+rnd()*.13,.10+rnd()*.13,.18+rnd()*.14],new THREE.Color().setHSL(.19+rnd()*.10,.27+rnd()*.24,.25+rnd()*.14));}
 }
 tree('front-porch','Front porch conifer',()=>conifer(8.95,2.65,4.7,1.25));
 tree('front-west','Front west conifer',()=>conifer(-.65,-.95,4.15,.90));
 tree('front-east','Front east cedar',()=>conifer(13.75,8.3,4.3,.72,true));
 tree('front-garden','Front garden tree',()=>broadleaf(10.2,4.45,4.3,1.65));
 tree('rear-west','Rear west conifer',()=>conifer(.95,19.6,4.5,1.55));
 tree('rear-window','Rear window conifer',()=>conifer(rear.treeCenter,19.25,4.5,1.32,true));
 tree('west-wall','West wall conifer',()=>conifer(-.9,10.3,3.8,1.15));
 tree('west-shed','Tree beside shed',()=>broadleaf(...westTree.local,westTree.height,westTree.canopyRadius,false,westTree.trunkRadius));
 tree('rear-birch','Rear fence birch',()=>broadleaf(3.3,24.95,7.1,3.65,true));
 for(let i=0;i<115;i++){tuft(pt(7.9+rnd()*5.15,7.4+rnd()*.7,.72+rnd()*.35),[.26,.14,.25],new THREE.Color().setHSL(.26+rnd()*.08,.31,.27+rnd()*.1));}
 for(let i=0;i<35;i++){const u=8.15+rnd()*5.35,d=6.45+rnd()*.45;for(let k=0;k<5;k++)tuft(pt(u+(rnd()-.5)*.25,d+(rnd()-.5)*.25,.20+rnd()*.15),[.14,.10,.25],new THREE.Color(0x97a15e));}
 const lot=survey.lot, rearPoint=t=>[lot.sw[0]+(lot.se[0]-lot.sw[0])*t,lot.sw[1]+(lot.se[1]-lot.sw[1])*t];
 for(const [from,to]of [[.59,.705],[.775,.97]]){
  const a=rearPoint(from),b=rearPoint(to);flatPolygon([a,b,[b[0],b[1]+.65],[a[0],a[1]+.65]],.052,m.soil,groups.trees);
  for(let i=0;i<45;i++){const p=rearPoint(from+rnd()*(to-from));p[1]+=.16+rnd()*.40;tuft(world(p,.18+rnd()*.22),[.14,.14,.20],new THREE.Color().setHSL(.20+rnd()*.12,.31,.29+rnd()*.12));}
 }
 for(const parent of [groups.trees,...trees.map(t=>t.group)]){
 const leavesForTree=leafInstances.filter(l=>l.parent===parent),branchesForTree=branchInstances.filter(b=>b.parent===parent);
 const leaves=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({roughness:1}),leavesForTree.length);const dummy=new THREE.Object3D();leavesForTree.forEach((l,i)=>{dummy.position.copy(l.p);dummy.scale.set(...l.scale);dummy.rotation.set(rnd()*2,rnd()*6,rnd()*2);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);leaves.setColorAt(i,l.color.convertSRGBToLinear());});leaves.castShadow=true;leaves.receiveShadow=true;parent.add(leaves);
 const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.7,1,1,7),new THREE.MeshStandardMaterial({roughness:1}),branchesForTree.length);branchesForTree.forEach((b,i)=>{dummy.position.copy(b.a).lerp(b.b,.5);dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.b.clone().sub(b.a).normalize());dummy.scale.set(b.r,b.a.distanceTo(b.b),b.r);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);trunks.setColorAt(i,new THREE.Color(b.color));});trunks.castShadow=true;parent.add(trunks);
 }
 function pot(u,d,r,h){const p=mesh(new THREE.CylinderGeometry(r,r*.8,h,12),new THREE.MeshStandardMaterial({color:0x956c50,roughness:1}),groups.trees);p.position.copy(pt(u,d,h/2+.05));const dirt=mesh(new THREE.CylinderGeometry(r*.9,r*.9,.03,12),m.soil,groups.trees);dirt.position.copy(pt(u,d,h+.055));for(let i=0;i<7;i++){const flower=mesh(new THREE.IcosahedronGeometry(.075,0),new THREE.MeshStandardMaterial({color:i%2?0xb76193:0xca779e}),groups.trees);flower.position.copy(pt(u+(rnd()-.5)*r,d+(rnd()-.5)*r,h+.14+rnd()*.12));}}
 pot(7.64,6.2,.29,.46);pot(8.55,7.6,.24,.31);pot(12.0,7.6,.29,.38);pot(11.0,20.1,.40,.42);
 function raisedBed(u,d,length,width,angle){
  const group=new THREE.Group();group.position.copy(pt(u,d));group.rotation.y=-THREE.MathUtils.degToRad(survey.building.bearing+angle);groups.trees.add(group);
  const radius=width/2,half=(length-width)/2,points=[];
  for(const side of [1,-1])for(let i=0;i<=24;i++){const a=(-Math.PI/2+i*Math.PI/24)+(side===1?0:Math.PI);points.push(new THREE.Vector2(side*half+Math.cos(a)*radius,Math.sin(a)*radius));}
  const positions=[],indices=[];
  for(let row=0;row<=32;row++){const y=.045+row*.016,bulge=Math.sin(row*Math.PI/2)*.017;for(const p of points){const centerX=Math.sign(p.x)*half;const normal=new THREE.Vector2(p.x-centerX,p.y).normalize();positions.push(p.x+normal.x*bulge,y,p.y+normal.y*bulge);}}
  const n=points.length;for(let row=0;row<32;row++)for(let j=0;j<n;j++){const a=row*n+j,b=row*n+(j+1)%n;indices.push(a,b,a+n,b,b+n,a+n);}
  const wall=new THREE.BufferGeometry();wall.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));wall.setIndex(indices);wall.computeVertexNormals();const metal=m.metal.clone();metal.side=THREE.DoubleSide;mesh(wall,metal,group);
  const soil=new THREE.ShapeGeometry(new THREE.Shape(points));soil.rotateX(-Math.PI/2);const soilMesh=mesh(soil,new THREE.MeshStandardMaterial({color:0x3b2a1b,roughness:1}),group);soilMesh.scale.set(.96,1,.91);soilMesh.position.y=.49;
  for(const y of [.055,.56]){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p.x,y,p.y)),true,'centripetal');mesh(new THREE.TubeGeometry(curve,100,.025,6,true),metal,group);}
  const stemMaterial=new THREE.MeshStandardMaterial({color:0x817559});for(let j=0;j<12;j++){const stem=mesh(new THREE.CylinderGeometry(.010,.015,.65,5),stemMaterial,group);stem.position.set((rnd()-.5)*(length-width),.81,(rnd()-.5)*(width-.2));}
 }
 raisedBed(14.70,21.30,2.20,.90,-58);raisedBed(16.74,21.52,2.20,.90,-58);
 return {sp,address,trees,shedRoof};
}
