/* 
Files that have been assumed to have been also loaded
../utils/blockloader.js

*/

const MAX_LIGHTS = 10;

/**
 * A function that compiles a particular shader
 * @param {*} gl WebGL handle
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
 * 
 * @param {*} gl WebGL Handle
 * @param {string} prefix File prefix for shader.  It is expected that there
 * will be both a vertex shader named prefix.vert and a fragment
 * shader named prefix.frag
 * 
 * @returns{shaderprogram} An object holding the shaders linked together
 * and compiled/linked into a program
 */
function getShaderProgram(gl, prefix) {
    let vertexSrc = BlockLoader.loadTxt(prefix + ".vert");
    let fragmentSrc = BlockLoader.loadTxt(prefix + ".frag");
    let vertexShader = getShader(gl, vertexSrc, "vertex");
    let fragmentShader = getShader(gl, fragmentSrc, "fragment");

    let shader = gl.createProgram();
    gl.attachShader(shader, vertexShader);
    gl.attachShader(shader, fragmentShader);
    gl.linkProgram(shader);
    if (!gl.getProgramParameter(shader, gl.LINK_STATUS)) {
        alert("Could not initialize shader" + prefix);
    }
    shader.name = prefix;
    return shader;
}


/**
 * 
 * @param {*} gl WebGL Handle
 * @param{string} relpath Relative path to shaders from the directory
 * in which this function is called
 * 
 * @returns{obj} An object with fields containing standard shaders
 */
function initStandardShaders(gl, relpath) {
    /** gouraud: Per-vertex lambertian shader  */
    let gouraud = getShaderProgram(gl, relpath + "gouraud");
    gouraud.vPosAttrib = gl.getAttribLocation(gouraud, "vPos");
    gl.enableVertexAttribArray(gouraud.vPosAttrib);
    gouraud.vNormalAttrib = gl.getAttribLocation(gouraud, "vNormal");
    gl.enableVertexAttribArray(gouraud.normalAttrib);
    gouraud.vColorAttrib = gl.getAttribLocation(gouraud, "vColor");
    gl.enableVertexAttribArray(gouraud.vColorAttrib);
    gouraud.pMatrixUniform = gl.getUniformLocation(gouraud, "uPMatrix");
    gouraud.mvMatrixUniform = gl.getUniformLocation(gouraud, "uMVMatrix");
    gouraud.tMatrixUniform = gl.getUniformLocation(gouraud, "tMatrix");
    gouraud.nMatrixUniform = gl.getUniformLocation(gouraud, "uNMatrix");
    gouraud.ambientColorUniform = gl.getUniformLocation(gouraud, "uAmbientColor");
    gouraud.uKaUniform = gl.getUniformLocation(gouraud, "uKa");
    gouraud.uKdUniform = gl.getUniformLocation(gouraud, "uKd");
    gouraud.uKsUniform = gl.getUniformLocation(gouraud, "uKs");
    gouraud.uShininessUniform = gl.getUniformLocation(gouraud, "uShininess");
    gouraud.uEyeUniform = gl.getUniformLocation(gouraud, "uEye");
    gouraud.u_lights = [];
    gouraud.u_numLights = gl.getUniformLocation(gouraud, "numLights");
    for (let i = 0; i < MAX_LIGHTS; i++) {
        let light = {
            pos: gl.getUniformLocation(gouraud, "lights["+i+"].pos"),
            color: gl.getUniformLocation(gouraud, "lights["+i+"].color"),
            atten: gl.getUniformLocation(gouraud, "lights["+i+"].atten")
        };
        gouraud.u_lights.push(light);
    }

    /** blinnPhong: Per-vertex lambertian shader  */
    let blinnPhong = getShaderProgram(gl, relpath + "blinnPhong");
    blinnPhong.vPosAttrib = gl.getAttribLocation(blinnPhong, "vPos");
    gl.enableVertexAttribArray(blinnPhong.vPosAttrib);
    blinnPhong.vNormalAttrib = gl.getAttribLocation(blinnPhong, "vNormal");
    gl.enableVertexAttribArray(blinnPhong.normalAttrib);
    blinnPhong.vColorAttrib = gl.getAttribLocation(blinnPhong, "vColor");
    gl.enableVertexAttribArray(blinnPhong.vColorAttrib);
    blinnPhong.pMatrixUniform = gl.getUniformLocation(blinnPhong, "uPMatrix");
    blinnPhong.mvMatrixUniform = gl.getUniformLocation(blinnPhong, "uMVMatrix");
    blinnPhong.tMatrixUniform = gl.getUniformLocation(blinnPhong, "tMatrix");
    blinnPhong.nMatrixUniform = gl.getUniformLocation(blinnPhong, "uNMatrix");
    blinnPhong.ambientColorUniform = gl.getUniformLocation(blinnPhong, "uAmbientColor");
    blinnPhong.uKaUniform = gl.getUniformLocation(blinnPhong, "uKa");
    blinnPhong.uKdUniform = gl.getUniformLocation(blinnPhong, "uKd");
    blinnPhong.uKsUniform = gl.getUniformLocation(blinnPhong, "uKs");
    blinnPhong.uShininessUniform = gl.getUniformLocation(blinnPhong, "uShininess");
    blinnPhong.uEyeUniform = gl.getUniformLocation(blinnPhong, "uEye");
    blinnPhong.u_lights = [];
    blinnPhong.u_numLights = gl.getUniformLocation(blinnPhong, "numLights");
    for (let i = 0; i < MAX_LIGHTS; i++) {
        let light = {
            pos: gl.getUniformLocation(blinnPhong, "lights["+i+"].pos"),
            color: gl.getUniformLocation(blinnPhong, "lights["+i+"].color"),
            atten: gl.getUniformLocation(blinnPhong, "lights["+i+"].atten")
        };
        blinnPhong.u_lights.push(light);
    }

    /** depth: A shader that shades by depth */
    let depth = getShaderProgram(gl, relpath + "depth");
    depth.vPosAttrib = gl.getAttribLocation(depth, "vPos");
    gl.enableVertexAttribArray(depth.vPosAttrib);
    depth.pMatrixUniform = gl.getUniformLocation(depth, "uPMatrix");
    depth.mvMatrixUniform = gl.getUniformLocation(depth, "uMVMatrix");
    depth.tMatrixUniform = gl.getUniformLocation(depth, "tMatrix");
    depth.uNearUniform = gl.getUniformLocation(depth, "uNear");
    depth.uFarUniform = gl.getUniformLocation(depth, "uFar");

    /** normal: A shader to color points by their normals */
    let normal = getShaderProgram(gl, relpath + "normalView");
    normal.vPosAttrib = gl.getAttribLocation(normal, "vPos");
    gl.enableVertexAttribArray(normal.vPosAttrib);
    normal.vNormalAttrib = gl.getAttribLocation(normal, "vNormal");
    gl.enableVertexAttribArray(normal.normalAttrib);
    normal.pMatrixUniform = gl.getUniformLocation(normal, "uPMatrix");
    normal.mvMatrixUniform = gl.getUniformLocation(normal, "uMVMatrix");
    normal.tMatrixUniform = gl.getUniformLocation(normal, "tMatrix");
    normal.nMatrixUniform = gl.getUniformLocation(normal, "uNMatrix");

    /** flat: A shader that draws a constant color for all faces*/
    let flat = getShaderProgram(gl, relpath + "flat");
    flat.vPosAttrib = gl.getAttribLocation(flat, "vPos");
    gl.enableVertexAttribArray(flat.vPosAttrib);
    flat.pMatrixUniform = gl.getUniformLocation(flat, "uPMatrix");
    flat.mvMatrixUniform = gl.getUniformLocation(flat, "uMVMatrix");
    flat.tMatrixUniform = gl.getUniformLocation(flat, "tMatrix");
    flat.uKaUniform = gl.getUniformLocation(flat, "uKa"); // Flat ambient color
    
    /** Point shader: Simple shader for drawing points with flat colors */
    let pointShader = getShaderProgram(gl, relpath + "point");
    pointShader.vPosAttrib = gl.getAttribLocation(pointShader, "vPos");
    gl.enableVertexAttribArray(pointShader.vPosAttrib);
    pointShader.pMatrixUniform = gl.getUniformLocation(pointShader, "uPMatrix");
    pointShader.mvMatrixUniform = gl.getUniformLocation(pointShader, "uMVMatrix");
    pointShader.tMatrixUniform = gl.getUniformLocation(pointShader, "uTMatrix");
    pointShader.uKaUniform = gl.getUniformLocation(pointShader, "uKa"); // Ambient flat color

    /** Point color shader: Simple shader for drawing points with flat, varying colors */
    let pointColorShader = getShaderProgram(gl, relpath + "pointcolor");
    pointColorShader.vPosAttrib = gl.getAttribLocation(pointColorShader, "vPos");
    gl.enableVertexAttribArray(pointColorShader.vPosAttrib);
    pointColorShader.vColorAttrib = gl.getAttribLocation(pointColorShader, "vColor");
    gl.enableVertexAttribArray(pointColorShader.vColorAttrib);
    pointColorShader.pMatrixUniform = gl.getUniformLocation(pointColorShader, "uPMatrix");
    pointColorShader.mvMatrixUniform = gl.getUniformLocation(pointColorShader, "uMVMatrix");
    pointColorShader.tMatrixUniform = gl.getUniformLocation(pointColorShader, "uTMatrix");

    /** Normal shader: A shader used to draw normals as line segments */
    let normalShader = getShaderProgram(gl, relpath + "normal");
    normalShader.n1PosAttrib = gl.getAttribLocation(normalShader, "n1Pos");
    gl.enableVertexAttribArray(normalShader.n1PosAttrib);
    normalShader.n2PosAttrib = gl.getAttribLocation(normalShader, "n2Pos");
    gl.enableVertexAttribArray(normalShader.n2PosAttrib);
    normalShader.pMatrixUniform = gl.getUniformLocation(normalShader, "uPMatrix");
    normalShader.mvMatrixUniform = gl.getUniformLocation(normalShader, "uMVMatrix");
    normalShader.tMatrixUniform = gl.getUniformLocation(normalShader, "uTMatrix");
    normalShader.nMatrixUniform = gl.getUniformLocation(normalShader, "uNMatrix");
    normalShader.uKaUniform = gl.getUniformLocation(normalShader, "uKa"); // Ambient flat color
    normalShader.uRUniform = gl.getUniformLocation(normalShader, "uR");
    
    return { 
            blinnPhong:blinnPhong,
            gouraud:gouraud,
            depth:depth,
            normal:normal,
            flat:flat,
            pointShader:pointShader,
            pointColorShader:pointColorShader,
            normalShader:normalShader
           };
}


let Shaders = function() {};
Shaders.initStandardShaders = initStandardShaders;