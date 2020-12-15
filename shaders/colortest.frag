precision mediump float;

// The 2D position of the pixel in this fragment, interpolated via
// barycentric coordinates from positions of triangle vertices
varying vec2 v_position;


void main() {
    float x = v_position.x;
    float y = v_position.y;
    gl_FragColor = vec4(x, y, 0.0, 1.0);
}
