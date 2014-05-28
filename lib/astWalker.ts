/// <reference path="../definitions/ref.d.ts" />

import uglify = require('uglify-js');
import file = require('./file');
import exportNode = require('./exportNode');
import importNode = require('./importNode');

export interface ExportsInfo {
	style: exportNode.Style;
	dotArray: string[];

	exportAST: uglify.AST_Node;
	ast: uglify.AST_Node;
}

export function matchExportsAlias(node: uglify.AST_Node, isTopLevel: boolean): ExportsInfo {
	// this
	if (node instanceof uglify.AST_This && isTopLevel) {
		return {
			style: exportNode.Style.This,
			dotArray: [],
			exportAST: node,
			ast: node
		};
	}

	// exports
	if (node instanceof uglify.AST_SymbolRef) {
		var nodeVar = <uglify.AST_SymbolRef> node;
		if (nodeVar.thedef.name === 'exports' && nodeVar.thedef.undeclared) {
			return {
				style: exportNode.Style.Exports,
				dotArray: [],
				exportAST: nodeVar,
				ast: nodeVar
			};
		}
	}

	if (node instanceof uglify.AST_PropAccess) {
		var nodeAccess = <uglify.AST_PropAccess> node;

		// module.exports
		if (nodeAccess.expression instanceof uglify.AST_SymbolRef && nodeAccess.property === 'exports') {
			var expressionVal = <uglify.AST_SymbolRef> nodeAccess.expression;

			if (expressionVal.thedef.name === 'module' && expressionVal.thedef.undeclared) {
				return {
					style: exportNode.Style.ModuleExports,
					dotArray: [],
					exportAST: nodeAccess,
					ast: nodeAccess
				};
			}
		}

		// [some exports style].[property]
		var exportAlias: ExportsInfo = matchExportsAlias(nodeAccess.expression, isTopLevel);
		if (exportAlias) {
			if (typeof nodeAccess.property === 'string') {
				return {
					style: exportAlias.style,
					dotArray: exportAlias.dotArray.concat([<string>nodeAccess.property]),
					exportAST: exportAlias.exportAST,
					ast: nodeAccess
				};
			}
		}
	}
}

export function walkAst(f: file.SourceFile) {
	var impTopIndex = 0;
	var expTopIndex = 0;

	var handleExportTopLevel = (exp: exportNode.Export, isTop: boolean) => {
		exp.topLevel = isTop;
		if (isTop) {
			exp.topLevelIndex = expTopIndex++;
		}
	};

	var walker = new uglify.TreeWalker((node: uglify.AST_Node, descend: () => void) => {
		var isTop = walker.find_parent(uglify.AST_Lambda) ? false : true;

		// imports
		if (node instanceof uglify.AST_Call) {
			var nodeCall = <uglify.AST_Call> node;

			if (nodeCall.expression instanceof uglify.AST_SymbolRef && nodeCall.args.length === 1) {
				var funcVar = <uglify.AST_SymbolRef> nodeCall.expression;

				if (funcVar.thedef.name === 'require' && funcVar.thedef.undeclared) {
					var arg = nodeCall.args[0];

					if (!(arg instanceof uglify.AST_String)) {
						throw new Error('Statements in require calls are not allowed.');
					}

					var imp: importNode.Import;
					if (parent instanceof uglify.AST_VarDef) {
						// TODO: imports with properties, like var func require('name').someObj.someFunc;
						var parentVar = <uglify.AST_VarDef> parent;

						var impSimple = new importNode.SimpleImport();

						impSimple.ast = parentVar;
						impSimple.importAst = nodeCall;
						impSimple.dotArray = [];
						impSimple.varAst = parentVar.name;

						impSimple.safe = true;

						imp = impSimple;
					} else {
						imp = new importNode.Import();
						imp.ast = nodeCall;
						imp.importAst = nodeCall;

						imp.safe = false;
					}

					imp.conditional = (walker.find_parent(uglify.AST_Block) || walker.find_parent(uglify.AST_StatementWithBody) || walker.find_parent(uglify.AST_Conditional) || walker.find_parent(uglify.AST_Binary)) ? false : true;
					imp.safe = imp.safe && !imp.conditional;

					imp.topLevel = isTop;
					if (isTop) {
						imp.topLevelIndex = impTopIndex++;
					}
					imp.relativePath = (<uglify.AST_String>arg).value;

					f.importNodes.push(imp);

					// if (arg instanceof uglify.AST_String) {
					// 	var argStr = <uglify.AST_String> arg;
					// }
				}
			}
		}

		// exports
		var match = matchExportsAlias(node, isTop);
		if (!match) return;

		var parent: uglify.AST_Node = walker.parent();

		if (parent instanceof uglify.AST_Assign) {
			var parentAssign = <uglify.AST_Assign> parent;
			if (match.dotArray.length === 0) {
				if (match.style !== exportNode.Style.ModuleExports) {
					throw new Error('Use "module.exports = " for export assignments instead of "exports = " or "this = "');
				}
				var expF = new exportNode.FullExport();
				expF.style = match.style;
				expF.ast = parentAssign;
				expF.astLeft = <uglify.AST_PropAccess> match.ast;
				expF.exportAst = match.exportAST;
				expF.astRight = parentAssign.right;

				expF.safe = (walker.find_parent(uglify.AST_Block) || walker.find_parent(uglify.AST_StatementWithBody)) ? false : true;

				handleExportTopLevel(expF, isTop);

				f.exportNodes.push(expF);

				return true;
			} else {
				var expS = new exportNode.SingleExport();
				expS.style = match.style;
				expS.ast = parentAssign;
				expS.astLeft = <uglify.AST_PropAccess> match.ast;
				expS.exportAst = match.exportAST;
				expS.astRight = parentAssign.right;

				expS.dotArray = match.dotArray;

				expS.safe = (walker.find_parent(uglify.AST_Block) || walker.find_parent(uglify.AST_StatementWithBody)) ? false : true;

				handleExportTopLevel(expS, isTop);

				f.exportNodes.push(expS);
				return true;
			}
		} else {
			var expU = new exportNode.UnknownExport();
			expU.style = match.style;
			expU.ast = node;
			expU.exportAst = match.exportAST;

			expU.safe = false;

			handleExportTopLevel(expU, isTop);

			f.exportNodes.push(expU);
			return true;
		}
	});

	var walkerSafety = new uglify.TreeWalker((node: uglify.AST_Node, descend: () => void) => {
		// import
		var def: uglify.SymbolDef;

		if (node instanceof uglify.AST_VarDef) {
			var nodeVarDef = <uglify.AST_VarDef> node;
			def = (<uglify.AST_SymbolDeclaration> nodeVarDef.name).thedef;
		} else if (node instanceof uglify.AST_Assign) {
			var nodeAssign = <uglify.AST_Assign> node;
			if (nodeAssign.left instanceof uglify.AST_SymbolVar) {
				var nodeLeftVar = <uglify.AST_SymbolVar> nodeAssign.left;
				def = nodeLeftVar.thedef;
			}
		}

		if (def) {
			for (var i = 0; i < f.importNodes.length; ++i) {
				var imp = f.importNodes[i];
				if (imp instanceof importNode.SimpleImport) {
					var impSimple = <importNode.SimpleImport> imp;

					if (!impSimple.safe) continue;
					if (impSimple.varAst.thedef !== def) continue;

					if (impSimple.ast === node) continue;

					impSimple.safe = false;
				}
			}
		}
	});
	f.ast.walk(walker);
	f.ast.walk(walkerSafety);

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
