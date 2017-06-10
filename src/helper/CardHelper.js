const THREE = require('three');

class CardHelper {
    getShape(width, height, cornerRadius) {
        let shape = new THREE.Shape();

        shape.moveTo(-width / 2, -height / 2 + cornerRadius);
        shape.arc(-width / 2 + cornerRadius, -height / 2 + cornerRadius, cornerRadius, 180 * Math.PI / 180, 270 * Math.PI / 180);
        shape.lineTo(width / 2 - cornerRadius, -height / 2);
        shape.arc(width / 2 - cornerRadius, -height / 2 + cornerRadius, cornerRadius, 270 * Math.PI / 180, 360 * Math.PI / 180);
        shape.lineTo(width / 2, height / 2 - cornerRadius);
        shape.arc(width / 2 - cornerRadius, height / 2 - cornerRadius, cornerRadius, 0, 90 * Math.PI / 180);
        shape.lineTo(-width / 2 + cornerRadius, height / 2);
        shape.arc(-width / 2 + cornerRadius, height / 2 - cornerRadius, cornerRadius, 90 * Math.PI / 180, 180 * Math.PI / 180);
        shape.lineTo(-width / 2, -height / 2 + cornerRadius);

        return shape;
    }
}

let cardHelper = new CardHelper();

module.exports = cardHelper;