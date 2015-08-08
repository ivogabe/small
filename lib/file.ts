/// <reference path="../definitions/ref.d.ts" />

import ts = require('typescript');
import rewrite = require('./rewrite');
import { ImportNode, ExportNode } from './node';
import vinyl = require('vinyl');

export class SourceFile {
	constructor(filename: string) {
		this.filename = filename;
	}

	id: number;
	varName: string;

	file: vinyl.FileBuffer;

	rewriteData: rewrite.RewriteData;

	filename: string;
	source: string;
	compiled: string;

	exportNodes: ExportNode[] = undefined;
	importNodes: ImportNode[] = undefined;

	dependencies: SourceFile[] = [];
	dependants: SourceFile[] = [];
	hasCircularDependencies: boolean = undefined;
	connectedComponent: SourceFile[] = [];

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
}
