var util = require("./util");

var Workspace = module.exports = function(ide) {
    this.ide = ide;
    this.workspaceId  = ide.options.workspaceId;
    this.workspaceDir = ide.options.workspaceDir;
};

(function() {

    this.createPlugins = function (plugins) {
        this.plugins = {};

        for (var name in plugins) {
            this.plugins[name] = new plugins[name](this.ide, this);
        }

        for (var name in plugins) {
            if (this.plugins[name].init)
                this.plugins[name].init();
        }
    };

    this.getServerExclude = function(user) {
        return util.arrayToMap(user.getPermissions().server_exclude.split("|"));
    };

    this.execHook = function(hook, user /* varargs */) {
        var args = Array.prototype.slice.call(arguments, 1);
        var hook = hook.toLowerCase().trim();

        var server_exclude = this.getServerExclude(user);

        for (var name in this.plugins) {
            if (server_exclude[name]) continue;

            var plugin = this.plugins[name];
            var hooks = plugin.getHooks();
            if (hooks.indexOf(hook) > -1 && plugin[hook].apply(plugin, args) === true) {
                return;
            }
        }
    };

    this.getExt = function(name) {
        return this.plugins[name] || null;
    };

    this.send = function(msg, replyTo, scope) {
        if (replyTo)
            msg.sid = replyTo.sid;
        this.ide.broadcast(JSON.stringify(msg), scope);
    };

    this.sendError = function(error, client) {
        if (client)
            client.send(JSON.stringify(error));
        else
            this.ide.broadcast(error);
    };

    this.error = function(description, code, message, client) {
        var sid = (message || {}).sid || -1;
        var error = {
            "type": "error",
            "sid": sid,
            "code": code,
            "message": description
        };

        this.sendError(error, client || null);
    };

    this.dispose = function(callback) {
        var count;
        for (var name in this.plugins) {
            count += 1;
            this.plugins[name].dispose(function() {
                count -= 1;
                if (count === 0)
                    callback();
            });
        }
    };

}).call(Workspace.prototype);
