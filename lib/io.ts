/// <reference path="../definitions/ref.d.ts" />

import Vinyl = require('vinyl');
import Promise = require('bluebird');
import fs = require('fs');
import stream = require('stream');
import events = require('events');

enum ReadOperation {
	FILE_EXISTS,
	DIRECTORY_EXISTS,
	READ_FILE
}

export function normalizePath(path: string) {
	if (!path) return path;
	return path.toLowerCase().replace(/\\/, '/');
}
export function pathsEqual(a: string, b: string) {
	return normalizePath(a) === normalizePath(b);
}

export interface IIO {
	includeSourceMapComment: boolean;

	fileExists: (path: string) => Promise<boolean>;
	directoryExists: (path: string) => Promise<boolean>;

	readFile: (path: string) => Promise<Vinyl.FileBuffer>;
	writeFile: (file: Vinyl.FileBuffer, sourceMapFile?: Vinyl.FileBuffer) => Promise<boolean>;
}

export class NodeIO implements IIO {
	includeSourceMapComment = true;

	cwd: string;

	constructor(cwd: string = process.cwd()) {
		this.cwd = cwd;
	}

	fileExists(path: string): Promise<boolean> {
		return new Promise<boolean>((resolve: (exists) => void, reject) => {
			fs.stat(path, (err, res) => {
				if (err) return reject(err);

				if (!res) resolve(false);

				resolve(res.isFile());
			});
		});
	}

	directoryExists(path: string): Promise<boolean> {
		return new Promise<boolean>((resolve: (exists) => void, reject) => {
			fs.stat(path, (err, res) => {
				if (err) return reject(err);

				if (!res) resolve(false);

				resolve(res.isDirectory());
			});
		});
	}

	readFile(path: string): Promise<Vinyl.FileBuffer> {
		return new Promise<Vinyl.FileBuffer>((resolve: (file) => void, reject) => {
			fs.readFile(path, (err, res) => {
				if (err) return reject(err);
				resolve(new Vinyl({
					path: path,
					contents: res,
					cwd: this.cwd
				}));
			});
		});
	}

	writeFile(file: Vinyl.FileBuffer, sourceMap?: Vinyl.FileBuffer): Promise<boolean> {
		return new Promise<boolean>((resolve: (success) => void, reject) => {
			fs.writeFile(file.path, file.contents, (err) => {
				if (err) return reject(err);
				if (sourceMap) resolve(this.writeFile(sourceMap));
				resolve(true);
			});
		});
	}
}

export class StreamIO extends events.EventEmitter implements IIO {
	includeSourceMapComment = false;

	constructor() {
		super();

		this.stream = new StreamIO.DuplexStream((file: Vinyl) => {
			this._addFile(file);
		}, () => {
			this._end();
		});
	}

	private _files: Vinyl[] = [];
	private _queuedReads: QueuedRead[] = [];
	private _finished: boolean;
	stream: StreamIO.DuplexStream;

	private _findLocalFile(path: string): Vinyl {
		for (var i = 0; i < this._files.length; ++i) {
			var file = this._files[i];
			if (pathsEqual(file.path, path)) return file;
		}
		return undefined;
	}
	private _addFile(file: Vinyl) {
		this._files.push(file);

		this._queuedReads = this._queuedReads.filter(read => {
			if (pathsEqual(read.path, file.path)) {
				switch (read.operation) {
					case ReadOperation.FILE_EXISTS:
						read.resolve(true);
					break;
					case ReadOperation.READ_FILE:
						read.resolve(file);
					break;
				}
				return false; // Remove from queue
			}
			var normalizedPath = normalizePath(read.path);
			if (read.operation === ReadOperation.DIRECTORY_EXISTS && normalizePath(file.path).substr(0, normalizedPath.length) === normalizedPath) {
				read.resolve(true);
				return false; // Remove from queue
			}

			return true;
		});

		this.emit('addFile', undefined, file);
	}
	private _end() {
		this._finished = true;
		this._queuedReads.forEach(read => {
			var err: any = new Error('ENOENT, no such file or directory, ' + read.path);
			err.code = 'ENOENT';
			read.reject(err);
		});
		this._queuedReads = [];
		this.emit('end');
	}

	fileExists(path: string): Promise<boolean> {
		if (this._findLocalFile(path)) {
			return Promise.resolve(true);
		} else if (this._finished) {
			return Promise.resolve(false);
		} else {
			return new Promise<boolean>((resolve, reject) => {
				this._queuedReads.push({
					path: path,
					operation: ReadOperation.FILE_EXISTS,
					reject: reject,
					resolve: resolve
				});
			});
		}
	}
	directoryExists(path: string): Promise<boolean> {
		var normalizedPath = normalizePath(path);
		if (normalizedPath.substr(normalizedPath.length - 1) !== '/') {
			normalizedPath += '/';
			path += '/';
		}

		for (var i = 0; i < this._files.length; ++i) {
			var file = this._files[i];
			if (normalizePath(file.path.substr(0, path.length)) === normalizedPath) {
				return Promise.resolve(true);
			}
		}

		if (this._finished) {
			return Promise.resolve(false);
		} else {
			return new Promise<boolean>((resolve, reject) => {
				this._queuedReads.push({
					path: normalizedPath,
					operation: ReadOperation.DIRECTORY_EXISTS,
					reject: reject,
					resolve: resolve
				});
			});
		}
	}

	readFile(path: string): Promise<Vinyl> {
		var file = this._findLocalFile(path);

		if (file) {
			return Promise.resolve(file);
		} else if (this._finished) {
			var err: any = new Error('ENOENT, no such file or directory, ' + path);
			err.code = 'ENOENT';
			return Promise.reject(err);
		} else {
			return new Promise<Vinyl.FileBuffer>((resolve, reject) => {
				this._queuedReads.push({
					path: path,
					operation: ReadOperation.READ_FILE,
					reject: reject,
					resolve: resolve
				});
			});
		}
	}

	writeFile(file: Vinyl, sourceMapFile?: Vinyl.FileBuffer): Promise<boolean> {
		if (sourceMapFile) {
			(<any>file).sourceMap = JSON.parse(sourceMapFile.contents.toString());
		}

		this.stream.push(file);
		return Promise.resolve(true);
	}
}
export module StreamIO {
	export class DuplexStream extends stream.Duplex {
		constructor(onFile: (file: Vinyl) => void, onEnd: () => void) {
			super({ objectMode: true });
			this._onFile = onFile;
			this._onEnd = onEnd;
		}

		_onFile: (file: Vinyl) => void;
		_onEnd: () => void;

		_write(file: Vinyl, encoding, cb = (err?) => { }): any {
			if (!file) return cb();

			if (file.isNull()) {
				cb();
				return;
			}
			if (file.isStream()) {
				return new Error('Stream not supported');
			}

			this._onFile(file);
			cb();
		}
		_read() {

		}

		end(chunk?, encoding?, callback?) {
			this._write(chunk, encoding, callback);
			this._onEnd();
		}
	}
}

interface QueuedRead {
	path: string;
	operation: ReadOperation;
	reject: (err: any) => void;
	resolve: (res: any) => void;
}

export class HybridIO implements IIO {
	constructor(mainIO: IIO, altIO: IIO, altPaths: string[], altReadOnly = false) {
		this.mainIO = mainIO;
		this.altIO = altIO;
		this.altPaths = altPaths;
		this.altReadOnly = altReadOnly;
		this.includeSourceMapComment = mainIO.includeSourceMapComment;
	}

	includeSourceMapComment: boolean;
	mainIO: IIO;
	altIO: IIO;
	altPaths: string[];
	altReadOnly: boolean;

	needsAltIO(path: string) {
		path = normalizePath(path);
		return this.altPaths.some((altPath) => {
			altPath = normalizePath(altPath);
			return path.substr(0, altPath.length) === altPath;
		});
	}

	fileExists(path: string): Promise<boolean> {
		if (this.needsAltIO(path)) {
			return this.altIO.fileExists(path);
		} else {
			return this.mainIO.fileExists(path);
		}
	}
	directoryExists(path: string): Promise<boolean> {
		if (this.needsAltIO(path)) {
			return this.altIO.directoryExists(path);
		} else {
			return this.mainIO.directoryExists(path);
		}
	}

	readFile(path: string): Promise<Vinyl.FileBuffer> {
		if (this.needsAltIO(path)) {
			return this.altIO.readFile(path);
		} else {
			return this.mainIO.readFile(path);
		}
	}
	writeFile(file: Vinyl.FileBuffer, sourceMapFile?: Vinyl.FileBuffer): Promise<boolean> {
		if (this.needsAltIO(file.path) && !this.altReadOnly) {
			return this.altIO.writeFile(file, sourceMapFile);
		} else {
			return this.mainIO.writeFile(file, sourceMapFile);
		}
	}
}
