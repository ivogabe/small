import * as ts from 'typescript';
import { SourceFile } from './file';
import { PackageData } from './project';

export class Binding {
	declarations: ExportNode[] = undefined;
	references: Node[] = [];

	constructor(declarations: ExportNode[]) {
		this.declarations = declarations;
	}
}

export class Node {
	constructor(ast: ts.Node) {
		this.ast = ast;
	}

	file: SourceFile;
	binding: Binding = undefined;
	ast: ts.Node;
}

export class ExportNode extends Node {
	static tryParse(checker: ts.TypeChecker, ast: ts.Node, insideFunction: boolean, disallowDots?: boolean): ExportNode {
		if (ast === undefined) return undefined;
		if (ast.kind === ts.SyntaxKind.Identifier) {
			if ((<ts.Identifier> ast).text !== 'exports') return undefined;
			if (checker.getSymbolAtLocation(ast) !== undefined) return undefined;
			return new ExportNode(ast);
		} else if (ast.kind === ts.SyntaxKind.ThisKeyword) {
			if (insideFunction) return undefined;
			return new ExportNode(ast);
		} else if (ast.kind === ts.SyntaxKind.PropertyAccessExpression) {
			const expression = (<ts.PropertyAccessExpression> ast).expression;
			const name = (<ts.PropertyAccessExpression> ast).name.text;

			// Check for `module.exports`
			if (expression.kind === ts.SyntaxKind.Identifier && (<ts.Identifier> expression).text === 'module' && name === 'exports' && !checker.getSymbolAtLocation(expression)) {
				const node = new ExportNode(ast);
				node.isModuleExports = true;
				return node;
			}

			// We wont parse things like `exports.foo.bar`.
			if (disallowDots) return undefined;

			const parent = ExportNode.tryParse(checker, expression, insideFunction, true);
			if (parent) {
				parent.ast = ast;
				parent.name = name;
				return parent;
			}
		} else if (ast.kind === ts.SyntaxKind.BinaryExpression) {
			let compound = false;
			switch ((<ts.BinaryExpression> ast).operatorToken.kind) {
				case ts.SyntaxKind.PlusEqualsToken:
				case ts.SyntaxKind.MinusEqualsToken:
				case ts.SyntaxKind.AsteriskEqualsToken:
				case ts.SyntaxKind.SlashEqualsToken:
				case ts.SyntaxKind.AmpersandEqualsToken:
				case ts.SyntaxKind.BarEqualsToken:
				case ts.SyntaxKind.CaretEqualsToken:
				case ts.SyntaxKind.LessThanLessThanEqualsToken:
				case ts.SyntaxKind.PercentEqualsToken:
				case ts.SyntaxKind.GreaterThanGreaterThanEqualsToken:
				case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
					compound = true;
					/* fall through */
				case ts.SyntaxKind.EqualsToken:
					const parent = ExportNode.tryParse(checker, (<ts.BinaryExpression> ast).left, insideFunction, true);
					if (parent) {
						parent.assignmentValue = (<ts.BinaryExpression> ast).right;
						parent.compoundAssignment = compound;
						return parent;
					}
					break;
			}
		}
		return undefined;
	}

	/**
	 * Assigned value when this node is an assignment, like `exports.foo = [..]` or `module.exports = [..]`
	 */
	assignmentValue: ts.Expression = undefined;
	/**
	 * True when the assignment uses a compound operator, like `+=` (instead of `=`)
	 */
	compoundAssignment: boolean = undefined;
	/**
	 * True when the export uses `module.exports` instead of `exports`
	 */
	isModuleExports = false;
	name: string = undefined;

	emit(exportsVariable: string, moduleExportsVariable: string) {
		let code: string;

		if (this.isModuleExports) {
			code = moduleExportsVariable;
		} else {
			code = exportsVariable;
		}

		if (this.name) {
			code += '.' + this.name;
		}

		return code;
	}
}

export class ImportNode extends Node {
	static tryParse(checker: ts.TypeChecker, ast: ts.Node): ImportNode {
		if (ast === undefined) return undefined;
		if (ast.kind === ts.SyntaxKind.CallExpression) {
			// require('foo');
			if ((<ts.CallExpression> ast).arguments.length !== 1) return undefined;

			const expression = (<ts.CallExpression> ast).expression;
			if (expression.kind !== ts.SyntaxKind.Identifier) return undefined;
			if ((<ts.Identifier> expression).text !== 'require') return undefined;
			if (checker.getSymbolAtLocation(expression) !== undefined) return undefined;

			const argument = (<ts.CallExpression> ast).arguments[0];
			if (argument.kind !== ts.SyntaxKind.StringLiteral) return undefined;
			const path = (<ts.StringLiteral> argument).text;

			const importNode = new ImportNode(ast);
			importNode.relativePath = path;
			return importNode;
		} else if (ast.kind === ts.SyntaxKind.PropertyAccessExpression) {
			// require('foo').bar
			const parent = ImportNode.tryParse(checker, (<ts.PropertyAccessExpression> ast).expression);
			if (parent) {
				parent.ast = ast;
				parent.dotArray.push((<ts.PropertyAccessExpression> ast).name.text);
				return parent;
			}
		} else if (ast.kind === ts.SyntaxKind.VariableDeclaration) {
			// Possible inputs:
			// var foo = require('foo')
			// var bar = require('foo').bar

			const variable = (<ts.VariableDeclaration> ast).name;
			if (variable.kind !== ts.SyntaxKind.Identifier) return undefined;

			const parent = ImportNode.tryParse(checker, (<ts.VariableDeclaration> ast).initializer);
			if (parent) {
				parent.ast = ast;
				parent.symbol = checker.getSymbolAtLocation((<ts.VariableDeclaration> ast).name);
				return parent;
			}
		}
		return undefined;
	}

	references: ImportReference[] = [];

	/**
	 * Symbol of the variable if the import is assigned to a variable.
	 * For instance, `var foo = require('bar')`
	 */
	symbol: ts.Symbol = undefined;
	/**
	 * Path used in the `require` call.
	 */
	relativePath: string = undefined;
	targetFile: SourceFile = undefined;
	targetGlobalModule: PackageData<string> = undefined;
	/**
	 * Path of property access expressions after the `require` call.
	 * Example: The `dotArray` of `var a = require('b').c.d;` is `['c', 'd']`
	 */
	dotArray: string[] = [];

	getTargetVariable() {
		if (this.targetFile) {
			return this.targetFile.varName;
		} else {
			return this.targetGlobalModule._varName;
		}
	}
	emit() {
		let variable = this.getTargetVariable();
		const circular = this.targetFile && this.targetFile.hasCircularDependencies;
		if (circular) {
			variable += '()';
		}

		let property = '';
		for (const item of this.dotArray) {
			property += '.' + item;
		}

		if (this.symbol) {
			if (this.dotArray.length > 0) {
				// Import looks like `var a = require('b').c.d`
				return this.symbol.name + ' = ' + variable + property;
			} else if (circular) {
				return this.symbol.name + ' = ' + variable;
			} else {
				// Import looks like `var a = require('b')`, and it's not a circular dependency.
				// We will rename `a` to the variable name of the target file.
				return '';
			}
		} else {
			return variable + property;
		}
	}
}

export class ImportReference extends Node {
	static tryParse(checker: ts.TypeChecker, importNodes: ImportNode[], ast: ts.Node): ImportReference {
		if (ast === undefined) return undefined;
		if (ast.kind === ts.SyntaxKind.Identifier) {
			const symbol = checker.getSymbolAtLocation(ast);
			if (symbol === undefined) return undefined;
			for (const importNode of importNodes) {
				if (importNode.symbol === symbol) {
					if (ast.parent === importNode.ast) {
						// We found the identifier in
						// `var a = require('b')`
						break;
					}
					return new ImportReference(ast, importNode);
				}
			}
		} else if (ast.kind === ts.SyntaxKind.PropertyAccessExpression) {
			const parent = ImportReference.tryParse(checker, importNodes, (<ts.PropertyAccessExpression> ast).expression);
			if (parent) {
				parent.ast = ast;
				parent.dotArray.push((<ts.PropertyAccessExpression> ast).name.text);
				return parent;
			}
		}
		return undefined;
	}

	constructor(ast: ts.Node, importNode: ImportNode, dotArray: string[] = []) {
		super(ast);
		this.importNode = importNode;
		this.dotArray = dotArray;
	}
	importNode: ImportNode;
	dotArray: string[];

	emit() {
		const circular = this.importNode.targetFile && this.importNode.targetFile.hasCircularDependencies;
		if (this.importNode.symbol && this.importNode.dotArray.length === 0 && !circular) {
			// Rename the variable

			const variable = this.importNode.getTargetVariable();

			let property = '';
			for (const item of this.dotArray) {
				property += '.' + item;
			}

			return variable + property;
		}
	}
}
