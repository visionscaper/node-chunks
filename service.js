var _               = require('./libs/corelib-web/utils.js')._;
var _l              = require('./libs/corelib-web/logger.js').logger;

var Class           = require("jsface").Class;
var NamedBase       = require("./libs/corelib-web/base.js").NamedBase;

/**
 *
 * @class Service
 *
 * A base class for services, handling requests to endpoints.
 *
 * Protected methods that need to be overwritten:
 *  * _mapEndpointsToMethods()
 *
 * Child classes need to provide an object for the _endpointMethodMap property
 *
 */
var Service = Class(NamedBase, {

    _endpointTable              : null,

    /**
     *
     * A hash object that maps endpoint names to endpoint methods.
     * Also see getMethodForEndpoint(endpointName).
     *
     */
    _endpointMethodMap          : null,

    /**
     *
     * Constructs Service
     *
     * @param {String} serviceName              Name of endpoint
     * @param {Object} config                   Configuration object containing all information and instances to setup
     *                                          and run the service. There are a few mandatory expected
     *                                          configuration properties:
     *
     * @param {Object} config.endpointTable     Hash object with service endpoint definition objects, E.g.:
     *
     *                                      {
     *                                          //First service endpoint definition with name "GET Resource"
     *                                          "GET Resource" : {
     *                                              //The HTTP method of the endpoint
     *                                              HTTPMethod  : 'get',
     *
     *                                              //The URL subpath of the endpoint
     *                                              URLSubpath  : '/resource/:id/',
     *                                          },
     *
     *                                          ...
     *
     *                                          //Last service endpoint definition with name "DELETE Resource"
     *                                          "DELETE Resource" : {
     *                                              //The HTTP method of the endpoint
     *                                              HTTPMethod  : 'delete',
     *
     *                                              //The URL subpath of the endpoint
     *                                              URLSubpath  : '/resource/:id/',
     *                                          }
     *                                      }
     *
     */
    constructor: function(serviceName, config) {
        var me = "Service::constructor";
        Service.$super.call(this, serviceName);

        this._valid         = true;
        this._endpointTable = _.get(config, "endpointTable");

        this._endpointMethodMap = this._mapEndpointsToMethods();
        if (!this._endpointMethodMapValid()) {
            _l.error(me, ("Mapping from service endpoint definitions to instance methods is not valid, " +
                          "{0} service will not function properly.").fmt(this.getIName()));
            this._valid = false;
        }
    },

    getEndpointNames     : function() {
        var me              = this.getIName() + "::Service::getEndpointNames";
        var endpointNames   = null;

        if (!_.obj(this._endpointTable)) {
            _l.error(me, "No endpoint definitions available, unable to get any service endpoint names.");
            return endpointNames;
        }

        endpointNames       = Object.getOwnPropertyNames(this._endpointTable);
        return endpointNames;
    },

    getEndpointDefFor : function(endpointName) {
        return _.get(
                this._endpointTable,
                endpointName,
                "Endpoint definition table of {0}".fmt(this.getIName()));
    },

    /**
     *
     * An endpoint method can be :
     * A) An endpoint **handler** method that processes the request and renders a response based on
     *    the processing results. The calling convention is:
     *
     *    function(req, res, next)
     *
     *    This is the normal application view, e.g. /login view
     *
     * B) A endpoint **processing** method that does not render any response it self. The calling convention is:
     *
     *    function(req, cbReady), with cbReady(data, err)
     *
     *    The resulting data and err can then be given to a response rendering method.
     *    Also see RendersResponse and ServerAppChunk.
     *
     * The returned methods should usually bound to the service instance.
     *
     * The base implementation gets the method from the _endpointMethodMap property
     * This property is build up at construction by calling _endpointMethodMap()
     *
     * @param endpointName
     * @returns {function}
     *
     */
    getMethodForEndpoint : function(endpointName) {
        return _.get(
                this._endpointMethodMap,
                endpointName,
                "Mapping from endpoint names to methods of {0}".fmt(this.getIName()));
    },

    /****************************************************
     *
     * PROTECTED METHODS
     *
     ****************************************************/

    /**
     *
     * Builds up hash object, mapping endpoint names to endpoint methods
     * This method is called at construction of the service and stores the resulting
     * mapping in the _endpointMethodMap property.
     *
     * @returns {Object}
     *
     * @protected
     */
    _mapEndpointsToMethods : function() {
        var me = this.getIName() + "::Service::_mapEndpointsToMethods";

        _l.error(me, "Method not implemented, don't know to what methods to map to defined endpoints");
        return null;
    },

    _endpointMethodMapValid  : function() {
        var me      = this.getIName() + "::Service::_endpointMethodMapValid";
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
                _l.error(me, "Endpoint {0} has no mapping to an instance method, thus mapping not valid".fmt(name));
                valid = false;
            }
        }

        return valid;
    }

});

module.exports = Service;