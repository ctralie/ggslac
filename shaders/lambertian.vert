attribute vec3 vPos;
attribute vec3 vNormal;
attribute vec3 vColor;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 tMatrix;
uniform mat3 uNMatrix;

uniform vec3 uAmbientColor;
uniform vec3 uLight1Pos;
uniform vec3 uLight2Pos;
uniform vec3 uLight1Color;
uniform vec3 uLight2Color;

varying vec3 vLightCoeff;
varying vec3 vColorInterp;

uniform vec3 uColor;

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
    
    vLightCoeff = uAmbientColor + dirLightWeight*uLight1Color;
    // The default value of the uniform color is (2, 2, 2)
    // So ignore and use the vColor from the buffer in this case.
    // Otherwise, override the buffer with the specified uniform color
    if (uColor[0] == 2.0 && uColor[1] == 2.0 && uColor[2] == 2.0) {
        vColorInterp = vColor; 
        
    }
    else {
        vColorInterp = uColor;
    }
}
