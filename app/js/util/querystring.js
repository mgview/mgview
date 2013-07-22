/**
 * Parses a value from the URL's querystring
 * @param name The key to lookup in the querystring
 * @param dflt The value to return if name is not specified in the querystring
 */
function getQuerystring(name, dflt) {
    var params = {};

    var qs = location.search.substring(1, location.search.length);

    if (qs.length > 0) {
        qs = qs.replace(/\+/g, ' ');
        var args = qs.split('&');
        for (var i = 0; i < args.length; i++) {
            var pair = args[i].split('=');
            var n = decodeURIComponent(pair[0]);

            var val = (pair.length == 2) ? decodeURIComponent(pair[1]) : n;

            params[n] = val;
        }
    }

    if (name in params) {
        return params[name];
    }
    else {
        return dflt;
    }
}
