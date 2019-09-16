/* 
Files that have been assumed to have been also loaded
../jslibs/gl-matrix-min.js

*/

/////////////////////////////////////////////
///////   ADDITIONS TO GLMATRIX   ///////////
/////////////////////////////////////////////
glMatrix.vecStr = function(v) {
    return "(" + v[0] + "," + v[1] + ", "+ v[2] + ")";
}

glMatrix.mat4Str = function(m) {
    let str = "";
    for (let i = 0; i < 16; i++) {
        let col = i%4;
        let row = (i-col)/4;
        if (row > 0 && col == 0) {
            str += "\n";
        }
        str += m[col*4+row].toFixed(3) + " ";
    }
    return str;
}



/////////////////////////////////////////////
///////////   UTILITY FUNCTIONS   ///////////
/////////////////////////////////////////////

let GeomUtils = function(){};

/**
 * Return whether two vectors are perpendicular, 
 * up to numerical precision
 * @param {glMatrix.vec3} a 
 * @param {glMatrix.vec3} b 
 * 
 * @returns{boolean} True if perpendicular, false if not
 */
function arePerpendicular(a, b) {
    return Math.abs(glMatrix.vec3.dot(a, b)) < 
            glMatrix.EPSILON*Math.min(glMatrix.vec3.sqrLen(a),
                                      glMatrix.vec3.sqrLen(b));
}
GeomUtils.arePerpendicular = arePerpendicular;

/**
 * Return true if the vertices in a list all lie
 * in the same plane and false otherwise
 * @param {list} verts A list of vertices to check
 * 
 * @returns{boolean} True if they are planar, or false if not
 */
function arePlanar(verts) {
    if (verts.length <= 3) {
        return true;
    }
    let v0 = glMatrix.vec3.clone(verts[1]);
    glMatrix.vec3.subtract(v0, v0, verts[0]);
    let v1 = glMatrix.vec3.clone(verts[2]);
    glMatrix.vec3.subtract(v1, v1, verts[0]);
    let n = glMatrix.vec3.create();
    glMatrix.vec3.cross(n, v0, v1);
    glMatrix.vec3.normalize(n, n);
    for (let i = 3; i < verts.length; i++) {
        let v = glMatrix.vec3.clone(verts[i]);
        glMatrix.vec3.subtract(v, v, verts[0]);
        glMatrix.vec3.normalize(v, v);
        if (glMatrix.vec3.sqrLen(n) == 0) {
            //If the first few points happened to be colinear
            glMatrix.vec3.cross(n, v0, v);
        }
        if (GeomUtils.arePerpendicular(v, n)) {
            return false;
        }
    }
    return true;
}
GeomUtils.arePlanar = arePlanar;


/**
 * If the vertices in "verts" form a convex 2D polygon 
 * (in the order specified) return true.  Return false otherwise
 * @param {list} verts A list of vertices to check
 * 
 * @returns{boolean} True if they are convex, or false if not
 */
function are2DConvex(verts) {
    if (verts.length <= 3) {
        return true;
    }
    if (!arePlanar(verts)) {
        return false;
    }
    let v0 = verts[0];
    let v1 = verts[1];
    let v2 = verts[2];
    let diff1 = glMatrix.vec3.clone(v1);
    let diff2 = glMatrix.vec3.clone(v2);
    glMatrix.vec3.subtract(diff1, diff1, v0);
    glMatrix.vec3.subtract(diff2, diff2, v1);
    let lastCross = glMatrix.vec3.create();
    glMatrix.vec3.cross(lastCross, diff1, diff2);
    let cross = glMatrix.vec3.create();
    for (let i = 3; i <= verts.length; i++) {
        v0 = v1;
        v1 = v2;
        v2 = verts[i%verts.length];
        diff1 = glMatrix.vec3.clone(v1);
        diff2 = glMatrix.vec3.clone(v2);
        glMatrix.vec3.subtract(diff1, diff1, v0);
        glMatrix.vec3.subtract(diff2, diff2, v1);
        glMatrix.vec3.cross(cross, diff1, diff2);
        if (glMatrix.vec3.dot(cross, lastCross) < 0) {
            return false;
        }
        lastCross = glMatrix.vec3.clone(cross);
    }
    return true;
}
GeomUtils.are2DConvex = are2DConvex;

/**
 * General purpose method for returning the normal of a face
 * Assumes "verts" are planar and not all collinear
 * NOTE: This properly handles the case where three vertices
 * are collinear right after one another    
 * @param {list of glMatrix.vec3} verts 
 * 
 * @returns{glMatrix.vec3} Normal, or null if the points are all collinear
 */
function getFaceNormal(verts) {
    for (let i = 2; i < verts.length; i++) {
        let v1 = glMatrix.vec3.clone(verts[i-1]);
        glMatrix.vec3.subtract(v1, v1, verts[0]);
        let v2 = glMatrix.vec3.clone(verts[i]);
        glMatrix.vec3.subtract(v2, v2, verts[0]);
        let ret = glMatrix.vec3.create();
        glMatrix.vec3.cross(ret, v1, v2);
        let v1L = glMatrix.vec3.len(v1);
        let v2L = glMatrix.vec3.len(v2);
        if (v1L >0 && v2L > 0 && glMatrix.vec3.len(ret)/(v1L*v2L) > 0) {
            glMatrix.vec3.normalize(ret, ret);
            return ret;
        }
    }
    return null;
}
GeomUtils.getFaceNormal = getFaceNormal;

/**
 * Compute the area of the polygon spanned by
 * a set of 3D vertices
 * 
 * @param {list of glMatrix.vec3} verts 
 * 
 * @returns {number} Area of polygon
 */
function getPolygonArea(verts) {
    if (verts.length < 3) {
        return 0.0;
    }
    let v1 = glMatrix.vec3.clone(verts[1]);
    glMatrix.vec3.subtract(v1, v1, verts[0]);
    let v2 = glMatrix.vec3.clone(v1);
    let vc = glMatrix.vec3.create();
    let area = 0.0;
    for (let i = 2; i < verts.length; i++) {
        v1 = v2;
        v2 = glMatrix.vec3.clone(verts[i]);
        glMatrix.vec3.subtract(v2, v2, verts[0]);
        glMatrix.vec3.cross(vc, v1, v2);
        area += 0.5*glMatrix.vec3.len(vc);
    }
    return area;
}
GeomUtils.getPolygonArea = getPolygonArea;


/////////////////////////////////////////////
///////////   PRIMITIVE OBJECTS   ///////////
/////////////////////////////////////////////

/**
 * An object for representing a 3D plane
 * 
 * @param {glMatrix.vec3} P0 A point on the plane
 * @param {glMatrix.vec3} N The plane normal
 */
function Plane3D(P0, N) {
    // Also store A, B, C, D for implicit plane equation
    this.P0 = glMatrix.vec3.clone(P0);
    this.N = glMatrix.vec3.clone(N);
    glMatrix.vec3.normalize(this.N, this.N);
    
    this.resetEquation = function() {
        this.D = -glMatrix.vec3.dot(this.P0, this.N);
    }

    this.initFromEquation = function(A, B, C, D) {
        this.N = glMatrix.vec3.fromValues(A, B, C);
        this.P0 = glMatrix.vec3.clone(this.N);
        this.P0 = glMatrix.vec3.scale(this.P0, this.P0, -D/glMatrix.vec3.sqrLen(this.N));
        glMatrix.vec3.normalize(this.N, this.N);
        this.resetEquation();
    }

    this.distFromPlane = function(P) {
        return glMatrix.vec3.dot(this.N) + this.D;
    }
    
    this.resetEquation();
}

/**
 * An object for representing a 3D Line
 * 
 * @param {glMatrix.vec3} P0 Initial point on line
 * @param {glMatrix.vec3} V Direction of line
 */
function Line3D(P0, V) {
    this.P0 = glMatrix.vec3.clone(P0);
    this.V = glMatrix.vec3.clone(V);

    /**
     * Determine the intersection of this line with a plane
     * 
     * @param{Plane3D} A plane with which to intersect the line
     * 
     * @returns{{t, P}}, distance and point of intersection, or 
     * null if there is no intersection
     */
    this.intersectPlane = function(plane) {
        const P0 = plane.P0
        const N = plane.N
        const P = this.P0;
        const V = this.V;
        if (GeomUtils.arePerpendicular(N, V)) {
            return null;
        }
        let t = (glMatrix.vec3.dot(P0, N) - glMatrix.vec3.dot(N, P)) / glMatrix.vec3.dot(N, V);
        //intersectP = P + t*V
        let intersectP = glMatrix.vec3.create();
        glMatrix.vec3.scaleAndAdd(intersectP, P, this.V, t);
        return {"t":t, "P":intersectP};
    }
    
    /**
    * Solve for (s, t) in the equation P0 + t*V0 = P1+s*V1
    * This is three equations (x, y, z components) in 2 letiables (s, t)
    * Use Cramer's rule and the fact that there is a linear
    * dependence that only leaves two independent equations
    * (add the last two equations together)
    * [a b][t] = [e]
    * [c d][s]   [f]
    * 
    * @param{Line3D} other Other line
    * 
    * @returns{"t", "P"} Time and point of intersection, or null
    * if there isn't an intersection
    */
    this.intersectOtherLineRet_t = function(other) {
        let P0 = this.P0;
        let V0 = this.V;
        let P1 = other.P0;
        let V1 = other.V;
        let a = V0[0] + V0[2];
        let b = -(V1[0] + V1[2]);
        let c = V0[1] + V0[2];
        let d = -(V1[1] + V1[2]);
        let e = P1[0] + P1[2] - (P0[0] + P0[2]);
        let f = P1[1] + P1[2] - (P0[1] + P0[2]);
        let detDenom = a*d - c*b;
        //Lines are parallel or skew
        if (Math.abs(detDenom) < glMatrix.EPSILON) {
            return null;
        }
        let detNumt = e*d - b*f;
        let detNums = a*f - c*e;
        let t = parseFloat("" + detNumt) / parseFloat("" + detDenom);
        let s = parseFloat("" + detNums) / parseFloat("" + detDenom);
        //return (t, P0 + t*V0)
        let PRet = glMatrix.vec3.create();
        glMatrix.vec3.scaleAndAdd(PRet, P0, V0, t);
        return {"t":t, "P":PRet};
    }
    
    /**
    * Intersect another line in 3D
    * @param{Line3D} other Other line
    * 
    * @returns{glMatrix.vec3} Point of intersection, or null
    * if they don't intersect
    */
    this.intersectOtherLine = function(other) {
        let ret = this.intersectOtherLineRet_t(other);
        if (!(ret === null)) {
            return ret.P;
        }
        return null;
    }
}        

//Axis-aligned 3D box
function AABox3D(xmin, xmax, ymin, ymax, zmin, zmax) {
    this.xmin = xmin;
    this.xmax = xmax;
    this.ymin = ymin;
    this.ymax = ymax;
    this.zmin = zmin;
    this.zmax = zmax;
    
    this.XLen = function() {
        return this.xmax - this.xmin;
    }
    
    this.YLen = function() {
        return this.ymax - this.ymin;
    }
    
    this.ZLen = function() {
        return this.zmax - this.zmin;
    }
    
    this.getDiagLength = function() {
        dX = this.XLen()/2;
        dY = this.YLen()/2;
        dZ = this.ZLen()/2;
        return Math.sqrt(dX*dX + dY*dY + dZ*dZ);
    }
    
    this.getCenter = function() {
        return glMatrix.vec3.fromValues((this.xmax+this.xmin)/2.0, (this.ymax+this.ymin)/2.0, (this.zmax+this.zmin)/2.0);
    }
    
    this.addPoint = function(P) {
        if (P[0] < this.xmin) { this.xmin = P[0]; }
        if (P[0] > this.xmax) { this.xmax = P[0]; }
        if (P[1] < this.ymin) { this.ymin = P[1]; }
        if (P[1] > this.ymax) { this.ymax = P[1]; }
        if (P[2] < this.zmin) { this.zmin = P[2]; }
        if (P[2] > this.zmax) { this.zmax = P[2]; }
    }
    
    this.Union = function(otherBBox) {
        this.xmax = Math.max(this.xmax, otherBBox.xmax);
        this.ymax = Math.max(this.ymax, otherBBox.ymax);
        this.zmax = Math.max(this.zmax, otherBBox.zmax);
    }
    
    this.getStr = function() {
        let s = "[" + this.xmin + ", " + this.xmax + "]";
        s += " x " + "[" + this.ymin + ", " + this.ymax + "]";
        s += " x " + "[" + this.zmin + ", " + this.zmax + "]";
        return s;
    }
}
