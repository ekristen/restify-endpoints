var restify = require('restify');

var manager = require('../lib');


function testMiddleware (req, res, next) {
  req.testMiddleware = "yes";
  return next();
}

function testMiddleware2 (req, res, next) {
  req.testMiddleware2 = "yes";
  return next();
}

var server;
var client;

exports.setUp = function(done) {
  server = restify.createServer();
  client = restify.createStringClient({
    url: 'http://localhost:9999'
  });

  server.listen(9999, function() {
    done();
  });
}

exports.tearDown = function(done) {
  server.close()
  client.close();
  done();
}

exports.singleMiddleware = function(test) {
  var endpoints = new manager.EndpointManager();

  try {
    endpoints.addEndpoint({
      name: 'test',
      description: 'test',
      method: 'GET',
      path: '/test',
      middleware: testMiddleware,
      fn: function (req, res, next) {
        return res.send(200);
      }
    });

    endpoints.attach(server);
  } catch (e) {
    test.equal(e.message, "Path is required in an endpoint definition");
  }

  test.done();
}

exports.multipleMiddleware = function(test) {
  var endpoints = new manager.EndpointManager();

  try {
    endpoints.addEndpoint({
      name: 'test',
      description: 'test',
      method: 'GET',
      path: '/test',
      middleware: [
        testMiddleware,
        testMiddleware2
      ],
      fn: function (req, res, next) {
        return res.send(200);
      }
    });

    endpoints.attach(server);
  } catch (e) {
    test.equal(e.message, "Path is required in an endpoint definition");
  }

  test.done();
}



