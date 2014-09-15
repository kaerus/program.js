var printf = require('printf');
var Stream = require('stream');

var SEVERITIES = ['emergency','alert','critical','error','warning','notice','info','debug'];

var Logger = function(facility, severities, stream, encoding){
	var self = this;

	if(!(this instanceof Logger))
		return new Logger(facility,stream,encoding);

	else if(facility instanceof Stream){
		encoding = severities;
		stream = facility;
		facility = null;
		severities = null;
	} 
	else if(severities instanceof Stream){
		encoding = stream;
		stream = severities;
		severities = null;
	} 
	else if(Array.isArray(facility)){
		encoding = stream;
		stream = severities;
		severities = facility;
		facility = null;
	}

	this.facility = facility || "";

	this.stream = stream || process.stderr;
	
	this.encoding = encoding || 'utf8';

	this.severities = severities || SEVERITIES;

	function log(){
		Logger.prototype.log.apply(self,arguments);
	}

	this.severities.forEach(function(severity){
		log[severity] = function(args){
			args = [].slice.call(arguments);
			args[0] = '['+severity.toUpperCase()+']:' + args[0];
			Logger.prototype.log.apply(self,args);
		};
	});

	return log;
};

Logger.prototype.log = function(format,args){
	var message, formatter,
		stream = this.stream,
		encoding = this.encoding,
		timestamp = new Date(),
		facility = this.facility ? '('+this.facility+'):' : ':';

	format = typeof format === 'string' ? format : (format && format.toString && format.toString()) || "";
    
    args = [].slice.call(arguments,1);

    message = format;

    if(args.length) {
    	formatter = new printf.Formatter(message);
    	message = formatter.format.apply(formatter, args);
    }

    message = timestamp.toISOString() + facility + message + '\n';

    (function write(drain){
        if(stream.write(message,encoding) < 0)
        	drain && stream.once('drain',write);
    })(true);
};

module.exports = Logger;
