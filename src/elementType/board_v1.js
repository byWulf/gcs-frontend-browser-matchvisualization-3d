const ElementTypeInterface = require('./ElementTypeInterface');
const THREE = require('three');

class board_v1 extends ElementTypeInterface {
    constructor(data, visualization, element) {
        super(data, visualization, element);

        this.width = data.width;
        this.height = data.height;
        this.image = data.image;

        this.object = new THREE.Group();
        this.object.name = 'board_v1';

        let geometry = new THREE.BoxGeometry(this.width, 0.2, this.height);
        THREE.ImageUtils.crossOrigin = 'anonymous';
        let material = new THREE.MeshPhongMaterial({shininess: 0, map: THREE.ImageUtils.loadTexture(document.location.protocol + '//' + document.location.hostname + ':3699/' + visualization.gameKey + '/' + this.image)});
        let mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 0.1;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.object.add(mesh);

        this.targetElement = new THREE.Group();
        this.targetElement.name = 'board_v1_target';
        this.targetElement.position.y = 0.2;
        this.object.add(this.targetElement);
    }

    getTargetObject() {
        return this.targetElement;
    }

    getDimensions() {
        return new THREE.Box3(
            new THREE.Vector3(-this.width/2, 0, -this.height/2),
            new THREE.Vector3(this.width/2, 0.2, this.height/2)
        );
    }
}

module.exports = board_v1;