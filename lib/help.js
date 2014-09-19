var tools = require('./tools');

/* returns a fixed width padded string */
String.prototype.pad = function(justify,chr) {
    var str, 
  	args, 
  	width = Math.abs(justify), 
  	chr = chr || ' ', 
  	a, b;
    
    args = this.split('');
    args.unshift(this.length);
    
    if(justify >= 0) args.unshift(0);
    else args.unshift(width-this.length); 

    str = new Array(width);
    /* apply padding from a to b */
    a = justify < 0 ? 0 : this.length;
    b = justify < 0 ? width-this.length : width;
    
    for(var i = a; i < b; i++) str[i] = chr; 
    
    [].splice.apply(str,args);

    return str.join('');
};


function help(path) {
    var h = "", p, ctx;

    if(typeof path === 'string') {
        path = path.replace(/\s?\?$/,'');
        path = tools.trim(path);
    }

    ctx = Program.$(path);

    if(typeof ctx !== 'function') {
        p = getSubNodes(ctx);
	if(Array.isArray(p)){
	    p.forEach(function(node){
		h += node['#'].pad(-20) + ": " + node['?'] + "\n";
            });
	} else {
	    h += ctx['#'].pad(-20) + ": " + ctx['?'] + "\n";
	}
    } else {
    	p = tools.split(path);
    	if(p.length === 0 || ctx['#'] === p[p.length-1]) {
    	    h += ctx['&'].length ? helpParams(ctx['&']) : "".pad(-20) + ctx['?'] + "\n";
    	} else {
    	    h += helpParams(ctx['&'].map(function(m){ 
    		return Object.keys(m)[0] === p[p.length-1] ? m : null; 
    	    }));
    	}
    }

    function helpParams(params){
        var o,p,t,v,y,z,s = "";
        
        if(typeof params === 'string') return params;

        params.forEach(function(param){
            /* filter '?' and '' keys */
            o = Object.keys(param).filter(function(f){return !!f && f !=='?';})[0];
            p = param[o];
            if(typeof p === 'object') {
                /* type */
                t = Object.keys(p)[0];
                /* value */
                v = p[t];
                y = "<" +t + (v ? '[' + v + ']' : '') + ">";  
            } else y = '';
            /* mandatory option without a default value */
            if(param[""] === undefined) z = "(*) ";
            else z = param[""] ? '('+param[""]+') ' : ' ';
            s += (o + z + y).pad(-40) + ": " + param['?'] + "\n";
        });
        return s;
    }

    return h;
}

function getSubNodes(context){
    return Object.keys(context)
        .filter(function(node){return context[node].hasOwnProperty('#');})
        .sort(sortNode,context)
        .map(function(node) { return context[node]; });
}

function sortNode(v1,v2){

    var t1 = typeof this[v1],
        t2 = typeof this[v2];

    if(t2 > t1) return 1;
    if(t2 < t1) return -1;

    return v1 > v2 ? 1 : -1;
} 

Object.defineProperty(Program,'?',{
    enumerable: false,
    writable: false,
    value: help
});
