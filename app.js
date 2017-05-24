time=0;
// Taking timer as an object
var say = function()
{
	console.log('bye');
};
//say();

// Always Called at Last
var timer = setInterval(function(){
	time+=2;
	console.log(time+" have passed");
	//say(); //function call
	if(time > 4) 
	{
		console.log("This is Timer : "+timer);
		clearInterval(timer);
	}
},2000);


// anomous function

function callFunction(fun)
{
	fun();
}
callFunction(say);

// require calls the module specified
var stuff = require('./stuff'); // in same directory
console.log("The stuff : "+stuff.myAdder(3,4));
//console.log("The myCounter Data : "+myCounter); // return the complete code

console.log('In app There are '+stuff.myCounter(['123','213']));
console.log('In addition  '+stuff.myAdder(stuff.myPi,stuff.myPi));
// Using Core Event event
var events = require("events"); // Events is the core event
var util  = require("util");


// Create an Object Constructor : 
var Person = function(name)
{
	//this.name is the global name variable
	this.name = name;
}
util.inherits(Person,events.EventEmitter);

var james = new Person('james');
var mary = new Person('mary');
var ryu = new Person('ryu');

var people = [james,mary,ryu];

// Added Person

people.forEach(function(person){
	person.on('speak',function(msg){
			console.log(person.name+" said : "+msg);
		
	});
	
});

james.emit("speak",'hello');
ryu.emit("speak",'hello james');

var myEmitter = new events.EventEmitter();
//myCustom Emitter from events module 

myEmitter.on('someEvent',function(msg){
console.log(msg);
});

myEmitter.emit('someEvent','My Message');

