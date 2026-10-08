import test from 'node:test';
import assert from 'node:assert/strict';
import {newDesign} from './docs/garage-model.js';
import {createDesignStore,DESIGN_STORAGE_KEY} from './docs/design-storage.js';
import {publishedGarage,PUBLISHED_GARAGE_ID} from './docs/published-garage.js';

const timestamp='2026-01-01T12:00:00.000Z';
const display={layers:{shed:false,trees:true,roof:true},labels:false,units:'feet',trees:[{id:'west-tree',enabled:false}]};
function memory(){
 const data=new Map();let writes=0;
 return {getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);writes++;},get writes(){return writes;}};
}
function session(storage){return createDesignStore(()=>storage,()=>timestamp);}
function garage(){return {...newDesign(),placed:true,width:22,depth:26,garageHeight:10,loftHeight:6,ridge:'width',driveway:{enabled:true,width:18,exitStation:10,openFence:true},removedFencePanels:[3,4],openings:[{id:'door-1',wall:'left',type:'garage',level:'garage',width:16,height:8,offset:13,sill:0},{id:'window-1',wall:'right',type:'window',level:'loft',width:4,height:3,offset:7,sill:2}]};}

test('reopening restores the full design and display preferences without rewriting it',()=>{
 const storage=memory(),first=session(storage);
 assert.equal(first.initialize(newDesign(),{}).status,'empty');
 assert.equal(storage.writes,0);
 assert.equal(first.save(garage(),display).status,'saved');
 const second=session(storage),loaded=second.initialize(newDesign(),{});
 assert.deepEqual(loaded.design,garage());assert.deepEqual(loaded.display,display);
 assert.equal(loaded.status,'restored');assert.equal(loaded.savedAt,timestamp);
 second.save(loaded.design,loaded.display);assert.equal(storage.writes,1);
});
test('partial drawing and cancellation keep the last committed design; finishing replaces it',()=>{
 const storage=memory(),store=session(storage),original=garage();store.initialize(newDesign(),{});store.save(original,display);
 const next={...original,placed:false,width:30};
 for(const phase of ['anchor','place','width','depth'])assert.equal(store.save(next,display,{phase}).status,'draft');
 assert.deepEqual(session(storage).initialize(newDesign(),{}).design,original);
 store.save(original,display);assert.equal(storage.writes,1);
 next.placed=true;store.save(next,display);
 assert.equal(session(storage).initialize(newDesign(),{}).design.width,30);
});
test('deleting a garage persists an empty design instead of resurrecting it',()=>{
 const storage=memory(),store=session(storage);store.initialize(newDesign(),{});store.save(garage(),display);
 store.save({...garage(),placed:false,openings:[]},display);
 const restored=session(storage).initialize(newDesign(),{});
 assert.equal(restored.design.placed,false);assert.deepEqual(restored.design.openings,[]);
});
test('bad stored data never crashes startup or gets overwritten by an unchanged fallback',()=>{
 for(const bad of ['{broken',JSON.stringify({version:99}),JSON.stringify({version:1,savedAt:timestamp,design:{...garage(),width:999}}),'x'.repeat(100001)]){
  const storage=memory();storage.setItem(DESIGN_STORAGE_KEY,bad);const store=session(storage);
  const loaded=store.initialize(newDesign(),{});assert.equal(loaded.status,'invalid');assert.deepEqual(loaded.design,newDesign());
  assert.equal(store.save(loaded.design,loaded.display).status,'invalid');assert.equal(storage.getItem(DESIGN_STORAGE_KEY),bad);
  assert.equal(store.save(garage(),display).status,'saved');
 }
});
test('unavailable storage and quota failures are reported, retain the previous save, and can recover',()=>{
 const blocked=createDesignStore(()=>{throw new Error('SecurityError');});
 assert.equal(blocked.initialize(newDesign(),{}).status,'unavailable');assert.equal(blocked.save(garage(),display).status,'unavailable');
 const storage=memory(),store=session(storage);store.initialize(newDesign(),{});store.save(garage(),display);
 const previous=storage.getItem(DESIGN_STORAGE_KEY),write=storage.setItem;
 storage.setItem=()=>{throw new Error('QuotaExceededError');};
 const changed={...garage(),width:24};assert.equal(store.save(changed,display).status,'unavailable');assert.equal(storage.getItem(DESIGN_STORAGE_KEY),previous);
 storage.setItem=write;assert.equal(store.save(changed,display).status,'saved');assert.equal(session(storage).initialize(newDesign(),{}).design.width,24);
});
test('invalid edits do not replace the previous save and old designs gain driveway defaults',()=>{
 const storage=memory(),store=session(storage);store.initialize(newDesign(),{});store.save(garage(),display);
 assert.equal(store.save({...garage(),width:NaN},display).status,'invalid-edit');assert.equal(session(storage).initialize(newDesign(),{}).design.width,22);
 const old=garage();delete old.driveway;delete old.removedFencePanels;
 storage.setItem(DESIGN_STORAGE_KEY,JSON.stringify({version:1,savedAt:timestamp,design:old}));
 assert.deepEqual(session(storage).initialize(newDesign(),{}).design.driveway,newDesign().driveway);
});

test('the published garage loads on a new browser and an older blank baseline',()=>{
 const storage=memory(),options={publishedId:PUBLISHED_GARAGE_ID};
 const fresh=session(storage).initialize(publishedGarage(),display,options);
 assert.equal(fresh.status,'published');assert.equal(fresh.design.width*fresh.design.depth,540);
 storage.setItem(DESIGN_STORAGE_KEY,JSON.stringify({version:1,savedAt:timestamp,design:newDesign(),display}));
 const store=session(storage),migrated=store.initialize(publishedGarage(),{},options);
 assert.deepEqual(migrated.design,publishedGarage());assert.deepEqual(migrated.display,display);
 store.save({...migrated.design,placed:false,openings:[]},display);
 assert.equal(session(storage).initialize(publishedGarage(),{},options).design.placed,false);
});

test('publishing a starting design preserves existing browser work and later edits',()=>{
 const storage=memory(),previous=session(storage);previous.initialize(newDesign(),{});previous.save(garage(),display);
 const store=session(storage),options={publishedId:PUBLISHED_GARAGE_ID};
 assert.deepEqual(store.initialize(publishedGarage(),{},options).design,garage());
 const edited=publishedGarage();edited.openings[2].offset=12;edited.width=32;
 store.save(edited,display);
 assert.deepEqual(session(storage).initialize(publishedGarage(),{},options).design,edited);
 assert.equal(publishedGarage().width,30);assert.equal(publishedGarage().openings[2].offset,14.289310339917089);
});
