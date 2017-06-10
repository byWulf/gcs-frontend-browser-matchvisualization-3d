const ElementTypeInterface = require('./ElementTypeInterface');
const THREE = require('three');
const cardHelper = require('../helper/CardHelper');

class cardContainer_v1 extends ElementTypeInterface {
    constructor(data, visualization, element) {
        super(data, visualization, element);
        
        this.cardWidth = data.cardWidth;
        this.cardHeight = data.cardHeight;
        this.cardDepth = data.cardDepth;
        this.cardCornerRadius = data.cardCornerRadius;
        this.spacing = data.spacing;
        this.stackShattering = data.stackShattering;

        this.positions = {};
        this.positionHighlights = {};

        this.object = new THREE.Group();
        this.object.name = 'cardContainer_v1';
    }

    getTargetObject(data) {
        if (typeof this.positions[data.position] === 'undefined') {
            this.positions[data.position] = {};
        }

        if (typeof this.positions[data.position][data.index] === 'undefined') {
            this.positions[data.position][data.index] = new THREE.Group();
            this.positions[data.position][data.index].position.y = data.index * this.stackElementHeight;
            this.positions[data.position][data.index].position.x = data.position * (this.cardWidth + this.spacing);

            let shape = cardHelper.getShape(this.cardWidth, this.cardHeight, this.cardCornerRadius);

            let highlightGeometry = new THREE.ShapeGeometry(shape);
            let highlightMaterial = new THREE.MeshBasicMaterial({transparent: true, opacity: 0});
            this.positions[data.position][data.index].userData.highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
            this.positions[data.position][data.index].userData.highlight.rotation.x = -90 * Math.PI / 180;
            this.positions[data.position][data.index].userData.highlight.position.y = 0.01;
            this.positions[data.position][data.index].add(this.positions[data.position][data.index].userData.highlight);

            this.object.add(this.positions[data.position][data.index]);
        }

        return this.positions[data.position][data.index];
    }

    getHighlightObject(data) {
        let targetObject = this.getTargetObject(data);

        if (targetObject) return targetObject.userData.highlight;
        return null;
    }

    getDimensions() {
        let minX = 0;
        let maxX = 0;
        let minZ = 0;
        let maxZ = 0;

        for (let position in this.positions) {
            if (!this.positions.hasOwnProperty(position)) continue;
            for (let index in this.positions[position]) {
                if (!this.positions[position].hasOwnProperty(index)) continue;
                if (this.positions[position][index].children.length > 1) { //highlight will always be a child, we want to check, if there is a card in this cardContainer position
                    minX = Math.min(minX, this.positions[position][index].position.x - this.cardWidth / 2);
                    maxX = Math.max(maxX, this.positions[position][index].position.x + this.cardWidth / 2);
                    minZ = Math.min(minZ, this.positions[position][index].position.z - this.cardHeight / 2);
                    maxZ = Math.max(maxZ, this.positions[position][index].position.z + this.cardHeight / 2);
                }
            }
        }

        return new THREE.Box3(
            new THREE.Vector3(minX, 0, minZ),
            new THREE.Vector3(maxX, this.cardDepth, maxZ)
        );
    }
}

module.exports = cardContainer_v1;