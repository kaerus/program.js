/*global require process */
var printf = require('printf');
var Stream = require('stream');
var util = require('util');

var Readable = Stream.Readable || require('readable-stream').Readable;

var SEVERITIES = ['emergency','alert','critical','error','warning','notice','info','debug'];

function Logger(facility, stream, encoding){
    var self = this;
    
    if(!(this instanceof Logger)){
	return new Logger(facility,stream,encoding);
    }

    if(facility instanceof Stream){
	encoding = stream;
	stream = facility;
	facility = null;
    } 

    Readable.call(this);
    
    this.facility = facility || "";

    this.stream = stream || process.stderr || process.stdout;

    this.defaultEncoding = 'utf8';
    
    this.encoding = encoding || this.defaultEncoding;

    this.severities = SEVERITIES;

    this.severities.forEach(function(severity){
	log[severity] = function(args){
	    args = [].slice.call(arguments);
	    args[0] = '['+severity.toUpperCase()+'] ' + args[0];
	    self.push(Logger.prototype.log.apply(self,args));
	};
    });
    
    function log(){
	self.push(Logger.prototype.log.apply(self,arguments));
    }
    
    log.__proto__ = this;
    
    return log;
};

util.inherits(Logger,Readable);

Logger.prototype.log = function(format,args){
    var message, formatter,
	stream = this.stream,
	encoding = this.encoding,
	//timestamp = new Date(),
	facility = this.facility ? ' '+this.facility+' ' : ' ';

    format = typeof format === 'string' ? format : (format && format.toString && format.toString()) || "";
    
    args = [].slice.call(arguments,1);

    message = format;

    if(args.length) {
    	formatter = new printf.Formatter(message);
    	message = formatter.format.apply(formatter, args);
    }

    message = /*timestamp.toISOString() + */ facility + message + '\n';

    (function write(drain){
        if(stream.write(message,encoding) < 0)
            drain && stream.once('drain',write);
    })(true);
    
    return message;
};

Logger.prototype._read = function(){};

module.exports = Logger;
