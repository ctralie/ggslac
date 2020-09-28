attribute vec3 vPos;
attribute vec3 vColor;

uniform vec3 uKd;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 tMatrix;

varying vec3 fColor;
void main(void) {
    gl_PointSize = 3.0;
    gl_Position = uPMatrix * uMVMatrix * tMatrix * vec4(vPos, 1.0);
    fColor = uKd*vColor;
}
