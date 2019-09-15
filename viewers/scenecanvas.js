//Purpose: Code to parse and render scene files


BEACON_SIZE = 0.1;

function drawBeacon(glcanvas, pMatrix, mvMatrix, camera, mesh, color) {
    m = mat4.create();
    mat4.translate(m, m, camera.pos);
    mat4.scale(m, m, glMatrix.vec3.fromValues(BEACON_SIZE, BEACON_SIZE, BEACON_SIZE));
    mat4.mul(m, mvMatrix, m);
    mesh.render(glcanvas.gl, glcanvas.shaders, pMatrix, m, color, camera.pos, [0, 0, 0], color, false, false, false, COLOR_SHADING);
}

//Update the beacon positions on the web site
function vec3StrFixed(v, k) {
    return "(" + v[0].toFixed(k) + ", " + v[1].toFixed(2) + ", " + v[2].toFixed(2) + ")";
}
function updateCamerasPos() {
    let cam1PosE = document.getElementById("camera1");
    let cam2PosE = document.getElementById("camera2");
    cam1PosE.innerHTML = "<font color = \"red\">" + vec3StrFixed(glcanvas.scene.cam1.pos, 2) + "</font>";
    cam2PosE.innerHTML = "<font color = \"green\">" + vec3StrFixed(glcanvas.cam2.pos, 2) + "</font>";
}

//A function that adds lots of fields to glcanvas for rendering the scene graph
function SceneCanvas(glcanvas, shadersrelpath) {
    BaseCanvas(glcanvas, shadersrelpath);
    glcanvas.scene = null;

    /**
     * Recursive function to load all of the meshes and to 
     * put all of the matrix transformations into mat4 objects
     * At this point, all shapes are converted to meshes
     * @param {object} node The current node in the recursive parsing
     */
    glcanvas.parseNode = function(node) {
        //Step 1: Make a matrix object for the transformation
        if (!('transform' in node)) {
            //Assume identity matrix if no matrix is provided
            node.transform = mat4.create();
        }
        else if (node.transform.length != 16) {
            console.log("ERROR: 4x4 Transformation matrix " + node.transform + " must have 16 entries");
            return;
        }
        else {
            //Matrix has been specified in array form and needs to be converted into object
            let m = mat4.create();
            for (let i = 0; i < 16; i++) {
                m[i] = node.transform[i];
            }
            mat4.transpose(m, m);
            node.transform = m;
        }
        
        //Step 2: Load in the shape with its properties
        if ('shape' in node) {
            if (!('type' in node.shape)) {
                console.log("ERROR: Shape not specified in node " + node);
                return;
            }
            if (node.shape.type == "mesh") {
                if (!('filename' in node.mesh)) {
                    console.log("ERROR: filename not specified for mesh: " + node.shape);
                    return;
                }
                node.mesh = new PolyMesh();
                let reader = new FileReader();
                reader.onload = function(error) {
                    if (error) throw error;
                    node.mesh.loadFileFromLines(this.result.split("\n"));
                }
                reader.readAsText(node.mesh.filename);
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
     * 
     * @param {}
     */
    glcanvas.outputSceneMeshes = function(node, levelStr) {
        console.log("*" + levelStr + node.mesh);
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
    glcanvas.setupScene = function(scene) {
        //Setup camera objects for the source and receiver
        glcanvas.scene = scene;
        let cam1pos = [0, 0, 0];
        let cam2pos = [5, 0, 0];
        if ("camera1" in glcanvas.scene) {
            cam1pos = camera1;
        }
        if ("camera2" in glcanvas.scene) {
            cam2pos = camera2;
        }
        glcanvas.scene.cam1 = new FPSCamera(0, 0, 0.75);
        glcanvas.scene.cam2 = new FPSCamera(0, 0, 0.75);
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
        glcanvas.scene.children.forEach(function(child) {
            glcanvas.parseNode(child);
            glcanvas.outputSceneMeshes(child);
        });
        glcanvas.viewFromCam1();
    }


    /////////////////////////////////////////////////////
    //  Repaint Function
    /////////////////////////////////////////////////////
    glcanvas.repaintRecurse = function(node, pMatrix, matrixIn) {
        let mvMatrix = mat4.create();
        mat4.mul(mvMatrix, matrixIn, node.transform);
        if ('mesh' in node) {
            glcanvas.mesh.render(glcanvas.gl, glcanvas.shaders, pMatrix, mvMatrix, glcanvas);
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
        glcanvas.light1Pos = glcanvas.camera.pos;
        glcanvas.gl.viewport(0, 0, glcanvas.gl.viewportWidth, glcanvas.gl.viewportHeight);
        glcanvas.gl.clear(glcanvas.gl.COLOR_BUFFER_BIT | glcanvas.gl.DEPTH_BUFFER_BIT);
        
        let pMatrix = mat4.create();
        mat4.perspective(pMatrix, 45, glcanvas.gl.viewportWidth / glcanvas.gl.viewportHeight, 0.01, 1000.0);
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
            updateCamerasPos(); //Update HTML display of vector positions
            requestAnimFrame(glcanvas.repaint);
        }
    }

    /////////////////////////////////////////////////////
    //Step 3: Initialize GUI Callbacks
    /////////////////////////////////////////////////////
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