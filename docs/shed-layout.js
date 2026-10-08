import {survey,localToSurvey} from './survey.js';

export const shedLayout={...survey.shed,width:10*.3048,depth:12*.3048,rightClearance:5*.3048,leftClearance:7.5*.3048};
const {sw,se}=survey.lot;
const fenceVector=se.map((v,i)=>v-sw[i]),fenceLength=Math.hypot(...fenceVector);
const tangent=fenceVector.map(v=>v/fenceLength),inward=[-tangent[1],tangent[0]];
const relativeAngle=Math.atan2(shedLayout.rightClearance-shedLayout.leftClearance,shedLayout.width);
const wallAngle=Math.atan2(tangent[1],tangent[0])+relativeAngle;
const across=[Math.cos(wallAngle),Math.sin(wallAngle)];
const backward=[across[1],-across[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const originalMidpoint=localToSurvey(survey.shed.width/2,survey.shed.depth,survey.shed.origin);
const station=dot(originalMidpoint.map((v,i)=>v-sw[i]),tangent);
const meanClearance=(shedLayout.rightClearance+shedLayout.leftClearance)/2;
const normalClearance=meanClearance*(-dot(backward,inward));
const rearMidpoint=sw.map((v,i)=>v+tangent[i]*station+inward[i]*normalClearance);
shedLayout.origin=rearMidpoint.map((v,i)=>v-across[i]*shedLayout.width/2-backward[i]*shedLayout.depth);
shedLayout.bearing=-wallAngle*180/Math.PI;
export function shedToSurvey(u,d){return shedLayout.origin.map((v,i)=>v+across[i]*u+backward[i]*d);}
shedLayout.footprint=[[0,0],[shedLayout.width,0],[shedLayout.width,shedLayout.depth],[0,shedLayout.depth]].map(p=>shedToSurvey(...p));
shedLayout.rearMeasurements=[
 {side:'West / left from behind',distance:shedLayout.leftClearance,corner:shedToSurvey(0,shedLayout.depth)},
 {side:'East / right from behind',distance:shedLayout.rightClearance,corner:shedToSurvey(shedLayout.width,shedLayout.depth)},
].map(measurement=>({...measurement,fencePoint:measurement.corner.map((v,i)=>v+backward[i]*measurement.distance)}));
