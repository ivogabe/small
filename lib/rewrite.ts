import ts = require('typescript');
import project = require('./project');
import file = require('./file');
import exportNode = require('./exportNode');
import importNode = require('./importNode');

export interface Replace {
	pos: number;
	endpos: number;

	secundarySort?: number;

	value?: string;
	file?: file.SourceFile;
	beforeFile?: string;
	afterFile?: string;
}
export interface RewriteData {
	replaces: Replace[];
	top: string;
	bottom: string;
	closureParameters: ClosureParameter[];
}

export interface ClosureParameter {
	name: string;
	value: string;
}

interface RemovedVariableDeclaration {
	list: ts.VariableDeclarationList;
	removedDeclarations: ts.VariableDeclaration[];
}

export function rewriteFile(p: project.Project, f: file.SourceFile) {
	var replaces: Replace[] = [];

	var top: string = '';
	var bottom: string = '';
	var closureParameters: ClosureParameter[] = [];

	var unknownExps = f.getUnknownExportNodes();
	var singleExps = f.getSingleExportNodes();
	var fullExps = f.getFullExportNodes();

	var needsTwoExportVariables = (fullExps.length >= 1) && ((unknownExps.length >= 1) || (singleExps.length >= 1));

	var varExports = 'exports';
	var varModuleExports = p.options.varPrefix + 'moduleExports';

	if (needsTwoExportVariables) {
		if (f.hasCircularDependencies) {
			closureParameters.push({
				name: varExports,
				value: f.varName
			});
			top = 'var ' + varModuleExports + ' = ' + varExports + ';';
			bottom = 'return ' + varModuleExports;
		} else {
			top = 'var ' + varExports + ' = {}, ' + varModuleExports + ' = ' + varExports + ';';
			bottom = 'return ' + varModuleExports + ';';
		}
	} else {
		if (f.hasCircularDependencies) {
			closureParameters.push({
				name: varExports,
				value: f.varName
			});
			if (fullExps.length > 0) bottom = 'return ' + varExports + ';';
		} else {
			top = 'var ' + varExports + ' = {};';
			bottom = 'return ' + varExports + ';';
			varModuleExports = varExports;
		}
	}

	f.exportNodes.forEach((exp) => {
		replaces.push({
			pos: exp.exportAst.pos,
			endpos: exp.exportAst.end,
			value: (exp.style === exportNode.Style.ModuleExports) ? varModuleExports : varExports
		});
	});
	
	const removedVars: RemovedVariableDeclaration[] = [];
	const removeVar = (declaration: ts.VariableDeclaration) => {
		for (const removed of removedVars) {
			if (removed.list === declaration.parent) {
				removed.removedDeclarations.push(declaration);
				return;
			}
		}
		removedVars.push({
			list: declaration.parent,
			removedDeclarations: [declaration]
		});
	};

	f.importNodes.forEach((imp) => {
		switch (imp.outputStyle) {
			case importNode.OutputStyle.SINGLE:
				replaces.push({
					pos: imp.importAst.pos,
					endpos: imp.importAst.end,

					beforeFile: '(',
					file: imp.file,
					afterFile: ')'
				});
				return;
			case importNode.OutputStyle.VAR_REFERENCE:
				replaces.push({
					pos: imp.importAst.pos,
					endpos: imp.importAst.end,

					value: imp.file ? imp.file.varName : imp.globalModule._varName
				});
				return;
			case importNode.OutputStyle.VAR_ASSIGN:
			case importNode.OutputStyle.VAR_ASSIGN_AND_RENAME:
				replaces.push({
					pos: imp.importAst.pos,
					endpos: imp.importAst.end,

					beforeFile: '(' + imp.file.varName + ' = ',
					file: imp.file,
					afterFile: ')'

				});
				break;
		}

		

		switch (imp.outputStyle) {
			case importNode.OutputStyle.VAR_RENAME:
				if (imp.ast.kind === ts.SyntaxKind.VariableDeclaration) {
					removeVar(<ts.VariableDeclaration> imp.ast);
				} else {
					replaces.push({
						pos: imp.ast.pos,
						endpos: imp.ast.end,
	
						value: ''
					});
				}
				/* fall through */
			case importNode.OutputStyle.VAR_ASSIGN_AND_RENAME:
				var impSimple = <importNode.SimpleImport> imp;
				
				impSimple.references.forEach((ref) => {
					replaces.push({
						pos: ref.pos,
						endpos: ref.end,

						value: imp.file.varName
					});
				});
		}
	});
	
	for (const removed of removedVars) {
		if (removed.list.declarations.length === removed.removedDeclarations.length) {
			// All declarations are removed, so we can remove the full variable statement.
			replaces.push({
				pos: removed.list.pos,
				endpos: removed.list.end,

				value: ''
			});
		} else {
			for (const declaration of removed.removedDeclarations) {
				const index = removed.list.declarations.indexOf(declaration);
				const previous = removed.list.declarations[index - 1];
				const next = removed.list.declarations[index + 1];
				replaces.push({
					pos: previous ? previous.end : declaration.pos,
					endpos: next ? next.pos : declaration.end,
	
					value: ''
				});
			}
		}
	}

	var childTopId = 1;
	var circularNames: string[] = [];
	f.structureChildren.forEach((other) => {
		if (!other.defined) {
			if (other.hasCircularDependencies) circularNames.push(other.varName);
			
			let beforeFile = '';
			
			if (other.hasCircularDependencies) {
				if (other.getFullExportNodes().length > 0) {
					beforeFile = other.varName + ' = ';
				}
			} else {
				beforeFile = 'var ' + other.varName + ' = ';
			}
			
			replaces.push({
				pos: 0,
				endpos: 0,

				secundarySort: childTopId++,

				beforeFile,
				file: other,
				afterFile: ';\n'
			});
		}
	});
	if (circularNames.length > 0) {
		replaces.push({
			pos: 0,
			endpos: 0,
			secundarySort: 0,
			value: 'var ' + circularNames.join(' = {}, ') + ' = {};\n'
		})
	}

	replaces.sort((a, b) => { // Sort ascending based on pos and secundarySort
		if (a.pos === b.pos) {
			if (a.endpos === b.endpos) {
				return b.secundarySort - a.secundarySort;
			} else {
				return b.endpos - a.endpos;
			}
		} else {
			return b.pos - a.pos;
		}
	});
	
	f.rewriteData = {
		replaces: replaces,
		top: top,
		bottom: bottom,
		closureParameters: closureParameters
	};
}
