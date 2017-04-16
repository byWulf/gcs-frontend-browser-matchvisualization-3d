const ElementTypeInterface = require('./ElementTypeInterface');
const THREE = require('three');
const TWEEN = require('tween.js');

class autoResizeContainer_v1 extends ElementTypeInterface {
    constructor(data, visualization, element) {
        super(data, visualization, element);

        this.spacing = data.spacing;

        this.object = new THREE.Group();
        this.object.name = 'autoResizeContainer_v1';

        this.positions = {};

        this.width = 0;
        this.height = 0;
    }

    getTargetObject(data) {
        if (typeof this.positions[data.y] === 'undefined') this.positions[data.y] = {};

        if (typeof this.positions[data.y][data.x] === 'undefined') {
            this.positions[data.y][data.x] = new THREE.Group();
            this.object.add(this.positions[data.y][data.x]);

            this.onDimensionsChanged();
        }

        return this.positions[data.y][data.x];
    }

    onDimensionsChanged() {
        let boundingBoxes = {};
        let columns = {};
        let rows = {};

        for (let y in this.positions) {
            boundingBoxes[y] = {};
            for (let x in this.positions[y]) {
                boundingBoxes[y][x] = new THREE.Box3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0));

                for (let element of this.visualization.elements) {
                    if (element.parent.id != this.element.getId() || element.parent.data.x != x || element.parent.data.y != y) continue;

                    let dimensions = element.element.getDimensions();
                    boundingBoxes[y][x].expandByPoint(dimensions.min);
                    boundingBoxes[y][x].expandByPoint(dimensions.max);
                }

                if (typeof columns[x] === 'undefined') columns[x] = 0;
                columns[x] = Math.max(columns[x], boundingBoxes[y][x].max.x - boundingBoxes[y][x].min.x);

                if (typeof rows[y] === 'undefined') rows[y] = 0;
                rows[y] = Math.max(rows[y], boundingBoxes[y][x].max.z - boundingBoxes[y][x].min.z);
            }
        }

        let columnSum = -this.spacing;
        for (let x in columns) {
            columnSum += columns[x] + this.spacing;
        }

        let rowSum = -this.spacing;
        for (let y in rows) {
            rowSum += rows[y] + this.spacing;
        }

        this.width = columnSum;
        this.height = rowSum;

        let top = -rowSum / 2;
        for (let y in this.positions) {
            let left = -columnSum / 2;
            for (let x in this.positions[y]) {
                let offsetX = 0;
                offsetX += (columns[x] - (boundingBoxes[y][x].max.x - boundingBoxes[y][x].min.x)) / 2;
                offsetX += -boundingBoxes[y][x].min.x;

                let offsetZ = 0;
                offsetZ += (rows[y] - (boundingBoxes[y][x].max.z - boundingBoxes[y][x].min.z)) / 2;
                offsetZ += -boundingBoxes[y][x].min.z;

                if (
                    this.positions[y][x].userData.posX != left + offsetX ||
                    this.positions[y][x].userData.posZ != top + offsetZ
                ) {
                    if (this.positions[y][x].userData.adjustTween) this.positions[y][x].userData.adjustTween.stop();

                    this.positions[y][x].userData.posX = left + offsetX;
                    this.positions[y][x].userData.posZ = top + offsetZ;

                    let currentPosition = this.positions[y][x].position.clone();

                    this.positions[y][x].userData.adjustTween = new TWEEN.Tween(currentPosition)
                        .to({x: this.positions[y][x].userData.posX, y: 0, z: this.positions[y][x].userData.posZ}, 500)
                        .onUpdate(() => {
                            this.positions[y][x].position.x = currentPosition.x;
                            this.positions[y][x].position.z = currentPosition.z;
                        }).easing(TWEEN.Easing.Quintic.Out);

                    this.positions[y][x].userData.adjustTween.start();
                }

                left += columns[x] + this.spacing;
            }
            top += rows[y] + this.spacing;
        }
    }

    getDimensions() {
        return new THREE.Box3(
            new THREE.Vector3(-this.width / 2, 0, -this.height / 2),
            new THREE.Vector3(this.width / 2, 0, this.height / 2)
        );
    }
}

module.exports = autoResizeContainer_v1;