/// <reference path="../definitions/ref.d.ts" />

import uglify = require('uglify-js');
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
		this.ast = uglify.parse(this.source, {
			filename: this.filename
		});
		this.ast.figure_out_scope();
	}

	analyse() {
		astWalker.walkAst(this);
		combine.combine(this);
	}

	filename: string;
	extension: string;
	source: string;
	compiled: string;

	ast: uglify.AST_Toplevel;

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

	dependencies: SourceFile[] = [];
	dependants: SourceFile[] = [];
	dependantImports: importNode.Import[] = [];
	hasCircularDependencies: boolean = undefined;

	conditional: boolean = undefined;

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
