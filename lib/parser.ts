/// <reference path="../definitions/ref.d.ts" />

import ts = require('typescript');
import { SourceFile } from './file';
import { ImportNode, ExportNode, ImportReference } from './node';

export class Parser {
	parse(file: SourceFile) {
		const ast = ts.createSourceFile(file.filename, file.source, ts.ScriptTarget.Latest);
		file.ast = ast;

		const host: ts.CompilerHost = {
			getSourceFile: (fileName: string, languageVersion: ts.ScriptTarget) => {
				if (fileName === file.filename) return ast;
			},
			getDefaultLibFileName: (options: ts.CompilerOptions) => '',
			writeFile: () => {},
			getCurrentDirectory: () => '',
			getCanonicalFileName: (fileName: string) => fileName,
			useCaseSensitiveFileNames: () => true,
			getNewLine: () => '\n\r',
			fileExists: fileName => fileName === file.filename,
			readFile: fileName => fileName === file.filename ? file.source : undefined
		};
		const program = ts.createProgram([file.filename], { noResolve: true, noEmit: true, target: ts.ScriptTarget.Latest, allowNonTsExtensions: true }, host);
		const typeChecker = program.getTypeChecker();

		const walker = new Walker();

		const importNodes: ImportNode[] = [];
		const exportNodes: ExportNode[] = [];

		// Find import & export nodes.
		walker.walk(ast, (child) => {
			const importNode = ImportNode.tryParse(typeChecker, child);
			if (importNode) {
				importNodes.push(importNode);
				// Don't descend
				return;
			}
			const exportNode = ExportNode.tryParse(typeChecker, child, walker.isInFunction);
			if (exportNode) {
				exportNodes.push(exportNode);

				if (exportNode.assignmentValue) walker.descend(exportNode.assignmentValue);
				return;
			}
			walker.descend();
		});

		// Find import references
		walker.walk(ast, (child) => {
			const reference = ImportReference.tryParse(typeChecker, importNodes, child);
			if (reference) {
				reference.importNode.references.push(reference);
			} else {
				walker.descend();
			}
		});

		file.importNodes = importNodes;
		file.exportNodes = exportNodes;
	}
}

type Scope = ts.SourceFile | ts.FunctionLikeDeclaration | ts.ClassLikeDeclaration;
class Walker {
	node: ts.Node = undefined;
	callback: (child: ts.Node) => void;
	isConditional = false;
	isInFunction = false;

	walk(node: ts.Node, callback: (child: ts.Node) => void) {
		this.callback = callback;
		this.visit(node);
	}

	private visit(node: ts.Node) {
		const saveNode = this.node;
		const saveIsConditional = this.isConditional;
		const saveIsInFunction = this.isInFunction;

		this.node = node;

		switch (node.kind) {
			case ts.SyntaxKind.FunctionDeclaration:
			case ts.SyntaxKind.FunctionExpression:
			case ts.SyntaxKind.ClassDeclaration:
			case ts.SyntaxKind.ClassExpression:
				this.isConditional = true;
				this.isInFunction = true;
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

		this.callback(node);

		this.node = saveNode;
		this.isConditional = saveIsConditional;
		this.isInFunction = saveIsInFunction;
	}

	descend(node = this.node) {
		ts.forEachChild(node, child => this.visit(child));
	}
}
