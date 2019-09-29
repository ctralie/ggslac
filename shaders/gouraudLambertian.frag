precision mediump float;

varying vec3 vKdCoeff;
varying vec3 vKa;
varying vec3 vKd;
varying vec3 vKs;

void main(void) {
    vec3 color = vKdCoeff*vKd;
    color += vKa;
    gl_FragColor = vec4(color, 1.0);
}
