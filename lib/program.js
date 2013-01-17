/* 
 * Copyright (c) 2012 Kaerus (kaerus.com), Anders Elo <anders @ kaerus com>.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

/* singleton */
Program = {prompt:""};

Program.run = function(input,output,trace){

    if(typeof output !== 'object') {
        trace = output;
        output = undefined;
    }

    if(typeof input === 'string') {
        /* multiline programs */
        input = input.split(/\r?\n/);
        input.forEach(processLine);
    } else if(isArray(input)) {
        /* process argv */
        input = input.join(' ').split(';');
        input.forEach(processLine); 
    } else if(typeof input === 'object') {
        /* input/output stream */
        input.on('data',processBuffer);
        if(!output) {
            if(input.constructor.name === "ReadStream")
                output = process.stdout;
            else output = input;
        }
    } else throw new Error("Can not process input type:", typeof input); 

    var buf = [], cc;
    function processBuffer(str){
        if((cc = str.charCodeAt(0)) === 0) {
            if(buf.length > 0) {
                str = buf.join('').toString();
                processLine(str);
            }   
            buf = [];
            output.write(Program.prompt);
        } else {
            if(cc === 0x7f) {
                /* backspace */
                if(buf.length) { 
                    buf.length--;
                    output.write("\b \b");
                }  
            }
            else if(cc > 15) {
                buf[buf.length] = str;
                output.write(str);
            }    
            else if( cc === 0x09 ) {
                /* tab */
            }
            if(cc === 0x0d) {
                /* newline */
                output.write("\n");
            }
            else output.write('^'+String.fromCharCode(cc+64)+'\n');
        }    
    }

    function processLine(line) {
        var command, n;

        /* line must be a string */
        if(typeof line !== 'string') return;
        /* trim whitespace */
        line = line.replace(/^\s*/,'').replace(/\s*$/,'');
        /* trim comments */
        line = line.replace(/^#.*/,'').replace(/\s?;.*/,'');
        /* skip empty lines */
        if(!line) return;

        try {
            command = parse(line);
        } catch(err) {
            return handleError(err);
        }  
    }

    function handleError(error) {
        try{
            this.error(error);
        } catch(e) {
            console.error(trace ? error.stack : "Error: " + error.message);
        }

        return error.code;    
    }    
};

function helper(path) {
    if(typeof path === 'string') {
        path = path.replace(/\s?\?$/,'');
        path = path.split(' ');
    }

    var help = getHelp(path);
    try{
        /* user defined help output */
        Program.help(path.join(' '),help);
    } catch(e){
        /* default help output */
        console.log(help);
    }    
}

/* get path by context */
function getPath(context){
    var path;

    if(context['#']){
        path = [context['#']];
        for(var c = context['@']; c; c = c['@']) {
            if(c['#']) path.push(c['#']);
        }   
        path = path.reverse();
    }

    return path;
}

function parse(path,context) {
    var node, args, params;

    if(typeof path === 'string') {
        if(path[path.length-1]==='?')
            return helper(path);
        path = path.split(' ');
    }

    if(context) path.unshift(getPath(context));
    
    node = path.reduce(function(c,n) {
        return c.hasOwnProperty(n) ? c[n] : c;
    },Program);

    if(!node) throw "No match on: " + path.join(' ');
    
    if(args = getPath(node)){
        args = path.slice(args.length);
    }
    
    if(typeof node === 'function') {
        params = getParams(node,args);
        node(params,args);
    } else {
        return helper(path);
    }  
}

function getParams(node,args) {
    var options = node['&'], 
        i, l, o, v, e, params = {$:[node['#']]};

    /* option-1, option-2=arg-2 ...+ args */
    for(var j = 0, m = options.length; j < m; j++) {
        if(typeof options[j] !== "object") {
            /* pass through option */
            params.$.push(options[j]);
            continue;
        }    
        o = Object.keys(options[j]).filter(function(f){if(f) return f})[0];
        v = undefined;
        /* search for param */  
        for(i = 0, l = args.length; i < l; i++){
            if(args[i].indexOf(o) === 0){
                /* value option */
                if(typeof options[j][o] !== 'object') {
                    args.splice(i,1);
                    v = true;
                }
                /* with or without '=' */
                else if((e = args[i].indexOf('=')) < 0){
                    v = args[i+1];
                    args.splice(i,2);
                } else {
                    v = args[i].substr(e+1);
                    args.splice(i,1);
                } 
                break;
            }
        }
        try {
            params[o] = evaluateOption(options[j],v);
        } catch(error){
            var type = typeof options[j][o] === 'object' ? ' <'+Object.keys(options[j][o])[0]+'>' : '';  
            throw new Error(o + type + ': ' + error.message);
        }    

    }

    return params;
}

/* {option:"value","?":"help"} */
/* {option:"value","":"default","?":"help"} */
/* {option:{"type":"values"},"?":"help"} */
/* {option:{"type":"values"},"":"default","?":"help"} */

function evaluateOption(option,value){
    var o = Object.keys(option).filter(function(f){if(f)return f})[0];

    if(typeof option[o] !== 'object') {
        if(!value) { 

            if(!option.hasOwnProperty(""))
                throw new Error(option["?"] || 'missing');

            return option[""];
        }
        /* return option value */
        return option[o];
    } else if(!value) {
        /* no default value */
        if(!option.hasOwnProperty(""))
            throw new Error(option["?"] || 'missing');
        
        return option[""]; 
    } else {
        /* option type and value */
        var type = Object.keys(option[o]).filter(function(f){if(f)return f})[0];
        var v1 = o[type], v2;

        switch(type){
            case 'int':
            case 'integer':
                v2 = parseInt(value,10);
                if(isNaN(v2)) throw new Error(value);
                break;  
            case 'hex':
            case 'hexadecimal':
                v2 = parseInt(value,16);
                if(isNaN(v2)) throw new Error(value);
                break;
            case 'oct':
            case 'octal':
                v2 = parseInt(value,8);
                if(isNaN(v2)) throw new Error(value);
                break;
            case 'bin': 
            case 'binary':
                v2 = parseInt(value,2);
                if(isNaN(v2)) throw new Error(value);
                break;                  
            case 'dec':
            case 'decimal':
                v2 = parseFloat(value); 
                if(isNaN(v2)) throw new Error(value);
                break;
            case 'str': 
            case 'string':
                v2 = value.toString();
                if(!v2) throw new Error(value);
                break;
            case 'bool':
            case 'boolean':
                v2 = value.toString().toLowerCase();
                try { 
                    v2 = !!JSON.parse(v2);
                } catch (e) {
                    if(v2 === 'on') v2 = true;
                    else if( v2 === 'off') v2 = false;
                    else throw new Error(value);
                }           
                break;
            case 'ipv4':
                v2 = value.match("^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$");
                if(v2) v2 = v2[0];
                else throw new Error(value);
                break;
            case 'ipv6':
                v2 = value.match(/^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i);
                if(v2) v2 = v2[0];
                else throw new Error(value);
                break;
            case 'host':    
            case 'hostname':
                v2 = value.match("^(?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?)*\.?$");
                if(v2) v2 = v2[0];
                else throw new Error(value);
                break;  
            case 'url':
            case 'href':
                v2 = value.match(/^(?:([A-Za-z]+):)?(\/{0,3})(?:([^\x00-\x1F\x7F:]+)?:?([^\x00-\x1F\x7F:]*)@)?([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^\x00-\x1F\x7F]+))?$/);
                if(v2) v2 = v2[0];
                else throw new Error(value);
                break;
            case 'json':
                try {
                    v2 = JSON.parse(value);
                } catch(e) {
                    throw new Error(e.message+' ('+value+')');
                }    
                break;    
            default:
                throw new Error("unknown type " + o);
                break;                  
        }

        if(v1){
            if(isArray(v1)) {
                v1.forEach(function(v){
                    if(isNaN(v2)) if(v === v2) return v2;
                    else if(Number(v) === v2) return v2;
                });
            } 
            else {
                if(isNaN(v2)) if(v === v2) return v2;
                else if(Number(v) === v2) return v2;    
            }

            throw new Error("value mismatch " + value);
        }
        return v2;
    }   
    
}

/* create and return node context */
/* $("name","description") */
Program.$ = function(){
    var context, name, func, help, options = Array.prototype.slice.call(arguments);

    if(typeof options[0] === 'object') context = options.shift();
    if(typeof options[0] === 'function') func = options.shift();
    if(typeof options[0] === 'string') name = options.shift();
    if(typeof options[0] === 'string') help = options.shift();

    if(!name) throw new Error("Missing name argument");

    /* return context. */
    /* Note: name could be a path here */
    if(!func && !help) return getContext(name);

    if(func) {
        /* bind func to context */
        var bind = new Function("func","context",
            "return function " + name + "(){ return func.apply(context,Array.prototype.slice.call(arguments)) }");

        /* add function */
        Object.defineProperty(this,name,{
            enumerable: true,
            writable: false,
            value: bind(func,context)
        });

        /* add options */
        Object.defineProperty(this[name],'&',{
            enumerable: false,
            writable: false,
            value: options
        });

    } else {
        /* add node */
        this[name] = extend({},context);
    }

    /* add name hash key */
    Object.defineProperty(this[name],'#',{
        enumerable: false,
        writable: false,
        value: name
    });

    /* add reference to parent */
    Object.defineProperty(this[name],'@',{
        enumerable: false,
        writable: false,
        value: this
    });

    /* allow chaining by $ */
    Object.defineProperty(this[name],'$',{
        enumerable: false,
        writable: false,
        value: Function.prototype.call.bind(Program.$,this[name])
    });
        
    /* Add a help string */
    if(help){
        Object.defineProperty(this[name],'?',{
            enumerable: false,
            writable: false,
            value: help
        });
    }

    return this[name];
}

/* extends object */
function extend() {
  var deep = false, target, i = 0;
  if(typeof arguments[i] === "boolean") deep = arguments[i++];
  target = arguments[i++] || {};
  
  for(var source; source = arguments[i]; i++){    
    target = Object.keys(source).reduce(function(obj,key) {
      if(source.hasOwnProperty(key)) {  
        if(typeof source[key] === 'object') {
          if(deep) obj[key] = extend(true,obj[key],source[key]);
        } else if(source[key]) obj[key] = source[key];
      }    
      return obj;
    }, target);
    
  }
  
  return target;
}

function isArray(a) {
    return Object.prototype.toString.call(a) === '[object Array]'
}

/* get context by path */
function getContext(path) {
    
    if(!path) return undefined;

    if(typeof path === 'string') {
        path = path.split(' ').filter(function(f){if(f) return f});
    }

    return path.reduce(function(c,n){
        return c.hasOwnProperty(n) ? c[n] : c;
    },Program);
}

/* search context */
function findContext(path){
    var search, context;

    search = path[path.length-1];

    context = getContext(path); 

    if(typeof context === 'function') return context;

    return Object.keys(context).filter(function(f){
                if(context[f]['#']) return (search ? f.indexOf(search) === 0 : 1)
            }).sort().map(function(c){
                return this[c];
            },context); 
}

function sortNode(v1,v2){

    var t1 = typeof this[v1],
        t2 = typeof this[v2];

    if(t2 > t1) return 1;
    if(t2 < t1) return -1;

    return v1 > v2 ? 1 : -1;
}   

function getSubNodes(context){
    return Object.keys(context)
            .filter(function(node){return context[node].hasOwnProperty('#')})
            .sort(sortNode,context)
            .map(function(node) { return context[node] });
}

/* returns a fixed width padded string */
String.prototype.pad = function(justify,chr) {
  var str, args, width = Math.abs(justify), chr = chr || ' ', a, b;
  
  args = this.split('');
  args.unshift(this.length);
  if(justify >= 0) args.unshift(0);
  else args.unshift(width-this.length); 

  str = new Array(width);
  /* apply padding from a to b */
  a = justify < 0 ? 0 : this.length;
  b = justify < 0 ? width-this.length : width;
  for(var i = a; i < b; i++) str[i] = chr; 
  
  Array.prototype.splice.apply(str,args);

  return str.join('');
}

function getHelp(path) {
    var help = "",
        context = getContext(path);

    if(!context) throw "No help for: " + path.join(' ');

    if(typeof context !== 'function') {
        getSubNodes(context).forEach(function(node){
            help += node['#'].pad(-20) + ": " + node['?'] + "\n";
        });
    } else help += helpParams(context['&']);

    function helpParams(params){
        if(typeof params === 'string') return params;

        var o,p,t,v,y,z, h = "";
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



module.exports = Program;
