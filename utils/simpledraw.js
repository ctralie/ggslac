
function SimpleDrawer(gl, shaders) {
    this.gl = gl;
    this.shader = shaders.pointColorShader;
        
    //Internally store a vertex buffer for all of the different lines/vertices, as
    //well as a color buffer
    this.linesVBO = null;//Positions
    this.linesPoints = [];
    this.linesCVBO = null;//Colors
    this.linesColors = [];
    
    this.pointsVBO = null;
    this.points = [];
    this.pointsCVBO = null;
    this.pointsColors = [];
    
    this.pSize = 3.0;
    
    this.needsDisplayUpdate = false;
    
    this.reset = function() {
        this.linesPoints = [];
        this.linesColors = [];
        this.points = [];
        this.pointsColors = [];
        this.needsDisplayUpdate = true;
    }
    
    this.updateBuffers = function() {
        var gl = this.gl;
        
        //UPDATE LINES
        if (this.linesVBO === null) {
            this.linesVBO = gl.createBuffer();
        }
        if (this.linesCVBO === null) {
            this.linesCVBO = gl.createBuffer();
        }
        //Bind the array data into the buffers
        var V = new Float32Array(this.linesPoints.length);
        for (var i = 0; i < this.linesPoints.length; i++) {
            V[i] = this.linesPoints[i];
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.linesVBO);
        gl.bufferData(gl.ARRAY_BUFFER, V, gl.STATIC_DRAW);
        this.linesVBO.itemSize = 3;
        this.linesVBO.numItems = this.linesPoints.length/3;
        
        V = new Float32Array(this.linesColors.length);
        for (var i = 0; i < this.linesColors.length; i++) {
            V[i] = this.linesColors[i];
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.linesCVBO);
        gl.bufferData(gl.ARRAY_BUFFER, V, gl.STATIC_DRAW);
        this.linesCVBO.itemSize = 3;
        this.linesCVBO.numItems = this.linesColors.length/3;
        
        //UPDATE POINTS
        if (this.pointsVBO === null) {
            this.pointsVBO = gl.createBuffer();
        }
        if (this.pointsCVBO === null) {
            this.pointsCVBO = gl.createBuffer();
        }
        //Bind the array data into the buffers
        var V = new Float32Array(this.points.length);
        for (var i = 0; i < this.points.length; i++) {
            V[i] = this.points[i];
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.pointsVBO);
        gl.bufferData(gl.ARRAY_BUFFER, V, gl.STATIC_DRAW);
        this.pointsVBO.itemSize = 3;
        this.pointsVBO.numItems = this.points.length/3;
        
        V = new Float32Array(this.pointsColors.length);
        for (var i = 0; i < this.pointsColors.length; i++) {
            V[i] = this.pointsColors[i];
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.pointsCVBO);
        gl.bufferData(gl.ARRAY_BUFFER, V, gl.STATIC_DRAW);
        this.pointsCVBO.itemSize = 3;
        this.pointsCVBO.numItems = this.pointsColors.length/3;
    }
    

    /** 
     * Add the line to the vertex buffer to be drawn with the point [X, Y, Z]
     * and the color [R, G, B]
     * 
     * @param {glMatrix.vec3} P1 3D array of XYZ locations for first point
     * @param {glMatrix.vec3} P2 3D array of XYZ locations for second point
     * @param {glMatrix.vec3} C 3D array of RGB colors in the range [0, 1]
     */
    this.drawLine = function(P1, P2, C) {
        for (var i = 0; i < 3; i++) {
            this.linesPoints.push(P1[i]);
            this.linesColors.push(C[i]);
        }
        for (var i = 0; i < 3; i++) {
            this.linesPoints.push(P2[i]);
            this.linesColors.push(C[i]);
        }
        this.needsDisplayUpdate = true;
    }
    
    this.drawPoint = function(P, C) {
        for (var i = 0; i < 3; i++) {
            this.points.push(P[i]);
            this.pointsColors.push(C[i]);
        }
        this.needsDisplayUpdate = true;
    }
    
    this.setPointSize = function(pSize) {
        this.pSize = pSize;
    }
    
    /** 
     * Draw all of the points and lines
     * @param {camera} camera A camera object containing the functions
     *                          getPMatrix() and getMVMatrix()
     * @param {glMatrix.mat4} tMatrix The transformation matrix to apply 
     *                                to the lines/points before viewing
     */
    this.repaint = function(camera, tMatrix) {
        let pMatrix = camera.getPMatrix();
        let mvMatrix = camera.getMVMatrix();
        if (tMatrix === undefined) {
            tMatrix = glMatrix.mat4.create();
        }
        if (this.needsDisplayUpdate) {
            this.updateBuffers();
            this.needsDisplayUpdate = false;
        }
        var gl = this.gl;
        if (this.linesPoints.length > 0) {
            gl.useProgram(this.shader);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.linesVBO);
            gl.vertexAttribPointer(this.shader.vPosAttrib, this.linesVBO.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.linesCVBO);
            gl.vertexAttribPointer(this.shader.vColorAttrib, this.linesCVBO.itemSize, gl.FLOAT, false, 0, 0);
            gl.uniformMatrix4fv(this.shader.pMatrixUniform, false, pMatrix);
            gl.uniformMatrix4fv(this.shader.mvMatrixUniform, false, mvMatrix);
            gl.uniformMatrix4fv(this.shader.tMatrixUniform, false, tMatrix);
            gl.drawArrays(gl.LINES, 0, this.linesVBO.numItems);
        }

        if (this.points.length > 0) {
            gl.useProgram(this.shader);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.pointsVBO);
            gl.vertexAttribPointer(this.shader.vPosAttrib, this.pointsVBO.itemSize, gl.FLOAT, false, 0, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.pointsCVBO);
            gl.vertexAttribPointer(this.shader.vColorAttrib, this.pointsCVBO.itemSize, gl.FLOAT, false, 0, 0);

            gl.uniformMatrix4fv(this.shader.pMatrixUniform, false, pMatrix);
            gl.uniformMatrix4fv(this.shader.mvMatrixUniform, false, mvMatrix);
            gl.uniformMatrix4fv(this.shader.tMatrixUniform, false, tMatrix);
            gl.uniform1f(this.shader.pSizeUniform, false, this.pSize);
            gl.drawArrays(gl.POINTS, 0, this.pointsVBO.numItems);
        }
    }
}
