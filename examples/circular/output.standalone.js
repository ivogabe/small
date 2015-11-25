(function() {
var exports = {};
var __small$_3 = (function() {
var exports = {};
exports.foo = true;
return exports;
})();
var __small$_2 = (function() {
var exports = {};
__small$_2 = function() { return exports; };
var b = __small$_1();
;
exports.d = __small$_3;

return exports;
});
var __small$_1 = (function() {
var exports = {};
__small$_1 = function() { return exports; };
var c = __small$_2();
;
exports.c = c;
exports.d = __small$_3;

return exports;
});
// Dependencies:
//  a -> b
//  b -> c
//  c -> b
//  b -> d
//  c -> d
// Cycle: b -> c -> b

var b = __small$_1();
exports.b = b;

return exports;
})();