import {survey,localToSurvey} from './survey.js';
export const FEET_PER_METRE=1/.3048;
export const SQFT_PER_SQM=FEET_PER_METRE**2;
export function polygonArea(points){return Math.abs(points.reduce((a,p,i)=>{const q=points[(i+1)%points.length];return a+p[0]*q[1]-q[0]*p[1];},0))/2;}
export const combinedArea=polygonArea(survey.building.footprint);
export const garageArea=6.146*((7.168+7.372)/2);
export const homeArea=combinedArea-garageArea;
export function lengthText(m,units='metres',digits=2){return `${(m*(units==='feet'?FEET_PER_METRE:1)).toFixed(digits)} ${units==='feet'?'ft':'m'}`;}
export function areaText(m2,units='metres'){return `${(m2*(units==='feet'?SQFT_PER_SQM:1)).toLocaleString('en-US',{maximumFractionDigits:units==='feet'?0:1})} ${units==='feet'?'sq ft':'m²'}`;}
function projectToLine(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy);return [a[0]+t*dx,a[1]+t*dy];}
export const fenceEnds={
  westHouse:localToSurvey(0,0),
  eastHouse:localToSurvey(13.518,10.15),
};
fenceEnds.westBoundary=projectToLine(fenceEnds.westHouse,survey.lot.sw,survey.lot.nw);
fenceEnds.eastBoundary=projectToLine(fenceEnds.eastHouse,survey.lot.se,survey.lot.ne);
