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

    onChildRemoved(fromParent) {}

    onRendered() {}

    onEvent(event, data) {}

    onMouseEnter(point) {}

    onMouseMove(point) {}

    onMouseLeave() {}

    onMouseDown() {}

    onMouseUp() {}
}

module.exports = ElementTypeInterface;