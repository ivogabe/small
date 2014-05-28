/// <reference path="../definitions/ref.d.ts" />

import uglify = require('uglify-js');
import file = require('./file');

/**
 * Bundles the imports and exports of the file.
 * @param file The file
 */
export function combine(f: file.SourceFile) {
	var imports = f.getSimpleImportNodes();
	var exports = f.getSingleExportNodes();
	var fullExports = f.getFullExportNodes();

	var findImport = (def: uglify.SymbolDef) => {
		for (var i = 0; i < imports.length; ++i) {
			var imp = imports[i];

			if (imp.safe && imp.varAst.thedef === def) {
				return imp;
			}
		}
		return undefined;
	};

	if (fullExports.length === 1) {
		fullExports[0].importNode = findImport(fullExports[0].def);
	} else if (fullExports.length === 0) {
		for (var i = 0; i < exports.length; ++i) {
			var exp = exports[i];
			exp.importNode = findImport(exp.def);
		}
	}
}
