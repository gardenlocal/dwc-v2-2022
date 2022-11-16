import * as PIXI from 'pixi.js'
import { DWC_META, getMossNextChildConnector } from '../../../../shared-constants';
import SVGCreatureShape from '../Geometry/SVGCreatureShape';
import { sleep } from '../utils';
import TWEEN from '@tweenjs/tween.js'

export default class Particle extends PIXI.Container {
    constructor(creatureType, elementType, elementsProps, fillColor, noVisibleElements, evolutionIndex) {
        super()
        this.creatureType = creatureType
        this.elementType = elementType
        this.allElementsProps = elementsProps
        this.allElementsIndex = (evolutionIndex % this.allElementsProps.length)
        this.noElements = noVisibleElements//elementsProps.length
        this.fillColor = fillColor        

        this.elementsProps = []
        for (let i = this.allElementsIndex - this.noElements; i < this.allElementsIndex; i++) {
            let index = (i + this.allElementsProps.length) % this.allElementsProps.length
            this.elementsProps.push(this.allElementsProps[index])
        }
        
        // this.elementsProps = elementsProps.slice(0, noVisibleElements)

        this.elements = []
        let xOffset = 0, yOffset = 0
        this.connector = null
        this.xOffset = this.yOffset = 0

        this.frame = 0

        //let fillColor = 0xffffff//(Math.random() < 0.5) ? 0x0cef42 : 0xfd880b

        for (let i = 0; i < this.noElements; i++) {
            const { typeKey, nextTypeKey, connectorIndex } = this.elementsProps[i]            

            const elementContainer = this.createChildFromConnector(this.elementsProps[i], this.connector)
            this.elements.push(elementContainer)
            this.addChild(elementContainer)

            this.connector = elementContainer.children[0].getConnectorForType(nextTypeKey, connectorIndex)
            this.xOffset += this.connector.x
            this.yOffset += this.connector.y
        }
    }
    createChildFromConnector({ typeKey, nextTypeKey, connectorIndex }, connector) {
        const svgData = PIXI.Loader.shared.resources[typeKey].data            
        let element = new SVGCreatureShape(svgData, typeKey, Object.keys(DWC_META.creaturesNew[this.creatureType][typeKey].connectors), this.fillColor)
        
        //const targetScale = 1//Math.random() < 0.5 ? 1 : 0.5
        let pX = 0, pY = 0
        if (connector) {
            let bbox = element.getBounds()
            pX = connector.anchor.x * bbox.width
            pY = connector.anchor.y * bbox.height
        } else {
            let bbox = element.getBounds()
            let { anchor } = DWC_META.creaturesNew[this.creatureType][typeKey]
            pX = anchor.x * bbox.width
            pY = anchor.y * bbox.height
        }
        
        let elementContainer = new PIXI.Container()
        elementContainer.position.set(this.xOffset, this.yOffset)
        elementContainer.addChild(element)

        element.pivot.set(pX, pY)
        element.position.set(pX, pY)
        element.scale.set(1)
        element.alpha = 0.001

        const targetScale = { x: 1, y: 1 }//Math.random() < 0.5 ? 1 : 0.5
        element.targetScale = targetScale

        element.nextTypeKey = nextTypeKey
        element.connectorIndex = connectorIndex

        return elementContainer
    }
    getNumberOfElements() {
        return this.elements.length
    }
    async startAnimatingGrowth(durationPerElement, delayPerElement = window.GROW_ELEMENT_DURATION || 1000) {
        for (let i = 0; i < this.elements.length; i++) {
            this.elements[i].children[0].alpha = 0
        }
        
        for (let i = 0; i < this.elements.length; i++) {
            const el = this.elements[i].children[0]
            el.scale.set(0)
            el.alpha = 1
            const tween = new TWEEN.Tween(el.scale)
            .to({x: el.targetScale.x, y: el.targetScale.y }, durationPerElement)
            .easing(TWEEN.Easing.Quartic.InOut)
            .start()
            await sleep(delayPerElement)
        }            

    }
    async evolve(duration) {
        let el = this.elements[0].children[0]
        const tween = new TWEEN.Tween(el.scale)
        .to({x: 0, y: 0 }, duration)
        .easing(TWEEN.Easing.Quartic.Out)
        .start()
        await sleep(duration / 2)

        this.removeChild(this.children[0])
        this.elements.shift()

        const lastElement = this.elements[this.elements.length - 1].children[0]
        const nextConnector = this.allElementsProps[this.allElementsIndex] //getMossNextChildConnector(this.creatureType, lastElement.nextTypeKey)
        
        const nextElement = this.createChildFromConnector(nextConnector, this.connector)
        this.elements.push(nextElement)
        this.addChild(nextElement)

        el = nextElement.children[0]
        el.scale.set(0)
        el.alpha = 1
        const tween2 = new TWEEN.Tween(el.scale)
        .to({x: el.targetScale.x, y: el.targetScale.y }, duration)
        .easing(TWEEN.Easing.Quartic.In)
        .start()

        this.connector = el.getConnectorForType(nextConnector.nextTypeKey, nextConnector.connectorIndex)         
        this.xOffset += this.connector.x
        this.yOffset += this.connector.y
        this.allElementsIndex = (this.allElementsIndex + 1) % this.allElementsProps.length

        await sleep(3 * duration / 2)

        //this.bbox = this.getBounds()
        //this.pivot.set(-this.bbox.x, -this.bbox.y)
    }
    stopAnimatingGrowth() {        
    }
    tick(d) {
        this.children.forEach(c => c.children[0].tick())
    }
}