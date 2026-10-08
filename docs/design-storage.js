import {validateDesign} from './garage-model.js';

export const DESIGN_STORAGE_KEY='property-studio.garage.v1';
const MAX_LENGTH=100000;
const layerNames=['shed','trees','roof','fence','dimensions','grid'];

export function validateDisplay(input={}){
 const out={};
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid display settings.');
 if(input.layers!==undefined){
  if(!input.layers||typeof input.layers!=='object'||Array.isArray(input.layers))throw new Error('Invalid layers.');
  out.layers={};
  for(const name of layerNames)if(Object.hasOwn(input.layers,name)){
   if(typeof input.layers[name]!=='boolean')throw new Error('Invalid layer visibility.');
   out.layers[name]=input.layers[name];
  }
 }
 if(input.labels!==undefined){if(typeof input.labels!=='boolean')throw new Error('Invalid labels.');out.labels=input.labels;}
 if(input.units!==undefined){if(!['feet','metres'].includes(input.units))throw new Error('Invalid units.');out.units=input.units;}
 if(input.trees!==undefined){
  if(!Array.isArray(input.trees)||input.trees.length>100)throw new Error('Invalid trees.');
  out.trees=input.trees.map(t=>{if(!t||typeof t.id!=='string'||t.id.length>100||typeof t.enabled!=='boolean')throw new Error('Invalid tree visibility.');return {id:t.id,enabled:t.enabled};});
 }
 return out;
}

const snapshot=(design,display)=>({design:validateDesign(design),display:validateDisplay(display)});

// Inject storage access so unavailable storage and failed writes can be tested.
// Access localStorage lazily: even reading the browser property can throw.
export function createDesignStore(getStorage=()=>globalThis.localStorage,now=()=>new Date().toISOString()){
 let signature=null,result={status:'empty'};
 function initialize(design,display){
  let value=snapshot(design,display),raw;
  try{raw=getStorage().getItem(DESIGN_STORAGE_KEY);}
  catch{result={status:'unavailable'};signature=JSON.stringify(value);return {...value,...result};}
  if(raw!==null){
   try{
    if(raw.length>MAX_LENGTH)throw new Error('Saved design is too large.');
    const record=JSON.parse(raw);
    if(record.version!==1||typeof record.savedAt!=='string'||!Number.isFinite(Date.parse(record.savedAt)))throw new Error('Invalid saved design.');
    value=snapshot(record.design,record.display);
    result={status:'restored',savedAt:record.savedAt};
   }catch{result={status:'invalid'};}
  }
  signature=JSON.stringify(value);
  return {...value,...result};
 }
 function save(design,display,{phase='idle'}={}){
  // A footprint is a transaction: keep the previous design until drawing finishes.
  if(phase!=='idle')return {status:'draft'};
  let value,next;
  try{value=snapshot(design,display);next=JSON.stringify(value);if(next.length>MAX_LENGTH-150)throw new Error('Design is too large.');}
  catch{return {status:'invalid-edit'};}
  if(next===signature)return result;
  const savedAt=now();
  try{getStorage().setItem(DESIGN_STORAGE_KEY,JSON.stringify({version:1,savedAt,...value}));}
  catch{result={status:'unavailable'};return result;}
  signature=next;result={status:'saved',savedAt};return result;
 }
 return {initialize,save};
}
