import test from 'node:test';
import assert from 'node:assert/strict';
import {newDesign,FT,basis,footprint,fences,sub,dot,openingRect,validateDesign} from './docs/garage-model.js';
import {measureHouseClearance} from './docs/garage-clearance.js';

test('every fence anchor preserves a perpendicular setback and rectangle dimensions',()=>{
 for(const fence of Object.keys(fences))for(const direction of [-1,1]){
  const s={...newDesign(),fence,direction,width:22,depth:24,setback:6};
  const p=footprint(s),b=basis(s),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8);
  near(dot(sub(p[0],b.anchor),fences[fence].inward),6*FT);
  near(Math.hypot(...sub(p[1],p[0])),22*FT);
  near(Math.hypot(...sub(p[2],p[1])),24*FT);
  near(dot(sub(p[1],p[0]),sub(p[2],p[1])),0);
 }
});
test('garage door fits its selected wall and adapts to wall height',()=>{
 const s={...newDesign(),width:22,garageHeight:9};
 const opening={type:'garage',wall:'front',level:'garage'};
 assert.equal(openingRect(s,opening).width,20);
 assert.equal(openingRect(s,opening).height,8);
 s.garageHeight=8;assert.equal(openingRect(s,opening).height,7);
});
test('design files round trip, including local-HTTP opening identifiers',()=>{
 const s={...newDesign(),placed:true,openings:[{id:'01234567-89abcdef-01234567-89abcdef',type:'door',wall:'front',level:'garage',width:3,height:6.5,offset:4,sill:0}]};
 assert.deepEqual(validateDesign(JSON.parse(JSON.stringify(s))),s);
 assert.throws(()=>validateDesign({...s,width:NaN}));
});
test('overlapping house and garage footprints report no passing clearance',()=>{
 const house=[[0,0],[8,0],[8,8],[0,8]],garage=[[7,1],[10,1],[10,4],[7,4]];
 const result=measureHouseClearance(garage,house,[house[0],house[1]]);
 assert.equal(result.overlaps,true);assert.equal(result.minimum.distance,0);assert.equal(result.meetsTarget,false);
});
