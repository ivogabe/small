var gulp = require('gulp');
var ts = require('gulp-typescript');
var tslint = require('gulp-tslint');

var tsProject = ts.createProject({
	noExternalResolve: true,
	target: 'es5',
	module: 'commonjs',
	typescript: require('typescript')
});
var tslintConfig = require('./tslint.json');

var paths = {
	lib: 'lib',
	ref: 'definitions'
};

gulp.task('compile', function() {
	var tsResult =
		gulp.src([paths.lib + '/**.ts', paths.ref + '/**.ts', 'node_modules/typescript/bin/typescript.d.ts'])
			.pipe(ts(tsProject));

	return tsResult.js.pipe(gulp.dest('release'));
});

gulp.task('test-1', ['compile'], function() {
	var lib = require('./release/index');

	return gulp.src(['examples/simple/**.js'])
		.pipe(lib.gulp('a.js', {
			outputFileName: {
				commonjs: 'output.common.js',
				amd: 'output.amd.js',
				standalone: 'output.standalone.js',
				universal: 'output.universal.js'
			},
			globalModules: {
				'document': {
					universal: 'document'
				}
			},
			exportPackage: {
				universal: 'example'
			},
			externalResolve: [
				'./node_modules'
			],
			includeNode: true
		}))
		.pipe(gulp.dest('examples/simple'));
});
gulp.task('test-2', ['compile'], function() {
	var lib = require('./release/index');

	return gulp.src(['examples/big/**.js'])
		.pipe(lib.gulp('turpis.js', {
			outputFileName: {
				commonjs: 'output.common.js',
				amd: 'output.amd.js',
				standalone: 'output.standalone.js',
				universal: 'output.universal.js'
			}
		}))
		.pipe(gulp.dest('examples/big'));
});
gulp.task('test', ['test-1', 'test-2']);

gulp.task('lint', function() {
	return gulp.src([paths.lib + '/**.ts'])
		.pipe(tslint({
			configuration: tslintConfig
		}))
		.pipe(tslint.report('prose'));
});

gulp.task('watch', ['compile'], function() {
    gulp.watch([paths.lib + '/**.ts', paths.ref + '/**.ts'], ['compile']);
});

gulp.task('default', ['compile']);
