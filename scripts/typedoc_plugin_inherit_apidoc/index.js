var plugin = require("./dist/plugin");
module.exports = function(PluginHost) {
  var app = PluginHost.owner;

  app.converter.addComponent('inherit-api', plugin.InheritApiPlugin);
};

