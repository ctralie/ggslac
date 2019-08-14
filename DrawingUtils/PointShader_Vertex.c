attribute vec3 vPos;
attribute vec4 vColor;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform float pSize;
varying vec4 fColor;
void main(void) {
    gl_PointSize = 5.0; //TODO: Change this to use the uniform pSize
    gl_Position = uPMatrix * uMVMatrix * vec4(vPos, 1.0);
    fColor = vColor;
}
