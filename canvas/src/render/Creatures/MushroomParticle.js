import * as PIXI from 'pixi.js'
import { DWC_META } from '../../../../shared-constants';
import SVGCreatureShape from '../Geometry/SVGCreatureShape';
import { sleep, randomElementFromArray } from '../utils';
import TWEEN from '@tweenjs/tween.js'

export default class MushroomParticle extends PIXI.Container {
    constructor(creatureType, elementType, childrenDimensions, fillColor) {
        super()
        this.creatureType = creatureType
        this.elementType = elementType
        this.childrenDimensions = childrenDimensions
        this.svgData = PIXI.Loader.shared.resources[elementType].data

        this.elements = []
        //let fillColor = 0xffffff//(Math.random() < 0.5) ? 0x0cef42 : 0xfd880b

        const parent = new SVGCreatureShape(this.svgData, elementType, Object.keys(DWC_META.creaturesNew[creatureType][elementType].connectors), fillColor)
        const parentBbox = parent.getBounds()
        parent.pivot.set(0, parentBbox.height / 2)
        parent.position.set(0, parentBbox.height / 2)
        parent.targetScale = { x: 1, y: 1 }
        parent.alpha = 0.001
        this.addChild(parent)
        this.elements.push(parent)        

        let yPosition = 0

        for (let i = 0; i < childrenDimensions.length; i++) {
            const s = childrenDimensions[i]
            const child = new SVGCreatureShape(this.svgData, elementType, Object.keys(DWC_META.creaturesNew[creatureType][elementType].connectors), fillColor)            
            const bbox = child.getBounds()
            child.pivot.set(bbox.width, bbox.height / 2)
            child.scale.set(-s, s)            
            child.position.set(parentBbox.width, parentBbox.height * yPosition + bbox.height / 2 * s)
            child.targetScale = { x: -s, y: s }
            child.alpha = 0.001

            yPosition += s
    
            this.addChild(child)
            this.elements.push(child)
        }

        this.growthAnimation = {
            running: false,
            tHead: 0,
            durationPerElement: 0,
            currElement: 0
        }

        this.elTweens = {}
    }
    getChildBounds(childIndex) {
        let global = this.elements[childIndex + 1].getBounds()
        let local = this.elements[childIndex + 1].getLocalBounds()
        return global
    }
    getNumberOfElements() {
        return this.elements.length
    }
    hideAll() {
        for (let i = 0; i < this.elements.length; i++) {
            this.elements[i].alpha = 0
            if (this.elTweens[i]) {
                TWEEN.remove(this.elTweens[i])
            }
        }
        if (this.growthTween) TWEEN.remove(this.growthTween)
    }
    async startAnimatingGrowth(durationPerElement, delayPerElement = 250) {
        this.hideAll()

        if (this.growthTween) {
            TWEEN.remove(this.growthTween)
        }
        
        const el = this.elements[0]
        el.scale.set(0)
        el.alpha = 1
        this.growthTween = new TWEEN.Tween(this.elements[0].scale)
            .to({x: el.targetScale.x, y: el.targetScale.y }, durationPerElement)
            .easing(TWEEN.Easing.Quartic.InOut)
            .start()

        await sleep(durationPerElement)

        for (let i = 1; i < this.elements.length; i++) {
            const el = this.elements[i]
            el.scale.set(0)
            el.alpha = 1
            if (this.elTweens[i]) TWEEN.remove(this.elTweens[i])
            this.elTweens[i] = new TWEEN.Tween(el.scale)
            .to({x: el.targetScale.x, y: el.targetScale.y }, durationPerElement)
            .easing(TWEEN.Easing.Quartic.InOut)
            .start()
            await sleep(delayPerElement)
        }            
    }
    async startAnimatingDeath(durationPerElement, delayPerElement = 350) {        
        if (this.deathTween) {
            TWEEN.remove(this.deathTween)
        }

        for (let i = 1; i < this.elements.length; i++) {
            const el = this.elements[i]
            if (this.elTweens[i]) TWEEN.remove(this.elTweens[i])
            this.elTweens[i] = new TWEEN.Tween(el.scale)
            .to({x: 0, y: 0 }, durationPerElement)
            .easing(TWEEN.Easing.Quartic.InOut)
            .start()
            await sleep(delayPerElement)
        }

        const el = this.elements[0]
        // console.log('tween is: ', TWEEN)
        this.deathTween = new TWEEN.Tween(this.elements[0].scale)
            .to({x: 0, y: 0 }, durationPerElement)
            .easing(TWEEN.Easing.Quartic.InOut)
            .start()

        await sleep(durationPerElement)
    }
    async updateChildrenDimensions(newDimensions) {        
        const parent = this.elements[0]
        const parentBbox = parent.getLocalBounds()
        let yPosition = 0

        for (let i = 1; i < this.elements.length; i++) {
            const el = this.elements[i]
            let s = newDimensions[i - 1]

            const bbox = el.getLocalBounds()
            el.targetScale = { x: -s, y: s }

            const tweenP = new TWEEN.Tween(el.position)
            .to({y: parentBbox.height * yPosition + bbox.height / 2 * (s) }, 500)
            .easing(TWEEN.Easing.Quartic.Out)
            .start()

            if (this.elTweens[i]) TWEEN.remove(this.elTweens[i])
            this.elTweens[i] = new TWEEN.Tween(el.scale)
            .to({x: -s, y: s }, 500)
            .easing(TWEEN.Easing.Quartic.Out)
            .start()

            yPosition += s
        }

        this.childrenDimensions = newDimensions

        await sleep(500)
    }
    tick(d) {
        this.children.forEach(c => c.tick())
    }
}