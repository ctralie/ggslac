/**
 * A function that adds lots of fields to glcanvas for rendering
 * and interaction.  This serves as the superclass for other more
 * specific kinds of viewers
 * @param {DOM Element} glcanvas Handle to HTML where the glcanvas resides
 * @param {string} shadersrelpath Path to the folder that contains the shaders,
 *                                relative to where the constructor is being called
 */
function BaseCanvas(glcanvas, shadersrelpath) {
    glcanvas.gl = null;

    // Mouse variables
    glcanvas.lastX = 0;
    glcanvas.lastY = 0;
    glcanvas.dragging = false;
    glcanvas.justClicked = false;
    glcanvas.clickType = "LEFT";

    // Keyboard variables
    glcanvas.walkspeed = 2.5;//How many meters per second
    glcanvas.lastTime = (new Date()).getTime();
    glcanvas.movelr = 0;//Moving left/right
    glcanvas.movefb = 0;//Moving forward/backward
    glcanvas.moveud = 0;//Moving up/down
    
    //Lighting info
    glcanvas.ambientColor = glMatrix.vec3.fromValues(0.1, 0.1, 0.1);
    glcanvas.light1Pos = glMatrix.vec3.fromValues(0, 0, 0);
    glcanvas.light2Pos = glMatrix.vec3.fromValues(0, 0, -1);
    glcanvas.lightColor = glMatrix.vec3.fromValues(0.9, 0.9, 0.9);
    
    //User choices
    glcanvas.drawNormals = false;
    glcanvas.drawEdges = true;
    glcanvas.drawPoints = false;
    
    
    glcanvas.repaint = function() {
        // Dummy function for base canvas, which should be
        // overwritten for subclasses
    }

    /////////////////////////////////////////////////////
    //Step 1: Setup mouse callbacks
    /////////////////////////////////////////////////////
    glcanvas.getMousePos = function(evt) {
        if ('touches' in evt) {
            return {
                X: evt.touches[0].clientX,
                Y: evt.touches[1].clientY
            }
        }
        return {
            X: evt.clientX,
            Y: evt.clientY
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
    
    glcanvas.makeClick = function(e) {
        let evt = (e == null ? event:e);
        glcanvas.clickType = "LEFT";
        evt.preventDefault();
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

    //http://www.w3schools.com/jsref/dom_obj_event.asp
    glcanvas.clickerDragged = function(evt) {
        evt.preventDefault();
        let mousePos = this.getMousePos(evt);
        let dX = mousePos.X - this.lastX;
        let dY = mousePos.Y - this.lastY;
        this.lastX = mousePos.X;
        this.lastY = mousePos.Y;
        if (this.camera === null) {
            return;
        }
        if (this.dragging && this.camera.type == "polar") {
            //Translate/rotate shape
            if (glcanvas.clickType == "MIDDLE") {
                this.camera.translate(dX, -dY);
            }
            else if (glcanvas.clickType == "RIGHT") { //Right click
                this.camera.zoom(dY); //Want to zoom in as the mouse goes up
            }
            else if (glcanvas.clickType == "LEFT") {
                this.camera.orbitLeftRight(dX);
                this.camera.orbitUpDown(-dY);
            }
            requestAnimFrame(this.repaint);
        }
        else if (this.dragging && this.camera.type == "fps") {
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
        let renderbuffer = this.gl.createRenderbuffer();
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

    //Keyboard listener
    document.addEventListener('keydown', glcanvas.keyDown, true);
    document.addEventListener('keyup', glcanvas.keyUp, true);

    try {
        //this.gl = WebGLDebugUtils.makeDebugContext(this.glcanvas.getContext("experimental-webgl"));
        glcanvas.gl = glcanvas.getContext("webgl");
        glcanvas.gl.viewportWidth = glcanvas.width;
        glcanvas.gl.viewportHeight = glcanvas.height;
    } catch (e) {
        console.log(e);
    }
    if (!glcanvas.gl) {
        alert("Could not initialise WebGL, sorry :-(.  Try a new version of chrome or firefox and make sure your newest graphics drivers are installed");
    }
    glcanvas.shaders = Shaders.initStandardShaders(glcanvas.gl, shadersrelpath);
    //glcanvas.initPickingFramebuffer();

    glcanvas.camera = null;
    glcanvas.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    glcanvas.gl.enable(glcanvas.gl.DEPTH_TEST);
}
