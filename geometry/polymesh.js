/* 
Files that have been assumed to have been also loaded
primitives3d.js
cameras3d.js
../shaders/shaders.js
../utils/simpledraw.js

*/

/**
 * Load in an .off file from an array of lines
 * 
 * @param {array} lines An array of strings for the lines in the file
 * 
 * @returns {object} {'vertices': Array of glMatrix.vec3 objects for vertex positions,
 *                    'colors': An array of glMatrix.vec3 objects for per-vertex colors,
 *                    'faces': An array of arrays of ints indexing into vertices, each
 *                              of which represents a face}
 */
function loadOffFile(lines) {
    vertices = [];
    colors = [];
    faces = [];
    let nVertices = 0;
    let nFaces = 0;
    let face = 0; // Face index
    let vertex = 0; // Vertex index
    let divideColor = false;
    for (let line = 0; line < lines.length; line++) {
        //http://blog.tompawlak.org/split-string-into-tokens-javascript
        let fields = lines[line].match(/\S+/g);
        if (fields === null) { //Blank line
            continue;
        }
        if (fields[0].length == 0) {
            continue;
        }
        if (fields[0][0] == "#" || fields[0][0] == "\0" || fields[0][0] == " ") {
            continue;
        }
        //Reading header
        if (nVertices == 0) {
            if (fields[0] == "OFF" || fields[0] == "COFF") {
                if (fields.length > 2) {
                    nVertices = parseInt(fields[1]);
                    nFaces = parseInt(fields[2]);
                }
            }
            else {
                if (fields.length >= 3) {
                    nVertices = parseInt(fields[0]);
                    nFaces = parseInt(fields[1]);                 
                }
                else if (nVertices == 0) {
                    throw "Error parsing OFF file: Not enough fields for nVertices, nFaces, nEdges";
                }
            }
        }
        //Reading vertices
        else if (vertex < nVertices) {
            if (fields.length < 3) {
                throw "Error parsing OFF File: Too few fields on a vertex line";
            }
            P = glMatrix.vec3.fromValues(parseFloat(fields[0]), parseFloat(fields[1]), parseFloat(fields[2]));
            let C = null;
            if (fields.length >= 6) {
                //There is color information
                if (divideColor) {
                    C = glMatrix.vec3.fromValues(parseFloat(fields[3])/255.0, parseFloat(fields[4])/255.0, parseFloat(fields[5])/255.0);
                }
                else {
                    C = glMatrix.vec3.fromValues(parseFloat(fields[3]), parseFloat(fields[4]), parseFloat(fields[5]));
                }
            }
            vertices.push(P);
            colors.push(C);
            vertex++;
        }
        //Reading faces
        else if (face < nFaces) {
            if (fields.length == 0) {
                continue;
            }
            //Assume the vertices are specified in CCW order
            let NVertices = parseInt(fields[0]);
            if (fields.length < NVertices+1) {
                throw "Error parsing OFF File: Not enough vertex indices specified for a face of length " + NVertices;
            }
            let verts = Array(NVertices);
            for (let i = 0; i < NVertices; i++) {
                verts[i] = parseInt(fields[i+1]);
            }
            faces.push(verts);
            face++;
        }
    }
    return {'vertices':vertices, 'colors':colors, 'faces':faces};
}


/**
 * Load in the mesh from an array of lines
 * @param {array} lines An array of strings for the lines in the file
 * 
 * @returns {object} {'vertices': Array of glMatrix.vec3 objects for vertex positions,
 *                    'colors': An array of glMatrix.vec3 objects for per-vertex colors,
 *                    'faces': An array of arrays of ints indexing into vertices, each
 *                              of which represents a face}
 */
function loadFileFromLines(lines) {
    if (lines.length == 0) {
        return {'vertices':[], 'colors':[], 'faces':[]};
    }
    let fields = lines[0].match(/\S+/g);
    if (fields[0].toUpperCase() == "OFF" || fields[0].toUpperCase() == "COFF") {
        return loadOffFile(lines);
    }
    else {
        throw "Unsupported file type " + fields[0] + " for loading mesh";
    }
}

/**
 * Parse an X3D file, assuming exactly one mesh 
 * TODO: This is currently broken
 * @param {xml} xml The xml code for the 3D specification
 */
function parseX3DMesh(doc) {
    let points = doc.children[0].children[1].children[0].children[0].children[0]
    .getAttribute("point").match(/\S+/g);
    let textures = doc.children[0].children[1].children[0].children[0].children[1]
        .getAttribute("point").match(/\S+/g);
    let faceidx = doc.children[0].children[1].children[0].children[0]
    .getAttribute("coordIndex").match(/\S+/g);

    // Setup vertices
    let vertices = [];
    let colors = [];
    for (let i = 0; i < points.length; i += 3) {
        let x = parseFloat(points[i]);
        let y = parseFloat(points[i+1]);
        let z = parseFloat(points[i+2]);
        vertices.push(glMatrix.vec3.fromValues(x, y, z));
        colors.push(glMatrix.vec3.fromValues([1, 1, 1]));
    }

    // Setup faces
    let faces = [];
    let i = 0;
    while (i < faceidx.length) {
        let k = i;
        let face = [];
        while(k < faceidx.length && faceidx[k] != -1) {
            let idx = parseInt(faceidx[k]);
            face.push(idx);
            k++;
        }
        if (face.length > 0) {
            faces.push(face);
        }
        i = k+1;
    }
    return {'vertices':vertices, 'colors':colors, 'faces':faces};
}


/**
 * A prototype class for mesh manipulation, which includes some important
 * common functions for buffers and rendering, as well as declarations of
 * functions that should be implemented by subclasses
 */
class PolyMesh {
    constructor() {
        // A list of vertices, each assumed to have a pos attribute
        this.vertices = []; 
        // A list of edges (implementation specific)
        this.edges = [];
        // A list of faces (implementation specific)
        this.faces = [];
        this.needsDisplayUpdate = true;
        this.vertexBuffer = null;
        this.normalBuffer = null;
        this.vnormal1Buffer = null;
        this.vnormal2Buffer = null;
        this.indexBuffer = null;
        this.edgeIndexBuffer = null;
        this.colorBuffer = null;
        this.bbox = new AABox3D(0, 0, 0, 0, 0, 0);
    }


    /////////////////////////////////////////////////////////////
    ////                 GEOMETRY METHODS                   /////
    /////////////////////////////////////////////////////////////

    //NOTE: Transformations are simple because geometry information is only
    //stored in the vertices

    /**
     * Apply a transformation matrix to the mesh
     * 
     * @param {glMatrix.mat4} Homogenous 4x4 matrix to apply
     */
    Transform(matrix) {
        this.vertices.forEach(function(v) {
            glMatrix.vec3.transformMat4(v.pos, v.pos, matrix);
        });
        this.needsDisplayUpdate = true;
    }
    
    /**
     * Translate a matrix over by a vector
     * 
     * @param {glMatrix.vec3} Vector by which to translate
     */
    Translate(dV) {
        this.vertices.forEach(function(v) {
            glMatrix.vec3.add(v.pos, v.pos, dV);
        });
        this.needsDisplayUpdate = true;
    }
    
    /**
     * Scale the matrix by different amounts across each axis
     * @param {number} dx Scale factor by dx
     * @param {number} dy Scale factor by dy
     * @param {number} dz Scale by factor dz
     */
    Scale(dx, dy, dz) {
        this.vertices.forEach(function(v) {
            v.pos[0] *= dx;
            v.pos[1] *= dy;
            v.pos[2] *= dz;
        });
        this.needsDisplayUpdate = true;
    }
    
    /**
     * Get the axis-aligned bounding box of this mesh
     * 
     * @returns {AABox3D} The axis-aligned bounding box containing the mesh
     */
    getBBox() {
        if (this.vertices.length == 0) {
            return new AABox3D(0, 0, 0, 0, 0, 0);
        }
        let P0 = this.vertices[0].pos;
        let bbox = new AABox3D(P0[0], P0[0], P0[1], P0[1], P0[2], P0[2]);
        this.vertices.forEach(function(v) {
            bbox.addPoint(v.pos);
        });
        return bbox;
    }
    
    /**
     * Get the axis-aligned bounding box of this mesh after applying
     * a transformation
     * 
     * @param {glMatrix.mat4} tMatrix Transformation matrix to apply
     * 
     * @returns {AABox3D} The axis-aligned bounding box containing the mesh
     */
    getBBoxTransformed(tMatrix) {
        if (this.vertices.length == 0) {
            return new AABox3D(0, 0, 0, 0, 0, 0);
        }
        let p = glMatrix.vec3.create();
        glMatrix.vec3.transformMat3(p, this.vertices[0].pos, tMatrix);
        let bbox = new AABox3D(p[0], p[0], p[1], p[1], p[2], p[2]);
        this.vertices.forEach(function(v) {
            glMatrix.vec3.transformMat3(p, v.pos, tMatrix);
            bbox.addPoint(p);
        });
        return bbox;
    }

    /////////////////////////////////////////////////////////////
    ////                INPUT/OUTPUT METHODS                /////
    /////////////////////////////////////////////////////////////
    loadFileFromLines() {
        throw "Calling loadFileFromLines() from base class, which is not implemented";
    }
    
    /////////////////////////////////////////////////////////////
    ////                     RENDERING                      /////
    /////////////////////////////////////////////////////////////    

    getTriangleIndices() {
        throw "Calling getTriangleIndices() from base class, which is not implemented";
    }

    getEdgeIndices() {
        throw "Calling getEdgeIndices() from base class, which is not implemented";
    }
    
    /**
     * Copy over vertex and triangle information to the GPU via
     * a WebGL handle
     * @param {WebGL handle} gl A handle to WebGL
     */
    updateBuffers(gl) {
        //Check to see if buffers need to be initialized
        if (this.vertexBuffer === null) {
            this.vertexBuffer = gl.createBuffer();
        }
        if (this.normalBuffer === null) {
            this.normalBuffer = gl.createBuffer();
        }
        if (this.vnormal1Buffer === null) {
            this.vnormal1Buffer = gl.createBuffer();
        }
        if (this.vnormal2Buffer === null) {
            this.vnormal2Buffer = gl.createBuffer();
        }
        if (this.indexBuffer === null) {
            this.indexBuffer = gl.createBuffer();
        }
        if (this.edgeIndexBuffer === null) {
            this.edgeIndexBuffer = gl.createBuffer();
        }
        if (this.colorBuffer === null) {
            this.colorBuffer = gl.createBuffer();
        }
        // Update vertex IDs
        for (let i = 0; i < this.vertices.length; i++) {
            this.vertices[i].ID = i;
        }
        // Vertex Buffer
        this.bbox = new AABox3D(0, 0, 0, 0, 0, 0);
        if (this.vertices.length > 0) {
            let P0 = this.vertices[0].pos;
            this.bbox = new AABox3D(P0[0], P0[0], P0[1], P0[1], P0[2], P0[2]);
        }
        let V = new Float32Array(this.vertices.length*3);
        for (let i = 0; i < this.vertices.length; i++) {
            V[i*3] = this.vertices[i].pos[0];
            V[i*3+1] = this.vertices[i].pos[1];
            V[i*3+2] = this.vertices[i].pos[2];
            this.bbox.addPoint(this.vertices[i].pos);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, V, gl.STATIC_DRAW);
        this.vertexBuffer.itemSize = 3;
        this.vertexBuffer.numItems = this.vertices.length;
        
        //Normal buffers
        let N = new Float32Array(this.vertices.length*3);
        let N1 = new Float32Array(this.vertices.length*6);
        let N2 = new Float32Array(this.vertices.length*6);
        for (let i = 0; i < this.vertices.length; i++) {
            let n = this.vertices[i].getNormal();
            for (let k = 0; k < 3; k++) {
                N[i*3+k] = n[k];
                N1[i*6+k] = this.vertices[i].pos[k];
                N1[i*6+3+k] = this.vertices[i].pos[k];
                N2[i*6+k] = 0;
                N2[i*6+3+k] = n[k];
            }
            
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, N, gl.STATIC_DRAW);
        this.normalBuffer.itemSize = 3;
        this.normalBuffer.numItems = this.vertices.length;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vnormal1Buffer);
        gl.bufferData(gl.ARRAY_BUFFER, N1, gl.STATIC_DRAW);
        this.vnormal1Buffer.itemSize = 3;
        this.vnormal1Buffer.numItems = this.vertices.length*2;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vnormal2Buffer);
        gl.bufferData(gl.ARRAY_BUFFER, N2, gl.STATIC_DRAW);
        this.vnormal2Buffer.itemSize = 3;
        this.vnormal2Buffer.numItems = this.vertices.length*2;
        
        //Color buffer
        let C = new Float32Array(this.vertices.length*3);
        for (let i = 0; i < this.vertices.length; i++) {
            if (!(this.vertices[i].color === null)) {
                C[i*3] = this.vertices[i].color[0];
                C[i*3+1] = this.vertices[i].color[1];
                C[i*3+2] = this.vertices[i].color[2];
            }
            else {
                C[i*3] = 1;
                C[i*3+1] = 1;
                C[i*3+2] = 1;
            }    
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, C, gl.STATIC_DRAW);
        this.colorBuffer.itemSize = 3;
        this.colorBuffer.numItems = this.vertices.length;
        
        //Index Buffer
        //First figure out how many triangles need to be used
        let ITris = this.getTriangleIndices();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ITris, gl.STATIC_DRAW);
        this.indexBuffer.itemSize = 1;
        this.indexBuffer.numItems = ITris.length;

        //Edge index buffer
        let IEdges = this.getEdgeIndices();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.edgeIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, IEdges, gl.STATIC_DRAW);
        this.edgeIndexBuffer.itemSize = 1;
        this.edgeIndexBuffer.numItems = IEdges.length;
    }
    
    /** Bind all buffers according to what the shader accepts.
     * This includes vertex positions, normals, colors, lighting,
     * and triangle index buffers
     * 
     * @param {object} canvas canvas object (see render() doc for more info)
     * @param {object} sProg A shader program to use
     * @param {glMatrix.mat4} pMatrix The projection matrix
     * @param {glMatrix.mat4} mvMatrix The modelview matrix 
     * @param {glMatrix.mat4} tMatrix Transformation to apply to the mesh before viewing
     * 
     * */
    sendBuffersToGPU(canvas, sProg, pMatrix, mvMatrix, tMatrix) {
        let gl = canvas.gl;
        if ('vPosAttrib' in sProg) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
            gl.vertexAttribPointer(sProg.vPosAttrib, this.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
        }
        //Normal buffer (only relevant if lighting)
        if ('vNormalAttrib' in sProg) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
            gl.vertexAttribPointer(sProg.vNormalAttrib, this.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);
        }
        // Color buffers for per-vertex colors
        if ('vColorAttrib' in sProg) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
            gl.vertexAttribPointer(sProg.vColorAttrib, this.colorBuffer.itemSize, gl.FLOAT, false, 0, 0);
        }

        // Material properties
        if ('uKaUniform' in sProg) {
            let ka = PolyMesh.DEFAULT_AMBIENT;
            if ('ka' in canvas.material) {
                ka = canvas.material.ka;
            }
            gl.uniform3fv(sProg.uKaUniform, ka);
        }
        if ('uKdUniform' in sProg) {
            let kd = glMatrix.vec3.fromValues(1.0, 1.0, 1.0);
            if ('kd' in canvas.material) {
                kd = canvas.material.kd;
            }
            gl.uniform3fv(sProg.uKdUniform, kd);
        }
        if ('uKsUniform' in sProg) {
            let ks = PolyMesh.DEFAULT_SPECULAR;
            if ('ks' in canvas.material) {
                ks = canvas.material.ks;
            }
            gl.uniform3fv(sProg.uKsUniform, ks);
        }
        if ('uShininessUniform' in sProg) {
            let shininess = PolyMesh.DEFAULT_SHININESS;
            if ('shininess' in canvas.material) {
                shininess = canvas.material.shininess;
            }
            gl.uniform1f(sProg.uShininessUniform, shininess);
        }

        // Camera information
        if ('uEyeUniform' in sProg) {
            gl.uniform3fv(sProg.uEyeUniform, canvas.camera.pos);
        }
        if ('uNearUniform' in sProg) {
            gl.uniform1f(sProg.uNearUniform, canvas.camera.near);
        }
        if ('uFarUniform' in sProg) {
            gl.uniform1f(sProg.uFarUniform, canvas.camera.far);
        }

        // Projection and transformation matrices
        gl.uniformMatrix4fv(sProg.pMatrixUniform, false, pMatrix);
        gl.uniformMatrix4fv(sProg.mvMatrixUniform, false, mvMatrix);
        gl.uniformMatrix4fv(sProg.tMatrixUniform, false, tMatrix);

        // Normal matrix
        if ('nMatrixUniform' in sProg) {
            //Compute normal transformation matrix from world transformation matrix
            //(transpose of inverse of upper 3x3 part)
            let nMatrix = glMatrix.mat3.create();
            glMatrix.mat3.normalFromMat4(nMatrix, tMatrix);
            gl.uniformMatrix3fv(sProg.nMatrixUniform, false, nMatrix);
        }

        // Modelview Normal matrix
        if ('nMVMatrixUniform' in sProg) {
            let nMatrix = glMatrix.mat3.create();
            glMatrix.mat3.normalFromMat4(nMatrix, mvMatrix);
            gl.uniformMatrix3fv(sProg.nMVMatrixUniform, false, nMatrix);
        }

        // Lighting
        if ('u_lights' in sProg && 'u_numLights' in sProg) {
            let numLights = Math.min(MAX_LIGHTS, canvas.lights.length);
            gl.uniform1i(sProg.u_numLights, numLights);
            for (let i = 0; i < numLights; i++) {
                gl.uniform3fv(sProg.u_lights[i].pos, canvas.lights[i].pos);
                gl.uniform3fv(sProg.u_lights[i].color, canvas.lights[i].color);
                gl.uniform3fv(sProg.u_lights[i].atten, canvas.lights[i].atten);
            }
        }
    }

    /**
     * Draw the mesh edges as a bunch of line segments
     * @param {object} canvas Object holding info on WebGL/canvas state
     * @param {glMatrix.mat4} tMatrix The transformation matrix to apply 
     *                                to this mesh before viewing
     * @param {array} color An array of RGB, or blue by default
     */
    drawEdges(canvas, tMatrix, color) {
        if (tMatrix === undefined) {
            tMatrix = glMatrix.mat4.create();
        }
        if (color === undefined) {
            color = glMatrix.vec3.fromValues(0.136, 0.846, 0.136);
        }
        let gl = canvas.gl;
        let sProg = canvas.shaders.pointShader;
        let mvMatrix = canvas.camera.getMVMatrix();
        let pMatrix = canvas.camera.getPMatrix();

        gl.useProgram(sProg);
        this.sendBuffersToGPU(canvas, sProg, pMatrix, mvMatrix, tMatrix);
        gl.uniform3fv(sProg.uKaUniform, color);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.edgeIndexBuffer);
        gl.drawElements(gl.LINES, this.edgeIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }

    /**
     * Draw the surface points as a scatter plot
     * 
     * @param {object} canvas Object holding info on WebGL/canvas state
     * @param {glMatrix.mat4} tMatrix The transformation matrix to apply 
     *                                to this mesh before viewing
     * @param {array} color An array of RGB, or red by default
     */
    drawPoints(canvas, tMatrix, color) {
        if (this.drawer === null) {
            console.log("Warning: Trying to draw mesh points, but simple drawer is null");
            return;
        }
        if (color === undefined) {
            color = [1.0, 0.498, 0.055];
        }
        let gl = canvas.gl;
        let sProg = canvas.shaders.pointShader;
        let mvMatrix = canvas.camera.getMVMatrix();
        let pMatrix = canvas.camera.getPMatrix();

        gl.useProgram(sProg);
        this.sendBuffersToGPU(canvas, sProg, pMatrix, mvMatrix, tMatrix);
        gl.uniform3fv(sProg.uKaUniform, color);
        gl.drawArrays(gl.POINTS, 0, this.vertexBuffer.numItems);
    }


    /**
     * Draw the surface normals as a bunch of blue line segments
     * @param {object} canvas Object holding info on WebGL/canvas state
     * @param {glMatrix.mat4} tMatrix The transformation matrix to apply 
     *                                to this mesh before viewing
     * @param {array} color An array of RGB, or blue by default
     * @param {float} scale The length of the normal, as a proportion of 
     *                      the bounding box diagonal
     */
    drawNormals(canvas, tMatrix, color, scale) {
        if (tMatrix === undefined) {
            tMatrix = glMatrix.mat4.create();
        }
        if (color === undefined) {
            color = glMatrix.vec3.fromValues(0.58, 0.404, 0.741);
        }
        if (scale === undefined) {
            scale = 0.05*this.bbox.getDiagLength();
        }
        let gl = canvas.gl;
        let sProg = canvas.shaders.normalShader;
        let mvMatrix = canvas.camera.getMVMatrix();
        let pMatrix = canvas.camera.getPMatrix();

        gl.useProgram(sProg);
        this.sendBuffersToGPU(canvas, sProg, pMatrix, mvMatrix, tMatrix);
        gl.uniform3fv(sProg.uKaUniform, color);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vnormal1Buffer);
        gl.vertexAttribPointer(sProg.n1PosAttrib, this.vnormal1Buffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vnormal2Buffer);
        gl.vertexAttribPointer(sProg.n2PosAttrib, this.vnormal2Buffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.uniform1f(sProg.uRUniform, scale);

        gl.drawArrays(gl.LINES, 0, this.vnormal1Buffer.numItems);
    }


    /**
     Render the mesh using some pre-specified shaders
     * @param {object} canvas An object holding information about WebGL state and viewing configuration.
                                Required Fields    
                                    * gl (WebGL handle)
                                    * shaders (object containing WebGL shader handles, 
                                    *          assuming to have been loaded/compiled)
                                    * camera (Camera object, with getMVMatrix() and getPMatrix())
                
                                    Optional Fields
                                    * shaderToUse (GLSL shader handle)
                                    * ambientColor (vec3), 
                                    * lights (list)
                                    * drawNormals (boolean), 
                                    * drawEdges (boolean),
                                    * drawPoints (boolean)
                                    
     * @param {glMatrix.mat4} tMatrix The transformation matrix to apply to this mesh before viewing.
     *                       If unspecified, it's assumed to be the identity
     */
    render(canvas, tMatrix) {
        if (this.vertices.length == 0) {
            return;
        }
        if (!('gl' in canvas)) {
            throw "Unable to find gl object in the gl canvas when rendering a mesh";
        }
        let gl = canvas.gl;
        if (this.needsDisplayUpdate) {
            this.updateBuffers(gl);
        }
        if (this.vertexBuffer === null) {
            throw "Trying to render when buffers have not been initialized";
        }
        if (!('shaders' in canvas)) {
            throw "Must initialize shaders and store them as a 'shaders' field in canvas before rendering a mesh"
        }
        if (!('camera' in canvas)) {
            throw "Expecting a camera object to be in the canvas when rendering a mesh";
        }
        if (!('getMVMatrix' in canvas.camera)) {
            throw "Expecting getMVMatrix() function in canvas.camera when rendering a mesh";
        }
        if (!('getPMatrix' in canvas.camera)) {
            throw "Expecting getPMatrix() function in canvas.camera when rendering a mesh";
        }
        if (tMatrix === undefined) {
            tMatrix = glMatrix.mat4.create();
        }
        if (!('material' in canvas)) {
            // Diffuse slight greenish gray is default material;
            canvas.material = {ka:PolyMesh.DEFAULT_AMBIENT, 
                                 kd:PolyMesh.DEFAULT_DIFFUSE,
                                ks:PolyMesh.DEFAULT_SPECULAR};
        }

        let mvMatrix = canvas.camera.getMVMatrix();
        let pMatrix = canvas.camera.getPMatrix();
        
        //Step 1: Figure out which shader to use
        if ('shaderToUse' in canvas) {
            let sProg = canvas.shaderToUse;
            gl.useProgram(sProg);
        
            // Step 2: Bind all buffers
            this.sendBuffersToGPU(canvas, sProg, pMatrix, mvMatrix, tMatrix);
            
            // Step 3: Render the mesh
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.drawElements(gl.TRIANGLES, this.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
            
            //Step 4: Draw lines and points for vertices, edges, and normals if requested
            if (canvas.drawNormals) {
                this.drawNormals(canvas, tMatrix);
            }
            if (canvas.drawEdges) {
                this.drawEdges(canvas, tMatrix);
            }
            if (canvas.drawPoints) {
                this.drawPoints(canvas, tMatrix);
            }
            //By the time rendering is done, there should not be a need to update
            //the display unless this flag is changed again externally
            this.needsDisplayUpdate = false;
        }
    }

    /**
     * Save the mesh as an OFF file
     * https://stackoverflow.com/questions/13405129/javascript-create-and-save-file
     * @param {string} filename The suggested filename to use initially when saving
     */
    saveOffFile(filename) {
        if (filename === undefined) {
            filename = "mythis.off";
        }
        let data = "OFF\n"+this.vertices.length+" "+this.faces.length+" 0\n";
        for (let i = 0; i < this.vertices.length; i++) {
            this.vertices[i].ID = i;
            let pos = this.vertices[i].pos;
            for (let k = 0; k < 3; k++) {
                data += pos[k] + " ";
            }
            data += "\n";
        }
        for (let i = 0; i < this.faces.length; i++) {
            let vs = this.faces[i].getVertices();
            data += vs.length + " ";
            for (let k = 0; k < vs.length; k++) {
                data += vs[k].ID + " ";
            }
            data += "\n";
        }
        var file = new Blob([data], {type: "txt"});
        if (window.navigator.msSaveOrOpenBlob) // IE10+
            window.navigator.msSaveOrOpenBlob(file, filename);
        else { // Others
            var a = document.createElement("a"),
                    url = URL.createObjectURL(file);
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);  
            }, 0); 
        }
    }
}
// Default values for rendering
PolyMesh.DEFAULT_AMBIENT = glMatrix.vec3.fromValues(0.05, 0.05, 0.05);
PolyMesh.DEFAULT_DIFFUSE = glMatrix.vec3.fromValues(0.5, 0.55, 0.5);
PolyMesh.DEFAULT_SPECULAR = glMatrix.vec3.create();
PolyMesh.DEFAULT_TRANSMISSION = glMatrix.vec3.create();
PolyMesh.DEFAULT_SHININESS = 50;
PolyMesh.DEFAULT_REFRACTION_RATIO = 1;