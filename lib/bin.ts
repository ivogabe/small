/// <reference path="../definitions/ref.d.ts" />

import lib = require('./index');
import commander = require('commander');
import path = require('path');

function list(val) {
	return val.split(',');
}

commander.version('0.1.0')
  .option('-i, --input <file>', 'The input filename.')
  .option('-o, --output <file>', 'The output filename.')

  .option('-m, --globalModules <modules>', 'A comma-seperated list with external modules, in the form require-name=js-name, eg. doc=document,jquery=jquery. require(\'doc\') will now return document.', list)
  .option('-e, --globalExport <name>', 'Exports the library to a global variable. Example: --globalExport "var test"')
  .option('-p, --modulePath <paths>', 'The path where to find external modules. Default: node_modules', list)
  .option('-n, --includeNode', 'Add this option to include the node.js core modules that are required.')
  .parse(process.argv);

var options: lib.ProjectOptions = {};

options.exportPackage = { universal: commander['globalExport'] };
options.modulesDirectories = commander['modulePath'];
options.includeNode = commander['includeNode'] !== undefined;
options.globalModules = {};

options.outputFileName = { standalone: path.join(process.cwd(), commander['output']) };

for (var i = 0; i < (commander['globalModules'] || []).length; ++i) {
	var mod = commander['globalModules'][i];
	if (mod === '') continue;

	var ind = mod.indexOf('=');

	if (ind === -1) {
		options.globalModules[mod] = { universal: mod };
	} else {
		options.globalModules[mod.substr(0, ind)] = { universal: mod.substr(ind + 1) };
	}
}

lib.compile(path.join(process.cwd(), commander['input']), options, (error) => {
	if (error) {
		throw error;
	}
});
