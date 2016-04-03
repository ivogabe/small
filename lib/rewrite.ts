import ts = require('typescript');
import project = require('./project');
import file = require('./file');

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
	const replaces: Replace[] = [];

	let top: string = '';
	let bottom: string = '';
	const closureParameters: ClosureParameter[] = [];

	let usesModuleExports = false;
	let usesExports = false;
	for (const exportNode of f.exportNodes) {
		if (exportNode.isModuleExports) {
			usesModuleExports = true;
		} else {
			usesExports = true;
		}
	}

	const needsTwoExportVariables = usesModuleExports && usesExports;

	const varExports = 'exports';
	let varModuleExports = p.options.varPrefix + 'moduleExports';

	if (f.isJson) {
		top = 'return (';
		bottom = ');';
	} else if (needsTwoExportVariables) {
		top = 'var ' + varExports + ' = {}, ' + varModuleExports + ' = ' + varExports + ';';
		bottom = 'return ' + varModuleExports + ';';
	} else {
		top = 'var ' + varExports + ' = {};';
		bottom = 'return ' + varExports + ';';
		varModuleExports = varExports;
	}
	if (f.hasCircularDependencies) {
		top += '\n' + f.varName + ' = function() { return ' + varExports + '; };';
		if (needsTwoExportVariables) {
			bottom = f.varName + ' = function() { return ' + varModuleExports + '; };\n' + bottom;
		}
	}

	for (const exportNode of f.exportNodes) {
		replaces.push({
			pos: exportNode.ast.pos,
			endpos: exportNode.ast.end,
			value: exportNode.emit(varExports, varModuleExports)
		});
	}

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

	for (const imp of f.importNodes) {
		const value = imp.emit();

		if (value === '' && imp.ast.kind === ts.SyntaxKind.VariableDeclaration) {
			removeVar(<ts.VariableDeclaration> imp.ast);
		} else {
			replaces.push({
				pos: imp.ast.pos,
				endpos: imp.ast.end,

				value
			});
		}

		for (const reference of imp.references) {
			const value = reference.emit();
			if (value !== undefined) {
				replaces.push({
					pos: reference.ast.pos,
					endpos: reference.ast.end,

					value
				});
			}
		}
	};

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
	for (const other of f.structureChildren) {
		let beforeFile = 'var ' + other.varName + ' = ';

		replaces.push({
			pos: 0,
			endpos: 0,

			secundarySort: childTopId++,

			beforeFile,
			file: other,
			afterFile: ';\n'
		});
	};

	replaces.sort((a, b) => { // Sort ascending based on pos and secundarySort
		if (a.pos === b.pos) {
			if (a.endpos === b.endpos) {
				return a.secundarySort - b.secundarySort;
			} else {
				return a.endpos - b.endpos;
			}
		} else {
			return a.pos - b.pos;
		}
	});

	f.rewriteData = {
		replaces: replaces,
		top: top,
		bottom: bottom,
		closureParameters: closureParameters
	};
}
