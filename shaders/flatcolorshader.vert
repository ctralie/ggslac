attribute vec3 vPos;
uniform vec3 uColor;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
varying vec3 fColor;
void main(void) {
    gl_PointSize = 3.0;
    gl_Position = uPMatrix * uMVMatrix * vec4(vPos, 1.0);
    fColor = uColor;
}
