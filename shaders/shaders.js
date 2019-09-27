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
    
    
    /** Line shader: Simple shader for drawing lines with flat colors,
     * usually for debugging */
    let lineShader = getShaderProgram(gl, relpath + "lineshader");
    lineShader.vPosAttrib = gl.getAttribLocation(lineShader, "vPos");
    gl.enableVertexAttribArray(lineShader.vPosAttrib);
    lineShader.vColorAttrib = gl.getAttribLocation(lineShader, "vColor");
    gl.enableVertexAttribArray(lineShader.vColorAttrib);
    lineShader.pMatrixUniform = gl.getUniformLocation(lineShader, "uPMatrix");
    lineShader.mvMatrixUniform = gl.getUniformLocation(lineShader, "uMVMatrix");
    
    /** Point shader: Simple shader for drawing points with flat colors,
    usually for debugging (for now exactly the same as line shader)  */
    let pointShader = getShaderProgram(gl, relpath + "pointshader");
    pointShader.vPosAttrib = gl.getAttribLocation(pointShader, "vPos");
    gl.enableVertexAttribArray(pointShader.vPosAttrib);
    pointShader.vColorAttrib = gl.getAttribLocation(pointShader, "vColor");
    gl.enableVertexAttribArray(pointShader.vColorAttrib);
    pointShader.pMatrixUniform = gl.getUniformLocation(pointShader, "uPMatrix");
    pointShader.mvMatrixUniform = gl.getUniformLocation(pointShader, "uMVMatrix");
    pointShader.pSizeUniform = gl.getUniformLocation(pointShader, "pSize");
    
    return { lambertian:lambertian,
            flatShader:flatShader, 
            lineShader:lineShader, 
            pointShader:pointShader};
}


let Shaders = function() {};
Shaders.initStandardShaders = initStandardShaders;