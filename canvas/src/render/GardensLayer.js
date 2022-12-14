// https://jsfiddle.net/jwcarroll/2r69j1ok/3/
// https://stackoverflow.com/questions/40472364/moving-object-from-a-to-b-smoothly-across-canvas

import * as PIXI from "pixi.js";
import UserGarden from "./userGarden";
import { sound } from '@pixi/sound';
import { randomInRange } from "./utils";
import { ALTTEXT_KO } from "../../altText-constants";

const CULL_BOUNDS = 1000

export default class GardensLayer extends PIXI.Container {
  constructor(users, creatures, selfGarden) {
    super()
    this.users = users
    this.creatures = creatures
    this.userGarden = selfGarden
    this.tapTimestamp = 0
    this.owner = null;
		console.log("GardenLayer: ", {...this.userGarden});
    this.drawBackgrounds()
  }

  drawBackgrounds() {
    let currentUser = Object.values(this.users).filter(u => {
      return u.uid == window.UID
    })[0]
    this.owner = currentUser;

    Object.values(this.users).forEach(u => {
      if (!u.gardenSection) return

      // for myGarden, check neighbor gardens and draw.
      if (!window.APP.getIsAdmin()) {
        let isWideScreen = (window.innerWidth > window.innerHeight)
        let dX = Math.abs(u.gardenSection.x * 1000 - currentUser.gardenSection.x * 1000)
        let dY = Math.abs(u.gardenSection.y * 1000 - currentUser.gardenSection.y * 1000)
        let dOne = (isWideScreen) ? (dX) : (dY)
        let dZero = (isWideScreen) ? (dY) : (dX) 
        // update 2022: do not draw neighbor gardens         
        if (dOne || dZero ) {
          return
        }
      }
      
      const garden = new UserGarden(this.users, this.creatures, u.gardenSection, u.uid)
      garden.x = u.gardenSection.x * 1000
      garden.y = u.gardenSection.y * 1000
      // console.log(this.users);

      this.addChild(garden)

      if (u.uid == currentUser.uid) {   
        
        // Add Move button for my garden only     
        if(window.ASSIST_MODE && !window.IS_ADMIN){
          this.createMoveButton()
        }
        // This is the current user, we need to add an event listener for click
        garden.interactive = true
        garden.on('mousedown', this.onGardenTap)
        garden.on('touchstart', this.onGardenTap)
      }
    })

    // disable to debug rendering speed issue
    // this.drawGardenName(currentUser);
  }

  drawGardenName(currentUser) {
    const { creatureName, gardenSection } = currentUser;

    const textStyle = new PIXI.TextStyle({
      fontSize: 100,
      fill: "green",
      fontFamily: 'Dongle',
      stroke: "orange",
    })
    const gardenName = new PIXI.Text(`Garden of ${creatureName}`, textStyle);
    gardenName.scale.set(0.5);
    gardenName.position.set(gardenSection.x*1000 + gardenName.getBounds().width/2, gardenSection.y*1000 + 1000 - gardenName.getBounds().height*2)        
    this.addChild(gardenName)

  }

// ACCESSIBILITY
  createMoveButton() {

    if(!document.getElementById('move')) {
      const accessButton = document.createElement("button");
      accessButton.id = "move"
      accessButton.innerText = "??????"
      accessButton.onclick = this.onGardenButtonClick

      const buttonAltText = ALTTEXT_KO[window.GARDEN].moveButton;
      accessButton.ariaLabel = buttonAltText

      const accessDiv = document.querySelector('.accessibility');
      accessDiv.appendChild(accessButton)
    }
}

  onGardenButtonClick = () => {
    // window.SCREENREADER.textContent = ALTTEXT_KO[window.GARDEN].move;

    let globalCoordinate = new PIXI.Point(randomInRange(0, window.innerWidth), randomInRange(100, window.innerHeight-100))
    let local = this.toLocal(globalCoordinate)
    window.APP.sendGardenTap(local)
  }

  onGardenTap = (e) => {
    const now = new Date().getTime()
    if (now - this.tapTimestamp > 5000) {
      let local = this.toLocal(e.data.global)
      window.APP.sendGardenTap(local)
      this.tapTimestamp = now  
    }
  }

  updateOnlineUsers(onlineUsers) {
    let currentUser = Object.values(this.users).filter(u => u.uid == window.UID)[0]

    // First, remove creatures that aren't online anymore
    let tilesToRemove = []
    let existingUsers = {}
    for (let c of this.children) {
      if (!onlineUsers[c.uid]) tilesToRemove.push(c)
      existingUsers[c.uid] = c
    }
    for (let c of tilesToRemove) {
      this.removeChild(c)
    }
    
    // Second, add creatures that don't exist
    for (let k of Object.keys(onlineUsers)) {
      if (!existingUsers[k]) {
        if (!window.APP.getIsAdmin()) {       // for myGarden, check neighbor gardens and draw. 
          let u = onlineUsers[k]
          let isWideScreen = (window.innerWidth > window.innerHeight)
          let dX = Math.abs((u.gardenSection.x * 1000) - (currentUser.gardenSection.x * 1000))
          let dY = Math.abs((u.gardenSection.y * 1000) - (currentUser.gardenSection.y * 1000))
          let dOne = (isWideScreen) ? (dX) : (dY)
          let dZero = (isWideScreen) ? (dY) : (dX)  
          // update 2022: do not draw neighbor gardens        
          if (dOne || dZero) {
            continue
          }
        }  

        const garden = new UserGarden(this.users, this.creatures, onlineUsers[k].gardenSection, onlineUsers[k].uid)
        garden.x = onlineUsers[k].gardenSection.x * 1000
        garden.y = onlineUsers[k].gardenSection.y * 1000
        this.addChild(garden)  
      }
    }    
  }

  tick() {
    this.children.forEach(bg => {
      if(bg.tick) bg.tick()
    })
  }
}