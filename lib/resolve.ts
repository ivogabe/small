/// <reference path="../definitions/ref.d.ts" />

import path = require('path');
import project = require('./project');
import io = require('./io');
import Promise = require('bluebird');
import Vinyl = require('vinyl');
import browserBuiltins = require('browser-builtins');

export function resolve(proj: project.Project, from: Vinyl, ref: string): Promise<string> {
	var resolver = new Resolver(proj.io, proj.options);
	resolver.resolve(ref, from);

	return resolver.value;
}

export class Resolver {
	options: project.ProjectOptions;

	io: io.IIO;

	str: string;
	from: Vinyl;
	value: Promise<string>;
	private _resolve: (path: string) => void;
	private _reject: (err) => void;

	constructor(ioHost: io.IIO, options: project.ProjectOptions = {}) {
		this.options = options;
		this.io = ioHost;

		this.value = new Promise<string>((resolve: (value: string) => void, reject: (err) => void) => {
			this._resolve = resolve;
			this._reject = reject;
		});
	}

	resolve(str: string, from: Vinyl) {
		this.str = str;
		this.from = from;

		if (this.options.includeNode && browserBuiltins.hasOwnProperty(str) && str !== '') {
			this.tryFiles([browserBuiltins[str]], () => {
				this.notFound();
			});
			return;
		}

		if (str.substring(0, 2) === './' || str.substring(0, 1) === '/' || str.substring(0, 3) === '../') {
			this.resolveFile(path.resolve(path.dirname(from.path), str));
		} else {
			this.resolveNodeModules(str, from);
		}
	}

	resolveFile(filename: string, failCallback?: () => void) {
		this.tryFiles([
			filename,
			filename + '.js',
			filename + '.json'
		], () => {
			this.resolveDirectory(filename, failCallback);
		});
	}
	resolveDirectory(pathStr: string, failCallback: () => void = () => this.notFound()) {
		this.parseJSONFile(path.join(pathStr, 'package.json')).then(json => {
			if (json['main']) {
				this.tryFiles([
					path.join(pathStr, json['main']) + '.js',
					path.join(pathStr, json['main']),
					path.join(pathStr, 'index.js')
				], failCallback);
			} else {
				this.tryFiles([
					path.join(pathStr, 'index.js')
				], failCallback);
			}
		}).catch(() => {
			this.tryFiles([
				path.join(pathStr, 'index.js')
			], failCallback);
		});
	}

	resolveNodeModules(str: string, from: Vinyl) {
		var paths = this.getAllNodeModules(from.path, str);

		var tryPath = (index: number) => {
			var path = paths[index];
			this.tryFiles([
				path,
				path + '.js'
			], () => {
				this.resolveDirectory(path, () => {
					if (index === paths.length - 1) {
						this.notFound();
					} else {
						tryPath(index + 1);
					}
				});
			});
		};

		tryPath(0);
	}

	getAllNodeModules(path: string, to: string): string[] {
		if (this.options.modulesDirectories.length === 0) return [];

		var parts = path.split(/\\|\//); // '/' or '\'
		var root = -1;

		this.options.modulesDirectories.forEach(path => {
			var currentRoot = parts.indexOf(path);

			if (currentRoot !== -1) {
				if (root === -1) {
					root = currentRoot;
				} else {
					root = Math.min(root, currentRoot);
				}
			}
		});

		var dirs: string[] = [];

		for (var i = parts.length - 1; i >= root - 1 && i >= 0; --i) {
			if (this.options.modulesDirectories.indexOf(parts[i]) !== -1) continue;

			var base = parts.slice(0, i + 1).join('/');
			this.options.modulesDirectories.forEach((path) => {
				dirs.push(base + '/' + path + '/' + to);
			});
		}

		return dirs;
	}

	private tryFiles(paths: string[], failCallback: () => void) {
		if (paths.length === 0) {
			failCallback();
			return;
		}

		this.io.fileExists(paths[0]).then((found: boolean) => {
			if (found) {
				this._resolve(paths[0]);
			} else {
				this.tryFiles(paths.slice(1), failCallback);
			}
		}).catch(() => {
			this.tryFiles(paths.slice(1), failCallback);
		});
	}

	private notFound() {
		this._reject(new Error('Reference not found:\n\t' + JSON.stringify(this.str) + ' from ' + this.from.path));
	}

	private parseJSONFile(path: string): Promise<any> {
		return this.io.readFile(path).then<any>((file) => {
			return JSON.parse(file.contents.toString('utf8'));
		});
	}
}
