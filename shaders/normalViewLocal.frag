precision mediump float;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 tMatrix;
uniform mat3 uNMatrix;
uniform mat3 uNMVMatrix;

varying vec3 V; // Untransformed Position, Interpolated
varying vec3 N; // Untransformed Normal, Interpolated


void main(void) {
    vec3 NT = normalize(uNMVMatrix*uNMatrix*N); // Transformed normal
    gl_FragColor = vec4(0.5*(NT+1.0), 1.0);
}
