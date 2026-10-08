const mainLeft=-.206,garageLeft=-.8,garageRight=8.26,houseRight=14.318;
export const roofHeight=u=>3.34+(u-mainLeft)*(1.32/(7.056-mainLeft));
export const roofFaces=[
 [[garageLeft,-.46],[3.73,-.46],[3.73,7.586],[7.056,7.586],[7.056,18.764],[mainLeft,18.764],[mainLeft,7.372],[garageLeft,7.372]].map(([u,d])=>[u,d,roofHeight(u)]),
 [[3.73,-.46,roofHeight(3.73)],[garageRight,-.46,roofHeight(garageLeft)],[garageRight,7.586,roofHeight(garageLeft)],[3.73,7.586,roofHeight(3.73)]],
 [[7.056,7.586,roofHeight(7.056)],[houseRight,7.586,3.34],[houseRight,18.764,3.34],[7.056,18.764,roofHeight(7.056)]]
];
export const roofPerimeter=[
 [garageLeft,-.46,roofHeight(garageLeft)],[3.73,-.46,roofHeight(3.73)],[garageRight,-.46,roofHeight(garageLeft)],
 [garageRight,7.586,roofHeight(garageLeft)],
 [3.73,7.586,roofHeight(3.73)],[7.056,7.586,roofHeight(7.056)],[houseRight,7.586,3.34],[houseRight,18.764,3.34],
 [7.056,18.764,roofHeight(7.056)],[mainLeft,18.764,3.34],[mainLeft,7.372,3.34],[garageLeft,7.372,roofHeight(garageLeft)]
];
