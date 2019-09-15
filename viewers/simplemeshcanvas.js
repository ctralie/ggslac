/**
 * 
 * @param {DOM Element} glcanvas Handle to HTML where the glcanvas resides
 * @param {string} shadersrelpath Path to the folder that contains the shaders,
 *                                relative to where the constructor is being called
 */
function SimpleMeshCanvas(glcanvas, shadersrelpath) {
    BaseCanvas(glcanvas, shadersrelpath);
    glcanvas.mesh = new PolyMesh();
    glcanvas.camera = new MousePolarCamera(glcanvas.width, glcanvas.height, 0.75);


    /////////////////////////////////////////////////////
    //Step 1: Setup repaint function
    /////////////////////////////////////////////////////    
    glcanvas.repaint = function() {
        glcanvas.gl.viewport(0, 0, glcanvas.gl.viewportWidth, glcanvas.gl.viewportHeight);
        glcanvas.gl.clear(glcanvas.gl.COLOR_BUFFER_BIT | glcanvas.gl.DEPTH_BUFFER_BIT);
        
        let pMatrix = glMatrix.mat4.create();
        glMatrix.mat4.perspective(pMatrix, 45, glcanvas.gl.viewportWidth / glcanvas.gl.viewportHeight, glcanvas.camera.R/100.0, glcanvas.camera.R*2);
        let mvMatrix = glcanvas.camera.getMVMatrix();

        //NOTE: glcanvas has all options we need except
        //for "shaderToUse"
        glcanvas.shaderToUse = glcanvas.shaders.colorShader;
        glcanvas.mesh.render(glcanvas.gl, glcanvas.shaders, pMatrix, mvMatrix, glcanvas);
    }

    glcanvas.centerCamera = function() {
        this.camera.centerOnMesh(this.mesh);
    }

    requestAnimationFrame(glcanvas.repaint);
}
