/// <reference path="../definitions/ref.d.ts" />

import ts = require('typescript');
import exportNode = require('./exportNode');
import importNode = require('./importNode');
import astWalker = require('./astWalker');
import combine = require('./combine');
import rewrite = require('./rewrite');
import vinyl = require('vinyl');

export class SourceFile {
	constructor(filename: string) {
		this.filename = filename;
	}

	id: number;
	varName: string;

	file: vinyl.FileBuffer;

	failed: boolean = false;

	rewriteData: rewrite.RewriteData;

	parse(source: string) {
		this.source = source;
		
		this.ast = ts.createSourceFile(this.filename, this.source, ts.ScriptTarget.Latest, true /* ?? */);
		
		const host: ts.CompilerHost = {
			getSourceFile: (fileName: string, languageVersion: ts.ScriptTarget) => {
				if (fileName === this.filename) return this.ast;
			},
			getDefaultLibFileName: (options: ts.CompilerOptions) => '',
			writeFile: () => {},
			getCurrentDirectory: () => '',
			getCanonicalFileName: (fileName: string) => fileName,
			useCaseSensitiveFileNames: () => true,
			getNewLine: () => '\n\r'
		};
		const program = ts.createProgram([this.filename], { noResolve: true, noEmit: true, target: ts.ScriptTarget.Latest, allowNonTsExtensions: true }, host);
		this.types = program.getTypeChecker();
	}

	analyse() {
		astWalker.walkAst(this);
		combine.combine(this);
	}

	filename: string;
	extension: string;
	source: string;
	compiled: string;

	ast: ts.SourceFile;
	types: ts.TypeChecker;

	exportNodes: exportNode.Export[] = [];
	importNodes: importNode.Import[] = [];

	getSingleExportNodes(): exportNode.SingleExport[] {
		var result: exportNode.SingleExport[] = [];
		for (var i = 0; i < this.exportNodes.length; ++i) {
			if (this.exportNodes[i] instanceof exportNode.SingleExport) {
				result.push(<exportNode.SingleExport> this.exportNodes[i]);
			}
		}
		return result;
	}
	getFullExportNodes(): exportNode.FullExport[] {
		var result: exportNode.FullExport[] = [];
		for (var i = 0; i < this.exportNodes.length; ++i) {
			if (this.exportNodes[i] instanceof exportNode.FullExport) {
				result.push(<exportNode.FullExport> this.exportNodes[i]);
			}
		}
		return result;
	}
	getUnknownExportNodes(): exportNode.UnknownExport[] {
		var result: exportNode.UnknownExport[] = [];
		for (var i = 0; i < this.exportNodes.length; ++i) {
			if (this.exportNodes[i] instanceof exportNode.UnknownExport) {
				result.push(<exportNode.UnknownExport> this.exportNodes[i]);
			}
		}
		return result;
	}

	getSimpleImportNodes(): importNode.SimpleImport[] {
		var result: importNode.SimpleImport[] = [];
		for (var i = 0; i < this.importNodes.length; ++i) {
			if (this.importNodes[i] instanceof importNode.SimpleImport) {
				result.push(<importNode.SimpleImport> this.importNodes[i]);
			}
		}
		return result;
	}

	setAllDependencies() {
		this.allDependencies = [];
		var helper = (other: SourceFile) => {
			other.dependencies.forEach((dependency) => {
				if (this.allDependencies.indexOf(dependency) === -1) {
					this.allDependencies.push(dependency);
					helper(dependency);
				}
			});
		};

		helper(this);
	}

	dependencies: SourceFile[] = [];
	/**
	 * Dependencies and dependencies of dependencies (of dependencies ...)
	 */
	allDependencies: SourceFile[];
	dependants: SourceFile[] = [];
	dependantImports: importNode.Import[] = [];

	unhandledDependencies: SourceFile[] = [];

	// conditional: boolean = undefined;

	orderIndex: number;

	structureParent: SourceFile = undefined;
	structureChildren: SourceFile[] = [];
	/**
	 * Children and children of children (of children ...)
	 */
	structureAllChildren: SourceFile[] = [];
	/**
	 * Dependencies and dependencies of children (of children ...)
	 */
	structureDependencies: SourceFile[] = [];
	structureLevel: number = undefined;

	defined: boolean = false;
}
