import {FT,fences,wallInfo,wallPoint,openingRect,footprint,add,sub,dot,clamp,inside,overlaps} from './garage-model.js';
import {survey,localToSurvey,lotPolygon} from './survey.js';
import {shedLayout} from './shed-layout.js';

const f=fences.south;
const length=v=>Math.hypot(...v);
const mix=(a,b,t)=>add(a,sub(b,a),t);
const normalise=v=>v.map(x=>x/Math.max(length(v),1e-9));
export const rearPanels=[];
for(const [from,to,gate] of [[0,.71,false],[.71,.77,true],[.77,1,false]]){
 const n=Math.ceil((to-from)*f.length/1.8);
 for(let i=0;i<n;i++)rearPanels.push({id:rearPanels.length,start:(from+(to-from)*i/n)*f.length,end:(from+(to-from)*(i+1)/n)*f.length,gate});
}
const station=p=>dot(sub(p,f.a),f.tangent);
const height=p=>dot(sub(p,f.a),f.inward);
const at=(x,y)=>add(add(f.a,f.tangent,x),f.inward,y);
function bezier(a,b,c,d,steps=64){return Array.from({length:steps+1},(_,i)=>{const t=i/steps,q=1-t;return a.map((v,j)=>v*q**3+3*b[j]*q*q*t+3*c[j]*q*t*t+d[j]*t**3);});}
function roundedRoute(points,radius){points=points.filter((p,i)=>i===0||length(sub(p,points[i-1]))>1e-5);const out=[points[0]];for(let i=1;i<points.length-1;i++){const p=points[i],before=normalise(sub(points[i-1],p)),after=normalise(sub(points[i+1],p)),r=Math.min(radius,length(sub(p,points[i-1]))*.38,length(sub(p,points[i+1]))*.38),a=add(p,before,r),b=add(p,after,r);out.push(a);for(let j=1;j<=16;j++){const t=j/16;out.push(mix(mix(a,p,t),mix(p,b,t),t));}}out.push(points.at(-1));return out;}

export function drivewayLayout(s){
 const empty={active:false,points:[],edges:[],polygon:[],opening:null,warnings:[],width:0};
 if(!s.placed||!s.driveway?.enabled)return empty;
 const door=s.openings.find(o=>o.type==='garage');
 if(!door)return {...empty,warnings:['Add a garage door to create its driveway.']};
 const w=wallInfo(s,door.wall),r=openingRect(s,door),width=(s.driveway.width||r.width)*FT,half=width/2;
 const start=wallPoint(s,door.wall,r.offset*FT),x=station(start),y=height(start),toward=dot(w.normal,f.inward),side=dot(w.normal,f.tangent),corners=footprint(s);
 let target=x+side*Math.max(y*.7,half+1.2),route;
 if(toward>.45){const xs=corners.map(station),ys=corners.map(height),left=Math.min(...xs)-half-2,right=Math.max(...xs)+half+2;target=left>half&& (right>f.length-half||Math.abs(x-left)<Math.abs(x-right))?left:right;}
 const requested=s.driveway.exitStation===null?target:s.driveway.exitStation*FT;
 const exit=clamp(requested,half+.15,f.length-half-.15),end=at(exit,-.65),arrival=at(exit,Math.max(.6,Math.min(y*.5,half+1.5)));
 if(toward>.45){
  const xs=corners.map(station),ys=corners.map(height),routeX=exit<x?Math.min(...xs)-half-2:Math.max(...xs)+half+2,top=Math.max(...ys)+half+3;
  const lead=add(start,w.normal,half+3);
  route=roundedRoute([start,lead,at(routeX,Math.max(top,height(lead))),at(routeX,height(arrival)),arrival,end],half+1);
 }else{
  const handle=Math.max(.6,Math.min(length(sub(end,start))*.58,Math.max(y,half+1)));
  route=bezier(start,add(start,w.normal,handle),arrival,end);
 }
 const edges=route.map((p,i)=>{const tangent=normalise(i===0?w.normal:i===route.length-1?f.inward.map(v=>-v):sub(route[Math.min(i+1,route.length-1)],route[Math.max(0,i-1)])),n=[-tangent[1],tangent[0]];return [add(p,n,half),add(p,n,-half)];});
 const polygon=[...edges.map(e=>e[0]),...edges.map(e=>e[1]).reverse()];
 const crossings=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],ha=height(a),hb=height(b);if((ha>=0)!==(hb>=0))crossings.push(station(mix(a,b,ha/(ha-hb))));}
 const opening={start:(crossings.length?Math.min(...crossings):exit-half)-.15,end:(crossings.length?Math.max(...crossings):exit+half)+.15};
 const issues=[];
 if(polygon.some(p=>height(p)>.05&&!inside(p,lotPolygon())))issues.push('The driveway extends beyond a side property line. Adjust the garage, width or alley connection.');
 if(overlaps(polygon,survey.building.footprint.map(p=>localToSurvey(...p))))issues.push('The driveway overlaps the house.');
 if(edges.slice(2,-1).some(e=>e.some(p=>inside(p,corners))))issues.push('The driveway turn clips the proposed garage. Move the alley connection or reduce its width.');
 return {active:true,points:route,edges,polygon,opening,exitStation:exit/FT,width:width/FT,warnings:issues,shedOverlap:overlaps(polygon,shedLayout.footprint)};
}
export function removedRearPanels(s,drive=drivewayLayout(s)){
 const manual=new Set(s.removedFencePanels??[]);
 return rearPanels.filter(p=>manual.has(p.id)||(s.driveway?.openFence&&drive.active&&p.end>drive.opening.start&&p.start<drive.opening.end)).map(p=>p.id);
}
