const THREE = require('three');

class TileHelper {
    getSquareShape(size) {
        let shape = new THREE.Shape();

        shape.moveTo(-size / 2, -size / 2);
        shape.lineTo(size / 2, -size / 2);
        shape.lineTo(size / 2, size / 2);
        shape.lineTo(-size / 2, size / 2);
        shape.lineTo(-size / 2, -size / 2);
        
        return shape;
    }
    getHexagonalShape(size) {
        let shape = new THREE.Shape();
        let a = size / Math.sqrt(3);

        shape.moveTo(-size / 2, -a / 2);
        shape.lineTo(0, -a);
        shape.lineTo(size / 2, -a / 2);
        shape.lineTo(size / 2, a / 2);
        shape.lineTo(0, a);
        shape.lineTo(-size / 2, a / 2);
        shape.lineTo(-size / 2, -a / 2);
        
        return shape;
    }
}

let tileHelper = new TileHelper();

module.exports = tileHelper;