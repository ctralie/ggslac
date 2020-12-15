const MAX_LIGHTS = 10;

/**
 * A function that compiles a particular shader
 * @param {object} gl WebGL handle
 * @param {string} shadersrc A string holding the GLSL source code for the shader
 * @param {string} type The type of shader ("fragment" or "vertex") 
 * 
 * @returns{shader} Shader object
 */
function getShader(gl, shadersrc, type) {
    var shader;
    if (type == "fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } 
    else if (type == "vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } 
    else {
        return null;
    }
    
    gl.shaderSource(shader, shadersrc);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log("Unable to compile " + type + " shader...")
        console.log(shadersrc);
        console.log(gl.getShaderInfoLog(shader));
        alert("Could not compile shader");
        return null;
    }
    return shader;
}


/**
 * Compile a vertex shader and a fragment shader and link them together
 * 
 * @param {object} gl WebGL Handle
 * @param {string} prefix Prefix for naming the shader
 * @param {string} vertexSrc A string holding the GLSL source code for the vertex shader
 * @param {string} fragmentSrc A string holding the GLSL source code for the fragment shader
 */
function getShaderProgram(gl, prefix, vertexSrc, fragmentSrc) {
    let vertexShader = getShader(gl, vertexSrc, "vertex");
    let fragmentShader = getShader(gl, fragmentSrc, "fragment");
    let shader = gl.createProgram();
    gl.attachShader(shader, vertexShader);
    gl.attachShader(shader, fragmentShader);
    gl.linkProgram(shader);
    if (!gl.getProgramParameter(shader, gl.LINK_STATUS)) {
        throw new Error("Could not initialize shader" + prefix);
    }
    shader.name = prefix;
    return shader;
}

/**
 * Load in and compile a vertex/fragment shader pair asynchronously
 * 
 * @param {object} gl WebGL Handle
 * @param {string} prefix File prefix for shader.  It is expected that there
 * will be both a vertex shader named prefix.vert and a fragment
 * shader named prefix.frag
 * 
 * @returns{Promise} A promise that resolves to a shader program, where the 
 * vertex/fragment shaders are compiled/linked together
 */
function getShaderProgramAsync(gl, prefix) {
    return new Promise((resolve, reject) => {
        $.get(prefix + ".vert", function(vertexSrc) {
            $.get(prefix + ".frag", function(fragmentSrc) {
                resolve(getShaderProgram(gl, prefix, vertexSrc, fragmentSrc));
            });
        });
    });
}


/**
 * A function that sets up promises for all of the shaders shaders and returns
 * them in an object.  Once each promise is resolved, its value in the object
 * is overwritten by the compiled shader
 * 
 * @param {*} gl WebGL Handle
 * @param{string} relpath Relative path to shaders from the directory
 * in which this function is called
 * 
 * @returns{obj} An object with fields containing standard shaders
 *               as promises.  When these promises resolve, they will overwrite
 *               the fields of this object to be an object 
 *              {'shader':shader object,
 *              'description': description of shader}
 */
function initStandardShaders(gl, relpath) {
    let shaders = {};
    /** flat: A shader that draws a constant color for all faces*/
    shaders.flat = new Promise((resolve, reject) => {
        getShaderProgramAsync(gl, relpath + "flat").then((shader) => {
            shader.description = 'A shader that draws a constant color for all faces';
            shader.vPosAttrib = gl.getAttribLocation(shader, "vPos");
            gl.enableVertexAttribArray(shader.vPosAttrib);
            shader.vColorAttrib = gl.getAttribLocation(shader, "vColor");
            gl.enableVertexAttribArray(shader.vColorAttrib);
            shader.pMatrixUniform = gl.getUniformLocation(shader, "uPMatrix");
            shader.mvMatrixUniform = gl.getUniformLocation(shader, "uMVMatrix");
            shader.tMatrixUniform = gl.getUniformLocation(shader, "tMatrix");
            shader.uKdUniform = gl.getUniformLocation(shader, "uKd"); // Flat diffuse color
            resolve(shader);
        });
    }).then(shader => {
        shader.shaderReady = true;
        shaders.flat = shader;
    });

    /** gouraud: Per-vertex lambertian shader  */
    shaders.gouraud = new Promise((resolve, reject) => {
        getShaderProgramAsync(gl, relpath + "gouraud").then((shader) => {
            shader.description = 'Per-vertex lambertian shader';
            shader.vPosAttrib = gl.getAttribLocation(shader, "vPos");
            gl.enableVertexAttribArray(shader.vPosAttrib);
            shader.vNormalAttrib = gl.getAttribLocation(shader, "vNormal");
            gl.enableVertexAttribArray(shader.vNormalAttrib);
            shader.vColorAttrib = gl.getAttribLocation(shader, "vColor");
            gl.enableVertexAttribArray(shader.vColorAttrib);
            shader.pMatrixUniform = gl.getUniformLocation(shader, "uPMatrix");
            shader.mvMatrixUniform = gl.getUniformLocation(shader, "uMVMatrix");
            shader.tMatrixUniform = gl.getUniformLocation(shader, "tMatrix");
            shader.nMatrixUniform = gl.getUniformLocation(shader, "uNMatrix");
            shader.ambientColorUniform = gl.getUniformLocation(shader, "uAmbientColor");
            shader.uKaUniform = gl.getUniformLocation(shader, "uKa");
            shader.uKdUniform = gl.getUniformLocation(shader, "uKd");
            shader.uKsUniform = gl.getUniformLocation(shader, "uKs");
            shader.uShininessUniform = gl.getUniformLocation(shader, "uShininess");
            shader.uEyeUniform = gl.getUniformLocation(shader, "uEye");
            shader.u_lights = [];
            shader.u_numLights = gl.getUniformLocation(shader, "numLights");
            for (let i = 0; i < MAX_LIGHTS; i++) {
                let light = {
                    pos: gl.getUniformLocation(shader, "lights["+i+"].pos"),
                    color: gl.getUniformLocation(shader, "lights["+i+"].color"),
                    atten: gl.getUniformLocation(shader, "lights["+i+"].atten")
                };
                shader.u_lights.push(light);
            }
            resolve(shader);
        });
    }).then(shader => {
        shader.shaderReady = true;
        shaders.gouraud = shader;
    });

    /** blinnPhong: Blinn Phong shader  */
    shaders.blinnPhong = new Promise((resolve, reject) => {
        getShaderProgramAsync(gl, relpath + "blinnPhong").then((shader) => {
            shader.description = 'Blinn-Phong shader with specular';
            shader.vPosAttrib = gl.getAttribLocation(shader, "vPos");
            gl.enableVertexAttribArray(shader.vPosAttrib);
            shader.vNormalAttrib = gl.getAttribLocation(shader, "vNormal");
            gl.enableVertexAttribArray(shader.vNormalAttrib);
            shader.vColorAttrib = gl.getAttribLocation(shader, "vColor");
            gl.enableVertexAttribArray(shader.vColorAttrib);
            shader.pMatrixUniform = gl.getUniformLocation(shader, "uPMatrix");
            shader.mvMatrixUniform = gl.getUniformLocation(shader, "uMVMatrix");
            shader.tMatrixUniform = gl.getUniformLocation(shader, "tMatrix");
            shader.nMatrixUniform = gl.getUniformLocation(shader, "uNMatrix");
            shader.ambientColorUniform = gl.getUniformLocation(shader, "uAmbientColor");
            shader.uKaUniform = gl.getUniformLocation(shader, "uKa");
            shader.uKdUniform = gl.getUniformLocation(shader, "uKd");
            shader.uKsUniform = gl.getUniformLocation(shader, "uKs");
            shader.uShininessUniform = gl.getUniformLocation(shader, "uShininess");
            shader.uEyeUniform = gl.getUniformLocation(shader, "uEye");
            shader.u_lights = [];
            shader.u_numLights = gl.getUniformLocation(shader, "numLights");
            for (let i = 0; i < MAX_LIGHTS; i++) {
                let light = {
                    pos: gl.getUniformLocation(shader, "lights["+i+"].pos"),
                    color: gl.getUniformLocation(shader, "lights["+i+"].color"),
                    atten: gl.getUniformLocation(shader, "lights["+i+"].atten")
                };
                shader.u_lights.push(light);
            }
            resolve(shader);
        });
    }).then(shader => {
        shader.shaderReady = true;
        shaders.blinnPhong = shader;
    });

    /** depth: A shader that shades by depth */
    shaders.depth = new Promise((resolve, reject) => {
        getShaderProgramAsync(gl, relpath + "depth").then((shader) => {
            shader.vPosAttrib = gl.getAttribLocation(shader, "vPos");
            gl.enableVertexAttribArray(shader.vPosAttrib);
            shader.pMatrixUniform = gl.getUniformLocation(shader, "uPMatrix");
            shader.mvMatrixUniform = gl.getUniformLocation(shader, "uMVMatrix");
            shader.tMatrixUniform = gl.getUniformLocation(shader, "tMatrix");
            shader.uNearUniform = gl.getUniformLocation(shader, "uNear");
            shader.uFarUniform = gl.getUniformLocation(shader, "uFar");
            shader.description = 'A shader that shades by depth';
            resolve(shader);
        });
    }).then(shader => {
        shader.shaderReady = true;
        shaders.depth = shader;
    });

    /** depth16: A shader that packs a float depth into two bytes in the R/G channels */
    shaders.depth16 = new Promise((resolve, reject) => {
        getShaderProgramAsync(gl, relpath + "depth16").then((shader) => {
            shader.description = 'A shader that packs a float depth into two bytes in the R/G channels';
            shader.vPosAttrib = gl.getAttribLocation(shader, "vPos");
            gl.enableVertexAttribArray(shader.vPosAttrib);
            shader.pMatrixUniform = gl.getUniformLocation(shader, "uPMatrix");
            shader.mvMatrixUniform = gl.getUniformLocation(shader, "uMVMatrix");
            shader.tMatrixUniform = gl.getUniformLocation(shader, "tMatrix");
            shader.uNearUniform = gl.getUniformLocation(shader, "uNear");
            shader.uFarUniform = gl.getUniformLocation(shader, "uFar");
            resolve(shader);
        });
    }).then(shader => {
        shader.shaderReady = true;
        shaders.depth16 = shader;
    });

    /** normal: A shader to color points by their normals */
    shaders.normal = new Promise((resolve, reject) => {
        getShaderProgramAsync(gl, relpath + "normalView").then((shader) => {
            shader.description = 'A shader to color points by their normals';
            shader.vPosAttrib = gl.getAttribLocation(shader, "vPos");
            gl.enableVertexAttribArray(shader.vPosAttrib);
            shader.vNormalAttrib = gl.getAttribLocation(shader, "vNormal");
            gl.enableVertexAttribArray(shader.vNormalAttrib);
            shader.pMatrixUniform = gl.getUniformLocation(shader, "uPMatrix");
            shader.mvMatrixUniform = gl.getUniformLocation(shader, "uMVMatrix");
            shader.tMatrixUniform = gl.getUniformLocation(shader, "tMatrix");
            shader.nMatrixUniform = gl.getUniformLocation(shader, "uNMatrix");
            shader.nMVMatrixUniform = gl.getUniformLocation(shader, "uNMVMatrix");
            resolve(shader);
        });
    }).then(shader => {
        shader.shaderReady = true;
        shaders.normal = shader;
    });

    /** normal local: A shader to color points by their normals in local coordinates */
    shaders.normalLocal = new Promise((resolve, reject) => {
        getShaderProgramAsync(gl, relpath + "normalViewLocal").then((shader) => {
            shader.description = 'A shader to color points by their normals in local coordinates';
            shader.vPosAttrib = gl.getAttribLocation(shader, "vPos");
            gl.enableVertexAttribArray(shader.vPosAttrib);
            shader.vNormalAttrib = gl.getAttribLocation(shader, "vNormal");
            gl.enableVertexAttribArray(shader.vNormalAttrib);
            shader.pMatrixUniform = gl.getUniformLocation(shader, "uPMatrix");
            shader.mvMatrixUniform = gl.getUniformLocation(shader, "uMVMatrix");
            shader.tMatrixUniform = gl.getUniformLocation(shader, "tMatrix");
            shader.nMatrixUniform = gl.getUniformLocation(shader, "uNMatrix");
            shader.nMVMatrixUniform = gl.getUniformLocation(shader, "uNMVMatrix");
            resolve(shader);
        });
    }).then(shader => {
        shader.shaderReady = true;
        shaders.normalLocal = shader;
    });
    
    /** Point shader: Simple shader for drawing points with flat colors */
    shaders.pointShader = new Promise((resolve, reject) => {
        getShaderProgramAsync(gl, relpath + "point").then((shader) => {
            shader.description = 'Simple shader for drawing points with flat colors';
            shader.vPosAttrib = gl.getAttribLocation(shader, "vPos");
            gl.enableVertexAttribArray(shader.vPosAttrib);
            shader.pMatrixUniform = gl.getUniformLocation(shader, "uPMatrix");
            shader.mvMatrixUniform = gl.getUniformLocation(shader, "uMVMatrix");
            shader.tMatrixUniform = gl.getUniformLocation(shader, "uTMatrix");
            shader.uKaUniform = gl.getUniformLocation(shader, "uKa"); // Ambient flat color
            resolve(shader);
        });
    }).then(shader => {
        shader.shaderReady = true;
        shaders.pointShader = shader;
    });

    /** Point color shader: Simple shader for drawing points with flat, varying colors */
    shaders.pointColorShader = new Promise((resolve, reject) => {
        getShaderProgramAsync(gl, relpath + "pointcolor").then((shader) => {
            shader.description = 'Simple shader for drawing points with flat, varying colors';
            shader.vPosAttrib = gl.getAttribLocation(shader, "vPos");
            gl.enableVertexAttribArray(shader.vPosAttrib);
            shader.vColorAttrib = gl.getAttribLocation(shader, "vColor");
            gl.enableVertexAttribArray(shader.vColorAttrib);
            shader.pMatrixUniform = gl.getUniformLocation(shader, "uPMatrix");
            shader.mvMatrixUniform = gl.getUniformLocation(shader, "uMVMatrix");
            shader.tMatrixUniform = gl.getUniformLocation(shader, "uTMatrix");
            resolve(shader);
        });
    }).then(shader => {
        shader.shaderReady = true;
        shaders.pointColorShader = shader;
    });

    /** Normal shader: A shader used to draw normals as line segments */
    shaders.normalShader = new Promise((resolve, reject) => {
        getShaderProgramAsync(gl, relpath + "normal").then((shader) => {
            shader.description = 'A shader used to draw normals as line segments';
            shader.n1PosAttrib = gl.getAttribLocation(shader, "n1Pos");
            gl.enableVertexAttribArray(shader.n1PosAttrib);
            shader.n2PosAttrib = gl.getAttribLocation(shader, "n2Pos");
            gl.enableVertexAttribArray(shader.n2PosAttrib);
            shader.pMatrixUniform = gl.getUniformLocation(shader, "uPMatrix");
            shader.mvMatrixUniform = gl.getUniformLocation(shader, "uMVMatrix");
            shader.tMatrixUniform = gl.getUniformLocation(shader, "uTMatrix");
            shader.nMatrixUniform = gl.getUniformLocation(shader, "uNMatrix");
            shader.uKaUniform = gl.getUniformLocation(shader, "uKa"); // Ambient flat color
            shader.uRUniform = gl.getUniformLocation(shader, "uR");
            resolve(shader);
        });
    }).then(shader => {
        shader.shaderReady = true;
        shaders.normalShader = shader;
    });
    return shaders;
}

let Shaders = function() {};
Shaders.initStandardShaders = initStandardShaders;