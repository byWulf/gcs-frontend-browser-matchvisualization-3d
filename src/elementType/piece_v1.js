const ElementTypeInterface = require('./ElementTypeInterface');

const THREE = require('three');
require('../../lib/three/examples/js/loaders/OBJLoader');

class piece_v1 extends ElementTypeInterface {
    constructor(data, visualization, element) {
        super();

        this.visualization = visualization;
        this.element = element;

        this.model = data.model;
        this.color = data.color;

        this.object = new THREE.Group();
        this.object.name = 'piece_v1';

        let material = new THREE.MeshPhongMaterial({color: this.color, shininess: 0});
        let loader = new THREE.OBJLoader();
        loader.load(document.location.protocol + '//' + document.location.hostname + ':3699/' + visualization.gameKey + '/' + this.model, (object) => {
            for (let mesh of object.children) {
                mesh.material = material;
            }
            object.castShadow = true;
            object.receiveShadow = true;
            this.object.add(object);
        });

        this.setCanBeMoved(data.canBeMovedTo);
    }

    setCanBeMoved(canBeMoved) {
        this.canBeMoved = canBeMoved;

        let selectedObjectsIndex = this.visualization.outlinePass.selectedObjects.findIndex(object => object === this.object);
        if (canBeMoved.length && selectedObjectsIndex === -1) {
            this.visualization.outlinePass.selectedObjects.push(this.object);
        } else if (canBeMoved.length === 0 && selectedObjectsIndex > -1) {
            this.visualization.outlinePass.selectedObjects.splice(selectedObjectsIndex, 1);
        }
    }

    onEvent(event, data) {
        if (event === 'piece.permissionChanged') {
            this.setCanBeMoved(data.canBeMovedTo);
        }
    }

    onMouseDown() {
        this.highlightObjects = [];

        if (this.canBeMoved.length) {
            this.originalHighlightedObjects = this.visualization.outlinePass.selectedObjects;
            this.visualization.outlinePass.selectedObjects = [];

            for (let i = 0; i < this.canBeMoved.length; i++) {
                let element = this.visualization.getElementById(this.canBeMoved[i].id);
                if (!element) continue;

                let object = element.element.getHighlightObject(this.canBeMoved[i].data);
                if (!object) continue;

                this.visualization.outlinePass.selectedObjects.push(object);
                this.highlightObjects.push(object);
            }

            return false;
        }
    }

    onMouseMove(movementX, movementY) {
        this.object.position.x += movementX * 0.05;
        this.object.position.z += movementY * 0.05;
    }

    onMouseUp() {
        for (let i = 0; i < this.highlightObjects.length; i++) {
            this.visualization.outlinePass.selectedObjects = this.originalHighlightedObjects;
        }

        let piecePosition = this.visualization.sumParentPositions(this.object);
        for (let i = 0; i < this.canBeMoved.length; i++) {
            let element = this.visualization.getElementById(this.canBeMoved[i].id);
            if (!element) continue;

            let object = element.element.getHighlightObject(this.canBeMoved[i].data);
            if (!object) continue;

            let targetPosition = this.visualization.sumParentPositions(object);
            let line3 = new THREE.Line3(piecePosition, targetPosition);

            if (line3.distance() - element.element.stackElementRadius <= 0) {
                this.visualization.gameCommunicationCallback('piece.move', this.element.getId(), {containerId: this.canBeMoved[i].id, index: this.canBeMoved[i].data.index});
                return;
            }
        }

        this.visualization.moveElementToParent(this.object, this.object.parent);
    }
}

module.exports = piece_v1;