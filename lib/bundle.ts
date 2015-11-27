import { SourceNode, Position } from 'source-map';
import * as typescript from 'typescript';
import project = require('./project');
import file = require('./file');

export function bundleFile(p: project.Project, f: file.SourceFile, isMain: boolean = false, parameters: string[] = []): SourceNode {
	if (f.compiled) return f.compiled;

	var replaces = f.rewriteData.replaces;

	parameters = f.rewriteData.closureParameters.map(param => param.name).concat(parameters);

	const content: (SourceNode)[] = [];
	let cursor = 0;

	function getPosition(index: number): Position {
		const { line, character } = typescript.getLineAndCharacterOfPosition(f.ast, index);
		return {
			line: line + 1,
			column: character
		};
	}
	function addSourceText(end: number) {
		function addLine(lineEnd: number) {
			const text = f.source.substring(cursor, lineEnd);
			const { line, column } = getPosition(cursor);
			content.push(new SourceNode(
				line,
				column,
				f.file.relative,
				text
			));
			cursor = lineEnd;
		}
		while (cursor < end) {
			const lineEnd = f.source.indexOf('\n', cursor);
			const sectionEnd = lineEnd === -1 ? end : Math.min(lineEnd + 1, end);
			addLine(sectionEnd);
		}

		if (cursor !== end) return;
	}
	function addEmptyNode() {
		const { line, column } = getPosition(cursor);
		content.push(new SourceNode(
			line,
			column,
			f.file.relative
		));
	}
	function addGeneratedText(text: string) {
		content.push(new SourceNode(
			null,
			null,
			null,
			text
		));
	}

	for (const replace of replaces) {
		const [start, end] = collapseRange(f.source, replace.pos, replace.endpos);
		addSourceText(start);
		if (replace.value !== undefined) {
			const { line, column } = getPosition(cursor);
			content.push(new SourceNode(
				line,
				column,
				f.file.relative,
				replace.value
			));
			addEmptyNode();
		} else if (replace.file !== undefined) {
			addEmptyNode();
			addGeneratedText(replace.beforeFile);
			content.push(bundleFile(p, replace.file));
			addGeneratedText(replace.afterFile);
			addEmptyNode();
		}
		cursor = end;
	}
	addSourceText(f.source.length);

	const includeFunctionCall = !isMain && !f.hasCircularDependencies;

	// Add to top
	content.splice(0, 0, new SourceNode(null, null, null, '(function(' + parameters.join(', ') + ') {\n' + f.rewriteData.top + '\n'));
	// Add below file
	addGeneratedText('\n' + f.rewriteData.bottom + '\n})' + (includeFunctionCall ? '(' + getClosureParameterValues(p, f) + ')' : ''));

	f.compiled = new SourceNode(null, null, null, content);

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
function collapseRange(str: string, start: number, end: number): [number, number] {
	while (start < end && isWhitespace(str.substr(start, 1))) start++;
	while (start < end && isWhitespace(str.substr(end - 1, 1))) end--;

	return [start, end];
}
