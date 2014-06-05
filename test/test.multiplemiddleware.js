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
var endpoints;

exports.setUp = function(done) {
  server = restify.createServer();
  client = restify.createStringClient({
    url: 'http://localhost:9999'
  });

  var endpoints = new manager.EndpointManager();

  endpoints.addEndpoint({
    description: 'test',
    method: 'GET',
    path: '/single',
    middleware: testMiddleware,
    fn: function (req, res, next) {
      res.send(200);
    }
  });

  endpoints.addEndpoint({
    description: 'test',
    method: 'GET',
    path: '/double',
    middleware: [
      testMiddleware,
      testMiddleware2
    ],
    fn: function (req, res, next) {
      res.send(200);
    }
  });

  endpoints.attach(server);

  server.listen(9999, function() {
    done();
  });
}

exports.tearDown = function(done) {
  server.close();
  client.close();
  done();
}

exports.globalSingleMiddleware = function(test) {
  client.get('/single', function(err, req, res, data) {
    test.ifError(err);
    test.equal(req.testMiddleware, "yes");
    test.equal(res.statusCode, 200);
    test.done();
  });
}

exports.globalDoubleMiddleware = function(test) {
  client.get('/double', function(err, req, res, data) {
    test.ifError(err);
    test.equal(req.testMiddleware, "yes");
    test.equal(req.testMiddleware2, "yes");
    test.equal(res.statusCode, 200);
    test.done();
  });
}

