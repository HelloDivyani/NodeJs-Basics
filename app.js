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
var myCounter = require('./count'); // in same directory
//console.log("The myCounter Data : "+myCounter); // return the complete code

console.log('In app There are '+myCounter(['123','213']));

