/// <reference path="../definitions/ref.d.ts" />

import ts = require('typescript');
import file = require('./file');
import exportNode = require('./exportNode');
import importNode = require('./importNode');

export interface ExportsInfo {
	style: exportNode.Style;
	dotArray: string[];

	exportAST: ts.Node;
	ast: ts.Node;
}

function isDefined(identifier: ts.Identifier) {
	return false; // TODO: isDefined
}

export function matchExportsAlias(node: ts.Node, isTopLevel: boolean): ExportsInfo {
	// this
	if (node.kind === ts.SyntaxKind.ThisKeyword && isTopLevel) {
		return {
			style: exportNode.Style.This,
			dotArray: [],
			exportAST: node,
			ast: node
		};
	}

	// exports
	if (node.kind === ts.SyntaxKind.Identifier) {
		var nodeVar = <ts.Identifier> node;
		if (nodeVar.text === 'exports' && isDefined(nodeVar)) {
			return {
				style: exportNode.Style.Exports,
				dotArray: [],
				exportAST: nodeVar,
				ast: nodeVar
			};
		}
	}

	if (node.kind === ts.SyntaxKind.PropertyAccessExpression) {
		var nodeAccess = <ts.PropertyAccessExpression> node;

		// module.exports
		if (nodeAccess.expression.kind === ts.SyntaxKind.Identifier && nodeAccess.name.text === 'exports') {
			var expressionVal = <ts.Identifier> nodeAccess.expression;

			if (expressionVal.text === 'module' && !isDefined(expressionVal)) {
				return {
					style: exportNode.Style.ModuleExports,
					dotArray: [],
					exportAST: nodeAccess,
					ast: nodeAccess
				};
			}
		}

		// [some exports style].[property]
		var exportAlias: ExportsInfo = matchExportsAlias(nodeAccess.name, isTopLevel);
		if (exportAlias) {
			return {
				style: exportAlias.style,
				dotArray: exportAlias.dotArray.concat([nodeAccess.name.text]),
				exportAST: exportAlias.exportAST,
				ast: nodeAccess
			};
		}
	}
}

type Scope = ts.SourceFile | ts.FunctionLikeDeclaration | ts.ClassLikeDeclaration;

class Walker {
	node: ts.Node = undefined;
	scope: Scope = undefined;
	isConditional: boolean = false;
	
	walk(node: ts.Node) {
		const saveNode = this.node;
		const saveScope = this.scope;
		const saveIsConditional = this.isConditional;
		
		this.node = node;
		switch (node.kind) {
			case ts.SyntaxKind.FunctionDeclaration:
			case ts.SyntaxKind.FunctionExpression:
			case ts.SyntaxKind.ClassDeclaration:
			case ts.SyntaxKind.ClassExpression:
				this.isConditional = true;
				/* fall through */
			case ts.SyntaxKind.SourceFile:
				this.scope = <Scope> node;
				break;
		}
		
		if (!this.isConditional && node.parent) {
			switch (node.parent.kind) {
				case ts.SyntaxKind.IfStatement:
					if (node === (<ts.IfStatement> node.parent).thenStatement || node === (<ts.IfStatement> node.parent).elseStatement) {
						this.isConditional = true;
					}
					break;
				case ts.SyntaxKind.ForStatement:
				case ts.SyntaxKind.ForOfStatement:
				case ts.SyntaxKind.ForInStatement:
				case ts.SyntaxKind.WhileStatement:
				case ts.SyntaxKind.DoStatement:
					if ((<ts.IterationStatement> node.parent).statement === node) {
						this.isConditional = true;
					}
					break;
				case ts.SyntaxKind.BinaryExpression:
					const expression = <ts.BinaryExpression> node.parent;
					if (expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
						|| expression.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
						if (expression.right === node) {
							this.isConditional = true;
						}
					}
					break;
			}
		}
		
		this.visit(node);
		
		this.node = saveNode;
		this.scope = saveScope;
		this.isConditional = saveIsConditional;
	}
	
	protected descent() {
		ts.forEachChild(this.node, (node) => this.walk(node));
	}
	
	protected visit(node: ts.Node) {
		
	}
}
class ParseWalker extends Walker {
	importTopLevelIndex = 0;
	exportTopLevelIndex = 0;
	file: file.SourceFile;
	
	protected visit(node: ts.Node) {
		// imports
		if (node.kind === ts.SyntaxKind.CallExpression) {
			var nodeCall = <ts.CallExpression> node;

			if (nodeCall.expression.kind === ts.SyntaxKind.Identifier && nodeCall.arguments.length === 1) {
				var funcVar = <ts.Identifier> nodeCall.expression;

				if (funcVar.text === 'require' && !isDefined(funcVar)) {
					var arg = nodeCall.arguments[0];

					if (arg.kind !== ts.SyntaxKind.StringLiteral) {
						throw new Error('Expressions other than string literals in require calls are not allowed.');
					}

					var imp: importNode.Import;
					if (node.parent.kind === ts.SyntaxKind.VariableDeclaration
						&& (<ts.VariableDeclaration> node.parent).name.kind === ts.SyntaxKind.Identifier) { // Don't allow destructuring here
						// TODO: imports with properties, like var func require('name').someObj.someFunc;
						var parentVar = <ts.VariableDeclaration> node.parent;

						var impSimple = new importNode.SimpleImport();

						impSimple.ast = parentVar;
						impSimple.importAst = nodeCall;
						impSimple.dotArray = [];
						impSimple.symbol = this.file.types.getSymbolAtLocation(parentVar);

						impSimple.safe = true;

						imp = impSimple;
					} else {
						imp = new importNode.Import();
						imp.ast = nodeCall;
						imp.importAst = nodeCall;

						imp.safe = false;
					}

					imp.conditional = this.isConditional;
					// imp.conditional = (walker.find_parent(uglify.AST_Block) || walker.find_parent(uglify.AST_StatementWithBody) || walker.find_parent(uglify.AST_Conditional) || walker.find_parent(uglify.AST_Binary)) ? false : true;
					imp.safe = imp.safe && !imp.conditional;

					imp.topLevel = !this.isConditional;
					if (imp.topLevel) {
						imp.topLevelIndex = this.importTopLevelIndex++;
					}
					imp.relativePath = (<ts.StringLiteral> arg).text;

					this.file.importNodes.push(imp);
				}
			}
		}

		// exports
		var match = matchExportsAlias(node, !this.isConditional);
		if (match) {
			if (node.parent.kind === ts.SyntaxKind.BinaryExpression && (<ts.BinaryExpression> node.parent).operatorToken.kind === ts.SyntaxKind.EqualsToken) {
				var parentAssign = <ts.BinaryExpression> node.parent;
				if (match.dotArray.length === 0) {
					if (match.style !== exportNode.Style.ModuleExports) {
						throw new Error('Use "module.exports = " for export assignments instead of "exports = " or "this = "');
					}
					var expF = new exportNode.FullExport();
					expF.style = match.style;
					expF.ast = parentAssign;
					expF.astLeft = <ts.PropertyAccessExpression> match.ast;
					expF.exportAst = match.exportAST;
					expF.astRight = parentAssign.right;
					expF.symbolRight = (expF.astRight.kind === ts.SyntaxKind.Identifier) ? this.file.types.getSymbolAtLocation(expF.astRight) : undefined;

					expF.safe = !this.isConditional;

					this.handleExportTopLevel(expF);

					this.file.exportNodes.push(expF);

					return true;
				} else {
					var expS = new exportNode.SingleExport();
					expS.style = match.style;
					expS.ast = parentAssign;
					expS.astLeft = <ts.PropertyAccessExpression> match.ast;
					expS.exportAst = match.exportAST;
					expS.astRight = parentAssign.right;
					expS.symbolRight = (expS.astRight.kind === ts.SyntaxKind.Identifier) ? this.file.types.getSymbolAtLocation(expS.astRight) : undefined;

					expS.dotArray = match.dotArray;

					expS.safe = !this.isConditional;

					this.handleExportTopLevel(expS);

					this.file.exportNodes.push(expS);
					return true;
				}
			} else {
				var expU = new exportNode.UnknownExport();
				expU.style = match.style;
				expU.ast = node;
				expU.exportAst = match.exportAST;
	
				expU.safe = false;
	
				this.handleExportTopLevel(expU);
	
				this.file.exportNodes.push(expU);
				return true;
			}
		}
		this.descent();
	}
	
	private handleExportTopLevel(node: exportNode.Export) {
		node.topLevel = !this.isConditional;
		if (node.topLevel) node.topLevelIndex = this.exportTopLevelIndex++;
	}
}
class SafetyWalker extends Walker {
	file: file.SourceFile;
	
	protected visit(node: ts.Node) {
		// import
		
		// TODO: def
		var symbol: ts.Symbol;
		//var def: uglify.SymbolDef;

		if (node.kind === ts.SyntaxKind.VariableDeclaration) {
			var nodeVarDef = <ts.VariableDeclaration> node;
			if ((<ts.VariableDeclaration> node).initializer) {
				symbol = this.file.types.getSymbolAtLocation(nodeVarDef.name);
			}
		} else if (node.kind === ts.SyntaxKind.BinaryExpression && (<ts.BinaryExpression>node).operatorToken.kind === ts.SyntaxKind.EqualsToken) {
			var nodeAssign = <ts.BinaryExpression> node;
			if (nodeAssign.left.kind === ts.SyntaxKind.Identifier) {
				var nodeLeftVar = <ts.Identifier> nodeAssign.left;
				symbol = this.file.types.getSymbolAtLocation(nodeLeftVar);
			}
		}
		
		var symbolRef: ts.Symbol;
		if (node.kind === ts.SyntaxKind.Identifier) {
			symbolRef = this.file.types.getSymbolAtLocation(node);
		}

		if (symbol || symbolRef) {
			for (var i = 0; i < this.file.importNodes.length; ++i) {
				var imp = this.file.importNodes[i];
				if (imp instanceof importNode.SimpleImport) {
					var impSimple = <importNode.SimpleImport> imp;
					
					if (symbolRef && symbolRef === impSimple.symbol) {
						impSimple.references.push(node);
					}
					
					if (!impSimple.safe || !symbol) continue;
					if (impSimple.symbol !== symbol) continue;

					if (impSimple.ast === node) continue;

					impSimple.safe = false;
					break;
				}
			}
		}
		
		
		
		this.descent();
	};
}

export function walkAst(f: file.SourceFile) {
	var impTopIndex = 0;
	var expTopIndex = 0;
	
	var walker = new ParseWalker();
	var walkerSafety = new SafetyWalker();
	walker.file = f;
	walkerSafety.file = f;
	
	walker.walk(f.ast);
	walkerSafety.walk(f.ast);

	// export safety
	var unknownExps = f.getUnknownExportNodes();
	var singleExps = f.getSingleExportNodes();
	var fullExps = f.getFullExportNodes();

	var expSafe: boolean;

	if (unknownExps.length !== 0) {
		expSafe = false;
	} else if (fullExps.length === 1) {
		if (singleExps.length >= 1) {
			expSafe = false;
		} else {
			expSafe = true;
		}
	} else if (fullExps.length >= 2) {
		expSafe = false;
	}

	if (expSafe === false || expSafe === true) {
		for (var i = 0; i < f.exportNodes.length; ++i) {
			f.exportNodes[i].safe = expSafe;
		}
	} else {
		for (var i = 0; i < singleExps.length; ++i) {
			var exp = singleExps[i];

			if (exp.safe === false) continue;

			if (singleExps.filter((item) => {
				return item.dotArray[0] === exp.dotArray[0];
			}).length === 1) {
				exp.safe = true;
			} else {
				exp.safe = false;
			}
		}
	}
}
