var tools = require('./tools');

function Commander(input,output){
	var _history = 0, self = this;

	Array.apply(this);
	
	this[0] = "";

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
			return this[_history];
		},
		set: function(str){
			return this[_history] = str;
		}
	})

	Object.defineProperty(this,'history',{
		get: function(){
			return _history;
		},
		set: function(index){
			if(self.length === 0) return 0;

			if(index < 0) index = self.length - 1;
			
			return _history = index % self.length;
		}
	})
}


tools.extend(Commander.prototype,Array.prototype);

Commander.prototype.previous = function(){
	this.history--; 
	this.prompt(this.line);
}

Commander.prototype.next = function(){
	this.history++;
	this.prompt(this.line);
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
        this.length++;
        this.history = -1;
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