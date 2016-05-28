function patternToRegExp(pattern) {
  pattern = pattern.replace(/\./g, "\\.").replace(/\*/g, "([^.]*)");
  return new RegExp(pattern + '$');
}

module.exports = function(racer) {
  var Model = racer.Model;

  racer._models = {};

  if (racer.model) return;
  
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

  Model.prototype._scope = function(path) {
    var ChildModel = Model.ChildModel;
    var model = new ChildModel(this);
    model._at = path;
    return model;
  }

  Model.prototype.scope = function(path, alias) {
    var segments = this._dereference(this.__splitPath(path), true);

    // No segments - no point in parsing further
    if(!segments.length) return this._scope(path);

    if (alias) {
      var fn = racer._models[alias].fn;
      return this.__createScopedModel(path, fn);
    }

    var fullPath = segments.join('.');

    for (var name in racer._models) {
      var regexp = racer._models[name].regexp;
      var fn = racer._models[name].fn;
      if (regexp.test(fullPath)){
        return this.__createScopedModel(path, fn);
      }
    }

    return this._scope(path);
  };

  Model.prototype.__createScopedModel = function(path, fn){
    if (fn.prototype.factory) {
      return fn(this._scope(path), this);
    } else {
      return new fn(this);
    }
  }

  Model.prototype.__splitPath = function(path) {
    return (path && path.split('.')) || [];
  };
};
