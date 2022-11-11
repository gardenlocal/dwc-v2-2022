// https://jsfiddle.net/jwcarroll/2r69j1ok/3/
// https://stackoverflow.com/questions/40472364/moving-object-from-a-to-b-smoothly-across-canvas

import * as PIXI from "pixi.js";
import Creature from './creature'
import { BlurFilter } from '@pixi/filter-blur';
import toWhite from "./shaders/toWhite.glsl";

export default class CreaturesLayer extends PIXI.Container {
  constructor(users, creatures) {
    super()
    this.users = users
    this.creatures = creatures

    this.creatureObjects = {}
    this.highlightObjects = {}

    // only execute when create creature very first time
    this.drawCreatures()
  }

  drawCreatures() {
    for (const [key, value] of Object.entries(this.creatures)) {
      const c = new Creature(value)
      this.creatureObjects[key] = c

      // Only add highlight for one's own creature
      // 사용하게 되면, window.APP.user.uid 로 바꿔야 함.
      if (value.owner.uid == window.APP.user.id) {
        /*
        let creatureSpriteContainer = new PIXI.Container()
        let creatureSprite = new PIXI.Sprite()        
        const whiteFilter = new PIXI.Filter(null, toWhite, {});
  
        creatureSpriteContainer.addChild(creatureSprite)
        creatureSpriteContainer.filters = [whiteFilter, new BlurFilter(16, 4), new BlurFilter(16, 4)]
        this.addChild(creatureSpriteContainer)
        this.highlightObjects[key] = {
          creatureSpriteContainer, creatureSprite
        }
        */
      }

      this.addChild(c)
    }  
  }

  updateOnlineCreatures(onlineCreatures) {
    this.creatures = onlineCreatures

    // First, remove creatures that aren't online anymore
    let creaturesToRemove = []
    let existingCreatures = {}
    for (let c of this.children) {
      if (!c.name) continue
      if (!onlineCreatures[c.name]) {
        creaturesToRemove.push(c)
        if (this.highlightObjects[c.name])
          creaturesToRemove.push(this.highlightObjects[c.name].creatureSpriteContainer)
      }
      existingCreatures[c.name] = c
    }
    for (let c of creaturesToRemove) {
      this.removeChild(c)
    }
    
    // Second, add creatures that don't exist
    for (let k of Object.keys(onlineCreatures)) {
      if (!existingCreatures[k]) {
        const c = new Creature(onlineCreatures[k])
        this.creatureObjects[c.name] = c

        if (onlineCreatures[k].owner.uid == window.APP.user.id) {
          /*
          let creatureSpriteContainer = new PIXI.Container()
          let creatureSprite = new PIXI.Sprite()        
          const whiteFilter = new PIXI.Filter(null, toWhite, {});
          
          creatureSpriteContainer.addChild(creatureSprite)
    
          creatureSpriteContainer.filters = [whiteFilter, new BlurFilter(16, 4), new BlurFilter(16, 4)]
          this.addChild(creatureSpriteContainer)
          this.highlightObjects[c.name] = {
            creatureSpriteContainer, creatureSprite
          }
          */ 
        }

        this.addChild(c)
      }
    }
  }

  updateCreatureData(creaturesToUpdate) {
    for (const [key, value] of Object.entries(this.creatures)) {
      if (creaturesToUpdate[key]) {
        const creature = this.children.find(ele => ele.name === key)
        const newState = creaturesToUpdate[key]

        // Update the target for movement inside of the creature class
        creature?.updateState(newState)        
      }
    }
  }

  evolveCreature(id) {
      this.children.forEach(c => {
          if (c.name == id) c.evolve()
      })
  }

  tick() {
    this.children.forEach(c => {
      if (c.tick) c.tick()
      const bbox = c.getBounds()
      // console.log(bbox.x, bbox.y)
      if (!window.APP.getIsAdmin() && (bbox.x < -500 || bbox.y < -500 || bbox.x > 1500 || bbox.y > 1500)) {
        c.visible = false
      } else {
        c.visible = true
      }
    })

    if (window.APP.getIsAdmin()) return

    let now = new Date().getTime()
    let alpha = (Math.cos(now / 500) + 1) / 2

    for (const [key, value] of Object.entries(this.creatureObjects)) {
      let o = this.highlightObjects[key]
      let c = value
      if (!o) continue
      if (!c.visible) continue
      // if (c.isAnimating)
        o.textureMask = window.DWCApp.renderer.generateTexture(c.creature, { resolution: 2, multisample: PIXI.MSAA_QUALITY.NONE });
      o.creatureSprite.texture = o.textureMask
      o.creatureSprite.position = c.creature.position
      o.creatureSprite.scale = c.creature.scale
      o.creatureSprite.rotation = c.creature.rotation

      o.creatureSpriteContainer.transform = c.transform
      // o.creatureSpriteContainer.scale = c.scale * 1.2
      o.creatureSpriteContainer.alpha = c.alpha * alpha
      const bbox = c.creature.getLocalBounds()      
      // o.creatureSprite.pivot.set(-bbox.x, -bbox.y)
      o.creatureSprite.pivot.set(c.creature.pivot.x - bbox.x, c.creature.pivot.y - bbox.y)
    }  

  }
}
