//Copyright 2012-2013 Adam Leeper. All Rights Reserved.

(function($) {

    SV.Canvas = SV.Class.extend({
        init: function(world) {
            this._world = world;
            console.log("Adding canvas");
            var html = $('<div/>').uid().addClass('WebGLCanvasContainer');
            this._id = html.attr('id');
            SV.$('RenderWindow').append(html);
            this.$('self', $('#' + this._id));
            this._container = this.$('self').get(0);


            if(getQuerystring("stats") ) {
                this.stats = new Stats();
                SV.$('Topbar').get(0).appendChild( this.stats.domElement );
            }


            var now = new Date().getTime();
            this._frameCount         = 0;
            this._lastFrame          = now;
            this._lastSelectionFrame = now;

            this._animate = false;

            this._meshIndices = {};


            // Make sure resolution is correct

            var renderer = new THREE.WebGLRenderer( { clearColor: 0xffffff, clearAlpha: 1, antialias: true } );
            renderer.setClearColorHex( 0xe0f0ff, 1 );
            //renderer.setClearColorHex( 0xeeeeee, 1 );
            renderer.sortObjects = false;
            renderer.autoClear = false;
            this._container.appendChild( renderer.domElement );
            $('canvas').addClass('WebGLCanvas');
            this._context = renderer.domElement;
            this.renderer = renderer;
            this.updateSize();

            this.enableSelection();

            this.clock = new THREE.Clock(false);
            var self = this;
            this.updateSize();
            setTimeout(function() { self.updateSize(); },  200);
            setTimeout(function() { self.updateSize(); }, 1000); // @hack: needed
            setTimeout(function() { self.updateSize(); }, 2000);
            setTimeout(function() { self.updateSize(); }, 4000);
            window.addEventListener( 'resize',
                function()
                {
                    self.updateSize();
                }
                , false );

            (function animloop() {
                requestAnimFrame(animloop, self.$('self').get(0));
                self._tick(self);
            })();

        },

        destroy: function() {
            this.self().remove();
        },

        self:                function() { return this.$('self'); },
        getID:               function() { return this._id;       },
        getWorld:            function() { return this._world;    },

        updateSize: function() {
            if (this._id) {
                //console.log("Updating the size!");
                this.setSize({ width: this.$('self').width(), height: this.$('self').height() });
            }
        },

        setSize: function(size) {
            if (!this._size) {
                this._size = { width: null, height: null };
            }
            $.extend(this._size, size);
            this.resizeGL();
        },

        resizeGL: function(){
            var size = this._size;

            if(this.renderer) {
                this.renderer.setSize( size.width, size.height );
            }
            if(this._world){
                var views = this._world.getViews();
                for (var i in views){
                    views[i].setCameraAspect(size.width / size.height);
                    //scenes[i]._camera.aspect = size.width / size.height;
                    //this.camera.updateProjectionMatrix();
                }
            }
        },

        getSize:    function() { return this._size;    },
        getContext: function() { return this._context; },

        isSelectionEnabled: function() { return this._enableSelection; },
        enableSelection:    function() { this._enableSelection = true; },
        disableSelection:   function() { this._enableSelection = false; this._meshIndices = {}; },

        startAnimation: function(){
            this.clock.start();
        },

        stopAnimation: function(){
            console.log("Stopping animation!");
            this.clock.stop();
        },

        // renderer
        setBackgroundColor: function(hex, alpha){
            if( alpha == null ) alpha = 1;
            this.renderer.setClearColorHex( hex, alpha );
        },

        // TODO camera tweens?

        _tick: function(self) {
            //var delta = this.clock.getDelta();
            var elapsed = this.clock.getElapsedTime();

            this.renderer.clear();
            var views = this._world.getViews();
            for (var i in views){
                views[i].updateCameraAndControls();
                //console.log("elapsed "+elapsed);
                if( views[i].setAnimationTime(elapsed) === false) {
                    this.stopAnimation();
                    this.clock.elapsedTime = this._oldTime;
                    return;
                } else {
                    // TODO this will break with more than one view...
                    this._oldTime = elapsed;
                }

                views[i].render(this.renderer);
            }
            if(this.stats !== undefined)
                this.stats.update();
        }
    });

})(jQuery);
