/* 
 * Copyright (c) 2012 Kaerus (kaerus.com), Anders Elo <anders @ kaerus com>.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

var util = require('util'),
    Stream = require('stream'),
    Logger = require('./log');

var Transform = Stream.Transform || require('readable-stream').Transform;

var CMD = {
    SE:240,
    NOP:241,
    DM:242,
    BRK:243,
    IP:244,
    AO:245,
    AYT:246,
    EC:247,
    EL:248,
    GA:249,
    SB:250,
    WILL:251,
    WONT:252,
    DO:253,
    DONT:254,
    IAC:255,
    ECHO:1,
    SUPPRESS_GA:3,
    NAWS:31,
    LINEMODE:34,
    TTY:24,
    CR:10
}; 


function TelnetStream(options) {
    var self = this;

    if(!(this instanceof TelnetStream))
        return new Telnet(options);

    options = options || {};

    Transform.call(this, options);

    this._telnet = {
	state: 0, 
	negotiate: ["DO TTY","DO NAWS","WILL SUPPRESS_GA"],
	options: {},
	client: null,
	ready: false,
	debug: !!options.debug
    };

    if(options.telnet) {
	for(var k in options.telnet)
	    this._telnet[k] = options.telnet[k];
    }

    this.on('pipe',function(client){
	self._telnet.client = client;
	transmitOptions(self,self._telnet.negotiate);
	setTimeout(function(){
	    self._telnet.ready = true;
	},123);
    });

    this._telnet.outputOptions = options.outputOptions || {};

    this.output = new TelnetStreamOutput(this._telnet); 

};

util.inherits(TelnetStream,Transform);

function transmitOptions(telnet,options){
    if(!Array.isArray(options)) options = [options];

    options.forEach(function(option){
	telnet.command(CMD.IAC,option);
    });
};

TelnetStream.prototype.isTTY = true;

TelnetStream.prototype.encoding = 'utf8';

TelnetStream.prototype.setRawMode = function(enable){
    if(this._telnet.debug) debug('green',"setRawMode:" + enable);
    if(enable){
	this.command("IAC WILL ECHO");
	this.command("IAC WONT LINEMODE");
    }
};

TelnetStream.prototype._transform = function(data,encoding,callback){
    var self = this,
	state = this._telnet.state,
	char,
        sub;

    var output = "";

    if(this._telnet.debug) debug('blue',data);

   
    /* process in character mode */
    for(var i = 0, l = data.length; i < l; i++){
	char = data[i];

	if(!state && char !== CMD.IAC){
	    output+=String.fromCharCode(char);
	}
	else if(state || char === CMD.IAC){
	    if(!state) {
		state = char;
	    }
	    else if(state === CMD.IAC){
		switch(char){
		case CMD.IAC:
		    // two IAC in sequence means we should output 255
		    output+=String.fromCharCode(char);
		    state = 0;
		    break;
		case CMD.NOP:
		    state = 0;
		    break;
		default:
		    state = char;
		    break;
		}
	    } 
	    else if(char === CMD.IAC){
		state = char;
	    }
	    else {
		switch(state){
		case CMD.SB:
		    if(self._telnet.suboption){
			self._telnet.suboption.value.push(char);
		    } else self._telnet.suboption = {type:char, value:[]};
		    break;
		case CMD.SE:
		    if((sub = self._telnet.suboption)){
			switch(sub.type){
			case CMD.NAWS: // window size
			    self._telnet.columns = (sub.value[0]<<8) + sub.value[1];
			    self._telnet.rows = (sub.value[2]<<8) + sub.value[3];
			    // emit resize event
			    self.emit('resize',self._telnet.columns,self._telnet.rows);
			    break;
			case CMD.TTY:
			    // extract client tty string
			    self._telnet.client_tty = sub.value.filter(function(f){
				return f>30 ? f : undefined;
			    }).map(function(c){
				return String.fromCharCode(c);
			    });
			    break;
			}
		    }
		    // handle one suboption at a time
		    self._telnet.suboption = null;
		    state = 0;
		    break;
		case CMD.WILL:
		    switch(char){
		    case CMD.TTY:
			/* request ANSI TTY */
			self.command("IAC SB TTY",[0,'A','N','S','I'],"IAC SE");
			break;
		    case CMD.NAWS:
			break;
		    case CMD.ECHO:
			break;
		    case CMD.SUPPRESS_GA:
			break;
		    default:
			/* don't allow anything */
			self.command("IAC DONT", char);
		    }
		    state = 0;
		    break;
		case CMD.WONT:
		    switch(char){
			/* we don't care */
		    }
		    state = 0;
		    break;
		case CMD.DO:
		    switch(char){
		    case CMD.SUPPRESS_GA:
			break;
                    case CMD.TTY:
                        break;
                    case CMD.ECHO:
                        break;
                    case CMD.SUPPRESS_GA:
                        break;  
                    default:
                        self.command("IAC WONT", char);      
                    }
		    state = 0;
                    break;
		default:
		    state = 0;
		}
	    }
        }
    }

    if(output.length) this.push(output);

    callback();
};

TelnetStream.prototype.command = function() {
    var sentence = [], words, buf,
        args = [].slice.call(arguments);

    if(!args.length) return;

    while((words = args.shift())) {
        if(typeof words === 'string') {
            words = words.split(' ');
        }
        
        if(Array.isArray(words)){ 
            sentence = [].concat(sentence,words.map(function(m){
                return CMD[m] ? CMD[m] : isNaN(Number(m)) ? m.charCodeAt(0) : Number(m);
            }));

        } 
        else sentence = [].concat(sentence,words); 
    }

    buf = new Buffer(sentence);

    if(this._telnet.debug) debug('red',buf);

    this._telnet.client.write(buf);
};

var ansi_color = {
    'black': '\x1B[30m',
    'red': '\x1B[31m',
    'green': '\x1B[32m',
    'yellow': '\x1B[33m',
    'blue': '\x1B[34m',
    'magenta': '\x1B[35m',
    'cyan': '\x1B[36m',
    'white': '\x1B[37m',
    'default': '\x1B[39m'
};

/* color encoded hex debug output */
/* red: from server, blue: from client */
function debug(color,buffer){
    var string = "";

    if(Buffer.isBuffer(buffer)){
	for(var i = 0, l = buffer.length; i < l; i++)
            string+=buffer.readUInt8(i) + ' ';
    } else string = buffer;

    console.log(ansi_color[color] + string + ansi_color['default']);
};

function TelnetStreamOutput(telnet){
    this._telnet = telnet;
    Transform.call(this,telnet.outputOptions);
} 

util.inherits(TelnetStreamOutput,Transform);

TelnetStreamOutput.prototype._transform = function(data,encoding,callback){
    var chunk,
	i = 0, // index
	o = 0, // offset
        l = data.length,
	self = this;
   
    function write(){
	// wait with output until we are clear
	if(!self._telnet.ready){
	    setTimeout(write,100);
	    return;
	}
 
	while(i < l) {
            if(data[i] === 0x0a){
		chunk = data.slice(o,i) + '\r\n';

		self.push(chunk);

		o = i+1;
		
		if(self._telnet.debug) debug('yellow',chunk);
            }

	    i++;
	}

	// push out remaining data
	if(o < l){
	    chunk = data.slice(o,l);
            self.push(chunk);
	    if(self._telnet.debug) debug('red',chunk);
	}

	// request for more data
	callback();
    }

    write();
}; 

module.exports = TelnetStream;
