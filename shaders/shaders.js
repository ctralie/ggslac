/* 
Files that have been assumed to have been also loaded
../utils/blockloader.js

*/

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
    /** lambertian: Ordinary color shader for drawing meshes  */
    let lambertian = getShaderProgram(gl, relpath + "lambertian");
    lambertian.vPosAttrib = gl.getAttribLocation(lambertian, "vPos");
    gl.enableVertexAttribArray(lambertian.vPosAttrib);
    lambertian.vNormalAttrib = gl.getAttribLocation(lambertian, "vNormal");
    gl.enableVertexAttribArray(lambertian.normalAttrib);
    lambertian.vColorAttrib = gl.getAttribLocation(lambertian, "vColor");
    gl.enableVertexAttribArray(lambertian.vColorAttrib);
    lambertian.pMatrixUniform = gl.getUniformLocation(lambertian, "uPMatrix");
    lambertian.mvMatrixUniform = gl.getUniformLocation(lambertian, "uMVMatrix");
    lambertian.tMatrixUniform = gl.getUniformLocation(lambertian, "tMatrix");
    lambertian.nMatrixUniform = gl.getUniformLocation(lambertian, "uNMatrix");
    lambertian.ambientColorUniform = gl.getUniformLocation(lambertian, "uAmbientColor");
    lambertian.light1PosUniform = gl.getUniformLocation(lambertian, "uLight1Pos");
    lambertian.light2PosUniform = gl.getUniformLocation(lambertian, "uLight2Pos");
    lambertian.light1ColorUniform = gl.getUniformLocation(lambertian, "uLight1Color");
    lambertian.light2ColorUniform = gl.getUniformLocation(lambertian, "uLight2Color");
    lambertian.uColorUniform = gl.getUniformLocation(lambertian, "uColor");


    /** FlatShader: A shader that draws a constant color for all faces*/
    let flatShader = getShaderProgram(gl, relpath + "flat");
    flatShader.vPosAttrib = gl.getAttribLocation(flatShader, "vPos");
    gl.enableVertexAttribArray(flatShader.vPosAttrib);
    flatShader.pMatrixUniform = gl.getUniformLocation(flatShader, "uPMatrix");
    flatShader.mvMatrixUniform = gl.getUniformLocation(flatShader, "uMVMatrix");
    flatShader.tMatrixUniform = gl.getUniformLocation(flatShader, "tMatrix");
    flatShader.uColorUniform = gl.getUniformLocation(flatShader, "uColor");
    
    /** Point shader: Simple shader for drawing points with flat colors */
    let pointShader = getShaderProgram(gl, relpath + "point");
    pointShader.vPosAttrib = gl.getAttribLocation(pointShader, "vPos");
    gl.enableVertexAttribArray(pointShader.vPosAttrib);
    pointShader.pMatrixUniform = gl.getUniformLocation(pointShader, "uPMatrix");
    pointShader.mvMatrixUniform = gl.getUniformLocation(pointShader, "uMVMatrix");
    pointShader.tMatrixUniform = gl.getUniformLocation(pointShader, "uTMatrix");
    pointShader.uColorUniform = gl.getUniformLocation(pointShader, "uColor");

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
    normalShader.uColorUniform = gl.getUniformLocation(normalShader, "uColor");
    normalShader.uRUniform = gl.getUniformLocation(normalShader, "uR");
    
    return { lambertian:lambertian,
            flatShader:flatShader,
            pointShader:pointShader,
            pointColorShader:pointColorShader,
            normalShader:normalShader
            };
}


let Shaders = function() {};
Shaders.initStandardShaders = initStandardShaders;