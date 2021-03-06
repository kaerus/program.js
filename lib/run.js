var util = require('util');
var Repl = require('./repl');
var Stream = require('stream');
var Readable = Stream.Readable || require('readable-stream').Readable;

Program.run = function(input){
    var self = this;
    
    process.argv.splice(0,2);

    if(process.argv[0] === '--debug') {
        this.scope.debug = true;
	process.argv.splice(0,1);
    }

    if(process.argv[0] === '--trace'){
	process.argv.splice(0,1);
	var trace = process.argv.shift();
	
	trace = trace.split(' ');
	trace.forEach(function(t){
	    self.scope.trace[t] = true;
	});
    }

    if(process.argv[0] === '--daemonize') {
    	var port = process.argv[1] || this.default.port;
    	
	this.log.info("Daemonizing on port %s", port);
	
        require('./daemonize')(this,port);
    } else {
	var repl = new Repl(this.scope);
	var commands = process.argv.length ? new CommandReader(process.argv) : process.stdin;

        commands.pipe(repl).pipe(process.stdout);

	repl.on('exit',function(){
	    Program.emit('exit');
	    process.exit(0);
	});
    } 
};

function CommandReader(array,options){
    options = options || {highWaterMark:0};

    Readable.call(this,options);

    this.array = array;
}

util.inherits(CommandReader,Readable);

CommandReader.prototype._read = function(){
    var strings, self = this;

    strings = this.array.join(' ').split(';');

    strings.forEach(function(str){
	self.push(str+"\n");
    });

    self.push(null);
};

CommandReader.prototype.isTTY = false;
