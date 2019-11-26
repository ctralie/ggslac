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
    glcanvas.lights = [{'pos':[0, 0, 0], 'color':[1, 1, 1], 'atten':[1, 0, 0]}];
    glcanvas.ambientColor = glMatrix.vec3.fromValues(0.1, 0.1, 0.1);
    
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
        if (glcanvas.repaintOnInteract) {
            requestAnimFrame(this.repaint);
        }
        return false;
    } 

    glcanvas.mouseOut = function(evt) {
        this.dragging = false;
        if (glcanvas.repaintOnInteract) {
            requestAnimFrame(this.repaint);
        }
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
        if (glcanvas.repaintOnInteract) {
            requestAnimFrame(this.repaint);
        }
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
            if (glcanvas.repaintOnInteract) {
                requestAnimFrame(this.repaint);
            }
        }
        else if (this.dragging && this.camera.type == "fps") {
            //Rotate camera by mouse dragging
            this.camera.rotateLeftRight(-dX);
            this.camera.rotateUpDown(-dY);
            let noKeysPressing = true;
            for (let name in glcanvas.keysDown) {
                if (Object.prototype.hasOwnProperty.call(glcanvas.keysDown, name)) {
                    if (glcanvas.keysDown[name]) {
                        noKeysPressing = false;
                        break;
                    }
                }
            }
            if (noKeysPressing && glcanvas.repaintOnInteract) {
                requestAnimFrame(glcanvas.repaint);
            }
        }
        return false;
    }

    //Keyboard handlers for camera
    glcanvas.keyDown = function(evt) {
        if (!glcanvas.active) {
            return;
        }
        let newKeyDown = false;
        if (evt.keyCode == 87) { //W
            if (!glcanvas.keysDown[87]) {
                newKeyDown = true;
                glcanvas.keysDown[87] = true;
                glcanvas.movefb = 1;
            }
        }
        else if (evt.keyCode == 83) { //S
            if (!glcanvas.keysDown[83]) {
                newKeyDown = true;
                glcanvas.keysDown[83] = true;
                glcanvas.movefb = -1;
            }
        }
        else if (evt.keyCode == 65) { //A
            if (!glcanvas.keysDown[65]) {
                newKeyDown = true;
                glcanvas.keysDown[65] = true;
                glcanvas.movelr = -1;
            }
        }
        else if (evt.keyCode == 68) { //D
            if (!glcanvas.keysDown[68]) {
                newKeyDown = true;
                glcanvas.keysDown[68] = true;
                glcanvas.movelr = 1;
            }
        }
        else if (evt.keyCode == 67) { //C
            if (!glcanvas.keysDown[67]) {
                newKeyDown = true;
                glcanvas.keysDown[67] = true;
                glcanvas.moveud = -1;
            }
        }
        else if (evt.keyCode == 69) { //E
            if (!glcanvas.keysDown[69]) {
                newKeyDown = true;
                glcanvas.keysDown[69] = true;
                glcanvas.moveud = 1;
            }
        }
        glcanvas.lastTime = (new Date()).getTime();
        if (newKeyDown && glcanvas.repaintOnInteract) {
            requestAnimFrame(glcanvas.repaint);
        }
    }
    
    glcanvas.keyUp = function(evt) {
        if (!glcanvas.active) {
            return;
        }
        if (evt.keyCode == 87) { //W
            glcanvas.movefb = 0;
            glcanvas.keysDown[87] = false;
        }
        else if (evt.keyCode == 83) { //S
            glcanvas.movefb = 0;
            glcanvas.keysDown[83] = false;
        }
        else if (evt.keyCode == 65) { //A
            glcanvas.movelr = 0;
            glcanvas.keysDown[65] = false;
        }
        else if (evt.keyCode == 68) { //D
            glcanvas.movelr = 0;
            glcanvas.keysDown[68] = false;
        }
        else if (evt.keyCode == 67) { //C
            glcanvas.moveud = 0;
            glcanvas.keysDown[67] = false;
        }
        else if (evt.keyCode == 69) { //E
            glcanvas.moveud = 0;
            glcanvas.keysDown[69] = false;
        }
    }    
    
    /////////////////////////////////////////////////////
    //Step 3: Initialize offscreen rendering for picking
    /////////////////////////////////////////////////////
    //https://github.com/gpjt/webgl-lessons/blob/master/lesson16/index.html
    glcanvas.pickingFramebuffer = null;
    glcanvas.pickingTexture = null;
    glcanvas.initPickingFramebuffer = function() {
        glcanvas.pickingFramebuffer = glcanvas.gl.createFramebuffer();
        glcanvas.gl.bindFramebuffer(glcanvas.gl.FRAMEBUFFER, glcanvas.pickingFramebuffer);
        glcanvas.pickingFramebuffer.width = glcanvas.width;
        glcanvas.pickingFramebuffer.height = glcanvas.height;
        glcanvas.pickingTexture = glcanvas.gl.createTexture();
        glcanvas.gl.bindTexture(glcanvas.gl.TEXTURE_2D, glcanvas.pickingTexture);
        glcanvas.gl.texImage2D(glcanvas.gl.TEXTURE_2D, 0, glcanvas.gl.RGBA, glcanvas.pickingFramebuffer.width, glcanvas.pickingFramebuffer.height, 0, glcanvas.gl.RGBA, glcanvas.gl.UNSIGNED_BYTE, null);
        let renderbuffer = glcanvas.gl.createRenderbuffer();
        glcanvas.gl.bindRenderbuffer(glcanvas.gl.RENDERBUFFER, renderbuffer);
        glcanvas.gl.renderbufferStorage(glcanvas.gl.RENDERBUFFER, glcanvas.gl.DEPTH_COMPONENT16, glcanvas.pickingFramebuffer.width, glcanvas.pickingFramebuffer.height);
        glcanvas.gl.framebufferTexture2D(glcanvas.gl.FRAMEBUFFER, glcanvas.gl.COLOR_ATTACHMENT0, glcanvas.gl.TEXTURE_2D, glcanvas.pickingTexture, 0);
        glcanvas.gl.framebufferRenderbuffer(glcanvas.gl.FRAMEBUFFER, glcanvas.gl.DEPTH_ATTACHMENT, glcanvas.gl.RENDERBUFFER, renderbuffer);
        glcanvas.gl.bindTexture(glcanvas.gl.TEXTURE_2D, null);
        glcanvas.gl.bindRenderbuffer(glcanvas.gl.RENDERBUFFER, null);
        glcanvas.gl.bindFramebuffer(glcanvas.gl.FRAMEBUFFER, null);
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
    glcanvas.keysDown = {87:false, 83:false, 65:false, 68:false, 67:false, 69:false};
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
    if (!(shadersrelpath === undefined)) {
        glcanvas.shaders = Shaders.initStandardShaders(glcanvas.gl, shadersrelpath);
    }
    glcanvas.initPickingFramebuffer();

    glcanvas.camera = null;
    glcanvas.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    glcanvas.gl.enable(glcanvas.gl.DEPTH_TEST);
    glcanvas.active = true;
    glcanvas.repaintOnInteract = true;
}
