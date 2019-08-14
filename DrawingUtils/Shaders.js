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
    /*//Flat color shader: Simple shader for drawing polygons with flat colors
    fragmentShader = getShader(gl, FlatColorShader_Fragment, "fragment");
    vertexShader = getShader(gl, FlatColorShader_Vertex, "vertex");
    var flatColorShader = gl.createProgram();
    gl.attachShader(flatColorShader, vertexShader);
    gl.attachShader(flatColorShader, fragmentShader);
    gl.linkProgram(flatColorShader);
    if (!gl.getProgramParameter(flatColorShader, gl.LINK_STATUS)) {
        alert("Could not initialise line shader");
    }
    flatColorShader.vPosAttrib = gl.getAttribLocation(flatColorShader, "vPos");
    gl.enableVertexAttribArray(flatColorShader.vPosAttrib);
    flatColorShader.pMatrixUniform = gl.getUniformLocation(flatColorShader, "uPMatrix");
    flatColorShader.mvMatrixUniform = gl.getUniformLocation(flatColorShader, "uMVMatrix");
    flatColorShader.vColorUniform = gl.getUniformLocation(flatColorShader, "vColor");*/
    
    
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


///*****SHADER STRINGS START*****///
var ColorShader_Fragment = "precision mediump float;\n" + 
"\n" + 
"varying vec3 vLightCoeff;\n" + 
"varying vec3 vColorInterp;\n" + 
"\n" + 
"void main(void) {\n" + 
"    gl_FragColor = vec4(vLightCoeff*vColorInterp, 1.0);\n" + 
"}\n";

var ColorShader_Vertex = "attribute vec3 vPos;\n" + 
"attribute vec3 vNormal;\n" + 
"attribute vec3 vColor;\n" + 
"\n" + 
"uniform mat4 uMVMatrix;\n" + 
"uniform mat4 uPMatrix;\n" + 
"uniform mat3 uNMatrix;\n" + 
"\n" + 
"uniform vec3 uAmbientColor;\n" + 
"uniform vec3 uLight1Pos;\n" + 
"uniform vec3 uLight2Pos;\n" + 
"uniform vec3 uLightColor;\n" + 
"\n" + 
"varying vec3 vLightCoeff;\n" + 
"varying vec3 vColorInterp;\n" + 
"\n" + 
"void main(void) {\n" + 
"    vec4 mvPosition = uMVMatrix*vec4(vPos, 1.0);\n" + 
"    gl_Position = uPMatrix * mvPosition;\n" + 
"    vec3 lightingDir = normalize(uLight1Pos - mvPosition.xyz);\n" + 
"\n" + 
"    vec3 transformedNormal = uNMatrix*vNormal;\n" + 
"    vec3 dPos = vec3(vec4(uLight1Pos, 1.0) - uMVMatrix*vec4(vPos, 1.0));\n" + 
"\n" + 
"    float dirLightWeight = dot(transformedNormal, lightingDir);\n" + 
"    if (dirLightWeight < 0.0) { //Stupid fix for double sides for now\n" + 
"        dirLightWeight *= -1.0;\n" + 
"    }\n" + 
"    vLightCoeff = uAmbientColor + dirLightWeight*uLightColor;\n" + 
"    vColorInterp = vColor;\n" + 
"}\n";

var FlatColorShader_Fragment = "precision mediump float;\n" + 
"varying vec4 fColor;\n" + 
"void main(void) {\n" + 
"    gl_FragColor = fColor;\n" + 
"}\n";

var FlatColorShader_Vertex = "attribute vec3 vPos;\n" + 
"uniform vec4 vColor;\n" + 
"uniform mat4 uMVMatrix;\n" + 
"uniform mat4 uPMatrix;\n" + 
"varying vec4 fColor;\n" + 
"void main(void) {\n" + 
"    gl_PointSize = 3.0;\n" + 
"    gl_Position = uPMatrix * uMVMatrix * vec4(vPos, 1.0);\n" + 
"    fColor = vColor;\n" + 
"}\n";

var LineShader_Fragment = "precision mediump float;\n" + 
"varying vec4 fColor;\n" + 
"void main(void) {\n" + 
"    gl_FragColor = fColor;\n" + 
"}\n";

var LineShader_Vertex = "attribute vec3 vPos;\n" + 
"attribute vec4 vColor;\n" + 
"uniform mat4 uMVMatrix;\n" + 
"uniform mat4 uPMatrix;\n" + 
"varying vec4 fColor;\n" + 
"void main(void) {\n" + 
"    gl_PointSize = 3.0;\n" + 
"    gl_Position = uPMatrix * uMVMatrix * vec4(vPos, 1.0);\n" + 
"    fColor = vColor;\n" + 
"}\n";

var PointShader_Fragment = "precision mediump float;\n" + 
"varying vec4 fColor;\n" + 
"void main(void) {\n" + 
"    gl_FragColor = fColor;\n" + 
"}\n";

var PointShader_Vertex = "attribute vec3 vPos;\n" + 
"attribute vec4 vColor;\n" + 
"uniform mat4 uMVMatrix;\n" + 
"uniform mat4 uPMatrix;\n" + 
"uniform float pSize;\n" + 
"varying vec4 fColor;\n" + 
"void main(void) {\n" + 
"    gl_PointSize = 5.0; //TODO: Change this to use the uniform pSize\n" + 
"    gl_Position = uPMatrix * uMVMatrix * vec4(vPos, 1.0);\n" + 
"    fColor = vColor;\n" + 
"}\n";

///*****SHADER STRINGS END*****///
