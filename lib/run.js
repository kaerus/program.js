var util = require('util');
var Repl = require('./repl');
var Stream = require('stream');
var Readable = Stream.Readable || require('readable-stream').Readable;

Program.run = function(input){

    process.argv.splice(0,2);

    if(process.argv[0] === '--debug') {
        Program.scope.debug = true;
        process.argv.splice(0,1);
    }

    if(process.argv[0] === '--trace'){
	process.argv.splice(0,1);
	var trace = process.argv.shift();
	
	trace = trace.split(' ');
	trace.forEach(function(t){
	    Program.scope.trace[t] = true;
	});
    }

    if(process.argv[0] === '--daemonize') {
    	var port = process.argv[1] || Program.default.port;
    	
	Program.log.info("Daemonizing on port %s", port);
        require('./daemonize')(port);
    } else {
	var repl = new Repl(Program.scope);
	var commands = process.argv.length ? new CommandReader(process.argv) : process.stdin;

        commands.pipe(repl).pipe(process.stdout);  
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
