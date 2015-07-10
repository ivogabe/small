(function(__root, __factory) { if (typeof define === "function" && define.amd) { define("example", ["document"], __factory);} else if (typeof exports === "object") {module.exports = __factory(require("document"));} else {__root["example"] = __factory(document);}})(this, (function(__small$_mod_0) {
var exports = {}, __small$_moduleExports = exports;
var __small$_1 = (function() {
var exports = {};
function a() {
	this.b = true;
}

exports = 'Hello, World';

return exports;
})();
var  foo = 0;
var b = ((function() {
var exports = {};
;
var document = __small$_mod_0;

document.title = __small$_1;

exports.c = __small$_1;

return exports;
})());

var bar = 0;

function hallo() {
	this.c = __small$_1;
}
var hoi = (function() {
	this.c = __small$_1;
});

__small$_moduleExports = __small$_1;
__small$_moduleExports.b = b;

if (b.c == __small$_1) {
	console.log(__small$_1);
}

return __small$_moduleExports;
}))