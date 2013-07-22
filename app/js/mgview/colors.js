
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


var SV_COLORS = {};
SV_COLORS['BLACK']   = new THREE.MeshPhongMaterial( { ambient :0x000000, color: 0x222222, specular: 0x111111 } );
SV_COLORS['WHITE']   = new THREE.MeshPhongMaterial( { ambient :0xFFFFFF, color: 0xFFFFFF, specular: 0xFFFFFF } );
SV_COLORS['SILVER']  = new THREE.MeshPhongMaterial( { ambient :0xC0C0C0, color: 0xC0C0C0, specular: 0xC0C0C0 } );
SV_COLORS['GRAY']    = new THREE.MeshPhongMaterial( { ambient :0x808080, color: 0x808080, specular: 0x808080 } );
SV_COLORS['RED']     = new THREE.MeshPhongMaterial( { ambient :0xFF0000, color: 0xFF0000, specular: 0xFF0000 } );
SV_COLORS['GREEN']   = new THREE.MeshPhongMaterial( { ambient :0x00FF00, color: 0x00FF00, specular: 0x00FF00 } );
SV_COLORS['BLUE']    = new THREE.MeshPhongMaterial( { ambient :0x0000FF, color: 0x0000FF, specular: 0x0000FF } );

SV_COLORS['SHINY_BLACK']   = new THREE.MeshPhongMaterial( { ambient :0x000000, color: 0x222222, specular: 0xFFFFFF } );
SV_COLORS['SHINY_WHITE']   = new THREE.MeshPhongMaterial( { ambient :0xFFFFFF, color: 0xFFFFFF, specular: 0xFFFFFF } );
SV_COLORS['SHINY_SILVER']  = new THREE.MeshPhongMaterial( { ambient :0xC0C0C0, color: 0xC0C0C0, specular: 0xFFFFFF } );
SV_COLORS['SHINY_GRAY']    = new THREE.MeshPhongMaterial( { ambient :0x808080, color: 0x808080, specular: 0xFFFFFF } );
SV_COLORS['SHINY_RED']     = new THREE.MeshPhongMaterial( { ambient :0xFF0000, color: 0xFF0000, specular: 0xFFFFFF } );
SV_COLORS['SHINY_GREEN']   = new THREE.MeshPhongMaterial( { ambient :0x00FF00, color: 0x00FF00, specular: 0xFFFFFF } );
SV_COLORS['SHINY_BLUE']    = new THREE.MeshPhongMaterial( { ambient :0x0000FF, color: 0x0000FF, specular: 0xFFFFFF } );