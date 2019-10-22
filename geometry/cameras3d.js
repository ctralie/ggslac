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

    camera.getPMatrix = function() {
        let pMatrix = glMatrix.mat4.create();
        let fovx2 = camera.fovx * 90/Math.PI;
        let fovy2 = camera.fovy * 90/Math.PI;
        let fov = {upDegrees:fovy2, downDegrees:fovy2, 
                   leftDegrees:fovx2, rightDegrees:fovx2};
        glMatrix.mat4.perspectiveFromFieldOfView(pMatrix, fov, camera.near, camera.far);
        return pMatrix;
    }
}

function MousePolarCamera(pixWidth, pixHeight, fovx, fovy, near, far) {
    //Coordinate system is defined as in OpenGL as a right
    //handed system with +z out of the screen, +x to the right,
    //and +y up
    //phi is CCW down from +y, theta is CCW away from +z
    Camera3D(this, pixWidth, pixHeight, fovx, fovy, near, far);
    this.type = "polar";
    this.center = glMatrix.vec3.fromValues(0, 0, 0);
    this.R = 1;
    this.theta = 0;
    this.phi = 0;
    this.towards = glMatrix.vec3.create();
    this.up = glMatrix.vec3.create();
    this.pos = glMatrix.vec3.create();
    
    this.updateVecsFromPolar = function() {
        let sinT = Math.sin(this.theta);
        let cosT = Math.cos(this.theta);
        let sinP = Math.sin(this.phi);
        let cosP = Math.cos(this.phi);
        //Make the camera look inwards
        //i.e. towards is -dP(R, phi, theta)/dR, where P(R, phi, theta) is polar position
        this.towards[0] = -sinP*cosT;
        this.towards[1] = -cosP;
        this.towards[2] = sinP*sinT;
        
        this.up[0] = -cosP*cosT;
        this.up[1] = sinP;
        this.up[2] = cosP*sinT;
        glMatrix.vec3.scaleAndAdd(this.pos, this.center, this.towards, this.R);    
    }
    
    this.centerOnBBox = function(bbox, theta, phi) {
        this.theta = (typeof theta !== 'undefined' ? theta : Math.PI/2);
        this.phi = (typeof phi !== 'undefined' ? phi : Math.PI/2);
        this.center = bbox.getCenter();
        this.R = bbox.getDiagLength()*1.5;
        if (this.R == 0) { //Prevent errors for the case of a single point or
        //mesh not loaded yet
            this.R = 1;
        }
        this.updateVecsFromPolar();
    }

    this.centerOnMesh = function(mesh) {
        let bbox = mesh.getBBox();
        this.centerOnBBox(bbox);
    }

    this.getMVMatrix = function() {
        let sinT = Math.sin(this.theta);
        let cosT = Math.cos(this.theta);
        let sinP = Math.sin(this.phi);
        let cosP = Math.cos(this.phi);
        let camCenter = this.center;
        let camR = this.R;
        let T = glMatrix.vec3.fromValues(-sinP*cosT, -cosP, sinP*sinT); //Towards
        let U = glMatrix.vec3.fromValues(-cosP*cosT, sinP, cosP*sinT);  //Up
        let R = glMatrix.vec3.fromValues(-sinT, 0, -cosT);  //Right
        let pos = glMatrix.vec3.fromValues(camCenter[0] - camR*T[0], camCenter[1] - camR*T[1], camCenter[2] - camR*T[2]);
        let rotMat = glMatrix.mat4.create();
        rotMat[0] = R[0]; rotMat[1] = R[1]; rotMat[2] = R[2]; rotMat[3] = 0;
        rotMat[4] = U[0]; rotMat[5] = U[1]; rotMat[6] = U[2]; rotMat[7] = 0;
        rotMat[8] = -T[0]; rotMat[9] = -T[1]; rotMat[10] = -T[2]; rotMat[11] = 0;
        rotMat[12] = 0; rotMat[13] = 0; rotMat[14] = 0; rotMat[15] = 1;
        glMatrix.mat4.transpose(rotMat, rotMat);

        let transMat = glMatrix.mat4.create();
        glMatrix.vec3.scale(pos, pos, -1.0);
        glMatrix.mat4.translate(transMat, transMat, pos);
        let mvMatrix = glMatrix.mat4.create();
        glMatrix.mat4.mul(mvMatrix, rotMat, transMat);
        return mvMatrix;
    }
    
    this.orbitUpDown = function(dP) {
        dP = 4*dP/this.pixHeight;
        this.phi = this.phi+dP;
        this.updateVecsFromPolar();
    }
    
    this.orbitLeftRight = function(dT) {
        dT = 4*dT/this.pixWidth;
        this.theta = this.theta-dT;
        this.updateVecsFromPolar();
    }
    
    this.zoom = function(rate) {
        rate = rate / this.pixHeight;
        this.R = this.R*Math.pow(4, rate);
        this.updateVecsFromPolar();
    }
    
    this.translate = function(pdx, pdy) {
        let dR = glMatrix.vec3.create();
        glMatrix.vec3.sub(dR, this.center, this.pos);
        let length = glMatrix.vec3.length(dR)*Math.tan(this.fovy);
        let dx = length*pdx / this.pixWidth;
        let dy = length*pdy / this.pixHeight;
        let r = glMatrix.vec3.create();
        glMatrix.vec3.cross(r, this.towards, this.up);
        glMatrix.vec3.scaleAndAdd(this.center, this.center, r, -dx);
        glMatrix.vec3.scaleAndAdd(this.center, this.center, this.up, -dy);
        glMatrix.vec3.scaleAndAdd(this.pos, this.pos, r, -dx);
        glMatrix.vec3.scaleAndAdd(this.pos, this.pos, r, -dy);
        this.updateVecsFromPolar();
    }
    
    this.getPos = function() {
        return pos;
    }
    
    this.updateVecsFromPolar();
}


//For use with WASD + mouse bindings
function FPSCamera(pixWidth, pixHeight, fovx, fovy, near, far) {
    Camera3D(this, pixWidth, pixHeight, fovx, fovy, near, far);
    this.type = "fps";
    this.right = glMatrix.vec3.fromValues(1, 0, 0);
    this.up = glMatrix.vec3.fromValues(0, 1, 0);
    this.pos = glMatrix.vec3.fromValues(0, 0, 0);

    /**
     * Figure out the right and up vectors from the given quaternion
     * 
     * @param {glMatrix.quat} q The quaternion
     */
    this.setRotFromQuat = function(q) {
        let m = glMatrix.mat3.create();
        glMatrix.mat3.fromQuat(m, q);
        this.right = glMatrix.vec3.fromValues(m[0], m[3], m[6]);
        this.up = glMatrix.vec3.fromValues(m[1], m[4], m[7]);
    }

    /** 
     * Compute the quaternion from the given right/up vectors
     * 
     * @returns {glMatrix.quat} The quaternion
     */
    this.getQuatFromRot = function() {
        let m = glMatrix.mat3.create();
        let T = glMatrix.vec3.create();
        glMatrix.vec3.cross(T, this.right, this.up);
        let rotMat = glMatrix.mat3.create();
        for (let i = 0; i < 3; i++) {
            rotMat[i*3] = this.right[i];
            rotMat[i*3+1] = this.up[i];
            rotMat[i*3+2] = T[i];
        }
        let q = glMatrix.quat.create();
        glMatrix.quat.fromMat3(q, rotMat);
        return q;
    }
    this.rotation = vecToStr(this.getQuatFromRot());

    this.getMVMatrix = function() {
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
        this.q = q;
        this.rotation = vecToStr(this.getQuatFromRot());
    }
    
    /**
     * Output the position and quaternion as formatted HTML
     * 
     * @param {int} p The precision of each component of the position and quaternion 
     */
    this.toString = function(p) {
        if (p === undefined) {
            p = 2;
        }
        let ret = "\"pos\": [";
        for (let k = 0; k < 3; k++) {
            ret += this.pos[k].toFixed(p);
            if (k < 2) {
                ret += ", ";
            }
        }
        ret += "],<BR>\"rot\": [";
        let q = this.getQuatFromRot();
        for (let k = 0; k < 4; k++) {
            ret += q[k].toFixed(p);
            if (k < 3) {
                ret += ", ";
            }
        }
        ret += "],<BR>\"fovy\": " + this.fovy.toFixed(p);
        return ret;
    }
}
