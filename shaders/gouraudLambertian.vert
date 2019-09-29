attribute vec3 vPos;
attribute vec3 vNormal;
attribute vec3 vColor;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 tMatrix;
uniform mat3 uNMatrix;

// Only use a single light
uniform vec3 uLight1Pos;
uniform vec3 uLight1Color;

uniform vec3 uKa; // Ambient color for material
uniform vec3 uKd; // Diffuse color for material
uniform vec3 uKs; // Specular color for material
uniform float uShininess; // Specular exponent for material

// Stuff to send to fragment shader
varying vec3 vKdCoeff;
varying vec3 vKa;
varying vec3 vKd;
varying vec3 vKs;

void main(void) {
    vec4 tpos = tMatrix*vec4(vPos, 1.0);
    gl_Position = uPMatrix*uMVMatrix*tpos;
    vec4 lightingDirH = vec4(uLight1Pos, 1.0) - tpos;
    vec3 lightingDir = normalize(lightingDirH.xyz);

    vec3 transformedNormal = normalize(uNMatrix*vNormal);
    
    float dirLightWeight = dot(transformedNormal, lightingDir);
    
    if (dirLightWeight < 0.0) {
        dirLightWeight = 0.0;
    }
    
    vKdCoeff = dirLightWeight*uLight1Color;
    // The default value of the uniform diffuse color is (2, 2, 2)
    // So ignore and use the vColor from the buffer in this case.
    // Otherwise, override the buffer with the specified uniform color
    if (uKd[0] == 2.0 && uKd[1] == 2.0 && uKd[2] == 2.0) {
        vKd = vColor; 
    }
    else {
        vKd = uKd;
    }

    // Add on ambient term at the end
    vKa = uKa;
}
