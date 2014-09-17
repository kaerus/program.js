var printf = require('printf');

function Scope(options){
	var self = this;

	for(var k in options)
		this[k] = options[k];

	if(!this.output) this.output = process.stdout;
	if(!this.input) this.input = process.stdin;

	Object.defineProperty(this,'write',{
		enumerable: false,
		value: function(message){
			(function writer(drain){
	        	if(self.output && (self.output.write(message) < 0))
	        		drain && self.output.once('drain',writer);
	    	})(true);
		}
	});
}

Scope.prototype.extend = function(options){
	var scope = {};
	
	options = options || {};

	for(var k in this)
		scope[k] = this[k];

	for(var k in options)
		scope[k] = options[k];

	if(options.name) scope.name = this.name + '.' + options.name;

	return new Scope(scope);
};

/*
Scope.prototype.printf = function(format,args){
    var string, formatter;

    args = [].splice.call(arguments,1);

    formatter = new printf.Formatter(format);
    string = formatter.format.apply(formatter, args);

    this.write(string);
};
*/

module.exports = Scope;

