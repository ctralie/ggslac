precision mediump float;

#define k1 0.33582564
#define k2 0.55348791

// The 2D position of the pixel in this fragment, interpolated via
// barycentric coordinates from positions of triangle vertices
varying vec2 v_position;
// The 2D texture coordinate in this fragment, interpolated via
// barycentric coordinates from positions of triangle vertices
varying highp vec2 v_texture;

uniform sampler2D uSampler;
uniform float uk1;
uniform float uk2;


void main() {
    float xu = v_position.x;
    float yu = v_position.y;
    float rSqr = xu*xu + yu*yu;
    float fac = 1.0+uk1*rSqr + uk2*rSqr*rSqr;
    float x = (xu*fac + 1.0)/2.0;
    float y = 1.0-(yu*fac + 1.0)/2.0;
    if (x >= 0.0 && x <= 1.0 && y >= 0.0 && y <= 1.0) {
        gl_FragColor = texture2D(uSampler, vec2(x, y));
    }
    else {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
}
