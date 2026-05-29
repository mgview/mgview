
var objectToArray = function(obj) {
    var arr = [];
    for(var i in obj) {
        arr.push( " "+ i + ": " + obj[i]);
    }
    return arr;
}

var loggerLevel = 1;

var setLoggerLevel = function(level){
    loggerLevel = level;
}

var debugLog = function(text, force){
    if(loggerLevel <= 0 || force)
        console.log(vsprintf("DEBUG: %s", [text]));
}

var infoLog = function(text, force){
    if(loggerLevel <= 1 || force)
        console.log(vsprintf("INFO: %s", [text]));
}

var warnLog = function(text, force){
    if(loggerLevel <= 2 || force)
        console.log(vsprintf("WARN: %s", [text]));
}

var errorLog = function(text, force){
    if(loggerLevel <= 3 || force)
        console.log(vsprintf("ERROR: %s", [text]));
}