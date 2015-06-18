(function() {
var exports = {};
var __small$_1 = {};
(function(exports) {

var __small$_2 = {};
var __small$_3 = (function() {
var exports = {};
exports.foo = true;
return exports;
})();
(function(exports) {

var b = __small$_1;
var d = __small$_3;
exports.d = d;


})(__small$_2);
var c = __small$_2;
var d = __small$_3;
exports.c = c;
exports.d = d;


})(__small$_1);
// Dependencies:
//  a -> b
//  b -> c
//  c -> b
//  b -> d
//  c -> d
// Cycle: b -> c -> b

var b = __small$_1;
exports.b = b;

return exports;
})();