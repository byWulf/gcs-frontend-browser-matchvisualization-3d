const ElementTypeInterface = require('./ElementTypeInterface');
const THREE = require('three');

class button_v1 extends ElementTypeInterface {
    constructor(data, visualization, element) {
        super(data, visualization, element);

        this.object = new THREE.Group();
        this.object.name = 'button_v1';

        this.button = document.createElement('button');
        this.button.textContent = data.label;
        this.button.setAttribute('class', 'btn btn-default btn-sm pointer-auto');
        this.button.setAttribute('style', 'display: none;');
        this.button.addEventListener('click', () => {
            this.visualization.gameCommunicationCallback('button.click', this.element.getId(), {});
        });
        this.button.addEventListener('mousedown mousemove mouseup', (event) => {
            event.stopPropagation();
        });

        this.visualization.buttonContainer.appendChild(this.button);
    }

    applyInitialData(data) {
        this.setCanBeClicked(data.canBeClicked);
    }

    setCanBeClicked(canBeClicked) {
        this.canBeClicked = canBeClicked;

        this.button.setAttribute('style', canBeClicked ? 'display: inline-block;' : 'display: none;');
    }

    onEvent(event, data) {
        if (event === 'button.permissionChanged') {
            this.setCanBeClicked(data.canBeClicked);
        }
    }
}

module.exports = button_v1;