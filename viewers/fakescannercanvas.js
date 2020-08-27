
function download(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}


/**
 * A class that runs on top of a scene to simulate scanning an object.
 * The scene simply consists of a mesh on which the camera is centered.
 * It reads out depth information and normal information as images over
 * a range of angles encircling the object
 */
class FakeScannerCanvas extends SceneCanvas {
    /**
     * 
     * @param {DOM Element} glcanvas Handle to HTML where the glcanvas resides
     * @param {string} shadersrelpath Path to the folder that contains the shaders,
     *                                relative to where the constructor is being called
     * @param {string} meshesrelpath Path to the folder that contains the meshes,
     *                                relative to where the constructor is being called
     */
    constructor(glcanvas, shadersrelpath, meshesrelpath) {
        super(glcanvas, shadersrelpath, meshesrelpath, false);
        let offscreenCanvas = document.createElement("canvas");
        offscreenCanvas.width = glcanvas.width;
        offscreenCanvas.height = glcanvas.height;
        offscreenCanvas.ctx = offscreenCanvas.getContext("2d");
        this.offscreenCanvas = offscreenCanvas;
        this.theta = 0.0;
        this.nscans = 20;
    }
    
    /**
     * Perform a fake scan of the normals and depth, and pop up
     * with a file holding all of this information
     */
    makeScan() {
        let ctx = this.offscreenCanvas.ctx;
        let allNormals = [];
        let allDepth = [];
        let cameras = [];
        let step = 2*Math.PI/this.nscans;
        this.theta = 0.0;
        while (this.theta < 2*Math.PI) {
            this.camera.orbitLeftRightTheta(step);
            this.theta += step;
            // Step 1: Render normals
            this.shaderToUse = this.shaders.normalLocal;
            this.repaint();
            ctx.drawImage(this.glcanvas, 0, 0);
            let imageData = ctx.getImageData(0, 0, this.width, this.height);
            allNormals.push(Array.from(imageData.data));
            // Step 2: Render depth
            this.shaderToUse = this.shaders.depth16;
            this.repaint();
            ctx.drawImage(this.glcanvas, 0, 0);
            imageData = ctx.getImageData(0, 0, this.width, this.height);
            allDepth.push(Array.from(imageData.data));
            // Step 3: Add camera information
            let c = this.camera;
            let pos = [c.pos[0], c.pos[1], c.pos[2]];
            let up = [c.up[0], c.up[1], c.up[2]];
            let right = [c.right[0], c.right[1], c.right[2]];
            cameras.push({"pos":pos, "up":up, "right":right})
        }
        let c = this.camera;
        download(JSON.stringify({'width':this.width, 'height':this.height, 'allNormals':allNormals, 'allDepth':allDepth, 'cameras':cameras, 'fovx':c.fovx, 'fovy':c.fovy, 'far':c.far}), 'scan.json', 'text/plain');
    }

    /**
     * Load in a mesh to the fake scanner
     * @param {string} src Source code for the mesh
     */
    loadMeshToScan(src) {
        let scene = {
            "name":"testscene",
            "cameras":[],
            "lights":[],
            "children":[
                {
                    "shapes":[
                        {
                        "type":"mesh",
                        "src":src
                        }
                    ]
                }
            ]
        };
        this.setupScene(scene, this.clientWidth, this.clientHeight);
        // Pull the mesh out of the scene
        delete this.scene.children[0].shapes[0].src;
        this.mesh = this.scene.children[0].shapes[0].mesh;
        // Create a mouse polar camera that's centered on the mesh
        this.camera = new MousePolarCamera(this.clientWidth, this.clientHeight);
        // Setup the far distance properly for highest precision depth
        this.camera.far = 0;
        this.camera.centerOnMesh(this.mesh);
        // Setup a headlight
        this.scene.cameras[0].camera = this.camera;
        this.scene.lights[0] = {"pos":this.camera.pos, "color":[1, 1, 1], "atten":[1, 0, 0]};
        this.showLights = false;
        this.drawEdges = false;
        this.updateMeshDrawings();

        let canvas = this;
        let gui = this.gui;
        gui.add(this, 'nscans').min(1).step(1);
        gui.add(this.camera, 'fovx').min(0).max(Math.PI).onChange(function() {
            requestAnimFrame(canvas.repaint.bind(this));
        });
        gui.add(this.camera, 'fovy').min(0).max(Math.PI).onChange(function() {
            requestAnimFrame(canvas.repaint.bind(this));
        });
        gui.add(this, 'makeScan');

        requestAnimFrame(canvas.repaint.bind(this));
    }
    
}
