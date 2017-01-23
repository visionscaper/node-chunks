var _               = require('./libs/corelib-web/utils.js')._;
var _l              = require('./libs/corelib-web/logger.js').logger;

var Class           = require("jsface").Class;
var NamedBase       = require("./libs/corelib-web/base.js").NamedBase;
var RendersResponses= require("./renders-responses.js");

/**
 *
 * @class JSONRenderer
 *
 * Renders responses, and sends them back to the client, for requests handled by service instances, registered using the
 * renderResponsesFor() method.
 *
 */
var JSONRenderer = Class([NamedBase, RendersResponses], {

    _server             : null,
    _responseHeaders    : null,
    /**
     *
     * Constructs JSON renderer
     *
     * @param {String} rendererName                 Name of renderer
     * @param {Object} server                       HTTP server object on which to register request handlers (through
     *                                              renderResponsesFor()). The server instance receives the requests to
     *                                              handle and sends the responses rendered as JSON.
     *
     * @param {Object} [config]                     Configuration object.
     * @param {Object} [config.responseHeaders]     Object with response headers that need to be send with the
     *                                              responses by default
     *
     */
    constructor: function(rendererName, server, config) {
        var me = "JSONRenderer::constructor";

        JSONRenderer.$super.call(this, rendererName);

        this._valid     = true;
        this._server    = server;
        if (!_.obj(this._server)) {
            _l.error(me, "Server is invalid, JSON renderer will not function properly");
            this._valid = false;
        }

        this._responseHeaders = _.get(config, 'responseHeaders');
    },

    getHTTPServer : function() {
        return this._server;
    },

    getRenderMethodForEndpoint : function(endpointName) {
        return this._renderJSON;
    },

    /****************************************************
     *
     * PROTECTED METHODS
     *
     ****************************************************/

    _renderJSON : function(req, res, next, data, err, status) {
        if (_.def(err)) {
            next(err);
            return;
        }

        if (_.number(status)) {
            res = res.status(status);
        }

        if (_.obj(this._responseHeaders)) {
            res = res.set(this._responseHeaders);
        }

        if (!_.obj(data)) {
            data = {
                data : data
            };
        }

        res.json(data);
    }
});

module.exports = JSONRenderer;