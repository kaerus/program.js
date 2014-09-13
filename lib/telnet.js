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

var stream = require('stream'),
    util = require('util');

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

function say(o){
    var sentence = [], words, buf,
        args = [].slice.call(arguments,1);

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
    
    try {
        o.write(buf);
    } catch(e) {
        console.log(e.stack);
    }   
}
/* color encoded debug output */
/* red: server, blue: client */
function debug(){
    if(!arguments.length) return;

    var args = [].slice.call(arguments);
    var dir = args.shift();
    var str = args.shift();
    var clr = dir ? '\x1B[31m' : '\x1B[34m';

    if(typeof str !== 'string') return;
    var msg = clr+str.format.apply(str,args)+'\x1B[39m';

    process.stdout.write(msg);
}


String.prototype.format = function() {
  var _args = arguments, args = [].slice.call(_args);

  return (this.replace(/%s({(\d+)})?/g, function(m,n,d) {
    return n === 'undefined' ? args.shift() : _args[d];
  }) + args.map(function(a){return ' ' + a}).join(''));
};

function TelnetStream(socket,debug) {
    stream.call(this);

    this.state = 0;
    this.socket = socket;
    this.debug = !!debug;

    socket.on('data',this.process);
    socket.on('close',this.end);

    /* negotiate options */
    say(this,"IAC DO TTY");
    say(this,"IAC DO NAWS");
};

util.inherits(TelnetStream,stream);

TelnetStream.prototype.process = function(data){
    var done = 0, 
        iac = done, 
        cmd = done, 
        sb = done, 
        opt = {},
        self = this;

    /* processes data in character mode */
    for(var i = 0, l = data.length; i < l; i++){
        /* in command */
        if(iac || (data[i] === CMD.IAC && data[i+1] !== CMD.IAC)){

            if(self.debug) debug(0,data[i]+' ');

            if(!iac){
                iac = data[++i];

                if(iac === CMD.NOP) iac = done;

                if(self.debug) debug(0,data[i]+' ');
                continue;
            }

            /* parse option */
            if(sb){
                if(data[i] === CMD.IAC && data[i+1] === CMD.SE){
                    if(self.debug) debug(0,data[++i]+' ');

                    switch(sb){
                        case CMD.NAWS:
                            self.columns = (opt[sb][0]<<8) + opt[sb][1];
                            self.rows = (opt[sb][2]<<8) + opt[sb][3];
                            self.emit('resize',self.columns,self.rows);
                            break;
                        case CMD.TTY:
                            self.tty = opt[sb].filter(function(f){
                                    if(f>30) return f;
                                }).map(function(c){
                                    return String.fromCharCode(c);
                                }).join('');                     
                            break;  
                    }
                    sb = iac = done;
                    continue;
                } 
                opt[sb].push(data[i]);
            }
            /* parse command */ 
            else {
                cmd = data[i];
                switch(iac){
                    case CMD.SB:
                        sb = cmd;
                        opt[sb] = [];
                        continue;
                        break;    
                    case CMD.WILL:
                        /* negotiate settings */
                        switch(cmd){
                            case CMD.TTY:
                                say(self,"IAC SB TTY",[0,'A','N','S','I'],"IAC SE");
                                break;
                            case CMD.NAWS:
                                say(self,"IAC DO NAWS");
                                break;
                            case CMD.ECHO:
                                self.echo = false;
                                break;
                            case CMD.SUPPRESS_GA:
                                break;  
                            default:
                                say(self,"IAC DONT", data[i]);              
                        }
                        break;
                    case CMD.WONT:
                        switch(cmd){
                            case CMD.ECHO:
                                say(self,"IAC WILL ECHO");
                                break;
                        }
                        break;
                    case CMD.DO:
                        switch(cmd){
                            case CMD.ECHO:
                                self.echo = true;
                                break;
                            case CMD.SUPPRESS_GA:
                                break;  
                            default:
                                say(self,"IAC WONT", data[i]);      
                        }
                        break;
                    case CMD.DONT:
                        switch(cmd){
                            case CMD.ECHO:
                                self.echo = false;
                                break;
                            case CMD.SUPPRESS_GA:
                                break;    
                        }
                        break;
                }
                iac = done;
            }    
        } else {
            /* handle ctrl-c, ctrl-d */
            if(data[i] === 0x03) {
                self.state = 0x03;
                self.emit('SIGINT');
            } else if(data[i] === 0x04 && self.state === 0x03) {
                self.emit('close');
            } else if(data[i] !=="\u0000") { 
                self.state = 0x00;
                console.log("emit data:", data[i]);       
                self.emit('data',String.fromCharCode(data[i])); 
            }       
        }  
    }
}

TelnetStream.prototype.readable = true;
TelnetStream.prototype.writeable = true;
TelnetStream.prototype.isTTY = true;
TelnetStream.prototype.encoding = 'utf8';
TelnetStream.prototype.write = function(data) {
    var offset = 0;
    for(var i = 0, l = data.length; i < l; i++){
        if(data[i] === '\n'){
            this.socket.write(data.slice(offset,i));
            /* fixes carriage return */
            this.socket.write('\r\n');      

            offset = i+1;
        }
    }
    if(offset < data.length){
        this.socket.write(data.slice(offset,data.length));
    }
    
    if(this.debug) {
        var buf = new Buffer(data);
        for(var i = 0, l = buf.length; i < l; i++)
            debug(1,buf.readUInt8(i)+' ');
    } 
};

TelnetStream.prototype.pause = function(){
    this.emit('close');
};

TelnetStream.prototype.setRawMode = function(enable){
    if(enable){
        say(this,"IAC WILL ECHO");
        say(this,"IAC WILL SUPPRESS_GA");
        say(this,"IAC WONT LINEMODE");
    } 
};

TelnetStream.prototype.resume = function(){};

TelnetStream.prototype.end = function(){
    this.socket.end();
}

module.exports = TelnetStream;