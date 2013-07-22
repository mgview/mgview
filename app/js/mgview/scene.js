//Copyright 2012-2013 Adam Leeper. All Rights Reserved.

(function($) {

    SV.Scene = SV.Class.extend({

        init: function(world) {
            this._world = world;
            this._scene = new THREE.Scene();
            this._lights = [];
            this._svFrames = {};
            this._svFrameTypes = {};
            this._svFrameRotationProxies = {};
            this._spans = {};

            this._tSpeedFactor = 1;
            this._upVec = new THREE.Vector3(0, 1, 0); // default

            this.addDefaultCamera();
            this.addDefaultLights();
            this.addDefaultControls();

        },

        destroy: function() {
            debugLog("Scene is being destroyed!");
        },

        addDefaultLights: function () {
            var scene = this._scene;
            this.addLight( new THREE.Vector3(-1, 1, 1), 0.5, true );
            var ambient_light = new THREE.AmbientLight( 0x111111);
            this._lights.push(ambient_light);
            scene.add( ambient_light );
        },

        addDefaultCamera: function() {
            var scene = this._scene;
            var camera = new THREE.PerspectiveCamera( 30, 800.0 / 600.0, 0.3, 300 ); //default, gets changed
            camera.position.set( 1, 1, 1 );  // default
            camera.up.copy(this._upVec);        // default
            this._camera = camera;
            // add camera to the root scene by default, though this might change based on config info later.
            //this._cameraParent = new THREE.Object3D();
            //this._cameraParent.add(camera);
            this._scene.add(this._camera);
        },

        addDefaultControls: function() {
//            this._controls = new THREE.TrackballControls( this._camera, SV.$('RenderWindow').get(0) );
//            this._controls.target.set(0, 0, 0 );
//            this._camera.lookAt( this._controls.target );
//            this._controls.rotateSpeed = 1.0;
//            this._controls.zoomSpeed = 1.2;
//            this._controls.noPan = false;
//            this._controls.minDistance = 0.5;
//            this._controls.maxDistance = 300;
//            this._controls.staticMoving = true;
//            //this._controls.dynamicDampingFactor = 0.15;
//            this._controls.keys = [ 65, 83, 68 ];
            this._controls = new THREE.OrbitControls( this._camera, SV.$('RenderWindow').get(0) );
            this._controls.allowPan = true;
            //controls.addEventListener( 'change', render );
            //this.disableControls();
        },

        resetScene: function() {
            this._scene = new THREE.Scene();
            this._lights = [];
            this._svFrames = {};
            this._svFrameTypes = {};
            this._svFrameRotationProxies = {};
            this._spans = {};

            // Reset stuff
            this.addDefaultCamera();
            this.addDefaultLights();
            this.addDefaultControls();
        },

        getSpeedFactor: function(){
            return this._tSpeedFactor;
        },

        setSpeedFactor: function(speed){
            this._tSpeedFactor = speed;
        },

        render: function(renderer) {
            renderer.render( this._scene, this._camera );
        },

        disableControls: function(){
            this._controls.enabled = false;
        },

        enableControls: function(){
            this._controls.enabled = true;
        },

        updateCameraAndControls:    function(){
            this._controls.update();
            this._camera.up.copy(this._upVec);
            this._camera.lookAt( this._controls.target);
        },

        setCamera: function(camera) { this._camera = camera; },
        getCamera: function()       { return this._camera;   },

        setCameraEye:   function(eye) {
            this._camera.position.copy(eye);
        },
        setCameraFocus: function(focus) {
            //this._controls.center.copy(focus);
            this._controls.target.copy(focus);
        },
        setCameraUp: function(up) {
            this._upVec = up;
            this._camera.up.copy(up);
        },

        setCameraAspect:    function(aspect){
            this._camera.aspect = aspect;
            this._camera.updateProjectionMatrix();
        },

        attachCamera: function(camera){
            this._scene.add( camera );
        },

        getScene:   function()         { return this._scene;   },

        addLight:   function( pos, intensity, on_camera){
            if(intensity === undefined )
                intensity = 1.0;
            if(on_camera === undefined )
                on_camera = false;
            var point_light = new THREE.PointLight( 0xffffff, intensity, 0 );
            point_light.position.copy(pos);
            this._lights.push(point_light);
            if(on_camera)
                this._camera.add( point_light );
            else
                this._scene.add(point_light);
        },

        _geometryScaleFromType: function(type, p) {
            if(type === 'box' && p) {
                if(p.size === undefined)
                    p.size = {x: 1, y: 1, z: 1};
                return new THREE.Vector3(p.size.x, p.size.y, p.size.z);
            }
            if(type === 'sphere' && p) {
                if(p.radius === undefined)
                    p.radius = 1;
                return new THREE.Vector3(p.radius, p.radius, p.radius);
            }
            if(type === 'cylinder' && p) {
                if(p.radius === undefined)
                    p.radius = 1;
                if(p.length === undefined)
                    p.length = 1;
                return new THREE.Vector3(p.radius, p.length, p.radius);
            }
            if(type === 'cone' && p) {
//                if(p.radius1 === undefined)
//                    p.radius1 = 1;
//                if(p.radius2 === undefined)
//                    p.radius2 = 1;
                if(p.length === undefined)
                    p.length = 1;
                return new THREE.Vector3(1, p.length, 1);
            }
            if(type === 'torus') {
                return false;
            }
            return false;
        },

        _geometryFromType: function(type, p) {
            // NOTE: Only need to define defaults if we don't like the defaults provided by the THREE framework.
            debugLog(vsprintf("Making geometry of type %s with properties ", [type]) + objectToArray(p));
            
            //THREE.CubeGeometry = function ( width, height, depth, segmentsWidth, segmentsHeight, segmentsDepth, materials, sides )
            if(type === 'box' && p) {
//                if(p.size === undefined)
//                    p.size = [1, 1, 1];
                //if(p.segments_width  == undefined)  p.segments_width  = 1;        
                //if(p.segments_height == undefined)  p.segments_height = 1;        
                //if(p.segments_depth  == undefined)  p.segments_depth  = 1;        
                var geometry = new THREE.CubeGeometry(1, 1, 1, p.segments_width, p.segments_height, p.segments_depth);

                return geometry;
            }
            
            //THREE.CylinderGeometry = function ( radiusTop, radiusBottom, height, segmentsRadius, segmentsHeight, openEnded )
            if( (type === 'cylinder' || type === 'cone') && p)  {
                if(p.radius === undefined)          p.radius = 1.0;
                if(p.radius1 === undefined)         p.radius1 = 1.0;
                if(p.radius2 === undefined)         p.radius2 = 1.0;
                if(p.length === undefined)          p.length = 1.0;
                if(p.segments_radius === undefined) p.segments_radius = 12;
                if(p.segments_height === undefined) p.segments_height = 1;
                if(p.capped == undefined)           p.capped = true;
                if(type === 'cone') return new THREE.CylinderGeometry( p.radius1, p.radius2, 1,
                                                                       p.segments_radius, p.segments_height, !p.capped );
                
                if(type === 'cylinder') return new THREE.CylinderGeometry( 1, 1, 1,
                                                                          p.segments_radius, p.segments_height, !p.capped );
            }
            
            // THREE.SphereGeometry = function ( radius, segmentsWidth, segmentsHeight, phiStart, phiLength, thetaStart, thetaLength )
            if(type === 'sphere'&& p) {
                if(p.radius === undefined)            p.radius = 1.0;
                if(p.segments_width === undefined)    p.segments_width = 8;
                if(p.segments_height === undefined)   p.segments_height = 8;
                //if(p.phi_start == undefined)         p.phi_start = 1.0;
                //if(p.phi_length == undefined)        p.phi_length = 1.0;
                //if(p.theta_start == undefined)       p.theta_start = 1.0;
                //if(p.theta_length == undefined)      p.theta_length = 1.0;
                return new THREE.SphereGeometry( 1, p.segments_width, p.segments_height,
                                                 p.phi_start, p.phi_length, p.theta_start, p.theta_length );
            }
            
            //THREE.TorusGeometry = function ( radius, tube, segmentsR, segmentsT, arc )
            if(type === 'torus' && p) {
                if(p.radius === undefined)               p.radius = 1.0;
                if(p.thickness === undefined)            p.thickness = 0.3;
                if(p.segments_radius === undefined)      p.segments_radius = 12;
                if(p.segments_thickness === undefined)   p.segments_thickness = 8;
                //if(p.arc == undefined)                  p.arc = Math.PI*2;
                return new THREE.TorusGeometry( p.radius, p.thickness/2, p.segments_thickness, p.segments_radius, p.arc);
            }
        },

        createMaterial: function(name, material) {
            var params = {};
            var rgba = material.color;
            params.ambient  =   dec2hexColor(0.2*rgba.r, 0.2*rgba.g, 0.2*rgba.b);
            params.color    =   dec2hexColor(rgba.r, rgba.g, rgba.b);
            params.specular =   dec2hexColor(0.5*rgba.r, 0.5*rgba.g, 0.5*rgba.b);
            params.opacity = (rgba.a === undefined) ? 1.0 : rgba.a;
            params.transparent = true;
            var param_list = [];
            for( var i in params )
                param_list.push(' ' + i + ': ' + params[i]);
            debugLog(vsprintf("Over-writing color [%s] with %s", [name, param_list]));
            SV_COLORS[name] = new THREE.MeshPhongMaterial(params);
        },

        processSpan: function( name, data ){
            var self = this;
            var type = removeWhitespace(data.type);
            var point1 = removeWhitespace(data.point1);
            var point2 = removeWhitespace(data.point2);
            debugLog(vsprintf("Found span %s:%s from %s to %s.", [name, type, point1, point2]));

            var materialName = 'SHINY_RED';
            if(data.visual && data.visual.material && SV_COLORS.hasOwnProperty(data.visual.material)) {
                materialName = data.visual.material;
                debugLog(vsprintf("Object %s has material %s.", [name, materialName]));
            }
            var mesh_color = SV_COLORS[materialName];

            var lineGeometry = new THREE.Geometry();
            lineGeometry.vertices.push( new THREE.Vector3() );
            lineGeometry.vertices.push( new THREE.Vector3( 0, 10, 0 ) );
            var lineMaterial = new THREE.LineBasicMaterial( { color : 0xff0000 } );
            lineMaterial.color = mesh_color.color;
            var line = new THREE.Line( lineGeometry, lineMaterial );
            self._scene.add(line);

            var span = {};
            span.type   = type;
            span.point1 = point1;
            span.point2 = point2;
            span.line = line;
            self._spans[name] = span;
        },

        processEntity: function( frameName, data ){
            var self = this;
            var type = data.type;

            this._svFrameTypes[frameName] = type;

            debugLog(vsprintf('Creating link: name = %s, type = %s', [frameName, type]));

            var proxy_rotation_frame = data.rotationFrame;
            if(proxy_rotation_frame !== undefined) {
                this._svFrameRotationProxies[frameName] = proxy_rotation_frame;
            }

            // Create the base frame for this entity
            var frame = this.addEmptyFrame(frameName);

            for(var key in data.visual)
            {
                this.createObjectVisual(frame, key, data.visual[key].type, data.visual[key]);
            }
        },

        createObjectVisual: function (parent, elementName, type, params) {

            var basePath = this._model.getBasePath();
            var position = new THREE.Vector3(0,0,0);
            var rotation = new THREE.Vector3(0,0,0);
            if(params.position !== undefined)
                position.set(params.position.x, params.position.y, params.position.z);

            if(params.rotation !== undefined)
                rotation.set(params.rotation.x, params.rotation.y, params.rotation.z);

            var materialName = 'SHINY_RED';
            if(typeof(params.material) === 'string' && SV_COLORS.hasOwnProperty(params.material)) {
                materialName = params.material;
                debugLog(vsprintf("Object %s:%s has material %s.", [parent.name, elementName, materialName]));
            } else if (typeof(params.material) === 'object') {
                materialName = params.material.name;
                this.createMaterial( materialName, params.material);
            }
            var mesh_color = SV_COLORS[materialName];

            var geometry_type = type;
            var dim = params;

            function loadStuff(key, geometryType, fn)
            {

            }

            if( geometry_type === "mesh" ){
                //options = {scale: dim.scale, origin_xyz: origin_xyz, origin_rpy: origin_rpy, material: mesh_color};
                if(dim.scale === undefined)
                    dim.scale = 1.0;
                if(dim.path === undefined){
                    alert(vsprintf("Object %s has a visual element of type 'mesh' but no 'path' is given.", [frameName]));
                    return;
                }
                if(dim.path === ""){
                    var obj = new THREE.Object3D();
                    obj.name = elementName;
                    obj.type = geometry_type;
                    obj.parameters = dim;
                    parent.add(obj);
                    return;
                }
                // TODO refactor this and the below function.
                //with({key: elementName, geometry_type: geometry_type}){

                THREEal.loadAndAddFromFile(parent, basePath+dim.path, dim.scale, position, rotation, mesh_color,
                    function(obj){
                        obj.name = elementName;
                        obj.type = geometry_type;
                        obj.parameters = dim;
                        THREEal.setVisible(obj, dim.visible);
                    });
                //}
            }
            else if( geometry_type === "basis" ) {
                var size = dim.scale;
                // TODO refactor this and the above function.
                //with({key: elementName, geometry_type: geometry_type}){
                    THREEal.loadAndAddFromFile(parent, "meshes/basis.dae", size, position, rotation, mesh_color,
                        function(obj){
                            obj.name = elementName;
                            obj.type = geometry_type;
                            obj.parameters = dim;
                            THREEal.setVisible(obj, dim.visible);
                        });
                //}
            }
            else if( geometry_type === "text" ) {
                if(dim.text === ""){
                    var obj = new THREE.Object3D();
                    obj.name = elementName;
                    obj.type = geometry_type;
                    obj.parameters = dim;
                    parent.add(obj);
                }
                else {
                    THREEal.addTextHelper(parent, dim.text, 1.0, mesh_color, function(obj) {
                        obj.name = elementName;
                        obj.type = geometry_type;
                        obj.parameters = dim;
                        obj.position.copy(position);
                        obj.rotation.copy(rotation);
                        obj.scale.set(dim.scale, dim.scale, dim.scale);
                        THREEal.setVisible(obj, dim.visible);
                    });
                }
            }
            else {
                var body_geometry = this._geometryFromType(geometry_type, dim);
                var geometry_frame = new THREE.Mesh( body_geometry, mesh_color );
                var scale = this._geometryScaleFromType(geometry_type, dim);
                if(scale !== false)
                    geometry_frame.scale = scale;
                debugLog(vsprintf("Link %s contains a %s with properties ", [parent.name, geometry_type])+objectToArray(dim));
                geometry_frame.position.copy(position);
                geometry_frame.rotation.copy(rotation);
                geometry_frame.name = elementName;
                geometry_frame.type = geometry_type;
                geometry_frame.parameters = dim;
				geometry_frame.castShadow = true;
				geometry_frame.receiveShadow = true;
                parent.add(geometry_frame);
            }
        },

        addEmptyFrame: function(frameName){

            var frame = this._svFrames[frameName];

            // In any case, over-write the old frame.
            var frame = new THREE.Object3D();
            frame.name = frameName;
            frame.position.set(0, 0, 0);
            this._scene.add(frame);
            this._svFrames[frameName] = frame;

            //this.addBasis(frame, showBasis, showLabel);

            return frame;
        },

		addShadowedLight: function( from, to, d, color, intensity ) {

			var directionalLight = new THREE.DirectionalLight( color, intensity );
			directionalLight.position.copy(from);
			directionalLight.target.position.copy(to);
			this._scene.add( directionalLight );

			directionalLight.castShadow = true;
			directionalLight.shadowCameraVisible = true;

			//ar d = 1;
			directionalLight.shadowCameraLeft = -d;
			directionalLight.shadowCameraRight = d;
			directionalLight.shadowCameraTop = d;
			directionalLight.shadowCameraBottom = -d;

			directionalLight.shadowCameraNear = d/10;
			directionalLight.shadowCameraFar = 10*d;

			directionalLight.shadowMapWidth = 1024;
			directionalLight.shadowMapHeight = 1024;

			directionalLight.shadowBias = -0.005;
			directionalLight.shadowDarkness = 0.5;

		},

        configureCameraAndLights: function(config) {
            this.addLight( this._upVec.clone().multiplyScalar(config.workspaceSize), 0.8 );

//			this._scene.fog = new THREE.Fog( 0xffffff, 2, 15 );
//			this._scene.fog.color.setHSV( 0.06, 0.2, 0.45 );
//
//			var size = config.workspaceSize;
//			var from = this._upVec.clone().multiplyScalar(size);
//			var to = this._upVec.clone().multiplyScalar(-size);
//
//			this.addShadowedLight( from, to, size, 0xffffff, 1.35 );
//			this.addShadowedLight( 0.5*size, size, -size, 0xffaa00, 1 );




            if( config.showAxes === true )
                addAxes(this._scene, config.workspaceSize, config.workspaceSize/100);

            this._controls.minDistance = config.workspaceSize / 10;
            this._controls.maxDistance = config.workspaceSize * 100;

            this.setCameraUp( arrayToVector3(config.cameraUp) );
            this.setCameraFocus(arrayToVector3(config.cameraFocus));
            this.setCameraEye(arrayToVector3(config.cameraEye));
        },

        configureSceneFromModel: function(model, basePath){
            if(basePath === undefined)
                alert("basePath is undefined, can't configure scene!");

            this._model = model;

            this.configureCameraAndLights(model._model);

//            for(var name in model._model.customMaterials) {
//                this.createMaterial(name, model._model.customMaterials[name]);
//            }

            for(var name in model._model.objects) {
                this.processEntity( name, model._model.objects[name], basePath);
            }

            for(var name in model._model.spans) {
                this.processSpan( name, model._model.spans[name]);
            }
        },

        setCameraParent: function(frameName){

            var frame = this._svFrames[frameName];
            if(frame === undefined)
            {
                console.log(vsprintf("Invalid frame name %s!", [frameName]));
                return;
            }

            if(this._camera.parent != frame)
            {
                infoLog(vsprintf("Changing camera parent to frame %s", [frameName]));
                frame.add( this._camera);
            }
        },

        setAnimationTime: function(time) {
            if(this._model == undefined)
                return;

            var newtonianFrame = this._model.get("newtonianFrame");
            var svOrigin = this._model.get("sceneOrigin");
            
            time = time*this._tSpeedFactor;


            $( "#time_scrub" ).slider("value", time);
            $( "#time_text").val(vsprintf("%.3f",[time]));

            var data = this._model.getDataAtTime(time);
            if(data === false) {
                console.log("Returning false!");
                return false;
            }


            for(var frameName in this._svFrames){
                var frame = this._svFrames[frameName];
                //console.log("Doing frame " + frameName);

                var reference_point = (this._svFrameTypes[frameName] === 'point') ? (frameName) : (frameName+'o');

                var rot_proxy = this._svFrameRotationProxies[frameName]; // != null)
                var rotation_name = newtonianFrame + "_" + ((rot_proxy == null)?(frameName):(rot_proxy));

                // TODO pre-process this!
                if(data[rotation_name+"[1,1]"] != null)
                {
                    //debugLog(vsprintf("Found rotation data for frame %s", [frameName] ));
                    var rot = [];
                    for(var i=1; i<=3; i++) for(var j=1; j<=3; j++){
                        rot.push(data[rotation_name+vsprintf("[%d,%d]", [i,j])]);
                    }
                    frame.rotation.setEulerFromRotationMatrix(
                        new THREE.Matrix4(  rot[0],rot[1],rot[2], 0,
                                            rot[3],rot[4],rot[5], 0,
                                            rot[6],rot[7],rot[8], 0,
                                                 0,     0,     0, 1));
                }
                // TODO allow for point other than Ao, Bo, etc, like Acm

                var position_name = vsprintf("P_%s_%s", [svOrigin, reference_point]);
                if(data[position_name+"[1]"] != null)
                {
                    //debugLog(vsprintf("Found position data for %s", [position_name] ));
                    frame.position.set(data[position_name+"[1]"],data[position_name+"[2]"],data[position_name+"[3]"]);
                }
            }

            for(var name in this._spans){
                //debugLog(vsprintf("Setting span named %s", [name]));
                var span = this._spans[name];
                var point1_hash = vsprintf("P_%s_%s", [svOrigin, span.point1]);
                var point2_hash = vsprintf("P_%s_%s", [svOrigin, span.point2]);
                var point1_vec = new THREE.Vector3(data[point1_hash+"[1]"], data[point1_hash+"[2]"], data[point1_hash+"[3]"]);
                var point2_vec = new THREE.Vector3(data[point2_hash+"[1]"], data[point2_hash+"[2]"], data[point2_hash+"[3]"]);
                span.line.geometry.vertices[0].copy(point1_vec);
                span.line.geometry.vertices[1].copy(point2_vec);
                span.line.geometry.verticesNeedUpdate = true;
            }

            return true;
        },

        updateObjectVisual: function(objectName, elementName, propertyContainer, propertyName, value )
        {
            if(propertyContainer === 'position' || propertyContainer === 'rotation') {
                this._svFrames[objectName].getChildByName(elementName, true)[propertyContainer][propertyName] = value;
            }
            else if ( propertyName === 'visible'){
                THREEal.setVisible(this._svFrames[objectName].getChildByName(elementName, true), value);
            }
            else if ( propertyName === 'scale'){
                var element = this._svFrames[objectName].getChildByName(elementName, true);
                element.scale.set(value, value, value);
            }
            else if ( propertyName === 'radius' || propertyName === 'length' || propertyContainer === 'size' ){
                // TODO looks like each object actually has a direct pointer to the parameters in the model!
                var element = this._svFrames[objectName].getChildByName(elementName, true);
                var scale = this._geometryScaleFromType(element.type, element.parameters);
                if(scale !== false)
                    element.scale = scale;
                else
                    this.changeObjectVisualType(objectName, elementName, element.parameters.type, element.parameters )
            }
            else if ( propertyName === 'thickness' || propertyName === 'capped'
                || propertyName === 'radius1' || propertyName === 'radius2') {
                // Propertis which aren't a pure scaling
                var element = this._svFrames[objectName].getChildByName(elementName, true);
                this.changeObjectVisualType(objectName, elementName, element.parameters.type, element.parameters )
            }
            else if ( propertyName === 'path' ){
                this.changeObjectVisualType(objectName, elementName, "mesh", params )
            }
            else if ( propertyName === 'path' || propertyName === 'text') {
                this.changeObjectVisualType(objectName, elementName, type, params )
            }

        },

        changeObjectVisualType: function(objectName, elementName, type, params )
        {
            if(!this.destroyObjectVisual(objectName, elementName)) {
                //return false;
            }

            // Reconstruct
            var object = this._svFrames[objectName];
            this.createObjectVisual(object, elementName, type, params);
            return true;
        },

        destroyObjectVisual: function(objectName, elementName )
        {
            var object = this._svFrames[objectName];
            var element = object.getChildByName(elementName, true);
            if(element === undefined) {
                warnLog(vsprintf("Didn't actually find element [%s:%s].", [objectName, elementName]));
                return false;
            } else {
                var parent = element.parent;
                parent.remove(element);
            }
            return true;
        }

    });

})(jQuery);
