import test from 'node:test';
import assert from 'node:assert/strict';
import {createTapTracker,pointerFrame,planGesture} from './docs/pointer-gestures.js';
const event=(pointerId,clientX,clientY=100,isPrimary=true)=>({pointerId,clientX,clientY,isPrimary});
test('tap tolerates finger jitter; drags that return to their origin do not select',()=>{
 const t=createTapTracker();t.down(event(1,100));assert.equal(t.up(event(1,104)),true);
 t.down(event(1,100));t.move(event(1,140));assert.equal(t.up(event(1,100)),false);
 t.down(event(1,100));assert.equal(t.up(event(1,104)),true);
});
test('pinching never places a point, in either finger release order',()=>{
 for(const ids of [[1,2],[2,1]]){const t=createTapTracker();t.down(event(1,100));t.down(event(2,200,100,false));
  assert.equal(t.up(event(ids[0],ids[0]*100)),false);assert.equal(t.up(event(ids[1],ids[1]*100)),false);
  t.down(event(3,100));assert.equal(t.up(event(3,100)),true);
 }
});
test('cancelled gestures, lost pointers and non-primary fingers cannot select',()=>{
 const t=createTapTracker();t.down(event(1,100));t.cancel(event(1,100));assert.equal(t.up(event(1,100)),false);
 t.down(event(2,100,100,false));assert.equal(t.up(event(2,100)),false);
 t.reset();t.down(event(3,100));assert.equal(t.up(event(3,100)),true);
});
test('plan pinch preserves the ground anchor while panning, including zoom limits',()=>{
 for(const ratio of [.01,.5,2,20]){
  const before={x:220,y:360,span:100},after={x:245,y:345,span:100*ratio};
  const c=planGesture(before,after,1,46,834,1048),unit=46/1048,newUnit=unit/c.zoom;
  assert.ok(c.zoom>=.5&&c.zoom<=4);
  assert.ok(Math.abs((before.x-417)*unit-(c.x+(after.x-417)*newUnit))<1e-10);
  assert.ok(Math.abs((before.y-524)*unit-(c.z+(after.y-524)*newUnit))<1e-10);
 }
 const p=new Map([[1,{x:100,y:200}],[2,{x:300,y:200}]]);assert.deepEqual(pointerFrame(p),{x:200,y:200,span:200});
 p.delete(2);const before=pointerFrame(p);p.set(1,{x:110,y:190});const c=planGesture(before,pointerFrame(p),1,40,800,1000);assert.equal(c.zoom,1);assert.ok(Math.abs(c.x+.4)<1e-10);assert.ok(Math.abs(c.z-.4)<1e-10);
});
