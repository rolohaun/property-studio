import {survey} from './survey.js';

const foot=.3048;
export const westTree={
  fenceClearance:2*foot,
  distanceFromSouth:26*foot,
  trunkCircumference:7*foot,
  height:8.6,canopyRadius:4.05,
};
westTree.trunkRadius=westTree.trunkCircumference/(2*Math.PI);
const {sw,nw,se}=survey.lot;
const west=[nw[0]-sw[0],nw[1]-sw[1]],length=Math.hypot(...west);
const along=west.map(v=>v/length),inside=[along[1],-along[0]];
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const offset=westTree.fenceClearance+westTree.trunkRadius;
const shifted=inside.map(v=>v*offset),south=[se[0]-sw[0],se[1]-sw[1]];
const station=-cross(shifted,south)/cross(along,south);
westTree.southReference=sw.map((v,i)=>v+shifted[i]+along[i]*station);
westTree.position=westTree.southReference.map((v,i)=>v+along[i]*westTree.distanceFromSouth);
const delta=westTree.position.map((v,i)=>v-survey.building.origin[i]);
const angle=survey.building.bearing*Math.PI/180;
westTree.local=[delta[0]*Math.cos(angle)-delta[1]*Math.sin(angle),-delta[0]*Math.sin(angle)-delta[1]*Math.cos(angle)];
