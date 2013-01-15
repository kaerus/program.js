program.js
==========

Synopsis
--------
This library attaches a contextual command line interface to your programs.

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
For instance command line options and help can now automatically be expanded by pressing <TAB> instead of the more cumbersome '?' character.
```
Mytool v.1.0.0, (c) Mytool inc 2013, all rights reserved.
daemon> <TAB>
Help: 
			route: Network routes
	  		  arp: Address resolution
      		  egp: Exterior gateteway protocols
     		 icmp: Icmp utility  
daemon> ro<TAB>
daemon> route
daemon> route<TAB>
Help: route
			  add: Add route
	  		  del: Delete route
      		 show: Show routes
daemon> route add<TAB> 	
Help: route add		
		add <ipv4>: Network address
	netmask <ipv4>: Netmask
	gateway <ipv4>: Gateway address
daemon> 
```	 

Usage
=====
TODO

Status
======
TODO

Contributions
=============
Sharing is caring, contribute with your time & energy.





