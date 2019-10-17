precision mediump float;

// Camera properties
uniform float uNear;
uniform float uFar;

varying vec4 V; // Interpolated projected position

void main(void) {
    float depth = V.z;
    float sigma = (uFar-uNear)/100.0;
    if (depth < uNear) {
        depth = uNear;
    }
    depth -= uNear;
    float gray = exp(-depth/sigma);
    gl_FragColor = vec4(gray, gray, gray, 1.0);
}
