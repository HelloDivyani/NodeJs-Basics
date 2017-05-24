var counter = function(arr)
{
	// count the number of elements in the array
	return 'There are '+arr.length+' elements in the array';
}
console.log(counter(['ab','sd','dcds']));

// This is module js

// Determine which part of module to be availabale outside the module
module.exports = counter;