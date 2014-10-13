/*global require global */

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

var tools = require('./tools');
var Logger = require('./log');
var Scope = require('./scope');
var promise = require('micropromise');

var Program = global.Program = function(line,context,scope) {
    
    line = tools.trim(line);
    
    if(!line) return;

    if(!scope) scope = Program.scope;

    try {
        return parse(line,context,scope);
    } catch(e) {
        if(scope.debug) {
            scope.log.error(e.stack);
        } else {
            scope.log.error(e.message);
        }
    }
};

/* in v8 debug mode enable program debug */
if(global.v8debug) Program.debug = true;

Program.default = {
    port: 43210
};

require('./run');
require('./help');
require('./repl');
require('./context');
require('./daemonize');

var application = {name: "Program"};

Object.defineProperty(Program,'application',{
    enumerable:false,
    configurable: false,
    get: function(){
        return application;
    },
    set: function(app){
	if(typeof app === 'string'){
	    application.name = app;
	} else {
	    for(var k in app)
		application[k] = app[k];
	}

	Program.scope.name = application.name;
 
        return application;
    }
});

var scope = new Scope({
    name : application.name,
    prompt: "$> ",
    debug: Program.debug,
    trace: {}
});


Program.scope = scope.create();

/* add Program.log for convenience */
Program.log = Program.scope.log;

Program.banner = function() {
    var str;

    if(typeof application.banner === 'function') str = application.banner();

    if(typeof str !== 'string') str = Program.application.name + '\n';
 
    return str;
};

Program.help = function(path, context){
    var help, s = "";

    help = Program['?'](path, context);

    if(help) s+= help;

    return s;
};

Program.error = function(e){
    Program.log.error(e.stack);
};

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

function parse(path,context,scope) {
    var command, args, params;

    if(typeof path === 'string') {        
        path = tools.split(path);
    }

    if(context) path.unshift(getPath(context));
    
    command = path.reduce(function(c,n) {
        return c.hasOwnProperty(n) ? c[n] : c;
    },Program.$(context));

    if(!command) {
        throw Error({message:"No match on: " + path.join(' '), code: 100});
    }
    
    if((args = getPath(command))){
        args = path.slice(args.length);
    }
    
    if(typeof command === 'function') {
        params = getParams(command,args);
        
        try {
            return command(params,args,scope);
        } catch (e) {
            scope.log.error(e);
        }
    } else {
        return command;
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
        o = Object.keys(options[j]).filter(function(f){return f ? f : undefined;})[0];
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
            throw new Error(option["?"] || 'missing');
        
        return option[""]; 
    } else {
        /* option type and value */
        var type = Object.keys(option[o]).filter(function(f){return f ? f : undefined;})[0];
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
            if(Array.isArray(v1)) {
		var ok;
		for(var i = 0, l = v1.length; i < l; i++){
		    if(isNaN(v2)) if(v === v2) ok = true;
                    else if(Number(v) === v2) return true;
		}
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

module.exports = Program;
