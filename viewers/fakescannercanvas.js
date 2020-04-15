/**
 * 
 * @param {DOM Element} glcanvas Handle to HTML where the glcanvas resides
 * @param {string} shadersrelpath Path to the folder that contains the shaders,
 *                                relative to where the constructor is being called
 */
function FakeScannerCanvas(glcanvas, shadersrelpath, meshesrelpath) {
    SceneCanvas(glcanvas, shadersrelpath, meshesrelpath);
    glcanvas.mesh = new BasicMesh();
    glcanvas.camera = new MousePolarCamera(glcanvas.width, glcanvas.height);
    
    let offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = glcanvas.width;
    offscreenCanvas.height = glcanvas.height;
    offscreenCanvas.ctx = offscreenCanvas.getContext("2d");
    glcanvas.offscreenCanvas = offscreenCanvas;

    glcanvas.centerCamera = function() {
        this.camera.centerOnMesh(this.mesh);
    }

    glcanvas.makeScan = function() {
        glcanvas.repaint();
        let ctx = glcanvas.offscreenCanvas.ctx;
        ctx.drawImage(glcanvas, 0, 0);
        let imageData = ctx.getImageData(0, 0, glcanvas.width, glcanvas.height);
        function download(content, fileName, contentType) {
            var a = document.createElement("a");
            var file = new Blob([content], {type: contentType});
            a.href = URL.createObjectURL(file);
            a.download = fileName;
            a.click();
        }
        let data = imageData.data;
        data = Array.from(data);
        download(JSON.stringify({'width':glcanvas.width, 'height':glcanvas.height, 'data':data}), 'scan.json', 'text/plain');
    }

    const gui = glcanvas.gui;
    gui.add(glcanvas, 'makeScan');
}
