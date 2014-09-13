var tools = require('./tools');

function Commander(scope){
	var _history = [], _current = 0, self = this;
	
	_history[0] = "";
   
   	this.scope = scope;
   	this.prompt = scope.prompt;
   	this.input = scope.stdin;
    this.printf = scope.printf;

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

	this.help = function(){
		var h;
		this.printf('?\n');
    	h = Program['?'](this.line);
    	this.printf(h);
    	this.show(this.line);
	}
}

Commander.prototype.previous = function(){
	var l = this.line.length + this.prompt.length;
	this.history--; 
	this.printf("\033[2K\033[" + l + "D" + this.prompt + this.line);
}

Commander.prototype.next = function(){
	var l = this.line.length + this.prompt.length;
	this.history++;
	this.printf("\033[2K\033[" + l + "D" + this.prompt + this.line);
}

Commander.prototype.show = function(str){
	this.printf("\n%s%s", this.prompt, (str ? str : ""));
}

Commander.prototype.add = function(str){
	this.printf(str);
    this.line+= str;
}

Commander.prototype.autocomplete = function(){
	this.show(this.line);
}

Commander.prototype.backspace = function(){
	if(this.line.length > 0) {
    	this.printf('\b \b');
    	this.line = this.line.substr(0,this.line.length-1);
    }
}

Commander.prototype.enter = function(){
	if(this.line){
		this.printf("\n");
        Program(this.line,this.context,this.scope);
        this.new();
    }
    this.show();
}

Commander.prototype.stop = function(){
    this.input.pause();
}

Commander.prototype.interrupt = function(){
	this.input.emit('SIGINT');
}

module.exports = Commander;