/**
 * @license MIT, http://opensource.org/licenses/MIT
 * @author Adam Leeper, https://github.com/aleeper
 */

(function($) {

    SV.Editor = SV.Class.extend({

        init: function(sceneModel) {
            console.log("Creating editor for Model");

            var self = this;

            this.isOpen = false;
            this._sceneModel = sceneModel;
            this._name = 'default';

            SV.$('SV').append(
                        '<div id="model_editor" title="Model Editor">'
                    +   '   <textarea id="code" name="code">'
                    +   '   </textarea>'
                    +       '<div id="editorToolbar" class="ui-widget-header ui-corner-all">'
                    +   '       <button class="editorButton" id="editor_undo" value="undo">undo</button> '
                    +   '       <button class="editorButton" id="editor_redo">redo</button> '
                    +   '       <button class="editorButton" id="editor_update_model">Apply</button> '
                    +   '       <div id="download_model_container" class="FloatRight FullHeight">'
                    +   '           <div class="verticalDivider FloatLeft"></div>'
                    +   '       <div id="download_model_link" class="ui-button editorButtonDownload" >(Click Apply<br/>to Save)</div>'
                    +   '       </div>'
                    +   '   </div>'
                    +   '</div>'
            );

            var dialog = $( '#model_editor' );
            this.dialog = dialog;
            dialog.dialog({
                autoOpen: false,
                closeOnEscape: true,
                width: 600,
                height: 400,
                minWidth: 500,
                //maxWidth: 600,
                //minHeight: 250,
                show: {
                    effect: "blind",
                    duration: 100
                },
                hide: {
                    effect: "blind",
                    duration: 100
                }
            }).on({
                    dialogopen: function(event, ui) {
                        self.editor.setSize(null, $(this).height() - $("#editorToolbar").height() - 5 );
                        self.isOpen = true;
                    },
                    dialogresize: function(event, ui) {
                        self.editor.setSize(null, $(this).height() - $("#editorToolbar").height() - 5 );
                    },
                    dialogclose: function(event, ui) {
                        self.isOpen = false;
                    }
                }
            );

            var code_area = dialog.find('#code');
            this.editor = CodeMirror.fromTextArea(
                code_area.get(0),
                {
                    //mode: "javascript",
                    //styleActiveLine: true,
                    lineNumbers: true,
                    lineWrapping: true,
                    value: 'Your text here'
                });
            this.editor.setSize(null, 500);

            dialog.dialog("close");

            dialog.find('#editor_undo').button({
                icons: {
                    secondary: "ui-icon-arrowreturnthick-1-w"
                },
                text: true
            }).on("click", function(){
                    self.editor.undo();
                });

            dialog.find('#editor_redo').button({
                icons: {
                    secondary: "ui-icon-arrowrefresh-1-s"
                },
                text: true
            }).on("click", function(){
                    self.editor.redo();
                });

            dialog.find('#editor_update_model').button({
                icons: {
                    //primary: "ui-icon-blank"
                },
                text: true
            }).on("click",
                function(){
                    self.applyModelUpdate();
                });

            this.hlLine = this.editor.addLineClass(0, "background", "activeline");

            this.editor.setOption("theme", "blackboard");

            this.editor.on("cursorActivity", function() {
                var cur = self.editor.getLineHandle(self.editor.getCursor().line);
                if (cur != self.hlLine) {
                    self.editor.removeLineClass(self.hlLine, "background", "activeline");
                    self.hlLine = self.editor.addLineClass(cur, "background", "activeline");
                }
            });

        },

        destroy: function() {
            console.log("Destroying object dialog!");
            this.dialog.dialog("destroy").remove();
        },

        applyModelUpdate: function() {
            var input_string = this.editor.getValue();
            var output_string = jsl.format.formatJson(input_string);
            try {
                var model_string = jsl.parser.parse(output_string);
                this._sceneModel.loadFromModel(model_string);
            } catch(err) {
                alert(err);
            }
        },

        updateDownloadLink: function() {
            var download_string = "data:application/octet-stream,"+encodeURIComponent(this.editor.getValue());
            var container = $("#download_model_container");
            container.find('#download_model_link').remove();
            container.append(
                '<a id="download_model_link" class="ui-button" href="'
                    + download_string + '" download="' + this._name + '.json">Save</a>'
            );
        },

        setText: function(title, text) {
            //if(!this.isOpen)
            //      return;
            this._name = title;
            this.editor.setValue(text);
            this.updateDownloadLink();
        },

        randomFunc: function() {

        }

    });

})(jQuery);