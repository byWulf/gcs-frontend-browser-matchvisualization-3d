class Element {
    constructor(id, type, parent, element) {
        this.id = id || null;
        this.type = type || null;
        this.parent = parent || null;
        this.element = element || null;
    }
    getId() {
        return this.id;
    }
    setId(id) {
        this.id = id;
    }
    
    getType() {
        return this.type;
    }
    setType(type) {
        this.type = type;
    }
    
    getParent() {
        return this.parent;
    }
    setParent(parent) {
        this.parent = parent;
    }
    
    getElement() {
        return this.element;
    }
    setElement(element) {
        this.element = element;
    }
}

module.exports = Element;