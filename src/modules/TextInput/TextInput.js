
(function() {

    /**
     * TextArea
     *
     * Single line editor, movable cursor, insertion mode, backspace and delete
     * Requires a sprite sheet based font which provides stringWidth(str)

     * @constructor
     * @extends CAAT.ActorContainer
     *
     */
    CAAT.TextArea = function() {
        CAAT.TextArea.superclass.constructor.call(this);

        // Setup default font sprite sheet
        this.setDefaultFont();

        this.lineHeight = this.font.height;
        this.textAlign= "left";
        this.textBaseline= "top";
        this.outlineColor= "black";
        this.clip= false;
        this.enableEvents(true);
        this.setDefaultCursor();

        // initial state: no focus, no cursor
        this.hideCursor();

        return this;
    };

    CAAT.TextArea.prototype= {
        font:               null,   // a sprite sheet based font object (CAAT.Font or SpriteImage)                                    
        text:               null,   // a string with the text to draw.
        textWidth:          0,      // an integer indicating text width in pixels.
        textHeight:         0,      // an integer indicating text height in pixels.
        cursorPos:          0,      // after last character of text
        cursorActor:        null,
        lineHeight:         0,

    
        setDefaultFont: function() {
          this.font = new CAAT.Font().
                        setFontSize(24).
                        createDefault(2); // padding required to isolate letters from each others

    },

        setDefaultCursor: function() {
            if (this.cursorActor != null) {
                this.removeChild(this.cursorActor);
            }

                this.cursorActor= new CAAT.TextActor().
                    setFont(this.font).
                    setTextFillStyle("black").
                    setOutline(true).
                    enableEvents(false).
                    setText('_').
                    setLocation (0, 5);

                this.setDefaultCursorBehavior();
                this.addChild(this.cursorActor);
        },

        setDefaultCursorBehavior : function() {
            this.cursorActor.emptyBehaviorList();
            var cursorAlphaB = new CAAT.AlphaBehavior().
                  setValues(1,0).
                  setCycle(true).
                  setPingPong().
                  setFrameTime(0, 1500);

            this.cursorActor.addBehavior(cursorAlphaB);
        },

        hideCursor : function() {
             this.cursorActor.emptyBehaviorList();
             this.cursorActor.setVisible(false);
        },

        showCursor : function() {
             this.cursorActor.setVisible(true);
             this.setDefaultCursorBehavior();
        },

       

        onFocus: function() {
          // Cursor becomes visible  
          if (this.cursorActor != null) {
            this.showCursor();
            } else {
                this.setDefaultCursor();
            }

        },

        onFocusLost: function() {
            if (this.cursorActor != null) {
               // Make cursor invisible
                this.hideCursor();
            } 
          
        },

       
        moveLeft : function( ) {
            if (null!==this.text && this.cursorPos > 0) {
               this.setCursorPos(this.cursorPos -1);  
            }
        },
        
        moveRight : function( ) {
            if (null!==this.text && this.cursorPos < this.text.length) {
               this.setCursorPos(this.cursorPos +1);  
            }
        },

        deleteChar : function( ) {
           if (null!==this.text && this.text.length > 0) {
           var isModified = false;
            var newText = this.text.substr(0 , this.cursorPos) +  this.text.substr( this.cursorPos +1, this.text.length  - this.cursorPos - 1);
            this.setText(newText, true);
            // cursorPos modified only if last character was deleted
            if (this.cursorPos > this.text.length) {
                this.setCursorPos(this.text.length);
               // this.cursorPos = this.text.length;
            }
            isModified = true;
           }
           return isModified;
        },

        backspace : function( ) {
           var isModified = false;
           if (this.cursorPos > 0) {
            var newText = this.text.substr(0 , this.cursorPos -1) +  this.text.substr( this.cursorPos, this.text.length  - this.cursorPos);
            this.setText(newText, true);
            this.setCursorPos(this.cursorPos - 1);
            
            isModified =  true; // modified
           }
           return isModified;
        },

        insert : function( newChar ) {
           if ( null!== this.text) {
            var newText = this.text.substr(0 , this.cursorPos) + newChar +   this.text.substr( this.cursorPos, this.text.length  - this.cursorPos);
            this.setText(newText, true);         
           } else {
               this.setText(newChar, true);
           }
           this.setCursorPos(this.cursorPos+1);
        },

        setCursorPos : function( pos ) {
           // console.log("setCursorPos : before " + this.cursorPos);
              if ( null=== this.text) {
             this.cursorPos = 0;
           } else {
                if (typeof(pos) === 'undefined'  || null ===pos) {
                       this.cursorPos = this.text.length; 
                } else { 
            this.cursorPos = pos;
              }
             // console.log("setCursorPos : after " + this.cursorPos);
              cursorPosx = this.font.stringWidth(this.text.substr(0 , this.cursorPos));

              if (this.cursorActor != null) {
                this.cursorActor.setLocation( cursorPosx , 0);
              }
           }
        },

        
        /**
         * Set the text to be shown by the actor.
         * @param sText a string with the text to be shown.
         * @return this
         */
        setText : function( sText, keepCursor) {
            this.text= sText;
            if ( null===this.text || this.text==="" ) {
                this.width= this.height= 0;
            }
            this.calcTextSize( CAAT.director[0] );
            if (typeof(keepCursor) === 'undefined'  || !keepCursor) {
            this.setCursorPos();
            }
            
            // TODO ? notification ?

            return this;
        },
        /**
         * Sets the font to be applied for the text.
         * @param font a string with a valid canvas rendering context font description.
         * @return this
         */
        setFont : function(font) {

            if ( !font ) {
                this.setDefaultFont();
            }

            this.font= font;
            this.calcTextSize( CAAT.director[0] );

            // Update cursor to the same font
            this.setDefaultCursor();

            return this;
        },
        /**
         * Calculates the text dimension in pixels and stores the values in textWidth and textHeight
         * attributes.
         * If Actor's width and height were not set, the Actor's dimension will be set to these values.
         * @return this
         */
        calcTextSize : function() {

            if ( typeof this.text==='undefined' || null===this.text || ""===this.text ) {
                this.textWidth= 0;
                this.textHeight= 0;
                return this;
            }

            // The font provides stringWidth()

            this.textWidth= this.font.stringWidth(this.text);
            this.width= this.textWidth;


            this.lineHeight = this.font.height;
            this.textHeight= this.lineHeight;
            this.height= this.textHeight;

            return this;
        },

        /**
         * Custom paint method for TextArea instances.
         * If the path attribute is set, the text will be drawn traversing the path.
         *
         * @param director a valid CAAT.Director instance.
         * @param time an integer with the Scene time the Actor is being drawn.
         */
        paint : function(director, time) {

            CAAT.TextArea.superclass.paint.call(this, director, time );

            // TextArea can be cached (but not editors)
            if ( this.cached ) {
                // cacheAsBitmap sets this actor's background image as a representation of itself.
                // So if after drawing the background it was cached, we're done.
                return;
            }

            if ( null===this.text) {
                return; 
            }

            if ( this.textWidth===0 || this.textHeight===0 ) {
                this.calcTextSize(director);
            }

            var ctx= director.ctx;
            
            // Is drawing on path useful here ?
            if (typeof this.font === 'object') {
                return this.drawSpriteText(director,time);
            }        
        },
        
        // Ou peut on conserver les méthodes héritées de TextActor?

        /**
         * Private.
         * Draw the text using a sprited font instead of a canvas font.
         * @param director a valid CAAT.Director instance.
         * @param time an integer with the Scene time the Actor is being drawn.
         */
        drawSpriteText: function(director, time) {
                this.font.drawString( director.ctx, this.text, 0, 0);
        }
    };

    extend( CAAT.TextArea, CAAT.ActorContainer, null);
})();


(function() {

    /**
     * TextInputGroup
     * Invisible Container managing the focus of a set of TextAreas
     * childrenList order is used for navigation
     * focus can also be set programatically

     * @constructor
     * @extends CAAT.ActorContainer
     *
     */
    CAAT.TextInputGroup = function() {
        CAAT.TextInputGroup.superclass.constructor.call(this);

        // A singleton is created to store a map between scenes and input groups
        if (typeof(CAAT.TextInputGroup.SceneFocusManager) === 'undefined' ) {
             CAAT.TextInputGroup.SceneFocusManager = {};// dictionnaire Scene -> TextInputGroup 
        }

        return this;
    };
/////////////////////
//    CAAT.keyListeners= [];
//
//    /**
//     * Register key events notification function.
//     * @param f {function(key {integer}, action {'down'|'up'})}
//     */
//    CAAT.registerKeyListener= function(f) {
//        CAAT.keyListeners.push(f);
//    };
//
//    CAAT.registerKeyListenerIfNeeded= function(f) {
//     for( var i=0; i<CAAT.keyListeners.length; i++ ) {
//            if ( f===CAAT.keyListeners[i] ) {            
//                return;
//            }
//        }
//
//        CAAT.keyListeners.push(f);
//    };
//
//    /**
//     * Unregister a key events notification function
//     * @param f {function}
//     */
//    CAAT.unregisterKeyListener= function(f) {
//        for( var i=0; i<CAAT.windowResizeListeners.length; i++ ) {
//            if ( f===CAAT.keyListeners[i] ) {
//                CAAT.keyListeners.splice(i,1);
//                return;
//            }
//        }
//    };
//    
//    ///////////////////////////

    CAAT.TextInputGroup.prototype= {
        focusedChild:       null,
        focusedChildIndex:    null, // position in childrenList of ActorContainer
        contentListeners: [],

        setParent : function(parent) {
            CAAT.TextInputGroup.superclass.setParent.call(this, parent);
            return this;
        },

        deferredInit: function(director) {
            var currentScene = this.getScene();
            var sceneIndex = director.getSceneIndex(currentScene); // being debugged

            // Associate Scene -> TextInputGroup
            CAAT.TextInputGroup.SceneFocusManager[sceneIndex] = this;

            // Key event callback must be defined only once, otherwise key events will be duplicated
            CAAT.registerKeyListenerIfNeeded(this.___keyAction.bind(this));
        },
        
        registerContentListener:  function(listener) {
             this.contentListeners.push(listener);
         },
         
         unregisterContentListener:  function(listener) {
           for( var i=0; i<this.contentListeners.length; i++ ) {
               if ( listener===this.contentListeners[i] ) {
            	   this.contentListeners.splice(i,1);
                   return;
               }
           }
         },
         
         notifyContentListeners:  function(source, content) {
         	for( var i=0; i<this.contentListeners.length; i++ ) {
         		this.contentListeners[i](source, content) ;
         	}
    	 },
       


         ___keyAction: function(event) {
            // Events are discarded if the scene is not current one
            if (CAAT.director[0].currentScene != this.getScene()) { return; }

                var inputText = this.getFocused();
                if (typeof(inputText) === 'undefined'  || typeof(inputText) === 'undefined'  || null ===inputText) return;
                var isModified = false;

                if (event.getAction()=='press') {
                	console.log("press1 = " + event.getKeyCode());
                // event.preventDefault();
                 //console.log("text = " + CAAT.TextArea.focus.text);
                 switch (event.getKeyCode()) {
                     case CAAT.Keys['DELETE']:
                      // The empty text case has already been excluded above
                      isModified =  inputText.deleteChar();    
      //                event.preventDefault();              
                     break;
                    case CAAT.Keys['BACKSPACE']:
                      // The empty text case has already been excluded above
                      isModified= inputText.backspace();    
    //                  event.preventDefault();              
                     break;                 
                    case CAAT.Keys['LEFT']:
                    inputText.moveLeft();
  //                  event.preventDefault();
                    break;
                      case CAAT.Keys['RIGHT']:
                    inputText.moveRight();
//                    event.preventDefault();
                    break;
                      case CAAT.Keys['UP']:
                        case CAAT.Keys['DOWN']: 
                        // LATER ?
                        //  event.preventDefault();
                        break;
                    case CAAT.Keys['TAB']:
                        if (event.isShiftPressed()) {
                            this.prevChild();
                        } else {
                            this.nextChild();
                        }
                          //event.preventDefault();
                        break;                    
                     default:
                     // other keys handled as keypress events
                     // event.preventDefault(); is not called as it would cancel the keypress event
                     break;
                 }
                 

            }
            if (event.getAction()=='press') {
            	console.log("press2 = " + event.getKeyCode());
            	
                switch (event.getKeyCode()) {
//                	 case 0:
                    case CAAT.Keys['SHIFT']:
                     case CAAT.Keys['DELETE']:
                     case CAAT.Keys['BACKSPACE']:           
                     break;
                    case CAAT.Keys['LEFT']:

                    break;
                    case CAAT.Keys['RIGHT']:

                    break;              
                     default:
	             // shield from unexpected special keys
		    if (event.getKeyCode() < 0xFF00) {
                    var newChar = String.fromCharCode(event.getKeyCode());
                        inputText.insert(newChar);
                        isModified = true;
                    }
                     break;
                 }
  
            }
            
            if (isModified) {
            	this.notifyContentListeners(inputText, inputText.text);
            }

        },

        getFocused: function() {
          return this.focusedChild;
        },


        prevChild: function() {
            if (this.focusedChildIndex > 0) {

                this.notifyFocusLost(this.focusedChild);  

                this.focusedChildIndex--;
                this.focusedChild = this.childrenList[this.focusedChildIndex];
  
                this.notifyFocus(this.focusedChild);
            }
        },

        nextChild: function() {
             var newFocusedChildIndex = null;

                 if (this.focusedChildIndex < this.childrenList.length -1) {
                    newFocusedChildIndex = this.focusedChildIndex+1;
                    newFocusedChild = this.childrenList[this.focusedChildIndex++];
      
                } else {
                if (this.focusedChildIndex === this.childrenList.length -1) {
                     newFocusedChildIndex = 0;
                     newFocusedChild = this.childrenList[newFocusedChildIndex];
                 }
             }

                 if (newFocusedChildIndex !=null) {
                     this.notifyFocusLost(this.focusedChild);

                     this.focusedChildIndex = newFocusedChildIndex;
                     this.focusedChild = this.childrenList[newFocusedChildIndex];

                     this.notifyFocus(this.focusedChild);
                 }
        },        
       /**
         * Removes all children from this ActorContainer.
         *
         * @return this
         */
        emptyChildren : function() {
            CAAT.TextInputGroup.superclass.emptyChildren.call(this);

            // notify previously focused Child of lost of focus ?
            // The actor will not be shown anymore ??
            this.notifyFocusLost(this.focusedChild);

            this.focusedChild= null;
            this.focusedChildIndex = null;

            return this;
        },
       /**
         * Adds an Actor to this ActorContainer.

         * @param child a CAAT.Actor object instance.
         * @return this
         */
        addChild : function(child) {

            CAAT.TextInputGroup.superclass.addChild.call(this, child);

            // Focus it only if it is the first child
            this.setFocusToFirstChildOnly(child);

            return this;
        },
        
         setFocusToFirstChildOnly : function(child) {
            // set focus only if it is the first child added
            if (this.focusedChild === null) {
                this.focusedChildIndex = 0;
                this.focusedChild = child;
                this.notifyFocus(this.focusedChild);
            }
        },
       
        /**
         * Adds an Actor to this ActorContainer.
         *
         * @param child a CAAT.Actor object instance.
         *
         * @return this
         */
        addChildAt : function(child, index) {

            CAAT.TextInputGroup.superclass.addChildAt.call(this, child, index);

            // No change in focus in the general case
            this.setFocusToFirstChildOnly(child);

            return this;
        },
       
        /**
         * Removed an Actor form this ActorContainer.
         * If the Actor is not contained into this Container, nothing happends.
         *
         * @param child a CAAT.Actor object instance.
         *
         * @return this
         */
        removeChild : function(child) {

            CAAT.TextInputGroup.superclass.removeChild.call(this, child);

            // If the child had focus, update the state
             if (this.focusedChild === child) {
                this.focusedChild = null;
                this.focusedChildIndex = null;
                this.notifyFocusLost(child);
            }

            return this;
        },

        /**
         * Sets the font to be applied for the text.
         * @param font a string with a valid canvas rendering context font description.
         * @return this
         */
        focusChild : function(child) {
            var childIndex = this.childrenList.indexOf(child);

            if (childIndex != -1) {

                if (this.focusedChild != null) {
                    this.notifyFocusLost(this.focusedChild);
                }

                this.focusedChild = child;
                this.focusedChildIndex = childIndex;
                this.notifyFocus(child);
        }

            return this;
        },

        notifyFocus : function(child) {
            child.onFocus();
        },


        notifyFocusLost : function(child) {
            if (child != null) {
                child.onFocusLost();
            }
        }


        
        
    };

    extend( CAAT.TextInputGroup, CAAT.ActorContainer, null);
})();
