precision mediump float;

attribute vec3 vPos;
attribute vec3 vNormal;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 tMatrix;

// Stuff to send to shader
varying vec3 V; // Position
varying vec3 N; // Normal


void main(void) {
    V = vPos;
    N = vNormal;
    gl_Position = uPMatrix*uMVMatrix*tMatrix*vec4(vPos, 1.0);
}
