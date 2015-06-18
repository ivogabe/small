// Dependencies:
//  a -> b
//  b -> c
//  c -> b
//  b -> d
//  c -> d
// Cycle: b -> c -> b

var b = require('./b');
exports.b = b;
