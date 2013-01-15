program.js
==========
This library was originally developed for the <a href="https://github.com/kaerus/arangodep project">arangodep</a> project.  

Synopsis
--------
This library attaches a contextual command line interface to programs.

Introduction
------------
When developing command line utilities you often need to parse command line options that gets passed to your functions. The defacto standard is to provide the user with options in the form of arguments prefixed with one or more hyphens.
```
$> mytool --route --add --network 172.16.1.0 --netmask 255.255.255.0 --gateway 172.16.2.254 
Added route 172.16.1.0/24 -> 172.16.2.254
$>
```
To get help from a program you have to enter a ```-h```or ```--help```switch.
```
$> mytool --help
...100 lines of help output...
```
The help-switch typically dumps all the available command line options and often convolutes the output by to much information making the users less comfortable to use it. A better approach and as seen in many larger utilities is to assemble the options into different groups or contexts.
```
$> my tool --help --route
...only 20 lines of help output...
```
And this praxis is fine for executables that you run manually but if/when you decide to create a daemon out of your utility program that scheme becomes somewhat inconvenient to use, atleast if you want to interact with your program.
Program.js attempts to meet this need by instead creating an interface more resembling the CLI often seen in network appliances such as routers.

```
$> mytool route add 172.16.1.0 netmask 255.255.255.0 gateway 172.16.2.254 
Added route 172.16.1.0/24 -> 172.16.2.254
$>
```
To get help you simply enter a questionmark after the relevant option or command '?'.
```
$> mytool route add?
Help: route add
		add <ipv4>: Network address
	netmask <ipv4>: Netmask
	gateway <ipv4>: Gateway address 
$>
```
To get initial help you only need to enter the command without any parameters.
```
$> mytool
Mytool v.1.0.0, (c) Mytool inc 2013, all rights reserved.
Help: 
			route: Network routes
	  		  arp: Address resolution
      		  egp: Exterior gateteway protocols
     		 icmp: Icmp utility  
```
This produces in my opinion a far better user experience.

Now, to interact with your utility you need to pipe it through standard input/output and perhaps even create a background process using a communications channel such as telnet. 

Program.js aims to solve that by daemonizing a program into a backgorund process and at the same time create a telnet interface.

When not being bound by the constraints of a unix shell users can now interact with the software differently.
For instance command line options and help can now automatically be expanded by pressing ```<TAB>``` instead of the more cumbersome '?' character.
```
Mytool v.1.0.0, (c) Mytool inc 2013, all rights reserved.
daemon> <TAB>
			route: Network routes
	  		  arp: Address resolution
      		  egp: Exterior gateteway protocols
     		 icmp: Icmp utility  
daemon> ro<TAB>
daemon> route
daemon> route <TAB>
			  add: Add route
	  		  del: Delete route
      		 show: Show routes
daemon> route add<TAB> 			
		add <ipv4>: Network address
	netmask <ipv4>: Netmask
	gateway <ipv4>: Gateway address
daemon> route add <TAB>
	    add <ipv4>: Network address	    
```	 
Command line interaction now becomes much more natural and it is much easier to explore commands and options.

Design
======
Program.js aims to provide a command controller that can be used to attach commands in a contextual tree like structure and provide an interface so that user agents can interact with worker functions or processes.
The controller is responsible for parsing input and redirecting input/output through communication channels.
Worker processes should be asynchrounous and not interfeer with the CLI, similar to a typical GUI application.
The controller interfaces with the user agent over an user communications channel (UC) and with the program/function over an inter process communications channel (IPC). 

```
User Agent <--UC--> Controller <--IPC--> Worker
```
The IPC can in its simplest form be a proxy function that passes parameters and arguments to the destination function.
However a better approach is to provide asynchrounous communications channels so that the user terminal doesn't hang while the command completes its execution.

Controller
----------

###Defining commands

```
// creates a context node
Program.$("context","A command context");

// creates a command under a context
Program.$("context").$(command,"command","A simple command");

// creates a command taking a say parameter that defaults to "hello world"
Program.$(console_log,"output","Output command",
	{"say":{"string":""},"":"hello world","?":"say something"}
);

// Single non-optional parameter (without a default value)
Program.$(console_log,"test","Test command",
	{"test":{"ipv4":""},"?":"Test something"}
);

// Optional parameters (null default).
Program.$(console_log,"test","Test command",
	{"test":{"ipv4":""},"":null,"?":"Test something"},
	{"test2":{"url":""},"":null,"?":"Url parameter"}
);

// Parameter value list 
Program.$(console_log,"test","Test command",
	{"test":{"string":["open","close"]},"?":"Test"}
);

// Parameter matching (TBD)
Program.$(console_log,"test","Test command",
	{"test":{"string":/[0-9]{4}/},"?":"Test 4 digits"}
);

...More to come...

```

Worker
------
TBD

User Agent
----------
TBD

Usage
=====
TODO

Status
======
* Design / Prototyping


Contributions
=============
Sharing is caring, contribute with your time & energy.





