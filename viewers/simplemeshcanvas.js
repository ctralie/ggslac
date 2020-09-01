/**
 * 
 * @param {DOM Element} glcanvas Handle to HTML where the glcanvas resides
 * @param {string} shadersrelpath Path to the folder that contains the shaders,
 *                                relative to where the constructor is being called
 */
class SimpleMeshCanvas extends BaseCanvas {

    /**
     * @param {DOM Element} glcanvas Handle to HTML where the glcanvas resides
     * @param {string} shadersrelpath Path to the folder that contains the shaders,
     *                                relative to where the constructor is being called
     * @param {antialias} boolean Whether antialiasing is enabled (true by default)
     */
    constructor(glcanvas, shadersrelpath, antialias) {
        super(glcanvas, shadersrelpath, antialias);
        this.mesh = new BasicMesh();
        this.camera = new MousePolarCamera(glcanvas.width, glcanvas.height);
        
        this.gui = new dat.GUI();
        const gui = this.gui;
        // Mesh display options menu
        this.drawEdges = false;
        this.drawNormals = false;
        this.drawVertices = false;
        let meshOpts = gui.addFolder('Mesh Display Options');
        let canvas = this;
        ['drawEdges', 'drawNormals', 'drawPoints'].forEach(
            function(s) {
                let evt = meshOpts.add(canvas, s);
                function resolveCheckboxes() {
                    // Make sure canvas normalShader and pointShader have been compiled
                    // before drawing edges/normals/points
                    let ready = true;
                    if (!('shaderReady' in canvas.shaders.normalShader)) {
                        ready = false;
                        canvas.shaders.normalShader.then(resolveCheckboxes);
                    }
                    if (!('shaderReady' in canvas.shaders.pointShader)) {
                        ready = false;
                        canvas.shaders.pointShader.then(resolveCheckboxes);
                    }
                    if (ready) {
                        requestAnimFrame(canvas.repaint.bind(canvas));
                    }
                }
                evt.onChange(resolveCheckboxes);
            }
        );
    
        let simpleRepaint = function() {
            requestAnimFrame(canvas.repaint.bind(canvas));
        }
        gui.add(this.mesh, 'consistentlyOrientFaces').onChange(simpleRepaint);
        gui.add(this.mesh, 'reverseOrientation').onChange(simpleRepaint);
        gui.add(this.mesh, 'randomlyFlipFaceOrientations').onChange(simpleRepaint);
        gui.add(this.mesh, 'saveOffFile').onChange(simpleRepaint);
    
        requestAnimationFrame(this.repaint.bind(this));
    }

    /**
     * Redraw the mesh
     */
    repaint() {
        this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.lights = [{pos:this.camera.pos, color:[1, 1, 1], atten:[1, 0, 0]}];

        //NOTE: Before this, the canvas has all options we need except
        //for "shaderToUse"
        let canvas = this;
        if (!('shaderReady' in this.shaders.blinnPhong)) {
            // Wait until the promise has resolved, then draw again
            this.shaders.blinnPhong.then(canvas.repaint.bind(canvas));
        }
        else {
            this.shaderToUse = this.shaders.blinnPhong;
            this.mesh.render(this);
        }
    }

    /**
     * Re-center the camera on the mesh
     */
    centerCamera() {
        this.camera.centerOnMesh(this.mesh);
    }
}
