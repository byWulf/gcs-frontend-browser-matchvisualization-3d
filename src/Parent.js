class Parent {
    constructor(id, data) {
        this.id = id || null;
        this.data = data || null;
    }
    getId() {
        return this.id;
    }
    setId(id) {
        this.id = id;
    }
    
    getData() {
        return this.data;
    }
    setData(data) {
        this.data = data;
    }
}

module.exports = Parent;