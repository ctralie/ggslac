precision mediump float;
#define MAX_LIGHTS 10
struct Light {
    vec3 pos;
    vec3 color;
    vec3 atten;
};

// Material properties
uniform vec3 uKa; // Ambient color for material
uniform vec3 uKd; // Diffuse color for material
uniform vec3 uKs; // Specular color for material
uniform float uShininess; // Specular exponent for material

// Transformation/projection matrices
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 tMatrix;
uniform mat3 uNMatrix;

// Light properties
uniform int numLights;
uniform Light lights[MAX_LIGHTS];

// Camera properties
uniform vec3 uEye;

// Per-vertex attributes
attribute vec3 vPos;
attribute vec3 vNormal;
attribute vec3 vColor;


// Stuff to send to fragment shader
varying vec3 color;

void main(void) {
    vec4 tpos = tMatrix*vec4(vPos, 1.0); // Transformed position
    vec3 NT = normalize(uNMatrix*vNormal); // Transformed normal
    gl_Position = uPMatrix*uMVMatrix*tpos; // Viewing window position

    // Diffuse color
    // The default value of the uniform diffuse color is (2, 2, 2)
    // So ignore and use the vColor from the buffer in this case.
    // Otherwise, override the buffer with the specified uniform color
    vec3 vKd = uKd;
    if (uKd[0] == 2.0 && uKd[1] == 2.0 && uKd[2] == 2.0) {
        vKd = vColor; 
    }

    for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i < numLights) {
            vec3 L = lights[i].pos - tpos.xyz; // Lighting direction
            float LDistSqr = dot(L, L);
            L = normalize(L);

            // Diffuse coefficient
            float kdCoeff = dot(NT, L);
            if (kdCoeff < 0.0) {
                kdCoeff = 0.0;
            }

            // Specular coefficient
            vec3 dh = normalize(uEye - tpos.xyz);
            vec3 h = -reflect(L, NT);
            float ksCoeff = dot(h, dh);
            if (ksCoeff < 0.0) {
                ksCoeff = 0.0;
            }
            ksCoeff = pow(ksCoeff, uShininess);

            vec3 lColor = lights[i].color/(lights[i].atten.x + lights[i].atten.y*sqrt(LDistSqr) + lights[i].atten.z*LDistSqr);
            color += lColor*(kdCoeff*vKd + ksCoeff*uKs);
        }
    }

    color += uKa;
}
