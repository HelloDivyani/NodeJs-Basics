var http  = require('http');
// ReadStream 
var fs = require('fs');
var readStream  = fs.createReadStream(__dirname+'/readMe.txt','utf-8');
 var writeStream  = fs.createWriteStream(__dirname+'/writeMe.txt');
 // Sending Data into chunks : on data event
/** readStream.on('data',function(chunk){
	 console.log("New Chunk Received  :");
	 writeStream.write(chunk);
	 console.log('Written');
	 //console.log(chunk);	
 });**/
 readStream.pipe(writeStream);
 
 



// 	Creating  Server Using Node JS : 
// writeHead  - status and Object
var server = http.createServer(function(req,res){
	// With response we send extra information headers
	// Accessing the url
	console.log('Request Data : '+req.url);
	console.log("Success in Creating server")
	res.writeHead(200,{'Content-Type' : 'text/plain'});
	// res.end is close the res and send it to the browser
	res.end('Sending Text');
});

server.listen(3000,'127.0.0.1');
console.log("Connected to port 3000");
