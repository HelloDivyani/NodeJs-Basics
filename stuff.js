var counter = function(arr)
{
	 return "Counter Function : There are "+arr.length+" elements in array";
};

var  adder = function(a,b){
	return 'The sum is '+(a+b);
};

var pi  = 3.142;

module.exports = {
	myCounter : counter,
	myAdder : adder,
	myPi : pi
};
