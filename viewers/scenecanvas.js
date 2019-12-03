//Purpose: Code to parse and render scene files

BEACON_SIZE = 0.1;
BEACON_COLOR_1 = "A7383E";
BEACON_COLOR_2 = "378B2E";

/**
 * Convert a hex color string to an array of floating point numbers in [0, 1]
 * @param {string} s 6 character string
 */
function colorFloatFromHex(s) {
    let r = parseInt(s.substring(0, 2), 16)/255.0;
    let g = parseInt(s.substring(2, 4), 16)/255.0;
    let b = parseInt(s.substring(4, 6), 16)/255.0;
    return [r, g, b];
}

//A function that adds lots of fields to glcanvas for rendering the scene graph
function SceneCanvas(glcanvas, shadersrelpath, meshesrelpath) {
    BaseCanvas(glcanvas, shadersrelpath);
    glcanvas.scene = null;
    glcanvas.specialMeshes = {};
    // Initialize the icosahedron for the camera beacons
    glcanvas.specialMeshes.beacon = getIcosahedronMesh()
    glcanvas.specialMeshes.beacon.Scale(BEACON_SIZE, BEACON_SIZE, BEACON_SIZE);
    /**
     * Recursive function to load all of the meshes and to 
     * put all of the matrix transformations into glMatrix.mat4 objects
     * At this point, all shapes are converted to meshes
     * @param {object} node The current node in the recursive parsing
     */
    glcanvas.parseNode = function(node) {
        //Step 1: Make a matrix object for the transformation
        if (!('transform' in node)) {
            //Assume identity matrix if no matrix is provided
            node.transform = glMatrix.mat4.create();
        }
        else if (node.transform.length != 16) {
            console.log("ERROR: 4x4 Transformation matrix " + node.transform + " must have 16 entries");
            return;
        }
        else {
            //Matrix has been specified in array form and needs to be converted into object
            let m = glMatrix.mat4.create();
            for (let i = 0; i < 16; i++) {
                m[i] = node.transform[i];
            }
            glMatrix.mat4.transpose(m, m);
            node.transform = m;
        }

        //Step 2: Load in each shape with its properties
        if (!('shapes' in node)) {
            node.shapes = [];
        }
        for (var i = 0; i < node.shapes.length; i++) {
            let shape = node.shapes[i];
            if (!('type' in shape)) {
                console.log("ERROR: Shape not specified in node " + node);
                continue;
            }
            // Create an extra transformation going down to the shape to accommodate
            // shape properties such as length/width/height/center/radius
            shape.ms = glMatrix.mat4.create();
            shape.mesh = null;
            if (shape.type == "mesh") {
                if (!('filename' in shape)) {
                    console.log("ERROR: filename not specified for mesh: " + shape);
                    continue;
                }
                shape.mesh = new BasicMesh();
                let lines = BlockLoader.loadTxt(shape.filename);
                shape.mesh.loadFileFromLines(lines.split("\n"));
            }
            else if (shape.type == "polygon") {
                shape.mesh = new BasicMesh();
                shape.type = "mesh";
                let face = [];
                for (i = 0; i < shape.vertices.length; i++) {
                    let p = glMatrix.vec3.fromValues.apply(null, shape.vertices[i]);
                    face.push(shape.mesh.addVertex(p));
                }
                shape.mesh.addFace(face);
            }
            else if (shape.type == "sphere") {
                if (!('sphere' in glcanvas.specialMeshes)) {
                    let sphereMesh = new BasicMesh();
                    let lines = BlockLoader.loadTxt(meshesrelpath + "sphere1026.off")
                    sphereMesh.loadFileFromLines(lines.split("\n"));
                    glcanvas.specialMeshes.sphere = sphereMesh;
                }
                shape.mesh = glcanvas.specialMeshes.sphere;
                // Apply a transform that realizes the proper center and radius
                // before the transform at this node
                let ms = glMatrix.mat4.create();
                if ('r' in shape) {
                    let r = shape.radius;
                    ms[0] = r;
                    ms[5] = r;
                    ms[10] = r;
                }
                else {
                    shape.radius = 1.0;
                }
                if ('center' in shape) {
                    let c = shape.center;
                    ms[12] = c[0];
                    ms[13] = c[1];
                    ms[14] = c[2];
                }
                else {
                    shape.center = glMatrix.vec3.create();
                }
                shape.ms = ms;
            }
            else if (shape.type == "box") {
                if (!('box' in glcanvas.specialMeshes)) {
                    let boxMesh = new BasicMesh();
                    let lines = BlockLoader.loadTxt(meshesrelpath + "box2402.off");
                    boxMesh.loadFileFromLines(lines.split("\n"));
                    glcanvas.specialMeshes.box = boxMesh;
                }
                shape.mesh = glcanvas.specialMeshes.box;
                let ms = glMatrix.mat4.create();
                if ('width' in shape) {
                    ms[0] = shape.width;
                }
                else {
                    shape.width = 1.0;
                }
                if ('height' in shape) {
                    ms[5] = shape.height;
                }
                else {
                    shape.height = 1.0;
                }
                if ('length' in shape) {
                    ms[10] = shape.length;
                }
                else {
                    shape.length = 1.0;
                }
                if ('center' in shape) {
                    let c = shape.center;
                    ms[12] = c[0];
                    ms[13] = c[1];
                    ms[14] = c[2];
                }
                else {
                    shape.center = glMatrix.vec3.create();
                }
                shape.ms = ms;
            }
            else if (shape.type == "cylinder") {
                if (!('cylinder' in glcanvas.specialMeshes)) {
                    let center = glMatrix.vec3.fromValues(0, 0, 0);
                    let cylinderMesh = getCylinderMesh(center, 1.0, 1.0, 100);
                    glcanvas.specialMeshes.cylinder = cylinderMesh;
                }
                shape.mesh = glcanvas.specialMeshes.cylinder;
                let ms = glMatrix.mat4.create();
                if ('radius' in shape) {
                    ms[0] = shape.radius;
                    ms[10] = shape.radius;
                }
                else {
                    shape.radius = 1.0;
                }
                if ('height' in shape) {
                    ms[5] = shape.height;
                }
                else {
                    shape.height = 1.0;
                }
                if ('center' in shape) {
                    let c = shape.center;
                    ms[12] = c[0];
                    ms[13] = c[1];
                    ms[14] = c[2];
                }
                else {
                    shape.center = glMatrix.vec3.create();
                }
                shape.ms = ms;
            }
            else if (shape.type == "cone") {
                if (!('cone' in glcanvas.specialMeshes)) {
                    let center = glMatrix.vec3.fromValues(0, 0, 0);
                    let conemesh = getConeMesh(center, 1.0, 1.0, 100);
                    glcanvas.specialMeshes.cone = conemesh;
                }
                shape.mesh = glcanvas.specialMeshes.cone;
                let ms = glMatrix.mat4.create();
                if ('radius' in shape) {
                    ms[0] = shape.radius;
                    ms[10] = shape.radius;
                }
                else {
                    shape.radius = 1.0;
                }
                if ('height' in shape) {
                    ms[5] = shape.height;
                }
                else {
                    shape.height = 1.0;
                }
                if ('center' in shape) {
                    let c = shape.center;
                    ms[12] = c[0];
                    ms[13] = c[1];
                    ms[14] = c[2];
                }
                else {
                    shape.center = glMatrix.vec3.create();
                }
                shape.ms = ms;
            }
            else if (shape.type == "scene") {
                if (!('filename' in shape)) {
                    console.log("ERROR: filename not specified for scene: " + node);
                    continue;
                }
                let subscene = BlockLoader.loadJSON(shape.filename);
                // Ignore the cameras, but copy over the materials
                if ('materials' in subscene) {
                    glcanvas.scene.materials = {...glcanvas.scene.materials, ...subscene.materials };
                }
                if ('children' in subscene) {
                    if (!('children' in node)) {
                        node.children = [];
                    }
                    node.children = node.children.concat(subscene.children);
                }
            }            
            else {
                console.log("Warning: Unknown shape type " + shape.type);
            }

            // Figure out material associated to this shape
            if (!('material' in shape)) {
                shape.material = 'default';
            }

            // Have the option to hide this object from display, which
            // is false if not specified
            if (!('hidden' in shape)) {
                shape.hidden = false;
            }
            shape.material = glcanvas.scene.materials[shape.material];
        }
        

        // Step 3: Branch out to child subtrees recursively
        if (!('children' in node)) {
            node.children = [];
        }
        node.children.forEach(function(child) {
            glcanvas.parseNode(child);
        });
    }

    /**
     * Recursive function to output information about the scene tree
     * @param {object} node The scene node
     * @param {string} levelStr A string that keeps track of how much
     *                          to tab over based on depth in tree
     */
    glcanvas.getSceneString = function(node, levelStr) {
        let s = "";
        node.shapes.forEach(function(shape) {
            if ('mesh' in shape) {
                if ('type' in shape) {
                    s += "\n*" + levelStr + shape.type;
                }
            }
        })
        if ('children' in node) {
            for (let i = 0; i < node.children.length; i++) {
                s += "\n" + glcanvas.getSceneString(node.children[i], levelStr+"\t");
            }
        }
        return s;
    }

    /**
     * Fill in the camera based on a JSON specification
     * @param {object} camera The camera object to fill in
     * @param {object} obj The JSON object
     */
    glcanvas.fillInCamera = function(camera, obj) {
        if ('pos' in obj) {
            camera.pos = glMatrix.vec3.fromValues(obj.pos[0], obj.pos[1], obj.pos[2]);
        }
        if ('rot' in obj) {
            let q = obj.rot;
            q = glMatrix.quat.fromValues(q[0], q[1], q[2], q[3]);
            camera.setRotFromQuat(q);
        }
        else {
            camera.setRotFromQuat(glMatrix.quat.create());
        }
        if ('fovx' in obj) {
            camera.fovx = obj.fovx;
        }
        else {
            camera.fovx = DEFAULT_FOVX;
        }
        if ('fovy' in obj) {
            camera.fovy = obj.fovy;
        }
        else {
            camera.fovy = DEFAULT_FOVY;
        }
        if ('near' in obj) {
            camera.near = obj.near;
        }
        else {
            camera.near = DEFAULT_NEAR;
        }
        if ('far' in obj) {
            camera.far = obj.far;
        }
        else {
            camera.far = DEFAULT_FAR;
        }
    }

    /**
     * Setup menus to control positions and colors of lights
     */
    glcanvas.setupLightMenus = function(scene, pixWidth, pixHeight) {
        // Add a camera object to each light so that the user can
        // move the lights around
        if (!('lightMenus' in glcanvas)) {
            glcanvas.lightMenus = [];
        }
        glcanvas.lightMenus.forEach(function(menu) {
            glcanvas.lightMenu.removeFolder(menu);
        });
        glcanvas.lightMenus = [];
        scene.lights.forEach(function(light, i) {
            light.camera = new FPSCamera(pixWidth, pixHeight);
            if (!('pos' in light)) {
                light.pos = [0, 0, 0];
            }
            if (!('color' in light)) {
                light.color = [1, 1, 1];
            }
            if (!('atten' in light)) {
                light.atten = [1, 0, 0];
            }
            if ('towards' in light) {
                let towards = glMatrix.vec3.fromValues.apply(null, light.towards);
                glMatrix.vec3.cross(light.camera.up, light.camera.right, towards);
            }
            else {
                // Light points down by default
                light.towards = [0, -1, 0];
            }
            if (!('angle' in light)) {
                light.angle = Math.PI;
            }
            glMatrix.vec3.copy(light.camera.pos, light.pos);
            light.pos = light.camera.pos;
            // Also add each light to a GUI control
            let menu = glcanvas.lightMenu.addFolder("light " + i);
            glcanvas.lightMenus.push(menu);
            light.camera.position = vecToStr(light.pos);
            menu.add(light.camera, 'position').listen().onChange(
                function(value) {
                    let xyz = splitVecStr(value);
                    for (let k = 0; k < 3; k++) {
                        light.camera.pos[k] = xyz[k];
                    }
                    requestAnimFrame(glcanvas.repaint);
                }
            );
            light.color_rgb = [255*light.color[0], 255*light.color[1], 255*light.color[2]];
            menu.addColor(light, 'color_rgb').onChange(
                function(v) {
                    light.color = glMatrix.vec3.fromValues(v[0]/255, v[1]/255, v[2]/255);
                    requestAnimFrame(glcanvas.repaint);
                }
            );
            light.atten_c = light.atten[0];
            light.atten_l = light.atten[1];
            light.atten_q = light.atten[2];
            menu.add(light, 'atten_c', 0, 5).step(0.02).onChange(
                function(v) {
                    light.atten[0] = v;
                    requestAnimFrame(glcanvas.repaint);
                }
            );
            menu.add(light, 'atten_l', 0, 5).step(0.02).onChange(
                function(v) {
                    light.atten[1] = v;
                    requestAnimFrame(glcanvas.repaint);
                }
            );
            menu.add(light, 'atten_q', 0, 5).step(0.02).onChange(
                function(v) {
                    light.atten[2] = v;
                    requestAnimFrame(glcanvas.repaint);
                }
            );
            menu.add(light, 'angle', 0, Math.PI).step(0.01).onChange(
                function() {
                    requestAnimationFrame(glcanvas.repaint);
                }
            );
            // Setup mechanism to move light around with camera
            light.viewFrom = false;
            menu.add(light, 'viewFrom').listen().onChange(
                function(v) {
                    if (v) {
                        // Toggle other lights viewFrom
                        scene.lights.forEach(function(other) {
                            if (!(other === light)) {
                                other.viewFrom = false;
                            }
                        });
                        // Turn off all cameras viewFrom
                        scene.cameras.forEach(function(camera) {
                            camera.viewFrom = false;
                        })
                        glcanvas.camera = light.camera;
                        requestAnimFrame(glcanvas.repaint);
                    }
                }
            )
        });
    }

    /**
     * Setup menus to control positions and orientations of cameras
     */
    glcanvas.setupCameraMenus = function(scene, pixWidth, pixHeight) {
        if (!('cameraMenus' in glcanvas)) {
            glcanvas.cameraMenus = [];
        }
        glcanvas.cameraMenus.forEach(function(menu) {
            glcanvas.cameraMenu.removeFolder(menu);
        });
        glcanvas.cameraMenus = [];
        scene.cameras.forEach(function(c, i) {
            c.camera = new FPSCamera(pixWidth, pixHeight);
            glcanvas.fillInCamera(c.camera, c);
            // Also add each camera to a GUI control
            let menu = glcanvas.cameraMenu.addFolder("camera " + i);
            glcanvas.cameraMenus.push(menu);
            c.camera.position = vecToStr(c.camera.pos);
            menu.add(c.camera, 'position').listen().onChange(
                function(value) {
                    let xyz = splitVecStr(value);
                    for (let k = 0; k < 3; k++) {
                        c.camera.pos[k] = xyz[k];
                    }
                    requestAnimFrame(glcanvas.repaint);
                }
            );
            menu.add(c.camera, 'rotation').listen().onChange(
                function(value) {
                    let xyzw = splitVecStr(value);
                    for (let k = 0; k < 4; k++) {
                        c.camera.rot[k] = xyzw[k];
                    }
                    requestAnimFrame(glcanvas.repaint);
                }
            );
            menu.add(c.camera, 'fovx', 0.5, 3).onChange(
                function() {
                    requestAnimFrame(glcanvas.repaint);
                }
            );
            menu.add(c.camera, 'fovy', 0.5, 3).onChange(
                function() {
                    requestAnimFrame(glcanvas.repaint);
                }
            );
            menu.add(c.camera, 'near', 0.001, 100000).onChange(
                function() {
                    requestAnimFrame(glcanvas.repaint);
                }
            );
            menu.add(c.camera, 'far', 0.001, 100000).onChange(
                function() {
                    requestAnimFrame(glcanvas.repaint);
                }
            );
            // Setup mechanism to move camera around with keyboard/mouse
            if (i == 0) {
                c.viewFrom = true;
            }
            else {
                c.viewFrom = false;
            }
            menu.add(c, 'viewFrom').listen().onChange(
                function(v) {
                    if (v) {
                        // Toggle other cameras viewFrom
                        scene.cameras.forEach(function(other) {
                            if (!(other === c)) {
                                other.viewFrom = false;
                            }
                        });
                        // Turn off all viewFrom in lights
                        scene.lights.forEach(function(light) {
                            light.viewFrom = false;
                        });
                        glcanvas.camera = c.camera;
                        requestAnimFrame(glcanvas.repaint);
                    }
                }
            )
        });
        if (scene.cameras.length > 0) {
            // Add the first camera to the drawing parameters
            scene.cameras[0].viewFrom = true;
            glcanvas.camera = scene.cameras[0].camera;
        }
    }

    glcanvas.setupMaterialsMenu = function(scene) {
        if (!('materialMenus' in glcanvas)) {
            glcanvas.materialMenus = [];
        }
        glcanvas.materialMenus.forEach(function(menu) {
            glcanvas.materialsMenu.removeFolder(menu);
        });
        glcanvas.materialMenus = [];
        for (let name in scene.materials) {
            if (Object.prototype.hasOwnProperty.call(scene.materials, name)) {
                let material = scene.materials[name];
                if (!('ka' in material)) {
                    material.ka = DEFAULT_AMBIENT;
                }
                if (!('kd' in material)) {
                    material.kd = DEFAULT_DIFFUSE;
                }
                if (!('ks' in material)) {
                    material.ks = DEFAULT_SPECULAR;
                }
                if (!('kt' in material)) {
                    material.kt = DEFAULT_TRANSMISSION;
                }
                if (!('refraction' in material)) {
                    material.refraction = DEFAULT_REFRACTION_RATIO;
                }
                if (!('shininess' in material)) {
                    material.shininess = DEFAULT_SHININESS;
                }
                if (!('special' in material)) {
                    material.special = false;
                }
                let menu = glcanvas.materialsMenu.addFolder(name);
                glcanvas.materialMenus.push(menu);
                material.ka_rgb = [255*material.ka[0], 255*material.ka[1], 255*material.ka[2]];
                menu.addColor(material, 'ka_rgb').onChange(
                    function(v) {
                        material.ka = glMatrix.vec3.fromValues(v[0]/255, v[1]/255, v[2]/255);
                        requestAnimFrame(glcanvas.repaint);
                    }
                );
                material.kd_rgb = [255*material.kd[0], 255*material.kd[1], 255*material.kd[2]];
                menu.addColor(material, 'kd_rgb').onChange(
                    function(v) {
                        material.kd = glMatrix.vec3.fromValues(v[0]/255, v[1]/255, v[2]/255);
                        requestAnimFrame(glcanvas.repaint);
                    }
                );
                material.ks_rgb = [255*material.ks[0], 255*material.ks[1], 255*material.ks[2]];
                menu.addColor(material, 'ks_rgb').onChange(
                    function(v) {
                        material.ks = glMatrix.vec3.fromValues(v[0]/255, v[1]/255, v[2]/255);
                        requestAnimFrame(glcanvas.repaint);
                    }
                );
                material.kt_rgb = [255*material.kt[0], 255*material.kt[1], 255*material.kt[2]];
                menu.addColor(material, 'kt_rgb').onChange(
                    function(v) {
                        material.kt = glMatrix.vec3.fromValues(v[0]/255, v[1]/255, v[2]/255);
                        requestAnimFrame(glcanvas.repaint);
                    }
                );
                menu.add(material, 'shininess', 0.01, 1000).onChange(
                    function() {
                        requestAnimFrame(glcanvas.repaint);
                    }
                );
                menu.add(material, 'refraction', 0.2, 5).onChange(
                    function() {
                        requestAnimFrame(glcanvas.repaint);
                    }
                );
                menu.add(material, 'special').onChange(
                    function() {
                        requestAnimationFrame(glcanvas.repaint);
                    }
                )
            }
        }
    }

    /**
     * A function that starts of the recursive initialization
     * of the scene, and which also sets up cameras
     * 
     * @param {WebGL Handle} glcanvas 
     */
    glcanvas.setupScene = function(scene, pixWidth, pixHeight) {
        glcanvas.scene = scene

        // Step 1: Setup defaults
        // Setup default light
        if (!('lights' in scene)) {
            scene.lights = [];
        }
        if (scene.lights.length == 0) {
            scene.lights.push({pos:[0, 0, 0], color:[1, 1, 1], atten:[1, 0, 0]});
        }
        // Setup default camera
        if (!('cameras') in scene) {
            scene.cameras = [];
        }
        if (scene.cameras.length == 0) {
            scene.cameras.push({pos:[0.00, 1.50, 5.00], rot:[0.00, 0.00, 0.00, 1.00], fovx:1.9, fovy:1.9});
        }
        // Setup default material
        if (!('materials' in scene)) {
            scene.materials = {};
        }
        if (!('default' in scene.materials)) {
            scene.materials['default'] = {"ka":[0, 0, 0],
                                          "kd":[0.5, 0.55, 0.5],
                                          "ks":[0, 0, 0],
                                          "kt":[0, 0, 0],
                                          "shininess":1,
                                          "refraction":1}
        }

        // Step 2: Recurse and setup all of the children nodes in the tree
        glcanvas.scene.children.forEach(function(child) {
            glcanvas.parseNode(child);
        });
        //Output information about the scene tree
        glcanvas.scene.children.forEach(function(child) {
            console.log(glcanvas.getSceneString(child, " "));
        });

        // Step 3: Setup menus
        // Setup lights and light menus
        glcanvas.setupLightMenus(scene, pixWidth, pixHeight);

        // Setup cameras and camera menus
        glcanvas.setupCameraMenus(scene, pixWidth, pixHeight);

        // Setup materials and materials menu
        glcanvas.setupMaterialsMenu(scene);
    }


    /////////////////////////////////////////////////////
    //  Repaint Function
    /////////////////////////////////////////////////////
    glcanvas.repaintRecurse = function(node, transform) {
        let nextTransform = glMatrix.mat4.create();
        glMatrix.mat4.mul(nextTransform, transform, node.transform);
        node.shapes.forEach(function(shape) {
            if ('mesh' in shape) {
                if (!(shape.mesh === null) && !shape.hidden) {
                    if ('material' in shape) {
                        glcanvas.material = shape.material;
                    }
                    else if ('material' in glcanvas) {
                        delete glcanvas.material;
                    }
                    // There may be an additional transform to apply based
                    // on shape properties of special shapes (e.g. box width)
                    let tMatrix = glMatrix.mat4.create();
                    glMatrix.mat4.mul(tMatrix, nextTransform, shape.ms);
                    shape.mesh.render(glcanvas, tMatrix);
                }
            }
        });
        if ('children' in node) {
            for (let i = 0; i < node.children.length; i++) {
                glcanvas.repaintRecurse(node.children[i], nextTransform);
            }
        }
    }
    
    glcanvas.drawCameraBeacon = function(camera, color) {
        // Switch over to a flat shader with no edges
        let sProg = glcanvas.shaderToUse;
        let drawEdges = glcanvas.drawEdges;
        let material = glcanvas.material;
        glcanvas.shaderToUse = glcanvas.shaders.flat;
        glcanvas.drawEdges = false;

        let pos = camera.pos;
        let postw = glMatrix.vec3.create();
        let posrt = glMatrix.vec3.create();
        let posup = glMatrix.vec3.create();
        glMatrix.vec3.cross(postw, camera.up, camera.right);
        glMatrix.vec3.scaleAndAdd(postw, pos, postw, BEACON_SIZE*2);
        glMatrix.vec3.scaleAndAdd(posrt, pos, camera.right, BEACON_SIZE*2);
        glMatrix.vec3.scaleAndAdd(posup, pos, camera.up, BEACON_SIZE*2);
        glcanvas.drawer.drawLine(pos, postw, [1, 0, 0]);
        glcanvas.drawer.drawLine(pos, posrt, [0, 1, 0]);
        glcanvas.drawer.drawLine(pos, posup, [0, 0, 1]);
        glcanvas.material = {ka:colorFloatFromHex(color)};
        let tMatrix = glMatrix.mat4.create();
        glMatrix.mat4.fromTranslation(tMatrix, pos);
        glcanvas.specialMeshes.beacon.render(glcanvas, tMatrix);
        
        // Set properties back to what they were
        glcanvas.material = material;
        glcanvas.shaderToUse = sProg;
        glcanvas.drawEdges = drawEdges;
        glcanvas.drawer.repaint(glcanvas.camera);
    }

    glcanvas.drawLightBeacon = function(light) {
        // Switch over to a flat shader with no edges
        let sProg = glcanvas.shaderToUse;
        let drawEdges = glcanvas.drawEdges;
        let material = glcanvas.material;
        glcanvas.shaderToUse = glcanvas.shaders.flat;
        glcanvas.drawEdges = false;

        let pos = light.pos;
        glcanvas.material = {ka:light.color};
        let tMatrix = glMatrix.mat4.create();
        glMatrix.mat4.fromTranslation(tMatrix, pos);
        glcanvas.specialMeshes.beacon.render(glcanvas, tMatrix);
        
        // Set properties back to what they were
        glcanvas.shaderToUse = sProg;
        glcanvas.drawEdges = drawEdges;
        glcanvas.material = material;
        glcanvas.drawer.repaint(glcanvas.camera);
    }

    glcanvas.repaint = function() {
        if (glcanvas.scene === null) {
            return;
        }
        glcanvas.gl.viewport(0, 0, glcanvas.gl.viewportWidth, glcanvas.gl.viewportHeight);
        glcanvas.gl.clear(glcanvas.gl.COLOR_BUFFER_BIT | glcanvas.gl.DEPTH_BUFFER_BIT);

        //Then drawn the scene
        let scene = glcanvas.scene;
        let identity = glMatrix.mat4.create();
        if ('children' in scene) {
            scene.children.forEach(function(child) {
                glcanvas.repaintRecurse(child, identity);
            });
        }

        //Draw lines and points for debugging
        glcanvas.drawer.reset(); //Clear lines and points drawn last time
        //TODO: Paint debugging stuff here if you'd like


        // Now draw the beacons for the cameras and lights (assuming FPSCamera objects)
        if (glcanvas.showCameras) {
            glcanvas.scene.cameras.forEach(
                function(camera) {
                    if (!(glcanvas.camera === camera.camera)) {
                        glcanvas.drawCameraBeacon(camera.camera, BEACON_COLOR_1);
                    }
                }
            )
        }
        glcanvas.lights = glcanvas.scene.lights; // For mesh rendering
        if (glcanvas.showLights) {
            glcanvas.scene.lights.forEach(
                function(light) {
                    if (!(glcanvas.camera === light.camera)) {
                        glcanvas.drawLightBeacon(light);
                    }
                }
            );
        }
        
        // Redraw if walking
        let thisTime = (new Date()).getTime();
        let dt = (thisTime - glcanvas.lastTime)/1000.0;
        glcanvas.lastTime = thisTime;
        if (glcanvas.movelr != 0 || glcanvas.moveud != 0 || glcanvas.movefb != 0) {
            glcanvas.camera.translate(0, 0, glcanvas.movefb, glcanvas.walkspeed*dt);
            glcanvas.camera.translate(0, glcanvas.moveud, 0, glcanvas.walkspeed*dt);
            glcanvas.camera.translate(glcanvas.movelr, 0, 0, glcanvas.walkspeed*dt);
            glcanvas.camera.position = vecToStr(glcanvas.camera.pos);
            if (glcanvas.repaintOnInteract) {
                requestAnimFrame(glcanvas.repaint);
            }
        }
    }

    glcanvas.updateMeshDrawingsRecurse = function(node) {
        node.shapes.forEach(function(shape) {
            if ('mesh' in shape) {
                if (shape.mesh === null) {
                    console.log("Shape for type " + shape.type + " is null");
                }
                else {
                    shape.mesh.needsDisplayUpdate = true;
                }
                
            }
        });
        if ('children' in node) {
            node.children.forEach(function(child) {
                glcanvas.updateMeshDrawingsRecurse(child);
            })
        }
    }

    glcanvas.updateMeshDrawings = function() {
        let scene = glcanvas.scene;
        if ('children' in glcanvas.scene) {
            scene.children.forEach(function(child) {
                glcanvas.updateMeshDrawingsRecurse(child);
            });
        }
    }

    /////////////////////////////////////////////////////
    //Step 3: Initialize GUI Callbacks
    /////////////////////////////////////////////////////
    glcanvas.drawer = new SimpleDrawer(glcanvas.gl, glcanvas.shaders);//Simple drawer object for debugging
    
    glcanvas.gui = new dat.GUI();
    const gui = glcanvas.gui;
    // Mesh display options menu
    glcanvas.drawEdges = false;
    let meshOpts = gui.addFolder('Mesh Display Options');
    ['drawEdges', 'drawNormals', 'drawPoints'].forEach(
        function(s) {
            let evt = meshOpts.add(glcanvas, s);
            evt.onChange(function() {
                glcanvas.updateMeshDrawings();
                requestAnimFrame(glcanvas.repaint);
            });
        }
    );

    // Lighting menu
    glcanvas.lightMenu = gui.addFolder('Lights');
    glcanvas.showLights = true;
    glcanvas.lightMenu.add(glcanvas, 'showLights').onChange(function() {
        requestAnimFrame(glcanvas.repaint);
    });

    // Camera control menu
    glcanvas.cameraMenu = gui.addFolder('Cameras');
    let cameraMenu = glcanvas.cameraMenu;
    glcanvas.showCameras = true;
    cameraMenu.add(glcanvas, 'showCameras').onChange(function() {
        requestAnimFrame(glcanvas.repaint);
    });

    // Materials menu
    glcanvas.materialsMenu = gui.addFolder('Materials');

    // Shaders menu
    glcanvas.shaderToUse = glcanvas.shaders.blinnPhong;
    glcanvas.shader = "blinnPhong";
    gui.add(glcanvas, "shader", ["blinnPhong", "gouraud", "depth", "normal", "flat"]).onChange(function() {
        glcanvas.shaderToUse = glcanvas.shaders[glcanvas.shader];
        requestAnimFrame(glcanvas.repaint);
    });

    // Other options
    glcanvas.walkspeed = 2.6;
    gui.add(glcanvas, 'walkspeed', 0.01, 100);
}