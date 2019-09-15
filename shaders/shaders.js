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
    /** ColorShader: Ordinary color shader for drawing meshes  */
    let colorShader = getShaderProgram(gl, relpath + "colorshader");
    colorShader.vPosAttrib = gl.getAttribLocation(colorShader, "vPos");
    gl.enableVertexAttribArray(colorShader.vPosAttrib);
    colorShader.vNormalAttrib = gl.getAttribLocation(colorShader, "vNormal");
    gl.enableVertexAttribArray(colorShader.normalAttrib);
    colorShader.vColorAttrib = gl.getAttribLocation(colorShader, "vColor");
    gl.enableVertexAttribArray(colorShader.vColorAttrib);
    colorShader.pMatrixUniform = gl.getUniformLocation(colorShader, "uPMatrix");
    colorShader.mvMatrixUniform = gl.getUniformLocation(colorShader, "uMVMatrix");
    colorShader.nMatrixUniform = gl.getUniformLocation(colorShader, "uNMatrix");
    colorShader.ambientColorUniform = gl.getUniformLocation(colorShader, "uAmbientColor");
    colorShader.light1PosUniform = gl.getUniformLocation(colorShader, "uLight1Pos");
    colorShader.light2PosUniform = gl.getUniformLocation(colorShader, "uLight2Pos");
    colorShader.lightColorUniform = gl.getUniformLocation(colorShader, "uLightColor");
    colorShader.uColorUniform = gl.getUniformLocation(colorShader, "uColor");

    /** FlatShader: A shader that draws a constant color for all faces*/
    let flatShader = getShaderProgram(gl, relpath + "flatcolorshader");
    flatShader.vPosAttrib = gl.getAttribLocation(flatShader, "vPos");
    gl.enableVertexAttribArray(flatShader.vPosAttrib);
    flatShader.pMatrixUniform = gl.getUniformLocation(flatShader, "uPMatrix");
    flatShader.mvMatrixUniform = gl.getUniformLocation(flatShader, "uMVMatrix");
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
    
    return { colorShader:colorShader, flatShader:flatShader, lineShader:lineShader, pointShader:pointShader};
}


let Shaders = function() {};
Shaders.initStandardShaders = initStandardShaders;