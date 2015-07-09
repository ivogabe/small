/// <reference path="../definitions/ref.d.ts" />

import ts = require('typescript');
import file = require('./file');

/**
 * Bundles the imports and exports of the file.
 * @param file The file
 */
export function combine(f: file.SourceFile) {
	var imports = f.getSimpleImportNodes();
	var exports = f.getSingleExportNodes();
	var fullExports = f.getFullExportNodes();

	var findImport = (symbol: ts.Symbol) => {
		for (var i = 0; i < imports.length; ++i) {
			var imp = imports[i];

			if (imp.safe && imp.symbol === symbol) {
				return imp;
			}
		}
		return undefined;
	};

	if (fullExports.length === 1) {
		fullExports[0].importNode = findImport(fullExports[0].symbolRight);
	} else if (fullExports.length === 0) {
		for (var i = 0; i < exports.length; ++i) {
			var exp = exports[i];
			exp.importNode = findImport(exp.symbolRight);
		}
	}
}
