import project = require('./project');
import file = require('./file');

export function bundleFile(p: project.Project, f: file.SourceFile, includeFunctionCall: boolean = true, parameters: string[] = []): string {
	if (f.compiled) return f.compiled;

	var compiled = f.source;
	var replaces = f.rewriteData.replaces;

	replaces.forEach((replace) => {
		if (replace.value) {
			compiled = replaceRange(f, compiled, replace.pos, replace.endpos, replace.value);
		} else if (replace.file) {
			compiled = replaceRange(f, compiled, replace.pos, replace.endpos, replace.beforeFile + bundleFile(p, replace.file) + replace.afterFile);
		} else {
			compiled = replaceRange(f, compiled, replace.pos, replace.endpos, '');
		}
	});

	f.compiled = '(function(' + parameters.join(', ') + ') {\n' + f.rewriteData.top + '\n' + compiled + '\n' + f.rewriteData.bottom + '\n})' + (includeFunctionCall ? '()' : '');

	return f.compiled;
}

function replaceRange(f: file.SourceFile, str: string, start: number, end: number, substitute: string): string {
	return str.substring(0, start) + substitute + str.substring(end);
}
