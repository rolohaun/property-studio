export const survey = {
  units: 'metres',
  lot: {sw:[0,0], nw:[20.1481989102,32.0771644738], ne:[30.0247276893,29.2807221858], se:[30.3282352095,-3.0378527083], arcCenter:[29.8633402332,47.5500093665], radius:18.27, arcLength:10.40, west:37.88, east:32.32, rear:30.48},
  building: {origin:[17.793213445088956,25.950534009955362], bearing:19.263891381980216, footprint:[[0,0],[6.146,0],[6.146,7.168],[7.422,7.168],[7.422,8.386],[13.518,8.386],[13.518,17.964],[.594,17.964],[.594,7.372],[0,7.372]], mainEntrance:[6.784,7.168], garageDoor:[3.073,0], wallHeight:2.8},
  shed: {origin:[4.93638913,5.18933560], width:3.11, depth:3.73, height:2.88},
};
const radians = survey.building.bearing * Math.PI / 180;
export function localToSurvey(u,d,origin=survey.building.origin) {return [origin[0]+u*Math.cos(radians)-d*Math.sin(radians),origin[1]-u*Math.sin(radians)-d*Math.cos(radians)];}
export function arcPoints(segments=48) {
  const {nw,ne,arcCenter:c,radius:r}=survey.lot;
  const start=Math.atan2(nw[1]-c[1],nw[0]-c[0]),end=Math.atan2(ne[1]-c[1],ne[0]-c[0]);
  return Array.from({length:segments+1},(_,i)=>[c[0]+r*Math.cos(start+(end-start)*i/segments),c[1]+r*Math.sin(start+(end-start)*i/segments)]);
}
export function lotPolygon(){return [survey.lot.sw,...arcPoints(),survey.lot.se];}
