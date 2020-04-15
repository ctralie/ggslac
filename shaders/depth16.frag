precision mediump float;

// Camera properties
uniform float uNear;
uniform float uFar;

varying vec4 V; // Interpolated projected position

//https://stackoverflow.com/questions/48288154/pack-depth-information-in-a-rgba-texture-using-mediump-precison
vec2 PackDepth16( in float depth )
{
    float depthVal = depth * (256.0*256.0 - 1.0) / (256.0*256.0);
    vec3 encode = fract( depthVal * vec3(1.0, 256.0, 256.0*256.0) );
    return encode.xy - encode.yz / 256.0 + 1.0/512.0;
}

float UnpackDepth16( in vec2 pack )
{
    float depth = dot( pack, 1.0 / vec2(1.0, 256.0) );
    return depth * (256.0*256.0) / (256.0*256.0 - 1.0);
}


void main(void) {
    vec2 encode = PackDepth16(V.z/uFar);
    gl_FragColor = vec4(encode.x, encode.y, 0.0, 1.0);
}
