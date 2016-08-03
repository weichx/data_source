var gulp = require('gulp');
var jasmine = require('gulp-jasmine');
var tsc = require('gulp-tsc');

gulp.task('test', function () {
        gulp.src(['./spec/helper.js', './spec/**/*_spec.js'])
            .pipe(jasmine({verbose: false, includeStackTrace: true}));
});

gulp.task('build', function () {
        gulp.src('./src/**/*.ts').pipe(tsc({
                "tscPath": "/usr/local/lib/node_modules/typescript/bin/tsc",
                "module": "commonjs",
                "noImplicitAny": true,
                "preserveConstEnums": true,
                "target": "es5",
                "declaration": true,
                "listFiles": true,
                "diagnostics": true,
                "noResolve": false,
                "suppressImplicitAnyIndexErrors": true,
                "noEmitOnError": true,
                "version": true
        })).pipe(gulp.dest('./dist'));
});
