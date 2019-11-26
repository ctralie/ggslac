/* 
Files that have been assumed to have been also loaded
primitives3d.js
cameras3d.js
../utils/blockloader.js
../shaders/shaders.js
../utils/simpledraw.js

*/

const DEFAULT_AMBIENT = glMatrix.vec3.fromValues(0.05, 0.05, 0.05);
const DEFAULT_DIFFUSE = glMatrix.vec3.fromValues(0.5, 0.55, 0.5);
const DEFAULT_SPECULAR = glMatrix.vec3.create();
const DEFAULT_TRANSMISSION = glMatrix.vec3.create();
const DEFAULT_SHININESS = 50;
const DEFAULT_REFRACTION_RATIO = 1;




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
 * A prototype class for mesh manipulation, which includes some important
 * common functions for buffers and rendering, as well as declarations of
 * functions that should be implemented by subclasses
 * 
 * @param {MeshType} mesh Mesh object for which to fill in 
 *                        functions/instance variables
 */
function PolyMesh(mesh) {
    // A list of vertices, each assumed to have a pos attribute
    mesh.vertices = []; 
    // A list of edges (implementation specific)
    mesh.edges = [];
    // A list of faces (implementation specific)
    mesh.faces = [];
    mesh.needsDisplayUpdate = true;
    mesh.vertexBuffer = null;
    mesh.normalBuffer = null;
    mesh.vnormal1Buffer = null;
    mesh.vnormal2Buffer = null;
    mesh.indexBuffer = null;
    mesh.edgeIndexBuffer = null;
    mesh.colorBuffer = null;
    mesh.bbox = AABox3D(0, 0, 0, 0, 0, 0);

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
    mesh.Transform = function(matrix) {
        mesh.vertices.forEach(function(v) {
            glMatrix.vec3.transformMat4(v.pos, v.pos, matrix);
        });
        mesh.needsDisplayUpdate = true;
    }
    
    /**
     * Translate a matrix over by a vector
     * 
     * @param {glMatrix.vec3} Vector by which to translate
     */
    mesh.Translate = function(dV) {
        mesh.vertices.forEach(function(v) {
            glMatrix.vec3.add(v.pos, v.pos, dV);
        });
        mesh.needsDisplayUpdate = true;
    }
    
    /**
     * Scale the matrix by different amounts across each axis
     * @param {number} dx Scale factor by dx
     * @param {number} dy Scale factor by dy
     * @param {number} dz Scale by factor dz
     */
    mesh.Scale = function(dx, dy, dz) {
        mesh.vertices.forEach(function(v) {
            v.pos[0] *= dx;
            v.pos[1] *= dy;
            v.pos[2] *= dz;
        });
        mesh.needsDisplayUpdate = true;
    }
    
    /**
     * Get the axis-aligned bounding box of this mesh
     * 
     * @returns {AABox3D} The axis-aligned bounding box containing the mesh
     */
    mesh.getBBox = function() {
        if (mesh.vertices.length == 0) {
            return AABox3D(0, 0, 0, 0, 0, 0);
        }
        let P0 = mesh.vertices[0].pos;
        let bbox = new AABox3D(P0[0], P0[0], P0[1], P0[1], P0[2], P0[2]);
        mesh.vertices.forEach(function(v) {
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
    mesh.getBBoxTransformed = function(tMatrix) {
        if (mesh.vertices.length == 0) {
            return AABox3D(0, 0, 0, 0, 0, 0);
        }
        let p = glMatrix.vec3.create();
        glMatrix.vec3.transformMat3(p, mesh.vertices[0].pos, tMatrix);
        let bbox = new AABox3D(p[0], p[0], p[1], p[1], p[2], p[2]);
        mesh.vertices.forEach(function(v) {
            glMatrix.vec3.transformMat3(p, v.pos, tMatrix);
            bbox.addPoint(p);
        });
        return bbox;
    }

    /////////////////////////////////////////////////////////////
    ////                INPUT/OUTPUT METHODS                /////
    /////////////////////////////////////////////////////////////
    mesh.loadFileFromLines = function() {
        throw "Calling loadFileFromLines() from base class, which is not implemented";
    }
    
    /////////////////////////////////////////////////////////////
    ////                     RENDERING                      /////
    /////////////////////////////////////////////////////////////    

    mesh.getTriangleIndices = function() {
        throw "Calling getTriangleIndices() from base class, which is not implemented";
    }

    mesh.getEdgeIndices = function() {
        throw "Calling getEdgeIndices() from base class, which is not implemented";
    }
    
    /**
     * Copy over vertex and triangle information to the GPU via
     * a WebGL handle
     * @param {WebGL handle} gl A handle to WebGL
     */
    mesh.updateBuffers = function(gl) {
        //Check to see if buffers need to be initialized
        if (mesh.vertexBuffer === null) {
            mesh.vertexBuffer = gl.createBuffer();
        }
        if (mesh.normalBuffer === null) {
            mesh.normalBuffer = gl.createBuffer();
        }
        if (mesh.vnormal1Buffer === null) {
            mesh.vnormal1Buffer = gl.createBuffer();
        }
        if (mesh.vnormal2Buffer === null) {
            mesh.vnormal2Buffer = gl.createBuffer();
        }
        if (mesh.indexBuffer === null) {
            mesh.indexBuffer = gl.createBuffer();
        }
        if (mesh.edgeIndexBuffer === null) {
            mesh.edgeIndexBuffer = gl.createBuffer();
        }
        if (mesh.colorBuffer === null) {
            mesh.colorBuffer = gl.createBuffer();
        }
        // Update vertex IDs
        for (let i = 0; i < mesh.vertices.length; i++) {
            mesh.vertices[i].ID = i;
        }
        // Vertex Buffer
        mesh.bbox = new AABox3D(0, 0, 0, 0, 0, 0);
        if (mesh.vertices.length > 0) {
            P0 = mesh.vertices[0].pos;
            mesh.bbox = new AABox3D(P0[0], P0[0], P0[1], P0[1], P0[2], P0[2]);
        }
        let V = new Float32Array(mesh.vertices.length*3);
        for (let i = 0; i < mesh.vertices.length; i++) {
            V[i*3] = mesh.vertices[i].pos[0];
            V[i*3+1] = mesh.vertices[i].pos[1];
            V[i*3+2] = mesh.vertices[i].pos[2];
            mesh.bbox.addPoint(mesh.vertices[i].pos);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, V, gl.STATIC_DRAW);
        mesh.vertexBuffer.itemSize = 3;
        mesh.vertexBuffer.numItems = mesh.vertices.length;
        
        //Normal buffers
        let N = new Float32Array(mesh.vertices.length*3);
        let N1 = new Float32Array(mesh.vertices.length*6);
        let N2 = new Float32Array(mesh.vertices.length*6);
        for (let i = 0; i < mesh.vertices.length; i++) {
            let n = mesh.vertices[i].getNormal();
            for (let k = 0; k < 3; k++) {
                N[i*3+k] = n[k];
                N1[i*6+k] = mesh.vertices[i].pos[k];
                N1[i*6+3+k] = mesh.vertices[i].pos[k];
                N2[i*6+k] = 0;
                N2[i*6+3+k] = n[k];
            }
            
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, N, gl.STATIC_DRAW);
        mesh.normalBuffer.itemSize = 3;
        mesh.normalBuffer.numItems = mesh.vertices.length;
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vnormal1Buffer);
        gl.bufferData(gl.ARRAY_BUFFER, N1, gl.STATIC_DRAW);
        mesh.vnormal1Buffer.itemSize = 3;
        mesh.vnormal1Buffer.numItems = mesh.vertices.length*2;
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vnormal2Buffer);
        gl.bufferData(gl.ARRAY_BUFFER, N2, gl.STATIC_DRAW);
        mesh.vnormal2Buffer.itemSize = 3;
        mesh.vnormal2Buffer.numItems = mesh.vertices.length*2;
        
        //Color buffer
        let C = new Float32Array(mesh.vertices.length*3);
        for (let i = 0; i < mesh.vertices.length; i++) {
            if (!(mesh.vertices[i].color === null)) {
                C[i*3] = mesh.vertices[i].color[0];
                C[i*3+1] = mesh.vertices[i].color[1];
                C[i*3+2] = mesh.vertices[i].color[2];
            }
            else {
                //Default color is greenish gray
                C[i*3] = 0.5;
                C[i*3+1] = 0.55;
                C[i*3+2] = 0.5;
            }    
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, C, gl.STATIC_DRAW);
        mesh.colorBuffer.itemSize = 3;
        mesh.colorBuffer.numItems = mesh.vertices.length;
        
        //Index Buffer
        //First figure out how many triangles need to be used
        let ITris = mesh.getTriangleIndices();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ITris, gl.STATIC_DRAW);
        mesh.indexBuffer.itemSize = 1;
        mesh.indexBuffer.numItems = ITris.length;

        //Edge index buffer
        let IEdges = mesh.getEdgeIndices();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.edgeIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, IEdges, gl.STATIC_DRAW);
        mesh.edgeIndexBuffer.itemSize = 1;
        mesh.edgeIndexBuffer.numItems = IEdges.length;
    }
    
    /** Bind all buffers according to what the shader accepts.
     * This includes vertex positions, normals, colors, lighting,
     * and triangle index buffers
     * 
     * @param {object} glcanvas glcanvas object (see render() doc for more info)
     * @param {object} sProg A shader program to use
     * @param {glMatrix.mat4} pMatrix The projection matrix
     * @param {glMatrix.mat4} mvMatrix The modelview matrix 
     * @param {glMatrix.mat4} tMatrix Transformation to apply to the mesh before viewing
     * 
     * */
    mesh.sendBuffersToGPU = function(glcanvas, sProg, pMatrix, mvMatrix, tMatrix) {
        let gl = glcanvas.gl;
        if ('vPosAttrib' in sProg) {
            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
            gl.vertexAttribPointer(sProg.vPosAttrib, mesh.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
        }
        //Normal buffer (only relevant if lighting)
        if ('vNormalAttrib' in sProg) {
            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.normalBuffer);
            gl.vertexAttribPointer(sProg.vNormalAttrib, mesh.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);
        }
        // Color buffers for per-vertex colors
        if ('vColorAttrib' in sProg) {
            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.colorBuffer);
            gl.vertexAttribPointer(sProg.vColorAttrib, mesh.colorBuffer.itemSize, gl.FLOAT, false, 0, 0);
        }

        // Material properties
        if ('uKaUniform' in sProg) {
            let ka = DEFAULT_AMBIENT;
            if ('ka' in glcanvas.material) {
                ka = glcanvas.material.ka;
            }
            gl.uniform3fv(sProg.uKaUniform, ka);
        }
        if ('uKdUniform' in sProg) {
            // The default value of the constant diffuse color is (2, 2, 2).
            // The shader knows to ignore it if it receives 2, 2, 2 and to 
            // instead rely on the per-vertex color buffer
            // But if the mesh material specifies a diffuse color, then use that instead
            let kd = glMatrix.vec3.fromValues(2.0, 2.0, 2.0);
            if ('kd' in glcanvas.material) {
                kd = glcanvas.material.kd;
            }
            gl.uniform3fv(sProg.uKdUniform, kd);
        }
        if ('uKsUniform' in sProg) {
            let ks = DEFAULT_SPECULAR;
            if ('ks' in glcanvas.material) {
                ks = glcanvas.material.ks;
            }
            gl.uniform3fv(sProg.uKsUniform, ks);
        }
        if ('uShininessUniform' in sProg) {
            let shininess = DEFAULT_SHININESS;
            if ('shininess' in glcanvas.material) {
                shininess = glcanvas.material.shininess;
            }
            gl.uniform1f(sProg.uShininessUniform, shininess);
        }

        // Camera information
        if ('uEyeUniform' in sProg) {
            gl.uniform3fv(sProg.uEyeUniform, glcanvas.camera.pos);
        }
        if ('uNearUniform' in sProg) {
            gl.uniform1f(sProg.uNearUniform, glcanvas.camera.near);
        }
        if ('uFarUniform' in sProg) {
            gl.uniform1f(sProg.uFarUniform, glcanvas.camera.far);
        }

        // Projection and transformation matrices
        gl.uniformMatrix4fv(sProg.pMatrixUniform, false, pMatrix);
        gl.uniformMatrix4fv(sProg.mvMatrixUniform, false, mvMatrix);
        gl.uniformMatrix4fv(sProg.tMatrixUniform, false, tMatrix);

        // Normal matrix
        if ('nMatrixUniform' in sProg) {
            //Compute normal transformation matrix from world modelview matrix
            //(transpose of inverse of upper 3x3 part)
            nMatrix = glMatrix.mat3.create();
            glMatrix.mat3.normalFromMat4(nMatrix, tMatrix);
            gl.uniformMatrix3fv(sProg.nMatrixUniform, false, nMatrix);
        }

        // Lighting
        if ('u_lights' in sProg && 'u_numLights' in sProg) {
            let numLights = Math.min(MAX_LIGHTS, glcanvas.lights.length);
            gl.uniform1i(sProg.u_numLights, numLights);
            for (let i = 0; i < numLights; i++) {
                gl.uniform3fv(sProg.u_lights[i].pos, glcanvas.lights[i].pos);
                gl.uniform3fv(sProg.u_lights[i].color, glcanvas.lights[i].color);
                gl.uniform3fv(sProg.u_lights[i].atten, glcanvas.lights[i].atten);
            }
        }
    }

    /**
     * Draw the mesh edges as a bunch of line segments
     * @param {object} glcanvas Object holding info on WebGL/canvas state
     * @param {glMatrix.mat4} tMatrix The transformation matrix to apply 
     *                                to this mesh before viewing
     * @param {array} color An array of RGB, or blue by default
     */
    mesh.drawEdges = function(glcanvas, tMatrix, color) {
        if (tMatrix === undefined) {
            tMatrix = glMatrix.mat4.create();
        }
        if (color === undefined) {
            color = glMatrix.vec3.fromValues(1.0, 1.0, 1.0);
        }
        let gl = glcanvas.gl;
        let sProg = glcanvas.shaders.pointShader;
        let mvMatrix = glcanvas.camera.getMVMatrix();
        let pMatrix = glcanvas.camera.getPMatrix();

        gl.useProgram(sProg);
        mesh.sendBuffersToGPU(glcanvas, sProg, pMatrix, mvMatrix, tMatrix);
        gl.uniform3fv(sProg.uKaUniform, color);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.edgeIndexBuffer);
        gl.drawElements(gl.LINES, mesh.edgeIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    }

    /**
     * Draw the surface points as a scatter plot
     * 
     * @param {object} glcanvas Object holding info on WebGL/canvas state
     * @param {glMatrix.mat4} tMatrix The transformation matrix to apply 
     *                                to this mesh before viewing
     * @param {array} color An array of RGB, or red by default
     */
    mesh.drawPoints = function(glcanvas, tMatrix, color) {
        if (mesh.drawer === null) {
            console.log("Warning: Trying to draw mesh points, but simple drawer is null");
            return;
        }
        if (color === undefined) {
            color = [1.0, 0.0, 0.0];
        }
        let gl = glcanvas.gl;
        let sProg = glcanvas.shaders.pointShader;
        let mvMatrix = glcanvas.camera.getMVMatrix();
        let pMatrix = glcanvas.camera.getPMatrix();

        gl.useProgram(sProg);
        mesh.sendBuffersToGPU(glcanvas, sProg, pMatrix, mvMatrix, tMatrix);
        gl.uniform3fv(sProg.uKaUniform, color);
        gl.drawArrays(gl.POINTS, 0, mesh.vertexBuffer.numItems);
    }


    /**
     * Draw the surface normals as a bunch of blue line segments
     * @param {object} glcanvas Object holding info on WebGL/canvas state
     * @param {glMatrix.mat4} tMatrix The transformation matrix to apply 
     *                                to this mesh before viewing
     * @param {array} color An array of RGB, or blue by default
     * @param {float} scale The length of the normal, as a proportion of 
     *                      the bounding box diagonal
     */
    mesh.drawNormals = function(glcanvas, tMatrix, color, scale) {
        if (tMatrix === undefined) {
            tMatrix = glMatrix.mat4.create();
        }
        if (color === undefined) {
            color = glMatrix.vec3.fromValues(0.0, 1.0, 1.0);
        }
        if (scale === undefined) {
            scale = 0.05*mesh.bbox.getDiagLength();
        }
        let gl = glcanvas.gl;
        let sProg = glcanvas.shaders.normalShader;
        let mvMatrix = glcanvas.camera.getMVMatrix();
        let pMatrix = glcanvas.camera.getPMatrix();

        gl.useProgram(sProg);
        mesh.sendBuffersToGPU(glcanvas, sProg, pMatrix, mvMatrix, tMatrix);
        gl.uniform3fv(sProg.uKaUniform, color);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vnormal1Buffer);
        gl.vertexAttribPointer(sProg.n1PosAttrib, mesh.vnormal1Buffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vnormal2Buffer);
        gl.vertexAttribPointer(sProg.n2PosAttrib, mesh.vnormal2Buffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.uniform1f(sProg.uRUniform, scale);

        gl.drawArrays(gl.LINES, 0, mesh.vnormal1Buffer.numItems);
    }


    /**
     Render the mesh using some pre-specified shaders
     * @param {object} glcanvas An object holding information about WebGL state and viewing configuration.
                                Required Fields    
                                    * gl (WebGL handle)
                                    * shaders (object containing WebGL shader handles)
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
    mesh.render = function(glcanvas, tMatrix) {
        if (mesh.vertices.length == 0) {
            return;
        }
        if (!('gl' in glcanvas)) {
            throw "Unable to find gl object in the gl canvas when rendering a mesh";
        }
        let gl = glcanvas.gl;
        if (mesh.needsDisplayUpdate) {
            mesh.updateBuffers(gl);
        }
        if (mesh.vertexBuffer === null) {
            throw "Trying to render when buffers have not been initialized";
        }
        if (!('shaders' in glcanvas)) {
            throw "Must initialize shaders and store them as a 'shaders' field in glcanvas before rendering a mesh"
        }
        if (!('camera' in glcanvas)) {
            throw "Expecting a camera object to be in the glcanvas when rendering a mesh";
        }
        if (!('getMVMatrix' in glcanvas.camera)) {
            throw "Expecting getMVMatrix() function in glcanvas.camera when rendering a mesh";
        }
        if (!('getPMatrix' in glcanvas.camera)) {
            throw "Expecting getPMatrix() function in glcanvas.camera when rendering a mesh";
        }
        if (tMatrix === undefined) {
            tMatrix = glMatrix.mat4.create();
        }
        if (!('material' in glcanvas)) {
            // Diffuse slight greenish gray is default material;
            glcanvas.material = {ka:DEFAULT_AMBIENT, 
                                 kd:DEFAULT_DIFFUSE};
        }

        let mvMatrix = glcanvas.camera.getMVMatrix();
        let pMatrix = glcanvas.camera.getPMatrix();
        
        //Step 1: Figure out which shader to use
        let sProg = glcanvas.shaders.blinnPhong;
        if ('shaderToUse' in glcanvas) {
            sProg = glcanvas.shaderToUse;
        }
        gl.useProgram(sProg);
        
        // Step 2: Bind all buffers
        mesh.sendBuffersToGPU(glcanvas, sProg, pMatrix, mvMatrix, tMatrix);
        
        // Step 3: Render the mesh
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
        gl.drawElements(gl.TRIANGLES, mesh.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
        
        //Step 4: Draw lines and points for vertices, edges, and normals if requested
        if (glcanvas.drawNormals) {
            mesh.drawNormals(glcanvas, tMatrix);
        }
        if (glcanvas.drawEdges) {
            mesh.drawEdges(glcanvas, tMatrix);
        }
        if (glcanvas.drawPoints) {
            mesh.drawPoints(glcanvas, tMatrix);
        }
        //By the time rendering is done, there should not be a need to update
        //the display unless this flag is changed again externally
        mesh.needsDisplayUpdate = false;
    }

    /**
     * Save the mesh as an OFF file
     * https://stackoverflow.com/questions/13405129/javascript-create-and-save-file
     */
    mesh.saveOffFile = function(filename) {
        if (filename === undefined) {
            filename = "mymesh.off";
        }
        let data = "OFF\n"+mesh.vertices.length+" "+mesh.faces.length+" 0\n";
        for (let i = 0; i < mesh.vertices.length; i++) {
            mesh.vertices[i].ID = i;
            let pos = mesh.vertices[i].pos;
            for (let k = 0; k < 3; k++) {
                data += pos[k] + " ";
            }
            data += "\n";
        }
        for (let i = 0; i < mesh.faces.length; i++) {
            let vs = mesh.faces[i].getVertices();
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