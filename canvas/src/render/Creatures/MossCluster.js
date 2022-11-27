import * as PIXI from 'pixi.js'
import { DWC_META } from '../../../../shared-constants';
import Particle from './MossParticle';
import { BlurFilter } from '@pixi/filter-blur';
import gradientFragment from '../shaders/radialGradient.glsl'
import TWEEN from '@tweenjs/tween.js'
import { sleep } from '../utils';

export default class Cluster extends PIXI.Container {
    constructor({ creatureType, svgElementIndex, childrenSequence, scale, rotation, fillColor, noVisibleElements, evolutionIndex }, creatureName) {
        super()
        this.creatureType = creatureType
        this.elementType = Object.values(DWC_META.creaturesNew[creatureType])[svgElementIndex].name

        this.creature = new Particle(this.creatureType, this.elementType, childrenSequence, fillColor, noVisibleElements, evolutionIndex)
        this.addChild(this.creature)
        this.selfBbox = this.getBounds()

        this.creatureBounds = this.creature.getLocalBounds()
        const textStyle = new PIXI.TextStyle({
            fontSize: 48,
            fill: fillColor,
            stroke: "white",
            fontFamily: 'Dongle',
            padding: 12
        })

        this.pivot.set(this.selfBbox.width / 2, this.selfBbox.height / 2)

        this.messageText = new PIXI.Text(creatureName, textStyle);
        this.messageText.position.set(0, 0)

        this.messageText.scale.set(0.4);
        if(scale < 2) {
			this.messageText.scale.set(1.2);
		}
        this.messageText.roundPixels = true;
        this.addChild(this.messageText)

        const firstParticleBounds = this.creature.children[0].getLocalBounds();
        this.textBounds = this.messageText.getLocalBounds()
        this.messageText.position.set(firstParticleBounds.x + firstParticleBounds.width / 2 - firstParticleBounds.width / 4, firstParticleBounds.y + firstParticleBounds.height - firstParticleBounds.height / 4 + 10)

        //this.scale.set(scale)
        //this.rotation = rotation
    }

    async startAnimatingGrowth(elementDuration, elementDelay) {
        if (this.isAnimatingGrowth) return
        this.isAnimatingGrowth = true
        await this.creature.startAnimatingGrowth(elementDuration, elementDelay)
        this.isAnimatingGrowth = false
        // this.textBounds = this.message.getLocalBounds()
        // this.message.position.set(this.creatureBounds.x + this.creatureBounds.width / 2 - this.textBounds.width / 8, this.creatureBounds.y + this.creatureBounds.height / 2 - this.textBounds.height / 8)
    }

    async evolve(duration) {
        this.isEvolving = true
        await this.creature.evolve(duration)
        this.isEvolving = false

        this.selfBbox = this.getLocalBounds()        
        this.creatureBounds = this.creature.getLocalBounds()
        this.textBounds = this.messageText.getLocalBounds()

        const tween = new TWEEN.Tween(this.messageText.position)
        // TODO (cezar): That /8 is actually / 2 * this.message.scale.x (which is currentlly 0.25)
        .to({x: this.creatureBounds.x + this.creatureBounds.width / 2 - this.textBounds.width / 4, y: this.creatureBounds.y + this.creatureBounds.height - this.textBounds.height / 4 + 5 }, 500)
        .easing(TWEEN.Easing.Quartic.InOut)
        .start()

        const tween2 = new TWEEN.Tween(this.pivot)
        .to({x: this.selfBbox.x + this.selfBbox.width / 2, y: this.selfBbox.y + this.selfBbox.height / 2 }, 500)
        .easing(TWEEN.Easing.Quartic.InOut)
        .start()
        
        await sleep(500)

        //this.message.position.set(this.creatureBounds.x, this.creatureBounds.y - 15)
        //console.log('creature bounds: ', this.creatureBounds, this.getBounds())
    }

    stopEvolution() {
        this.stopEvolutionFlag = true
    }

    getNumberOfElements() {
        return this.creature.getNumberOfElements()
    }

    tick() {
        this.creature.tick()
        this.creature.position.set(0, 0)

        this.selfBbox = this.getLocalBounds()        
        this.creatureBounds = this.creature.getLocalBounds()
        this.textBounds = this.messageText.getLocalBounds()        
        let target = {
            x: this.selfBbox.x + this.selfBbox.width / 2,
            y: this.selfBbox.y + this.selfBbox.height / 2
        }

        this.pivot.x = 0.97 * this.pivot.x + 0.03 * target.x
        this.pivot.y = 0.97 * this.pivot.y + 0.03 * target.y
        /*
        if (this.isEvolving) {
            this.selfBbox = this.getLocalBounds()        
            this.creatureBounds = this.creature.getLocalBounds()
            this.textBounds = this.message.getBounds()    

            this.message.position.set(this.creatureBounds.x + this.creatureBounds.width / 2 - this.textBounds.width / 8, this.creatureBounds.y + this.creatureBounds.height / 2 - this.textBounds.height / 8)
            this.pivot.set(this.selfBbox.x + this.selfBbox.width / 2, this.selfBbox.y + this.selfBbox.height / 2)
        }
        */
    }

    drawParticle() {
        while (this.children.length > 0)
            this.removeChild(this.children[0])

        let shapeMask
        shapeMask = this.drawElement()
        this.addChild(shapeMask)
        
        // Gradient        
        const bbox = this.selfBbox//shapeMask.getBounds()
          
        const gradientUniforms = {
            u_time: 1.0,
            u_radius1: 0.6, // radius of first point of radial gradient
            u_color1: [244.0 / 256, 17.0 / 256, 190.0 / 256, 1.0], // color of first point of radial gradient            
            u_radius2: 0.9, // radius of second point of radial gradient            
            u_color2: [3.0 / 256, 120.0 / 256, 245.0 / 256, 1.0], // color of second point of radial gradient
            u_color3: [0.0, 0.0, 0.0, 0.8], // color of second point of radial gradient
            u_resolution: [bbox.width, bbox.height]
        }

        const gradientFilter = new PIXI.Filter(null, gradientFragment, gradientUniforms);
        const gradientSprite = new PIXI.Sprite(PIXI.Texture.WHITE)
        gradientSprite.x = 0
        gradientSprite.y = 0
        gradientSprite.width = bbox.width
        gradientSprite.height = bbox.height
        gradientSprite.filters = [gradientFilter]
        const gradientSpriteContainer = new PIXI.Container()
        gradientSpriteContainer.x = bbox.x
        gradientSpriteContainer.y = bbox.y
        gradientSpriteContainer.addChild(gradientSprite)


        const container = new PIXI.Container()
        container.addChild(gradientSpriteContainer)

        var textureMask = window.DWCApp.renderer.generateTexture(shapeMask, { resolution: 2, multisample: PIXI.MSAA_QUALITY.MEDIUM });
        var spriteMask = new PIXI.Sprite(textureMask)
        //spriteMask.scale.set(0.95)
        spriteMask.position.set(bbox.x, bbox.y)

        container.addChild(spriteMask)
        container.mask = spriteMask
        container.filters = [new BlurFilter(1, 8)]
        
        this.addChild(container)
        //shapeMask.filters = [new BlurFilter(1, 2)]
    }

    drawElement() {
        const shapeMask = new PIXI.Container()
        var texture = window.DWCApp.renderer.generateTexture(this.creature, { resolution: 2, multisample: PIXI.MSAA_QUALITY.MEDIUM });
        let sp = new PIXI.Sprite(texture)
        sp.x = -sp.width / 2
        sp.y = -sp.height / 2
        shapeMask.addChild(sp)
        return shapeMask
    }
}