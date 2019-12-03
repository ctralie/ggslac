//Need to jointly include primitives3D.js
/*
Files that have been assumed to have been also loaded
primitives3d.js
*/


// Default values, assuming 4:3 aspect ratio
DEFAULT_FOVX = 1.4
DEFAULT_FOVY = 1.05
DEFAULT_NEAR = 0.01
DEFAULT_FAR = 1000


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
 * @param {int} pixWidth Width of viewing window
 * @param {int} pixHeight Height of viewing window
 * @param {float} fovx Field of view in x direction
 * @param {float} fovy Field of view in y direction
 * @param {float} near Distance to near viewing plane
 * @param {float} far Distance to far viewing plane
 */
function Camera3D(camera, pixWidth, pixHeight, fovx, fovy, near, far) {
    camera.pixWidth = pixWidth;
    camera.pixHeight = pixHeight;
    if (fovx === undefined) {
        fovx = DEFAULT_FOVY;
    }
    camera.fovx = fovx;
    if (fovy === undefined) {
        fovy = DEFAULT_FOVY;
    }
    camera.fovy = fovy;
    if (near === undefined) {
        near = DEFAULT_NEAR;
    }
    camera.near = near;
    if (far === undefined) {
        far = DEFAULT_FAR;
    }
    camera.far = far;

    /**
     * Return the perspective matrix
     */
    camera.getPMatrix = function() {
        let pMatrix = glMatrix.mat4.create();
        let fovx2 = camera.fovx * 90/Math.PI;
        let fovy2 = camera.fovy * 90/Math.PI;
        let fov = {upDegrees:fovy2, downDegrees:fovy2, 
                   leftDegrees:fovx2, rightDegrees:fovx2};
        glMatrix.mat4.perspectiveFromFieldOfView(pMatrix, fov, camera.near, camera.far);
        return pMatrix;
    }

    /**
     * Return the ModelView matrix
     */
    camera.getMVMatrix = function() {
        //To keep right handed, make z vector -towards
        let T = glMatrix.vec3.create();
        glMatrix.vec3.cross(T, camera.right, camera.up);
        let rotMat = glMatrix.mat4.create();
        for (let i = 0; i < 3; i++) {
            rotMat[i*4] = camera.right[i];
            rotMat[i*4+1] = camera.up[i];
            rotMat[i*4+2] = T[i];
        }
        //glMatrix.mat4.transpose(rotMat, rotMat);
        let transMat = glMatrix.mat4.create();
        glMatrix.vec3.scale(camera.pos, camera.pos, -1.0);
        glMatrix.mat4.translate(transMat, transMat, camera.pos);
        let mvMatrix = glMatrix.mat4.create();
        glMatrix.mat4.mul(mvMatrix, rotMat, transMat);
        glMatrix.vec3.scale(camera.pos, camera.pos, -1.0); //Have to move pos back
        return mvMatrix;
    }

    /**
     * Figure out the right and up vectors from the given quaternion
     * 
     * @param {glMatrix.quat} q The quaternion
     */
    camera.setRotFromQuat = function(q) {
        let m = glMatrix.mat3.create();
        glMatrix.mat3.fromQuat(m, q);
        camera.right = glMatrix.vec3.fromValues(m[0], m[3], m[6]);
        camera.up = glMatrix.vec3.fromValues(m[1], m[4], m[7]);
    }

    /** 
     * Compute the quaternion from the given right/up vectors
     * 
     * @returns {glMatrix.quat} The quaternion
     */
    camera.getQuatFromRot = function() {
        let T = glMatrix.vec3.create();
        glMatrix.vec3.cross(T, camera.right, camera.up);
        let rotMat = glMatrix.mat3.create();
        for (let i = 0; i < 3; i++) {
            rotMat[i*3] = camera.right[i];
            rotMat[i*3+1] = camera.up[i];
            rotMat[i*3+2] = T[i];
        }
        let q = glMatrix.quat.create();
        glMatrix.quat.fromMat3(q, rotMat);
        return q;
    }
}

function MousePolarCamera(pixWidth, pixHeight, fovx, fovy, near, far) {
    //Coordinate system is defined as in OpenGL as a right
    //handed system with +z out of the screen, +x to the right,
    //and +y up
    //phi is CCW down from +y, theta is CCW away from +z
    Camera3D(this, pixWidth, pixHeight, fovx, fovy, near, far);
    this.type = "polar";
    this.pos = glMatrix.vec3.create();
    this.center = glMatrix.vec3.create();
    this.resetRightUp = function() {
        this.up = glMatrix.vec3.fromValues(0, 1, 0);
        this.right = glMatrix.vec3.fromValues(1, 0, 0);
    }
    this.resetRightUp();

    this.centerOnBBox = function(bbox, right, up) {
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

    this.centerOnMesh = function(mesh, right, up) {
        let bbox = mesh.getBBox();
        this.centerOnBBox(bbox, right, up);
    }

    /**
     * Rotate up vector about right vector
     * @param {int} ud Up/down motion of the mouse
     */
    this.orbitUpDown = function(ud) {
        let thetaud = 2.0*this.fovy*ud/this.pixHeight;
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
     * @param {int} lr Left/right motion of the mouse
     */
    this.orbitLeftRight = function(lr) {
        let thetalr = -2.0*this.fovx*lr/this.pixWidth;
        let q = glMatrix.quat.create();
        glMatrix.quat.setAxisAngle(q, this.up, thetalr);
        glMatrix.vec3.transformQuat(this.right, this.right, q);
        let dR = glMatrix.vec3.create();
        glMatrix.vec3.subtract(dR, this.pos, this.center);
        glMatrix.vec3.transformQuat(dR, dR, q);
        glMatrix.vec3.add(this.pos, this.center, dR);
    }
    
    this.zoom = function(rate) {
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
    
    this.translate = function(pdx, pdy) {
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
    
    this.getPos = function() {
        return pos;
    }
}


//For use with WASD + mouse bindings
function FPSCamera(pixWidth, pixHeight, fovx, fovy, near, far) {
    Camera3D(this, pixWidth, pixHeight, fovx, fovy, near, far);
    this.type = "fps";
    this.right = glMatrix.vec3.fromValues(1, 0, 0);
    this.up = glMatrix.vec3.fromValues(0, 1, 0);
    this.pos = glMatrix.vec3.fromValues(0, 0, 0);
    this.rotation = vecToStr(this.getQuatFromRot());
    
    this.translate = function(dx, dy, dz, speed) {
        let T = glMatrix.vec3.create();
        glMatrix.vec3.cross(T, this.up, this.right);//Cross in opposite order so moving forward
        glMatrix.vec3.scaleAndAdd(this.pos, this.pos, this.right, dx*speed);
        glMatrix.vec3.scaleAndAdd(this.pos, this.pos, this.up, dy*speed);
        glMatrix.vec3.scaleAndAdd(this.pos, this.pos, T, dz*speed);
    }
    
    //Rotate the up direction around the right direction
    this.rotateUpDown = function(ud) {
        let thetaud = 2.0*this.fovy*ud/this.pixHeight;
        let q = glMatrix.quat.create();
        glMatrix.quat.setAxisAngle(q, this.right, thetaud);
        glMatrix.vec3.transformQuat(this.up, this.up, q);
        this.rotation = vecToStr(this.getQuatFromRot());
    }
    
    //Rotate the right direction around the up direction
    //but project onto the XY plane
    this.rotateLeftRight = function(lr) {
        let thetalr = 2.0*this.fovx*lr/this.pixWidth;
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