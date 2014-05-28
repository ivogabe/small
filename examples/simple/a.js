var c = require('./c');
var b = require('./b');

var c2 = require('./c');

function hallo() {
	this.c = c;
}
var hoi = (function() {
	this.c = c;
});

module.exports = c;
module.exports.b = b;

if (b.c == c) {
	console.log(c2);
}
