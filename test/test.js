require('..');

var should = require('should');

describe('Program', function(){
    describe('singleton', function(){
        it("should expose globalProgram()", function(){
            should.exist(Program);
            Program.should.be.type('function');
        })

        it("should have $()", function(){
            Program.should.have.property('$');
            Program.$.should.be.type('function');
        })

        it("should have run()",function(){
            Program.should.have.property('run');
            Program.run.should.be.type('function');
        })

        it("should have repl()",function(){
            Program.should.have.property('repl');
            Program.repl.should.be.type('function');
        })

        it("should have daemonize()",function(){
            Program.should.have.property('daemonize');
            Program.daemonize.should.be.type('function');
        })
    })

    describe('context',function(){
        
        it('get root context: Program.$()',function(){
            Program.$().should.be.type('object');
        })

        it('create context: Program.$("test","test description")',function(){
            Program.$("test","test description");
            Program.$().should.have.property('test');
            Program.$('test').should.be.type('object');
        })

        describe('$("test")',function(){
            var context;
            
            beforeEach(function(){
                context = Program.$('test');
            })

            it('name: #',function(){
                context.should.have.property('#');
                context['#'].should.be.equal('test');
            })

            it('help: ?',function(){
                context.should.have.property('?');
                context['?'].should.be.equal('test description');
            })

            it('parent: @',function(){
                context.should.have.property('@');
                context['@'].should.be.equal(Program.$());  
            })

            it('self: $',function(){
                context.should.have.property('$');
                context['$'].should.be.type('function');
                context.$().should.be.equal(context);
            })

            it('chain: test.$(test2).$(test3)',function(){
                context.$('test2','test2 description').$('test3','test3 description');
                context.should.have.property('test2');
                context.$('test2').should.have.property('test3');
            })
        })
    })  

    describe('command',function(){
        it('simple cmd',function(){
            var cmd;
            
            Program.$("cmd","test command",function(){
                return "something";
            });

            cmd = Program.$('cmd');
            cmd.should.be.type('function');
            cmd['#'].should.be.equal('cmd');
            cmd['?'].should.be.equal('test command');
            cmd['@'].should.be.equal(Program.$());
            cmd['$'].should.be.type('function');
            cmd.$().should.be.equal(cmd);
            cmd().should.be.equal("something");
        })

        it('cmd2 with options',function(done){
            var cmd;

            Program.$("cmd2","command with options",function(params,args){
                params.hello.should.be.equal('"hello world"');
                params.hello.should.be.type('string');
                params.ten.should.be.type('number');
                params.ten.should.be.equal(10);
                done();
            },
            {hello: {"string":"", "?":"say hello" }},
            {ten: {"int":null, "?":"number ten"}}
            );

            Program.run('cmd2 hello="hello world" ten 10');
        })
    })
})  
