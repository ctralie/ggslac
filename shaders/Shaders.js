/**
 * A function that compiles a particular shader
 * @param {*} gl WebGL handle
 * @param {*} shadersrc A string holding the GLSL source code for the shader
 * @param {string} type The type of shader ("fragment" or "vertex") 
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
 * @param {*} prefix File prefix for shader.  It is expected that there
 * will be both a vertex shader named prefix.vert and a fragment
 * shader named prefix.frag
 */
function getShaders(gl, prefix) {
    let vertReader = new FileReader();
    vertReader.onload = function(e) {
        if (e) {
            console.log("Error loading vertex shader " + prefix + ".vert");
        }
        else {
            let vertexShader = getShader(gl, this.result, "vertex");
            let fragReader = new FileReader();
            fragReader.onload = function(e2) {
                if (e2) {
                    console.log("Error loading fragment shader " + prefix + ".frag");
                }
                else {
                    let fragmentShader = getShader(gl, this.result, "fragment");
                    let shader = gl.createProgram();
                    gl.attachShader(shader, vertexShader);
                    gl.attachShader(shader, fragmentShader);
                    gl.linkProgram(shader);
                    if (!gl.getProgramParameter(shader, gl.LINK_STATUS)) {
                        alert("Could not initialise shader" + prefix);
                    }
                }
            }
        }
    }
    vertReader.readAsText(prefix + ".vert");
}


function initShaders(gl, linesptsOnly) {
    //////////ColorShader: Ordinary color shader for drawing meshes
    //Shader to use vertex colors with lighting
    let colorShader = null;
    let fragmentShader = null;
    let vertexShader = null;
    if (linesptsOnly === undefined) {
        let fragmentShader = getShader(gl, ColorShader_Fragment, "fragment");
        let vertexShader = getShader(gl, ColorShader_Vertex, "vertex");
        colorShader = gl.createProgram();
        gl.attachShader(colorShader, vertexShader);
        gl.attachShader(colorShader, fragmentShader);
        gl.linkProgram(colorShader);
        if (!gl.getProgramParameter(colorShader, gl.LINK_STATUS)) {
            alert("Could not initialise color shader");
        }
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
    }
    
    //Line shader: Simple shader for drawing lines with flat colors,
    //usually for debugging
    fragmentShader = getShader(gl, LineShader_Fragment, "fragment");
    vertexShader = getShader(gl, LineShader_Vertex, "vertex");
    let lineShader = gl.createProgram();
    gl.attachShader(lineShader, vertexShader);
    gl.attachShader(lineShader, fragmentShader);
    gl.linkProgram(lineShader);
    if (!gl.getProgramParameter(lineShader, gl.LINK_STATUS)) {
        alert("Could not initialise line shader");
    }
    lineShader.vPosAttrib = gl.getAttribLocation(lineShader, "vPos");
    gl.enableVertexAttribArray(lineShader.vPosAttrib);
    lineShader.vColorAttrib = gl.getAttribLocation(lineShader, "vColor");
    gl.enableVertexAttribArray(lineShader.vColorAttrib);
    lineShader.pMatrixUniform = gl.getUniformLocation(lineShader, "uPMatrix");
    lineShader.mvMatrixUniform = gl.getUniformLocation(lineShader, "uMVMatrix");
    
    //Point shader: Simple shader for drawing points with flat colors,
    //usually for debugging (for now exactly the same as line shader)
    fragmentShader = getShader(gl, PointShader_Fragment, "fragment");
    vertexShader = getShader(gl, PointShader_Vertex, "vertex");
    let pointShader = gl.createProgram();
    gl.attachShader(pointShader, vertexShader);
    gl.attachShader(pointShader, fragmentShader);
    gl.linkProgram(pointShader);
    if (!gl.getProgramParameter(pointShader, gl.LINK_STATUS)) {
        alert("Could not initialise point shader");
    }
    pointShader.vPosAttrib = gl.getAttribLocation(pointShader, "vPos");
    gl.enableVertexAttribArray(pointShader.vPosAttrib);
    pointShader.vColorAttrib = gl.getAttribLocation(pointShader, "vColor");
    gl.enableVertexAttribArray(pointShader.vColorAttrib);
    pointShader.pMatrixUniform = gl.getUniformLocation(pointShader, "uPMatrix");
    pointShader.mvMatrixUniform = gl.getUniformLocation(pointShader, "uMVMatrix");
    pointShader.pSizeUniform = gl.getUniformLocation(pointShader, "pSize");
    
    return { colorShader:colorShader, lineShader:lineShader, pointShader:pointShader};
}