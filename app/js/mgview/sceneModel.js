//Copyright 2012-2013 Adam Leeper. All Rights Reserved.

(function($) {

    SV.SceneModel = SV.Class.extend({

        init: function(filePath, view) {
            console.log("Creating a model for a scene.");

            this._view = view;
            this._model = {};
            this._filePath = filePath;

            // TODO this is a control
            this._objectDialog = {};

            this.loadModelFromFile(filePath);

            var self = this;
            $("#open_model_editor").on("click", function(){
                    $( '#model_editor' ).dialog("open");
                    self.updateEditorWithModel();
                }
            );
        },

        destroy: function() {
            console.log("Destroying sceneModel!");
            SV.$('VisualizerObjects').empty();
            SV.$('FixedFrameSelect').empty();
            for( var key in this._objectDialog) {
                this._objectDialog[key].destroy();
                delete this._objectDialog[key];
            }
            SV.$('VisualizerObjects').off( "click", "button");
            SV.$('FixedFrameSelect').off( "change");

        },

        clear: function () {
            SV.$('VisualizerObjects').empty();
            SV.$('FixedFrameSelect').empty();
            for( var key in this._objectDialog) {
                this._objectDialog[key].destroy();
                delete this._objectDialog[key];
            }
            this._view.resetScene();
            this._view._world.getDefaultCanvas().updateSize();
        },

        getBasePath: function() {
            return this._basePath;
        },

        inferTimeFromData: function() {

            this._tInitial = 0;
            this._tFinal = this._timeArray[this._timeArray.length - 1];
            this._tStep = this._timeArray[1] - this._timeArray[0];
            $( "#time_scrub" ).slider("option", {min: this._tInitial, max: this._tFinal});

        },

        processSimulationSettings: function(model, base_path) {
            var self = this;
            self._simulationSettingsFile = base_path + removeWhitespace(model.simulationSettings);
            $.ajax({
                type: "GET",
                url: self._simulationSettingsFile,
                error: function(){ self._errorLog("ajax call failed to load file!"); },
                success:
                    function(data){
                        var lines = data.split("\n");
                        debugLog(vsprintf("Found simulation settings file: %s", [lines[0]]));

                        for( var L = 0; L < lines.length; L++){
                            var line = lines[L].split(/\s+/g);
                            if( line[0] === "Absolute"     || line[0] === "Relative" )
                                self._simulationSettings[line[2]] = +(line[4]);
                            if( line[0] === "Print-Integer")
                                self._simulationSettings[line[1]] = +(line[6]);
                            if( ((line[0] === "Initial"  || line[0] === "Final" ) && line[1] === "Time")
                                || line[0] === "Integration")
                                self._simulationSettings[line[2]] = +(line[5]);
                        }

                        if( typeof(self._simulationSettings.tInitial) !== 'undefined' ) self._tInitial = self._simulationSettings.tInitial;
                        if( typeof(self._simulationSettings.tFinal)   !== 'undefined' ) self._tFinal   = self._simulationSettings.tFinal;
                        if( typeof(self._simulationSettings.integStp) !== 'undefined' ) self._tStep    = self._simulationSettings.integStp;

                        $( "#time_scrub" ).slider("option", {min: self._tInitial, max: self._tFinal});
                    }
            });
        },

        callModelChangedCallbacks: function(){
            this.updateEditorWithModel();
            //this._view.updateCustomColors();
        },

        updateEditorWithModel: function() {

            SV.editor_xml.setModel(this._model);
        },

        processSimulationFiles: function(config, basePath){
            for(var strIndex = 0; strIndex < config.simulationData.length; strIndex++ ) {
                var sim_file_string = config.simulationData[strIndex];
                // Break the string apart and look for a colon ':' separating a range of file numbers.
                // (If there is no colon-separated pair of values, the one number will be used.)
                // In any case, we then add the range of files to the list of simulation files.
                var sim_file_elements = sim_file_string.split('.');
                var numbers = sim_file_elements[sim_file_elements.length-1].split(':');
                var first_value = +(numbers[0]);
                var last_value  = +(numbers[numbers.length-1]);
                var filebase = sim_file_elements.slice(0, -1).join('.');
                for(var file_number = first_value; file_number <= last_value; file_number++ )
                    this._simulationFiles.push(basePath + filebase + '.' + file_number);
            }
        },

        loadModelFromFile: function(filePath){
            var self = this;
            //self._doneLoadingXml = false;
            self._simulationFiles = [];
            self._simulationSettings = {};
            self._basePath = THREEal.getBasePath(filePath);
            infoLog(vsprintf("The file is [%s] and base_path is [%s].", [filePath, self._basePath]));

            $.ajax({
                type: "GET",
                url: filePath,
                dataType: "text",
                error: function(){
                    alert("Failed to load scene file because it is malformed. Please check file for syntax errors.");
                },
                success: function(model_string) {
                    console.log("Loaded scene file, parsing...");

                    //var output_string = jsl.format.formatJson(model_string);
                    try {
                        var model = jsl.parser.parse(model_string);
                        self.loadFromModel(model);
                    }
                    catch(err) {
                        alert(err);
                    }


                }
            });
        },

        loadFromModel: function(model) {
            var self = this;

            self.clear();

            self._model = model;

            self.addEmptyDefaults();
            //self.processSimulationSettings(model, self._basePath);
            self.processSimulationFiles(model, self._basePath);
            self.loadSimulationTrajectories();
        },

        loadSimulationTrajectories: function() {
            var self = this;
            self._timeData = {};
            self._timeArray = [];
            self.filesLoaded = {};
            for(var i=0; i < self._simulationFiles.length; i++){
                self.filesLoaded[self._simulationFiles[i]] = false;
            }

            for(var fileNum = 0; fileNum < self._simulationFiles.length; fileNum++) {
                var filePath = self._simulationFiles[fileNum];

                (function(filePath, fileNum) {
                    $.ajax({
                        type: "GET",
                        url: filePath,
                        error:      function(){  },
                        success:
                            function(data){
                                var lines = data.split("\n");
                                debugLog(vsprintf("Found simulation file: %s", [lines[0]]));
                                //debugLog(vsprintf("entities: %s", [lines[2]]));

                                // first get all the times
                                // then create a hash: each time has the values of all parameters

                                for(var i=5; i < lines.length - 1; i++){
                                    var time = lines[i].split(/\s+/g).slice(1,2)[0];
                                    if(self._timeData[time] == null)
                                        self._timeData[time] = {};
                                    if(fileNum == 0)
                                        self._timeArray.push(time);
                                }

                                var entities = lines[2].split(/\s+/g).slice(2); // split on all whitespace, ignore time

                                for(var i=5; i < lines.length - 1; i++){
                                    var values = lines[i].split(/\s+/g).slice(1);
                                    var time = values[0];
                                    for(var j=1; j< values.length; j++){
                                        if(entities[j-1] !== "" && values[j] !== "")      
                                          self._timeData[time][entities[j-1]] = +(values[j]);
                                    }

                                }
                                //debugLog(entities);
                                self.filesLoaded[filePath] = true;
                            }
                    });
                })(filePath, fileNum);
            }

            (function waitForFilesToLoad() {
                var done = true;
                for(var i in self.filesLoaded)
                {
                    done = done && self.filesLoaded[i];
                }
                if (!done) {
                    setTimeout(waitForFilesToLoad, 100);
                    return;
                } else {
                    self.inferTimeFromData();
                    self.inferFramesFromData();
                }
            })();
        },

        inferFramesFromData: function(){

            for(var i in this._timeData) {
                var key = i;
            }
            if( !key )
                console.log("TimeData didn't contain key [%s]!", [key]);
            var data = this._timeData[ key ];

            for(var key in data){
                //console.log("Have key: " + key);
                var patternPos = /P_[^_]+_[^\[]+[\[][1-3]+[\]]/g;
                var patternMat = /[^_]+_[^\[]+[\[][1-3][,][1-3]+[\]]/g;
                var result;
                while ( ( result = patternPos.exec( key ) ) != null ) {
                    //console.log("Found position vector " + result[0]);
                    var pieces = result[0].split(new RegExp(this.get("sceneOrigin")+'|_|o|\\[[0-9]\\]', 'g'));  // split(/[o_\[]/g);
                    var frameName = pieces[3];
                    if(this._model.objects[frameName] === undefined)
                    {
                        console.log(vsprintf("Found position vector %s but %s is not already defined, adding as default with type 'point'.",
                            [result[0], frameName]));
                        this._model.objects[frameName] = {type: "point" };
                    }
                }
                while ( ( result = patternMat.exec( key ) ) != null ) {
                    var pieces = result[0].split(/[_|\[]/g);
                    var newtonianFrame = pieces[0];
                    if(this._model.objects[newtonianFrame] === undefined) {
                        console.log(vsprintf("Inferring Newtonian frame [%s] from the simulation data.", [newtonianFrame]));
                        this._model.objects[newtonianFrame] = {type: "frame" };
                    }

                    var frameName = pieces[1];
                    if(this._model.objects[frameName].type !== 'frame') {
                        console.log(vsprintf("Found rotation matrix %s_%s, setting type for %s to 'frame'.",
                            [pieces[0], pieces[1], pieces[1]]));
                        this._model.objects[frameName].type = "frame";
                    }
                }
            }

            // Finishing up ...
            this.addDefaultBasesAndLabels();
            this.addDefaultPositionAndRotation();
            this.populateControls();
            this.updateEditorWithModel();
            this._view.configureSceneFromModel(this, this._basePath);
            this.setCameraFrame(this.get("cameraParentFrame"));
            this._view.setAnimationTime(0);


            // TODO everything below here should probably live somewhere else.

            // This is updating a "control" element
            var self = this;
            SV.$('VisualizerObjects').delegate("button", "click",
                    function(event){
                        var objectName = $(this).prop("value");
                        if(self._objectDialog[objectName] === undefined) {
                            for(var key in self._objectDialog) {
                                self._objectDialog[key].close();
                            }
                            self._objectDialog[objectName] = new SV.ObjectDialog(objectName, self);
                        }
                        else {
                            if(self._objectDialog[objectName].isOpen()) {
                                self._objectDialog[objectName].close();
                            }
                            else {
                                for(var key in self._objectDialog) {
                                    self._objectDialog[key].close();
                                }
                                self._objectDialog[objectName].open();
                            }
                        }
                    });

//                    unselected: function(event, ui){
//                        var objectName = ui.unselected.innerHTML;
//                        console.log("Deselecting object: " + objectName);
//                        if(self._objectDialog[objectName] !== undefined) {
//                            self._objectDialog[objectName].destroy();
//                            delete self._objectDialog[objectName];
//                        }
//                    }
//                });

            // This is also a "control" element
            SV.$('FixedFrameSelect').change(function(){
                var value = $(this).val();
                self.setCameraFrame(value);
            });

        },

        populateControls: function()    {
            for(var frameName in this._model.objects) {
                SV.$('VisualizerObjects').append(
                    //'<li class="ui-widget-content" name="'+frameName+'">'+frameName+'</li>'
                    vsprintf('<button class="objectButton" id="%s" value="%s">%s</button>', [frameName, frameName, frameName])
                );
                SV.$('FixedFrameSelect').append('<option value="'+frameName+'" >'+frameName+'</option>');
            }
            SV.$('VisualizerObjects').find('button').button({
                icons: {
                },
                text: true
                });
            SV.$('FixedFrameSelect').val(this.get("cameraParentFrame"));
        },

        // This is a "controller" item
        setCameraFrame: function(frameName){

            this.set("cameraParentFrame", frameName);
            this._view.setCameraParent(frameName);

        },

        // TODO haven't tested timeStart != 0
        _timeToHash: function(time){
            var timeStep = this._tStep;
            var timeStart = this._tInitial;
            //if(time > this._tFinal) time = this._tFinal;
            var index = Math.floor(time/timeStep);
            if(index >= this._timeArray.length)
            {
//                console.log(vsprintf("Index %d exceeds array length %d.", [index, this._timeArray.length]));
                return false;
            }
            else
            {
                //console.log(vsprintf("Returning hash %s for index %d of %d.",
                //    [this.timeArray[index], index, this.timeArray.length]));
                return this._timeArray[index];
            }
        },

        getDataAtTime: function(time) {
            var timeHash = this._timeToHash(time);
            if( timeHash === false ) {
//                console.log("Returning false!");
                return undefined;
            }

            return {t: +(timeHash), data: this._timeData[timeHash]};
        },

        addEmptyDefaults:   function() {
            if(this._model.showAxes === undefined)
                this._model.showAxes = false;
            if(this._model.workspaceSize === undefined)
                this._model.workspaceSize = 1.0;
            if(this._model.newtonianFrame === undefined)
                this._model.newtonianFrame = "N";
            if(this._model.sceneOrigin === undefined)
                this._model.sceneOrigin = this._model.newtonianFrame + "o";
            if(this._model.cameraParentFrame === undefined)
                this._model.cameraParentFrame = this._model.newtonianFrame;

            if(this._model.objects === undefined)
                this._model.objects = {};

            var nFrame = this._model.newtonianFrame;
            if(nFrame !== undefined && this._model.objects[nFrame] === undefined) {
                this._model.objects[nFrame] = { type: "frame" };
            }

            for( var frameName in this._model.objects) {
                var frame = this._model.objects[frameName];
                if(frame.visual === undefined) frame.visual = {};
                for( var elementName in frame.visual) {
                    var element = frame.visual[elementName];
                    if(element.visible === undefined) element.visible = true;
                }
            }
        },

        addDefaultBasesAndLabels: function() {
            debugLog("Checking for basis and label visuals for all objects...");
            for(var objectName in this._model.objects)
            {
                var object = this._model.objects[objectName];

                // Default
                if(object.visual === undefined) {
                    //debugLog(vsprintf("Adding empty visual group for object %s", [objectName]));
                    object.visual = {};
                }

                var size = this._model.workspaceSize/4;
                // Add label
                if( object.visual["label"] === undefined ){
                    debugLog(vsprintf("Adding label for object %s", [objectName]));
                    object.visual.label = {
                        visible   : true,
                        type      : "text",
                        text      : objectName,
                        scale     : size/2,
                        position  : { x: size/3, y: size/8, z: 0 },
                        rotation  : { x: 0, y: 0, z: 0 },
                        material  : { name: "SILVER" }
                    }
                }
                // Add basis
                if( object.visual["basis"] === undefined ){
                    debugLog(vsprintf("Adding basis for object %s", [objectName]));
                    object.visual.basis = {
                        visible   : true,
                        type      : "basis",
                        scale     : size,
                        position  : { x: 0, y: 0, z: 0 },
                        rotation  : { x: 0, y: 0, z: 0 },
                        material  : { name: "SILVER" }
                    }
                }
            }
        },

        addDefaultPositionAndRotation: function() {
            debugLog("Checking for position and rotation fields for all visuals...");
            for(var objectName in this._model.objects)
            {
                var object = this._model.objects[objectName];
                for(var visualName in object.visual) {
                    var visual = object.visual[visualName];
                    if(visual.position === undefined) {
                        debugLog(vsprintf("Adding default position for [%s:%s]", [objectName, visualName]));
                        visual.position = {x: 0, y: 0, z: 0};
                    }
                    if(visual.rotation === undefined) {
                        debugLog(vsprintf("Adding default rotation for [%s:%s]", [objectName, visualName]));
                        visual.rotation = {x: 0, y: 0, z: 0};
                    }
                }
            }
        },

        set: function(property, value){
            this._model[property] = value;
        },

        get: function(property) {
            return this._model[property];
        },

        getTypeProperties: function(type) {
            var s = this._model.workspaceSize/5;
            if(type === 'sphere')
                return {radius: s};
            if(type === 'box')
                return {size: {x: s, y:s, z:s}};
            if(type === 'cylinder')
                return {radius: 0.25*s, length: s, capped: true};
            if(type === 'cone')
                return {radius1: 0.25*s, radius2: 0.5*s, length: s, capped: true};
            if(type === 'torus')
                return {radius: s, thickness: 0.25*s};
            if(type === 'mesh')
                return {scale: 1, path: ""};
            if(type === 'text')
                return {scale: s, text: ""};
            if(type === 'basis')
                return {scale: s};
            // default
            return {};
        },

        createEmptyVisual: function() {
            return {
                type: null,
                visible : true,
                position: {x: 0, y: 0, z: 0},
                rotation: {x: 0, y: 0, z: 0},
                material: { name: "SILVER" }
            }
        },

        getObjectVisual: function(objectName, elementName ){
            return this._model.objects[objectName].visual[elementName];
        },

        getObjectVisualProperty: function(objectName, elementName, propertyContainer, propertyName ){
            if(propertyContainer)
                return this._model.objects[objectName].visual[elementName][propertyContainer][propertyName];
            else
                return this._model.objects[objectName].visual[elementName][propertyName];
        },

        // TODO Functions below here should emit "changed" events...

        setObjectVisualColor: function (objectName, elementName, name, color) {

            var element = this._model.objects[objectName].visual[elementName];
            element.material = name;
            color.r *= 0.00390625;
            color.g *= 0.00390625;
            color.b *= 0.00390625;
            //this._model.objects[objectName].visual[elementName].material = { name: name, color: color };
            this._model.objects[objectName].visual[elementName].material = { name: name };


            //this._view.createMaterial(name, {color: color});
            this._view.createMaterial({name: name});
            this._view.changeObjectVisualType(objectName, elementName, element.type, element);
            this.callModelChangedCallbacks();
        },

        addCustomColor: function (name, color) {
            //this._model.customMaterials[name] = {color: color};
        },

        changeObjectVisualType: function(objectName, elementName, type){
            var element = this._model.objects[objectName].visual[elementName];
            if(element === undefined) {
                element = this._model.objects[objectName].visual[elementName] = this.createEmptyVisual();
            } else {
                // Remove old properties
                delete element.size;
                delete element.radius;
                delete element.radius_bottom;
                delete element.radius_top;
                delete element.length;
                delete element.length;
                delete element.scale;
                delete element.segments_height;
                delete element.segments_width;
                delete element.segments_depth;
                delete element.segments_radius;
            }

            // Set new properties
            element.type = type;
            var properties = this.getTypeProperties(type);
            for(var prop in properties){
                element[prop] = properties[prop];
            }
            this._view.changeObjectVisualType(objectName, elementName, type, element);
            this._objectDialog[objectName].setSelectedElement(elementName);
            this.callModelChangedCallbacks();
        },

        setObjectVisualProperty: function(objectName, elementName, propertyContainer, propertyName, value )
        {
            // Update model
            if(propertyContainer)
                this._model.objects[objectName].visual[elementName][propertyContainer][propertyName] = value;
            else
                this._model.objects[objectName].visual[elementName][propertyName] = value;

            // Update view
            this._view.updateObjectVisual(objectName, elementName, propertyContainer, propertyName, value);
            this.callModelChangedCallbacks();
        },

        setMeshOrTextValue: function(objectName, elementName, propertyName, value){
            var element = this._model.objects[objectName].visual[elementName];
            element[propertyName] = value;
            this._view.changeObjectVisualType(objectName, elementName, element.type, element);
            //this._objectDialog[objectName].setSelectedElement(elementName);
            this.callModelChangedCallbacks();
        },

        destroyObjectVisualElement: function(objectName, elementName){
            delete this._model.objects[objectName].visual[elementName];
            this._view.destroyObjectVisual(objectName, elementName);
            this.callModelChangedCallbacks();
        }

});

})(jQuery);
