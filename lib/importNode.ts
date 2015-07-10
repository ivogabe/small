/// <reference path="../definitions/ref.d.ts" />
import ts = require('typescript');
import exportNode = require('./exportNode');
import file = require('./file');
import project = require('./project');

export enum OutputStyle {
	/**
	 * A closure.
	 * Only used when a file is imported once
	 */
	SINGLE,

	/**
	 * A first load.
	 * Example:
	 * require('events')
	 * becomes
	 * (__bundle$_1 = [...]);
	 */
	VAR_ASSIGN,

	/**
	 * A module variable reference.
	 * Example:
	 * require('events') becomes __bundle$_1
	 */
	VAR_REFERENCE,

	/**
	 * Rename the variable to which the import is assigned to.
	 * Example:
	 *    var events = require('events');
	 *    ... events ...
	 * becomes
	 *
	 *    ... __bundle$_1 ...
	 */
	VAR_RENAME,

	/**
	 * Combines VAR_ASSIGN and VAR_RENAME
	 */
	VAR_ASSIGN_AND_RENAME
}

export class Import {
	ast: ts.Node;
	importAst: ts.CallExpression;

	relativePath: string;
	absolutePath: string;
	globalModule: project.PackageData;

	file: file.SourceFile;

	/**
	 * Whether the import is not inside a function
	 */
	topLevel: boolean;
	topLevelIndex: number;
	safe: boolean;
	conditional: boolean;
	
	references: ts.Node[] = [];

	outputStyle: OutputStyle;
}

/**
 * An import like "var foo = require('foo');"
 */
export class SimpleImport extends Import {
	ast: ts.VariableDeclaration;
	symbol: ts.Symbol;

	exportNode: exportNode.Export;

	dotArray: string[] = [];
}
