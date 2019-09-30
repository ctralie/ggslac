precision mediump float;

uniform vec3 uLight1Color;
uniform vec3 uKa;

varying float vKdCoeff;
varying vec3 vKd;
varying vec3 vKs;

void main(void) {
    gl_FragColor = vec4((vKdCoeff*vKd)*uLight1Color + uKa, 1.0);
}
