precision mediump float;

// The 2D position of the pixel in this fragment, interpolated via
// barycentric coordinates from positions of triangle vertices
varying vec2 v_position;
// The 2D texture coordinate in this fragment, interpolated via
// barycentric coordinates from positions of triangle vertices
varying highp vec2 v_texture;

uniform sampler2D uSampler;


void main() {
    float x = v_texture.x;
    float y = v_texture.y;
    gl_FragColor = texture2D(uSampler, vec2(x, y));
}
