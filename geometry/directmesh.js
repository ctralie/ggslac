/* 
Files that have been assumed to have been also loaded
polymesh.js
primitives3d.js
cameras3d.js
../shaders/shaders.js
../utils/simpledraw.js

*/

/**
 * A skeleton class to implement the necessary functionality
 * for PolyMesh to be rendered properly
 */
class DirectMeshVertex {
    constructor(pos) {
        this.pos = pos;
        this.normal = [0, 0, 0];
        this.color = [0.6, 0.6, 0.6];
    }
    getNormal() {
        return this.normal;
    }
}

class DirectMesh extends PolyMesh {
    /**
     * A class designed to receive vertex and triangle buffer data
     * directly and to pass it along to webgl buffers
     * 
     * @param {array} VPos A NVertices x 3 2D array of vertex positions
     * @param {array} ITris A NumTris x 3 2D array of triangle indices
     * @param {array} VColors An NVerticesx3 2D array of vertex colors.
     *                        Can be left unspecified, and they will default to gray
     */
    constructor(VPos, ITris, VColors) {
        super(); //Initialize common functions/variables

        // Step 1: Extract the vertices into vertex objects
        this.VPos = VPos;
        this.vertices = [];
        for (let i = 0; i < VPos.length; i++) {
            this.vertices.push(new DirectMeshVertex(VPos[i]));
        }
        if (!(VColors === undefined)) {
            for (let i = 0; i < this.vertices.length; i++) {
                this.vertices[i].color = VColors[i];
            }
        }

        // Step 2: Flatten the triangle indices into a buffer
        this.ITris = new Uint32Array(ITris.length*3);
        for (let i = 0; i < ITris.length; i++) {
            for (let k = 0; k < 3; k++) {
                this.ITris[i*3+k] = ITris[i][k];
            }
        }

        // Step 3: Compute normals from the triangles and store in vertex objects
        for (let i = 0; i < this.ITris.length/3; i++) {
            let a = this.ITris[i*3];
            let b = this.ITris[i*3+1];
            let c = this.ITris[i*3+2];
            let u = glMatrix.vec3.create();
            let v = glMatrix.vec3.create();
            glMatrix.vec3.sub(u, VPos[b], VPos[a]);
            glMatrix.vec3.sub(v, VPos[c], VPos[a]);
            glMatrix.vec3.cross(u, u, v);
            for (let k = 0; k < 3; k++) {
                let idx = this.ITris[i*3+k];
                const N = this.vertices[idx].normal;
                glMatrix.vec3.add(N, N, u);
            }
        }
        for (let i = 0; i < this.vertices.length; i++) {
            const N = this.vertices[i].normal;
            glMatrix.vec3.normalize(N, N);
        }
        this.IEdges = [];
    } 

    getTriangleIndices() {
        return this.ITris;
    }

    getEdgeIndices() {
        if (this.IEdges.length == 0) {
            // Compute and cache an edge index buffer for future use.
            // Will be about 2x redundant for a manifold mesh
            this.IEdges = new Uint32Array(this.ITris.length*2);
            let idx = 0;
            for (let i = 0; i < this.ITris.length/3; i++) {
                for (let f = 0; f < 3; f++) {
                    this.IEdges[idx] = this.ITris[i*3+f];
                    idx++;
                    this.IEdges[idx] = this.ITris[i*3+(f+1)%3];
                    idx++;
                }
            }
        }
        return this.IEdges;
    }
}