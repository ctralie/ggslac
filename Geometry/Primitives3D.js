EPS = 1e-12 //TODO: Deal with numerical precision in a smarter way

/////////////////////////////////////////////
///////   ADDITIONS TO GLMATRIX   ///////////
/////////////////////////////////////////////
function vecStr(v) {
    return "(" + v[0] + "," + v[1] + ", "+ v[2] + ")";
}

function mat4Str(m) {
    var str = "";
    for (var i = 0; i < 16; i++) {
        var col = i%4;
        var row = (i-col)/4;
        if (row > 0 && col == 0) {
            str += "\n";
        }
        str += m[col*4+row].toFixed(3) + " ";
    }
    return str;
}
//TODO: Add projection

/////////////////////////////////////////////
///////////   PRIMITIVE OBJECTS   ///////////
/////////////////////////////////////////////
function Plane3D(P0, N) {
    //P0 is some point on the plane, N is the normal
    //Also store A, B, C, and D, the coefficients of the implicit plane equation
    this.P0 = vec3.clone(P0);
    this.N = vec3.clone(N);
    vec3.normalize(this.N, this.N);
    
    this.resetEquation = function() {
        this.D = -vec3.dot(this.P0, this.N);
    }

    this.initFromEquation = function(A, B, C, D) {
        this.N = vec3.fromValues(A, B, C);
        this.P0 = vec3.clone(this.N);
        this.P0 = vec3.scale(this.P0, this.P0, -D/vec3.sqrLen(this.N));
        vec3.normalize(this.N, this.N);
        this.resetEquation();
    }

    this.distFromPlane = function(P) {
        return vec3.dot(this.N) + this.D;
    }
    
    this.resetEquation();
}

function Line3D(P0, V) {
    this.P0 = vec3.clone(P0);
    this.V = vec3.clone(V);

    this.intersectPlane = function(plane) {
        var P0 = plane.P0
        var N = plane.N
        var P = this.P0;
        var V = this.V;
        if (Math.abs(vec3.dot(N, V)) < EPS) {
            return null;
        }
        var t = (vec3.dot(P0, N) - vec3.dot(N, P)) / vec3.dot(N, V);
        //intersectP = P + t*V
        var intersectP = vec3.create();
        vec3.scaleAndAdd(intersectP, P, this.V, t);
        return [t, intersectP];
    }
    
    this.intersectOtherLineRet_t = function(other) {
        //Solve for (s, t) in the equation P0 + t*V0 = P1+s*V1
        //This is three equations (x, y, z components) in 2 variables (s, t)
        //Use cramer's rule and the fact that there is a linear
        //dependence that only leaves two independent equations
        //(add the last two equations together)
        //[a b][t] = [e]
        //[c d][s]    [f]
        var P0 = this.P0;
        var V0 = this.V;
        var P1 = other.P0;
        var V1 = other.V;
        var a = V0[0] + V0[2];
        var b = -(V1[0] + V1[2]);
        var c = V0[1] + V0[2];
        var d = -(V1[1] + V1[2]);
        var e = P1[0] + P1[2] - (P0[0] + P0[2]);
        var f = P1[1] + P1[2] - (P0[1] + P0[2]);
        var detDenom = a*d - c*b;
        //Lines are parallel or skew
        if (Math.abs(detDenom) < EPS) {
            return null;
        }
        var detNumt = e*d - b*f;
        var detNums = a*f - c*e;
        var t = parseFloat("" + detNumt) / parseFloat("" + detDenom);
        var s = parseFloat("" + detNums) / parseFloat("" + detDenom);
        //return (t, P0 + t*V0)
        var PRet = vec3.create();
        vec3.scaleAndAdd(PRet, P0, V0, t);
        return [t, PRet];
    }
    
    this.intersectOtherLine = function(other) {
        var ret = this.intersectOtherLineRet_t(other);
        if (!(ret === null)) {
            return ret[1];
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
        return vec3.fromValues((this.xmax+this.xmin)/2.0, (this.ymax+this.ymin)/2.0, (this.zmax+this.zmin)/2.0);
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

/////////////////////////////////////////////
///////////   UTILITY FUNCTIONS   ///////////
/////////////////////////////////////////////

//Return the cotangent of the angle formed at the
//third vertex of a triangle v1-v2-v3
function getCotangent(v1, v2, v3) {
    var dV1 = vec3.create();
    vec3.sub(dV1, v1, v3);
    var dV2 = vec3.create();
    vec3.sub(dV2, v2, v3);
    var cosAngle = vec3.dot(dV1, dV2) / (vec3.len(dV1)*vec3.len(dV2));
    return cosAngle/Math.sqrt(1-cosAngle*cosAngle);
}

//Return true if the vertices in the list "verts" all lie
//in the same plane and false otherwise
function arePlanar(verts) {
    if (verts.length <= 3) {
        return true;
    }
    var v0 = vec3.clone(verts[1]);
    vec3.subtract(v0, v0, verts[0]);
    var v1 = vec3.clone(verts[2]);
    vec3.subtract(v1, v1, verts[0]);
    var n = vec3.create();
    vec3.cross(n, v0, v1);
    vec3.normalize(n, n);
    for (var i = 3; i < verts.length; i++) {
        var v = vec3.clone(verts[i]);
        vec3.subtract(v, v, verts[0]);
        vec3.normalize(v, v);
        if (vec3.sqrLen(n) == 0) {
            //If the first few points happened to be colinear
            vec3.cross(n, v0, v);
        }
        if (Math.abs(vec3.dot(v, n)) > EPS) {
            return false;
        }
    }
    return true;
}

//If the vertices in "verts" form a convex 2D polygon 
//(in the order specified) return true.  Return false otherwise
function are2DConvex(verts) {
    if (verts.length <= 3) {
        return true;
    }
    if (!arePlanar(verts)) {
        return false;
    }
    var v0 = verts[0];
    var v1 = verts[1];
    var v2 = verts[2];
    var diff1 = vec3.clone(v1);
    var diff2 = vec3.clone(v2);
    vec3.subtract(diff1, diff1, v0);
    vec3.subtract(diff2, diff2, v1);
    var lastCross = vec3.create();
    vec3.cross(lastCross, diff1, diff2);
    var cross = vec3.create();
    for (var i = 3; i <= verts.length; i++) {
        v0 = v1;
        v1 = v2;
        v2 = verts[i%verts.length];
        diff1 = vec3.clone(v1);
        diff2 = vec3.clone(v2);
        vec3.subtract(diff1, diff1, v0);
        vec3.subtract(diff2, diff2, v1);
        vec3.cross(cross, diff1, diff2);
        if (vec3.dot(cross, lastCross) < 0) {
            return false;
        }
        lastCross = vec3.clone(cross);
    }
    return true;
}

//General purpose method for returning the normal of a face
//Assumes "verts" are planar and not all collinear
function getFaceNormal(verts) {
    //This properly handles the case where three vertices
    //are collinear right after one another    
    for (var i = 2; i < verts.length; i++) {
        var v1 = vec3.clone(verts[i-1]);
        vec3.subtract(v1, v1, verts[0]);
        var v2 = vec3.clone(verts[i]);
        vec3.subtract(v2, v2, verts[0]);
        var ret = vec3.create();
        vec3.cross(ret, v1, v2);
        var v1L = vec3.len(v1);
        var v2L = vec3.len(v2);
        if (v1L >0 && v2L > 0 && vec3.len(ret)/(v1L*v2L) > 0) {
            vec3.normalize(ret, ret);
            return ret;
        }
    }
    return null;
}

function getPolygonArea(verts) {
    if (verts.length < 3) {
        return 0.0;
    }
    var v1 = vec3.clone(verts[1]);
    vec3.subtract(v1, v1, verts[0]);
    var v2 = vec3.clone(v1);
    var vc = vec3.create();
    var area = 0.0;
    for (var i = 2; i < verts.length; i++) {
        v1 = v2;
        v2 = vec3.clone(verts[i]);
        vec3.subtract(v2, v2, verts[0]);
        vec3.cross(vc, v1, v2);
        area += 0.5*vec3.len(vc);
    }
    return area;
}
