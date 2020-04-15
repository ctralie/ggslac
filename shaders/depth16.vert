precision mediump float;

attribute vec3 vPos;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 tMatrix;

// Stuff to send to shader
varying vec4 V; // Position


void main(void) {
    V = uPMatrix*uMVMatrix*tMatrix*vec4(vPos, 1.0);
    gl_Position = V;
}
