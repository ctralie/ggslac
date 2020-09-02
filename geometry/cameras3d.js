/*
Files that have been assumed to have been also loaded
primitives3d.js
*/

function splitVecStr(s) {
    ret = [];
    s.split(",").forEach(function(x) {
        ret.push(parseFloat(x));
    });
    return ret;
}

function vecToStr(v, k) {
    if (k === undefined) {
        k = 2;
    }
    s = "";
    for (let i = 0; i < v.length; i++) {
        s += v[i].toFixed(k);
        if (i < v.length-1) {
            s += ",";
        }
    }
    return s;
}

/**
 * Superclass for 3D cameras
 */
class Camera3D {    
    /**
    * @param {int} pixWidth Width of viewing window
    * @param {int} pixHeight Height of viewing window
    * @param {float} fovx Field of view in x direction
    * @param {float} fovy Field of view in y direction
    * @param {float} near Distance to near viewing plane
    * @param {float} far Distance to far viewing plane
    */
    constructor(pixWidth, pixHeight, fovx, fovy, near, far) {
        this.type = "default";
        this.pixWidth = pixWidth;
        this.pixHeight = pixHeight;
        if (fovx === undefined) {
            fovx = Camera3D.DEFAULT_FOVY;
        }
        this.fovx = fovx;
        if (fovy === undefined) {
            fovy = Camera3D.DEFAULT_FOVY;
        }
        this.fovy = fovy;
        if (near === undefined) {
            near = Camera3D.DEFAULT_NEAR;
        }
        this.near = near;
        if (far === undefined) {
            far = Camera3D.DEFAULT_FAR;
        }
        this.far = far;
    }

    /**
     * Return the perspective matrix
     */
    getPMatrix() {
        let pMatrix = glMatrix.mat4.create();
        let fovx2 = this.fovx * 90/Math.PI;
        let fovy2 = this.fovy * 90/Math.PI;
        let fov = {upDegrees:fovy2, downDegrees:fovy2, 
                   leftDegrees:fovx2, rightDegrees:fovx2};
        glMatrix.mat4.perspectiveFromFieldOfView(pMatrix, fov, this.near, this.far);
        return pMatrix;
    }

    /**
     * Return the ModelView matrix
     */
    getMVMatrix() {
        //To keep right handed, make z vector -towards
        let T = glMatrix.vec3.create();
        glMatrix.vec3.cross(T, this.right, this.up);
        let rotMat = glMatrix.mat4.create();
        for (let i = 0; i < 3; i++) {
            rotMat[i*4] = this.right[i];
            rotMat[i*4+1] = this.up[i];
            rotMat[i*4+2] = T[i];
        }
        //glMatrix.mat4.transpose(rotMat, rotMat);
        let transMat = glMatrix.mat4.create();
        glMatrix.vec3.scale(this.pos, this.pos, -1.0);
        glMatrix.mat4.translate(transMat, transMat, this.pos);
        let mvMatrix = glMatrix.mat4.create();
        glMatrix.mat4.mul(mvMatrix, rotMat, transMat);
        glMatrix.vec3.scale(this.pos, this.pos, -1.0); //Have to move pos back
        return mvMatrix;
    }

    /**
     * Figure out the right and up vectors from the given quaternion
     * 
     * @param {glMatrix.quat} q The quaternion
     */
    setRotFromQuat(q) {
        let m = glMatrix.mat3.create();
        glMatrix.mat3.fromQuat(m, q);
        this.right = glMatrix.vec3.fromValues(m[0], m[3], m[6]);
        this.up = glMatrix.vec3.fromValues(m[1], m[4], m[7]);
    }

    /**
     * Use the right/up vectors to construct a corresponding
     * 3x3 rotation matrix
     * 
     * @returns {glMatrix.mat3} The rotation matrix
     */
    getRotMat3() {
        let T = glMatrix.vec3.create();
        glMatrix.vec3.cross(T, this.right, this.up);
        let rotMat = glMatrix.mat3.create();
        for (let i = 0; i < 3; i++) {
            rotMat[i*3] = this.right[i];
            rotMat[i*3+1] = this.up[i];
            rotMat[i*3+2] = T[i];
        }
        return rotMat;
    }
    /** 
     * Compute the quaternion from the given right/up vectors
     * 
     * @returns {glMatrix.quat} The quaternion
     */
    getQuatFromRot() {
        let rotMat = this.getRotMat3();
        let q = glMatrix.quat.create();
        glMatrix.quat.fromMat3(q, rotMat);
        return q;
    }
}
// Default values, assuming 4:3 aspect ratio
Camera3D.DEFAULT_FOVX = 1.4;
Camera3D.DEFAULT_FOVY = 1.05;
Camera3D.DEFAULT_NEAR = 0.01;
Camera3D.DEFAULT_FAR = 1000;

class MousePolarCamera extends Camera3D {
    //Coordinate system is defined as in OpenGL as a right
    //handed system with +z out of the screen, +x to the right,
    //and +y up
    //phi is CCW down from +y, theta is CCW away from +z

    /**
    * @param {int} pixWidth Width of viewing window
    * @param {int} pixHeight Height of viewing window
    * @param {float} fovx Field of view in x direction
    * @param {float} fovy Field of view in y direction
    * @param {float} near Distance to near viewing plane
    * @param {float} far Distance to far viewing plane
     */
    constructor(pixWidth, pixHeight, fovx, fovy, near, far) {
        super(pixWidth, pixHeight, fovx, fovy, near, far);
        this.type = "polar";
        this.pos = glMatrix.vec3.create();
        this.center = glMatrix.vec3.create();
        this.resetRightUp = function() {
            this.up = glMatrix.vec3.fromValues(0, 1, 0);
            this.right = glMatrix.vec3.fromValues(1, 0, 0);
        }
        this.resetRightUp();
    }

    /**
     * Center the camera on the outside of a bounding box
     * looking in
     * @param {AABox3D} bbox The bounding box
     * @param {glMatrix.vec3} right Right direction of camera orientation
     * @param {glMatrix.vec3} up Up direction of camera orientation
     */
    centerOnBBox(bbox, right, up) {
        if (!(right === undefined)) {
            this.right = right;
        }
        if (!(up === undefined)) {
            this.up = up;
        }
        this.center = bbox.getCenter();
        let R = bbox.getDiagLength()*1.5;
        if (R == 0) { //Prevent errors for the case of a single point or
        //mesh not loaded yet
            R = 1;
        }
        if (R > this.far) {
            this.far = R*1.5;
            this.near = this.far/10000;
        }
        else if (R < this.near/10) {
            this.near = R/10;
            this.far = this.near*10000;
        }
        let away = glMatrix.vec3.create();
        glMatrix.vec3.cross(away, this.right, this.up);
        glMatrix.vec3.scaleAndAdd(this.pos, this.center, away, R);
    }

    /**
     * Center the camera on a mesh, looking in
     * @param {PolyMesh} mesh 
     * @param {glMatrix.vec3} right Right direction of camera orientation
     * @param {glMatrix.vec3} up Up direction of camera orientation
     */
    centerOnMesh(mesh, right, up) {
        let bbox = mesh.getBBox();
        this.centerOnBBox(bbox, right, up);
    }

    /**
     * Rotate up vector about right vector
     * @param {int} ud Up/down motion of the mouse, in pixels
     */
    orbitUpDown(ud) {
        let thetaud = 2.0*this.fovy*ud/this.pixHeight;
        this.orbitUpDownTheta(thetaud);
    }

    /**
     * Rotate up vector about right vector by a particular angle
     * @param {float} thetaud Angle by which to rotate, in radians
     */
    orbitUpDownTheta(thetaud) {
        let q = glMatrix.quat.create();
        glMatrix.quat.setAxisAngle(q, this.right, thetaud);
        glMatrix.vec3.transformQuat(this.up, this.up, q);
        let dR = glMatrix.vec3.create();
        glMatrix.vec3.subtract(dR, this.pos, this.center);
        glMatrix.vec3.transformQuat(dR, dR, q);
        glMatrix.vec3.add(this.pos, this.center, dR);
    }
    
    /**
     * Rotate right vector about the up vector, and
     * rotate vector from pos to the center about the up vector
     * @param {int} lr Left/right motion of the mouse, in pixels
     */
    orbitLeftRight(lr) {
        let thetalr = -2.0*this.fovx*lr/this.pixWidth;
        this.orbitLeftRightTheta(thetalr);
    }

    /**
     * Rotate right vector about the up vector by a particular angle
     * @param {float} thetaud Angle by which to rotate, in radians
     */
    orbitLeftRightTheta(thetalr) {
        let q = glMatrix.quat.create();
        glMatrix.quat.setAxisAngle(q, this.up, thetalr);
        glMatrix.vec3.transformQuat(this.right, this.right, q);
        let dR = glMatrix.vec3.create();
        glMatrix.vec3.subtract(dR, this.pos, this.center);
        glMatrix.vec3.transformQuat(dR, dR, q);
        glMatrix.vec3.add(this.pos, this.center, dR);
    }
    
    /**
     * Move the camera towards its center
     * @param {float} rate How quickly to move the camera in, in units of pixels
     */
    zoom = function(rate) {
        rate = rate / this.pixHeight;
        let dR = glMatrix.vec3.create();
        glMatrix.vec3.subtract(dR, this.pos, this.center);
        glMatrix.vec3.scaleAndAdd(this.pos, this.center, dR, Math.pow(4, rate));
        let R = glMatrix.vec3.length(dR);
        if (2*R > this.far) {
            this.far = 2*R;
            this.near = this.far/10000;
        }
        else if (R/10 < this.near) {
            this.near = R/10;
            this.far = this.near*10000;
        }
    }
    
    /**
     * Translate the camera
     * @param {float} pdx Mouse motion rightward, in pixels 
     * @param {float} pdy Mouse motion upward, in pixels
     */
    translate = function(pdx, pdy) {
        let dR = glMatrix.vec3.create();
        glMatrix.vec3.sub(dR, this.center, this.pos);
        let length = glMatrix.vec3.length(dR)*Math.tan(this.fovx/2);
        let dx = length*pdx / this.pixWidth;
        length = glMatrix.vec3.length(dR)*Math.tan(this.fovy/2);
        let dy = length*pdy / this.pixHeight;
        glMatrix.vec3.scaleAndAdd(this.center, this.center, this.right, -dx);
        glMatrix.vec3.scaleAndAdd(this.center, this.center, this.up, -dy);
        glMatrix.vec3.scaleAndAdd(this.pos, this.pos, this.right, -dx);
        glMatrix.vec3.scaleAndAdd(this.pos, this.pos, this.up, -dy);
    }
    
    /**
     * Get the absolute position of the camera
     * @returns {glMatrix.vec3} The position of the camera
     */
    getPos() {
        return pos;
    }
}


//For use with WASD + mouse bindings
class FPSCamera extends Camera3D {
    /**
    * @param {int} pixWidth Width of viewing window
    * @param {int} pixHeight Height of viewing window
    * @param {float} fovx Field of view in x direction
    * @param {float} fovy Field of view in y direction
    * @param {float} near Distance to near viewing plane
    * @param {float} far Distance to far viewing plane
     */
    constructor(pixWidth, pixHeight, fovx, fovy, near, far) {
        super(pixWidth, pixHeight, fovx, fovy, near, far);
        this.type = "fps";
        this.right = glMatrix.vec3.fromValues(1, 0, 0);
        this.up = glMatrix.vec3.fromValues(0, 1, 0);
        this.pos = glMatrix.vec3.fromValues(0, 0, 0);
        this.rotation = vecToStr(this.getQuatFromRot());
    }
    
    /**
     * Translate the camera in 3D
     * @param {float} dx Change in x
     * @param {float} dy Change in y
     * @param {float} dz Change in z
     * @param {float} speed Factor by which to translate
     */
    translate(dx, dy, dz, speed) {
        let T = glMatrix.vec3.create();
        glMatrix.vec3.cross(T, this.up, this.right);//Cross in opposite order so moving forward
        glMatrix.vec3.scaleAndAdd(this.pos, this.pos, this.right, dx*speed);
        glMatrix.vec3.scaleAndAdd(this.pos, this.pos, this.up, dy*speed);
        glMatrix.vec3.scaleAndAdd(this.pos, this.pos, T, dz*speed);
    }

    /**
     * Rotate the up direction around the right direction
     * @param {float} ud Up down motion, in pixels 
     */
    rotateUpDown = function(ud) {
        let thetaud = 2.0*this.fovy*ud/this.pixHeight;
        this.rotateUpDownTheta(thetaud);
    }

    /**
     * Rotate the up direction around the right direction, by a particular angle
     * @param {float} thetaud Up down motion, in radians
     */
    rotateUpDownTheta(thetaud) {
        let q = glMatrix.quat.create();
        glMatrix.quat.setAxisAngle(q, this.right, thetaud);
        glMatrix.vec3.transformQuat(this.up, this.up, q);
        this.rotation = vecToStr(this.getQuatFromRot());
    }
    

    /**
     * Rotate the right direction around the up direction
     * but project onto the XY plane
     * @param {float} lr Left/right motion of the mouse, in pixels
     */
    rotateLeftRight(lr) {
        let thetalr = 2.0*this.fovx*lr/this.pixWidth;
        this.rotateLeftRightTheta(thetalr);
    }

    /**
     * Rotate the right direction around the up direction, by a particular angle,
     * but project onto the XY plane
     * @param {float} thetalr Left/right motion of the mouse, in radians
     */
    rotateLeftRightTheta (thetalr) {
        let q = glMatrix.quat.create();
        glMatrix.quat.setAxisAngle(q, this.up, thetalr);
        glMatrix.vec3.transformQuat(this.right, this.right, q);
        //Snap to the XY plane to keep things from getting wonky
        this.right[1] = 0;
        glMatrix.vec3.normalize(this.right, this.right);
        //Make sure the up vector is still orthogonal
        let dot = glMatrix.vec3.dot(this.right, this.up);
        glMatrix.vec3.scaleAndAdd(this.up, this.up, this.right, -dot);
        glMatrix.vec3.normalize(this.up, this.up);
        this.rotation = vecToStr(this.getQuatFromRot());
    }
}