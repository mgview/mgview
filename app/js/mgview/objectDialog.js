//Copyright 2012-2013 Adam Leeper. All Rights Reserved.


(function($) {

    SV.ObjectDialog = SV.Class.extend({

        init: function(objectName, model) {
            console.log(vsprintf("Creating dialog for object %s.",[objectName]));

            this._objectName = objectName;
            this._model = model;

            var self = this;

            SV.$('SV').append(
                    '<div id="dialog_'+objectName+'" title="Object Properties: '+objectName+'">'
                +       '<div id="objectToolbar" class="ui-widget-header ui-corner-all">'
                +           '<select class="Horizontal" id="elementSelect">'
                +           '</select>'
                +           '<button class="Horizontal" id="deleteElement"> </button>'


                        +           '<div class="verticalDivider"> </div>'

                +           '<div class="Horizontal Label" style="width:50px;"></div>'
                +           '<input type="text" class="Horizontal" id="new_element_text" placeholder="create new" />'
                +           '<button class="Horizontal" id="addNewElement"> </button>'

                +       '</div>'
                +       '<div id="elementProperties"> </div>'

                +   '</div>'
                );


            this.$('dialog', $( '#dialog_'+objectName ));
            this.$('elementSelect', this.$("dialog").find( "#elementSelect" ));
            this.$('elementProperties', this.$("dialog").find( "#elementProperties" ));

            this.dialog = this.$('dialog');
            this.dialog.dialog({
                //dialogClass: 'dialogNoTitle',
                autoOpen: false,
                closeOnEscape: true,
                width: 500,
                minWidth: 500,
//                maxWidth: 500,
                minHeight: 260
//                show: { effect: "blind", duration: 60 },
//                hide: { effect: "blind", duration: 60 }
            });

            this.dialog.find('#addNewElement').button({
                icons: {
                    primary: "ui-icon-plus"
                },
                text: false
            }).click(function(){
                    var elementName = self.$("dialog").find("#new_element_text").val();
                    if(elementName === '' || typeof(elementName) !== 'string')
                        return;

                    if( self._model.getObjectVisual(self._objectName, elementName) === undefined)
                    {
                        self.$("dialog").find("#new_element_text").val("");
                        var type = "sphere";
                        self.createNewElement(elementName, type);
                    }
                    else
                        alert(vsprintf("Object [%s] already has a visual element named [%s].",
                            [self._objectName, elementName]));
            });

            this.dialog.find('#deleteElement').button({
                icons: {
                    primary: "ui-icon-trash"
                },
                text: false
            }).click(function(){
                    var elementName = self.$("elementSelect").val();
                    if(elementName === '' || typeof(elementName) !== 'string')
                        return;
                    self.destroyElement(elementName);
                });

            var properties = this.$("elementProperties");
            properties.append(
                '<label>Visible:<input type="checkbox" id="check_visible" ></label>' +
                    '<label> Color:<input type="text" id="color_picker" name="color" value="#3355cc" /> </label>' +
                    '<br/>' +

                    '<div class="row-fluid">' +

                        '<div class="span3">' +
                            '<div class="row-fluid">' +
                                '<div class="span12">' +
                                    '<strong class="pull-left">Position (m)</strong>' +
                                '</div>' +

                                '<strong class="span1">x</strong>' +
                                '<input class="span10 positionSpinner" id="spin_pos_x" name="position_x" value="0.00" />' +

                                '<strong class="span1">y</strong>' +
                                '<input class="span10 positionSpinner" id="spin_pos_y" name="position_y" value="0.00" />' +

                                '<strong class="span1">z</strong>' +
                                '<input class="span10 positionSpinner" id="spin_pos_z" name="position_z" value="0.00" />' +
                            '</div>' +
                        '</div>' +

                        '<div class="span3">' +
                            '<div class="row-fluid">' +
                                '<div class="span12">' +
                                    '<strong class="pull-left">Rotation (deg)</strong>' +
                                '</div>' +

                                '<strong class="span1">x</strong>' +
                                '<input class="span10 rotationSpinner" id="spin_rot_x" name="rotation_x" value="0.00" />' +

                                '<strong class="span1">y</strong>' +
                                '<input class="span10 rotationSpinner" id="spin_rot_y" name="rotation_y" value="0.00" />' +

                                '<strong class="span1">z</strong>' +
                                '<input class="span10 rotationSpinner" id="spin_rot_z" name="rotation_z" value="0.00" />' +
                            '</div>' +
                        '</div>' +

                        '<div class="span6">' +
                            '<div class="Block" style="height:30px;">' +
                                '<div class="Horizontal Label" style="width:90px;">Geometry</div>' +
                                '<select class="Horizontal" id="geometrySelect"> </select>' +
                            '</div>' +
                            '<div class="geometryProperties"></div>' +
                        '</div>' +

                    '</div>'

//
//                    +   '<span class="Horizontal" >'
//                    +       '<div class="" >Position (m)</div>'
//                    +       '<label class="spinnerLabel">x <input class="positionSpinner" id="spin_pos_x" name="position_x" value="0.00" /></label><br/>'
//                    +       '<label class="spinnerLabel">y <input class="positionSpinner" id="spin_pos_y" name="position_y" value="0.00" /></label><br/>'
//                    +       '<label class="spinnerLabel">z <input class="positionSpinner" id="spin_pos_z" name="position_z" value="0.00" /></label><br/>'
//                    +   '</span>'
//
//                    +   '<div class="verticalDivider" style="height:120px;" />'
//
//                    +   '<span class="Horizontal">'
//                    +       '<div class="" >Rotation (deg)</div>'
//                    +       '<label class="spinnerLabel" >x <input class="rotationSpinner" id="spin_rot_x" name="rotation_x" value="0.00" /></label><br/>'
//                    +       '<label class="spinnerLabel" >y <input class="rotationSpinner" id="spin_rot_y" name="rotation_y" value="0.00" /></label><br/>'
//                    +       '<label class="spinnerLabel" >z <input class="rotationSpinner" id="spin_rot_z" name="rotation_z" value="0.00" /></label><br/>'
//                    +   '</span>'
//
//                    +   '<div class="verticalDivider" style="height:120px;" />'
//
//                    +   '<div class="Horizontal"  >'
//                    +       '<div class="Block" style="height:30px;">'
//                    +       '<div class="Horizontal Label" style="width:90px;">Geometry</div>'
//                    +       '<select class="Horizontal" id="geometrySelect">'
//                    +       '</select>'
//                    +       '</div>'
//                    +       '<div class="geometryProperties"></div>'
//                    +   '</div>'
            );

            this.$('geometryProperties', this.$("dialog").find( ".geometryProperties" )); // should this be an id?
            this.$('geometrySelect', this.$("dialog").find( "#geometrySelect" ));

            var geometrySelect = properties.find("#geometrySelect");
            var types = ['sphere', 'box', 'cylinder', 'cone', 'torus', 'mesh', 'text', 'basis'];
            for(var i = 0; i < types.length; i++)
                geometrySelect.append(
                    '<option value="'+types[i]+'" >'+types[i]+'</option>'
                )

            properties.find( ".positionSpinner" ).spinner({
                step: 0.001,
                numberFormat: "n"
            });
            properties.find( ".rotationSpinner" ).spinner({
                step: 0.5,
                numberFormat: "n"
            });


            for(var i in this._model.get("objects")[objectName].visual) {
                this.addElementOption(i);
            }
            this.$("elementSelect").change(function(){
                var value = $(this).val();
                self.setSelectedElement(value);
            });

            properties.find("#color_picker").spectrum({
                color: "#f00"
            });

            // Initialize stuff
            this.setSelectedElement(this.$("elementSelect").val());

            this.open();
        },

        destroy: function() {
            console.log("Destroying object dialog!");
            this.dialog.dialog( "destroy").remove();
        },

        isOpen: function() {
            return this.$('dialog').dialog("isOpen");
        },

        open: function() {
            var myButton = SV.$('VisualizerObjects').find('.objectButton#'+this._objectName);
            this.dialog.dialog("open")
                .dialog( "option", "position", { my: "left top", at: "right top", of: myButton } );
        },

        close: function() {
            //var myButton = SV.$('VisualizerObjects').find('.objectButton#'+this._objectName);
            this.$('dialog').dialog("close");
                //.dialog( "option", "position", { my: "left top", at: "right top", of: myButton } );
        },

        createNewElement: function(elementName, type) {
            this._model.changeObjectVisualType(this._objectName, elementName, type);
            this.addElementOption(elementName);
            this.$('elementSelect').val(elementName);
            this.setSelectedElement(elementName);
        },


        destroyElement: function(elementName) {
            this._model.destroyObjectVisualElement(this._objectName, elementName);
            this.$('elementSelect').find('#'+elementName).remove();
            this.setSelectedElement(this.$("elementSelect").val());
        },

        addElementOption: function(name){
            var select = this.$('elementSelect');
            select.append(
                '<option id="'+name+'" value="'+name+'" >'+name+'</option>'
            )
        },
        removeElementOption: function(name){
            // TODO I don't know why this doesn't actually work...
            var selector = '#'+name;
            var optionToRemove = this.$('elementSelect').find(selector);
            this.$('elementSelect').remove(selector);
        },

        setSelectedElement: function(elementName) {
            if(elementName == null || elementName == "") {
                warnLog("Not selecting null or empty element.");
                return;
            }
            var self = this;

            // Update visibility controls
            var visible = this.$("elementProperties").find("#check_visible");
            visible.prop('checked', self._model.getObjectVisualProperty(self._objectName, elementName, null, "visible"));
            visible.off("change");
            visible.on("change", function(){
                var checked = $(this).is(':checked');
                self._model.setObjectVisualProperty(self._objectName, elementName, null, "visible", checked);
            });

            // Update Geometry Type and Attributes
            var geometrySelect = this.$("geometrySelect");
            geometrySelect.off("change");
            geometrySelect.on("change", function(){
                var value = $(this).val();
                self._model.changeObjectVisualType(self._objectName, elementName, value);
                //self.setSelectedElement(elementName);
            });

            var new_type = this._model.getObjectVisualProperty(this._objectName, elementName, null, "type");
            geometrySelect.prop("value", new_type);
            this.setGeometryType(new_type, elementName);

            //Update text fields
            this.$('geometryProperties').find('#prop_text').val(this._model.getObjectVisualProperty(self._objectName, elementName, null, 'text'));
            this.$('geometryProperties').find('#prop_path').val(this._model.getObjectVisualProperty(self._objectName, elementName, null, 'path'));

            //this._model.getObjectVisualColor(self._objectName, elementName );
            var currentMaterial = self._model.getObjectVisualProperty(self._objectName, elementName, null, "material" );
            var initialColor = currentMaterial.name ? currentMaterial.name : currentMaterial;
            this.$('elementProperties').find("#color_picker").spectrum({
                color: initialColor,
                showInitial: true,
                showAlpha: true,
                change: function (color, something) {
                    var new_rgba = color.toRgb();
                    console.log(vsprintf("Setting color for element %s:%s to %s",
                        [self._objectName, elementName, color.toRgbString()]));
                    var colorName = color.toRgbString();
                    self._model.setObjectVisualColor(self._objectName, elementName, colorName, null);
                }
            });

            // Update all checkboxes
            var checkboxes = this.$("elementProperties").find(".propertyCheckbox");
            checkboxes.each( function(){
                var propertyContainer = null, propertyName = null;
                var checkbox = $(this);
                var info = checkbox.prop("name").split("_");
                if(info.length === 2){
                    propertyContainer = info[0];
                    propertyName = info[1];
                } else {
                    propertyName = info[0];
                }
                var checked = self._model.getObjectVisualProperty(self._objectName, elementName, null, propertyName);
                checkbox.prop('checked', checked);
                checkbox.off("change");
                checkbox.on("change", function(){
                    var checked = $(this).is(':checked');
                    self._model.setObjectVisualProperty(self._objectName, elementName, null, propertyName, checked);
                });
            });

            // Update all spinners
            var spinners = this.$('elementProperties').find(".positionSpinner, .rotationSpinner, .propertySpinner");
            spinners.each( function(){
                var info = $(this).prop("name").split("_");
                if(info.length === 2){
                    var propertyContainer = info[0];
                    var propertyName = info[1];
                } else {
                    var propertyContainer = null;
                    var propertyName = info[0];
                }

                var value_scale = 1.0;
                if( propertyContainer == "rotation")
                    value_scale = Math.PI / 180.0;

                var starting_value = 1.0 / value_scale * self._model.getObjectVisualProperty(self._objectName, elementName,
                                                                propertyContainer, propertyName);


                // Remove old callbacks, set values, connect new callbacks
                $(this).spinner("option", {change: null, stop: null, spin: null});
                $(this).spinner("value", starting_value);
                $(this).spinner("option", {
//                    change: function(event, ui){
//                        debugLog("Spinner change "+$(this).val());
//                        // Validate only!
//                    },
                    stop: function(event, ui){ // text events, and after each change
                        var value = parseFloat($(this).val()) * value_scale;
                        var min = $(this).spinner("option", "min");
                        if(min!== null && value < min) {
                            $(this).spinner("value", min);
                            value = min;
                        }

                        debugLog(vsprintf("Spinner stop %f", [value]));
                        if(!isNaN(value))
                            self.processSpinnerUpdate(elementName, propertyContainer, propertyName, value );
                    },
                    spin: function(event, ui){
                        var value = parseFloat(ui.value) * value_scale;
                        debugLog(vsprintf("Spinner spin before: %f after: %f",
                            [parseFloat($(this).val()), value]));
                        if(!isNaN(value))
                            self.processSpinnerUpdate(elementName, propertyContainer, propertyName, value );
                    }
                })
            });
        },

        processSpinnerUpdate: function(elementName, propertyContainer, propertyName, value){
            //console.log(vsprintf("Modified element %s, value %s to %f", [elementName, propertyName, value]));
            this._model.setObjectVisualProperty(this._objectName, elementName, propertyContainer, propertyName, value);
        },

        setGeometryType: function(type, elementName){
            debugLog("Changing geometry type to "+type);
            var properties = this.$("geometryProperties");
            properties.empty();

            if(type === 'sphere') {
                properties.append(
                    '<label>radius: <input class="propertySpinner" id="spin_radius" name="radius" value="1.00" /></label><br/>'
                );
            }
            if(type === 'box') {
                properties.append(
                    '<label>size x: <input class="propertySpinner" id="spin_x" name="size_x" value="1.00" /></label><br/>'
                        +'<label>size y: <input class="propertySpinner" id="spin_y" name="size_y" value="1.00" /></label><br/>'
                        +'<label>size z: <input class="propertySpinner" id="spin_z" name="size_z" value="1.00" /></label><br/>'
                );
            }
            if(type === 'cylinder') {
                properties.append(
                    '<label>radius: <input class="propertySpinner" id="spin_radius" name="radius" value="0.1" /></label><br/>'
                        +'<label>length: <input class="propertySpinner" id="spin_length" name="length" value="1.00" /></label><br/>'
                        +'<label>capped:<input class="propertyCheckbox" type="checkbox" id="check_capped" name="capped"></label>'

                );
            }
            if(type === 'cone') {
                properties.append(
                         '<label>radius1: <input class="propertySpinner" id="spin_radius1" name="radius1" value="0.1" /></label><br/>'
                        +'<label>radius2: <input class="propertySpinner" id="spin_radius2" name="radius2" value="0.1" /></label><br/>'
                        +'<label>length: <input class="propertySpinner" id="spin_length" name="length" value="1.00" /></label><br/>'
                        +'<label>capped:<input class="propertyCheckbox" type="checkbox" id="check_capped" name="capped"></label>'

                );
            }
            if(type === 'torus') {
                properties.append(
                    '<label>radius: <input class="propertySpinner" id="spin_radius" name="radius" value="1.00" /></label><br/>'
                        +'<label>thick:    <input class="propertySpinner" id="spin_thickness" name="thickness" value="0.1" /></label><br/>'
                );
            }
            if(type === 'mesh') {
                properties.append(
                '<label>scale: <input class="propertySpinner" id="spin_scale" name="scale" value="1.0" /></label><br/>'

                + '<input class="Horizontal propertyText" id="prop_path" name="path" placeholder="enter path" />'
                        +           '<button class="Horizontal" id="create_geometry" name="prop_path"> </button>'
                );
            }
            if(type === 'text') {
                properties.append(
                '<label>scale: <input class="propertySpinner" id="spin_scale" name="scale" value="1.0" /></label><br/>'

                + '<input class="Horizontal propertyText" id="prop_text" name="text" placeholder="enter text" />'
                + '<button class="Horizontal" id="create_geometry" name="prop_text"> </button>'
                );
            }
            if(type === 'basis') {
                properties.append(
                    '<label>scale: <input class="propertySpinner" id="spin_scale" name="scale" value="1.0" /></label><br/>'
                );
            }

            properties.find( ".propertySpinner" ).spinner({
                step: 0.001,
                min:  0,
                numberFormat: "n"
            });

            var self = this;
            properties.find('#create_geometry').button({
                icons: {
                    primary: "ui-icon-arrowrefresh-1-s"
                },
                text: false
            }).click(function(){
                    var source_input = properties.find("#"+$(this).prop("name"));
                    var value = source_input.val();
                    var propertyName = source_input.prop("name");
                    self._model.setMeshOrTextValue(self._objectName, elementName, propertyName, value);
                });
        },

        randomFunc: function() {

        }

    });

})(jQuery);