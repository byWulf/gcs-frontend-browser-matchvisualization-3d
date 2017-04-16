const ElementTypeInterface = require('./ElementTypeInterface');
const THREE = require('three');
const tileHelper = require('../helper/TileHelper');

class tile_v1 extends ElementTypeInterface {
    constructor(data, visualization, element) {
        super(data, visualization, element);

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

        this.setCanBeMoved(data.canBeMovedTo);
        this.setCanBeRotatedTo(data.canBeRotatedTo);
        this.setCanBeFlipped(data.canBeFlipped);

        this.object = new THREE.Group();
        this.object.name = 'tile_v1';

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

        this.object.add(this.tileRotationGroup);
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
        while (newRotation < 0) newRotation += 360;
        while (newRotation >= 360) newRotation -= 360;

        if (this.object.userData.rotationTween) this.object.userData.rotationTween.stop();

        let startRotation = -this.rotation * Math.PI / 180;
        let targetRotation = -newRotation * Math.PI / 180;

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

    highlightIfUsable() {
        let usable = this.canBeMoved.length || this.canBeRotatedTo.length || this.canBeFlipped;

        let selectedObjectsIndex = this.visualization.outlinePass.selectedObjects.findIndex(object => object === this.object);
        if (usable && selectedObjectsIndex === -1) {
            this.visualization.outlinePass.selectedObjects.push(this.object);
        } else if (!usable && selectedObjectsIndex > -1) {
            this.visualization.outlinePass.selectedObjects.splice(selectedObjectsIndex, 1);
        }
    }

    setCanBeMoved(canBeMoved) {
        this.canBeMoved = canBeMoved;

        this.highlightIfUsable();
    }

    setCanBeRotatedTo(canBeRotatedTo) {
        this.canBeRotatedTo = canBeRotatedTo;

        this.highlightIfUsable();
    }

    setCanBeFlipped(canBeFlipped) {
        this.canBeFlipped = canBeFlipped;

        this.highlightIfUsable();
    }

    onMouseDown(mousePosition) {
        if (this.canBeRotatedTo.length && mousePosition.distanceTo(new THREE.Vector3(0,0,0)) >= this.radius / 2.5) {
            if (this.object.userData.rotationTween) this.object.userData.rotationTween.stop();

            this.doingRotation = true;
            this.originalRotation = this.rotation;

            return false;
        }

        if (this.canBeMoved.length) {
            this.originalHighlightedObjects = this.visualization.outlinePass.selectedObjects;
            this.visualization.outlinePass.selectedObjects = [];

            for (let i = 0; i < this.canBeMoved.length; i++) {
                let element = this.visualization.getElementById(this.canBeMoved[i].id);
                if (!element) continue;

                let object = element.element.getHighlightObject(this.canBeMoved[i].data);
                if (!object) continue;

                this.visualization.outlinePass.selectedObjects.push(object);
            }

            return false;
        }

        if (this.canBeFlipped) {
            return false;
        }
    }

    onMouseMove(movementX, movementY) {
        if (this.doingRotation) {
            this.rotation -= movementX * 0.25;
            this.tileRotationGroup.rotation.y = -this.rotation * Math.PI / 180;
        } else if (this.canBeMoved.length) {
            this.object.position.x += movementX * 0.05;
            this.object.position.z += movementY * 0.05;
        }
    }

    onMouseUp() {
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

            this.changeRotation(newRotation);
        } else if (this.canBeMoved.length) {
            this.visualization.outlinePass.selectedObjects = this.originalHighlightedObjects;

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

        if (this.canBeFlipped) {
            this.visualization.gameCommunicationCallback('tile.flip', this.element.getId());
        }
    }

    getTargetObject() {
        return this.object;
    }
}

module.exports = tile_v1;