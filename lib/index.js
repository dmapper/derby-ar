var _ = require('lodash');
var derbyServices = require('derby-services');
var racerRpc = require('racer-rpc');
var rpc = require('./rpc');

function patternToRegExp(pattern) {
  pattern = pattern.replace(/\./g, "\\.").replace(/\*/g, "([^.]*)");
  return new RegExp(pattern + '$');
}

// TODO: Split up into one separate file for the server and one for the client for faster loading and less useless code transmitted to the client?
// See: https://github.com/derbyparty/derby-faq/tree/master/en#how-to-require-a-module-that-will-run-only-on-the-server-of-a-derby-application
module.exports = function(derby) {
  var racer = derby;
  var Model = racer.Model;

  racer._models = {};

  derby.use(racerRpc);
  derby.use(derbyServices);
  derby.use(rpc.plugin);

  /**
   * Adds model classes to Racer
   *
   * @param {Object} args
   * @param {String} args.name - the name/path to the collection on which to bind to
   * @param {Class} [args.Collection] - the model class to be used for the collection
   * @param {Class} [args.Item] - the model class to be used for each item in the collection
   * @param {Object} [args.SubItems] - hash of subpaths and fabrics which return classes
   * @param {Array} [args.hooks] - a list of hooks to bind to Share. Note! Not yet implemented!
   */
  racer.model = function (name, pattern, fn) {
    if (racer._models[name]) return;
    racer._models[name] = {
      pattern: pattern,
      regexp: patternToRegExp(pattern),
      fn: fn
    }
  };

  Model.prototype.at = function(subpath, alias) {
    var path = this.path(subpath);
    return this.scope(path, alias);
  };

  Model.prototype._scope = Model.prototype.scope;
  Model.prototype.scope = function(path, alias) {
    var scoped = this._scope(path);

    function getConstructor(fn){
      var constructor = fn(scoped);
      if (constructor) return constructor;
      return fn;
    }

    var segments = this._dereference(this.__splitPath(path), true);

    // No segments - no point in parsing further
    if(!segments.length) return this._scope(path);

    if (alias) {
      var fn = racer._models[alias].fn;
      return this.__createScopedModel(path, scoped, getConstructor(fn), function ScopedModel(){});
    }

    var fullPath = segments.join('.');

    for (var name in racer._models) {
      var regexp = racer._models[name].regexp;
      var fn = racer._models[name].fn;
      if (regexp.test(fullPath)){
        return this.__createScopedModel(path, scoped, getConstructor(fn), function ScopedModel(){});
      }
    }

    return this._scope(path);
  };

  /**
   * Helper fn for splitting a full path
   */
  Model.prototype.__splitPath = function(path) {
    return (path && path.split('.')) || [];
  };

  Model.prototype.__createScopedModel = function(path, scoped, constructor, defaultConstructor){
    constructor.prototype = rpc.add(this, path, constructor.prototype);
    defaultConstructor.prototype = _.assign(this._scope(path), constructor.prototype);
    return new defaultConstructor();
  };

};
