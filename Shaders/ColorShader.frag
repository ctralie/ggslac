precision mediump float;

varying vec3 vLightCoeff;
varying vec3 vColorInterp;

void main(void) {
    gl_FragColor = vec4(vLightCoeff*vColorInterp, 1.0);
}
