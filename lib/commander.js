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
	    // no history yet
	    if(_history.length < 2) return 0;
 
	    // cap & wrap history
	    if(index >= 0) _current = index % _history.length;
	    else _current = _history.length - (-++index % _history.length);
	    
	    return _current;
	}
    });

    this.new = function(){
	var last = _history.length-1;

	if(_history[last]) last++;

	_history[(_current = last)] = "";
    };
}

Commander.prototype.help = function(){
    this.repl.printf('\n');
    var h = Program.help(this.line,this.context);
    this.repl.printf(h);
    this.show(this.line); 
};

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
    var context = this.context && this.context['#'] ? this.context['#'] : "";

    this.repl.printf("\n%s%s%s", context, this.repl.prompt, (str ? str : ""));
};

Commander.prototype.add = function(str){
    this.repl.printf(str);
    this.line+= str;
};

Commander.prototype.autocomplete = function(){
    var self = this;
    var nodes = Program.findContext(this.line,this.context);
    var complete = "";

    if(nodes.length === 1){
	complete = this.line.split(' ');
	complete.splice(complete.length-1,1);
	complete.push(nodes[0]);
	this.line = complete.join(' ') + ' ';
    } else if(nodes.length > 1) {
	this.repl.printf("\n");

	nodes.forEach(function(n){
	    self.repl.printf("%20s\n", n);
	});
    }

    this.show(this.line);
};

Commander.prototype.backspace = function(){
    if(this.line.length > 0) {
    	this.repl.printf('\b \b');
    	this.line = this.line.substr(0,this.line.length-1);
    }
};

Commander.prototype.interrupt = function(){
    var self = this;

    if(this.state === 'SIGINT'){
	clearTimeout(this.timer);
	this.quit();
	return;
    } 
    
    this.state = "SIGINT";
    this.repl.printf("\nPress <ctrl-c> again to quit.");
    this.line = "";
    
    this.timer = setTimeout(function(){
	self.state = 0;
    },3000);

    this.show();
};

Commander.prototype.stop = function(){
    
};

Commander.prototype.enter = function(){
    var context;

    if(this.line){
	this.repl.printf('\n');

	switch(this.line){
	case '..': // return to parent context
	    if(this.context) this.context = this.context['@'];
	    this.line = "";
	    break;
	case '!!': // exit context
	    if(this.context && this.context['@']) {
		this.context = undefined;
		this.line = "";
	    } else {
		this.quit();
		return;
	    }
	    break;
	default:
            context = Program(this.line,this.context,this.repl);
	    if(context) this.context = context;
            this.new();
	}
    }

    this.show();
}

Commander.prototype.quit = function(){
    this.repl.printf("\n");
    this.repl.end(null);
};

module.exports = Commander;
