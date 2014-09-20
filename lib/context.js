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
    if(options[0] === undefined) options.shift();
    else if(typeof options[0] === 'object' && !Array.isArray(options[0])) ctx = options.shift();
    if(typeof options[0] === 'function') func = options.shift();
    if(typeof options[0] === 'string') path = options.shift();
    else if(Array.isArray(options[0])) path = options.shift().join(' ');
    if(typeof options[0] === 'string') help = options.shift();
    if(!func && typeof options[0] === 'function') func = options.shift();

    /* lookup and return context */
    if(!func && !help){
        if(!path) return ctx;

        path = tools.split(path);

        for(var p = path.shift(); ctx.hasOwnProperty(p); p = path.shift()){
            ctx = ctx[p];
        }

        return ctx;
    }

    if(func) {
    	/* create function scope */
    	var scoped = function(params,args,scope){
    	    return func.apply({$:scope},[params,args]);
    	};

        /* add function */
        Object.defineProperty(ctx,path,{
            enumerable: true,
            writable: false,
            value: scoped
        });

        /* add options */
        Object.defineProperty(ctx[path],'&',{
            enumerable: false,
            writable: false,
            value: options
        });

    } else {
        /* add context node */
        ctx[path] = {};
    }

    /* add name hash key */
    Object.defineProperty(ctx[path],'#',{
        enumerable: false,
        writable: false,
        value: path
    });

    /* add reference to parent */
    Object.defineProperty(ctx[path],'@',{
        enumerable: false,
        writable: false,
        value: ctx
    });

    /* allow chaining by $ */
    Object.defineProperty(ctx[path],'$',{
        enumerable: false,
        writable: false,
        value: Function.prototype.call.bind(context,ctx[path])
    });
    
    /* Add a help string */
    if(help){
        Object.defineProperty(ctx[path],'?',{
            enumerable: false,
            writable: false,
            value: help
        });
    }

    return ctx[path];
}

/* search context */
Program.findContext = function(path,ctx){
    path = typeof path === 'string' ? path.split(' ') : path;
    
    var search = path.splice(path.length-1,1)[0];

    ctx = Program.$(ctx,path);

    return Object.keys(ctx).filter(function(f){        
        return search ? (ctx[f]['#'].indexOf(search) === 0 ? ctx[f] : undefined) : ctx[f];        
    }); 
};


var context_nodes = {};


/* bind $() to context nodes */
Program.$ = Function.prototype.call.bind(context,context_nodes);
