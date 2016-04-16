Small
=====

Small is a CommonJS bundler that aims to generate the smallest bundle size. It supports commonjs files, and output as a standalone, commonjs, amd and universal package.

Features
--------

- Bundles CommonJS files
- Small file size
- Source map
- Supports circular dependencies
- Fits into [gulp](https://www.npmjs.com/package/gulp) build system

How to install
--------------
``` npm install small ```
or (for command line usage)
``` npm install small -g ```

How to use
----------
Command line:
``` small -i index.js -o output.js ```
(```small --help``` for more info)

From Node:
```javascript
var small = require('small');
small.compile('index.js', options, function(error) {
	if (error) throw error;
	console.log('Completed');
});
```
Or, as a gulp plugin:
```javascript
var gulp = require('gulp');
var small = require('small').gulp; // <-- notice the '.gulp' part

gulp.task('scripts', function() {
	return gulp.src('lib/*.js')
		.pipe(small())
		.pipe(gulp.dest('release'));
});
```
This will create a bundle, starting with `lib/index.js`. The output is saved as `release/index.js`. You can customize this using the fileName (defaults to `index.js`) and options parameters:
```javascript
		.pipe(small('foo.js', options))
```

Sourcemaps
----------
The command line interface and Node api generate source maps by default. When using gulp, you can add [gulp-sourcemaps](https://www.npmjs.com/package/gulp-sourcemaps) to generate source maps:
```javascript
var sourcemaps = require('gulp-sourcemaps');

gulp.task('scripts', function() {
	return gulp.src('lib/*.js')
		.pipe(sourcemaps.init())
		.pipe(small())
		.pipe(sourcemaps.write())
		.pipe(gulp.dest('release'));
});
```

Options
-------
```options``` in the examples above is an object with these properties:

**outputFileName** - The output filename(s). Example:
```
{
	standalone: 'output.js',
}
```
Or
```
{
	commonjs: 'output.commonjs.js',
	amd: 'output.amd.js',
	standalone: 'output.standalone.js',
	universal: 'output.universal.js'
}
```
Default: `{ standalone: startFileName }`

**exportPackage** - Export the package with the specified name. You can specify different names for different targets. Example:
```
{
	commonjs: 'myCommonJSPackage',
	amd: 'myAMDPackage',
	standalone: 'myBrowserPackage'
}
```
Or
```
{
	universal: 'myPackage'
}
```

**globalModules** - Add external modules, which will not be included in the generated package. Example:
```
{
	'$': {
		commonjs: 'jquery',		// Output will be require('jquery')
		amd: 'jquery',			// Output will be define(['jquery'], ...)
		standalone: 'jquery'	// Output will be jquery
	}
}
```
Which is equal to
```
{
	'$': {
		universal: 'jquery'
	}
}
```
Then you can do:
```
var $ = require('$');
```

**includeNode** (boolean) - Whether to include the node core packages, like `path`.
**modulesDirectories** (string[]) - Folder names which contain modules. Default: `['node_modules']`. You can specify multiple names.
**varPrefix** (string) - Small add some variables to the emitted code. These variables are prefixed with this prefix. Default: `'__small$_'`.

Loaders
-------
Small doesn't have loaders like browserify does. Instead you can use gulp. Example:
```
var gulp = require('gulp');
var small = require('small').gulp;
var ts = require('gulp-typescript');

gulp.task('scripts', function() {
	return gulp.src('lib/**.ts')
		.pipe(ts({ module: 'commonjs' })) // Compile typescript to javascript
		.pipe(small())
		.pipe(gulp.dest('release'));
});
```

Small file size
---------------
Small is designed to generate a small file size. Because of this, it might not work with all the projects. You can use it if:
- You don't use expressions in `require`, only string literals.
- Your code doesn't modify globals (like String). If globals are modified, make sure every file that uses these changes also requires the file that modified the global.

The following parts from CommonJS are not and (probably) won't be supported:
- module.id
- module.uri
- require(...expression...)
- require.main
- require.paths

About the generated JavaScript
------------------------------
Every module is wrapped in a closure. Every module looks like this:
```
(function() {
	var exports = {};
	// ...
	return exports;
})();
```
If necessary, Small automaticly adds a module.exports variable (`__small$_moduleExports`), but first Small tries to replace `module.exports` (and toplevel `this`) with `exports`. If that's not safe, Small renames `module.exports` to `__small$_moduleExports`.

If possible, modules are placed in modules that use them, like this:
```
(function() {
	var exports = {};
	var otherFile = (function() { // was: var otherFile = require('./otherFile.js');
		var exports = {};
		// ...
		return exports;
	})();
	// ...
	return exports;
})();
```
This way it's the easiest for minifier to understand the code.

If a file is required more then once, it will be assigned to a variable like `__small$_1` (but that name will be mangled if you use a minifier).

Include Node
------------
Set the `includeNode` option to `true` and you can require the default modules (like path). Node's globals (`__dirname`, `process`) are not yet supported. 

Todo
----
- Conditional imports (like `if (...) require('...')`)
- Include node globals when includeNode is set

License
-------
Small is licensed under the MIT license.
