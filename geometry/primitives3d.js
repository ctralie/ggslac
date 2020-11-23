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


/**
 * Convert Euler angles from a M = R(y)R(z)R(x) rotation order
 * into a quaternion
 * @param {glMatrix.vec3} r The euler angles, in y, z, x order
 * @returns {glMatrix.quat} The corresponding quaternion
 */
function getQuatFromEulerYZX(r) {
    let ry = r[0];
    let rz = r[1];
    let rx = r[2];
    let c1 = Math.cos(ry/2);
    let s1 = Math.sin(ry/2);
    let c2 = Math.cos(rz/2);
    let s2 = Math.sin(rz/2);
    let c3 = Math.cos(rx/2);
    let s3 = Math.sin(rx/2);
    let c1c2 = c1*c2;
    let s1s2 = s1*s2;
    w =c1c2*c3 - s1s2*s3;
    x =c1c2*s3 + s1s2*c3;
    y =s1*c2*c3 + c1*s2*s3;
    z =c1*s2*c3 - s1*c2*s3;
    return glMatrix.quat.fromValues(x, y, z, w);
}
GeomUtils.getQuatFromEulerYZX = getQuatFromEulerYZX;

/**
 * Convert a quaternion to an Euler angles representation, taking
 * care at the singularities
 * With help from 
 * http://www.euclideanspace.com/maths/geometry/rotations/conversions/quaternionToEuler/
 * 
 * @param {glMatrix.quat} q The quaternion to convert
 * @returns {glMatrix.vec3} The euler angles, in y, z, x order
 */
function getEulerYZXFromQuat(q) {
    let x = q[0];
    let y = q[1];
    let z = q[2];
    let w = q[3];
    let sqw = w*w;
    let sqx = x*x;
    let sqy = y*y;
    let sqz = z*z;
    // Normalization / correction factor
    let unit = sqx + sqy + sqz + sqw; 
    console.log("unit = " + unit);
    let test = x*y + z*w;
    let ry = 0; // Heading / Yaw
    let rz = 0; // Attitude / Pitch
    let rx = 0; // Bank / Roll
    if (test > 0.499*unit) { 
        console.log("North pole singularity");
        // singularity at north pole
        ry = 2 * Math.atan2(x,w);
        rz = Math.PI/2;
        rx = 0;
    }
    else if (test < -0.499*unit) { 
        console.log("South pole singularity");
        // singularity at south pole
        ry = -2*Math.atan2(x,w);
        rz = -Math.PI/2;
        rx = 0;
    }
    else {
        ry = Math.atan2(2*y*w-2*x*z, sqx-sqy-sqz+sqw);
        rz = Math.asin(2*test/unit);
        rx = Math.atan2(2*x*w-2*y*z, -sqx+sqy-sqz+sqw);
    }
    return glMatrix.vec3.fromValues(ry, rz, rx);
}
GeomUtils.getEulerYZXFromQuat = getEulerYZXFromQuat;

/**
 * Return an angle which is linearly interpolated between
 * two angles, which is along the shortest path between them
 * @param {float} a First angle, in radians
 * @param {float} b Second angle, in radians
 * @param {float} t LERP parameter, in [0, 1]
 * @return {float} The interpolated angle along the shortest path from a to b
 */
function angleLERP(a, b, t) {
    function angleIn2PI(x) {
        let fac = Math.floor(x/(2*Math.PI));
        let ret = x - 2*Math.PI*fac;
        if (ret < 0) {
            ret = 2*Math.PI - ret;
        }
        return ret;
    }
    let x = angleIn2PI(a);
    let y = angleIn2PI(b);
    let res = 0;
    if (y < x) {
        t = 1-t;
        let temp = x;
        x = y;
        y = temp;
    }
    console.log("y = " + y);
    console.log("x = " + x);
    if (y - x > Math.PI) {
        res = x - t*(2*Math.PI-(y-x));
    }
    else {
        res = x + t*(y-x);
    }
    return angleIn2PI(res);
}
GeomUtils.angleLERP = angleLERP;

/**
 * Return a vector angle which is linearly interpolated between
 * two vector angles, where each component is along the shortest 
 * path between the two corresponding angles
 * @param {glMatrix.vec3} a First vector of angles, each in radians
 * @param {glMatrix.vec3} b Second vector of angles, each in radians
 * @param {float} t LERP parameter, in [0, 1]
 * @return {glMatrix.vec3} The interpolated angle along the shortest path from a to b
 */
function angle3LERP(a, b, t) {
    let x = GeomUtils.angleLERP(a[0], b[0], t);
    let y = GeomUtils.angleLERP(a[1], b[1], t);
    let z = GeomUtils.angleLERP(a[2], b[2], t);
    return glMatrix.vec3.fromValues(x, y, z);
}
GeomUtils.angle3LERP = angle3LERP;

/////////////////////////////////////////////
///////////   PRIMITIVE OBJECTS   ///////////
/////////////////////////////////////////////

class Plane3D {

    /**
     * An object for representing a 3D plane
     * 
     * @param {glMatrix.vec3} P0 A point on the plane
     * @param {glMatrix.vec3} N The plane normal
     */
    constructor(P0, N) {
        this.P0 = glMatrix.vec3.clone(P0);
        this.N = glMatrix.vec3.clone(N);
        glMatrix.vec3.normalize(this.N, this.N);
        this.resetEquation();
    }

    /**
     * Update the plane equation from the current point/normal
     */
    resetEquation() {
        this.D = -glMatrix.vec3.dot(this.P0, this.N);
    }

    /**
     * Initialize the plane from the implicit equation Ax + By + Cz + D = 0
     * @param {float} A 
     * @param {float} B 
     * @param {float} C 
     * @param {float} D 
     */
    initFromEquation(A, B, C, D) {
        this.N = glMatrix.vec3.fromValues(A, B, C);
        this.P0 = glMatrix.vec3.clone(this.N);
        this.P0 = glMatrix.vec3.scale(this.P0, this.P0, -D/glMatrix.vec3.sqrLen(this.N));
        glMatrix.vec3.normalize(this.N, this.N);
        this.resetEquation();
    }

    /**
     * Compute the distance of the plane to a particular point
     * @param {glMatrix.vec3} P 
     */
    distFromPlane(P) {
        return glMatrix.vec3.dot(this.N) + this.D;
    }
}


class Line3D {

    /**
     * An object for representing a 3D Line
     * 
     * @param {glMatrix.vec3} P0 Initial point on line
     * @param {glMatrix.vec3} V Direction of line
     */
    constructor(P0, V) {
        this.P0 = glMatrix.vec3.clone(P0);
        this.V = glMatrix.vec3.clone(V);
    }

    /**
     * Determine the intersection of this line with a plane
     * 
     * @param{Plane3D} A plane with which to intersect the line
     * 
     * @returns{{t, P}}, distance and point of intersection, or 
     * null if there is no intersection
     */
    intersectPlane(plane) {
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
    * This is three equations (x, y, z components) in 2 variables (s, t)
    * Use Cramer's rule and the fact that there is a linear
    * dependence that only leaves two independent equations
    * (add the last two equations together)
    * [a b][t] = [e]
    * [c d][s]   [f]
    * 
    * @param{Line3D} other Other line
    * 
    * @returns{"s", "t", "P"} Time and point of intersection, or null
    * if there isn't an intersection
    */
    intersectOtherLineRet_ts(other) {
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
        return {"t":t, "s":s, "P":PRet};
    }
    
    /**
    * Intersect another line in 3D
    * @param{Line3D} other Other line
    * 
    * @returns{glMatrix.vec3} Point of intersection, or null
    * if they don't intersect
    */
    intersectOtherLine(other) {
        let ret = this.intersectOtherLineRet_ts(other);
        if (!(ret === null)) {
            return ret.P;
        }
        return null;
    }
}        

/**
 * Determine whether a point is inside a polygon by 
 * casting a ray from the point and seeing how many 
 * segments of the polygon it crosses
 * @param {array} p Point to test
 * @param {2d array} poly Points on polygon
 */
function pointInsidePolygon2D(p, poly) {
    if (poly.length < 3) {
        return false;
    }
    const p0 = glMatrix.vec3.fromValues(p[0], p[1], 0);
    const line1 = new Line3D(p0, glMatrix.vec3.fromValues(1, 0, 0));
    let crossings = 0;
    let v1 = glMatrix.vec3.fromValues(poly[0][0], poly[0][1], 0);
    const N = poly.length;
    for (let i = 0; i < N; i++) {
        let v2 = glMatrix.vec3.fromValues(poly[(i+1)%N][0], poly[(i+1)%N][1], 0);
        let v = glMatrix.vec3.create();
        glMatrix.vec3.subtract(v, v2, v1);
        const line2 = new Line3D(v1, v);
        let res = line1.intersectOtherLineRet_ts(line2);
        
        if (!(res === null)) {
            if (res.t >= 0 && res.s >= 0 && res.s < 1) {
                crossings++;
            }
        }
        v1 = v2;
    }
    return crossings%2 == 1;
}

/**
 * An axis-aligned 3D box
 */
class AABox3D {
    /**
     * 
     * @param {float} xmin 
     * @param {float} xmax 
     * @param {float} ymin 
     * @param {float} ymax 
     * @param {float} zmin 
     * @param {float} zmax 
     */
    constructor(xmin, xmax, ymin, ymax, zmin, zmax) {
        this.xmin = xmin;
        this.xmax = xmax;
        this.ymin = ymin;
        this.ymax = ymax;
        this.zmin = zmin;
        this.zmax = zmax;
    }

    /**
     * Get the x length
     */
    XLen() {
        return this.xmax - this.xmin;
    }
    
    /**
     * Get the y length
     */
    YLen() {
        return this.ymax - this.ymin;
    }
    
    /**
     * Get the z length
     */
    ZLen() {
        return this.zmax - this.zmin;
    }
    
    /**
     * Get the length along the 3D diagonal
     */
    getDiagLength() {
        let dX = this.XLen()/2;
        let dY = this.YLen()/2;
        let dZ = this.ZLen()/2;
        return Math.sqrt(dX*dX + dY*dY + dZ*dZ);
    }
    
    /**
     * Return the centroid of the bbox
     */
    getCenter() {
        return glMatrix.vec3.fromValues((this.xmax+this.xmin)/2.0, (this.ymax+this.ymin)/2.0, (this.zmax+this.zmin)/2.0);
    }
    
    /**
     * Expand the bounding box so it incorporates a particular point
     * @param {glMatrix.vec3} P The point to incorporate
     */
    addPoint(P) {
        if (P[0] < this.xmin) { this.xmin = P[0]; }
        if (P[0] > this.xmax) { this.xmax = P[0]; }
        if (P[1] < this.ymin) { this.ymin = P[1]; }
        if (P[1] > this.ymax) { this.ymax = P[1]; }
        if (P[2] < this.zmin) { this.zmin = P[2]; }
        if (P[2] > this.zmax) { this.zmax = P[2]; }
    }
    
    /**
     * Take the union with another bounding box
     * @param {AABox3D} otherBBox The bounding box to incorporate into this one
     */
    Union(otherBBox) {
        this.xmax = Math.max(this.xmax, otherBBox.xmax);
        this.ymax = Math.max(this.ymax, otherBBox.ymax);
        this.zmax = Math.max(this.zmax, otherBBox.zmax);
    }
    
    /**
     * Return a string representation of the coordinates (for debugging)
     */
    getStr() {
        let s = "[" + this.xmin + ", " + this.xmax + "]";
        s += " x " + "[" + this.ymin + ", " + this.ymax + "]";
        s += " x " + "[" + this.zmin + ", " + this.zmax + "]";
        return s;
    }
}
