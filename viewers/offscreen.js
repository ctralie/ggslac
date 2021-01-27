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

        // Initialize gl texture object
        this.texture = glcanvas.gl.createTexture();
        this.setupShaders(shadersrelpath);
    }

    setupShaders(relpath) {
        let shaders = {};
        this.shaders = shaders;
        let gl = this.glcanvas.gl;
        shaders.texEcho = new Promise((resolve, reject) =>  {
            getShaderProgramAsync(gl, relpath + "texecho").then((shader) => {
                shader.description = 'A simple shader to draw a texture as-is';
                // Extract the position buffer and store it in the shader object
                shader.positionLocation = gl.getAttribLocation(shader, "a_position");
                gl.enableVertexAttribArray(shader.positionLocation);
                // Extract texture coordinate buffer and store it in the shader object
                shader.textureLocation = gl.getAttribLocation(shader, "a_texture");
                gl.enableVertexAttribArray(shader.textureLocation);
                // Extract uniforms and store them in the shader object
                shader.uSampler = gl.getUniformLocation(shader, 'uSampler');
                resolve(shader);
            });
        }).then(shader => {
            shader.shaderReady = true;
            shaders.texEcho = shader;
        });
        shaders.texCardboard = new Promise((resolve, reject) =>  {
            getShaderProgramAsync(gl, relpath + "texcardboard").then((shader) => {
                shader.description = 'A simple shader to draw a texture as-is';
                // Extract the position buffer and store it in the shader object
                shader.positionLocation = gl.getAttribLocation(shader, "a_position");
                gl.enableVertexAttribArray(shader.positionLocation);
                // Extract texture coordinate buffer and store it in the shader object
                shader.textureLocation = gl.getAttribLocation(shader, "a_texture");
                gl.enableVertexAttribArray(shader.textureLocation);
                // Extract uniforms and store them in the shader object
                shader.uSampler = gl.getUniformLocation(shader, 'uSampler');
                shader.uk1 = gl.getUniformLocation(shader, "uk1");
                shader.uk2 = gl.getUniformLocation(shader, "uk2");
                resolve(shader);
            });
        }).then(shader => {
            shader.shaderReady = true;
            shaders.texCardboard = shader;
        });
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
        this.render();
    }

    /**
     * Setup the buffers for a particular shader
     * @param {string} shaderStr Name of a shader to load.  Assumed that the 
     *                           shader has position and texture coordinate attributes
     */
    setupShader(shaderStr) {
        let that = this;
        let shader = this.shaders[shaderStr];
        if (!('shaderReady' in shader)) {
            shader.then(function() {
                that.setupShader(shaderStr);
            })
        }
        else {
            this.shader = shader;
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
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
            this.indexBuffer.itemSize = 1;
            this.indexBuffer.numItems = indices.length;
        }
    }

    /**
     * 
     * @param {float} k1 Distortion parameter (optional)
     * @param {float} k2 Distortion parameter (optional)
     */
    render(k1, k2) {
        if (k1 === undefined) {
            k1 = 0.33582564;
        }
        if (k2 === undefined) {
            k2 = 0.55348791;
        }
        let shader = this.shader;
        if (shader === undefined) {
            return;
        }
        let that = this;
        if (!('shaderReady' in shader)) {
            shader.then(function() {
                that.render();
            })
        }
        else {
            let gl = this.glcanvas.gl;z
            gl.useProgram(shader);
    
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.uniform1i(shader.uSampler, 0);
            if ("uk1" in shader) {
                gl.uniform1f(shader.uk2, k2);
            }
            if ("uk2" in shader) {
                gl.uniform1f(shader.uk1, k1);
            }
            // Step 2: Bind vertex and index buffers to draw two triangles
            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.vertexAttribPointer(shader.positionLocation, 2, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.textureCoordBuffer);
            gl.vertexAttribPointer(shader.textureLocation, 2, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.drawElements(gl.TRIANGLES, this.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);

        }
    }
    
}