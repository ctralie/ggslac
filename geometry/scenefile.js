//Purpose: Code to parse and render scene files

//////////////////////////////////////////////////////////
///////         SCENE LOADING CODE              //////////
//////////////////////////////////////////////////////////



/**
 * Recursive function to load all of the meshes and to 
 * put all of the matrix transformations into mat4 objects
 * At this point, all shapes are converted to meshes
 * @param {object} scene The root of the scene graph
 * @param {object} node The current node in the recursive parsing
 */
function parseNode(scene, node) {
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
        node.material = scene.materials[node.material];
    }
    else {
        // Default material is greenish gray flat color
        node.material = {"color":[0.5, 0.55, 0.5]};
    }
    
    if ('children' in node) {
        for (let i = 0; i < node.children.length; i++) {
            parseNode(scene, node.children[i]);
        }
    }
}

function setupScene(scene, glcanvas) {
    //Setup camera objects for the source and receiver
    let cam1pos = [0, 0, 0];
    let cam2pos = [5, 0, 0];
    if ("camera1" in scene) {
        cam1pos = camera1;
    }
    if ("camera2" in scene) {
        cam2pos = camera2;
    }
    scene.cam1 = new FPSCamera(0, 0, 0.75);
    scene.cam2 = new FPSCamera(0, 0, 0.75);
    scene.cam1.pos = glMatrix.vec3.fromValues(cam1pos[0], cam1pos[1], cam1pos[2]);
    scene.cam2.pos = glMatrix.vec3.fromValues(cam2pos[0], cam2pos[1], cam2pos[2]);
    
    //Make them look roughly at each other but in the XZ plane, if that's a nonzero projection
    let T = glMatrix.vec3.create();
    glMatrix.vec3.subtract(T, scene.cam2.pos, scene.cam1.pos);
    T[1] = 0;
    if (T[0] == 0 && T[2] == 0) {
        //If it's a nonzero projection (one is right above the other on y)
        //Just go back to (0, 0, -1) as the towards direction
        T[2] = -1;
    }
    else {
        glMatrix.vec3.normalize(T, T);
    }
    glMatrix.vec3.cross(scene.cam1.right, T, scene.cam1.up);
    glMatrix.vec3.cross(scene.cam2.right, scene.cam2.up, T);
    
    //Now recurse and setup all of the children nodes in the tree
    for (let i = 0; i < scene.children.length; i++) {
        parseNode(scene, scene.children[i]);
    }
    
    //Now that the scene has loaded, setup the glcanvas
    SceneCanvas(glcanvas, 'GLEAT/DrawingUtils', 800, 600, scene);
    requestAnimFrame(glcanvas.repaint);
}

//For debugging
function outputSceneMeshes(node, levelStr) {
    console.log("*" + levelStr + node.mesh);
    if ('children' in node) {
        for (let i = 0; i < node.children.length; i++) {
            outputSceneMeshes(node.children[i], levelStr+"\t");
        }
    }    
}

//////////////////////////////////////////////////////////
///////           RENDERING CODE                //////////
//////////////////////////////////////////////////////////

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
function updateBeaconsPos() {
    let sourcePosE = document.getElementById("sourcePos");
    let receiverPosE = document.getElementById("receiverPos");
    let externalPosE = document.getElementById("externalPos");
    sourcePosE.innerHTML = "<font color = \"blue\">" + vec3StrFixed(glcanvas.scene.source.pos, 2) + "</font>";
    receiverPosE.innerHTML = "<font color = \"red\">" + vec3StrFixed(glcanvas.scene.receiver.pos, 2) + "</font>";
    externalPosE.innerHTML = "<font color = \"green\">" + vec3StrFixed(glcanvas.externalCam.pos, 2) + "</font>";
}

//A function that adds lots of fields to glcanvas for rendering the scene graph
function SceneCanvas(glcanvas, shadersRelPath, pixWidth, pixHeight, scene) {
    console.log("Loaded in mesh hierarchy:");
    for (let i = 0; i < scene.children.length; i++) {
        outputSceneMeshes(scene.children[i], "");
    }

    //Rendering properties   
    glcanvas.drawEdges = true;
    glcanvas.drawImageSources = true;
    glcanvas.drawPaths = true;

    glcanvas.gl = null;
    glcanvas.lastX = 0;
    glcanvas.lastY = 0;
    glcanvas.dragging = false;
    glcanvas.justClicked = false;
    glcanvas.clickType = "LEFT";
    
    //Lighting info
    glcanvas.ambientColor = glMatrix.vec3.fromValues(0.3, 0.3, 0.3);
    glcanvas.light1Pos = glMatrix.vec3.fromValues(0, 0, 0);
    glcanvas.light2Pos = glMatrix.vec3.fromValues(0, 0, -1);
    glcanvas.lightColor = glMatrix.vec3.fromValues(0.9, 0.9, 0.9);
    
    //Scene and camera stuff
    glcanvas.scene = scene;
    glcanvas.scene.source.pixWidth = pixWidth;
    glcanvas.scene.source.pixHeight = pixHeight;
    glcanvas.scene.receiver.pixWidth = pixWidth;
    glcanvas.scene.receiver.pixHeight = pixHeight;
    glcanvas.externalCam = new FPSCamera(pixWidth, pixHeight, 0.75);
    glcanvas.externalCam.pos = glMatrix.vec3.fromValues(0, 1.5, 0);
    glcanvas.walkspeed = 2.5;//How many meters per second
    glcanvas.lastTime = (new Date()).getTime();
    glcanvas.movelr = 0;//Moving left/right
    glcanvas.movefb = 0;//Moving forward/backward
    glcanvas.moveud = 0;//Moving up/down
    glcanvas.camera = glcanvas.externalCam;
    //Meshes for source and receiver
    glcanvas.beaconMesh = getIcosahedronMesh();
    updateBeaconsPos();
    
    /////////////////////////////////////////////////////
    //Step 1: Setup repaint function
    /////////////////////////////////////////////////////
    glcanvas.repaintRecurse = function(node, pMatrix, matrixIn) {
        let mvMatrix = mat4.create();
        mat4.mul(mvMatrix, matrixIn, node.transform);
        if ('mesh' in node) {
            node.mesh.render(glcanvas.gl, glcanvas.shaders, pMatrix, mvMatrix, glcanvas.ambientColor, glcanvas.light1Pos, glcanvas.light2Pos, glcanvas.lightColor, false, glcanvas.drawEdges, false, COLOR_SHADING);
        }
        if ('children' in node) {
            for (let i = 0; i < node.children.length; i++) {
                glcanvas.repaintRecurse(node.children[i], pMatrix, mvMatrix);
            }
        }
    }
    
    glcanvas.repaint = function() {
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
        if (!(glcanvas.camera == glcanvas.scene.receiver)) {
            drawBeacon(glcanvas, pMatrix, mvMatrix, glcanvas.scene.receiver, glcanvas.beaconMesh, glMatrix.vec3.fromValues(1, 0, 0));
        }
        if (!(glcanvas.camera == glcanvas.scene.source)) {
            drawBeacon(glcanvas, pMatrix, mvMatrix, glcanvas.scene.source, glcanvas.beaconMesh, glMatrix.vec3.fromValues(0, 0, 1));
        }
        if (!(glcanvas.camera == glcanvas.externalCam)) {
            drawBeacon(glcanvas, pMatrix, mvMatrix, glcanvas.externalCam, glcanvas.beaconMesh, glMatrix.vec3.fromValues(0, 1, 0));
        }
        
        //Draw the image sources as magenta beacons
        if (glcanvas.drawImageSources) {
            for (let i = 0; i < glcanvas.scene.imsources.length; i++) {
                if (glcanvas.scene.imsources[i] == glcanvas.scene.source) {
                    continue;
                }
                drawBeacon(glcanvas, pMatrix, mvMatrix, glcanvas.scene.imsources[i], glcanvas.beaconMesh, glMatrix.vec3.fromValues(1, 0, 1)); 
            }
        }
        
        //Draw the paths
        if (glcanvas.drawPaths) {
            glcanvas.pathDrawer.repaint(pMatrix, mvMatrix);
        }
        
        //Draw lines and points for debugging
        glcanvas.drawer.reset(); //Clear lines and points drawn last time
        //TODO: Paint debugging stuff here if you'd like
        glcanvas.drawer.repaint(pMatrix, mvMatrix);
        
        //Redraw if walking
        if (glcanvas.movelr != 0 || glcanvas.moveud != 0 || glcanvas.movefb != 0) {
            let thisTime = (new Date()).getTime();
            let dt = (thisTime - glcanvas.lastTime)/1000.0;
            glcanvas.lastTime = thisTime;
            glcanvas.camera.translate(0, 0, glcanvas.movefb, glcanvas.walkspeed*dt);
            glcanvas.camera.translate(0, glcanvas.moveud, 0, glcanvas.walkspeed*dt);
            glcanvas.camera.translate(glcanvas.movelr, 0, 0, glcanvas.walkspeed*dt);
            updateBeaconsPos(); //Update HTML display of vector positions
            requestAnimFrame(glcanvas.repaint);
        }
    }
    
    /////////////////////////////////////////////////////////////////
    //Step 2: Setup mouse and keyboard callbacks for the camera
    /////////////////////////////////////////////////////////////////
    glcanvas.getMousePos = function(evt) {
        let rect = this.getBoundingClientRect();
        return {
            X: evt.clientX - rect.left,
            Y: evt.clientY - rect.top
        };
    }
    
    glcanvas.releaseClick = function(evt) {
        this.dragging = false;
        requestAnimFrame(this.repaint);
        return false;
    } 

    glcanvas.mouseOut = function(evt) {
        this.dragging = false;
        requestAnimFrame(this.repaint);
        return false;
    }
    
    glcanvas.makeClick = function(e) {
        let evt = (e == null ? event:e);
        glcanvas.clickType = "LEFT";
        if (evt.which) {
            if (evt.which == 3) glcanvas.clickType = "RIGHT";
            if (evt.which == 2) glcanvas.clickType = "MIDDLE";
        }
        else if (evt.button) {
            if (evt.button == 2) glcanvas.clickType = "RIGHT";
            if (evt.button == 4) glcanvas.clickType = "MIDDLE";
        }
        this.dragging = true;
        this.justClicked = true;
        let mousePos = this.getMousePos(evt);
        this.lastX = mousePos.X;
        this.lastY = mousePos.Y;
        requestAnimFrame(this.repaint);
        return false;
    } 

    //Mouse handlers for camera
    glcanvas.clickerDragged = function(evt) {
        let mousePos = this.getMousePos(evt);
        let dX = mousePos.X - this.lastX;
        let dY = mousePos.Y - this.lastY;
        this.lastX = mousePos.X;
        this.lastY = mousePos.Y;
        if (this.dragging) {
            //Rotate camera by mouse dragging
            this.camera.rotateLeftRight(-dX);
            this.camera.rotateUpDown(-dY);
            requestAnimFrame(glcanvas.repaint);
        }
        return false;
    }
    
    //Keyboard handlers for camera
    glcanvas.keyDown = function(evt) {
        if (evt.keyCode == 87) { //W
            glcanvas.movefb = 1;
        }
        else if (evt.keyCode == 83) { //S
            glcanvas.movefb = -1;
        }
        else if (evt.keyCode == 65) { //A
            glcanvas.movelr = -1;
        }
        else if (evt.keyCode == 68) { //D
            glcanvas.movelr = 1;
        }
        else if (evt.keyCode == 67) { //C
            glcanvas.moveud = -1;
        }
        else if (evt.keyCode == 69) { //E
            glcanvas.moveud = 1;
        }
        glcanvas.lastTime = (new Date()).getTime();
        requestAnimFrame(glcanvas.repaint);
    }
    
    glcanvas.keyUp = function(evt) {
        if (evt.keyCode == 87) { //W
            glcanvas.movefb = 0;
        }
        else if (evt.keyCode == 83) { //S
            glcanvas.movefb = 0;
        }
        else if (evt.keyCode == 65) { //A
            glcanvas.movelr = 0;
        }
        else if (evt.keyCode == 68) { //D
            glcanvas.movelr = 0;
        }
        else if (evt.keyCode == 67) { //C
            glcanvas.moveud = 0;
        }
        else if (evt.keyCode == 69) { //E
            glcanvas.moveud = 0;
        }
        requestAnimFrame(glcanvas.repaint);
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
    
    glcanvas.drawer = new SimpleDrawer(glcanvas.gl, glcanvas.shaders);//Simple drawer object for debugging
    glcanvas.pathDrawer = new SimpleDrawer(glcanvas.gl, glcanvas.shaders);//For drawing reflection paths
    
}
