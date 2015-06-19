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
		top = 'var ' + varExports + ' = {}, ' + varModuleExports + ' = ' + varExports + ';';
		bottom = 'return ' + varModuleExports + ';';
	} else {
		top = 'var ' + varExports + ' = {};';
		bottom = 'return ' + varExports + ';';
		varModuleExports = varExports;
	}

	f.exportNodes.forEach((exp) => {
		replaces.push({
			pos: exp.exportAst.pos,
			endpos: exp.exportAst.end,
			value: (exp.style === exportNode.Style.ModuleExports) ? varModuleExports : varExports
		});
	});

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
				replaces.push({
					pos: imp.ast.pos,
					endpos: imp.ast.end,

					value: ''
				});
			case importNode.OutputStyle.VAR_ASSIGN_AND_RENAME:
				var impSimple = <importNode.SimpleImport> imp;
				// TODO: Rename all references of variable
				/*impSimple.varAst.thedef.references.forEach((ref) => {
					replaces.push({
						pos: ref.start.pos,
						endpos: ref.end.endpos,

						value: imp.file.varName
					});
				});*/
		}
	});

	var childTopId = 0;
	f.structureChildren.forEach((other) => {
		if (!other.defined) {
			replaces.push({
				pos: 0,
				endpos: 0,

				secundarySort: childTopId++,

				beforeFile: 'var ' + other.varName + ' = ',
				file: other,
				afterFile: ';\n'
			});
		}
	});

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
