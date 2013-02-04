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

/* color encoded debug output */
/* red: server, blue: client */
function debug(){
    if(global.DEBUG) {
        debug = function(){
            if(!arguments.length) return;

            var args = [].slice.call(arguments);
            var dir = args.shift();
            var str = args.shift();
            var clr = dir ? '\x1B[31m' : '\x1B[34m';

            if(typeof str !== 'string') return;
            var msg = clr+str.format.apply(str,args)+'\x1B[39m';

            process.stdout.write(msg);
        };

        debug.apply(null,arguments);

    } else {
        debug = function(){};
    }   
}


String.prototype.format = function() {
  var _args = arguments, args = [].slice.call(_args);

  return (this.replace(/%s({(\d+)})?/g, function(m,n,d) {
    return n === 'undefined' ? args.shift() : _args[d];
  }) + args.map(function(a){return ' ' + a}).join(''));
};

function TelnetStream(socket) {
    var self = this, state = 0;

    /* negotiate options */
    socket.on("connect",function(){
        self.say("IAC WILL ECHO");
        self.say("IAC WILL SUPPRESS_GA");
        self.say("IAC WONT LINEMODE");
        self.say("IAC DO TTY");
        self.say("IAC DO NAWS");
    });

    this.process_telnet = function(data){

        var done = 0, iac = done, cmd = done, sb = done, opt = {}, $ = self.say();

        /* processes data in character mode */
        for(var i = 0, l = data.length; i < l; i++){
            /* in command */
            if(iac || (data[i] === $.IAC && data[i+1] !== $.IAC)){

                debug(0,data[i]+' ');

                if(!iac){
                    iac = data[++i];

                    if(iac === $.NOP) iac = done;

                    debug(0,data[i]+' ');
                    continue;
                }

                /* parse option */
                if(sb){
                    if(data[i] === $.IAC && data[i+1] === $.SE){
                        debug(0,data[++i]+' ');

                        switch(sb){
                            case $.NAWS:
                                self.columns = (opt[sb][0]<<8) + opt[sb][1];
                                self.rows = (opt[sb][2]<<8) + opt[sb][3];
                                self.emit('resize',self.columns,self.rows);
                                break;
                            case $.TTY:
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
                        case $.SB:
                            sb = cmd;
                            opt[sb] = [];
                            continue;
                            break;    
                        case $.WILL:
                            /* negotiate settings */
                            switch(cmd){
                                case $.TTY:
                                    self.say("IAC SB TTY 0 A N S I IAC SE");
                                    break;
                                case $.NAWS:
                                    self.say("IAC DO NAWS");
                                    break;
                                case $.ECHO:
                                    self.echo = false;
                                    break;
                                case $.SUPPRESS_GA:
                                    break;  
                                default:
                                    self.say("IAC DONT", data[i]);              
                            }
                            break;
                        case $.WONT:
                            switch(cmd){
                                case $.ECHO:
                                    self.say("IAC WILL ECHO");
                                    break;
                            }
                            break;
                        case $.DO:
                            switch(cmd){
                                case $.ECHO:
                                    this.echo = true;
                                    break;
                                case $.SUPPRESS_GA:
                                    break;  
                                default:
                                    self.say("IAC WONT", data[i]);      
                            }
                            break;
                        case $.DONT:
                            switch(cmd){
                                case $.ECHO:
                                    this.echo = false;
                                    break;
                                case $.SUPPRESS_GA:
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
                } else { 
                    self.state = 0x00;       
                    self.emit('data',String.fromCharCode(data[i])); 
                }       
            }  
        }
        
    }    
    socket.on("data",this.process_telnet);

    this.socket = socket;
};

util.inherits(TelnetStream, stream);

TelnetStream.prototype.readable = true;
TelnetStream.prototype.writeable = true;
TelnetStream.prototype.isTTY = true;
TelnetStream.prototype.encoding = 'utf8';

TelnetStream.prototype.say = function(){
    var babble = {
        SE:240,NOP:241,DM:242,BRK:243,IP:244,AO:245,
        AYT:246,EC:247,EL:248,GA:249,SB:250,
        WILL:251,WONT:252,DO:253,DONT:254,IAC:255,
        ECHO:1,SUPPRESS_GA:3,NAWS:31,LINEMODE:34,TTY:24,CR:10}; 
    
    if(!arguments.length) return babble;

    var args = [].slice.call(arguments);

    var words = args.shift(); 

    var sentence;    
     
    if(typeof words === 'string' && words.length > 0) {
        sentence = new Buffer(
            words.split(' ').map(function(m){
                return babble[m] ? babble[m] : isNaN(Number(m)) ? m.charCodeAt(0) : Number(m);
            }).concat(args)
        );
    } else sentence = new Buffer(words.concat(args));

    this.socket.write(sentence);

    if(global.DEBUG) {
        for(var i = 0, l = sentence.length; i < l; i++)
            debug(1,sentence.readUInt8(i)+' ');
    }    
}

TelnetStream.prototype.write = function(data) {
    var offset = 0;
    for(var i = 0, l = data.length; i < l; i++){
        if(data[i] === '\n'){
            try {
                this.socket.write(data.slice(offset,i));
            } catch(err) {
                throw err;
            }

            /* fixes carriage return */
            this.socket.write('\r\n');      

            offset = i+1;
        }
    }
    if(offset < data.length){
        this.socket.write(data.slice(offset,data.length));
    }
};

TelnetStream.prototype.pause = function(){};

TelnetStream.prototype.resume = function(){};

TelnetStream.prototype.end = function(){
    this.socket.end();
}

module.exports = TelnetStream;