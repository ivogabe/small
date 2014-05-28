/// <reference path="../definitions/ref.d.ts" />
import uglify = require('uglify-js');
import importNode = require('./importNode');

export enum Style {
	Exports, // exports.[...] =
	ModuleExports, // module.exports.[...] =  OR  module.exports =
	This // this.[...] =
}

export class Export {
	style: Style;

	ast: uglify.AST_Node;
	exportAst: uglify.AST_Node;

	importNode: importNode.SimpleImport;

	topLevel: boolean;
	topLevelIndex: number;
	safe: boolean;
}

export class SingleExport extends Export {
	ast: uglify.AST_Assign;
	astLeft: uglify.AST_PropAccess;
	astRight: uglify.AST_Node;

	dotArray: string[];

	get def() {
		return getDefFromNode(this.astRight);
	}
}

export class FullExport extends Export {
	style = Style.ModuleExports;

	ast: uglify.AST_Assign;
	astLeft: uglify.AST_PropAccess;
	astRight: uglify.AST_Node;

	get def() {
		return getDefFromNode(this.astRight);
	}
}

function getDefFromNode(ast: uglify.AST_Node): uglify.SymbolDef {
	if (ast instanceof uglify.AST_SymbolRef) {
		return (<uglify.AST_SymbolRef> ast).thedef;
	}
	return undefined;
}

/**
 * An export like:
 * (function(exp) { exp.someVar = 'someValue' })(exports);
 */
export class UnknownExport extends Export {

}
