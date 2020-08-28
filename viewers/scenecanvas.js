/**
 * Convert a hex color string to an array of floating point numbers in [0, 1]
 * 
 * @param {string} s 6 character string
 */
function colorFloatFromHex(s) {
    let r = parseInt(s.substring(0, 2), 16)/255.0;
    let g = parseInt(s.substring(2, 4), 16)/255.0;
    let b = parseInt(s.substring(4, 6), 16)/255.0;
    return [r, g, b];
}

/**
 * A class for rendering a scene graph and maintaining 
 * menus for interactively updating material/light/camera properites
 */
class SceneCanvas extends BaseCanvas {
    constructor(glcanvas, shadersrelpath, meshesrelpath, antialias) {
        super(glcanvas, shadersrelpath, antialias);
        this.meshesrelpath = meshesrelpath;
        this.scene = null;
        this.specialMeshes = {};
        // Initialize the icosahedron for the camera beacons
        this.specialMeshes.beacon = getIcosahedronMesh();
        this.specialMeshes.beacon.Scale(SceneCanvas.BEACON_SIZE, SceneCanvas.BEACON_SIZE, SceneCanvas.BEACON_SIZE);
        // Setup drawer object for debugging
        this.drawer = new SimpleDrawer(this.gl, this.shaders);
        // Initialize menus
        this.setupMenus();
    }

    /**
     * Setup the dat.GUI menus
     */
    setupMenus() {
        this.gui = new dat.GUI();
        const gui = this.gui;
        // Mesh display options menu
        this.drawEdges = false;
        let meshOpts = gui.addFolder('Mesh Display Options');
        let canvas = this;
        ['drawEdges', 'drawNormals', 'drawPoints'].forEach(
            function(s) {
                let evt = meshOpts.add(canvas, s);
                evt.onChange(function() {
                    canvas.updateMeshDrawings();
                    requestAnimFrame(canvas.repaint.bind(canvas));
                });
            }
        );

        // Lighting menu
        this.lightMenu = gui.addFolder('Lights');
        this.lightMenus = []; // Individual menus for each light
        this.showLights = true;
        this.lightMenu.add(canvas, 'showLights').onChange(function() {
            requestAnimFrame(canvas.repaint.bind(canvas));
        });

        // Camera control menu
        this.cameraMenu = gui.addFolder('Cameras');
        this.cameraMenus = []; // Individual menus for each camera
        let cameraMenu = this.cameraMenu;
        this.showCameras = true;
        cameraMenu.add(canvas, 'showCameras').onChange(function() {
            requestAnimFrame(canvas.repaint.bind(canvas));
        });

        // Materials menu
        this.materialsMenu = gui.addFolder('Materials');
        this.materialMenus = []; // Individual menus for each material

        // Shaders menu
        this.shaderToUse = this.shaders.blinnPhong;
        this.shader = "blinnPhong";
        gui.add(canvas, "shader", ["blinnPhong", "gouraud", "depth", "depth16", "normal", "normalLocal", "flat"]).onChange(function() {
            canvas.shaderToUse = canvas.shaders[canvas.shader];
            requestAnimFrame(canvas.repaint.bind(canvas));
        });

        // Other options
        this.walkspeed = 2.6;
        gui.add(canvas, 'walkspeed', 0.01, 100);
    }

    /**
     * Recursively load all of the meshes and put all of the matrix 
     * transformations into glMatrix.mat4 objects.
     * At this point, all shapes are converted to meshes
     * 
     * @param {object} node The current node in the recursive parsing
     */
    parseNode(node) {
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
                if (!('filename' in shape) && !('src' in shape)) {
                    console.log("ERROR: Neither filename nor src specified for mesh: " + shape);
                    continue;
                }
                shape.mesh = new BasicMesh();
                let src = "";
                if ('src' in shape) {
                    src = shape.src;
                }
                else {
                    src = BlockLoader.loadTxt(shape.filename);
                }
                shape.mesh.loadFileFromLines(src.split("\n"));
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
                if (!('sphere' in this.specialMeshes)) {
                    let sphereMesh = new BasicMesh();
                    let lines = BlockLoader.loadTxt(this.meshesrelpath + "sphere1026.off")
                    sphereMesh.loadFileFromLines(lines.split("\n"));
                    this.specialMeshes.sphere = sphereMesh;
                }
                shape.mesh = this.specialMeshes.sphere;
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
                if (!('box' in this.specialMeshes)) {
                    let boxMesh = new BasicMesh();
                    let lines = BlockLoader.loadTxt(this.meshesrelpath + "box2402.off");
                    boxMesh.loadFileFromLines(lines.split("\n"));
                    this.specialMeshes.box = boxMesh;
                }
                shape.mesh = this.specialMeshes.box;
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
                if (!('cylinder' in this.specialMeshes)) {
                    let center = glMatrix.vec3.fromValues(0, 0, 0);
                    let cylinderMesh = getCylinderMesh(center, 1.0, 1.0, 100);
                    this.specialMeshes.cylinder = cylinderMesh;
                }
                shape.mesh = this.specialMeshes.cylinder;
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
                if (!('cone' in this.specialMeshes)) {
                    let center = glMatrix.vec3.fromValues(0, 0, 0);
                    let conemesh = getConeMesh(center, 1.0, 1.0, 100);
                    this.specialMeshes.cone = conemesh;
                }
                shape.mesh = this.specialMeshes.cone;
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
                    this.scene.materials = {...this.scene.materials, ...subscene.materials };
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
            shape.material = this.scene.materials[shape.material];
        }
        

        // Step 3: Branch out to child subtrees recursively
        if (!('children' in node)) {
            node.children = [];
        }
        let canvas = this;
        node.children.forEach(function(child) {
            canvas.parseNode(child);
        });
    }

    /**
     * Recursive function to output information about the scene tree
     * 
     * @param {object} node The scene node
     * @param {string} levelStr A string that keeps track of how much
     *                          to tab over based on depth in tree
     */
    getSceneString(node, levelStr) {
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
                s += "\n" + this.getSceneString(node.children[i], levelStr+"\t");
            }
        }
        return s;
    }

    /**
     * Fill in the camera based on a JSON specification
     * 
     * @param {object} camera The camera object to fill in
     * @param {object} obj The JSON object
     */
    fillInCamera(camera, obj) {
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
            camera.fovx = Camera3D.DEFAULT_FOVX;
        }
        if ('fovy' in obj) {
            camera.fovy = obj.fovy;
        }
        else {
            camera.fovy = Camera3D.DEFAULT_FOVY;
        }
        if ('near' in obj) {
            camera.near = obj.near;
        }
        else {
            camera.near = Camera3D.DEFAULT_NEAR;
        }
        if ('far' in obj) {
            camera.far = obj.far;
        }
        else {
            camera.far = Camera3D.DEFAULT_FAR;
        }
    }

    /**
     * Setup menus to control positions and colors of lights
     * 
     * @param {object} scene The scene object
     * @param {int} pixWidth Width of the canvas in pixels
     * @param {int} pixHeight Height of the canvas in pixels
     */
    setupLightMenus(scene, pixWidth, pixHeight) {
        let canvas = this;
        // Add a camera object to each light so that the user can
        // move the lights around

        // Remove any menus that may have been there before
        this.lightMenus.forEach(function(menu) {
            canvas.lightMenu.removeFolder(menu);
        });
        this.lightMenus = [];
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
            let menu = canvas.lightMenu.addFolder("light " + i);
            canvas.lightMenus.push(menu);
            light.camera.position = vecToStr(light.pos);
            menu.add(light.camera, 'position').listen().onChange(
                function(value) {
                    let xyz = splitVecStr(value);
                    for (let k = 0; k < 3; k++) {
                        light.camera.pos[k] = xyz[k];
                    }
                    requestAnimFrame(canvas.repaint.bind(canvas));
                }
            );
            light.color_rgb = [255*light.color[0], 255*light.color[1], 255*light.color[2]];
            menu.addColor(light, 'color_rgb').onChange(
                function(v) {
                    light.color = glMatrix.vec3.fromValues(v[0]/255, v[1]/255, v[2]/255);
                    requestAnimFrame(canvas.repaint.bind(canvas));
                }
            );
            light.atten_c = light.atten[0];
            light.atten_l = light.atten[1];
            light.atten_q = light.atten[2];
            menu.add(light, 'atten_c', 0, 5).step(0.02).onChange(
                function(v) {
                    light.atten[0] = v;
                    requestAnimFrame(canvas.repaint.bind(canvas));
                }
            );
            menu.add(light, 'atten_l', 0, 5).step(0.02).onChange(
                function(v) {
                    light.atten[1] = v;
                    requestAnimFrame(canvas.repaint.bind(canvas));
                }
            );
            menu.add(light, 'atten_q', 0, 5).step(0.02).onChange(
                function(v) {
                    light.atten[2] = v;
                    requestAnimFrame(canvas.repaint.bind(canvas));
                }
            );
            menu.add(light, 'angle', 0, Math.PI).step(0.01).onChange(
                function() {
                    requestAnimationFrame(canvas.repaint);
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
                        canvas.camera = light.camera;
                        requestAnimFrame(canvas.repaint.bind(canvas));
                    }
                }
            )
        });
    }

    /**
     * Setup menus to control positions and orientations of cameras
     * 
     * @param {object} scene The scene object
     * @param {int} pixWidth Width of the canvas in pixels
     * @param {int} pixHeight Height of the canvas in pixels
     */
    setupCameraMenus(scene, pixWidth, pixHeight) {
        let canvas = this;
        this.cameraMenus.forEach(function(menu) {
            canvas.cameraMenu.removeFolder(menu);
        });
        this.cameraMenus = [];
        scene.cameras.forEach(function(c, i) {
            c.camera = new FPSCamera(pixWidth, pixHeight);
            canvas.fillInCamera(c.camera, c);
            // Also add each camera to a GUI control
            let menu = canvas.cameraMenu.addFolder("camera " + i);
            canvas.cameraMenus.push(menu);
            c.camera.position = vecToStr(c.camera.pos);
            menu.add(c.camera, 'position').listen().onChange(
                function(value) {
                    let xyz = splitVecStr(value);
                    for (let k = 0; k < 3; k++) {
                        c.camera.pos[k] = xyz[k];
                    }
                    requestAnimFrame(canvas.repaint.bind(canvas));
                }
            );
            menu.add(c.camera, 'rotation').listen().onChange(
                function(value) {
                    let xyzw = splitVecStr(value);
                    for (let k = 0; k < 4; k++) {
                        c.camera.rot[k] = xyzw[k];
                    }
                    requestAnimFrame(canvas.repaint.bind(canvas));
                }
            );
            menu.add(c.camera, 'fovx', 0.5, 3).onChange(
                function() {
                    requestAnimFrame(canvas.repaint.bind(canvas));
                }
            );
            menu.add(c.camera, 'fovy', 0.5, 3).onChange(
                function() {
                    requestAnimFrame(canvas.repaint.bind(canvas));
                }
            );
            menu.add(c.camera, 'near', 0.001, 100000).onChange(
                function() {
                    requestAnimFrame(canvas.repaint.bind(canvas));
                }
            );
            menu.add(c.camera, 'far', 0.001, 100000).onChange(
                function() {
                    requestAnimFrame(canvas.repaint.bind(canvas));
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
                        canvas.camera = c.camera;
                        requestAnimFrame(canvas.repaint.bind(canvas));
                    }
                }
            )
        });
        if (scene.cameras.length > 0) {
            // Add the first camera to the drawing parameters
            scene.cameras[0].viewFrom = true;
            canvas.camera = scene.cameras[0].camera;
        }
    }

    /**
     * Setup a menu for each material in the scene
     * 
     * @param {object} scene The scene object
     */
    setupMaterialsMenu(scene) {
        let canvas = this;
        // Clear any menus that may have been there before
        this.materialMenus.forEach(function(menu) {
            canvas.materialsMenu.removeFolder(menu);
        });
        this.materialMenus = [];
        for (let name in scene.materials) {
            if (Object.prototype.hasOwnProperty.call(scene.materials, name)) {
                let material = scene.materials[name];
                if (!('ka' in material)) {
                    material.ka = PolyMesh.DEFAULT_AMBIENT;
                }
                if (!('kd' in material)) {
                    material.kd = PolyMesh.DEFAULT_DIFFUSE;
                }
                if (!('ks' in material)) {
                    material.ks = PolyMesh.DEFAULT_SPECULAR;
                }
                if (!('kt' in material)) {
                    material.kt = PolyMesh.DEFAULT_TRANSMISSION;
                }
                if (!('refraction' in material)) {
                    material.refraction = PolyMesh.DEFAULT_REFRACTION_RATIO;
                }
                if (!('shininess' in material)) {
                    material.shininess = PolyMesh.DEFAULT_SHININESS;
                }
                if (!('special' in material)) {
                    material.special = false;
                }
                let menu = canvas.materialsMenu.addFolder(name);
                canvas.materialMenus.push(menu);
                material.ka_rgb = [255*material.ka[0], 255*material.ka[1], 255*material.ka[2]];
                menu.addColor(material, 'ka_rgb').onChange(
                    function(v) {
                        material.ka = glMatrix.vec3.fromValues(v[0]/255, v[1]/255, v[2]/255);
                        requestAnimFrame(canvas.repaint.bind(canvas));
                    }
                );
                material.kd_rgb = [255*material.kd[0], 255*material.kd[1], 255*material.kd[2]];
                menu.addColor(material, 'kd_rgb').onChange(
                    function(v) {
                        material.kd = glMatrix.vec3.fromValues(v[0]/255, v[1]/255, v[2]/255);
                        requestAnimFrame(canvas.repaint.bind(canvas));
                    }
                );
                material.ks_rgb = [255*material.ks[0], 255*material.ks[1], 255*material.ks[2]];
                menu.addColor(material, 'ks_rgb').onChange(
                    function(v) {
                        material.ks = glMatrix.vec3.fromValues(v[0]/255, v[1]/255, v[2]/255);
                        requestAnimFrame(canvas.repaint.bind(canvas));
                    }
                );
                material.kt_rgb = [255*material.kt[0], 255*material.kt[1], 255*material.kt[2]];
                menu.addColor(material, 'kt_rgb').onChange(
                    function(v) {
                        material.kt = glMatrix.vec3.fromValues(v[0]/255, v[1]/255, v[2]/255);
                        requestAnimFrame(canvas.repaint.bind(canvas));
                    }
                );
                menu.add(material, 'shininess', 0.01, 1000).onChange(
                    function() {
                        requestAnimFrame(canvas.repaint.bind(canvas));
                    }
                );
                menu.add(material, 'refraction', 0.2, 5).onChange(
                    function() {
                        requestAnimFrame(canvas.repaint.bind(canvas));
                    }
                );
                menu.add(material, 'special').onChange(
                    function() {
                        requestAnimationFrame(canvas.repaint);
                    }
                )
            }
        }
    }

    /**
     * A function that starts of the recursive initialization
     * of the scene, and which also sets up cameras
     * 
     * @param {object} scene The scene object
     * @param {int} pixWidth Width of the canvas in pixels
     * @param {int} pixHeight Height of the canvas in pixels
     */
    setupScene(scene, pixWidth, pixHeight) {
        let canvas = this;
        this.scene = scene;
        this.width = pixWidth;
        this.height = pixHeight;

        // Step 1: Setup defaults
        // Setup default light
        if (!('lights' in scene)) {
            scene.lights = [];
        }
        if (scene.lights.length == 0) {
            scene.lights.push({pos:[0, 0, 0], color:[1, 1, 1], atten:[1, 0, 0]});
        }
        // Setup default camera
        if (!('cameras' in scene)) {
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
                                          "refraction":1};
        }

        // Step 2: Recurse and setup all of the children nodes in the tree
        this.scene.children.forEach(function(child) {
            canvas.parseNode(child);
        });
        //Output information about the scene tree
        this.scene.children.forEach(function(child) {
            console.log(canvas.getSceneString(child, " "));
        });

        // Step 3: Setup menus
        // Setup lights and light menus
        this.setupLightMenus(scene, pixWidth, pixHeight);

        // Setup cameras and camera menus
        this.setupCameraMenus(scene, pixWidth, pixHeight);

        // Setup materials and materials menu
        this.setupMaterialsMenu(scene);
    }

    /**
     * Recursively draw objects in the scene
     * 
     * @param {object} node The scene node to render
     * @param {glMatrix.mat4} transform The cumulative transform so far
     */
    repaintRecurse(node, transform) {
        let canvas = this;
        let nextTransform = glMatrix.mat4.create();
        glMatrix.mat4.mul(nextTransform, transform, node.transform);
        node.shapes.forEach(function(shape) {
            if ('mesh' in shape) {
                if (!(shape.mesh === null) && !shape.hidden) {
                    if ('material' in shape) {
                        canvas.material = shape.material;
                    }
                    else if ('material' in canvas) {
                        delete canvas.material;
                    }
                    // There may be an additional transform to apply based
                    // on shape properties of special shapes (e.g. box width)
                    let tMatrix = glMatrix.mat4.create();
                    glMatrix.mat4.mul(tMatrix, nextTransform, shape.ms);
                    shape.mesh.render(canvas, tMatrix);
                }
            }
        });
        if ('children' in node) {
            for (let i = 0; i < node.children.length; i++) {
                this.repaintRecurse(node.children[i], nextTransform);
            }
        }
    }
    
    /**
     * Draw an icosahedron at the location of a camera
     * 
     * @param {Camera3D} camera The camera object
     * @param {string} color Hex color of the beacon
     */
    drawCameraBeacon(camera, color) {
        // Switch over to a flat shader with no edges
        let sProg = this.shaderToUse;
        let drawEdges = this.drawEdges;
        let material = this.material;
        this.shaderToUse = this.shaders.flat;
        this.drawEdges = false;

        let pos = camera.pos;
        let postw = glMatrix.vec3.create();
        let posrt = glMatrix.vec3.create();
        let posup = glMatrix.vec3.create();
        glMatrix.vec3.cross(postw, camera.up, camera.right);
        glMatrix.vec3.scaleAndAdd(postw, pos, postw, SceneCanvas.BEACON_SIZE*2);
        glMatrix.vec3.scaleAndAdd(posrt, pos, camera.right, SceneCanvas.BEACON_SIZE*2);
        glMatrix.vec3.scaleAndAdd(posup, pos, camera.up, SceneCanvas.BEACON_SIZE*2);
        this.drawer.drawLine(pos, postw, [1, 0, 0]);
        this.drawer.drawLine(pos, posrt, [0, 1, 0]);
        this.drawer.drawLine(pos, posup, [0, 0, 1]);
        this.material = {ka:colorFloatFromHex(color)};
        let tMatrix = glMatrix.mat4.create();
        glMatrix.mat4.fromTranslation(tMatrix, pos);
        this.specialMeshes.beacon.render(this, tMatrix);
        
        // Set properties back to what they were
        this.material = material;
        this.shaderToUse = sProg;
        this.drawEdges = drawEdges;
        this.drawer.repaint(this.camera);
    }

    /**
     * Draw a beacon for a light with the color of that light
     * 
     * @param {object} light Light object
     */
    drawLightBeacon(light) {
        // Switch over to a flat shader with no edges
        let sProg = this.shaderToUse;
        let drawEdges = this.drawEdges;
        let material = this.material;
        this.shaderToUse = this.shaders.flat;
        this.drawEdges = false;

        let pos = light.pos;
        this.material = {ka:light.color};
        let tMatrix = glMatrix.mat4.create();
        glMatrix.mat4.fromTranslation(tMatrix, pos);
        this.specialMeshes.beacon.render(this, tMatrix);
        
        // Set properties back to what they were
        this.shaderToUse = sProg;
        this.drawEdges = drawEdges;
        this.material = material;
        this.drawer.repaint(this.camera);
    }

    /**
     * Redraw the whole scene
     */
    repaint() {
        if (this.scene === null) {
            return;
        }
        let canvas = this;
        // First clear the canvas
        this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        //Then draw the scene
        let scene = this.scene;
        if ('children' in scene) {
            scene.children.forEach(function(child) {
                canvas.repaintRecurse(child, glMatrix.mat4.create());
            });
        }

        //Draw lines and points for debugging
        this.drawer.reset(); //Clear lines and points drawn last time
        //TODO: Paint debugging stuff here if desired

        // Now draw the beacons for the cameras and lights (assuming FPSCamera objects)
        if (this.showCameras) {
            this.scene.cameras.forEach(
                function(camera) {
                    if (!(canvas.camera === camera.camera)) {
                        canvas.drawCameraBeacon(camera.camera, SceneCanvas.BEACON_COLOR_1);
                    }
                }
            )
        }
        this.lights = this.scene.lights; // For mesh rendering
        if (this.showLights) {
            this.scene.lights.forEach(
                function(light) {
                    if (!(canvas.camera === light.camera)) {
                        canvas.drawLightBeacon(light);
                    }
                }
            );
        }
        
        // Redraw if walking
        let thisTime = (new Date()).getTime();
        let dt = (thisTime - this.lastTime)/1000.0;
        this.lastTime = thisTime;
        if (this.movelr != 0 || this.moveud != 0 || this.movefb != 0) {
            this.camera.translate(0, 0, this.movefb, this.walkspeed*dt);
            this.camera.translate(0, this.moveud, 0, this.walkspeed*dt);
            this.camera.translate(this.movelr, 0, 0, this.walkspeed*dt);
            this.camera.position = vecToStr(this.camera.pos);
            if (this.repaintOnInteract) {
                requestAnimFrame(canvas.repaint.bind(canvas));
            }
        }
    }

    /**
     * Recursively mark meshes as needing to update
     * 
     * @param {object} node Node in the scene to update
     */
    updateMeshDrawingsRecurse(node) {
        let canvas = this;
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
                canvas.updateMeshDrawingsRecurse(child);
            })
        }
    }

    /**
     * Mark all meshes in the scene as needing an update
     */
    updateMeshDrawings() {
        let canvas = this;
        let scene = this.scene;
        if ('children' in this.scene) {
            scene.children.forEach(function(child) {
                canvas.updateMeshDrawingsRecurse(child);
            });
        }
    }
}
SceneCanvas.BEACON_SIZE = 0.1;
SceneCanvas.BEACON_COLOR_1 = "A7383E";
SceneCanvas.BEACON_COLOR_2 = "378B2E";