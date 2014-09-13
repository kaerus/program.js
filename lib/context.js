var tools = require('./tools');


/* create and return node context */
/* $(name,description) */
/* $(function,name,help) */
/* $(context,function,name,help) */
function context(){
    var ctx = this, path, func, help, options = [].slice.call(arguments);

    /* return context */
    if(!options.length) return this;

    /* $([context],[func],[path],[help],[func],[options...]) */
    if(typeof options[0] === 'object') ctx = options.shift();
    if(typeof options[0] === 'function') func = options.shift();
    if(typeof options[0] === 'string') path = options.shift();
    else if(Array.isArray(options[0])) path = opions.shift().join(' ');
    if(typeof options[0] === 'string') help = options.shift();
    if(!func && typeof options[0] === 'function') func = options.shift();

    /* lookup and return context */
    if(!func && !help){
        if(!path) return this;

        path = tools.split(path);

        for(var p = path.shift(); ctx.hasOwnProperty(p); p = path.shift()){
            ctx = ctx[p];
        }

        return ctx;
    }

    if(func) {
    	/* create function scope */
    	function scoped(params,args,scope){

    		func.apply(scope,[params,args]);
    	}
        /* add function */
        Object.defineProperty(this,path,{
            enumerable: true,
            writable: false,
            value: scoped
        });

        /* add options */
        Object.defineProperty(this[path],'&',{
            enumerable: false,
            writable: false,
            value: options
        });

    } else {
        /* add node */
        this[path] = tools.extend({},ctx);
    }

    /* add name hash key */
    Object.defineProperty(this[path],'#',{
        enumerable: false,
        writable: false,
        value: path
    });

    /* add reference to parent */
    Object.defineProperty(this[path],'@',{
        enumerable: false,
        writable: false,
        value: this
    });

    /* allow chaining by $ */
    Object.defineProperty(this[path],'$',{
        enumerable: false,
        writable: false,
        value: Function.prototype.call.bind(context,this[path])
    });
        
    /* Add a help string */
    if(help){
        Object.defineProperty(this[path],'?',{
            enumerable: false,
            writable: false,
            value: help
        });
    }

    return this[path];
}



var context_nodes = {};
/* bind $() to context nodes */
Program.$ = Function.prototype.call.bind(context,context_nodes);