/* Some helper functions for parsing XML
 * By Adam Leeper adamleeper@gmail.com
 * *THIS FILE* is BSD Licensed.
 */

/**
 * Gets a named attribute from an XML element.
 * @param object The XML object to use.
 * @param name   The attribute to look up.
 * @param dflt   The value to return if name is not found as an attribute.
 */
function getXmlAttributeWithDefault(object, name, dflt) {
    var text = object.attr(name);
    if(text == null) text = dflt;

    return text;
}
