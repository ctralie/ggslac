//A function that adds lots of fields to glcanvas for meshes and rendering
function HalfEdgeMeshCanvas(glcanvas) {
    glcanvas.gl = null;
    glcanvas.lastX = 0;
    glcanvas.lastY = 0;
    glcanvas.dragging = false;
    glcanvas.justClicked = false;
    glcanvas.camera = new MousePolarCamera(glcanvas.width, glcanvas.height, 0.75);
    glcanvas.mesh = new HalfEdgeMesh();
    
    //Lighting info
    glcanvas.ambientColor = vec3.fromValues(0.1, 0.1, 0.1);
    glcanvas.light1Pos = vec3.fromValues(0, 0, 0);
    glcanvas.light2Pos = vec3.fromValues(0, 0, -1);
    glcanvas.lightColor = vec3.fromValues(0.9, 0.9, 0.9);
    
    /////////////////////////////////////////////////////
    //Step 1: Setup repaint function
    /////////////////////////////////////////////////////    
    glcanvas.repaint = function() {
        glcanvas.gl.viewport(0, 0, glcanvas.gl.viewportWidth, glcanvas.gl.viewportHeight);
        glcanvas.gl.clear(glcanvas.gl.COLOR_BUFFER_BIT | glcanvas.gl.DEPTH_BUFFER_BIT);
        
        var pMatrix = mat4.create();
        mat4.perspective(pMatrix, 45, glcanvas.gl.viewportWidth / glcanvas.gl.viewportHeight, glcanvas.camera.R/100.0, glcanvas.camera.R*2);
        var mvMatrix = glcanvas.camera.getMVMatrix();    
        glcanvas.mesh.render(glcanvas.gl, colorShader, pMatrix, mvMatrix, glcanvas.ambientColor, glcanvas.light1Pos, glcanvas.light2Pos, glcanvas.lightColor);
    }
    
    /////////////////////////////////////////////////////
    //Step 2: Setup mouse callbacks
    /////////////////////////////////////////////////////
    glcanvas.getMousePos = function(evt) {
        var rect = this.getBoundingClientRect();
        return {
            X: evt.clientX - rect.left,
            Y: evt.clientY - rect.top
        };
    }
    
    glcanvas.releaseClick = function(evt) {
        evt.preventDefault();
        this.dragging = false;
        requestAnimFrame(this.repaint);
        return false;
    } 

    glcanvas.mouseOut = function(evt) {
        this.dragging = false;
        requestAnimFrame(this.repaint);
        return false;
    }
    
    glcanvas.makeClick = function(evt) {
        evt.preventDefault();
        this.dragging = true;
        this.justClicked = true;
        var mousePos = this.getMousePos(evt);
        this.lastX = mousePos.X;
        this.lastY = mousePos.Y;
        requestAnimFrame(this.repaint);
        return false;
    } 

    //http://www.w3schools.com/jsref/dom_obj_event.asp
    glcanvas.clickerDragged = function(evt) {
        evt.preventDefault();
        var mousePos = this.getMousePos(evt);
        var dX = mousePos.X - this.lastX;
        var dY = mousePos.Y - this.lastY;
        this.lastX = mousePos.X;
        this.lastY = mousePos.Y;
        if (this.dragging) {
            var button = 0;
            if ("which" in evt) {
                button = evt.which;
            }
            else {
                button = evt.button;
            }
            button = 0;//TODO: Fix this (get right/center click working)
            //Translate/rotate shape
            if (button == 1) { //Center click
                this.camera.translate(dX, -dY);
            }
            else if (button == 2) { //Right click
                this.camera.zoom(-dY); //Want to zoom in as the mouse goes up
            }
            else if (button == 0) {
                this.camera.orbitLeftRight(dX);
                this.camera.orbitUpDown(-dY);
            }
            requestAnimFrame(this.repaint);
        }
        return false;
    }    
    
    glcanvas.centerCamera = function() {
        this.camera.centerOnMesh(this.mesh);
    }
    
    /////////////////////////////////////////////////////
    //Step 3: Initialize offscreen rendering for picking
    /////////////////////////////////////////////////////
    //https://github.com/gpjt/webgl-lessons/blob/master/lesson16/index.html
    glcanvas.pickingFramebuffer = null;
    glcanvas.pickingTexture = null;
    glcanvas.initPickingFramebuffer = function() {
        this.pickingFramebuffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.pickingFramebuffer);
        this.pickingFramebuffer.width = this.glcanvas.width;
        this.pickingFramebuffer.height = this.glcanvas.height;
        this.pickingTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.pickingTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.pickingFramebuffer.width, this.pickingFramebuffer.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        var renderbuffer = this.gl.createRenderbuffer();
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, renderbuffer);
        this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this.pickingFramebuffer.width, this.pickingFramebuffer.height);
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.pickingTexture, 0);
        this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, renderbuffer);
        this.gl.bindTexture(this.gl.TEXTURE_2D, null);
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
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
    initShaders(glcanvas.gl, ".");
    //glcanvas.initPickingFramebuffer();

    glcanvas.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    glcanvas.gl.enable(glcanvas.gl.DEPTH_TEST);
    
    glcanvas.gl.useProgram(colorShader);
    requestAnimFrame(glcanvas.repaint);
}
