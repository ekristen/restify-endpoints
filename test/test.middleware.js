var restify = require('restify');

var manager = require('../lib');


function testMiddleware (req, res, next) {
  req.testMiddleware = "yes";
  res.testMiddleware = "yes";
  console.log(this.name);
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
      description: 'test',
      method: 'GET',
      path: '/test',
      middleware: [
        testMiddleware,
        testMiddleware2
      ],
      fn: function (req, res, next) {
        res.send(200);
      }
    });

    endpoints.attach(server);
  } catch (e) {
    test.equal(e.message, "Name is required in an endpoint definition");
  }

  test.done();
}


exports.globalSingleMiddleware = function(test) {
  var endpoints = new manager.EndpointManager();

  try {
    endpoints.addEndpoint({
      description: 'test',
      method: 'GET',
      path: '/test',
      middleware: [
        testMiddleware
      ],
      fn: function (req, res, next) {
        res.send(200);
      }
    });

    endpoints.attach(server);
  } catch (e) {
    test.equal(e.message, "Name is required in an endpoint definition");
  }

  client.get('/test', function(err, req, res, data) {
    test.ifError(err);
    test.equal(req.testMiddleware, "yes");
    test.equal(res.statusCode, 200);
    test.done();
  });
}

exports.globalMultipleMiddleware = function(test) {
  var endpoints = new manager.EndpointManager({
    middleware: [
      testMiddleware
    ]
  });

  try {
    endpoints.addEndpoint({
      name: 'testing',
      description: 'test',
      method: 'GET',
      path: '/test',
      fn: function (req, res, next) {
        console.log(req.testMiddleware)
        res.send(200);
      }
    });

    endpoints.attach(server);
  } catch (e) {
    console.log(e.message);
    test.equal(e.message, "Name is required in an endpoint definition");
  }

  client.get('/test', function(err, req, res, data) {
    test.ifError(err);
    test.equal(req.testMiddleware, "yes");
    test.equal(req.testMiddleware2, "yes");
    test.equal(res.statusCode, 200);
    test.done();
  });
}
