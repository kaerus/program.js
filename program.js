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
Program = {};

Program.run = function(lines){

	if(typeof lines === 'string') {
		lines = lines.split(/\r?\n/);
	}	

	var error, 
		context = [], 
		path, line, i, l, c;

	for(i = 0, l = lines.length; i < l; i++) {
		line = lines[i];
		/* trim whitespace */
		line = line.replace(/^\s*/,'').replace(/\s*$/,'');
		/* trim comments */
		line = line.replace(/^#.*/,'').replace(/\s?;.*/,'');
		/* skip empty lines */
		if(!line) continue;
		/* exit context */
		if(line === '!!') {
			context.pop();
			continue;
		}

		try {
			c = parse(line,context);
		} catch(err) {
			error = err;
			break;
		}	

		
		if(typeof c[0] === 'function'){
			try{
				c[0].apply(null,c[1]);
			} catch (err) {
				error = err;
				break;
			}
		} else {
			/* enter context */
			context.push(c[0]);
		}
	}	

	if(error) {
		console.error("Break on line %s:", i, error);
	}
};

/* get path by context */
function getPath(context){
	var path;

	if(path = [context['#']]){
		for(var c = context['@']; c; c = c['@']) {
			if(c['#']) path.push(c['#']);
		}	
		path = path.reverse();
	}

	return path;
}

function parse(line,context) {
	if(typeof line === 'string') {
		line = line.split(' ').filter(function(f){if(f) return f});
	}

	if(isArray(context)){
		context = context[context.length -1]
	}

	var path = context ? getPath(context) : null;
	path = path ? path.concat(line) : line;

	var node = path.reduce(function(c,n){
		return c[n] ? c[n] : c;
	},Program);

	if(!node || node === Program) throw new Error(line.join(' ') + ": not found." );
	
	var args = path.slice(getPath(node).length), 
		params; 

	if(typeof node === 'function') {
		params = getParams(node,args);
	}	

	return [node, params ? args.concat(params) : args ];
}

function getParams(node,args) {
	var options = node['&'], 
		i, l, o, v, e, params;

	if(options.length) params = {};

	/* option-1 arg-1, option-2=arg-2 ...+ args */
	options.forEach(function(option){
		o = Object.keys(option).filter(function(f){if(f) return f})[0];
		v = undefined;
		/* search for param */	
		for(i = 0, l = args.length; i < l; i++){
			if(args[i].indexOf(o) === 0){
				/* with or without '=' */
				if((e = args[i].indexOf('=')) < 0){
					v = args[i+1];
					args.splice(i,2);
				} else {
					v = args[i].substr(e+1);
					args.splice(i,1);
				} 
				break;
			}
		}
		params[o] = evaluateOption(option,v);

	});

	return params;
}

/* {option:"value"} */
/* {option:"value","":"default"} */
/* {option:{"type":"value"}} */
/* {option:{"type":"value"},"":"default"} */

function evaluateOption(option,value){
	var o = Object.keys(option).filter(function(f){if(f)return f})[0];

	if(!value) {
		if(!option[""]) throw new Error("Missing parameter: " + o);
		
		/* default value */
		return option[""]; 
	}		

	if(typeof option[o] === 'string'){
		if(value !== option[o]) throw new Error("Value mismatch: " + o);

		return value;
	}
	else if(isArray(option[o])){
		option[o].forEach(function(v){
			if(v === value) return value;
		});

		throw new Error("Value mismatch: " + JSON.stringify(v));
	}
	else{
		/* option type and value */
		var type = Object.keys(option[o])[0];
		var v1 = o[type], v2;

		switch(type){
			case 'int':
			case 'integer':
				v2 = parseInt(value,10);
				if(isNaN(v2)) throw new Error("Not an integer: " + value);
				break;	
			case 'hex':
			case 'hexadecimal':
				v2 = parseInt(value,16);
				if(isNaN(v2)) throw new Error("Not a hexadecimal: " + value);
				break;
			case 'oct':
			case 'octal':
				v2 = parseInt(value,8);
				if(isNaN(v2)) throw new Error("Not an octal: " + value);
				break;
			case 'bin':	
			case 'binary':
				v2 = parseInt(value,2);
				if(isNaN(v2)) throw new Error("Not a binary: " + value);
				break;					
			case 'dec':
			case 'decimal':
				v2 = parseFloat(value);	
				if(isNaN(v2)) throw new Error("Not a decimal: " + value);
				break;
			case 'str':	
			case 'string':
				v2 = value.toString();
				if(!v2) throw new Error("Not a string: " + value);
				break;
			case 'bool':
			case 'boolean':
				v2 = value.toString().toLowerCase();
				try { 
					v2 = !!JSON.parse(v2);
				} catch (e) {
					if(v2 === 'on') v2 = true;
					else if( v2 === 'off') v2 = false;
					else throw new Error("Not a boolean: " + value);
				}			
				break;
			case 'ipv4':
				v2 = value.match("^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$");
				if(v2) v2 = v2[0];
				else throw new Error("Not an IPv4 address: " + value);
				break;
			case 'ipv6':
				v2 = value.match(/^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i);
				if(v2) v2 = v2[0];
				else throw new Error("Not an IPv6 address: " + value);
				break;
			case 'host':	
			case 'hostname':
				v2 = value.match("^(?=.{1,255}$)[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?(?:\.[0-9A-Za-z](?:(?:[0-9A-Za-z]|\b-){0,61}[0-9A-Za-z])?)*\.?$");
				if(v2) v2 = v2[0];
				else throw new Error("Not a hostname: " + value);
				break;	
			case 'url':
			case 'href':
				v2 = value.match(/^(?:([A-Za-z]+):)?(\/{0,3})(?:([^\x00-\x1F\x7F:]+)?:?([^\x00-\x1F\x7F:]*)@)?([0-9.\-A-Za-z]+)(?::(\d+))?(?:\/([^\x00-\x1F\x7F]+))?$/);
				if(v2) v2 = v2[0];
				else throw new Error("Not an URL: " + value);
				break;
			default:
				Error("Unknown type: " + o);
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

			throw new Error("Value mismatch: " + value);
		}
		return v2;
	}	
	
}

/* create and return node context */
/* $("name","description") */
Program.$ = function(){
	var context, name, func, help, options = Array.prototype.slice.call(arguments);

	if(typeof options[0] === 'function' || 
		typeof options[0] === 'object') context = options.shift();
	if(typeof options[0] === 'string') name = options.shift();
	if(typeof options[0] === 'function') func = options.shift();
	if(typeof options[0] === 'string') help = options.shift();

	if(!name) throw new Error("Missing argument");

	/* return existing node context */
	if(node = Program.getContext(name))
		return node;

	if(func) {
		context = context || null;

		if(context === 'function') 
			context = context();
 
 		/* for debugging we want a named function */
		var f = new Function("func","context", 
			"return function " + name + "(){ return func.apply(context,Array.prototype.slice.call(arguments)) }");

		/* add function */
		Object.defineProperty(this,name,{
			enumerable: true,
			writable: false,
			value: f(func,context)
		});

		/* add options */
		Object.defineProperty(this[name],'&',{
			enumerable: false,
			writable: false,
			value: options
		});

	} else {
		/* add node */
		this[name] = {};

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

	/* add reference to root */
	Object.defineProperty(this[name],'^',{
		enumerable: false,
		writable: false,
		value: Program
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

	/* context node */
	if(typeof this[name] === 'object') {
		/* step into node */
		return this[name];
	}

	/* make chainable */
	return this;
}

function isArray(a) {
	return Object.prototype.toString.call(a) === '[object Array]'
}

/* get context by path */
Program.getContext = function(path,find) {
	
	if(!path) return undefined;

	if(find) return this.findContext(path);

	if(typeof path === 'string') {
		path = path.split(' ').filter(function(f){if(f) return f});
	} 

	if(!isArray(path)) return undefined; 

	return path.reduce(function(c,n){
		return c ? c[n] : undefined;
	},Program);
}

/* search context */
Program.findContext = function(path){
	var search, context;

	if(typeof path !== 'string')
		return undefined;

	if(path[path.length-1] === ' ') {
		return this.getContext(path);
	} 
	
	/* search for matching nodes */
	/* under a parent context */
	path = path.split(' ').filter(function(f){ return f });
	search = path.pop(),
	context = this.getContext(path);

	return Object.keys(context).filter(function(f){
				return f.indexOf(search) === 0
			}).sort().map(function(c){
				return this[c];
			},context);	
}

function showHelp(node,head){		
	console.log("%s%s%s:",
				head ? '*' : ' ',
				node['#'],
				Object.keys(node).length > 1 ? '>' : ' ',
				node['?']);
}
	
function hasHelp(name){
	return this[name].hasOwnProperty('?');
}

function sortNodes(v1,v2){

	var t1 = typeof this[v1],
		t2 = typeof this[v2];

	if(t2 > t1) return 1;
	if(t2 < t1) return -1;

	return v1 > v2 ? 1 : -1;
}	

function getSubNodes(context){
	return Object.keys(context)
			.filter(hasHelp,context)
			.sort(sortNodes,context)
			.map(function(c) { return this[c] }, context);
}

/* help on context */
Program.help = function(context) {

	if(!context) {
		context = getSubNodes(this);
	}
	else if(typeof context === "string") {
		context = this.findContext(context);

		if(!context) {
			console.log("Not found");
			return;
		}

		if(!isArray(context)) { 
			showHelp(context,true);
			context = getSubNodes(context);
		}			
	}

	if(isArray(context) && context.length > 0) {
		context.forEach(function(node){
			showHelp(node);
		});
	}	
	
}

module.exports = Program;
