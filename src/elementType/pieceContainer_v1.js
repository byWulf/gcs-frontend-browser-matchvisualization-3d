const ElementTypeInterface = require('./ElementTypeInterface');
const THREE = require('three');
const TWEEN = require('tween.js');

class Position {
    constructor(data) {
        this.index = data.index;
        this.x = data.x;
        this.y = data.y;
        this.next = data.next;

        this.container = null;
        this.places = [];

        this.highlight = null;
    }
}

class pieceContainer_v1 extends ElementTypeInterface {
    constructor(data, visualization, element) {
        super(data, visualization, element);

        this.object = new THREE.Group();
        this.object.name = 'pieceContainer_v1';

        this.stackElementRadius = data.stackElementRadius;

        this.positions = [];

        for (let i = 0; i < data.positions.length; i++) {
            let position = new Position(data.positions[i]);

            position.container = new THREE.Group();
            position.container.name = 'pieceContainer_v1_target_' + position.index;
            position.container.position.x = position.x;
            position.container.position.z = position.y;
            this.object.add(position.container);

            let highlightGeometry = new THREE.CircleGeometry(this.stackElementRadius, 32);
            let highlightMaterial = new THREE.MeshBasicMaterial({transparent: true, opacity: 0});
            position.highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
            position.highlight.rotation.x = -90 * Math.PI / 180;
            position.highlight.position.y = 0.01;
            position.container.add(position.highlight);

            this.positions.push(position);
        }
    }
    rearrangePlaces(position) {
        if (position.places.length === 0) return;

        let elementsCount = position.places.length;

        //determine needed row count
        let rowCount = Math.ceil(Math.sqrt(elementsCount));
        let elementsPerRow = [];
        for (let i = 0; i < rowCount; i++) elementsPerRow.push(0);

        //equally distribute places on each row
        let currentRow = 0;
        for (let i = 0; i < elementsCount; i++) {
            elementsPerRow[currentRow]++;
            currentRow = (currentRow + 1) % rowCount;
        }

        //sort "elements per row" count descending
        elementsPerRow.sort((a,b) => b-a );

        //iterate over the counts and alternate appending/prepending it to the final array, so
        //the biggest values are in the middle and the lowest values get to the outer sides
        let finalColumnOrder = [];
        for (let i = 0; i < rowCount; i++) {
            if (i % 2 === 0) {
                finalColumnOrder.push(elementsPerRow[i]);
            } else {
                finalColumnOrder.unshift(elementsPerRow[i]);
            }
        }

        let index = 0;
        for (let i = 0; i < rowCount; i++) {
            for (let j = 0; j < finalColumnOrder[i]; j++) {
                let place = position.places[index];
                if (place.userData.tween) place.userData.tween.stop();

                let targetPosition = {
                    x: -1 * ((finalColumnOrder[i] - 1) * this.stackElementRadius / 2) + j * this.stackElementRadius,
                    y: 0,
                    z: -1 * ((rowCount - 1) * this.stackElementRadius / 2) + i * this.stackElementRadius
                };

                let startVector = place.position.clone();

                place.userData.tween = new TWEEN.Tween(startVector)
                    .to(targetPosition, 250)
                    .onUpdate(() => {
                        place.position.x = startVector.x;
                        place.position.z = startVector.z;
                    }).easing(TWEEN.Easing.Quintic.Out);

                place.userData.tween.start();

                index++;
            }
        }
    }

    getTargetObject(data) {
        for (let i = 0; i < this.positions.length; i++) {
            if (this.positions[i].index === data.index) {
                let placeContainer = new THREE.Group();
                placeContainer.name = 'pieceContainer_v1_target_' + data.index;
                this.positions[i].container.add(placeContainer);
                this.positions[i].places.push(placeContainer);

                this.rearrangePlaces(this.positions[i]);

                return placeContainer;
            }
        }
        return null;
    }

    getHighlightObject(data) {
        for (let i = 0; i < this.positions.length; i++) {
            if (this.positions[i].index === data.index) {
                return this.positions[i].highlight;
            }
        }
        return null;
    }

    onChildRemoved(fromParent) {
        for (let i = 0; i < this.positions.length; i++) {
            for (let j = 0; j < this.positions[i].places.length; j++) {
                if (this.positions[i].places[j].children.length === 0) {
                    this.visualization.scene.remove(this.positions[i].places[j]);
                    this.positions[i].places.splice(j, 1);

                    this.rearrangePlaces(this.positions[i]);
                }
            }
        }
    }

    getDimensions() {
        let minX = 0;
        let maxX = 0;
        let minZ = 0;
        let maxZ = 0;

        for (let position of this.positions) {
            minX = Math.min(minX, position.x - this.stackElementRadius);
            maxX = Math.max(maxX, position.x + this.stackElementRadius);
            minZ = Math.min(minZ, position.y - this.stackElementRadius);
            maxZ = Math.max(maxZ, position.y + this.stackElementRadius);
        }

        return new THREE.Box3(
            new THREE.Vector3(minX, 0, minZ),
            new THREE.Vector3(maxX, 0, maxZ)
        );
    }
}

module.exports = pieceContainer_v1;