/**
 * @license MIT, http://opensource.org/licenses/MIT
 * @author Adam Leeper, https://github.com/aleeper
 */

// TODO these should not be global. Refactor this.

function dec2hex16(i)
{
    i = Math.floor(i);
    var result = "00";
    if      (i >= 0    && i <= 15)    { result = "0" + i.toString(16); }
    else if (i >= 16   && i <= 255)   { result =       i.toString(16); }
    return result
}

function dec2hexColor(r,g,b){
    var hexString = "0x" + dec2hex16(255*r) + dec2hex16(255*g) + dec2hex16(255*b);
    return parseInt(hexString);
}


var SV_MATERIALS = {};
SV_MATERIALS['BLACK']   = new THREE.MeshPhongMaterial( { ambient :0x000000, color: 0x222222, specular: 0x111111 } );
SV_MATERIALS['WHITE']   = new THREE.MeshPhongMaterial( { ambient :0xFFFFFF, color: 0xFFFFFF, specular: 0xFFFFFF } );
SV_MATERIALS['SILVER']  = new THREE.MeshPhongMaterial( { ambient :0xC0C0C0, color: 0xC0C0C0, specular: 0xC0C0C0 } );
SV_MATERIALS['GRAY']    = new THREE.MeshPhongMaterial( { ambient :0x808080, color: 0x808080, specular: 0x808080 } );
SV_MATERIALS['RED']     = new THREE.MeshPhongMaterial( { ambient :0xFF0000, color: 0xFF0000, specular: 0xFF0000 } );
SV_MATERIALS['GREEN']   = new THREE.MeshPhongMaterial( { ambient :0x00FF00, color: 0x00FF00, specular: 0x00FF00 } );
SV_MATERIALS['BLUE']    = new THREE.MeshPhongMaterial( { ambient :0x0000FF, color: 0x0000FF, specular: 0x0000FF } );

SV_MATERIALS['SHINY_BLACK']   = new THREE.MeshPhongMaterial( { ambient :0x000000, color: 0x222222, specular: 0xFFFFFF } );
SV_MATERIALS['SHINY_WHITE']   = new THREE.MeshPhongMaterial( { ambient :0xFFFFFF, color: 0xFFFFFF, specular: 0xFFFFFF } );
SV_MATERIALS['SHINY_SILVER']  = new THREE.MeshPhongMaterial( { ambient :0xC0C0C0, color: 0xC0C0C0, specular: 0xFFFFFF } );
SV_MATERIALS['SHINY_GRAY']    = new THREE.MeshPhongMaterial( { ambient :0x808080, color: 0x808080, specular: 0xFFFFFF } );
SV_MATERIALS['SHINY_RED']     = new THREE.MeshPhongMaterial( { ambient :0xFF0000, color: 0xFF0000, specular: 0xFFFFFF } );
SV_MATERIALS['SHINY_GREEN']   = new THREE.MeshPhongMaterial( { ambient :0x00FF00, color: 0x00FF00, specular: 0xFFFFFF } );
SV_MATERIALS['SHINY_BLUE']    = new THREE.MeshPhongMaterial( { ambient :0x0000FF, color: 0x0000FF, specular: 0xFFFFFF } );

(function () {

    // TODO This is horrible. But, I wanted to play with textures.
    // TODO refactor this, make it so people can select pre-defined textures from the GUI, etc.

    var checkerBoardTexture = THREE.ImageUtils.loadTexture( "app/textures/checkerboard.jpg" );
    checkerBoardTexture.wrapS = checkerBoardTexture.wrapT = THREE.RepeatWrapping;
    checkerBoardTexture.anisotropy = 4;

    var metalTexture = THREE.ImageUtils.loadTexture( "app/textures/metal.jpg" );
    metalTexture.wrapS = metalTexture.wrapT = THREE.RepeatWrapping;
    metalTexture.repeat.set(2,2);
    metalTexture.anisotropy = 4;

    var moonTexture = THREE.ImageUtils.loadTexture( "app/textures/planets/moon_1024.jpg" );
    moonTexture.wrapS = moonTexture.wrapT = THREE.RepeatWrapping;
    moonTexture.anisotropy = 4;

    var earthTexture = THREE.ImageUtils.loadTexture( "app/textures/planets/earth_atmos_2048.jpg" );
    earthTexture.wrapS = earthTexture.wrapT = THREE.RepeatWrapping;
    earthTexture.anisotropy = 4;

    var grassTexture = THREE.ImageUtils.loadTexture( "app/textures/terrain/grasslight-big.jpg" );
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(1,1);
    grassTexture.anisotropy = 4;

    var dirtTexture = THREE.ImageUtils.loadTexture( "app/textures/terrain/backgrounddetailed6.jpg" );
    dirtTexture.wrapS = dirtTexture.wrapT = THREE.RepeatWrapping;
    dirtTexture.repeat.set(1,1);
    dirtTexture.anisotropy = 4;

    var waterTexture = THREE.ImageUtils.loadTexture( "app/textures/water.jpg" );
    waterTexture.wrapS = waterTexture.wrapT = THREE.RepeatWrapping;
    waterTexture.repeat.set(1,1);
    waterTexture.anisotropy = 4;

    var lavaTexture = THREE.ImageUtils.loadTexture( "app/textures/lavatile.jpg" );
    lavaTexture.repeat.set( 4, 2 );
    lavaTexture.wrapS = lavaTexture.wrapT = THREE.RepeatWrapping;
    lavaTexture.anisotropy = 4;

    var shininess = 50, specular = 0x333333, shading = THREE.SmoothShading;

    SV_MATERIALS["CHECKERBOARD"] = new THREE.MeshPhongMaterial(
        {   map: checkerBoardTexture,
            bumpMap: null,
            bumpScale: 0,
            color: 0xffffff,
            ambient: 0x555555,
            specular: 0x222222,
            shininess: 10,
            shading: shading } );


    SV_MATERIALS["METAL"] = new THREE.MeshPhongMaterial(
        {   map: metalTexture,
            bumpMap: metalTexture,
            bumpScale: 0.1,
            color: 0xffffff,
            ambient: 0x555555,
            specular: 0x222222,
            shininess: 70,
            shading: shading } );

    SV_MATERIALS["DIRT"] = new THREE.MeshPhongMaterial(
        {   map: dirtTexture,
            bumpMap: dirtTexture,
            bumpScale: 0.05,
            color: 0xffffff,
            ambient: 0x555555,
            specular: 0x222222,
            shininess: 10,
            shading: shading } );

    SV_MATERIALS["FOIL"] = new THREE.MeshPhongMaterial(
        {   map: waterTexture,
            bumpMap: waterTexture,
            bumpScale: 0.3,
            color: 0xccccaa,
            ambient: 0x555544,
            specular: 0x777777,
            shininess: 100,
            shading: shading } );

    SV_MATERIALS["WATER"] = new THREE.MeshPhongMaterial(
        {   map: waterTexture,
            bumpMap: waterTexture,
            bumpScale: 0.05,
            color: 0x3333aa,
            ambient: 0x335577,
            specular: 0x555555,
            shininess: shininess,
            shading: shading } );


    SV_MATERIALS["GRASS"] = new THREE.MeshPhongMaterial(
        {   map: grassTexture,
            bumpMap: grassTexture,
            bumpScale: 0.05,
            color: 0xffffff,
            ambient: 0x777777,
            specular: 0x333333,
            opacity: 1,
            shininess: shininess,
            shading: shading } );

    SV_MATERIALS["LAVA"] = new THREE.MeshPhongMaterial(
        {   map: lavaTexture,
            bumpMap: lavaTexture,
            bumpScale: 0.5,
            color: 0xffffff,
            ambient: 0x777777,
            specular: 0x333333,
            shininess: shininess,
            shading: shading } );

    SV_MATERIALS["MOON"] = new THREE.MeshPhongMaterial(
        {   map: moonTexture,
            bumpMap: moonTexture,
            bumpScale: 0.0001,
            color: 0xffffff,
            ambient: 0x777777,
            specular: 0x333333,
            shininess: 0,
            shading: shading } );

    SV_MATERIALS["MOON"] = new THREE.MeshPhongMaterial(
        {   map: moonTexture,
            bumpMap: moonTexture,
            bumpScale: 0.0001,
            color: 0xffffff,
            ambient: 0x777777,
            specular: 0x333333,
            shininess: 0,
            shading: shading } );



    SV_MATERIALS["EARTH"] = new THREE.MeshPhongMaterial(
        {   map: earthTexture,
            color: 0xffffff,
            ambient: 0x777777,
            specular: 0x333333,
            shininess: shininess,
            shading: shading } );

})();
