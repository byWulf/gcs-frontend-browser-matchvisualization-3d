const ElementTypeInterface = require('./ElementTypeInterface');

const THREE = require('three');
require('../../lib/three/examples/js/loaders/OBJLoader');

class piece_v1 extends ElementTypeInterface {
    constructor(data, visualization) {
        super();

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
    }
}

module.exports = piece_v1;