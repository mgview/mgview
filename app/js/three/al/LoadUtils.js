/** @namespace */
var THREEal	= THREEal 		|| {};

THREEal.setVisible = function(object, visible)
{
    object.traverse(function(child){
        child.visible = visible;
    });
}

THREEal.getBasePath = function(str){
    // Replace any windows-style slashes with unix ones:
    var slashes_fixed = str.replace(/\\/g, "/");

    // split on slashes, remove the last token (which should be the file name),
    // then re-join with slashes and add trailing slash.
    return slashes_fixed.split("/").slice(0,-1).join("/") + "/";
}

THREEal.getFileExtension = function(str){
    // Replace any windows-style slashes with unix ones:
    //slashes_fixed = str.replace(/\\/g, "/");

    // split on dots and get the last token (which should be the file extension)
    return str.split(".").slice(-1)[0].toLowerCase();
}


THREEal.loadAndAddCollada = function( frame, path, scale, xyz, quaternion, material, callback ){
    //return;
    var loader = new THREE.ColladaLoader();
    loader.options.convertUpAxis = false;
    loader.load( path, function colladaReady( collada )
    {
        var dae = collada.scene.clone();
        dae.scale.set(scale,scale,scale);
        if(xyz instanceof THREE.Vector3) dae.position.copy(xyz);
        if(quaternion instanceof THREE.Quaternion) dae.setRotationFromQuaternion(quaternion);

        if(material instanceof THREE.Material){
            for ( var i = 0; i < dae.children.length; i ++ ) {
                dae.children[ i ].material = material;
            }
        }
        //console.log("Adding collada!");
        dae.updateMatrix();// Not sure if this is needed.
        frame.add(dae);

        if(callback)
            callback(dae);
    } );
}

THREEal.loadAndAddOBJ = function( frame, path, scale, xyz, quaternion, material, callback ){
    //return;
    // TODO textures?
    // var texture = THREE.ImageUtils.loadTexture( 'textures/ash_uvgrid01.jpg' );
    var loader = new THREE.OBJLoader();
    loader.load( path, function ( object ) {

        if(material instanceof THREE.Material){
            for ( var i = 0; i < object.children.length; i ++ ) {
                object.children[ i ].material = material;
            }
        }

        if(xyz instanceof THREE.Vector3) object.position.copy(xyz);
        if(quaternion instanceof THREE.Quaternion) object.setRotationFromQuaternion(quaternion);
        object.updateMatrix();// Not sure if this is needed.
        frame.add(object);
        if(callback) callback(object);

    } );
}

THREEal.loadAndAddSTL = function( frame, path, scale, xyz, quaternion, material, callback ){

    var loader = new THREE.STLLoader();
    loader.addEventListener( 'load', function ( event ) {

        var geometry = event.content;
        if(material === undefined)
            material = new THREE.MeshPhongMaterial( { ambient: 0xff5533, color: 0xff5533, specular: 0x111111, shininess: 200 } );
        var mesh = new THREE.Mesh( geometry, material );

        if(xyz instanceof THREE.Vector3) mesh.position.copy(xyz);
        if(quaternion instanceof THREE.Quaternion) mesh.setRotationFromQuaternion(quaternion);

        if(scale === undefined)
            scale = 1.0;
        mesh.scale.set( scale, scale, scale );

        mesh.castShadow = true;
        mesh.receiveShadow = true;

        frame.add( mesh );

        if(callback) callback(mesh);

    } );
    loader.load( path );
}

THREEal.loadAndAddFromFile = function( frame, path, scale, xyz, quaternion, material, callback ){
    var extension = THREEal.getFileExtension(path);
    var loaderFn = undefined;
    if(extension === "stl" ) loaderFn = THREEal.loadAndAddSTL;
    if(extension === "obj" ) loaderFn = THREEal.loadAndAddOBJ;
    if(extension === "dae" ) loaderFn = THREEal.loadAndAddCollada;

    if(loaderFn)
        loaderFn( frame, path, scale, xyz, quaternion, material, callback);
}


THREEal.addTextHelper = function (parent, text, size, material, callback) {

    console.log("Adding text for frame "+ text);
    var height = 0.1*size;
    curveSegments = 2;

    bevelEnabled = true;
    bevelThickness = 0.02*size;
    bevelSize = 0.05*size;

    font = "optimer"; // helvetiker, optimer, gentilis, droid sans, droid serif
    weight = "normal"; // normal bold
    style = "normal"; // normal italic

    var textGeo = new THREE.TextGeometry( text, {

        size: size,
        height: height,
        curveSegments: curveSegments,

        font: font,
        weight: weight,
        style: style,


        bevelEnabled: bevelEnabled,
        bevelThickness: bevelThickness,
        bevelSize: bevelSize,


//        material: 0,
//        extrudeMaterial: 1

    });

    textGeo.computeBoundingBox();
    textGeo.computeVertexNormals();

    var centerOffset = -0.5 * ( textGeo.boundingBox.max.x - textGeo.boundingBox.min.x );

    var textMesh1 = new THREE.Mesh( textGeo, material );

    textMesh1.position.x = centerOffset;
    textMesh1.position.y = 0;
    textMesh1.position.z = 0;

    textMesh1.rotation.x = 0;
    //textMesh1.rotation.y = Math.PI;

    parent.add( textMesh1 );
    if(callback) callback(textMesh1);
}



var createBasis = function( ){


    var frame = new THREE.Object3D();

    var rod = new THREE.CylinderGeometry( 0.1, 0.1, 1, 12, 2);
    var cone  = new THREE.CylinderGeometry(   0, 0.1, 1, 12, 2);

    var colors = [0xff0000, 0x00ff00, 0x0000ff];

    for( var i=0; i < 3; i++){
        var shaft = new THREE.Mesh( rod, new THREE.MeshLambertMaterial( { color: colors[i] } ) );
        shaft.material.ambient = object.material.color;
        shaft.scale.set(scale);
        shaft.castShadow = true;
        shaft.receiveShadow = true;

        var tip = new THREE.Mesh( cone, new THREE.MeshLambertMaterial( { color: colors[i] } ) );
        tip.material.ambient = object.material.color;
        tip.scale.set(scale);
        tip.castShadow = true;
        tip.receiveShadow = true;

        frame.add(shaft);
        frame.add(tip);
    }

}

/**
 * @author aleeper  / http://adamleeper.com/
 * @author sroucheray / http://sroucheray.org/
 * @author mr.doob / http://mrdoob.com/
 */

THREEal.SolidBasisHelper = function () {

    THREE.Object3D.call( this );

    var rodGeometry   = new THREE.CylinderGeometry( 0.1, 0.1, 1, 12, 2);
    var coneGeometry  = new THREE.CylinderGeometry(   0, 0.15, 0.2, 12, 2);

    var line, cone;

    // x

    line = new THREE.Mesh( rodGeometry, new THREE.MeshLambertMaterial( { color: 0xff0000 } ) );
    line.position.x = 0.5;
    line.rotation.z = - Math.PI / 2;
    line.castShadow = line.receiveShadow = true;
    this.add( line );

    cone = new THREE.Mesh( coneGeometry, new THREE.MeshLambertMaterial( { color : 0xff0000 } ) );
    cone.position.x = 1;
    cone.rotation.z = - Math.PI / 2;
    cone.castShadow = cone.receiveShadow = true;
    this.add( cone );

    // y

    line = new THREE.Mesh( rodGeometry, new THREE.MeshLambertMaterial( { color: 0x00ff00 } ) );
    line.position.y = 0.5;
    line.castShadow = line.receiveShadow = true;
    this.add( line );

    cone = new THREE.Mesh( coneGeometry, new THREE.MeshLambertMaterial( { color : 0x00ff00 } ) );
    cone.position.y = 1;
    cone.castShadow = cone.receiveShadow = true;
    this.add( cone );

    // z

    line = new THREE.Mesh( rodGeometry, new THREE.MeshLambertMaterial( { color: 0x0000ff } ) );
    line.position.z = 0.5;
    line.rotation.x = Math.PI / 2;
    line.castShadow = line.receiveShadow = true;
    this.add( line );

    cone = new THREE.Mesh( coneGeometry, new THREE.MeshLambertMaterial( { color : 0x0000ff } ) );
    cone.position.z = 1;
    cone.rotation.x = Math.PI / 2;
    cone.castShadow = cone.receiveShadow = true;
    this.add( cone );

};

THREEal.SolidBasisHelper.prototype = new THREE.Object3D();
THREEal.SolidBasisHelper.prototype.constructor = THREE.SolidBasisHelper;