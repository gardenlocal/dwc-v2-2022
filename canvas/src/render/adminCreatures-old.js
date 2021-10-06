// https://jsfiddle.net/jwcarroll/2r69j1ok/3/
// https://stackoverflow.com/questions/40472364/moving-object-from-a-to-b-smoothly-across-canvas

import * as PIXI from "pixi.js";
import { Graphics } from "pixi.js";
import { io } from 'socket.io-client';

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

const userToken = JSON.parse(localStorage.getItem("user"))?.accessToken;
const userId = JSON.parse(localStorage.getItem("user"))?.id; 
let socket, socketAuthenticated = false;
const port = (window.location.hostname === 'localhost' ? '3000' : '330') // change to local IP address to access via mobile
let onlineUsers = [], myCreatures = [];

export async function renderAdminCreatures(app) {
  if(userToken) {
   socket = await io(`http://${window.location.hostname}:${port}`, {
     auth: { token: `Bearer ${userToken}` }
   })
  }

  await socket.on('connect', () => {
    console.log('socket connect')
    socketAuthenticated = true;
  })
  
  socket.on('connect_error', (error) => {
    console.log('socket connect error', error)
  })
  
  // get data of online users
 await socket.on('usersUpdate', (users) => {
    for(let i = 0; i < users.length; i++) {
      onlineUsers.push(users[i])
    }
  })

  // render all creatures in each online-user's garden
  await socket.on('creatures', (creatures) => {
    for(let i = 0; i < creatures.length; i++) {
      for(let j = 0; j < onlineUsers.length; j++){
        const id = onlineUsers[j].creature
        if(id === creatures[i]._id) {
          const creature = creatures[i]
          creature.gardenSection = onlineUsers[j].gardenSection
          myCreatures.push(creature)
        }
      }
    }
  });

  // constantly getting new data of current creatures
  socket.on('creaturesUpdate', (creaturesToUpdate) => {
    console.log('fire update')
    for (let i = 0; i < myCreatures.length; i++) {
      if (creaturesToUpdate[myCreatures[i]._id]) {
        const c = creaturesToUpdate[myCreatures[i]._id]
        // myCreatures[i].movement = c.movement;
        console.log(app.stage.children)
        // setTimeout(() => render(app, myCreatures), 1000)
      }
    }
  })

  setTimeout(() => {
    console.log('online creatures', myCreatures)
    if(myCreatures.length > 0){
      render(app, myCreatures)
    }
  }, 1500);
}

function render(app) {

  for(let i = 0; i < myCreatures.length; i++){
    let lastStep = 0;
    let milliseconds = 0;
    let circle, movement;

    const myCreature = myCreatures[i]
    const r = myCreature.appearance.radius / 10;
    const col = myCreature.appearance.fillColor;

    movement = myCreature.movement
    const garden = myCreature.gardenSection;
    let { fromX, fromY, toX, toY, transitionDuration } = movement;
    const originX = garden.x/10, originY = garden.y/10              
    // translate to each user garden's origin xy
    
    fromX = map(fromX, -1000, 1000, 0, WIDTH/10) + WIDTH/2 + originX
    fromY = map(fromY, -1000, 1000, 0, HEIGHT/10) + HEIGHT/2 + originY
    toX = map(toX, -1000, 1000, 0, WIDTH/10) + WIDTH/2 + originX
    toY = map(toY, -1000, 1000, 0, HEIGHT/10) + HEIGHT/2 + originY
  
    const hex = PIXI.utils.rgb2hex([col.r, col.g, col.b])
    circle = new Graphics();
    circle.lineStyle(4, hex);
    circle.drawCircle(0, 0, r/2);
    circle.x = fromX;
    circle.y = fromY;
    circle.vx = 0;
    circle.vy = 0;

    const destination = new Graphics();
    destination.beginFill(0x000000);
    destination.drawCircle(toX, toY, 2);
    destination.endFill();

    app.stage.addChild(circle);
    app.stage.addChild(destination);
  }
}


function map(n, start1, stop1, start2, stop2) {
  const newVal = (n - start1) / (stop1-start1) * (stop2 - start2) + start2;
  if(start2 < stop2) {
    return constrain(newVal, start2, stop2)
  } else {
    return constrain(newVal, stop2, start2)
  }
  return newVal;
}

function Vector(mag, angle) {
  const angleRad = (angle * Math.PI) / 180;
  this.magX = mag * Math.cos(angleRad);
  this.magY = mag * Math.sin(angleRad);
}

function constrain(n, low, high) {
  return Math.max(Math.min(n, high), low)
}

function distanceAndAngleBetweenTwoPoints(x1, y1, x2, y2) {
  var x = x2 - x1,
    y = y2 - y1;

  return {
    // x^2 + y^2 = r^2
    distance: Math.sqrt(x * x + y * y),

    // convert from radians to degrees
    angle: Math.atan2(y, x) * 180 / Math.PI
  }
}