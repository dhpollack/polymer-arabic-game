(function(document) {
  'use strict';

  // Grab a reference to our auto-binding template
  // and give it some initial binding values
  // Learn more about auto-binding templates at http://goo.gl/Dx1u2g

  // imports are loaded and elements have been registered
  var app = document.querySelector('tinavg-webapp');

  // Listen for template bound event to know when bindings
  // have resolved and content has been stamped to the page
  //app.addEventListener('dom-change', function() {
    //console.log('Our app is ready to rock!');
  //});

  // See https://github.com/Polymer/polymer/issues/1381
  window.addEventListener('WebComponentsReady', function() {
  });

  window.cookieconsent_options = {
      learnMore: 'more info',
      link: 'https://www.tinavg.com/terms.html',
      theme: 'dark-top'
  };
  setTimeout(function() {
    if(document.querySelector('[unresolved]')) {
      document.getElementById('friendly_message').removeAttribute('hidden');
      document.querySelector('[unresolved]').removeAttribute("unresolved");
    }
  }, 25000);
  function hideFriendlyMessage() {
    document.getElementById('friendly_message').setAttribute('hidden', true);
  }

})(document);