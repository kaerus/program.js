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

/* global singleton */
Program = function(line) {
    
    line = tools.trim(line);
    
    if(!line) return;

    try {
        return parse(line);
    } catch(error) {

        if(typeof Program.error === 'function') {
            Program.error(error);
        } else if(Program.debug) {
            process.stdout.write(error.stack);
        } else {
            process.stdout.write(": " + error.message);
        }

        return error;
    }  
}

tools.extend(true,Program,{
    prompt: "$> ",
    debug: false,
    trace: {
        keypress: false,
        command: true,
        telnet: false
    },
    logger: function(){ return console; }
});

require('./run');
require('./help');
require('./repl');
require('./context');
require('./daemonize');

if(global.v8debug) Program.debug = true;


tools.extend(Program,Program.logger());


Program.help = function(path) {
    var p = require("../package"), help;
    
    if(typeof path === 'string') {
        path = path.replace(/\s?\?$/,'');
        path = tools.trim(path);
    }

    help = Program['?'](path);

    Program.log(p.description + " version " + p.version);
    Program.log("Created by " + p.author.name + " <"+p.author.email+">");
    if(path) Program.log("Help:",path.join('/'));
    if(help) Program.log(help);
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
    var command, args, params;

    if(typeof path === 'string') {
        
        if(path[path.length-1]==='?') {
            return Program['?'](path);
        }
            
        path = tools.split(path);
    }

    if(context) path.unshift(getPath(context));
    
    command = path.reduce(function(c,n) {
        return c.hasOwnProperty(n) ? c[n] : c;
    },Program.$(context));

    if(!command) throw "No match on: " + path.join(' ');
    
    if((args = getPath(command))){
        args = path.slice(args.length);
    }
    
    if(typeof command === 'function') {
        params = getParams(command,args);
        if(Program.debug && Program.trace.command) 
            Program.log("command params(%s), args(%s)", JSON.stringify(params), JSON.stringify(args));
        command(params,args);
    } else {
        return Program['?'](path);
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
            if(Array.isArray(v1)) {
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

/* search context */
function findContext(path){
    var ctx = Program.$(path), 
        search = path[path.length-1];

    if(typeof ctx === 'function') return ctx;

    return Object.keys(ctx).filter(function(f){
        
        if(ctx[f]['#']) return (search ? f.indexOf(search) === 0 : 1);
        
    }).sort().map(function(c){
    
        return this[c];
    },ctx); 
}

module.exports = Program;
