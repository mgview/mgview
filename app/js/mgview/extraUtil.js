/**
 * @license MIT, http://opensource.org/licenses/MIT
 * @author Adam Leeper, https://github.com/aleeper
 */

var removeWhitespace, splitString, stringToVector3, arrayToVector3, addAxes;

(function($) {


// Convenience function to remove all whitespace
removeWhitespace = function(str){
    return str.replace(/^\s*|\s*$/g,'');
}

// This function takes a string, splits it using the specified delimiter,
// and stores the results in an object with members given by names.
splitString = function(str, names, delimiter){
    if(typeof(delimiter)==='undefined') delimiter = /\s+/g;
    var split = str.split(delimiter);
    var items = [];
    var i;
    for(i=0; i < split.length; i++)
        if(split[i] !== "") items.push(split[i]);
    if(typeof(names)==='undefined' || items.length != names.length) {
        console.log('Must provide a list of names for elements of the string.');
        return {};
    }
    var obj = {};
    for(i = 0; i < items.length; i++)
        obj[names[i]] = items[i];
    return obj;
}

// Convenience function to convert a string of 3 space-separated numbers
// to a THREE.Vector3 object
stringToVector3 = function(str){
    //var patternVec = /([-+]?[0-9]+\.?[0-9]*([eE][-+]?[0-9]+)?)+[\s]+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)+[\s]+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)+/g;
    //while ( ( result = patternVec.exec( str ) ) != null ) {
    //    console.log(result);
    //}
    var v = splitString(str, ['x', 'y', 'z']);
    return new THREE.Vector3(+(v.x), +(v.y), +(v.z));
}

arrayToVector3 = function(arr) {
    return new THREE.Vector3(arr[0], arr[1], arr[2]);
}

addAxes = function(object, axis_length, axis_width){
    var axes = [];
    var axis_geometry = new THREE.CylinderGeometry( 1, 1, axis_length, 8, 8 );
    var matXAxis = new THREE.MeshBasicMaterial( { color :0xFF0000 } );
    var matYAxis = new THREE.MeshBasicMaterial( { color :0x00FF00 } );
    var matZAxis = new THREE.MeshBasicMaterial( { color :0x0000FF } );
    axes[0] = new THREE.Mesh( axis_geometry, matXAxis );
    axes[0].scale.set(axis_width, 1.0, axis_width);
    axes[0].position.x = axis_length/2;
    axes[0].rotation.z = -Math.PI/2;
    object.add(axes[0]);
    axes[1] = new THREE.Mesh( axis_geometry, matYAxis );
    axes[1].scale.set(axis_width, 1.0, axis_width);
    axes[1].position.y = axis_length/2;
    object.add(axes[1]);
    axes[2] = new THREE.Mesh( axis_geometry, matZAxis );
    axes[2].scale.set(axis_width, 1.0, axis_width);
    axes[2].position.z = axis_length/2;
    axes[2].rotation.x = -Math.PI/2;
    object.add(axes[2]);
}

//var addGround = function(object, size, up, distance){
//    var planeTesselated = new THREE.PlaneGeometry( size, size, 10, 10 );
//    var matWire = new THREE.MeshBasicMaterial( { color :0x110000, wireframe: true, wireframeLinewidth: 2 } );
//    var matSolid = new THREE.MeshBasicMaterial( { color :0x330000 } );
//    matSolid.color.setHSV( 0.1, 0.75, 1 );
//
//    var floor_position = up.multiplyScalar(distance);
//
//    this.floor = new THREE.Mesh( planeTesselated, matSolid );
//    this.floor.position = floor_position;
//    //this.floor.scale.set( 1, 1, 1 );
//    this.floor.rotation.y = -Math.PI/2;
//    //this.floor.rotation.x = -Math.PI/2;
//    object.add( this.floor );
//
//    this.floor = new THREE.Mesh( planeTesselated, matWire );
//    this.floor.position = floor_position;
//    this.floor.rotation.y = -Math.PI/2;
//    //this.floor.scale.set( 1, 1, 1 );
//    //this.floor.rotation.x = -Math.PI/2;
//    object.add( this.floor );
//}

})();