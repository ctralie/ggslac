class HeightmapCanvas extends SimpleMeshCanvas {

    /**
     * @param {DOM Element} glcanvas Handle to HTML where the glcanvas resides
     * @param {DOM Element} hcanvas Handle to HTML where the 2D canvas resides
     * @param {string} shadersrelpath Path to the folder that contains the shaders,
     *                                relative to where the constructor is being called
     * @param {string} editorName Name of the javascript editor for the height function
     */
    constructor(glcanvas, hcanvas, shadersrelpath, editorName) {
        // Setup GL Canvas
        super(glcanvas, shadersrelpath);
        const that = this;
        // Setup editor
        this.mainEditor = ace.edit(editorName);
        this.mainEditor.setFontSize(16);
        this.mainEditor.session.setMode("ace/mode/javascript");
        // Setup 2D marching squares canvas
        this.hcanvas = hcanvas;
        this.ms = new MarchingSquaresCanvas(hcanvas);
        // Setup simple drawer 
        this.drawer = new Promise(resolve => {
                this.shaders.pointColorShader.then(function() {
                    that.drawer = new SimpleDrawer(that.gl, that.shaders.pointColorShader);
                    that.drawer.ready = true;
                });
            }
        );
        // Setup 2d part of menu
        this.setup2DMenu();
    }

    /**
     * Add options for the heightmap, including resolution and isolevel
     */
    setup2DMenu() {
        const that = this;
        let ms = this.ms;
        let gui = this.gui;
        let hgui = gui.addFolder("Heightmap Options");
        this.hgui = hgui;
        this.res = Math.min(this.hcanvas.clientWidth, this.hcanvas.clientHeight);
        hgui.add(this, "res", 5, this.res);
        hgui.add(this, "updateHeightmap");
        this.isocolor = [128, 128, 128];
        this.isolevel = 0.5;
        hgui.addColor(this, "isocolor").listen();
        this.isochooser = hgui.add(this, "isolevel", 0, 1).listen().onChange(function(val) {
            let c = 255*(val-ms.min)/(ms.max-ms.min);
            that.isocolor = [c, c, c];
            that.updateIsocontours.bind(that)();
        });
        this.updateHeightmap();
    }

    updateIsocontours() {
        const that = this;
        if (!('ready' in this.drawer)) {
            this.drawer.then(that.updateIsocontours.bind(that));
        }
        else {
            this.ms.updateIsocontour(this.isolevel);
            this.ms.draw3DContour(this.res, this.drawer);
            requestAnimationFrame(this.repaint.bind(this));
        }
    }
    
    // Step 3: Define how to update a heightmap for both the image and 3D mesh
    updateHeightmap() {
        let gui = this.hgui;
        const that = this;
        try {
            let ms = this.ms;
            let s = this.mainEditor.getValue();
            s += "return fn(arguments[0], arguments[1]);";
            this.fn = new Function(s);
            ms.computeFunction(this.fn, this.res).then(function() {
                gui.remove(that.isochooser);
                let dx = (ms.max-ms.min)/100;
                that.isochooser = gui.add(that, "isolevel", ms.min, ms.max, dx).onChange(function(val) {
                    let c = 255*(val-ms.min)/(ms.max-ms.min);
                    that.isocolor = [c, c, c];
                    that.updateIsocontours();
                });
                let mesh = ms.getHeightmapMesh(that.res);
                that.mesh.vertices = mesh.vertices;
                that.mesh.edges = mesh.edges;
                that.mesh.faces = mesh.faces;
                that.mesh.needsDisplayUpdate = true;
                that.centerCamera();
                that.updateIsocontours();
                requestAnimationFrame(that.repaint.bind(that));
            });
        }
        catch (err) {
            alert("Javascript syntax error! Check console");
            throw err;
        }
    }


    repaint() {
        this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.lights = [{pos:this.camera.pos, color:[1, 1, 1], atten:[1, 0, 0]}];
        let canvas = this;
        if (!('shaderReady' in this.shaders.blinnPhong)) {
            // Wait until the promise has resolved, then draw again
            this.shaders.blinnPhong.then(canvas.repaint.bind(canvas));
        }
        else if (!('ready' in this.drawer)) {
            this.drawer.then(canvas.repaint.bind(canvas));
        }
        else {
            this.shaderToUse = this.shaders.blinnPhong;
            this.mesh.render(this);
            this.gl.lineWidth(3);
            this.drawer.repaint(this.camera);
        }
    };
}