Custom Changes to Polymer Components:

iron-icon.html: line 96

Comment out custom variables for height and width.

      /*
      width: var(--iron-icon-width);
      height: var(--iron-icon-height);
      */

iron-overlay-behavior.html: line 325

Put backdrop right before element that requires backdrop.

    if(this.withBackdrop) {
        this.parentNode.insertBefore(this._backdrop, this);
     }

paper-dialog-common.css: line 11

    :host {
      display: block;
      margin: 24px 40px;
    
      background: var(--paper-dialog-background-color, --primary-background-color);
      color: var(--paper-dialog-color, --primary-text-color);
      /*
      @apply(--layout-scroll);
      */
      @apply(--paper-font-body1);
      @apply(--shadow-elevation-16dp);
      @apply(--paper-dialog);
    }
    
    :host > ::content > * {
      margin-top: 0;
      padding: 0;
    }
    
    :host > ::content > .no-padding {
      padding: 0;
    };
    
    :host > ::content > *:first-child {
      margin-top: 0;
    }

firebase-auth.html: line 10
  remove: <link rel="import" href="firebase.html">