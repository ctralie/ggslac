//Purpose: Code to parse and render scene files

//////////////////////////////////////////////////////////
///////         SCENE LOADING CODE              //////////
//////////////////////////////////////////////////////////

var globalFs = 44100;//The global sampling rate of the loaded audio

//Recursive function to load all of the meshes and to 
//put all of the matrix transformations into mat4 objects
function parseNode(node) {
    //Step 1: Make a matrix object for the transformation
    if (!('transform' in node)) {
        //Assume identity matrix if no matrix is provided
        node.transform = mat4.create();
    }
    else if (node.transform.length != 16) {
        console.log("ERROR: 4x4 Transformation matrix must have 16 entries");
        return;
    }
    else {
        //Matrix has been specified in array form an needs to be converted into object
        var m = mat4.create();
        for (var i = 0; i < 16; i++) {
            m[i] = node.transform[i];
        }
        mat4.transpose(m, m);
        node.transform = m;
    }
    
    //Step 2: Load in mesh if there is one in this node (otherwise it's just
    //a dummy node with a transformation)
    if ('mesh' in node) {
        var meshname = node.mesh;
        node.mesh = new PolyMesh();
        d3.text(meshname, function(error, data) {
          console.log("Loading mesh " + meshname);
          if (error) throw error;
          arrayOfLines = data.match(/[^\r\n]+/g);
          node.mesh.loadFileFromLines(arrayOfLines);
          if ('color' in node) {
            for (var i = 0; i < node.mesh.vertices.length; i++) {
                node.mesh.vertices[i].color = node.color;
            }
          }
        });        
    }
    
    if ('children' in node) {
        for (var i = 0; i < node.children.length; i++) {
            parseNode(node.children[i]);
        }
    }
}

function setupScene(scene, glcanvas) {
    //Setup camera objects for the source and receiver
    var rc = new FPSCamera(0, 0, 0.75);
    rc.pos = vec3.fromValues(scene.receiver[0], scene.receiver[1], scene.receiver[2]);
    var sc = new FPSCamera(0, 0, 0.75);
    sc.pos = vec3.fromValues(scene.source[0], scene.source[1], scene.source[2]);
    
    //Make them look roughly at each other but in the XZ plane, if that's a nonzero projection
    var T = vec3.create();
    vec3.subtract(T, sc.pos, rc.pos);
    T[1] = 0;
    if (T[0] == 0 && T[2] == 0) {
        //If it's a nonzero projection (one is right above the other on y)
        //Just go back to (0, 0, -1) as the towards direction
        T[2] = -1;
    }
    else {
        vec3.normalize(T, T);
    }
    vec3.cross(rc.right, T, rc.up);
    vec3.cross(sc.right, sc.up, T);
    //By default, sound doesn't decay at the source and the receiver
    rc.rcoeff = 1.0;
    sc.rcoeff = 1.0;
    scene.receiver = rc;
    scene.source = sc;
    
    //Now recurse and setup all of the children nodes in the tree
    for (var i = 0; i < scene.children.length; i++) {
        parseNode(scene.children[i]);
    }
    
    //By default no paths and no image sources; user chooses when to compute
    scene.imsources = [scene.source];
    scene.paths = [];
    scene.impulseResp = [];//Will hold the discrete impulse response
    
    //Add algorithm functions to this object
    addImageSourcesFunctions(scene);
    
    //Now that the scene has loaded, setup the glcanvas
    SceneCanvas(glcanvas, 'GLEAT/DrawingUtils', 800, 600, scene);
    requestAnimFrame(glcanvas.repaint);
}

function loadSceneFromFile(filename, glcanvas) {
    //Use d3 JSON parser to get the scene data in
    d3.json(filename, function(error, scene) {
        if (error) {
            alert("Error parsing scene file.  Check your JSON syntax");
            throw error;
        }
        setupScene(scene, glcanvas);
        return scene;
    });
}

//For debugging
function outputSceneMeshes(node, levelStr) {
    console.log("*" + levelStr + node.mesh);
    if ('children' in node) {
        for (var i = 0; i < node.children.length; i++) {
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
    mat4.scale(m, m, vec3.fromValues(BEACON_SIZE, BEACON_SIZE, BEACON_SIZE));
    mat4.mul(m, mvMatrix, m);
    mesh.render(glcanvas.gl, glcanvas.shaders, pMatrix, m, color, camera.pos, [0, 0, 0], color, false, false, false, COLOR_SHADING);
}

//Update the beacon positions on the web site
function vec3StrFixed(v, k) {
    return "(" + v[0].toFixed(k) + ", " + v[1].toFixed(2) + ", " + v[2].toFixed(2) + ")";
}
function updateBeaconsPos() {
    var sourcePosE = document.getElementById("sourcePos");
    var receiverPosE = document.getElementById("receiverPos");
    var externalPosE = document.getElementById("externalPos");
    sourcePosE.innerHTML = "<font color = \"blue\">" + vec3StrFixed(glcanvas.scene.source.pos, 2) + "</font>";
    receiverPosE.innerHTML = "<font color = \"red\">" + vec3StrFixed(glcanvas.scene.receiver.pos, 2) + "</font>";
    externalPosE.innerHTML = "<font color = \"green\">" + vec3StrFixed(glcanvas.externalCam.pos, 2) + "</font>";
}

//A function that adds lots of fields to glcanvas for rendering the scene graph
function SceneCanvas(glcanvas, shadersRelPath, pixWidth, pixHeight, scene) {
    console.log("Loaded in mesh hierarchy:");
    for (var i = 0; i < scene.children.length; i++) {
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
    glcanvas.ambientColor = vec3.fromValues(0.3, 0.3, 0.3);
    glcanvas.light1Pos = vec3.fromValues(0, 0, 0);
    glcanvas.light2Pos = vec3.fromValues(0, 0, -1);
    glcanvas.lightColor = vec3.fromValues(0.9, 0.9, 0.9);
    
    //Scene and camera stuff
    glcanvas.scene = scene;
    glcanvas.scene.source.pixWidth = pixWidth;
    glcanvas.scene.source.pixHeight = pixHeight;
    glcanvas.scene.receiver.pixWidth = pixWidth;
    glcanvas.scene.receiver.pixHeight = pixHeight;
    glcanvas.externalCam = new FPSCamera(pixWidth, pixHeight, 0.75);
    glcanvas.externalCam.pos = vec3.fromValues(0, 1.5, 0);
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
        var mvMatrix = mat4.create();
        mat4.mul(mvMatrix, matrixIn, node.transform);
        if ('mesh' in node) {
            node.mesh.render(glcanvas.gl, glcanvas.shaders, pMatrix, mvMatrix, glcanvas.ambientColor, glcanvas.light1Pos, glcanvas.light2Pos, glcanvas.lightColor, false, glcanvas.drawEdges, false, COLOR_SHADING);
        }
        if ('children' in node) {
            for (var i = 0; i < node.children.length; i++) {
                glcanvas.repaintRecurse(node.children[i], pMatrix, mvMatrix);
            }
        }
    }
    
    glcanvas.repaint = function() {
        glcanvas.light1Pos = glcanvas.camera.pos;
        glcanvas.gl.viewport(0, 0, glcanvas.gl.viewportWidth, glcanvas.gl.viewportHeight);
        glcanvas.gl.clear(glcanvas.gl.COLOR_BUFFER_BIT | glcanvas.gl.DEPTH_BUFFER_BIT);
        
        var pMatrix = mat4.create();
        mat4.perspective(pMatrix, 45, glcanvas.gl.viewportWidth / glcanvas.gl.viewportHeight, 0.01, 1000.0);
        //First get the global modelview matrix based on the camera
        var mvMatrix = glcanvas.camera.getMVMatrix();
        //Then drawn the scene
        var scene = glcanvas.scene;
        if ('children' in scene) {
            for (var i = 0; i < scene.children.length; i++) {
                glcanvas.repaintRecurse(scene.children[i], pMatrix, mvMatrix);
            }
        }
        
        //Draw the source, receiver, and third camera
        if (!(glcanvas.camera == glcanvas.scene.receiver)) {
            drawBeacon(glcanvas, pMatrix, mvMatrix, glcanvas.scene.receiver, glcanvas.beaconMesh, vec3.fromValues(1, 0, 0));
        }
        if (!(glcanvas.camera == glcanvas.scene.source)) {
            drawBeacon(glcanvas, pMatrix, mvMatrix, glcanvas.scene.source, glcanvas.beaconMesh, vec3.fromValues(0, 0, 1));
        }
        if (!(glcanvas.camera == glcanvas.externalCam)) {
            drawBeacon(glcanvas, pMatrix, mvMatrix, glcanvas.externalCam, glcanvas.beaconMesh, vec3.fromValues(0, 1, 0));
        }
        
        //Draw the image sources as magenta beacons
        if (glcanvas.drawImageSources) {
            for (var i = 0; i < glcanvas.scene.imsources.length; i++) {
                if (glcanvas.scene.imsources[i] == glcanvas.scene.source) {
                    continue;
                }
                drawBeacon(glcanvas, pMatrix, mvMatrix, glcanvas.scene.imsources[i], glcanvas.beaconMesh, vec3.fromValues(1, 0, 1)); 
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
            var thisTime = (new Date()).getTime();
            var dt = (thisTime - glcanvas.lastTime)/1000.0;
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
        var rect = this.getBoundingClientRect();
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
        var evt = (e == null ? event:e);
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
        var mousePos = this.getMousePos(evt);
        this.lastX = mousePos.X;
        this.lastY = mousePos.Y;
        requestAnimFrame(this.repaint);
        return false;
    } 

    //Mouse handlers for camera
    glcanvas.clickerDragged = function(evt) {
        var mousePos = this.getMousePos(evt);
        var dX = mousePos.X - this.lastX;
        var dY = mousePos.Y - this.lastY;
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
    glcanvas.viewFromSource = function() {
        glcanvas.camera = glcanvas.scene.source;
        requestAnimFrame(glcanvas.repaint);
    }
    
    glcanvas.viewFromReceiver = function() {
        glcanvas.camera = glcanvas.scene.receiver;
        requestAnimFrame(glcanvas.repaint);
    }

    glcanvas.viewFromExternal = function() {
        glcanvas.camera = glcanvas.externalCam;
        requestAnimFrame(glcanvas.repaint);
    }
    
    glcanvas.computeImageSources = function(order) {
        console.log("Computing image sources of order " + order);
        glcanvas.scene.computeImageSources(order);
        requestAnimFrame(glcanvas.repaint);
    }
    
    glcanvas.extractPaths = function() {
        console.log("Extracting paths source to receiver");
        glcanvas.scene.extractPaths();
        //Fill in buffers for path drawer
        glcanvas.pathDrawer.reset();
        for (var i = 0; i < glcanvas.scene.paths.length; i++) {
            var path = glcanvas.scene.paths[i];
            for (var j = 0; j < path.length-1; j++) {
                //Draw all of the paths as a sequence of red line segments
                glcanvas.pathDrawer.drawLine(path[j].pos, path[j+1].pos, vec3.fromValues(1, 0, 0));
            }
        }
        requestAnimFrame(glcanvas.repaint);
    }

    glcanvas.computeImpulseResponse = function() {
        console.log("Computing impulse response");
        //Step 1: Call student code
        glcanvas.scene.computeImpulseResponse(globalFs);
        if (scene.impulseResp.length == 0) {
            return; //Student hasn't filled in yet.  Exit gracefully
        }
        
        //Step 2: Plot the impulse response as a stem plot with milliseconds on the x-axis
        //and magnitude on the y-axis
        console.log("impulseResp.length = " + scene.impulseResp.length);
        data = [];
        for (var i = 0; i < scene.impulseResp.length; i++) {
            var gamma = scene.impulseResp[i];
            if (gamma > 0) {
                data.push({x:[1000*i/globalFs, 1000*i/globalFs], y:[0, gamma], mode:'lines+markers'});
            }
        }
        Plotly.newPlot('impulsePlot', data, {xaxis:{title:'Time (Milliseconds)'}, yaxis:{title:'Magnitude'}});
        
        //Step 3: Create a new audio buffer and copy over the data
        //https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createBuffer
        impbuffer = context.createBuffer(1, scene.impulseResp.length, globalFs);
        var impsamples = impbuffer.getChannelData(0);
        for (var i = 0; i < scene.impulseResp.length; i++) {
            impsamples[i] = scene.impulseResp[i];
        }
        requestAnimFrame(glcanvas.repaint);
    }



    /////////////////////////////////////////////////////
    //Step 4: Initialize Web GL
    /////////////////////////////////////////////////////
    glcanvas.addEventListener('mousedown', glcanvas.makeClick);
    glcanvas.addEventListener('mouseup', glcanvas.releaseClick);
    glcanvas.addEventListener('mousemove', glcanvas.clickerDragged);
    glcanvas.addEventListener('mouseout', glcanvas.mouseOut);

    //Support for mobile devices
    glcanvas.addEventListener('touchstart', glcanvas.makeClick);
    glcanvas.addEventListener('touchend', glcanvas.releaseClick);
    glcanvas.addEventListener('touchmove', glcanvas.clickerDragged);

    //Keyboard listener
    var medadiv = document.getElementById('metadiv');
    document.addEventListener('keydown', glcanvas.keyDown, true);
    document.addEventListener('keyup', glcanvas.keyUp, true);

    try {
        //this.gl = WebGLDebugUtils.makeDebugContext(this.glcanvas.getContext("experimental-webgl"));
        glcanvas.gl = glcanvas.getContext("experimental-webgl");
        glcanvas.gl.viewportWidth = glcanvas.width;
        glcanvas.gl.viewportHeight = glcanvas.height;
    } catch (e) {
        console.log(e);
    }
    if (!glcanvas.gl) {
        alert("Could not initialise WebGL, sorry :-(.  Try a new version of chrome or firefox and make sure your newest graphics drivers are installed");
    }
    glcanvas.shaders = initShaders(glcanvas.gl, shadersRelPath);
    
    glcanvas.drawer = new SimpleDrawer(glcanvas.gl, glcanvas.shaders);//Simple drawer object for debugging
    glcanvas.pathDrawer = new SimpleDrawer(glcanvas.gl, glcanvas.shaders);//For drawing reflection paths
    
    glcanvas.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    glcanvas.gl.enable(glcanvas.gl.DEPTH_TEST);
    
    glcanvas.gl.useProgram(glcanvas.shaders.colorShader);
    requestAnimFrame(glcanvas.repaint);
}
