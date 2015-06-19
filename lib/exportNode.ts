/// <reference path="../definitions/ref.d.ts" />
import ts = require('typescript');
import importNode = require('./importNode');

export enum Style {
	Exports, // exports.[...] =
	ModuleExports, // module.exports.[...] =  OR  module.exports =
	This // this.[...] =
}

export class Export {
	style: Style;

	ast: ts.Node;
	exportAst: ts.Node;

	importNode: importNode.SimpleImport;

	topLevel: boolean;
	topLevelIndex: number;
	safe: boolean;
}

export class SingleExport extends Export {
	ast: ts.BinaryExpression;
	astLeft: ts.PropertyAccessExpression;
	astRight: ts.Expression;

	dotArray: string[];

	get def() {
		return undefined; // getDefFromNode(this.astRight);
	}
}

export class FullExport extends Export {
	style = Style.ModuleExports;

	ast: ts.BinaryExpression;
	astLeft: ts.PropertyAccessExpression;
	astRight: ts.Expression;

	get def() {
		return undefined; // getDefFromNode(this.astRight);
	}
}

/**
 * Returns first declaration of a variable
 */
// function getDefFromNode(node: ts.VariableDeclaration): ts.VariableDeclaration {
	/*if (ast instanceof uglify.AST_SymbolRef) {
		return (<uglify.AST_SymbolRef> ast).thedef;
	}
	return undefined;*/
	// return false; // TODO: variableIsDefined
// }

/**
 * An export like:
 * (function(exp) { exp.someVar = 'someValue' })(exports);
 */
export class UnknownExport extends Export {

}
