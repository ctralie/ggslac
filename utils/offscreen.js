/**
 * A class for storing the shader program and buffers for rendering
 * a texture mapped square
 */
class OffscreenRender {
    constructor(otherCanvas, shadersrelpath) {
        this.otherCanvas = otherCanvas;

        // Create an offscreen canvas
        let glcanvas = document.createElement("canvas");
        glcanvas.width = otherCanvas.clientWidth;
        glcanvas.height = otherCanvas.clientHeight;
        try {
            glcanvas.gl = glcanvas.getContext("webgl");
            glcanvas.gl.viewportWidth = glcanvas.width;
            glcanvas.gl.viewportHeight = glcanvas.height;
            this.glcanvas = glcanvas;
        } catch (e) {
            alert("WebGL Error");
            console.log(e);
        }

        // Initialize shaders for this offscreen drawer
        if (!(shadersrelpath === undefined)) {
            this.shaders = Shaders.initStandardShaders(glcanvas.gl, shadersrelpath);
        }
        // Initialize gl texture object
        this.texture = glcanvas.gl.createTexture();
    }

    /**
     * Initialize a texture and load an image.
     * When the image finished loading copy it into the texture.
     *
     * @param {String} url path to texture
     */
    updateTexture() {
        let gl = this.glcanvas.gl;
        let texture = this.texture;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.otherCanvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.generateMipmap(gl.TEXTURE_2D);		
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    /**
     * Setup the buffers for a particular shader
     * @param {object} shader Handle to a shader/promise. Assumed shader has been loaded
     * as part of this gl context
     */
    setupShader(shader) {
        let that = this;
        if (!('ready' in shader)) {
            shader.then(function() {
                that.setupShader(shader);
            })
        }
        else {
            this.shader = shader;
            let buffers = {};
            // Setup position buffers to hold a square
            const positions = new Float32Array([-1.0,  1.0,
                                                1.0,  1.0,
                                                -1.0, -1.0,
                                                1.0, -1.0]);
            // Setup texture buffer to hold a square
            const textureCoords = new Float32Array([0, 0, 
                                                      1, 0,
                                                      0, 1,
                                                      1, 1]);
    
            // Setup 2 triangles connecting the vertices so that there
            // are solid shaded regions
            const indices = new Uint16Array([0, 1, 2, 1, 2, 3]);
    
            let gl = this.glcanvas.gl;
            // Setup position buffer
            this.positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
            gl.vertexAttribPointer(this.shader.positionLocation, 2, gl.FLOAT, false, 0, 0);
            
            // Setup texture coordinate buffer
            this.textureCoordBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, textureCoords, gl.STATIC_DRAW);
            gl.vertexAttribPointer(this.shader.textureLocation, 2, gl.FLOAT, false, 0, 0);

            this.indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, buffers.indices, gl.STATIC_DRAW);
            this.indexBuffer.itemSize = 1;
            this.indexBuffer.numItems = buffers.indices.length;
        }
    }

    render() {
        let gl = this.glcanvas.gl;
        let shader = this.shader;
        if (shader === undefined) {
            return;
        }
        gl.useProgram(shader);

        // Step 2: Bind vertex and index buffers to draw two triangles
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.vertexAttribPointer(shader.positionLocation, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

        // Step 3: Set active texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(shader.uSampler, 0);
    }
    
}