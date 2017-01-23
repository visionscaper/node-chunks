var _               = require('./libs/corelib-web/utils.js')._;
var _l              = require('./libs/corelib-web/logger.js').logger;

var Class           = require("jsface").Class;
var NamedBase       = require("./libs/corelib-web/base.js").NamedBase;

/**
 *
 * @mixin RendersResponses
 *
 * A mixin with functionality to render responses for Service instances.
 *
 * Call renderResponsesFor(service, serviceRootPath) to render responses for the endpoints defined in service
 * The endpoint methods in service must have the following calling convention:
 *      function(req, cbReady) with cbReady(data, err)
 *
 * You need to override :
 * - getHTTPServer(), to get an instance of the server on which to register requests (routes)
 * - getRenderMethodForEndpoint(endpointName), to get the response rendering method for the given an endpoint
 *
 *   The render methods must have the following calling convention:
 *      function(req, res, next, [data, err, status])
 *
 *   data and err are the results of calling the endpoints for
 *   which to render responses, also see renderResponsesFor description.
 *
 */
var RendersResponses = Class({

    $statics : {
        REQUIRED_SERVICE_IF : {
            methods : ["getIName", "getEndpointNames", "getEndpointDefFor"]
        }
    },

    getHTTPServer : function() {
        var instanceName = _.exec(this, "getIName") || "[Unknown class that RendersResponses]";
        var me = instanceName+"::RendersResponses::getHTTPServer";

        _l.error(me, "Method not implemented, don't know how to get HTTP server instance");

        return null;
    },

    getRenderMethodForEndpoint : function(endpointName) {
        var instanceName = _.exec(this, "getIName") || "[Unknown class that RendersResponses]";
        var me = instanceName+"::RendersResponses::getRenderMethodForEndpoint";

        _l.error(me, ("Method not implemented, don't know to what method " +
        "renders responses for endpoint {0}").fmt(endpointName));

        return null;
    },

    /**
     *
     * @param service
     * @param servicePathRoot
     * @param {array} [endpoints]   Endpoints to render responses for.
     *                              If not provided responses will be rendered for all endpoints handled
     *                              by service
     * @returns {boolean}
     */
    renderResponsesFor : function(service, servicePathRoot, endpoints) {
        var instanceName    = _.exec(this, "getIName") || "[Unknown class that RendersResponses]";
        var me              = instanceName + "::RendersResponses::renderResponsesFor";
        var success         = false;

        servicePathRoot     = servicePathRoot || "/";

        if (!_.interfaceAdheres(service, RendersResponses.REQUIRED_SERVICE_IF)) {
            _l.error(me, "The provided service does not adhere to the required interface to enable " +
                         "response rendering for endpoints. Required interface definition : ",
                         _.stringify(RendersResponses.REQUIRED_SERVICE_IF));

            return success;
        }
        var serviceName     = service.getIName();
        var endpointNames   = _.array(endpoints) ? endpoints : service.getEndpointNames();

        if (!_.array(endpointNames)) {
            _l.error(me, ("No valid list of endpoint names given by service, " +
                          "unable to setup response rendering for endpoints of {0}".fmt(serviceName)));

            return success;
        }

        if (_.empty(endpointNames)) {
            _l.warn(me, "Service {0} has no endpoints to setup response rendering for, nothing to do");

            success = true;
            return success;
        }

        _l.info();
        _l.info(me, ("Setting up response rendering for {0} service endpoints, " +
                     "with path root {1}").fmt(serviceName, servicePathRoot));

        success = true;
        
        var numSetupSuccess     = 0;
        var endpointName        = null;
        var endpointDef         = null;
        var URLPath             = null;
        for (var idx in endpointNames) {
            var endpointName = endpointNames[idx];

            URLPath = this._llSetupRenderingFor(service, endpointName, servicePathRoot);

            if (_.def(URLPath)) {
                _l.info();
                _l.info(me, "Response rendering setup complete for : ");
                _l.info("Endpoint {0}".fmt(endpointName), URLPath);
                _l.info();
                numSetupSuccess += 1;
            } else {
                _l.error(me, "Endpoint {0} : response rendering setup failed".fmt(endpointName));
            }
        }

        if (numSetupSuccess < 1) {
            _l.error(me, "Unable to setup response rendering for any endpoints of service {0}".fmt(serviceName));
            success = false;
        }

        return success;
    },


    /****************************************************
     *
     * PROTECTED METHODS
     *
     ****************************************************/

    _llSetupRenderingFor: function(service, endpointName, servicePathRoot) {
        var instanceName    = _.exec(this, "getIName") || "[Unknown class that RendersResponses]";
        var me              = instanceName + "::RendersResponses::_llSetupRenderingFor";
        var URLPath         = null;

        //strings endpoint processing and response rendering together in to one handler
        var endpointHandlerFunc     = this._llCreateEndpointHandlerFunc(service, endpointName);
        if (!_.func(endpointHandlerFunc)) {
            _l.error(me, ("Endpoint {0} : creation of endpoint handler function failed, " +
                          "unable to set up response rendering").fmt(endpointName));
            return URLPath;
        }

        var endpointDef     = service.getEndpointDefFor(endpointName);
        if (!_.obj(endpointDef)) {
            _l.error(me, ("Endpoint {0} : endpoint definition is not an object, " +
                          "unable to set up response rendering").fmt(endpointName));
            return URLPath;
        }

        URLPath = this._llRegisterEndpointHandler(
                endpointName,
                endpointDef,
                servicePathRoot,
                endpointHandlerFunc);
        return URLPath;
    },

    _llCreateEndpointHandlerFunc : function(service, endpointName) {
        var instanceName    = _.exec(this, "getIName") || "[Unknown class that RendersResponses]";
        var me              = instanceName + "::RendersResponses::_llCreateEndpointHandlerFunc";
        var self            = this;

        var handlerFunc     = null;

        var endpointMethod  = service.getMethodForEndpoint(endpointName);
        if (!_.func(endpointMethod)) {
            _l.error(me, ("Endpoint {0}: no processing method found for endpoint, " +
                          "unable to create endpoint handler function").fmt(endpointName));
            return handlerFunc;
        }

        //The method that uses the endpoint method data to render the response
        var endpointRenderMethod    = this.getRenderMethodForEndpoint(endpointName);
        if (!_.func(endpointRenderMethod)) {
            _l.error(me, ("Endpoint {0}: Unable to get endpoint response rendering method, " +
                          "unable to create endpoint handler function").fmt(endpointName));
            return handlerFunc;
        }

        handlerFunc = function(req, res, next) {
            var me = instanceName + "::RendersResponses::handlerFunc";
            _l.debug();
            _l.debug();
            _l.debug(me, "Handling request : {0}".fmt(endpointName));
            _l.debug(me, "Request path     : {0}".fmt(_.get(req, 'path')) || "[NO PATH AVAILABLE]");
            _l.debug();

            var serviceValid = _.func(service.isValid) ? service.isValid() : true;
            if (!serviceValid) {
                next({
                    message : "Service {0} invalid, unable to handle request to endpoint {1}"
                            .fmt(service.getIName(), endpointName),
                    code    : "ERR_SERVICE_INVALID"
                });

                return false;
            }

            //First process then render
            return endpointMethod(req, function(data, err) {
                var rendererValid = _.func(self.isValid) ? self.isValid() : true;
                if (!rendererValid) {
                    next({
                        message : "Renderer {0} invalid, unable to handle request to endpoint {1}"
                                .fmt(self.getIName(), endpointName),
                        code    : "ERR_RENDERER_INVALID"
                    });

                    return;
                }

                endpointRenderMethod(req, res, next, data, err);
            });
        };

        return handlerFunc;
    },

    _llRegisterEndpointHandler : function(endpointName, endpointDef, servicePathRoot, endpointHandlerFunc) {
        var me      = this.getIName() + "::RendersResponses::_llRegisterEndpointHandler";
        var URLPath = null;

        var HTTPMethod  = endpointDef.HTTPMethod || "get";
        var __URLPath   = _.joinPaths([servicePathRoot, endpointDef.URLSubpath]);

        HTTPMethod = _.string(HTTPMethod) ? HTTPMethod.toLowerCase() : HTTPMethod;

        var server = this.getHTTPServer();
        if (!_.hasMethod(server, HTTPMethod)) {
            _l.error(me, ("Endpoint {0} : HTTP method [{0}] not known by server, " +
                          "unable to register endpoint handler").fmt(endpointName, HTTPMethod));
            return URLPath;
        }

        server[HTTPMethod](__URLPath, endpointHandlerFunc);
        URLPath = __URLPath;
        return URLPath;
    }

});

module.exports = RendersResponses;