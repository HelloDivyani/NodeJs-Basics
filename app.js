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
console.log("The stuff : "+stuff.adder(3,4));
//console.log("The myCounter Data : "+myCounter); // return the complete code

console.log('In app There are '+stuff.counter(['123','213']));
console.log('In addition  '+stuff.adder(stuff.pi,stuff.pi));

