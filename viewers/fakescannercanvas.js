/**
 * A class that runs on top of a scene to simulate scanning an object.
 * The scene simply consists of a mesh on which the camera is centered.
 * It reads out depth information and normal information as images over
 * a range of angles encircling the object
 */


function download(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}


/**
 * 
 * @param {DOM Element} glcanvas Handle to HTML where the glcanvas resides
 * @param {string} shadersrelpath Path to the folder that contains the shaders,
 *                                relative to where the constructor is being called
 * @param {string} meshesrelpath Path to the folder that contains the meshes,
 *                                relative to where the constructor is being called
 */
function FakeScannerCanvas(glcanvas, shadersrelpath, meshesrelpath) {
    SceneCanvas(glcanvas, shadersrelpath, meshesrelpath);
    
    let offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = glcanvas.width;
    offscreenCanvas.height = glcanvas.height;
    offscreenCanvas.ctx = offscreenCanvas.getContext("2d");
    glcanvas.offscreenCanvas = offscreenCanvas;
    glcanvas.theta = 0.0;
    glcanvas.nscans = 20;


    glcanvas.makeScan = function() {
        let ctx = glcanvas.offscreenCanvas.ctx;
        let allNormals = [];
        let allDepth = [];
        let cameras = [];
        let step = 2*Math.PI/glcanvas.nscans;
        glcanvas.theta = 0.0;
        while (glcanvas.theta < 2*Math.PI) {
            glcanvas.camera.orbitLeftRightTheta(glcanvas.step);
            glcanvas.theta += step;
            // Step 1: Render normals
            glcanvas.shaderToUse = glcanvas.shaders.normalLocal;
            glcanvas.repaint();
            ctx.drawImage(glcanvas, 0, 0);
            let imageData = ctx.getImageData(0, 0, glcanvas.width, glcanvas.height);
            allNormals.push(Array.from(imageData.data));
            // Step 2: Render depth
            glcanvas.shaderToUse = glcanvas.shaders.depth16;
            glcanvas.repaint();
            ctx.drawImage(glcanvas, 0, 0);
            imageData = ctx.getImageData(0, 0, glcanvas.width, glcanvas.height);
            allDepth.push(Array.from(imageData.data));
            // Step 3: Add camera information
            let c = glcanvas.camera;
            let pos = glMatrix.vec3.create();
            glMatrix.vec3.subtract(pos, c.pos, c.center);
            pos = [pos[0], pos[1], pos[2]];
            let up = [c.up[0], c.up[1], c.up[2]];
            let right = [c.right[0], c.right[1], c.right[2]];
            cameras.push({"pos":pos, "up":up, "right":right})
        }
        let c = glcanvas.camera;
        download(JSON.stringify({'width':glcanvas.width, 'height':glcanvas.height, 'allNormals':allNormals, 'allDepth':allDepth, 'cameras':cameras, 'fovx':c.fovx, 'fovy':c.fovy, 'far':c.far}), 'scan.json', 'text/plain');
    }

    glcanvas.loadMeshToScan = function(src) {
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
        glcanvas.setupScene(scene, glcanvas.clientWidth, glcanvas.clientHeight);
        // Pull the mesh out of the scene
        delete glcanvas.scene.children[0].shapes[0].src;
        glcanvas.mesh = glcanvas.scene.children[0].shapes[0].mesh;
        // Create a mouse polar camera that's centered on the mesh
        glcanvas.camera = new MousePolarCamera(glcanvas.clientWidth, glcanvas.clientHeight);
        // Setup the far distance properly for highest precision depth
        glcanvas.camera.far = 0;
        glcanvas.camera.centerOnMesh(glcanvas.mesh);
        // Setup a headlight
        glcanvas.scene.cameras[0].camera = glcanvas.camera;
        glcanvas.scene.lights[0] = {"pos":glcanvas.camera.pos, "color":[1, 1, 1], "atten":[1, 0, 0]};
        glcanvas.showLights = false;
        glcanvas.drawEdges = false;
        glcanvas.updateMeshDrawings();

        let gui = glcanvas.gui;
        gui.add(glcanvas, 'nscans').min(1).step(1);
        gui.add(glcanvas.camera, 'fovx').min(0).max(Math.PI).onChange(function() {
            requestAnimFrame(glcanvas.repaint);
        });
        gui.add(glcanvas.camera, 'fovy').min(0).max(Math.PI).onChange(function() {
            requestAnimFrame(glcanvas.repaint);
        });
        gui.add(glcanvas, 'makeScan');

        requestAnimFrame(glcanvas.repaint);
    }
    
}
