"use strict";
/*
   Note on creating keys: (from: http://www.openssl.org/docs/HOWTO/certificates.txt)

   1. Create key: openssl genrsa > privkey.pem
   2. Create the certificate: openssl req -new -key privkey.pem -out cert.csr
   3. Self-sign the certificate: 

   Usage: node index.js (with http-cache as the working directory)

   Overview: intercepts webservice requests and caches them (primarily to mock
     the Which API)

   TODO: Needs some serious tidying up!!! (unless YAGNI applies!)
   TODO: a JSON config file
   TODO: HTTP
   TODO: turn into Grunt task? or normal node module

 */
var https = require("https");
var fs = require("fs");

var options = {
  key: fs.readFileSync("privkey.pem"),
  cert: fs.readFileSync("cacert.pem")
};

https.createServer(options, function (incomingRequest, incomingResponse) {
  var cacheFile = "cache" + incomingRequest.url;
  if(fs.existsSync(cacheFile)) {
    incomingResponse.end(fs.readFileSync(cacheFile));
  } else {
    var headers = incomingRequest.headers;
    delete headers.host;
    var forwardRequest = https.request({
      host: "staging.services.which.co.uk",
      path: incomingRequest.url,
      headers: headers
    }, function(forwardResponse) {
      var responseString = "";
      forwardResponse.on("data", function(chunk) {
        responseString += chunk;
      });
      forwardResponse.on("end", function() {
        var directory = incomingRequest.url.match(/\/.*\/?/)[0];
        var cacheDirectory = "cache" + directory;
        var cacheDirectoryParts = cacheDirectory.split("/");
        var cacheDirectories = ["cache/"];
        cacheDirectoryParts.pop(); // last one is empty or a file
        cacheDirectoryParts.slice(1).forEach(function(element, index) {
          cacheDirectories.push(cacheDirectories[index] + element + "/");
        });
        cacheDirectories.forEach(function(element) {
          if(!fs.existsSync(element)) fs.mkdirSync(element);
        });
        fs.writeFileSync("cache" + incomingRequest.url, responseString);
        incomingResponse.end(responseString);
       });
    });
    forwardRequest.end();
  }
}).listen(8000);
