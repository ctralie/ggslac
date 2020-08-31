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
        let that = this;
        ['drawEdges', 'drawNormals', 'drawPoints'].forEach(
            function(s) {
                let evt = meshOpts.add(that, s);
                evt.onChange(function() {
                    requestAnimFrame(that.repaint.bind(that));
                });
            }
        );
    
        let simpleRepaint = function() {
            requestAnimFrame(that.repaint.bind(that));
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
        if (!('shader' in this.shaders.blinnPhong)) {
            // The promise hasn't resolved yet, so try again
            requestAnimationFrame(this.repaint.bind(this));
        }
        else {
            this.shaderToUse = this.shaders.blinnPhong.shader;
            console.log(this.shaderToUse);
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
