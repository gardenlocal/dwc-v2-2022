## Lichen Cluster

### Create Process
0. `app.js` >> new CreaturesLayer
```
this.creaturesLayer = new CreaturesLayer(window.APP.onlineUsers, window.APP.onlineCreatures, window.APP.selfGarden)
```
- Pass online users, creatures, selfGarden information

1. `CreaturesLayer.js` >> constructor() & drawCreatures()
```
drawCreatures() {
    for (const [key, value] of Object.entries(this.creatures)) {
        const c = new Creature(value)
        this.creatureObjects[key] = c
    // ....
}
```
- draw all creatures in the garden. 

2. `creatures.js` >> class Creature
```
this.creature = new LichenCluster(appearance, this.displayText)

```
- Most of creature settings about creature is included in `appearance` paramter

3. `LichenCluster.js`


4. `LichenParticle.js`

### shared-constants => DWC_META => creaturesNew
**DWC_META.creaturesNew[creatureType]**
```
lichen: {
            "lichen-element-1": {
                name: "lichen-element-1",
                anchor: { x: 0.5, y: 0.5 },
                connectors: {
                    "lichen-element-1": 8
                }
            }
        }
```

### element paramter (coming from creature.js appearance parameter)
```
{type: 'lichen-element-1', children: Array(10), parentConnector: null, visibleChildren: 2}

children: Array(10)
    0: 
        children: Array(1)
            0: 
                children: []
                parentConnector: 1
                type: "lichen-element-1" 
            length: 1
        parentConnector: 3
        type: "lichen-element-1"
    1: {type: 'lichen-element-1', children: Array(0), parentConnector: 1}
    2: {type: 'lichen-element-1', children: Array(1), parentConnector: 0}
    3: {type: 'lichen-element-1', children: Array(2), parentConnector: 3}
    4: {type: 'lichen-element-1', children: Array(1), parentConnector: 1}
    5: {type: 'lichen-element-1', children: Array(0), parentConnector: 2}
    6: {type: 'lichen-element-1', children: Array(2), parentConnector: 0}
    7: 
        children: []
        parentConnector: 3
        type: "lichen-element-1"
    8: 
        children: Array(1)
            0: 
                children: []
                parentConnector: 2
                type: "lichen-element-1"
                parentConnector: 0
                type: "lichen-element-1"
    9: 
        children: (2) [{…}, {…}]
        parentConnector: 3
        type: "lichen-element-1"

    parentConnector: null
    type: "lichen-element-1"
    visibleChildren: 2
```