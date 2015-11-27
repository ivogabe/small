/// <reference path="../definitions/ref.d.ts" />

import path = require('path');
import Vinyl = require('vinyl');
import chalk = require('chalk');

import project = require('./project');
export import Project = project.Project;
export import ProjectOptions = project.ProjectOptions;

export import io = require('./io');

export function compile(startFile: string, options?: ProjectOptions, callback?: (err?) => void) {
	var p = new project.Project(startFile, new io.NodeIO(), options);

	p.on('error', (err) => {
		if (callback) callback(err);
	});
	p.on('written', () => {
		if (callback) callback();
	});

	p.start();
}

export interface GulpOptions extends ProjectOptions {
	/**
	 * Resolve files that are not in the input list.
	 * Usefull for files in node_modules, so you don't have to list them all in the gulp.src call.
	 * Example: ['./node_modules']
	 */
	externalResolve?: string[];
}

export function error(err: Error) {
	var message = err.message;
	var index = message.indexOf('\n');

	if (index === -1) {
		message = chalk.red(message);
	} else {
		message = chalk.red(message.substring(0, index)) + message.substring(index);
	}

	console.error(message);
}

export function gulp(startFileName: string = 'index.js', options: GulpOptions = {}) {
	var streamIO = new io.StreamIO();
	var stream = streamIO.stream;

	var usedIO: io.IIO;

	var externalResolve: string[] = [];
	if (options.includeNode) {
		externalResolve.push(path.join(__dirname, '../node_modules/browser-builtins'));
	}

	if (options.externalResolve) {
		externalResolve = externalResolve.concat(options.externalResolve.map(value => path.resolve(process.cwd(), value)));
	}
	if (externalResolve.length > 0) {
		usedIO = new io.HybridIO(streamIO, new io.NodeIO(), externalResolve, true);
	} else {
		usedIO = streamIO;
	}
	if (!options.outputFileName) {
		options.outputFileName.standalone = startFileName;
	}

	var started = false;
	var gulpCompile = (startFile: Vinyl) => {
		if (started) return;
		started = true;

		if (options.outputFileName) {
			if (options.outputFileName.amd) {
				options.outputFileName.amd = path.join(startFile.cwd, options.outputFileName.amd);
			}
			if (options.outputFileName.commonjs) {
				options.outputFileName.commonjs = path.join(startFile.cwd, options.outputFileName.commonjs);
			}
			if (options.outputFileName.standalone) {
				options.outputFileName.standalone = path.join(startFile.cwd, options.outputFileName.standalone);
			}
			if (options.outputFileName.universal) {
				options.outputFileName.universal = path.join(startFile.cwd, options.outputFileName.universal);
			}
		}

		var p = new project.Project(startFile.path, usedIO, options);

		p.on('error', (err: Error) => {
			error(err);
		});
		p.on('written', () => {
			stream.push(null);
		});

		p.start();
	};

	const fileNames: string[] = [];
	streamIO.on('addFile', (err, file: Vinyl) => {
		if (file.isNull()) return;
		if (file.isStream()) {
			this.emit('error', new Error('Streaming is not supported'));
		}

		if (file.relative === startFileName) {
			fileNames.push(file.relative);
			gulpCompile(file);
		}
	});
	streamIO.on('end', () => {
		if (!started) {
			error(new Error('The start file was not found. Choose one of: ' + fileNames.join(', ')));
		}
	});

	return stream;
}
