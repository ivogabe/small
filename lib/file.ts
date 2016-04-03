/// <reference path="../definitions/ref.d.ts" />

import * as sourceMap from 'source-map';
import ts = require('typescript');
import rewrite = require('./rewrite');
import { ImportNode, ExportNode } from './node';
import vinyl = require('vinyl');

export class SourceFile {
	constructor(filename: string) {
		this.filename = filename;
		this.isJson = filename.substr(-5).toLowerCase() === ".json";
	}

	id: number;
	varName: string;

	file: vinyl.FileBuffer;
	ast: ts.SourceFile;

	rewriteData: rewrite.RewriteData;

	filename: string;
	isJson: boolean;
	source: string;
	compiled: sourceMap.SourceNode;

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
