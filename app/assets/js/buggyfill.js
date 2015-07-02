// iniialize buggyfill
window.viewportUnitsBuggyfill.init({
  // milliseconds to delay between updates of viewport-units
  // caused by orientationchange, pageshow, resize events
  refreshDebounceWait: 250,

  // provide hacks plugin to make the contentHack property work correctly.
  hacks: window.viewportUnitsBuggyfillHacks
});
