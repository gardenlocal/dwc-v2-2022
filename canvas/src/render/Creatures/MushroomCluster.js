import * as PIXI from 'pixi.js'
import { DWC_META } from '../../../../shared-constants';
import { randomElementFromArray, randomIntInRange, sleep } from '../utils';
import MushroomParticle from './MushroomParticle';

export default class MushroomCluster extends PIXI.Container {
    constructor(params, creatureName) {
        super()
        this.params = params
        const { creatureType, svgElementIndex, evolutionIndex, evolutions, scale, rotation, fillColor } = params
        this.fillColor = fillColor
        this.creatureType = creatureType
        this.elementType = Object.values(DWC_META.creaturesNew[creatureType])[svgElementIndex].name

        this.evolutions = evolutions
        this.evolutionIndex = evolutionIndex % evolutions.length
				this.randomEvolutionIndex = randomIntInRange(0, evolutions.length);
				this.chosenParentIndices1 = [];  // parent indices for first-children
				this.chosenParentIndices2 = []; // parent indices for second-children

        const { mainSectionChildren, mirrorSectionScale, mirrorSectionChildren, mirrorSectionParentIndex } = this.evolutions[this.evolutionIndex]
				this.firstChildrenNum = randomIntInRange(2, mainSectionChildren.length+1);
				this.secondChildrenNum = randomIntInRange(1, this.firstChildrenNum-1);
        this.creature = new PIXI.Container()

        this.creatureTop = new MushroomParticle(this.creatureType, this.elementType, mainSectionChildren, fillColor)        
        this.creature.addChild(this.creatureTop);
				this.creatureFirstChildren = [];
				this.creatureSecondChildren = [];

				// create several first-child 
				this.generateRandomChildren(this.firstChildrenNum, 'CHILD1', this.creatureTop);

				// create several second-child
				this.generateRandomChildren(this.secondChildrenNum, 'CHILD2', null, this.creatureFirstChildren);

        const bbox = this.creatureTop.getLocalBounds()
        this.addChild(this.creature)

        const textStyle = new PIXI.TextStyle({
            fontSize: 50,
            fill: fillColor,
            fontFamily: 'Dongle',
            stroke: "white",
        })
        const message = new PIXI.Text(creatureName, textStyle);
        message.scale.set(0.25)
        // message.position.set(bbox.width - message.getBounds().width / 2, bbox.y + bbox.height + 10 - message.getBounds().height / 2)        
        message.position.set(bbox.width / 2 - message.getLocalBounds().width / 8 - 5, bbox.height + 3)
        this.addChild(message)
        this.message = message

        const selfBbox = this.getBounds()

        this.pivot.set(selfBbox.width / 2, selfBbox.height / 2)
        this.scale.set(scale)
        this.rotation = rotation      

        this.frame = 0
        this.isAnimatingGrowth = false
    }

		generateRandomChildren(currChildrenNum, childLevel, parentCreature, parentCreatureArr) {
				// decide number of children to make
				let randomIndices = [];
				for(let i = 0; i < currChildrenNum; i++){
					let parentIndex = randomIntInRange(0, currChildrenNum);
					randomIndices.push(parentIndex);
				}
				// choose which parentIndices these children will attach to
				const chosenIndices = [...new Set(randomIndices)]; // make array with unique random nums
				switch(childLevel){
					case 'CHILD1':
						this.chosenParentIndices1 = chosenIndices;
						break;
					case 'CHILD2':
						this.chosenParentIndices2 = chosenIndices;
						break;
				} 
				
				// for each parentIndex, make child-mushroom
				chosenIndices.map(index => {
					const mushroomData = {...this.evolutions[this.randomEvolutionIndex], mirrorSectionParentIndex: index};
					let child = null;
					console.log("which child level", childLevel)
					if(parentCreature) child = this.generateChildFromParameters(parentCreature, mushroomData);
					if(parentCreatureArr) child = this.generateChildFromParameters(parentCreatureArr[index], mushroomData);
					
					// save children-mushroom data to this.
					switch(childLevel){
						case 'CHILD1':
							this.creatureFirstChildren.push(child);
							break;
						case 'CHILD2':
							this.creatureSecondChildren.push(child);
							break;
					} 

					this.creature.addChild(child);
				})
		}

    generateChildFromParameters(parentCreature, { mirrorSectionChildren, mirrorSectionScale, mirrorSectionParentIndex, fillColor }) {
        const oldRotation = this.rotation
        this.rotation = 0

        const creatureBottom = new MushroomParticle(this.creatureType, this.elementType, mirrorSectionChildren, this.fillColor)
        creatureBottom.scale.set(mirrorSectionScale, mirrorSectionScale)
        const bottomBBox = creatureBottom.getBounds()                
        
				try {
					const childBounds = parentCreature.getChildBounds(mirrorSectionParentIndex)
					const gX = childBounds.x + childBounds.width
					const gY = childBounds.y + childBounds.height / 2
					const pos = this.creature.toLocal(new PIXI.Point(gX, gY))
					creatureBottom.position.set(pos.x, pos.y - bottomBBox.height / 2)
					this.rotation = oldRotation
	
					return creatureBottom
				} catch(err) {
					console.log("child-bounds error?:", parentCreature, mirrorSectionParentIndex);
					console.log(err);
					alert("새로고침을 해주세요.")
				}
				
    }

    async evolve(duration) {
			console.log("mushroomcluster evolve called")
				/*
        this.startedEvolving = true
        this.evolutionIndex = (this.evolutionIndex + 1) % this.evolutions.length
        let currEvolution = this.evolutions[this.evolutionIndex]

				await this.creatureBottom2.startAnimatingDeath(duration)
        await this.creatureBottom.startAnimatingDeath(duration)
        await this.creatureTop.updateChildrenDimensions(currEvolution.mainSectionChildrenAnims[0])
        await this.creatureTop.updateChildrenDimensions(currEvolution.mainSectionChildrenAnims[1])
        await this.creatureTop.updateChildrenDimensions(currEvolution.mainSectionChildren)
        this.creature.removeChild(this.creatureBottom2)
				this.creatureBottom2 = this.generateChildFromParameters(this.creatureBottom, currEvolution)
				this.creature.addChild(this.creatureBottom2)
        this.creatureBottom = this.generateChildFromParameters(this.creatureTop, currEvolution)
        this.creature.addChild(this.creatureBottom)
				await this.creatureBottom2.startAnimatingGrowth(1500)
        await this.creatureBottom.startAnimatingGrowth(1500)
        this.startedEvolving = false
				*/
        // await this.evolve(1500)
    }

    async startAnimatingGrowth(elementDuration) {
        if (this.isAnimatingGrowth) return
        this.isAnimatingGrowth = true

				// hide
        this.creatureTop.hideAll()
				for(let i = 0; i < this.creatureFirstChildren.length; i++){
					const child1 = this.creatureFirstChildren[i];
					child1.hideAll();
				}
				for(let i = 0; i < this.creatureSecondChildren.length; i++){
					const child2 = this.creatureFirstChildren[i];
					child2.hideAll();
				}

				// grow in order
        await this.creatureTop.startAnimatingGrowth(elementDuration) 
				
				for(let i = 0; i < this.creatureFirstChildren.length; i++){
					const child1 = this.creatureFirstChildren[i];
					await child1.startAnimatingGrowth(elementDuration);
				}
				for(let i = 0; i < this.creatureSecondChildren.length; i++){
					const child2 = this.creatureSecondChildren[i];
					await child2.startAnimatingGrowth(elementDuration);
				}

        // await this.creatureBottom.startAnimatingGrowth(elementDuration)
				await sleep(2000)

        this.isAnimatingGrowth = false
        // await this.evolve(1500)
    }

    getNumberOfElements() {
        return this.creature.getNumberOfElements()
    }

    tick() {
        this.creature.children.forEach(c => c.tick())
    }
}