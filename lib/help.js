
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
}


function help(path) {
    var help = "",
        ctx = Program.$(path);

    if(typeof ctx !== 'function') {
        getSubNodes(ctx).forEach(function(node){
            help += node['#'].pad(-20) + ": " + node['?'] + "\n";
        });
    } else {
    	help += helpParams(ctx['&']);
    }

    function helpParams(params){
        var o,p,t,v,y,z, h = "";
        
        if(typeof params === 'string') return params;

        params.forEach(function(param){
            /* filter '?' and '' keys */
            o = Object.keys(param).filter(function(f){return !!f && f !=='?'})[0];
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
            h += (o + z + y).pad(-40) + ": " + param['?'] + "\n";
        });
        return h;
    }

    return help;
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
