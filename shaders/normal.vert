attribute vec3 n1Pos;
attribute vec3 n2Pos;

uniform mat4 uTMatrix;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat3 uNMatrix;

uniform float uR;

uniform vec3 uKa;
varying vec4 fColor;

void main(void) {
    // First, figure out scale of normal by seeing what 
    // the normal matrix does to the "test vector" [1, 1, 1]
    vec3 tv = uNMatrix*vec3(1.0, 1.0, 1.0);
    float dR = uR/sqrt(dot(tv, tv)/3.0);
    vec3 normal = n2Pos;
    if (dot(normal, normal) > 0.0) {
        // Be careful of divide by zero with normalize
        normal = dR*normalize(uNMatrix*n2Pos);
    }
    vec4 p = uTMatrix*vec4(n1Pos, 1.0) + vec4(normal, 0);
    gl_Position = uPMatrix*uMVMatrix*p;
    fColor = vec4(uKa, 1.0);
}
