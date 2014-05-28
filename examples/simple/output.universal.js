(function(__root, __factory) { if (typeof define === "function" && define.amd) { define("example", ["document"], __factory);} else if (typeof exports === "object") {module.exports = __factory(require("document"));} else {__root["example"] = __factory(document);}})(this, (function(__small$_mod_0) {
var exports = {}, __small$_moduleExports = exports;
var c = (__small$_1 = (function() {
var exports = {};
function a() {
	this.b = true;
}

exports = 'Hello, World';
return exports;
})());
var b = ((function() {
var exports = {};
var c = __small$_1;
var document = __small$_mod_0;

document.title = c;

exports.c = c;
return exports;
})());

var c2 = __small$_1;

function hallo() {
	this.c = c;
}
var hoi = (function() {
	this.c = c;
});

__small$_moduleExports = c;
__small$_moduleExports.b = b;

if (b.c == c) {
	console.log(c2);
}
return __small$_moduleExports;
}))
