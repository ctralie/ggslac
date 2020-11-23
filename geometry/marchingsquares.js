
// Indices relative to (x, y)
// Index 0: (x+1/2, y)
// Index 1: (x+1, y+1/2)
// Index 2: (x+1/2, y+1)
// Index 3: (x, y+1/2)
//  x 0 x
//  3 x 1
//  x 2 x
const MSQUARES_OFFSET = [[1, 0], [2, 1], [1, 2], [0, 1]];
const MSQUARES_LOOKUP = [
    [],             // 0000
    [2, 3],         // 0001 x x
                    //      o x
    [1, 2],         // 0010 x x
                    //      x o
    [1, 3],         // 0011 x x
                    //      o o
    [0, 1],         // 0100 x o
                    //      x x
    [0, 3, 1, 2],   // 0101 x o   saddle
                    //      o x
    [0, 2],         // 0110 x o
                    //      x o
    [0, 3],         // 0111 x o
                    //      o o
    [0, 3],         // 1000 o x
                    //      x x
    [0, 2],         // 1001 o x
                    //      o x
    [0, 1, 2, 3],   // 1010 o x  saddle
                    //      x o
    [0, 1],         // 1011 o x
                    //      o o
    [1, 3],         // 1100 o o
                    //      x x
    [1, 2],         // 1101 o o
                    //      o x
    [2, 3],         // 1110 o o
                    //      x o
    []              // 1111
]

MS_COLORCYCLE = ["#ff7f0e", "#2ca02c", "#d62728", "#1f77b4", "#9467bd", "#8c564b", "#e377c2", "#bcbd22", "#17becf"];

/**
 * Perform marching squares to extract a levelset from 
 * a rasterized 2D function
 * @param {2d array} I Rasterized 2D function
 * @param {pixWidth} float Width of each pixel
 * @param {float} isolevel Isocontour cutoff level
 * @param {boolean} interpolation If true, do linear interpolation to
 *                                update positions of contours
 */
// TODO: Deal with saddle
function marchingSquares(I, pixWidth, isolevel, interpolation) {
    if (interpolation === undefined) {
        interpolation = true;
    }
    let NV = 0; // Number of vertices
    let varr =  []; // Sparse array for storing vertices actually used
    let edges = []; // Edges connecting vertices
    // Step 1: Extract isocontour locations and setup vertices/edges
    for (let y = 1; y < I.length-1; y++) {
        for (let x = 1; x < I[y].length-1; x++) {
            let idx = (I[y][x] > isolevel) << 3;
            idx = idx | (I[y][x+1] > isolevel) << 2;
            idx = idx | (I[y+1][x+1] > isolevel) << 1;
            idx = idx | (I[y+1][x] > isolevel);
            if (idx == 5 || idx == 10) {
                // Check saddles
                let central = 0.25*(I[y][x]+I[y][x+1]+I[y+1][x+1]+I[y+1][x]);
                if (central < isolevel) {
                    if (idx == 5) {
                        idx = 10;
                    }
                    else {
                        idx = 5;
                    }
                }
            }
            let indices = MSQUARES_LOOKUP[idx];
            for (let k = 0; k < indices.length; k += 2) {
                let edge = [];
                for (let a = 0; a < 2; a++) {
                    let xa = 2*x + MSQUARES_OFFSET[indices[k+a]][0];
                    let ya = 2*y + MSQUARES_OFFSET[indices[k+a]][1];
                    if (varr[ya] === undefined) {
                        varr[ya] = [];
                    }
                    if (varr[ya][xa] === undefined) {
                        varr[ya][xa] = NV;
                        NV++;
                    }
                    edge.push(varr[ya][xa]);
                }
                edges.push(edge);
            }
        }
    }
    // Step 2: Pull out coordinates of all vertices that were defined,
    // and improve their locations based on linear interpolation
    vertices = new Float32Array(NV*2);
    varr.forEach(function(arr, y) {
        arr.forEach(function(idx, x) {
            let x1 = x*pixWidth/2 + pixWidth/2;
            let y1 = y*pixWidth/2 + pixWidth/2;
            // TODO: Add interpolation
            vertices[idx*2] = x1;
            vertices[idx*2+1] = y1;
        });
    });
    return {'vertices':vertices, 'edges':edges};
}

/**
 * Union find "find" with path-compression
 * @param {array} UFP list of pointers to parent nodes 
 * @param {int} u Index of the node to find
 * @return Index of the parent of the component of u
 */
function UFFind(UFP, u) {
    if (UFP[u] != u) {
        UFP[u] = UFFind(UFP, UFP[u]);
    }
    return UFP[u];
}

/**
 * Union find "union"
 * @param {array} UFP List of pointers to parent nodes 
 * @param {array} ranks Ranks of each node
 * @param {int} u Index of the first node
 * @param {int} v Index of the second node
 */
function UFUnion(UFP, ranks, u, v) {
    u = UFFind(UFP, u);
    v = UFFind(UFP, v);
    if (u != v) { 
        // If they're not yet in the same component
        let x = u;
        let y = v;
        if (ranks[x] < ranks[y]) {
            x = v;
            y = u;
        }
        UFP[y] = x;
        if (ranks[x] == ranks[y]) {
            ranks[x]++;
        }
    }
}

/**
 * Extract the connected components in an undirected graph
 * @param {list of [i1, i2]} edges Edges in graph
 * @param {int} N Number of nodes in the graph
 * @return {"components": list of list, "IDs":ID of each vertex} 
 */
function getConnectedComponents(edges, N) {
    let UFP = new Float32Array(N);
    let ranks = new Float32Array(N);
    for (let i = 0; i < N; i++) {
        UFP[i] = i;
    }
    edges.forEach(function(edge) {
        UFUnion(UFP, ranks, edge[0], edge[1]);
    });
    let set = new Set();
    let components = [];
    let numToIdx = {};
    let IDs = [];
    for (let i = 0; i < N; i++) {
        let c = UFFind(UFP, i);
        if (!set.has(c)) {
            numToIdx[c] = set.size;
            set.add(c);
            components.push([]);
        }
        components[numToIdx[c]].push(i);
        IDs.push(numToIdx[c]);
    }
    return {"components":components, "IDs":IDs};
}

class MarchingSquaresCanvas {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        //Need this to disable that annoying menu that pops up on right click
        canvas.addEventListener("contextmenu", function(e){ e.stopPropagation(); e.preventDefault(); return false; }); 
        this.pixWidth = 1;
        this.contour = {'vertices':[], 'edges':[]};
        this.I = [[]];
        // For drawing the image offscreen
        this.osc = document.createElement('canvas');
        this.oscCtx = this.osc.getContext('2d');
        this.image = null;
    }

    /**
     * Update the scalar function associated to this canvas
     * and render to an image offscreen
     * @param {2d array} I A floating point scalar function
     * @return A promise that resolves when the new image is drawn
     */
    updateImage(I) {
        this.I = I;
        let W = I[0].length;
        let H = I.length;
        this.pixWidth = this.canvas.width/Math.max(W, H);
        // Figure out max-min elements so the image can
        // be scaled to the full grayscale range
        let max = I[0][0];
        let min = I[0][0];
        for (let i = 0; i < H; i++) {
            for (let j = 0; j < W; j++) {
                max = Math.max(max, I[i][j]);
                min = Math.min(min, I[i][j]);
            }
        }
        this.max = max;
        this.min = min;
        // Draw image to offscreen canvas
        this.osc.width = W;
        this.osc.height = H;
        let imgData = new ImageData(W, H);
        const scale = this.max - this.min;
        let i = 0;
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const g = Math.round(255*(I[H-1-y][x]-this.min)/scale);
                for (let k = 0; k < 3; k++) {
                    imgData.data[i] = g;
                    i++;
                }
                imgData.data[i] = 255;
                i++;
            }
        }
        this.oscCtx.putImageData(imgData, 0, 0);
        this.image = new Image();
        this.image.src = this.osc.toDataURL();
        this.contour = {'vertices':[], 'edges':[]};
        let that = this;
        return new Promise(resolve => {
            this.image.onload = function() {
                that.drawMatrix();
                resolve();
            };
        });
    }

    /**
     * Create image based on a function
     * @param {function handle (x, y) => float} fn 2D scalar function
     * @param {int} res of function
     * @return A promise that resolves when the new image is drawn
     */
    computeFunction(fn, res) {
        let I = [];
        for (let i = 0; i < res; i++) {
            let y = 2*(i-res/2)/res;
            I[i] = new Float32Array(res);
            for (let j = 0; j < res; j++) {
                let x = 2*(j-res/2)/res;
                I[i][j] = fn(x, y);
            }
        }
        return this.updateImage(I);
    }

    /**
     * Compute an indexed mesh representation treating the image as a heightmap
     * putting X, Y on the mesh [-1, 1] x [-1, 1]
     * @param {int} res of function
     * @return A basicmesh object for this heightmap
     */
    getHeightmapMesh(res) {
        let mesh = new BasicMesh();
        for (let i = 0; i < res; i++) {
            let y = 2*(i-res/2)/res;
            for (let j = 0; j < res; j++) {
                let x = 2*(j-res/2)/res;
                let z = this.I[i][j];
                mesh.addVertex(glMatrix.vec3.fromValues(x, y, z));
            }
        }
        for (let i = 0; i < res-1; i++) {
            for (let j = 0; j < res-1; j++) {
                let d = mesh.vertices[i*res+j];
                let c = mesh.vertices[(i+1)*res+j];
                let b = mesh.vertices[(i+1)*res+j+1];
                let a = mesh.vertices[i*res+j+1];
                mesh.addFace([a, b, c, d]);
            }
        }
        mesh.needsDisplayUpdate = true;
        return mesh;
    }

    /**
     * Update the levelset that is drawn
     * @param {float} isolevel 
     */
    updateIsocontour(isolevel) {
        this.isolevel = isolevel;
        this.contour = marchingSquares(this.I, this.pixWidth, isolevel);
        this.drawMatrix();
    }

    /**
     * Compute the loops in the isocontour, and make sure they are
     * specified in order of the polygon
     */
    getContourLoops() {
        let edges = this.contour.edges;
        if (edges.length == 0) {
            return [];
        }
        let vertices = this.contour.vertices;
        let N = vertices.length/2;
        let IDs = getConnectedComponents(edges, N).IDs;
        let v2edge = [];
        for (let i = 0; i < edges.length; i++) {
            for (let k = 0; k < 2; k++) {
                let idx = edges[i][k];
                if (v2edge[idx] === undefined) {
                    v2edge[idx] = [];
                }
                v2edge[idx].push(i);
            }
        }
        let vs = [];
        let visited = [];
        for (let i = 0; i < N; i++) {
            visited[i] = false;
        }
        for (let vi = 0; vi < N; vi++) {
            if (!visited[vi]) {
                let stack = [vi];
                while (stack.length > 0) {
                    let i = stack.pop();
                    if (!visited[i]) {
                        visited[i] = true;
                        if (vs[IDs[i]] === undefined) {
                            vs[IDs[i]] = [];
                        }
                        vs[IDs[i]].push([vertices[i*2], vertices[i*2+1]]);
                        let ei = v2edge[i];
                        for (let k = 0; k < ei.length; k++) {
                            let j = edges[ei[k]][0];
                            if (i == j) {
                                j = edges[ei[k]][1];
                            }
                            if (!visited[j]) {
                                stack.push(j);
                            }
                        }
                    }
                }
            }
        }
        return vs;
    }

    /**
     * Draw the heightmap as a grayscale image
     * where brighter is higher cost.  Also superimpose an
     * isocontour if it is defined
     */
    drawMatrix() {
        const that = this;
        const ctx = this.ctx;
		const W = this.canvas.width;
		const H = this.canvas.height;
		ctx.clearRect(0, 0, W, H); // Puts white over everything to clear it
        // First draw the image
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.image, 0, 0, W, H);
        // Now draw the connected components
        let vs = this.getContourLoops();
        for (let i = 0; i < vs.length; i++) {
            // Color by membership to a connected component
            let hexColor = MS_COLORCYCLE[i%MS_COLORCYCLE.length];
            let N = vs[i].length;
            for (let j = 0; j < N; j++) {
                let x1 = vs[i][j][0];
                let y1 = H - vs[i][j][1];
                let x2 = vs[i][(j+1)%N][0];
                let y2 = H - vs[i][(j+1)%N][1];
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = hexColor;
                ctx.stroke();   
            }
        }
    }

    /**
     * Draw 3D contour using a SimpleDrawer object
     * @param {int} res Resolution of drawing
     * @param {SimpleDrawer} drawer Handle to simpler drawer to which to draw these contours
     * @param {float} s The amount by which to offset the isocontour for z-fighting
     */ 
    draw3DContour(res, drawer, s) {
        if (s === undefined) {
            s = 0.02;
        }
        const z = this.isolevel + s;
        const that = this;
        drawer.reset();
        let vs = this.getContourLoops();
        for (let i = 0; i < vs.length; i++) {
            let hexColor = MS_COLORCYCLE[i%MS_COLORCYCLE.length];
            let rgball = parseInt(hexColor.substring(1), 16);
            let r = ((rgball >> 16) & 255)/255.0;
            let g = ((rgball >> 8) & 255)/255.0;
            let b = (rgball & 255)/255.0;
            const rgb = [r, g, b];
            const N = vs[i].length;
            for (let j = 0; j < N; j++) {
                let x1 = 2.0*vs[i][j][0]/res - 1;
                let y1 = 2.0*vs[i][j][1]/res - 1;
                let x2 = 2.0*vs[i][(j+1)%N][0]/res - 1;
                let y2 = 2.0*vs[i][(j+1)%N][1]/res - 1;
                let v1 = glMatrix.vec3.fromValues(x1, y1, z);
                let v2 = glMatrix.vec3.fromValues(x2, y2, z);
                // Color by membership to a connected component
                drawer.drawLine(v1, v2, rgb);
            }
        }
    }
}