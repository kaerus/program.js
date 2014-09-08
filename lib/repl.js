var tools = require('./tools');


function Commander(){
	var _history = 0, self = this;

	Array.apply(this);
	
	Object.defineProperty(this,'current',{
		get: function(){
			return this[_history];
		},
		set: function(index){
			if(self.length === 0) return 0;

			if(index < 0) index = self.length - 1;
			
			return _history = index % self.length;
		}
	})

	Object.defineProperty(this,'history',{
		get: function(){
			return _history;
		}
	})
}

Commander.prototype.history = function(){
	if(this[this.length-1]) this.length++;
    this.current = this.length - 1;
}

Commander.prototype.previous = function(){
	this.current = --this.history; 
	return this.current
}

Commander.prototype.next = function(){
	this.current = ++this.history;
	return this.current;
}

Commander.prototype.add = function(str){
 	this[this.history] = (this[this.history] || "") + str;
}

tools.extend(true,Commander.prototype,Array);

Program.repl = function(input,output,raw){
    var done = false, 
        command = new Commander(), 
        help,
        line;
    
    var keypress = require('keypress');

    if(!input) {
    	input = process.stdin;
    }

    if(!output) {
        if(input.constructor.name === "ReadStream") output = process.stdout;
        else output = input;
    }
        
    keypress(input);

    function prompt(str){
        output.write("\n" + Program.prompt + (str ? str : ""));
    }

    input.on('keypress', function (chunk, key) {
        if(Program.debug && Program.trace.keypress) output.write("keypress: chunk(%s) key(%s)", chunk, JSON.stringify(key));

        if (key && key.ctrl) {
            switch(key.name) {
            	case 'c':
            		input.emit('SIGINT');
            		break;
                case 'd':
                	output.write("<EOF>");
                	input.pause();
                  break; 
                case 'h':
                    output.write('\b');
                    break;
            }
        } else if(key) {
            switch(key.name){
                case 'tab': 
                    prompt(tab_completion(command.current));
                    break;
                case 'backspace':
                	if(command.current.length > 0) {
                    	process.stdout.write('\b \b');
                    	command.current.length--;
                    } else {
                     	output.write('\a\b');
                    }
                    break;
                case 'delete': 
                	if(command.current.length > 0) {
                		output.write(' \b');
                		command.current.splice(caret,1);
                	}
                case 'return':
                    if(command.current){
                        Program(command.current);
                        caret = 0;
                    }
                    prompt();
                    break;
                case 'up':
                    prompt(command.previous());
                    break;
                case 'down':
                    prompt(command.next());
                    break;
                default:
                    output.write(key.sequence);
                    command.add(key.sequence);
            }
        } else {
            switch(chunk){
                case '?':
                    output.write('?\n');
                    if(command.current) line = tools.split(command.current).join(' ');
                    else line = "";
                    help = Program['?'](line);
                    output.write(help);
                    prompt(command.current);
                    break;
                default:
                    output.write(chunk);
                    command.add(chunk);
            }
        }
    });

    if(raw !== false) input.setRawMode(true);
    input.resume();

    prompt();

}

function tab_completion(path){
    var ctx = Program.$(path);
    Program.log("tab completion", path);
    return ctx ? ctx['#'] : Program.help(path);
}