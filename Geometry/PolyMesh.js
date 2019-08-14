//TODO: Figure out how to jointly require gl-matrix-min.js

function MeshVertex(P, ID) {
    this.pos = vec3.clone(P); //Type vec3
    this.texCoords = [0.0, 0.0];
    this.ID = ID;
    this.edges = [];
    this.component = -1;//Which connected component it's in
    this.color = null;
    
    this.getVertexNeighbors = function() {
        var ret = Array(this.edges.length);
        for (var i = 0; i < this.edges.length; i++) {
            ret[i] = this.edges[i].vertexAcross(this);
        }
        return ret;
    }
    
    //Return a set of all faces attached to this vertex
    this.getAttachedFaces = function() {
    var ret = [];
        for (var i = 0; i < this.edges.length; i++) {
            //TODO: Takes O(n^2) time right now.  Should use hash or tree-based
            //set instead of Javascript array
            if (!(this.edges[i].f1 === null)) {
                if (ret.indexOf(this.edges[i].f1) == -1) {
                    ret.push(this.edges[i].f1);
                }
            }
            if (!(this.edges[i].f2 === null)) {
                if (ret.indexOf(this.edges[i].f2) == -1) {
                    ret.push(this.edges[i].f2);
                }
            }
        }
        return ret;
    }
    
    //Return the area of the one-ring faces attached to this vertex
    this.getOneRingArea = function() {
        var faces = this.getAttachedFaces();
        var ret = 0.0;
        for (var i = 0; i < faces.length; i++) {
            ret += faces[i].getArea();
        }
        return ret;
    }
    
    //Get an estimate of the vertex normal by taking a weighted
    //average of normals of attached faces    
    this.getNormal = function() {
        faces = this.getAttachedFaces();
        var normal = vec3.fromValues(0, 0, 0);
        var w;
        var N;
        for (var i = 0; i < faces.length; i++) {
            w = faces[i].getArea();
            N = faces[i].getNormal();
            vec3.scale(N, N, w);
            vec3.add(normal, normal, N);
        }
        vec3.normalize(normal, normal);
        //console.log(vec3.sqrLen(normal));
        return normal;
    }
}

function MeshFace(ID) {
    this.ID = ID;
    this.edges = []; //Store edges in CCW order
    this.startV = 0; //Vertex object that starts it off
    
    this.flipNormal = function() {
        //Reverse the specification of the edges to make the normal
        //point in the opposite direction
        this.edges.reverse();
        this.normal = null;
    }
    
    this.getVertices = function() {
        var ret = Array(this.edges.length);
        var v = this.startV;
        for (var i = 0; i < this.edges.length; i++) {
            ret[i] = v;
            v = this.edges[i].vertexAcross(v);
        }
        return ret;
    }
    
    //Return a cloned array of mesh vertices
    this.getVerticesPos = function() {
        var ret = Array(this.edges.length);
        var v = this.startV;
        for (var i = 0; i < this.edges.length; i++) {
            ret[i] = vec3.clone(v.pos);
            v = this.edges[i].vertexAcross(v);
        }
        return ret;
    }
    
    this.getNormal = function() {
        return getFaceNormal(this.getVerticesPos());
    }
    
    this.getArea = function() {
        var verts = this.getVertices();
        for (var i = 0; i < verts.length; i++) {
            verts[i] = verts[i].pos;
        }
        return getPolygonArea(verts);
    }
    
    this.getCentroid = function() {
        var ret = vec3.fromValues(0, 0, 0);
        var verts = this.getVertices();
        if (verts.length == 0) {
            return ret;
        }
        for (var i = 0; i < verts.length; i++) {
            vec3.add(ret, ret, verts[i].pos);
        }
        vec3.scale(ret, ret, 1.0/verts.length);
        return ret;
    }
    
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
    
    this.addFace = function(face, v1) {
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
    
    //Remove pointer to face
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
    
    this.getCenter = function() {
        var ret = vec3.create();
        vec3.lerp(ret, this.v1.pos, this.v2.pos, 0.5);
        return ret;
    }
    
    this.numAttachedFaces = function() {
        var ret = 0;
        if (!(this.f1 === null)) {
            ret++;
        }
        if (!(this.f2 === null)) {
            ret++;
        }
        return ret;
    }
}

function getFaceInCommon(e1, e2) {
    var e2faces = [];
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

function getEdgeInCommon(v1, v2) {
    for (var i = 0; i < v1.edges.length; i++) {
        if (v1.edges[i].vertexAcross(v1) === v2) {
            return v1.edges[i];
        }
    }
    return null;
}

function getVertexInCommon(e1, e2) {
    var v = [e1.v1, e1.v2, e2.v1, e2.v2];
    for (var i = 0; i < 4; i++) {
        for(var j = i + 1; j < 4; j++) {
            if (v[i] === v[j]) {
                return v[i];
            }
        }
    }
    return null;
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
    
    /////////////////////////////////////////////////////////////
    ////                ADD/REMOVE METHODS                  /////
    /////////////////////////////////////////////////////////////    
    
    this.addVertex = function(P, color) {
        vertex = new MeshVertex(P, this.vertices.length);
        vertex.color = (typeof color !== 'undefined' ? color : null);
        this.vertices.push(vertex);
        return vertex;
    }
    
    //Create an edge between v1 and v2 and return it
    //This function assumes v1 and v2 are valid vertices in the mesh
    this.addEdge = function(v1, v2) {
        edge = new MeshEdge(v1, v2, this.edges.length);
        this.edges.push(edge);
        v1.edges.push(edge);
        v2.edges.push(edge);
        return edge;
    }
    
    //Given a list of pointers to mesh vertices in CCW order
    //create a face object from them
    this.addFace = function(meshVerts) {
        var vertsPos = Array(meshVerts.length);
        for (var i = 0; i < vertsPos.length; i++) {
            vertsPos[i] = meshVerts[i].pos;
        }
        if (!arePlanar(vertsPos)) {
            console.log("Error (PolyMesh.addFace): Trying to add mesh face that is not planar\n")
            for (var i = 0; i < vertsPos.length; i++) {
                console.log(vecStr(vertsPos[i]) + ", ");
            }
            return null;
        }
        if (!are2DConvex(vertsPos)) {
            console.log("Error (PolyMesh.addFace): Trying to add mesh face that is not convex\n");
            for (var i = 0; i < vertsPos.length; i++) {
                console.log(vecStr(vertsPos[i]) + ", ");
            }
            return null;
        }
        var face = new MeshFace(this.faces.length);
        face.startV = meshVerts[0];
        for (var i = 0; i < meshVerts.length; i++) {
            var v1 = meshVerts[i];
            var v2 = meshVerts[(i+1)%meshVerts.length];
            var edge = getEdgeInCommon(v1, v2);
            if (edge === null) {
                edge = this.addEdge(v1, v2);
            }
            face.edges.push(edge);
            edge.addFace(face, v1); //Add pointer to face from edge
        }
        this.faces.push(face);
        return face;
    }
    
    //Remove the face from the list of faces and remove the pointers
    //from all edges to this face
    this.removeFace = function(face) {
        //Swap the face to remove with the last face (O(1) removal)
        this.faces[face.ID] = this.faces[this.faces.length-1];
        this.faces[face.ID].ID = face.ID //Update ID of swapped face
        face.ID = -1;
        this.faces.pop();
        //Remove pointers from all of the face's edges
        for (var i = 0; i < faces.edges.length; i++) {
            edge.removeFace(faces[i]);
        }
    }
    
    //Remove this edge from the list of edges and remove 
    //references to the edge from both of its vertices
    //(NOTE: This function is not responsible for cleaning up
    //faces that may have used this edge; that is up to the client)
    this.removeEdge = function(edge) {
        //Swap the edge to remove with the last edge
        this.edges[edge.ID] = this.edges[this.edges.length-1];
        this.edges[edge.ID].ID = edge.ID; //Update ID of swapped face
        edge.ID = -1;
        this.edges.pop();
        //Remove pointers from the two vertices that make up this edge
        var i = edge.v1.edges.indexOf(edge);
        edge.v1.edges[i] = edge.v1.edges[edge.v1.edges.length-1];
        edge.v1.edges.pop();
        i = edge.v2.edges.indexOf(edge);
        edge.v2.edges[i] = edge.v2.edges[edge.v2.edges.length-1];
        edge.v2.edges.pop();
    }
    
    //Remove this vertex from the list of vertices
    //NOTE: This function is not responsible for cleaning up any of
    //the edges or faces that may have used this vertex
    this.removeVertex = function(vertex) {
        this.vertices[vertex.ID] = this.vertices[this.vertices.length-1];
        this.vertices[vertex.ID].ID = vertex.ID;
        vertex.ID = -1;
        this.vertices.pop();
    }
    
    //Make a clone of this mesh in memory
    this.Clone = function() {
        newMesh = new PolyMesh();
        for (var i = 0; i < this.vertices.length; i++) {
            newMesh.addVertex(this.vertices[i].pos, this.vertices[i].color);
        }
        for (var i = 0; i < this.faces.length; i++) {
            vertices = this.faces[i].getVertices();
            for (var j = 0; j < vertices.length; j++) {
                vertices[j] = newMesh.vertices[vertices[j].ID];
            }
            newMesh.addFace(vertices);
        }
        return newMesh;
    }
    
    
    /////////////////////////////////////////////////////////////
    ////                 GEOMETRY METHODS                   /////
    /////////////////////////////////////////////////////////////

    //Transformations are simple because geometry information is only
    //stored in the vertices
    this.Transform = function(matrix) {
        for (var i = 0; i < this.vertices.length; i++) {
            vec3.transformMat4(this.vertices[i].pos, this.vertices[i].pos, matrix);
        }
        this.needsDisplayUpdate = true;
        this.needsIndexDisplayUpdate = true;
    }
    
    this.Translate = function(dV) {
        for (var i = 0; i < this.vertices.length; i++) {
            vec3.add(this.vertices[i].pos, this.vertices[i].pos, dV);
        }
        this.needsDisplayUpdate = true;
        this.needsIndexDisplayUpdate = true;
    }
    
    this.Scale = function(dx, dy, dz) {
        for (var i = 0; i < this.vertices.length; i++) {
            this.vertices[i].pos[0] *= dx;
            this.vertices[i].pos[1] *= dy;
            this.vertices[i].pos[2] *= dz;
        }
    }

    this.getCentroid = function() {
        center = vec3.fromValues();
        for (var i = 0; i < this.vertices.length; i++) {
            vec3.add(center, center, vertices[i].pos);
        }
        vec3.scale(center, center, 1.0/this.vertices.length);
        return center;
    }
    
    this.getBBox = function() {
        if (this.vertices.length == 0) {
            return AABox3D(0, 0, 0, 0, 0, 0);
        }
        var P0 = this.vertices[0].pos;
        var bbox = new AABox3D(P0[0], P0[0], P0[1], P0[1], P0[2], P0[2]);
        for (var i = 0; i < this.vertices.length; i++) {
            bbox.addPoint(this.vertices[i].pos);
        }
        return bbox;
    }    
    
    /////////////////////////////////////////////////////////////
    ////                LAPLACIAN MESH METHODS              /////
    /////////////////////////////////////////////////////////////
    function LaplaceBeltramiWeightFunc(v1, v2, v3, v4) {
        var w = 0.0;
        if (!(v3 === null)) {
            w = w + getCotangent(v1.pos, v2.pos, v3.pos);
        }
        if (!(v4 === null)) {
            w = w + getCotangent(v1.pos, v2.pos, v4.pos);
        }
        //TODO: Fix area scaling
        //return (3.0/(2.0*v1.getOneRingArea()))*w;
        return w;
    }
    
    function UmbrellaWeightFunc(v1, v2, v3, v4) {
    //Very simple function that returns just 1 for the umbrella weights
        return 1;
    }
    
    //Helper function for Laplacian mesh that figures out the vertex on the 
    //other side of an edge on a triangle
    function getVertexAcross(v1, v2, f) {
        var Vs = f.getVertices();
        if (Vs.length != 3) {
            console.log("Warning(getLaplacianSparseMatrix): Expecting 3 vertices per face");
            return null;
        }
        var idx = 0;
        if ( (v1.ID != Vs[1].ID) && (v2.ID != Vs[1].ID) ) {
            idx = 1;
        }
        else if ( (v1.ID != Vs[2].ID) && (v2.ID != Vs[2].ID) ) {
            idx = 2;
        }
        return Vs[idx];
    }
    
    //Note: This function assumes a triangle mesh    
    this.getLaplacianSparseMatrix = function(weightFunction) {
        var N = this.vertices.length;
        var cols = Array(N); //Store index of row for each element in each column
        var colsv = Array(N); //Store value of each element in each column
        for (var i = 0; i < N; i++) {
            cols[i] = [];
            colsv[i] = [];
        }
        //Loop through all vertices and add a row for each
        for (var i = 0; i < N; i++) {
            var v1 = this.vertices[i];
            //Precompute 1-ring area
            //var oneRingArea = this.vertices[i].getOneRingArea();
            for (var ei = 0; ei < v1.edges.length; ei++) {
                var e = v1.edges[ei];
                var v2 = e.vertexAcross(v1);
                var j = v2.ID;
                var v3 = null;
                var v4 = null;
                if (!(e.f1 === null)) {
                    v3 = getVertexAcross(v1, v2, e.f1);
                }
                if (!(e.f2 === null)) {
                    v4 = getVertexAcross(v1, v2, e.f2);
                }
                var wij = weightFunction(v1, v2, v3, v4);
                totalWeight += wij;
                cols[j].push(i);
                colsv[j].push(-wij);
            }
            cols[i].push(i);
            colsv[i].push(totalWeight)
        }
        //TODO: Parallel sort cols, colsv by the indices in cols, then setup
        //NumericJS sparse matrix
    }
    
    /////////////////////////////////////////////////////////////
    ////                INPUT/OUTPUT METHODS                /////
    /////////////////////////////////////////////////////////////
    this.loadFile = function(filename) {
        var textdata = "";
        $.ajax({
            async: false,
            url: filename,
            success: function (data) {
            textdata = data;
            },
            dataType: 'text'
        });
        this.loadFileFromLines(textdata.split("\n"));
    }
    
    this.loadFileFromLines = function(lines) {
        if (lines.length == 0) {
            return;
        }
        var fields = lines[0].match(/\S+/g);
        if (fields[0].toUpperCase() == "OFF" || fields[0].toUpperCase() == "COFF") {
            this.loadOffFile(lines);
        }
        else {
            console.log("Unsupported file type " + fields[0] + " for loading mesh");
        }
        this.needsDisplayUpdate = true;
        this.needsIndexDisplayUpdate = true;
    }    
    
    this.loadOffFile = function(lines) {
        this.vertices = [];
        this.edges = [];
        this.faces = [];
        this.components = [];
        var nVertices = 0;
        var nFaces = 0;
        var nEdges = 0;
        var face = 0;
        var vertex = 0;
        var divideColor = false;
        var fieldNum = 0;
        for (var line = 0; line < lines.length; line++) {
            //http://blog.tompawlak.org/split-string-into-tokens-javascript
            var fields = lines[line].match(/\S+/g);
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
                P = vec3.fromValues(parseFloat(fields[0]), parseFloat(fields[1]), parseFloat(fields[2]));
                color = null;
                if (fields.length >= 6) {
                    //There is color information
                    var color;
                    if (divideColor) {
                        color = vec3.fromValues(parseFloat(fields[3])/255.0, parseFloat(fields[4])/255.0, parseFloat(fields[5])/255.0);
                    }
                    else {
                        color = vec3.fromValues(parseFloat(fields[3]), parseFloat(fields[4]), parseFloat(fields[5]));
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
                var NVertices = parseInt(fields[0]);
                if (fields.length < NVertices+1) {
                    console.log("Error parsing OFF File: Not enough vertex indices specified for a face of length " + NVertices);
                }
                var verts = Array(NVertices);
                for (var i = 0; i < NVertices; i++) {
                    verts[i] = this.vertices[parseInt(fields[i+1])];
                }
                this.addFace(verts);
                face++;
            }
        }
        for (var i = 0; i < this.vertices.length; i++) {
            if (!(this.vertices[i].color === null)) {
                if (this.vertices[i].color[0] > 1) {
                    //Rescale colors
                    for (var k = 0; k < this.vertices.length; k++) {
                        vec3.scale(this.vertices[i].color, this.vertices[i].color, 1.0/255.0);
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
    
    //Copy over vertex and triangle information to the GPU
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
        var V = new Float32Array(this.vertices.length*3);
        for (var i = 0; i < this.vertices.length; i++) {
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
        var N = new Float32Array(this.vertices.length*3);
        for (var i = 0; i < this.vertices.length; i++) {
            var n = this.vertices[i].getNormal();
            N[i*3] = n[0];
            N[i*3+1] = n[1];
            N[i*3+2] = n[2];
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, N, gl.STATIC_DRAW);
        this.normalBuffer.itemSize = 3;
        this.normalBuffer.numItems = this.vertices.length;
        
        //Color buffer
        var C = new Float32Array(this.vertices.length*3);
        for (var i = 0; i < this.vertices.length; i++) {
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
        var NumTris = 0;
        for (var i = 0; i < this.faces.length; i++) {
            NumTris += this.faces[i].edges.length - 2;
        }
        var I = new Uint16Array(NumTris*3);
        var i = 0;
        var faceIdx = 0;
        //Now copy over the triangle indices
        while (i < NumTris) {
            var verts = this.faces[faceIdx].getVertices();
            for (var t = 0; t < verts.length - 2; t++) {
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
    
    //Draw the surface normals as a bunch of blue line segments
    //PMatrix: The projection matrix
    //mvMatrix: The modelview matrix
    //This assumes the upper left 3x3 matrix of the modelview matrix is orthogonal,
    //which it will be if mvMatrix is describing the camera
    this.drawNormals = function(gl, shaders, pMatrix, mvMatrix) {
        if (this.needsDisplayUpdate) {
            //Figure out scale of normals; make 1/20th of the bounding box diagonal
            var dR = 0.05*this.getBBox().getDiagLength();
            for (var i = 0; i < this.vertices.length; i++) {
                var P1 = this.vertices[i].pos;
                var P2 = this.vertices[i].getNormal();
                vec3.scaleAndAdd(P2, P1, P2, dR);
                this.drawer.drawLine(P1, P2, [0.0, 0.0, 1.0]);    
            }
        }
        this.drawer.repaint(pMatrix, mvMatrix);
    }

    //Draw the surface edges as a bunch of blue line segments
    //PMatrix: The projection matrix
    //mvMatrix: The modelview matrix
    this.drawEdges = function(gl, shaders, pMatrix, mvMatrix) {
        if (this.needsDisplayUpdate) {
            for (var i = 0; i < this.edges.length; i++) {
                var P1 = this.edges[i].v1.pos;
                var P2 = this.edges[i].v2.pos;
                this.drawer.drawLine(P1, P2, [0.0, 0.0, 1.0]);    
            }
        }
        this.drawer.repaint(pMatrix, mvMatrix);
    }


    //Draw the surface points as a red scatterplot
    //PMatrix: The projection matrix
    //mvMatrix: The modelview matrix
    this.drawPoints = function(gl, shaders, pMatrix, mvMatrix) {
        if (this.needsDisplayUpdate) {
            for (var i = 0; i < this.vertices.length; i++) {
                this.drawer.drawPoint(this.vertices[i].pos, [1.0, 0.0, 0.0]);    
            }
        }
        this.drawer.repaint(pMatrix, mvMatrix);
    }
    
    //shaders: Shader programs, pMatrix: Perspective projection matrix, mvMatrix: Modelview matrix
    //ambientColor, light1Pos, light2Pos, lightColor are all vec3s
    //drawNormals: Whether or not to draw blue line segments for the vertex normals
    //shaderType: The type of shading to use
    FLAT_SHADING = 0;
    COLOR_SHADING = 1;
    this.render = function(gl, shaders, pMatrix, mvMatrix, ambientColor, light1Pos, light2Pos, lightColor, doDrawNormals, doDrawEdges, doDrawPoints, shaderType) {
        /*console.log("this.vertexBuffer = " + this.vertexBuffer);
          console.log("this.normalBuffer = " + this.normalBuffer);
          console.log("this.indexBuffer = " + this.indexBuffer);
          console.log("this.colorBuffer = " + this.colorBuffer);*/
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
        
        //Figure out which shader to use
        var sProg; 
        if (shaderType == FLAT_SHADING) {
            sProg = shaders.flatColorShader;
        }
        else if (shaderType == COLOR_SHADING) {
            sProg = shaders.colorShader;
        }
        else {
            console.log("ERROR: Incorrect shader specified for mesh rendering");
            return;
        }
        gl.useProgram(sProg);
        
        //Step 1: Bind all buffers
        //Vertex position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(sProg.vPosAttrib, this.vertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
        if (shaderType == COLOR_SHADING) {
            //Normal buffer (only relevant if lighting)
            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
            gl.vertexAttribPointer(sProg.vNormalAttrib, this.normalBuffer.itemSize, gl.FLOAT, false, 0, 0);
            //Color buffer
            gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
            gl.vertexAttribPointer(sProg.vColorAttrib, this.colorBuffer.itemSize, gl.FLOAT, false, 0, 0);
        }
        //Index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        
        //Step 2: Scale, translate, and rotate the mesh appropriately on top of whatever 
        //world transformation has already been passed along in mvMatrix, by sending over
        //the matrices to the GPU as uniforms.  Also send over lighting variables as uniforms
        gl.uniformMatrix4fv(sProg.pMatrixUniform, false, pMatrix);
        gl.uniformMatrix4fv(sProg.mvMatrixUniform, false, mvMatrix);
        
        if (shaderType == COLOR_SHADING) {
            //Compute normal transformation matrix from world modelview matrix
            //(transpose of inverse of upper 3x3 part)
            nMatrix = mat3.create();
            mat3.normalFromMat4(nMatrix, mvMatrix);
            gl.uniformMatrix3fv(sProg.nMatrixUniform, false, nMatrix);
            
            gl.uniform3fv(sProg.ambientColorUniform, ambientColor);
            gl.uniform3fv(sProg.light1PosUniform, light1Pos);
            gl.uniform3fv(sProg.light2PosUniform, light2Pos);
            gl.uniform3fv(sProg.lightColorUniform, lightColor);
        }
        else if (shaderType == FLAT_SHADING) {
            gl.uniform4fv(sProg.vColorUniform, vec4.fromValues(1, 0.5, 0.5, 1));
        }
        
        //Step 3: Render the mesh
        gl.drawElements(gl.TRIANGLES, this.indexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
        
        //Step 4: Draw lines and points for vertices, edges, and normals if requested
        if (this.needsDisplayUpdate) {
            if (this.drawer === null) {
                this.drawer = new SimpleDrawer(gl, shaders);
            }
            this.drawer.reset();
        }
        if (doDrawNormals) {
            this.drawNormals(gl, shaders, pMatrix, mvMatrix);
        }
        if (doDrawEdges) {
            this.drawEdges(gl, shaders, pMatrix, mvMatrix);
        }
        if (doDrawPoints) {
            this.drawPoints(gl, shaders, pMatrix, mvMatrix);
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
function getIcosahedronMesh() {
    var mesh = new PolyMesh();
    var phi = (1+Math.sqrt(5))/2;
    //Use the unit cube to help construct the icosahedron
    //Front cube face vertices
    var FL = mesh.addVertex(vec3.fromValues(-0.5, 0, phi/2));
    var FR = mesh.addVertex(vec3.fromValues(0.5, 0, phi/2));
    //Back cube face vertices
    BL = mesh.addVertex(vec3.fromValues(-0.5, 0, -phi/2));
    BR = mesh.addVertex(vec3.fromValues(0.5, 0, -phi/2));
    //Top cube face vertices
    TF = mesh.addVertex(vec3.fromValues(0, phi/2, 0.5));
    TB = mesh.addVertex(vec3.fromValues(0, phi/2, -0.5));
    //Bottom cube face vertices
    BF = mesh.addVertex(vec3.fromValues(0, -phi/2, 0.5));
    BB = mesh.addVertex(vec3.fromValues(0, -phi/2, -0.5));
    //Left cube face vertices
    LT = mesh.addVertex(vec3.fromValues(-phi/2, 0.5, 0));
    LB = mesh.addVertex(vec3.fromValues(-phi/2, -0.5, 0));
    //Right cube face vertices
    RT = mesh.addVertex(vec3.fromValues(phi/2, 0.5, 0));
    RB = mesh.addVertex(vec3.fromValues(phi/2, -0.5, 0));
    
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

function getCylinderMesh(axis, center, R, H, color, res) {
    cylinder = new PolyMesh();
    var vertexArr = [];
    var vals = [0, 0, 0];
    //Make the main cylinder part
    for (var i = 0; i < res; i++) {
        vertexArr.push([]);
        for (var j = 0; j < 2; j++) {
            vals[axis[0]] = R*Math.cos(i*2*3.141/res);
            vals[axis[1]] = R*Math.sin(i*2*3.141/res);
            vals[axis[2]] = H/2*(2*j-1)
            var v = vec3.fromValues(vals[0] + center[0], vals[1] + center[1], vals[2] + center[2]);
            vertexArr[i].push(cylinder.addVertex(v, color));
        }
    }
    //Make the faces
    var i2;
    for (var i1 = 0; i1 < res; i1++) {
        i2 = (i1+1) % res;
        cylinder.addFace([vertexArr[i1][0], vertexArr[i2][0], vertexArr[i2][1]]);
        cylinder.addFace([vertexArr[i1][0], vertexArr[i2][1], vertexArr[i1][1]]);
    }
    return cylinder;
}
