var tools = require('./tools');

function Commander(input,output){
	var _history = [], _current = 0, self = this;
	
	_history[0] = "";

	if(!input) {
    	input = process.stdin;

    	if(!output)
        	output = process.stdout;
    }

    if(!output) output = input;

    this.input = input;
    this.output = output;

	Object.defineProperty(this,'line',{
		get: function(){
			return _history[_current];
		},
		set: function(str){
			return _history[_current] = str;
		}
	})

	Object.defineProperty(this,'history',{
		get: function(){
			return _current;
		},
		set: function(index){
			if(_history.length === 0) return 0;

			if(index < 0) index = _history.length - 1;
			
			return _current = index % _history.length;
		}
	})

	this.new = function(){
		_current = _history.length;
		_history[_current] = "";
	}
}

Commander.prototype.previous = function(){
	var l = this.line.length + Program.prompt.length;
	this.history--; 
	this.output.write("\033[2K\033[" + l + "D" + Program.prompt + this.line);
}

Commander.prototype.next = function(){
	var l = this.line.length + Program.prompt.length;
	this.history++;
	this.output.write("\033[2K\033[" + l + "D" + Program.prompt + this.line);
}

Commander.prototype.prompt = function(str){
	this.output.write("\n" + Program.prompt + (str ? str : ""));
}

Commander.prototype.add = function(str){
	this.output.write(str);
    this.line+= str;
}

Commander.prototype.help = function(){
	var h;

	this.output.write('?\n');
    h = Program['?'](this.line);
    this.output.write(h);
    this.prompt(this.line);
}

Commander.prototype.autocomplete = function(){
	this.prompt(this.line);
}

Commander.prototype.backspace = function(){
	if(this.line.length > 0) {
    	this.output.write('\b \b');
    	this.line = this.line.substr(0,this.line.length-1);
    } else {
    	/* alert/bell */
     	this.output.write("\a\b");
    }
}

Commander.prototype.enter = function(){
	if(this.line){
        Program(this.line);
        this.new();
    }
    this.prompt();
}

Commander.prototype.stop = function(){
    this.input.pause();
}

Commander.prototype.interrupt = function(){
	this.input.emit('SIGINT');
}

module.exports = Commander;