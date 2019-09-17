//Purpose: Code to parse and render scene files


//Update the beacon positions on the web site
function vec3StrFixed(v, k) {
    return "(" + v[0].toFixed(k) + ", " + v[1].toFixed(2) + ", " + v[2].toFixed(2) + ")";
}

//A function that adds lots of fields to glcanvas for rendering the scene graph
function SceneCanvas(glcanvas, shadersrelpath, meshesrelpath) {
    BaseCanvas(glcanvas, shadersrelpath);
    glcanvas.scene = null;
    glcanvas.specialMeshes = {};

    /**
     * Recursive function to load all of the meshes and to 
     * put all of the matrix transformations into glMatrix.mat4 objects
     * At this point, all shapes are converted to meshes
     * @param {object} node The current node in the recursive parsing
     */
    glcanvas.parseNode = function(node) {
        //Step 1: Make a matrix object for the transformation
        if (!('transform' in node)) {
            //Assume identity matrix if no matrix is provided
            node.transform = glMatrix.mat4.create();
        }
        else if (node.transform.length != 16) {
            console.log("ERROR: 4x4 Transformation matrix " + node.transform + " must have 16 entries");
            return;
        }
        else {
            //Matrix has been specified in array form and needs to be converted into object
            let m = glMatrix.mat4.create();
            for (let i = 0; i < 16; i++) {
                m[i] = node.transform[i];
            }
            glMatrix.mat4.transpose(m, m);
            node.transform = m;
        }
        // Keep a separate transform for display (e.g. to deal with sphere centers/radii
        // as a transform for WebGL)
        node.disptransform = glMatrix.mat4.create();
        glMatrix.mat4.copy(node.disptransform, node.transform);

        
        //Step 2: Load in the shape with its properties
        if ('shape' in node) {
            if (!('type' in node.shape)) {
                console.log("ERROR: Shape not specified in node " + node);
                return;
            }
            if (node.shape.type == "mesh") {
                if (!('filename' in node.shape)) {
                    console.log("ERROR: filename not specified for mesh: " + node.shape);
                    return;
                }
                node.mesh = new PolyMesh();
                let lines = BlockLoader.loadTxt(node.shape.filename);
                node.mesh.loadFileFromLines(lines.split("\n"));
            }
            else if (node.shape.type == "sphere") {
                if (!('sphere' in glcanvas.specialMeshes)) {
                    let spheremesh = new PolyMesh();
                    let lines = BlockLoader.loadTxt(meshesrelpath + "sphere1026.off")
                    spheremesh.loadFileFromLines(lines.split("\n"));
                    glcanvas.specialMeshes.sphere = spheremesh;
                }
                node.mesh = glcanvas.specialMeshes.sphere;
                // Apply a transform that realizes the proper center and radius
                // before the transform at this node
                let ms = glMatrix.mat4.create();
                let c = node.shape.center;
                let r = node.shape.radius;
                ms[0] = r;
                ms[5] = r;
                ms[10] = r;
                ms[12] = c[0];
                ms[13] = c[1];
                ms[14] = c[2];
                glMatrix.mat4.mul(node.disptransform, node.disptransform, ms);
            }
            else if (node.shape.type == "box") {
                if (!('box' in glcanvas.specialMeshes)) {
                    let boxmesh = new PolyMesh();
                    let lines = BlockLoader.loadTxt(meshesrelpath + "box2402.off");
                    boxmesh.loadFileFromLines(lines.split("\n"));
                    glcanvas.specialMeshes.box = boxmesh;
                }
                node.mesh = glcanvas.specialMeshes.box;
                let mb = glMatrix.mat4.create();
                let c = node.shape.center;
                mb[0] = node.shape.L; // Length
                mb[5] = node.shape.W; // Width
                mb[10] = node.shape.H;
                mb[12] = c[0];
                mb[13] = c[1];
                mb[14] = c[2];
                glMatrix.mat4.mul(node.disptransform, node.disptransform, mb);
            }
            else if (node.shape.type == "cylinder") {
                if (!('cylinder' in glcanvas.specialMeshes)) {
                    let center = glMatrix.vec3.fromValues(0, 0, 0);
                    let cylindermesh = getCylinderMesh(center, 1.0, 1.0, 100);
                    glcanvas.specialMeshes.cylinder = cylindermesh;
                }
                node.mesh = glcanvas.specialMeshes.cylinder;
                let mc = glMatrix.mat4.create();
                let c = node.shape.center;
                let r = node.shape.radius;
                let h = node.shape.height;
                mc[0] = r;
                mc[5] = h;
                mc[10] = r;
                mc[12] = c[0];
                mc[13] = c[1];
                mc[14] = c[2];
                glMatrix.mat4.mul(node.disptransform, node.disptransform, mc);
            }
            else {
                console.log("Warning: Unknown shape type " + node.shape.type);
            }
        }
        if ('material' in node) {
            node.material = glcanvas.scene.materials[node.material];
        }
        else {
            // Default material is greenish gray flat color
            node.material = {"color":[0.5, 0.55, 0.5]};
        }
        
        if ('children' in node) {
            for (let i = 0; i < node.children.length; i++) {
                glcanvas.parseNode(node.children[i]);
            }
        }
    }

    /**
     * Recursive function to output information about the scene tree
     * @param {object} node The scene node
     * @param {string} levelStr A string that keeps track of how much
     *                          to tab over based on depth in tree
     */
    glcanvas.outputSceneMeshes = function(node, levelStr) {
        if ('mesh' in node) {
            let nodestring = "empty";
            if ('type' in node.shape) {
                nodestring = node.shape.type;
            }
            console.log("*" + levelStr + nodestring);
        }
        if ('children' in node) {
            for (let i = 0; i < node.children.length; i++) {
                glcanvas.outputSceneMeshes(node.children[i], levelStr+"\t");
            }
        }    
    }

    /**
     * A function that starts of the recursive initialization
     * of the scene, and which also sets up cameras
     * 
     * @param {WebGL Handle} glcanvas 
     */
    glcanvas.setupScene = function(scene, pixWidth, pixHeight) {
        //Setup camera objects for the source and receiver
        glcanvas.scene = scene;
        let cam1pos = [0, 0, 0];
        let cam2pos = [5, 0, 0];
        if ("camera1" in glcanvas.scene) {
            cam1pos = glcanvas.scene.camera1;
        }
        if ("camera2" in glcanvas.scene) {
            cam2pos = glcanvas.scene.camera2;
        }
        glcanvas.scene.cam1 = new FPSCamera(pixWidth, pixHeight, 0.75);
        glcanvas.scene.cam2 = new FPSCamera(pixWidth, pixHeight, 0.75);
        glcanvas.scene.cam1.pos = glMatrix.vec3.fromValues(cam1pos[0], cam1pos[1], cam1pos[2]);
        glcanvas.scene.cam2.pos = glMatrix.vec3.fromValues(cam2pos[0], cam2pos[1], cam2pos[2]);
        
        //Make them look roughly at each other but in the XZ plane, if that's a nonzero projection
        let T = glMatrix.vec3.create();
        glMatrix.vec3.subtract(T, glcanvas.scene.cam2.pos, glcanvas.scene.cam1.pos);
        T[1] = 0;
        if (T[0] == 0 && T[2] == 0) {
            //If it's a nonzero projection (one is right above the other on y)
            //Just go back to (0, 0, -1) as the towards direction
            T[2] = -1;
        }
        else {
            glMatrix.vec3.normalize(T, T);
        }
        glMatrix.vec3.cross(glcanvas.scene.cam1.right, T, glcanvas.scene.cam1.up);
        glMatrix.vec3.cross(glcanvas.scene.cam2.right, glcanvas.scene.cam2.up, T);
        
        //Now recurse and setup all of the children nodes in the tree
        glcanvas.scene.children.forEach(function(child, i) {
            glcanvas.parseNode(child);
        });

        //Output information about the scene tree
        glcanvas.scene.children.forEach(function(child, i) {
            glcanvas.outputSceneMeshes(child, " ");
        });
        glcanvas.viewFromCam1();
    }


    /////////////////////////////////////////////////////
    //  Repaint Function
    /////////////////////////////////////////////////////
    glcanvas.repaintRecurse = function(node, pMatrix, matrixIn) {
        let mvMatrix = glMatrix.mat4.create();
        glMatrix.mat4.mul(mvMatrix, matrixIn, node.disptransform);
        if ('mesh' in node) {
            if ('color' in node.material) {
                glcanvas.constColor = node.material.color;
            }
            else {
                glcanvas.constColor = [0.5, 0.55, 0.5]
            }
            node.mesh.render(glcanvas.gl, glcanvas.shaders, pMatrix, mvMatrix, glcanvas);
        }
        if ('children' in node) {
            for (let i = 0; i < node.children.length; i++) {
                glcanvas.repaintRecurse(node.children[i], pMatrix, mvMatrix);
            }
        }
    }
    
    glcanvas.repaint = function() {
        if (glcanvas.scene === null) {
            return;
        }
        //glcanvas.light1Pos = glcanvas.camera.pos;
        glcanvas.gl.viewport(0, 0, glcanvas.gl.viewportWidth, glcanvas.gl.viewportHeight);
        glcanvas.gl.clear(glcanvas.gl.COLOR_BUFFER_BIT | glcanvas.gl.DEPTH_BUFFER_BIT);
        
        let pMatrix = glMatrix.mat4.create();
        glMatrix.mat4.perspective(pMatrix, 45, glcanvas.gl.viewportWidth / glcanvas.gl.viewportHeight, 0.01, 1000.0);
        //First get the global modelview matrix based on the camera
        let mvMatrix = glcanvas.camera.getMVMatrix();
        //Then drawn the scene
        let scene = glcanvas.scene;
        if ('children' in scene) {
            for (let i = 0; i < scene.children.length; i++) {
                glcanvas.repaintRecurse(scene.children[i], pMatrix, mvMatrix);
            }
        }
        
        //Draw the source, receiver, and third camera
        /*if (!(glcanvas.camera == glcanvas.scene.receiver)) {
            drawBeacon(glcanvas, pMatrix, mvMatrix, glcanvas.scene.receiver, glcanvas.beaconMesh, glMatrix.vec3.fromValues(1, 0, 0));
        }*/
        
        //Draw lines and points for debugging
        glcanvas.drawer.reset(); //Clear lines and points drawn last time
        //TODO: Paint debugging stuff here if you'd like
        glcanvas.drawer.repaint(pMatrix, mvMatrix);
        
        //Redraw if walking
        let thisTime = (new Date()).getTime();
        let dt = (thisTime - glcanvas.lastTime)/1000.0;
        glcanvas.lastTime = thisTime;
        if (glcanvas.movelr != 0 || glcanvas.moveud != 0 || glcanvas.movefb != 0) {
            glcanvas.camera.translate(0, 0, glcanvas.movefb, glcanvas.walkspeed*dt);
            glcanvas.camera.translate(0, glcanvas.moveud, 0, glcanvas.walkspeed*dt);
            glcanvas.camera.translate(glcanvas.movelr, 0, 0, glcanvas.walkspeed*dt);
            glcanvas.updateCamerasPos(); //Update HTML display of vector positions
            requestAnimFrame(glcanvas.repaint);
        }
    }

    /////////////////////////////////////////////////////
    //Step 3: Initialize GUI Callbacks
    /////////////////////////////////////////////////////
    glcanvas.updateCamerasPos = function() {
        let cam1PosE = document.getElementById("camera1");
        let cam2PosE = document.getElementById("camera2");
        cam1PosE.innerHTML = "<font color = \"red\">" + vec3StrFixed(glcanvas.scene.cam1.pos, 2) + "</font>";
        cam2PosE.innerHTML = "<font color = \"green\">" + vec3StrFixed(glcanvas.scene.cam2.pos, 2) + "</font>";
    }

    glcanvas.viewFromCam1 = function() {
        glcanvas.camera = glcanvas.scene.cam1;
        requestAnimFrame(glcanvas.repaint);
    }
    
    glcanvas.viewFromCam2 = function() {
        glcanvas.camera = glcanvas.scene.cam2;
        requestAnimFrame(glcanvas.repaint);
    }
    
    glcanvas.shaderToUse = glcanvas.shaders.colorShader;
    glcanvas.drawer = new SimpleDrawer(glcanvas.gl, glcanvas.shaders);//Simple drawer object for debugging
    glcanvas.pathDrawer = new SimpleDrawer(glcanvas.gl, glcanvas.shaders);//For drawing reflection paths
}