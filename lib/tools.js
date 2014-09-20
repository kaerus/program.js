
/* 	
 Whitespace splits a quoted string, grabbed somewhere from stackoverflow 
 Example:
 'hello "I'm a quoted" string' -> ['hello','"I'm a quoted"','string'] 
 Description:
 (?:         # non-capturing group
   [^\s"]+   # anything that's not a space or a double-quote
   |         #   or…
   "         # opening double-quote
     [^"]*   # …followed by zero or more chacacters that are not a double-quote
   "         # …closing double-quote
 )+          # each mach is one or more of the things described in the group
*/
var split_ex = /(?:[^\s"]+|"[^"]*")+/g;

module.exports.split = function(s){
    var r = s;

    if(typeof s === 'string') 
	r = s.match(split_ex);

    return r;
}

/* trims whitespace and ignores commented lines */
module.exports.trim = function(str){
    var line = String.prototype.trim.call(str);
    // commented
    if(line[0] === '#') return "";
    
    return line;
}

/* extends object */
function extend() {
    var deep = false,
        source, target,
        key, i = 0,
        l = arguments.length;

    if (typeof arguments[i] === "boolean") deep = arguments[i++];

    target = arguments[i++];

    if (l <= i) return extend(deep, {}, target);

    while (i < l) {
        source = arguments[i++];

        for (key in source) {
            if (typeof source[key] === 'object' && source[key] != null) {
                if (deep) {
                    if (target.hasOwnProperty(key)) extend(true, target[key], source[key]);
                    else target[key] = extend(true, {}, source[key]);
                } else target[key] = source[key]; 
            } else if(source[key] !== undefined) target[key] = source[key];
        }
    }

    return target;
}

module.exports.extend = extend;
