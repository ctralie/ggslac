/**
 * A class for 3D rendering and interaction.  This serves as the superclass 
 * for other, more specific kinds of viewers
 */
class BaseCanvas {
    /**
     * @param {DOM Element} glcanvas Handle to HTML where the glcanvas resides
     * @param {string} shadersrelpath Path to the folder that contains the shaders,
     *                                relative to where the constructor is being called
     * @param {antialias} boolean Whether antialiasing is enabled (true by default)
     */
    constructor(glcanvas, shadersrelpath, antialias) {
        this.glcanvas = glcanvas;
        this.clientWidth = glcanvas.clientWidth;
        this.clientHeight = glcanvas.clientHeight;
        if (antialias === undefined) {
            antialias = true;
        }
        this.antialias = antialias;

        //Lighting info
        this.lights = [{'pos':[0, 0, 0], 'color':[1, 1, 1], 'atten':[1, 0, 0]}];
        this.ambientColor = glMatrix.vec3.fromValues(0.1, 0.1, 0.1);
        
        //User choices
        this.drawNormals = false;
        this.drawEdges = true;
        this.drawPoints = false;

        this.initializeCallbacks();
        this.initializeGL(shadersrelpath);
    }

    /**
     * Initialize the mouse/keyboard callbacks and relevant variables
     */
    initializeCallbacks() {
        // Mouse variables
        this.lastX = 0;
        this.lastY = 0;
        this.dragging = false;
        this.justClicked = false;
        this.invertYAxis = false;
        this.clickType = "LEFT";
    
        // Keyboard variables
        this.walkspeed = 2.5;//How many meters per second
        this.lastTime = (new Date()).getTime();
        this.movelr = 0;//Moving left/right
        this.movefb = 0;//Moving forward/backward
        this.moveud = 0;//Moving up/down

        let glcanvas = this.glcanvas;
        glcanvas.addEventListener('mousedown', this.makeClick.bind(this));
        glcanvas.addEventListener('mouseup', this.releaseClick.bind(this));
        glcanvas.addEventListener('mousemove', this.clickerDragged.bind(this));
        glcanvas.addEventListener('mouseout', this.mouseOut.bind(this));

        //Support for mobile devices
        glcanvas.addEventListener('touchstart', this.makeClick.bind(this));
        glcanvas.addEventListener('touchend', this.releaseClick.bind(this));
        glcanvas.addEventListener('touchmove', this.clickerDragged.bind(this));

        //Keyboard listener
        this.keysDown = {87:false, 83:false, 65:false, 68:false, 67:false, 69:false};
        document.addEventListener('keydown', this.keyDown.bind(this), true);
        document.addEventListener('keyup', this.keyUp.bind(this), true);

    }
    
    /**
     * Initialize everything pertaining to WebGL
     * @param {string} shadersrelpath Path to the folder that contains the shaders,
     *                                relative to where the constructor is being called
     */
    initializeGL(shadersrelpath) {
        this.gl = null;
        this.pickingFramebuffer = null;
        this.pickingTexture = null;

        try {
            //this.gl = WebGLDebugUtils.makeDebugContext(this.glcanvas.getContext("experimental-webgl"));
            this.gl = this.glcanvas.getContext("webgl", {"antialias":this.antialias});
            this.gl.viewportWidth = this.glcanvas.width;
            this.gl.viewportHeight = this.glcanvas.height;
        } catch (e) {
            console.log(e);
        }
        if (!this.gl) {
            alert("Could not initialise WebGL, sorry :-(.  Try a new version of chrome or firefox and make sure your newest graphics drivers are installed");
        }
        if (!(shadersrelpath === undefined)) {
            this.shaders = Shaders.initStandardShaders(this.gl, shadersrelpath);
        }
        this.initPickingFramebuffer();

        this.camera = null;
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.active = true;
        this.repaintOnInteract = true;
    }

    /**
     * Initialize a framebuffer used for old school picking
     * (this is a work in progress)
     */
    initPickingFramebuffer() {
        this.pickingFramebuffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.pickingFramebuffer);
        this.pickingFramebuffer.width = this.width;
        this.pickingFramebuffer.height = this.height;
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
    
    /**
     * Dummy function for base canvas, which should be
     * overwritten for subclasses
     */
    repaint() {
        throw "repaint() from base class, which is not implemented";
    }

    /////////////////////////////////////////////////////
    //                MOUSE CALLBACKS                  //
    /////////////////////////////////////////////////////

    /**
     * Extract x/y position from a mouse event
     * @param {mouse event} evt 
     * @returns {object} The X/Y coordinates
     */
    getMousePos(evt) {
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
    
    /**
     * React to a click being released
     * @param {mouse event} evt 
     */
    releaseClick(evt) {
        evt.preventDefault();
        this.dragging = false;
        if (this.repaintOnInteract) {
            requestAnimFrame(this.repaint.bind(this));
        }
        return false;
    } 

    /**
     * React to a mouse leaving the window
     * @param {mouse event} evt 
     */
    mouseOut(evt) {
        this.dragging = false;
        if (this.repaintOnInteract) {
            requestAnimFrame(this.repaint.bind(this));
        }
        return false;
    }
    
    /**
     * React to a click happening
     * @param {mouse event} e
     */
    makeClick(e) {
        let evt = (e == null ? event:e);
        this.clickType = "LEFT";
        evt.preventDefault();
        if (evt.which) {
            if (evt.which == 3) this.clickType = "RIGHT";
            if (evt.which == 2) this.clickType = "MIDDLE";
        }
        else if (evt.button) {
            if (evt.button == 2) this.clickType = "RIGHT";
            if (evt.button == 4) this.clickType = "MIDDLE";
        }
        this.dragging = true;
        this.justClicked = true;
        let mousePos = this.getMousePos(evt);
        this.lastX = mousePos.X;
        this.lastY = mousePos.Y;
        if (this.repaintOnInteract) {
            requestAnimFrame(this.repaint.bind(this));
        }
        return false;
    } 

    /**
     * React to a mouse being dragged
     * @param {mouse event} evt 
     */
    clickerDragged(evt) {
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
            if (this.clickType == "MIDDLE") {
                this.camera.translate(dX, -dY);
            }
            else if (this.clickType == "RIGHT") { //Right click
                this.camera.zoom(dY); //Want to zoom in as the mouse goes up
            }
            else if (this.clickType == "LEFT") {
                this.camera.orbitLeftRight(dX);
                this.camera.orbitUpDown(-dY);
            }
            if (this.repaintOnInteract) {
                requestAnimFrame(this.repaint.bind(this));
            }
        }
        else if (this.dragging && this.camera.type == "fps") {
            //Rotate camera by mouse dragging
            this.camera.rotateLeftRight(-dX);
            if (this.invertYAxis) {
                this.camera.rotateUpDown(dY);
            }
            else {
                this.camera.rotateUpDown(-dY);
            }
            let noKeysPressing = true;
            for (let name in this.keysDown) {
                if (Object.prototype.hasOwnProperty.call(this.keysDown, name)) {
                    if (this.keysDown[name]) {
                        noKeysPressing = false;
                        break;
                    }
                }
            }
            if (noKeysPressing && this.repaintOnInteract) {
                requestAnimFrame(this.repaint.bind(this));
            }
        }
        return false;
    }

    /////////////////////////////////////////////////////
    //             KEYBOARD CALLBACKS                  //
    /////////////////////////////////////////////////////

    /**
     * React to a key being pressed
     * @param {keyboard callback} evt 
     */
    keyDown(evt) {
        if (!this.active) {
            return;
        }
        let newKeyDown = false;
        if (evt.keyCode == 87) { //W
            if (!this.keysDown[87]) {
                newKeyDown = true;
                this.keysDown[87] = true;
                this.movefb = 1;
            }
        }
        else if (evt.keyCode == 83) { //S
            if (!this.keysDown[83]) {
                newKeyDown = true;
                this.keysDown[83] = true;
                this.movefb = -1;
            }
        }
        else if (evt.keyCode == 65) { //A
            if (!this.keysDown[65]) {
                newKeyDown = true;
                this.keysDown[65] = true;
                this.movelr = -1;
            }
        }
        else if (evt.keyCode == 68) { //D
            if (!this.keysDown[68]) {
                newKeyDown = true;
                this.keysDown[68] = true;
                this.movelr = 1;
            }
        }
        else if (evt.keyCode == 67) { //C
            if (!this.keysDown[67]) {
                newKeyDown = true;
                this.keysDown[67] = true;
                this.moveud = -1;
            }
        }
        else if (evt.keyCode == 69) { //E
            if (!this.keysDown[69]) {
                newKeyDown = true;
                this.keysDown[69] = true;
                this.moveud = 1;
            }
        }
        this.lastTime = (new Date()).getTime();
        if (newKeyDown && this.repaintOnInteract) {
            requestAnimFrame(this.repaint.bind(this));
        }
    }
    
    /**
     * React to a key being released
     * @param {keyboard callback} evt 
     */
    keyUp(evt) {
        if (!this.active) {
            return;
        }
        if (evt.keyCode == 87) { //W
            this.movefb = 0;
            this.keysDown[87] = false;
        }
        else if (evt.keyCode == 83) { //S
            this.movefb = 0;
            this.keysDown[83] = false;
        }
        else if (evt.keyCode == 65) { //A
            this.movelr = 0;
            this.keysDown[65] = false;
        }
        else if (evt.keyCode == 68) { //D
            this.movelr = 0;
            this.keysDown[68] = false;
        }
        else if (evt.keyCode == 67) { //C
            this.moveud = 0;
            this.keysDown[67] = false;
        }
        else if (evt.keyCode == 69) { //E
            this.moveud = 0;
            this.keysDown[69] = false;
        }
    }    
}