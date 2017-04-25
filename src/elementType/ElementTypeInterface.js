class ElementTypeInterface {
    constructor(data, visualization, element) {
        this.visualization = visualization;
        this.element = element;
    }

    applyInitialData(data) {}

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

    onSelect() {}

    onUnselect() {}

    onClick(clickedObject) {}

    onStartMove(mousePosition) {}

    onMove(movementX, movementY) {}

    onEndMove() {}

    getDimensions() {
        return new THREE.Box3();
    }

    onDimensionsChanged() {}
}

module.exports = ElementTypeInterface;