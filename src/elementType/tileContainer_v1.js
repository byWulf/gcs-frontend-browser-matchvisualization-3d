const ElementTypeInterface = require('./ElementTypeInterface');
const THREE = require('three');
const tileHelper = require('../helper/TileHelper');

class tileContainer_v1 extends ElementTypeInterface {
    constructor(data, visualization, element) {
        super(data, visualization, element);

        this.stackElementRadius = data.stackElementRadius;
        this.stackElementHeight = data.stackElementHeight;
        this.stackElementSpacing = data.stackElementSpacing;
        this.tileForm = data.tileForm;

        this.positions = {};
        this.positionHighlights = {};

        this.object = new THREE.Group();
        this.object.name = 'tileContainer_v1';
    }

    getTargetObject(data) {
        if (typeof this.positions[data.y] === 'undefined') {
            this.positions[data.y] = {};
        }

        if (typeof this.positions[data.y][data.x] === 'undefined') {
            this.positions[data.y][data.x] = {};
        }

        if (typeof this.positions[data.y][data.x][data.index] === 'undefined') {
            this.positions[data.y][data.x][data.index] = new THREE.Group();
            this.positions[data.y][data.x][data.index].position.y = data.index * this.stackElementHeight;

            let shape = null;
            if (this.tileForm === 'square') {
                this.positions[data.y][data.x][data.index].position.x = data.x * (this.stackElementRadius + this.stackElementSpacing);
                this.positions[data.y][data.x][data.index].position.z = data.y * (this.stackElementRadius + this.stackElementSpacing);

                shape = tileHelper.getSquareShape(this.stackElementRadius);
            }
            if (this.tileForm === 'hexagonal') {
                this.positions[data.y][data.x][data.index].position.x = (data.x + (data.y % 2 ? 0.5 : 0)) * (this.stackElementRadius + this.stackElementSpacing);
                this.positions[data.y][data.x][data.index].position.z = data.y * 0.8662 * (this.stackElementRadius + this.stackElementSpacing);

                shape = tileHelper.getHexagonalShape(this.stackElementRadius);
            }

            let highlightGeometry = new THREE.ShapeGeometry(shape);
            let highlightMaterial = new THREE.MeshBasicMaterial({transparent: true, opacity: 0});
            this.positions[data.y][data.x][data.index].userData.highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
            this.positions[data.y][data.x][data.index].userData.highlight.rotation.x = -90 * Math.PI / 180;
            this.positions[data.y][data.x][data.index].userData.highlight.position.y = 0.01;
            this.positions[data.y][data.x][data.index].add(this.positions[data.y][data.x][data.index].userData.highlight);

            this.object.add(this.positions[data.y][data.x][data.index]);
        }

        return this.positions[data.y][data.x][data.index];
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

        for (let y in this.positions) {
            for (let x in this.positions[y]) {
                for (let index in this.positions[y][x]) {
                    if (this.positions[y][x][index].children.length > 1) { //highlight will always be a child, we want to check, if there is a tile in this tileContainer position
                        minX = Math.min(minX, this.positions[y][x][index].position.x - this.stackElementRadius / 2);
                        maxX = Math.max(maxX, this.positions[y][x][index].position.x + this.stackElementRadius / 2);
                        minZ = Math.min(minZ, this.positions[y][x][index].position.z - this.stackElementRadius / 2);
                        maxZ = Math.max(maxZ, this.positions[y][x][index].position.z + this.stackElementRadius / 2);
                    }
                }
            }
        }

        return new THREE.Box3(
            new THREE.Vector3(minX, 0, minZ),
            new THREE.Vector3(maxX, this.stackElementHeight, maxZ)
        );
    }
}

module.exports = tileContainer_v1;