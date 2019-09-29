attribute vec3 vPos;
uniform mat4 uTMatrix;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

uniform vec3 uKa;
varying vec4 fColor;

void main(void) {
    gl_PointSize = 5.0;
    gl_Position = uPMatrix * uMVMatrix * uTMatrix * vec4(vPos, 1.0);
    fColor = vec4(uKa, 1.0);
}
