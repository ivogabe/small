import project = require('./project');
import file = require('./file');

export function bundleFile(p: project.Project, f: file.SourceFile, includeFunctionCall: boolean = true, parameters: string[] = []): string {
	if (f.compiled) return f.compiled;

	var compiled = f.source;
	var replaces = f.rewriteData.replaces;

	parameters = f.rewriteData.closureParameters.map(param => param.name).concat(parameters);

	replaces.forEach((replace) => {
		if (replace.value) {
			compiled = replaceRange(f, compiled, replace.pos, replace.endpos, replace.value);
		} else if (replace.file) {
			compiled = replaceRange(f, compiled, replace.pos, replace.endpos, replace.beforeFile + bundleFile(p, replace.file) + replace.afterFile);
		} else {
			compiled = replaceRange(f, compiled, replace.pos, replace.endpos, '');
		}
	});

	f.compiled = '(function(' + parameters.join(', ') + ') {\n' + f.rewriteData.top + '\n' + compiled + '\n' + f.rewriteData.bottom + '\n})' + (includeFunctionCall ? '(' + getClosureParameterValues(p, f) + ')' : '');

	return f.compiled;
}

export function getClosureParameterValues(p: project.Project, f: file.SourceFile): string {
	return f.rewriteData.closureParameters.map(param => param.value).join(', ');
}

function isWhitespace(char: string) {
	switch (char) {
		case ' ':
		case '\r':
		case '\n':
		case '\t':
			return true;
	}
	return false;
}
function replaceRange(f: file.SourceFile, str: string, start: number, end: number, substitute: string): string {
	while (start < end && isWhitespace(str.substr(start, 1))) start++;
	while (start < end && isWhitespace(str.substr(end - 1, 1))) end--;
	
	return str.substring(0, start) + substitute + str.substring(end);
}
