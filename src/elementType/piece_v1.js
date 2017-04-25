const ElementTypeInterface = require('./ElementTypeInterface');

const THREE = require('three');
require('../../lib/three/examples/js/loaders/OBJLoader');

class piece_v1 extends ElementTypeInterface {
    constructor(data, visualization, element) {
        super(data, visualization, element);

        this.object = new THREE.Group();
        this.object.name = 'piece_v1';

        this.model = data.model;
        this.color = data.color;

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
    }

    applyInitialData(data) {
        this.setLaying(data.isLaying, true);
        this.setCanBeMoved(data.canBeMovedTo);
    }

    setCanBeMoved(canBeMoved) {
        this.canBeMoved = canBeMoved;

        if (canBeMoved.length) {
            this.visualization.interaction.addSelectableObject(this.object);
            this.visualization.interaction.addMoveableObject(this.object);
        } else {
            this.visualization.interaction.removeSelectableObject(this.object);
            this.visualization.interaction.removeMoveableObject(this.object);
        }
    }

    setLaying(isLaying, onCreate) {
        if (onCreate) {
            this.object.rotation.x = isLaying ? -90 * Math.PI / 180 : 0;
        } else {
            if (this.object.userData.rotationTween) this.object.userData.rotationTween.stop();

            let rotationX = this.object.rotation.x;
            let targetRotationX = isLaying ? -90 * Math.PI / 180 : 0;

            let targetPositionY = 0;
            if (isLaying) {
                this.object.rotation.x = targetRotationX;
                let objectPosition = this.visualization.sumParentPositions(this.object.parent);
                let objectBox = new THREE.Box3().setFromObject(this.object);

                targetPositionY = objectPosition.y - objectBox.min.y;

                this.object.rotation.x = rotationX;
            }

            let diff = {rotation: rotationX, position: this.object.position.y};
            this.object.userData.rotationTween = new TWEEN.Tween(diff)
                .to({rotation: targetRotationX, position: targetPositionY}, 500)
                .onUpdate(() => {
                    this.object.rotation.x = diff.rotation;
                    this.object.position.y = diff.position;

                }).easing(TWEEN.Easing.Quintic.Out);

            this.object.userData.rotationTween.start();
        }
    }

    onEvent(event, data) {
        if (event === 'piece.layingChanged') {
            this.setLaying(data.isLaying);
        }
        if (event === 'piece.permissionChanged') {
            this.setCanBeMoved(data.canBeMovedTo);
        }
    }

    onClick(clickedObject) {
        if (this.canBeMoved && this.targetObjects.indexOf(clickedObject) > -1) {
            for (let i = 0; i < this.canBeMoved.length; i++) {
                let element = this.visualization.getElementById(this.canBeMoved[i].id);
                if (!element) continue;

                let object = element.element.getHighlightObject(this.canBeMoved[i].data);
                if (!object) continue;

                if (object == clickedObject) {
                    this.visualization.gameCommunicationCallback('piece.move', this.element.getId(), {containerId: this.canBeMoved[i].id, index: this.canBeMoved[i].data.index});
                    return;
                }
            }
        }
    }

    onSelect() {
        this.targetObjects = [];

        for (let i = 0; i < this.canBeMoved.length; i++) {
            let element = this.visualization.getElementById(this.canBeMoved[i].id);
            if (!element) continue;

            let object = element.element.getHighlightObject(this.canBeMoved[i].data);
            if (!object) continue;

            this.targetObjects.push(object);
            this.visualization.interaction.addClickableObject(object, this.object);
        }
    }

    onUnselect() {
        for (let object of this.targetObjects) {
            this.visualization.interaction.removeClickableObject(object, this.object);
        }
    }

    onMove(movementX, movementY) {
        this.object.position.x += movementX * 0.05;
        this.object.position.z += movementY * 0.05;
    }

    onEndMove() {
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