import {survey,localToSurvey} from './survey.js';
import {FT,footprint,sub,add,dot,clamp,inside} from './garage-model.js';

export const houseSouthWall=[7,6].map(i=>localToSurvey(...survey.building.footprint[i]));
const house=survey.building.footprint.map(p=>localToSurvey(...p));
const distance=(a,b)=>Math.hypot(...sub(a,b));
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
function project(p,a,b){const v=sub(b,a),t=clamp(dot(sub(p,a),v)/dot(v,v),0,1);return add(a,v,t);}
function segmentGap(a,b,c,d){
 const ab=sub(b,a),cd=sub(d,c),den=cross(ab,cd);
 if(Math.abs(den)>1e-10){const ac=sub(c,a),t=cross(ac,cd)/den,u=cross(ac,ab)/den;if(t>=0&&t<=1&&u>=0&&u<=1){const p=add(a,ab,t);return {distance:0,garagePoint:p,housePoint:p};}}
 return [[a,project(a,c,d)],[b,project(b,c,d)],[project(c,a,b),c],[project(d,a,b),d]].map(([garagePoint,housePoint])=>({garagePoint,housePoint,distance:distance(garagePoint,housePoint)})).sort((a,b)=>a.distance-b.distance)[0];
}

export function measureHouseClearance(garage,housePolygon,southWall){
 const corners=garage.map((garagePoint,cornerIndex)=>{const housePoint=project(garagePoint,...southWall);return {garagePoint,housePoint,cornerIndex,distance:distance(garagePoint,housePoint)};});
 const corner=corners.sort((a,b)=>a.distance-b.distance)[0];
 let minimum={distance:Infinity};
 for(let i=0;i<garage.length;i++)for(let j=0;j<housePolygon.length;j++){const pair=segmentGap(garage[i],garage[(i+1)%garage.length],housePolygon[j],housePolygon[(j+1)%housePolygon.length]);if(pair.distance<minimum.distance)minimum=pair;}
 const overlaps=minimum.distance<1e-8||garage.some(p=>inside(p,housePolygon))||housePolygon.some(p=>inside(p,garage));
 if(overlaps)minimum={...minimum,distance:0};
 return {corner,minimum,overlaps,targetFeet:10,targetMetres:10*FT,meetsTarget:!overlaps&&minimum.distance+1e-8>=10*FT};
}
export function garageMetrics(s){
 if(!s.placed)return null;
 return {areaSqFt:s.width*s.depth,clearance:measureHouseClearance(footprint(s),house,houseSouthWall)};
}
