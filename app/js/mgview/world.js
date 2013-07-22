//Copyright 2012-2013 Adam Leeper. All Rights Reserved.

(function($) {

    SV.World = SV.Class.extend({
        init: function() {

            this._canvases = {};
            this._models = {};
            this._views = {};
            this._upVec = new THREE.Vector3(0,1,0);


            var self = this;
            this._last_update_time = 0;
            this._ready = false;
        },

        destroy: function() {

            for (var canvasID in this._canvases) {
                this._canvases[canvasID].destroy();
            }

            this.self().remove();

        },

        isReady: function(){
          return this._ready;
        },

//        setUpVector:    function(vec)   { this._upVec.copy(vec); this._models['default'].setCameraUp(vec);  },
//        getUpVector:    function()      { return this._upVec; },
//        setCameraEye:   function(pos)   { this._scenes['default'].setCameraEye(pos); },
//        setCameraFocus: function(pos)   { this._scenes['default'].setCameraFocus(pos); },

        view:        function(id)  { return this._views[id];               },
        getViews:    function()         { return this._views;                         },
        model:        function(id)  { return this._models[id];               },
        getModels:    function()         { return this._models;                         },
        canvas:       function(id) { return this._canvases[id];               },
        getCanvases:  function()         { return this._canvases;                         },
        getDefaultCanvas:    function()  { for (var i in this._canvases) return this._canvases[i]; },

        enableControls: function()       { this._views['default'].enableControls(); },
        disableControls: function()      { this._views['default'].disableControls(); },

        createWebGLCanvas: function() {

            var canvas = new SV.Canvas(this);
            this._canvases[canvas.getID()] = canvas;

            return canvas.getID();
        },

        loadSimulation: function(path){

            this.stopAnimation();

            var old_view = this._views['default'];
            if(old_view != null) old_view.destroy();
            var old_model = this._models['default'];
            if(old_model != null) old_model.destroy();

            var canvas = this.getDefaultCanvas();

            var view = new SV.Scene(this);
            var model = new SV.SceneModel(path, view);

            if(SV.editor_xml) {
                SV.editor_xml.destroy();
            }
            SV.editor_xml = new SV.Editor(model);


            this._models['default'] = model;
            this._views['default'] = view;

            // TODO there might be a race condition here
            canvas.updateSize();
            this._ready = true;
        },

        setAnimationSpeed: function(speed){
            var view = this._views['default'];
            var canvas = this.getDefaultCanvas();

            var last_speed = view.getSpeedFactor();
            canvas.clock.elapsedTime = canvas.clock.elapsedTime / speed * last_speed;

            view.setSpeedFactor(speed);
        },

		setAnimationTime: function(time){
            var view = this._views['default'];
            var canvas = this.getDefaultCanvas();
            // TODO this breaks incapsulation
            canvas.clock.elapsedTime = time /  view.getSpeedFactor();
        },
		
        startAnimation: function(){
            var canvas = this.getDefaultCanvas();
            canvas.startAnimation();
        },
		
		stopAnimation: function(){
            var canvas = this.getDefaultCanvas();
            canvas.stopAnimation();
        },

//        createBaseScene: function(){
//            var canvas = this.getDefaultCanvas();
//            //for (var i in this._canvases) canvas = this._canvases[i];
//
//            var scene = new SV.Scene(this);
//            scene.addAxes();
//            scene.loadGeometryFromFile("samples/spinning_wheel.xml");
//            //scene.addGround();
//            scene.attachCamera( canvas.getCamera() );
//            this._scenes['default'] = scene;
//        }
    });

})(jQuery);
