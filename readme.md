Small
=====

Small is a CommonJS bundler that aims to generate the smallest bundle size. It supports commonjs files, and output as a standalone, commonjs, amd and universal package.

How to install
--------------
``` npm instal small ```
or (for command line usage)
``` npm install small -g ```

How to use
----------
Command line:
``` small -i index.js -o output.js ```
(```small --help``` for more info)

From node:
```
var small = require('small');
small.compile('filename.js', options, function(error) {
	if (error) throw error;
	console.log('Completed');
});
```
Or, as a gulp plugin:
```
var gulp = require('gulp');
var small = require('small').gulp; // <-- notice the '.gulp' part

gulp.task('scripts', function() {
	return gulp.src('lib/*.js')
		.pipe(small('index.js', options)) // start with lib/index.js
		.pipe(gulp.dest('release'))
});
```

Options
-------
```options``` in the examples above is an object with these properties:

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

**includeNode** (boolean) - Whether to include the node core packages, like ```path```.
**modulesDirectories** (string[]) - Folder names which contain modules. Default: ```['node_modules']```. You can specify multiple names.
**varPrefix** (string) - Small add some variables to the emitted code. These variables are prefixed with this prefix. Default: '__small$_'

Loaders
-------
Small doesn't have loaders like browserify does. Instead you can use gulp. Example:
```
var gulp = require('gulp');
var small = require('small').gulp;
var type = require('gulp-type');

gulp.task('scripts', function() {
	return gulp.src('lib/**.ts')
		.pipe(ts({module: 'commonjs'})).js
		.pipe(small('index.js', {})
		.pipe(gulp.dest('release'))
});
```

Small file size
---------------
Small is designed to generate a small file size. Because of this, it might not work with all the projects. You can use it if:
- You don't use expressions in ```require``` calls.
- You don't use circular dependencies (eg a.js requires b.js and b.js requires a.js, circular dependencies will be supported in the future).
- Your code doesn't modify globals (like String). If globals are modified, make sure every file that uses these changes also requires the file that modified the global.

Small is designed to be used with TypeScript and TypeScript's ```import``` and ```export``` statements, but it also works with normal JavaScript.

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
If necessary, Small automaticly adds a module.exports variable (```__small$_moduleExports```), but first Small tries to replace ```module.exports``` (and toplevel ```this```) with ```exports```. If that's not safe, Small renames ```module.exports``` to ```__small$_moduleExports```.

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

If a file is required more then once, it will be assigned to a variable like ```__small$_1``` (but that name will be mangled if you use a minifier).

Include Node
------------
Set the includeNode option to true and you can require the default modules (like path). Node's globals are not yet supported. 

Todo
----
- Sourcemaps
- Conditional imports (like if (...) require('...'))
- Circular dependencies (depends on conditional imports)
- Include node globals when includeNode is set

License
-------
Small is licensed under the MIT license.