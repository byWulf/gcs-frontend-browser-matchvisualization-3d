class ElementTypeInterface {
    constructor(data, visualization, element) { }

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

    onMouseMove(movementX, movementY) {}

    onMouseDown() {}

    onMouseUp() {}
}

module.exports = ElementTypeInterface;