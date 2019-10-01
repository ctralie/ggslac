precision mediump float;

attribute vec3 vPos;
attribute vec3 vNormal;
attribute vec3 vColor;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 tMatrix;

// Stuff to send to shader
varying vec3 V; // Position
varying vec3 N; // Normal
varying vec3 C; // Varying color


void main(void) {
    V = vPos;
    N = vNormal;
    C = vColor;
    gl_Position = uPMatrix*uMVMatrix*tMatrix*vec4(vPos, 1.0);
}
