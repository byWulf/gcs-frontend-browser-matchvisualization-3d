class ElementTypeInterface {
    constructor(data, visualization, element) {
        this.visualization = visualization;
        this.element = element;
    }

    getObject() {
        return this.object;
    }
    setObject(object) {
        this.object = object;
    }

    getTargetObject(data) {
        return null;
    }

    getHighlightObject(data) {
        return null;
    }

    onChildRemoved(fromParent) {}

    onRendered() {}

    onEvent(event, data) {}

    onSlotChange(slots, ownUser) {}

    onMouseMove(movementX, movementY) {}

    onMouseDown() {}

    onMouseUp() {}

    getDimensions() {
        return new THREE.Box3();
    }

    onDimensionsChanged() {}
}

module.exports = ElementTypeInterface;