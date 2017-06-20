const THREE = require('three');

class FileHelper {
    getTexture(filenameOrHtmlelement, gameKey) {
        if (filenameOrHtmlelement instanceof HTMLElement) {
            let texture = new THREE.Texture(filenameOrHtmlelement);
            filenameOrHtmlelement.onload = function() {
                texture.needsUpdate = true;
            };

            texture.needsUpdate = true;
            return texture;
        }

        if (filenameOrHtmlelement instanceof String) {
            THREE.ImageUtils.crossOrigin = 'anonymous';
            return THREE.ImageUtils.loadTexture(document.location.protocol + '//' + document.location.hostname + ':3699/' + gameKey + '/' + filenameOrHtmlelement);
        }

        return new THREE.Texture();
    }

    getModel(filenameOrContent, gameKey, callback) {
        let loader = new THREE.OBJLoader();

        if (filenameOrContent instanceof Object && filenameOrContent.type === 'model') {

            if (filenameOrContent.content !== null) {
                callback(loader.parse(filenameOrContent.content));
            } else {
                filenameOrContent.onload = function() {
                    callback(loader.parse(filenameOrContent.content));
                }
            }

            return;
        }

        if (filenameOrContent instanceof String) {
            let path = document.location.protocol + '//' + document.location.hostname + ':3699/' + gameKey + '/' + filenameOrContent;
            loader.load(path, callback);

            return;
        }
    }
}

let fileHelper = new FileHelper();

module.exports = fileHelper;