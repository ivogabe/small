/// <reference path="../definitions/ref.d.ts" />

import file = require('./file');
import events = require('events');
import resolve = require('./resolve');
import order = require('./order');
import structure = require('./structure');
import rewrite = require('./rewrite');
import bundle = require('./bundle');
import importNode = require('./importNode');
import io = require('./io');
import Vinyl = require('vinyl');

export interface PackageData {
	standalone?: string;
	commonjs?: string;
	amd?: string;
	universal?: string;

	_varName?: string;
}

export interface ProjectOptions {
	/**
	 * Whether to load conditional imports, like 'if (someVar) var b = require(..)'
	 * Default: true
	 */
	alwaysLoadConditional?: boolean; // TODO: conditional imports

	exportPackage?: PackageData;

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
	globalModules?: { [name: string]: PackageData };

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
	outputFileName?: PackageData;
}

export class Project extends events.EventEmitter {
	startFileName: string;
	startFile: file.SourceFile;
	files: file.SourceFile[] = [];
	orderFiles: file.SourceFile[] = [];
	failed: boolean = false;

	io: io.IIO;

	compiled: PackageData = {};

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

	private _fileQueue: number = 0;
	addFile(filename: string): file.SourceFile {
		var f = new file.SourceFile(filename);
		f.id = this.files.length;
		f.varName = this.options.varPrefix + f.id;

		this._fileQueue++;
		this.files.push(f);

		this.io.readFile(filename).then((source) => {
			if (this.failed) return;

			f.file = source;

			f.parse(source.contents.toString('utf8'));

			f.analyse();

			this.resolveFile(f, (err) => {
				if (err) {
					this.emit('error', err);
				} else {
					this._fileQueue--;
					if (this._fileQueue === 0) {
						this.emit('read');
						this.setAllDependencies();
						this.generateOrder();
						this.generateStructure();
						this.importSetOuputStyles();
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
				imp.globalModule = this.options.globalModules[imp.relativePath];
			} else {
				queue++;

				this.resolveSingle(f, imp.relativePath).then(path => {
					imp.absolutePath = path;
					imp.file = this.getOrAddFile(imp.absolutePath);

					if (f.dependencies.indexOf(imp.file) === -1) {
						f.dependencies.push(imp.file);
						imp.file.dependants.push(f);
					}
					imp.file.dependantImports.push(imp);

					queue--;

					if (queue === 0) {
						f.unhandledDependencies = [].concat(f.dependencies);
						callback(undefined);
						done = true;
					}
				}).catch((err) => {
					this.failed = true;
					f.failed = true;
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
	setAllDependencies() {
		this.files.forEach((file) => {
			file.setAllDependencies();
		});
	}
	generateOrder() {
		order.generateOrder(this);
		this.emit('generatedOrder');
	}
	generateStructure() {
		structure.generateStructure(this);
		this.emit('generatedStructure');
	}
	importSetOuputStyles() {
		this.orderFiles.forEach((f) => {
			f.importNodes.forEach((imp) => {
				if (imp.globalModule) {
					imp.outputStyle = importNode.OutputStyle.VAR_REFERENCE;
					if (imp.file) imp.file.defined = true;
					return;
				}

				if (imp.file.dependantImports.length === 1) {
					imp.outputStyle = importNode.OutputStyle.SINGLE;
					imp.file.defined = true;
					return;
				}

				// TODO: Check whether it is secure to use VAR_ASSIGN or VAR_ASSIGN_AND_RENAME
				if (imp.file.structureParent === f) {
					if (f.importNodes.filter((item) => {
						return item.file === imp.file;
					})[0] === imp) {
						imp.outputStyle = (imp instanceof importNode.SimpleImport) ? importNode.OutputStyle.VAR_ASSIGN_AND_RENAME : importNode.OutputStyle.VAR_ASSIGN;
						imp.file.defined = true;
						return;
					}
				}

				if (imp instanceof importNode.SimpleImport && imp.safe && (<importNode.SimpleImport>imp).dotArray.length === 0) {
					imp.outputStyle = importNode.OutputStyle.VAR_RENAME;
					return;
				}

				imp.outputStyle = importNode.OutputStyle.VAR_REFERENCE;
			});
		});
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

		var compiled = bundle.bundleFile(this, this.startFile, false, globalModules.map(mod => mod._varName));

		var standaloneDeps = globalModules.map(mod => mod.standalone || mod.universal).join(', ');
		var amdDeps = globalModules.map(mod => JSON.stringify(mod.amd || mod.universal)).join(', ');
		var commonjsDeps = globalModules.map(mod => 'require(' + JSON.stringify(mod.amd || mod.universal) + ')').join(', ');

		if (!this.options.exportPackage) this.options.exportPackage = {};

		if (this.options.exportPackage.standalone !== undefined) {
			this.compiled.standalone = this.options.exportPackage.standalone
				+ ' = '
				+ compiled
				+ '(' + standaloneDeps + ');';

			if (this.options.exportPackage.standalone.indexOf('.') === -1) {
				this.compiled.standalone = 'var ' + this.compiled.standalone;
			}
		} else {
			this.compiled.standalone = compiled
				+ '('
				+ standaloneDeps
				+ ');';
		}

		if (this.options.exportPackage.amd === undefined || this.options.exportPackage.amd === '') {
			this.compiled.amd = 'define(['
				+ amdDeps
				+ '], ' + compiled
				+ ');';
		} else {
			this.compiled.amd = 'define('
				+ JSON.stringify(this.options.exportPackage.amd)
				+ ', ['
				+ amdDeps
				+ '], ' + compiled
				+ ');';
		}

		this.compiled.commonjs = 'module.exports = ' + compiled + '(' + commonjsDeps + ');';

		if (this.options.exportPackage.universal !== undefined) {
			var universalAMD = this.options.exportPackage.universal;
			var universalCommonjs = this.options.exportPackage.universal;
			var universalStandalone = this.options.exportPackage.universal;

			if (this.options.exportPackage.universal === '') {
				universalAMD = this.options.exportPackage.amd;
				universalCommonjs = this.options.exportPackage.commonjs;
				universalStandalone = this.options.exportPackage.standalone;
			}

			this.compiled.universal = '(function(__root, __factory) { if (typeof define === "function" && define.amd) { '
				+ 'define(' + JSON.stringify(universalAMD) + ', [' + amdDeps + '], __factory);'
				+ '} else if (typeof exports === "object") {'
				+ 'module.exports = __factory(' + commonjsDeps + ');'
				+ '} else {'
				+ '__root[' + JSON.stringify(universalStandalone) + '] = __factory(' + standaloneDeps + ');'
				+ '}'
				+ '})(this, ' + compiled + ')';
		} else {
			this.compiled.universal = '(function(__root, __factory) { if (typeof define === "function" && define.amd) { '
				+ 'define([' + amdDeps + '], __factory);'
				+ '} else if (typeof exports === "object") {'
				+ '__factory(' + commonjsDeps + ');'
				+ '} else {'
				+ '__factory(' + standaloneDeps + ');'
				+ '}'
				+ '})(this, ' + compiled + ')';
		}
		this.emit('bundled');
	}
	writeOutput() {
		if (this.options.outputFileName === undefined || this.options.outputFileName === null) return; // No output

		var queue = 0;

		var output = (filename, content) => {
			var file = new Vinyl({
				path: filename,
				cwd: this.startFile.file.cwd,
				contents: new Buffer(content)
			});

			queue++;

			this.io.writeFile(file).then(() => {
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
