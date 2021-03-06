const THREE = require('three');
const TWEEN = require('tween.js');

class Interaction {
    constructor(visualization) {
        this.visualization = visualization;

        this.selectableObjects = [];
        this.selectedObject = null;
        this.selectionTween = null;

        this.clickableObjects = [];

        this.moveableObjects = [];
    }

    updateHighlightedObjects() {
        let highlightObjects = [];

        for (let object of this.selectableObjects.filter((value) => value.highlight && value.object != this.selectedObject)) {
            highlightObjects.push(object.object);
        }
        for (let object of this.clickableObjects.filter((value) => value.highlight)) {
            highlightObjects.push(object.object);
        }
        for (let object of this.moveableObjects.filter((value) => value.highlight && value.object != this.selectedObject)) {
            highlightObjects.push(object.object);
        }

        highlightObjects = highlightObjects.filter((value, index, self) => self.indexOf(value) === index);

        this.visualization.outlinePass.selectedObjects = highlightObjects;
    }

    addSelectableObject(elementObject, highlight) {
        for (let element of this.selectableObjects) {
            if (element.object == elementObject) {
                return;
            }
        }

        this.selectableObjects.push({object: elementObject, highlight: typeof highlight === 'undefined' || !!highlight});

        if (this.selectableObjects.length == 1) {
            this.selectObject(elementObject);
        } else {
            this.unselectObject();
        }

        this.updateHighlightedObjects();
    }

    removeSelectableObject(elementObject) {
        for (let i = 0; i < this.selectableObjects.length; i++) {
            if (this.selectableObjects[i].object == elementObject) {
                this.selectableObjects.splice(i, 1);

                if (this.selectedObject == elementObject) {
                    this.unselectObject();
                }
                if (this.selectableObjects.length == 1) {
                    this.selectObject(this.selectableObjects[0].object);
                }

                this.updateHighlightedObjects();

                return;
            }
        }
    }

    selectObject(elementObject) {
        if (this.selectedObject !== null) {
            if (this.selectedObject == elementObject) return;

            this.unselectObject();
        }

        this.selectedObject = elementObject;

        let element = this.visualization.getElementByObject(elementObject);
        if (element) {
            element.element.onSelect();
        }

        if (this.selectionTween) this.selectionTween.stop();

        let position = {y: 1};
        this.selectionTween = new TWEEN.Tween(position)
            .to({y: 1.5}, 250)
            .onUpdate(() => {
                this.selectedObject.userData.offsetY = position.y;
                this.selectedObject.position.y = position.y;
            })
            .easing(TWEEN.Easing.Quadratic.InOut)
            .repeat(Infinity)
            .yoyo(true)
            .start();

        this.updateHighlightedObjects();
    }

    unselectObject() {
        if (!this.selectedObject) return;

        let element = this.visualization.getElementByObject(this.selectedObject);
        if (element) {
            element.element.onUnselect();
        }

        if (this.selectionTween) this.selectionTween.stop();
        this.selectedObject.userData.offsetY = 0;
        this.selectedObject.position.y = 0;

        this.selectedObject = null;

        this.updateHighlightedObjects();
    }

    addClickableObject(elementObject, eventTarget, highlight) {
        for (let clickableObject of this.clickableObjects) {
            if (clickableObject.object == elementObject && clickableObject.eventTarget == eventTarget) {
                return;
            }
        }

        this.clickableObjects.push({object: elementObject, eventTarget: eventTarget, highlight: typeof highlight === 'undefined' || !!highlight});

        this.updateHighlightedObjects();
    }

    removeClickableObject(elementObject, eventTarget) {
        for (let i = 0; i < this.clickableObjects.length; i++) {
            if (this.clickableObjects[i].object == elementObject && this.clickableObjects[i].eventTarget == eventTarget) {
                this.clickableObjects.splice(i, 1);

                this.updateHighlightedObjects();

                return;
            }
        }
    }

    addMoveableObject(elementObject, highlight) {
        for (let element of this.moveableObjects) {
            if (element.object == elementObject) {
                return;
            }
        }

        this.moveableObjects.push({object: elementObject, highlight: typeof highlight === 'undefined' || !!highlight});

        this.updateHighlightedObjects();
    }

    removeMoveableObject(elementObject) {
        for (let i = 0; i < this.moveableObjects.length; i++) {
            if (this.moveableObjects[i].object == elementObject) {
                this.moveableObjects.splice(i, 1);

                this.updateHighlightedObjects();
            }
        }
    }

    register() {
        this.canvas = this.visualization.sceneContainer.querySelector('canvas');
        console.log("canvas", this.canvas, this.visualization.sceneContainer);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.currentSelectedElement = null;

        this.cameraMousedownListener = (event) => {
            //Check if a clickable element was clicked. Send the MouseDown event and lock pointer
            let objectActionFound = false;
            if (event.button === 0) {
                this.mouse.x = (event.offsetX / this.canvas.offsetWidth) * 2 - 1;
                this.mouse.y = - (event.offsetY / this.canvas.offsetHeight) * 2 + 1;

                this.raycaster.setFromCamera(this.mouse, this.visualization.camera);

                //Selectable objects
                let selectableObjects = [];
                for (let element of this.selectableObjects) selectableObjects.push(element.object);

                let selectableIntersections = this.raycaster.intersectObjects(selectableObjects, true);
                if (selectableIntersections.length) {
                    for (let selectableObject of selectableObjects) {
                        if (this.visualization.isChildOfObject(selectableIntersections[0].object, selectableObject)) {
                            this.selectObject(selectableObject);

                            objectActionFound = true;
                            break;
                        }
                    }
                }

                //Clickable objects
                let clickableObjects = [];
                for (let element of this.clickableObjects) clickableObjects.push(element.object);

                let clickableIntersections = this.raycaster.intersectObjects(clickableObjects, true);
                if (clickableIntersections.length) {
                    let clickedObject = clickableIntersections[0].object;
                    for (let clickableObject of this.clickableObjects) {
                        if (this.visualization.isChildOfObject(clickedObject, clickableObject.object)) {
                            let element = this.visualization.getElementByObject(clickableObject.eventTarget ? clickableObject.eventTarget : clickableObject.object);
                            if (element) {
                                element.element.onClick(clickableObject.object);

                                objectActionFound = true;
                            }
                        }

                    }
                }

                //Moveable objects
                let moveableObjects = [];
                for (let element of this.moveableObjects) moveableObjects.push(element.object);

                let moveableIntersections = this.raycaster.intersectObjects(moveableObjects, true);
                if (moveableIntersections.length) {
                    for (let moveableObject of moveableObjects) {
                        if (this.visualization.isChildOfObject(moveableIntersections[0].object, moveableObject)) {
                            let element = this.visualization.getElementByObject(moveableObject);
                            if (element) {
                                let elementVector = this.visualization.sumParentPositions(element.element.getObject());
                                let diff = elementVector.sub(moveableIntersections[0].point);

                                element.element.onStartMove(diff);
                                this.currentSelectedElement = element;
                                this.canvas.requestPointerLock();

                                objectActionFound = true;
                                break;
                            }
                        }
                    }
                }
            }

            //No clickable element was clicked. Lock the pointer for moving/tilting camera
            if (!objectActionFound && (event.button === 0 || event.button === 2)) {
                this.cameraMoving = true;
                this.cameraMoved = false;
                this.canvas.requestPointerLock();
            }
        };

        this.cameraMouseupListener = (event) => {
            if (event.button === 0 || event.button === 2) {
                this.canvas.ownerDocument.exitPointerLock();
            }
        };

        this.cameraMousemoveListener = (event) => {
            if (this.cameraButtonLocked) {
                //A moveable element is currently clicked. Send MouseMove event.
                if (event.button === 0 && this.currentSelectedElement) {
                    this.currentSelectedElement.element.onMove(event.movementX, event.movementY);

                    return;
                }

                if (this.cameraMoving) {
                    //Left mouse button = move camera
                    if (event.button === 0) {
                        this.visualization.cameraPositionContainer.position.x = Math.max(Math.min(this.visualization.cameraPositionContainer.position.x + event.movementX * -0.1, 100), -100);
                        this.visualization.cameraPositionContainer.position.z = Math.max(Math.min(this.visualization.cameraPositionContainer.position.z + event.movementY * -0.1, 100), -100);
                    }

                    //Right mouse button = tilt camera
                    if (event.button === 2) {
                        this.visualization.cameraRotationContainer.rotation.x = Math.max(Math.min((this.visualization.cameraRotationContainer.rotation.x / Math.PI * 180) + event.movementY * -0.3, -5), -90) * Math.PI / 180
                    }

                    if (event.movementX || event.movementY) this.cameraMoved = true;
                }
            }
        };

        this.cameraPointerlockchangeListener = (event) => {
            this.cameraButtonLocked = document.pointerLockElement === this.canvas;

            if (!this.cameraButtonLocked && this.currentSelectedElement) {
                this.currentSelectedElement.element.onEndMove();
                this.currentSelectedElement = null;
            }
            if (!this.cameraButtonLocked && this.cameraMoving) {
                this.cameraMoving = false;

                if (!this.cameraMoved && this.selectableObjects.length > 1) {
                    this.unselectObject();
                }
            }
        };

        this.cameraMousewheelListener = (event) => {
	        let delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));

	        this.visualization.camera.position.z = Math.max(Math.min(this.visualization.camera.position.z + delta * -1, 100), 5);
        };

        this.canvas.addEventListener('mousewheel', this.cameraMousewheelListener, false);
        this.canvas.addEventListener('DOMMouseScroll', this.cameraMousewheelListener, false);
        this.canvas.addEventListener('mousedown', this.cameraMousedownListener, false);
        this.canvas.addEventListener('mouseup', this.cameraMouseupListener, false);
        this.canvas.addEventListener('mousemove', this.cameraMousemoveListener, false);
        this.canvas.ownerDocument.addEventListener('pointerlockchange', this.cameraPointerlockchangeListener, false);
    }

    unregister() {
        this.canvas.ownerDocument.exitPointerLock();

        this.canvas.removeEventListener('mousewheel', this.cameraMousewheelListener, false);
        this.canvas.removeEventListener('DOMMouseScroll', this.cameraMousewheelListener, false);
        this.canvas.removeEventListener('mousedown', this.cameraMousedownListener, false);
        this.canvas.removeEventListener('mouseup', this.cameraMouseupListener, false);
        this.canvas.removeEventListener('mousemove', this.cameraMousemoveListener, false);
        this.canvas.ownerDocument.removeEventListener('pointerlockchange', this.cameraPointerlockchangeListener, false);
    }
}

module.exports = Interaction;