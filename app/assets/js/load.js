// Configure loading modules from the lib directory,
// except for 'app' ones, which are in a sibling
// directory.
requirejs.config({
    baseUrl: 'assets/js',
    paths: {
        app: 'app',
        buggyfill: 'buggyfill',
        p5: 'p5',
        p5dom: 'p5.dom',
        p5sound: 'p5.sound',
        webcomponentsjs: 'webcomponents-lite.min',
        buggyfilljs: 'viewport-units-buggyfill',
        buggfilljshacks: 'viewport-units-buggyfill.hacks',
        cookieconsent: 'cookieconsent',
        Hangul: 'hangul.min'
    }
});

// Start loading the main app file. Put all of
// your application logic in there.
requirejs(['app', 'Hangul', 'hangul']);