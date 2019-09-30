precision mediump float;

// Material Properties
uniform vec3 uKa; // Ambient color for material
uniform vec3 uKd; // Diffuse color for material
uniform vec3 uKs; // Specular color for material
uniform float uShininess; // Specular exponent for material

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 tMatrix;
uniform mat3 uNMatrix;

// Light properties
uniform vec3 uLight1Pos;
uniform vec3 uLight1Color;

varying vec3 V; // Untransformed Position, Interpolated
varying vec3 N; // Untransformed Normal, Interpolated
varying vec3 C; // Varying per-fragment color, interpolated


void main(void) {
    vec4 tpos = tMatrix*vec4(V, 1.0);
    vec4 LH = vec4(uLight1Pos, 1.0) - tpos;
    vec3 L = normalize(LH.xyz);

    vec3 NT = normalize(uNMatrix*N);
    
    // Lambertian Term
    float kdCoeff = dot(NT, L);
    if (kdCoeff < 0.0) {
        kdCoeff = 0.0;
    }
    // Diffuse color
    // The default value of the uniform diffuse color is (2, 2, 2)
    // So ignore and use the interpolated per fragment color C in this case.
    // Otherwise, override the buffer with the specified uniform color
    vec3 cKd = uKd;
    if (uKd[0] == 2.0 && uKd[1] == 2.0 && uKd[2] == 2.0) {
        cKd = C;
    }

    // Specular Term
    // TODO: FILL THIS IN
    

    gl_FragColor = vec4(kdCoeff*cKd + uKa, 1.0);
}
