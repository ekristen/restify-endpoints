var path = require('path');
var fs = require('fs');
var restify = require('restify');

//var available_middleware = require('./middleware');

var EndpointManager = module.exports.EndpointManager = function(options) {
  if (typeof(options) !== "undefined") {
    this.options = options;
  } else {
    this.options = {};
    options = {};
  }

  this.endpoints = [];
  this.middleware = this.options.middleware || [];

  this.endpoint_modules = {};

  if (typeof(this.options.endpoint_args) == "undefined") {
    this.options.endpoint_args = [];
  }

  if (this.middleware.constructor.name !== 'Array') {
    this.middleware = [ this.middleware ];
  }

  // Find all defined endpoints from the endpoint path
  if (options.endpointpath) {
    this.autodiscover(options.endpointpath, this.options.endpoint_args);
  }
};

// Perform basic validation and add endpoint to endpoints array,
// will be attached to the Restify Server later on.
EndpointManager.prototype.addEndpoint = function(endpoint) {
  if (!endpoint.name) {
    throw new Error('Name is required in an endpoint definition');
  }
  
  if (!endpoint.path) {
    throw new Error('Path is required in an endpoint definition');
  }
  
  if (!endpoint.method) {
    throw new Error('Method is required in an endpoint definition');
  }
  
  if (!endpoint.fn) {
    throw new Error('fn is required to define an endpoint');
  }

  // TODO: add other validation checks.

  // Add the endpoint to the endpoints
  this.endpoints.push(endpoint);
};

EndpointManager.prototype.addMiddleware = function(middleware) {
  var self = this;

  this.middleware.push(middleware);
};
 
EndpointManager.prototype.autodiscover = function(endpointpath, endpoint_args) {
  var self = this;

  // find all endpoints in `path`, similar to your `middleware/index.js` file
  var files = fs.readdirSync(endpointpath);

  // loop through endpoint files and load them.
  for (var i = 0; i < files.length; i++ ) {
  	var extname  = path.extname(files[i]);
  	var basename = path.basename(files[i], '.js');

  	if (extname == '.js' && self.endpoint_modules[files[i]] !== true) {
      try {
        self.endpoint_modules[basename] = require(endpointpath + '/' + files[i]).apply(null, endpoint_args)
      }
      catch (e) {
        if (e.message == "Object #<Object> has no method 'apply'") {
          self.endpoint_modules[basename] = require(endpointpath + '/' + files[i])
        }
        else {
          throw e;
        }
      }
  	}
  }

  // iterate through endpoint files
  Object.keys(self.endpoint_modules).forEach(function (c) {
    if (typeof(self.endpoint_modules[c]) != 'undefined') {
      if (typeof(self.endpoint_modules[c].endpoints) != 'undefined') {
        var endpoints = self.endpoint_modules[c].endpoints || [];
        // Add new endpoints to the list (keeping the list flat).
        endpoints.forEach(function(endpoint) {
          self.addEndpoint(endpoint);
        }.bind(self));
      }
    }
    else {
      console.warn('Invalid Endpoints File: ' + c);
    }
  });
};

// Attach to the Restify Server
EndpointManager.prototype.attach = function (server) {
  this.createRoutes(server);
};

// Loop through all defined endpoints, add them to the Restify Server
EndpointManager.prototype.createRoutes = function(server) {
  var self = this;

  // Here we add each endpoint as a route to the server.
  var allowed_methods = { 'GET' : true, 'POST' : true, 'PUT' : true, 'DEL' : true, 'HEAD': true };

  this.endpoints.forEach(function(endpoint) {
   
    // TODO: implement authentication middleware
    // DISABLED -- need to implement better
    /*
    if (endpoint.auth == 'httpSignature') {
      if (self.options.auth.method === 'httpSignature') {
        middleware.push(available_middleware.httpSignature(endpoint, self.options.auth));
      }
      else {
        throw new Error(self.options.auth.method + ' not supported for authentication');
      }
    }
    */
 
    // Create a list of methods for this endpoint.
    var methods = endpoint.method;
    if (methods.constructor.name !== 'Array') {
      methods = [ methods ];
    }

    // Add a route handler for each method.
    methods.forEach(function(method) {
      // Check if the method is allowed.
      if (allowed_methods[method] !== true) {
        // throw an error/show a warning...
        return;
      }
 
      var paths = endpoint.path;
      if (paths.constructor.name !== 'Array') {
        paths = [ paths ];
      }
 
      paths.forEach(function(path) {
        // Create a handler.
        var versions = [];
        versions = endpoint.version || '*';
        if (versions.constructor.name !== 'Array') {
          versions = [ versions ];
        }

        versions.forEach(function(version) {
          // Create a middleware chain.
          var middleware = self.middleware || [];
 
          // If we require input validation for this endpoint,
          // add a validator middleware to the chain.
          if (endpoint.params) {
            middleware.push(self.validator(endpoint));
          }

          var middles = endpoint.middleware || [];
          if (middles.constructor.name !== 'Array') {
            middles = [ middles ];
          }

          // Attach all our middleware
          for (var x=0; x<middles.length; x++) {
            middleware.push(middles[x].bind(endpoint));
          }

          if (typeof(endpoint[version]) == "function") {
            middleware.push(endpoint[version].bind(endpoint));
          } else {
            middleware.push(endpoint.fn.bind(endpoint));
          }

          if (version == '*') {
            server[method.toLowerCase()]({
              path: path
            }, middleware);
          } else {
            server[method.toLowerCase()]({
              path: path,
              version: version
            }, middleware);
          }
        });
      })
    });
  });
};


// Validate parameters, based on the endpoint.params definition
EndpointManager.prototype.validator = function(endpoint) {
  return function(req, res, next) {
    // Check params against incoming data.
    Object.keys(endpoint.params).forEach(function(index) {
      var param = endpoint.params[index];
      var value = req.params[param.name];

      // TODO -- use validator npm module to validate parameters ...
      // Check `required` state.
      if (param.required === true && value === undefined) {
        return next(new restify.InvalidArgumentError(param.name, 'Required parameter not present'));
      }
      else if (param.type === 'numeric' && typeof(param.value) !== 'numeric') {
        return next(new restify.InvalidArgumentError(param.name, 'Invalid value given for parameter'));
      }
    });
 
    // Done.
    return next();
  };
};
