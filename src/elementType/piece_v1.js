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

        this.originalParent = null;
        this.currentCanBeMoved = null;

        let material = new THREE.MeshPhongMaterial({color: this.color, shininess: 0});
        let loader = new THREE.OBJLoader();
        loader.load(document.location.protocol + '//' + document.location.hostname + ':3699/' + visualization.gameKey + '/' + this.model, (object) => {
            for (let mesh of object.children) {
                mesh.material = material;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
            }
            object.castShadow = true;
            object.receiveShadow = true;
            this.object.add(object);
        });

        this.textureLoader = new THREE.TextureLoader();
        this.textureLoader.crossOrigin = '';

        this.acceptSprite = this.createSprite(
            'ok.png',
            new THREE.Vector3(1, 0.5, 2),
            new THREE.Vector3(2, 2, 2)
        );
        this.object.add(this.acceptSprite);

        this.declineSprite = this.createSprite(
            'cancel.png',
            new THREE.Vector3(-1, 0.5, 2),
            new THREE.Vector3(2, 2, 2)
        );
        this.object.add(this.declineSprite);

    }

    createSprite(image, position, scale) {

        let texture = this.textureLoader.load('/node_modules/gcs-frontend-browser-matchvisualization-3d/public/piece_v1/' + image);
        let material = new THREE.SpriteMaterial({transparent: true, map: texture, opacity: 0});
        let sprite = new THREE.Sprite(material);
        sprite.position.set(position.x, position.y, position.z);
        sprite.scale.set(scale.x, scale.y, scale.z);

        return sprite;
    }

    applyInitialData(data) {
        this.setLaying(data.isLaying, true);
        this.setCanBeMoved(data.canBeMovedTo);
    }

    showAcceptDecline() {
        this.acceptSprite.material.opacity = 1;
        this.visualization.interaction.addClickableObject(this.acceptSprite, this.object, false);

        this.declineSprite.material.opacity = 1;
        this.visualization.interaction.addClickableObject(this.declineSprite, this.object, false);
    }

    hideAcceptDecline() {
        this.acceptSprite.material.opacity = 0;
        this.declineSprite.material.opacity = 0;
        this.visualization.interaction.removeClickableObject(this.acceptSprite, this.object);
        this.visualization.interaction.removeClickableObject(this.declineSprite, this.object);
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
        if (clickedObject == this.declineSprite) {
            this.visualization.moveElementToParent(this.object, this.originalParent);
            this.originalParent = null;
            this.currentCanBeMoved = null;

            this.hideAcceptDecline();
        }
        if (clickedObject == this.acceptSprite) {
            this.visualization.gameCommunicationCallback('piece.move', this.element.getId(), {containerId: this.currentCanBeMoved.id, index: this.currentCanBeMoved.data.index});
            this.originalParent = null;
            this.currentCanBeMoved = null;

            this.hideAcceptDecline();
        }

        if (this.canBeMoved && this.targetObjects.indexOf(clickedObject) > -1) {
            for (let i = 0; i < this.canBeMoved.length; i++) {
                let element = this.visualization.getElementById(this.canBeMoved[i].id);
                if (!element) continue;

                let object = element.element.getHighlightObject(this.canBeMoved[i].data);
                if (!object) continue;

                if (object == clickedObject) {
                    if (this.originalParent === null) this.originalParent = this.object.parent;
                    this.currentCanBeMoved = this.canBeMoved[i];
                    this.visualization.moveElementToParent(this.object, object.parent);
                    this.showAcceptDecline();
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

        if (this.originalParent) {
            this.visualization.moveElementToParent(this.object, this.originalParent);
            this.originalParent = null;
            this.currentCanBeMoved = null;
        }

        this.hideAcceptDecline();
    }

    onMove(movementX, movementY) {
        if (movementX || movementY) {
            if (this.object.userData.tween) this.object.userData.tween.stop();
        }

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
                if (this.originalParent === null) this.originalParent = this.object.parent;
                this.currentCanBeMoved = this.canBeMoved[i];
                this.visualization.moveElementToParent(this.object, object.parent);
                this.showAcceptDecline();
                return;
            }
        }

        this.visualization.moveElementToParent(this.object, this.originalParent !== null ? this.originalParent : this.object.parent);
        this.originalParent = null;
        this.currentCanBeMoved = null;
        this.hideAcceptDecline();
    }
}

module.exports = piece_v1;