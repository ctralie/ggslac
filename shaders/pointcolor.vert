attribute vec3 vPos;
attribute vec3 vColor;
uniform mat4 uTMatrix;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

varying vec4 fColor;

void main(void) {
    gl_PointSize = 5.0;
    gl_Position = uPMatrix * uMVMatrix * uTMatrix * vec4(vPos, 1.0);
    fColor = vec4(vColor, 1.0);
}
