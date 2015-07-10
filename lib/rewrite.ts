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
			pos: exp.exportAst.start.pos,
			endpos: exp.exportAst.end.endpos,
			value: (exp.style === exportNode.Style.ModuleExports) ? varModuleExports : varExports
		});
	});

	f.importNodes.forEach((imp) => {
		switch (imp.outputStyle) {
			case importNode.OutputStyle.SINGLE:
				replaces.push({
					pos: imp.importAst.start.pos,
					endpos: imp.importAst.end.endpos,

					beforeFile: '(',
					file: imp.file,
					afterFile: ')'
				});
				return;
			case importNode.OutputStyle.VAR_REFERENCE:
				replaces.push({
					pos: imp.importAst.start.pos,
					endpos: imp.importAst.end.endpos,

					value: imp.file ? imp.file.varName : imp.globalModule._varName
				});
				return;
			case importNode.OutputStyle.VAR_ASSIGN:
			case importNode.OutputStyle.VAR_ASSIGN_AND_RENAME:
				replaces.push({
					pos: imp.importAst.start.pos,
					endpos: imp.importAst.end.endpos,

					beforeFile: '(' + imp.file.varName + ' = ',
					file: imp.file,
					afterFile: ')'

				});
				break;
		}

		switch (imp.outputStyle) {
			case importNode.OutputStyle.VAR_RENAME:
				replaces.push({
					pos: imp.ast.start.pos,
					endpos: imp.ast.end.endpos,

					value: ''
				});
			case importNode.OutputStyle.VAR_ASSIGN_AND_RENAME:
				var impSimple = <importNode.SimpleImport> imp;
				impSimple.varAst.thedef.references.forEach((ref) => {
					replaces.push({
						pos: ref.start.pos,
						endpos: ref.end.endpos,

						value: imp.file.varName
					});
				});
		}
	});

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
