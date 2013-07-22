
(function($) {

    SV.Class = Class.extend({

        $: function(alias, selector) {
            if (!this._DOMCache) {
                this._DOMCache = {};
            }

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

        _guid: function() {
            if (!this.__guid) {
                this.__guid = $.uid();
            }
            return this.__guid;
        },

        bind:    function(arg1, arg2, arg3) { SV.bind   (this, arg1, arg2, arg3); },
        unbind:  function(arg1, arg2)       { SV.unbind (this, arg1, arg2);       },
        trigger: function(arg1, arg2, arg3) { SV.trigger(this, arg1, arg2, arg3); }
    });

})(jQuery);