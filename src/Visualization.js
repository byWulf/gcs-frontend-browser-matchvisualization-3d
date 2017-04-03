const THREE = require('three');
require('../lib/three/examples/js/shaders/CopyShader');
require('../lib/three/examples/js/postprocessing/EffectComposer');
require('../lib/three/examples/js/postprocessing/RenderPass');
require('../lib/three/examples/js/postprocessing/ShaderPass');
require('../lib/three/examples/js/postprocessing/OutlinePass');
require('../lib/three/examples/js/shaders/FXAAShader');

const CANNON = require('cannon');

const TWEEN = require('tween.js');

const Element = require('./Element');
const Parent = require('./Parent');
const ElementTypes = require('./ElementTypes');

class Visualization {
    constructor(window, sceneContainer, gameKey, gameCommunicationCallback) {
        this.window = window;
        this.sceneContainer = sceneContainer;
        this.gameKey = gameKey;
        this.gameCommunicationCallback = gameCommunicationCallback;

        this.elements = [];
        this.currentSelectedElement = null;

        this.createScene();
        this.createWorld();
        this.createCamera();
        this.createRenderer();
        this.createLighting();
        this.createTable();

        this.createResizeListener();
        this.createAnimationFrameListener();
    }

    destroy() {
        this.removeAnimationFrameListener();
        this.removeResizeListener();
        this.removeCamera();
        this.removeRenderer();
        this.removeAnimations();
    }

    createScene() {
        this.scene = new THREE.Scene();
        this.scene.name = 'scene';
    }

    createWorld() {
        this.world = new CANNON.World();

        this.world.gravity.y = -9.82 * 20;
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 16;

        this.elementBodyMaterial = new CANNON.Material('elementBodyMaterial');
        this.environmentBodyMaterial = new CANNON.Material('environmentBodyMaterial');

        this.world.addContactMaterial(
            new CANNON.ContactMaterial(this.environmentBodyMaterial,   this.elementBodyMaterial, {friction: 0.01, restitution: 0.5})
        );
        this.world.addContactMaterial(
            new CANNON.ContactMaterial(this.elementBodyMaterial,    this.elementBodyMaterial, {friction: 0, restitution: 0.5})
        );
    }

    createCamera() {
        this.camera = new THREE.PerspectiveCamera(75, this.sceneContainer.offsetWidth / this.sceneContainer.offsetHeight, 0.1, 10000);
        this.camera.name = 'camera';
        this.camera.position.z = 30;

        this.cameraRotationContainer = new THREE.Group();
        this.cameraRotationContainer.name = 'cameraRotationContainer';
        this.cameraRotationContainer.rotation.x = -45 * Math.PI / 180;

        this.cameraPositionContainer = new THREE.Group();
        this.cameraPositionContainer.name = 'cameraPositionContainer';
        this.cameraPositionContainer.position.x = 0;
        this.cameraPositionContainer.position.z = 0;
        this.cameraPositionContainer.position.y = 130;

        this.cameraRotationContainer.add(this.camera);
        this.cameraPositionContainer.add(this.cameraRotationContainer);
        this.scene.add(this.cameraPositionContainer);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.currentSelectedElement = null;

        this.cameraMousedownListener = (event) => {
            //Check if a clickable element was clicked. Send the MouseDown event and lock pointer
            if (event.button === 0) {
                this.mouse.x = (event.offsetX / this.sceneContainer.offsetWidth) * 2 - 1;
                this.mouse.y = - (event.offsetY / this.sceneContainer.offsetHeight) * 2 + 1;

                this.raycaster.setFromCamera(this.mouse, this.camera);

                let objects = [];
                for (let element of this.elements) {
                    objects.push(element.element.getObject());
                }

                let intersects = this.raycaster.intersectObjects(objects, true);

                if (intersects.length) {
                    let element = this.getElementByObject(intersects[0].object);
                    if (element) {
                        let elementVector = this.sumParentPositions(element.element.getObject());
                        let diff = elementVector.sub(intersects[0].point);

                        let result = element.element.onMouseDown(diff);
                        if (result === false) {
                            this.currentSelectedElement = element;
                            this.sceneContainer.requestPointerLock();
                            return;
                        }
                    }
                }
            }

            //No clickable element was clicked. Lock the pointer for moving/tilting camera
            if (event.button === 0 || event.button === 2) {
                this.sceneContainer.requestPointerLock();
            }
        };

        this.cameraMouseupListener = (event) => {
            if (event.button === 0 || event.button === 2) {
                this.sceneContainer.ownerDocument.exitPointerLock();
            }
        };

        this.cameraMousemoveListener = (event) => {
            if (this.cameraButtonLocked) {
                //A clickable element is currently clicked. Send MouseMove event.
                if (event.button === 0 && this.currentSelectedElement) {
                    this.currentSelectedElement.element.onMouseMove(event.movementX, event.movementY);

                    return;
                }

                //Left mouse button = move camera
                if (event.button === 0) {
                    this.cameraPositionContainer.position.x = Math.max(Math.min(this.cameraPositionContainer.position.x + event.movementX * -0.1, 100), -100);
                    this.cameraPositionContainer.position.z = Math.max(Math.min(this.cameraPositionContainer.position.z + event.movementY * -0.1, 100), -100);
                }

                //Right mouse button = tilt camera
                if (event.button === 2) {
                    this.cameraRotationContainer.rotation.x = Math.max(Math.min((this.cameraRotationContainer.rotation.x / Math.PI * 180) + event.movementY * -0.3, -5), -90) * Math.PI / 180
                }
            }
        };

        this.cameraPointerlockchangeListener = (event) => {
            this.cameraButtonLocked = document.pointerLockElement === this.sceneContainer;

            if (!this.cameraButtonLocked && this.currentSelectedElement) {
                this.currentSelectedElement.element.onMouseUp();
                this.currentSelectedElement = null;
            }
        };

        this.cameraMousewheelListener = (event) => {
	        let delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));

	        this.camera.position.z = Math.max(Math.min(this.camera.position.z + delta * -1, 100), 5);
        };

        this.sceneContainer.addEventListener('mousewheel', this.cameraMousewheelListener, false);
        this.sceneContainer.addEventListener('DOMMouseScroll', this.cameraMousewheelListener, false);
        this.sceneContainer.addEventListener('mousedown', this.cameraMousedownListener, false);
        this.sceneContainer.addEventListener('mouseup', this.cameraMouseupListener, false);
        this.sceneContainer.addEventListener('mousemove', this.cameraMousemoveListener, false);
        this.sceneContainer.ownerDocument.addEventListener('pointerlockchange', this.cameraPointerlockchangeListener, false);
    }

    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setPixelRatio(this.window.devicePixelRatio);
        this.renderer.setSize(this.sceneContainer.offsetWidth, this.sceneContainer.offsetHeight);
        this.renderer.setClearColor('#cef3e8', 1);

        this.sceneContainer.appendChild(this.renderer.domElement);

        this.composer = new THREE.EffectComposer(this.renderer);

        this.renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        this.outlinePass = new THREE.OutlinePass(new THREE.Vector2(this.sceneContainer.offsetWidth, this.sceneContainer.offsetHeight), this.scene, this.camera);
        this.composer.addPass(this.outlinePass);
        this.outlinePass.edgeStrength = 5;
        this.outlinePass.edgeThickness = 1;
        this.outlinePass.edgeGlow = 0;
        this.outlinePass.pulsePeriod = 2;
        this.outlinePass.visibleEdgeColor.r = 255;
        this.outlinePass.visibleEdgeColor.g = 255;
        this.outlinePass.visibleEdgeColor.b = 255;
        this.outlinePass.hiddenEdgeColor.r = 1;
        this.outlinePass.hiddenEdgeColor.g = 1;
        this.outlinePass.hiddenEdgeColor.b = 1;

        this.effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
        this.effectFXAA.uniforms['resolution'].value.set(1 / this.sceneContainer.offsetWidth, 1 / this.sceneContainer.offsetHeight);
        this.effectFXAA.renderToScreen = true;
        this.composer.addPass(this.effectFXAA);
    }

    createLighting() {
        let ambientLight = new THREE.AmbientLight('#ffffff', 0.1);
        ambientLight.name = 'ambientLight';
        this.scene.add(ambientLight);

        let directionalLight = new THREE.DirectionalLight('#ffffff', 0.5);
        directionalLight.name = 'directionalLight';
        directionalLight.position.x = -1000;
        directionalLight.position.y = 1000;
        directionalLight.position.z = 1000;
        this.scene.add(directionalLight);

        let pointLight = new THREE.PointLight('#ffffff', 0.8);
        pointLight.name = 'pointLight';
        pointLight.position.y = 280;
        this.scene.add(pointLight);
    }

    createTable() {
        let tableGroup = new THREE.Group();
        tableGroup.name = 'tableGroup';
        tableGroup.position.y = 130;

        let planeGeometry = new THREE.PlaneGeometry(2000, 2000, 1);
        let planeMaterial = new THREE.MeshPhongMaterial({color: '#CCB586', shininess: 0});
        let plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.name = 'plane';
        plane.rotation.x = -90 * Math.PI / 180;
        plane.receiveShadow = true;
        tableGroup.add(plane);

        let planeBody = new CANNON.Body({mass: 0});
        planeBody.addShape(new CANNON.Plane());
        planeBody.material = this.environmentBodyMaterial;
        planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(planeBody);

        this.packageContainer = new THREE.Group();
        this.packageContainer.name = 'packageContainer';
        this.packageContainer.position.y = 200;
        tableGroup.add(this.packageContainer);

        this.centerContainer = new THREE.Group();
        this.centerContainer.name = 'centerContainer';
        tableGroup.add(this.centerContainer);

        this.scene.add(tableGroup);
    }

    createResizeListener() {
        this.resizeListener = () => {
            this.camera.aspect = this.sceneContainer.offsetWidth / this.sceneContainer.offsetHeight;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(this.sceneContainer.offsetWidth, this.sceneContainer.offsetHeight);

            this.composer.setSize(this.sceneContainer.offsetWidth, this.sceneContainer.offsetHeight);
            this.effectFXAA.uniforms['resolution'].value.set(1 / this.sceneContainer.offsetWidth, 1 / this.sceneContainer.offsetHeight);
        };

        setTimeout(() => {
            this.window.dispatchEvent(new Event('resize'));
        }, 50);

        this.window.addEventListener('resize', this.resizeListener, false);
    }

    createAnimationFrameListener() {
        let render = (time) => {
            //this.renderer.render(this.scene, this.camera); //TODO: Noch benötigt?
            this.composer.render();
            TWEEN.update(time);

            this.world.step(1.0 / 60.0);

            for (let element of this.elements) {
                element.element.onRendered();
            }

            requestAnimationFrame(render);
        };

        this.animationFrameId = requestAnimationFrame(render);
    }

    removeAnimationFrameListener() {
        cancelAnimationFrame(this.animationFrameId);
    }

    removeResizeListener() {
        this.window.removeEventListener('resize', this.resizeListener, false);
    }

    removeCamera() {
        this.sceneContainer.ownerDocument.exitPointerLock();

        this.sceneContainer.removeEventListener('mousewheel', this.cameraMousewheelListener, false);
        this.sceneContainer.removeEventListener('DOMMouseScroll', this.cameraMousewheelListener, false);
        this.sceneContainer.removeEventListener('mousedown', this.cameraMousedownListener, false);
        this.sceneContainer.removeEventListener('mouseup', this.cameraMouseupListener, false);
        this.sceneContainer.removeEventListener('mousemove', this.cameraMousemoveListener, false);
        this.sceneContainer.ownerDocument.removeEventListener('pointerlockchange', this.cameraPointerlockchangeListener, false);
    }

    removeRenderer() {
        while (this.sceneContainer.hasChildNodes()) {
            this.sceneContainer.removeChild(this.sceneContainer.lastChild);
        }
    }

    removeAnimations() {
        TWEEN.removeAll();
    }

    getElementByObject(object) {
        for (let element of this.elements) {
            if (element.element.getObject() === object) {
                return element;
            }
        }

        if (object.parent) {
            let parent = this.getElementByObject(object.parent);
            if (parent !== null) return parent;
        }

        return null;
    }

    getElementById(id) {
        for (let element of this.elements) {
            if (element.getId() === id) {
                return element;
            }
        }

        return null;
    }

    sumParentPositions(elementObject) {
        let vector = new THREE.Vector3();

        while (elementObject) {
            vector.add(elementObject.position);
            elementObject = elementObject.parent;
        }

        return vector;
    }

    moveElementToParent(elementObject, newParentObject) {
        if (elementObject.userData.tween) elementObject.userData.tween.stop();

        let oldVector = this.sumParentPositions(elementObject);
        let newVector = this.sumParentPositions(newParentObject);

        let diff = oldVector.sub(newVector);

        elementObject.userData.tween = new TWEEN.Tween(diff)
            .to({x: 0, y: 0, z: 0}, 1000)
            .onUpdate(() => {
                elementObject.position.x = diff.x;
                elementObject.position.y = diff.y;
                elementObject.position.z = diff.z;
            }).easing(TWEEN.Easing.Quintic.Out);

        newParentObject.add(elementObject);
        elementObject.position.x = diff.x;
        elementObject.position.y = diff.y;
        elementObject.position.z = diff.z;
        elementObject.userData.tween.start();
    }

    findParentObject(parent) {
        let parentElement = this.elements.find(element => parent.id === element.id);
        let parentObject = null;

        if (parent.id === 'centerContainer') {
            parentObject = this.centerContainer;
        } else if (parentElement) {
             parentObject = parentElement.element.getTargetObject(parent.data);
        }

        if (!parentObject) {
            parentObject = this.packageContainer;
        }

        return parentObject;
    }

    createParentFromData(parentData) {
        let parent = new Parent();

        if (parentData) {
            parent.id = parentData.id;
            parent.data = parentData.data;
        }

        return parent;
    }

    addElement(elementId, type, parentData, elementData) {
        let element = new Element();
        element.id = elementId;
        element.type = type;

        element.parent = this.createParentFromData(parentData);

        element.element = new ElementTypes[element.type](elementData, this, element);
        element.element.getObject().userData.element = element;

        this.elements.push(element);

        this.packageContainer.add(element.element.getObject());

        if (element.parent.id) this.moveElementToParent(element.element.getObject(), this.findParentObject(element.parent));
    }

    moveElement(elementId, parentData) {
        let element = this.elements.find(element => element.id === elementId);

        let parentElement = this.elements.find(parentElement => parentElement.id === element.parent.id);
        let directParentObject = element.element.getObject().parent;

        element.parent = this.createParentFromData(parentData);
        this.moveElementToParent(element.element.getObject(), this.findParentObject(element.parent));

        if (parentElement) {
            parentElement.element.onChildRemoved(directParentObject);
        }
    }

    removeElement(elementId) {
        let index = this.elements.findIndex(element => element.id === elementId);
        if (index > -1) {
            let parentElement = this.elements.find(parentElement => parentElement.id === this.elements[index].parent.id);
            let directParentObject = this.elements[index].element.getObject().parent;

            this.scene.remove(this.elements[index].element.getObject());
            this.elements.splice(index, 1);

            if (parentElement) {
                parentElement.element.onChildRemoved(directParentObject);
            }
        }
    }

    handleGameEvent(event, data) {
        if (event === 'element.added') {
            this.addElement(data.id, data.type, data.parent, data.element);
        }

        if (event === 'element.moved') {
            this.moveElement(data.id, data.parent);
        }

        if (event === 'element.removed') {
            this.removeElement(data.id);
        }

        let element = this.elements.find(element => element.id === data.id);
        if (element) {
            element.element.onEvent(event, data);
        }
    }
}

module.exports = Visualization;