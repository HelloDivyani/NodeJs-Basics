time=0;
// Taking timer as an object
var say = function()
{
	console.log('bye');
	
};
//say();


var timer = setInterval(function(){
	time+=2;
	console.log(time+" have passed");
	say(); //function call
	if(time > 4	) 
	{
		console.log("This is Timer : "+timer);
		clearInterval(timer);
	}
},2000);


// anomous function

