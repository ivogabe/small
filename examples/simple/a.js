var c = require('./c'), foo = 0;
var b = require('./b');
var d = require('./d');

var bar = 0, c2 = require('./c');

function hallo() {
	this.c = c;
}
var hoi = (function() {
	this.c = c;
});

module.exports = c;
module.exports.b = b;

if (b.c == c) {
	console.log(c2, d);
}
