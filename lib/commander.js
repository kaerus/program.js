var tools = require('./tools');

function Commander(repl){
    var _history = [], _current = 0, self = this;
    
    _history[0] = "";
    
    this.repl = repl;
    this.state = 0;

    Object.defineProperty(this,'line',{
	get: function(){
	    return _history[_current];
	},
	set: function(str){
	    return _history[_current] = str;
	}
    });

    Object.defineProperty(this,'history',{
	get: function(){
	    return _current;
	},
	set: function(index){
	    if(_history.length === 0) return 0;

	    if(index < 0) index = _history.length - 1;
	    
	    return _current = index % _history.length;
	}
    });

    this.new = function(){
	_current = _history.length;
	_history[_current] = "";
    };

    this.help = function(){
	var h;
	this.repl.printf('?\n');
    	h = Program['?'](this.line);
    	this.repl.printf(h);
    	this.show(this.line);
    };
}

Commander.prototype.previous = function(){
    var l = this.line.length + this.repl.prompt.length;
    this.history--; 
    this.repl.printf("\033[2K\033[" + l + "D" + this.repl.prompt + this.line);
};

Commander.prototype.next = function(){
    var l = this.line.length + this.repl.prompt.length;
    this.history++;
    this.repl.printf("\033[2K\033[" + l + "D" + this.repl.prompt + this.line);
};

Commander.prototype.show = function(str){
    this.repl.printf("\n%s%s", this.repl.prompt, (str ? str : ""));
};

Commander.prototype.add = function(str){
    this.repl.printf(str);
    this.line+= str;
};

Commander.prototype.autocomplete = function(){
    this.show(this.line);
};

Commander.prototype.backspace = function(){
    if(this.line.length > 0) {
    	this.repl.printf('\b \b');
    	this.line = this.line.substr(0,this.line.length-1);
    }
};

Commander.prototype.interrupt = function(){
    this.state = "SIGINT";
    this.line = "";
    this.show();
};

Commander.prototype.stop = function(){
    if(this.state === 'SIGINT'){
	this.repl.printf("\n");
	this.repl.end();
    }
};

Commander.prototype.enter = function(){
    if(this.line){
	this.repl.printf("\n");
        Program(this.line,this.context,this.repl);
        this.new();
    }

    this.show();
}

module.exports = Commander;
