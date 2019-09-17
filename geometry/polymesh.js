/* 
Files that have been assumed to have been also loaded
primitives3d.js
cameras3d.js
../utils/blockloader.js
../shaders/shaders.js
../utils/simpledraw.js

*/


function MeshVertex(P, ID) {
    this.pos = glMatrix.vec3.clone(P); //Type glMatrix.vec3
    this.texCoords = [0.0, 0.0];
    this.ID = ID;
    this.edges = [];
    this.component = -1;//Which connected component it's in
    this.color = null;
    
    /**
     * Return a list of vertices attached to this neighbor
     * through an edge.
     * WARNING: This function does a *slow* linear search through all edges
     * 
     * @returns {list of MeshVertex} A list of attached vertices
     */
    this.getVertexNeighbors = function() {
        let ret = Array(this.edges.length);
        for (let i = 0; i < this.edges.length; i++) {
            ret[i] = this.edges[i].vertexAcross(this);
        }
        return ret;
    }
    
    /** 
     * Return a set of all faces attached to this vertex
     * WARNING: This function does a *slow* linear search through all edges
     * 
     * @returns {list of MeshFace} A list of attached faces
     *
     */
    this.getAttachedFaces = function() {
        let ret = new Set();
        for (let i = 0; i < this.edges.length; i++) {
            let f1 = this.edges[i].f1;
            let f2 = this.edges[i].f2;
            if (!(f1 === null) && !(ret.has(f1))) {
                ret.add(f1);
            }
            if (!(f2 === null) && !(ret.has(f2))) {
                ret.add(f2);
            }
        }
        return Array.from(ret);
    }
    
    /**
     * Get an estimate of the vertex normal by taking a weighted
     * average of normals of attached faces    
     */
    this.getNormal = function() {
        faces = this.getAttachedFaces();
        let normal = glMatrix.vec3.fromValues(0, 0, 0);
        let w;
        let N;
        for (let i = 0; i < faces.length; i++) {
            w = faces[i].getArea();
            N = faces[i].getNormal();
            glMatrix.vec3.scale(N, N, w);
            glMatrix.vec3.add(normal, normal, N);
        }
        glMatrix.vec3.normalize(normal, normal);
        //console.log(glMatrix.vec3.sqrLen(normal));
        return normal;
    }
}

function MeshFace(ID) {
    this.ID = ID;
    this.edges = []; //Store edges in CCW order
    this.startV = 0; //Vertex object that starts it off
    
    /**
     * Reverse the specification of the edges to make the normal
     * point in the opposite direction
     */
    this.flipNormal = function() {
        this.edges.reverse();
        this.normal = null;
    }
    
    /**
     * Walk around the face edges and compile a list of all vertices
     * 
     * @returns {list of MeshVertex} Vertices on this face
     */
    this.getVertices = function() {
        let ret = Array(this.edges.length);
        let v = this.startV;
        for (let i = 0; i < this.edges.length; i++) {
            ret[i] = v;
            v = this.edges[i].vertexAcross(v);
        }
        return ret;
    }
    
    /**
     * Return a cloned array of mesh vertices
     * 
     * @returns {list of MeshVertex} Cloned list
     */
    this.getVerticesPos = function() {
        let ret = Array(this.edges.length);
        let v = this.startV;
        for (let i = 0; i < this.edges.length; i++) {
            ret[i] = glMatrix.vec3.clone(v.pos);
            v = this.edges[i].vertexAcross(v);
        }
        return ret;
    }
    
    /**
     * Return the area of this face
     * 
     * @returns {number} Area
     */
    this.getArea = function() {
        let verts = this.getVertices();
        for (var i = 0; i < verts.length; i++) {
            verts[i] = verts[i].pos;
        }
        return GeomUtils.getPolygonArea(verts);
    }

    /**
     * Return the normal of this face
     * 
     * @returns {glMatrix.vec3} Normal, or null if the points are all collinear
     */
    this.getNormal = function() {
        return GeomUtils.getFaceNormal(this.getVerticesPos());
    }
    
    /**
     * Compute a plane spanned by this face
     * 
     * @returns {Plane3D} Plane spanned by this face
     */
    this.getPlane = function() {
        return new Plane3D(this.startV.pos, this.getNormal());
    }
}

function MeshEdge(v1, v2, ID) {
    this.ID = ID;
    this.v1 = v1;
    this.v2 = v2;
    this.f1 = null;
    this.f2 = null;
    
    /**
     * Return the vertex across the edge from this given
     * vertex, or null if the given vertex is not part
     * of the edge
     * 
     * @param {MeshVertex} Starting vertex
     * 
     * @returns {MeshVertex} Vertex across edge
     */
    this.vertexAcross = function(startV) {
        if (startV === this.v1) {
            return this.v2;
        }
        if (startV === this.v2) {
            return this.v1;
        }
        console.log("Warning (vertexAcross): Vertex not member of edge\n");
        return null;
    }
    
    /**
     * Attach a face to this edge
     * 
     * @param {MeshFace} face face to add
     */
    this.addFace = function(face) {
        if (this.f1 === null) {
            this.f1 = face;
        }
        else if (this.f2 === null) {
            this.f2 = face;
        }
        else {
            console.log("Error (addFace): Cannot add face to edge; already 2 there\n");
        }
    }
    
    /**
     * Un-attach a face from this edge
     * 
     * @param {MeshFace} face face to remove
     */
    this.removeFace = function(face) {
        if (this.f1 === face) {
            self.f1 = null;
        }
        else if(self.f2 === face) {
            self.f2 = null;
        }
        else {
            console.log("Error (removeFace); Cannot remove edge pointer to face that was never part of edge\n");
        }
    }
    
    /**
     * Return the face across an edge from a given face, or null
     * if the given face is not attached to this edge
     * 
     * @param {MeshFace} startF the given face
     * 
     * @returns {MeshFace} Face across
     */
    this.faceAcross = function(startF) {
        if (startF === this.f1) {
            return this.f2;
        }
        if (startF === this.f2) {
            return this.f1;
        }
        console.log("Warning (faceAcross): Face not member of edge\n");
        return null;
    }
    
    /**
     * Return the centroid of the edge
     * 
     * @returns {glMatrix.vec3} Centroid
     */
    this.getCenter = function() {
        let ret = glMatrix.vec3.create();
        glMatrix.vec3.lerp(ret, this.v1.pos, this.v2.pos, 0.5);
        return ret;
    }
    
    /**
     * Return the number of faces that are attached to this edge
     * 
     * @returns {int} 0, 1, or 2 faces attached
     */
    this.numAttachedFaces = function() {
        let ret = 0;
        if (!(this.f1 === null)) {
            ret++;
        }
        if (!(this.f2 === null)) {
            ret++;
        }
        return ret;
    }
}


//Main Polygon Mesh Class
function PolyMesh() {
    this.vertices = [];
    this.edges = [];
    this.faces = [];
    this.components = [];
    this.needsDisplayUpdate = true;
    this.needsIndexDisplayUpdate = true;
    this.vertexBuffer = null;
    this.normalBuffer = null;
    this.indexBuffer = null;
    this.colorBuffer = null;
    this.drawer = null;
    
    
    /**
     * A static function to return the face that two edges
     * have in common, if they happen to meet at a face
     * @param {MeshEdge} e1 First edge
     * @param {MeshEdge} e2 Second edge
     * 
     * @returns {MeshFace} The face they have in common, or null
     * if they don't have anything in common
     */
    this.getFaceInCommon = function(e1, e2) {
        let e2faces = [];
        if (!(e2.f1 === null)) {
            e2faces.push(e2.f1);
        }
        if (!(e2.f2 === null)) {
            e2faces.push(e2.f2);
        }
        if (e2faces.indexOf(e1.f1)) {
            return e1.f1;
        }
        if (e2faces.indexOf(e1.f2)) {
            return e1.f2;
        }
        return null;
    }

    /**
     * A static function to return the vertex at which two edges intersect
     * 
     * @param {MeshEdge} e1 First edge
     * @param {MeshEdge} e2 Second edge
     * 
     * @returns {MeshVertex} Vertex shared by the two
     * edges, or null if they don't intersect
     */
    this.getVertexInCommon = function(e1, e2) {
        let v = [e1.v1, e1.v2, e2.v1, e2.v2];
        for (let i = 0; i < 4; i++) {
            for(let j = i + 1; j < 4; j++) {
                if (v[i] === v[j]) {
                    return v[i];
                }
            }
        }
        return null;
    }

    /**
     * A static function to find what edge two vertices have in common
     * 
     * @param {MeshVertex} v1 The first vertex
     * @param {MeshVertex} v2 The second vertex
     * 
     * @returns {MeshEdge} The edge that they both have in common, or
     * null if they don't share an edge
     */
    this.getEdgeInCommon = function(v1, v2) {
        for (let i = 0; i < v1.edges.length; i++) {
            if (v1.edges[i].vertexAcross(v1) === v2) {
                return v1.edges[i];
            }
        }
        return null;
    }

    /////////////////////////////////////////////////////////////
    ////                ADD/REMOVE METHODS                  /////
    /////////////////////////////////////////////////////////////    
    
    /**
     * Add a vertex to this mesh
     * @param {glMatrix.vec3} P Position of vertex
     * @param {list} color Color of vertex, or null if unspecified
     * 
     * @returns {MeshVertex} The new vertex object
     */
    this.addVertex = function(P, color) {
        vertex = new MeshVertex(P, this.vertices.length);
        vertex.color = (typeof color !== 'undefined' ? color : null);
        this.vertices.push(vertex);
        return vertex;
    }
    

    /**
     * Create an edge between v1 and v2 in the mesh
     * This function assumes v1 and v2 are valid vertices in the mesh
     * 
     * @param {MeshVertex} v1
     * @param {MeshVertex} v2
     * 
     * @returns {MeshEdge} The edge that was added
    */
    this.addEdge = function(v1, v2) {
        edge = new MeshEdge(v1, v2, this.edges.length);
        this.edges.push(edge);
        v1.edges.push(edge);
        v2.edges.push(edge);
        return edge;
    }
    

    /**
     * Given a list of pointers to mesh vertices in CCW order
     * create a face object from them and add it to the mesh.
     * Also add any edges that have not been added to the mesh yet
     * 
     * @param {list of MeshVert} meshVerts List of vertices in CCW order
     * 
     * @returns {MeshFace} New face object that's created
     */
    this.addFace = function(meshVerts) {
        let vertsPos = Array(meshVerts.length);
        for (let i = 0; i < vertsPos.length; i++) {
            vertsPos[i] = meshVerts[i].pos;
        }
        if (!arePlanar(vertsPos)) {
            console.log("Error (PolyMesh.addFace): Trying to add mesh face that is not planar\n")
            for (let i = 0; i < vertsPos.length; i++) {
                console.log(glMatrix.vecStr(vertsPos[i]) + ", ");
            }
            return null;
        }
        if (!are2DConvex(vertsPos)) {
            console.log("Error (PolyMesh.addFace): Trying to add mesh face that is not convex\n");
            for (let i = 0; i < vertsPos.length; i++) {
                console.log(glMatrix.vecStr(vertsPos[i]) + ", ");
            }
            return null;
        }
        let face = new MeshFace(this.faces.length);
        face.startV = meshVerts[0];
        for (let i = 0; i < meshVerts.length; i++) {
            let v1 = meshVerts[i];
            let v2 = meshVerts[(i+1)%meshVerts.length];
            let edge = this.getEdgeInCommon(v1, v2);
            if (edge === null) {
                edge = this.addEdge(v1, v2);
            }
            face.edges.push(edge);
            edge.addFace(face, v1); //Add pointer to face from edge
        }
        this.faces.push(face);
        return face;
    }
    
    /**
     * Remove a face from the list of faces and remove the pointers
     * from all edges to this face
     * 
     * @param {MeshFace} face
     */
    this.removeFace = function(face) {
        //Swap the face to remove with the last face (O(1) removal)
        this.faces[face.ID] = this.faces[this.faces.length-1];
        this.faces[face.ID].ID = face.ID //Update ID of swapped face
        face.ID = -1;
        this.faces.pop();
        //Remove pointers from all of the face's edges
        for (let i = 0; i < faces.edges.length; i++) {
            edge.removeFace(faces[i]);
        }
    }
    


    /**
     * Remove an edge from the list of edges and remove 
     * references to the edge from both of its vertices
     * (NOTE: This function is not responsible for cleaning up
     * faces that may have used this edge; that is up to the client)
     * 
     * @param {MeshEdge} edge Edge to remove
     */
    this.removeEdge = function(edge) {
        //Swap the edge to remove with the last edge
        this.edges[edge.ID] = this.edges[this.edges.length-1];
        this.edges[edge.ID].ID = edge.ID; //Update ID of swapped face
        edge.ID = -1;
        this.edges.pop();
        //Remove pointers from the two vertices that make up this edge
        let i = edge.v1.edges.indexOf(edge);
        edge.v1.edges[i] = edge.v1.edges[edge.v1.edges.length-1];
        edge.v1.edges.pop();
        i = edge.v2.edges.indexOf(edge);
        edge.v2.edges[i] = edge.v2.edges[edge.v2.edges.length-1];
        edge.v2.edges.pop();
    }
    
    /**
     * Remove a vertex from the list of vertices in this mesh
     * NOTE: This function is not responsible for cleaning up any of
     * the edges or faces that may have used this vertex
     * 
     * @param {MeshVertex} Vertex to remove
     */
    this.removeVertex = function(vertex) {
        this.vertices[vertex.ID] = this.vertices[this.vertices.length-1];
        this.vertices[vertex.ID].ID = vertex.ID;
        vertex.ID = -1;
        this.vertices.pop();
    }
    

    /**
     * Make a clone of this mesh in memory and return it
     * 
     * @returns {PolyMesh} A clone of this mesh
     */
    this.Clone = function() {
        newMesh = new PolyMesh();
        for (let i = 0; i < this.vertices.length; i++) {
            newMesh.addVertex(this.vertices[i].pos, this.vertices[i].color);
        }
        for (let i = 0; i < this.faces.length; i++) {
            vertices = this.faces[i].getVertices();
            for (let j = 0; j < vertices.length; j++) {
                vertices[j] = newMesh.vertices[vertices[j].ID];
            }
            newMesh.addFace(vertices);
        }
        return newMesh;
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
    this.Transform = function(matrix) {
        this.vertices.forEach(function(v) {
            glMatrix.vec3.transformMat4(v.pos, v.pos, matrix);
        });
        this.needsDisplayUpdate = true;
        this.needsIndexDisplayUpdate = true;
    }
    
    /**
     * Translate a matrix over by a vector
     * 
     * @param {glMatrix.vec3} Vector by which to translate
     */
    this.Translate = function(dV) {
        this.vertices.forEach(function(v) {
            glMatrix.vec3.add(v.pos, v.pos, dV);
        });
        this.needsDisplayUpdate = true;
        this.needsIndexDisplayUpdate = true;
    }
    
    /**
     * Scale the matrix by different amounts across each axis
     * @param {number} dx Scale factor by dx
     * @param {number} dy Scale factor by dy
     * @param {number} dz Scale by factor dz
     */
    this.Scale = function(dx, dy, dz) {
        this.vertices.forEach(function(v) {
            v.pos[0] *= dx;
            v.pos[1] *= dy;
            v.pos[2] *= dz;
        });
        this.needsDisplayUpdate = true;
        this.needsIndexDisplayUpdate = true;
    }
    
    /**
     * Get the axis-aligned bounding box of this mesh
     * 
     * @returns {AABox3D} The axis-aligned bounding box containing the mesh
     */
    this.getBBox = function() {
        if (this.vertices.length == 0) {
            return AABox3D(0, 0, 0, 0, 0, 0);
        }
        let P0 = this.vertices[0].pos;
        let bbox = new AABox3D(P0[0], P0[0], P0[1], P0[1], P0[2], P0[2]);
        this.vertices.forEach(function(v) {
            bbox.addPoint(v.pos);
        });
        return bbox;
    }
    
    /////////////////////////////////////////////////////////////
    ////                INPUT/OUTPUT METHODS                /////
    /////////////////////////////////////////////////////////////
    
    /**
     * Load in the mesh from an array of lines
     */
    this.loadFileFromLines = function(lines) {
        if (lines.length == 0) {
            return;
        }
        let fields = lines[0].match(/\S+/g);
        if (fields[0].toUpperCase() == "OFF" || fields[0].toUpperCase() == "COFF") {
            this.loadOffFile(lines);
        }
        else {
            console.log("Unsupported file type " + fields[0] + " for loading mesh");
        }
        this.needsDisplayUpdate = true;
        this.needsIndexDisplayUpdate = true;
    }    
    
    /**
     * Load in an .off file from an array of lines
     */
    this.loadOffFile = function(lines) {
        this.vertices = [];
        this.edges = [];
        this.faces = [];
        this.components = [];
        let nVertices = 0;
        let nFaces = 0;
        let nEdges = 0;
        let face = 0;
        let vertex = 0;
        let divideColor = false;
        let fieldNum = 0;
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
                        nEdges = parseInt(fields[3]);
                    }
                }
                else {
                    if (fields.length >= 3) {
                        nVertices = parseInt(fields[0]);
                        nFaces = parseInt(fields[1]);
                        nEdges = parseInt(fields[2]);                    
                    }
                    else if (nVertices == 0) {
                        console.log("Error parsing OFF file: Not enough fields for nVertices, nFaces, nEdges");
                    }
                }
            }
            //Reading vertices
            else if (vertex < nVertices) {
                if (fields.length < 3) {
                    console.log("Error parsing OFF File: Too few fields on a vertex line");
                    continue;
                }
                P = glMatrix.vec3.fromValues(parseFloat(fields[0]), parseFloat(fields[1]), parseFloat(fields[2]));
                color = null;
                if (fields.length >= 6) {
                    //There is color information
                    let color;
                    if (divideColor) {
                        color = glMatrix.vec3.fromValues(parseFloat(fields[3])/255.0, parseFloat(fields[4])/255.0, parseFloat(fields[5])/255.0);
                    }
                    else {
                        color = glMatrix.vec3.fromValues(parseFloat(fields[3]), parseFloat(fields[4]), parseFloat(fields[5]));
                    }
                }
                this.addVertex(P, color);
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
                    console.log("Error parsing OFF File: Not enough vertex indices specified for a face of length " + NVertices);
                }
                let verts = Array(NVertices);
                for (let i = 0; i < NVertices; i++) {
                    verts[i] = this.vertices[parseInt(fields[i+1])];
                }
                this.addFace(verts);
                face++;
            }
        }
        for (let i = 0; i < this.vertices.length; i++) {
            if (!(this.vertices[i].color === null)) {
                if (this.vertices[i].color[0] > 1) {
                    //Rescale colors
                    for (let k = 0; k < this.vertices.length; k++) {
                        glMatrix.vec3.scale(this.vertices[i].color, this.vertices[i].color, 1.0/255.0);
                    }
                    break;
                }
            }
        }
        console.log("Succesfully loaded OFF File with " + this.vertices.length + " vertices and " + this.faces.length + " faces");
    }
    
    
    /////////////////////////////////////////////////////////////
    ////                     RENDERING                      /////
    /////////////////////////////////////////////////////////////    
    
    /**
     * Copy over vertex and triangle information to the GPU via
     * a WebGL handle
     * @param {WebGL handle} gl A handle to WebGL
     */
    this.updateBuffers = function(gl) {
        //Check to see if buffers need to be initialized
        if (this.vertexBuffer === null) {
            this.vertexBuffer = gl.createBuffer();
            //console.log("New vertex buffer: " + this.vertexBuffer);
        }
        if (this.normalBuffer === null) {
            this.normalBuffer = gl.createBuffer();
            //console.log("New normal buffer: " + this.normalBuffer);
        }
        if (this.indexBuffer === null) {
            this.indexBuffer = gl.createBuffer();
            //console.log("New index buffer: " + this.indexBuffer);
        }
        if (this.colorBuffer === null) {
            this.colorBuffer = gl.createBuffer();
            //console.log("New color buffer: " + this.colorBuffer);
        }
        //Vertex Buffer
        let V = new Float32Array(this.vertices.length*3);
        for (let i = 0; i < this.vertices.length; i++) {
            V[i*3] = this.vertices[i].pos[0];
            V[i*3+1] = this.vertices[i].pos[1];
            V[i*3+2] = this.vertices[i].pos[2];
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, V, gl.STATIC_DRAW);
        this.vertexBuffer.itemSize = 3;
        this.vertexBuffer.numItems = this.vertices.length;
        
        //Normal buffer
        //TODO: NaNs in normals
        let N = new Float32Array(this.vertices.length*3);
        for (let i = 0; i < this.vertices.length; i++) {
            let n = this.vertices[i].getNormal();
            N[i*3] = n[0];
            N[i*3+1] = n[1];
            N[i*3+2] = n[2];
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, N, gl.STATIC_DRAW);
        this.normalBuffer.itemSize = 3;
        this.normalBuffer.numItems = this.vertices.length;
        
        //Color buffer
        let C = new Float32Array(this.vertices.length*3);
        for (let i = 0; i < this.vertices.length; i++) {
            if (!(this.vertices[i].color === null)) {
                C[i*3] = this.vertices[i].color[0];
                C[i*3+1] = this.vertices[i].color[1];
                C[i*3+2] = this.vertices[i].color[2];
            }
            else {
                //Default color is greenish gray
                C[i*3] = 0.5;
                C[i*3+1] = 0.55;
                C[i*3+2] = 0.5;
            }    
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, C, gl.STATIC_DRAW);
        this.colorBuffer.itemSize = 3;
        this.colorBuffer.numItems = this.vertices.length;
        
        //Index Buffer
        //First figure out how many triangles need to be used
        let NumTris = 0;
        for (let i = 0; i < this.faces.length; i++) {
            NumTris += this.faces[i].edges.length - 2;
        }
        let I = new Uint16Array(NumTris*3);
        let i = 0;
        let faceIdx = 0;
        //Now copy over the triangle indices
        while (i < NumTris) {
            let verts = this.faces[faceIdx].getVertices();
            for (let t = 0; t < verts.length - 2; t++) {
                I[i*3] = verts[0].ID;
                I[i*3+1] = verts[t+1].ID;
                I[i*3+2] = verts[t+2].ID;
                i++;
            }
            faceIdx++;
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, I, gl.STATIC_DRAW);
        this.indexBuffer.itemSize = 1;
        this.indexBuffer.numItems = 3*NumTris;
    }
    
    //This assumes the upper left 3x3 matrix of the modelview matrix is orthogonal,
    //which it will be if mvMatrix is describing the camera
    /**
     * Draw the surface normals as a bunch of blue line segments
     * @param {glMatrix.mat4} pMatrix The projection matrix
     * @param {glMatrix.mat4} mvMatrix The modelview matrix 
     *      This assumes the upper left 3x3 matrix of the modelview matrix 
     *      is orthogonal, which it will be if mvMatrix is describing the camera
     * @param {array} color An array of RGB, or blue by default
     */
    this.drawNormals = function(pMatrix, mvMatrix, color) {
        if (this.drawer === null) {
            console.log("Warning: Trying to draw mesh normals, but simple drawer is null");
            return;
        }
        if (color === undefined) {
            color = [0.0, 0.0, 1.0];
        }
        if (this.needsDisplayUpdate) {
            //Figure out scale of normals; make 1/20th of the bounding box diagonal
            let dR = 0.05*this.getBBox().getDiagLength();
            for (let i = 0; i < this.vertices.length; i++) {
                let P1 = this.vertices[i].pos;
                let P2 = this.vertices[i].getNormal();
                glMatrix.vec3.scaleAndAdd(P2, P1, P2, dR);
                this.drawer.drawLine(P1, P2, color);    
            }
        }
        this.drawer.repaint(pMatrix, mvMatrix);
    }

    /**
     * Draw the surface edges as a bunch of blue line segments
     * 
     * @param {glMatrix.mat4} pMatrix The projection matrix
     * @param {glMatrix.mat4} mvMatrix The modelview matrix 
     * @param {array} color An array of RGB, or blue by default
     */
    this.drawEdges = function(pMatrix, mvMatrix, color) {
        if (this.drawer === null) {
            console.log("Warning: Trying to draw mesh edges, but simple drawer is null");
            return;
        }
        if (color === undefined) {
            color = [1.0, 1.0, 1.0];
        }
        if (this.needsDisplayUpdate) {
            for (let i = 0; i < this.edges.length; i++) {
                let P1 = this.edges[i].v1.pos;
                let P2 = this.edges[i].v2.pos;
                this.drawer.drawLine(P1, P2, color);    
            }
        }
        this.drawer.repaint(pMatrix, mvMatrix);
    }

    /**
     * Draw the surface points as a scatter plot
     * 
     * @param {glMatrix.mat4} pMatrix The projection matrix
     * @param {glMatrix.mat4} mvMatrix The modelview matrix 
     * @param {array} color An array of RGB, or red by default
     */
    this.drawPoints = function(pMatrix, mvMatrix, color) {
        if (this.drawer === null) {
            console.log("Warning: Trying to draw mesh points, but simple drawer is null");
            return;
        }
        if (color === undefined) {
            color = [1.0, 0.0, 0.0];
        }
        if (this.needsDisplayUpdate) {
            for (let i = 0; i < this.vertices.length; i++) {
                this.drawer.drawPoint(this.vertices[i].pos, color);    
            }
        }
        this.drawer.repaint(pMatrix, mvMatrix);
    }
    
    /* Bind all buffers according to what the shader accepts.
     * This includes vertex positions, normals, colors, lighting,
     * and triangle index buffers
     * 
     * @param {WebGL Handle} gl WebGL Handle
     * @param {object} sProg A shader program to use
     * @param {glMatrix.mat4} pMatrix The projection matrix
     * @param {glMatrix.mat4} mvMatrix The modelview matrix 
     * @param {object} opts An object of additional options, including ambientColor, light1Pos, light2Pos, lightColor, doDrawNormals, doDrawEdges, doDrawPoints, shaderToUse
     * 
     * */
    this.sendBuffersToGPU = function(gl, sProg, pMatrix, mvMatrix, opts) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(sProg.vPosAttrib, this.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);

        //Normal buffer (only relevant if lighting)
        if ('vNormalAttrib' in sProg) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
            gl.vertexAttribPointer(sProg.vNormalAttrib, this.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);
        }

        // Color buffers
        if ('vColorAttrib' in sProg) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
            gl.vertexAttribPointer(sProg.vColorAttrib, this.colorBuffer.itemSize, gl.FLOAT, false, 0, 0);
        }
        if ('uColorUniform' in sProg) {
            // The default value of the uniform color is (2, 2, 2).
            // The shader knows to ignore it if it receives 2, 2, 2
            // If the user specified a constant color, then use that instead
            let color = glMatrix.vec3.fromValues(2.0, 2.0, 2.0);
            if ('constColor' in opts) {
                color = opts.constColor;
            }
            gl.uniform3fv(sProg.uColorUniform, color);
        }

        // Projection and transformation matrices
        gl.uniformMatrix4fv(sProg.pMatrixUniform, false, pMatrix);
        gl.uniformMatrix4fv(sProg.mvMatrixUniform, false, mvMatrix);

        // Normal matrix
        if ('nMatrixUniform' in sProg) {
            //Compute normal transformation matrix from world modelview matrix
            //(transpose of inverse of upper 3x3 part)
            nMatrix = glMatrix.mat3.create();
            glMatrix.mat3.normalFromMat4(nMatrix, mvMatrix);
            gl.uniformMatrix3fv(sProg.nMatrixUniform, false, nMatrix);
        }

        // Lighting
        if ('ambientColorUniform' in sProg) {
            let ambientColor = glMatrix.vec3.fromValues(0.1, 0.1, 0.1);
            if ('ambientColor' in opts) {
                ambientColor = opts.ambientColor;
            }
            gl.uniform3fv(sProg.ambientColorUniform, ambientColor);
        }
        if ('light1PosUniform' in sProg) {
            let light1Pos = glMatrix.vec3.fromValues(0, 0, 0);
            if ('light1Pos' in opts) {
                light1Pos = opts.light1Pos;
            }
            gl.uniform3fv(sProg.light1PosUniform, light1Pos);
        }
        if ('light2PosUniform' in sProg) {
            let light2Pos = glMatrix.vec3.fromValues(0, 0, 0);
            if ('light2Pos' in opts) {
                light2Pos = opts.light2Pos;
            }
            gl.uniform3fv(sProg.light2PosUniform, light2Pos);
        }
        if ('lightColorUniform' in sProg) {
            let lightColorUniform = glMatrix.vec3.fromValues(1, 1, 1);
            if ('lightColorUniform' in opts) {
                lightColorUniform = opts.lightColorUniform;
            }
            gl.uniform3fv(sProg.lightColorUniform, lightColorUniform);
        }
    }

    /**
     Render the mesh using some pre-specified shaders
     * @param {WebGL Handle} gl WebGL Handle
     * @param {object} shaders An object with different compiled shader programs, including
     *                        a flat and color shader
     * @param {glMatrix.mat4} pMatrix The projection matrix
     * @param {glMatrix.mat4} mvMatrix The modelview matrix 
     * @param {object} opts An object of additional options, including ambientColor, light1Pos, light2Pos, lightColor, drawNormals, drawEdges, drawPoints, shaderToUse
     */
    this.render = function(gl, shaders, pMatrix, mvMatrix, opts) {
        if (this.vertices.length == 0) {
            return;
        }
        if (this.needsDisplayUpdate) {
            this.updateBuffers(gl);
        }
        if (this.vertexBuffer === null) {
            console.log("Warning: Trying to render when buffers have not been initialized");
            return;
        }
        
        //Step 1: Figure out which shader to use
        let sProg = shaders.flatColorShader;
        if ('shaderToUse' in opts) {
            sProg = opts.shaderToUse;
        }
        gl.useProgram(sProg);
        
        // Step 2: Bind all buffers
        this.sendBuffersToGPU(gl, sProg, pMatrix, mvMatrix, opts)
        
        //Step 3: Render the mesh
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.drawElements(gl.TRIANGLES, this.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
        
        //Step 4: Draw lines and points for vertices, edges, and normals if requested
        if (this.needsDisplayUpdate) {
            if (this.drawer === null) {
                this.drawer = new SimpleDrawer(gl, shaders);
            }
            this.drawer.reset();
        }
        if (opts.drawNormals) {
            this.drawNormals(pMatrix, mvMatrix);
        }
        if (opts.drawEdges) {
            this.drawEdges(pMatrix, mvMatrix);
        }
        if (opts.drawPoints) {
            this.drawPoints(pMatrix, mvMatrix);
        }
        
        if (this.needsDisplayUpdate) {
            //By the time rendering is done, there should not be a need to update
            //the display unless this flag is changed again externally
            this.needsDisplayUpdate = false;
        }
    }
}


/////////////////////////////////////////////////////////////
////                  SPECIAL MESHES                    /////
/////////////////////////////////////////////////////////////

/**
 * Return a mesh with a unit icosahedron
 */
function getIcosahedronMesh() {
    let mesh = new PolyMesh();
    let phi = (1+Math.sqrt(5))/2;
    //Use the unit cube to help construct the icosahedron
    //Front cube face vertices
    let FL = mesh.addVertex(glMatrix.vec3.fromValues(-0.5, 0, phi/2));
    let FR = mesh.addVertex(glMatrix.vec3.fromValues(0.5, 0, phi/2));
    //Back cube face vertices
    BL = mesh.addVertex(glMatrix.vec3.fromValues(-0.5, 0, -phi/2));
    BR = mesh.addVertex(glMatrix.vec3.fromValues(0.5, 0, -phi/2));
    //Top cube face vertices
    TF = mesh.addVertex(glMatrix.vec3.fromValues(0, phi/2, 0.5));
    TB = mesh.addVertex(glMatrix.vec3.fromValues(0, phi/2, -0.5));
    //Bottom cube face vertices
    BF = mesh.addVertex(glMatrix.vec3.fromValues(0, -phi/2, 0.5));
    BB = mesh.addVertex(glMatrix.vec3.fromValues(0, -phi/2, -0.5));
    //Left cube face vertices
    LT = mesh.addVertex(glMatrix.vec3.fromValues(-phi/2, 0.5, 0));
    LB = mesh.addVertex(glMatrix.vec3.fromValues(-phi/2, -0.5, 0));
    //Right cube face vertices
    RT = mesh.addVertex(glMatrix.vec3.fromValues(phi/2, 0.5, 0));
    RB = mesh.addVertex(glMatrix.vec3.fromValues(phi/2, -0.5, 0));
    
    //Add the icosahedron faces associated with each cube face
    //Front cube face faces
    mesh.addFace([TF, FL, FR]);
    mesh.addFace([BF, FR, FL]);
    //Back cube face faces
    mesh.addFace([TB, BR, BL]);
    mesh.addFace([BB, BL, BR]);
    //Top cube face faces
    mesh.addFace([TB, TF, RT]);
    mesh.addFace([TF, TB, LT]);
    //Bottom cube face faces
    mesh.addFace([BF, BB, RB]);
    mesh.addFace([BB, BF, LB]);
    //Left cube face faces
    mesh.addFace([LB, LT, BL]);
    mesh.addFace([LT, LB, FL]);
    //Right cube face faces
    mesh.addFace([RT, RB, BR]);
    mesh.addFace([RB, RT, FR]);
    
    //Add the icosahedron faces associated with each cube vertex
    //Front of cube
    mesh.addFace([FL, TF, LT]); //Top left corner
    mesh.addFace([BF, LB, FL]); //Bottom left corner
    mesh.addFace([FR, RT, TF]); //Top right corner
    mesh.addFace([BF, RB, FR]); //Bottom right corner
    //Back of cube
    mesh.addFace([LT, TB, BL]); //Top left corner
    mesh.addFace([BL, LB, BB]); //Bottom left corner
    mesh.addFace([RT, BR, TB]); //Top right corner
    mesh.addFace([BB, RB, BR]); //Bottom right corner
    return mesh;
}

/**
 * Return a mesh representing a vertically aligned cylinder
 * @param {glMatrix.vec3} center Vector at the center of the cylinder
 * @param {number} R Radius of the cylinder 
 * @param {number} H Height of the cylinder
 * @param {int} res Resolution around the circle of the cylinder
 * @param {array} color Color of the cylinder
 */
function getCylinderMesh(center, R, H, res, color) {
    cylinder = new PolyMesh();
    let vertexArr = [];
    let vals = [0, 0, 0];
    if (color === undefined) {
        color = [0.5, 0.55, 0.5];
    }
    // Make the main cylinder part
    for (let i = 0; i < res; i++) {
        vertexArr.push([]);
        for (let j = 0; j < 2; j++) {
            vals[0] = R*Math.cos(i*2*3.141/res);
            vals[2] = R*Math.sin(i*2*3.141/res);
            vals[1] = H/2*(2*j-1)
            let v = glMatrix.vec3.fromValues(vals[0] + center[0], vals[1] + center[1], vals[2] + center[2]);
            vertexArr[i].push(cylinder.addVertex(v, color));
        }
    }
    let topc = glMatrix.vec3.fromValues(center[0], center[1]+H/2, center[1]);
    topc = cylinder.addVertex(topc, color);
    let botc = glMatrix.vec3.fromValues(center[0], center[1]-H/2, center[1]);
    botc = cylinder.addVertex(botc, color);
    // Make the faces for the open cylinder
    let i2;
    for (let i1 = 0; i1 < res; i1++) {
        i2 = (i1+1) % res;
        cylinder.addFace([vertexArr[i1][0], vertexArr[i2][0], vertexArr[i2][1]]);
        cylinder.addFace([vertexArr[i1][0], vertexArr[i2][1], vertexArr[i1][1]]);
    }
    // Make the faces for the top and bottom
    for (let i1 = 0; i1 < res; i1++) {
        i2 = (i1+1) % res;
        // Top
        cylinder.addFace([vertexArr[i1][1], vertexArr[i2][1], topc]);
        // Bottom
        cylinder.addFace([botc, vertexArr[i2][0], vertexArr[i1][0]]);
    }
    return cylinder;
}


/**
 * Return a mesh representing a vertically aligned cone
 * @param {glMatrix.vec3} center Vector at the center of the cylinder
 * @param {number} R Radius of the cone
 * @param {number} H Height of the cone
 * @param {int} res Resolution around the circle of the cone
 * @param {array} color Color of the cylinder
 */
function getConeMesh(center, R, H, res, color) {
    cone = new PolyMesh();
    let vertexArr = [];
    let vals = [0, 0, 0];
    if (color === undefined) {
        color = [0.5, 0.55, 0.5];
    }
    // Make the base of the cone
    for (let i = 0; i < res; i++) {
        vals[0] = R*Math.cos(i*2*3.141/res);
        vals[2] = R*Math.sin(i*2*3.141/res);
        vals[1] = 0
        let v = glMatrix.vec3.fromValues(vals[0] + center[0], vals[1] + center[1], vals[2] + center[2]);
        vertexArr.push(cone.addVertex(v, color));
    }
    let topc = glMatrix.vec3.fromValues(center[0], center[1]+H, center[1]);
    topc = cone.addVertex(topc, color);
    let botc = glMatrix.vec3.fromValues(center[0], center[1], center[1]);
    botc = cone.addVertex(botc, color);
    // Make the faces for the open cone
    let i2;
    for (let i1 = 0; i1 < res; i1++) {
        i2 = (i1+1) % res;
        cone.addFace([vertexArr[i1], vertexArr[i2], topc]);
    }
    // Make the faces for the bottom
    for (let i1 = 0; i1 < res; i1++) {
        i2 = (i1+1) % res;
        cone.addFace([botc, vertexArr[i2], vertexArr[i1]]);
    }
    return cone;
}