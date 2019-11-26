precision mediump float;
#define MAX_LIGHTS 10

struct Light {
    vec3 pos;
    vec3 color;
    vec3 atten;
};

// Material Properties
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


varying vec3 V; // Untransformed Position, Interpolated
varying vec3 N; // Untransformed Normal, Interpolated
varying vec3 C; // Varying per-fragment color, interpolated


void main(void) {
    vec4 tpos4 = tMatrix*vec4(V, 1.0); // Transformed material location
    vec3 tpos = tpos4.xyz;
    vec3 NT = normalize(uNMatrix*N); // Transformed normal
    vec3 color = vec3(0.0, 0.0, 0.0);

    // Unit vector from material to light
    for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i < numLights) {
            vec3 L = lights[i].pos - tpos; 
            float LDistSqr = dot(L, L);
            L = normalize(L);
            
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
            // Find a vector from the uEye to tpos.  Then take its 
            // dot product with the vector to the light reflected 
            // about the normal, raised to a power 
            vec3 dh = normalize(uEye - tpos);
            vec3 h = -reflect(L, NT);
            float ksCoeff = dot(h, dh);
            if (ksCoeff < 0.0) {
                ksCoeff = 0.0;
            }
            ksCoeff = pow(ksCoeff, uShininess);

            vec3 lColor = lights[i].color/(lights[i].atten.x + lights[i].atten.y*sqrt(LDistSqr) + lights[i].atten.z*LDistSqr);
            color += lColor*(kdCoeff*cKd + ksCoeff*uKs);
        }
    }
    gl_FragColor = vec4(color + uKa, 1.0);
}
