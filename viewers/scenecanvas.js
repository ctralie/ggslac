//Purpose: Code to parse and render scene files

BEACON_SIZE = 0.2;
BEACON_COLOR_1 = "A7383E";
BEACON_COLOR_2 = "378B2E";

/**
 * Convert a hex color string to an array of floating point numbers in [0, 1]
 * @param {string} s 6 character string
 */
function colorFloatFromHex(s) {
    let r = parseInt(s.substring(0, 2), 16)/255.0;
    let g = parseInt(s.substring(2, 4), 16)/255.0;
    let b = parseInt(s.substring(4, 6), 16)/255.0;
    return [r, g, b];
}

//A function that adds lots of fields to glcanvas for rendering the scene graph
function SceneCanvas(glcanvas, shadersrelpath, meshesrelpath) {
    BaseCanvas(glcanvas, shadersrelpath);
    glcanvas.scene = null;
    glcanvas.specialMeshes = {};
    // Initialize the icosahedron for the camera beacons
    glcanvas.specialMeshes.beacon = getIcosahedronMesh()
    glcanvas.specialMeshes.beacon.Scale(BEACON_SIZE, BEACON_SIZE, BEACON_SIZE);

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

        //Step 2: Load in each shape with its properties
        if (!('shapes' in node)) {
            node.shapes = [];
        }
        for (var i = 0; i < node.shapes.length; i++) {
            let shape = node.shapes[i];
            if (!('type' in shape)) {
                console.log("ERROR: Shape not specified in node " + node);
                continue;
            }
            // Create an extra transformation going down to the shape to accommodate
            // shape properties such as length/width/height/center/radius
            shape.ms = glMatrix.mat4.create();
            shape.mesh = null;
            if (shape.type == "mesh") {
                if (!('filename' in shape)) {
                    console.log("ERROR: filename not specified for mesh: " + shape);
                    continue;
                }
                shape.mesh = new PolyMesh();
                let lines = BlockLoader.loadTxt(shape.filename);
                shape.mesh.loadFileFromLines(lines.split("\n"));
            }
            else if (shape.type == "sphere") {
                if (!('sphere' in glcanvas.specialMeshes)) {
                    let spheremesh = new PolyMesh();
                    let lines = BlockLoader.loadTxt(meshesrelpath + "sphere1026.off")
                    spheremesh.loadFileFromLines(lines.split("\n"));
                    glcanvas.specialMeshes.sphere = spheremesh;
                }
                shape.mesh = glcanvas.specialMeshes.sphere;
                // Apply a transform that realizes the proper center and radius
                // before the transform at this node
                let ms = glMatrix.mat4.create();
                if ('r' in shape) {
                    let r = shape.radius;
                    ms[0] = r;
                    ms[5] = r;
                    ms[10] = r;
                }
                if ('center' in shape) {
                    let c = shape.center;
                    ms[12] = c[0];
                    ms[13] = c[1];
                    ms[14] = c[2];
                }
                shape.ms = ms;
            }
            else if (shape.type == "box") {
                if (!('box' in glcanvas.specialMeshes)) {
                    let boxmesh = new PolyMesh();
                    let lines = BlockLoader.loadTxt(meshesrelpath + "box2402.off");
                    boxmesh.loadFileFromLines(lines.split("\n"));
                    glcanvas.specialMeshes.box = boxmesh;
                }
                shape.mesh = glcanvas.specialMeshes.box;
                let ms = glMatrix.mat4.create();
                if ('width' in shape) {
                    ms[0] = shape.width;
                }
                if ('height' in shape) {
                    ms[5] = shape.height;
                }
                if ('length' in shape) {
                    ms[10] = shape.length;
                }
                if ('center' in shape) {
                    let c = shape.center;
                    ms[12] = c[0];
                    ms[13] = c[1];
                    ms[14] = c[2];
                }
                shape.ms = ms;
            }
            else if (shape.type == "cylinder") {
                if (!('cylinder' in glcanvas.specialMeshes)) {
                    let center = glMatrix.vec3.fromValues(0, 0, 0);
                    let cylindermesh = getCylinderMesh(center, 1.0, 1.0, 100);
                    glcanvas.specialMeshes.cylinder = cylindermesh;
                }
                shape.mesh = glcanvas.specialMeshes.cylinder;
                let ms = glMatrix.mat4.create();
                if ('radius' in shape) {
                    ms[0] = shape.radius;
                    ms[10] = shape.radius;
                }
                if ('height' in shape) {
                    ms[5] = shape.height;
                }
                if ('center' in shape) {
                    let c = shape.center;
                    ms[12] = c[0];
                    ms[13] = c[1];
                    ms[14] = c[2];
                }
                shape.ms = ms;
            }
            else if (shape.type == "cone") {
                if (!('cone' in glcanvas.specialMeshes)) {
                    let center = glMatrix.vec3.fromValues(0, 0, 0);
                    let conemesh = getConeMesh(center, 1.0, 1.0, 100);
                    glcanvas.specialMeshes.cone = conemesh;
                }
                shape.mesh = glcanvas.specialMeshes.cone;
                let ms = glMatrix.mat4.create();
                if ('radius' in shape) {
                    ms[0] = shape.radius;
                    ms[10] = shape.radius;
                }
                if ('height' in shape) {
                    ms[5] = shape.height;
                }
                if ('center' in shape) {
                    let c = shape.center;
                    ms[12] = c[0];
                    ms[13] = c[1];
                    ms[14] = c[2];
                }
                shape.ms = ms;
            }
            else if (shape.type == "scene") {
                if (!('filename' in shape)) {
                    console.log("ERROR: filename not specified for scene: " + node);
                    continue;
                }
                let subscene = BlockLoader.loadJSON(shape.filename);
                // Ignore the cameras, but copy over the materials
                if ('materials' in subscene) {
                    glcanvas.scene.materials = {...glcanvas.scene.materials, ...subscene.materials };
                }
                if ('children' in subscene) {
                    if (!('children' in node)) {
                        node.children = [];
                    }
                    node.children = node.children.concat(subscene.children);
                }
            }            
            else {
                console.log("Warning: Unknown shape type " + shape.type);
            }

            // Figure out material associated to this shape
            if ('material' in shape) {
                shape.material = glcanvas.scene.materials[shape.material];
            }
            else {
                // Default material is greenish gray flat color
                shape.material = {"color":[0.5, 0.55, 0.5]};
            }
        }
        

        // Step 3: Branch out to child subtrees recursively
        if (!('children' in node)) {
            node.children = [];
        }
        node.children.forEach(function(child) {
            glcanvas.parseNode(child);
        });
    }

    /**
     * Recursive function to output information about the scene tree
     * @param {object} node The scene node
     * @param {string} levelStr A string that keeps track of how much
     *                          to tab over based on depth in tree
     */
    glcanvas.getSceneString = function(node, levelStr) {
        let s = "";
        node.shapes.forEach(function(shape) {
            if ('mesh' in shape) {
                if ('type' in shape) {
                    s += "\n*" + levelStr + shape.type;
                }
            }
        })
        if ('children' in node) {
            for (let i = 0; i < node.children.length; i++) {
                s += "\n" + glcanvas.getSceneString(node.children[i], levelStr+"\t");
            }
        }
        return s;
    }

    /**
     * Fill in the camera based on a JSON specification
     * @param {object} camera The camera object to fill in
     * @param {object} obj The JSON object
     */
    glcanvas.fillInCamera = function(camera, obj) {
        if ('pos' in obj) {
            camera.pos = glMatrix.vec3.fromValues(obj.pos[0], obj.pos[1], obj.pos[2]);
        }
        if ('rot' in obj) {
            let q = obj.rot;
            q = glMatrix.quat.fromValues(q[0], q[1], q[2], q[3]);
            camera.setRotFromQuat(q);
        }
        if ('fovy' in obj) {
            camera.fovy = obj.fovy;
        }
        if ('near' in obj) {
            camera.near = obj.near;
        }
        if ('far' in obj) {
            camera.far = obj.far;
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
        if (!('materials' in scene)) {
            scene.materials = {};
        }
        glcanvas.scene = scene;
        glcanvas.scene.cam1 = new FPSCamera(pixWidth, pixHeight);
        glcanvas.scene.cam2 = new FPSCamera(pixWidth, pixHeight);
        if ("camera1" in glcanvas.scene) {
            glcanvas.fillInCamera(glcanvas.scene.cam1, glcanvas.scene.camera1);
        }
        if ("camera2" in glcanvas.scene) {
            glcanvas.fillInCamera(glcanvas.scene.cam2, glcanvas.scene.camera2);
        }
        
        //Now recurse and setup all of the children nodes in the tree
        glcanvas.scene.children.forEach(function(child, i) {
            glcanvas.parseNode(child);
        });

        //Output information about the scene tree
        glcanvas.scene.children.forEach(function(child, i) {
            console.log(glcanvas.getSceneString(child, " "));
        });
        glcanvas.viewFromCamera1();
    }


    /////////////////////////////////////////////////////
    //  Repaint Function
    /////////////////////////////////////////////////////
    glcanvas.repaintRecurse = function(node, pMatrix, matrixIn) {
        let mvMatrix = glMatrix.mat4.create();
        glMatrix.mat4.mul(mvMatrix, matrixIn, node.transform);
        node.shapes.forEach(function(shape) {
            if ('mesh' in shape) {
                if (!(shape.mesh === null)) {
                    glcanvas.constColor = [0.5, 0.55, 0.5];
                    if ('material' in shape) {
                        if ('color' in shape.material) {
                            glcanvas.constColor = shape.material.color;
                        }
                    }
                    m = glMatrix.mat4.create();
                    glMatrix.mat4.mul(m, mvMatrix, shape.ms);
                    shape.mesh.render(glcanvas.gl, glcanvas.shaders, pMatrix, m, glcanvas);
                }
            }
        });
        if ('children' in node) {
            for (let i = 0; i < node.children.length; i++) {
                glcanvas.repaintRecurse(node.children[i], pMatrix, mvMatrix);
            }
        }
    }
    
    glcanvas.drawCameraBeacon = function(camera, pMatrix, mvMatrix, color) {
        // Switch over to a flat shader with no edges
        let sProg = glcanvas.shaderToUse;
        let drawEdges = glcanvas.drawEdges;
        glcanvas.shaderToUse = glcanvas.shaders.flatShader;
        glcanvas.drawEdges = false;

        let pos = camera.pos;
        let postw = glMatrix.vec3.create();
        let posrt = glMatrix.vec3.create();
        let posup = glMatrix.vec3.create();
        glMatrix.vec3.cross(postw, camera.up, camera.right);
        glMatrix.vec3.scaleAndAdd(postw, pos, postw, BEACON_SIZE*2);
        glMatrix.vec3.scaleAndAdd(posrt, pos, camera.right, BEACON_SIZE*2);
        glMatrix.vec3.scaleAndAdd(posup, pos, camera.up, BEACON_SIZE*2);
        glcanvas.drawer.drawLine(pos, postw, [1, 0, 0]);
        glcanvas.drawer.drawLine(pos, posrt, [0, 1, 0]);
        glcanvas.drawer.drawLine(pos, posup, [0, 0, 1]);
        glcanvas.constColor = colorFloatFromHex(color);
        let m = glMatrix.mat4.create();
        glMatrix.mat4.fromTranslation(m, pos);
        glMatrix.mat4.mul(m, mvMatrix, m);
        glcanvas.specialMeshes.beacon.render(glcanvas.gl, glcanvas.shaders, pMatrix, m, glcanvas);
        
        // Set properties back to what they were
        glcanvas.shaderToUse = sProg;
        glcanvas.drawEdges = drawEdges;
        glcanvas.drawer.repaint(pMatrix, mvMatrix);
    }

    glcanvas.repaint = function() {
        if (glcanvas.scene === null) {
            return;
        }
        //glcanvas.light1Pos = glcanvas.camera.pos;
        glcanvas.gl.viewport(0, 0, glcanvas.gl.viewportWidth, glcanvas.gl.viewportHeight);
        glcanvas.gl.clear(glcanvas.gl.COLOR_BUFFER_BIT | glcanvas.gl.DEPTH_BUFFER_BIT);
        
        let pMatrix = glcanvas.camera.getPMatrix();
        //First get the global modelview matrix based on the camera
        let mvMatrix = glcanvas.camera.getMVMatrix();

        //Then drawn the scene
        let scene = glcanvas.scene;
        if ('children' in scene) {
            scene.children.forEach(function(child) {
                glcanvas.repaintRecurse(child, pMatrix, mvMatrix);
            });
        }
        
        //Draw lines and points for debugging
        glcanvas.drawer.reset(); //Clear lines and points drawn last time
        //TODO: Paint debugging stuff here if you'd like


        // Now draw the beacons for the cameras (assuming FPSCamera)
        if (glcanvas.showCameras) {
            if (glcanvas.camera == glcanvas.scene.cam2) {
                glcanvas.drawCameraBeacon(glcanvas.scene.cam1, pMatrix, mvMatrix, BEACON_COLOR_1);
            }
            else {
                glcanvas.drawCameraBeacon(glcanvas.scene.cam2, pMatrix, mvMatrix, BEACON_COLOR_2);
            }
        }
        
        //Redraw if walking
        let thisTime = (new Date()).getTime();
        let dt = (thisTime - glcanvas.lastTime)/1000.0;
        glcanvas.lastTime = thisTime;
        if (glcanvas.movelr != 0 || glcanvas.moveud != 0 || glcanvas.movefb != 0) {
            glcanvas.camera.translate(0, 0, glcanvas.movefb, glcanvas.walkspeed*dt);
            glcanvas.camera.translate(0, glcanvas.moveud, 0, glcanvas.walkspeed*dt);
            glcanvas.camera.translate(glcanvas.movelr, 0, 0, glcanvas.walkspeed*dt);
            requestAnimFrame(glcanvas.repaint);
        }
        glcanvas.updateCamerasHTML();
    }

    glcanvas.updateMeshDrawingsRecurse = function(node) {
        node.shapes.forEach(function(shape) {
            if ('mesh' in shape) {
                shape.mesh.needsDisplayUpdate = true;
            }
        });
        if ('children' in node) {
            node.children.forEach(function(child) {
                glcanvas.updateMeshDrawingsRecurse(child);
            })
        }
    }

    glcanvas.updateMeshDrawings = function() {
        let scene = glcanvas.scene;
        if ('children' in glcanvas.scene) {
            scene.children.forEach(function(child) {
                glcanvas.updateMeshDrawingsRecurse(child);
            });
        }
    }

    /////////////////////////////////////////////////////
    //Step 3: Initialize GUI Callbacks
    /////////////////////////////////////////////////////
    glcanvas.updateCamerasHTML = function() {
        let cam1PosE = document.getElementById("camera1");
        let cam2PosE = document.getElementById("camera2");
        cam1PosE.innerHTML = "<font color = \"#" + BEACON_COLOR_1 + "\">" + glcanvas.scene.cam1.toString() + "</font>";
        cam2PosE.innerHTML = "<font color = \"#" + BEACON_COLOR_2 + "\">" + glcanvas.scene.cam2.toString() + "</font>";
    }

    glcanvas.viewFromCamera1 = function() {
        glcanvas.camera = glcanvas.scene.cam1;
        requestAnimFrame(glcanvas.repaint);
    }
    
    glcanvas.viewFromCamera2 = function() {
        glcanvas.camera = glcanvas.scene.cam2;
        requestAnimFrame(glcanvas.repaint);
    }
    
    glcanvas.shaderToUse = glcanvas.shaders.colorShader;
    glcanvas.drawer = new SimpleDrawer(glcanvas.gl, glcanvas.shaders);//Simple drawer object for debugging
    glcanvas.pathDrawer = new SimpleDrawer(glcanvas.gl, glcanvas.shaders);//For drawing reflection paths
    glcanvas.walkspeed = 2.6;
    glcanvas.showCameras = true;
}