var _                   = require('./libs/corelib-web/utils.js')._;
var _l                  = require('./libs/corelib-web/logger.js').logger;

var Class               = require("jsface").Class;
var Service             = require("./service.js");
var RendersResponses    = require("./renders-responses.js");
/**
 *
 * @class ServerAppChunk
 *
 * Responsible for handling client requests for a specific part (chunk! :D) of a server-side app.
 * It can also render responses for requests to endpoints of other (API) services using the
 * renderResponsesFor(service, serviceRootPath) method. Also see RendersResponses.
 *
 * The server app chunk implements following methods:
 *
 *  A)  Endpoint handler functions that process and render responses (e.g. application views):
 *
 *      function(req, res, next)
 *
 *  B)  Response rendering methods, used to render processing results of endpoints of other services
 *      (E.g. render requests to API endpoints as application views):
 *
 *      function(req, res, next, data, err)
 *
 *      The endpoint processing methods of the other service in case has the following calling convention:
 *
 *          function(req, cbReady) with cbReady(data, err)
 *          data and err are the results from processing the request and are then passed to
 *          the response rendering method
 *
 * Methods to override:
 *  * getRenderMethodForEndpoint(endpointName), also see RendersResponses
 *  * _mapEndpointsToMethods(), also see Service
 *
 */
var ServerAppChunk = Class([Service, RendersResponses], {

    _URLPathRoot        : null,

    _server             : null,

    /**
     *
     * Constructs server app chunk, handling requests for a specific part of a server-side app
     *
     * @param {String} chunkName                    Name of server app chunk
     *
     * @param {Object} config                       Configuration object containing all information and
     *                                              instances to setup and run the server app chunk.
     *                                              There are a few mandatory configuration properties:
     *
     * @param {String} [config.URLPathRoot='/']     url path root, e.g. /awesome-app/
     *
     * @param {Object} config.server                HTTP server object on which to register request handlers.
     *                                              The server instance receives the requests to handle and
     *                                              sends the responses.
     *
     * @param {Object} config.endpointTable         Hash object with endpoint definition objects for requests this
     *                                              app chunk processes itself (other then only generating
     *                                              responses). E.g.:
     *
     *                                      {
     *                                          //First request handler definition with name "GET app-view-0"
     *                                          "GET app-view" : {
     *                                              //The HTTP method of the handler
     *                                              //NOT MANDATORY, DEFAULT IS GET
     *                                              HTTPMethod  : 'get',
     *
     *                                              //The URL subpath of the request that it handles
     *                                              URLSubpath  : '/app-view-0',
     *                                          },
     *
     *                                          ...
     *
     *                                          //Last request handler definition with name "GET app-view-n"
     *                                          "DELETE Resource" : {
     *                                              //The HTTP method of the endpoint
     *                                              //NOT MANDATORY, DEFAULT IS GET
     *                                              HTTPMethod  : 'get',
     *
     *                                              //The URL subpath of the endpoint
     *                                              URLSubpath  : '/app-view-n',
     *                                          }
     *                                      }
     *
     *
     */
    constructor: function(chunkName, config) {
        var me = "ServerAppChunk::constructor";

        ServerAppChunk.$super.call(this, chunkName, config);

        this._valid = true;

        this._URLPathRoot   = _.get(config, "URLPathRoot") || '/';

        this._server        = _.get(config, "server");
        if (!_.obj(this._server)) {
            _l.error(me, ("Server is invalid, server app chunk [{0}] " +
                          "will not function properly").fmt(chunkName));
            this._valid = false;
        }

        if (!this._valid) {
            _l.error(me, ("Errors occurred while constructing [{0}], " +
                          "will not set up server app chunk ...".fmt(chunkName)));
            return;
        }

        if (!this._registerEndpointHandlers()) {
            _l.error(me, ("Registration of endpoint handlers was unsuccessful, " +
                          "server app chunk [{0}] will not function properly").fmt(chunkName));
            this._valid = false;
        }

        this._endpointRenderMethodMap = this._mapEndpointsToRenderMethods();
    },

    getHTTPServer : function() {
        return this._server;
    },

    getRenderMethodForEndpoint : function(endpointName) {
        return _.get(this._endpointRenderMethodMap, endpointName);
    },

    /****************************************************
     *
     * PROTECTED METHODS
     *
     ****************************************************/

    _mapEndpointsToRenderMethods : function() {
        var me = this.getIName() + "::ServerAppChunk::_mapEndpointsToRenderMethods";
        _l.debug(me, "This server app chunk does not render any responses for external endpoints");
        return {};
    },

    _endpointRenderMethodMapValid  : function() {
        var me      = this.getIName() + "::ServerAppChunk::_endpointRenderMethodMapValid";
        var valid   = false;

        var endpointNames   = this.getEndpointNames();
        if (!_.array(endpointNames)) {
            _l.error(me, "Unable to get endpoint names, thus mapping not valid");
            return valid;
        }

        valid               = true;
        var name            = null;
        for (var idx in endpointNames) {
            name = endpointNames[idx];

            if (!_.func(_.get(this._endpointMethodMap, name, "Mapping from endpoint names to methods"))) {
                _l.error(me, "Endpoint {0} has no mapping to an instance method, thus mapping not valid");
                valid = false;
            }
        }

        return valid;
    },

    _registerEndpointHandlers: function() {
        var me      = this.getIName() + "::ServerAppChunk::_registerEndpointHandlers";
        var success = false;

        var endpointNames = this.getEndpointNames();
        if (!_.array(endpointNames)) {
            _l.error(me, "Unable to get endpoint names, can't register endpoints");
            return success;
        }

        if (_.empty(endpointNames)) {
            _l.info(me, "No endpoints provided, nothing to register");
            success = true;
            return success;
        }

        _l.info(me, "Registering endpoint handlers ...");

        success = true;

        var numSetupSuccess     = 0;
        var endpointName        = null;
        var endpointDef         = null;
        var endpointHandler     = null;
        var URLPath             = null;
        for (var idx in endpointNames) {
            endpointName    = endpointNames[idx];

            endpointDef     = this.getEndpointDefFor(endpointName);
            if (!_.obj(endpointDef)) {
                _l.error(me, ("Endpoint {0} : no endpoint definition available, " +
                              "unable to register endpoint handler").fmt(endpointName));
                continue;
            }

            endpointHandler = this.getMethodForEndpoint(endpointName);
            if (!_.func(endpointHandler)) {
                _l.error(me, ("Endpoint {0} : no endpoint handler available, " +
                              "unable to register endpoint handler").fmt(endpointName));
                continue;
            }

            endpointHandler = this._llCreateValidatedHandlerFunc(endpointName, endpointHandler);
            if (!_.func(endpointHandler)) {
                _l.error(me, ("Endpoint {0} : creating validated endpoint handler failed, " +
                              "unable to register endpoint handler").fmt(endpointName));
                continue;
            }

            URLPath = this._llRegisterEndpointHandler(
                    endpointName,
                    endpointDef,
                    this._URLPathRoot,
                    endpointHandler);

            if (_.def(URLPath)) {
                _l.info(me, "Endpoint {0} : Registration of handler success at [{1}]".fmt(endpointName, URLPath));
                numSetupSuccess += 1;
            } else {
                _l.error(me, "Endpoint {0} : Registration of handler failed".fmt(endpointName));
            }
        }

        if (numSetupSuccess < 1) {
            _l.error(me, "Unable to register any endpoint handlers");
            success = false;
        }

        return success;
    },

    _llCreateValidatedHandlerFunc : function(endpointName, handlerFunc) {
        var self = this;

        return function(req, res, next) {
            if (!self.isValid()) {
                next({
                    message : "Endpoint {0} : Server app chunk {0} is not valid, unable to handle request"
                              .fmt(endpointName, self.getIName()),
                    code    : "ERR_SERVER_APP_CHUNK_INVALID"
                });
            }

            return handlerFunc(req, res, next);
        };
    }

});

module.exports = ServerAppChunk;