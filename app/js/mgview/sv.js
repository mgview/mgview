//Copyright 2012-2013 Adam Leeper. All Rights Reserved.

var SV = {};

(function($) {

    SV = Class.extend({

        $: function(alias, selector) {
            this._DOMCache = this._DOMCache || {};
            if (!_.isUndefined(selector)) {
                if (selector == null) {
                    delete this._DOMCache[alias];
                }
                else {
                    this._DOMCache[alias] = $(selector);
                }
            }
            return this._DOMCache[alias] || $;
        },

        init: function() {        },

        run: function() {
            if (!this.checkCapabilities()) {
                return;
            }

            var logLevel = getQuerystring("verbose", null);
            if(logLevel == null)  logLevel = 1;
            else                  logLevel = parseInt(logLevel);
            console.log(vsprintf("Setting log level to %d", [logLevel]));
            setLoggerLevel(logLevel);


            this.$('SV', $('#SV').eq(0));
            //this.$('SV').on( 'contextmenu', function ( event ) { event.preventDefault(); } );

            this.$('Topbar',        this.$('SV').find('#Topbar').eq(0));
            this.$('MainContent',   this.$('SV').find('#MainContent').eq(0));
            this.$('Sidebar',       this.$('MainContent').find('#Sidebar').eq(0));
            this.$('RenderWindow',  this.$('MainContent').find('#RenderWindow').eq(0));


            this.$('TimeButton', this.$('Topbar').find('#time_button').eq(0));

            this.$('Start',  this.$('Topbar').find('#animation_start_button').eq(0));
            this.$('Stop',   this.$('Topbar').find('#animation_stop_button').eq(0));
            this.$('Load',   this.$('Topbar').find('#model_load_button').eq(0));

            this.$('TimeWidget',  this.$('Topbar').find('div>div.scrubWidget').eq(0));
            this.$('SpeedWidget', this.$('Topbar').find('div>div.scrubWidget').eq(1));

            // Initialize GUI jQuery tools elements:
            $( "#time_scrub" ).slider({
                min: 0,
                max: 20,
                value: 0,
                step: 0.001,
                slide: function(event, ui) {
                    SV.World.setAnimationTime(ui.value);
                }
            });
            $( "#speed_scrub" ).slider({
                min: 0.1,
                max: 5,
                value: 1,
                step: 0.1,
                slide: function(event, ui) {
                    SV.World.setAnimationSpeed(ui.value);
                    $( "#speed_text").val(ui.value);
                }
            });

            this.$('FixedFrameSelect', $("#fixedFrameSelect").eq(0));

            this.$('VisualizerObjects', $("#visualizerObjects").eq(0));

            // Setup base world
            SV.World = new SV.World();
            SV.World.createWebGLCanvas();

            var path = getQuerystring('path');
            if(path !== undefined)
            {
                console.log(vsprintf("Found query path [%s].", [path]));
                document.getElementById('scenefile_input').value = path;
            }

//            //Ensure camera movement only occurs when clicking in the render view.
//            this.$('RenderWindow').on( {
//                mouseover:  function(event) {
//                    SV.World.enableControls();
//                },
////                mousemove:  function(event) {
////                    SV.World.enableControls();
////                },
//                mouseout: function(event) {
//                    SV.World.disableControls();
//                }
//            });


            this.$('TimeButton')
//                .button({
//                icons: {
//                    primary: "ui-icon-plus"
//                },
//                text: false
//                })
                .on({
                click: function(event) {
                    //console.log("Clicked start!");
                    if( $(this).hasClass("btn-success")) {
                        SV.World.startAnimation();
                    }
                    else {
                        SV.World.stopAnimation();
                    }
                    $(this).toggleClass("btn-success btn-danger");

                    return false;
                }
            });

//            this.$('Stop').bind({
//                click: function(event) {
//                    //console.log("Clicked stop!");
//                    SV.World.stopAnimation();
//                    return false;
//                }
//            });

            self = this;
            this.$('Load').bind({
                click: function(event) {
                    self.loadScene();
                }
            });

            // Load the scene for the first time
            if(getQuerystring('load') !== undefined)
            {
                console.log("Loading scene by default.");
                this.loadScene();
            }

            //this.$('Load').bind({
            //    click: function(event) {
            //        	var button = $('#button1'), interval;
            /*
                        new AjaxUpload(this.$('Load'),{
                            //action: 'upload.htm', 
                            name: 'myfile',
                            onSubmit : function(file, ext){
                                console.log(vsprintf("using file path: [%s]",[file]) + "   " + ext);
                                
                                //SV.World = new SV.World();
                                //SV.World.createWebGLCanvas();
                                //SV.World.loadSimulation(path);                    
                               
                            },
                            onComplete: function(file, response){
                                console.log("onComplete()");
                                ////button.text('Upload');            
                                //window.clearInterval(interval);
                                //// enable upload button
                                //this.enable();
                                //// add file to the list
                                //$('<li></li>').appendTo('#example1 .files').text(file);
                            }
                        });
                        
                        */
            //        return false;
            //    }
            //});

        },

        loadScene: function(){

            var path = document.getElementById('scenefile_input').value;
            if(path == "") {
                alert("Please type the (relative) path to your .json file in the text field.");
                return;
            }
            if(THREEal.getFileExtension(path) !== 'json') {
                alert('Expected a file extension of type "json".');
                return;
            }

            console.log(vsprintf("The path is [%s].", [path]));

            if(SV.World.name !== undefined){
                SV.World = new SV.World();
                SV.World.createWebGLCanvas();
            }
            SV.World.loadSimulation(path);
            SV.World.setAnimationTime(0);
        },

        checkCapabilities: function() {
            var missing = [];
            if (!Modernizr.canvas)     { missing.push('canvas');     }
            if (!Modernizr.websockets) { missing.push('websockets'); }
            if (!Modernizr.webgl)      { missing.push('webgl');      }

            if (missing.length > 0)
            {
                var missing_str = '';
                for (var i = 0; i < missing.length; ++i) {
                    if (i != 0) { missing_str += ', '; }
                    missing_str += missing[i];
                }
                var message =       'This application is designed to run on Chrome (or Firefox).'
                              +   '\nIt requires HTML 5 capabilities such as WebGL.'
                              + '\n\nYour browser is missing: \n' + missing_str + '.';
                alert(message);
                return false;
            }
            return true;
        }
    });

    SV = new SV();

})(jQuery);
