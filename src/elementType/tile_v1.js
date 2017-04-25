const ElementTypeInterface = require('./ElementTypeInterface');
const THREE = require('three');
const tileHelper = require('../helper/TileHelper');

class tile_v1 extends ElementTypeInterface {
    constructor(data, visualization, element) {
        super(data, visualization, element);

        this.object = new THREE.Group();
        this.object.name = 'tile_v1';

        this.frontImage = data.frontImage;
        this.backImage = data.backImage;
        this.side = data.side;
        this.rotation = data.rotation;
        while (this.rotation < 0) this.rotation += 360;
        while (this.rotation >= 360) this.rotation -= 360;
        this.height = data.height;
        this.radius = data.radius;
        this.form = data.form;

        this.canBeMoved = [];
        this.canBeRotatedTo = [];
        this.doingRotation = false;
        this.canBeFlipped = false;
        this.targetObjects = [];

        this.sideMaterial = new THREE.MeshPhongMaterial({shininess: 0, color: '#aaaaaa'});
        this.frontMaterial = new THREE.MeshPhongMaterial({
            shininess: 0,
            map: this.getImageTexture(this.frontImage !== null ? this.frontImage : this.backImage)
        });
        this.backMaterial = new THREE.MeshPhongMaterial({
            shininess: 0,
            map: this.getImageTexture(this.backImage)
        });

        let shape = null;
        if (this.form === 'square') {
            shape = tileHelper.getSquareShape(this.radius - this.height / 2);
        }
        if (this.form === 'hexagonal') {
            shape = tileHelper.getHexagonalShape(this.radius - this.height / 2);
        }

        let geometry = new THREE.ExtrudeGeometry(shape, {
            steps: 2,
            amount: this.height / 2,
            bevelEnabled: true,
            bevelThickness: this.height / 4,
            bevelSize: this.height / 4,
            bevelSegments: 16,
            material: 0,
            extrudeMaterial: 1
        });
        for (let face of geometry.faces) {
            if (face.normal.z < -0.99999) {
                face.materialIndex = 2;
            }
        }

        this.tile = new THREE.Mesh(geometry, new THREE.MultiMaterial([this.frontMaterial, this.sideMaterial, this.backMaterial]));
        this.tile.castShadow = true;
        this.tile.receiveShadow = true;
        this.tile.position.z = -this.height / 4;

        this.tileSideGroup = new THREE.Group();
        this.tileSideGroup.add(this.tile);
        this.tileSideGroup.rotation.x = this.side === 'back' ? 90 * Math.PI / 180 : -90 * Math.PI / 180;
        this.tileSideGroup.position.y = this.height / 2;

        this.tileRotationGroup = new THREE.Group();
        this.tileRotationGroup.add(this.tileSideGroup);
        this.tileRotationGroup.rotation.y = -this.rotation * Math.PI / 180;

        let textureLoader = new THREE.TextureLoader();
        textureLoader.crossOrigin = '';

        let leftTexture = textureLoader.load('/node_modules/gcs-frontend-browser-matchvisualization-3d/public/tile_v1/rotateLeft.png');
        let leftMaterial = new THREE.SpriteMaterial({transparent: true, map: leftTexture});
        this.rotateLeftSprite = new THREE.Sprite(leftMaterial);
        this.rotateLeftSprite.position.z = this.radius / 2 + 0.5;
        this.rotateLeftSprite.position.x = -this.radius / 2;
        this.rotateLeftSprite.position.y = 0.5;
        this.rotateLeftSprite.visible = false;
        this.object.add(this.rotateLeftSprite);

        let rightTexture = textureLoader.load('/node_modules/gcs-frontend-browser-matchvisualization-3d/public/tile_v1/rotateRight.png');
        let rightMaterial = new THREE.SpriteMaterial({transparent: true, map: rightTexture});
        this.rotateRightSprite = new THREE.Sprite(rightMaterial);
        this.rotateRightSprite.position.z = this.radius / 2 + 0.5;
        this.rotateRightSprite.position.x = this.radius / 2;
        this.rotateRightSprite.position.y = 0.5;
        this.rotateRightSprite.visible = false;
        this.object.add(this.rotateRightSprite);

        this.object.add(this.tileRotationGroup);
    }

    applyInitialData(data) {
        this.setCanBeMoved(data.canBeMovedTo);
        this.setCanBeRotatedTo(data.canBeRotatedTo);
        this.setCanBeFlipped(data.canBeFlipped);
    }

    getImageTexture(filename) {
        let textureLoader = new THREE.TextureLoader();
        textureLoader.crossOrigin = '';

        let texture = textureLoader.load(document.location.protocol + '//' + document.location.hostname + ':3699/' + this.visualization.gameKey + '/' + filename);
        texture.offset.set(0.5, 0.5);
        texture.repeat.set(1 / this.radius, 1 / this.radius);

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
                this.tileSideGroup.rotation.x = diff.rotation;
                this.tileRotationGroup.position.y = (((90 * Math.PI / 180) - Math.abs(diff.rotation)) / (90 * Math.PI / 180)) * (this.radius / 2) * 2;
            }).easing(TWEEN.Easing.Quintic.Out);

        this.object.userData.sideTween.start();
    }

    changeRotation(newRotation) {
        if (this.object.userData.rotationTween) {
            this.object.userData.rotationTween.stop();
            this.object.userData.rotationTween = null;
        }

        let startRotation = this.tileRotationGroup.rotation.y;
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
                this.tileRotationGroup.rotation.y = diff.rotation;
            }).easing(TWEEN.Easing.Quintic.Out);

        this.object.userData.rotationTween.start();
    }

    changeFrontImage(newFrontImage) {
        this.frontImage = newFrontImage;

        this.frontMaterial.map = this.getImageTexture(this.frontImage !== null ? this.frontImage : this.backImage);
        this.frontMaterial.needsUpdate = true;
    }

    onEvent(event, data) {
        if (event === 'tile.sideChanged') {
            this.changeSide(data.side);
        }
        if (event === 'tile.rotationChanged') {
            this.changeRotation(data.rotation);
        }
        if (event === 'tile.permissionChanged') {
            if (data.frontImage !== this.frontImage) {
                this.changeFrontImage(data.frontImage);
            }

            this.setCanBeMoved(data.canBeMovedTo);

            this.setCanBeRotatedTo(data.canBeRotatedTo);

            this.setCanBeFlipped(data.canBeFlipped);
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
            this.rotateLeftSprite.visible = true;
            this.rotateRightSprite.visible = true;

            this.visualization.interaction.removeSelectableObject(this.object);

            this.visualization.interaction.addSelectableObject(this.object);
            this.visualization.interaction.addMoveableObject(this.object);
            this.visualization.interaction.addClickableObject(this.rotateLeftSprite, this.object);
            this.visualization.interaction.addClickableObject(this.rotateRightSprite, this.object);
        } else {
            this.rotateLeftSprite.visible = false;
            this.rotateRightSprite.visible = false;

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

    onClick(clickedObject) {

        if (this.canBeMoved.length && this.targetObjects.indexOf(clickedObject) > -1) {
            for (let i = 0; i < this.canBeMoved.length; i++) {
                let element = this.visualization.getElementById(this.canBeMoved[i].id);
                if (!element) continue;

                let object = element.element.getHighlightObject(this.canBeMoved[i].data);
                if (!object) continue;

                if (object == clickedObject) {
                    this.visualization.gameCommunicationCallback('tile.move', this.element.getId(), {
                        containerId: this.canBeMoved[i].id,
                        x: this.canBeMoved[i].data.x,
                        y: this.canBeMoved[i].data.y,
                        index: this.canBeMoved[i].data.index
                    });
                    return;
                }
            }
        }

        if (this.canBeRotatedTo.length && clickedObject == this.rotateLeftSprite) {
            let currentIndex = this.canBeRotatedTo.indexOf(this.rotation);
            if (currentIndex == -1) currentIndex = 0;

            let targetRotation = this.canBeRotatedTo[(currentIndex + 1) % this.canBeRotatedTo.length];
            this.rotation = targetRotation;
            this.visualization.gameCommunicationCallback('tile.rotate', this.element.getId(), {
                rotation: targetRotation
            });

            return;
        }

        if (this.canBeRotatedTo.length && clickedObject == this.rotateRightSprite) {
            let currentIndex = this.canBeRotatedTo.indexOf(this.rotation);
            if (currentIndex == -1) currentIndex = 0;

            let targetRotation = this.canBeRotatedTo[(currentIndex + this.canBeRotatedTo.length - 1) % this.canBeRotatedTo.length];
            this.rotation = targetRotation;
            this.visualization.gameCommunicationCallback('tile.rotate', this.element.getId(), {
                rotation: targetRotation
            });

            return;
        }

        if (this.canBeFlipped) {
            this.visualization.gameCommunicationCallback('tile.flip', this.element.getId());
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

    onStartMove(mousePosition) {
        if (this.canBeRotatedTo.length && mousePosition.distanceTo(new THREE.Vector3(0,0,0)) >= this.radius / 2.5) {
            this.doingRotation = true;
            this.originalRotation = this.rotation;
        }
    }

    onMove(movementX, movementY) {
        if (this.doingRotation && (movementX || movementY)) {
            if (this.object.userData.rotationTween) {
                this.object.userData.rotationTween.stop();
                this.object.userData.rotationTween = null;
            }

            this.rotation -= movementX * 0.25;
            this.tileRotationGroup.rotation.y = -this.rotation * Math.PI / 180;
        } else if (this.canBeMoved.length) {
            this.object.position.x += movementX * 0.05;
            this.object.position.z += movementY * 0.05;
        }
    }

    onEndMove() {
        if (this.doingRotation) {
            this.doingRotation = false;

            while (this.rotation < 0) this.rotation += 360;
            while (this.rotation >= 360) this.rotation -= 360;

            let newRotation = this.originalRotation;
            let distance = Math.min(Math.abs(this.rotation - this.originalRotation), Math.abs((this.rotation - 360) - this.originalRotation), Math.abs((this.rotation + 360) - this.originalRotation));
            for (let targetRotation of this.canBeRotatedTo) {
                let currentDistance = Math.min(Math.abs(this.rotation - targetRotation), Math.abs((this.rotation - 360) - targetRotation), Math.abs((this.rotation + 360) - targetRotation));

                if (currentDistance < distance) {
                    newRotation = targetRotation;
                    distance = currentDistance;
                }
            }

            if (Math.abs((this.rotation - 360) - this.originalRotation) === distance) this.rotation -= 360;
            if (Math.abs((this.rotation + 360) - this.originalRotation) === distance) this.rotation += 360;

            if (newRotation !== this.originalRotation) {
                this.visualization.gameCommunicationCallback('tile.rotate', this.element.getId(), {
                    rotation: newRotation
                });
            }
        } else if (this.canBeMoved.length) {

            let tilePosition = this.visualization.sumParentPositions(this.object);
            for (let i = 0; i < this.canBeMoved.length; i++) {
                let element = this.visualization.getElementById(this.canBeMoved[i].id);
                if (!element) continue;

                let object = element.element.getHighlightObject(this.canBeMoved[i].data);
                if (!object) continue;

                let targetPosition = this.visualization.sumParentPositions(object);
                let line3 = new THREE.Line3(tilePosition, targetPosition);

                if (line3.distance() - (element.element.stackElementRadius / 2) <= 0) {
                    this.visualization.gameCommunicationCallback('tile.move', this.element.getId(), {
                        containerId: this.canBeMoved[i].id,
                        x: this.canBeMoved[i].data.x,
                        y: this.canBeMoved[i].data.y,
                        index: this.canBeMoved[i].data.index
                    });
                    return;
                }
            }

            this.visualization.moveElementToParent(this.object, this.object.parent);
        }
    }

    getTargetObject() {
        return this.object;
    }
}

module.exports = tile_v1;