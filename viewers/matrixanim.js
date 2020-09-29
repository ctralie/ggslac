/**
 * Code to help animate matrix transformations for
 * teaching purposes
 */

/**
 * First row with matrix labels
 */
function getLabelRow(labels) {
    let row = document.createElement("tr");
    for (let i = 0; i < labels.length; i++) {
        let col = document.createElement("td");
        col.innerHTML = "<h2>" + labels[i] + "</h2>";
        row.appendChild(col);
    }
    return row;
}

/**
 * Make a row of buttons
 * @param {array} labels Labels for each button
 */
function getButtonRow(labels) {
    let row = document.createElement("tr");
    let buttons = {};
    for (let i = 0; i < labels.length; i++) {
        let col = document.createElement("td");
        let button = document.createElement("button");
        button.innerHTML = "Show Transformation";
        col.appendChild(button);
        row.appendChild(col);
        buttons[labels[i]] = button;
    }
    return {"buttons":buttons, "row":row};
}

/**
 * Create a 3x3 grid of different colored squares
 * @param {dom element} parent Element to which to add the squares
 * @param {double} shapeSide Dimension of the square
 */
function makeShape(parent, shapeSide) {
    let face = parent.append("g")
            .attr("viewBox", "0 0 "+shapeSide+" "+shapeSide+"");
    // make a colorful square made up of 9 smaller squares to use as the reference object
    let side = shapeSide/3;
    let colors = d3.scale.category10([3, 3]);
    for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 3; j++) {
            face.append("rect")
                    .attr("class", "square")
                    .attr({width: side, height: side})
                    .attr("transform", "translate(" + (j * side) + "," + (i * side) + ")")
                    .style("opacity", .5)
                    .style("fill", colors([j, i]));
        }
    };
    return face;
}

/**
 * Add coordinate axes
 * @param {dom element} parent Element to which to add the axes
 */
function makePlane(parent) {
    var plane = parent.append("g")
            .attr("viewBox", "-100 -100 200 200")
    plane.append("line").attr({x1: 0, y1: -100, x2: 0, y2: 100});
    plane.append("line").attr({x1: -100, y1: 0, x2: 100, y2: 0});
    return plane;
}

/**
 * Add the plots with the 3x3 grid of colored squares
 * @param {list of string} labels The label for each plot
 * @param {float} width Width of each plot in pixels
 * @param {float} height Height of each plot in pixels
 * @param {float} shapeSide Dimension of each square in pixels
 */
function addSquaresRow(labels, width, height, shapeSide) {
    let row = document.createElement("tr");
    let svgs = [];
    for (let i = 0; i < labels.length; i++) {
        let col = document.createElement("td");
        let svgi = d3.select(col).append("svg")
                    .attr("id", labels[i])
                    .attr("width", width)
                    .attr("height", height)
                    .attr("viewBox", "" + (-width/3) + " " + (-height/3) + " " + width + " " + height);
        row.appendChild(col);
        svgs.push(svgi);
    }
    svgs.forEach(function(item) {
        item.attr("transform", "translate(0, "+height+")");
        item.attr("transform", "scale(1, -1)")
    });
    for (let i = 0; i < svgs.length; i++) {
        let plane = makePlane(svgs[i], shapeSide);
        let shape = makeShape(plane, shapeSide);
        let m = 50;
        shape.attr("id", "shape_" + i )
                .append("circle").attr("r", 2).attr("fill", "red").attr("stroke", "black");
        plane.attr("id", "plane_" + i )
                .attr("transform", "translate("+m+", "+m+")");
    }
    return row;
}

/**
 * Add the plots with the color cubes for each 3D transformation
 * @param {list of string} labels The label for each plot
 * @param {float} width Width of each plot in pixels
 * @param {float} height Height of each plot in pixels
 * @param {string} shaderPath Relative path to shader files
 * @param {string} meshesPath Relative path to mesh files
 */
function add3DInputRow(labels, width, height, shadersPath, meshesPath) {
    if (shadersPath === undefined) {
        shadersPath = "../shaders/";
    }
    if (meshesPath === undefined) {
        meshesPath = "../meshes/";
    }
    let row = document.createElement("tr");
    let scenes = [];
    for (let i = 0; i < labels.length; i++) {
        let col = document.createElement("td");
        let glcanvas = document.createElement("canvas");
        glcanvas.width = width;
        glcanvas.height = height;
        glcanvas.addEventListener("contextmenu", function(e){ e.stopPropagation(); e.preventDefault(); return false; }); //Need this to disable the menu that pops up on right clicking
        let scenespec = {
            "name":labels[i],
            "lights":[],
            "cameras":[
                {
                    "pos": [0.00, 1.0, 6.00],
                    "rot": [0.00, 0.00, 0.00, 1.00],
                    "fovy": 1.0,
                    "fovx": 1.0
                }
            ],
            "materials":{
                "red":{
                    "kd":[1.0, 0.0, 0.0]
                },
                "green":{
                    "kd":[0.0, 1.0, 0.0],
                },
                "blue":{
                    "kd":[0.0, 0.0, 1.0]
                },
                "white":{
                    "kd":[1.0, 1.0, 1.0]
                }
            },
            "children":[
                {
                    "transform":[
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        0, 0, 0, 1
                    ],
                    "shapes":[
                        {
                            "type":"mesh",
                            "src":"COFF\n8 6 0\n0.  0.  1.  0.2 0.2 0.8\n1.  0.  1.  0.8 0.2 0.8\n0.  1.  1.  0.2 0.8 0.8\n1.  1.  1.  0.8 0.8 0.8\n0.  0.  0.  0.2 0.2 0.2\n1.  0.  0.  0.8 0.2 0.2\n0.  1.  0.  0.2 0.8 0.2\n1.  1.  0.  0.8 0.8 0.2\n4 0 1 3 2 \n4 5 4 6 7 \n4 4 0 2 6 \n4 1 5 7 3 \n4 2 3 7 6 \n4 4 5 1 0",
                            "material":"white"
                        }
                    ]
                },
                {
                    "shapes":[
                        {
                            "type":"cylinder",
                            "radius":0.05,
                            "height":3,
                            "center":[0, 1.5, 0],
                            "material":"green"
                        },
                        {
                            "type":"cone",
                            "radius":0.1,
                            "height":0.3,
                            "center":[0, 3, 0],
                            "material":"green"
                        }
                    ]
                },
                {   
                    "transform":[0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
                    "shapes":[
                        {
                            "type":"cylinder",
                            "radius":0.05,
                            "height":3,
                            "center":[0, 1.5, 0],
                            "material":"red"
                        },
                        {
                            "type":"cone",
                            "radius":0.1,
                            "height":0.3,
                            "center":[0, 3, 0],
                            "material":"red"
                        }
                    ]
                },
                {   
                    "transform":[1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1],
                    "shapes":[
                        {
                            "type":"cylinder",
                            "radius":0.05,
                            "height":3,
                            "center":[0, 1.5, 0],
                            "material":"blue"
                        },
                        {
                            "type":"cone",
                            "radius":0.1,
                            "height":0.3,
                            "center":[0, 3, 0],
                            "material":"blue"
                        }
                    ]
                }
            ]
        };
        // Add lights on all sides
        for (let dim = 0; dim < 3; dim++) {
            for (let k = 0; k < 2; k++) {
                let pos = [0, 0, 0];
                pos[dim] = Math.pow(-1, k)*10;
                scenespec.lights.push({"pos":pos, "color":[1, 1, 1], "atten":[1, 0.05, 0]});
            }
        }
        // Add edges to box
        let sz = 0.05;
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                for (let idx = 0; idx < 3; idx++) {
                    let dims = [sz, sz, sz];
                    dims[idx] = 1;
                    let center = [0, 0, 0];
                    center[idx] = 0.5;
                    center[(idx+1)%3] = i;
                    center[(idx+2)%3] = j;
                    let edge = {
                        "type":"box",
                        "center":center,
                        "width":dims[0],"height":dims[1],"length":dims[2],
                        "material":"white"
                    };
                    scenespec.children[0].shapes.push(edge);
                }
                
            }
        }
        let scene = new SceneCanvas(glcanvas, shadersPath, meshesPath, true, true, false, "gouraud");
        scene.showLights = false;
        scene.showCameras = false;
        scene.setupScene(scenespec, width, height);
        requestAnimFrame(scene.repaint.bind(scene));
        
        col.appendChild(glcanvas);
        row.appendChild(col);
        scenes.push(scene);
        scene.gui.close();
    }
    for (let i = 1; i < scenes.length; i++) {
        scenes[i].camera = scenes[0].camera;
    }
    return {"row":row, "scenes":scenes};
}

/**
 * Create a row-major unrolled array of text inputs in a table
 * to represent matrix elements
 * @param {dom element} domElem DOM element to which to add the table
 * @param {boolean} homogenous Whether to use homogenous coordinates
 * @param {string} name Display name for the matrix
 * @param {boolean} is3D Whether this is a 3D matrix input
 */
function createMatrixInput(domElem, homogenous, name, is3D) {
    if (is3D === undefined) {
        is3D = false;
    }
    let table = document.createElement("table");
    table.border = 1;
    let elems = [];
    let ncols = 2;
    if (homogenous) {
        ncols = 3;
    }
    let nrows = ncols;
    if (is3D) {
        nrows++;
        ncols++;
    }
    if (homogenous) {
        nrows--;
    }
    for (let i = 0; i < nrows; i++) {
        let row = document.createElement("tr");
        for (let j = 0; j < ncols; j++) {
            let col = document.createElement("td");
            let input = document.createElement("input");
            input.size = 1;
            input.type = "text";
            if (i == j) {
                input.value = "1";
            }
            else {
                input.value = "0";
            }
            elems.push(input);
            col.appendChild(input);
            row.appendChild(col);
        }
        table.appendChild(row);
    }
    if (homogenous) {
        let row = document.createElement("tr");
        let vals = ["&nbsp0", "&nbsp0"];
        if (is3D) {
            vals.push("&nbsp0");
        }
        vals.push("&nbsp1");
        for (let j = 0; j < ncols; j++) {
            let col = document.createElement("td");
            col.innerHTML = vals[j];
            row.appendChild(col);
        }
        table.appendChild(row);
    }

    let metaTable = document.createElement("table");
    let metaRow = document.createElement("tr");
    let metaCol1 = document.createElement("td");
    metaCol1.innerHTML = "<h2>" + name.slice(0,-1) + " = " + "</h2>";
    metaRow.appendChild(metaCol1);
    let metaCol2 = document.createElement("td");
    metaCol2.appendChild(table);
    metaRow.appendChild(metaCol2);
    metaTable.appendChild(metaRow);
    domElem.appendChild(metaTable);
    return elems;
}

/**
 * Convert a grid of text inputs into a glMatrix.mat3 object
 * @param {list of dom elements} elems Text inputs
 * @param {boolean} homogenous Whether it's a homogenous matrix
 * @param {boolean} is3D Whether it's a 3D transformation
 */
function textToMatrix(elems, homogenous, is3D) {
    let matx = glMatrix.mat3;
    if (is3D) {
        matx = glMatrix.mat4;
    }
    let m = matx.create();
    let ms = [];
    for (let i = 0; i < elems.length; i++) {
        ms.push(parseFloat(elems[i].value));
    }
    if (homogenous) {
        for (let i = 0; i < ms.length; i++) {
            m[i] = ms[i];
        }
    }
    else {
        if (is3D) {
            let msnext = [];
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    msnext.push(ms[i*3+j]);
                }
                msnext.push(0);
            }
            ms = msnext;
            
        }
        else {
            ms = [ms[0], ms[1], 0, ms[2], ms[3], 0];
        }
        for (let i = 0; i < ms.length; i++) {
            m[i] = ms[i];
        }
    }

    // Elements are row-major, glMatrix is column major
    // so need to transpose
    matx.transpose(m, m);
    return m;
}

/**
 * Copy glMatrix.mat3 values over to text input elements
 * @param {glMatrix.mat3 or glMatrix.mat4} m matrix
 * @param {list of dom elements} elems Text inputs
 * @param {boolean} homogenous Whether it's a homogenous matrix
 * @param {boolean} is3D Whether it's a 3D transformation
 */
function matrixToText(m, elems, homogenous, is3D) {
    let mT = glMatrix.mat3.create();
    if (is3D) {
        mT = glMatrix.mat4.create();
        glMatrix.mat4.transpose(mT, m);
    }
    else {
        mT = glMatrix.mat3.create();
        glMatrix.mat3.transpose(mT, m);
    }
    if (homogenous) {
        for (let i = 0; i < elems.length; i++) {
            elems[i].value = "" + mT[i];
        }
    }
    else {
        if (is3D) {
            // 3D transformation 3x3 only
            for (let i = 0; i < 3; i++) {
                for (let k = 0; k < 3; k++) {
                    elems[i*3+k].value = "" + mT[i*4+k];
                }
            }
        }
        else {
            // 2D transformation 2x2 only
            elems[0].value = "" + mT[0];
            elems[1].value = "" + mT[1];
            elems[2].value = "" + mT[3];
            elems[3].value = "" + mT[4];
        }
    }
}

/**
 * Convert a 3x3 homogenous matrix into svg format, noting
 * that they are column major in both glMatrix.mat3 and svg
 * @param {glMatrix.mat3} m The matrix
 * @param {float} sideLen The length of a side of a square.
 *                        Scale the translation by this amount
 */
function mat3ToSVG(m, sideLen) {
    let ret = [m[0], m[1], m[3], m[4], sideLen*m[6], sideLen*m[7]];
    return ret;
}

const EYE2x3 = [1, 0, 0, 1, 0, 0];
/**
 * Do a 2D interpolation from the beginning to the end
 * @param {int} label Index of square to transform
 * @param {list of glMatrix.mat3} As Sequence of matrices to show
 * @param {float} delay Number of milliseconds for each leg of the animation
 * @param {float} sideLen Length of the side of the color square
 */
function transformSquareGrid(label, As, delay, sideLen) {
    let shape = d3.select("#shape_"+label);
    shape.attr("transform", "matrix(" + EYE2x3 + ")");
    As.forEach(function(A, index) {
        shape.transition().delay(delay*(index+1))
        .attr("transform", "matrix("+mat3ToSVG(A, sideLen)+")");
    });
}

/**
 * Do a 3D interpolation from the beginning to the end
 * @param {scenecanvas} scene Scene holding the color cube as the first child at the top level
 * @param {list of glMatrix.mat4} As Sequence of matrices to show
 * @param {float} delay Number of milliseconds for each leg of the animation
 * @param {float} fps Number of frames per second
 */
function transform3DScene(scene, As, delay, fps) {
    if (fps === undefined) {
        fps = 30;
    }
    let dt = 1000/fps;
    let N = delay/dt;
    let M1 = glMatrix.mat4.create();
    let M2 = glMatrix.mat4.create();
    glMatrix.mat4.copy(M2, As[0]);
    let t = 0.0;
    let idx = 0;
    let advance = function() {
        let M = glMatrix.mat4.create();
        for (let i = 0; i < 16; i++) {
            let val = (1-t)*M1[i] + t*M2[i];
            M[i] = val;
        }
        scene.scene.children[0].transform = M;
        requestAnimFrame(scene.repaint.bind(scene));
        if (t < 1) {
            t = Math.min(t+1/N, 1);
            setTimeout(advance, dt);
        }
        else {
            idx++;
            if (idx < As.length) {
                t = 0;
                glMatrix.mat4.copy(M1, As[idx-1]);
                glMatrix.mat4.copy(M2, As[idx]);
                setTimeout(advance, dt*5);
            }
        }
    }
    advance();
}

/**
 * Add the matrix widgets to a particular div element
 * for Ax, Bx, A(Bx), and (AB)x
 * @param {dom element} parent Parent element to which to add this widget
 * @param {int} NMats Number of compositions
 * @param {boolean} homogenous Whether to use homogenous coordinates
 * @param {boolean} is3D Whether this is a 3D system or a 2D system
 * @param {float} width Width of each transformation plot in pixels
 * @param {float} height Height of each transformation plot in pixels
 * @param {float} shapeSide Dimension of each square in pixels in the transformation plots
 * @param {array of glMatrix.mat3 or glMatrix.mat4} initStates Initial conditions for the matrices
 * @param {string} shaderPath Relative path to shader files for 3D
 * @param {string} meshesPath Relative path to mesh files for 3D
 */
function addNCompositionMatrixWidgets(parent, NMats, homogenous, is3D, width, height, sideLen, initStates, shadersPath, meshesPath) {
    if (is3D === undefined) {
        is3D = false;
    }
    if (is3D && shadersPath === undefined) {
        shadersPath = "../shaders/";
    }
    if (is3D && meshesPath === undefined) {
        meshesPath = "../meshes/";
    }
    if (initStates === undefined) {
        initStates = [];
    }
    while (initStates.length < NMats) {
        if (is3D) {
            initStates.push(glMatrix.mat4.create());
        }
        else {
            initStates.push(glMatrix.mat3.create());
        }
    }
    let labels = [];
    let prestr = ")x";
    let allstr = "x";
    for (let i = 0; i < NMats; i++) {
        let letter = (i+10).toString(36).toUpperCase();
        labels.push(letter + "x");
        allstr = letter + allstr;
        if (i < NMats-1) {
            allstr = "(" + allstr + ")";
        }
        prestr = letter + prestr;
    }
    prestr = "(" + prestr;
    if (NMats > 1) {
        labels.push(allstr);
        labels.push(prestr);
    }

    let table = document.createElement("table");
    parent.appendChild(table);
    // First row with labels
    table.appendChild(getLabelRow(labels));
    // Second row with buttons
    let row = getButtonRow(labels);
    let scenes = [];
    table.appendChild(row.row);
    let buttons = row.buttons;
    // Third row with the object that will be transformed
    if (is3D) {
        let res = add3DInputRow(labels, width, height, shadersPath, meshesPath);
        row = res.row;
        scenes = res.scenes;
    }
    else {
        row = addSquaresRow(labels, width, height, sideLen, shadersPath, meshesPath);
    }
    table.appendChild(row);
    // Add matrix inputs
    let matx = glMatrix.mat3;
    if (is3D) {
        matx = glMatrix.mat4;
    }
    let matrixRow = document.createElement("tr");
    let MInputs = [];
    function callbackFactory(k) {
        return function() {
            let M = textToMatrix(MInputs[k], homogenous, is3D);
            if (is3D) {
                transform3DScene(scenes[k], [M], 1000);
            }
            else {
                transformSquareGrid(k, [M], 1000, sideLen);
            }
        }
    }
    for (let i = 0; i < NMats; i++) {
        let col = document.createElement("td");
        let MiInputs = createMatrixInput(col, homogenous, labels[i], is3D);
        MInputs.push(MiInputs);
        matrixToText(initStates[i], MiInputs, homogenous, is3D);
        matrixRow.appendChild(col);
        buttons[labels[i]].onclick = callbackFactory(i);
    }
    if (NMats > 1) {
        buttons[allstr].onclick = function() {
            let Ms = [];
            let MAll = matx.create();
            for (let i = 0; i < NMats; i++) {
                let M = textToMatrix(MInputs[i], homogenous, is3D);
                let MNext = matx.create();
                matx.multiply(MNext, M, MAll);
                Ms.push(MNext);
                MAll = MNext;
            }
            if (is3D) {
                transform3DScene(scenes[NMats], Ms, 1000);
            }
            else {
                transformSquareGrid(NMats, Ms, 1000, sideLen);
            }
        }
        buttons[prestr].onclick = function() {
            let MAll = matx.create();
            for (let i = 0; i < NMats; i++) {
                let M = textToMatrix(MInputs[i], homogenous, is3D);
                matx.multiply(MAll, M, MAll);
            }
            if (is3D) {
                transform3DScene(scenes[NMats+1], [MAll], 1000);
            }
            else {
                transformSquareGrid(NMats+1, [MAll], 1000, sideLen);
            }
        }
    }
    table.appendChild(matrixRow);
    return {"table":table, "MInputs":MInputs};
}

/**
 * Add the matrix widgets to a particular div element
 * for Ax, Bx, B(Ax), A(Bx)
 * @param {dom element} parent Parent element to which to add this widget
 * @param {boolean} homogenous Whether to use homogenous coordinates
 * @param {boolean} is3D Whether this is a 3D system or a 2D system
 * @param {float} width Width of each transformation plot in pixels
 * @param {float} height Height of each transformation plot in pixels
 * @param {float} shapeSide Dimension of each square in pixels in the transformation plots
 * @param {glMatrix.mat3 or glMatrix.mat4} AInit Initial A matrix
 * @param {glMatrix.mat3 or glMatrix.mat4} BInit Initial B matrix
 * @param {string} shaderPath Relative path to shader files for 3D
 * @param {string} meshesPath Relative path to mesh files for 3D
 */
function addCommutativeMatrixGrid(parent, homogenous, is3D, width, height, sideLen, AInit, BInit, shadersPath, meshesPath) {
    let matx = glMatrix.mat3;
    if (is3D) {
        matx = glMatrix.mat4;
    }
    if (is3D === undefined) {
        is3D = false;
    }
    if (AInit === undefined) {
        AInit = matx.create();
    }
    if (BInit === undefined) {
        BInit = matx.create();
    }
    if (is3D && shadersPath === undefined) {
        shadersPath = "../shaders/";
    }
    if (is3D && meshesPath === undefined) {
        meshesPath = "../meshes/";
    }
    let labels = ["Ax", "Bx", "B(Ax)", "A(Bx)"];
    let table = document.createElement("table");
    parent.appendChild(table);
    // First row with labels
    table.appendChild(getLabelRow(labels));
    // Second row with buttons
    let row = getButtonRow(labels);
    let scenes = [];
    table.appendChild(row.row);
    let buttons = row.buttons;
    // Third row with the object that will be transformed
    if (is3D) {
        let res = add3DInputRow(labels, width, height, shadersPath, meshesPath);
        row = res.row;
        scenes = res.scenes;
    }
    else {
        row = addSquaresRow(labels, width, height, sideLen);
    }
    table.appendChild(row);
    // Add two matrix inputs
    let matrixRow = document.createElement("tr");
    let col = document.createElement("td");
    let AInputs = createMatrixInput(col, homogenous, "A", is3D);
    matrixToText(AInit, AInputs, homogenous, is3D);
    matrixRow.appendChild(col);
    col = document.createElement("td");
    let BInputs = createMatrixInput(col, homogenous, "B", is3D);
    matrixToText(BInit, BInputs, homogenous, is3D);
    matrixRow.appendChild(col);
    table.appendChild(matrixRow);
    buttons["Ax"].onclick = function() {
        let A = textToMatrix(AInputs, homogenous, is3D);
        if (is3D) {
            transform3DScene(scenes[0], [A], 1000);
        }
        else {
            transformSquareGrid(0, [A], 1000, sideLen);
        }
    }
    buttons["Bx"].onclick = function() {
        let B = textToMatrix(BInputs, homogenous, is3D);
        if (is3D) {
            transform3DScene(scenes[1], [B], 1000);
        }
        else {
            transformSquareGrid(1, [B], 1000, sideLen);
        }
    }
    buttons["B(Ax)"].onclick = function() {
        let A = textToMatrix(AInputs, homogenous, is3D);
        let B = textToMatrix(BInputs, homogenous, is3D);
        let BA = matx.create();
        matx.multiply(BA, B, A);
        if (is3D) {
            transform3DScene(scenes[2], [A, BA], 1000);
        }
        else {
            transformSquareGrid(2, [A, BA], 1000, sideLen);
        }
    }
    buttons["A(Bx)"].onclick = function() {
        let A = textToMatrix(AInputs, homogenous, is3D);
        let B = textToMatrix(BInputs, homogenous, is3D);
        let AB = matx.create();
        matx.multiply(AB, A, B);
        
        if (is3D) {
            transform3DScene(scenes[3], [B, AB], 1000);
        }
        else {
            transformSquareGrid(3, [B, AB], 1000, sideLen);
        }
    }
    return {"table":table, "AInputs":AInputs, "BInputs":BInputs};
}