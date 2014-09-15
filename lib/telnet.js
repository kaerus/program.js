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
    util = require('util'),
    Logger = require('./log');

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


function TelnetStream(socket,scope) {
    if(!(this instanceof TelnetStream))
        return new TelnetStream(socket,scope);

    stream.Duplex.call(this);

    this.state = 0;
    this.socket = socket;

    this.scope = scope.extend({
        name:'telnet', 
        input: this, 
        output: this
    });

    this.scope.log = new Logger(this.scope.name);

    this.scope.log.info("connected %s",socket.remoteAddress);

    socket.on('data',Function.prototype.call.bind(process,this));

    this.command("IAC DO TTY");
    this.command("IAC DO NAWS");
    this.command("IAC WILL ECHO");
    this.command("IAC WONT LINEMODE");
    this.command("IAC WILL SUPPRESS_GA");
};

util.inherits(TelnetStream,stream.Duplex);

function process(data){
    var done = 0, 
        iac = 0, 
        cmd = 0, 
        sb = 0, 
        opt = {},
        self = this;

    if(this.scope.debug) this.debug(0,data);

    /* processes data in character mode */
    for(var i = 0, l = data.length; i < l; i++){
        /* in command */
        if(iac || (data[i] === CMD.IAC && data[i+1] !== CMD.IAC)){

            if(!iac){
                iac = data[++i];

                if(iac === CMD.NOP) iac = done;

                continue;
            }

            /* parse option */
            if(sb){
                if(data[i] === CMD.IAC && data[i+1] === CMD.SE){

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
                                /* request ANSI TTY */
                                self.command("IAC SB TTY",[0,'A','N','S','I'],"IAC SE");
                                break;
                            case CMD.NAWS:
                                break;
                            case CMD.ECHO:
                                self.echo = false;
                                break;
                            case CMD.SUPPRESS_GA:
                                break;  
                            default:
                                self.command("IAC DONT", data[i]);              
                        }
                        break;
                    case CMD.WONT:
                        switch(cmd){
                            case CMD.ECHO:
                                self.command("IAC WILL ECHO");
                                break;
                        }
                        break;
                    case CMD.DO:
                        switch(cmd){
                            case CMD.TTY:
                                break;
                            case CMD.ECHO:
                                self.echo = true;
                                break;
                            case CMD.SUPPRESS_GA:
                                break;  
                            default:
                                self.command("IAC WONT", data[i]);      
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
                self.end();
            } else { 
                self.state = 0x00;
                /* emit data to read unless paused */ 
                if(!self.paused) {
                    self.emit('data',String.fromCharCode(data[i]));
                }
            }        
        }  
    }
}

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

    if(this.scope.debug) this.debug(1,buf);

    try {
        if(this.socket.write(buf) < 0){
            this.socket.end();
        }
    } catch (e) {
        this.socket.destroy();
    }

};

TelnetStream.prototype.readable = true;

TelnetStream.prototype.writeable = true;

TelnetStream.prototype.allowHalfOpen = false;

TelnetStream.prototype.isTTY = true;

TelnetStream.prototype.encoding = 'utf8';

TelnetStream.prototype._read = function(size){
    return this.socket.read(size);
};

TelnetStream.prototype._write = function(data) {
    var i = 0, 
        l = data.length,
        offset = 0, 
        socket = this.socket;

    (function sendData(){
        do {
            if(data[i] === '\n'){
            
                if(!write(data.slice(offset,i))) return;
                
                offset = i+1;

                // fixes carriage return
                if(!write('\r\n',true)) return;
            } 
        } while( i++ < l);

        if(offset < l){
            if(!write(data.slice(offset,l))) return;
        }
    })();

    function write(data,repeat){

        if(socket.write(data) < 0){
        
            if(!repeat) socket.once('drain',sendData);
            else socket.once('drain',function(){
        
                if(write(data)) sendData();
                else socket.end();
            });
            return false;
        }
        
        return true;
    }
    
};

/* color encoded hex debug output */
/* red: from server, blue: from client */
TelnetStream.prototype.debug = function(server,buffer){
    var color = server ? '\x1B[31m' : '\x1B[34m';
    var string = "";

    for(var i = 0, l = buffer.length; i < l; i++)
        string+= color + buffer.readUInt8(i) + '\x1B[39m' + ' ';

    this.scope.log.debug(string);
};

TelnetStream.prototype.pause = function(){
    this.paused = true;
    this.socket.pause();
};

TelnetStream.prototype.resume = function(){
    this.paused = false;
    this.socket.resume();
};

TelnetStream.prototype.setRawMode = function(enable){};

TelnetStream.prototype.end = function(){
    this.socket.end();
}

module.exports = TelnetStream;