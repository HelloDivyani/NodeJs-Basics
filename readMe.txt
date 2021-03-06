Data From Readme Hello
Included More Data for consuming some more time....
Check it out....

fs.readFile('readMe.txt','utf-8',function(err,data){
	//Asynchronous Callback Done when reading Operation of readMe.txt is completed
	console.log("Asynchronus Callback -----------------Data------Read from Asynchronous : "+data);
	fs.writeFile('writeMe.txt',data);
});


tore and sync data with our NoSQL cloud database. Data is synced across all clients in realtime, and remains available when your app goes offline.

The Firebase Realtime Database is a cloud-hosted database. Data is stored as JSON and synchronized in realtime to every connected client. When you build cross-platform apps with our iOS, Android, and JavaScript SDKs, all of your clients share one Realtime Database instance and automatically receive

n this article we show you how to build a signaling service, and how to deal with the quirks of real-world connectivity by using STUN and TURN servers. We also explain how WebRTC apps can handle multi-party calls and interact with services such as VoIP and PSTN (aka telephones).

If you're not familiar with the basics of WebRTC, we strongly recommend you take a look at Getting Started With WebRTC before reading this article.

What is signaling?

Signaling is the process of coordinating communication. In order for a WebRTC application to set up a 'call', its clients need to exchange information:

Session control messages used to open or close communication.
Error messages.
Media metadata such as codecs and codec settings, bandwidth and media types.
Key data, used to establish secure connections.
Network data, such as a host's IP address and port as seen by the outside world.
This signaling process needs a way for clients to pass messages back and forth. That mechanism is not implemented by the WebRTC APIs: you need to build it yourself. We describe below some ways to build a signaling service. First, however, a little context...

Why is signaling not defined by WebRTC?

To avoid redundancy and to maximize compatibility with established technologies, signaling methods and protocols are not specified by WebRTC standards. This approach is outlined by JSEP, the JavaScript Session Establishment Protocol:

The thinking behind WebRTC call setup has been to fully specify and control the media plane, but to leave the signaling plane up to the application as much as possible. The rationale is that different applications may prefer to use different protocols, such as the existing SIP or Jingle call signaling protocols, or something custom to the particular application, perhaps for a novel use case. In this approach, the key information that needs to be exchanged is the multimedia session description, which specifies the necessary transport and media configuration information necessary to establish the media plane.
JSEP's architecture also avoids a browser having to save state: that is, to function as a signaling state machine. This would be problematic if, for example, signaling data was lost each time a page was reloaded. Instead, signaling state can be saved on a server.

JSEP architecture diagram
JSEP architecture
JSEP requires the exchange between peers of offer and answer: the media metadata mentioned above. Offers and answers are communicated in Session Description Protocol format (SDP), which look like this:

v=0
o=- 7614219274584779017 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE audio video
a=msid-semantic: WMS
m=audio 1 RTP/SAVPF 111 103 104 0 8 107 106 105 13 126
c=IN IP4 0.0.0.0
a=rtcp:1 IN IP4 0.0.0.0
a=ice-ufrag:W2TGCZw2NZHuwlnf
a=ice-pwd:xdQEccP40E+P0L5qTyzDgfmW
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level
a=mid:audio
a=rtcp-mux
a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:9c1AHz27dZ9xPI91YNfSlI67/EMkjHHIHORiClQe
a=rtpmap:111 opus/48000/2
�
Want to know what all this SDP gobbledygook actually means? Take a look at the IETF examples.

Bear in mind that WebRTC is designed so that the offer or answer can be tweaked before being set as the local or remote description, by editing the values in the SDP text. For example, the preferAudioCodec() function in apprtc.appspot.com can be used to set the default codec and bitrate. SDP is somewhat painful to manipulate with JavaScript, and there is discussion about whether future versions of WebRTC should use JSON instead, but there are some advantages to sticking with SDP.

RTCPeerConnection + signaling: offer, answer and candidate

RTCPeerConnection is the API used by WebRTC applications to create a connection between peers and communicate audio and video.

To initialise this process RTCPeerConnection has two tasks:

Ascertain local media conditions, such as resolution and codec capabilities. This is the metadata used for the offer and answer mechanism.
Get potential network addresses for the application's host, known as candidates.
Once this local data has been ascertained, it must be exchanged via a signaling mechanism with the remote peer.

Imagine Alice is trying to call Eve. Here's the full offer/answer mechanism in all its gory detail:

Alice creates an RTCPeerConnection object.
Alice creates an offer (an SDP session description) with the RTCPeerConnection createOffer() method.
Alice calls setLocalDescription() with his offer.
Alice stringifies the offer and uses a signaling mechanism to send it to Eve.

Eve calls setRemoteDescription() with Alice's offer, so that her RTCPeerConnection knows about Alice's setup.
Eve calls createAnswer(), and the success callback for this is passed a local session description: Eve's answer.
Eve sets her answer as the local description by calling setLocalDescription().
Eve then uses the signaling mechanism to send her stringified answer back to Alice.
Alice sets Eve's answer as the remote session description using setRemoteDescription().

Strewth!

Alice and Eve also need to exchange network information. The expression 'finding candidates' refers to the process of finding network interfaces and ports using the ICE framework.

Alice creates an RTCPeerConnection object with an onicecandidate handler.
The handler is called when network candidates become available.
In the handler, Alice sends stringified candidate data to Eve, via their signaling channel.
When Eve gets a candidate message from Alice, she calls addIceCandidate(), to add the candidate to the remote peer description.
JSEP supports ICE Candidate Trickling, which allows the caller to incrementally provide candidates to the callee after the initial offer, and for the callee to begin acting on the call and setting up a connection without waiting for all candidates to arrive.

Coding WebRTC for signaling

Below is a W3C code example that summarises the complete signaling process. The code assumes the existence of some signaling mechanism, SignalingChannel. Signaling is discussed in greater detail below.

var signalingChannel = new SignalingChannel();
var configuration = {
  'iceServers': [{
    'url': 'stun:stun.example.org'
  }]
};
var pc;

// call start() to initiate

function start() {
  pc = new RTCPeerConnection(configuration);

  // send any ice candidates to the other peer
  pc.onicecandidate = function (evt) {
    if (evt.candidate)
      signalingChannel.send(JSON.stringify({
        'candidate': evt.candidate
      }));
  };

  // let the 'negotiationneeded' event trigger offer generation
  pc.onnegotiationneeded = function () {
    pc.createOffer(localDescCreated, logError);
  }

  // once remote stream arrives, show it in the remote video element
  pc.onaddstream = function (evt) {
    remoteView.src = URL.createObjectURL(evt.stream);
  };

  // get a local stream, show it in a self-view and add it to be sent
  navigator.getUserMedia({
    'audio': true,
    'video': true
  }, function (stream) {
    selfView.src = URL.createObjectURL(stream);
    pc.addStream(stream);
  }, logError);
}

function localDescCreated(desc) {
  pc.setLocalDescription(desc, function () {
    signalingChannel.send(JSON.stringify({
      'sdp': pc.localDescription
    }));
  }, logError);
}

signalingChannel.onmessage = function (evt) {
  if (!pc)
    start();

  var message = JSON.parse(evt.data);
  if (message.sdp)
    pc.setRemoteDescription(new RTCSessionDescription(message.sdp), function () {
      // if we received an offer, we need to answer
      if (pc.remoteDescription.type == 'offer')
        pc.createAnswer(localDescCreated, logError);
    }, logError);
  else
    pc.addIceCandidate(new RTCIceCandidate(message.candidate));
};

function logError(error) {
  log(error.name + ': ' + error.message);
}
To see the offer/answer and candidate exchange processes in action, take a look at the console log for the 'single-page' video chat example at simpl.info/pc. If you want more, download a complete dump of WebRTC signaling and stats from the chrome://webrtc-internals page in Chrome or the opera://webrtc-internals page in Opera.

Peer discovery

This is fancy way of saying � how do I find someone to talk to?

For telephone calls we have telephone numbers and directories. For online video chat and messaging, we need identity and presence management systems, and a means for users to initiate sessions. WebRTC apps need a way for clients to signal to each other that they want to start or join a call.

Peer discovery mechanisms are not defined by WebRTC and we won't go into the options here. The process can be as simple as emailing or messaging a URL: for video chat applications such as talky.io, tawk.com and browsermeeting.com you invite people to a call by sharing a custom link. Developer Chris Ball has built an intriguing serverless-webrtc experiment that enables WebRTC call participants to exchange metadata by any messaging service they like, such as IM, email or homing pigeon.

How can I build a signaling service?

To reiterate: signaling protocols and mechanisms are not defined by WebRTC standards. Whatever you choose, you'll need an intermediary server to exchange signaling messages and application data between clients. Sadly, a web app cannot simply shout into the internet 'Connect me to my friend!' 

Thankfully signaling messages are small, and mostly exchanged at the start of a call. In testing with apprtc.appspot.com and samdutton-nodertc.jit.su we found that, for a video chat session, a total of around 30�45 messages were handled by the signaling service, with a total size for all messages of around 10kB.

As well as being relatively undemanding in terms of bandwidth, WebRTC signaling services don't consume much processing or memory, since they only need to relay messages and retain a small amount of session state data (such as which clients are connected).

The signaling mechanism used to exchange session metadata can also be used to communicate application data. It's just a messaging service!

Pushing messages from the server to the client

A message service for signaling needs to be bidirectional: client to server and server to client. Bidirectional communication goes against the HTTP client/server request/response model, but various hacks such as long polling have been developed over many years in order to push data from a service running on a web server to a web app running in a browser.

More recently, the EventSource API has been widely implemented. This enables 'server-sent events': data sent from a web server to a browser client via HTTP. There's a simple demo at simpl.info/es. EventSource is designed for one way messaging, but it can be used in combination with XHR to build a service for exchanging signaling messages: a signaling service passes on a message from a caller, delivered by XHR request, by pushing it via EventSource to the callee.

WebSocket is a more natural solution, designed for full duplex client�server communication (messages can flow in both directions at the same time). One advantage of a signaling service built with pure WebSocket or Server-Sent Events (EventSource) is that the back-end for these APIs can be implemented on a variety of web frameworks common to most web hosting packages, for languages such as PHP, Python and Ruby.

About three quarters of browsers support WebSocket and, more importantly, all browsers that support WebRTC also support WebSocket, both on desktop and mobile. TLS should be used for all connections, to ensure messages cannot be intercepted unencrypted, and also to reduce problems with proxy traversal. (For more information about WebSocket and proxy traversal see the WebRTC chapter in Ilya Grigorik's High Performance Browser Networking. Peter Lubber's WebSocket Cheat Sheet has more information about WebSocket clients and servers.)

Signaling for the canonical apprtc.appspot.com WebRTC video chat application is accomplished via the Google App Engine Channel API, which uses Comet techniques (long polling) to enable signaling with push communication between the App Engine backend and the web client. (There's a long-standing bug for App Engine to support WebSocket. Star the bug to vote it up!) There is a detailed code walkthrough of this app in the HTML5 Rocks WebRTC article.

The apprtc.appspot.com video chat application
apprtc in action
It is also possible to handle signaling by getting WebRTC clients to poll a messaging server repeatedly via Ajax, but that leads to a lot of redundant network requests, which is especially problematic for mobile devices. Even after a session has been established, peers need to poll for signaling messages in case of changes or session termination by other peers. The WebRTC Book app example takes this option, with some optimizations for polling frequency.

Scaling signaling

Although a signaling service consumes relatively little bandwidth and CPU per client, signaling servers for a popular application may have to handle a lot of messages, from different locations, with high levels of concurrency. WebRTC apps that get a lot of traffic need signaling servers able to handle considerable load.

We won't go into detail here, but there are a number of options for high volume, high performance messaging, including the following:

eXtensible Messaging and Presence Protocol (XMPP), originally known as Jabber: a protocol developed for instant messaging that can be used for signaling. Server implementations include ejabberd and Openfire. JavaScript clients such as Strophe.js use BOSH to emulate bidirectional streaming, but for various reasons BOSH may not be as efficient as WebSocket, and for the same reasons may not scale well. (On a tangent: Jingle is an XMPP extension to enable voice and video; the WebRTC project uses network and transport components from the libjingle library, a C++ implementation of Jingle.)
Open source libraries such as ZeroMQ (as used by TokBox for their Rumour service) and OpenMQ. NullMQ applies ZeroMQ concepts to web platforms, using the STOMP protocol over WebSocket.
Commercial cloud messaging platforms that use WebSocket (though they may fall back to long polling) such as Pusher, Kaazing and PubNub. (PubNub also has an API for WebRTC.)
Commercial WebRTC platforms such as vLine.
(Developer Phil Leggetter's Real-Time Web Technologies Guide provides a comprehensive list of messaging services and libraries.)

Building a signaling service with Socket.io on Node

Below is code for a simple web application that uses a signaling service built with Socket.io on Node. The design of Socket.io makes it simple to build a service to exchange messages, and Socket.io is particularly suited to WebRTC signaling because of its built-in concept of 'rooms'. This example is not designed to scale as a production-grade signaling service, but works well for a relatively small number of users.

Socket.io uses WebSocket with the following fallbacks: Adobe Flash Socket, AJAX long polling, AJAX multipart streaming, Forever Iframe and JSONP polling. It has been ported to various backends, but is perhaps best known for its Node version, which we use in the example below.

There's no WebRTC in this example: it's designed only to show how to build signaling into a web app. View the console log to see what's happening as clients join a room and exchange messages. Our WebRTC codelab gives step-by-step instructions how to integrate this example into a complete WebRTC video chat application. You can download the code from step 5 of the codelab repo or try it out live at samdutton-nodertc.jit.su: open the URL in two browsers for video chat.

Here is the client, index.html:

<!DOCTYPE html>
<html>
  <head>
    <title>WebRTC client</title>
  </head>
  <body>
    <script src='/socket.io/socket.io.js'></script>
    <script src='js/main.js'></script>
  </body>
</html>
...and the JavaScript file main.js referenced in the client:

var isInitiator;

room = prompt('Enter room name:');

var socket = io.connect();

if (room !== '') {
  console.log('Joining room ' + room);
  socket.emit('create or join', room);
}

socket.on('full', function (room){
  console.log('Room ' + room + ' is full');
});

socket.on('empty', function (room){
  isInitiator = true;
  console.log('Room ' + room + ' is empty');
});

socket.on('join', function (room){
  console.log('Making request to join room ' + room);
  console.log('You are the initiator!');
});

socket.on('log', function (array){
  console.log.apply(console, array);
});
The complete server app:

var static = require('node-static');
var http = require('http');
var file = new(static.Server)();
var app = http.createServer(function (req, res) {
  file.serve(req, res);
}).listen(2013);

var io = require('socket.io').listen(app);

io.sockets.on('connection', function (socket){

  // convenience function to log server messages to the client
  function log(){
    var array = ['>>> Message from server: '];
    for (var i = 0; i < arguments.length; i++) {
      array.push(arguments[i]);
    }
      socket.emit('log', array);
  }

  socket.on('message', function (message) {
    log('Got message:', message);
    // for a real app, would be room only (not broadcast)
    socket.broadcast.emit('message', message);
  });

  socket.on('create or join', function (room) {
    var numClients = io.sockets.clients(room).length;

    log('Room ' + room + ' has ' + numClients + ' client(s)');
    log('Request to create or join room ' + room);

    if (numClients === 0){
      socket.join(room);
      socket.emit('created', room);
    } else if (numClients === 1) {
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room);
    } else { // max two clients
      socket.emit('full', room);
    }
    socket.emit('emit(): client ' + socket.id + ' joined room ' + room);
    socket.broadcast.emit('broadcast(): client ' + socket.id + ' joined room ' + room);

  });

});
(You don't need to learn about node-static for this: it just makes the server simpler.)

To run this app on localhost, you need to have Node, socket.io and node-static installed. Node can be downloaded from nodejs.org (installation is straightforward and quick). To install socket.io and node-static, run Node Package Manager from a terminal in your application directory:

npm install socket.io
npm install node-static
To start the server, run the following command from a terminal in your application directory:

node server.js
From your browser, open localhost:2013. Open a new tab page or window in any browser and open localhost:2013 again. To see what's happening, check the console: in Chrome and Opera, you can access this via the DevTools with Command-Option-J or Ctrl-Shift-J.

Whatever approach you choose for signaling, your backend and client app will � at the very least � need to provide services similar to this example.

Using RTCDataChannel for signaling

A signaling service is required to initiate a WebRTC session.

However, once a connection has been established between two peers, RTCDataChannel could, in theory, take over as the signaling channel. This might reduce latency for signaling � since messages fly direct � and help reduce signaling server bandwidth and processing costs. We don't have a demo, but watch this space!

Signaling gotchas

RTCPeerConnection won't start gathering candidates until setLocalDescription() is called: this is mandated in the JSEP IETF draft.
Take advantage of Trickle ICE (see above): call addIceCandidate() as soon as candidates arrive.
Readymade signaling servers

If you don't want to roll your own, there are several WebRTC signaling servers available, which use Socket.io like the example above, and are integrated with WebRTC client JavaScript libraries:

webRTC.io: one of the first abstraction libraries for WebRTC.
easyRTC: a full-stack WebRTC package.
Signalmaster: a signaling server created for use with the SimpleWebRTC JavaScript client library.
...and if you don't want to write any code at all, complete commercial WebRTC platforms are available from companies such as vLine, OpenTok and Asterisk.

For the record, Ericsson built a signaling server using PHP on Apache in the early days of WebRTC. This is now somewhat obsolete, but it's worth looking at the code if you're considering something similar.

Signaling security

Security is the art of making nothing happen.

� Salman Rushdie

Encryption is mandatory for all WebRTC components.

However, signaling mechanisms aren't defined by WebRTC standards, so it's up to you make signaling secure. If an attacker manages to hijack signaling, they can stop sessions, redirect connections and record, alter or inject content.

The most important factor in securing signaling is to use secure protocols, HTTPS and WSS (i.e TLS), which ensure that messages cannot be intercepted unencrypted. Also be careful not to broadcast signaling messages in a way that they can be accessed by other callers using the same signaling server.

To secure a WebRTC app it is absolutely imperative that signaling uses TLS.

After signaling: using ICE to cope with NATs and firewalls

For metadata signaling, WebRTC apps use an intermediary server, but for actual media and data streaming once a session is established, RTCPeerConnection attempts to connect clients directly: peer to peer.

In a simpler world, every WebRTC endpoint would have a unique address that it could exchange with other peers in order to communicate directly.

Simple peer to peer connection
A world without NATs and firewalls
In reality most devices live behind one or more layers of NAT, some have anti-virus software that blocks certain ports and protocols, and many are behind proxies and corporate firewalls. A firewall and NAT may in fact be implemented by the same device, such as a home wifi router.

Peers behind NATs and firewalls
The real world
WebRTC apps can use the ICE framework to overcome the complexities of real-world networking. To enable this to happen, your application must pass ICE server URLs to RTCPeerConnection, as described below.

ICE tries to find the best path to connect peers. It tries all possibilities in parallel and chooses the most efficient option that works. ICE first tries to make a connection using the host address obtained from a device's operating system and network card; if that fails (which it will for devices behind NATs) ICE obtains an external address using a STUN server, and if that fails, traffic is routed via a TURN relay server.

In other words:

A STUN server is used to get an external network address.
TURN servers are used to relay traffic if direct (peer to peer) connection fails.
Every TURN server supports STUN: a TURN server is a STUN server with added relaying functionality built in. ICE also copes with the complexities of NAT setups: in reality, NAT 'hole punching' may require more than just a public IP:port address.

URLs for STUN and/or TURN servers are (optionally) specified by a WebRTC app in the iceServers configuration object that is the first argument to the RTCPeerConnection constructor. For apprtc.appspot.com that value looks like this:

{
  'iceServers': [
    {
      'url': 'stun:stun.l.google.com:19302'
    },
    {
      'url': 'turn:192.158.29.39:3478?transport=udp',
      'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      'username': '28224511:1379330808'
    },
    {
      'url': 'turn:192.158.29.39:3478?transport=tcp',
      'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      'username': '28224511:1379330808'
    }
  ]
}
Note: the TURN credentials example shown above was time-limited and expired in September 2013. TURN servers are expensive to run and you w?ll need to pay for your own servers or find a service provider. To test credentials you can use the candidate gathering sample and check if you get a candidate with type relay.

Once RTCPeerConnection has that information, the ICE magic happens automatically: RTCPeerConnection uses the ICE framework to work out the best path between peers, working with STUN and TURN servers as necessary.

STUN

NATs provide a device with an IP address for use within a private local network, but this address can't be used externally. Without a public address, there's no way for WebRTC peers to communicate. To get around this problem WebRTC uses STUN.

STUN servers live on the public internet and have one simple task: check the IP:port address of an incoming request (from an application running behind a NAT) and send that address back as a response. In other words, the application uses a STUN server to discover its IP:port from a public perspective. This process enables a WebRTC peer to get a publicly accessible address for itself, and then pass that on to another peer via a signaling mechanism, in order to set up a direct link. (In practice, different NATs work in different ways, and there may be multiple NAT layers, but the principle is still the same.)

STUN servers don't have to do much or remember much, so relatively low-spec STUN servers can handle a large number of requests.

Most WebRTC calls successfully make a connection using STUN: 86%, according to webrtcstats.com, though this can be less for calls between peers behind firewalls and complex NAT configurations.

Peer to peer connection using a STUN server
Using STUN servers to get public IP:port addresses
TURN

RTCPeerConnection tries to set up direct communication between peers over UDP. If that fails, RTCPeerConnection resorts to TCP. If that fails, TURN servers can be used as a fallback, relaying data between endpoints.

Just to reiterate: TURN is used to relay audio/video/data streaming between peers, not signaling data!

TURN servers have public addresses, so they can be contacted by peers even if the peers are behind firewalls or proxies. TURN servers have a conceptually simple task � to relay a stream � but, unlike STUN servers, they inherently consume a lot of bandwidth. In other words, TURN servers need to be beefier.

Peer to peer connection using a STUN server
The full Monty: STUN, TURN and signaling
This diagram shows TURN in action: pure STUN didn't succeed, so each peer resorts to using a TURN server.

Deploying STUN and TURN servers

For testing, Google runs a public STUN server, stun.l.google.com:19302, as used by apprtc.appspot.com. For a production STUN/TURN service, we recommend using the rfc5766-turn-server; source code for STUN and TURN servers is available from code.google.com/p/rfc5766-turn-server, which also provides links to several sources of information about server installation. A VM image for Amazon Web Services is also available.

An alternative TURN server is restund, available as source code and also for AWS. Below are instructions how to set up restund on Google Compute Engine.

Open firewall as necessary, for tcp=443, udp/tcp=3478
Create four instances, one for each public IP, Standard Ubuntu 12.06 image
Set up local firewall config (allow ANY from ANY)
Install tools:
sudo apt-get install make
sudo apt-get install gcc
Install libre from creytiv.com/re.html
Fetch restund from creytiv.com/restund.html and unpack
wget hancke.name/restund-auth.patch and apply with patch -p1 < restund-auth.patch
Run make, sudo make install for libre and restund
Adapt restund.conf to your needs (replace IP addresses and make sure it contains the same shared secret) and copy to /etc
Copy restund/etc/restund to /etc/init.d/
Configure restund:
Set LD_LIBRARY_PATH
Copy restund.conf to /etc/restund.conf
Set restund.conf to use the right 10. IP address
Run restund
Test using stund client from remote machine: ./client IP:port
Beyond one-to-one: multi-party WebRTC

You may also want to take a look at Justin Uberti's proposed IETF standard for a REST API for access to TURN Services.

It's easy to imagine use cases for media streaming that go beyond a simple one-to-one call: for example, video conferencing between a group of colleagues, or a public event with one speaker and hundreds (or millions) of viewers.

A WebRTC app can use multiple RTCPeerConnections so to that every endpoint connects to every other endpoint in a mesh configuration. This is the approach taken by apps such as talky.io, and works remarkably well for a small handful of peers. Beyond that, processing and bandwidth consumption becomes excessive, especially for mobile clients.

Mesh: small N-way call
Full mesh topology: everyone connected to everyone
Alternatively, a WebRTC app could choose one endpoint to distribute streams to all others, in a star configuration. It would also be possible to run a WebRTC endpoint on a server and construct your own redistribution mechanism (a sample client application is provided by webrtc.org).

Since Chrome 31 and Opera 18, a MediaStream from one RTCPeerConnection can be used as the input for another: there's a demo at simpl.info/multi. This can enable more flexible architectures, since it enables a web app to handle call routing by choosing which other peer to connect to.

Multipoint Control Unit

A better option for a large number of endpoints is to use a Multipoint Control Unit (MCU). This is a server that works as a bridge to distribute media between a large numbers of participants. MCUs can cope with different resolutions, codecs and frame rates within a video conference, handle transcoding, do selective stream forwarding, and mix or record audio and video. For multi-party calls, there are a number of issues to consider: in particular, how to display multiple video inputs and mix audio from multiple sources. Cloud platforms such as vLine also attempt to optimize traffic routing.

It's possible to buy a complete MCU hardware package, or build your own.

Rear view of Cisco MCU5300
The back of a Cisco MCU
Several open source MCU software options are available. For example, Licode (previously know as Lynckia) produces an open source MCU for WebRTC; OpenTok has Mantis.

Beyond browsers: VoIP, telephones and messaging

The standardized nature of WebRTC makes it possible to establish communication between a WebRTC app running in a browser and a device or platform running on another communication platform, such as a telephone or a video conferencing systems.

SIP is a signaling protocol used by VoIP and video conferencing systems. To enable communication between a WebRTC web app and a SIP client such as a video conferencing system, WebRTC needs a proxy server to mediate signaling. Signaling must flow via the gateway but, once communication has been established, SRTP traffic (video and audio) can flow directly peer to peer.

PSTN, the Public Switched Telephone Network, is the circuit switched network of all 'plain old' analogue telephones. For calls between WebRTC web apps and telephones, traffic must go through a PSTN gateway. Likewise, WebRTC web apps need an intermediary XMPP server to communicate with Jingle endpoints such as IM clients. Jingle was developed by Google as an extension to XMPP to enable voice and video for messaging services: current WebRTC implementations are based on the C++ libjingle library, an implementation of Jingle initially developed for Google Talk.

A number of apps, libraries and platforms make use of WebRTC's ability to communicate with the outside world:

sipML5: an open source JavaScript SIP client
jsSIP: JavaScript SIP library
Phono: open source JavaScript phone API, built as a plugin
Zingaya: an embeddable phone widget
Twilio: voice and messaging
Uberconference: conferencing
The sipML5 developers have also built the webrtc2sip gateway. Tethr and Tropo have demonstrated a framework for disaster communications 'in a briefcase', using an OpenBTS cell to enable communications between feature phones and computers via WebRTC. Telephone communication without a carrier!

Find out more

WebRTC codelab: step-by-step instructions how to build a video and text chat application, using a Socket.io signaling service running on Node.

2013 Google I/O WebRTC presentation with WebRTC tech lead, Justin Uberti.

Chris Wilson's SFHTML5 presentation: Introduction to WebRTC Apps.

The WebRTC Book gives a lot of detail about data and signaling pathways, and includes a number of detailed network topology diagrams.

WebRTC and Signaling: What Two Years Has Taught Us: TokBox blog post about why leaving signaling out of the spec was a good idea.
en Strong's presentation A Practical Guide to Building WebRTC Apps provides a lot of information about WebRTC topologies and infrastructure.

The WebRTC chapter in Ilya Grigorik's High Performance Browser Networking goes deep into WebRTC architecture, use cases and performance.

2
Next steps

Share

Twitter Facebook Google+
Subscribe

Enjoyed this article? Grab the RSS feed and stay up-to-date.

Except as otherwise noted, the content of this page is licensed under the Creative Commons Attribution 3.0 License, and code samples are licensed under the Apach

 updates with the newest data.

HOME TUTORIALS UPDATES
Getting Started with WebRTC
HTML5 Rocks
Table of Contents

Real-time communication without plugins
Quick start
A very short history of WebRTC
Where are we now?
My first WebRTC
MediaStream (aka getUserMedia)
Signaling: session control, network and media information
RTCPeerConnection
RTCDataChannel
Security
In conclusion
Developer tools
Learn more
Standards and protocols
WebRTC support summary
Localizations

???
Fran�ais
Contribute another
Sam Dutton
By Sam Dutton
Published: July 23rd, 2012
Updated: February 21st, 2014
Comments: 2
WebRTC is a new front in the long war for an open and unencumbered web. Brendan Eich, inventor of JavaScript
Real-time communication without plugins

Imagine a world where your phone, TV and computer could all communicate on a common platform. Imagine it was easy to add video chat and peer-to-peer data sharing to your web application. That's the vision of WebRTC.

Want to try it out? WebRTC is available now in Google Chrome, Opera and Firefox. A good place to start is the simple video chat application at apprtc.appspot.com:

Open apprtc.appspot.com in Chrome, Opera or Firefox.
Click the Allow button to let the app use your webcam.
Open the URL displayed at the bottom of the page in a new tab or, better still, on a different computer.
There is a walkthrough of this application later in this article.

Quick start

Haven't got time to read this article, or just want code?

Get an overview of WebRTC from the Google I/O presentation (the slides are here):


If you haven't used getUserMedia, take a look at the HTML5 Rocks article on the subject, and view the source for the simple example at simpl.info/gum.
Get to grips with the RTCPeerConnection API by reading through the simple example below and the demo at simpl.info/pc, which implements WebRTC on a single web page.
Learn more about how WebRTC uses servers for signaling, and firewall and NAT traversal, by reading through the code and console logs from apprtc.appspot.com.
Can�t wait and just want to try out WebRTC right now? Try out some of the 20+ demos that exercise the WebRTC JavaScript APIs.
Having trouble with your machine and WebRTC? Try out our troubleshooting page test.webrtc.org.
Alternatively, jump straight into our WebRTC codelab: a step-by-step guide that explains how to build a complete video chat app, including a simple signaling server.

A very short history of WebRTC

One of the last major challenges for the web is to enable human communication via voice and video: Real Time Communication, RTC for short. RTC should be as natural in a web application as entering text in a text input. Without it, we're limited in our ability to innovate and develop new ways for people to interact.

Historically, RTC has been corporate and complex, requiring expensive audio and video technologies to be licensed or developed in house. Integrating RTC technology with existing content, data and services has been difficult and time consuming, particularly on the web.

Gmail video chat became popular in 2008, and in 2011 Google introduced Hangouts, which use the Google Talk service (as does Gmail). Google bought GIPS, a company which had developed many components required for RTC, such as codecs and echo cancellation techniques. Google open sourced the technologies developed by GIPS and engaged with relevant standards bodies at the IETF and W3C to ensure industry consensus. In May 2011, Ericsson built the first implementation of WebRTC.

WebRTC has now implemented open standards for real-time, plugin-free video, audio and data communication. The need is real:

Many web services already use RTC, but need downloads, native apps or plugins. These includes Skype, Facebook (which uses Skype) and Google Hangouts (which use the Google Talk plugin).
Downloading, installing and updating plugins can be complex, error prone and annoying.
Plugins can be difficult to deploy, debug, troubleshoot, test and maintain�and may require licensing and integration with complex, expensive technology. It's often difficult to persuade people to install plugins in the first place!
The guiding principles of the WebRTC project are that its APIs should be open source, free, standardized, built into web browsers and more efficient than existing technologies.

Where are we now?

WebRTC is used in various apps like WhatsApp, Facebook Messenger, appear.in and platforms such as TokBox. There is even an experimental WebRTC enabled iOS Browser named Bowser. WebRTC has also been integrated with WebKitGTK+ and Qt native apps.

Microsoft added MediaCapture and Stream APIs to Edge.

WebRTC implements three APIs:

MediaStream (aka getUserMedia)
RTCPeerConnection
RTCDataChannel
getUserMedia is available in Chrome, Opera, Firefox and Edge. Take a look at the cross-browser demo at demo and Chris Wilson's amazing examples using getUserMedia as input for Web Audio.

RTCPeerConnection is in Chrome (on desktop and for Android), Opera (on desktop and in the latest Android Beta) and in Firefox. A word of explanation about the name: after several iterations, RTCPeerConnection is currently implemented by Chrome and Opera as webkitRTCPeerConnection and by Firefox as mozRTCPeerConnection. Other names and implementations have been deprecated. When the standards process has stabilized, the prefixes will be removed. There's an ultra-simple demo of Chromium's RTCPeerConnection implementation at GitHub and a great video chat application at apprtc.appspot.com. This app uses adapter.js, a JavaScript shim, maintained Google with help from the WebRTC community, that abstracts away browser differences and spec changes.

RTCDataChannel is supported by Chrome, Opera and Firefox. Check out one of the data channel demos at GitHub to see it in action.

A word of warning

Be skeptical of reports that a platform 'supports WebRTC'. Often this actually just means that getUserMedia is supported, but not any of the other RTC components.

My first WebRTC

WebRTC applications need to do several things:

Get streaming audio, video or other data.
Get network information such as IP addresses and ports, and exchange this with other WebRTC clients (known as peers) to enable connection, even through NATs and firewalls.
Coordinate signaling communication to report errors and initiate or close sessions.
Exchange information about media and client capability, such as resolution and codecs.
Communicate streaming audio, video or data.
To acquire and communicate streaming data, WebRTC implements the following APIs:

MediaStream: get access to data streams, such as from the user's camera and microphone.
RTCPeerConnection: audio or video calling, with facilities for encryption and bandwidth management.
RTCDataChannel: peer-to-peer communication of generic data.
(There is detailed discussion of the network and signaling aspects of WebRTC below.)

MediaStream (aka getUserMedia)

The MediaStream API represents synchronized streams of media. For example, a stream taken from camera and microphone input has synchronized video and audio tracks. (Don't confuse MediaStream tracks with the <track> element, which is something entirely different.)

Probably the easiest way to understand MediaStream is to look at it in the wild:

In Chrome or Opera, open the demo at https://webrtc.github.io/samples/src/content/getusermedia/gum.
Open the console.
Inspect the stream variable, which is in global scope.
Each MediaStream has an input, which might be a MediaStream generated by navigator.getUserMedia(), and an output, which might be passed to a video element or an RTCPeerConnection.

The getUserMedia() method takes three parameters:

A constraints object.
A success callback which, if called, is passed a MediaStream.
A failure callback which, if called, is passed an error object.
Each MediaStream has a label, such as'Xk7EuLhsuHKbnjLWkW4yYGNJJ8ONsgwHBvLQ'. An array of MediaStreamTracks is returned by the getAudioTracks() and getVideoTracks() methods.

For the https://webrtc.github.io/samples/src/content/getusermedia/gum. example, stream.getAudioTracks() returns an empty array (because there's no audio) and, assuming a working webcam is connected, stream.getVideoTracks() returns an array of one MediaStreamTrack representing the stream from the webcam. Each MediaStreamTrack has a kind ('video' or 'audio'), and a label (something like 'FaceTime HD Camera (Built-in)'), and represents one or more channels of either audio or video. In this case, there is only one video track and no audio, but it is easy to imagine use cases where there are more: for example, a chat application that gets streams from the front camera, rear camera, microphone, and a 'screenshared' application.

In Chrome or Opera, the URL.createObjectURL() method converts a MediaStream to a Blob URL which can be set as the src of a video element. (In Firefox and Opera, the src of the video can be set from the stream itself.) Since version M25, Chromium-based browsers (Chrome and Opera) allow audio data from getUserMedia to be passed to an audio or video element (but note that by default the media element will be muted in this case).

getUserMedia can also be used as an input node for the Web Audio API:

function gotStream(stream) {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    var audioContext = new AudioContext();

    // Create an AudioNode from the stream
    var mediaStreamSource = audioContext.createMediaStreamSource(stream);

    // Connect it to destination to hear yourself
    // or any other node for processing!
    mediaStreamSource.connect(audioContext.destination);
}

navigator.getUserMedia({audio:true}, gotStream);
Chromium-based apps and extensions can also incorporate getUserMedia. Adding audioCapture and/or videoCapture permissions to the manifest enables permission to be requested and granted only once, on installation. Thereafter the user is not asked for permission for camera or microphone access.

Likewise on pages using HTTPS: permission only has to be granted once for for getUserMedia() (in Chrome at least). First time around, an Always Allow button is displayed in the browser's infobar.

Also, Chrome will deprecate HTTP access for getUserMedia() at the end of 2015 due to it being classified as a Powerful feature. You can already see a warning when invoked on a HTTP page on Chrome M44.

The intention is eventually to enable a MediaStream for any streaming data source, not just a camera or microphone. This would enable streaming from disc, or from arbitrary data sources such as sensors or other inputs.

Note that getUserMedia() must be used on a server, not the local file system, otherwise a PERMISSION_DENIED: 1 error will be thrown.

getUserMedia() really comes to life in combination with other JavaScript APIs and libraries:

Webcam Toy is a photobooth app that uses WebGL to add weird and wonderful effects to photos which can be shared or saved locally.
FaceKat is a 'face tracking' game built with headtrackr.js.
ASCII Camera uses the Canvas API to generate ASCII images.
ASCII image generated by idevelop.ro/ascii-camera
gUM ASCII art!
Constraints

Constraints have been implemented since Chrome, Firefox and Opera. These can be used to set values for video resolution for getUserMedia() and RTCPeerConnection addStream() calls. The intention is to implement support for other constraints such as aspect ratio, facing mode (front or back camera), frame rate, height and width, along with an applyConstraints() method.

There's an example at https://webrtc.github.io/samples/src/content/getusermedia/resolution/.

One gotcha: getUserMedia constraints set in one browser tab affect constraints for all tabs opened subsequently. Setting a disallowed value for constraints gives a rather cryptic error message:

navigator.getUserMedia error:
NavigatorUserMediaError {code: 1, PERMISSION_DENIED: 1}
Screen and tab capture

Chrome apps also make it possible to share a live 'video' of a single browser tab or the entire desktop via chrome.tabCapture and chrome.desktopCapture APIs. A desktop capture sample extension can be found in the WebRTC samples GitHub repository. For screencast, code and more information, see the HTML5 Rocks update: Screensharing with WebRTC.

It's also possible to use screen capture as a MediaStream source in Chrome using the experimental chromeMediaSource constraint, as in this demo. Note that screen capture requires HTTPS and should only be used for development due to it being enabled via a command line flag as explaind in this discuss-webrtc post.

Signaling: session control, network and media information

WebRTC uses RTCPeerConnection to communicate streaming data between browsers (aka peers), but also needs a mechanism to coordinate communication and to send control messages, a process known as signaling. Signaling methods and protocols are not specified by WebRTC: signaling is not part of the RTCPeerConnection API.

Instead, WebRTC app developers can choose whatever messaging protocol they prefer, such as SIP or XMPP, and any appropriate duplex (two-way) communication channel. The apprtc.appspot.com example uses XHR and the Channel API as the signaling mechanism. The codelab we built uses Socket.io running on a Node server.

Signaling is used to exchange three types of information:

Session control messages: to initialize or close communication and report errors.
Network configuration: to the outside world, what's my computer's IP address and port?
Media capabilities: what codecs and resolutions can be handled by my browser and the browser it wants to communicate with?
The exchange of information via signaling must have completed successfully before peer-to-peer streaming can begin.

For example, imagine Alice wants to communicate with Bob. Here's a code sample from the WebRTC W3C Working Draft, which shows the signaling process in action. The code assumes the existence of some signaling mechanism, created in the createSignalingChannel() method. Also note that on Chrome and Opera, RTCPeerConnection is currently prefixed.

 var signalingChannel = createSignalingChannel();
var pc;
var configuration = ...;

// run start(true) to initiate a call
function start(isCaller) {
    pc = new RTCPeerConnection(configuration);

    // send any ice candidates to the other peer
    pc.onicecandidate = function (evt) {
        signalingChannel.send(JSON.stringify({ "candidate": evt.candidate }));
    };

    // once remote stream arrives, show it in the remote video element
    pc.onaddstream = function (evt) {
        remoteView.src = URL.createObjectURL(evt.stream);
    };

    // get the local stream, show it in the local video element and send it
    navigator.getUserMedia({ "audio": true, "video": true }, function (stream) {
        selfView.src = URL.createObjectURL(stream);
        pc.addStream(stream);

        if (isCaller)
            pc.createOffer(gotDescription);
        else
            pc.createAnswer(pc.remoteDescription, gotDescription);

        function gotDescription(desc) {
            pc.setLocalDescription(desc);
            signalingChannel.send(JSON.stringify({ "sdp": desc }));
        }
    });
}

signalingChannel.onmessage = function (evt) {
    if (!pc)
        start(false);

    var signal = JSON.parse(evt.data);
    if (signal.sdp)
        pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    else
        pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
};
First up, Alice and Bob exchange network information. (The expression 'finding candidates' refers to the process of finding network interfaces and ports using the ICE framework.)

Alice creates an RTCPeerConnection object with an onicecandidate handler.
The handler is run when network candidates become available.
Alice sends serialized candidate data to Bob, via whatever signaling channel they are using: WebSocket or some other mechanism.
When Bob gets a candidate message from Alice, he calls addIceCandidate, to add the candidate to the remote peer description.
WebRTC clients (known as peers, aka Alice and Bob) also need to ascertain and exchange local and remote audio and video media information, such as resolution and codec capabilities. Signaling to exchange media configuration information proceeds by exchanging an offer and an answer using the Session Description Protocol (SDP):

Alice runs the RTCPeerConnection createOffer() method. The callback argument of this is passed an RTCSessionDescription: Alice's local session description.
In the callback, Alice sets the local description using setLocalDescription() and then sends this session description to Bob via their signaling channel. Note that RTCPeerConnection won't start gathering candidates until setLocalDescription() is called: this is codified in JSEP IETF draft.
Bob sets the description Alice sent him as the remote description using setRemoteDescription().
Bob runs the RTCPeerConnection createAnswer() method, passing it the remote description he got from Alice, so a local session can be generated that is compatible with hers. The createAnswer() callback is passed an RTCSessionDescription: Bob sets that as the local description and sends it to Alice.
When Alice gets Bob's session description, she sets that as the remote description with setRemoteDescription.
Ping!
RTCSessionDescription objects are blobs that conform to the Session Description Protocol, SDP. Serialized, an SDP object looks like this:

v=0
o=- 3883943731 1 IN IP4 127.0.0.1
s=
t=0 0
a=group:BUNDLE audio video
m=audio 1 RTP/SAVPF 103 104 0 8 106 105 13 126

// ...

a=ssrc:2223794119 label:H4fjnMzxy3dPIgQ7HxuCTLb4wLLLeRHnFxh810
The acquisition and exchange of network and media information can be done simultaneously, but both processes must have completed before audio and video streaming between peers can begin.

The offer/answer architecture described above is called JSEP, JavaScript Session Establishment Protocol. (There's an excellent animation explaining the process of signaling and streaming in Ericsson's demo video for its first WebRTC implementation.)

JSEP architecture diagram
JSEP architecture
Once the signaling process has completed successfully, data can be streamed directly peer to peer, between the caller and callee�or if that fails, via an intermediary relay server (more about that below). Streaming is the job of RTCPeerConnection.

RTCPeerConnection

RTCPeerConnection is the WebRTC component that handles stable and efficient communication of streaming data between peers.

Below is a WebRTC architecture diagram showing the role of RTCPeerConnection. As you will notice, the green parts are complex!

WebRTC architecture diagram
WebRTC architecture (from webrtc.org)
From a JavaScript perspective, the main thing to understand from this diagram is that RTCPeerConnection shields web developers from the myriad complexities that lurk beneath. The codecs and protocols used by WebRTC do a huge amount of work to make real-time communication possible, even over unreliable networks:

packet loss concealment
echo cancellation
bandwidth adaptivity
dynamic jitter buffering
automatic gain control
noise reduction and suppression
image 'cleaning'.
The W3C code above shows a simplified example of WebRTC from a signaling perspective. Below are walkthroughs of two working WebRTC applications: the first is a simple example to demonstrate RTCPeerConnection; the second is a fully operational video chat client.

RTCPeerConnection without servers

The code below is taken from the 'single page' WebRTC demo at https://webrtc.github.io/samples/src/content/peerconnection/pc1, which has local and remote RTCPeerConnection (and local and remote video) on one web page. This doesn't constitute anything very useful�caller and callee are on the same page�but it does make the workings of the RTCPeerConnection API a little clearer, since the RTCPeerConnection objects on the page can exchange data and messages directly without having to use intermediary signaling mechanisms.

One gotcha: the optional second 'constraints' parameter of the RTCPeerConnection() constructor is different from the constraints type used by getUserMedia(): see w3.org/TR/webrtc/#constraints for more information.

In this example, pc1 represents the local peer (caller) and pc2 represents the remote peer (callee).

Caller

Create a new RTCPeerConnection and add the stream from getUserMedia():

// servers is an optional config file (see TURN and STUN discussion below)
pc1 = new webkitRTCPeerConnection(servers);
// ...
pc1.addStream(localStream); 
Create an offer and set it as the local description for pc1 and as the remote description for pc2. This can be done directly in the code without using signaling, because both caller and callee are on the same page:

pc1.createOffer(gotDescription1);
//...
function gotDescription1(desc){
  pc1.setLocalDescription(desc);
  trace("Offer from pc1 \n" + desc.sdp);
  pc2.setRemoteDescription(desc);
  pc2.createAnswer(gotDescription2);
}
Callee

Create pc2 and, when the stream from pc1 is added, display it in a video element:

pc2 = new webkitRTCPeerConnection(servers);
pc2.onaddstream = gotRemoteStream;
//...
function gotRemoteStream(e){
  vid2.src = URL.createObjectURL(e.stream);
}
RTCPeerConnection plus servers

In the real world, WebRTC needs servers, however simple, so the following can happen:

Users discover each other and exchange 'real world' details such as names.
WebRTC client applications (peers) exchange network information.
Peers exchange data about media such as video format and resolution.
WebRTC client applications traverse NAT gateways and firewalls.
In other words, WebRTC needs four types of server-side functionality:

User discovery and communication.
Signaling.
NAT/firewall traversal.
Relay servers in case peer-to-peer communication fails.
NAT traversal, peer-to-peer networking, and the requirements for building a server app for user discovery and signaling, are beyond the scope of this article. Suffice to say that the STUN protocol and its extension TURN are used by the ICE framework to enable RTCPeerConnection to cope with NAT traversal and other network vagaries.

ICE is a framework for connecting peers, such as two video chat clients. Initially, ICE tries to connect peers directly, with the lowest possible latency, via UDP. In this process, STUN servers have a single task: to enable a peer behind a NAT to find out its public address and port. (Google has a couple of STUN severs, one of which is used in the apprtc.appspot.com example.)

Finding connection candidates
Finding connection candidates
If UDP fails, ICE tries TCP: first HTTP, then HTTPS. If direct connection fails�in particular, because of enterprise NAT traversal and firewalls�ICE uses an intermediary (relay) TURN server. In other words, ICE will first use STUN with UDP to directly connect peers and, if that fails, will fall back to a TURN relay server. The expression 'finding candidates' refers to the process of finding network interfaces and ports.

WebRTC data pathways
WebRTC data pathways
WebRTC engineer Justin Uberti provides more information about ICE, STUN and TURN in the 2013 Google I/O WebRTC presentation. (The presentation slides give examples of TURN and STUN server implementations.)

A simple video chat client

The walkthrough below describes the signaling mechanism used by apprtc.appspot.com.

If you find this somewhat baffling, you may prefer our WebRTC codelab. This step-by-step guide explains how to build a complete video chat application, including a simple signaling server built with Socket.io running on a Node server.
A good place to try out WebRTC, complete with signaling and NAT/firewall traversal using a STUN server, is the video chat demo at apprtc.appspot.com. This app uses adapter.js to cope with different RTCPeerConnection and getUserMedia() implementations.

The code is deliberately verbose in its logging: check the console to understand the order of events. Below we give a detailed walk-through of the code.

What's going on?

The demo starts by running the initialize() function:

function initialize() {
    console.log("Initializing; room=99688636.");
    card = document.getElementById("card");
    localVideo = document.getElementById("localVideo");
    miniVideo = document.getElementById("miniVideo");
    remoteVideo = document.getElementById("remoteVideo");
    resetStatus();
    openChannel('AHRlWrqvgCpvbd9B-Gl5vZ2F1BlpwFv0xBUwRgLF/* ...*/');
    doGetUserMedia();
  }
Note that values such as the room variable and the token used by openChannel(), are provided by the Google App Engine app itself: take a look at the index.html template in the repository to see what values are added.

This code initializes variables for the HTML video elements that will display video streams from the local camera (localVideo) and from the camera on the remote client (remoteVideo). resetStatus() simply sets a status message.

The openChannel() function sets up messaging between WebRTC clients:

function openChannel(channelToken) {
  console.log("Opening channel.");
  var channel = new goog.appengine.Channel(channelToken);
  var handler = {
    'onopen': onChannelOpened,
    'onmessage': onChannelMessage,
    'onerror': onChannelError,
    'onclose': onChannelClosed
  };
  socket = channel.open(handler);
}
For signaling, this demo uses the Google App Engine Channel API, which enables messaging between JavaScript clients without polling. (WebRTC signaling is covered in more detail above).

Architecture of the apprtc video chat application
Architecture of the apprtc video chat application
Establishing a channel with the Channel API works like this:

Client A generates a unique ID.
Client A requests a Channel token from the App Engine app, passing its ID.
App Engine app requests a channel and a token for the client's ID from the Channel API.
App sends the token to Client A.
Client A opens a socket and listens on the channel set up on the server.
The Google Channel API: establishing a channel
The Google Channel API: establishing a channel
Sending a message works like this:

Client B makes a POST request to the App Engine app with an update.
The App Engine app passes a request to the channel.
The channel carries a message to Client A.
Client A's onmessage callback is called.
The Google Channel API: sending a message
The Google Channel API: sending a message
Just to reiterate: signaling messages are communicated via whatever mechanism the developer chooses: the signaling mechanism is not specified by WebRTC. The Channel API is used in this demo, but other methods (such as WebSocket) could be used instead.

After the call to openChannel(), the getUserMedia() function called by initialize() checks if the browser supports the getUserMedia API. (Find out more about getUserMedia on HTML5 Rocks.) If all is well, onUserMediaSuccess is called:

function onUserMediaSuccess(stream) {
  console.log("User has granted access to local media.");
  // Call the polyfill wrapper to attach the media stream to this element.
  attachMediaStream(localVideo, stream);
  localVideo.style.opacity = 1;
  localStream = stream;
  // Caller creates PeerConnection.
  if (initiator) maybeStart();
}
This causes video from the local camera to be displayed in the localVideo element, by creating an object (Blob) URL for the camera's data stream and then setting that URL as the src for the element. (createObjectURL is used here as a way to get a URI for an 'in memory' binary resource, i.e. the LocalDataStream for the video.) The data stream is also set as the value of localStream, which is subsequently made available to the remote user.

At this point, initiator has been set to 1 (and it stays that way until the caller's session has terminated) so maybeStart() is called:

function maybeStart() {
  if (!started && localStream && channelReady) {
    // ...
    createPeerConnection();
    // ...
    pc.addStream(localStream);
    started = true;
    // Caller initiates offer to peer.
    if (initiator)
      doCall();
  }
}
This function uses a handy construct when working with multiple asynchronous callbacks: maybeStart() may be called by any one of several functions, but the code in it is run only when localStream has been defined and channelReady has been set to true and communication hasn't already started. So�if a connection hasn't already been made, and a local stream is available, and a channel is ready for signaling, a connection is created and passed the local video stream. Once that happens, started is set to true, so a connection won't be started more than once.

RTCPeerConnection: making a call

createPeerConnection(), called by maybeStart(), is where the real action begins:

function createPeerConnection() {
  var pc_config = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};
  try {
    // Create an RTCPeerConnection via the polyfill (adapter.js).
    pc = new RTCPeerConnection(pc_config);
    pc.onicecandidate = onIceCandidate;
    console.log("Created RTCPeerConnnection with config:\n" + "  \"" +
      JSON.stringify(pc_config) + "\".");
  } catch (e) {
    console.log("Failed to create PeerConnection, exception: " + e.message);
    alert("Cannot create RTCPeerConnection object; WebRTC is not supported by this browser.");
      return;
  }

  pc.onconnecting = onSessionConnecting;
  pc.onopen = onSessionOpened;
  pc.onaddstream = onRemoteStreamAdded;
  pc.onremovestream = onRemoteStreamRemoved;
}
The underlying purpose is to set up a connection, using a STUN server, with onIceCandidate() as the callback (see above for an explanation of ICE, STUN and 'candidate'). Handlers are then set for each of the RTCPeerConnection events: when a session is connecting or open, and when a remote stream is added or removed. In fact, in this example these handlers only log status messages�except for onRemoteStreamAdded(), which sets the source for the remoteVideo element:

function onRemoteStreamAdded(event) {
  // ...
  miniVideo.src = localVideo.src;
  attachMediaStream(remoteVideo, event.stream);
  remoteStream = event.stream;
  waitForRemoteVideo();
}
Once createPeerConnection() has been invoked in maybeStart(), a call is intitiated by creating and offer and sending it to the callee:

function doCall() {
  console.log("Sending offer to peer.");
  pc.createOffer(setLocalAndSendMessage, null, mediaConstraints);
}
The offer creation process here is similar to the no-signaling example above but, in addition, a message is sent to the remote peer, giving a serialized SessionDescription for the offer. This process is handled by setLocalAndSendMessage():

function setLocalAndSendMessage(sessionDescription) {
  // Set Opus as the preferred codec in SDP if Opus is present.
  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
  pc.setLocalDescription(sessionDescription);
  sendMessage(sessionDescription);
}
Signaling with the Channel API

The onIceCandidate() callback invoked when the RTCPeerConnection is successfully created in createPeerConnection() sends information about candidates as they are 'gathered':

function onIceCandidate(event) {
    if (event.candidate) {
      sendMessage({type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate});
    } else {
      console.log("End of candidates.");
    }
  }
Outbound messaging, from the client to the server, is done by sendMessage() with an XHR request:

function sendMessage(message) {
  var msgString = JSON.stringify(message);
  console.log('C->S: ' + msgString);
  path = '/message?r=99688636' + '&u=92246248';
  var xhr = new XMLHttpRequest();
  xhr.open('POST', path, true);
  xhr.send(msgString);
}
XHR works fine for sending signaling messages from the client to the server, but some mechanism is needed for server-to-client messaging: this application uses the Google App Engine Channel API. Messages from the API (i.e. from the App Engine server) are handled by processSignalingMessage():

function processSignalingMessage(message) {
  var msg = JSON.parse(message);

  if (msg.type === 'offer') {
    // Callee creates PeerConnection
    if (!initiator && !started)
      maybeStart();

    pc.setRemoteDescription(new RTCSessionDescription(msg));
    doAnswer();
  } else if (msg.type === 'answer' && started) {
    pc.setRemoteDescription(new RTCSessionDescription(msg));
  } else if (msg.type === 'candidate' && started) {
    var candidate = new RTCIceCandidate({sdpMLineIndex:msg.label,
                                         candidate:msg.candidate});
    pc.addIceCandidate(candidate);
  } else if (msg.type === 'bye' && started) {
    onRemoteHangup();
  }
}
If the message is an answer from a peer (a response to an offer), RTCPeerConnection sets the remote SessionDescription and communication can begin. If the message is an offer (i.e. a message from the callee) RTCPeerConnection sets the remote SessionDescription, sends an answer to the callee, and starts connection by invoking the RTCPeerConnection startIce() method:

function doAnswer() {
  console.log("Sending answer to peer.");
  pc.createAnswer(setLocalAndSendMessage, null, mediaConstraints);
}
And that's it! The caller and callee have discovered each other and exchanged information about their capabilities, a call session is initiated, and real-time data communication can begin.

Network topologies

WebRTC as currently implemented only supports one-to-one communication, but could be used in more complex network scenarios: for example, with multiple peers each communicating each other directly, peer-to-peer, or via a Multipoint Control Unit (MCU), a server that can handle large numbers of participants and do selective stream forwarding, and mixing or recording of audio and video:

Multipoint Control Unit topology diagram
Multipoint Control Unit topology example
Many existing WebRTC apps only demonstrate communication between web browsers, but gateway servers can enable a WebRTC app running on a browser to interact with devices such as telephones (aka PSTN) and with VOIP systems. In May 2012, Doubango Telecom open-sourced the sipml5 SIP client, built with WebRTC and WebSocket which (among other potential uses) enables video calls between browsers and apps running on iOS or Android. At Google I/O, Tethr and Tropo demonstrated a framework for disaster communications 'in a briefcase', using an OpenBTS cell to enable communications between feature phones and computers via WebRTC. Telephone communication without a carrier!

Tethr/Tropo demo at Google I/O 2012
Tethr/Tropo: disaster communications in a briefcase
RTCDataChannel

As well as audio and video, WebRTC supports real-time communication for other types of data.

The RTCDataChannel API enables peer-to-peer exchange of arbitrary data, with low latency and high throughput. There's a simple 'single page' demo at http://webrtc.github.io/samples/src/content/datachannel/datatransfer.

There are many potential use cases for the API, including:

Gaming
Remote desktop applications
Real-time text chat
File transfer
Decentralized networks
The API has several features to make the most of RTCPeerConnection and enable powerful and flexible peer-to-peer communication:

Leveraging of RTCPeerConnection session setup.
Multiple simultaneous channels, with prioritization.
Reliable and unreliable delivery semantics.
Built-in security (DTLS) and congestion control.
Ability to use with or without audio or video.
The syntax is deliberately similar to WebSocket, with a send() method and a message event:

var pc = new webkitRTCPeerConnection(servers,
  {optional: [{RtpDataChannels: true}]});

pc.ondatachannel = function(event) {
  receiveChannel = event.channel;
  receiveChannel.onmessage = function(event){
    document.querySelector("div#receive").innerHTML = event.data;
  };
};

sendChannel = pc.createDataChannel("sendDataChannel", {reliable: false});

document.querySelector("button#send").onclick = function (){
  var data = document.querySelector("textarea#send").value;
  sendChannel.send(data);
};
Communication occurs directly between browsers, so RTCDataChannel can be much faster than WebSocket even if a relay (TURN) server is required when 'hole punching' to cope with firewalls and NATs fails.

RTCDataChannel is available in Chrome, Opera and Firefox. The magnificent Cube Slam game uses the API to communicate game state: play a friend or play the bear! Sharefest enables file sharing via RTCDataChannel, and peerCDN offers a glimpse of how WebRTC could enable peer-to-peer content distribution.

For more information about RTCDataChannel, take a look at the IETF's draft protocol spec.

Security

There are several ways a real-time communication application or plugin might compromise security. For example:

Unencrypted media or data might be intercepted en route between browsers, or between a browser and a server.
An application might record and distribute video or audio without the user knowing.
Malware or viruses might be installed alongside an apparently innocuous plugin or application.
WebRTC has several features to avoid these problems:

WebRTC implementations use secure protocols such as DTLS and SRTP.
Encryption is mandatory for all WebRTC components, including signaling mechanisms.
WebRTC is not a plugin: its components run in the browser sandbox and not in a separate process, components do not require separate installation, and are updated whenever the browser is updated.
Camera and microphone access must be granted explicitly and, when the camera or microphone are running, this is clearly shown by the user interface.
A full discussion of security for streaming media is out of scope for this article. For more information, see the WebRTC Security Architecture proposed by the IETF.

In conclusion

The APIs and standards of WebRTC can democratize and decentralize tools for content creation and communication�for telephony, gaming, video production, music making, news gathering and many other applications.

Technology doesn't get much more disruptive than this.

We look forward to what JavaScript developers make of WebRTC as it becomes widely implemented. As blogger Phil Edholm put it, 'Potentially, WebRTC and HTML5 could enable the same transformation for real-time communications that the original browser did for information.'

Developer tools

WebRTC stats for an ongoing session can be found at:
chrome://webrtc-internals page in Chrome
opera://webrtc-internals page in Opera
about:webrtc page in Firefox
Example:
chrome://webrtc-internals page
chrome://webrtc-internals screenshot
Cross browser interop notes
adapter.js is a JavaScript shim for WebRTC, maintained by Google with help from the WebRTC community, that abstracts vendor prefixes, browser differences and spec changes
To learn more about WebRTC signaling processes, check the apprtc.appspot.com log output to the console
If it's all too much, you may prefer to use a WebRTC framework or even a complete WebRTC service
Bug reports and feature requests are always appreciated:
WebRTC bugs
Chrome bugs
Opera bugs
Firefox bugs
WebRTC demo bugs
Adapter.js bugs
Learn more

WebRTC presentation at Google I/O 2013 (the slides are at io13webrtc.appspot.com)
Justin Uberti's WebRTC session at Google I/O 2012
Alan B. Johnston and Daniel C. Burnett maintain a WebRTC book, now in its second edition in print and eBook formats: webrtcbook.com
webrtc.org is home to all things WebRTC: demos, documentation and discussion
webrtc.org demo page: links to demos
discuss-webrtc: Google Group for technical WebRTC discussion
+webrtc
@webrtc
Google Developers Google Talk documentation, which gives more information about NAT traversal, STUN, relay servers and candidate gathering
WebRTC on GitHub
Stack Overflow is a good place to look for answers and ask questions about WebRTC
Standards and protocols

The WebRTC W3C Editor's Draft
W3C Editor's Draft: Media Capture and Streams (aka getUserMedia)
IETF Working Group Charter
IETF WebRTC Data Channel Protocol Draft
IETF JSEP Draft
IETF proposed standard for ICE
IETF RTCWEB Working Group Internet-Draft: Web Real-Time Communication Use-cases and Requirements
WebRTC support summary

MediaStream and getUserMedia

Chrome desktop 18.0.1008+; Chrome for Android 29+
Opera 18+; Opera for Android 20+
Opera 12, Opera Mobile 12 (based on the Presto engine)
Firefox 17+
Microsoft Edge
RTCPeerConnection

Chrome desktop 20+ (now 'flagless', i.e. no need to set about:flags); Chrome for Android 29+ (flagless)
Opera 18+ (on by default); Opera for Android 20+ (on by default)
Firefox 22+ (on by default)
RTCDataChannel

Experimental version in Chrome 25, more stable (and with Firefox interoperability) in Chrome 26+; Chrome for Android 29+
Stable version (and with Firefox interoperability) in Opera 18+; Opera for Android 20+
Firefox 22+ (on by default)
Native APIs for RTCPeerConnection are also available: documentation on webrtc.org.

For more detailed information about cross-platform support for APIs such as getUserMedia, see caniuse.com.

2
Next steps

Share

Twitter Facebook Google+
Subscribe

Enjoyed this article? Grab the RSS feed and stay up-to-date.

Except as otherwise noted, the content of this page is licensed under the Creative Commons Attribution 3.0 License, and code samples are licensed under the Apache 2.0 License.
Google Cloud Client Libraries are our latest and recommended client libraries for calling Google Cloud APIs. They provide an optimized developer experience by using each supported language's natural conventions and styles. They also reduce the boilerplate code you have to write because they're designed to enable you to work with service metaphors in mind, rather than implementation details or service API concepts. You can find out more about client libraries for Cloud APIs in Client Libraries Explained.

The following table provides links to get you started with Cloud Client Libraries in all our currently supported languages. The GitHub Repo page for each language lists the Cloud Platform services/APIs that are supported by that language's Cloud Client Library, and has installation instructions for a single client library that provides an interface to all those APIs.

You can also download Cloud Client Libraries just for individual Cloud Platform services: you'll find detailed instructions to help you get started with these on the relevant product's Client Libraries page. For example, if you only want to use Google Cloud Pub/Sub, you'll find this information in Cloud Pub/Sub Client Libraries.

If a Cloud Client Library for a specific language doesn't yet support a service you want to work with, use the Google API Client Library for that language.