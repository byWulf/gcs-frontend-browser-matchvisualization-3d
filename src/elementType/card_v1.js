const ElementTypeInterface = require('./ElementTypeInterface');
const THREE = require('three');
const TWEEN = require('tween.js');
const cardHelper = require('../helper/CardHelper');

class card_v1 extends ElementTypeInterface {
    constructor(data, visualization, element) {
        super(data, visualization, element);

        this.object = new THREE.Group();
        this.object.name = 'card_v1';

        this.frontImage = data.frontImage;
        this.backImage = data.backImage;
        this.side = data.side;
        this.rotation = data.rotation;
        while (this.rotation < 0) this.rotation += 360;
        while (this.rotation >= 360) this.rotation -= 360;
        this.width = data.width;
        this.height = data.height;
        this.depth = data.depth;
        this.cornerRadius = data.cornerRadius;
        this.originalParent = null;
        this.currentCanBeMoved = null;

        this.canBeSelected = false;
        this.isSelected = false;
        this.canBeMovedTo = [];
        this.canBeRotatedTo = [];
        this.canBeFlipped = false;
        this.targetObjects = [];

        this.sideMaterial = new THREE.MeshPhongMaterial({shininess: 0, color: '#aaaaaa'});
        this.frontMaterial = new THREE.MeshPhongMaterial({
            shininess: 0,
            map: this.getImageTexture(this.frontImage !== null ? this.frontImage : this.backImage)
        });
        this.backMaterial = new THREE.MeshPhongMaterial({
            shininess: 0,
            map: this.getImageTexture(this.backImage, true)
        });

        let shape = null;
        shape = cardHelper.getShape(this.width, this.height, this.cornerRadius);

        let geometry = new THREE.ExtrudeGeometry(shape, {
            steps: 2,
            amount: this.depth / 2,
            bevelEnabled: true,
            bevelThickness: this.depth / 4,
            bevelSize: this.depth / 4,
            bevelSegments: 16,
            material: 0,
            extrudeMaterial: 1
        });
        for (let face of geometry.faces) {
            if (face.normal.z < -0.99999) {
                face.materialIndex = 2;
            }
        }

        this.card = new THREE.Mesh(geometry, new THREE.MultiMaterial([this.frontMaterial, this.sideMaterial, this.backMaterial]));
        this.card.castShadow = true;
        this.card.receiveShadow = true;
        this.card.position.z = -this.depth / 4;

        this.cardSideGroup = new THREE.Group();
        this.cardSideGroup.add(this.card);
        this.cardSideGroup.rotation.x = this.side === 'back' ? 90 * Math.PI / 180 : -90 * Math.PI / 180;
        this.cardSideGroup.position.y = this.depth / 2;

        this.cardRotationGroup = new THREE.Group();
        this.cardRotationGroup.add(this.cardSideGroup);
        this.cardRotationGroup.rotation.y = -this.rotation * Math.PI / 180;
        this.object.add(this.cardRotationGroup);

        this.targetGroup = new THREE.Group();
        this.targetGroup.position.y = this.height;
        this.cardRotationGroup.add(this.targetGroup);

        this.textureLoader = new THREE.TextureLoader();
        this.textureLoader.crossOrigin = '';

        this.rotateLeftSprite = this.createSprite(
            'rotateRight.png',
            new THREE.Vector3(-this.width / 2, 0.5, this.height / 2 + 0.5),
            new THREE.Vector3(2, 2, 2)
        );
        this.object.add(this.rotateLeftSprite);

        this.rotateRightSprite = this.createSprite(
            'rotateLeft.png',
            new THREE.Vector3(this.width / 2, 0.5, this.height / 2 + 0.5),
            new THREE.Vector3(2, 2, 2)
        );
        this.object.add(this.rotateRightSprite);

        this.acceptSprite = this.createSprite(
            'ok.png',
            new THREE.Vector3(1, 0.5, -this.height / 2),
            new THREE.Vector3(2, 2, 2)
        );
        this.object.add(this.acceptSprite);

        this.declineSprite = this.createSprite(
            'cancel.png',
            new THREE.Vector3(-1, 0.5, -this.height / 2),
            new THREE.Vector3(2, 2, 2)
        );
        this.object.add(this.declineSprite);

    }

    createSprite(image, position, scale) {

        let texture = this.textureLoader.load('/node_modules/gcs-frontend-browser-matchvisualization-3d/public/card_v1/' + image);
        let material = new THREE.SpriteMaterial({transparent: true, map: texture, opacity: 0});
        let sprite = new THREE.Sprite(material);
        sprite.position.set(position.x, position.y, position.z);
        sprite.scale.set(scale.x, scale.y, scale.z);

        return sprite;
    }

    applyInitialData(data) {
        this.setCanBeSelected(data.canBeSelected);
        this.setCanBeMoved(data.canBeMovedTo);
        this.setCanBeRotatedTo(data.canBeRotatedTo);
        this.setCanBeFlipped(data.canBeFlipped);
    }

    getImageTexture(filename, back) {
        let textureLoader = new THREE.TextureLoader();
        textureLoader.crossOrigin = '';

        let texture = textureLoader.load(document.location.protocol + '//' + document.location.hostname + ':3699/' + this.visualization.gameKey + '/' + filename);
        texture.offset.set(0.5, 0.5);
        texture.repeat.set(1 / this.radius, 1 / this.radius * (back ? -1 : 1));

        return texture;
    }

    changeSide(newSide) {
        this.side = newSide;

        if (this.object.userData.sideTween) this.object.userData.sideTween.stop();

        let startRotation = this.side === 'back' ? -90 * Math.PI / 180 : 90 * Math.PI / 180;
        let targetRotation = this.side === 'back' ? 90 * Math.PI / 180 : -90 * Math.PI / 180;

        let diff = {rotation: startRotation};
        this.object.userData.sideTween = new TWEEN.Tween(diff)
            .to({rotation: targetRotation}, 1000)
            .onUpdate(() => {
                this.cardSideGroup.rotation.x = diff.rotation;
                this.cardRotationGroup.position.y = (((90 * Math.PI / 180) - Math.abs(diff.rotation)) / (90 * Math.PI / 180)) * (this.width / 2) * 2;
            }).easing(TWEEN.Easing.Quintic.Out);

        this.object.userData.sideTween.start();
    }

    changeRotation(newRotation) {
        if (this.object.userData.rotationTween) {
            this.object.userData.rotationTween.stop();
            this.object.userData.rotationTween = null;
        }

        let startRotation = this.cardRotationGroup.rotation.y;
        while (startRotation > 0) startRotation -= 360 * Math.PI / 180;
        while (startRotation <= -360) startRotation += 360 * Math.PI / 180;

        while (newRotation < 0) newRotation += 360;
        while (newRotation >= 360) newRotation -= 360;
        let targetRotation = -newRotation * Math.PI / 180;

        let rotationDiff = Math.abs(targetRotation - startRotation);
        if (Math.abs(targetRotation + 360 * Math.PI / 180 - startRotation) < rotationDiff) startRotation -= 360 * Math.PI / 180;
        if (Math.abs(targetRotation - 360 * Math.PI / 180 - startRotation) < rotationDiff) startRotation += 360 * Math.PI / 180;

        this.rotation = newRotation;

        let diff = {rotation: startRotation};
        this.object.userData.rotationTween = new TWEEN.Tween(diff)
            .to({rotation: targetRotation}, 1000)
            .onUpdate(() => {
                this.cardRotationGroup.rotation.y = diff.rotation;
            }).easing(TWEEN.Easing.Quintic.Out);

        this.object.userData.rotationTween.start();

        if (this.currentCanBeMoved !== null) this.showAcceptDecline();
    }

    changeFrontImage(newFrontImage) {
        this.frontImage = newFrontImage;

        this.frontMaterial.map = this.getImageTexture(this.frontImage !== null ? this.frontImage : this.backImage);
        this.frontMaterial.needsUpdate = true;
    }

    onEvent(event, data) {
        if (event === 'card.sideChanged') {
            this.changeSide(data.side);
        }
        if (event === 'card.rotationChanged') {
            this.changeRotation(data.rotation);
        }
        if (event === 'card.permissionChanged') {
            if (data.frontImage !== this.frontImage) {
                this.changeFrontImage(data.frontImage);
            }

            this.setCanBeSelected(data.canBeSelected);

            this.setCanBeMoved(data.canBeMovedTo);

            this.setCanBeRotatedTo(data.canBeRotatedTo);

            this.setCanBeFlipped(data.canBeFlipped);
        }
    }

    setCanBeSelected(canBeSelected) {
        this.canBeSelected = canBeSelected;

        if (canBeSelected) {
            this.visualization.interaction.addClickableObject(this.object);
        } else {
            this.visualization.interaction.removeClickableObject(this.object);
        }
    }

    setCanBeMoved(canBeMoved) {
        this.canBeMoved = canBeMoved;

        if (canBeMoved.length) {
            this.visualization.interaction.removeSelectableObject(this.object);

            this.visualization.interaction.addSelectableObject(this.object);
            this.visualization.interaction.addMoveableObject(this.object);
        } else {
            this.visualization.interaction.removeSelectableObject(this.object);
            this.visualization.interaction.removeMoveableObject(this.object);
        }
    }

    setCanBeRotatedTo(canBeRotatedTo) {
        this.canBeRotatedTo = canBeRotatedTo;

        if (canBeRotatedTo.length) {
            this.rotateLeftSprite.material.opacity = 1;
            this.rotateRightSprite.material.opacity = 1;

            this.visualization.interaction.removeSelectableObject(this.object);

            this.visualization.interaction.addSelectableObject(this.object);
            this.visualization.interaction.addMoveableObject(this.object);
            this.visualization.interaction.addClickableObject(this.rotateLeftSprite, this.object, false);
            this.visualization.interaction.addClickableObject(this.rotateRightSprite, this.object, false);
        } else {
            this.rotateLeftSprite.material.opacity = 0;
            this.rotateRightSprite.material.opacity = 0;

            this.visualization.interaction.removeSelectableObject(this.object);
            this.visualization.interaction.removeMoveableObject(this.object);
            this.visualization.interaction.removeClickableObject(this.rotateLeftSprite, this.object);
            this.visualization.interaction.removeClickableObject(this.rotateRightSprite, this.object);
        }
    }

    setCanBeFlipped(canBeFlipped) {
        this.canBeFlipped = canBeFlipped;

        if (canBeFlipped) {
            this.visualization.interaction.addClickableObject(this.object);
        } else {
            this.visualization.interaction.removeClickableObject(this.object);
        }
    }

    showAcceptDecline() {
        if (this.currentCanBeMoved.rotations.indexOf(this.rotation) > -1) {
            this.acceptSprite.material.opacity = 1;
            this.visualization.interaction.addClickableObject(this.acceptSprite, this.object, false);
        } else {
            this.acceptSprite.material.opacity = 0;
            this.visualization.interaction.removeClickableObject(this.acceptSprite, this.object);
        }

        this.declineSprite.material.opacity = 1;
        this.visualization.interaction.addClickableObject(this.declineSprite, this.object, false);
    }

    hideAcceptDecline() {
        this.acceptSprite.material.opacity = 0;
        this.declineSprite.material.opacity = 0;
        this.visualization.interaction.removeClickableObject(this.acceptSprite, this.object);
        this.visualization.interaction.removeClickableObject(this.declineSprite, this.object);
    }

    onClick(clickedObject) {
        if (clickedObject == this.declineSprite) {
            this.visualization.moveElementToParent(this.object, this.originalParent);
            this.originalParent = null;
            this.currentCanBeMoved = null;

            this.hideAcceptDecline();
        }
        if (clickedObject == this.acceptSprite) {
            this.visualization.gameCommunicationCallback('card.move', this.element.getId(), {
                containerId: this.currentCanBeMoved.target.id,
                position: this.currentCanBeMoved.target.data.position,
                index: this.currentCanBeMoved.target.data.index
            });
            this.originalParent = null;
            this.currentCanBeMoved = null;

            this.hideAcceptDecline();
        }

        if (this.canBeMoved.length && this.targetObjects.indexOf(clickedObject) > -1) {
            for (let i = 0; i < this.canBeMoved.length; i++) {
                let element = this.visualization.getElementById(this.canBeMoved[i].target.id);
                if (!element) continue;

                let object = element.element.getHighlightObject(this.canBeMoved[i].target.data);
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

        if (this.canBeRotatedTo.length && clickedObject == this.rotateLeftSprite) {
            let currentIndex = this.canBeRotatedTo.indexOf(this.rotation);
            if (currentIndex == -1) currentIndex = 0;

            let targetRotation = this.canBeRotatedTo[(currentIndex + this.canBeRotatedTo.length - 1) % this.canBeRotatedTo.length];
            this.rotation = targetRotation;
            this.visualization.gameCommunicationCallback('card.rotate', this.element.getId(), {
                rotation: targetRotation
            });

            return;
        }

        if (this.canBeRotatedTo.length && clickedObject == this.rotateRightSprite) {
            let currentIndex = this.canBeRotatedTo.indexOf(this.rotation);
            if (currentIndex == -1) currentIndex = 0;

            let targetRotation = this.canBeRotatedTo[(currentIndex + 1) % this.canBeRotatedTo.length];
            this.rotation = targetRotation;
            this.visualization.gameCommunicationCallback('card.rotate', this.element.getId(), {
                rotation: targetRotation
            });

            return;
        }

        if (this.canBeFlipped) {
            this.visualization.gameCommunicationCallback('card.flip', this.element.getId());
        }

        if (this.canBeSelected) {
            this.visualization.gameCommunicationCallback('card.select', this.element.getId(), {
                selected: true
            });
        }
    }

    onSelect() {
        this.targetObjects = [];

        for (let i = 0; i < this.canBeMoved.length; i++) {
            let element = this.visualization.getElementById(this.canBeMoved[i].target.id);
            if (!element) continue;

            let object = element.element.getHighlightObject(this.canBeMoved[i].target.data);
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
        if (this.canBeMoved.length) {
            if (movementX || movementY) {
                if (this.object.userData.tween) this.object.userData.tween.stop();
            }
            this.object.position.x += movementX * 0.05;
            this.object.position.z += movementY * 0.05;
        }
    }

    onEndMove() {
        if (this.canBeMoved.length) {

            let cardPosition = this.visualization.sumParentPositions(this.object);
            for (let i = 0; i < this.canBeMoved.length; i++) {
                let element = this.visualization.getElementById(this.canBeMoved[i].target.id);
                if (!element) continue;

                let object = element.element.getHighlightObject(this.canBeMoved[i].target.data);
                if (!object) continue;

                let targetPosition = this.visualization.sumParentPositions(object);
                let line3 = new THREE.Line3(cardPosition, targetPosition);

                if (line3.distance() - (element.element.stackElementRadius / 2) <= 0) {
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

    getTargetObject() {
        return this.targetGroup;
    }

    getDimensions() {
        return new THREE.Box3(
            new THREE.Vector3(-this.width/2, 0, -this.height/2),
            new THREE.Vector3(this.width/2, this.depth, this.height/2)
        );
    }
}

module.exports = card_v1;