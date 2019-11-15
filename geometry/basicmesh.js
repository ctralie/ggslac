/**
 * A basic, overly redundant mesh class which makes
 * vertices, faces, and edges all first class members
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
    this.flipOrientation = function() {
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
     * Walk around the face edges and compile a list of all
     * adjacent faces
     * 
     * @returns {list of MeshFace} Faces adjacent to this face
     */
    this.getFaceNeighbors = function() {
        let ret = [];
        for (let i = 0; i < this.edges.length; i++) {
            let f = this.edges[i].faceAcross(this);
            if (!(f === null)) {
                ret.push(f);
            }
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

/**
 * 
 * @param {*} v1 
 * @param {*} v2 
 * @param {*} ID 
 */
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
            throw "Cannot add face to edge; already 2 there";
        }
    }
    
    /**
     * Un-attach a face from this edge
     * 
     * @param {MeshFace} face face to remove
     */
    this.removeFace = function(face) {
        if (this.f1 === face) {
            this.f1 = null;
        }
        else if(this.f2 === face) {
            this.f2 = null;
        }
        else {
            throw "Cannot remove edge pointer to face that was never part of edge";
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




function BasicMesh() {
    PolyMesh(this); // Initialize common functions/variables

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
     * create a face object from them and add it to the this.
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
            for (let i = 0; i < vertsPos.length; i++) {
                console.log(glMatrix.vecStr(vertsPos[i]) + ", ");
            }
            throw "Error (BasicMesh.addFace): Trying to add mesh face that is not planar\n"
        }
        if (!are2DConvex(vertsPos)) {
            for (let i = 0; i < vertsPos.length; i++) {
                console.log(glMatrix.vecStr(vertsPos[i]) + ", ");
            }
            throw "Error (BasicMesh.addFace): Trying to add mesh face that is not convex\n"
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
        this.faces[face.ID].ID = face.ID; //Update ID of swapped face
        face.ID = -1;
        this.faces.pop();
        //Remove pointers from all of the face's edges
        for (let i = 0; i < face.edges.length; i++) {
            face.edges[i].removeFace(face);
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
     * @returns {I} A NumTrisx3 Uint16Array of indices into the vertex array
     */
    this.getTriangleIndices = function() {
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
        return I;
    }

    /**
     * Subtract the centroid away from all vertices
     */
    this.subtractCentroid = function() {
        let centroid = glMatrix.vec3.create();
        for (let i = 0; i < this.vertices.length; i++) {
            glMatrix.vec3.add(centroid, centroid, this.vertices[i].pos);
        }
        glMatrix.vec3.scale(centroid, centroid, 1.0/this.vertices.length);
        for (let i = 0; i < this.vertices.length; i++) {
            glMatrix.vec3.subtract(this.vertices[i].pos, this.vertices[i].pos, centroid);
        }
        this.needsDisplayUpdate = true;
    }

    /**
     * @returns {I} A NEdgesx2 Uint16Array of indices into the vertex array
     */
    this.getEdgeIndices = function() {
        let NumEdges = this.edges.length;
        let I = new Uint16Array(NumEdges*2);
        for (let i = 0; i < NumEdges; i++) {
            I[i*2] = this.edges[i].v1.ID;
            I[i*2+1] = this.edges[i].v2.ID;
        }
        return I;
    }

    /**
     * Assuming that each connected component can be consistently oriented,
     * and that the first face of the connected component in the list
     * of faces has the correct global orientation, propagate that orientation
     * throughout each connected component
     */
    this.consistentlyOrientFaces = function() {
        for (let i = 0; i < this.faces.length; i++) {
            this.faces[i].oriented = false;
        }
        for (let i = 0; i < this.faces.length; i++) {
            let stack = [this.faces[i]];
            while (stack.length > 0) {
                let face = stack.pop();
                if (!face.oriented) {
                    face.oriented = true; // By the time we get to
                    // this face, it has been oriented properly
                    let vs1 = face.getVertices();
                    for (let j = 0; j < face.edges.length; j++) {
                        let edge = face.edges[j];
                        let otherFace = edge.faceAcross(face);
                        if (otherFace === null) {
                            continue;
                        }
                        if (otherFace.oriented) {
                            continue;
                        }
                        let vs2 = otherFace.getVertices();
                        // Vertices of edge should be in opposite order
                        // between the two faces
                        let orient1 = false;
                        let orient2 = false;
                        for (let k = 0; k < vs1.length; k++) {
                            if (edge.v1 == vs1[k] && edge.v2 == vs1[(k+1)%vs1.length]) {
                                orient1 = true;
                                break;
                            }
                            else if (edge.v2 == vs1[k] && edge.v1 == vs1[(k+1)%vs1.length]) {
                                orient2 = true;
                                break;
                            }
                        }
                        for (let k = 0; k < vs2.length; k++) {
                            if (edge.v1 == vs2[k] && edge.v2 == vs2[(k+1)%vs2.length]) {
                                orient1 = true;
                                break;
                            }
                            else if (edge.v2 == vs2[k] && edge.v1 == vs2[(k+1)%vs2.length]) {
                                orient2 = true;
                                break;
                            }
                        }
                        if (orient1 == false || orient2 == false) {
                            if (orient1 == false && orient2 == false) {
                                throw "Could not find an orientation in either face " + face.ID + ", " + otherFace.ID;
                            }
                            otherFace.flipOrientation();
                        }
                        stack.push(otherFace);
                    }
                }
            }
        }
        this.needsDisplayUpdate = true;
    }

    /**
     * Reverse the orientation of all faces
     */
    this.reverseOrientation = function() {
        this.faces.forEach(function(face) {
            face.flipOrientation();
        });
        this.needsDisplayUpdate = true;
    }

    /**
     * This function randomly flips orientations of faces
     * to make sure that the consistent orientation function
     * can recover a consistent orientation
     */
    this.randomlyFlipFaceOrientations = function() {
        this.faces.forEach(function(face) {
            if (Math.random() < 0.5) {
                face.flipOrientation();
            }
        });
        this.needsDisplayUpdate = true;
    }

    /**
     * Make a clone of this mesh in memory and return it
     * 
     * @returns {BasicMesh} A clone of this mesh
     */
    this.Clone = function() {
        newMesh = new BasicMesh();
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

    /**
     * Delete all faces, edges, and vertices, in that order
     */
    this.clear = function() {
        while(this.faces.length > 0) {
            this.removeFace(this.faces[this.faces.length-1]);
        }
        while (this.edges.length > 0) {
            this.removeEdge(this.edges[this.edges.length-1]);
        }
        while (this.vertices.length > 0) {
            this.removeVertex(this.vertices[this.vertices.length-1]);
        }
        this.needsDisplayUpdate = true;
    }

    /////////////////////////////////////////////////////////////
    ////                INPUT/OUTPUT METHODS                /////
    /////////////////////////////////////////////////////////////
    this.loadFileFromLines = function(lines) {
        let res = loadFileFromLines(lines);
        this.vertices.length = 0;
        this.edges.length = 0;
        this.faces.length = 0;
        for (let i = 0; i < res['vertices'].length; i++) {
            this.addVertex(res['vertices'][i], res['colors'][i]);
        }
        for (let i = 0; i < res['faces'].length; i++) {
            let face = [];
            for (let j = 0; j < res['faces'][i].length; j++) {
                face.push(this.vertices[res['faces'][i][j]]);
            }
            this.addFace(face);
        }
        for (let i = 0; i < this.faces.length; i++) {
            this.faces[i].ID = i;
        }
        //this.consistentlyOrientFaces();

        console.log("Loaded simple mesh with " + this.vertices.length + " vertices, " + this.edges.length + " edges, and " + this.faces.length + " faces");
        this.needsDisplayUpdate = true;
    }
}







/////////////////////////////////////////////////////////////
////                  SPECIAL MESHES                    /////
/////////////////////////////////////////////////////////////

/**
 * Return a mesh with a unit icosahedron
 */
function getIcosahedronMesh() {
    let mesh = new BasicMesh();
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
    cylinder = new BasicMesh();
    let vertexArr = [];
    let vals = [0, 0, 0];
    if (color === undefined) {
        color = DEFAULT_DIFFUSE;
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
        cylinder.addFace([vertexArr[i2][1], vertexArr[i2][0], vertexArr[i1][0]]);
        cylinder.addFace([vertexArr[i1][1], vertexArr[i2][1], vertexArr[i1][0]]);
    }
    // Make the faces for the top and bottom
    for (let i1 = 0; i1 < res; i1++) {
        i2 = (i1+1) % res;
        // Top
        cylinder.addFace([topc, vertexArr[i2][1], vertexArr[i1][1]]);
        // Bottom
        cylinder.addFace([vertexArr[i2][0], vertexArr[i1][0], botc]);
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
    cone = new BasicMesh();
    let vertexArr = [];
    let vals = [0, 0, 0];
    if (color === undefined) {
        color = DEFAULT_DIFFUSE;
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
        cone.addFace([topc, vertexArr[i2], vertexArr[i1]]);
    }
    // Make the faces for the bottom
    for (let i1 = 0; i1 < res; i1++) {
        i2 = (i1+1) % res;
        cone.addFace([vertexArr[i1], vertexArr[i2], botc]);
    }
    return cone;
}