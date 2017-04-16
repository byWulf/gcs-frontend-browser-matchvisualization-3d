const ElementTypeInterface = require('./ElementTypeInterface');
const THREE = require('three');
const DICE = require('threejs-dice');

class dice_v1 extends ElementTypeInterface {
    constructor(data, visualization, element) {
        super(data, visualization, element);

        this.object = new THREE.Group();
        this.object.name = 'dice_v1';

        if (!DICE.DiceManager.world) {
            DICE.DiceManager.setWorld(visualization.world);
        }

        this.dice = new DICE.DiceD6({size: 1.5});
        this.dice.getObject().body.material = visualization.elementBodyMaterial;
        this.dice.getObject().position.y = 0.75;
        this.dice.updateBodyFromMesh();

        this.object.add(this.dice.getObject());

        DICE.DiceManager.prepareValues([{
            dice: this.dice,
            value: data.value
        }]);

        this.setCanBeRolled(data.canBeRolled);
    }

    setCanBeRolled(canBeRolled) {
        this.canBeRolled = canBeRolled;

        let selectedObjectsIndex = this.visualization.outlinePass.selectedObjects.findIndex(object => object === this.object);
        if (canBeRolled && selectedObjectsIndex === -1) {
            this.visualization.outlinePass.selectedObjects.push(this.object);
        } else if (!canBeRolled && selectedObjectsIndex > -1) {
            this.visualization.outlinePass.selectedObjects.splice(selectedObjectsIndex, 1);
        }
    }

    onRendered() {
        this.dice.updateMeshFromBody();
    }

    onEvent(event, data) {
        if (event === 'dice.rolled') {
            this.dice.getObject().body.position.x = 0;
            this.dice.getObject().body.position.z = 0;
            this.dice.getObject().body.velocity.y = 70;
            let factor = 100;
            this.dice.getObject().body.angularVelocity.set(factor * Math.random() - factor/2, factor * Math.random() - factor / 2, factor * Math.random() - factor/2);

            DICE.DiceManager.prepareValues([{
                dice: this.dice,
                value: data.value
            }]);
        }
        if (event === 'dice.permissionChanged') {
            this.setCanBeRolled(data.canBeRolled);
        }
    }

    onMouseDown() {
        if (this.canBeRolled) {
            return false;
        }
    }

    onMouseUp() {
        this.visualization.gameCommunicationCallback('dice.roll', this.element.getId(), {intensity: 1});
    }
}

module.exports = dice_v1;