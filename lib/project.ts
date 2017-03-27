/// <reference path="../definitions/ref.d.ts" />

import * as sourceMap from 'source-map';
import * as path from 'path';
import file = require('./file');
import events = require('events');
import { Parser } from './parser';
import { Binder } from './binder';
import resolve = require('./resolve');
import order = require('./order');
import structure = require('./structure');
import rewrite = require('./rewrite');
import bundle = require('./bundle');
import io = require('./io');
import Vinyl = require('vinyl');
import { normalizePath } from './io';

export interface PackageData<T> {
	standalone?: T;
	commonjs?: T;
	amd?: T;
	universal?: T;

	_varName?: string;
}

export interface ProjectOptions {
	/**
	 * Whether to load conditional imports, like 'if (someVar) var b = require(..)'
	 * Default: true
	 */
	alwaysLoadConditional?: boolean; // TODO: conditional imports

	exportPackage?: PackageData<string>;

	/**
	 * Whether to include the node core packages, like utils, http and buffer.
	 * Packages will only be included if you use them. If you don't use them, they won't be included in the package.
	 * Default: false
	 */
	includeNode?: boolean;

	/**
	 * The directories to search for modules.
	 * Default: ['node_modules']
	 */
	modulesDirectories?: string[];

	/**
	 * require() modules in the global namespace.
	 * Example: { 'doc': { standalone: 'document' } }
	 * Then you can use require('doc') to get the document object.
	 * Default: {}
	 */
	globalModules?: { [name: string]: PackageData<string> };

	/**
	 * Whether to allow circular dependencies
	 * Default: false
	 */
	// allowCircular?: boolean;
	// TODO: support circular dependencies

	/**
	 * Prefix used for variable names.
	 * Default: '__small$_'
	 */
	varPrefix?: string;

	/**
	 * The output filename(s)
	 * Example:
	 * { commonjs: 'output.commonjs.js', amd: 'output.amd.js', standalone: 'output.standalone.js' }
	 */
	outputFileName?: PackageData<string>;
}

export class Project extends events.EventEmitter {
	startFileName: string;
	startFile: file.SourceFile;
	files: file.SourceFile[] = [];
	orderFiles: file.SourceFile[] = [];
	failed: boolean = false;

	io: io.IIO;

	compiled: PackageData<sourceMap.SourceNode> = {};

	options: ProjectOptions;

	constructor(startFileName: string, ioHost: io.IIO = new io.NodeIO(), options: ProjectOptions = {}) {
		super();

		this.io = ioHost;

		// Default options
		if (options.alwaysLoadConditional === undefined) options.alwaysLoadConditional = true;
		if (options.includeNode === undefined) options.includeNode = false;
		if (options.modulesDirectories === undefined) options.modulesDirectories = ['node_modules'];
		if (options.globalModules === undefined) options.globalModules = {};
		// if (options.allowCircular === undefined) options.allowCircular = false;
		if (options.varPrefix === undefined) options.varPrefix = '__small$_';

		this.options = options;

		this.startFileName = startFileName;

		var i = 0;
		for (var name in options.globalModules) {
			if (!Object.prototype.hasOwnProperty.call(options.globalModules, name)) continue;

			options.globalModules[name]._varName = options.varPrefix + 'mod_' + i;
			i++;
		}
	}

	start() {
		this.startFile = this.addFile(this.startFileName);
	}

	private parser = new Parser();
	private _fileQueue: number = 0;
	addFile(filename: string): file.SourceFile {
		var f = new file.SourceFile(normalizePath(filename));
		f.id = this.files.length;
		f.varName = this.options.varPrefix + f.id;

		this._fileQueue++;
		this.files.push(f);

		this.io.readFile(filename).then((source) => {
			if (this.failed) return;

			f.file = source;
			f.source = source.contents.toString();

			this.parser.parse(f);

			this.resolveFile(f, (err) => {
				if (err) {
					this.emit('error', err);
				} else {
					this._fileQueue--;
					if (this._fileQueue === 0) {
						this.emit('read');
						new Binder(this.files);
						this.generateOrder();
						this.generateStructure();
						this.rewrite();
						this.bundle();
						this.writeOutput();
					}
				}
			});
		}).catch((err) => {
			this.emit('error', err);
		});

		return f;
	}
	getFile(filename: string): file.SourceFile {
		filename = normalizePath(filename);
		for (var i = 0; i < this.files.length; ++i) {
			if (this.files[i].filename === filename) {
				return this.files[i];
			}
		}
		return undefined;
	}
	getOrAddFile(filename: string): file.SourceFile {
		var f = this.getFile(filename);

		if (f) {
			return f;
		} else {
			return this.addFile(filename);
		}
	}

	resolveFile(f: file.SourceFile, callback: (err) => void) {
		var imports = f.importNodes;

		if (imports.length === 0) {
			process.nextTick(() => {
				callback(undefined);
			});
			return;
		}

		var queue = 0;
		var done = false;

		imports.forEach((imp, i) => {
			if (Object.prototype.hasOwnProperty.call(this.options.globalModules, imp.relativePath)) {
				imp.targetGlobalModule = this.options.globalModules[imp.relativePath];
			} else {
				queue++;

				this.resolveSingle(f, imp.relativePath).then(path => {
					imp.targetFile = this.getOrAddFile(path);

					queue--;

					if (queue === 0 && !done) {
						callback(undefined);
						done = true;
					}
				}).catch((err) => {
					this.failed = true;
					done = true;
					callback(err);
				});
			}
		});

		if (queue === 0 && !done) {
			callback(undefined);
		}
	}
	resolveSingle(f: file.SourceFile, str: string): Promise<string> {
		return resolve.resolve(this, f.file, str);
	}
	generateOrder() {
		order.generateOrder(this);
		this.emit('generatedOrder');
	}
	generateStructure() {
		structure.generateStructure(this);
		this.emit('generatedStructure');
	}
	rewrite() {
		this.files.forEach((f) => {
			rewrite.rewriteFile(this, f);
		});
		this.emit('rewritten');
	}
	bundle() {
		// Convert Dictionary to Array
		var globalModules = Object.keys(this.options.globalModules).map(key => this.options.globalModules[key]);

		const compiled = bundle.bundleFile(this, this.startFile, true, globalModules.map(mod => mod._varName));

		var standaloneDeps = globalModules.map(mod => mod.standalone || mod.universal).join(', ');
		var amdDeps = globalModules.map(mod => JSON.stringify(mod.amd || mod.universal)).join(', ');
		var commonjsDeps = globalModules.map(mod => 'require(' + JSON.stringify(mod.amd || mod.universal) + ')').join(', ');

		if (!this.options.exportPackage) this.options.exportPackage = {};

		const wrap = (header: string, bottom: string) => {
			return new sourceMap.SourceNode(null, null, null, [
				header,
				compiled,
				bottom
			]);
		}

		if (this.options.exportPackage.standalone !== undefined) {
			let header = this.options.exportPackage.standalone + ' = ';
			/* this.compiled.standalone = this.options.exportPackage.standalone
				+ ' = '
				+ code
				+ '(' + standaloneDeps + ');'; */

			if (this.options.exportPackage.standalone.indexOf('.') === -1) {
				header = 'var ' + header;
			}
			this.compiled.standalone = wrap(header, '(' + standaloneDeps + ');');
		} else {
			this.compiled.standalone = wrap('', '(' + standaloneDeps + ');');
		}

		if (this.options.exportPackage.amd === undefined || this.options.exportPackage.amd === '') {
			this.compiled.amd = wrap('define([' + amdDeps + '], ', ');');
		} else {
			this.compiled.amd = wrap('define(' + JSON.stringify(this.options.exportPackage.amd) + ', [' + amdDeps + '], ', ');');
		}

		this.compiled.commonjs = wrap('module.exports = ', '(' + commonjsDeps + ');');

		if (this.options.exportPackage.universal !== undefined) {
			var universalAMD = this.options.exportPackage.universal;
			var universalCommonjs = this.options.exportPackage.universal;
			var universalStandalone = this.options.exportPackage.universal;

			if (this.options.exportPackage.universal === '') {
				universalAMD = this.options.exportPackage.amd;
				universalCommonjs = this.options.exportPackage.commonjs;
				universalStandalone = this.options.exportPackage.standalone;
			}

			this.compiled.universal = wrap(
				// Header
				'(function(__root, __factory) { if (typeof define === "function" && define.amd) { '
				+ 'define(' + JSON.stringify(universalAMD) + ', [' + amdDeps + '], __factory);'
				+ '} else if (typeof exports === "object") {'
				+ 'module.exports = __factory(' + commonjsDeps + ');'
				+ '} else {'
				+ '__root[' + JSON.stringify(universalStandalone) + '] = __factory(' + standaloneDeps + ');'
				+ '}'
				+ '})(this, ',
				// Bottom
				');'
			);
		} else {
			this.compiled.universal = wrap(
				// Header
				'(function(__root, __factory) { if (typeof define === "function" && define.amd) { '
				+ 'define([' + amdDeps + '], __factory);'
				+ '} else if (typeof exports === "object") {'
				+ '__factory(' + commonjsDeps + ');'
				+ '} else {'
				+ '__factory(' + standaloneDeps + ');'
				+ '}'
				+ '})(this, ',
				// Bottom
				');'
			);
		}
		this.emit('bundled');
	}
	writeOutput() {
		if (this.options.outputFileName === undefined || this.options.outputFileName === null) return; // No output

		var queue = 0;

		const output = (filename: string, content: sourceMap.SourceNode) => {
			let { code, map } = content.toStringWithSourceMap();
			code += '\n';
			if (this.io.includeSourceMapComment) {
				code += `//# sourceMappingURL=${ filename }.map\n`;
			}
			const codeFile = new Vinyl({
				path: filename,
				cwd: this.startFile.file.cwd,
				contents: new Buffer(code)
			});
			const mapFile = new Vinyl({
				path: filename + '.map',
				cwd: this.startFile.file.cwd,
				contents: new Buffer(map.toString())
			});

			queue++;

			this.io.writeFile(codeFile, mapFile).then(() => {
				queue--;

				process.nextTick(() => {
					if (queue === 0) this.emit('written');
				});
			}).catch(err => {
				this.emit('error', err);
			});
		};

		if (this.options.outputFileName.amd) {
			output(this.options.outputFileName.amd, this.compiled.amd);
		}
		if (this.options.outputFileName.commonjs) {
			output(this.options.outputFileName.commonjs, this.compiled.commonjs);
		}
		if (this.options.outputFileName.standalone) {
			output(this.options.outputFileName.standalone, this.compiled.standalone);
		}
		if (this.options.outputFileName.universal) {
			output(this.options.outputFileName.universal, this.compiled.universal);
		}
	}
}
