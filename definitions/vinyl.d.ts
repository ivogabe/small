/// <reference path="node.d.ts" />


declare module 'vinyl' {
	import fs = require('fs');
	import stream = require('stream');

	class File {
		constructor(options: File.FileOptions);

		cwd: string;
		base: string;
		path: string;

		stat: fs.Stats;

		isBuffer(): boolean;
		isStream(): boolean;
		isNull(): boolean;

		clone(): File;

		pipe(stream: stream.Writable, opt?: any);

		inspect(): string;

		relative: string;

		contents: any;
	}

	module File {
		export interface FileOptions {
			cwd?: string;
			base?: string;
			path: string;

			stat?: fs.Stats;

			contents: any; // Buffer or stream
		}

		export interface FileBuffer extends File {
			clone(): FileBuffer;
			contents: NodeBuffer;
		}
		export interface FileStream extends File {
			clone(): FileStream;
			contents: stream.Readable;
		}
	}

	export = File;
}
