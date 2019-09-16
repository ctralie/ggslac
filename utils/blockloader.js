var BlockLoader = BlockLoader || {};

/**
 * Load in the string for a JSON file and parse
 * it into an object.  This function is blocking
 * @param {string} filename Path to file
 * @param {string} errTxt Error text
 * 
 * @return {object} Parsed object
 */
BlockLoader.loadJSON = function(filename, errTxt) {
    try {
        let request = new XMLHttpRequest();
        request.open("GET", filename, false);
        request.overrideMimeType("application/json");
        request.send(null);
        return JSON.parse(request.responseText);
    }
    catch(err) {
        if (errTxt === undefined) {
            errTxt = "";
        }
        alert("Error loading JSON file " + filename + ". " + errTxt);
        throw err;
    }
};

/**
 * Load in string from a text file.
 * This function is blocking.
 * @param {string} filename Path to file
 * @param {string} errTxt Error text
 * 
 * @return {string} String from text file
 */
BlockLoader.loadTxt = function(filename, errTxt) {
    try {
        var request = new XMLHttpRequest();
        request.open("GET", filename, false);
        request.overrideMimeType("text/plain");
        request.send(null);
        return request.responseText;
    }
    catch(err) {
        if (errTxt === undefined) {
            errTxt = "";
        }
        alert("Error loading text file " + filename + ". " + errTxt);
        throw err;
    }
};
