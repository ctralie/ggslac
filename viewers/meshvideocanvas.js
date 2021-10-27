
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
class MeshVideoCanvas extends SceneCanvas {
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
        this.thetaStart = 0.0;
        this.thetaEnd = 2*Math.PI;
        this.theta = 0.0;
        this.nscans = 20;
        this.saveNormals = false;
        this.videoPlaying = false;
        this.frame = 0; // Current frame of video
        this.fps = 30;
        this.meshFrames = [];
        this.pointFramesReady = false;
        this.pointSize = 1.0;
        this.pointFrames = [];
        this.setupScanMenus();
    }

    /**
     * Setup the menu items that allow playing a mesh video and scanning
     */
    setupScanMenus() {
        // Create a shell of a scene simply for positioning a mesh
        const default_filename = "../meshes/proftralie.off";
        let scene = {
            "name":"testscene",
            "cameras":[],
            "lights":[],
            "children":[
                {
                    "shapes":[
                        {
                        "type":"mesh",
                        "filename":default_filename // Show a cow by default until something new is loaded
                        }
                    ]
                }
            ]
        };
        this.setupScene(scene, this.clientWidth, this.clientHeight);
        // Pull the mesh out of the scene
        this.mesh = this.scene.children[0].shapes[0].mesh;
        // Create a mouse polar camera that's centered on the mesh
        this.camera = new MousePolarCamera(this.clientWidth, this.clientHeight);
        const that = this;
        this.meshPromises[default_filename].then(function() {
            // Setup the far distance properly for highest precision depth
            that.camera.far = 0;
            that.camera.centerOnMesh(that.mesh);
        })

        // Setup a headlight
        this.scene.cameras[0].camera = this.camera;
        this.scene.lights[0] = {"pos":this.camera.pos, "color":[1, 1, 1], "atten":[1, 0, 0]};
        this.showLights = false;
        this.drawEdges = false;
        this.updateMeshDrawings();

        let canvas = this;
        let gui = this.gui;
        gui.add(this.camera, 'fovx').min(0).max(Math.PI).onChange(function() {
            requestAnimFrame(canvas.repaint.bind(canvas));
        });
        gui.add(this.camera, 'fovy').min(0).max(Math.PI).onChange(function() {
            requestAnimFrame(canvas.repaint.bind(canvas));
        });

        const videoMenu = gui.addFolder("Mesh Video");
        videoMenu.add(this, 'fps').min(1).step(1);
        this.frameElem = videoMenu.add(this, 'frame');
        this.showPoints = false;
        videoMenu.add(this, 'showPoints').onChange(function() {
            requestAnimFrame(canvas.repaint.bind(canvas));
        });
        videoMenu.add(this, 'pointSize').min(0).max(5).onChange(function() {
            requestAnimFrame(canvas.repaint.bind(canvas));
        });
        videoMenu.add(this, 'playVideo');

        const scannerMenu = gui.addFolder("Fake Scanner");
        scannerMenu.add(this, 'thetaStart');
        scannerMenu.add(this, 'thetaEnd');
        scannerMenu.add(this, 'nscans').min(1).step(1).listen();
        scannerMenu.add(this, 'saveNormals');
        scannerMenu.add(this, 'makeScan');
    }

    /**
     * Setup point color plots for each mesh frame.
     */
    setupPointPlots() {
        // Compute bounding box over all frames for consistent colors
        const frames = this.frames;
        const that = this;
        if (!('shaderReady' in this.shaders.pointColorShader)) {
            this.shaders.pointColorShader.then(function() {
                that.setupPointPlots();
            })
        }
        else {
            // Step 1: Figure out bounding box over all frames for consistent colors
            this.pointFrames = [];
            let bbox = [0, 0, 0, 0, 0, 0];
            for (let k = 0; k < 3; k++) {
                bbox[2*k] = frames[0].VPos[0][k];
                bbox[2*k+1] = frames[0].VPos[0][k];
            }
            for (let i = 0; i < frames.length; i++) {
                for (let row = 0; row < frames[i].VPos.length; row++) {
                    for (let k = 0; k < 3; k++) {
                        bbox[2*k] = Math.min(bbox[2*k], frames[i].VPos[row][k]);
                        bbox[2*k+1] = Math.max(bbox[2*k+1], frames[i].VPos[row][k]);
                    }
                }
            }
            // Step 2: Setup each colored point cloud as a simple drawer
            for (let i = 0; i < frames.length; i++) {
                const drawer = new SimpleDrawer(this.gl, this.shaders.pointColorShader);
                for (let row = 0; row < frames[i].VPos.length; row++) {
                    let color = [0, 0, 0];
                    if ('VColors' in frames[i]) {
                        color = frames[i].VColors[row];
                    }
                    else {
                        for (let k = 0; k < 3; k++) {
                            let c = frames[i].VPos[row][k];
                            color[k] = (c-bbox[2*k])/(bbox[2*k+1]-bbox[2*k]);
                        }
                    }
                    drawer.drawPoint(frames[i].VPos[row], color);
                }
                this.pointFrames.push(drawer);
            }
            this.pointFramesReady = true;
        }
    }

    /**
     * Load in a mesh video, specified as list of objects
     * @param {list} frames A list of objects, each with VPos and ITris
     */
    loadVideo(frames) {
        this.frames = frames;
        this.meshFrames = [];
        this.pointFrames = [];
        this.pointFramesReady = false;
        this.nscans = frames.length;
        // Step 1: Setup all mesh objects
        for (let i = 0; i < frames.length; i++) {
            this.meshFrames.push(new DirectMesh(frames[i].VPos, frames[i].ITris));
            if (i == 0) {
                // Center camera on the first frame
                this.scene.children[0].shapes[0].mesh = this.meshFrames[0];
                this.mesh = this.meshFrames[0];
                this.camera.far = 0;
                this.camera.centerOnMesh(this.mesh);
                requestAnimFrame(this.repaint.bind(this));
            }
        }
        // Step 2: Setup slider for frames
        const that = this;
        this.frameElem.min(0).max(frames.length-1).step(1).listen().onChange(function() {
            if (!that.videoPlaying) {
                that.scene.children[0].shapes[0].mesh = that.meshFrames[that.frame];
                that.repaint();
            }
        });
    }

    /**
     * Mostly repeat what super's repaint does, except allow for the possibility
     * of drawing colored point clouds for the vertices
     */
    repaint() {
        super.repaint();
        if (this.showPoints) {
            if (!this.pointFramesReady) {
                this.setupPointPlots();
            }
            else {
                this.pointFrames[this.frame].setPointSize(this.pointSize);
                this.pointFrames[this.frame].repaint(this.camera);
            }
        }
    }

    playVideo() {
        this.frame = 0;
        this.videoPlaying = true;
        this.playVideoHelper();
    }

    playVideoHelper() {
        this.scene.children[0].shapes[0].mesh = this.meshFrames[this.frame];
        this.mesh = this.meshFrames[this.frame];
        this.repaint();
        const that = this;
        setTimeout(function() {
            that.frame += 1;
            if (that.frame < that.meshFrames.length) {
                that.playVideoHelper();
            }
            else {
                that.videoPlaying = false;
                that.frame = that.meshFrames.length-1;
            }
        }, 1000/this.fps);
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
        let step = (this.thetaEnd-this.thetaStart)/this.nscans;
        this.theta = this.thetaStart;
        this.frame = 0;
        let showPoints = this.showPoints;
        this.showPoints = false; // Be careful not to draw any points
        while (this.frame < this.nscans && this.frame < this.meshFrames.length) {
            this.scene.children[0].shapes[0].mesh = this.meshFrames[this.frame];
            this.mesh = this.meshFrames[this.frame];
            this.camera.orbitLeftRightTheta(step);
            this.theta += step;
            // Step 1: Render normals
            if (this.saveNormals) {
                this.shaderToUse = this.shaders.normalLocal;
                this.repaint();
                ctx.drawImage(this.glcanvas, 0, 0);
                let imageData = ctx.getImageData(0, 0, this.width, this.height);
                allNormals.push(Array.from(imageData.data));
            }
            // Step 2: Render depth
            this.shaderToUse = this.shaders.depth16;
            this.repaint();
            ctx.drawImage(this.glcanvas, 0, 0);
            let imageData = ctx.getImageData(0, 0, this.width, this.height);
            allDepth.push(Array.from(imageData.data));
            // Step 3: Add camera information
            let c = this.camera;
            let pos = [c.pos[0], c.pos[1], c.pos[2]];
            let up = [c.up[0], c.up[1], c.up[2]];
            let right = [c.right[0], c.right[1], c.right[2]];
            cameras.push({"pos":pos, "up":up, "right":right});
            this.frame += 1;
        }
        this.frame = 0;
        this.showPoints = showPoints;
        let c = this.camera;
        download(JSON.stringify({'width':this.width, 'height':this.height, 'allNormals':allNormals, 'allDepth':allDepth, 'cameras':cameras, 'fovx':c.fovx, 'fovy':c.fovy, 'far':c.far}), 'scan.json', 'text/plain');
    }
    
    
}
