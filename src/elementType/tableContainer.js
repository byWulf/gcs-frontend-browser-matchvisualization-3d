const ElementTypeInterface = require('./ElementTypeInterface');
const THREE = require('three');
const TWEEN = require('tween.js');

class tableContainer extends ElementTypeInterface {
    constructor(data, visualization, element) {
        super(data, visualization, element);

        this.debug = false;
        let tableHeight = 74;

        this.object = new THREE.Group();
        this.object.position.y = tableHeight;

        let textureLoader = new THREE.TextureLoader();
        textureLoader.crossOrigin = '';

        //Table
        this.tableGeometry = new THREE.CylinderGeometry(1, 1, 2, 64);
        let tableTexture = textureLoader.load('/node_modules/gcs-frontend-browser-matchvisualization-3d/public/subtlepatterns/retina_wood.png');
        let tableMaterial = new THREE.MeshPhongMaterial({color: '#CCB586', shininess: 0, map: tableTexture});
        this.tableMesh = new THREE.Mesh(this.tableGeometry, tableMaterial);
        this.tableMesh.name = 'tablePlate';
        this.tableMesh.receiveShadow = true;
        this.tableMesh.position.y = -1;
        this.tableMesh.scale.x = 30;
        this.tableMesh.scale.z = 30;
        this.tableRadius = 15;
        this.object.add(this.tableMesh);

        this.centerObject = new THREE.Group();
        this.object.add(this.centerObject);
        this.centerIndicators = this.createIndicators('#ffffff', this.centerObject);

        let tableFootGeometry = new THREE.CylinderGeometry(5, 5, 65, 16);
        let tableFoot = new THREE.Mesh(tableFootGeometry, tableMaterial);
        tableFoot.position.y = -34.5;
        this.object.add(tableFoot);

        let tableSockelGeometry = new THREE.CylinderGeometry(5, 20, 5, 64);
        let tableSockel = new THREE.Mesh(tableSockelGeometry, tableMaterial);
        tableSockel.position.y = -69.5;
        this.object.add(tableSockel);

        let tableSockel2Geometry = new THREE.CylinderGeometry(20, 20, 2, 64);
        let tableSockel2 = new THREE.Mesh(tableSockel2Geometry, tableMaterial);
        tableSockel2.position.y = - 73;
        this.object.add(tableSockel2);

        //Players
        this.playerRotationContainers = [];
        this.playerContainers = [];
        this.playerBodies = [];
        this.playerContainerIndicators = [];
        for (let i in this.visualization.slots) {
            this.playerRotationContainers[i] = new THREE.Group();
            this.playerRotationContainers[i].name = 'playerRotationContainer_' + i;
            this.object.add(this.playerRotationContainers[i]);

            this.playerContainers[i] = new THREE.Group();
            this.playerContainers[i].name = 'playerContainer_' + i;
            this.playerContainers[i].position.y = -200;
            this.playerRotationContainers[i].add(this.playerContainers[i]);
            this.playerContainerIndicators[i] = this.createIndicators(this.visualization.slots[i].color, this.playerContainers[i]);

            this.playerBodies[i] = new THREE.Group();
            this.playerBodies[i].name = 'playerBody_' + i;
            this.playerRotationContainers[i].add(this.playerBodies[i]);

            let headGeometry = new THREE.SphereGeometry(10, 64, 64);
            let headMaterial = new THREE.MeshPhongMaterial({color: this.visualization.slots[i].color, shininess: 0});
            let headMesh = new THREE.Mesh(headGeometry, headMaterial);
            headMesh.name = 'headMesh_' + i;
            headMesh.position.y = 5;
            headMesh.position.z = 15;
            this.playerBodies[i].add(headMesh);
        }
    }

    getTargetObject(data) {
        if (typeof data == 'object' && data.type == 'player' && typeof this.playerContainers[data.index] != 'undefined') {
            return this.playerContainers[data.index];
        }

        return this.centerObject;
    }

    onSlotChange(slots, ownUser) {
        this.onDimensionsChanged();
    }

    onDimensionsChanged() {
        //CenterContainer
        let centerBox = new THREE.Box3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0));

        for (let element of this.visualization.elements) {
            if (element.parent.id != this.element.getId() || (typeof element.parent.data == 'object' && element.parent.data.type == 'player')) continue;

            let dimensions = element.element.getDimensions();
            centerBox.expandByPoint(dimensions.min);
            centerBox.expandByPoint(dimensions.max);
        }

        let centerWidth = centerBox.max.x - centerBox.min.x;
        let centerHeight = centerBox.max.z - centerBox.min.z;

        this.adjustObjectPosition(this.centerObject, -centerWidth/2 - centerBox.min.x, 0, -centerHeight/2 - centerBox.min.z);

        this.adjustIndicators(this.centerIndicators, centerBox);

        let centerRadius = Math.max(5, Math.sqrt(Math.pow(centerWidth, 2) + Math.pow(centerHeight, 2)) / 2);

        //PlayerContainers
        let maxPlayerWidth = 0;
        let maxPlayerHeight = 0;

        let playerBoxes = [];
        for (let i in this.visualization.slots) {
            if (!this.visualization.slots.hasOwnProperty(i)) continue;
            if (this.visualization.slots[i].user === null) continue;

            let box = new THREE.Box3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0));

            for (let element of this.visualization.elements) {
                if (
                    element.parent.id != this.element.getId() ||
                    typeof element.parent.data != 'object' ||
                    element.parent.data.type != 'player' ||
                    element.parent.data.index != i
                ) {
                    continue;
                }

                let dimensions = element.element.getDimensions();
                box.expandByPoint(dimensions.min);
                box.expandByPoint(dimensions.max);
            }

            playerBoxes[i] = box;

            maxPlayerWidth = Math.max(maxPlayerWidth, box.max.x - box.min.x);
            maxPlayerHeight = Math.max(maxPlayerHeight, Math.sqrt(Math.pow(box.max.z - box.min.z + centerRadius, 2) + Math.pow((box.max.x - box.min.x) / 2, 2)) - centerRadius);

            this.adjustIndicators(this.playerContainerIndicators[i], box);
        }

        centerRadius = Math.max(centerRadius, maxPlayerWidth / (2 * Math.tan(Math.PI / this.getFilledSlots()))) + 5 /* spacing */;

        this.tableRadius = Math.max(this.tableRadius, centerRadius + maxPlayerHeight + 5);

        for (let i in this.visualization.slots) {
            if (!this.visualization.slots.hasOwnProperty(i)) continue;

            if (this.visualization.slots[i].user === null) {
                this.adjustObjectPosition(this.playerContainers[i], 0, -200, this.tableRadius);
                this.adjustObjectPosition(this.playerBodies[i], 0, -200, this.tableRadius);
            } else {
                let playerWidth = playerBoxes[i].max.x - playerBoxes[i].min.x;

                this.adjustObjectPosition(
                    this.playerContainers[i],
                    -playerWidth/2 - playerBoxes[i].min.x,
                    0,
                    Math.sqrt(Math.pow(this.tableRadius - 5, 2) - Math.pow(playerWidth / 2, 2)) - playerBoxes[i].max.z
                );

                this.adjustObjectPosition(this.playerBodies[i], 0, 0, this.tableRadius);
            }

            //Rotate player to correct position
            if (this.visualization.slots[i].user !== null) {
                let position = (this.getSlotPosition(i) - this.getOwnSlotPosition() + this.getFilledSlots()) % this.getFilledSlots();

                let rotation = -360 / this.getFilledSlots() * position;

                if (this.playerRotationContainers[i].userData.rotY != rotation) {
                    if (this.playerRotationContainers[i].userData.adjustTween) this.playerRotationContainers[i].userData.adjustTween.stop();

                    this.playerRotationContainers[i].userData.rotY = rotation;

                    let currentRotation = {y: this.playerRotationContainers[i].rotation.y};

                    this.playerRotationContainers[i].userData.adjustTween = new TWEEN.Tween(currentRotation)
                        .to({y: rotation * Math.PI / 180}, 500)
                        .onUpdate(() => { this.playerRotationContainers[i].rotation.y = currentRotation.y; })
                        .easing(TWEEN.Easing.Quintic.Out);

                    this.playerRotationContainers[i].userData.adjustTween.start();
                }
            }
        }

        //Adjust table size
        if (this.tableMesh.userData.radius != this.tableRadius) {
            if (this.tableMesh.userData.adjustTween) this.tableMesh.userData.adjustTween.stop();

            this.tableMesh.userData.radius = this.tableRadius;

            let currentRadius = this.tableMesh.scale.clone();

            this.tableMesh.userData.adjustTween = new TWEEN.Tween(currentRadius)
                .to({x: this.tableRadius, y: 1, z: this.tableRadius}, 500)
                .onUpdate(() => {
                    this.tableMesh.scale.x = currentRadius.x;
                    this.tableMesh.scale.z = currentRadius.z;
                })
                .easing(TWEEN.Easing.Quintic.Out);

            this.tableMesh.userData.adjustTween.start();
        }
    }

    adjustObjectPosition(object, x, y, z) {
        if (object.userData.posX != x || object.userData.posY != y || object.userData.posZ != z) {
            if (object.userData.adjustTween) object.userData.adjustTween.stop();

            object.userData.posX = x;
            object.userData.posY = y;
            object.userData.posZ = z;

            let currentPosition = object.position.clone();

            object.userData.adjustTween = new TWEEN.Tween(currentPosition)
                .to({x: x, y: y, z: z}, 500)
                .onUpdate(() => {
                    object.position.x = currentPosition.x;
                    object.position.y = currentPosition.y;
                    object.position.z = currentPosition.z;
                }).easing(TWEEN.Easing.Quintic.Out);

            object.userData.adjustTween.start();
        }
    }

    getOwnSlotPosition() {
        for (let i in this.visualization.slots) {
            if (!this.visualization.slots.hasOwnProperty(i)) continue;

            if (this.visualization.slots[i].user !== null && this.visualization.slots[i].user.id == this.visualization.user.id) {
                return this.getSlotPosition(i);
            }
        }

        return null;
    }

    getFilledSlots() {
        let filledSlotCount = 0;
        for (let i in this.visualization.slots) {
            if (!this.visualization.slots.hasOwnProperty(i)) continue;

            if (this.visualization.slots[i].user === null) continue;

            filledSlotCount++;
        }

        return filledSlotCount;
    }

    getSlotPosition(slotIndex) {
        let count = 0;
        for (let i in this.visualization.slots) {
            if (!this.visualization.slots.hasOwnProperty(i)) continue;

            if (this.visualization.slots[i].user !== null) {
                if (i == slotIndex) {
                    return count;
                }

                count++;
            }
        }

        return null;
    }

    createIndicators(color, container) {
        if (!this.debug) return null;

        let indicatorGeometry = new THREE.SphereGeometry(1, 8, 8);
        let indicatorMaterial = new THREE.MeshPhongMaterial({color: color, shininess: 0});
        let indicators = {
            topLeft: new THREE.Mesh(indicatorGeometry, indicatorMaterial),
            topRight: new THREE.Mesh(indicatorGeometry, indicatorMaterial),
            bottomLeft: new THREE.Mesh(indicatorGeometry, indicatorMaterial),
            bottomRight: new THREE.Mesh(indicatorGeometry, indicatorMaterial),
            center: new THREE.Mesh(indicatorGeometry, indicatorMaterial)
        };
        container.add(indicators.topLeft);
        container.add(indicators.topRight);
        container.add(indicators.bottomLeft);
        container.add(indicators.bottomRight);
        container.add(indicators.center);

        return indicators;
    }

    adjustIndicators(indicators, box) {
        if (!this.debug) return;

        indicators.topLeft.position.x = box.min.x;
        indicators.topLeft.position.z = box.max.z;

        indicators.topRight.position.x = box.max.x;
        indicators.topRight.position.z = box.max.z;

        indicators.bottomLeft.position.x = box.min.x;
        indicators.bottomLeft.position.z = box.min.z;

        indicators.bottomRight.position.x = box.max.x;
        indicators.bottomRight.position.z = box.min.z;
    }
}

module.exports = tableContainer;