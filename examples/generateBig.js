var fs = require('fs');
var path = require('path');

var names = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam rutrum odio interdum lobortis mollis. Etiam nunc tortor, ornare in mi ac, pellentesque egestas eros. Nullam pulvinar nulla pulvinar aliquet scelerisque. Pellentesque at cursus nisi. Cras vulputate semper ligula, at facilisis urna malesuada nec. Donec ullamcorper diam sit amet ipsum elementum vulputate. Morbi porta suscipit lorem et eleifend. Quisque viverra justo vehicula libero tincidunt pretium. Nunc ultrices, felis at pharetra vehicula, dui lacus pulvinar nibh, ac sodales tortor risus at nisi. Sed hendrerit felis mattis imperdiet tristique. Aenean vel odio ligula. Integer non mattis dolor, ac varius erat. Nam vulputate justo. Nam aliquet, nisi in viverra scelerisque, metus metus volutpat tellus, quis auctor mi lectus ac urna. Mauris urna neque, venenatis in mauris a, auctor posuere ante. Sed justo quam, porttitor sed commodo quis, cursus a augue. Nam euismod nulla vel viverra porta. Aliquam vel lacus id velit tempor condimentum. Vestibulum quis eros gravida, interdum metus id, porttitor eros. Donec iaculis nunc a massa viverra molestie. Sed fringilla egestas velit. Donec pharetra ante tortor, in varius mi adipiscing sit amet. Nullam et tellus feugiat, scelerisque est ut, rhoncus turpis.'.toLowerCase().replace(/,|\./g, '').split(' ');

for (var i = 0; i < names.length; ++i) {
	var name = names[i];

	if (names.indexOf(name) != i) continue;

	var source = '';

	var requires = [];

	for (var j = 0; j < i; ++j) {
		var other = names[j];
		if (name == other) continue;

		if ((i + j + name.length + other.length) % 4 == 1) {
			requires.push(other);
		}
	}

	switch (i % 5) {
		case 0: // module.exports = { }
			source = 'module.exports = {\n';
			var sep = '';
			for (var j = 0; j < requires.length; ++j) {
				source += sep + '\t' + requires[j] + ': require(\'./' + requires[j] + '\')';
				sep = ',\n';
			}
			source += '\n};';
			break;
		case 1: // exports. =
		case 2:
			source = '';
			for (var j = 0; j < requires.length; ++j) {
				source += 'exports.' + requires[j] + ' = require(\'./' + requires[j] + '\');\n';
			}
			break;
		case 3: // this. =
			source = '';
			for (var j = 0; j < requires.length; ++j) {
				source += 'this.' + requires[j] + ' = require(\'./' + requires[j] + '\');\n';
			}
			break;
		case 4: // module.exports. =
			source = '';
			for (var j = 0; j < requires.length; ++j) {
				source += 'module.exports.' + requires[j] + ' = require(\'./' + requires[j] + '\');\n';
			}
			break;
	}

	fs.writeFile(path.join(__dirname, 'big', name + '.js'), source, {encoding:'utf8'}, function(error) {
		if (error) {
			throw error;
		}
	});
}
