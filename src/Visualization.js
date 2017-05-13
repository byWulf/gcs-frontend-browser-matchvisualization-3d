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
const Interaction = require('./Interaction');

class Visualization {
    constructor(window, sceneContainer, gameKey, gameCommunicationCallback, slots, ownUser) {
        this.window = window;
        this.sceneContainer = sceneContainer;
        this.gameKey = gameKey;
        this.gameCommunicationCallback = gameCommunicationCallback;
        this.interaction = new Interaction(this);

        this.user = null;
        this.slots = [];
        this.elements = [];
        this.currentSelectedElement = null;

        this.handleSlotEvent(slots, ownUser);

        this.createScene();
        this.createWorld();
        this.createCamera();
        this.createRenderer();
        this.createInteraction();
        this.createLighting();
        this.createTable();
        this.createButtonContainer();

        this.createResizeListener();
        this.createAnimationFrameListener();
    }

    destroy() {
        this.removeAnimationFrameListener();
        this.removeResizeListener();
        this.removeInteraction();
        this.removeRenderer();
        this.removeAnimations();
    }

    createScene() {
        this.scene = new THREE.Scene();
        this.scene.name = 'scene';

        let textureLoader = new THREE.TextureLoader();
        textureLoader.crossOrigin = '';

        //Floor
        let floorGeometry = new THREE.PlaneGeometry(600, 400, 1);
        let floorMaterial = new THREE.MeshPhongMaterial({color: '#b1752d', shininess: 0});
        let floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        floorMesh.position.y = 0;
        floorMesh.rotation.x = -90 * Math.PI / 180;
        floorMesh.receiveShadow = true;
        this.scene.add(floorMesh);

        //Walls
        let wallTexture = textureLoader.load('/node_modules/gcs-frontend-browser-matchvisualization-3d/public/subtlepatterns/concrete_wall_2.png');
        let wallMaterial = new THREE.MeshPhongMaterial({color: '#ffffff', shininess: 0, map: wallTexture});
        let leftRightWallGeometry = new THREE.PlaneGeometry(400, 230, 1);
        let topBottomWallGeometry = new THREE.PlaneGeometry(600, 230, 1);

        let leftWall = new THREE.Mesh(leftRightWallGeometry, wallMaterial);
        let rightWall = new THREE.Mesh(leftRightWallGeometry, wallMaterial);
        let topWall = new THREE.Mesh(topBottomWallGeometry, wallMaterial);
        let bottomWall = new THREE.Mesh(topBottomWallGeometry, wallMaterial);

        leftWall.position.x = -300;
        leftWall.position.y = 115;
        leftWall.rotation.y = 90 * Math.PI / 180;
        leftWall.receiveShadow = true;
        this.scene.add(leftWall);

        rightWall.position.x = 300;
        rightWall.position.y = 115;
        rightWall.rotation.y = -90 * Math.PI / 180;
        rightWall.receiveShadow = true;
        this.scene.add(rightWall);

        topWall.position.z = 200;
        topWall.position.y = 115;
        topWall.rotation.y = 180 * Math.PI / 180;
        topWall.receiveShadow = true;
        this.scene.add(topWall);

        bottomWall.position.z = -200;
        bottomWall.position.y = 115;
        bottomWall.receiveShadow = true;
        this.scene.add(bottomWall);

        let ceiling = new THREE.Mesh(floorGeometry, wallMaterial);
        ceiling.position.y = 230;
        ceiling.rotation.x = 90 * Math.PI / 180;
        this.scene.add(ceiling);
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

        let planeBody = new CANNON.Body({mass: 0});
        planeBody.addShape(new CANNON.Plane());
        planeBody.material = this.environmentBodyMaterial;
        planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(planeBody);
    }

    createCamera() {
        this.camera = new THREE.PerspectiveCamera(75, this.sceneContainer.offsetWidth / this.sceneContainer.offsetHeight, 0.1, 10000);
        this.camera.name = 'camera';
        this.camera.position.z = 30;

        this.cameraRotationContainer = new THREE.Group();
        this.cameraRotationContainer.name = 'cameraRotationContainer';
        this.cameraRotationContainer.rotation.x = -75 * Math.PI / 180;

        this.cameraPositionContainer = new THREE.Group();
        this.cameraPositionContainer.name = 'cameraPositionContainer';
        this.cameraPositionContainer.position.x = 0;
        this.cameraPositionContainer.position.z = -1;
        this.cameraPositionContainer.position.y = 74;

        this.cameraRotationContainer.add(this.camera);
        this.cameraPositionContainer.add(this.cameraRotationContainer);
        this.scene.add(this.cameraPositionContainer);
    }

    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setPixelRatio(this.window.devicePixelRatio);
        this.renderer.setSize(this.sceneContainer.offsetWidth, this.sceneContainer.offsetHeight);
        this.renderer.setClearColor('#cef3e8', 1);
        this.renderer.shadowMapEnabled = true;
        this.renderer.shadowMapType = THREE.PCFSoftShadowMap;

        this.sceneContainer.appendChild(this.renderer.domElement);

        this.composer = new THREE.EffectComposer(this.renderer);

        this.renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        this.outlinePass = new THREE.OutlinePass(new THREE.Vector2(this.sceneContainer.offsetWidth, this.sceneContainer.offsetHeight), this.scene, this.camera);
        this.composer.addPass(this.outlinePass);
        this.outlinePass.edgeStrength = 5;
        this.outlinePass.edgeThickness = 1;
        this.outlinePass.edgeGlow = 0;
        this.outlinePass.pulsePeriod = 0;
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

        let spotLight = new THREE.SpotLight('#ffffff', 0.8, 250, 2, 1, 0);
        spotLight.name = 'spotLight';
        spotLight.position.y = 225;
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 4096;
        spotLight.shadow.mapSize.height = 4096;
        spotLight.shadow.camera.near = 100;
        spotLight.shadow.camera.far = 230;
        this.scene.add(spotLight);
    }

    createTable() {
        this.packageContainer = new THREE.Group();
        this.packageContainer.name = 'packageContainer';
        this.packageContainer.position.y = 400;
        this.scene.add(this.packageContainer);

        let element = this.addElement('tableContainer', 'tableContainer');
        this.scene.add(element.element.object);
    }

    createButtonContainer() {
        this.buttonContainer = document.createElement('div');
        this.buttonContainer.setAttribute('id', 'visualization3dButtonContainer');
        this.buttonContainer.setAttribute('style', 'position: absolute; bottom: 0; width: 100%; text-align: center; padding-bottom: 10px;');
        this.sceneContainer.appendChild(this.buttonContainer);
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

    createInteraction() {
        this.interaction.register();
    }

    removeInteraction() {
        this.interaction.unregister();
    }

    removeRenderer() {
        while (this.sceneContainer.hasChildNodes()) {
            this.sceneContainer.removeChild(this.sceneContainer.lastChild);
        }
    }

    removeAnimations() {
        TWEEN.removeAll();
    }

    isChildOfObject(child, object) {
        if (child == object) return true;

        if (child.object && this.isChildOfObject(child.object, object)) return true;

        if (child.parent && this.isChildOfObject(child.parent, object)) return true;

        return false;
    }

    getElementByObject(object) {
        for (let element of this.elements) {
            if (element.element.getObject() === object) {
                return element;
            }
        }

        if (object.object) {
            let object = this.getElementByObject(object.object);
            if (object !== null) return object;
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
                elementObject.position.y = diff.y + (elementObject.userData.offsetY || 0);
                elementObject.position.z = diff.z;
            }).easing(TWEEN.Easing.Quintic.Out);

        let oldParentElements = this.getAllParentElementsByObject(elementObject);

        newParentObject.add(elementObject);
        elementObject.position.x = diff.x;
        elementObject.position.y = diff.y;
        elementObject.position.z = diff.z;
        elementObject.userData.tween.start();

        let newParentElements = this.getAllParentElementsByObject(elementObject);

        for (let element of oldParentElements) {
            element.element.onDimensionsChanged();
        }
        for (let element of newParentElements) {
            element.element.onDimensionsChanged();
        }
    }

    getAllParentElementsByObject(elementObject) {
        let elements = [];

        while (elementObject.parent) {
            let element = this.getElementByObject(elementObject.parent);
            if (element) {
                elements.push(element);
            }

            elementObject = elementObject.parent;
        }

        return elements;
    }

    findParentObject(parent) {
        let parentElement = this.elements.find(element => parent.id === element.id);
        let parentObject = null;

        if (parentElement) {
             parentObject = parentElement.element.getTargetObject(parent.data);
        } else {
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

        try {
            element.element = new ElementTypes[element.type](elementData, this, element);
        } catch (e) {
            console.error('Failed at creating element of type "' + type + '"');
            throw e;
        }

        this.elements.push(element);

        this.packageContainer.add(element.element.getObject());

        if (element.parent.id) this.moveElementToParent(element.element.getObject(), this.findParentObject(element.parent));

        element.element.applyInitialData(elementData);

        return element;
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

        return element;
    }

    removeElement(elementId) {
        let index = this.elements.findIndex(element => element.id === elementId);
        if (index > -1) {
            let parentElement = this.elements.find(parentElement => parentElement.id === this.elements[index].parent.id);
            let directParentObject = this.elements[index].element.getObject().parent;

            this.scene.remove(this.elements[index].element.getObject());
            this.elements[index].element.onAfterRemove();
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

    handleSlotEvent(slots, ownUser) {
        this.slots = slots;
        this.user = ownUser;

        for (let element of this.elements) {
            element.element.onSlotChange(slots, ownUser);
        }
    }
}

module.exports = Visualization;