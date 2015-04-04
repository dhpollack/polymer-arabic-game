'use strict';

// Include Gulp & Tools We'll Use
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var del = require('del');
var runSequence = require('run-sequence');
var browserSync = require('browser-sync');
var pagespeed = require('psi');
var reload = browserSync.reload;
var merge = require('merge-stream');
var path = require('path');
var mkpath = require('mkpath');
var fs = require("fs");


var appDir = 'app';
var tmpDir = '.tmp';
var distDir = '_dist';

var AUTOPREFIXER_BROWSERS = [
  'ie >= 10',
  'ie_mob >= 10',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'opera >= 23',
  'ios >= 7',
  'android >= 4.4',
  'bb >= 10'
];

var styleTask = function (stylesPath, srcs) {
  return gulp.src(srcs.map(function(src) {
      return path.join('app', stylesPath, src);
    }))
    .pipe($.changed(stylesPath, {extension: '.css'}))
    .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
    .pipe(gulp.dest(tmpDir + stylesPath))
    .pipe($.if('*.css', $.cssmin()))
    .pipe(gulp.dest(distDir + '/' + stylesPath))
    .pipe($.size({title: stylesPath}));
};

// Compile and Automatically Prefix Stylesheets
gulp.task('styles', function () {
  return styleTask('styles', ['**/*.css']);
});

gulp.task('elements', function () {
  return styleTask('elements', ['**/*.css']);
});

// Lint JavaScript
gulp.task('jshint', function () {
  return gulp.src([
      appDir+'/scripts/**/*.js',
      appDir+'/elements/**/*.js',
      appDir+'/elements/**/*.html'
    ])
    .pipe(reload({stream: true, once: true}))
    .pipe($.jshint.extract()) // Extract JS from .html files
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.if(!browserSync.active, $.jshint.reporter('fail')));
});

// Optimize Images
gulp.task('images', function () {
  return gulp.src(appDir+'/assets/images/**/*')
    .pipe($.cache($.imagemin({
      progressive: true,
      interlaced: true
    })))
    .pipe(gulp.dest(distDir + '/assets/images'))
    .pipe($.size({title: 'images'}));
});

// Optimize Audio - create .mp4 and .opus
gulp.task('audio', function () {
  return gulp.src(appDir+'/assets/audio/**/*.flac')
    .pipe($.shell([
      'mkdir -p .tmp',
      'echo <%= file.path %> >> '+ tmpDir + '/ffmpeg.log',
      'echo <%= file.path %> >> '+ tmpDir + '/opus.log',
      'ffmpeg -y -i <%= file.path %> -vbr 1 -acodec aac -strict experimental <%= f(file.path, ".m4a") %> >> '+ tmpDir + '/ffmpeg.log 2>&1',
      'opusenc --bitrate 8 <%= file.path %> <%= f(file.path, ".opus") %> >> '+ tmpDir + '/opus.log 2>&1'
    ], {
      templateData: {
        f: function(s, ext) {
          var dest = s.replace('.flac', ext).replace('/originals', '');
          mkpath(path.dirname(dest));
          return dest;
        }
      }
    }));
});

// Copy All Files At The Root Level (app)
gulp.task('copy', function () {
  var app = gulp.src([
    'app/*',
    '!app/test'
  ], {
    dot: true
  }).pipe(gulp.dest(distDir));

  var html = gulp.src(['app/**/*.html'])
    .pipe(gulp.dest(tmpDir))
    .pipe(reload({stream: true}));

  var bower = gulp.src(['bower_components/**/*.{css,js,html,swf}', '!**/test/**/*', '!**/demo/**/*'])
    .pipe(gulp.dest(distDir + '/bower_components'));

  var json = gulp.src([appDir + '/**/*.json'])
    .pipe(gulp.dest(distDir));

  var assets = gulp.src([appDir + '/assets/**/*.*', '!'+appDir+'/assets/**/*.flac'])
    .pipe(gulp.dest(distDir+ '/assets'));

  var elements = gulp.src([appDir+'/elements/**/*.html'])
    .pipe(gulp.dest(distDir + '/elements'));

  var services = gulp.src([appDir+'/services/**/*.html'])
    .pipe(gulp.dest(distDir+'/services'));

  var vulcanized = gulp.src([appDir+'/elements/elements.html'])
    .pipe($.rename('elements.vulcanized.html'))
    .pipe(gulp.dest(distDir+'/elements'));

  return merge(app, html, bower, elements, vulcanized, json).pipe($.size({title: 'copy'}));
});

// Copy Web Fonts To Dist
gulp.task('fonts', function () {
  return gulp.src([appDir+'/fonts/**'])
    .pipe(gulp.dest(distDir+'/fonts'))
    .pipe($.size({title: 'fonts'}));
});

// Scan Your HTML For Assets & Optimize Them
gulp.task('html', function () {
  var assets = $.useref.assets({searchPath: [tmpDir, appDir, distDir]});

  return gulp.src([appDir+'/**/*.html', '!'+appDir+'/{elements,test}/**/*.html'])
    // Replace path for vulcanized assets
    //.pipe($.if('*.html', $.replace('elements/elements.html', 'elements/elements.vulcanized.html')))
    .pipe(assets)
    // Concatenate And Minify JavaScript
    .pipe($.if('*.js', $.uglify({preserveComments: 'some'})))
    // Concatenate And Minify Styles
    // In case you are still using useref build blocks
    .pipe($.if('*.css', $.cssmin()))
    .pipe(assets.restore())
    .pipe($.useref())
    // Minify Any HTML
    //.pipe($.if('*.html', $.minifyHtml({
    //  quotes: true,
    //  empty: true,
    //  spare: true
    //})))
    // Output Files
    .pipe(gulp.dest(distDir))
    .pipe($.size({title: 'html'}));
});

// Vulcanize imports
gulp.task('vulcanize', function () {
  return gulp.src(distDir + '/index.vulcanized.html')
    .pipe($.vulcanize({
      dest: distDir,
      strip: true,
      csp: true,
      inline: true
    }))
    .pipe(gulp.dest(distDir))
    .pipe($.size({title: 'vulcanize'}));
});

// Clean Output Directory
gulp.task('clean', del.bind(null, [tmpDir, distDir]));

// Watch Files For Changes & Reload
gulp.task('serve', ['styles', 'elements'], function () {
  browserSync({
    notify: false,
    port: process.env.PORT,
    host: process.env.IP,
    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: {
      baseDir: [appDir, tmpDir],
      routes: {
        '/bower_components': 'bower_components'
      }
    }
  });

  gulp.watch([appDir+'/**/*.html'], reload);
  gulp.watch([appDir+'/**/*.json'], reload);
  gulp.watch([appDir+'/styles/**/*.css'], ['styles', reload]);
  gulp.watch([appDir+'/elements/**/*.css'], ['elements', reload]);
  gulp.watch([appDir+'/{scripts,elements}/**/*.js'], ['jshint']);
  gulp.watch([appDir+'/assets/**/*'], reload);
});

// Build and serve the output from the dist build
gulp.task('serve:dist', ['default'], function () {
  browserSync({
    notify: false,
    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: distDir
  });
});

// Build Production Files, the Default Task
gulp.task('default', ['clean'], function (cb) {
  runSequence(
    ['copy', 'styles'],
    'elements',
    ['jshint', 'images', 'fonts', 'html'],
    'vulcanize',
    cb);
});

// Run PageSpeed Insights
// Update `url` below to the public URL for your site
gulp.task('pagespeed', function (cb) {
  // Update the below URL to the public URL of your site
  pagespeed.output('example.com', {
    strategy: 'mobile',
    // By default we use the PageSpeed Insights free (no API key) tier.
    // Use a Google Developer API key if you have one: http://goo.gl/RkN0vE
    // key: 'YOUR_API_KEY'
  }, cb);
});

gulp.task('deploy', function() {
  return gulp.src('_dist/**/*')
    .pipe($.ghPages({
      remoteUrl: 'git@github.com:dhpollack/dhpollack.github.io.git',
      branch: 'master'
    }));
});

// Load custom tasks from the `tasks` directory
try { require('require-dir')('tasks'); } catch (err) {}
