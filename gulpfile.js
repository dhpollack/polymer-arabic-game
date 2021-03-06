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
var polybuild = require('polybuild');
var packageJson = require('./package.json');
var glob = require('glob');
var crypto = require('crypto');

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
    .pipe(gulp.dest(tmpDir + '/' + stylesPath))
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

gulp.task('jsonlint', function() {
  gulp.src(appDir + "/**/*.json")
    .pipe($.jsonlint())
    .pipe($.jsonlint.reporter());
});

// Optimize Images
// Removing imagemin for space reasons.  Only saved 12K, but costs 112M
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
  
  var audioPath;
  if($.util.env.dir) {
    audioPath = appDir+'/assets/audio/' + $.util.env.dir + '/**/*.flac';
  } else {
    audioPath = appDir+'/assets/audio/**/*.flac';
  }
  return gulp.src(audioPath)
    .pipe($.shell([
      "mkdir -p .tmp",
      // removing opus for now
      //'echo <%= file.path %> >> '+ tmpDir + '/opus.log',
      //'opusenc --bitrate 8 <%= file.path %> <%= f(file.path, ".opus") %> >> '+ tmpDir + '/opus.log 2>&1',
      'echo "<%= g(file.path) %>" >> '+ tmpDir + '/ffmpeg.log',
      'ffmpeg -y -i "<%= g(file.path) %>" -strict experimental -acodec aac -b:a 64k -ac 1 "<%= f(g(file.path), ".m4a") %>" >> '+ tmpDir + '/ffmpeg.log 2>&1'
    ], {
      templateData: {
        f: function(s, ext) {
          var dest = s.replace('.flac', ext).replace('/originals', '').toLowerCase();
          mkpath(path.dirname(dest));
          return dest;
        },
        g: function(s) {
          return s;
          //return s.replace(/[\\$'"]/g, "\\$&");
        }
      }
    }));
});

// strip all diacritics and accents
gulp.task('diacritics', function () {
  return gulp.src(appDir+'/api/**/words.json')
    .pipe($.shell([
      'utils/diacritics.py <%= file.path %>'
    ]));
});

// strip all diacritics and create translations
gulp.task('metadata', function () {
  return gulp.src(appDir+'/api/**/words.json')
    .pipe($.shell([
      'utils/metadata.py <%= file.path %>'
    ]));
});

// Copy All Files At The Root Level (app)
gulp.task('copy', function () {
  var app = gulp.src([
    appDir + '/*',
    '!' + appDir + '/test'
  ], {
    dot: true
  }).pipe(gulp.dest(distDir));

  var html = gulp.src([appDir + '/**/*.html'])
    .pipe(gulp.dest(tmpDir))
    .pipe(gulp.dest(distDir))
    .pipe(reload({stream: true}));

  var bower = gulp.src(['bower_components/**/*.{css,js,html,swf}', '!**/test/**/*', '!**/demo/**/*', '!**/Gruntfile.js'])
    .pipe(gulp.dest(tmpDir + '/bower_components'));

  var json = gulp.src([appDir + '/*.json', appDir + '/**/*.json', '!' + appDir + '/**/words.json'])
    .pipe(gulp.dest(distDir))
    .pipe(gulp.dest(tmpDir));

  var assets = gulp.src([appDir + '/assets/**/*.*', '!'+appDir+'/assets/**/*.flac'])
    .pipe(gulp.dest(distDir+ '/assets'))
    .pipe(gulp.dest(tmpDir+ '/assets'));

  var elements = gulp.src([appDir+'/elements/**/*.html'])
    .pipe(gulp.dest(distDir + '/elements'))
    .pipe(gulp.dest(tmpDir + '/elements'));

  var services = gulp.src([appDir+'/services/**/*.html'])
    .pipe(gulp.dest(distDir + '/services'))
    .pipe(gulp.dest(tmpDir+'/services'));

  var jsmodules = gulp.src([
      'node_modules/mousetrap/mousetrap.*',
      'node_modules/hangul-js/hangul.*',
      'node_modules/p5/lib/*.js',
      'node_modules/p5/lib/addons/*.js',
      'bower_components/firebase/firebase.js',
      'bower_components/cookieconsent2/cookieconsent.js',
      'bower_components/webcomponentsjs/webcomponents*.js',
      'bower_components/viewport-units-buggyfill/viewport-units-buggyfill*.js'])
    .pipe(gulp.dest(distDir + '/assets/js'))
    .pipe(gulp.dest(tmpDir+'/assets/js'));

  var swBootstrap = gulp.src(['bower_components/platinum-sw/bootstrap/*.js'])
    .pipe(gulp.dest(tmpDir + '/elements/bootstrap'))
    .pipe(gulp.dest(distDir + '/elements/bootstrap'));

  var swToolbox = gulp.src(['bower_components/sw-toolbox/*.js'])
    .pipe(gulp.dest(tmpDir + '/sw-toolbox'))
    .pipe(gulp.dest(distDir + '/sw-toolbox'));

  return merge(app, html, elements, json, bower, assets, jsmodules, services, swBootstrap, swToolbox).pipe($.size({title: 'copy'}));
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

  return gulp.src([appDir+'/**/*.html'])
    // Replace path for vulcanized assets
    //.pipe($.if('*.html', $.replace('elements/elements.html', 'elements/elements.vulcanized.html')))
    .pipe($.replace('../bower_components', 'bower_components'))
    .pipe(assets)
    // Concatenate And Minify JavaScript
    .pipe($.if('*.js', $.uglify({preserveComments: 'some'})))
    // Concatenate And Minify Styles
    // In case you are still using useref build blocks
    .pipe($.if('*.css', $.cssmin()))
    .pipe(assets.restore())
    .pipe($.useref())
    // Minify Any HTML
    .pipe($.if('*.html', $.minifyHtml({
      quotes: true,
      empty: true,
      spare: true
    })))
    // Output Files
    .pipe(gulp.dest(tmpDir))
    .pipe($.size({title: 'html'}));
});

// Polybuild imports
gulp.task('vulcanize', function () {
  var vulcanize = gulp.src(appDir + '/elements/tinavg-webapp.html')
    .pipe(polybuild({
      maximumCrush: true
    }))
    .pipe(gulp.dest(distDir + '/elements'))
    .pipe(gulp.dest(tmpDir + '/elements'))
    .pipe($.size({ title: 'vulcanize/polybuild' }));
  var replace = gulp.src(appDir + '/index.html')
    .pipe($.replace('elements/tinavg-webapp.html', 'elements/tinavg-webapp.build.html'))
    .pipe($.replace(/..\/bower_components\/(.*)\/(.*)[.]js/g, 'assets/js/$2.js'))
    .pipe(gulp.dest(tmpDir))
    .pipe(gulp.dest(distDir));
  return merge(vulcanize, replace);
});

// Vulcanize imports
gulp.task('vulcanize-example', function () {
  return gulp.src(appDir + '/index.html')
    .pipe($.vulcanize({
      dest: distDir,
      exclude: ['firebase.js'],
      strip: true,
      inlineCss: true,
      inlineScripts: true
    }))
    .pipe($.rename("index.build.html"))
    .pipe(gulp.dest(distDir))
    .pipe(gulp.dest(tmpDir))
    .pipe($.size({title: 'vulcanize'}));
});

gulp.task('dedebug', function() {
  return gulp.src(tmpDir + "/elements/tinavg-webapp.build.js")
    .pipe($.stripDebug())
    .pipe(gulp.dest(distDir + "/elements"));
});


// Clean Output Directory
gulp.task('clean', del.bind(null, [tmpDir, distDir]));

// Watch Files For Changes & Reload
gulp.task('serve', ['styles', 'elements'], function () {
  var dirs = [];
  if($.util.env.dir) {
    if($.util.env.dir === 'tmp') {
      dirs = [tmpDir, appDir];
    } else if($.util.env.dir === 'dist') {
      dirs = [distDir];
    }
  } else {
    dirs = [appDir, tmpDir];
  } 
  browserSync({
    notify: false,
    port: process.env.PORT,
    host: process.env.IP,
    // Run as an https by uncommenting 'https: true'
    // Note: this uses an unsigned certificate which on first access
    //       will present a certificate warning in the browser.
    // https: true,
    server: {
      baseDir: dirs,
      routes: {
        '/bower_components': 'bower_components',
        '/node_modules': 'node_modules',
        '/cache-config.json' : '_dist/cache-config.json'
      }
    }
  });

  if($.util.env.dir && $.util.env.dir === ('tmp' || 'dist')) {
    gulp.watch([appDir+'/**/*.html'], ['vulcanize', reload]);
  } else {
    gulp.watch([appDir+'/**/*.html'], reload);
  } 
  gulp.watch([appDir+'/**/*.json'], reload);
  gulp.watch([appDir+'/assets/css/**/*.css'], ['styles', reload]);
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

/* deprecated */
gulp.task('manifest', function(){
  
  var manifest = gulp.src([appDir + '/index.html', appDir + '/**/*.json', '!' + appDir + '/**/words.json', appDir + '/**/*.png'])
    .pipe($.manifest({
      hash: true,
      preferOnline: true,
      network: ['http://*', 'https://*', '*'],
      filename: 'app.manifest',
      exclude: 'app.manifest'
     }))
    .pipe(gulp.dest(appDir));
  var replace = gulp.src(appDir + '/index.html')
    .pipe($.replace('<html>', '<html manifest="app.manifest">'))
    .pipe(gulp.dest(appDir));
  return merge(manifest, replace);
});

/* deprecated */
gulp.task('precache', function () {
  return gulp.src([appDir + '/**/*.json', '!' + appDir + '/*.json', '!' + appDir + '/**/words.json', appDir + '/**/*.png', appDir + '/**/druck1.ogg'], {base: appDir + '/'})
    .pipe($.filelist('precache.json'))
    .pipe($.replace(appDir + '/', ''))
    .pipe(gulp.dest(appDir));
});

gulp.task('cache-config', function (callback) {
  var dir = distDir;
  var config = {
    cacheId: packageJson.name || path.basename(__dirname),
    disabled: false
  };

  glob('{api,assets/js,assets/css,assets/images}/**/*.*', {cwd: dir}, function(error, files) {
    if (error) {
      callback(error);
    } else {
      files.push('bower_components/webcomponentsjs/webcomponents-lite.min.js', 'elements/tinavg-webapp.build.html', 'elements/tinavg-webapp.build.js');
      config.precache = files;

      var md5 = crypto.createHash('md5');
      md5.update(JSON.stringify(config.precache));
      config.precacheFingerprint = md5.digest('hex');

      var configPath = path.join(dir, 'cache-config.json');
      fs.writeFile(configPath, JSON.stringify(config), callback);
    }
  });
});

// Build Production Files, the Default Task
gulp.task('default', ['clean'], function (cb) {
  runSequence(
    ['copy', 'styles'],
    'elements',
    ['jshint', 'jsonlint', 'fonts', 'html'],
    ['vulcanize', 'cache-config'],
    'dedebug',
    cb);
});

// Run PageSpeed Insights
// Update `url` below to the public URL for your site
gulp.task('pagespeed', function (cb) {
  // Update the below URL to the public URL of your site
  pagespeed.output('www.tinavg.com', {
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
