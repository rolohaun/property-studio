import {validateDesign} from './garage-model.js';

export const PUBLISHED_GARAGE_ID='garage-30x18-v1';

// The published starting point. Return a fresh validated copy for every load.
export function publishedGarage(){
 return validateDesign({
  version:1,
  placed:true,
  fence:'south',
  station:57.75,
  setback:2,
  direction:-1,
  width:30,
  depth:18,
  garageHeight:9,
  loftHeight:7,
  ridge:'auto',
  openings:[
   {id:'d0f75970-c3b5-4d79-b641-c385f5b3013a',wall:'right',type:'garage',level:'garage',width:16,height:8,offset:9,sill:0},
   {id:'ca9cd1ed-df62-466b-835f-e90ea1eb62cc',wall:'front',type:'window',level:'loft',width:6.5,height:3,offset:15,sill:2},
   {id:'57d377c9-a8e8-46c2-ba2f-d8621a0089d2',wall:'left',type:'door',level:'garage',width:3,height:6.666666666666667,offset:14.289310339917089,sill:0}
  ],
  driveway:{enabled:true,width:0,exitStation:null,openFence:true},
  removedFencePanels:[]
 });
}
