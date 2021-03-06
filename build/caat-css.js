/*
The MIT License

Copyright (c) 2010-2011-2012 Ibon Tolosana [@hyperandroid]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

Version: 0.3 build: 291

Created on:
DATE: 2012-02-28
TIME: 09:22:12
*/


/*
 * noVNC: HTML5 VNC client
 * Copyright (C) 2011 Joel Martin
 * Licensed under LGPL-3 (see LICENSE.txt)
 *
 * See README.md for usage and integration instructions.
 */

//"use strict";
/*jslint bitwise: false, white: false */
/*global window, console, document, navigator, ActiveXObject */

// Globals defined here
var Util = {};


/*
 * Make arrays quack
 */

Array.prototype.push8 = function (num) {
    this.push(num & 0xFF);
};

Array.prototype.push16 = function (num) {
    this.push((num >> 8) & 0xFF,
              (num     ) & 0xFF  );
};
Array.prototype.push32 = function (num) {
    this.push((num >> 24) & 0xFF,
              (num >> 16) & 0xFF,
              (num >>  8) & 0xFF,
              (num      ) & 0xFF  );
};

// IE does not support map (even in IE9)
//This prototype is provided by the Mozilla foundation and
//is distributed under the MIT license.
//http://www.ibiblio.org/pub/Linux/LICENSES/mit.license
if (!Array.prototype.map)
{
  Array.prototype.map = function(fun /*, thisp*/)
  {
    var len = this.length;
    if (typeof fun != "function")
      throw new TypeError();

    var res = new Array(len);
    var thisp = arguments[1];
    for (var i = 0; i < len; i++)
    {
      if (i in this)
        res[i] = fun.call(thisp, this[i], i, this);
    }

    return res;
  };
}

/* 
 * ------------------------------------------------------
 * Namespaced in Util
 * ------------------------------------------------------
 */

/*
 * Logging/debug routines
 */

Util._log_level = 'warn';
Util.init_logging = function (level) {
    if (typeof level === 'undefined') {
        level = Util._log_level;
    } else {
        Util._log_level = level;
    }
    if (typeof window.console === "undefined") {
        if (typeof window.opera !== "undefined") {
            window.console = {
                'log'  : window.opera.postError,
                'warn' : window.opera.postError,
                'error': window.opera.postError };
        } else {
            window.console = {
                'log'  : function(m) {},
                'warn' : function(m) {},
                'error': function(m) {}};
        }
    }

    Util.Debug = Util.Info = Util.Warn = Util.Error = function (msg) {};
    switch (level) {
        case 'debug': Util.Debug = function (msg) { console.log(msg); };
        case 'info':  Util.Info  = function (msg) { console.log(msg); };
        case 'warn':  Util.Warn  = function (msg) { console.warn(msg); };
        case 'error': Util.Error = function (msg) { console.error(msg); };
        case 'none':
            break;
        default:
            throw("invalid logging type '" + level + "'");
    }
};
Util.get_logging = function () {
    return Util._log_level;
};
// Initialize logging level
Util.init_logging();


// Set configuration default for Crockford style function namespaces
Util.conf_default = function(cfg, api, defaults, v, mode, type, defval, desc) {
    var getter, setter;

    // Default getter function
    getter = function (idx) {
        if ((type in {'arr':1, 'array':1}) &&
            (typeof idx !== 'undefined')) {
            return cfg[v][idx];
        } else {
            return cfg[v];
        }
    };

    // Default setter function
    setter = function (val, idx) {
        if (type in {'boolean':1, 'bool':1}) {
            if ((!val) || (val in {'0':1, 'no':1, 'false':1})) {
                val = false;
            } else {
                val = true;
            }
        } else if (type in {'integer':1, 'int':1}) {
            val = parseInt(val, 10);
        } else if (type === 'func') {
            if (!val) {
                val = function () {};
            }
        }
        if (typeof idx !== 'undefined') {
            cfg[v][idx] = val;
        } else {
            cfg[v] = val;
        }
    };

    // Set the description
    api[v + '_description'] = desc;

    // Set the getter function
    if (typeof api['get_' + v] === 'undefined') {
        api['get_' + v] = getter;
    }

    // Set the setter function with extra sanity checks
    if (typeof api['set_' + v] === 'undefined') {
        api['set_' + v] = function (val, idx) {
            if (mode in {'RO':1, 'ro':1}) {
                throw(v + " is read-only");
            } else if ((mode in {'WO':1, 'wo':1}) &&
                       (typeof cfg[v] !== 'undefined')) {
                throw(v + " can only be set once");
            }
            setter(val, idx);
        };
    }

    // Set the default value
    if (typeof defaults[v] !== 'undefined') {
        defval = defaults[v];
    } else if ((type in {'arr':1, 'array':1}) &&
            (! (defval instanceof Array))) {
        defval = [];
    }
    // Coerce existing setting to the right type
    //Util.Debug("v: " + v + ", defval: " + defval + ", defaults[v]: " + defaults[v]);
    setter(defval);
};

// Set group of configuration defaults
Util.conf_defaults = function(cfg, api, defaults, arr) {
    var i;
    for (i = 0; i < arr.length; i++) {
        Util.conf_default(cfg, api, defaults, arr[i][0], arr[i][1],
                arr[i][2], arr[i][3], arr[i][4]);
    }
};


/*
 * Cross-browser routines
 */

// Get DOM element position on page
Util.getPosition = function (obj) {
    var x = 0, y = 0;
    if (obj.offsetParent) {
        do {
            x += obj.offsetLeft;
            y += obj.offsetTop;
            obj = obj.offsetParent;
        } while (obj);
    }
    return {'x': x, 'y': y};
};

// Get mouse event position in DOM element
Util.getEventPosition = function (e, obj, scale) {
    var evt, docX, docY, pos;
    //if (!e) evt = window.event;
    evt = (e ? e : window.event);
    evt = (evt.changedTouches ? evt.changedTouches[0] : evt.touches ? evt.touches[0] : evt);
    if (evt.pageX || evt.pageY) {
        docX = evt.pageX;
        docY = evt.pageY;
    } else if (evt.clientX || evt.clientY) {
        docX = evt.clientX + document.body.scrollLeft +
            document.documentElement.scrollLeft;
        docY = evt.clientY + document.body.scrollTop +
            document.documentElement.scrollTop;
    }
    pos = Util.getPosition(obj);
    if (typeof scale === "undefined") {
        scale = 1;
    }
    return {'x': (docX - pos.x) / scale, 'y': (docY - pos.y) / scale};
};


// Event registration. Based on: http://www.scottandrew.com/weblog/articles/cbs-events
Util.addEvent = function (obj, evType, fn){
    if (obj.attachEvent){
        var r = obj.attachEvent("on"+evType, fn);
        return r;
    } else if (obj.addEventListener){
        obj.addEventListener(evType, fn, false); 
        return true;
    } else {
        throw("Handler could not be attached");
    }
};

Util.removeEvent = function(obj, evType, fn){
    if (obj.detachEvent){
        var r = obj.detachEvent("on"+evType, fn);
        return r;
    } else if (obj.removeEventListener){
        obj.removeEventListener(evType, fn, false);
        return true;
    } else {
        throw("Handler could not be removed");
    }
};

Util.stopEvent = function(e) {
    if (e.stopPropagation) { e.stopPropagation(); }
    else                   { e.cancelBubble = true; }

    if (e.preventDefault)  { e.preventDefault(); }
    else                   { e.returnValue = false; }
};


// Set browser engine versions. Based on mootools.
Util.Features = {xpath: !!(document.evaluate), air: !!(window.runtime), query: !!(document.querySelector)};

Util.Engine = {
    // Version detection break in Opera 11.60 (errors on arguments.callee.caller reference)
    //'presto': (function() {
    //         return (!window.opera) ? false : ((arguments.callee.caller) ? 960 : ((document.getElementsByClassName) ? 950 : 925)); }()),
    'presto': (function() { return (!window.opera) ? false : true; }()),

    'trident': (function() {
            return (!window.ActiveXObject) ? false : ((window.XMLHttpRequest) ? ((document.querySelectorAll) ? 6 : 5) : 4); }()),
    'webkit': (function() {
            try { return (navigator.taintEnabled) ? false : ((Util.Features.xpath) ? ((Util.Features.query) ? 525 : 420) : 419); } catch (e) { return false; } }()),
    //'webkit': (function() {
    //        return ((typeof navigator.taintEnabled !== "unknown") && navigator.taintEnabled) ? false : ((Util.Features.xpath) ? ((Util.Features.query) ? 525 : 420) : 419); }()),
    'gecko': (function() {
            return (!document.getBoxObjectFor && window.mozInnerScreenX == null) ? false : ((document.getElementsByClassName) ? 19 : 18); }())
};
if (Util.Engine.webkit) {
    // Extract actual webkit version if available
    Util.Engine.webkit = (function(v) {
            var re = new RegExp('WebKit/([0-9\.]*) ');
            v = (navigator.userAgent.match(re) || ['', v])[1];
            return parseFloat(v, 10);
        })(Util.Engine.webkit);
}

Util.Flash = (function(){
    var v, version;
    try {
        v = navigator.plugins['Shockwave Flash'].description;
    } catch(err1) {
        try {
            v = new ActiveXObject('ShockwaveFlash.ShockwaveFlash').GetVariable('$version');
        } catch(err2) {
            v = '0 r0';
        }
    }
    version = v.match(/\d+/g);
    return {version: parseInt(version[0] || 0 + '.' + version[1], 10) || 0, build: parseInt(version[2], 10) || 0};
}()); 
/*
 * noVNC: HTML5 VNC client
 * Copyright (C) 2011 Joel Martin
 * Licensed under LGPL-2 or any later version (see LICENSE.txt)
 */

/*jslint browser: true, white: false, bitwise: false */
/*global window, Util */


//
// Keyboard event handler
//

function Keyboard(defaults) {
//"use strict";

var that           = {},  // Public API methods
    conf           = {},  // Configuration attributes

    keyDownList    = [];         // List of depressed keys 
                                 // (even if they are happy)

// Configuration attributes
Util.conf_defaults(conf, that, defaults, [
    ['target',      'wo', 'dom',  document, 'DOM element that captures keyboard input'],
    ['focused',     'rw', 'bool', true, 'Capture and send key events'],

    ['onKeyPress',  'rw', 'func', null, 'Handler for key press/release']
    ]);


// 
// Private functions
//

// From the event keyCode return the keysym value for keys that need
// to be suppressed otherwise they may trigger unintended browser
// actions
function getKeysymSpecial(evt) {
    var keysym = null;

    switch ( evt.keyCode ) {
        // These generate a keyDown and keyPress in Firefox and Opera
        case 8         : keysym = 0xFF08; break; // BACKSPACE
        case 13        : keysym = 0xFF0D; break; // ENTER

        // This generates a keyDown and keyPress in Opera
        case 9         : keysym = 0xFF09; break; // TAB
        default        :                  break;
    }

    if (evt.type === 'keydown') {
        switch ( evt.keyCode ) {
            case 27        : keysym = 0xFF1B; break; // ESCAPE
            case 46        : keysym = 0xFFFF; break; // DELETE

            case 36        : keysym = 0xFF50; break; // HOME
            case 35        : keysym = 0xFF57; break; // END
            case 33        : keysym = 0xFF55; break; // PAGE_UP
            case 34        : keysym = 0xFF56; break; // PAGE_DOWN
            case 45        : keysym = 0xFF63; break; // INSERT
                                                     // '-' during keyPress
            case 37        : keysym = 0xFF51; break; // LEFT
            case 38        : keysym = 0xFF52; break; // UP
            case 39        : keysym = 0xFF53; break; // RIGHT
            case 40        : keysym = 0xFF54; break; // DOWN
            case 16        : keysym = 0xFFE1; break; // SHIFT
            case 17        : keysym = 0xFFE3; break; // CONTROL
            //case 18        : keysym = 0xFFE7; break; // Left Meta (Mac Option)
            case 18        : keysym = 0xFFE9; break; // Left ALT (Mac Command)

            case 112       : keysym = 0xFFBE; break; // F1
            case 113       : keysym = 0xFFBF; break; // F2
            case 114       : keysym = 0xFFC0; break; // F3
            case 115       : keysym = 0xFFC1; break; // F4
            case 116       : keysym = 0xFFC2; break; // F5
            case 117       : keysym = 0xFFC3; break; // F6
            case 118       : keysym = 0xFFC4; break; // F7
            case 119       : keysym = 0xFFC5; break; // F8
            case 120       : keysym = 0xFFC6; break; // F9
            case 121       : keysym = 0xFFC7; break; // F10
            case 122       : keysym = 0xFFC8; break; // F11
            case 123       : keysym = 0xFFC9; break; // F12

            default        :                  break;
        }
    }

    if ((!keysym) && (evt.ctrlKey || evt.altKey)) {
        if ((typeof(evt.which) !== "undefined") && (evt.which > 0)) {
            keysym = evt.which;
        } else {
            // IE9 always
            // Firefox and Opera when ctrl/alt + special
            Util.Warn("which not set, using keyCode");
            keysym = evt.keyCode;
        }

        /* Remap symbols */
        switch (keysym) {
            case 186       : keysym = 59; break; // ;  (IE)
            case 187       : keysym = 61; break; // =  (IE)
            case 188       : keysym = 44; break; // ,  (Mozilla, IE)
            case 109       :                     // -  (Mozilla, Opera)
                if (Util.Engine.gecko || Util.Engine.presto) {
                            keysym = 45; }
                                        break;
            case 189       : keysym = 45; break; // -  (IE)
            case 190       : keysym = 46; break; // .  (Mozilla, IE)
            case 191       : keysym = 47; break; // /  (Mozilla, IE)
            case 192       : keysym = 96; break; // `  (Mozilla, IE)
            case 219       : keysym = 91; break; // [  (Mozilla, IE)
            case 220       : keysym = 92; break; // \  (Mozilla, IE)
            case 221       : keysym = 93; break; // ]  (Mozilla, IE)
            case 222       : keysym = 39; break; // '  (Mozilla, IE)
        }
        
        /* Remap shifted and unshifted keys */
        if (!!evt.shiftKey) {
            switch (keysym) {
                case 48        : keysym = 41 ; break; // )  (shifted 0)
                case 49        : keysym = 33 ; break; // !  (shifted 1)
                case 50        : keysym = 64 ; break; // @  (shifted 2)
                case 51        : keysym = 35 ; break; // #  (shifted 3)
                case 52        : keysym = 36 ; break; // $  (shifted 4)
                case 53        : keysym = 37 ; break; // %  (shifted 5)
                case 54        : keysym = 94 ; break; // ^  (shifted 6)
                case 55        : keysym = 38 ; break; // &  (shifted 7)
                case 56        : keysym = 42 ; break; // *  (shifted 8)
                case 57        : keysym = 40 ; break; // (  (shifted 9)

                case 59        : keysym = 58 ; break; // :  (shifted `)
                case 61        : keysym = 43 ; break; // +  (shifted ;)
                case 44        : keysym = 60 ; break; // <  (shifted ,)
                case 45        : keysym = 95 ; break; // _  (shifted -)
                case 46        : keysym = 62 ; break; // >  (shifted .)
                case 47        : keysym = 63 ; break; // ?  (shifted /)
                case 96        : keysym = 126; break; // ~  (shifted `)
                case 91        : keysym = 123; break; // {  (shifted [)
                case 92        : keysym = 124; break; // |  (shifted \)
                case 93        : keysym = 125; break; // }  (shifted ])
                case 39        : keysym = 34 ; break; // "  (shifted ')
            }
        } else if ((keysym >= 65) && (keysym <=90)) {
            /* Remap unshifted A-Z */
            keysym += 32;
        } else if (evt.keyLocation === 3) {
            // numpad keys
            switch (keysym) {
                case 96 : keysym = 48; break; // 0
                case 97 : keysym = 49; break; // 1
                case 98 : keysym = 50; break; // 2
                case 99 : keysym = 51; break; // 3
                case 100: keysym = 52; break; // 4
                case 101: keysym = 53; break; // 5
                case 102: keysym = 54; break; // 6
                case 103: keysym = 55; break; // 7
                case 104: keysym = 56; break; // 8
                case 105: keysym = 57; break; // 9
                case 109: keysym = 45; break; // -
                case 110: keysym = 46; break; // .
                case 111: keysym = 47; break; // /
            }
        }
    }

    return keysym;
}

/* Translate DOM keyPress event to keysym value */
function getKeysym(evt) {
    var keysym, msg;

    if (typeof(evt.which) !== "undefined") {
        // WebKit, Firefox, Opera
        keysym = evt.which;
    } else {
        // IE9
        Util.Warn("which not set, using keyCode");
        keysym = evt.keyCode;
    }

    if ((keysym > 255) && (keysym < 0xFF00)) {
        msg = "Mapping character code " + keysym;
        // Map Unicode outside Latin 1 to X11 keysyms
        keysym = unicodeTable[keysym];
        if (typeof(keysym) === 'undefined') {
           keysym = 0; 
        }
        Util.Debug(msg + " to " + keysym);
    }

    return keysym;
}

function show_keyDownList(kind) {
    var c;
    var msg = "keyDownList (" + kind + "):\n";
    for (c = 0; c < keyDownList.length; c++) {
        msg = msg + "    " + c + " - keyCode: " + keyDownList[c].keyCode +
              " - which: " + keyDownList[c].which + "\n";
    }
    Util.Debug(msg);
}

function copyKeyEvent(evt) {
    var members = ['type', 'keyCode', 'charCode', 'which',
                   'altKey', 'ctrlKey', 'shiftKey',
                   'keyLocation', 'keyIdentifier'], i, obj = {};
    for (i = 0; i < members.length; i++) {
        if (typeof(evt[members[i]]) !== "undefined") {
            obj[members[i]] = evt[members[i]];
        }
    }
    return obj;
}

function pushKeyEvent(fevt) {
    keyDownList.push(fevt);
}

function getKeyEvent(keyCode, pop) {
    var i, fevt = null;
    for (i = keyDownList.length-1; i >= 0; i--) {
        if (keyDownList[i].keyCode === keyCode) {
            if ((typeof(pop) !== "undefined") && (pop)) {
                fevt = keyDownList.splice(i, 1)[0];
            } else {
                fevt = keyDownList[i];
            }
            break;
        }
    }
    return fevt;
}

function ignoreKeyEvent(evt) {
    // Blarg. Some keys have a different keyCode on keyDown vs keyUp
    if (evt.keyCode === 229) {
        // French AZERTY keyboard dead key.
        // Lame thing is that the respective keyUp is 219 so we can't
        // properly ignore the keyUp event
        return true;
    }
    return false;
}


//
// Key Event Handling:
//
// There are several challenges when dealing with key events:
//   - The meaning and use of keyCode, charCode and which depends on
//     both the browser and the event type (keyDown/Up vs keyPress).
//   - We cannot automatically determine the keyboard layout
//   - The keyDown and keyUp events have a keyCode value that has not
//     been translated by modifier keys.
//   - The keyPress event has a translated (for layout and modifiers)
//     character code but the attribute containing it differs. keyCode
//     contains the translated value in WebKit (Chrome/Safari), Opera
//     11 and IE9. charCode contains the value in WebKit and Firefox.
//     The which attribute contains the value on WebKit, Firefox and
//     Opera 11.
//   - The keyDown/Up keyCode value indicates (sort of) the physical
//     key was pressed but only for standard US layout. On a US
//     keyboard, the '-' and '_' characters are on the same key and
//     generate a keyCode value of 189. But on an AZERTY keyboard even
//     though they are different physical keys they both still
//     generate a keyCode of 189!
//   - To prevent a key event from propagating to the browser and
//     causing unwanted default actions (such as closing a tab,
//     opening a menu, shifting focus, etc) we must suppress this
//     event in both keyDown and keyPress because not all key strokes
//     generate on a keyPress event. Also, in WebKit and IE9
//     suppressing the keyDown prevents a keyPress but other browsers
//     still generated a keyPress even if keyDown is suppressed.
//
// For safe key events, we wait until the keyPress event before
// reporting a key down event. For unsafe key events, we report a key
// down event when the keyDown event fires and we suppress any further
// actions (including keyPress).
//
// In order to report a key up event that matches what we reported
// for the key down event, we keep a list of keys that are currently
// down. When the keyDown event happens, we add the key event to the
// list. If it is a safe key event, then we update the which attribute
// in the most recent item on the list when we received a keyPress
// event (keyPress should immediately follow keyDown). When we
// received a keyUp event we search for the event on the list with
// a matching keyCode and we report the character code using the value
// in the 'which' attribute that was stored with that key.
//

function onKeyDown(e) {
    if (! conf.focused) {
        return true;
    }
    var fevt = null, evt = (e ? e : window.event),
        keysym = null, suppress = false;
    //Util.Debug("onKeyDown kC:" + evt.keyCode + " cC:" + evt.charCode + " w:" + evt.which);

    fevt = copyKeyEvent(evt);

    keysym = getKeysymSpecial(evt);
    // Save keysym decoding for use in keyUp
    fevt.keysym = keysym;
    if (keysym) {
        // If it is a key or key combination that might trigger
        // browser behaviors or it has no corresponding keyPress
        // event, then send it immediately
        if (conf.onKeyPress && !ignoreKeyEvent(evt)) {
            Util.Debug("onKeyPress down, keysym: " + keysym +
                   " (onKeyDown key: " + evt.keyCode +
                   ", which: " + evt.which + ")");
            conf.onKeyPress(keysym, 1, evt);
        }
        suppress = true;
    }

    if (! ignoreKeyEvent(evt)) {
        // Add it to the list of depressed keys
        pushKeyEvent(fevt);
        //show_keyDownList('down');
    }

    if (suppress) {
        // Suppress bubbling/default actions
        Util.stopEvent(e);
        return false;
    } else {
        // Allow the event to bubble and become a keyPress event which
        // will have the character code translated
        return true;
    }
}

function onKeyPress(e) {
    if (! conf.focused) {
        return true;
    }
    var evt = (e ? e : window.event),
        kdlen = keyDownList.length, keysym = null;
    //Util.Debug("onKeyPress kC:" + evt.keyCode + " cC:" + evt.charCode + " w:" + evt.which);
    
    if (((evt.which !== "undefined") && (evt.which === 0)) ||
        (getKeysymSpecial(evt))) {
        // Firefox and Opera generate a keyPress event even if keyDown
        // is suppressed. But the keys we want to suppress will have
        // either:
        //     - the which attribute set to 0
        //     - getKeysymSpecial() will identify it
        Util.Debug("Ignoring special key in keyPress");
        Util.stopEvent(e);
        return false;
    }

    keysym = getKeysym(evt);

    // Modify the the which attribute in the depressed keys list so
    // that the keyUp event will be able to have the character code
    // translation available.
    if (kdlen > 0) {
        keyDownList[kdlen-1].keysym = keysym;
    } else {
        Util.Warn("keyDownList empty when keyPress triggered");
    }

    //show_keyDownList('press');
    
    // Send the translated keysym
    if (conf.onKeyPress && (keysym > 0)) {
        Util.Debug("onKeyPress down, keysym: " + keysym +
                   " (onKeyPress key: " + evt.keyCode +
                   ", which: " + evt.which + ")");
        conf.onKeyPress(keysym, 1, evt);
    }

    // Stop keypress events just in case
    Util.stopEvent(e);
    return false;
}

function onKeyUp(e) {
    if (! conf.focused) {
        return true;
    }
    var fevt = null, evt = (e ? e : window.event), keysym;
    //Util.Debug("onKeyUp   kC:" + evt.keyCode + " cC:" + evt.charCode + " w:" + evt.which);

    fevt = getKeyEvent(evt.keyCode, true);
    
    if (fevt) {
        keysym = fevt.keysym;
    } else {
        Util.Warn("Key event (keyCode = " + evt.keyCode +
                ") not found on keyDownList");
        keysym = 0;
    }

    //show_keyDownList('up');

    if (conf.onKeyPress && (keysym > 0)) {
        //Util.Debug("keyPress up,   keysym: " + keysym +
        //        " (key: " + evt.keyCode + ", which: " + evt.which + ")");
        Util.Debug("onKeyPress up, keysym: " + keysym +
                   " (onKeyPress key: " + evt.keyCode +
                   ", which: " + evt.which + ")");
        conf.onKeyPress(keysym, 0, evt);
    }
    Util.stopEvent(e);
    return false;
}

//
// Public API interface functions
//

that.grab = function() {
    //Util.Debug(">> Keyboard.grab");
    var c = conf.target;

    Util.addEvent(c, 'keydown', onKeyDown);
    Util.addEvent(c, 'keyup', onKeyUp);
    Util.addEvent(c, 'keypress', onKeyPress);

    //Util.Debug("<< Keyboard.grab");
};

that.ungrab = function() {
    //Util.Debug(">> Keyboard.ungrab");
    var c = conf.target;

    Util.removeEvent(c, 'keydown', onKeyDown);
    Util.removeEvent(c, 'keyup', onKeyUp);
    Util.removeEvent(c, 'keypress', onKeyPress);

    //Util.Debug(">> Keyboard.ungrab");
};

return that;  // Return the public API interface

}  // End of Keyboard()


//
// Mouse event handler
//

function Mouse(defaults) {
//"use strict";

var that           = {},  // Public API methods
    conf           = {};  // Configuration attributes

// Configuration attributes
Util.conf_defaults(conf, that, defaults, [
    ['target',         'ro', 'dom',  document, 'DOM element that captures mouse input'],
    ['focused',        'rw', 'bool', true, 'Capture and send mouse clicks/movement'],
    ['scale',          'rw', 'float', 1.0, 'Viewport scale factor 0.0 - 1.0'],

    ['onMouseButton',  'rw', 'func', null, 'Handler for mouse button click/release'],
    ['onMouseMove',    'rw', 'func', null, 'Handler for mouse movement'],
    ['touchButton',    'rw', 'int', 1, 'Button mask (1, 2, 4) for touch devices (0 means ignore clicks)']
    ]);


// 
// Private functions
//

function onMouseButton(e, down) {
    var evt, pos, bmask;
    if (! conf.focused) {
        return true;
    }
    evt = (e ? e : window.event);
    pos = Util.getEventPosition(e, conf.target, conf.scale);
    if (e.touches || e.changedTouches) {
        // Touch device
        bmask = conf.touchButton;
        // If bmask is set
    } else if (evt.which) {
        /* everything except IE */
        bmask = 1 << evt.button;
    } else {
        /* IE including 9 */
        bmask = (evt.button & 0x1) +      // Left
                (evt.button & 0x2) * 2 +  // Right
                (evt.button & 0x4) / 2;   // Middle
    }
    //Util.Debug("mouse " + pos.x + "," + pos.y + " down: " + down +
    //           " bmask: " + bmask + "(evt.button: " + evt.button + ")");
    if (bmask > 0 && conf.onMouseButton) {
        Util.Debug("onMouseButton " + (down ? "down" : "up") +
                   ", x: " + pos.x + ", y: " + pos.y + ", bmask: " + bmask);
        conf.onMouseButton(pos.x, pos.y, down, bmask);
    }
    Util.stopEvent(e);
    return false;
}

function onMouseDown(e) {
    onMouseButton(e, 1);
}

function onMouseUp(e) {
    onMouseButton(e, 0);
}

function onMouseWheel(e) {
    var evt, pos, bmask, wheelData;
    if (! conf.focused) {
        return true;
    }
    evt = (e ? e : window.event);
    pos = Util.getEventPosition(e, conf.target, conf.scale);
    wheelData = evt.detail ? evt.detail * -1 : evt.wheelDelta / 40;
    if (wheelData > 0) {
        bmask = 1 << 3;
    } else {
        bmask = 1 << 4;
    }
    //Util.Debug('mouse scroll by ' + wheelData + ':' + pos.x + "," + pos.y);
    if (conf.onMouseButton) {
        conf.onMouseButton(pos.x, pos.y, 1, bmask);
        conf.onMouseButton(pos.x, pos.y, 0, bmask);
    }
    Util.stopEvent(e);
    return false;
}

function onMouseMove(e) {
    var evt, pos;
    if (! conf.focused) {
        return true;
    }
    evt = (e ? e : window.event);
    pos = Util.getEventPosition(e, conf.target, conf.scale);
    //Util.Debug('mouse ' + evt.which + '/' + evt.button + ' up:' + pos.x + "," + pos.y);
    if (conf.onMouseMove) {
        conf.onMouseMove(pos.x, pos.y);
    }
    Util.stopEvent(e);
    return false;
}

function onMouseDisable(e) {
    var evt, pos;
    if (! conf.focused) {
        return true;
    }
    evt = (e ? e : window.event);
    pos = Util.getEventPosition(e, conf.target, conf.scale);
    /* Stop propagation if inside canvas area */
    if ((pos.x >= 0) && (pos.y >= 0) &&
        (pos.x < conf.target.offsetWidth) &&
        (pos.y < conf.target.offsetHeight)) {
        //Util.Debug("mouse event disabled");
        Util.stopEvent(e);
        return false;
    }
    //Util.Debug("mouse event not disabled");
    return true;
}

//
// Public API interface functions
//

that.grab = function() {
    //Util.Debug(">> Mouse.grab");
    var c = conf.target;

    if ('ontouchstart' in document.documentElement) {
        Util.addEvent(c, 'touchstart', onMouseDown);
        Util.addEvent(c, 'touchend', onMouseUp);
        Util.addEvent(c, 'touchmove', onMouseMove);
    } else {
        Util.addEvent(c, 'mousedown', onMouseDown);
        Util.addEvent(c, 'mouseup', onMouseUp);
        Util.addEvent(c, 'mousemove', onMouseMove);
        Util.addEvent(c, (Util.Engine.gecko) ? 'DOMMouseScroll' : 'mousewheel',
                onMouseWheel);
    }

    /* Work around right and middle click browser behaviors */
    Util.addEvent(document, 'click', onMouseDisable);
    Util.addEvent(document.body, 'contextmenu', onMouseDisable);

    //Util.Debug("<< Mouse.grab");
};

that.ungrab = function() {
    //Util.Debug(">> Mouse.ungrab");
    var c = conf.target;

    if ('ontouchstart' in document.documentElement) {
        Util.removeEvent(c, 'touchstart', onMouseDown);
        Util.removeEvent(c, 'touchend', onMouseUp);
        Util.removeEvent(c, 'touchmove', onMouseMove);
    } else {
        Util.removeEvent(c, 'mousedown', onMouseDown);
        Util.removeEvent(c, 'mouseup', onMouseUp);
        Util.removeEvent(c, 'mousemove', onMouseMove);
        Util.removeEvent(c, (Util.Engine.gecko) ? 'DOMMouseScroll' : 'mousewheel',
                onMouseWheel);
    }

    /* Work around right and middle click browser behaviors */
    Util.removeEvent(document, 'click', onMouseDisable);
    Util.removeEvent(document.body, 'contextmenu', onMouseDisable);

    //Util.Debug(">> Mouse.ungrab");
};

return that;  // Return the public API interface

}  // End of Mouse()


/*
 * Browser keypress to X11 keysym for Unicode characters > U+00FF
 */
unicodeTable = {
    0x0104 : 0x01a1,
    0x02D8 : 0x01a2,
    0x0141 : 0x01a3,
    0x013D : 0x01a5,
    0x015A : 0x01a6,
    0x0160 : 0x01a9,
    0x015E : 0x01aa,
    0x0164 : 0x01ab,
    0x0179 : 0x01ac,
    0x017D : 0x01ae,
    0x017B : 0x01af,
    0x0105 : 0x01b1,
    0x02DB : 0x01b2,
    0x0142 : 0x01b3,
    0x013E : 0x01b5,
    0x015B : 0x01b6,
    0x02C7 : 0x01b7,
    0x0161 : 0x01b9,
    0x015F : 0x01ba,
    0x0165 : 0x01bb,
    0x017A : 0x01bc,
    0x02DD : 0x01bd,
    0x017E : 0x01be,
    0x017C : 0x01bf,
    0x0154 : 0x01c0,
    0x0102 : 0x01c3,
    0x0139 : 0x01c5,
    0x0106 : 0x01c6,
    0x010C : 0x01c8,
    0x0118 : 0x01ca,
    0x011A : 0x01cc,
    0x010E : 0x01cf,
    0x0110 : 0x01d0,
    0x0143 : 0x01d1,
    0x0147 : 0x01d2,
    0x0150 : 0x01d5,
    0x0158 : 0x01d8,
    0x016E : 0x01d9,
    0x0170 : 0x01db,
    0x0162 : 0x01de,
    0x0155 : 0x01e0,
    0x0103 : 0x01e3,
    0x013A : 0x01e5,
    0x0107 : 0x01e6,
    0x010D : 0x01e8,
    0x0119 : 0x01ea,
    0x011B : 0x01ec,
    0x010F : 0x01ef,
    0x0111 : 0x01f0,
    0x0144 : 0x01f1,
    0x0148 : 0x01f2,
    0x0151 : 0x01f5,
    0x0171 : 0x01fb,
    0x0159 : 0x01f8,
    0x016F : 0x01f9,
    0x0163 : 0x01fe,
    0x02D9 : 0x01ff,
    0x0126 : 0x02a1,
    0x0124 : 0x02a6,
    0x0130 : 0x02a9,
    0x011E : 0x02ab,
    0x0134 : 0x02ac,
    0x0127 : 0x02b1,
    0x0125 : 0x02b6,
    0x0131 : 0x02b9,
    0x011F : 0x02bb,
    0x0135 : 0x02bc,
    0x010A : 0x02c5,
    0x0108 : 0x02c6,
    0x0120 : 0x02d5,
    0x011C : 0x02d8,
    0x016C : 0x02dd,
    0x015C : 0x02de,
    0x010B : 0x02e5,
    0x0109 : 0x02e6,
    0x0121 : 0x02f5,
    0x011D : 0x02f8,
    0x016D : 0x02fd,
    0x015D : 0x02fe,
    0x0138 : 0x03a2,
    0x0156 : 0x03a3,
    0x0128 : 0x03a5,
    0x013B : 0x03a6,
    0x0112 : 0x03aa,
    0x0122 : 0x03ab,
    0x0166 : 0x03ac,
    0x0157 : 0x03b3,
    0x0129 : 0x03b5,
    0x013C : 0x03b6,
    0x0113 : 0x03ba,
    0x0123 : 0x03bb,
    0x0167 : 0x03bc,
    0x014A : 0x03bd,
    0x014B : 0x03bf,
    0x0100 : 0x03c0,
    0x012E : 0x03c7,
    0x0116 : 0x03cc,
    0x012A : 0x03cf,
    0x0145 : 0x03d1,
    0x014C : 0x03d2,
    0x0136 : 0x03d3,
    0x0172 : 0x03d9,
    0x0168 : 0x03dd,
    0x016A : 0x03de,
    0x0101 : 0x03e0,
    0x012F : 0x03e7,
    0x0117 : 0x03ec,
    0x012B : 0x03ef,
    0x0146 : 0x03f1,
    0x014D : 0x03f2,
    0x0137 : 0x03f3,
    0x0173 : 0x03f9,
    0x0169 : 0x03fd,
    0x016B : 0x03fe,
    0x1E02 : 0x1001e02,
    0x1E03 : 0x1001e03,
    0x1E0A : 0x1001e0a,
    0x1E80 : 0x1001e80,
    0x1E82 : 0x1001e82,
    0x1E0B : 0x1001e0b,
    0x1EF2 : 0x1001ef2,
    0x1E1E : 0x1001e1e,
    0x1E1F : 0x1001e1f,
    0x1E40 : 0x1001e40,
    0x1E41 : 0x1001e41,
    0x1E56 : 0x1001e56,
    0x1E81 : 0x1001e81,
    0x1E57 : 0x1001e57,
    0x1E83 : 0x1001e83,
    0x1E60 : 0x1001e60,
    0x1EF3 : 0x1001ef3,
    0x1E84 : 0x1001e84,
    0x1E85 : 0x1001e85,
    0x1E61 : 0x1001e61,
    0x0174 : 0x1000174,
    0x1E6A : 0x1001e6a,
    0x0176 : 0x1000176,
    0x0175 : 0x1000175,
    0x1E6B : 0x1001e6b,
    0x0177 : 0x1000177,
    0x0152 : 0x13bc,
    0x0153 : 0x13bd,
    0x0178 : 0x13be,
    0x203E : 0x047e,
    0x3002 : 0x04a1,
    0x300C : 0x04a2,
    0x300D : 0x04a3,
    0x3001 : 0x04a4,
    0x30FB : 0x04a5,
    0x30F2 : 0x04a6,
    0x30A1 : 0x04a7,
    0x30A3 : 0x04a8,
    0x30A5 : 0x04a9,
    0x30A7 : 0x04aa,
    0x30A9 : 0x04ab,
    0x30E3 : 0x04ac,
    0x30E5 : 0x04ad,
    0x30E7 : 0x04ae,
    0x30C3 : 0x04af,
    0x30FC : 0x04b0,
    0x30A2 : 0x04b1,
    0x30A4 : 0x04b2,
    0x30A6 : 0x04b3,
    0x30A8 : 0x04b4,
    0x30AA : 0x04b5,
    0x30AB : 0x04b6,
    0x30AD : 0x04b7,
    0x30AF : 0x04b8,
    0x30B1 : 0x04b9,
    0x30B3 : 0x04ba,
    0x30B5 : 0x04bb,
    0x30B7 : 0x04bc,
    0x30B9 : 0x04bd,
    0x30BB : 0x04be,
    0x30BD : 0x04bf,
    0x30BF : 0x04c0,
    0x30C1 : 0x04c1,
    0x30C4 : 0x04c2,
    0x30C6 : 0x04c3,
    0x30C8 : 0x04c4,
    0x30CA : 0x04c5,
    0x30CB : 0x04c6,
    0x30CC : 0x04c7,
    0x30CD : 0x04c8,
    0x30CE : 0x04c9,
    0x30CF : 0x04ca,
    0x30D2 : 0x04cb,
    0x30D5 : 0x04cc,
    0x30D8 : 0x04cd,
    0x30DB : 0x04ce,
    0x30DE : 0x04cf,
    0x30DF : 0x04d0,
    0x30E0 : 0x04d1,
    0x30E1 : 0x04d2,
    0x30E2 : 0x04d3,
    0x30E4 : 0x04d4,
    0x30E6 : 0x04d5,
    0x30E8 : 0x04d6,
    0x30E9 : 0x04d7,
    0x30EA : 0x04d8,
    0x30EB : 0x04d9,
    0x30EC : 0x04da,
    0x30ED : 0x04db,
    0x30EF : 0x04dc,
    0x30F3 : 0x04dd,
    0x309B : 0x04de,
    0x309C : 0x04df,
    0x06F0 : 0x10006f0,
    0x06F1 : 0x10006f1,
    0x06F2 : 0x10006f2,
    0x06F3 : 0x10006f3,
    0x06F4 : 0x10006f4,
    0x06F5 : 0x10006f5,
    0x06F6 : 0x10006f6,
    0x06F7 : 0x10006f7,
    0x06F8 : 0x10006f8,
    0x06F9 : 0x10006f9,
    0x066A : 0x100066a,
    0x0670 : 0x1000670,
    0x0679 : 0x1000679,
    0x067E : 0x100067e,
    0x0686 : 0x1000686,
    0x0688 : 0x1000688,
    0x0691 : 0x1000691,
    0x060C : 0x05ac,
    0x06D4 : 0x10006d4,
    0x0660 : 0x1000660,
    0x0661 : 0x1000661,
    0x0662 : 0x1000662,
    0x0663 : 0x1000663,
    0x0664 : 0x1000664,
    0x0665 : 0x1000665,
    0x0666 : 0x1000666,
    0x0667 : 0x1000667,
    0x0668 : 0x1000668,
    0x0669 : 0x1000669,
    0x061B : 0x05bb,
    0x061F : 0x05bf,
    0x0621 : 0x05c1,
    0x0622 : 0x05c2,
    0x0623 : 0x05c3,
    0x0624 : 0x05c4,
    0x0625 : 0x05c5,
    0x0626 : 0x05c6,
    0x0627 : 0x05c7,
    0x0628 : 0x05c8,
    0x0629 : 0x05c9,
    0x062A : 0x05ca,
    0x062B : 0x05cb,
    0x062C : 0x05cc,
    0x062D : 0x05cd,
    0x062E : 0x05ce,
    0x062F : 0x05cf,
    0x0630 : 0x05d0,
    0x0631 : 0x05d1,
    0x0632 : 0x05d2,
    0x0633 : 0x05d3,
    0x0634 : 0x05d4,
    0x0635 : 0x05d5,
    0x0636 : 0x05d6,
    0x0637 : 0x05d7,
    0x0638 : 0x05d8,
    0x0639 : 0x05d9,
    0x063A : 0x05da,
    0x0640 : 0x05e0,
    0x0641 : 0x05e1,
    0x0642 : 0x05e2,
    0x0643 : 0x05e3,
    0x0644 : 0x05e4,
    0x0645 : 0x05e5,
    0x0646 : 0x05e6,
    0x0647 : 0x05e7,
    0x0648 : 0x05e8,
    0x0649 : 0x05e9,
    0x064A : 0x05ea,
    0x064B : 0x05eb,
    0x064C : 0x05ec,
    0x064D : 0x05ed,
    0x064E : 0x05ee,
    0x064F : 0x05ef,
    0x0650 : 0x05f0,
    0x0651 : 0x05f1,
    0x0652 : 0x05f2,
    0x0653 : 0x1000653,
    0x0654 : 0x1000654,
    0x0655 : 0x1000655,
    0x0698 : 0x1000698,
    0x06A4 : 0x10006a4,
    0x06A9 : 0x10006a9,
    0x06AF : 0x10006af,
    0x06BA : 0x10006ba,
    0x06BE : 0x10006be,
    0x06CC : 0x10006cc,
    0x06D2 : 0x10006d2,
    0x06C1 : 0x10006c1,
    0x0492 : 0x1000492,
    0x0493 : 0x1000493,
    0x0496 : 0x1000496,
    0x0497 : 0x1000497,
    0x049A : 0x100049a,
    0x049B : 0x100049b,
    0x049C : 0x100049c,
    0x049D : 0x100049d,
    0x04A2 : 0x10004a2,
    0x04A3 : 0x10004a3,
    0x04AE : 0x10004ae,
    0x04AF : 0x10004af,
    0x04B0 : 0x10004b0,
    0x04B1 : 0x10004b1,
    0x04B2 : 0x10004b2,
    0x04B3 : 0x10004b3,
    0x04B6 : 0x10004b6,
    0x04B7 : 0x10004b7,
    0x04B8 : 0x10004b8,
    0x04B9 : 0x10004b9,
    0x04BA : 0x10004ba,
    0x04BB : 0x10004bb,
    0x04D8 : 0x10004d8,
    0x04D9 : 0x10004d9,
    0x04E2 : 0x10004e2,
    0x04E3 : 0x10004e3,
    0x04E8 : 0x10004e8,
    0x04E9 : 0x10004e9,
    0x04EE : 0x10004ee,
    0x04EF : 0x10004ef,
    0x0452 : 0x06a1,
    0x0453 : 0x06a2,
    0x0451 : 0x06a3,
    0x0454 : 0x06a4,
    0x0455 : 0x06a5,
    0x0456 : 0x06a6,
    0x0457 : 0x06a7,
    0x0458 : 0x06a8,
    0x0459 : 0x06a9,
    0x045A : 0x06aa,
    0x045B : 0x06ab,
    0x045C : 0x06ac,
    0x0491 : 0x06ad,
    0x045E : 0x06ae,
    0x045F : 0x06af,
    0x2116 : 0x06b0,
    0x0402 : 0x06b1,
    0x0403 : 0x06b2,
    0x0401 : 0x06b3,
    0x0404 : 0x06b4,
    0x0405 : 0x06b5,
    0x0406 : 0x06b6,
    0x0407 : 0x06b7,
    0x0408 : 0x06b8,
    0x0409 : 0x06b9,
    0x040A : 0x06ba,
    0x040B : 0x06bb,
    0x040C : 0x06bc,
    0x0490 : 0x06bd,
    0x040E : 0x06be,
    0x040F : 0x06bf,
    0x044E : 0x06c0,
    0x0430 : 0x06c1,
    0x0431 : 0x06c2,
    0x0446 : 0x06c3,
    0x0434 : 0x06c4,
    0x0435 : 0x06c5,
    0x0444 : 0x06c6,
    0x0433 : 0x06c7,
    0x0445 : 0x06c8,
    0x0438 : 0x06c9,
    0x0439 : 0x06ca,
    0x043A : 0x06cb,
    0x043B : 0x06cc,
    0x043C : 0x06cd,
    0x043D : 0x06ce,
    0x043E : 0x06cf,
    0x043F : 0x06d0,
    0x044F : 0x06d1,
    0x0440 : 0x06d2,
    0x0441 : 0x06d3,
    0x0442 : 0x06d4,
    0x0443 : 0x06d5,
    0x0436 : 0x06d6,
    0x0432 : 0x06d7,
    0x044C : 0x06d8,
    0x044B : 0x06d9,
    0x0437 : 0x06da,
    0x0448 : 0x06db,
    0x044D : 0x06dc,
    0x0449 : 0x06dd,
    0x0447 : 0x06de,
    0x044A : 0x06df,
    0x042E : 0x06e0,
    0x0410 : 0x06e1,
    0x0411 : 0x06e2,
    0x0426 : 0x06e3,
    0x0414 : 0x06e4,
    0x0415 : 0x06e5,
    0x0424 : 0x06e6,
    0x0413 : 0x06e7,
    0x0425 : 0x06e8,
    0x0418 : 0x06e9,
    0x0419 : 0x06ea,
    0x041A : 0x06eb,
    0x041B : 0x06ec,
    0x041C : 0x06ed,
    0x041D : 0x06ee,
    0x041E : 0x06ef,
    0x041F : 0x06f0,
    0x042F : 0x06f1,
    0x0420 : 0x06f2,
    0x0421 : 0x06f3,
    0x0422 : 0x06f4,
    0x0423 : 0x06f5,
    0x0416 : 0x06f6,
    0x0412 : 0x06f7,
    0x042C : 0x06f8,
    0x042B : 0x06f9,
    0x0417 : 0x06fa,
    0x0428 : 0x06fb,
    0x042D : 0x06fc,
    0x0429 : 0x06fd,
    0x0427 : 0x06fe,
    0x042A : 0x06ff,
    0x0386 : 0x07a1,
    0x0388 : 0x07a2,
    0x0389 : 0x07a3,
    0x038A : 0x07a4,
    0x03AA : 0x07a5,
    0x038C : 0x07a7,
    0x038E : 0x07a8,
    0x03AB : 0x07a9,
    0x038F : 0x07ab,
    0x0385 : 0x07ae,
    0x2015 : 0x07af,
    0x03AC : 0x07b1,
    0x03AD : 0x07b2,
    0x03AE : 0x07b3,
    0x03AF : 0x07b4,
    0x03CA : 0x07b5,
    0x0390 : 0x07b6,
    0x03CC : 0x07b7,
    0x03CD : 0x07b8,
    0x03CB : 0x07b9,
    0x03B0 : 0x07ba,
    0x03CE : 0x07bb,
    0x0391 : 0x07c1,
    0x0392 : 0x07c2,
    0x0393 : 0x07c3,
    0x0394 : 0x07c4,
    0x0395 : 0x07c5,
    0x0396 : 0x07c6,
    0x0397 : 0x07c7,
    0x0398 : 0x07c8,
    0x0399 : 0x07c9,
    0x039A : 0x07ca,
    0x039B : 0x07cb,
    0x039C : 0x07cc,
    0x039D : 0x07cd,
    0x039E : 0x07ce,
    0x039F : 0x07cf,
    0x03A0 : 0x07d0,
    0x03A1 : 0x07d1,
    0x03A3 : 0x07d2,
    0x03A4 : 0x07d4,
    0x03A5 : 0x07d5,
    0x03A6 : 0x07d6,
    0x03A7 : 0x07d7,
    0x03A8 : 0x07d8,
    0x03A9 : 0x07d9,
    0x03B1 : 0x07e1,
    0x03B2 : 0x07e2,
    0x03B3 : 0x07e3,
    0x03B4 : 0x07e4,
    0x03B5 : 0x07e5,
    0x03B6 : 0x07e6,
    0x03B7 : 0x07e7,
    0x03B8 : 0x07e8,
    0x03B9 : 0x07e9,
    0x03BA : 0x07ea,
    0x03BB : 0x07eb,
    0x03BC : 0x07ec,
    0x03BD : 0x07ed,
    0x03BE : 0x07ee,
    0x03BF : 0x07ef,
    0x03C0 : 0x07f0,
    0x03C1 : 0x07f1,
    0x03C3 : 0x07f2,
    0x03C2 : 0x07f3,
    0x03C4 : 0x07f4,
    0x03C5 : 0x07f5,
    0x03C6 : 0x07f6,
    0x03C7 : 0x07f7,
    0x03C8 : 0x07f8,
    0x03C9 : 0x07f9,
    0x23B7 : 0x08a1,
    0x2320 : 0x08a4,
    0x2321 : 0x08a5,
    0x23A1 : 0x08a7,
    0x23A3 : 0x08a8,
    0x23A4 : 0x08a9,
    0x23A6 : 0x08aa,
    0x239B : 0x08ab,
    0x239D : 0x08ac,
    0x239E : 0x08ad,
    0x23A0 : 0x08ae,
    0x23A8 : 0x08af,
    0x23AC : 0x08b0,
    0x2264 : 0x08bc,
    0x2260 : 0x08bd,
    0x2265 : 0x08be,
    0x222B : 0x08bf,
    0x2234 : 0x08c0,
    0x221D : 0x08c1,
    0x221E : 0x08c2,
    0x2207 : 0x08c5,
    0x223C : 0x08c8,
    0x2243 : 0x08c9,
    0x21D4 : 0x08cd,
    0x21D2 : 0x08ce,
    0x2261 : 0x08cf,
    0x221A : 0x08d6,
    0x2282 : 0x08da,
    0x2283 : 0x08db,
    0x2229 : 0x08dc,
    0x222A : 0x08dd,
    0x2227 : 0x08de,
    0x2228 : 0x08df,
    0x2202 : 0x08ef,
    0x0192 : 0x08f6,
    0x2190 : 0x08fb,
    0x2191 : 0x08fc,
    0x2192 : 0x08fd,
    0x2193 : 0x08fe,
    0x25C6 : 0x09e0,
    0x2592 : 0x09e1,
    0x2409 : 0x09e2,
    0x240C : 0x09e3,
    0x240D : 0x09e4,
    0x240A : 0x09e5,
    0x2424 : 0x09e8,
    0x240B : 0x09e9,
    0x2518 : 0x09ea,
    0x2510 : 0x09eb,
    0x250C : 0x09ec,
    0x2514 : 0x09ed,
    0x253C : 0x09ee,
    0x23BA : 0x09ef,
    0x23BB : 0x09f0,
    0x2500 : 0x09f1,
    0x23BC : 0x09f2,
    0x23BD : 0x09f3,
    0x251C : 0x09f4,
    0x2524 : 0x09f5,
    0x2534 : 0x09f6,
    0x252C : 0x09f7,
    0x2502 : 0x09f8,
    0x2003 : 0x0aa1,
    0x2002 : 0x0aa2,
    0x2004 : 0x0aa3,
    0x2005 : 0x0aa4,
    0x2007 : 0x0aa5,
    0x2008 : 0x0aa6,
    0x2009 : 0x0aa7,
    0x200A : 0x0aa8,
    0x2014 : 0x0aa9,
    0x2013 : 0x0aaa,
    0x2026 : 0x0aae,
    0x2025 : 0x0aaf,
    0x2153 : 0x0ab0,
    0x2154 : 0x0ab1,
    0x2155 : 0x0ab2,
    0x2156 : 0x0ab3,
    0x2157 : 0x0ab4,
    0x2158 : 0x0ab5,
    0x2159 : 0x0ab6,
    0x215A : 0x0ab7,
    0x2105 : 0x0ab8,
    0x2012 : 0x0abb,
    0x215B : 0x0ac3,
    0x215C : 0x0ac4,
    0x215D : 0x0ac5,
    0x215E : 0x0ac6,
    0x2122 : 0x0ac9,
    0x2018 : 0x0ad0,
    0x2019 : 0x0ad1,
    0x201C : 0x0ad2,
    0x201D : 0x0ad3,
    0x211E : 0x0ad4,
    0x2032 : 0x0ad6,
    0x2033 : 0x0ad7,
    0x271D : 0x0ad9,
    0x2663 : 0x0aec,
    0x2666 : 0x0aed,
    0x2665 : 0x0aee,
    0x2720 : 0x0af0,
    0x2020 : 0x0af1,
    0x2021 : 0x0af2,
    0x2713 : 0x0af3,
    0x2717 : 0x0af4,
    0x266F : 0x0af5,
    0x266D : 0x0af6,
    0x2642 : 0x0af7,
    0x2640 : 0x0af8,
    0x260E : 0x0af9,
    0x2315 : 0x0afa,
    0x2117 : 0x0afb,
    0x2038 : 0x0afc,
    0x201A : 0x0afd,
    0x201E : 0x0afe,
    0x22A4 : 0x0bc2,
    0x230A : 0x0bc4,
    0x2218 : 0x0bca,
    0x2395 : 0x0bcc,
    0x22A5 : 0x0bce,
    0x25CB : 0x0bcf,
    0x2308 : 0x0bd3,
    0x22A3 : 0x0bdc,
    0x22A2 : 0x0bfc,
    0x2017 : 0x0cdf,
    0x05D0 : 0x0ce0,
    0x05D1 : 0x0ce1,
    0x05D2 : 0x0ce2,
    0x05D3 : 0x0ce3,
    0x05D4 : 0x0ce4,
    0x05D5 : 0x0ce5,
    0x05D6 : 0x0ce6,
    0x05D7 : 0x0ce7,
    0x05D8 : 0x0ce8,
    0x05D9 : 0x0ce9,
    0x05DA : 0x0cea,
    0x05DB : 0x0ceb,
    0x05DC : 0x0cec,
    0x05DD : 0x0ced,
    0x05DE : 0x0cee,
    0x05DF : 0x0cef,
    0x05E0 : 0x0cf0,
    0x05E1 : 0x0cf1,
    0x05E2 : 0x0cf2,
    0x05E3 : 0x0cf3,
    0x05E4 : 0x0cf4,
    0x05E5 : 0x0cf5,
    0x05E6 : 0x0cf6,
    0x05E7 : 0x0cf7,
    0x05E8 : 0x0cf8,
    0x05E9 : 0x0cf9,
    0x05EA : 0x0cfa,
    0x0E01 : 0x0da1,
    0x0E02 : 0x0da2,
    0x0E03 : 0x0da3,
    0x0E04 : 0x0da4,
    0x0E05 : 0x0da5,
    0x0E06 : 0x0da6,
    0x0E07 : 0x0da7,
    0x0E08 : 0x0da8,
    0x0E09 : 0x0da9,
    0x0E0A : 0x0daa,
    0x0E0B : 0x0dab,
    0x0E0C : 0x0dac,
    0x0E0D : 0x0dad,
    0x0E0E : 0x0dae,
    0x0E0F : 0x0daf,
    0x0E10 : 0x0db0,
    0x0E11 : 0x0db1,
    0x0E12 : 0x0db2,
    0x0E13 : 0x0db3,
    0x0E14 : 0x0db4,
    0x0E15 : 0x0db5,
    0x0E16 : 0x0db6,
    0x0E17 : 0x0db7,
    0x0E18 : 0x0db8,
    0x0E19 : 0x0db9,
    0x0E1A : 0x0dba,
    0x0E1B : 0x0dbb,
    0x0E1C : 0x0dbc,
    0x0E1D : 0x0dbd,
    0x0E1E : 0x0dbe,
    0x0E1F : 0x0dbf,
    0x0E20 : 0x0dc0,
    0x0E21 : 0x0dc1,
    0x0E22 : 0x0dc2,
    0x0E23 : 0x0dc3,
    0x0E24 : 0x0dc4,
    0x0E25 : 0x0dc5,
    0x0E26 : 0x0dc6,
    0x0E27 : 0x0dc7,
    0x0E28 : 0x0dc8,
    0x0E29 : 0x0dc9,
    0x0E2A : 0x0dca,
    0x0E2B : 0x0dcb,
    0x0E2C : 0x0dcc,
    0x0E2D : 0x0dcd,
    0x0E2E : 0x0dce,
    0x0E2F : 0x0dcf,
    0x0E30 : 0x0dd0,
    0x0E31 : 0x0dd1,
    0x0E32 : 0x0dd2,
    0x0E33 : 0x0dd3,
    0x0E34 : 0x0dd4,
    0x0E35 : 0x0dd5,
    0x0E36 : 0x0dd6,
    0x0E37 : 0x0dd7,
    0x0E38 : 0x0dd8,
    0x0E39 : 0x0dd9,
    0x0E3A : 0x0dda,
    0x0E3F : 0x0ddf,
    0x0E40 : 0x0de0,
    0x0E41 : 0x0de1,
    0x0E42 : 0x0de2,
    0x0E43 : 0x0de3,
    0x0E44 : 0x0de4,
    0x0E45 : 0x0de5,
    0x0E46 : 0x0de6,
    0x0E47 : 0x0de7,
    0x0E48 : 0x0de8,
    0x0E49 : 0x0de9,
    0x0E4A : 0x0dea,
    0x0E4B : 0x0deb,
    0x0E4C : 0x0dec,
    0x0E4D : 0x0ded,
    0x0E50 : 0x0df0,
    0x0E51 : 0x0df1,
    0x0E52 : 0x0df2,
    0x0E53 : 0x0df3,
    0x0E54 : 0x0df4,
    0x0E55 : 0x0df5,
    0x0E56 : 0x0df6,
    0x0E57 : 0x0df7,
    0x0E58 : 0x0df8,
    0x0E59 : 0x0df9,
    0x0587 : 0x1000587,
    0x0589 : 0x1000589,
    0x055D : 0x100055d,
    0x058A : 0x100058a,
    0x055C : 0x100055c,
    0x055B : 0x100055b,
    0x055E : 0x100055e,
    0x0531 : 0x1000531,
    0x0561 : 0x1000561,
    0x0532 : 0x1000532,
    0x0562 : 0x1000562,
    0x0533 : 0x1000533,
    0x0563 : 0x1000563,
    0x0534 : 0x1000534,
    0x0564 : 0x1000564,
    0x0535 : 0x1000535,
    0x0565 : 0x1000565,
    0x0536 : 0x1000536,
    0x0566 : 0x1000566,
    0x0537 : 0x1000537,
    0x0567 : 0x1000567,
    0x0538 : 0x1000538,
    0x0568 : 0x1000568,
    0x0539 : 0x1000539,
    0x0569 : 0x1000569,
    0x053A : 0x100053a,
    0x056A : 0x100056a,
    0x053B : 0x100053b,
    0x056B : 0x100056b,
    0x053C : 0x100053c,
    0x056C : 0x100056c,
    0x053D : 0x100053d,
    0x056D : 0x100056d,
    0x053E : 0x100053e,
    0x056E : 0x100056e,
    0x053F : 0x100053f,
    0x056F : 0x100056f,
    0x0540 : 0x1000540,
    0x0570 : 0x1000570,
    0x0541 : 0x1000541,
    0x0571 : 0x1000571,
    0x0542 : 0x1000542,
    0x0572 : 0x1000572,
    0x0543 : 0x1000543,
    0x0573 : 0x1000573,
    0x0544 : 0x1000544,
    0x0574 : 0x1000574,
    0x0545 : 0x1000545,
    0x0575 : 0x1000575,
    0x0546 : 0x1000546,
    0x0576 : 0x1000576,
    0x0547 : 0x1000547,
    0x0577 : 0x1000577,
    0x0548 : 0x1000548,
    0x0578 : 0x1000578,
    0x0549 : 0x1000549,
    0x0579 : 0x1000579,
    0x054A : 0x100054a,
    0x057A : 0x100057a,
    0x054B : 0x100054b,
    0x057B : 0x100057b,
    0x054C : 0x100054c,
    0x057C : 0x100057c,
    0x054D : 0x100054d,
    0x057D : 0x100057d,
    0x054E : 0x100054e,
    0x057E : 0x100057e,
    0x054F : 0x100054f,
    0x057F : 0x100057f,
    0x0550 : 0x1000550,
    0x0580 : 0x1000580,
    0x0551 : 0x1000551,
    0x0581 : 0x1000581,
    0x0552 : 0x1000552,
    0x0582 : 0x1000582,
    0x0553 : 0x1000553,
    0x0583 : 0x1000583,
    0x0554 : 0x1000554,
    0x0584 : 0x1000584,
    0x0555 : 0x1000555,
    0x0585 : 0x1000585,
    0x0556 : 0x1000556,
    0x0586 : 0x1000586,
    0x055A : 0x100055a,
    0x10D0 : 0x10010d0,
    0x10D1 : 0x10010d1,
    0x10D2 : 0x10010d2,
    0x10D3 : 0x10010d3,
    0x10D4 : 0x10010d4,
    0x10D5 : 0x10010d5,
    0x10D6 : 0x10010d6,
    0x10D7 : 0x10010d7,
    0x10D8 : 0x10010d8,
    0x10D9 : 0x10010d9,
    0x10DA : 0x10010da,
    0x10DB : 0x10010db,
    0x10DC : 0x10010dc,
    0x10DD : 0x10010dd,
    0x10DE : 0x10010de,
    0x10DF : 0x10010df,
    0x10E0 : 0x10010e0,
    0x10E1 : 0x10010e1,
    0x10E2 : 0x10010e2,
    0x10E3 : 0x10010e3,
    0x10E4 : 0x10010e4,
    0x10E5 : 0x10010e5,
    0x10E6 : 0x10010e6,
    0x10E7 : 0x10010e7,
    0x10E8 : 0x10010e8,
    0x10E9 : 0x10010e9,
    0x10EA : 0x10010ea,
    0x10EB : 0x10010eb,
    0x10EC : 0x10010ec,
    0x10ED : 0x10010ed,
    0x10EE : 0x10010ee,
    0x10EF : 0x10010ef,
    0x10F0 : 0x10010f0,
    0x10F1 : 0x10010f1,
    0x10F2 : 0x10010f2,
    0x10F3 : 0x10010f3,
    0x10F4 : 0x10010f4,
    0x10F5 : 0x10010f5,
    0x10F6 : 0x10010f6,
    0x1E8A : 0x1001e8a,
    0x012C : 0x100012c,
    0x01B5 : 0x10001b5,
    0x01E6 : 0x10001e6,
    0x01D2 : 0x10001d1,
    0x019F : 0x100019f,
    0x1E8B : 0x1001e8b,
    0x012D : 0x100012d,
    0x01B6 : 0x10001b6,
    0x01E7 : 0x10001e7,
    0x01D2 : 0x10001d2,
    0x0275 : 0x1000275,
    0x018F : 0x100018f,
    0x0259 : 0x1000259,
    0x1E36 : 0x1001e36,
    0x1E37 : 0x1001e37,
    0x1EA0 : 0x1001ea0,
    0x1EA1 : 0x1001ea1,
    0x1EA2 : 0x1001ea2,
    0x1EA3 : 0x1001ea3,
    0x1EA4 : 0x1001ea4,
    0x1EA5 : 0x1001ea5,
    0x1EA6 : 0x1001ea6,
    0x1EA7 : 0x1001ea7,
    0x1EA8 : 0x1001ea8,
    0x1EA9 : 0x1001ea9,
    0x1EAA : 0x1001eaa,
    0x1EAB : 0x1001eab,
    0x1EAC : 0x1001eac,
    0x1EAD : 0x1001ead,
    0x1EAE : 0x1001eae,
    0x1EAF : 0x1001eaf,
    0x1EB0 : 0x1001eb0,
    0x1EB1 : 0x1001eb1,
    0x1EB2 : 0x1001eb2,
    0x1EB3 : 0x1001eb3,
    0x1EB4 : 0x1001eb4,
    0x1EB5 : 0x1001eb5,
    0x1EB6 : 0x1001eb6,
    0x1EB7 : 0x1001eb7,
    0x1EB8 : 0x1001eb8,
    0x1EB9 : 0x1001eb9,
    0x1EBA : 0x1001eba,
    0x1EBB : 0x1001ebb,
    0x1EBC : 0x1001ebc,
    0x1EBD : 0x1001ebd,
    0x1EBE : 0x1001ebe,
    0x1EBF : 0x1001ebf,
    0x1EC0 : 0x1001ec0,
    0x1EC1 : 0x1001ec1,
    0x1EC2 : 0x1001ec2,
    0x1EC3 : 0x1001ec3,
    0x1EC4 : 0x1001ec4,
    0x1EC5 : 0x1001ec5,
    0x1EC6 : 0x1001ec6,
    0x1EC7 : 0x1001ec7,
    0x1EC8 : 0x1001ec8,
    0x1EC9 : 0x1001ec9,
    0x1ECA : 0x1001eca,
    0x1ECB : 0x1001ecb,
    0x1ECC : 0x1001ecc,
    0x1ECD : 0x1001ecd,
    0x1ECE : 0x1001ece,
    0x1ECF : 0x1001ecf,
    0x1ED0 : 0x1001ed0,
    0x1ED1 : 0x1001ed1,
    0x1ED2 : 0x1001ed2,
    0x1ED3 : 0x1001ed3,
    0x1ED4 : 0x1001ed4,
    0x1ED5 : 0x1001ed5,
    0x1ED6 : 0x1001ed6,
    0x1ED7 : 0x1001ed7,
    0x1ED8 : 0x1001ed8,
    0x1ED9 : 0x1001ed9,
    0x1EDA : 0x1001eda,
    0x1EDB : 0x1001edb,
    0x1EDC : 0x1001edc,
    0x1EDD : 0x1001edd,
    0x1EDE : 0x1001ede,
    0x1EDF : 0x1001edf,
    0x1EE0 : 0x1001ee0,
    0x1EE1 : 0x1001ee1,
    0x1EE2 : 0x1001ee2,
    0x1EE3 : 0x1001ee3,
    0x1EE4 : 0x1001ee4,
    0x1EE5 : 0x1001ee5,
    0x1EE6 : 0x1001ee6,
    0x1EE7 : 0x1001ee7,
    0x1EE8 : 0x1001ee8,
    0x1EE9 : 0x1001ee9,
    0x1EEA : 0x1001eea,
    0x1EEB : 0x1001eeb,
    0x1EEC : 0x1001eec,
    0x1EED : 0x1001eed,
    0x1EEE : 0x1001eee,
    0x1EEF : 0x1001eef,
    0x1EF0 : 0x1001ef0,
    0x1EF1 : 0x1001ef1,
    0x1EF4 : 0x1001ef4,
    0x1EF5 : 0x1001ef5,
    0x1EF6 : 0x1001ef6,
    0x1EF7 : 0x1001ef7,
    0x1EF8 : 0x1001ef8,
    0x1EF9 : 0x1001ef9,
    0x01A0 : 0x10001a0,
    0x01A1 : 0x10001a1,
    0x01AF : 0x10001af,
    0x01B0 : 0x10001b0,
    0x20A0 : 0x10020a0,
    0x20A1 : 0x10020a1,
    0x20A2 : 0x10020a2,
    0x20A3 : 0x10020a3,
    0x20A4 : 0x10020a4,
    0x20A5 : 0x10020a5,
    0x20A6 : 0x10020a6,
    0x20A7 : 0x10020a7,
    0x20A8 : 0x10020a8,
    0x20A9 : 0x10020a9,
    0x20AA : 0x10020aa,
    0x20AB : 0x10020ab,
    0x20AC : 0x20ac,
    0x2070 : 0x1002070,
    0x2074 : 0x1002074,
    0x2075 : 0x1002075,
    0x2076 : 0x1002076,
    0x2077 : 0x1002077,
    0x2078 : 0x1002078,
    0x2079 : 0x1002079,
    0x2080 : 0x1002080,
    0x2081 : 0x1002081,
    0x2082 : 0x1002082,
    0x2083 : 0x1002083,
    0x2084 : 0x1002084,
    0x2085 : 0x1002085,
    0x2086 : 0x1002086,
    0x2087 : 0x1002087,
    0x2088 : 0x1002088,
    0x2089 : 0x1002089,
    0x2202 : 0x1002202,
    0x2205 : 0x1002205,
    0x2208 : 0x1002208,
    0x2209 : 0x1002209,
    0x220B : 0x100220B,
    0x221A : 0x100221A,
    0x221B : 0x100221B,
    0x221C : 0x100221C,
    0x222C : 0x100222C,
    0x222D : 0x100222D,
    0x2235 : 0x1002235,
    0x2245 : 0x1002248,
    0x2247 : 0x1002247,
    0x2262 : 0x1002262,
    0x2263 : 0x1002263,
    0x2800 : 0x1002800,
    0x2801 : 0x1002801,
    0x2802 : 0x1002802,
    0x2803 : 0x1002803,
    0x2804 : 0x1002804,
    0x2805 : 0x1002805,
    0x2806 : 0x1002806,
    0x2807 : 0x1002807,
    0x2808 : 0x1002808,
    0x2809 : 0x1002809,
    0x280a : 0x100280a,
    0x280b : 0x100280b,
    0x280c : 0x100280c,
    0x280d : 0x100280d,
    0x280e : 0x100280e,
    0x280f : 0x100280f,
    0x2810 : 0x1002810,
    0x2811 : 0x1002811,
    0x2812 : 0x1002812,
    0x2813 : 0x1002813,
    0x2814 : 0x1002814,
    0x2815 : 0x1002815,
    0x2816 : 0x1002816,
    0x2817 : 0x1002817,
    0x2818 : 0x1002818,
    0x2819 : 0x1002819,
    0x281a : 0x100281a,
    0x281b : 0x100281b,
    0x281c : 0x100281c,
    0x281d : 0x100281d,
    0x281e : 0x100281e,
    0x281f : 0x100281f,
    0x2820 : 0x1002820,
    0x2821 : 0x1002821,
    0x2822 : 0x1002822,
    0x2823 : 0x1002823,
    0x2824 : 0x1002824,
    0x2825 : 0x1002825,
    0x2826 : 0x1002826,
    0x2827 : 0x1002827,
    0x2828 : 0x1002828,
    0x2829 : 0x1002829,
    0x282a : 0x100282a,
    0x282b : 0x100282b,
    0x282c : 0x100282c,
    0x282d : 0x100282d,
    0x282e : 0x100282e,
    0x282f : 0x100282f,
    0x2830 : 0x1002830,
    0x2831 : 0x1002831,
    0x2832 : 0x1002832,
    0x2833 : 0x1002833,
    0x2834 : 0x1002834,
    0x2835 : 0x1002835,
    0x2836 : 0x1002836,
    0x2837 : 0x1002837,
    0x2838 : 0x1002838,
    0x2839 : 0x1002839,
    0x283a : 0x100283a,
    0x283b : 0x100283b,
    0x283c : 0x100283c,
    0x283d : 0x100283d,
    0x283e : 0x100283e,
    0x283f : 0x100283f,
    0x2840 : 0x1002840,
    0x2841 : 0x1002841,
    0x2842 : 0x1002842,
    0x2843 : 0x1002843,
    0x2844 : 0x1002844,
    0x2845 : 0x1002845,
    0x2846 : 0x1002846,
    0x2847 : 0x1002847,
    0x2848 : 0x1002848,
    0x2849 : 0x1002849,
    0x284a : 0x100284a,
    0x284b : 0x100284b,
    0x284c : 0x100284c,
    0x284d : 0x100284d,
    0x284e : 0x100284e,
    0x284f : 0x100284f,
    0x2850 : 0x1002850,
    0x2851 : 0x1002851,
    0x2852 : 0x1002852,
    0x2853 : 0x1002853,
    0x2854 : 0x1002854,
    0x2855 : 0x1002855,
    0x2856 : 0x1002856,
    0x2857 : 0x1002857,
    0x2858 : 0x1002858,
    0x2859 : 0x1002859,
    0x285a : 0x100285a,
    0x285b : 0x100285b,
    0x285c : 0x100285c,
    0x285d : 0x100285d,
    0x285e : 0x100285e,
    0x285f : 0x100285f,
    0x2860 : 0x1002860,
    0x2861 : 0x1002861,
    0x2862 : 0x1002862,
    0x2863 : 0x1002863,
    0x2864 : 0x1002864,
    0x2865 : 0x1002865,
    0x2866 : 0x1002866,
    0x2867 : 0x1002867,
    0x2868 : 0x1002868,
    0x2869 : 0x1002869,
    0x286a : 0x100286a,
    0x286b : 0x100286b,
    0x286c : 0x100286c,
    0x286d : 0x100286d,
    0x286e : 0x100286e,
    0x286f : 0x100286f,
    0x2870 : 0x1002870,
    0x2871 : 0x1002871,
    0x2872 : 0x1002872,
    0x2873 : 0x1002873,
    0x2874 : 0x1002874,
    0x2875 : 0x1002875,
    0x2876 : 0x1002876,
    0x2877 : 0x1002877,
    0x2878 : 0x1002878,
    0x2879 : 0x1002879,
    0x287a : 0x100287a,
    0x287b : 0x100287b,
    0x287c : 0x100287c,
    0x287d : 0x100287d,
    0x287e : 0x100287e,
    0x287f : 0x100287f,
    0x2880 : 0x1002880,
    0x2881 : 0x1002881,
    0x2882 : 0x1002882,
    0x2883 : 0x1002883,
    0x2884 : 0x1002884,
    0x2885 : 0x1002885,
    0x2886 : 0x1002886,
    0x2887 : 0x1002887,
    0x2888 : 0x1002888,
    0x2889 : 0x1002889,
    0x288a : 0x100288a,
    0x288b : 0x100288b,
    0x288c : 0x100288c,
    0x288d : 0x100288d,
    0x288e : 0x100288e,
    0x288f : 0x100288f,
    0x2890 : 0x1002890,
    0x2891 : 0x1002891,
    0x2892 : 0x1002892,
    0x2893 : 0x1002893,
    0x2894 : 0x1002894,
    0x2895 : 0x1002895,
    0x2896 : 0x1002896,
    0x2897 : 0x1002897,
    0x2898 : 0x1002898,
    0x2899 : 0x1002899,
    0x289a : 0x100289a,
    0x289b : 0x100289b,
    0x289c : 0x100289c,
    0x289d : 0x100289d,
    0x289e : 0x100289e,
    0x289f : 0x100289f,
    0x28a0 : 0x10028a0,
    0x28a1 : 0x10028a1,
    0x28a2 : 0x10028a2,
    0x28a3 : 0x10028a3,
    0x28a4 : 0x10028a4,
    0x28a5 : 0x10028a5,
    0x28a6 : 0x10028a6,
    0x28a7 : 0x10028a7,
    0x28a8 : 0x10028a8,
    0x28a9 : 0x10028a9,
    0x28aa : 0x10028aa,
    0x28ab : 0x10028ab,
    0x28ac : 0x10028ac,
    0x28ad : 0x10028ad,
    0x28ae : 0x10028ae,
    0x28af : 0x10028af,
    0x28b0 : 0x10028b0,
    0x28b1 : 0x10028b1,
    0x28b2 : 0x10028b2,
    0x28b3 : 0x10028b3,
    0x28b4 : 0x10028b4,
    0x28b5 : 0x10028b5,
    0x28b6 : 0x10028b6,
    0x28b7 : 0x10028b7,
    0x28b8 : 0x10028b8,
    0x28b9 : 0x10028b9,
    0x28ba : 0x10028ba,
    0x28bb : 0x10028bb,
    0x28bc : 0x10028bc,
    0x28bd : 0x10028bd,
    0x28be : 0x10028be,
    0x28bf : 0x10028bf,
    0x28c0 : 0x10028c0,
    0x28c1 : 0x10028c1,
    0x28c2 : 0x10028c2,
    0x28c3 : 0x10028c3,
    0x28c4 : 0x10028c4,
    0x28c5 : 0x10028c5,
    0x28c6 : 0x10028c6,
    0x28c7 : 0x10028c7,
    0x28c8 : 0x10028c8,
    0x28c9 : 0x10028c9,
    0x28ca : 0x10028ca,
    0x28cb : 0x10028cb,
    0x28cc : 0x10028cc,
    0x28cd : 0x10028cd,
    0x28ce : 0x10028ce,
    0x28cf : 0x10028cf,
    0x28d0 : 0x10028d0,
    0x28d1 : 0x10028d1,
    0x28d2 : 0x10028d2,
    0x28d3 : 0x10028d3,
    0x28d4 : 0x10028d4,
    0x28d5 : 0x10028d5,
    0x28d6 : 0x10028d6,
    0x28d7 : 0x10028d7,
    0x28d8 : 0x10028d8,
    0x28d9 : 0x10028d9,
    0x28da : 0x10028da,
    0x28db : 0x10028db,
    0x28dc : 0x10028dc,
    0x28dd : 0x10028dd,
    0x28de : 0x10028de,
    0x28df : 0x10028df,
    0x28e0 : 0x10028e0,
    0x28e1 : 0x10028e1,
    0x28e2 : 0x10028e2,
    0x28e3 : 0x10028e3, 
    0x28e4 : 0x10028e4,
    0x28e5 : 0x10028e5,
    0x28e6 : 0x10028e6,
    0x28e7 : 0x10028e7,
    0x28e8 : 0x10028e8,
    0x28e9 : 0x10028e9,
    0x28ea : 0x10028ea,
    0x28eb : 0x10028eb,
    0x28ec : 0x10028ec,
    0x28ed : 0x10028ed,
    0x28ee : 0x10028ee,
    0x28ef : 0x10028ef,
    0x28f0 : 0x10028f0,
    0x28f1 : 0x10028f1,
    0x28f2 : 0x10028f2,
    0x28f3 : 0x10028f3,
    0x28f4 : 0x10028f4,
    0x28f5 : 0x10028f5,
    0x28f6 : 0x10028f6,
    0x28f7 : 0x10028f7,
    0x28f8 : 0x10028f8,
    0x28f9 : 0x10028f9,
    0x28fa : 0x10028fa,
    0x28fb : 0x10028fb,
    0x28fc : 0x10028fc,
    0x28fd : 0x10028fd,
    0x28fe : 0x10028fe,
    0x28ff : 0x10028ff
};
/**
 * See LICENSE file.
 *
 * Library namespace.
 * CAAT stands for: Canvas Advanced Animation Tookit.
 */

/**
 * @namespace
 */
var CAAT= CAAT || {};

/**
 * Common bind function. Allows to set an object's function as callback. Set for every function in the
 * javascript context.
 */
Function.prototype.bind= Function.prototype.bind || function() {
    var fn=     this;                                   // the function
    var args=   Array.prototype.slice.call(arguments);  // copy the arguments.
    var obj=    args.shift();                           // first parameter will be context 'this'
    return function() {
        return fn.apply(
                obj,
                args.concat(Array.prototype.slice.call(arguments)));
    }
};
CAAT.__CSS__=1;
/**
 * See LICENSE file.
 *
 * Extend a prototype with another to form a classical OOP inheritance procedure.
 *
 * @param subc {object} Prototype to define the base class
 * @param superc {object} Prototype to be extended (derived class).
 */
function extend(subc, superc) {
    var subcp = subc.prototype;

    // Class pattern.
    var F = function() {
    };
    F.prototype = superc.prototype;

    subc.prototype = new F();       // chain prototypes.
    subc.superclass = superc.prototype;
    subc.prototype.constructor = subc;

    // Reset constructor. See Object Oriented Javascript for an in-depth explanation of this.
    if (superc.prototype.constructor === Object.prototype.constructor) {
        superc.prototype.constructor = superc;
    }

    // los metodos de superc, que no esten en esta clase, crear un metodo que
    // llama al metodo de superc.
    for (var method in subcp) {
        if (subcp.hasOwnProperty(method)) {
            subc.prototype[method] = subcp[method];

/**
 * Sintactic sugar to add a __super attribute on every overriden method.
 * Despite comvenient, it slows things down by 5fps.
 *
 * Uncomment at your own risk.
 *
            // tenemos en super un metodo con igual nombre.
            if ( superc.prototype[method]) {
                subc.prototype[method]= (function(fn, fnsuper) {
                    return function() {
                        var prevMethod= this.__super;

                        this.__super= fnsuper;

                        var retValue= fn.apply(
                                this,
                                Array.prototype.slice.call(arguments) );

                        this.__super= prevMethod;

                        return retValue;
                    };
                })(subc.prototype[method], superc.prototype[method]);
            }
            */
        }
    }
}

/**
 * Dynamic Proxy for an object or wrap/decorate a function.
 *
 * @param object
 * @param preMethod
 * @param postMethod
 * @param errorMethod
 */
function proxy(object, preMethod, postMethod, errorMethod) {

    // proxy a function
    if ( typeof object==='function' ) {

        if ( object.__isProxy ) {
            return object;
        }

        return (function(fn) {
            var proxyfn= function() {
                if ( preMethod ) {
                    preMethod({
                            fn: fn,
                            arguments:  Array.prototype.slice.call(arguments)} );
                }
                var retValue= null;
                try {
                    // apply original function call with itself as context
                    retValue= fn.apply(fn, Array.prototype.slice.call(arguments));
                    // everything went right on function call, then call
                    // post-method hook if present
                    if ( postMethod ) {
                        postMethod({
                                fn: fn,
                                arguments:  Array.prototype.slice.call(arguments)} );
                    }
                } catch(e) {
                    // an exeception was thrown, call exception-method hook if
                    // present and return its result as execution result.
                    if( errorMethod ) {
                        retValue= errorMethod({
                            fn: fn,
                            arguments:  Array.prototype.slice.call(arguments),
                            exception:  e} );
                    } else {
                        // since there's no error hook, just throw the exception
                        throw e;
                    }
                }

                // return original returned value to the caller.
                return retValue;
            };
            proxyfn.__isProxy= true;
            return proxyfn;

        })(object);
    }

    /**
     * If not a function then only non privitive objects can be proxied.
     * If it is a previously created proxy, return the proxy itself.
     */
    if ( !typeof object==='object' ||
            object.constructor===Array ||
            object.constructor===String ||
            object.__isProxy ) {

        return object;
    }

    // Our proxy object class.
    var cproxy= function() {};
    // A new proxy instance.
    var proxy= new cproxy();
    // hold the proxied object as member. Needed to assign proper
    // context on proxy method call.
    proxy.__object= object;
    proxy.__isProxy= true;

    // For every element in the object to be proxied
    for( var method in object ) {
        // only function members
        if ( typeof object[method]==='function' ) {
            // add to the proxy object a method of equal signature to the
            // method present at the object to be proxied.
            // cache references of object, function and function name.
            proxy[method]= (function(proxy,fn,method) {
                return function() {
                    // call pre-method hook if present.
                    if ( preMethod ) {
                        preMethod({
                                object:     proxy.__object,
                                method:     method,
                                arguments:  Array.prototype.slice.call(arguments)} );
                    }
                    var retValue= null;
                    try {
                        // apply original object call with proxied object as
                        // function context.
                        retValue= fn.apply( proxy.__object, arguments );
                        // everything went right on function call, the call
                        // post-method hook if present
                        if ( postMethod ) {
                            postMethod({
                                    object:     proxy.__object,
                                    method:     method,
                                    arguments:  Array.prototype.slice.call(arguments)} );
                        }
                    } catch(e) {
                        // an exeception was thrown, call exception-method hook if
                        // present and return its result as execution result.
                        if( errorMethod ) {
                            retValue= errorMethod({
                                object:     proxy.__object,
                                method:     method,
                                arguments:  Array.prototype.slice.call(arguments),
                                exception:  e} );
                        } else {
                            // since there's no error hook, just throw the exception
                            throw e;
                        }
                    }

                    // return original returned value to the caller.
                    return retValue;
                };
            })(proxy,object[method],method);
        }
    }

    // return our newly created and populated of functions proxy object.
    return proxy;
}

/** proxy sample usage

var c0= new Meetup.C1(5);

var cp1= proxy(
        c1,
        function() {
            console.log('pre method on object: ',
                    arguments[0].object.toString(),
                    arguments[0].method,
                    arguments[0].arguments );
        },
        function() {
            console.log('post method on object: ',
                    arguments[0].object.toString(),
                    arguments[0].method,
                    arguments[0].arguments );

        },
        function() {
            console.log('exception on object: ',
                    arguments[0].object.toString(),
                    arguments[0].method,
                    arguments[0].arguments,
                    arguments[0].exception);

            return -1;
        });
 **//**
 * See LICENSE file.
 *
 * Manages every Actor affine transformations.
 * Take into account that Canvas' renderingContext computes postive rotation clockwise, so hacks
 * to handle it properly are hardcoded.
 *
 * Contained classes are CAAT.Matrix and CAAT.MatrixStack.
 *
 **/

(function() {

    /**
     *
     * Define a matrix to hold three dimensional affine transforms.
     *
     * @constructor
     */
    CAAT.Matrix3= function() {
        this.matrix= [
            [1,0,0,0],
            [0,1,0,0],
            [0,0,1,0],
            [0,0,0,1]
        ];

        this.fmatrix= [1,0,0,0,  0,1,0,0,  0,0,1,0,  0,0,0,1];
        
        return this;
    };

    CAAT.Matrix3.prototype= {
        matrix: null,
        fmatrix:null,

        transformCoord : function(point) {
			var x= point.x;
			var y= point.y;
            var z= point.z;

            point.x= x*this.matrix[0][0] + y*this.matrix[0][1] + z*this.matrix[0][2] + this.matrix[0][3];
            point.y= x*this.matrix[1][0] + y*this.matrix[1][1] + z*this.matrix[1][2] + this.matrix[1][3];
            point.z= x*this.matrix[2][0] + y*this.matrix[2][1] + z*this.matrix[2][2] + this.matrix[2][3];

			return point;
		},
	    initialize : function( x0,y0,z0, x1,y1,z1, x2,y2,z2 ) {
		    this.identity( );
		    this.matrix[0][0]= x0;
            this.matrix[0][1]= y0;
            this.matrix[0][2]= z0;

		    this.matrix[1][0]= x1;
            this.matrix[1][1]= y1;
            this.matrix[1][2]= z1;

            this.matrix[2][0]= x2;
            this.matrix[2][1]= y2;
            this.matrix[2][2]= z2;

            return this;
	    },
        initWithMatrix : function(matrixData) {
            this.matrix= matrixData;
            return this;
        },
        flatten : function() {
            var d= this.fmatrix;
            var s= this.matrix;
            d[ 0]= s[0][0];
            d[ 1]= s[1][0];
            d[ 2]= s[2][0];
            d[ 3]= s[3][0];

            d[ 4]= s[0][1];
            d[ 5]= s[1][1];
            d[ 6]= s[2][1];
            d[ 7]= s[2][1];

            d[ 8]= s[0][2];
            d[ 9]= s[1][2];
            d[10]= s[2][2];
            d[11]= s[3][2];

            d[12]= s[0][3];
            d[13]= s[1][3];
            d[14]= s[2][3];
            d[15]= s[3][3];
            
            return this.fmatrix;
        },

        /**
         * Set this matrix to identity matrix.
         * @return this
         */
	    identity : function() {
		    for( var i=0; i<4; i++ ) {
			    for( var j=0; j<4; j++ ) {
				    this.matrix[i][j]= (i===j) ? 1.0 : 0.0;
                }
            }

            return this;
	    },
        /**
         * Get this matri'x internal representation data. The bakced structure is a 4x4 array of number.
         */
        getMatrix : function() {
            return this.matrix;
        },
        /**
         * Multiply this matrix by a created rotation matrix. The rotation matrix is set up to rotate around
         * xy axis.
         *
         * @param xy {Number} radians to rotate.
         *
         * @return this
         */
	    rotateXY : function( xy ) {
		    return this.rotate( xy, 0, 0 );
	    },
        /**
         * Multiply this matrix by a created rotation matrix. The rotation matrix is set up to rotate around
         * xz axis.
         *
         * @param xz {Number} radians to rotate.
         *
         * @return this
         */
	    rotateXZ : function( xz ) {
		    return this.rotate( 0, xz, 0 );
	    },
        /**
         * Multiply this matrix by a created rotation matrix. The rotation matrix is set up to rotate aroind
         * yz axis.
         *
         * @param yz {Number} radians to rotate.
         *
         * @return this
         */
	    rotateYZ : function( yz ) {
		    return this.rotate( 0, 0, yz );
	    },
        /**
         * 
         * @param xy
         * @param xz
         * @param yz
         */
        setRotate : function( xy, xz, yz ) {
            var m= this.rotate(xy,xz,yz);
            this.copy(m);
            return this;
        },
        /**
         * Creates a matrix to represent arbitrary rotations around the given planes.
         * @param xy {number} radians to rotate around xy plane.
         * @param xz {number} radians to rotate around xz plane.
         * @param yz {number} radians to rotate around yz plane.
         *
         * @return {CAAT.Matrix3} a newly allocated matrix.
         * @static
         */
	    rotate : function( xy, xz, yz ) {
		    var res=new CAAT.Matrix3();
		    var s,c,m;

		    if (xy!==0) {
			    m =new CAAT.Matrix3( );
			    s=Math.sin(xy);
			    c=Math.cos(xy);
			    m.matrix[1][1]=c;
			    m.matrix[1][2]=-s;
			    m.matrix[2][1]=s;
			    m.matrix[2][2]=c;
			    res.multiply(m);
		    }

		    if (xz!==0) {
			    m =new CAAT.Matrix3( );
			    s=Math.sin(xz);
			    c=Math.cos(xz);
			    m.matrix[0][0]=c;
			    m.matrix[0][2]=-s;
			    m.matrix[2][0]=s;
			    m.matrix[2][2]=c;
			    res.multiply(m);
		    }

		    if (yz!==0) {
			    m =new CAAT.Matrix3( );
			    s=Math.sin(yz);
			    c=Math.cos(yz);
			    m.matrix[0][0]=c;
			    m.matrix[0][1]=-s;
			    m.matrix[1][0]=s;
			    m.matrix[1][1]=c;
			    res.multiply(m);
		    }

		    return res;
	    },
        /**
         * Creates a new matrix being a copy of this matrix.
         * @return {CAAT.Matrix3} a newly allocated matrix object.
         */
        getClone : function() {
		    var m= new CAAT.Matrix3( );
            m.copy(this);
		    return m;
	    },
        /**
         * Multiplies this matrix by another matrix.
         *
         * @param n {CAAT.Matrix3} a CAAT.Matrix3 object.
         * @return this
         */
	    multiply : function( m ) {
		    var n= this.getClone( );

            var nm= n.matrix;
            var n00= nm[0][0];
            var n01= nm[0][1];
            var n02= nm[0][2];
            var n03= nm[0][3];

            var n10= nm[1][0];
            var n11= nm[1][1];
            var n12= nm[1][2];
            var n13= nm[1][3];

            var n20= nm[2][0];
            var n21= nm[2][1];
            var n22= nm[2][2];
            var n23= nm[2][3];

            var n30= nm[3][0];
            var n31= nm[3][1];
            var n32= nm[3][2];
            var n33= nm[3][3];

            var mm= m.matrix;
            var m00= mm[0][0];
            var m01= mm[0][1];
            var m02= mm[0][2];
            var m03= mm[0][3];

            var m10= mm[1][0];
            var m11= mm[1][1];
            var m12= mm[1][2];
            var m13= mm[1][3];

            var m20= mm[2][0];
            var m21= mm[2][1];
            var m22= mm[2][2];
            var m23= mm[2][3];

            var m30= mm[3][0];
            var m31= mm[3][1];
            var m32= mm[3][2];
            var m33= mm[3][3];

            this.matrix[0][0] = n00*m00 + n01*m10 + n02*m20 + n03*m30;
            this.matrix[0][1] = n00*m01 + n01*m11 + n02*m21 + n03*m31;
            this.matrix[0][2] = n00*m02 + n01*m12 + n02*m22 + n03*m32;
            this.matrix[0][3] = n00*m03 + n01*m13 + n02*m23 + n03*m33;

            this.matrix[1][0] = n10*m00 + n11*m10 + n12*m20 + n13*m30;
            this.matrix[1][1] = n10*m01 + n11*m11 + n12*m21 + n13*m31;
            this.matrix[1][2] = n10*m02 + n11*m12 + n12*m22 + n13*m32;
            this.matrix[1][3] = n10*m03 + n11*m13 + n12*m23 + n13*m33;

            this.matrix[2][0] = n20*m00 + n21*m10 + n22*m20 + n23*m30;
            this.matrix[2][1] = n20*m01 + n21*m11 + n22*m21 + n23*m31;
            this.matrix[2][2] = n20*m02 + n21*m12 + n22*m22 + n23*m32;
            this.matrix[2][3] = n20*m03 + n21*m13 + n22*m23 + n23*m33;

            return this;
        },
        /**
         * Pre multiplies this matrix by a given matrix.
         *
         * @param m {CAAT.Matrix3} a CAAT.Matrix3 object.
         *
         * @return this
         */
        premultiply : function(m) {
		    var n= this.getClone( );

            var nm= n.matrix;
            var n00= nm[0][0];
            var n01= nm[0][1];
            var n02= nm[0][2];
            var n03= nm[0][3];

            var n10= nm[1][0];
            var n11= nm[1][1];
            var n12= nm[1][2];
            var n13= nm[1][3];

            var n20= nm[2][0];
            var n21= nm[2][1];
            var n22= nm[2][2];
            var n23= nm[2][3];

            var n30= nm[3][0];
            var n31= nm[3][1];
            var n32= nm[3][2];
            var n33= nm[3][3];

            var mm= m.matrix;
            var m00= mm[0][0];
            var m01= mm[0][1];
            var m02= mm[0][2];
            var m03= mm[0][3];

            var m10= mm[1][0];
            var m11= mm[1][1];
            var m12= mm[1][2];
            var m13= mm[1][3];

            var m20= mm[2][0];
            var m21= mm[2][1];
            var m22= mm[2][2];
            var m23= mm[2][3];

            var m30= mm[3][0];
            var m31= mm[3][1];
            var m32= mm[3][2];
            var m33= mm[3][3];

		    this.matrix[0][0] = n00*m00 + n01*m10 + n02*m20;
		    this.matrix[0][1] = n00*m01 + n01*m11 + n02*m21;
		    this.matrix[0][2] = n00*m02 + n01*m12 + n02*m22;
		    this.matrix[0][3] = n00*m03 + n01*m13 + n02*m23 + n03;
		    this.matrix[1][0] = n10*m00 + n11*m10 + n12*m20;
		    this.matrix[1][1] = n10*m01 + n11*m11 + n12*m21;
		    this.matrix[1][2] = n10*m02 + n11*m12 + n12*m22;
		    this.matrix[1][3] = n10*m03 + n11*m13 + n12*m23 + n13;
		    this.matrix[2][0] = n20*m00 + n21*m10 + n22*m20;
		    this.matrix[2][1] = n20*m01 + n21*m11 + n22*m21;
		    this.matrix[2][2] = n20*m02 + n21*m12 + n22*m22;
		    this.matrix[2][3] = n20*m03 + n21*m13 + n22*m23 + n23;

            return this;
	    },
        /**
         * Set this matrix translation values to be the given parameters.
         *
         * @param x {number} x component of translation point.
         * @param y {number} y component of translation point.
         * @param z {number} z component of translation point.
         *
         * @return this
         */
        setTranslate : function(x,y,z) {
            this.identity();
		    this.matrix[0][3]=x;
		    this.matrix[1][3]=y;
		    this.matrix[2][3]=z;
            return this;
	    },
        /**
         * Create a translation matrix.
         * @param x {number}
         * @param y {number}
         * @param z {number}
         * @return {CAAT.Matrix3} a new matrix.
         */
        translate : function( x,y,z ) {
            var m= new CAAT.Matrix3();
            m.setTranslate( x,y,z );
            return m;
        },
        setScale : function( sx, sy, sz ) {
            this.identity();
            this.matrix[0][0]= sx;
            this.matrix[1][1]= sy;
            this.matrix[2][2]= sz;
            return this;
        },
        scale : function( sx, sy, sz ) {
            var m= new CAAT.Matrix3();
            m.setScale(sx,sy,sz);
            return m;
        },
        /**
         * Set this matrix as the rotation matrix around the given axes.
         * @param xy {number} radians of rotation around z axis.
         * @param xz {number} radians of rotation around y axis.
         * @param yz {number} radians of rotation around x axis.
         *
         * @return this
         */
	    rotateModelView : function( xy, xz, yz ) {
		    var sxy= Math.sin( xy );
            var sxz= Math.sin( xz );
            var syz= Math.sin( yz );
            var cxy= Math.cos( xy );
            var cxz= Math.cos( xz );
            var cyz= Math.cos( yz );

            this.matrix[0][0]= cxz*cxy;
            this.matrix[0][1]= -cxz*sxy;
            this.matrix[0][2]= sxz;
            this.matrix[0][3]= 0;
            this.matrix[1][0]= syz*sxz*cxy+sxy*cyz;
            this.matrix[1][1]= cyz*cxy-syz*sxz*sxy;
            this.matrix[1][2]= -syz*cxz;
            this.matrix[1][3]= 0;
            this.matrix[2][0]= syz*sxy-cyz*sxz*cxy;
            this.matrix[2][1]= cyz*sxz*sxy+syz*cxy;
            this.matrix[2][2]= cyz*cxz;
            this.matrix[2][3]= 0;
            this.matrix[3][0]= 0;
            this.matrix[3][1]= 0;
            this.matrix[3][2]= 0;
            this.matrix[3][3]= 1;

            return this;
	    },
        /**
         * Copy a given matrix values into this one's.
         * @param m {CAAT.Matrix} a matrix
         *
         * @return this
         */
	    copy : function( m ) {
		    for( var i=0; i<4; i++ ) {
                for( var j=0; j<4; j++ ) {
                    this.matrix[i][j]= m.matrix[i][j];
                }
            }

            return this;
        },
        /**
         * Calculate this matrix's determinant.
         * @return {number} matrix determinant.
         */
        calculateDeterminant: function () {

            var mm= this.matrix;
		    var m11= mm[0][0], m12= mm[0][1], m13= mm[0][2], m14= mm[0][3],
		        m21= mm[1][0], m22= mm[1][1], m23= mm[1][2], m24= mm[1][3],
		        m31= mm[2][0], m32= mm[2][1], m33= mm[2][2], m34= mm[2][3],
		        m41= mm[3][0], m42= mm[3][1], m43= mm[3][2], m44= mm[3][3];

            return  m14 * m22 * m33 * m41 +
                    m12 * m24 * m33 * m41 +
                    m14 * m23 * m31 * m42 +
                    m13 * m24 * m31 * m42 +

                    m13 * m21 * m34 * m42 +
                    m11 * m23 * m34 * m42 +
                    m14 * m21 * m32 * m43 +
                    m11 * m24 * m32 * m43 +

                    m13 * m22 * m31 * m44 +
                    m12 * m23 * m31 * m44 +
                    m12 * m21 * m33 * m44 +
                    m11 * m22 * m33 * m44 +

                    m14 * m23 * m32 * m41 -
                    m13 * m24 * m32 * m41 -
                    m13 * m22 * m34 * m41 -
                    m12 * m23 * m34 * m41 -

                    m14 * m21 * m33 * m42 -
                    m11 * m24 * m33 * m42 -
                    m14 * m22 * m31 * m43 -
                    m12 * m24 * m31 * m43 -

                    m12 * m21 * m34 * m43 -
                    m11 * m22 * m34 * m43 -
                    m13 * m21 * m32 * m44 -
                    m11 * m23 * m32 * m44;
	    },
        /**
         * Return a new matrix which is this matrix's inverse matrix.
         * @return {CAAT.Matrix3} a new matrix.
         */
        getInverse : function() {
            var mm= this.matrix;
		    var m11 = mm[0][0], m12 = mm[0][1], m13 = mm[0][2], m14 = mm[0][3],
		        m21 = mm[1][0], m22 = mm[1][1], m23 = mm[1][2], m24 = mm[1][3],
		        m31 = mm[2][0], m32 = mm[2][1], m33 = mm[2][2], m34 = mm[2][3],
		        m41 = mm[3][0], m42 = mm[3][1], m43 = mm[3][2], m44 = mm[3][3];
            
            var m2= new CAAT.Matrix3();
            m2.matrix[0][0]= m23*m34*m42 + m24*m32*m43 + m22*m33*m44 - m24*m33*m42 - m22*m34*m43 - m23*m32*m44;
            m2.matrix[0][1]= m14*m33*m42 + m12*m34*m43 + m13*m32*m44 - m12*m33*m44 - m13*m34*m42 - m14*m32*m43;
            m2.matrix[0][2]= m13*m24*m42 + m12*m23*m44 + m14*m22*m43 - m12*m24*m43 - m13*m22*m44 - m14*m23*m42;
            m2.matrix[0][3]= m14*m23*m32 + m12*m24*m33 + m13*m22*m34 - m13*m24*m32 - m14*m22*m33 - m12*m23*m34;

            m2.matrix[1][0]= m24*m33*m41 + m21*m34*m43 + m23*m31*m44 - m23*m34*m41 - m24*m31*m43 - m21*m33*m44;
            m2.matrix[1][1]= m13*m34*m41 + m14*m31*m43 + m11*m33*m44 - m14*m33*m41 - m11*m34*m43 - m13*m31*m44;
            m2.matrix[1][2]= m14*m23*m41 + m11*m24*m43 + m13*m21*m44 - m13*m24*m41 - m14*m21*m43 - m11*m23*m44;
            m2.matrix[1][3]= m13*m24*m31 + m14*m21*m33 + m11*m23*m34 - m14*m23*m31 - m11*m24*m33 - m13*m21*m34;

            m2.matrix[2][0]= m22*m34*m41 + m24*m31*m42 + m21*m32*m44 - m24*m32*m41 - m21*m34*m42 - m22*m31*m44;
            m2.matrix[2][1]= m14*m32*m41 + m11*m34*m42 + m12*m31*m44 - m11*m32*m44 - m12*m34*m41 - m14*m31*m42;
            m2.matrix[2][2]= m13*m24*m41 + m14*m21*m42 + m11*m22*m44 - m14*m22*m41 - m11*m24*m42 - m12*m21*m44;
            m2.matrix[2][3]= m14*m22*m31 + m11*m24*m32 + m12*m21*m34 - m11*m22*m34 - m12*m24*m31 - m14*m21*m32;

            m2.matrix[3][0]= m23*m32*m41 + m21*m33*m42 + m22*m31*m43 - m22*m33*m41 - m23*m31*m42 - m21*m32*m43;
            m2.matrix[3][1]= m12*m33*m41 + m13*m31*m42 + m11*m32*m43 - m13*m32*m41 - m11*m33*m42 - m12*m31*m43;
            m2.matrix[3][2]= m13*m22*m41 + m11*m23*m42 + m12*m21*m43 - m11*m22*m43 - m12*m23*m41 - m13*m21*m42;
            m2.matrix[3][3]= m12*m23*m31 + m13*m21*m32 + m11*m22*m33 - m13*m22*m31 - m11*m23*m32 - m12*m21*m33;
            
            return m2.multiplyScalar( 1/this.calculateDeterminant() );
        },
        /**
         * Multiply this matrix by a scalar.
         * @param scalar {number} scalar value
         *
         * @return this
         */
        multiplyScalar : function( scalar ) {
            var i,j;

            for( i=0; i<4; i++ ) {
                for( j=0; j<4; j++ ) {
                    this.matrix[i][j]*=scalar;
                }
            }

            return this;
        }

    };

})();

(function() {

    /**
     * 2D affinetransform matrix represeantation.
     * It includes matrices for
     * <ul>
     *  <li>Rotation by any anchor point
     *  <li>translation
     *  <li>scale by any anchor point
     * </ul>
     *
     */
	CAAT.Matrix = function() {
        this.matrix= [
            1.0,0.0,0.0,
            0.0,1.0,0.0, 0.0,0.0,1.0 ];
		return this;
	};
	
	CAAT.Matrix.prototype= {
		matrix:	null,

        /**
         * Transform a point by this matrix. The parameter point will be modified with the transformation values.
         * @param point {CAAT.Point}.
         * @return {CAAT.Point} the parameter point.
         */
		transformCoord : function(point) {
			var x= point.x;
			var y= point.y;

            var tm= this.matrix;

            point.x= x*tm[0] + y*tm[1] + tm[2];
            point.y= x*tm[3] + y*tm[4] + tm[5];

			return point;
		},
        /**
         * Create a new rotation matrix and set it up for the specified angle in radians.
         * @param angle {number}
         * @return {CAAT.Matrix} a matrix object.
         *
         * @static
         */
		rotate : function(angle) {
			var m= new CAAT.Matrix();
			m.setRotation(angle);
			return m;
        },
        setRotation : function( angle ) {

            this.identity();

            var tm= this.matrix;
            var c= Math.cos( angle );
            var s= Math.sin( angle );
            tm[0]= c;
            tm[1]= -s;
            tm[3]= s;
            tm[4]= c;

			return this;
		},
        /**
         * Create a scale matrix.
         * @param scalex {number} x scale magnitude.
         * @param scaley {number} y scale magnitude.
         *
         * @return {CAAT.Matrix} a matrix object.
         *
         * @static
         */
		scale : function(scalex, scaley) {
			var m= new CAAT.Matrix();

            m.matrix[0]= scalex;
            m.matrix[4]= scaley;

			return m;
		},
        setScale : function(scalex, scaley) {
            this.identity();

            this.matrix[0]= scalex;
            this.matrix[4]= scaley;

			return this;
		},
        /**
         * Create a translation matrix.
         * @param x {number} x translation magnitude.
         * @param y {number} y translation magnitude.
         *
         * @return {CAAT.Matrix} a matrix object.
         * @static
         *
         */
		translate : function( x, y ) {
			var m= new CAAT.Matrix();

            m.matrix[2]= x;
            m.matrix[5]= y;

			return m;
		},
        /**
         * Sets this matrix as a translation matrix.
         * @param x
         * @param y
         */
        setTranslate : function( x, y ) {
            this.identity();

            this.matrix[2]= x;
            this.matrix[5]= y;

            return this;
        },
        /**
         * Copy into this matrix the given matrix values.
         * @param matrix {CAAT.Matrix}
         * @return this
         */
		copy : function( matrix ) {
            matrix= matrix.matrix;

            var tmatrix= this.matrix;
			tmatrix[0]= matrix[0];
			tmatrix[1]= matrix[1];
			tmatrix[2]= matrix[2];
			tmatrix[3]= matrix[3];
			tmatrix[4]= matrix[4];
			tmatrix[5]= matrix[5];
			tmatrix[6]= matrix[6];
			tmatrix[7]= matrix[7];
			tmatrix[8]= matrix[8];

            return this;
		},
        /**
         * Set this matrix to the identity matrix.
         * @return this
         */
		identity : function() {

            var m= this.matrix;
            m[0]= 1.0;
            m[1]= 0.0;
            m[2]= 0.0;

            m[3]= 0.0;
            m[4]= 1.0;
            m[5]= 0.0;

            m[6]= 0.0;
            m[7]= 0.0;
            m[8]= 1.0;

            return this;
		},
        /**
         * Multiply this matrix by a given matrix.
         * @param m {CAAT.Matrix}
         * @return this
         */
		multiply : function( m ) {

            var tm= this.matrix;
            var mm= m.matrix;

            var tm0= tm[0];
            var tm1= tm[1];
            var tm2= tm[2];
            var tm3= tm[3];
            var tm4= tm[4];
            var tm5= tm[5];
            var tm6= tm[6];
            var tm7= tm[7];
            var tm8= tm[8];

            var mm0= mm[0];
            var mm1= mm[1];
            var mm2= mm[2];
            var mm3= mm[3];
            var mm4= mm[4];
            var mm5= mm[5];
            var mm6= mm[6];
            var mm7= mm[7];
            var mm8= mm[8];

            tm[0]= tm0*mm0 + tm1*mm3 + tm2*mm6;
            tm[1]= tm0*mm1 + tm1*mm4 + tm2*mm7;
            tm[2]= tm0*mm2 + tm1*mm5 + tm2*mm8;
            tm[3]= tm3*mm0 + tm4*mm3 + tm5*mm6;
            tm[4]= tm3*mm1 + tm4*mm4 + tm5*mm7;
            tm[5]= tm3*mm2 + tm4*mm5 + tm5*mm8;
            tm[6]= tm6*mm0 + tm7*mm3 + tm8*mm6;
            tm[7]= tm6*mm1 + tm7*mm4 + tm8*mm7;
            tm[8]= tm6*mm2 + tm7*mm5 + tm8*mm8;

            return this;
		},
        /**
         * Premultiply this matrix by a given matrix.
         * @param m {CAAT.Matrix}
         * @return this
         */
		premultiply : function(m) {

            var m00= m.matrix[0]*this.matrix[0] + m.matrix[1]*this.matrix[3] + m.matrix[2]*this.matrix[6];
            var m01= m.matrix[0]*this.matrix[1] + m.matrix[1]*this.matrix[4] + m.matrix[2]*this.matrix[7];
            var m02= m.matrix[0]*this.matrix[2] + m.matrix[1]*this.matrix[5] + m.matrix[2]*this.matrix[8];

            var m10= m.matrix[3]*this.matrix[0] + m.matrix[4]*this.matrix[3] + m.matrix[5]*this.matrix[6];
            var m11= m.matrix[3]*this.matrix[1] + m.matrix[4]*this.matrix[4] + m.matrix[5]*this.matrix[7];
            var m12= m.matrix[3]*this.matrix[2] + m.matrix[4]*this.matrix[5] + m.matrix[5]*this.matrix[8];

            var m20= m.matrix[6]*this.matrix[0] + m.matrix[7]*this.matrix[3] + m.matrix[8]*this.matrix[6];
            var m21= m.matrix[6]*this.matrix[1] + m.matrix[7]*this.matrix[4] + m.matrix[8]*this.matrix[7];
            var m22= m.matrix[6]*this.matrix[2] + m.matrix[7]*this.matrix[5] + m.matrix[8]*this.matrix[8];

            this.matrix[0]= m00;
            this.matrix[1]= m01;
            this.matrix[2]= m02;

            this.matrix[3]= m10;
            this.matrix[4]= m11;
            this.matrix[5]= m12;

            this.matrix[6]= m20;
            this.matrix[7]= m21;
            this.matrix[8]= m22;


            return this;
		},
        /**
         * Creates a new inverse matrix from this matrix.
         * @return {CAAT.Matrix} an inverse matrix.
         */
	    getInverse : function() {
            var tm= this.matrix;

			var m00= tm[0];
			var m01= tm[1];
            var m02= tm[2];
			var m10= tm[3];
			var m11= tm[4];
            var m12= tm[5];
            var m20= tm[6];
            var m21= tm[7];
            var m22= tm[8];

            var newMatrix= new CAAT.Matrix();

            var determinant= m00* (m11*m22 - m21*m12) - m10*(m01*m22 - m21*m02) + m20 * (m01*m12 - m11*m02);
            if ( determinant===0 ) {
                return null;
            }

            var m= newMatrix.matrix;

            m[0]= m11*m22-m12*m21;
            m[1]= m02*m21-m01*m22;
            m[2]= m01*m12-m02*m11;

            m[3]= m12*m20-m10*m22;
            m[4]= m00*m22-m02*m20;
            m[5]= m02*m10-m00*m12;

            m[6]= m10*m21-m11*m20;
            m[7]= m01*m20-m00*m21;
            m[8]= m00*m11-m01*m10;

            newMatrix.multiplyScalar( 1/determinant );

			return newMatrix;
	    },
        /**
         * Multiply this matrix by a scalar.
         * @param scalar {number} scalar value
         *
         * @return this
         */
        multiplyScalar : function( scalar ) {
            var i;

            for( i=0; i<9; i++ ) {
                this.matrix[i]*=scalar;
            }

            return this;
        },

        transformRenderingContextSet : null,

        transformRenderingContext : null,

        /**
         *
         * @param ctx
         */
        transformRenderingContextSet_NoClamp : function(ctx) {
            var m= this.matrix;
            ctx.setTransform( m[0], m[3], m[1], m[4], m[2], m[5] );
            return this;
        },

        /**
         *
         * @param ctx
         */
        transformRenderingContext_NoClamp : function(ctx) {
            var m= this.matrix;
            ctx.transform( m[0], m[3], m[1], m[4], m[2], m[5] );
            return this;
        },

        /**
         *
         * @param ctx
         */
        transformRenderingContextSet_Clamp : function(ctx) {
            var m= this.matrix;
            ctx.setTransform( m[0], m[3], m[1], m[4], m[2]>>0, m[5]>>0 );
            return this;
        },

        /**
         *
         * @param ctx
         */
        transformRenderingContext_Clamp : function(ctx) {
            var m= this.matrix;
            ctx.transform( m[0], m[3], m[1], m[4], m[2]>>0, m[5]>>0 );
            return this;
        }

	};

    CAAT.Matrix.prototype.transformRenderingContext= CAAT.Matrix.prototype.transformRenderingContext_Clamp;
    CAAT.Matrix.prototype.transformRenderingContextSet= CAAT.Matrix.prototype.transformRenderingContextSet_Clamp;

})();

(function() {
    /**
     * Implementation of a matrix stack. Each CAAT.Actor instance contains a MatrixStack to hold of its affine
     * transformations. The Canvas rendering context will be fed with this matrix stack values to keep a homogeneous
     * transformation process.
     *
     * @constructor
     */
	CAAT.MatrixStack= function() {
		this.stack= [];
		this.saved= [];
		return this;
	};

	CAAT.MatrixStack.prototype= {
		stack: null,
		saved: null,

        /**
         * Add a matrix to the transformation stack.
         * @return this
         */
		pushMatrix : function(matrix) {
			this.stack.push(matrix);
            return this;
		},
        /**
         * Remove the last matrix from this stack.
         * @return {CAAT.Matrix} the poped matrix.
         */
		popMatrix : function()	{
			return this.stack.pop();
		},
        /**
         * Create a restoration point of pushed matrices.
         * @return this
         */
		save : function() {
			this.saved.push(this.stack.length);
            return this;
		},
        /**
         * Restore from the last restoration point set.
         * @return this
         */
		restore : function() {
			var pos= this.saved.pop();
			while( this.stack.length!==pos ) {
				this.popMatrix();
			}
            return this;
		},
        /**
         * Return the concatenation (multiplication) matrix of all the matrices contained in this stack.
         * @return {CAAT.Matrix} a new matrix.
         */
        getMatrix : function() {
            var matrix= new CAAT.Matrix();

			for( var i=0; i<this.stack.length; i++ ) {
				var matrixStack= this.stack[i];
                matrix.multiply( matrixStack );
            }

            return matrix;
        }
	};
})();/**
 * See LICENSE file.
 *
 * @author: Mario Gonzalez (@onedayitwilltake) and Ibon Tolosana (@hyperandroid)
 *
 * Helper classes for color manipulation.
 *
 **/

(function() {

    /**
     * Class with color utilities.
     *
     * @constructor
     */
	CAAT.Color = function() {
		return this;
	};
	CAAT.Color.prototype= {
		/**
		 * HSV to RGB color conversion
		 * <p>
		 * H runs from 0 to 360 degrees<br>
		 * S and V run from 0 to 100
		 * <p>
		 * Ported from the excellent java algorithm by Eugene Vishnevsky at:
		 * http://www.cs.rit.edu/~ncs/color/t_convert.html
         *
         * @static
		 */
		hsvToRgb: function(h, s, v)
		{
			var r, g, b;
			var i;
			var f, p, q, t;

			// Make sure our arguments stay in-range
			h = Math.max(0, Math.min(360, h));
			s = Math.max(0, Math.min(100, s));
			v = Math.max(0, Math.min(100, v));

			// We accept saturation and value arguments from 0 to 100 because that's
			// how Photoshop represents those values. Internally, however, the
			// saturation and value are calculated from a range of 0 to 1. We make
			// That conversion here.
			s /= 100;
			v /= 100;

			if(s === 0) {
				// Achromatic (grey)
				r = g = b = v;
				return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
			}

			h /= 60; // sector 0 to 5
			i = Math.floor(h);
			f = h - i; // factorial part of h
			p = v * (1 - s);
			q = v * (1 - s * f);
			t = v * (1 - s * (1 - f));

			switch(i) {
				case 0:
					r = v;
					g = t;
					b = p;
					break;

				case 1:
					r = q;
					g = v;
					b = p;
					break;

				case 2:
					r = p;
					g = v;
					b = t;
					break;

				case 3:
					r = p;
					g = q;
					b = v;
					break;

				case 4:
					r = t;
					g = p;
					b = v;
					break;

				default: // case 5:
					r = v;
					g = p;
					b = q;
			}

			return new CAAT.Color.RGB(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
		},
        /**
         * Enumeration to define types of color ramps.
         * @enum {number}
         */
        RampEnumeration : {
            RAMP_RGBA:              0,
            RAMP_RGB:               1,
            RAMP_CHANNEL_RGB:       2,
            RAMP_CHANNEL_RGBA:      3,
            RAMP_CHANNEL_RGB_ARRAY: 4,
            RAMP_CHANNEL_RGBA_ARRAY:5
        },

        /**
         * Interpolate the color between two given colors. The return value will be a calculated color
         * among the two given initial colors which corresponds to the 'step'th color of the 'nsteps'
         * calculated colors.
         * @param r0 {number} initial color red component.
         * @param g0 {number} initial color green component.
         * @param b0 {number} initial color blue component.
         * @param r1 {number} final color red component.
         * @param g1 {number} final color green component.
         * @param b1 {number} final color blue component.
         * @param nsteps {number} number of colors to calculate including the two given colors. If 16 is passed as value,
         * 14 colors plus the two initial ones will be calculated.
         * @param step {number} return this color index of all the calculated colors.
         *
         * @return { r{number}, g{number}, b{number} } return an object with the new calculated color components.
         * @static
         */
        interpolate : function( r0, g0, b0, r1, g1, b1, nsteps, step) {
            if ( step<=0 ) {
                return {
                    r:r0,
                    g:g0,
                    b:b0
                };
            } else if ( step>=nsteps ) {
                return {
                    r:r1,
                    g:g1,
                    b:b1
                };
            }

            var r= (r0+ (r1-r0)/nsteps*step)>>0;
            var g= (g0+ (g1-g0)/nsteps*step)>>0;
            var b= (b0+ (b1-b0)/nsteps*step)>>0;

            if ( r>255 ) {r=255;} else if (r<0) {r=0;}
            if ( g>255 ) {g=255;} else if (g<0) {g=0;}
            if ( b>255 ) {b=255;} else if (b<0) {b=0;}

            return {
                r:r,
                g:g,
                b:b
            };
        },
        /**
         * Generate a ramp of colors from an array of given colors.
         * @param fromColorsArray {[number]} an array of colors. each color is defined by an integer number from which
         * color components will be extracted. Be aware of the alpha component since it will also be interpolated for
         * new colors.
         * @param rampSize {number} number of colors to produce.
         * @param returnType {CAAT.ColorUtils.RampEnumeration} a value of CAAT.ColorUtils.RampEnumeration enumeration.
         *
         * @return { [{number},{number},{number},{number}] } an array of integers each of which represents a color of
         * the calculated color ramp.
         *
         * @static
         */
        makeRGBColorRamp : function( fromColorsArray, rampSize, returnType ) {

            var ramp=   [];
            var nc=     fromColorsArray.length-1;
            var chunk=  rampSize/nc;

            for( var i=0; i<nc; i++ ) {
                var c= fromColorsArray[i];
                var a0= (c>>24)&0xff;
                var r0= (c&0xff0000)>>16;
                var g0= (c&0xff00)>>8;
                var b0= c&0xff;

                var c1= fromColorsArray[i+1];
                var a1= (c1>>24)&0xff;
                var r1= (c1&0xff0000)>>16;
                var g1= (c1&0xff00)>>8;
                var b1= c1&0xff;

                var da= (a1-a0)/chunk;
                var dr= (r1-r0)/chunk;
                var dg= (g1-g0)/chunk;
                var db= (b1-b0)/chunk;

                for( var j=0; j<chunk; j++ ) {
                    var na= (a0+da*j)>>0;
                    var nr= (r0+dr*j)>>0;
                    var ng= (g0+dg*j)>>0;
                    var nb= (b0+db*j)>>0;

                    switch( returnType ) {
                        case this.RampEnumeration.RAMP_RGBA:
                            ramp.push( 'argb('+na+','+nr+','+ng+','+nb+')' );
                            break;
                        case this.RampEnumeration.RAMP_RGB:
                            ramp.push( 'rgb('+nr+','+ng+','+nb+')' );
                            break;
                        case this.RampEnumeration.RAMP_CHANNEL_RGB:
                            ramp.push( 0xff000000 | nr<<16 | ng<<8 | nb );
                            break;
                        case this.RampEnumeration.RAMP_CHANNEL_RGBA:
                            ramp.push( na<<24 | nr<<16 | ng<<8 | nb );
                            break;
                        case this.RampEnumeration.RAMP_CHANNEL_RGBA_ARRAY:
                            ramp.push([ nr, ng, nb, na ]);
                            break;
                        case this.RampEnumeration.RAMP_CHANNEL_RGB_ARRAY:
                            ramp.push([ nr, ng, nb ]);
                            break;
                    }
                }
            }

            return ramp;

        }
	};
})();

(function() {
    /**
     * RGB color implementation
     * @param r {number} an integer in the range 0..255
     * @param g {number} an integer in the range 0..255
     * @param b {number} an integer in the range 0..255
     *
     * @constructor
     */
	CAAT.Color.RGB = function(r, g, b) {
		this.r = r || 255;
		this.g = g || 255;
		this.b = b || 255;
		return this;
	};
	CAAT.Color.RGB.prototype= {
		r: 255,
		g: 255,
		b: 255,

        /**
         * Get color hexadecimal representation.
         * @return {string} a string with color hexadecimal representation.
         */
		toHex: function() {
			// See: http://jsperf.com/rgb-decimal-to-hex/5
			return ('000000' + ((this.r << 16) + (this.g << 8) + this.b).toString(16)).slice(-6);
		}
	};
})();
/**
 * See LICENSE file.
 *
 * Rectangle Class.
 * Needed to compute Curve bounding box.
 * Needed to compute Actor affected area on change.
 *
 **/


(function() {
    /**
     * A Rectangle implementation, which defines an area positioned somewhere.
     *
     * @constructor
     */
	CAAT.Rectangle= function() {
		return this;
	};
	
	CAAT.Rectangle.prototype= {
		x:		0,
		y:		0,
		x1:		0,
		y1:		0,
		width:	-1,
		height:	-1,

        setEmpty : function() {
            this.width=     -1;
            this.height=    -1;
            this.x=         0;
            this.y=         0;
            this.x1=        0;
            this.y1=        0;
            return this;
        },
        /**
         * Set this rectangle's location.
         * @param x {number}
         * @param y {number}
         */
        setLocation: function( x,y ) {
            this.x= x;
            this.y= y;
            this.x1= this.x+this.width;
            this.y1= this.y+this.height;
            return this;
        },
        /**
         * Set this rectangle's dimension.
         * @param w {number}
         * @param h {number}
         */
        setDimension : function( w,h ) {
            this.width= w;
            this.height= h;
            this.x1= this.x+this.width;
            this.y1= this.y+this.height;
            return this;
        },
        setBounds : function( x,y,w,h ) {
            this.setLocation( x, y )
            this.setDimension( w, h );
            return this;
        },
        /**
         * Return whether the coordinate is inside this rectangle.
         * @param px {number}
         * @param py {number}
         *
         * @return {boolean}
         */
		contains : function(px,py) {
			return px>=0 && px<this.width && py>=0 && py<this.height; 
		},
        /**
         * Return whether this rectangle is empty, that is, has zero dimension.
         * @return {boolean}
         */
		isEmpty : function() {
			return this.width===-1 && this.height===-1;
		},
        /**
         * Set this rectangle as the union of this rectangle and the given point.
         * @param px {number}
         * @param py {number}
         */
		union : function(px,py) {
			
			if ( this.isEmpty() ) {
				this.x= px;
                this.x1= px;
				this.y= py;
                this.y1= py;
                this.width=0;
                this.height=0;
				return;
			}
			
			this.x1= this.x+this.width;
			this.y1= this.y+this.height;
			
			if ( py<this.y ) {
				this.y= py;
			}
			if ( px<this.x ) {
				this.x= px;
			}
			if ( py>this.y1 ) {
				this.y1= py;
			}
			if ( px>this.x1 ){
				this.x1= px;
			}
			
			this.width= this.x1-this.x;
			this.height= this.y1-this.y;
		},
        unionRectangle : function( rectangle ) {
            this.union( rectangle.x , rectangle.y  );
            this.union( rectangle.x1, rectangle.y  );
            this.union( rectangle.x,  rectangle.y1 );
            this.union( rectangle.x1, rectangle.y1 );
            return this;
        },
        intersects : function( r ) {
            if ( r.isEmpty() || this.isEmpty() ) {
                return false;
            }

            if ( r.x1< this.x ) {
                return false;
            }
            if ( r.x > this.x1 ) {
                return false;
            }
            if ( r.y1< this.y ) {
                return false;
            }
            if ( r.y> this.y1 ) {
                return false;
            }

            return true;
        },

        intersectsRect : function( x,y,w,h ) {
            if ( -1===w || -1===h ) {
                return false;
            }

            var x1= x+w-1;
            var y1= y+h-1;

            if ( x1< this.x ) {
                return false;
            }
            if ( x > this.x1 ) {
                return false;
            }
            if ( y1< this.y ) {
                return false;
            }
            if ( y> this.y1 ) {
                return false;
            }

            return true;
        },

        intersect : function( i, r ) {
            if ( typeof r==='undefined' ) {
                r= new CAAT.Rectangle();
            }

            r.x= Math.max( this.x, i.x );
            r.y= Math.max( this.y, i.y );
            r.x1=Math.min( this.x1, i.x1 );
            r.y1=Math.min( this.y1, i.y1 );
            r.width= r.x1-r.x;
            r.height=r.y1-r.y;

            return r;
        }
	};
})();/**
 * See LICENSE file.
 *
 * Classes to solve and draw curves.
 * Curve is the superclass of
 *  + Bezier (quadric and cubic)
 *  + TODO: Catmull Rom
 *
 *
 **/

(function() {
    /**
     *
     * Curve class is the base for all curve solvers available in CAAT.
     *
     * @constructor
     */
	CAAT.Curve= function() {
		return this;
	};
	
	CAAT.Curve.prototype= {
		coordlist:		null,
		k:				0.05,
		length:			-1,
		interpolator:	false,
		HANDLE_SIZE:	20,
		drawHandles:	true,

        /**
         * Paint the curve control points.
         * @param director {CAAT.Director}
         */
		paint: function(director) {
            if ( false===this.drawHandles ) {
                return;
            }

			var ctx= director.ctx;
		
			// control points
			ctx.save();
			ctx.beginPath();
			
			ctx.strokeStyle='#a0a0a0';
			ctx.moveTo( this.coordlist[0].x, this.coordlist[0].y );
			ctx.lineTo( this.coordlist[1].x, this.coordlist[1].y );
			ctx.stroke();
			if ( this.cubic ) {
				ctx.moveTo( this.coordlist[2].x, this.coordlist[2].y );
				ctx.lineTo( this.coordlist[3].x, this.coordlist[3].y );
				ctx.stroke();
			} 


            ctx.globalAlpha=0.5;
            for( var i=0; i<this.coordlist.length; i++ ) {
                ctx.fillStyle='#7f7f00';
                var w= CAAT.Curve.prototype.HANDLE_SIZE/2;
                ctx.fillRect( this.coordlist[i].x-w, this.coordlist[i].y-w, w*2, w*2 );
                /*
                ctx.beginPath();
                ctx.arc(
                        this.coordlist[i].x,
                        this.coordlist[i].y,
                        this.HANDLE_SIZE/2,
                        0,
                        2*Math.PI,
                        false) ;
                ctx.fill();
                */
            }

			ctx.restore();
		},
        /**
         * Signal the curve has been modified and recalculate curve length.
         */
		update : function() {
			this.calcLength();
		},
        /**
         * This method must be overriden by subclasses. It is called whenever the curve must be solved for some time=t.
         * The t parameter must be in the range 0..1
         * @param point {CAAT.Point} to store curve solution for t.
         * @param t {number}
         * @return {CAAT.Point} the point parameter.
         */
		solve: function(point,t) {
		},
        /**
         * Get an array of points defining the curve contour.
         * @param numSamples {number} number of segments to get.
         */
        getContour : function(numSamples) {
            var contour= [], i;

            for( i=0; i<=numSamples; i++ ) {
                var point= new CAAT.Point();
                this.solve( point, i/numSamples );
                contour.push(point);
            }

            return contour;
        },
        /**
         * Calculates a curve bounding box.
         *
         * @param rectangle {CAAT.Rectangle} a rectangle to hold the bounding box.
         * @return {CAAT.Rectangle} the rectangle parameter.
         */
		getBoundingBox : function(rectangle) {
			if ( !rectangle ) {
				rectangle= new CAAT.Rectangle();
			}

            // thanks yodesoft.com for spotting the first point is out of the BB
            rectangle.setEmpty();
            rectangle.union( this.coordlist[0].x, this.coordlist[0].y );

			var pt= new CAAT.Point();
			for(var t=this.k;t<=1+this.k;t+=this.k){
				this.solve(pt,t);
				rectangle.union( pt.x, pt.y );
			}			
			
			return rectangle;
		},
        /**
         * Calculate the curve length by incrementally solving the curve every substep=CAAT.Curve.k. This value defaults
         * to .05 so at least 20 iterations will be performed.
         *
         * @return {number} the approximate curve length.
         */
		calcLength : function() {
			var x1,x2,y1,y2;
			x1 = this.coordlist[0].x;
			y1 = this.coordlist[0].y;
			var llength=0;
			var pt= new CAAT.Point();
			for(var t=this.k;t<=1+this.k;t+=this.k){
				this.solve(pt,t);
				llength+= Math.sqrt( (pt.x-x1)*(pt.x-x1) + (pt.y-y1)*(pt.y-y1) );
				x1=pt.x;
				y1=pt.y;
			}
			
			this.length= llength;
			return llength;
		},
        /**
         * Return the cached curve length.
         * @return {number} the cached curve length.
         */
		getLength : function() {
			return this.length;
		},
        /**
         * Return the first curve control point.
         * @param point {CAAT.Point}
         * @return {CAAT.Point}
         */
		endCurvePosition : function(point) {
			return this.coordlist[ this.coordlist.length-1 ];
		},
        /**
         * Return the last curve control point.
         * @param point {CAAT.Point}
         * @return {CAAT.Point}
         */
		startCurvePosition : function(point) {
			return this.coordlist[ 0 ];
		},

        setPoints : function( points ) {
        },

        setPoint : function( point, index ) {
            if ( index>=0 && index<this.coordlist.length ) {
                this.coordlist[index]= point;
            }
        },
        applyAsPath : function( director ) {
        }
	};
})();


(function() {

    /**
     * Bezier quadric and cubic curves implementation.
     *
     * @constructor
     * @extends CAAT.Curve
     */
	CAAT.Bezier= function() {
		CAAT.Bezier.superclass.constructor.call(this);
		return this;
	};
	
	CAAT.Bezier.prototype= {
		
		cubic:		false,

        applyAsPath : function( director ) {

            var cc= this.coordlist;

            if ( this.cubic ) {
                director.ctx.bezierCurveTo(
                    cc[1].x,
                    cc[1].y,
                    cc[2].x,
                    cc[2].y,
                    cc[3].x,
                    cc[3].y
                );
            } else {
                director.ctx.quadraticCurveTo(
                    cc[1].x,
                    cc[1].y,
                    cc[2].x,
                    cc[2].y
                );
            }
            return this;
        },
        isQuadric : function() {
            return !this.cubic;
        },
        isCubic : function() {
            return this.cubic;
        },
        /**
         * Set this curve as a cubic bezier defined by the given four control points.
         * @param cp0x {number}
         * @param cp0y {number}
         * @param cp1x {number}
         * @param cp1y {number}
         * @param cp2x {number}
         * @param cp2y {number}
         * @param cp3x {number}
         * @param cp3y {number}
         */
		setCubic : function( cp0x,cp0y, cp1x,cp1y, cp2x,cp2y, cp3x,cp3y ) {
		
			this.coordlist= [];
		
			this.coordlist.push( new CAAT.Point().set(cp0x, cp0y ) );
			this.coordlist.push( new CAAT.Point().set(cp1x, cp1y ) );
			this.coordlist.push( new CAAT.Point().set(cp2x, cp2y ) );
			this.coordlist.push( new CAAT.Point().set(cp3x, cp3y ) );
			
			this.cubic= true;
			this.update();

            return this;
		},
        /**
         * Set this curve as a quadric bezier defined by the three control points.
         * @param cp0x {number}
         * @param cp0y {number}
         * @param cp1x {number}
         * @param cp1y {number}
         * @param cp2x {number}
         * @param cp2y {number}
         */
		setQuadric : function(cp0x,cp0y, cp1x,cp1y, cp2x,cp2y ) {
		
			this.coordlist= [];
		
			this.coordlist.push( new CAAT.Point().set(cp0x, cp0y ) );
			this.coordlist.push( new CAAT.Point().set(cp1x, cp1y ) );
			this.coordlist.push( new CAAT.Point().set(cp2x, cp2y ) );
			
			this.cubic= false;
			this.update();

            return this;
		},
        setPoints : function( points ) {
            if ( points.length===3 ) {
                this.coordlist= points;
                this.cubic= false;
                this.update();
            } else if (points.length===4 ) {
                this.coordlist= points;
                this.cubic= true;
                this.update();
            } else {
                throw 'points must be an array of 3 or 4 CAAT.Point instances.'
            }

            return this;
        },
        /**
         * Paint this curve.
         * @param director {CAAT.Director}
         */
		paint : function( director ) {
			if ( this.cubic ) {
				this.paintCubic(director);
			} else {
				this.paintCuadric( director );
			}
			
			CAAT.Bezier.superclass.paint.call(this,director);

		},
        /**
         * Paint this quadric Bezier curve. Each time the curve is drawn it will be solved again from 0 to 1 with
         * CAAT.Bezier.k increments.
         *
         * @param director {CAAT.Director}
         * @private
         */
		paintCuadric : function( director ) {
			var x1,y1;
			x1 = this.coordlist[0].x;
			y1 = this.coordlist[0].y;
			
			var ctx= director.ctx;
			
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(x1,y1);
			
			var point= new CAAT.Point();
			for(var t=this.k;t<=1+this.k;t+=this.k){
				this.solve(point,t);
				ctx.lineTo(point.x, point.y );
			}
			
			ctx.stroke();
			ctx.restore();
		
		},
        /**
         * Paint this cubic Bezier curve. Each time the curve is drawn it will be solved again from 0 to 1 with
         * CAAT.Bezier.k increments.
         *
         * @param director {CAAT.Director}
         * @private
         */
		paintCubic : function( director ) {

			var x1,y1;
			x1 = this.coordlist[0].x;
			y1 = this.coordlist[0].y;
			
			var ctx= director.ctx;
			
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(x1,y1);
			
			var point= new CAAT.Point();
			for(var t=this.k;t<=1+this.k;t+=this.k){
				this.solve(point,t);
				ctx.lineTo(point.x, point.y );
			}
			
			ctx.stroke();
			ctx.restore();
		},
        /**
         * Solves the curve for any given parameter t.
         * @param point {CAAT.Point} the point to store the solved value on the curve.
         * @param t {number} a number in the range 0..1
         */
		solve : function(point,t) {
			if ( this.cubic ) {
				return this.solveCubic(point,t);
			} else {
				return this.solveQuadric(point,t);
			}
		},
        /**
         * Solves a cubic Bezier.
         * @param point {CAAT.Point} the point to store the solved value on the curve.
         * @param t {number} the value to solve the curve for.
         */
		solveCubic : function(point,t) {
			
			var t2= t*t;
			var t3= t*t2;

            var cl= this.coordlist;
            var cl0= cl[0];
            var cl1= cl[1];
            var cl2= cl[2];
            var cl3= cl[3];

			point.x=(
                cl0.x + t * (-cl0.x * 3 + t * (3 * cl0.x-
                cl0.x*t)))+t*(3*cl1.x+t*(-6*cl1.x+
                cl1.x*3*t))+t2*(cl2.x*3-cl2.x*3*t)+
                cl3.x * t3;
				
			point.y=(
                    cl0.y+t*(-cl0.y*3+t*(3*cl0.y-
					cl0.y*t)))+t*(3*cl1.y+t*(-6*cl1.y+
					cl1.y*3*t))+t2*(cl2.y*3-cl2.y*3*t)+
					cl3.y * t3;
			
			return point;
		},
        /**
         * Solves a quadric Bezier.
         * @param point {CAAT.Point} the point to store the solved value on the curve.
         * @param t {number} the value to solve the curve for.
         */
		solveQuadric : function(point,t) {
            var cl= this.coordlist;
            var cl0= cl[0];
            var cl1= cl[1];
            var cl2= cl[2];
            var t1= 1-t;

			point.x= t1*t1*cl0.x + 2*t1*t*cl1.x + t*t*cl2.x;
			point.y= t1*t1*cl0.y + 2*t1*t*cl1.y + t*t*cl2.y;
			
			return point;
		}
	};

    extend(CAAT.Bezier, CAAT.Curve, null);
	
})();

(function() {

    /**
     * CatmullRom curves solver implementation.
     * <p>
     * This object manages one single catmull rom segment, that is 4 points.
     * A complete spline should be managed with CAAT.Path.setCatmullRom with a complete list of points.
     *
     * @constructor
     * @extends CAAT.Curve
     */
	CAAT.CatmullRom = function() {
		CAAT.CatmullRom.superclass.constructor.call(this);
		return this;
	};
	
	CAAT.CatmullRom.prototype= {

        /**
         * Set curve control points.
         * @param points Array<CAAT.Point>
         */
		setCurve : function( p0, p1, p2, p3 ) {

			this.coordlist= [];
            this.coordlist.push( p0 );
            this.coordlist.push( p1 );
            this.coordlist.push( p2 );
            this.coordlist.push( p3 );

			this.update();

            return this;
		},
        /**
         * Paint the contour by solving again the entire curve.
         * @param director {CAAT.Director}
         */
		paint: function(director) {
			
			var x1,y1;

            // Catmull rom solves from point 1 !!!

			x1 = this.coordlist[1].x;
			y1 = this.coordlist[1].y;
			
			var ctx= director.ctx;
			
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(x1,y1);
			
			var point= new CAAT.Point();

			for(var t=this.k;t<=1+this.k;t+=this.k){
				this.solve(point,t);
				ctx.lineTo(point.x,point.y);
			}
			
			ctx.stroke();
			ctx.restore();
			
			CAAT.CatmullRom.superclass.paint.call(this,director);
		},
        /**
         * Solves the curve for any given parameter t.
         * @param point {CAAT.Point} the point to store the solved value on the curve.
         * @param t {number} a number in the range 0..1
         */
		solve: function(point,t) {
			var c= this.coordlist;

            // Handy from CAKE. Thanks.
            var af = ((-t+2)*t-1)*t*0.5
            var bf = (((3*t-5)*t)*t+2)*0.5
            var cf = ((-3*t+4)*t+1)*t*0.5
            var df = ((t-1)*t*t)*0.5

            point.x= c[0].x * af + c[1].x * bf + c[2].x * cf + c[3].x * df;
            point.y= c[0].y * af + c[1].y * bf + c[2].y * cf + c[3].y * df;

			return point;

		}
	};

    extend(CAAT.CatmullRom, CAAT.Curve, null);
})();/**
 * See LICENSE file.
 *
 * Hold a 2D point information.
 * Think about the possibility of turning CAAT.Point into {x:,y:}.
 *
 **/
(function() {

    /**
     *
     * A point defined by two coordinates.
     *
     * @param xpos {number}
     * @param ypos {number}
     *
     * @constructor
     */
	CAAT.Point= function(xpos, ypos, zpos) {
		this.x= xpos;
		this.y= ypos;
        this.z= zpos||0;
		return this;
	};
	
	CAAT.Point.prototype= {
		x:  0,
	    y:  0,
        z:  0,

        /**
         * Sets this point coordinates.
         * @param x {number}
         * @param y {number}
         *
         * @return this
         */
		set : function(x,y,z) {
			this.x= x;
			this.y= y;
            this.z= z||0;
			return this;
		},
        /**
         * Create a new CAAT.Point equal to this one.
         * @return {CAAT.Point}
         */
        clone : function() {
            var p= new CAAT.Point(this.x, this.y, this.z );
            return p;
        },
        /**
         * Translate this point to another position. The final point will be (point.x+x, point.y+y)
         * @param x {number}
         * @param y {number}
         *
         * @return this
         */
        translate : function(x,y,z) {
            this.x+= x;
            this.y+= y;
            this.z+= z;

            return this;
        },
        /**
         * Translate this point to another point.
         * @param aPoint {CAAT.Point}
         * @return this
         */
		translatePoint: function(aPoint) {
		    this.x += aPoint.x;
		    this.y += aPoint.y;
            this.z += aPoint.z;
		    return this;
		},
        /**
         * Substract a point from this one.
         * @param aPoint {CAAT.Point}
         * @return this
         */
		subtract: function(aPoint) {
			this.x -= aPoint.x;
			this.y -= aPoint.y;
            this.z -= aPoint.z;
			return this;
		},
        /**
         * Multiply this point by a scalar.
         * @param factor {number}
         * @return this
         */
		multiply: function(factor) {
			this.x *= factor;
			this.y *= factor;
            this.z *= factor;
			return this;
		},
        /**
         * Rotate this point by an angle. The rotation is held by (0,0) coordinate as center.
         * @param angle {number}
         * @return this
         */
		rotate: function(angle) {
			var x = this.x, y = this.y;
		    this.x = x * Math.cos(angle) - Math.sin(angle) * y;
		    this.y = x * Math.sin(angle) + Math.cos(angle) * y;
            this.z = 0;
		    return this;
		},
        /**
         *
         * @param angle {number}
         * @return this
         */
		setAngle: function(angle) {
		    var len = this.getLength();
		    this.x = Math.cos(angle) * len;
		    this.y = Math.sin(angle) * len;
            this.z = 0;
		    return this;
		},
        /**
         *
         * @param length {number}
         * @return this
         */
		setLength: function(length)	{
		    var len = this.getLength();
		    if (len)this.multiply(length / len);
		    else this.x = this.y = this.z = length;
		    return this;
		},
        /**
         * Normalize this point, that is, both set coordinates proportionally to values raning 0..1
         * @return this
         */
		normalize: function() {
		    var len = this.getLength();
		    this.x /= len;
		    this.y /= len;
            this.z /= len;
		    return this;
		},
        /**
         * Return the angle from -Pi to Pi of this point.
         * @return {number}
         */
		getAngle: function() {
		    return Math.atan2(this.y, this.x);
		},
        /**
         * Set this point coordinates proportinally to a maximum value.
         * @param max {number}
         * @return this
         */
		limit: function(max) {
			var aLenthSquared = this.getLengthSquared();
			if(aLenthSquared+0.01 > max*max)
			{
				var aLength = Math.sqrt(aLenthSquared);
				this.x= (this.x/aLength) * max;
				this.y= (this.y/aLength) * max;
                this.z= (this.z/aLength) * max;
			}
            return this;
		},
        /**
         * Get this point's lenght.
         * @return {number}
         */
		getLength: function() {
		    var length = Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
		    if ( length < 0.005 && length > -0.005) return 0.000001;
		    return length;

		},
        /**
         * Get this point's squared length.
         * @return {number}
         */
		getLengthSquared: function() {
		    var lengthSquared = this.x*this.x + this.y*this.y + this.z*this.z;
		    if ( lengthSquared < 0.005 && lengthSquared > -0.005) return 0;
		    return lengthSquared;
		},
        /**
         * Get the distance between two points.
         * @param point {CAAT.Point}
         * @return {number}
         */
		getDistance: function(point) {
			var deltaX = this.x - point.x;
			var deltaY = this.y - point.y;
            var deltaZ = this.z - point.z;
			return Math.sqrt( deltaX*deltaX + deltaY*deltaY + deltaZ*deltaZ );
		},
        /**
         * Get the squared distance between two points.
         * @param point {CAAT.Point}
         * @return {number}
         */
		getDistanceSquared: function(point) {
			var deltaX = this.x - point.x;
			var deltaY = this.y - point.y;
            var deltaZ = this.z - point.z;
			return deltaX*deltaX + deltaY*deltaY + deltaZ*deltaZ;
		},
        /**
         * Get a string representation.
         * @return {string}
         */
		toString: function() {
			return "(CAAT.Point)" +
                    " x:" + String(Math.round(Math.floor(this.x*10))/10) +
                    " y:" + String(Math.round(Math.floor(this.y*10))/10) +
                    " z:" + String(Math.round(Math.floor(this.z*10))/10);
		}
	};
})();/**
 * Created by Ibon Tolosana - @hyperandroid
 * User: ibon
 * Date: 02/02/12
 * Time: 19:29
 */

(function() {

    CAAT.QuadTree= function() {
        return this;
    };

    var QT_MAX_ELEMENTS=    1;
    var QT_MIN_WIDTH=       32;

    CAAT.QuadTree.prototype= {

        bgActors      :   null,

        quadData    :   null,

        create : function( l,t, r,b, backgroundElements, minWidth, maxElements ) {

            if ( typeof minWidth==='undefined' ) {
                minWidth= QT_MIN_WIDTH;
            }
            if ( typeof maxElements==='undefined' ) {
                maxElements= QT_MAX_ELEMENTS;
            }

            var cx= (l+r)/2;
            var cy= (t+b)/2;

            this.x=         l;
            this.y=         t;
            this.x1=        r;
            this.y1=        b;
            this.width=     r-l;
            this.height=    b-t;

            this.bgActors= this.__getOverlappingActorList( backgroundElements );

            if ( this.bgActors.length <= maxElements || this.width <= minWidth ) {
                return this;
            }

            this.quadData= new Array(4);
            this.quadData[0]= new CAAT.QuadTree().create( l,t,cx,cy, this.bgActors );  // TL
            this.quadData[1]= new CAAT.QuadTree().create( cx,t,r,cy, this.bgActors );  // TR
            this.quadData[2]= new CAAT.QuadTree().create( l,cy,cx,b, this.bgActors );  // BL
            this.quadData[3]= new CAAT.QuadTree().create( cx,cy,r,b, this.bgActors );

            return this;
        },

        __getOverlappingActorList : function( actorList ) {
            var tmpList= [];
            for( var i=0, l=actorList.length; i<l; i++ ) {
                var actor= actorList[i];
                if ( this.intersects( actor.AABB ) ) {
                    tmpList.push( actor );
                }
            }
            return tmpList;
        },

        getOverlappingActors : function( rectangle ) {
            var i,j,l;
            var overlappingActors= [];
            var qoverlappingActors;
            var actors= this.bgActors;
            var actor;

            if ( this.quadData ) {
                for( i=0; i<4; i++ ) {
                    if ( this.quadData[i].intersects( rectangle ) ) {
                        qoverlappingActors= this.quadData[i].getOverlappingActors(rectangle);
                        for( j=0,l=qoverlappingActors.length; j<l; j++ ) {
                            overlappingActors.push( qoverlappingActors[j] );
                        }
                    }
                }
            } else {
                for( i=0, l=actors.length; i<l; i++ ) {
                    actor= actors[i];
                    if ( rectangle.intersects( actor.AABB ) ) {
                        overlappingActors.push( actor );
                    }
                }
            }

            return overlappingActors;
        }
    };

    extend( CAAT.QuadTree, CAAT.Rectangle );
})();

(function() {

    CAAT.SpatialHash= function() {
        return this;
    };

    CAAT.SpatialHash.prototype= {

        elements    :   null,

        width       :   null,
        height      :   null,

        rows        :   null,
        columns     :   null,

        xcache      :   null,
        ycache      :   null,
        xycache     :   null,

        rectangle   :   null,
        r0          :   null,
        r1          :   null,

        initialize : function( w,h, rows,columns ) {

            var i, j;

            this.elements= [];
            for( i=0; i<rows*columns; i++ ) {
                this.elements.push( [] );
            }

            this.width=     w;
            this.height=    h;

            this.rows=      rows;
            this.columns=   columns;

            this.xcache= [];
            for( i=0; i<w; i++ ) {
                this.xcache.push( (i/(w/columns))>>0 );
            }

            this.ycache= [];
            for( i=0; i<h; i++ ) {
                this.ycache.push( (i/(h/rows))>>0 );
            }

            this.xycache=[];
            for( i=0; i<this.rows; i++ ) {

                this.xycache.push( [] );
                for( j=0; j<this.columns; j++ ) {
                    this.xycache[i].push( j + i*columns  );
                }
            }

            this.rectangle= new CAAT.Rectangle().setBounds( 0, 0, w, h );
            this.r0=        new CAAT.Rectangle();
            this.r1=        new CAAT.Rectangle();

            return this;
        },

        clearObject : function() {
            var i;

            for( i=0; i<this.rows*this.columns; i++ ) {
                this.elements[i]= [];
            }

            return this;
        },

        /**
         * Add an element of the form { id, x,y,width,height, rectangular }
         */
        addObject : function( obj  ) {
            var x= obj.x|0;
            var y= obj.y|0;
            var width= obj.width|0;
            var height= obj.height|0;

            var cells= this.__getCells( x,y,width,height );
            for( var i=0; i<cells.length; i++ ) {
                this.elements[ cells[i] ].push( obj );
            }
        },

        __getCells : function( x,y,width,height ) {

            var cells= [];
            var i;

            if ( this.rectangle.contains(x,y) ) {
                cells.push( this.xycache[ this.ycache[y] ][ this.xcache[x] ] );
            }

            /**
             * if both squares lay inside the same cell, it is not crossing a boundary.
             */
            if ( this.rectangle.contains(x+width-1,y+height-1) ) {
                var c= this.xycache[ this.ycache[y+height-1] ][ this.xcache[x+width-1] ];
                if ( c===cells[0] ) {
                    return cells;
                }
                cells.push( c );
            }

            /**
             * the other two AABB points lie inside the screen as well.
             */
            if ( this.rectangle.contains(x+width-1,y) ) {
                var c= this.xycache[ this.ycache[y] ][ this.xcache[x+width-1] ];
                if ( c===cells[0] || c===cells[1] ) {
                    return cells;
                }
                cells.push(c);
            }

            // worst case, touching 4 screen cells.
            if ( this.rectangle.contains(x+width-1,y+height-1) ) {
                var c= this.xycache[ this.ycache[y+height-1] ][ this.xcache[x] ];
                cells.push(c);
            }

            return cells;
        },

        /**
         *
         * @param x
         * @param y
         * @param w
         * @param h
         * @param oncollide function that returns boolean. if returns true, stop testing collision.
         */
        collide : function( x,y,w,h, oncollide ) {
            x|=0;
            y|=0;
            w|=0;
            h|=0;

            var cells= this.__getCells( x,y,w,h );
            var i,j,l;
            var el= this.elements;

            this.r0.setBounds( x,y,w,h );

            for( i=0; i<cells.length; i++ ) {
                var cell= cells[i];

                var elcell= el[cell];
                for( j=0, l=elcell.length; j<l; j++ ) {
                    var obj= elcell[j];

                    this.r1.setBounds( obj.x, obj.y, obj.width, obj.height );

                    // collides
                    if ( this.r0.intersects( this.r1 ) ) {
                        if ( oncollide(obj) ) {
                            return;
                        }
                    }
                }
            }
        }

    };
})();/**
 * See LICENSE file.
 *
 * Generate interpolator.
 *
 * Partially based on Robert Penner easing equations.
 * http://www.robertpenner.com/easing/
 *
 *
 **/


(function() {
    /**
     * a CAAT.Interpolator is a function which transforms a value into another but with some constraints:
     *
     * <ul>
     * <li>The input values must be between 0 and 1.
     * <li>Output values will be between 0 and 1.
     * <li>Every Interpolator has at least an entering boolean parameter called pingpong. if set to true, the Interpolator
     * will set values from 0..1 and back from 1..0. So half the time for each range.
     * </ul>
     *
     * <p>
     * CAAt.Interpolator is defined by a createXXXX method which sets up an internal getPosition(time)
     * function. You could set as an Interpolator up any object which exposes a method getPosition(time)
     * and returns a CAAT.Point or an object of the form {x:{number}, y:{number}}.
     * <p>
     * In the return value, the x attribute's value will be the same value as that of the time parameter,
     * and y attribute will hold a value between 0 and 1 with the resulting value of applying the
     * interpolation function for the time parameter.
     *
     * <p>
     * For am exponential interpolation, the getPosition function would look like this:
     * <code>function getPosition(time) { return { x:time, y: Math.pow(time,2) }�}</code>.
     * meaning that for time=0.5, a value of 0,5*0,5 should use instead.
     *
     * <p>
     * For a visual understanding of interpolators see tutorial 4 interpolators, or play with technical
     * demo 1 where a SpriteActor moves along a path and the way it does can be modified by every
     * out-of-the-box interpolator.
     *
     * @constructor
     *
     */
    CAAT.Interpolator = function() {
        this.interpolated= new CAAT.Point(0,0,0);
        return this;
    };

    CAAT.Interpolator.prototype= {

        interpolated:   null,   // a coordinate holder for not building a new CAAT.Point for each interpolation call.
        paintScale:     90,     // the size of the interpolation draw on screen in pixels.

        /**
         * Set a linear interpolation function.
         *
         * @param bPingPong {boolean}
         * @param bInverse {boolean} will values will be from 1 to 0 instead of 0 to 1 ?.
         */
        createLinearInterpolator : function(bPingPong, bInverse) {
            /**
             * Linear and inverse linear interpolation function.
             * @param time {number}
             */
            this.getPosition= function getPosition(time) {

                var orgTime= time;

                if ( bPingPong ) {
                    if ( time<0.5 ) {
                        time*=2;
                    } else {
                        time= 1-(time-0.5)*2;
                    }
                }

                if ( bInverse!==null && bInverse ) {
                    time= 1-time;
                }

                return this.interpolated.set(orgTime,time);
            };

            return this;
        },
        createBackOutInterpolator : function(bPingPong) {
            this.getPosition= function getPosition(time) {
                var orgTime= time;

                if ( bPingPong ) {
                    if ( time<0.5 ) {
                        time*=2;
                    } else {
                        time= 1-(time-0.5)*2;
                    }
                }

                time = time - 1;
                var overshoot= 1.70158;

                return this.interpolated.set(
                        orgTime,
                        time * time * ((overshoot + 1) * time + overshoot) + 1);
            };

            return this;
        },
        /**
         * Set an exponential interpolator function. The function to apply will be Math.pow(time,exponent).
         * This function starts with 0 and ends in values of 1.
         *
         * @param exponent {number} exponent of the function.
         * @param bPingPong {boolean}
         */
        createExponentialInInterpolator : function(exponent, bPingPong) {
            this.getPosition= function getPosition(time) {
                var orgTime= time;

                if ( bPingPong ) {
                    if ( time<0.5 ) {
                        time*=2;
                    } else {
                        time= 1-(time-0.5)*2;
                    }
                }
                return this.interpolated.set(orgTime,Math.pow(time,exponent));
            };

            return this;
        },
        /**
         * Set an exponential interpolator function. The function to apply will be 1-Math.pow(time,exponent).
         * This function starts with 1 and ends in values of 0.
         *
         * @param exponent {number} exponent of the function.
         * @param bPingPong {boolean}
         */
        createExponentialOutInterpolator : function(exponent, bPingPong) {
            this.getPosition= function getPosition(time) {
                var orgTime= time;

                if ( bPingPong ) {
                    if ( time<0.5 ) {
                        time*=2;
                    } else {
                        time= 1-(time-0.5)*2;
                    }
                }
                return this.interpolated.set(orgTime,1-Math.pow(1-time,exponent));
            };

            return this;
        },
        /**
         * Set an exponential interpolator function. Two functions will apply:
         * Math.pow(time*2,exponent)/2 for the first half of the function (t<0.5) and
         * 1-Math.abs(Math.pow(time*2-2,exponent))/2 for the second half (t>=.5)
         * This function starts with 0 and goes to values of 1 and ends with values of 0.
         *
         * @param exponent {number} exponent of the function.
         * @param bPingPong {boolean}
         */
        createExponentialInOutInterpolator : function(exponent, bPingPong) {
            this.getPosition= function getPosition(time) {
                var orgTime= time;

                if ( bPingPong ) {
                    if ( time<0.5 ) {
                        time*=2;
                    } else {
                        time= 1-(time-0.5)*2;
                    }
                }
                if ( time*2<1 ) {
                    return this.interpolated.set(orgTime,Math.pow(time*2,exponent)/2);
                }
                
                return this.interpolated.set(orgTime,1-Math.abs(Math.pow(time*2-2,exponent))/2);
            };

            return this;
        },
        /**
         * Creates a Quadric bezier curbe as interpolator.
         *
         * @param p0 {CAAT.Point} a CAAT.Point instance.
         * @param p1 {CAAT.Point} a CAAT.Point instance.
         * @param p2 {CAAT.Point} a CAAT.Point instance.
         * @param bPingPong {boolean} a boolean indicating if the interpolator must ping-pong.
         */
        createQuadricBezierInterpolator : function(p0,p1,p2,bPingPong) {
            this.getPosition= function getPosition(time) {
                var orgTime= time;

                if ( bPingPong ) {
                    if ( time<0.5 ) {
                        time*=2;
                    } else {
                        time= 1-(time-0.5)*2;
                    }
                }

                time= (1-time)*(1-time)*p0.y + 2*(1-time)*time*p1.y + time*time*p2.y;

                return this.interpolated.set( orgTime, time );
            };

            return this;
        },
        /**
         * Creates a Cubic bezier curbe as interpolator.
         *
         * @param p0 {CAAT.Point} a CAAT.Point instance.
         * @param p1 {CAAT.Point} a CAAT.Point instance.
         * @param p2 {CAAT.Point} a CAAT.Point instance.
         * @param p3 {CAAT.Point} a CAAT.Point instance.
         * @param bPingPong {boolean} a boolean indicating if the interpolator must ping-pong.
         */
        createCubicBezierInterpolator : function(p0,p1,p2,p3,bPingPong) {
            this.getPosition= function getPosition(time) {
                var orgTime= time;

                if ( bPingPong ) {
                    if ( time<0.5 ) {
                        time*=2;
                    } else {
                        time= 1-(time-0.5)*2;
                    }
                }

                var t2= time*time;
                var t3= time*t2;

                time = (p0.y + time * (-p0.y * 3 + time * (3 * p0.y -
                        p0.y * time))) + time * (3 * p1.y + time * (-6 * p1.y +
                        p1.y * 3 * time)) + t2 * (p2.y * 3 - p2.y * 3 * time) +
                        p3.y * t3;

                return this.interpolated.set( orgTime, time );
            };

            return this;
        },
        createElasticOutInterpolator : function(amplitude,p,bPingPong) {
            this.getPosition= function getPosition(time) {

            if ( bPingPong ) {
                if ( time<0.5 ) {
                    time*=2;
                } else {
                    time= 1-(time-0.5)*2;
                }
            }

            if (time === 0) {
                return {x:0,y:0};
            }
            if (time === 1) {
                return {x:1,y:1};
            }

            var s = p/(2*Math.PI) * Math.asin (1/amplitude);
            return this.interpolated.set(
                    time,
                    (amplitude*Math.pow(2,-10*time) * Math.sin( (time-s)*(2*Math.PI)/p ) + 1 ) );
            };
            return this;
        },
        createElasticInInterpolator : function(amplitude,p,bPingPong) {
            this.getPosition= function getPosition(time) {

            if ( bPingPong ) {
                if ( time<0.5 ) {
                    time*=2;
                } else {
                    time= 1-(time-0.5)*2;
                }
            }

            if (time === 0) {
                return {x:0,y:0};
            }
            if (time === 1) {
                return {x:1,y:1};
            }

            var s = p/(2*Math.PI) * Math.asin (1/amplitude);
            return this.interpolated.set(
                    time,
                    -(amplitude*Math.pow(2,10*(time-=1)) * Math.sin( (time-s)*(2*Math.PI)/p ) ) );
            };

            return this;
        },
        createElasticInOutInterpolator : function(amplitude,p,bPingPong) {
            this.getPosition= function getPosition(time) {

            if ( bPingPong ) {
                if ( time<0.5 ) {
                    time*=2;
                } else {
                    time= 1-(time-0.5)*2;
                }
            }

            var s = p/(2*Math.PI) * Math.asin (1/amplitude);
            time*=2;
            if ( time<=1 ) {
                return this.interpolated.set(
                        time,
                        -0.5*(amplitude*Math.pow(2,10*(time-=1)) * Math.sin( (time-s)*(2*Math.PI)/p )));
            }

            return this.interpolated.set(
                    time,
                    1+0.5*(amplitude*Math.pow(2,-10*(time-=1)) * Math.sin( (time-s)*(2*Math.PI)/p )));
            };

            return this;
        },
        /**
         * @param time {number}
         * @private
         */
        bounce : function(time) {
            if ((time /= 1) < (1 / 2.75)) {
                return {x:time, y:7.5625 * time * time};
            } else if (time < (2 / 2.75)) {
                return {x:time, y:7.5625 * (time -= (1.5 / 2.75)) * time + 0.75};
            } else if (time < (2.5 / 2.75)) {
                return {x:time, y:7.5625 * (time -= (2.25 / 2.75)) * time + 0.9375};
            } else {
                return {x:time, y:7.5625*(time-=(2.625/2.75))*time+0.984375};
            }
        },
        createBounceOutInterpolator : function(bPingPong) {
            this.getPosition= function getPosition(time) {
                if ( bPingPong ) {
                    if ( time<0.5 ) {
                        time*=2;
                    } else {
                        time= 1-(time-0.5)*2;
                    }
                }
                return this.bounce(time);
            };

            return this;
        },
        createBounceInInterpolator : function(bPingPong) {

            this.getPosition= function getPosition(time) {
                if ( bPingPong ) {
                    if ( time<0.5 ) {
                        time*=2;
                    } else {
                        time= 1-(time-0.5)*2;
                    }
                }
                var r= this.bounce(1-time);
                r.y= 1-r.y;
                return r;
            };

            return this;
        },
        createBounceInOutInterpolator : function(bPingPong) {

            this.getPosition= function getPosition(time) {
                if ( bPingPong ) {
                    if ( time<0.5 ) {
                        time*=2;
                    } else {
                        time= 1-(time-0.5)*2;
                    }
                }

                var r;
                if (time < 0.5) {
                    r= this.bounce(1 - time * 2);
                    r.y= (1 - r.y)* 0.5;
                    return r;
                }
                r= this.bounce(time * 2 - 1,bPingPong);
                r.y= r.y* 0.5 + 0.5;
                return r;
            };

            return this;
        },
        /**
         * Paints an interpolator on screen.
         * @param director {CAAT.Director} a CAAT.Director instance.
         * @param time {number} an integer indicating the scene time the Interpolator will be drawn at. This value is useless.
         */
        paint : function(director,time) {

            var canvas= director.crc;
            canvas.save();
            canvas.beginPath();

            canvas.moveTo( 0, this.getPosition(0).y * this.paintScale );

            for( var i=0; i<=this.paintScale; i++ ) {
                canvas.lineTo( i, this.getPosition(i/this.paintScale).y * this.paintScale );
            }

            canvas.strokeStyle='black';
            canvas.stroke();
            canvas.restore();
        },
        /**
         * Gets an array of coordinates which define the polyline of the intepolator's curve contour.
         * Values for both coordinates range from 0 to 1. 
         * @param iSize {number} an integer indicating the number of contour segments.
         * @return array {[CAAT.Point]} of object of the form {x:float, y:float}.
         */
        getContour : function(iSize) {
            var contour=[];
            for( var i=0; i<=iSize; i++ ) {
                contour.push( {x: i/iSize, y: this.getPosition(i/iSize).y} );
            }

            return contour;
        },
        /**
         *
         */
        enumerateInterpolators : function() {
            return [
                new CAAT.Interpolator().createLinearInterpolator(false, false), 'Linear pingpong=false, inverse=false',
                new CAAT.Interpolator().createLinearInterpolator(true,  false), 'Linear pingpong=true, inverse=false',

                new CAAT.Interpolator().createLinearInterpolator(false, true), 'Linear pingpong=false, inverse=true',
                new CAAT.Interpolator().createLinearInterpolator(true,  true), 'Linear pingpong=true, inverse=true',

                new CAAT.Interpolator().createExponentialInInterpolator(    2, false), 'ExponentialIn pingpong=false, exponent=2',
                new CAAT.Interpolator().createExponentialOutInterpolator(   2, false), 'ExponentialOut pingpong=false, exponent=2',
                new CAAT.Interpolator().createExponentialInOutInterpolator( 2, false), 'ExponentialInOut pingpong=false, exponent=2',
                new CAAT.Interpolator().createExponentialInInterpolator(    2, true), 'ExponentialIn pingpong=true, exponent=2',
                new CAAT.Interpolator().createExponentialOutInterpolator(   2, true), 'ExponentialOut pingpong=true, exponent=2',
                new CAAT.Interpolator().createExponentialInOutInterpolator( 2, true), 'ExponentialInOut pingpong=true, exponent=2',

                new CAAT.Interpolator().createExponentialInInterpolator(    4, false), 'ExponentialIn pingpong=false, exponent=4',
                new CAAT.Interpolator().createExponentialOutInterpolator(   4, false), 'ExponentialOut pingpong=false, exponent=4',
                new CAAT.Interpolator().createExponentialInOutInterpolator( 4, false), 'ExponentialInOut pingpong=false, exponent=4',
                new CAAT.Interpolator().createExponentialInInterpolator(    4, true), 'ExponentialIn pingpong=true, exponent=4',
                new CAAT.Interpolator().createExponentialOutInterpolator(   4, true), 'ExponentialOut pingpong=true, exponent=4',
                new CAAT.Interpolator().createExponentialInOutInterpolator( 4, true), 'ExponentialInOut pingpong=true, exponent=4',

                new CAAT.Interpolator().createExponentialInInterpolator(    6, false), 'ExponentialIn pingpong=false, exponent=6',
                new CAAT.Interpolator().createExponentialOutInterpolator(   6, false), 'ExponentialOut pingpong=false, exponent=6',
                new CAAT.Interpolator().createExponentialInOutInterpolator( 6, false), 'ExponentialInOut pingpong=false, exponent=6',
                new CAAT.Interpolator().createExponentialInInterpolator(    6, true), 'ExponentialIn pingpong=true, exponent=6',
                new CAAT.Interpolator().createExponentialOutInterpolator(   6, true), 'ExponentialOut pingpong=true, exponent=6',
                new CAAT.Interpolator().createExponentialInOutInterpolator( 6, true), 'ExponentialInOut pingpong=true, exponent=6',

                new CAAT.Interpolator().createBounceInInterpolator(false), 'BounceIn pingpong=false',
                new CAAT.Interpolator().createBounceOutInterpolator(false), 'BounceOut pingpong=false',
                new CAAT.Interpolator().createBounceInOutInterpolator(false), 'BounceInOut pingpong=false',
                new CAAT.Interpolator().createBounceInInterpolator(true), 'BounceIn pingpong=true',
                new CAAT.Interpolator().createBounceOutInterpolator(true), 'BounceOut pingpong=true',
                new CAAT.Interpolator().createBounceInOutInterpolator(true), 'BounceInOut pingpong=true',

                new CAAT.Interpolator().createElasticInInterpolator(    1.1, 0.4, false), 'ElasticIn pingpong=false, amp=1.1, d=.4',
                new CAAT.Interpolator().createElasticOutInterpolator(   1.1, 0.4, false), 'ElasticOut pingpong=false, amp=1.1, d=.4',
                new CAAT.Interpolator().createElasticInOutInterpolator( 1.1, 0.4, false), 'ElasticInOut pingpong=false, amp=1.1, d=.4',
                new CAAT.Interpolator().createElasticInInterpolator(    1.1, 0.4, true), 'ElasticIn pingpong=true, amp=1.1, d=.4',
                new CAAT.Interpolator().createElasticOutInterpolator(   1.1, 0.4, true), 'ElasticOut pingpong=true, amp=1.1, d=.4',
                new CAAT.Interpolator().createElasticInOutInterpolator( 1.1, 0.4, true), 'ElasticInOut pingpong=true, amp=1.1, d=.4',

                new CAAT.Interpolator().createElasticInInterpolator(    1.0, 0.2, false), 'ElasticIn pingpong=false, amp=1.0, d=.2',
                new CAAT.Interpolator().createElasticOutInterpolator(   1.0, 0.2, false), 'ElasticOut pingpong=false, amp=1.0, d=.2',
                new CAAT.Interpolator().createElasticInOutInterpolator( 1.0, 0.2, false), 'ElasticInOut pingpong=false, amp=1.0, d=.2',
                new CAAT.Interpolator().createElasticInInterpolator(    1.0, 0.2, true), 'ElasticIn pingpong=true, amp=1.0, d=.2',
                new CAAT.Interpolator().createElasticOutInterpolator(   1.0, 0.2, true), 'ElasticOut pingpong=true, amp=1.0, d=.2',
                new CAAT.Interpolator().createElasticInOutInterpolator( 1.0, 0.2, true), 'ElasticInOut pingpong=true, amp=1.0, d=.2'
            ];
        }

    };
})();

/**
 * See LICENSE file.
 *
 * Behaviors are keyframing elements.
 * By using a BehaviorContainer, you can specify different actions on any animation Actor.
 * An undefined number of Behaviors can be defined for each Actor.
 *
 * There're the following Behaviors:
 *  + AlphaBehavior:   controls container/actor global alpha.
 *  + RotateBehavior:  takes control of rotation affine transform.
 *  + ScaleBehavior:   takes control of scaling on x/y axis affine transform.
 *  + PathBehavior:    takes control of translating an Actor/ActorContainer across a path [ie. pathSegment collection].
 *  + GenericBehavior: applies a behavior to any given target object's property, or notifies a callback.
 *
 *
 **/

(function() {
    /**
     * Behavior base class.
     *
     * <p>
     * A behavior is defined by a frame time (behavior duration) and a behavior application function called interpolator.
     * In its default form, a behaviour is applied linearly, that is, the same amount of behavior is applied every same
     * time interval.
     * <p>
     * A concrete Behavior, a rotateBehavior in example, will change a concrete Actor's rotationAngle during the specified
     * period.
     * <p>
     * A behavior is guaranteed to notify (if any observer is registered) on behavior expiration.
     * <p>
     * A behavior can keep an unlimited observers. Observers are objects of the form:
     * <p>
     * <code>
     * {
     *      behaviorExpired : function( behavior, time, actor);
     *      behaviorApplied : function( behavior, time, normalizedTime, actor, value);
     * }
     * </code>
     * <p>
     * <strong>behaviorExpired</strong>: function( behavior, time, actor). This method will be called for any registered observer when
     * the scene time is greater than behavior's startTime+duration. This method will be called regardless of the time
     * granurality.
     * <p>
     * <strong>behaviorApplied</strong> : function( behavior, time, normalizedTime, actor, value). This method will be called once per
     * frame while the behavior is not expired and is in frame time (behavior startTime>=scene time). This method can be
     * called multiple times.
     * <p>
     * Every behavior is applied to a concrete Actor.
     * Every actor must at least define an start and end value. The behavior will set start-value at behaviorStartTime and
     * is guaranteed to apply end-value when scene time= behaviorStartTime+behaviorDuration.
     * <p>
     * You can set behaviors to apply forever that is cyclically. When a behavior is cycle=true, won't notify
     * behaviorExpired to its registered observers.
     * <p>
     * Other Behaviors simply must supply with the method <code>setForTime(time, actor)</code> overriden.
     *
     * @constructor
     */
    CAAT.Behavior= function() {
		this.lifecycleListenerList=[];
		this.setDefaultInterpolator();
		return this;
	};

    /**
     * @enum
     */
    CAAT.Behavior.Status= {
        NOT_STARTED:    0,
        STARTED:        1,
        EXPIRED:        2
    };

    var DefaultInterpolator=    new CAAT.Interpolator().createLinearInterpolator(false);
    var DefaultPPInterpolator=  new CAAT.Interpolator().createLinearInterpolator(true);

	CAAT.Behavior.prototype= {
			
		lifecycleListenerList:		null,   // observer list.
		behaviorStartTime:	-1,             // scene time to start applying the behavior
		behaviorDuration:	-1,             // behavior duration in ms.
		cycleBehavior:		false,          // apply forever ?

        status:             CAAT.Behavior.NOT_STARTED,

		interpolator:		null,           // behavior application function. linear by default.
        actor:              null,           // actor the Behavior acts on.
        id:                 0,              // an integer id suitable to identify this behavior by number.

        timeOffset:         0,

        doValueApplication: true,

        solved          :   true,

        setValueApplication : function( apply ) {
            this.doValueApplication= apply;
            return this;
        },

        setTimeOffset : function( offset ) {
            this.timeOffset= offset;
            return this;
        },

        /**
         * Sets this behavior id.
         * @param id an integer.
         *
         */
        setId : function( id ) {
            this.id= id;
            return this;
        },
        /**
         * Sets the default interpolator to a linear ramp, that is, behavior will be applied linearly.
         * @return this
         */
		setDefaultInterpolator : function() {
			this.interpolator= DefaultInterpolator;
            return this;
		},
        /**
         * Sets default interpolator to be linear from 0..1 and from 1..0.
         * @return this
         */
		setPingPong : function() {
			this.interpolator= DefaultPPInterpolator;
            return this;
		},

        /**
         *
         * @param status {CAAT.Behavior.Status}
         */
        setStatus : function(status) {
            this.status= status;
        },

        /**
         * Sets behavior start time and duration.
         * Scene time will be the time of the scene the behavior actor is bound to.
         * @param startTime {number} an integer indicating behavior start time in scene time in ms..
         * @param duration {number} an integer indicating behavior duration in ms.
         */
		setFrameTime : function( startTime, duration ) {
			this.behaviorStartTime= startTime;
			this.behaviorDuration=  duration;
            this.setStatus( CAAT.Behavior.Status.NOT_STARTED );

            return this;
		},
        /**
         * Sets behavior start time and duration but instead as setFrameTime which sets initial time as absolute time
         * regarding scene's time, it uses a relative time offset from current scene time.
         * a call to
         *   setFrameTime( scene.time, duration ) is equivalent to
         *   setDelayTime( 0, duration )
         * @param delay {number}
         * @param duration {number}
         */
        setDelayTime : function( delay, duration ) {
            this.behaviorStartTime= delay;
            this.behaviorDuration=  duration;
            this.setStatus( CAAT.Behavior.Status.NOT_STARTED );
            this.solved= false;

            return this;

        },
        setOutOfFrameTime : function() {
            this.setStatus( CAAT.Behavior.Status.EXPIRED );
            this.behaviorStartTime= Number.MAX_VALUE;
            this.behaviorDuration= 0;
            return this;
        },
        /**
         * Changes behavior default interpolator to another instance of CAAT.Interpolator.
         * If the behavior is not defined by CAAT.Interpolator factory methods, the interpolation function must return
         * its values in the range 0..1. The behavior will only apply for such value range.
         * @param interpolator a CAAT.Interpolator instance.
         */
		setInterpolator : function(interpolator) {
			this.interpolator= interpolator;
            return this;
		},
        /**
         * This method must no be called directly.
         * The director loop will call this method in orther to apply actor behaviors.
         * @param time the scene time the behaviro is being applied at.
         * @param actor a CAAT.Actor instance the behavior is being applied to.
         */
		apply : function( time, actor )	{

            if ( !this.solved ) {
                this.behaviorStartTime+= time;
                this.solved= true;
            }

            time+= this.timeOffset*this.behaviorDuration;

            var orgTime= time;
			if ( this.isBehaviorInTime(time,actor) )	{
				time= this.normalizeTime(time);
				this.fireBehaviorAppliedEvent(
                        actor,
                        orgTime,
                        time,
                        this.setForTime( time, actor ) );
			}
		},

        /**
         * Sets the behavior to cycle, ie apply forever.
         * @param bool a boolean indicating whether the behavior is cycle.
         */
		setCycle : function(bool) {
			this.cycleBehavior= bool;
            return this;
		},
        /**
         * Adds an observer to this behavior.
         * @param behaviorListener an observer instance.
         */
		addListener : function( behaviorListener ) {
            this.lifecycleListenerList.push(behaviorListener);
            return this;
		},
        /**
         * Remove all registered listeners to the behavior.
         */
        emptyListenerList : function() {
            this.lifecycleListenerList= [];
            return this;
        },
        /**
         * @return an integer indicating the behavior start time in ms..
         */
		getStartTime : function() {
			return this.behaviorStartTime;
		},
        /**
         * @return an integer indicating the behavior duration time in ms.
         */
		getDuration : function() {
			return this.behaviorDuration;
			
		},
        /**
         * Chekcs whether the behaviour is in scene time.
         * In case it gets out of scene time, and has not been tagged as expired, the behavior is expired and observers
         * are notified about that fact.
         * @param time the scene time to check the behavior against.
         * @param actor the actor the behavior is being applied to.
         * @return a boolean indicating whether the behavior is in scene time.
         */
		isBehaviorInTime : function(time,actor) {

            var S= CAAT.Behavior.Status;

			if ( this.status===S.EXPIRED || this.behaviorStartTime<0 )	{
				return false;
			}
			
			if ( this.cycleBehavior )	{
				if ( time>=this.behaviorStartTime )	{
					time= (time-this.behaviorStartTime)%this.behaviorDuration + this.behaviorStartTime;
				}
			}
			
			if ( time>this.behaviorStartTime+this.behaviorDuration )	{
				if ( this.status!==S.EXPIRED )	{
					this.setExpired(actor,time);
				}
				
				return false;
			}

            if ( this.status===S.NOT_STARTED ) {
                this.status=S.STARTED;
                this.fireBehaviorStartedEvent(actor,time);
            }

			return this.behaviorStartTime<=time; // && time<this.behaviorStartTime+this.behaviorDuration;
		},

        fireBehaviorStartedEvent : function(actor,time) {
            for( var i=0; i<this.lifecycleListenerList.length; i++ )	{
                if ( this.lifecycleListenerList[i].behaviorStarted ) {
                    this.lifecycleListenerList[i].behaviorStarted(this,time,actor);
                }
            }
        },

        /**
         * Notify observers about expiration event.
         * @param actor a CAAT.Actor instance
         * @param time an integer with the scene time the behavior was expired at.
         */
		fireBehaviorExpiredEvent : function(actor,time)	{
			for( var i=0; i<this.lifecycleListenerList.length; i++ )	{
				this.lifecycleListenerList[i].behaviorExpired(this,time,actor);
			}
		},
        /**
         * Notify observers about behavior being applied.
         * @param actor a CAAT.Actor instance the behavior is being applied to.
         * @param time the scene time of behavior application.
         * @param normalizedTime the normalized time (0..1) considering 0 behavior start time and 1
         * behaviorStartTime+behaviorDuration.
         * @param value the value being set for actor properties. each behavior will supply with its own value version.
         */
        fireBehaviorAppliedEvent : function(actor,time,normalizedTime,value)	{
            for( var i=0; i<this.lifecycleListenerList.length; i++ )	{
                if (this.lifecycleListenerList[i].behaviorApplied) {
                    this.lifecycleListenerList[i].behaviorApplied(this,time,normalizedTime,actor,value);
                }
            }
        },
        /**
         * Convert scene time into something more manageable for the behavior.
         * behaviorStartTime will be 0 and behaviorStartTime+behaviorDuration will be 1.
         * the time parameter will be proportional to those values.
         * @param time the scene time to be normalized. an integer.
         */
		normalizeTime : function(time)	{
			time= time-this.behaviorStartTime;
			if ( this.cycleBehavior )	{
				time%=this.behaviorDuration;
			}
			return this.interpolator.getPosition(time/this.behaviorDuration).y;
		},
        /**
         * Sets the behavior as expired.
         * This method must not be called directly. It is an auxiliary method to isBehaviorInTime method.
         * @param actor {CAAT.Actor}
         * @param time {integer} the scene time.
         *
         * @private
         */
		setExpired : function(actor,time) {
            // set for final interpolator value.
            this.status= CAAT.Behavior.Status.EXPIRED;
			this.setForTime(this.interpolator.getPosition(1).y,actor);
			this.fireBehaviorExpiredEvent(actor,time);
		},
        /**
         * This method must be overriden for every Behavior breed.
         * Must not be called directly.
         * @param actor {CAAT.Actor} a CAAT.Actor instance.
         * @param time {number} an integer with the scene time.
         *
         * @private
         */
		setForTime : function( time, actor ) {
			
		},
        /**
         * @param overrides
         */
        initialize : function(overrides) {
            if (overrides) {
               for (var i in overrides) {
                  this[i] = overrides[i];
               }
            }

            return this;
        },
        
        getPropertyName : function() {
            return "";
        }
	};
})();

(function() {
    /**
     * <p>
     * A ContainerBehavior is a holder to sum up different behaviors.
     * <p>
     * It imposes some constraints to contained Behaviors:
     * <ul>
     * <li>The time of every contained behavior will be zero based, so the frame time set for each behavior will
     * be referred to the container's behaviorStartTime and not scene time as usual.
     * <li>Cycling a ContainerBehavior means cycling every contained behavior.
     * <li>The container will not impose any Interpolator, so calling the method <code>setInterpolator(CAAT.Interpolator)
     * </code> will be useless.
     * <li>The Behavior application time will be bounded to the Container's frame time. I.E. if we set a container duration
     * to 10 seconds, setting a contained behavior's duration to 15 seconds will be useless since the container will stop
     * applying the behavior after 10 seconds have elapsed.
     * <li>Every ContainerBehavior adds itself as an observer for its contained Behaviors. The main reason is because
     * ContainerBehaviors modify cycling properties of its contained Behaviors. When a contained
     * Behavior is expired, if the Container has isCycle=true, will unexpire the contained Behavior, otherwise, it won't be
     * applied in the next frame. It is left up to the developer to manage correctly the logic of other posible contained
     * behaviors observers.
     * </ul>
     *
     * <p>
     * A ContainerBehavior can contain other ContainerBehaviors at will.
     * <p>
     * A ContainerBehavior will not apply any CAAT.Actor property change by itself, but will instrument its contained
     * Behaviors to do so.
     *
     * @constructor
     * @extends CAAT.Behavior
     */
    CAAT.ContainerBehavior= function() {
		CAAT.ContainerBehavior.superclass.constructor.call(this);
		this.behaviors= [];
		return this;
	};

    CAAT.ContainerBehavior.prototype= {

		behaviors:	null,   // contained behaviors array

        /**
         * Proportionally change this container duration to its children.
         * @param duration {number} new duration in ms.
         * @return this;
         */
        conformToDuration : function( duration ) {
            this.duration= duration;
            
            var f= duration/this.duration;
            var bh;
            for( var i=0; i<this.behavior.length; i++ ) {
                bh= this.behavior[i];
                bh.setFrameTime( bh.getStartTime()*f, bh.getDuration()*f );
            }

            return this;
        },

        /**
         * Adds a new behavior to the container.
         * @param behavior
         *
         * @override
         */
		addBehavior : function(behavior)	{
			this.behaviors.push(behavior);
			behavior.addListener(this);
            return this;
		},
        /**
         * Applies every contained Behaviors.
         * The application time the contained behaviors will receive will be ContainerBehavior related and not the
         * received time.
         * @param time an integer indicating the time to apply the contained behaviors at.
         * @param actor a CAAT.Actor instance indicating the actor to apply the behaviors for.
         */
		apply : function(time, actor) {

            time+= this.timeOffset*this.behaviorDuration;
            
			if ( this.isBehaviorInTime(time,actor) )	{
				time-= this.getStartTime();
				if ( this.cycleBehavior ){
					time%= this.getDuration();
				}

                var bh= this.behaviors;
				for( var i=0; i<bh.length; i++ )	{
					bh[i].apply(time, actor);
				}
			}
		},
        /**
         * This method is the observer implementation for every contained behavior.
         * If a container is Cycle=true, won't allow its contained behaviors to be expired.
         * @param behavior a CAAT.Behavior instance which has been expired.
         * @param time an integer indicating the time at which has become expired.
         * @param actor a CAAT.Actor the expired behavior is being applied to.
         */
		behaviorExpired : function(behavior,time,actor) {
			if ( this.cycleBehavior )	{
                behavior.setStatus( CAAT.Behavior.Status.STARTED );
			}
		},
        /**
         * Implementation method of the behavior.
         * Just call implementation method for its contained behaviors.
         * @param time an intenger indicating the time the behavior is being applied at.
         * @param actor a CAAT.Actor the behavior is being applied to.
         */
		setForTime : function(time, actor) {
            var bh= this.behaviors;
			for( var i=0; i<bh.length; i++ ) {
				bh[i].setForTime( time, actor );
			}

            return null;
		},

        setExpired : function(actor,time) {
            CAAT.ContainerBehavior.superclass.setExpired.call(this,actor,time);

            var bh= this.behaviors;
            // set for final interpolator value.
            for( var i=0; i<bh.length; i++ ) {
                var bb= bh[i];
                if ( /*!bb.expired*/ bb.status!==CAAT.Behavior.Status.EXPIRED ) {
                    bb.setExpired(actor,time-this.behaviorStartTime);
                }
            }
            // already notified in base class.
            // this.fireBehaviorExpiredEvent(actor,time);
            return this;
        },

        setFrameTime : function( start, duration )  {
            CAAT.ContainerBehavior.superclass.setFrameTime.call(this,start,duration);

            var bh= this.behaviors;
            for( var i=0; i<bh.length; i++ ) {
                //bh[i].expired= false;
                bh[i].setStatus( CAAT.Behavior.Status.NOT_STARTED );
            }
            return this;
        },

        calculateKeyFrameData : function(referenceTime, prefix, prevValues )  {

            var i;
            var bh;

            var retValue= {};
            var time;
            var cssRuleValue;
            var cssProperty;
            var property;

            for( i=0; i<this.behaviors.length; i++ ) {
                bh= this.behaviors[i];
                if ( /*!bh.expired*/ bh.status!==CAAT.Behavior.Status.EXPIRED && !(bh instanceof CAAT.GenericBehavior) ) {

                    // ajustar tiempos:
                    //  time es tiempo normalizado a duracion de comportamiento contenedor.
                    //      1.- desnormalizar
                    time= referenceTime * this.behaviorDuration;

                    //      2.- calcular tiempo relativo de comportamiento respecto a contenedor
                    if ( bh.behaviorStartTime<=time && bh.behaviorStartTime+bh.behaviorDuration>=time ) {
                        //      3.- renormalizar tiempo reltivo a comportamiento.
                        time= (time-bh.behaviorStartTime)/bh.behaviorDuration;

                        //      4.- obtener valor de comportamiento para tiempo normalizado relativo a contenedor
                        cssRuleValue= bh.calculateKeyFrameData(time);
                        cssProperty= bh.getPropertyName(prefix);

                        if ( typeof retValue[cssProperty] ==='undefined' ) {
                            retValue[cssProperty]= "";
                        }

                        //      5.- asignar a objeto, par de propiedad/valor css
                        retValue[cssProperty]+= cssRuleValue+" ";
                    }

                }
            }


            var tr="";
            var pv;
            function xx(pr) {
                if ( retValue[pr] ) {
                    tr+= retValue[pr];
                } else {
                    if ( prevValues ) {
                        pv= prevValues[pr];
                        if ( pv ) {
                            tr+= pv;
                            retValue[pr]= pv;
                        }
                    }
                }

            }

            xx('translate');
            xx('rotate');
            xx('scale');

            var keyFrameRule= "";

            if ( tr ) {
                keyFrameRule='-'+prefix+'-transform: '+tr+';';
            }

            tr="";
            xx('opacity');
            if( tr ) {
                keyFrameRule+= ' opacity: '+tr+';';
            }

            return {
                rules: keyFrameRule,
                ret: retValue
            };

        },

        /**
         *
         * @param prefix
         * @param name
         * @param keyframessize
         */
        calculateKeyFramesData : function(prefix, name, keyframessize) {

            if ( this.duration===Number.MAX_VALUE ) {
                return "";
            }

            if ( typeof keyframessize==='undefined' ) {
                keyframessize=100;
            }

            var i;
            var prevValues= null;
            var kfd= "@-"+prefix+"-keyframes "+name+" {";
            var ret;
            var time;
            var kfr;

            for( i=0; i<=keyframessize; i++ )    {
                time= this.interpolator.getPosition(i/keyframessize).y;
                ret= this.calculateKeyFrameData(time, prefix, prevValues);
                kfr= "" +
                    (i/keyframessize*100) + "%" + // percentage
                    "{" + ret.rules + "}\n";

                prevValues= ret.ret;
                kfd+= kfr;
            }

            kfd+= "}";

            return kfd;
        }

	};

    extend( CAAT.ContainerBehavior, CAAT.Behavior, null );
})();

(function() {
    /**
     * This class applies a rotation to a CAAt.Actor instance.
     * StartAngle, EndAngle must be supplied. Angles are in radians.
     * The RotationAnchor, if not supplied, will be ANCHOR_CENTER.
     *
     * An example os use will be
     *
     * var rb= new CAAT.RotateBehavior().
     *      setValues(0,2*Math.PI).
     *      setFrameTime(0,2500);
     *
     * @see CAAT.Actor.
     *
     * @constructor
     * @extends CAAT.Behavior
     *
     */
    CAAT.RotateBehavior= function() {
		CAAT.RotateBehavior.superclass.constructor.call(this);
		this.anchor= CAAT.Actor.prototype.ANCHOR_CENTER;
		return this;
	};
	
	CAAT.RotateBehavior.prototype= {
	
		startAngle:	0,  // behavior start angle
		endAngle:	0,  // behavior end angle
        anchorX:    .50,  // rotation center x.
        anchorY:    .50,  // rotation center y.

        getPropertyName : function() {
            return "rotate";
        },

        /**
         * Behavior application function.
         * Do not call directly.
         * @param time an integer indicating the application time.
         * @param actor a CAAT.Actor the behavior will be applied to.
         * @return the set angle.
         */
		setForTime : function(time,actor) {
			var angle= this.startAngle + time*(this.endAngle-this.startAngle);

            if ( this.doValueApplication ) {
                actor.setRotationAnchored(angle, this.anchorX, this.anchorY);
            }

            return angle;
			
		},
        /**
         * Set behavior bound values.
         * if no anchorx,anchory values are supplied, the behavior will assume
         * 50% for both values, that is, the actor's center.
         *
         * Be aware the anchor values are supplied in <b>RELATIVE PERCENT</b> to
         * actor's size.
         *
         * @param startAngle {float} indicating the starting angle.
         * @param endAngle {float} indicating the ending angle.
         * @param anchorx {float} the percent position for anchorX
         * @param anchory {float} the percent position for anchorY
         */
        setValues : function( startAngle, endAngle, anchorx, anchory ) {
            this.startAngle= startAngle;
            this.endAngle= endAngle;
            if ( typeof anchorx!=='undefined' && typeof anchory!=='undefined' ) {
                this.anchorX= anchorx;
                this.anchorY= anchory;
            }
            return this;
        },
        /**
         * @deprecated
         * Use setValues instead
         * @param start
         * @param end
         */
        setAngles : function( start, end ) {
            return this.setValues(start,end);
        },
        /**
         * Set the behavior rotation anchor. Use this method when setting an exact percent
         * by calling setValues is complicated.
         * @see CAAT.Actor
         * @param anchor any of CAAT.Actor.prototype.ANCHOR_* constants.
         *
         * These parameters are to set a custom rotation anchor point. if <code>anchor==CAAT.Actor.prototype.ANCHOR_CUSTOM
         * </code> the custom rotation point is set.
         * @param rx
         * @param ry
         *
         */
        setAnchor : function( actor, rx, ry ) {
            this.anchorX= rx/actor.width;
            this.anchorY= ry/actor.height;
            return this;
        },


        calculateKeyFrameData : function( time ) {
            time= this.interpolator.getPosition(time).y;
            return "rotate(" + (this.startAngle + time*(this.endAngle-this.startAngle)) +"rad)";
        },

        /**
         * @param prefix {string} browser vendor prefix
         * @param name {string} keyframes animation name
         * @param keyframessize {integer} number of keyframes to generate
         * @override
         */
        calculateKeyFramesData : function(prefix, name, keyframessize) {

            if ( typeof keyframessize==='undefined' ) {
                keyframessize= 100;
            }
            keyframessize>>=0;

            var i;
            var kfr;
            var kfd= "@-"+prefix+"-keyframes "+name+" {";

            for( i=0; i<=keyframessize; i++ )    {
                kfr= "" +
                    (i/keyframessize*100) + "%" + // percentage
                    "{" +
                        "-"+prefix+"-transform:" + this.calculateKeyFrameData(i/keyframessize) +
                    "}\n";

                kfd+= kfr;
            }

            kfd+="}";

            return kfd;
        }

	};

    extend( CAAT.RotateBehavior, CAAT.Behavior, null);
    
})();

(function() {
    /**
     * <p>
     * A generic behavior is supposed to be extended to create new behaviors when the out-of-the-box
     * ones are not sufficient. It applies the behavior result to a given target object in two ways:
     *
     * <ol>
     * <li>defining the property parameter: the toolkit will perform target_object[property]= calculated_value_for_time.
     * <li>defining a callback function. Sometimes setting of a property is not enough. In example,
     * for a give property in a DOM element, it is needed to set object.style['left']= '70px';
     * With the property approach, you won't be able to add de 'px' suffix to the value, and hence won't
     * work correctly. The function callback will allow to take control by receiving as parameters the
     * target object, and the calculated value to apply by the behavior for the given time.
     * </ol>
     *
     * <p>
     * For example, this code will move a dom element from 0 to 400 px on x during 1 second:
     * <code>
     * <p>
     * var enterBehavior= new CAAT.GenericBehavior(). <br>
     * &nbsp;&nbsp;setFrameTime( scene.time, 1000 ). <br>
     * &nbsp;&nbsp;setValues( <br>
     * &nbsp;&nbsp;&nbsp;&nbsp;0, <br>
     * &nbsp;&nbsp;&nbsp;&nbsp;400, <br>
     * &nbsp;&nbsp;&nbsp;&nbsp;domElement, <br>
     * &nbsp;&nbsp;&nbsp;&nbsp;null, <br>
     * &nbsp;&nbsp;&nbsp;&nbsp;function( currentValue, target ) { <br>
     * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;target.style['left']= currentValue+'px'; <br>
     * &nbsp;&nbsp;&nbsp;&nbsp;} <br>
     * &nbsp;&nbsp;); <br>
     * </code>
     *
     * @constructor
     * @extends CAAT.Behavior
     *
     */
    CAAT.GenericBehavior= function() {
        CAAT.GenericBehavior.superclass.constructor.call(this);
        return this;
    };

    CAAT.GenericBehavior.prototype= {

        start:      0,
        end:        0,
        target:     null,
        property:   null,
        callback:   null,

        /**
         * Sets the target objects property to the corresponding value for the given time.
         * If a callback function is defined, it is called as well.
         *
         * @param time {number} the scene time to apply the behavior at.
         * @param actor {CAAT.Actor} a CAAT.Actor object instance.
         */
        setForTime : function(time, actor) {
            var value= this.start+ time*(this.end-this.start);
            if ( this.callback ) {
                this.callback( value, this.target, actor );
            }

            if ( this.property ) {
                this.target[this.property]= value;
            }
        },
        /**
         * Defines the values to apply this behavior.
         *
         * @param start {number} initial behavior value.
         * @param end {number} final behavior value.
         * @param target {object} an object. Usually a CAAT.Actor.
         * @param property {string} target object's property to set value to.
         * @param callback {function} a function of the form <code>function( target, value )</code>.
         */
        setValues : function( start, end, target, property, callback ) {
            this.start= start;
            this.end= end;
            this.target= target;
            this.property= property;
            this.callback= callback;
            return this;
        }
    };

    extend( CAAT.GenericBehavior, CAAT.Behavior, null);
})();

(function() {

    /**
     * ScaleBehavior applies scale affine transforms in both axis.
     * StartScale and EndScale must be supplied for each axis. This method takes care of a FF bug in which if a Scale is
     * set to 0, the animation will fail playing.
     *
     * This behavior specifies anchors in values ranges 0..1
     *
     * @constructor
     * @extends CAAT.Behavior
     *
     */
	CAAT.ScaleBehavior= function() {
		CAAT.ScaleBehavior.superclass.constructor.call(this);
		this.anchor= CAAT.Actor.prototype.ANCHOR_CENTER;
		return this;
	};
	
	CAAT.ScaleBehavior.prototype= {
        startScaleX:    1,
        endScaleX:      1,
        startScaleY:    1,
        endScaleY:	    1,
        anchorX:        .50,
        anchorY:        .50,

        getPropertyName : function() {
            return "scale";
        },

        /**
         * Applies corresponding scale values for a given time.
         * 
         * @param time the time to apply the scale for.
         * @param actor the target actor to Scale.
         * @return {object} an object of the form <code>{ scaleX: {float}, scaleY: {float}�}</code>
         */
		setForTime : function(time,actor) {

			var scaleX= this.startScaleX + time*(this.endScaleX-this.startScaleX);
			var scaleY= this.startScaleY + time*(this.endScaleY-this.startScaleY);

            // Firefox 3.x & 4, will crash animation if either scaleX or scaleY equals 0.
            if (0===scaleX ) {
                scaleX=0.01;
            }
            if (0===scaleY ) {
                scaleY=0.01;
            }

            if ( this.doValueApplication ) {
			    actor.setScaleAnchored( scaleX, scaleY, this.anchorX, this.anchorY );
            }

            return { scaleX: scaleX, scaleY: scaleY };
		},
        /**
         * Define this scale behaviors values.
         *
         * Be aware the anchor values are supplied in <b>RELATIVE PERCENT</b> to
         * actor's size.
         *
         * @param startX {number} initial X axis scale value.
         * @param endX {number} final X axis scale value.
         * @param startY {number} initial Y axis scale value.
         * @param endY {number} final Y axis scale value.
         * @param anchorx {float} the percent position for anchorX
         * @param anchory {float} the percent position for anchorY
         *
         * @return this.
         */
        setValues : function( startX, endX, startY, endY, anchorx, anchory ) {
            this.startScaleX= startX;
            this.endScaleX=   endX;
            this.startScaleY= startY;
            this.endScaleY=   endY;

            if ( typeof anchorx!=='undefined' && typeof anchory!=='undefined' ) {
                this.anchorX= anchorx;
                this.anchorY= anchory;
            }

            return this;
        },
        /**
         * Set an exact position scale anchor. Use this method when it is hard to
         * set a thorough anchor position expressed in percentage.
         * @param actor
         * @param x
         * @param y
         */
        setAnchor : function( actor, x, y ) {
            this.anchorX= x/actor.width;
            this.anchorY= y/actor.height;

            return this;
        },

        calculateKeyFrameData : function( time ) {
            var scaleX;
            var scaleY;

            time= this.interpolator.getPosition(time).y;
            scaleX= this.startScaleX + time*(this.endScaleX-this.startScaleX);
            scaleY= this.startScaleY + time*(this.endScaleY-this.startScaleY);

            return "scaleX("+scaleX+") scaleY("+scaleY+")";
        },

        calculateKeyFramesData : function(prefix, name, keyframessize) {

            if ( typeof keyframessize==='undefined' ) {
                keyframessize= 100;
            }
            keyframessize>>=0;

            var i;
            var kfr;
            var kfd= "@-"+prefix+"-keyframes "+name+" {";

            for( i=0; i<=keyframessize; i++ )    {
                kfr= "" +
                    (i/keyframessize*100) + "%" + // percentage
                    "{" +
                        "-"+prefix+"-transform:" + this.calculateKeyFrameData(i/keyframessize) +
                    "}";

                kfd+= kfr;
            }

            kfd+="}";

            return kfd;
        }
	};

    extend( CAAT.ScaleBehavior, CAAT.Behavior, null);
})();

(function() {
    /**
     * AlphaBehavior modifies alpha composition property for an actor.
     *
     * @constructor
     * @extends CAAT.Behavior
     */
	CAAT.AlphaBehavior= function() {
		CAAT.AlphaBehavior.superclass.constructor.call(this);
		return this;
	};
	
	CAAT.AlphaBehavior.prototype= {
		startAlpha:	0,
		endAlpha:	0,

        getPropertyName : function() {
            return "opacity";
        },

        /**
         * Applies corresponding alpha transparency value for a given time.
         *
         * @param time the time to apply the scale for.
         * @param actor the target actor to set transparency for.
         * @return {number} the alpha value set. Normalized from 0 (total transparency) to 1 (total opacity)
         */
		setForTime : function(time,actor) {
            var alpha= (this.startAlpha+time*(this.endAlpha-this.startAlpha));
            if ( this.doValueApplication ) {
                actor.setAlpha( alpha );
            }
            return alpha;
        },
        /**
         * Set alpha transparency minimum and maximum value.
         * This value can be coerced by Actor's property isGloblAlpha.
         *
         * @param start {number} a float indicating the starting alpha value.
         * @param end {number} a float indicating the ending alpha value.
         */
        setValues : function( start, end ) {
            this.startAlpha= start;
            this.endAlpha= end;
            return this;
        },

        calculateKeyFrameData : function( time ) {
            time= this.interpolator.getPosition(time).y;
            return  (this.startAlpha+time*(this.endAlpha-this.startAlpha));
        },

        /**
         * @param prefix {string} browser vendor prefix
         * @param name {string} keyframes animation name
         * @param keyframessize {integer} number of keyframes to generate
         * @override
         */
        calculateKeyFramesData : function(prefix, name, keyframessize) {

            if ( typeof keyframessize==='undefined' ) {
                keyframessize= 100;
            }
            keyframessize>>=0;

            var i;
            var kfr;
            var kfd= "@-"+prefix+"-keyframes "+name+" {";

            for( i=0; i<=keyframessize; i++ )    {
                kfr= "" +
                    (i/keyframessize*100) + "%" + // percentage
                    "{" +
                         "opacity: " + this.calculateKeyFrameData( i / keyframessize ) +
                    "}";

                kfd+= kfr;
            }

            kfd+="}";

            return kfd;
        }
	};

    extend( CAAT.AlphaBehavior, CAAT.Behavior, null);
})();

(function() {
    /**
     * CAAT.PathBehavior modifies the position of a CAAT.Actor along the path represented by an
     * instance of <code>CAAT.Path</code>.
     *
     * @constructor
     * @extends CAAT.Behavior
     *
     */
	CAAT.PathBehavior= function() {
		CAAT.PathBehavior.superclass.constructor.call(this);
		return this;
	};

    /**
     * @enum
     */
    CAAT.PathBehavior.autorotate = {
        LEFT_TO_RIGHT:  0,          // fix left_to_right direction
        RIGHT_TO_LEFT:  1,          // fix right_to_left
        FREE:           2           // do not apply correction
    };

	CAAT.PathBehavior.prototype= {
		path:           null,   // the path to traverse
        autoRotate :    false,  // set whether the actor must be rotated tangentially to the path.
        prevX:          -1,     // private, do not use.
        prevY:          -1,     // private, do not use.

        autoRotateOp:   CAAT.PathBehavior.autorotate.FREE,

        getPropertyName : function() {
            return "translate";
        },

        /**
         * Sets an actor rotation to be heading from past to current path's point.
         * Take into account that this will be incompatible with rotation Behaviors
         * since they will set their own rotation configuration.
         * @param autorotate {boolean}
         * @param autorotateOp {CAAT.PathBehavior.autorotate} whether the sprite is drawn heading to the right.
         * @return this.
         */
        setAutoRotate : function( autorotate, autorotateOp ) {
            this.autoRotate= autorotate;
            if (autorotateOp!==undefined) {
                this.autoRotateOp= autorotateOp;
            }
            return this;
        },
        /**
         * Set the behavior path.
         * The path can be any length, and will take behaviorDuration time to be traversed.
         * @param {CAAT.Path}
            *
         * @deprecated
         */
        setPath : function(path) {
            this.path= path;
            return this;
        },

        /**
         * Set the behavior path.
         * The path can be any length, and will take behaviorDuration time to be traversed.
         * @param {CAAT.Path}
         * @return this
         */
        setValues : function(path) {
            return this.setPath(path);
        },

        /**
         * @see Acotr.setPositionAcchor
         * @deprecated
         * @param tx a float with xoffset.
         * @param ty a float with yoffset.
         */
        setTranslation : function( tx, ty ) {
            return this;
        },

        calculateKeyFrameData : function( time ) {
            time= this.interpolator.getPosition(time).y;
            var point= this.path.getPosition(time);
            return "translateX("+point.x+"px) translateY("+point.y+"px)" ;
        },

        calculateKeyFramesData : function(prefix, name, keyframessize) {

            if ( typeof keyframessize==='undefined' ) {
                keyframessize= 100;
            }
            keyframessize>>=0;

            var i;
            var kfr;
            var time;
            var kfd= "@-"+prefix+"-keyframes "+name+" {";

            for( i=0; i<=keyframessize; i++ )    {
                kfr= "" +
                    (i/keyframessize*100) + "%" + // percentage
                    "{" +
                        "-"+prefix+"-transform:" + this.calculateKeyFrameData(i/keyframessize) +
                    "}";

                kfd+= kfr;
            }

            kfd+="}";

            return kfd;
        },

        /**
         * Translates the Actor to the corresponding time path position.
         * If autoRotate=true, the actor is rotated as well. The rotation anchor will (if set) always be ANCHOR_CENTER.
         * @param time an integer indicating the time the behavior is being applied at.
         * @param actor a CAAT.Actor instance to be translated.
         * @return {object} an object of the form <code>{ x: {float}, y: {float}�}</code>.
         */
		setForTime : function(time,actor) {

            if ( !this.path ) {
                return {
                    x: actor.x,
                    y: actor.y
                };
            }

            var point= this.path.getPosition(time);

            if ( this.autoRotate ) {

                if ( -1===this.prevX && -1===this.prevY )	{
                    this.prevX= point.x;
                    this.prevY= point.y;
                }

                var ax= point.x-this.prevX;
                var ay= point.y-this.prevY;

                if ( ax===0 && ay===0 ) {
                    actor.setLocation( point.x, point.y );
                    return { x: actor.x, y: actor.y };
                }

                var angle= Math.atan2( ay, ax );
                var si= CAAT.SpriteImage.prototype;
                var pba= CAAT.PathBehavior.autorotate;

                // actor is heading left to right
                if ( this.autoRotateOp===pba.LEFT_TO_RIGHT ) {
                    if ( this.prevX<=point.x )	{
                        actor.setImageTransformation( si.TR_NONE );
                    }
                    else	{
                        actor.setImageTransformation( si.TR_FLIP_HORIZONTAL );
                        angle+=Math.PI;
                    }
                } else if ( this.autoRotateOp===pba.RIGHT_TO_LEFT ) {
                    if ( this.prevX<=point.x )	{
                        actor.setImageTransformation( si.TR_FLIP_HORIZONTAL );
                    }
                    else	{
                        actor.setImageTransformation( si.TR_NONE );
                        angle-=Math.PI;
                    }
                }

                actor.setRotation(angle);

                this.prevX= point.x;
                this.prevY= point.y;

                var modulo= Math.sqrt(ax*ax+ay*ay);
                ax/=modulo;
                ay/=modulo;
            }

            if ( this.doValueApplication ) {
                actor.setLocation( point.x, point.y );
                return { x: actor.x, y: actor.y };
            } else {
                return {
                    x: point.x,
                    y: point.y
                };
            }


		},
        /**
         * Get a point on the path.
         * If the time to get the point at is in behaviors frame time, a point on the path will be returned, otherwise
         * a default {x:-1, y:-1} point will be returned.
         *
         * @param time {number} the time at which the point will be taken from the path.
         * @return {object} an object of the form {x:float y:float}
         */
        positionOnTime : function(time) {
			if ( this.isBehaviorInTime(time,null) )	{
				time= this.normalizeTime(time);
                return this.path.getPosition( time );
            }

            return {x:-1, y:-1};

        }
	};

    extend( CAAT.PathBehavior, CAAT.Behavior );
})();

(function() {

    /**
     * ColorBehavior interpolates between two given colors.
     * @constructor
     */
    CAAT.ColorBehavior= function() {
        return this;
    };

    CAAT.ColorBehavior.prototype= {

    };

    extend( CAAT.ColorBehavior, CAAT.Behavior );

})();

(function() {

    /**
     *
     * Scale only X or Y axis, instead both at the same time as ScaleBehavior.
     *
     * @constructor
     */
    CAAT.Scale1Behavior= function() {
		CAAT.Scale1Behavior.superclass.constructor.call(this);
		this.anchor= CAAT.Actor.prototype.ANCHOR_CENTER;
		return this;
	};

	CAAT.Scale1Behavior.prototype= {
        startScale: 1,
        endScale:   1,
        anchorX:    .50,
        anchorY:    .50,

        sx          : 1,
        sy          : 1,

        applyOnX    : true,

        getPropertyName : function() {
            return "scale";
        },

        /**
         * Applies corresponding scale values for a given time.
         *
         * @param time the time to apply the scale for.
         * @param actor the target actor to Scale.
         * @return {object} an object of the form <code>{ scaleX: {float}, scaleY: {float}�}</code>
         */
		setForTime : function(time,actor) {

			var scale= this.startScale + time*(this.endScale-this.startScale);

            // Firefox 3.x & 4, will crash animation if either scaleX or scaleY equals 0.
            if (0===scale ) {
                scale=0.01;
            }

            if ( this.doValueApplication ) {
                if ( this.applyOnX ) {
			        actor.setScaleAnchored( scale, actor.scaleY, this.anchorX, this.anchorY );
                } else {
                    actor.setScaleAnchored( actor.scaleX, scale, this.anchorX, this.anchorY );
                }
            }

            return scale;
		},
        /**
         * Define this scale behaviors values.
         *
         * Be aware the anchor values are supplied in <b>RELATIVE PERCENT</b> to
         * actor's size.
         *
         * @param start {number} initial X axis scale value.
         * @param end {number} final X axis scale value.
         * @param anchorx {float} the percent position for anchorX
         * @param anchory {float} the percent position for anchorY
         *
         * @return this.
         */
        setValues : function( start, end, applyOnX, anchorx, anchory ) {
            this.startScale= start;
            this.endScale=   end;
            this.applyOnX=   !!applyOnX;

            if ( typeof anchorx!=='undefined' && typeof anchory!=='undefined' ) {
                this.anchorX= anchorx;
                this.anchorY= anchory;
            }

            return this;
        },
        /**
         * Set an exact position scale anchor. Use this method when it is hard to
         * set a thorough anchor position expressed in percentage.
         * @param actor
         * @param x
         * @param y
         */
        setAnchor : function( actor, x, y ) {
            this.anchorX= x/actor.width;
            this.anchorY= y/actor.height;

            return this;
        },

        calculateKeyFrameData : function( time ) {
            var scale;

            time= this.interpolator.getPosition(time).y;
            scale= this.startScale + time*(this.endScale-this.startScale);

            return this.applyOnX ? "scaleX("+scale+")" : "scaleY("+scale+")";
        },

        calculateKeyFramesData : function(prefix, name, keyframessize) {

            if ( typeof keyframessize==='undefined' ) {
                keyframessize= 100;
            }
            keyframessize>>=0;

            var i;
            var kfr;
            var kfd= "@-"+prefix+"-keyframes "+name+" {";

            for( i=0; i<=keyframessize; i++ )    {
                kfr= "" +
                    (i/keyframessize*100) + "%" + // percentage
                    "{" +
                        "-"+prefix+"-transform:" + this.calculateKeyFrameData(i/keyframessize) +
                    "}";

                kfd+= kfr;
            }

            kfd+="}";

            return kfd;
        }
    };

    extend( CAAT.Scale1Behavior, CAAT.Behavior );
})();/**
 * See LICENSE file.
 *
 * This object manages CSS3 transitions reflecting applying behaviors.
 *
 **/

(function() {

    CAAT.CSS= {};

    CAAT.CSS.PREFIX= (function() {

        var prefix = "";
        var prefixes = ['WebKit', 'Moz', 'O'];
        var keyframes= "";

        // guess this browser vendor prefix.
        for (var i = 0; i < prefixes.length; i++) {
            if (window[prefixes[i] + 'CSSKeyframeRule']) {
                prefix = prefixes[i].toLowerCase();
                break;
            }
        }

        CAAT.CSS.PROP_ANIMATION= '-'+prefix+'-animation';

        return prefix;
    })();

    CAAT.CSS.applyKeyframe= function( domElement, name, secs, forever ) {
        domElement.style[CAAT.CSS.PROP_ANIMATION]= name+' '+(secs/1000)+'s linear both '+(forever ? 'infinite' : '') ;
    };

    CAAT.CSS.unregisterKeyframes= function( name ) {
        var index= CAAT.CSS.getCSSKeyframesIndex(name);
        if ( -1!==index ) {
            document.styleSheets[0].deleteRule( index );
        }
    };

    /**
     *
     * @param kfDescriptor {object{ name{string}, behavior{CAAT.Behavior}, size{!number}, overwrite{boolean}}
     */
    CAAT.CSS.registerKeyframes= function( kfDescriptor ) {

        var name=       kfDescriptor.name;
        var behavior=   kfDescriptor.behavior;
        var size=       kfDescriptor.size;
        var overwrite=  kfDescriptor.overwrite;

        if ( typeof name==='undefined' || typeof behavior==='undefined' ) {
            throw 'Keyframes must be defined by a name and a CAAT.Behavior instance.';
        }

        if ( typeof size==='undefined' ) {
            size= 100;
        }
        if ( typeof overwrite==='undefined' ) {
            overwrite= false;
        }

        // find if keyframes has already a name set.
        var cssRulesIndex= CAAT.CSS.getCSSKeyframesIndex(name);
        if (-1!==cssRulesIndex && !overwrite) {
            return;
        }

        var keyframesRule= behavior.calculateKeyframesData(CAAT.CSS.PREFIX, name, size );

        if (document.styleSheets) {
            if ( !document.styleSheets.length) {
                var s = document.createElement('style');
                s.type="text/css";

                document.getElementsByTagName('head')[ 0 ].appendChild(s);
            }

            if ( -1!==cssRulesIndex ) {
                document.styleSheets[0].deleteRule( cssRulesIndex );
            }

            document.styleSheets[0].insertRule( keyframesRule, 0 );
        }

    };

    CAAT.CSS.getCSSKeyframesIndex= function(name) {
        var ss = document.styleSheets;
        for (var i = ss.length - 1; i >= 0; i--) {
            try {
                var s = ss[i],
                    rs = s.cssRules ? s.cssRules :
                         s.rules ? s.rules :
                         [];

                for (var j = rs.length - 1; j >= 0; j--) {
                    if ( ( rs[j].type === window.CSSRule.WEBKIT_KEYFRAMES_RULE ||
                           rs[j].type === window.CSSRule.MOZ_KEYFRAMES_RULE ) && rs[j].name === name) {

                        return j;
                    }
                }
            } catch(e) {
            }
        }

        return -1;
    };

    CAAT.CSS.getCSSKeyframes= function(name) {

        var ss = document.styleSheets;
        for (var i = ss.length - 1; i >= 0; i--) {
            try {
                var s = ss[i],
                    rs = s.cssRules ? s.cssRules :
                         s.rules ? s.rules :
                         [];

                for (var j = rs.length - 1; j >= 0; j--) {
                    if ( ( rs[j].type === window.CSSRule.WEBKIT_KEYFRAMES_RULE ||
                           rs[j].type === window.CSSRule.MOZ_KEYFRAMES_RULE ) && rs[j].name === name) {

                        return rs[j];
                    }
                }
            }
            catch(e) {
            }
        }
        return null;
    };



})();/**
 * 
 * taken from: http://www.quirksmode.org/js/detect.html
 *
 * 20101008 Hyperandroid. IE9 seems to identify himself as Explorer and stopped calling himself MSIE.
 *          Added Explorer description to browser list. Thanks @alteredq for this tip.
 *
 */
(function() {

	CAAT.BrowserDetect = function() {
		this.init();
        return this;
	};

	CAAT.BrowserDetect.prototype = {
		browser: '',
		version: 0,
		OS: '',
		init: function()
		{
			this.browser = this.searchString(this.dataBrowser) || "An unknown browser";
			this.version = this.searchVersion(navigator.userAgent) ||
                    this.searchVersion(navigator.appVersion) ||
                    "an unknown version";
			this.OS = this.searchString(this.dataOS) || "an unknown OS";
		},

		searchString: function (data) {
			for (var i=0;i<data.length;i++)	{
				var dataString = data[i].string;
				var dataProp = data[i].prop;
				this.versionSearchString = data[i].versionSearch || data[i].identity;
				if (dataString) {
					if (dataString.indexOf(data[i].subString) !== -1)
						return data[i].identity;
				}
				else if (dataProp)
					return data[i].identity;
			}
		},
		searchVersion: function (dataString) {
			var index = dataString.indexOf(this.versionSearchString);
			if (index === -1) return;
			return parseFloat(dataString.substring(index+this.versionSearchString.length+1));
		},
		dataBrowser: [
			{
				string: navigator.userAgent,
				subString: "Chrome",
				identity: "Chrome"
			},
			{   string: navigator.userAgent,
			    subString: "OmniWeb",
				versionSearch: "OmniWeb/",
				identity: "OmniWeb"
			},
			{
				string: navigator.vendor,
				subString: "Apple",
				identity: "Safari",
				versionSearch: "Version"
			},
			{
				prop: window.opera,
				identity: "Opera"
			},
			{
				string: navigator.vendor,
				subString: "iCab",
				identity: "iCab"
			},
			{
				string: navigator.vendor,
				subString: "KDE",
				identity: "Konqueror"
			},
			{
				string: navigator.userAgent,
				subString: "Firefox",
				identity: "Firefox"
			},
			{
				string: navigator.vendor,
				subString: "Camino",
				identity: "Camino"
			},
			{		// for newer Netscapes (6+)
				string: navigator.userAgent,
				subString: "Netscape",
				identity: "Netscape"
			},
			{
				string: navigator.userAgent,
				subString: "MSIE",
				identity: "Explorer",
				versionSearch: "MSIE"
			},
			{
				string: navigator.userAgent,
				subString: "Explorer",
				identity: "Explorer",
				versionSearch: "Explorer"
			},
			{
				string: navigator.userAgent,
				subString: "Gecko",
				identity: "Mozilla",
				versionSearch: "rv"
			},
			{ // for older Netscapes (4-)
			    string: navigator.userAgent,
				subString: "Mozilla",
				identity: "Netscape",
				versionSearch: "Mozilla"
			}
		],

		dataOS : [
			{
				string: navigator.platform,
				subString: "Win",
				identity: "Windows"
			},
			{
				string: navigator.platform,
				subString: "Mac",
				identity: "Mac"
			},
			{
				   string: navigator.userAgent,
				   subString: "iPhone",
				   identity: "iPhone/iPod"
			},
			{
				string: navigator.platform,
				subString: "Linux",
				identity: "Linux"
			}
		]
	};
})();/**
 * See LICENSE file.
 *
 * Get realtime Debug information of CAAT's activity.
 * Set CAAT.DEBUG=1 before any CAAT.Director object creation.
 * This class creates a DOM node called 'caat-debug' and associated styles
 * The debug panel is minimized by default and shows short information. It can be expanded and minimized again by clicking on it
 *
 */

(function() {

    CAAT.Debug= function() {
        return this;
    };

    CAAT.Debug.prototype= {

        width:              0,
        height:             0,
        canvas:             null,
        ctx:                null,
        statistics:         null,
        framerate:          null,
        textContainer:      null,
        textFPS:            null,
        textEntitiesTotal:  null,
        textEntitiesActive: null,
        textDraws:          null,
        textDrawTime:       null,
        textRAFTime:        null,
        textDirtyRects:     null,

        frameTimeAcc :      0,
        frameRAFAcc :       0,

        canDebug:           false,

        SCALE:  60,

        debugTpl: 
            "    <style type=\"text/css\">"+
            "        #caat-debug {"+
            "            z-index: 10000;"+
            "            position:fixed;"+
            "            bottom:0;"+
            "            left:0;"+
            "            width:100%;"+
            "            background-color: rgba(0,0,0,0.8);"+
            "        }"+
            "        #caat-debug.caat_debug_max {"+
            "            margin-bottom: 0px;"+
            "        }"+
            "        .caat_debug_bullet {"+
            "            display:inline-block;"+
            "            background-color:#f00;"+
            "            width:8px;"+
            "            height:8px;"+
            "            border-radius: 4px;"+
            "            margin-left:10px;"+
            "            margin-right:2px;"+
            "        }"+
            "        .caat_debug_description {"+
            "            font-size:11px;"+
            "            font-family: helvetica, arial;"+
            "            color: #aaa;"+
            "            display: inline-block;"+
            "        }"+
            "        .caat_debug_value {"+
            "            font-size:11px;"+
            "            font-family: helvetica, arial;"+
            "            color: #fff;"+
            "            width:25px;"+
            "            text-align: right;"+
            "            display: inline-block;"+
            "            margin-right: .3em;"+
            "        }"+
            "        .caat_debug_indicator {"+
            "            float: right;"+
            "        }"+
            "        #debug_tabs {"+
            "            border-top: 1px solid #888;"+
            "            height:25px;"+
            "        }"+
            "        .tab_max_min {"+
            "            font-family: helvetica, arial;"+
            "            font-size: 12px;"+
            "            font-weight: bold;"+
            "            color: #888;"+
            "            border-right: 1px solid #888;"+
            "            float: left;"+
            "            cursor: pointer;"+
            "            padding-left: 5px;"+
            "            padding-right: 5px;"+
            "            padding-top: 5px;"+
            "            height: 20px;"+
            "        }"+
            "        .debug_tabs_content_hidden {"+
            "            display: none;"+
            "            width: 100%;"+
            "        }"+
            "        .debug_tabs_content_visible {"+
            "            display: block;"+
            "            width: 100%;"+
            "        }"+
            "        .checkbox_enabled {"+
            "            display:inline-block;"+
            "            background-color:#eee;"+
            "            border: 1px solid #eee;"+
            "            width:6px;"+
            "            height:8px;"+
            "            margin-left:12px;"+
            "            margin-right:2px;"+
            "            cursor: pointer;"+
            "        }"+
            "        .checkbox_disabled {"+
            "            display:inline-block;"+
            "            width:6px;"+
            "            height:8px;"+
            "            background-color: #333;"+
            "            border: 1px solid #eee;"+
            "            margin-left:12px;"+
            "            margin-right:2px;"+
            "            cursor: pointer;"+
            "        }"+
            "        .checkbox_description {"+
            "            font-size:11px;"+
            "            font-family: helvetica, arial;"+
            "            color: #fff;"+
            "        }"+
            "        .debug_tab {"+
            "            font-family: helvetica, arial;"+
            "            font-size: 12px;"+
            "            color: #fff;"+
            "            border-right: 1px solid #888;"+
            "            float: left;"+
            "            padding-left: 5px;"+
            "            padding-right: 5px;"+
            "            height: 20px;"+
            "            padding-top: 5px;"+
            "            cursor: default;"+
            "        }"+
            "        .debug_tab_selected {"+
            "            background-color: #444;"+
            "            cursor: default;"+
            "        }"+
            "        .debug_tab_not_selected {"+
            "            background-color: #000;"+
            "            cursor: pointer;"+
            "        }"+
            "    </style>"+
            "    <div id=\"caat-debug\">"+
            "        <div id=\"debug_tabs\">"+
            "            <span class=\"tab_max_min\" onCLick=\"javascript: var debug = document.getElementById('debug_tabs_content');if (debug.className === 'debug_tabs_content_visible') {debug.className = 'debug_tabs_content_hidden'} else {debug.className = 'debug_tabs_content_visible'}\"> CAAT Debug panel </span>"+
            "            <span id=\"caat-debug-tab0\" class=\"debug_tab debug_tab_selected\">Performance</span>"+
            "            <span id=\"caat-debug-tab1\" class=\"debug_tab debug_tab_not_selected\">Controls</span>"+
            "            <span class=\"caat_debug_indicator\">"+
            "                <span class=\"caat_debug_bullet\" style=\"background-color:#0f0;\"></span>"+
            "                <span class=\"caat_debug_description\">Draw Time: </span>"+
            "                <span class=\"caat_debug_value\" id=\"textDrawTime\">5.46</span>"+
            "                <span class=\"caat_debug_description\">ms.</span>"+
            "            </span>"+
            "            <span class=\"caat_debug_indicator\">"+
            "                <span class=\"caat_debug_bullet\" style=\"background-color:#f00;\"></span>"+
            "                <span class=\"caat_debug_description\">FPS: </span>"+
            "                <span class=\"caat_debug_value\" id=\"textFPS\">48</span>"+
            "            </span>"+
            "        </div>"+
            "        <div id=\"debug_tabs_content\" class=\"debug_tabs_content_hidden\">"+
            "            <div id=\"caat-debug-tab0-content\">"+
            "                <canvas id=\"caat-debug-canvas\" height=\"60\"></canvas>"+
            "                <div>"+
            "                    <span>"+
            "                        <span class=\"caat_debug_bullet\" style=\"background-color:#0f0;\"></span>"+
            "                        <span class=\"caat_debug_description\">RAF Time:</span>"+
            "                        <span class=\"caat_debug_value\" id=\"textRAFTime\">20.76</span>"+
            "                        <span class=\"caat_debug_description\">ms.</span>"+
            "                    </span>"+
            "                    <span>"+
            "                        <span class=\"caat_debug_bullet\" style=\"background-color:#0ff;\"></span>"+
            "                        <span class=\"caat_debug_description\">Entities Total: </span>"+
            "                        <span class=\"caat_debug_value\" id=\"textEntitiesTotal\">41</span>"+
            "                    </span>"+
            "                    <span>"+
            "                        <span class=\"caat_debug_bullet\" style=\"background-color:#0ff;\"></span>"+
            "                        <span class=\"caat_debug_description\">Entities Active: </span>"+
            "                        <span class=\"caat_debug_value\" id=\"textEntitiesActive\">37</span>"+
            "                    </span>"+
            "                    <span>"+
            "                        <span class=\"caat_debug_bullet\" style=\"background-color:#00f;\"></span>"+
            "                        <span class=\"caat_debug_description\">Draws: </span>"+
            "                        <span class=\"caat_debug_value\" id=\"textDraws\">0</span>"+
            "                    </span>"+
            "                    <span>"+
            "                        <span class=\"caat_debug_bullet\" style=\"background-color:#00f;\"></span>"+
            "                        <span class=\"caat_debug_description\">DirtyRects: </span>"+
            "                        <span class=\"caat_debug_value\" id=\"textDirtyRects\">0</span>"+
            "                    </span>"+
            "                </div>"+
            "            </div>"+
            "            <div id=\"caat-debug-tab1-content\">"+
            "                <div>"+
            "                    <div>"+
            "                        <span id=\"control-sound\"></span>"+
            "                        <span class=\"checkbox_description\">Sound</span>"+
            "                    </div>"+
            "                    <div>"+
            "                        <span id=\"control-music\"></span>"+
            "                        <span class=\"checkbox_description\">Music</span>"+
            "                    </div>"+
            "                    <div>"+
            "                        <span id=\"control-aabb\"></span>"+
            "                        <span class=\"checkbox_description\">AA Bounding Boxes</span>"+
            "                    </div>"+
            "                    <div>"+
            "                        <span id=\"control-bb\"></span>"+
            "                        <span class=\"checkbox_description\">Bounding Boxes</span>"+
            "                    </div>"+
            "                    <div>"+
            "                        <span id=\"control-dr\"></span>"+
            "                        <span class=\"checkbox_description\">Dirty Rects</span>"+
            "                    </div>"+
            "                </div>"+
            "            </div>"+
            "        </div>"+
            "    </div>",


        setScale : function(s) {
            this.scale= s;
            return this;
        },

        initialize: function(w,h) {
            w= window.innerWidth;

            this.width= w;
            this.height= h;

            this.framerate = {
                refreshInterval: CAAT.FPS_REFRESH || 500,   // refresh every ? ms, updating too quickly gives too large rounding errors
                frames: 0,                                  // number offrames since last refresh
                timeLastRefresh: 0,                         // When was the framerate counter refreshed last
                fps: 0,                                     // current framerate
                prevFps: -1,                                // previously drawn FPS
                fpsMin: 1000,                               // minimum measured framerate
                fpsMax: 0                                   // maximum measured framerate
            };

            var debugContainer= document.getElementById('caat-debug');
            if (!debugContainer) {
                var wrap = document.createElement('div');
                wrap.innerHTML=this.debugTpl;
                document.body.appendChild(wrap);

                eval( ""+
                    "        function initCheck( name, bool, callback ) {"+
                    "            var elem= document.getElementById(name);"+
                    "            if ( elem ) {"+
                    "                elem.className= (bool) ? \"checkbox_enabled\" : \"checkbox_disabled\";"+
                    "                if ( callback ) {"+
                    "                    elem.addEventListener( \"click\", (function(elem, callback) {"+
                    "                        return function(e) {"+
                    "                            elem.__value= !elem.__value;"+
                    "                            elem.className= (elem.__value) ? \"checkbox_enabled\" : \"checkbox_disabled\";"+
                    "                            callback(e,elem.__value);"+
                    "                        }"+
                    "                    })(elem, callback), false );"+
                    "                }"+
                    "                elem.__value= bool;"+
                    "            }"+
                    "        }"+
                    "        function setupTabs() {"+
                    "            var numTabs=0;"+
                    "            var elem;"+
                    "            var elemContent;"+
                    "            do {"+
                    "                elem= document.getElementById(\"caat-debug-tab\"+numTabs);"+
                    "                if ( elem ) {"+
                    "                    elemContent= document.getElementById(\"caat-debug-tab\"+numTabs+\"-content\");"+
                    "                    if ( elemContent ) {"+
                    "                        elemContent.style.display= numTabs===0 ? 'block' : 'none';"+
                    "                        elem.className= numTabs===0 ? \"debug_tab debug_tab_selected\" : \"debug_tab debug_tab_not_selected\";"+
                    "                        elem.addEventListener( \"click\", (function(tabIndex) {"+
                    "                            return function(e) {"+
                    "                                for( var i=0; i<numTabs; i++ ) {"+
                    "                                    var _elem= document.getElementById(\"caat-debug-tab\"+i);"+
                    "                                    var _elemContent= document.getElementById(\"caat-debug-tab\"+i+\"-content\");"+
                    "                                    _elemContent.style.display= i===tabIndex ? 'block' : 'none';"+
                    "                                    _elem.className= i===tabIndex ? \"debug_tab debug_tab_selected\" : \"debug_tab debug_tab_not_selected\";"+
                    "                                }"+
                    "                            }"+
                    "                        })(numTabs), false );"+
                    "                    }"+
                    "                    numTabs++;"+
                    "                }"+
                    "            } while( elem );"+
                    "        }"+
                    "        initCheck( \"control-sound\", CAAT.director[0].isSoundEffectsEnabled(), function(e, bool) {"+
                    "            CAAT.director[0].setSoundEffectsEnabled(bool);"+
                    "        } );"+
                    "        initCheck( \"control-music\", CAAT.director[0].isMusicEnabled(), function(e, bool) {"+
                    "            CAAT.director[0].setMusicEnabled(bool);"+
                    "        } );"+
                    "        initCheck( \"control-aabb\", CAAT.DEBUGBB, function(e,bool) {"+
                    "            CAAT.DEBUGAABB= bool;"+
                    "            CAAT.director[0].currentScene.dirty= true;"+
                    "        } );"+
                    "        initCheck( \"control-bb\", CAAT.DEBUGBB, function(e,bool) {"+
                    "            CAAT.DEBUGBB= bool;"+
                    "            if ( bool ) {"+
                    "                CAAT.DEBUGAABB= true;"+
                    "            }"+
                    "            CAAT.director[0].currentScene.dirty= true;"+
                    "        } );"+
                    "        initCheck( \"control-dr\", CAAT.DEBUG_DIRTYRECTS , function( e,bool ) {"+
                    "            CAAT.DEBUG_DIRTYRECTS= bool;"+
                    "        });"+
                    "        setupTabs();" );

            }

            this.canvas= document.getElementById('caat-debug-canvas');
            if ( null===this.canvas ) {
                this.canDebug= false;
                return;
            }

            this.canvas.width= w;
            this.canvas.height=h;
            this.ctx= this.canvas.getContext('2d');

            this.ctx.fillStyle= '#000';
            this.ctx.fillRect(0,0,this.width,this.height);

            this.textFPS= document.getElementById("textFPS");
            this.textDrawTime= document.getElementById("textDrawTime");
            this.textRAFTime= document.getElementById("textRAFTime");
            this.textEntitiesTotal= document.getElementById("textEntitiesTotal");
            this.textEntitiesActive= document.getElementById("textEntitiesActive");
            this.textDraws= document.getElementById("textDraws");
            this.textDirtyRects= document.getElementById("textDirtyRects");


            this.canDebug= true;

            return this;
        },

        debugInfo : function( statistics ) {
            this.statistics= statistics;

            this.frameTimeAcc+= CAAT.FRAME_TIME;
            this.frameRAFAcc+= CAAT.REQUEST_ANIMATION_FRAME_TIME;

            /* Update the framerate counter */
            this.framerate.frames++;
            if ( CAAT.RAF > this.framerate.timeLastRefresh + this.framerate.refreshInterval ) {
                this.framerate.fps = ( ( this.framerate.frames * 1000 ) / ( CAAT.RAF - this.framerate.timeLastRefresh ) ) | 0;
                this.framerate.fpsMin = this.framerate.frames > 0 ? Math.min( this.framerate.fpsMin, this.framerate.fps ) : this.framerate.fpsMin;
                this.framerate.fpsMax = Math.max( this.framerate.fpsMax, this.framerate.fps );

                this.textFPS.innerHTML= this.framerate.fps;

                var value= ((this.frameTimeAcc*100/this.framerate.frames)|0)/100;
                this.frameTimeAcc=0;
                this.textDrawTime.innerHTML= value;

                var value2= ((this.frameRAFAcc*100/this.framerate.frames)|0)/100;
                this.frameRAFAcc=0;
                this.textRAFTime.innerHTML= value2;

                this.framerate.timeLastRefresh = CAAT.RAF;
                this.framerate.frames = 0;

                this.paint(value2);
            }

            this.textEntitiesTotal.innerHTML= this.statistics.size_total;
            this.textEntitiesActive.innerHTML= this.statistics.size_active;
            this.textDirtyRects.innerHTML= this.statistics.size_dirtyRects;
            this.textDraws.innerHTML= this.statistics.draws;
        },

        paint : function( rafValue ) {
            var ctx= this.ctx;
            var t=0;

            ctx.drawImage(
                this.canvas,
                1, 0, this.width-1, this.height,
                0, 0, this.width-1, this.height );

            ctx.strokeStyle= 'black';
            ctx.beginPath();
            ctx.moveTo( this.width-.5, 0 );
            ctx.lineTo( this.width-.5, this.height );
            ctx.stroke();

            ctx.strokeStyle= '#a22';
            ctx.beginPath();
            t= this.height-((20/this.SCALE*this.height)>>0)-.5;
            ctx.moveTo( .5, t );
            ctx.lineTo( this.width+.5, t );
            ctx.stroke();

            ctx.strokeStyle= '#aa2';
            ctx.beginPath();
            t= this.height-((30/this.SCALE*this.height)>>0)-.5;
            ctx.moveTo( .5, t );
            ctx.lineTo( this.width+.5, t );
            ctx.stroke();

            var fps = Math.min( this.height-(this.framerate.fps/this.SCALE*this.height), 59 );
            if (-1===this.framerate.prevFps) {
                this.framerate.prevFps= fps|0;
            }

            ctx.strokeStyle= '#0ff';//this.framerate.fps<15 ? 'red' : this.framerate.fps<30 ? 'yellow' : 'green';
            ctx.beginPath();
            ctx.moveTo( this.width, (fps|0)-.5 );
            ctx.lineTo( this.width, this.framerate.prevFps-.5 );
            ctx.stroke();

            this.framerate.prevFps= fps;


            var t1= ((this.height-(rafValue/this.SCALE*this.height))>>0)-.5;
            ctx.strokeStyle= '#ff0';
            ctx.beginPath();
            ctx.moveTo( this.width, t1 );
            ctx.lineTo( this.width, t1 );
            ctx.stroke();
        }
    };
})();/**
 * See LICENSE file.
 *
 * Classes to define animable elements with DOM/CSS interface.
 * Actor is the superclass of every animable element in the scene graph. It handles the whole
 * affine transformation MatrixStack, rotation, translation, globalAlpha and Behaviours. It also
 * defines input methods.
 **/

(function() {

    /**
     * This class is the base for all animable entities in CAAT.
     * It defines an entity able to:
     *
     * <ul>
     * <li>Position itself on screen.
     * <li>Able to modify its presentation aspect via affine transforms.
     * <li>Take control of parent/child relationship.
     * <li>Take track of behaviors (@see CAAT.Behavior).
     * <li>Define a region on screen.
     * <li>Define alpha composition scope.
     * <li>Expose lifecycle.
     * <li>Manage itself in/out scene time.
     * <li>etc.
     * </ul>
     *
     * @constructor
     */
	CAAT.Actor = function() {
		this.behaviorList=          [];

        this.lifecycleListenerList= [];
        this.scaleAnchor=           this.ANCHOR_CENTER;
        this.behaviorList=          [];

        this.domElement=            document.createElement('div');
        this.domElement.style['position']='absolute';
        this.domElement.style['-webkit-transform']='translate3d(0,0,0)';
        this.domElement.style['-webkit-transition']='all 0s linear';
        this.style( 'display', 'none');

        this.AABB= new CAAT.Rectangle();
        this.viewVertices= [
                new CAAT.Point(0,0,0),
                new CAAT.Point(0,0,0),
                new CAAT.Point(0,0,0),
                new CAAT.Point(0,0,0)
        ];

        this.setVisible(true);
        this.resetTransform();
        this.setScale(1,1);
        this.setRotation(0);

        this.modelViewMatrix=       new CAAT.Matrix();
        this.worldModelViewMatrix=  new CAAT.Matrix();

		return this;
	};

	CAAT.Actor.prototype= {

        lifecycleListenerList:	null,   // Array of life cycle listener
        behaviorList:           null,   // Array of behaviors to apply to the Actor
		x:						0,      // x position on parent. In parent's local coord. system.
		y:						0,      // y position on parent. In parent's local coord. system.
		width:					0,      // Actor's width. In parent's local coord. system.
		height:					0,      // Actor's height. In parent's local coord. system.
		start_time:				0,      // Start time in Scene time.
		duration:				Number.MAX_VALUE,   // Actor duration in Scene time
		clip:					false,  // should clip the Actor's content against its contour.

        tAnchorX            :   0,
        tAnchorY            :   0,
        scaleX:					0,      // transformation. width scale parameter
		scaleY:					0,      // transformation. height scale parameter
		scaleTX:				.50,    // transformation. scale anchor x position
		scaleTY:				.50,    // transformation. scale anchor y position
		scaleAnchor:			0,      // transformation. scale anchor
		rotationAngle:			0,      // transformation. rotation angle in radians
		rotationY:				.50,    // transformation. rotation center y
        alpha:					1,      // alpha transparency value
        rotationX:				.50,    // transformation. rotation center x
        isGlobalAlpha:          false,  // is this a global alpha
        frameAlpha:             1,      // hierarchically calculated alpha for this Actor.
		expired:				false,  // set when the actor has been expired
		discardable:			false,  // set when you want this actor to be removed if expired

        domParent:              null,
        domElement:             null,

        visible:                true,

		ANCHOR_CENTER:			0,      // constant values to determine different affine transform
		ANCHOR_TOP:				1,      // anchors.
		ANCHOR_BOTTOM:			2,
		ANCHOR_LEFT:			3,
		ANCHOR_RIGHT:			4,
		ANCHOR_TOP_LEFT:		5,
		ANCHOR_TOP_RIGHT:		6,
		ANCHOR_BOTTOM_LEFT:		7,
		ANCHOR_BOTTOM_RIGHT:	8,
        ANCHOR_CUSTOM:          9,

        mouseEnabled:           true,

        time:                   0,      // Cache Scene time.
        inFrame:                false,  // boolean indicating whether this Actor was present on last frame.
        backgroundImage:        null,

        size_active:            1,      // number of animated children
        size_total:             1,

        id:                     null,

        __d_ax:                 -1,     // for drag-enabled actors.
        __d_ay:                 -1,
        gestureEnabled:         false,

        AABB            :       null,
        viewVertices:           null,   // model to view transformed vertices.
        isAA            :       true,

        /**
          * Calculates the 2D bounding box in canvas coordinates of the Actor.
          * This bounding box takes into account the transformations applied hierarchically for
          * each Scene Actor.
          *
          * @private
          *
          */
         setScreenBounds : function() {

             var AABB= this.AABB;
             var vv= this.viewVertices;

             if ( this.isAA ) {
                 var m= this.worldModelViewMatrix.matrix;
                 AABB.x= m[2];
                 AABB.y= m[5];
                 AABB.x1= m[2] + this.width;
                 AABB.y1= m[5] + this.height;
                 AABB.width= AABB.x1-AABB.x;
                 AABB.height= AABB.y1-AABB.y;
                 return this;
             }


             var vvv;

             vvv= vv[0];
             vvv.x=0;
             vvv.y=0;
             vvv= vv[1];
             vvv.x=this.width;
             vvv.y=0;
             vvv= vv[2];
             vvv.x=this.width;
             vvv.y=this.height;
             vvv= vv[3];
             vvv.x=0;
             vvv.y=this.height;

             this.modelToView( this.viewVertices );

             var xmin= Number.MAX_VALUE, xmax=-Number.MAX_VALUE;
             var ymin= Number.MAX_VALUE, ymax=-Number.MAX_VALUE;

             vvv= vv[0];
             if ( vvv.x < xmin ) {
                 xmin=vvv.x;
             }
             if ( vvv.x > xmax ) {
                 xmax=vvv.x;
             }
             if ( vvv.y < ymin ) {
                 ymin=vvv.y;
             }
             if ( vvv.y > ymax ) {
                 ymax=vvv.y;
             }
             var vvv= vv[1];
             if ( vvv.x < xmin ) {
                 xmin=vvv.x;
             }
             if ( vvv.x > xmax ) {
                 xmax=vvv.x;
             }
             if ( vvv.y < ymin ) {
                 ymin=vvv.y;
             }
             if ( vvv.y > ymax ) {
                 ymax=vvv.y;
             }
             var vvv= vv[2];
             if ( vvv.x < xmin ) {
                 xmin=vvv.x;
             }
             if ( vvv.x > xmax ) {
                 xmax=vvv.x;
             }
             if ( vvv.y < ymin ) {
                 ymin=vvv.y;
             }
             if ( vvv.y > ymax ) {
                 ymax=vvv.y;
             }
             var vvv= vv[3];
             if ( vvv.x < xmin ) {
                 xmin=vvv.x;
             }
             if ( vvv.x > xmax ) {
                 xmax=vvv.x;
             }
             if ( vvv.y < ymin ) {
                 ymin=vvv.y;
             }
             if ( vvv.y > ymax ) {
                 ymax=vvv.y;
             }

             AABB.x= xmin;
             AABB.y= ymin;
             AABB.x1= xmax;
             AABB.y1= ymax;
             AABB.width=  (xmax-xmin);
             AABB.height= (ymax-ymin);

             return this;
        },
        setGestureEnabled : function( enable ) {
            this.gestureEnabled= !!enable;
        },
        isGestureEnabled : function() {
            return this.gestureEnabled;
        },
        getId : function()  {
            return this.id;
        },
        setId : function(id) {
            this.id= id;
            return this;
        },

        /**
         * Set this Actor's parent and connect in CSS a div with its parent.
         * In case there's a parent set, previously the div will be removed from
         * its old parent and reattached to the new one.
         * @param parent {CAAT.ActorContainerCSS|CAAT.Actor}
         * @return this
         */
        setParent : function( parent ) {
            if ( this.parent ) {
                this.domParent.removeChild(this.domElement);
            }

            this.parent= parent;
            if ( null!=parent ) {
                this.parent.domElement.appendChild(this.domElement);
                this.domParent= this.parent.domElement;
            } else {
                this.domParent= null;
            }

            this.dirty= true;

            return this;
        },
        
        /**
         * Set this actor's background image.
         * The need of a background image is to kept compatibility with the new CSSDirector class.
         * The image parameter can be either an Image/Canvas or a CAAT.SpriteImage instance. If an image
         * is supplied, it will be wrapped into a CAAT.SriteImage instance of 1 row by 1 column.
         * If the actor has set an image in the background, the paint method will draw the image, otherwise
         * and if set, will fill its background with a solid color.
         * If adjust_size_to_image is true, the host actor will be redimensioned to the size of one
         * single image from the SpriteImage (either supplied or generated because of passing an Image or
         * Canvas to the function). That means the size will be set to [width:SpriteImage.singleWidth,
         * height:singleHeight].
         *
         * It is absolutely recommended not using a Canvas as argument. The performance
         * of canvas.toDataURL (despite its result being cached) is very poor.
         *
         * @see CAAT.SpriteImage
         *
         * @param image {Image|Canvas|CAAT.SpriteImage}
         * @param adjust_size_to_image {boolean} whether to set this actor's size based on image parameter.
         * @throws 'Invalid image object to set actor's background' in case the image parameter is not of the
         *  valid type.
         * @return this
         */
        setBackgroundImage : function(image, adjust_size_to_image ) {
            if ( image ) {
                // Opera will complaint about instanceof Image, so better HTMLImageElement.
                if ( image instanceof HTMLImageElement ) {
                    image= new CAAT.SpriteImage().initialize(image,1,1);
                } else if ( image instanceof HTMLCanvasElement ) {
                    image.src= image.toDataURL();
                    image= new CAAT.SpriteImage().initialize(image,1,1);
                } else if ( image instanceof CAAT.SpriteImage ) {
                    if ( image.image instanceof HTMLCanvasElement ) {
                        if ( !image.image.src ) {
                            image.image.src= image.image.toDataURL();
                        }
                    }
                } else {
                    throw "Invalid image object to set actor's background";
                }

                image.setOwner(this);
                this.backgroundImage= image;
                if ( typeof adjust_size_to_image==='undefined' || adjust_size_to_image ) {
                    this.setSize(image.getWidth(), image.getHeight());
                }

                this.style(
                        'background',
                        'url('+this.backgroundImage.image.src+') '+
                            this.backgroundImage.getCurrentSpriteImageCSSPosition() );
            } else {
                this.backgroundImage= null;
                this.style('background', 'none');
            }

            return this;
        },
        /**
         * Set the actor's SpriteImage index from animation sheet.
         * @see CAAT.SpriteImage
         * @param index {integer}
         *
         * @return this
         */
        setSpriteIndex: function(index) {
            if ( this.backgroundImage ) {
                this.backgroundImage.setSpriteIndex(index);

                this.style(
                        'background',
                        'url('+this.backgroundImage.image.src+') '+
                            this.backgroundImage.getCurrentSpriteImageCSSPosition() );

            }

            return this;

        },
        /**
         * Set this actor's background SpriteImage offset displacement.
         * The values can be either positive or negative meaning the texture space of this background
         * image does not start at (0,0) but at the desired position.
         * @see CAAT.SpriteImage
         * @param ox {integer} horizontal offset
         * @param oy {integer} vertical offset
         *
         * @return this
         */
        setBackgroundImageOffset : function( ox, oy ) {
            if ( this.backgroundImage ) {
                this.backgroundImage.setOffset(ox,oy);
                this.style(
                        'background',
                        'url('+this.backgroundImage.image.src+') '+
                            this.backgroundImage.getCurrentSpriteImageCSSPosition() );
            }

            return this;
        },
        /**
         * Set this actor's background SpriteImage its animation sequence.
         * In its simplet's form a SpriteImage treats a given image as an array of rows by columns
         * subimages. If you define d Sprite Image of 2x2, you'll be able to draw any of the 4 subimages.
         * This method defines the animation sequence so that it could be set [0,2,1,3,2,1] as the
         * animation sequence
         * @param ii {array<integer>} an array of integers.
         */
        setAnimationImageIndex : function( ii ) {
            if ( this.backgroundImage ) {
                this.backgroundImage.setAnimationImageIndex(ii);
                this.style(
                        'background',
                        'url('+this.backgroundImage.image.src+') '+
                            this.backgroundImage.getCurrentSpriteImageCSSPosition() );
            }
            return this;
        },
        /**
         * This method has no effect on ActorCSS
         * @param it any value from CAAT.Actor.TR_*
         * @return this
         */
        setImageTransformation : function( it ) {
            this.transformation= it;
            if ( it===CAAT.SpriteImage.prototype.TR_FIXED_TO_SIZE ) {
                this.style( 'background-size', '100%' );
            }
            return this;
        },
        /**
         * Center this actor at position (x,y).
         * @param x {float} x position
         * @param y {float} y position
         *
         * @return this
         */
        centerOn : function( x,y ) {
            this.setLocation( x-this.width/2, y-this.height/2 );
            return this;
        },
        /**
         * Center this actor at position (x,y).
         * @param x {number} x position
         * @param y {number} y position
         *
         * @return this
         */
        centerAt : function(x,y) {
            return this.centerOn(x,y);
        },
        /**
         * Set this actor invisible.
         * The actor is animated but not visible.
         * A container won't show any of its children if set visible to false.
         *
         * @param visible {boolean} set this actor visible or not.
         * @return this
         */
        setVisible : function(visible) {
            this.visible= visible;
            return this;
        },
        style : function(attr,value) {
            this.domElement.style[attr]= value;
        },
        style3 : function() {

            var imageop= '';
            if ( this.transformation===CAAT.SpriteImage.prototype.TR_FLIP_HORIZONTAL ) {
                imageop=' scale(-1,1) ';
            }

            var value=
                "translate("+this.x+"px,"+this.y+"px) "+
                "rotate("+this.rotationAngle+"rad) scale("+this.scaleX+","+this.scaleY+")" +
                    imageop;

            this.domElement.style['-ms-transform']=     value;
            this.domElement.style['-webkit-transform']= "translate3d(0,0,0) " + value;
            this.domElement.style.OTransform=      value;
            this.domElement.style.MozTransform=         value;
            this.domElement.style['transform']=         value;

            var anchor= ''+(this.rotationX*100)+'% '+
                           (this.rotationY*100)+'% ';

            this.domElement.style['transform-origin']=          anchor;
            this.domElement.style['-webkit-transform-origin']=  anchor;
            this.domElement.style['-ms-transform-origin']=      anchor;
            this.domElement.style.OTransformOrigin=             anchor;
            this.domElement.style.MozTransformOrigin=           anchor;

            return this;
        },
        styleAlpha : function(alpha) {
            this.domElement.style['filter']=        'alpha(opacity='+((this.alpha*100)>>0)+')';
            this.domElement.style.Oopacity=    this.alpha;
            this.domElement.style.MozOpacity=  this.alpha;
            this.domElement.style['-khtml-opacity']=this.alpha;
            this.domElement.style.opacity=      this.alpha;

            return this;
        },
        /**
         * Puts an Actor out of time line, that is, won't be transformed nor rendered.
         * @return this
         */
        setOutOfFrameTime : function() {
            this.setFrameTime(-1,0);
            this.style( 'display', 'none' );
            return this;
        },
        /**
         * Adds an Actor's life cycle listener.
         * The developer must ensure the actorListener is not already a listener, otherwise
         * it will notified more than once.
         * @param actorListener {object} an object with at least a method of the form:
         * <code>actorLyfeCycleEvent( actor, string_event_type, long_time )</code>
         */
		addListener : function( actorListener ) {
			this.lifecycleListenerList.push(actorListener);
		},
        /**
         * Removes an Actor's life cycle listener.
         * It will only remove the first occurrence of the given actorListener.
         * @param actorListener {object} an Actor's life cycle listener.
         */
        removeListener : function( actorListener ) {
            var n= this.lifecycleListenerList.length;
            while(n--) {
                if ( this.lifecycleListenerList[n]===actorListener ) {
                    // remove the nth element.
                    this.lifecycleListenerList.splice(n,1);
                    return;
                }
            }
        },
        /**
         * Set alpha composition scope. global will mean this alpha value will be its children maximum.
         * If set to false, only this actor will have this alpha value.
         * @param global {boolean} whether the alpha value should be propagated to children.
         */
        setGlobalAlpha : function( global ) {
            this.isGlobalAlpha= global;
            return this;
        },
        /**
         * Notifies the registered Actor's life cycle listener about some event.
         * @param sEventType an string indicating the type of event being notified.
         * @param time an integer indicating the time related to Scene's timeline when the event
         * is being notified.
         */
        fireEvent : function(sEventType, time)	{
            for( var i=0; i<this.lifecycleListenerList.length; i++ )	{
                this.lifecycleListenerList[i].actorLifeCycleEvent(this, sEventType, time);
            }
        },
        /**
         * Sets this Actor as Expired.
         * If this is a Container, all the contained Actors won't be nor drawn nor will receive
         * any event. That is, expiring an Actor means totally taking it out the Scene's timeline.
         * @param time {number} an integer indicating the time the Actor was expired at.
         * @return this.
         */
        setExpired : function(time) {
            this.expired= true;
            this.style('display', 'none');
            this.fireEvent('expired',time);
            return this;
        },
        /**
         * Enable or disable the event bubbling for this Actor.
         * @param enable {boolean} a boolean indicating whether the event bubbling is enabled.
         * @return this
         */
        enableEvents : function( enable ) {
            this.mouseEnabled= enable;
            return this;
        },
        /**
         * Removes all behaviors from an Actor.
         * @return this
         */
		emptyBehaviorList : function() {
			this.behaviorList=[];
            return this;
		},
/*
        emptyKeyframesList : function() {
            this.keyframesList= [];
        },
*/
        /**
         * Caches a fillStyle in the Actor.
         * @param style a valid Canvas rendering context fillStyle.
         * @return this
         */
        setFillStyle : function( style ) {
            this.style('background', style);
            return this;
        },
        /**
         * Caches a stroke style in the Actor.
         * @param style a valid canvas rendering context stroke style.
         * @return this
         */
        setStrokeStyle : function( style ) {
            return this;
        },
        /**
         * @deprecated
         * @param paint
         */
		setPaint : function( paint )	{
		},
        /**
         * Stablishes the Alpha transparency for the Actor.
         * If it globalAlpha enabled, this alpha will the maximum alpha for every contained actors.
         * The alpha must be between 0 and 1.
         * @param alpha a float indicating the alpha value.
         * @return this
         */
		setAlpha : function( alpha )	{
			this.alpha= alpha;
            return this;
		},
        /**
         * Remove all transformation values for the Actor.
         * @return this
         */
        resetTransform : function () {
            this.rotationAngle=0;
            this.rotationX=.5;
            this.rotationY=.5;
            this.scaleX=1;
            this.scaleY=1;
            this.scaleTX=.5;
            this.scaleTY=.5;
            this.scaleAnchor=0;
            this.oldX=-1;
            this.oldY=-1;

            this.style3();

            this.dirty= true;

            return this;
		},
        /**
         * Sets the time life cycle for an Actor.
         * These values are related to Scene time.
         * @param startTime an integer indicating the time until which the Actor won't be visible on the Scene.
         * @param duration an integer indicating how much the Actor will last once visible.
         * @return this
         */
		setFrameTime : function( startTime, duration ) {
			this.start_time= startTime;
			this.duration= duration;
			this.expired= false;
            this.dirty= true;

            return this;
		},
        /**
         * This method should me overriden by every custom Actor.
         * It will be the drawing routine called by the Director to show every Actor.
         * @param director the CAAT.Director instance that contains the Scene the Actor is in.
         * @param time an integer indicating the Scene time in which the drawing is performed.
         */
		paint : function(director, time) {
		},
        /**
         * A helper method to setScaleAnchored with an anchor of ANCHOR_CENTER
         *
         * @see setScaleAnchored
         *
         * @param sx a float indicating a width size multiplier.
         * @param sy a float indicating a height size multiplier.
         * @return this
         */
		setScale : function( sx, sy )    {
			this.setScaleAnchored( sx, sy, .5, .5 );
            return this;
		},
        /**
         * Private.
         * Gets a given anchor position referred to the Actor.
         * @param anchor
         * @return an object of the form { x: float, y: float }
         */
		getAnchor : function( anchor ) {
			var tx=0, ty=0;

			switch( anchor ) {
            case this.ANCHOR_CENTER:
                    tx= .5;
                    ty= .5;
                break;
            case this.ANCHOR_TOP:
                tx= .5;
                ty= 0;
                break;
            case this.ANCHOR_BOTTOM:
                tx= .5;
                ty= 1;
                break;
            case this.ANCHOR_LEFT:
                tx= 0;
                ty= .5;
                break;
            case this.ANCHOR_RIGHT:
                tx= 1;
                ty= .5;
                break;
            case this.ANCHOR_TOP_RIGHT:
                tx= 1;
                ty= 0;
                break;
            case this.ANCHOR_BOTTOM_LEFT:
                tx= 0;
                ty= 1;
                break;
            case this.ANCHOR_BOTTOM_RIGHT:
                tx= 1;
                ty= 1;
                break;
            case this.ANCHOR_TOP_LEFT:
                tx= 0;
                ty= 0;
                break;
            }

			return {x: tx, y: ty};
		},
        getAnchorPercent : function( anchor ) {

            var anchors=[
                .50,.50,   .50,0,  .50,1.00,
                0,.50,   1.00,.50, 0,0,
                1.00,0,  0,1.00,  1.00,1.00
            ];

            return { x: anchors[anchor*2], y: anchors[anchor*2+1] };
        },

        setGlobalAnchor : function( ax, ay ) {
            this.tAnchorX=  ax;
            this.rotationX= ax;
            this.scaleTX=   ax;

            this.tAnchorY=  ay;
            this.rotationY= ay;
            this.scaleTY=   ay;

            this.dirty= true;
            return this;
        },

        setScaleAnchor : function( sax, say ) {
            this.rotationX= sax;
            this.rotationY= say;
            this.scaleTX=   sax;
            this.scaleTY=   say;

            this.style3();

            this.dirty= true;
            return this;
        },
        /**
         * Modify the dimensions on an Actor.
         * The dimension will not affect the local coordinates system in opposition
         * to setSize or setBounds.
         *
         * @param sx {number} width scale.
         * @param sy {number} height scale.
         * @param anchorx {number} x anchor to perform the Scale operation.
         * @param anchory {number} y anchor to perform the Scale operation.
         *
         * @return this;
         */
		setScaleAnchored : function( sx, sy, anchorx, anchory )    {
            this.rotationX= anchorx;
            this.rotationY= anchory;
            this.scaleTX=   anchorx;
            this.scaleTY=   anchory;

			this.scaleX=sx;
			this.scaleY=sy;

            this.style3();

            this.dirty= true;

            return this;
		},



        /**
         * A helper method for setRotationAnchored. This methods stablishes the center
         * of rotation to be the center of the Actor.
         *
         * @param angle a float indicating the angle in radians to rotate the Actor.
         * @return this
         */
	    setRotation : function( angle )	{
            this.rotationAngle= angle;
            this.style3( );
            this.dirty= true;
            return this;
	    },

        setRotationAnchor : function( rax, ray ) {
            this.rotationX= ray;
   	        this.rotationY= rax;
            this.style3( );
            this.dirty= true;
            return this;
        },

        setRotationAnchored : function( angle, rx, ry ) {
   	        this.rotationAngle= angle;
   	        this.rotationX= rx;
   	        this.rotationY= ry;
            this.style3( );

            this.dirty= true;
            return this;
   	    },

        /**
         * Sets an Actor's dimension
         * @param w a float indicating Actor's width.
         * @param h a float indicating Actor's height.
         * @return this
         */
	    setSize : function( w, h )   {
	        this.width= w;
	        this.height= h;

            this.style('width', ''+w+'px');
            this.style('height',''+h+'px');

            this.dirty= true;

            return this;
	    },
        /**
         * Set location and dimension of an Actor at once.
         *
         * as http://jsperf.com/drawimage-whole-pixels states, drawing at whole pixels rocks while at subpixels sucks.
         * thanks @pbakaus
         *
         * @param x a float indicating Actor's x position.
         * @param y a float indicating Actor's y position
         * @param w a float indicating Actor's width
         * @param h a float indicating Actor's height
         * @return this
         */
	    setBounds : function(x, y, w, h)  {
	        //this.x= x;
            //this.y= y;
            this.x= x;
            this.y= y;
	        this.width= w;
	        this.height= h;

            this.setLocation(x,y);
            this.setSize(w,h);

            return this;
	    },


        setPosition : function( x,y ) {
            return this.setLocation( x,y );
        },

        setPositionAnchor : function( pax, pay ) {
            this.tAnchorX=  pax;
            this.tAnchorY=  pay;
            this.style3();
            this.dirty= true;
            return this;
        },

        setPositionAnchored : function( x,y,pax,pay ) {
            this.setLocation( x,y );
            this.tAnchorX=  pax;
            this.tAnchorY=  pay;
            return this;
        },



        /**
         * This method sets the position of an Actor inside its parent.
         *
         * as http://jsperf.com/drawimage-whole-pixels states, drawing at whole pixels rocks while at subpixels sucks.
         * thanks @pbakaus
         *
         * @param x a float indicating Actor's x position
         * @param y a float indicating Actor's y position
         * @return this
         */
	    setLocation : function( x, y ) {

            this.x= x;
            this.y= y;

            this.style3();
/*
            this.style('left', x+'px');
            this.style('top',  y+'px');
*/
            this.dirty= true;

            return this;
	    },
        /**
         * This method is called by the Director to know whether the actor is on Scene time.
         * In case it was necessary, this method will notify any life cycle behaviors about
         * an Actor expiration.
         * @param time an integer indicating the Scene time.
         *
         * @private
         *
         */
	    isInAnimationFrame : function(time)    {
            if ( this.expired )	{
                return false;
            }

	        if ( this.duration===Number.MAX_VALUE ) {
	            if (this.start_time<=time) {
                    return true;
                } else {
                    return false;
                }
	        }

			if ( time>=this.start_time+this.duration )	{
				if ( !this.expired )	{
					this.setExpired(time);
				}
				return false;
			}

	        return this.start_time<=time && time<this.start_time+this.duration;
	    },
        /**
         * Checks whether a coordinate is inside the Actor's bounding box.
         * @param x {number} a float
         * @param y {number} a float
         *
         * @return boolean indicating whether it is inside.
         */
	    contains : function(x, y) {
	        return x>=0 && y>=0 && x<this.width && y<this.height;
	    },
        /**
         * This method must be called explicitly by every CAAT Actor.
         * Making the life cycle explicitly initiated has always been a good idea.
         *
         * @return this
         * @deprecated no longer needed.
         */
		create : function()	{
            return this;
		},

        /**
        addKeyframes : function( keyframe, start, duration, cycle ) {
            this.keyframesList.push( new CAAT.KeyframesDescriptor( keyframe, start, duration, cycle ) );
        },

        scheduleKeyframes : function( id, startTime, duration ) {
            var kf= this.getKeyframesDescriptor(id);
            if ( kf ) {
                kf.schedule( startTime, duration );
            }
            return this;
        },

        removeKeyframes : function( keyframe ) {
            var kfs= this.keyframesList;
            for( var i=0; i<kfs.length; i++ ) {
                if ( kfs[i].keyframe===keyframe ) {
                    kfs.splice(i,1);
                    return this;
                }
            }

            return this;
        },

        removeKeyframesById : function( keyframe ) {
            var kfs= this.keyframesList;
            for( var i=0; i<kfs.length; i++ ) {
                if ( kfs[i].id===id ) {
                    kfs.splice(i,1);
                    return this;
                }
            }

            return this;
        },

        getKeyframesDescriptor : function( id ) {
            var kfs= this.keyframesList;
            var kf;
            for( var i=0; i<kfs.length; i++ ) {
                kf= kfs[i];
                if ( kf.id===id ) {
                    return kf;
                }
            }

            return null;

        },
*/
        /**
         * Add a Behavior to the Actor.
         * An Actor accepts an undefined number of Behaviors.
         *
         * @param behavior {CAAT.Behavior} a CAAT.Behavior instance
         * @return this
         */
		addBehavior : function( behavior )	{
			this.behaviorList.push(behavior);
            return this;
		},
        /**
         * Remove a Behavior from the Actor.
         * If the Behavior is not present at the actor behavior collection nothing happends.
         *
         * @param behavior {CAAT.Behavior} a CAAT.Behavior instance.
         */
        removeBehaviour : function( behavior ) {
            var c=this.behaviorList
            var n= c.length-1;
            while(n) {
                if ( c[n]===behavior ) {
                    c.splice(n,1);
                    return this;
                }
            }
            return this;
        },
        /**
         * Remove a Behavior with id param as behavior identifier from this actor.
         * This function will remove ALL behavior instances with the given id.
         *
         * @param id {number} an integer.
         * return this;
         */
        removeBehaviorById : function( id ) {
            var c=this.behaviorList;
            for( var n=0; n<c.length; n++ ) {
                if ( c[n].id===id) {
                    c.splice(n,1);
                }
            }

            return this;

        },

        getBehavior : function(id)  {
            var c= this.behaviorList;
            for( var n=0; n<c.length; n++ ) {
                var cc= c[n];
                if ( cc.id===id) {
                    return cc;
                }
            }
            return null;
        },

        /**
         * Set discardable property. If an actor is discardable, upon expiration will be removed from
         * scene graph and hence deleted.
         * @param discardable {boolean} a boolean indicating whether the Actor is discardable.
         * @return this
         */
        setDiscardable : function( discardable ) {
            this.discardable= discardable;
            return this;
        },
        /**
         * This method will be called internally by CAAT when an Actor is expired, and at the
         * same time, is flagged as discardable.
         * It notifies the Actor life cycle listeners about the destruction event.
         *
         * @param time an integer indicating the time at wich the Actor has been destroyed.
         *
         * @private
         *
         */
		destroy : function(time)	{
            this.parent= null;
            this.domParent= null;
            this.fireEvent('destroyed',time);
		},
        /**
         * Transform a point or array of points in model space to view space.
         *
         * @param point {CAAT.Point|Array} an object of the form {x : float, y: float}
         *
         * @return the source transformed elements.
         *
         * @private
         *
         */
        modelToView : function(point) {
            if ( point instanceof Array ) {
                for( var i=0; i<point.length; i++ ) {
                    this.worldModelViewMatrix.transformCoord(point[i]);
                }
            }
            else {
                this.worldModelViewMatrix.transformCoord(point);
            }

            return point;
        },        /**
         * Transform a point from model to view space.
         * <p>
         * WARNING: every call to this method calculates
         * actor's world model view matrix.
         *
         * @param point {CAAT.Point} a point in screen space to be transformed to model space.
         *
         * @return the source point object
         *
         *
         */
		viewToModel : function(point) {
            this.worldModelViewMatrixI= this.worldModelViewMatrix.getInverse();
            this.worldModelViewMatrixI.transformCoord(point);
			return point;
		},
        /**
         * Transform a local coordinate point on this Actor's coordinate system into
         * another point in otherActor's coordinate system.
         * @param point {CAAT.Point}
         * @param otherActor {CAAT.Actor}
         */
        modelToModel : function( point, otherActor )   {
            return otherActor.viewToModel( this.modelToView( point ) );
        },

        /**
         * Private
         * This method does the needed point transformations across an Actor hierarchy to devise
         * whether the parameter point coordinate lies inside the Actor.
         * @param point an object of the form { x: float, y: float }
         *
         * @return null if the point is not inside the Actor. The Actor otherwise.
         */
	    findActorAtPosition : function(point) {
            if ( !this.mouseEnabled || !this.isInAnimationFrame(this.time) ) {
                return null;
            }

            this.setModelViewMatrix();
            this.modelViewMatrixI= this.modelViewMatrix.getInverse();
            this.modelViewMatrixI.transformCoord(point);
            return this.contains(point.x, point.y) ? this :null;
	    },
        /**
         * Enables a default dragging routine for the Actor.
         * This default dragging routine allows to:
         *  <li>scale the Actor by pressing shift+drag
         *  <li>rotate the Actor by pressing control+drag
         *  <li>scale non uniformly by pressing alt+shift+drag
         *
         * @return this
         */
	    enableDrag : function() {

			this.ax= 0;
			this.ay= 0;
			this.mx= 0;
			this.my= 0;
			this.asx=1;
			this.asy=1;
			this.ara=0;
			this.screenx=0;
			this.screeny=0;

            /**
             * Mouse enter handler for default drag behavior.
             * @param mouseEvent {CAAT.MouseEvent}
             *
             * @inner
             */
	        this.mouseEnter= function(mouseEvent) {
				this.ax= -1;
				this.ay= -1;
		        this.pointed= true;
		        CAAT.setCursor('move');
	        };

            /**
             * Mouse exit handler for default drag behavior.
             * @param mouseEvent {CAAT.MouseEvent}
             *
             * @inner
             */
            this.mouseExit = function(mouseEvent) {
                this.ax = -1;
                this.ay = -1;
                this.pointed = false;
                CAAT.setCursor('default');
            };

            /**
             * Mouse move handler for default drag behavior.
             * @param mouseEvent {CAAT.MouseEvent}
             *
             * @inner
             */
            this.mouseMove = function(mouseEvent) {
                this.mx = mouseEvent.point.x;
                this.my = mouseEvent.point.y;
            };

            /**
             * Mouse up handler for default drag behavior.
             * @param mouseEvent {CAAT.MouseEvent}
             *
             * @inner
             */
            this.mouseUp = function(mouseEvent) {
                this.ax = -1;
                this.ay = -1;
            };

            /**
             * Mouse drag handler for default drag behavior.
             * @param mouseEvent {CAAT.MouseEvent}
             *
             * @inner
             */
            this.mouseDrag = function(mouseEvent) {

                if (this.ax === -1 || this.ay === -1) {
                    this.ax = mouseEvent.point.x;
                    this.ay = mouseEvent.point.y;
                    this.asx = this.scaleX;
                    this.asy = this.scaleY;
                    this.ara = this.rotationAngle;
                    this.screenx = mouseEvent.screenPoint.x;
                    this.screeny = mouseEvent.screenPoint.y;
                }

                if (mouseEvent.isShiftDown()) {
                    var scx = (mouseEvent.screenPoint.x - this.screenx) / 100;
                    var scy = (mouseEvent.screenPoint.y - this.screeny) / 100;
                    if (!mouseEvent.isAltDown()) {
                        var sc = Math.max(scx, scy);
                        scx = sc;
                        scy = sc;
                    }
                    this.setScale(scx + this.asx, scy + this.asy);

                } else if (mouseEvent.isControlDown()) {
                    var vx = mouseEvent.screenPoint.x - this.screenx;
                    var vy = mouseEvent.screenPoint.y - this.screeny;
                    this.setRotation(-Math.atan2(vx, vy) + this.ara);
                } else {
                    this.setLocation(
                        this.x + mouseEvent.point.x - this.ax,
                        this.y + mouseEvent.point.y - this.ay );
                    this.ax = mouseEvent.point.x;
                    this.ay = mouseEvent.point.y;
                }


            };

            return this;
	    },
        /**
         * Default mouseClick handler.
         * Mouse click events are received after a call to mouseUp method if no dragging was in progress.
         *
         * @param mouseEvent a CAAT.MouseEvent object instance.
         */
	    mouseClick : function(mouseEvent) {
	    },
        /**
         * Default double click handler
         *
         * @param mouseEvent a CAAT.MouseEvent object instance.
         */
	    mouseDblClick : function(mouseEvent) {
	    },
        /**
         * Default mouse enter on Actor handler.
         * @param mouseEvent a CAAT.MouseEvent object instance.
         */
		mouseEnter : function(mouseEvent) {
	        this.pointed= true;
		},
        /**
         * Default mouse exit on Actor handler.
         *
         * @param mouseEvent a CAAT.MouseEvent object instance.
         */
		mouseExit : function(mouseEvent) {
			this.pointed= false;
		},
        /**
         * Default mouse move inside Actor handler.
         *
         * @param mouseEvent a CAAT.MouseEvent object instance.
         */
		mouseMove : function(mouseEvent) {
		},
        /**
         * default mouse press in Actor handler.
         *
         * @param mouseEvent a CAAT.MouseEvent object instance.
         */
		mouseDown : function(mouseEvent) {
		},
        /**
         * default mouse release in Actor handler.
         *
         * @param mouseEvent a CAAT.MouseEvent object instance.
         */
		mouseUp : function(mouseEvent) {
		},
        /**
         * default Actor mouse drag handler.
         *
         * @param mouseEvent a CAAT.MouseEvent object instance.
         */
		mouseDrag : function(mouseEvent) {
		},
        mouseOut : function(mouseEvent) {
        },
        mouseOver : function(mouseEvent) {
        },
        /**
         * Draw a bounding box with on-screen coordinates regardless of the transformations
         * applied to the Actor.
         *
         * @param director the CAAT.Director object instance that contains the Scene the Actor is in.
         * @param time an integer indicating the Scene time when the bounding box is to be drawn.
         */
        drawScreenBoundingBox : function( director, time ) {
        },
        /**
         * Private
         * This method is called by the Director instance.
         * It applies the list of behaviors the Actor has registered.
         *
         * @param director the CAAT.Director object instance that contains the Scene the Actor is in.
         * @param time an integer indicating the Scene time when the bounding box is to be drawn.
         */
		animate : function(director, time) {
            if ( !this.isInAnimationFrame(time) ) {
                this.inFrame= false;
                this.dirty= true;
                this.style( 'display', 'none');
                return false;
            } else {
                this.style( 'display', this.visible ? 'block' : 'none');
            }

			for( var i=0; i<this.behaviorList.length; i++ )	{
				this.behaviorList[i].apply(time,this);
			}

            this.frameAlpha= this.parent ? this.parent.frameAlpha*this.alpha : 1;
            //this.setAlpha(this.frameAlpha);
            this.styleAlpha(this.frameAlpha);
            this.inFrame= true;

            this.setModelViewMatrix(false);

            if ( this.dirty || this.wdirty || this.invalid ) {
                this.setScreenBounds();
            }

            this.dirty= false;

            //return true;
            return this.AABB.intersects( director.AABB );
		},
        /**
         * Set this model view matrix if the actor is Dirty.
         *
         * @return this
         */
            /*
        setModelViewMatrix : function(glEnabled) {
            var c,s,_m00,_m01,_m10,_m11;
            var mm0, mm1, mm2, mm3, mm4, mm5;
            var mm;

            this.wdirty= false;

            if ( this.dirty ) {

                mm= this.modelViewMatrix.identity().matrix;

                mm0= mm[0];
                mm1= mm[1];
                mm2= mm[2];
                mm3= mm[3];
                mm4= mm[4];
                mm5= mm[5];

                mm2+= this.x;
                mm5+= this.y;

                if ( this.rotationAngle ) {
                    mm2+= mm0*this.rotationX*this.width + mm1*this.rotationY*this.height;
                    mm5+= mm3*this.rotationX*this.width + mm4*this.rotationY*this.height;

                    c= Math.cos( this.rotationAngle );
                    s= Math.sin( this.rotationAngle );
                    _m00= mm0;
                    _m01= mm1;
                    _m10= mm3;
                    _m11= mm4;
                    mm0=  _m00*c + _m01*s;
                    mm1= -_m00*s + _m01*c;
                    mm3=  _m10*c + _m11*s;
                    mm4= -_m10*s + _m11*c;

                    mm2+= -mm0*this.rotationX*this.width - mm1*this.rotationY*this.height;
                    mm5+= -mm3*this.rotationX*this.width - mm4*this.rotationY*this.height;
                }
                if ( this.scaleX!=1 || this.scaleY!=1 ) {

                    mm2+= mm0*this.scaleTX*this.width + mm1*this.scaleTY*this.height;
                    mm5+= mm3*this.scaleTX*this.width + mm4*this.scaleTY*this.height;

                    mm0= mm0*this.scaleX;
                    mm1= mm1*this.scaleY;
                    mm3= mm3*this.scaleX;
                    mm4= mm4*this.scaleY;

                    mm2+= -mm0*this.scaleTX*this.width - mm1*this.scaleTY*this.height;
                    mm5+= -mm3*this.scaleTX*this.width - mm4*this.scaleTY*this.height;
                }

                mm[0]= mm0;
                mm[1]= mm1;
                mm[2]= mm2;
                mm[3]= mm3;
                mm[4]= mm4;
                mm[5]= mm5;
            }

            if ( this.parent ) {
                if ( this.dirty || this.parent.wdirty ) {
                    this.worldModelViewMatrix.copy( this.parent.worldModelViewMatrix );
                    this.worldModelViewMatrix.multiply( this.modelViewMatrix );
                    this.wdirty= true;
                }
            } else {
                if ( this.dirty ) {
                    this.wdirty= true;
                }
                //this.worldModelViewMatrix.copy( this.modelViewMatrix );
                this.worldModelViewMatrix.identity();
            }

//            this.dirty= false;


            return this;
        },*/

        setModelViewMatrix : function() {
            var c,s,_m00,_m01,_m10,_m11;
            var mm0, mm1, mm2, mm3, mm4, mm5;
            var mm;

            this.wdirty= false;
            mm= this.modelViewMatrix.matrix;

            if ( this.dirty ) {

                mm0= 1;
                mm1= 0;
                //mm2= mm[2];
                mm3= 0;
                mm4= 1;
                //mm5= mm[5];

                mm2= this.x - this.tAnchorX * this.width ;
                mm5= this.y - this.tAnchorY * this.height;

                if ( this.rotationAngle ) {

                    var rx= this.rotationX*this.width;
                    var ry= this.rotationY*this.height;

                    mm2+= mm0*rx + mm1*ry;
                    mm5+= mm3*rx + mm4*ry;

                    c= Math.cos( this.rotationAngle );
                    s= Math.sin( this.rotationAngle );
                    _m00= mm0;
                    _m01= mm1;
                    _m10= mm3;
                    _m11= mm4;
                    mm0=  _m00*c + _m01*s;
                    mm1= -_m00*s + _m01*c;
                    mm3=  _m10*c + _m11*s;
                    mm4= -_m10*s + _m11*c;

                    mm2+= -mm0*rx - mm1*ry;
                    mm5+= -mm3*rx - mm4*ry;
                }
                if ( this.scaleX!=1 || this.scaleY!=1 ) {

                    var sx= this.scaleTX*this.width;
                    var sy= this.scaleTY*this.height;

                    mm2+= mm0*sx + mm1*sy;
                    mm5+= mm3*sx + mm4*sy;

                    mm0= mm0*this.scaleX;
                    mm1= mm1*this.scaleY;
                    mm3= mm3*this.scaleX;
                    mm4= mm4*this.scaleY;

                    mm2+= -mm0*sx - mm1*sy;
                    mm5+= -mm3*sx - mm4*sy;
                }

                mm[0]= mm0;
                mm[1]= mm1;
                mm[2]= mm2;
                mm[3]= mm3;
                mm[4]= mm4;
                mm[5]= mm5;
            }

            if ( this.parent ) {


                this.isAA= this.rotationAngle===0 && this.scaleX===1 && this.scaleY===1 && this.parent.isAA;

                if ( this.dirty || this.parent.wdirty ) {
                    this.worldModelViewMatrix.copy( this.parent.worldModelViewMatrix );
                    if ( this.isAA ) {
                        var mmm= this.worldModelViewMatrix.matrix;
                        mmm[2]+= mm[2];
                        mmm[5]+= mm[5];
                    } else {
                        this.worldModelViewMatrix.multiply( this.modelViewMatrix );
                    }
                    this.wdirty= true;
                }

            } else {
                if ( this.dirty ) {
                    this.wdirty= true;
                }

                this.worldModelViewMatrix.identity();
                this.isAA= this.rotationAngle===0 && this.scaleX===1 && this.scaleY===1;
            }

        },

        /**
         * @private.
         * This method will be called by the Director to set the whole Actor pre-render process.
         *
         * @param director the CAAT.Director object instance that contains the Scene the Actor is in.
         * @param time an integer indicating the Scene time when the bounding box is to be drawn.
         *
         * @return boolean indicating whether the Actor isInFrameTime
         */
        paintActor : function(director, time) {
            return true;
        },
        /**
         * @private.
         * This method is called after the Director has transformed and drawn a whole frame.
         *
         * @param director the CAAT.Director object instance that contains the Scene the Actor is in.
         * @param time an integer indicating the Scene time when the bounding box is to be drawn.
         * @return this
         *
         * @deprecated
         */
        endAnimate : function(director,time) {
            return this;
        },
        initialize : function(overrides) {
            if (overrides) {
               for (var i in overrides) {
                  this[i] = overrides[i];
               }
            }

            return this;
        },
        /**
         * Enable or disable the clipping process for this Actor.
         *
         * @param clip a boolean indicating whether clip is enabled.
         * @return this
         */
        setClip : function( clip ) {
            this.clip= clip;
            this.style('overflow', this.clip ? 'hidden' : 'visible');
            return this;
        },
        /**
         *
         * @param time {Number=}
         * @return canvas
         */
        cacheAsBitmap : function(time) {
            return this;
        },
        /**
         * Set this actor behavior as if it were a Button. The actor size will be set as SpriteImage's
         * single size.
         *
         * @param buttonImage
         * @param iNormal
         * @param iOver
         * @param iPress
         * @param iDisabled
         * @param fn
         */
        setAsButton : function( buttonImage, iNormal, iOver, iPress, iDisabled, fn ) {

            var me= this;

            this.setBackgroundImage(buttonImage, true);

            this.iNormal=       iNormal || 0;
            this.iOver=         iOver || iNormal;
            this.iPress=        iPress || iNormal;
            this.iDisabled=     iDisabled || iNormal;
            this.fnOnClick=     fn;
            this.enabled=       true;

            this.setSpriteIndex( iNormal );

            /**
             * Enable or disable the button.
             * @param enabled {boolean}
             * @ignore
             */
            this.setEnabled= function( enabled ) {
                this.enabled= enabled;
                this.setSpriteIndex( this.enabled ? this.iNormal : this.iDisabled );
                return this;
            };

            /**
             * This method will be called by CAAT *before* the mouseUp event is fired.
             * @param event {CAAT.MouseEvent}
             * @ignore
             */
            this.actionPerformed= function(event) {
                if ( this.enabled && null!==this.fnOnClick ) {
                    this.fnOnClick(this);
                }
            };

            /**
             * Button's mouse enter handler. It makes the button provide visual feedback
             * @param mouseEvent {CAAT.MouseEvent}
             * @ignore
             */
            this.mouseEnter= function(mouseEvent) {
                if ( !this.enabled ) {
                    return;
                }

                if ( this.dragging ) {
                    this.setSpriteIndex( this.iPress );
                } else {
                    this.setSpriteIndex( this.iOver );
                }
                CAAT.setCursor('pointer');
            };

            /**
             * Button's mouse exit handler. Release visual apperance.
             * @param mouseEvent {CAAT.MouseEvent}
             * @ignore
             */
            this.mouseExit= function(mouseEvent) {
                this.setSpriteIndex( this.iNormal );
                CAAT.setCursor('default');
            };

            /**
             * Button's mouse down handler.
             * @param mouseEvent {CAAT.MouseEvent}
             * @ignore
             */
            this.mouseDown= function(mouseEvent) {
                if ( !this.enabled ) {
                    return;
                }

                this.setSpriteIndex( this.iPress );
            };

            /**
             * Button's mouse up handler.
             * @param mouseEvent {CAAT.MouseEvent}
             * @ignore
             */
            this.mouseUp= function(mouseEvent) {
                this.setSpriteIndex( this.iNormal );
                this.dragging= false;
            };

            /**
             * Button's mouse click handler. Do nothing by default. This event handler will be
             * called ONLY if it has not been drag on the button.
             * @param mouseEvent {CAAT.MouseEvent}
             * @ignore
             */
            this.mouseClick= function(mouseEvent) {
            };

            /**
             * Button's mouse drag handler.
             * @param mouseEvent {CAAT.MouseEvent}
             * @ignore
             */
            this.mouseDrag= function(mouseEvent)  {
                if ( !this.enabled ) {
                    return;
                }

                this.dragging= true;
            };

            this.setButtonImageIndex= function(_normal, _over, _press, _disabled ) {
                this.iNormal=    _normal;
                this.iOver=      _over;
                this.iPress=     _press;
                this.iDisabled=  _disabled;
                this.setSpriteIndex( this.iNormal );
                return this;
            };

            return this;
        }
	};



})();


(function() {

    /**
     * This class is a general container of CAAT.Actor instances. It extends the concept of an Actor
     * from a single entity on screen to a set of entities with a parent/children relationship among
     * them.
     * <p>
     * This mainly overrides default behavior of a single entity and exposes methods to manage its children
     * collection.
     *
     * @constructor
     * @extends CAAT.Actor
     */
	CAAT.ActorContainer= function() {
		CAAT.ActorContainer.superclass.constructor.call(this);
		this.childrenList=          [];
        this.pendingChildrenList=   [];
        if ( typeof hint!=='undefined' ) {
            this.addHint=       hint;
            this.boundingBox=   new CAAT.Rectangle();
        }
		return this;
	};


    CAAT.ActorContainer.AddHint= {
        CONFORM     :    1
    };

	CAAT.ActorContainer.prototype= {

        childrenList : null,       // the list of children contained.
        activeChildren: null,
        pendingChildrenList : null,

        addHint             :   0,
        boundingBox         :   null,
        runion              :   new CAAT.Rectangle(),   // Watch out. one for every container.

        /**
         * Removes all children from this ActorContainer.
         *
         * @return this
         */
        emptyChildren : function() {
            this.parentNode.innerHTML='';
            this.childrenList= [];

            return this;
        },
        /**
         * Private
         * Paints this container and every contained children.
         *
         * @param director the CAAT.Director object instance that contains the Scene the Actor is in.
         * @param time an integer indicating the Scene time when the bounding box is to be drawn.
         */
        paintActor : function(director, time ) {
            return true;
        },
        /**
         * Private.
         * Performs the animate method for this ActorContainer and every contained Actor.
         *
         * @param director the CAAT.Director object instance that contains the Scene the Actor is in.
         * @param time an integer indicating the Scene time when the bounding box is to be drawn.
         *
         * @return {boolean} is this actor in active children list ??
         */
		animate : function(director,time) {

            this.activeChildren= null;
            var last= null;

            if (false===CAAT.ActorContainer.superclass.animate.call(this,director,time)) {
                return false;
            }

            var i,l;
            var notActive= [];

            this.size_active= 0;
            this.size_total= 0;

            /**
             * Incluir los actores pendientes.
             * El momento es ahora, antes de procesar ninguno del contenedor.
             */
            for( i=0; i<this.pendingChildrenList.length; i++ ) {
                var child= this.pendingChildrenList[i];
                this.addChild(child);
            }
            this.pendingChildrenList= [];
            


            var cl= this.childrenList;
            for( i=0; i<cl.length; i++ ) {
                var actor= cl[i];
                actor.time= time;
                this.size_total+= actor.size_total;
                if ( actor.animate(director, time) ) {
                    if ( !this.activeChildren ) {
                        this.activeChildren= actor;
                        actor.__next= null;
                        last= actor;
                    } else {
                        actor.__next= null;
                        last.__next= actor;
                        last= actor;
                    }

                    this.size_active+= actor.size_active;

                } else {
                    if ( actor.expired && actor.discardable ) {
                        this.domElement.removeChild(actor.domElement);
                        actor.destroy(time);
                        cl.splice(i,1);
                    }
                }
            }

            return true;
		},
        /**
         * Removes Actors from this ActorContainer which are expired and flagged as Discardable.
         *
         * @param director the CAAT.Director object instance that contains the Scene the Actor is in.
         * @param time an integer indicating the Scene time when the bounding box is to be drawn.
         *
         * @deprecated
         */
        endAnimate : function(director,time) {
        },
        /**
         * Adds an Actor to this Container.
         * The Actor will be added ON METHOD CALL, despite the rendering pipeline stage being executed at
         * the time of method call.
         *
         * This method is only used by CAAT.Director's transitionScene.
         *
         * @param child a CAAT.Actor instance.
         * @return this.
         */
        addChildImmediately : function(child) {
            return this.addChild(child);
        },
        /**
         * Adds an Actor to this ActorContainer.
         * The Actor will be added to the container AFTER frame animation, and not on method call time.
         * Except the Director and in orther to avoid visual artifacts, the developer SHOULD NOT call this
         * method directly.
         *
         * @param child a CAAT.Actor object instance.
         * @return this
         */
		addChild : function(child) {
            child.setParent( this );
            this.childrenList.push(child);
            child.dirty= true;

            /**
             * if Conforming size, recalc new bountainer size.
             */
            if ( this.addHint===CAAT.ActorContainer.AddHint.CONFORM ) {
                this.recalcSize();
            }

            return this;
		},

        /**
         * Recalc this container size by computin the union of every children bounding box.
         */
        recalcSize : function() {
            var bb= this.boundingBox;
            bb.setEmpty();
            var cl= this.childrenList;
            var ac;
            for( var i=0; i<cl.length; i++ ) {
                ac= cl[i];
                this.runion.setBounds(
                    ac.x<0 ? 0 : ac.x,
                    ac.y<0 ? 0 : ac.y,
                    ac.width,
                    ac.height );
                bb.unionRectangle( this.runion );
            }
            this.setSize( bb.x1, bb.y1 );

            return this;
        },

        /**
         * Add a child element and make it active in the next frame.
         * @param child {CAAT.Actor}
         */
        addChildDelayed : function(child) {
            this.pendingChildrenList.push(child);
            return this;
        },
        /**
         * Adds an Actor to this ActorContainer.
         *
         * @param child a CAAT.Actor object instance.
         *
         * @return this
         */
		addChildAt : function(child, index) {

			if( index <= 0 ) {
                //this.childrenList.unshift(child);  // unshift unsupported on IE
                child.parent= this;
                child.dirty= true;
                this.childrenList.splice( 0, 0, child );
				return this;
            } else {
                if ( index>=this.childrenList.length ) {
                    index= this.childrenList.length;
                }
            }

			child.setParent(this);
			this.childrenList.splice(index, 0, child);

            this.domElement.insertBefore(child.domElement, this.domElement.childNodes[index]);

            child.dirty= true;

            return this;
		},
        /**
         * Private
         * Gets a contained Actor z-index on this ActorContainer.
         *
         * @param child a CAAT.Actor object instance.
         *
         * @return an integer indicating the Actor's z-order.
         */
		findChild : function(child) {
            var i=0,
				len = this.childrenList.length;
			for( i=0; i<len; i++ ) {
				if ( this.childrenList[i]===child ) {
					return i;
				}
			}
			return -1;
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
			var pos= this.findChild(child);
			if ( -1!==pos ) {
                this.childrenList[pos].setParent(null);
				this.childrenList.splice(pos,1);
			}

            return this;
		},
        /**
         * @private
         *
         * Gets the Actor inside this ActorContainer at a given Screen coordinate.
         *
         * @param point an object of the form { x: float, y: float }
         *
         * @return the Actor contained inside this ActorContainer if found, or the ActorContainer itself.
         */
		findActorAtPosition : function(point) {

			if( null===CAAT.ActorContainer.superclass.findActorAtPosition.call(this,point) ) {
				return null;
			}

			// z-order
			for( var i=this.childrenList.length-1; i>=0; i-- ) {
                var child= this.childrenList[i];

                var np= new CAAT.Point( point.x, point.y, 0 );
                var contained= child.findActorAtPosition( np );
                if ( null!==contained ) {
                    return contained;
                }
			}

			return this;
		},
        /**
         * Destroys this ActorContainer.
         * The process falls down recursively for each contained Actor into this ActorContainer.
         *
         * @return this
         */
        destroy : function() {
            for( var i=this.childrenList.length-1; i>=0; i-- ) {
                this.childrenList[i].destroy();
            }
            CAAT.ActorContainer.superclass.destroy.call(this);

            return this;
        },
        /**
         * Get number of Actors into this container.
         * @return integer indicating the number of children.
         */
        getNumChildren : function() {
            return this.childrenList.length;
        },
        getNumActiveChildren : function() {
            return this.activeChildren.length;
        },
        /**
         * Returns the Actor at the iPosition(th) position.
         * @param iPosition an integer indicating the position array.
         * @return the CAAT.Actor object at position.
         */
        getChildAt : function( iPosition ) {
            return this.childrenList[ iPosition ];
        },
        /**
         * Changes an actor's ZOrder.
         * @param actor the actor to change ZOrder for
         * @param index an integer indicating the new ZOrder. a value greater than children list size means to be the
         * last ZOrder Actor.
         */
        setZOrder : function( actor, index ) {
            var actorPos= this.findChild(actor);
            // the actor is present
            if ( -1!==actorPos ) {
                var cl= this.childrenList;
                // trivial reject.
                if ( index===actorPos ) {
                    return;
                }

                if ( index>=cl.length ) {
					cl.splice(actorPos,1);
					cl.push(actor);
                } else {
                    var nActor= cl.splice(actorPos,1);
                    if ( index<0 ) {
                        index=0;
                    } else if ( index>cl.length ) {
                        index= cl.length;
                    }

                    //this.childrenList.splice( index, 1, nActor );
                    cl.splice( index, 0, nActor[0] );
                }

                for( var i=0,l=cl.length; i<l; i++ ) {
                    cl[i].domElement.style['z-index']= i;
                }
            }
        }
	};

    extend( CAAT.ActorContainer, CAAT.Actor, null);

})();
/**
 * See LICENSE file.
 *
 * Sound implementation.
 */

(function() {

    /**
     * This class is a sound manager implementation which can play at least 'numChannels' sounds at the same time.
     * By default, CAAT.Director instances will set eight channels to play sound.
     * <p>
     * If more than 'numChannels' sounds want to be played at the same time the requests will be dropped,
     * so no more than 'numChannels' sounds can be concurrently played.
     * <p>
     * Available sounds to be played must be supplied to every CAAT.Director instance by calling <code>addSound</code>
     * method. The default implementation will accept a URL/URI or a HTMLAudioElement as source.
     * <p>
     * The cached elements can be played, or looped. The <code>loop</code> method will return a handler to
     * give the opportunity of cancelling the sound.
     * <p>
     * Be aware of Audio.canPlay, is able to return 'yes', 'no', 'maybe', ..., so anything different from
     * '' and 'no' will do.
     *
     * @constructor
     *
     */
    CAAT.AudioManager= function() {
        this.browserInfo= new CAAT.BrowserDetect();
        return this;
    };

    CAAT.AudioManager.prototype= {

        browserInfo:        null,
        musicEnabled:       true,
        fxEnabled:          true,
        audioCache:         null,   // audio elements.
        channels:           null,   // available playing channels.
        workingChannels:    null,   // currently playing channels.
        loopingChannels:    [],
        audioTypes: {               // supported audio formats. Don't remember where i took them from :S
	        'mp3': 'audio/mpeg;',
            'ogg': 'audio/ogg; codecs="vorbis"',
            'wav': 'audio/wav; codecs="1"',
            'mp4': 'audio/mp4; codecs="mp4a.40.2"'
		},

        /**
         * Initializes the sound subsystem by creating a fixed number of Audio channels.
         * Every channel registers a handler for sound playing finalization. If a callback is set, the
         * callback function will be called with the associated sound id in the cache.
         *
         * @param numChannels {number} number of channels to pre-create. 8 by default.
         *
         * @return this.
         */
        initialize : function(numChannels) {

            this.audioCache=      [];
            this.channels=        [];
            this.workingChannels= [];

            for( var i=0; i<numChannels; i++ ) {
                var channel= document.createElement('audio');

                if ( null!==channel ) {
                    channel.finished= -1;
                    this.channels.push( channel );
                    var me= this;
                    channel.addEventListener(
                            'ended',
                            // on sound end, set channel to available channels list.
                            function(audioEvent) {
                                var target= audioEvent.target;
                                var i;

                                // remove from workingChannels
                                for( i=0; i<me.workingChannels.length; i++ ) {
                                    if (me.workingChannels[i]===target ) {
                                        me.workingChannels.splice(i,1);
                                        break;
                                    }
                                }

                                if ( target.caat_callback ) {
                                    target.caat_callback(target.caat_id);
                                }

                                // set back to channels.
                                me.channels.push(target);
                            },
                            false
                    );
                }
            }

            return this;
        },
        /**
         * Tries to add an audio tag to the available list of valid audios. The audio is described by a url.
         * @param id {object} an object to associate the audio element (if suitable to be played).
         * @param url {string} a string describing an url.
         * @param endplaying_callback {function} callback to be called upon sound end.
         *
         * @return {boolean} a boolean indicating whether the browser can play this resource.
         *
         * @private
         */
        addAudioFromURL : function( id, url, endplaying_callback ) {
            var extension= null;
            var audio= document.createElement('audio');

            if ( null!==audio ) {

                if(!audio.canPlayType) {
                    return false;
                }

                extension= url.substr(url.lastIndexOf('.')+1);
                var canplay= audio.canPlayType(this.audioTypes[extension]);

                if(canplay!=="" && canplay!=="no") {
                    audio.src= url;
                    audio.preload = "auto";
                    audio.load();
                    if ( endplaying_callback ) {
                        audio.caat_callback= endplaying_callback;
                        audio.caat_id= id;
                    }
                    this.audioCache.push( { id:id, audio:audio } );

                    return true;
                }
            }

            return false;
        },
        /**
         * Tries to add an audio tag to the available list of valid audios. The audio element comes from
         * an HTMLAudioElement.
         * @param id {object} an object to associate the audio element (if suitable to be played).
         * @param audio {HTMLAudioElement} a DOM audio node.
         * @param endplaying_callback {function} callback to be called upon sound end.
         *
         * @return {boolean} a boolean indicating whether the browser can play this resource.
         *
         * @private
         */
        addAudioFromDomNode : function( id, audio, endplaying_callback ) {

            var extension= audio.src.substr(audio.src.lastIndexOf('.')+1);
            if ( audio.canPlayType(this.audioTypes[extension]) ) {
                if ( endplaying_callback ) {
                    audio.caat_callback= endplaying_callback;
                    audio.caat_id= id;
                }
                this.audioCache.push( { id:id, audio:audio } );

                return true;
            }

            return false;
        },
        /**
         * Adds an elements to the audio cache.
         * @param id {object} an object to associate the audio element (if suitable to be played).
         * @param element {URL|HTMLElement} an url or html audio tag.
         * @param endplaying_callback {function} callback to be called upon sound end.
         *
         * @return {boolean} a boolean indicating whether the browser can play this resource.
         *
         * @private
         */
        addAudioElement : function( id, element, endplaying_callback ) {
            if ( typeof element === "string" ) {
                return this.addAudioFromURL( id, element, endplaying_callback );
            } else {
                try {
                    if ( element instanceof HTMLAudioElement ) {
                        return this.addAudioFromDomNode( id, element, endplaying_callback );
                    }
                }
                catch(e) {
                }
            }

            return false;
        },
        /**
         * creates an Audio object and adds it to the audio cache.
         * This function expects audio data described by two elements, an id and an object which will
         * describe an audio element to be associated with the id. The object will be of the form
         * array, dom node or a url string.
         *
         * <p>
         * The audio element can be one of the two forms:
         *
         * <ol>
         *  <li>Either an HTMLAudioElement/Audio object or a string url.
         *  <li>An array of elements of the previous form.
         * </ol>
         *
         * <p>
         * When the audio attribute is an array, this function will iterate throught the array elements
         * until a suitable audio element to be played is found. When this is the case, the other array
         * elements won't be taken into account. The valid form of using this addAudio method will be:
         *
         * <p>
         * 1.<br>
         * addAudio( id, url } ). In this case, if the resource pointed by url is
         * not suitable to be played (i.e. a call to the Audio element's canPlayType method return 'no')
         * no resource will be added under such id, so no sound will be played when invoking the play(id)
         * method.
         * <p>
         * 2.<br>
         * addAudio( id, dom_audio_tag ). In this case, the same logic than previous case is applied, but
         * this time, the parameter url is expected to be an audio tag present in the html file.
         * <p>
         * 3.<br>
         * addAudio( id, [array_of_url_or_domaudiotag] ). In this case, the function tries to locate a valid
         * resource to be played in any of the elements contained in the array. The array element's can
         * be any type of case 1 and 2. As soon as a valid resource is found, it will be associated to the
         * id in the valid audio resources to be played list.
         *
         * @return this
         */
        addAudio : function( id, array_of_url_or_domnodes, endplaying_callback ) {

            if ( array_of_url_or_domnodes instanceof Array ) {
                /*
                 iterate throught array elements until we can safely add an audio element.
                 */
                for( var i=0; i<array_of_url_or_domnodes.length; i++ ) {
                    if ( this.addAudioElement(id, array_of_url_or_domnodes[i], endplaying_callback) ) {
                        break;
                    }
                }
            } else {
                this.addAudioElement(id, array_of_url_or_domnodes, endplaying_callback);
            }

            return this;
        },
        /**
         * Returns an audio object.
         * @param aId {object} the id associated to the target Audio object.
         * @return {object} the HTMLAudioElement addociated to the given id.
         */
        getAudio : function(aId) {
            for( var i=0; i<this.audioCache.length; i++ ) {
                if ( this.audioCache[i].id===aId ) {
                    return this.audioCache[i].audio;
                }
            }

            return null;
        },

        /**
         * Set an audio object volume.
         * @param id {object} an audio Id
         * @param volume {number} volume to set. The volume value is not checked.
         *
         * @return this
         */
        setVolume : function( id, volume ) {
            var audio= this.getAudio(id);
            if ( null!=audio ) {
                audio.volume= volume;
            }

            return this;
        },

        /**
         * Plays an audio file from the cache if any sound channel is available.
         * The playing sound will occupy a sound channel and when ends playing will leave
         * the channel free for any other sound to be played in.
         * @param id {object} an object identifying a sound in the sound cache.
         * @return this.
         */
        play : function( id ) {
            if ( !this.fxEnabled ) {
                return this;
            }

            var audio= this.getAudio(id);
            // existe el audio, y ademas hay un canal de audio disponible.
            if ( null!==audio && this.channels.length>0 ) {
                var channel= this.channels.shift();
                channel.src= audio.src;
                channel.load();
                channel.volume= audio.volume;
                channel.play();
                this.workingChannels.push(channel);
            }

            return this;
        },
        /**
         * This method creates a new AudioChannel to loop the sound with.
         * It returns an Audio object so that the developer can cancel the sound loop at will.
         * The user must call <code>pause()</code> method to stop playing a loop.
         * <p>
         * Firefox does not honor the loop property, so looping is performed by attending end playing
         * event on audio elements.
         *
         * @return {HTMLElement} an Audio instance if a valid sound id is supplied. Null otherwise
         */
        loop : function( id ) {

            if (!this.musicEnabled) {
                return this;
            }

            var audio_in_cache= this.getAudio(id);
            // existe el audio, y ademas hay un canal de audio disponible.
            if ( null!==audio_in_cache ) {
                var audio= document.createElement('audio');
                if ( null!==audio ) {
                    audio.src= audio_in_cache.src;
                    audio.preload = "auto";

                    if ( this.browserInfo.browser==='Firefox') {
                        audio.addEventListener(
                            'ended',
                            // on sound end, set channel to available channels list.
                            function(audioEvent) {
                                var target= audioEvent.target;
                                target.currentTime=0;
                            },
                            false
                        );
                    } else {
                        audio.loop= true;
                    }
                    audio.load();
                    audio.play();
                    this.loopingChannels.push(audio);
                    return audio;
                }
            }

            return null;
        },
        /**
         * Cancel all playing audio channels
         * Get back the playing channels to available channel list.
         *
         * @return this
         */
        endSound : function() {
            var i;
            for( i=0; i<this.workingChannels.length; i++ ) {
                this.workingChannels[i].pause();
                this.channels.push( this.workingChannels[i] );
            }

            for( i=0; i<this.loopingChannels.length; i++ ) {
                this.loopingChannels[i].pause();
            }

            return this;
        },
        setSoundEffectsEnabled : function( enable ) {
            this.fxEnabled= enable;
            return this;
        },
        isSoundEffectsEnabled : function() {
            return this.fxEnabled;
        },
        setMusicEnabled : function( enable ) {
            this.musicEnabled= enable;
            for( var i=0; i<this.loopingChannels.length; i++ ) {
                if ( enable ) {
                    this.loopingChannels[i].play();
                } else {
                    this.loopingChannels[i].pause();
                }
            }
            return this;
        },
        isMusicEnabled : function() {
            return this.musicEnabled;
        }
    };
})();/**
 * See LICENSE file.
 *
 * In this file we'll be adding every useful Actor that is specific for certain purpose.
 *
 * + CAAT.Dock: a docking container that zooms in/out its actors.
 *
 */
(function() {

    /**
     * This actor simulates a mac os-x docking component.
     * Every contained actor will be laid out in a row in the desired orientation.
     */
    CAAT.Dock = function() {
        CAAT.Dock.superclass.constructor.call(this);
        return this;
    };

    CAAT.Dock.prototype= {

        scene:              null,   // scene the actor is in.
        ttask:              null,   // resetting dimension timer.
        minSize:            0,      // min contained actor size
        maxSize:            0,      // max contained actor size
        range:              2,      // aproximated number of elements affected.
        layoutOp:           0,
        OP_LAYOUT_BOTTOM:   0,
        OP_LAYOUT_TOP:      1,
        OP_LAYOUT_LEFT:     2,
        OP_LAYOUT_RIGHT:    3,

        initialize : function(scene) {
            this.scene= scene;
            return this;
        },
        /**
         * Set the number of elements that will be affected (zoomed) when the mouse is inside the component.
         * @param range {number} a number. Defaults to 2.
         */
        setApplicationRange : function( range ) {
            this.range= range;
            return this;
        },
        /**
         * Set layout orientation. Choose from
         * <ul>
         *  <li>CAAT.Dock.prototype.OP_LAYOUT_BOTTOM
         *  <li>CAAT.Dock.prototype.OP_LAYOUT_TOP
         *  <li>CAAT.Dock.prototype.OP_LAYOUT_BOTTOM
         *  <li>CAAT.Dock.prototype.OP_LAYOUT_RIGHT
         * </ul>
         * By default, the layou operation is OP_LAYOUT_BOTTOM, that is, elements zoom bottom anchored.
         *
         * @param lo {number} one of CAAT.Dock.OP_LAYOUT_BOTTOM, CAAT.Dock.OP_LAYOUT_TOP,
         * CAAT.Dock.OP_LAYOUT_BOTTOM, CAAT.Dock.OP_LAYOUT_RIGHT.
         *
         * @return this
         */
        setLayoutOp : function( lo ) {
            this.layoutOp= lo;
            return this;
        },
        /**
         *
         * Set maximum and minimum size of docked elements. By default, every contained actor will be
         * of 'min' size, and will be scaled up to 'max' size.
         *
         * @param min {number}
         * @param max {number}
         * @return this
         */
        setSizes : function( min, max ) {
            this.minSize= min;
            this.maxSize= max;

            for( var i=0; i<this.childrenList.length; i++ ) {
                this.childrenList[i].width= min;
                this.childrenList[i].height= min;
            }

            return this;
        },
        /**
         * Lay out the docking elements. The lay out will be a row with the orientation set by calling
         * the method <code>setLayoutOp</code>.
         *
         * @private
         */
        layout : function() {
            var i,actor;

            if ( this.layoutOp===this.OP_LAYOUT_BOTTOM || this.layoutOp===this.OP_LAYOUT_TOP ) {

                var currentWidth=0, currentX=0;

                for( i=0; i<this.getNumChildren(); i++ ) {
                    currentWidth+= this.getChildAt(i).width;
                }

                currentX= (this.width-currentWidth)/2;

                for( i=0; i<this.getNumChildren(); i++ ) {
                    actor= this.getChildAt(i);
                    actor.x= currentX;
                    currentX+= actor.width;

                    if ( this.layoutOp===this.OP_LAYOUT_BOTTOM ) {
                        actor.y= this.maxSize- actor.height;
                    } else {
                        actor.y= 0;
                    }
                }
            } else {

                var currentHeight=0, currentY=0;

                for( i=0; i<this.getNumChildren(); i++ ) {
                    currentHeight+= this.getChildAt(i).height;
                }

                currentY= (this.height-currentHeight)/2;

                for( i=0; i<this.getNumChildren(); i++ ) {
                    actor= this.getChildAt(i);
                    actor.y= currentY;
                    currentY+= actor.height;

                    if ( this.layoutOp===this.OP_LAYOUT_LEFT ) {
                        actor.x= 0;
                    } else {
                        actor.x= this.width - actor.width;
                    }
                }

            }

        },
        mouseMove : function(mouseEvent) {
            this.actorNotPointed();
        },
        mouseExit : function(mouseEvent) {
            this.actorNotPointed();
        },
        /**
         * Performs operation when the mouse is not in the dock element.
         *
         * @private
         */
        actorNotPointed : function() {

            var i;
            var me= this;

            for( i=0; i<this.getNumChildren(); i++ ) {
                var actor= this.getChildAt(i);
                actor.emptyBehaviorList();
                actor.addBehavior(
                        new CAAT.GenericBehavior().
                            setValues( actor.width, this.minSize, actor, 'width' ).
                            setFrameTime( this.scene.time, 250 ) ).
                    addBehavior(
                        new CAAT.GenericBehavior().
                            setValues( actor.height, this.minSize, actor, 'height' ).
                            setFrameTime( this.scene.time, 250 ) );

                if ( i===this.getNumChildren()-1 ) {
                    actor.behaviorList[0].addListener(
                    {
                        behaviorApplied : function(behavior,time,normalizedTime,targetActor,value) {
                            targetActor.parent.layout();
                        },
                        behaviorExpired : function(behavior,time,targetActor) {
                            for( i=0; i<me.getNumChildren(); i++ ) {
                                actor= me.getChildAt(i);
                                actor.width  = me.minSize;
                                actor.height = me.minSize;
                            }
                            targetActor.parent.layout();
                        }
                    });
                }
            }
        },
        /**
         *
         * Perform the process of pointing a docking actor.
         *
         * @param x {number}
         * @param y {number}
         * @param pointedActor {CAAT.Actor}
         *
         * @private
         */
        actorPointed : function(x, y, pointedActor) {

            var index= this.findChild(pointedActor);

            var across= 0;
            if ( this.layoutOp===this.OP_LAYOUT_BOTTOM || this.layoutOp===this.OP_LAYOUT_TOP ) {
                across= x / pointedActor.width;
            } else {
                across= y / pointedActor.height;
            }
            var i;

            for( i=0; i<this.childrenList.length; i++ ) {
                var actor= this.childrenList[i];
                actor.emptyBehaviorList();

                var wwidth=0;
                if (i < index - this.range || i > index + this.range) {
                    wwidth = this.minSize;
                } else if (i === index) {
                    wwidth = this.maxSize;
                } else if (i < index) {
                    wwidth=
                        this.minSize +
                        (this.maxSize-this.minSize) *
                        (Math.cos((i - index - across + 1) / this.range * Math.PI) + 1) /
                        2;
                } else {
                    wwidth=
                        this.minSize +
                        (this.maxSize-this.minSize)*
                        (Math.cos( (i - index - across) / this.range * Math.PI) + 1) /
                        2;
                }

                actor.height= wwidth;
                actor.width= wwidth;
            }

            this.layout();
        },
        /**
         * Perform the process of exiting the docking element, that is, animate elements to the minimum
         * size.
         *
         * @param mouseEvent {CAAT.MouseEvent} a CAAT.MouseEvent object.
         *
         * @private
         */
        actorMouseExit : function(mouseEvent) {
            if ( null!==this.ttask ) {
                this.ttask.cancel();
            }

            var me= this;
            this.ttask= this.scene.createTimer(
                    this.scene.time,
                    100,
                    function timeout(sceneTime, time, timerTask) {
                        me.actorNotPointed();
                    },
                    null,
                    null);
        },
        /**
         * Perform the beginning of docking elements.
         * @param mouseEvent {CAAT.MouseEvent} a CAAT.MouseEvent object.
         *
         * @private
         */
        actorMouseEnter : function(mouseEvent) {
            if ( null!==this.ttask ) {
                this.ttask.cancel();
                this.ttask= null;
            }
        },
        /**
         * Adds an actor to Dock.
         * <p>
         * Be aware that actor mouse functions must be set prior to calling this method. The Dock actor
         * needs set his own actor input events functions for mouseEnter, mouseExit and mouseMove and
         * will then chain to the original methods set by the developer.
         *
         * @param actor {CAAT.Actor} a CAAT.Actor instance.
         *
         * @return this
         */
        addChild : function(actor) {
            var me= this;

            actor.__Dock_mouseEnter= actor.mouseEnter;
            actor.__Dock_mouseExit=  actor.mouseExit;
            actor.__Dock_mouseMove=  actor.mouseMove;

            /**
             * @ignore
             * @param mouseEvent
             */
            actor.mouseEnter= function(mouseEvent) {
                me.actorMouseEnter(mouseEvent);
                this.__Dock_mouseEnter(mouseEvent);
            };
            /**
             * @ignore
             * @param mouseEvent
             */
            actor.mouseExit= function(mouseEvent) {
                me.actorMouseExit(mouseEvent);
                this.__Dock_mouseExit(mouseEvent);
            };
            /**
             * @ignore
             * @param mouseEvent
             */
            actor.mouseMove= function(mouseEvent) {
                me.actorPointed( mouseEvent.point.x, mouseEvent.point.y, mouseEvent.source );
                this.__Dock_mouseMove(mouseEvent);
            };

            actor.width= this.minSize;
            actor.height= this.minSize;

            return CAAT.Dock.superclass.addChild.call(this,actor);
        }
    };

    extend( CAAT.Dock, CAAT.ActorContainer, null);

})();
/**
 * See LICENSE file.
 *
 **/


(function() {
    /**
     * Director is the animator scene graph manager.
     * <p>
     * The director elements is an ActorContainer itself with the main responsibility of managing
     * different Scenes.
     * <p>
     * It is responsible for:
     * <ul>
     * <li>scene changes.
     * <li>route input to the appropriate scene graph actor.
     * <li>be the central point for resource caching.
     * <li>manage the timeline.
     * <li>manage frame rate.
     * <li>etc.
     * </ul>
     *
     * <p>
     * One document can contain different CAAT.Director instances which will be kept together in CAAT
     * function.
     *
     * @constructor
     * @extends CAAT.ActorContainer
     */
    CAAT.Director = function() {
        CAAT.Director.superclass.constructor.call(this);

        this.browserInfo = new CAAT.BrowserDetect();
        this.audioManager = new CAAT.AudioManager().initialize(8);
        this.scenes = [];

        // input related variables initialization
        this.mousePoint = new CAAT.Point(0, 0, 0);
        this.prevMousePoint = new CAAT.Point(0, 0, 0);
        this.screenMousePoint = new CAAT.Point(0, 0, 0);
        this.isMouseDown = false;
        this.lastSelectedActor = null;
        this.dragging = false;

        this.cDirtyRects= [];
        this.dirtyRects= [];
        for( var i=0; i<64; i++ ) {
            this.dirtyRects.push( new CAAT.Rectangle() );
        }
        this.dirtyRectsIndex=   0;

        return this;
    };


    CAAT.Director.CLEAR_DIRTY_RECTS= 1;
    CAAT.Director.CLEAR_ALL=         true;
    CAAT.Director.CLEAR_NONE=        false;

    CAAT.Director.prototype = {

        debug:              false,  // flag indicating debug mode. It will draw affedted screen areas.

        onRenderStart:      null,
        onRenderEnd:        null,

        // input related attributes
        mousePoint:         null,   // mouse coordinate related to canvas 0,0 coord.
        prevMousePoint:     null,   // previous mouse position cache. Needed for drag events.
        screenMousePoint:   null,   // screen mouse coordinates.
        isMouseDown:        false,  // is the left mouse button pressed ?
        lastSelectedActor:  null,   // director's last actor receiving input.
        dragging:           false,  // is in drag mode ?

        // other attributes

        scenes:             null,   // Scenes collection. An array.
        currentScene:       null,   // The current Scene. This and only this will receive events.
        canvas:             null,   // The canvas the Director draws on.
        crc:                null,    // @deprecated. canvas rendering context
        ctx:                null,   // refactoring crc for a more convenient name
        time:               0,      // virtual actor time.
        timeline:           0,      // global director timeline.
        imagesCache:        null,   // An array of JSON elements of the form { id:string, image:Image }
        audioManager:       null,
        clear:              true,   // clear background before drawing scenes ??

        transitionScene:    null,

        browserInfo:        null,

        gl:                 null,
        glEnabled:          false,
        glTextureManager:   null,
        glTtextureProgram:  null,
        glColorProgram:     null,

        pMatrix:            null,       // projection matrix
        coords:             null,       // Float32Array
        coordsIndex:        0,
        uv:                 null,
        uvIndex:            0,

        front_to_back:      false,

        statistics: {
            size_total:         0,
            size_active:        0,
            size_dirtyRects:    0,
            draws:              0
        },
        currentTexturePage: 0,
        currentOpacity:     1,

        intervalId:         null,

        frameCounter:       0,

        RESIZE_NONE:        1,
        RESIZE_WIDTH:       2,
        RESIZE_HEIGHT:      4,
        RESIZE_BOTH:        8,
        RESIZE_PROPORTIONAL:16,
        resize:             1,
        onResizeCallback    :   null,

        __gestureScale      :   0,
        __gestureRotation   :   0,

        dirtyRects          :   null,
        cDirtyRects         :   null,
        dirtyRectsIndex     :   0,
        dirtyRectsEnabled   :   false,
        nDirtyRects         :   0,

        checkDebug : function() {
            if ( CAAT.DEBUG ) {
                var dd= new CAAT.Debug().initialize( this.width, 60 );
                this.debugInfo= dd.debugInfo.bind(dd);
            }
        },
        getRenderType : function() {
            return this.glEnabled ? 'WEBGL' : 'CANVAS';
        },
        windowResized : function(w, h) {
            switch (this.resize) {
                case this.RESIZE_WIDTH:
                    this.setBounds(0, 0, w, this.height);
                    break;
                case this.RESIZE_HEIGHT:
                    this.setBounds(0, 0, this.width, h);
                    break;
                case this.RESIZE_BOTH:
                    this.setBounds(0, 0, w, h);
                    break;
                case this.RESIZE_PROPORTIONAL:
                    this.setScaleProportional(w,h);
                    break;
            }

            if ( this.glEnabled ) {
                this.glReset();
            }

            if ( this.onResizeCallback )    {
                this.onResizeCallback( this, w, h );
            }

        },
        setScaleProportional : function(w,h) {

            var factor= Math.min(w/this.referenceWidth, h/this.referenceHeight);

            this.setScaleAnchored( factor, factor, 0, 0 );

            this.canvas.width = this.referenceWidth*factor;
            this.canvas.height = this.referenceHeight*factor;
            this.ctx = this.canvas.getContext(this.glEnabled ? 'experimental-webgl' : '2d' );
            this.crc = this.ctx;

            if ( this.glEnabled ) {
                this.glReset();
            }
        },
        /**
         * Enable window resize events and set redimension policy. A callback functio could be supplied
         * to be notified on a Director redimension event. This is necessary in the case you set a redim
         * policy not equal to RESIZE_PROPORTIONAL. In those redimension modes, director's area and their
         * children scenes are resized to fit the new area. But scenes content is not resized, and have
         * no option of knowing so uless an onResizeCallback function is supplied.
         *
         * @param mode {number}  RESIZE_BOTH, RESIZE_WIDTH, RESIZE_HEIGHT, RESIZE_NONE.
         * @param onResizeCallback {function(director{CAAT.Director}, width{integer}, height{integer})} a callback
         * to notify on canvas resize.
         */
        enableResizeEvents : function(mode, onResizeCallback) {
            if (mode === this.RESIZE_BOTH || mode === this.RESIZE_WIDTH || mode === this.RESIZE_HEIGHT || mode===this.RESIZE_PROPORTIONAL) {
                this.referenceWidth= this.width;
                this.referenceHeight=this.height;
                this.resize = mode;
                CAAT.registerResizeListener(this);
                this.onResizeCallback= onResizeCallback;
                this.windowResized( window.innerWidth, window.innerHeight );
            } else {
                CAAT.unregisterResizeListener(this);
                this.onResizeCallback= null;
            }
        },
        /**
         * Set this director's bounds as well as its contained scenes.
         * @param x {number} ignored, will be 0.
         * @param y {number} ignored, will be 0.
         * @param w {number} director width.
         * @param h {number} director height.
         *
         * @return this
         */
        setBounds : function(x, y, w, h) {
            CAAT.Director.superclass.setBounds.call(this, x, y, w, h);

            this.canvas.width = w;
            this.canvas.height = h;
            this.ctx = this.canvas.getContext(this.glEnabled ? 'experimental-webgl' : '2d');
            this.crc = this.ctx;

            for (var i = 0; i < this.scenes.length; i++) {
                this.scenes[i].setBounds(0, 0, w, h);
            }

            if ( this.glEnabled ) {
                this.glReset();
            }

            return this;
        },
        /**
         * This method performs Director initialization. Must be called once.
         * If the canvas parameter is not set, it will create a Canvas itself,
         * and the developer must explicitly add the canvas to the desired DOM position.
         * This method will also set the Canvas dimension to the specified values
         * by width and height parameters.
         *
         * @param width {number} a canvas width
         * @param height {number} a canvas height
         * @param canvas {HTMLCanvasElement=} An optional Canvas object.
         * @param proxy {HTMLElement} this object can be an event proxy in case you'd like to layer different elements
         *              and want events delivered to the correct element.
         *
         * @return this
         */
        initialize : function(width, height, canvas, proxy) {
            if ( !canvas ) {
              canvas= document.createElement('canvas');
              document.body.appendChild(canvas);
            }
            this.canvas = canvas;

            if ( typeof proxy==='undefined' ) {
                proxy= canvas;
            }

            this.setBounds(0, 0, width, height);
            this.create();
            this.enableEvents(proxy);

            this.timeline = new Date().getTime();

            // transition scene
            this.transitionScene = new CAAT.Scene().create().setBounds(0, 0, width, height);
            var transitionCanvas = document.createElement('canvas');
            transitionCanvas.width = width;
            transitionCanvas.height = height;
            var transitionImageActor = new CAAT.Actor().create().setBackgroundImage(transitionCanvas);
            this.transitionScene.ctx = transitionCanvas.getContext('2d');
            this.transitionScene.addChildImmediately(transitionImageActor);
            this.transitionScene.setEaseListener(this);

            this.checkDebug();

            return this;
        },
        glReset : function() {
            this.pMatrix= makeOrtho( 0, this.referenceWidth, this.referenceHeight, 0, -1, 1 );
            this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
            this.glColorProgram.setMatrixUniform(this.pMatrix);
            this.glTextureProgram.setMatrixUniform(this.pMatrix);
            this.gl.viewportWidth = this.canvas.width;
            this.gl.viewportHeight = this.canvas.height;
        },
        /**
         * Experimental.
         * Initialize a gl enabled director.
         * @param width
         * @param height
         * @param canvas
         */
        initializeGL : function(width, height, canvas, proxy) {

            if ( !canvas ) {
              canvas= document.createElement('canvas');
              document.body.appendChild(canvas);
            }

            canvas.width = width;
            canvas.height = height;

            if ( typeof proxy==='undefined' ) {
                proxy= canvas;
            }

            this.referenceWidth= width;
            this.referenceHeight=height;

            var i;

            try {
                this.gl = canvas.getContext("experimental-webgl"/*, {antialias: false}*/);
                this.gl.viewportWidth = width;
                this.gl.viewportHeight = height;
                CAAT.GLRENDER= true;
            } catch(e) {
            }

            if (this.gl) {
                this.canvas = canvas;
                this.create();
                this.setBounds(0, 0, width, height);

                this.crc = this.ctx;
                this.enableEvents(canvas);
                this.timeline = new Date().getTime();

                this.glColorProgram = new CAAT.ColorProgram(this.gl).create().initialize();
                this.glTextureProgram = new CAAT.TextureProgram(this.gl).create().initialize();
                this.glTextureProgram.useProgram();
                this.glReset();


                var maxTris = 512;
                this.coords = new Float32Array(maxTris * 12);
                this.uv = new Float32Array(maxTris * 8);

                this.gl.clearColor(0.0, 0.0, 0.0, 255);

                if (this.front_to_back) {
                    this.gl.clearDepth(1.0);
                    this.gl.enable(this.gl.DEPTH_TEST);
                    this.gl.depthFunc(this.gl.LESS);
                } else {
                    this.gl.disable(this.gl.DEPTH_TEST);
                }

                this.gl.enable(this.gl.BLEND);
// Fix FF                this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
                this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
                this.glEnabled = true;

                this.checkDebug();
            } else {
                // fallback to non gl enabled canvas.
                return this.initialize(width, height, canvas);
            }

            return this;
        },
        /**
         * Creates an initializes a Scene object.
         * @return {CAAT.Scene}
         */
        createScene : function() {
            var scene = new CAAT.Scene().create();
            this.addScene(scene);
            return scene;
        },
        setImagesCache : function(imagesCache, tpW, tpH) {

            var i;

            if (null !== this.glTextureManager) {
                this.glTextureManager.deletePages();
                this.glTextureManager = null;
            }

            // delete previous image identifiers
            if ( this.imagesCache ) {
                var ids= [];
                for ( i = 0; i < this.imagesCache.length; i++) {
                    ids.push( this.imagesCache[i].id );
                }

                for( i=0; i<ids.length; i++ ) {
                    delete this.imagesCache[ ids[i] ];
                }
            }
            
            this.imagesCache = imagesCache;

            if ( imagesCache ) {
                for ( i = 0; i < imagesCache.length; i++) {
                    this.imagesCache[ imagesCache[i].id ] = imagesCache[i].image;
                }
            }

            this.tpW = tpW || 2048;
            this.tpH = tpH || 2048;

            this.updateGLPages();
        },
        updateGLPages : function() {
            if (this.glEnabled) {

                this.glTextureManager = new CAAT.GLTexturePageManager();
                this.glTextureManager.createPages(this.gl, this.tpW, this.tpH, this.imagesCache);

                this.currentTexturePage = this.glTextureManager.pages[0];
                this.glTextureProgram.setTexture(this.currentTexturePage.texture);
            }
        },
        setGLTexturePage : function( tp ) {
            this.currentTexturePage = tp;
            this.glTextureProgram.setTexture(tp.texture);
            return this;
        },
        /**
         * Add a new image to director's image cache. If gl is enabled and the 'noUpdateGL' is not set to true this
         * function will try to recreate the whole GL texture pages.
         * If many handcrafted images are to be added to the director, some performance can be achieved by calling
         * <code>director.addImage(id,image,false)</code> many times and a final call with
         * <code>director.addImage(id,image,true)</code> to finally command the director to create texture pages.
         *
         * @param id {string|object} an identitifier to retrieve the image with
         * @param image {Image|HTMLCanvasElement} image to add to cache
         * @param noUpdateGL {!boolean} unless otherwise stated, the director will
         *  try to recreate the texture pages.
         */
        addImage : function( id, image, noUpdateGL ) {
            if ( this.getImage(id) ) {
                for (var i = 0; i < this.imagesCache.length; i++) {
                    if (this.imagesCache[i].id === id) {
                        this.imagesCache[i].image = image;
                        break;
                    }
                }
                this.imagesCache[ id ] = image;
            } else {
                this.imagesCache.push( { id: id, image: image } );
                this.imagesCache[id]= image;
            }

            if ( !!!noUpdateGL ) {
                this.updateGLPages( );
            }
        },
        deleteImage : function( id, noUpdateGL ) {
            for (var i = 0; i < this.imagesCache.length; i++) {
                if (this.imagesCache[i].id === id) {
                    delete this.imagesCache[id];
                    this.imagesCache.splice(i,1);
                    break;
                }
            }
            if ( !!!noUpdateGL ) {
                this.updateGLPages();
            }
        },
        setGLCurrentOpacity : function(opacity) {
            this.currentOpacity = opacity;
            this.glTextureProgram.setAlpha(opacity);
        },
        /**
         * Render buffered elements.
         * @param vertex
         * @param coordsIndex
         * @param uv
         */
        glRender : function(vertex, coordsIndex, uv) {

            vertex = vertex || this.coords;
            uv = uv || this.uv;
            coordsIndex = coordsIndex || this.coordsIndex;

            var gl = this.gl;

            var numTris = coordsIndex / 12 * 2;
            var numVertices = coordsIndex / 3;

            this.glTextureProgram.updateVertexBuffer(vertex);
            this.glTextureProgram.updateUVBuffer(uv);

            gl.drawElements(gl.TRIANGLES, 3 * numTris, gl.UNSIGNED_SHORT, 0);

        },
        glFlush : function() {
            if (this.coordsIndex !== 0) {
                this.glRender(this.coords, this.coordsIndex, this.uv);
            }
            this.coordsIndex = 0;
            this.uvIndex = 0;

            this.statistics.draws++;
        },

        findActorAtPosition : function(point) {

            // z-order
            var cl= this.childrenList;
            for( var i=cl.length-1; i>=0; i-- ) {
                var child= this.childrenList[i];

                var np= new CAAT.Point( point.x, point.y, 0 );
                var contained= child.findActorAtPosition( np );
                if ( null!==contained ) {
                    return contained;
                }
            }

            return this;
        },

        /**
         *
         * Reset statistics information.
         *
         * @private
         */
        resetStats : function() {
            this.statistics.size_total= 0;
            this.statistics.size_active=0;
            this.statistics.draws=      0;
        },

        /**
         * This is the entry point for the animation system of the Director.
         * The director is fed with the elapsed time value to maintain a virtual timeline.
         * This virtual timeline will provide each Scene with its own virtual timeline, and will only
         * feed time when the Scene is the current Scene, or is being switched.
         *
         * If dirty rectangles are enabled and canvas is used for rendering, the dirty rectangles will be
         * set up as a single clip area.
         *
         * @param time {number} integer indicating the elapsed time between two consecutive frames of the
         * Director.
         */
        render : function(time) {

            this.time += time;

            this.animate(this,time);

            if ( CAAT.DEBUG ) {
                this.resetStats();
            }

            /**
             * draw director active scenes.
             */
            var ne = this.childrenList.length;
            var i, tt, c;
            var ctx= this.ctx;

            if (this.glEnabled) {

                this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
                this.coordsIndex = 0;
                this.uvIndex = 0;

                for (i = 0; i < ne; i++) {
                    c = this.childrenList[i];
                    if (c.isInAnimationFrame(this.time)) {
                        tt = c.time - c.start_time;
                        if ( c.onRenderStart ) {
                            c.onRenderStart(tt);
                        }
                        c.paintActorGL(this, tt);
                        if ( c.onRenderEnd ) {
                            c.onRenderEnd(tt);
                        }

                        if ( !c.isPaused() ) {
                            c.time += time;
                        }

                        if ( CAAT.DEBUG ) {
                            this.statistics.size_total+= c.size_total;
                            this.statistics.size_active+= c.size_active;
                        }

                    }
                }

                this.glFlush();

            } else {
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = 'source-over';

                ctx.save();
                if ( this.dirtyRectsEnabled ) {
                    this.modelViewMatrix.transformRenderingContext( ctx );

                    if ( !CAAT.DEBUG_DIRTYRECTS ) {
                        ctx.beginPath();
                        this.nDirtyRects=0;
                        var dr= this.cDirtyRects;
                        for( i=0; i<dr.length; i++ ) {
                            var drr= dr[i];
                            if ( !drr.isEmpty() ) {
                                //ctx.rect( (drr.x|0)+.5, (drr.y|0)+.5, 1+(drr.width|0), 1+(drr.height|0) );
                                ctx.rect( drr.x|0, drr.y|0, 1+(drr.width|0), 1+(drr.height|0) );
                                this.nDirtyRects++;
                            }
                        }
                        ctx.clip();
                    } else {
                        ctx.clearRect(0, 0, this.width, this.height);
                    }

                } else if (this.clear===true ) {
                    ctx.clearRect(0, 0, this.width, this.height);
                }

                for (i = 0; i < ne; i++) {
                    c= this.childrenList[i];

                    if (c.isInAnimationFrame(this.time)) {
                        tt = c.time - c.start_time;
//                        ctx.save();

                        if ( c.onRenderStart ) {
                            c.onRenderStart(tt);
                        }

                        if ( !CAAT.DEBUG_DIRTYRECTS && this.dirtyRectsEnabled ) {
                            if ( this.nDirtyRects ) {
                                c.paintActor(this, tt);
                            }
                        } else {
                            c.paintActor(this, tt);
                        }

                        if ( c.onRenderEnd ) {
                            c.onRenderEnd(tt);
                        }
//                        ctx.restore();

                        if (CAAT.DEBUGAABB) {
                            ctx.globalAlpha= 1;
                            ctx.globalCompositeOperation= 'source-over';
                            this.modelViewMatrix.transformRenderingContextSet( ctx );
                            c.drawScreenBoundingBox(this, tt);
                        }

                        if ( !c.isPaused() ) {
                            c.time += time;
                        }

                        if ( CAAT.DEBUG ) {
                            this.statistics.size_total+= c.size_total;
                            this.statistics.size_active+= c.size_active;
                            this.statistics.size_dirtyRects= this.nDirtyRects;
                        }

                    }
                }

                if ( this.nDirtyRects>0 && CAAT.DEBUG && CAAT.DEBUG_DIRTYRECTS ) {
                    ctx.beginPath();
                    this.nDirtyRects=0;
                    var dr= this.cDirtyRects;
                    for( i=0; i<dr.length; i++ ) {
                        var drr= dr[i];
                        if ( !drr.isEmpty() ) {
                            ctx.rect( drr.x|0, drr.y|0, 1+(drr.width|0), 1+(drr.height|0) );
                            this.nDirtyRects++;
                        }
                    }

                    ctx.clip();
                    ctx.fillStyle='rgba(160,255,150,.4)';
                    ctx.fillRect(0,0,this.width, this.height);
                }

                ctx.restore();
            }

            this.frameCounter++;
        },
        /**
         * A director is a very special kind of actor.
         * Its animation routine simple sets its modelViewMatrix in case some transformation's been
         * applied.
         * No behaviors are allowed for Director instances.
         * @param director {CAAT.Director} redundant reference to CAAT.Director itself
         * @param time {number} director time.
         */
        animate : function(director, time) {
            this.setModelViewMatrix(this);
            this.modelViewMatrixI= this.modelViewMatrix.getInverse();
            this.setScreenBounds();

            this.dirty= false;
            this.invalid= false;
            this.dirtyRectsIndex= -1;
            this.cDirtyRects= [];

            var cl= this.childrenList;
            var cli;
            for (var i = 0; i < cl.length; i++) {
                cli= cl[i];
                var tt = cli.time - cli.start_time;
                cli.animate(this, tt);
            }

            return this;
        },
        /**
         * Add a rectangle to the list of dirty screen areas which should be redrawn.
         * This is the opposite method to clear the whole screen and repaint everything again.
         * Despite i'm not very fond of dirty rectangles because it needs some extra calculations, this
         * procedure has shown to be speeding things up under certain situations. Nevertheless it doesn't or
         * even lowers performance under others, so it is a developer choice to activate them via a call to
         * setClear( CAAT.Director.CLEAR_DIRTY_RECTS ).
         *
         * This function, not only tracks a list of dirty rectangles, but tries to optimize the list. Overlapping
         * rectangles will be removed and intersecting ones will be unioned.
         *
         * Before calling this method, check if this.dirtyRectsEnabled is true.
         *
         * @param rectangle {CAAT.Rectangle}
         */
        addDirtyRect : function( rectangle ) {

            if ( rectangle.isEmpty() ) {
                return;
            }

            var i, dr, j, drj;
            var cdr= this.cDirtyRects;

            for( i=0; i<cdr.length; i++ ) {
                dr= cdr[i];
                if ( !dr.isEmpty() && dr.intersects( rectangle ) ) {
                    var intersected= true;
                    while( intersected ) {
                        dr.unionRectangle( rectangle );

                        for( j=0; j<cdr.length; j++ ) {
                            if ( j!==i ) {
                                drj= cdr[j];
                                if ( !drj.isEmpty() && drj.intersects( dr ) ) {
                                    dr.unionRectangle( drj );
                                    drj.setEmpty();
                                    break;
                                }
                            }
                        }

                        if ( j==cdr.length ) {
                            intersected= false;
                        }
                    }

                    for( j=0; j<cdr.length; j++ ) {
                        if ( cdr[j].isEmpty() ) {
                            cdr.splice( j, 1 );
                        }
                    }

                    return;
                }
            }

            this.dirtyRectsIndex++;

            if ( this.dirtyRectsIndex>=this.dirtyRects.length ) {
                for( i=0; i<32; i++ ) {
                    this.dirtyRects.push( new CAAT.Rectangle() );
                }
            }

            var r= this.dirtyRects[ this.dirtyRectsIndex ];

            r.x= rectangle.x;
            r.y= rectangle.y;
            r.x1= rectangle.x1;
            r.y1= rectangle.y1;
            r.width= rectangle.width;
            r.height= rectangle.height;

            this.cDirtyRects.push( r );

        },
        /**
         * This method draws an Scene to an offscreen canvas. This offscreen canvas is also a child of
         * another Scene (transitionScene). So instead of drawing two scenes while transitioning from
         * one to another, first of all an scene is drawn to offscreen, and that image is translated.
         * <p>
         * Until the creation of this method, both scenes where drawn while transitioning with
         * its performance penalty since drawing two scenes could be twice as expensive than drawing
         * only one.
         * <p>
         * Though a high performance increase, we should keep an eye on memory consumption.
         *
         * @param ctx a <code>canvas.getContext('2d')</code> instnce.
         * @param scene {CAAT.Scene} the scene to draw offscreen.
         */
        renderToContext : function(ctx, scene) {
            /**
             * draw actors on scene.
             */
            if (scene.isInAnimationFrame(this.time)) {
                ctx.globalAlpha = 1;
                ctx.globalCompositeOperation = 'source-over';
                ctx.clearRect(0, 0, this.width, this.height);
                ctx.setTransform(1,0,0, 0,1,0);

                var octx = this.ctx;
                var ocrc = this.crc;

                this.ctx = this.crc = ctx;
                ctx.save();

                /**
                 * to draw an scene to an offscreen canvas, we have to:
                 *   1.- save diector's world model view matrix
                 *   2.- set no transformation on director since we want the offscreen to
                 *       be drawn 1:1.
                 *   3.- set world dirty flag, so that the scene will recalculate its matrices
                 *   4.- animate the scene
                 *   5.- paint the scene
                 *   6.- restore world model view matrix.
                 */
                var matwmv=  this.worldModelViewMatrix;
                this.worldModelViewMatrix= new CAAT.Matrix();
                this.wdirty= true;
                    scene.animate(this, scene.time);
                    if ( scene.onRenderStart ) {
                        scene.onRenderStart(scene.time);
                    }
                    scene.paintActor(this, scene.time);
                    if ( scene.onRenderEnd ) {
                        scene.onRenderEnd(scene.time);
                    }
                this.worldModelViewMatrix = matwmv;

                ctx.restore();

                this.ctx = octx;
                this.crc = ocrc;
            }
        },
        /**
         * Add a new Scene to Director's Scene list. By adding a Scene to the Director
         * does not mean it will be immediately visible, you should explicitly call either
         * <ul>
         *  <li>easeIn
         *  <li>easeInOut
         *  <li>easeInOutRandom
         *  <li>setScene
         *  <li>or any of the scene switching methods
         * </ul>
         *
         * @param scene {CAAT.Scene} an CAAT.Scene object.
         */
        addScene : function(scene) {
            scene.setBounds(0, 0, this.width, this.height);
            this.scenes.push(scene);
            scene.setEaseListener(this);
            if (null === this.currentScene) {
                this.setScene(0);
            }
        },
        /**
         * Get the number of scenes contained in the Director.
         * @return {number} the number of scenes contained in the Director.
         */
        getNumScenes : function() {
            return this.scenes.length;
        },
        /**
         * This method offers full control over the process of switching between any given two Scenes.
         * To apply this method, you must specify the type of transition to apply for each Scene and
         * the anchor to keep the Scene pinned at.
         * <p>
         * The type of transition will be one of the following values defined in CAAT.Scene.prototype:
         * <ul>
         *  <li>EASE_ROTATION
         *  <li>EASE_SCALE
         *  <li>EASE_TRANSLATION
         * </ul>
         *
         * <p>
         * The anchor will be any of these values defined in CAAT.Actor.prototype:
         * <ul>
         *  <li>ANCHOR_CENTER
         *  <li>ANCHOR_TOP
         *  <li>ANCHOR_BOTTOM
         *  <li>ANCHOR_LEFT
         *  <li>ANCHOR_RIGHT
         *  <li>ANCHOR_TOP_LEFT
         *  <li>ANCHOR_TOP_RIGHT
         *  <li>ANCHOR_BOTTOM_LEFT
         *  <li>ANCHOR_BOTTOM_RIGHT
         * </ul>
         *
         * <p>
         * In example, for an entering scene performing a EASE_SCALE transition, the anchor is the
         * point by which the scene will scaled.
         *
         * @param inSceneIndex integer indicating the Scene index to bring in to the Director.
         * @param typein integer indicating the type of transition to apply to the bringing in Scene.
         * @param anchorin integer indicating the anchor of the bringing in Scene.
         * @param outSceneIndex integer indicating the Scene index to take away from the Director.
         * @param typeout integer indicating the type of transition to apply to the taking away in Scene.
         * @param anchorout integer indicating the anchor of the taking away Scene.
         * @param time inteter indicating the time to perform the process of switchihg between Scene object
         * in milliseconds.
         * @param alpha boolean boolean indicating whether alpha transparency fading will be applied to
         * the scenes.
         * @param interpolatorIn CAAT.Interpolator object to apply to entering scene.
         * @param interpolatorOut CAAT.Interpolator object to apply to exiting scene.
         */
        easeInOut : function(inSceneIndex, typein, anchorin, outSceneIndex, typeout, anchorout, time, alpha, interpolatorIn, interpolatorOut) {

            if (inSceneIndex === this.getCurrentSceneIndex()) {
                return;
            }

            var ssin = this.scenes[ inSceneIndex ];
            var sout = this.scenes[ outSceneIndex ];

            if (!this.glEnabled && !navigator.browser==='iOS') {
                this.worldModelViewMatrix.transformRenderingContext(this.transitionScene.ctx);
                this.renderToContext(this.transitionScene.ctx, sout);
                sout = this.transitionScene;
            }

            ssin.setExpired(false);
            sout.setExpired(false);

            ssin.mouseEnabled = false;
            sout.mouseEnabled = false;

            ssin.resetTransform();
            sout.resetTransform();

            ssin.setLocation(0, 0);
            sout.setLocation(0, 0);

            ssin.alpha = 1;
            sout.alpha = 1;

            if (typein === CAAT.Scene.prototype.EASE_ROTATION) {
                ssin.easeRotationIn(time, alpha, anchorin, interpolatorIn);
            } else if (typein === CAAT.Scene.prototype.EASE_SCALE) {
                ssin.easeScaleIn(0, time, alpha, anchorin, interpolatorIn);
            } else {
                ssin.easeTranslationIn(time, alpha, anchorin, interpolatorIn);
            }

            if (typeout === CAAT.Scene.prototype.EASE_ROTATION) {
                sout.easeRotationOut(time, alpha, anchorout, interpolatorOut);
            } else if (typeout === CAAT.Scene.prototype.EASE_SCALE) {
                sout.easeScaleOut(0, time, alpha, anchorout, interpolatorOut);
            } else {
                sout.easeTranslationOut(time, alpha, anchorout, interpolatorOut);
            }

            this.childrenList = [];

            this.addChild(sout);
            this.addChild(ssin);
        },
        /**
         * This method will switch between two given Scene indexes (ie, take away scene number 2,
         * and bring in scene number 5).
         * <p>
         * It will randomly choose for each Scene the type of transition to apply and the anchor
         * point of each transition type.
         * <p>
         * It will also set for different kind of transitions the following interpolators:
         * <ul>
         * <li>EASE_ROTATION    -> ExponentialInOutInterpolator, exponent 4.
         * <li>EASE_SCALE       -> ElasticOutInterpolator, 1.1 and .4
         * <li>EASE_TRANSLATION -> BounceOutInterpolator
         * </ul>
         *
         * <p>
         * These are the default values, and could not be changed by now.
         * This method in final instance delegates the process to easeInOutMethod.
         *
         * @see easeInOutMethod.
         *
         * @param inIndex integer indicating the entering scene index.
         * @param outIndex integer indicating the exiting scene index.
         * @param time integer indicating the time to take for the process of Scene in/out in milliseconds.
         * @param alpha boolean indicating whether alpha transparency fading should be applied to transitions.
         */
        easeInOutRandom : function(inIndex, outIndex, time, alpha) {

            var pin = Math.random();
            var pout = Math.random();

            var typeIn;
            var interpolatorIn;

            if (pin < 0.33) {
                typeIn = CAAT.Scene.prototype.EASE_ROTATION;
                interpolatorIn = new CAAT.Interpolator().createExponentialInOutInterpolator(4);
            } else if (pin < 0.66) {
                typeIn = CAAT.Scene.prototype.EASE_SCALE;
                interpolatorIn = new CAAT.Interpolator().createElasticOutInterpolator(1.1, 0.4);
            } else {
                typeIn = CAAT.Scene.prototype.EASE_TRANSLATE;
                interpolatorIn = new CAAT.Interpolator().createBounceOutInterpolator();
            }

            var typeOut;
            var interpolatorOut;

            if (pout < 0.33) {
                typeOut = CAAT.Scene.prototype.EASE_ROTATION;
                interpolatorOut = new CAAT.Interpolator().createExponentialInOutInterpolator(4);
            } else if (pout < 0.66) {
                typeOut = CAAT.Scene.prototype.EASE_SCALE;
                interpolatorOut = new CAAT.Interpolator().createExponentialOutInterpolator(4);
            } else {
                typeOut = CAAT.Scene.prototype.EASE_TRANSLATE;
                interpolatorOut = new CAAT.Interpolator().createBounceOutInterpolator();
            }

            this.easeInOut(
                    inIndex,
                    typeIn,
                    (Math.random() * 8.99) >> 0,

                    outIndex,
                    typeOut,
                    (Math.random() * 8.99) >> 0,

                    time,
                    alpha,

                    interpolatorIn,
                    interpolatorOut);

        },
        /**
         * This method changes Director's current Scene to the scene index indicated by
         * inSceneIndex parameter. The Scene running in the director won't be eased out.
         *
         * @see {CAAT.Interpolator}
         * @see {CAAT.Actor}
         * @see {CAAT.Scene}
         *
         * @param inSceneIndex integer indicating the new Scene to set as current.
         * @param type integer indicating the type of transition to apply to bring the new current
         * Scene to the Director. The values will be one of: CAAT.Scene.prototype.EASE_ROTATION,
         * CAAT.Scene.prototype.EASE_SCALE, CAAT.Scene.prototype.EASE_TRANSLATION.
         * @param time integer indicating how much time in milliseconds the Scene entrance will take.
         * @param alpha boolean indicating whether alpha transparency fading will be applied to the
         * entereing Scene.
         * @param anchor integer indicating the anchor to fix for Scene transition. It will be any of
         * CAAT.Actor.prototype.ANCHOR_* values.
         * @param interpolator an CAAT.Interpolator object indicating the interpolation function to
         * apply.
         */
        easeIn : function(inSceneIndex, type, time, alpha, anchor, interpolator) {
            var sin = this.scenes[ inSceneIndex ];
            if (type === CAAT.Scene.prototype.EASE_ROTATION) {
                sin.easeRotationIn(time, alpha, anchor, interpolator);
            } else if (type === CAAT.Scene.prototype.EASE_SCALE) {
                sin.easeScaleIn(0, time, alpha, anchor, interpolator);
            } else {
                sin.easeTranslationIn(time, alpha, anchor, interpolator);
            }
            this.childrenList = [];
            this.addChild(sin);

            sin.resetTransform();
            sin.setLocation(0, 0);
            sin.alpha = 1;
            sin.mouseEnabled = false;
            sin.setExpired(false);
        },
        /**
         * Changes (or sets) the current Director scene to the index
         * parameter. There will be no transition on scene change.
         * @param sceneIndex {number} an integer indicating the index of the target Scene
         * to be shown.
         */
        setScene : function(sceneIndex) {
            var sin = this.scenes[ sceneIndex ];
            this.childrenList = [];
            this.addChild(sin);
            this.currentScene = sin;

            sin.setExpired(false);
            sin.mouseEnabled = true;
            sin.resetTransform();
            sin.setLocation(0, 0);
            sin.alpha = 1;

            sin.activated();
        },
        /**
         * This method will change the current Scene by the Scene indicated as parameter.
         * It will apply random values for anchor and transition type.
         * @see easeInOutRandom
         *
         * @param iNewSceneIndex {number} an integer indicating the index of the new scene to run on the Director.
         * @param time {number} an integer indicating the time the Scene transition will take.
         * @param alpha {boolean} a boolean indicating whether Scene transition should be fading.
         * @param transition {boolean} a boolean indicating whether the scene change must smoothly animated.
         */
        switchToScene : function(iNewSceneIndex, time, alpha, transition) {
            var currentSceneIndex = this.getSceneIndex(this.currentScene);

            if (!transition) {
                this.setScene(iNewSceneIndex);
            }
            else {
                this.easeInOutRandom(iNewSceneIndex, currentSceneIndex, time, alpha);
            }
        },
        /**
         * Sets the previous Scene in sequence as the current Scene.
         * @see switchToScene.
         *
         * @param time {number} integer indicating the time the Scene transition will take.
         * @param alpha {boolean} a boolean indicating whether Scene transition should be fading.
         * @param transition {boolean} a boolean indicating whether the scene change must smoothly animated.
         */
        switchToPrevScene : function(time, alpha, transition) {

            var currentSceneIndex = this.getSceneIndex(this.currentScene);

            if (this.getNumScenes() <= 1 || currentSceneIndex === 0) {
                return;
            }

            if (!transition) {
                this.setScene(currentSceneIndex - 1);
            }
            else {
                this.easeInOutRandom(currentSceneIndex - 1, currentSceneIndex, time, alpha);
            }
        },
        /**
         * Sets the previous Scene in sequence as the current Scene.
         * @see switchToScene.
         *
         * @param time {number} integer indicating the time the Scene transition will take.
         * @param alpha {boolean} a boolean indicating whether Scene transition should be fading.
         * @param transition {boolean} a boolean indicating whether the scene change must smoothly animated.
         */
        switchToNextScene: function(time, alpha, transition) {

            var currentSceneIndex = this.getSceneIndex(this.currentScene);

            if (this.getNumScenes() <= 1 || currentSceneIndex === this.getNumScenes() - 1) {
                return;
            }

            if (!transition) {
                this.setScene(currentSceneIndex + 1);
            }
            else {
                this.easeInOutRandom(currentSceneIndex + 1, currentSceneIndex, time, alpha);
            }
        },
        mouseEnter : function(mouseEvent) {
        },
        mouseExit : function(mouseEvent) {
        },
        mouseMove : function(mouseEvent) {
        },
        mouseDown : function(mouseEvent) {
        },
        mouseUp : function(mouseEvent) {
        },
        mouseDrag : function(mouseEvent) {
        },
        /**
         * Scene easing listener. Notifies scenes when they're about to be activated (set as current
         * director's scene).
         *
         * @param scene {CAAT.Scene} the scene that has just been brought in or taken out of the director.
         * @param b_easeIn {boolean} scene enters or exits ?
         */
        easeEnd : function(scene, b_easeIn) {
            // scene is going out
            if (!b_easeIn) {

                scene.setExpired(true);
            } else {
                this.currentScene = scene;
                this.currentScene.activated();
            }

            scene.mouseEnabled = true;
            scene.emptyBehaviorList();
        },
        /**
         * Return the index for a given Scene object contained in the Director.
         * @param scene {CAAT.Scene}
         */
        getSceneIndex : function(scene) {
            for (var i = 0; i < this.scenes.length; i++) {
                if (this.scenes[i] === scene) {
                    return i;
                }
            }
            return -1;
        },
        /**
         * Get a concrete director's scene.
         * @param index {number} an integer indicating the scene index.
         * @return {CAAT.Scene} a CAAT.Scene object instance or null if the index is oob.
         */
        getScene : function(index) {
            return this.scenes[index];
        },
        /**
         * Return the index of the current scene in the Director's scene list.
         * @return {number} the current scene's index.
         */
        getCurrentSceneIndex : function() {
            return this.getSceneIndex(this.currentScene);
        },
        /**
         * Return the running browser name.
         * @return {string} the browser name.
         */
        getBrowserName : function() {
            return this.browserInfo.browser;
        },
        /**
         * Return the running browser version.
         * @return {string} the browser version.
         */
        getBrowserVersion : function() {
            return this.browserInfo.version;
        },
        /**
         * Return the operating system name.
         * @return {string} the os name.
         */
        getOSName : function() {
            return this.browserInfo.OS;
        },
        /**
         * Gets the resource with the specified resource name.
         * The Director holds a collection called <code>imagesCache</code>
         * where you can store a JSON of the form
         *  <code>[ { id: imageId, image: imageObject } ]</code>.
         * This structure will be used as a resources cache.
         * There's a CAAT.ImagePreloader class to preload resources and
         * generate this structure on loading finalization.
         *
         * @param sId {object} an String identifying a resource.
         */
        getImage : function(sId) {
            var ret = this.imagesCache[sId];
            if (ret) {
                return ret;
            }

            for (var i = 0; i < this.imagesCache.length; i++) {
                if (this.imagesCache[i].id === sId) {
                    return this.imagesCache[i].image;
                }
            }

            return null;
        },
        /**
         * Adds an audio to the cache.
         *
         * @see CAAT.AudioManager.addAudio
         * @return this
         */
        addAudio : function(id, url) {
            this.audioManager.addAudio(id, url);
            return this;
        },
        /**
         * Plays the audio instance identified by the id.
         * @param id {object} the object used to store a sound in the audioCache.
         */
        audioPlay : function(id) {
            this.audioManager.play(id);
        },
        /**
         * Loops an audio instance identified by the id.
         * @param id {object} the object used to store a sound in the audioCache.
         *
         * @return {HTMLElement|null} the value from audioManager.loop
         */
        audioLoop : function(id) {
            return this.audioManager.loop(id);
        },
        endSound : function() {
            return this.audioManager.endSound();
        },
        setSoundEffectsEnabled : function(enabled) {
            return this.audioManager.setSoundEffectsEnabled(enabled);
        },
        setMusicEnabled : function(enabled) {
            return this.audioManager.setMusicEnabled(enabled);
        },
        isMusicEnabled : function() {
            return this.audioManager.isMusicEnabled();
        },
        isSoundEffectsEnabled : function() {
            return this.audioManager.isSoundEffectsEnabled();
        },
        setVolume : function( id, volume ) {
            return this.audioManager.setVolume( id, volume );
        },
        /**
         * Removes Director's scenes.
         */
        emptyScenes : function() {
            this.scenes = [];
        },
        /**
         * Adds an scene to this Director.
         * @param scene {CAAT.Scene} a scene object.
         */
        addChild : function(scene) {
            scene.parent = this;
            this.childrenList.push(scene);
        },
        /**
         * @Deprecated use CAAT.loop instead.
         * @param fps
         * @param callback
         * @param callback2
         */
        loop : function(fps,callback,callback2) {
            if ( callback2 ) {
                this.onRenderStart= callback;
                this.onRenderEnd= callback2;
            } else if (callback) {
                this.onRenderEnd= callback;
            }
            CAAT.loop();
        },
        /**
         * Starts the director animation.If no scene is explicitly selected, the current Scene will
         * be the first scene added to the Director.
         * <p>
         * The fps parameter will set the animation quality. Higher values,
         * means CAAT will try to render more frames in the same second (at the
         * expense of cpu power at least until hardware accelerated canvas rendering
         * context are available). A value of 60 is a high frame rate and should not be exceeded.
         *
         * @param fps {number} integer value indicating the target frames per second to run
         * the animation at.
         */
        renderFrame : function(fps, callback) {
            var t = new Date().getTime(),
                    delta = t - this.timeline;

            /*
            check for massive frame time. if for example the current browser tab is minified or taken out of
            foreground, the system will account for a bit time interval. minify that impact by lowering down
            the elapsed time (virtual timelines FTW)
             */
            if ( delta > 500 ) {
                delta= 500;
            }

            if ( this.onRenderStart ) {
                this.onRenderStart(delta);
            }

            this.render(delta);

            if ( this.debugInfo ) {
                this.debugInfo(this.statistics);
            }
            
            this.timeline = t;

            if (this.onRenderEnd) {
                this.onRenderEnd(delta);
            }
        },
        endLoop : function () {
        },
        /**
         * This method states whether the director must clear background before rendering
         * each frame.
         *
         * The clearing method could be:
         *  + CAAT.Director.CLEAR_ALL. previous to draw anything on screen the canvas will have clearRect called on it.
         *  + CAAT.Director.CLEAR_DIRTY_RECTS. Actors marked as invalid, or which have been moved, rotated or scaled
         *    will have their areas redrawn.
         *  + CAAT.Director.CLEAR_NONE. clears nothing.
         *
         * @param clear {CAAT.Director.CLEAR_ALL |�CAAT.Director.CLEAR_NONE | CAAT.Director.CLEAR_DIRTY_RECTS}
         * @return this.
         */
        setClear : function(clear) {
            this.clear = clear;
            if ( this.clear===CAAT.Director.CLEAR_DIRTY_RECTS ) {
                this.dirtyRectsEnabled= true;
            }
            return this;
        },
        /**
         * Get this Director's AudioManager instance.
         * @return {CAAT.AudioManager} the AudioManager instance.
         */
        getAudioManager : function() {
            return this.audioManager;
        },
        /**
         * Acculumate dom elements position to properly offset on-screen mouse/touch events.
         * @param node
         */
        cumulateOffset : function(node, parent, prop) {
            var left= prop+'Left';
            var top= prop+'Top';
            var x=0, y=0, style;

            while( navigator.browser!=='iOS' && node && node.style ) {
                if ( node.currentStyle ) {
                    style= node.currentStyle['position'];
                } else {
                    style= (node.ownerDocument.defaultView || node.ownerDocument.parentWindow).getComputedStyle(node, null);
                    style= style ? style.getPropertyValue('position') : null;
                }

//                if (!/^(relative|absolute|fixed)$/.test(style)) {
                if (!/^(fixed)$/.test(style)) {
                    x += node[left];
                    y+= node[top];
                    node = node[parent];
                } else {
                    break;
                }
            }

            return {
                x:      x,
                y:      y,
                style:  style
            };
        },
        getOffset : function( node ) {
            var res= this.cumulateOffset(node, 'offsetParent', 'offset');
            if ( res.style==='fixed' ) {
                var res2= this.cumulateOffset(node, node.parentNode ? 'parentNode' : 'parentElement', 'scroll');
                return {
                    x: res.x + res2.x,
                    y: res.y + res2.y
                };
            }

            return {
                x: res.x,
                y: res.y
            };
        },
        /**
         * Normalize input event coordinates to be related to (0,0) canvas position.
         * @param point {CAAT.Point} a CAAT.Point instance to hold the canvas coordinate.
         * @param e {MouseEvent} a mouse event from an input event.
         */
        getCanvasCoord : function(point, e) {

            var posx = 0;
            var posy = 0;
            if (!e) e = window.event;

            if (e.pageX || e.pageY) {
                posx = e.pageX;
                posy = e.pageY;
            }
            else if (e.clientX || e.clientY) {
                posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
                posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
            }

            var offset= this.getOffset(e.target);

            posx-= offset.x;
            posy-= offset.y;

            //////////////
            // transformar coordenada inversamente con affine transform de director.

            var pt= new CAAT.Point( posx, posy );
            if ( !this.modelViewMatrixI ) {
                this.modelViewMatrixI= this.modelViewMatrix.getInverse();
            }
            this.modelViewMatrixI.transformCoord(pt);
            posx= pt.x;
            posy= pt.y

            point.set(posx, posy);
            this.screenMousePoint.set(posx, posy);

        },

        __mouseDownHandler : function(e) {

            /*
            was dragging and mousedown detected, can only mean a mouseOut's been performed and on mouseOver, no
            button was presses. Then, send a mouseUp for the previos actor, and return;
             */
            if ( this.dragging && this.lastSelectedActor ) {
                this.__mouseUpHandler(e);
                return;
            }

            this.getCanvasCoord(this.mousePoint, e);
            this.isMouseDown = true;
            var lactor = this.findActorAtPosition(this.mousePoint);

            if (null !== lactor) {

                var pos = lactor.viewToModel(
                    new CAAT.Point(this.screenMousePoint.x, this.screenMousePoint.y, 0));

                lactor.mouseDown(
                    new CAAT.MouseEvent().init(
                        pos.x,
                        pos.y,
                        e,
                        lactor,
                        new CAAT.Point(
                            this.screenMousePoint.x,
                            this.screenMousePoint.y )));
            }

            this.lastSelectedActor= lactor;
        },

        __mouseUpHandler : function(e) {

            this.isMouseDown = false;
            this.getCanvasCoord(this.mousePoint, e);

            var pos= null;
            var lactor= this.lastSelectedActor;

            if (null !== lactor) {
                pos = lactor.viewToModel(
                    new CAAT.Point(this.screenMousePoint.x, this.screenMousePoint.y, 0));
                if ( lactor.actionPerformed && lactor.contains(pos.x, pos.y) ) {
                    lactor.actionPerformed(e)
                }

                lactor.mouseUp(
                    new CAAT.MouseEvent().init(
                        pos.x,
                        pos.y,
                        e,
                        lactor,
                        this.screenMousePoint,
                        this.currentScene.time));
            }

            if (!this.dragging && null !== lactor) {
                if (lactor.contains(pos.x, pos.y)) {
                    lactor.mouseClick(
                        new CAAT.MouseEvent().init(
                            pos.x,
                            pos.y,
                            e,
                            lactor,
                            this.screenMousePoint,
                            this.currentScene.time));
                }
            }

            this.dragging = false;
            this.in_=       false;
//            CAAT.setCursor('default');
        },

        __mouseMoveHandler : function(e) {
            this.getCanvasCoord(this.mousePoint, e);

            var lactor;
            var pos;

            var ct= this.currentScene ? this.currentScene.time : 0;

            // drag

            if (this.isMouseDown && null !== this.lastSelectedActor) {
/*
                // check for mouse move threshold.
                if (!this.dragging) {
                    if (Math.abs(this.prevMousePoint.x - this.mousePoint.x) < CAAT.DRAG_THRESHOLD_X &&
                        Math.abs(this.prevMousePoint.y - this.mousePoint.y) < CAAT.DRAG_THRESHOLD_Y) {
                        return;
                    }
                }
*/


                lactor = this.lastSelectedActor;
                pos = lactor.viewToModel(
                    new CAAT.Point(this.screenMousePoint.x, this.screenMousePoint.y, 0));

                this.dragging = true;

                var px= lactor.x;
                var py= lactor.y;
                lactor.mouseDrag(
                        new CAAT.MouseEvent().init(
                            pos.x,
                            pos.y,
                            e,
                            lactor,
                            new CAAT.Point(
                                this.screenMousePoint.x,
                                this.screenMousePoint.y),
                            ct));

                this.prevMousePoint.x= pos.x;
                this.prevMousePoint.y= pos.y;

                /**
                 * Element has not moved after drag, so treat it as a button.
                 */
                if ( px===lactor.x && py===lactor.y )   {

                    var contains= lactor.contains(pos.x, pos.y);

                    if (this.in_ && !contains) {
                        lactor.mouseExit(
                            new CAAT.MouseEvent().init(
                                pos.x,
                                pos.y,
                                e,
                                lactor,
                                this.screenMousePoint,
                                ct));
                        this.in_ = false;
                    }

                    if (!this.in_ && contains ) {
                        lactor.mouseEnter(
                            new CAAT.MouseEvent().init(
                                pos.x,
                                pos.y,
                                e,
                                lactor,
                                this.screenMousePoint,
                                ct));
                        this.in_ = true;
                    }
                }

                return;
            }

            // mouse move.
            this.in_= true;

            lactor = this.findActorAtPosition(this.mousePoint);

            // cambiamos de actor.
            if (lactor !== this.lastSelectedActor) {
                if (null !== this.lastSelectedActor) {

                    pos = this.lastSelectedActor.viewToModel(
                        new CAAT.Point(this.screenMousePoint.x, this.screenMousePoint.y, 0));

                    this.lastSelectedActor.mouseExit(
                        new CAAT.MouseEvent().init(
                            pos.x,
                            pos.y,
                            e,
                            this.lastSelectedActor,
                            this.screenMousePoint,
                            ct));
                }

                if (null !== lactor) {
                    pos = lactor.viewToModel(
                        new CAAT.Point( this.screenMousePoint.x, this.screenMousePoint.y, 0));

                    lactor.mouseEnter(
                        new CAAT.MouseEvent().init(
                            pos.x,
                            pos.y,
                            e,
                            lactor,
                            this.screenMousePoint,
                            ct));
                }
            }

            pos = lactor.viewToModel(
                new CAAT.Point(this.screenMousePoint.x, this.screenMousePoint.y, 0));

            if (null !== lactor) {

                lactor.mouseMove(
                    new CAAT.MouseEvent().init(
                        pos.x,
                        pos.y,
                        e,
                        lactor,
                        this.screenMousePoint,
                        ct));
            }

            this.lastSelectedActor = lactor;
        },

        __mouseOutHandler : function(e) {

            if (null !== this.lastSelectedActor ) {

                this.getCanvasCoord(this.mousePoint, e);
                var pos = new CAAT.Point(this.mousePoint.x, this.mousePoint.y, 0);
                this.lastSelectedActor.viewToModel(pos);

                var ev= new CAAT.MouseEvent().init(
                                pos.x,
                                pos.y,
                                e,
                                this.lastSelectedActor,
                                this.screenMousePoint,
                                this.currentScene.time);

                this.lastSelectedActor.mouseExit(ev);
                this.lastSelectedActor.mouseOut(ev);

                if ( !this.dragging ) {
                    this.lastSelectedActor = null;
                }
            } else {
                this.isMouseDown = false;
                this.in_ = false;
            }

        },

        __mouseOverHandler : function(e) {

            var lactor;
            var pos, ev;
            this.getCanvasCoord(this.mousePoint, e);

            if ( null==this.lastSelectedActor ) {
                lactor= this.findActorAtPosition( this.mousePoint );

                if (null !== lactor) {

                    pos = lactor.viewToModel(
                        new CAAT.Point(this.screenMousePoint.x, this.screenMousePoint.y, 0));

                    ev= new CAAT.MouseEvent().init(
                            pos.x,
                            pos.y,
                            e,
                            lactor,
                            this.screenMousePoint,
                            this.currentScane ? this.currentScene.time : 0);

                    lactor.mouseOver(ev);
                    lactor.mouseEnter(ev);
                }

                this.lastSelectedActor= lactor;
            } else {
                lactor= this.lastSelectedActor;
                pos = lactor.viewToModel(
                    new CAAT.Point(this.screenMousePoint.x, this.screenMousePoint.y, 0));

                ev= new CAAT.MouseEvent().init(
                        pos.x,
                        pos.y,
                        e,
                        lactor,
                        this.screenMousePoint,
                        this.currentScene.time);

                lactor.mouseOver(ev);
                lactor.mouseEnter(ev);
                
            }
        },

        __mouseDBLClickHandler : function(e) {

            this.getCanvasCoord(this.mousePoint, e);
            if (null !== this.lastSelectedActor) {
/*
                var pos = this.lastSelectedActor.viewToModel(
                    new CAAT.Point(this.screenMousePoint.x, this.screenMousePoint.y, 0));
*/
                this.lastSelectedActor.mouseDblClick(
                    new CAAT.MouseEvent().init(
                            this.mousePoint.x,
                            this.mousePoint.y,
                            e,
                            this.lastSelectedActor,
                            this.screenMousePoint,
                            this.currentScene.time));
            }
        },

        /**
         * Same as mouseDown but not preventing event.
         * Will only take care of first touch.
         * @param e
         */
        __touchStartHandler : function(e) {

            e.preventDefault();
            e= e.targetTouches[0]
            this.__mouseDownHandler(e);
        },

        __touchEndHandler : function(e) {

            e.preventDefault();
            e= e.changedTouches[0];
            this.__mouseUpHandler(e);
        },

        __touchMoveHandler : function(e) {

            e.preventDefault();

            if ( this.gesturing ) {
                return;
            }

            for( var i=0; i<e.targetTouches.length; i++ ) {
                if ( !i ) {
                    this.__mouseMoveHandler(e.targetTouches[i]);
                }
            }
        },

        __gestureStart : function( scale, rotation ) {
            this.gesturing= true;
            this.__gestureRotation= this.lastSelectedActor.rotationAngle;
            this.__gestureSX= this.lastSelectedActor.scaleX - 1;
            this.__gestureSY= this.lastSelectedActor.scaleY - 1;
        },

        __gestureChange : function( scale, rotation ) {
            if ( typeof scale==='undefined' || typeof rotation==='undefined' ) {
                return;
            }

            if ( this.lastSelectedActor!==null && this.lastSelectedActor.isGestureEnabled() ) {
                this.lastSelectedActor.setRotation( rotation*Math.PI/180 + this.__gestureRotation );

                this.lastSelectedActor.setScale(
                    this.__gestureSX + scale,
                    this.__gestureSY + scale );
            }

        },

        __gestureEnd : function( scale, rotation ) {
            this.gesturing= false;
            this.__gestureRotation= 0;
            this.__gestureScale= 0;
        },

        addHandlers: function(canvas) {

            var me= this;

            canvas.addEventListener('mouseup', function(e) {
                e.preventDefault();
                me.__mouseUpHandler(e);
            }, false );

            canvas.addEventListener('mousedown', function(e) {
                e.preventDefault();
                me.__mouseDownHandler(e);
            }, false );

            canvas.addEventListener('mouseover',function(e) {
                e.preventDefault();
                me.__mouseOverHandler(e);
            }, false);

            canvas.addEventListener('mouseout',function(e) {
                e.preventDefault();
                me.__mouseOutHandler(e);
            }, false);

            canvas.addEventListener('mousemove',
            function(e) {
                e.preventDefault();
                me.__mouseMoveHandler(e);
            },
            false);

            canvas.addEventListener("dblclick", function(e) {
                e.preventDefault();
                me.__mouseDBLClickHandler(e);
            }, false);

            canvas.addEventListener("touchstart",   this.__touchStartHandler.bind(this), false);
            canvas.addEventListener("touchmove",    this.__touchMoveHandler.bind(this), false);
            canvas.addEventListener("touchend",     this.__touchEndHandler.bind(this), false);
            canvas.addEventListener("gesturestart", function(e) {
                e.preventDefault();
                me.__gestureStart( e.scale, e.rotation );
            }, false );
            canvas.addEventListener("gestureend", function(e) {
                e.preventDefault();
                me.__gestureEnd( e.scale, e.rotation );
            }, false );
            canvas.addEventListener("gesturechange", function(e) {
                e.preventDefault();
                me.__gestureChange( e.scale, e.rotation );
            }, false );
        },

        enableEvents : function( onElement ) {
            CAAT.RegisterDirector(this);
            this.in_ = false;
            this.createEventHandler( onElement );
        },

        createEventHandler : function( onElement ) {
            //var canvas= this.canvas;
            this.in_ = false;
            //this.addHandlers(canvas);
            this.addHandlers( onElement );
        }
    };


    if (CAAT.__CSS__) {

        CAAT.Director.prototype.clip= true;
        CAAT.Director.prototype.glEnabled= false;

        CAAT.Director.prototype.getRenderType= function() {
            return 'CSS';
        };

        CAAT.Director.prototype.setScaleProportional= function(w,h) {

            var factor= Math.min(w/this.referenceWidth, h/this.referenceHeight);
            this.setScaleAnchored( factor, factor, 0, 0 );

            this.eventHandler.style.width=  ''+this.referenceWidth +'px';
            this.eventHandler.style.height= ''+this.referenceHeight+'px';
        };

        CAAT.Director.prototype.setBounds= function(x, y, w, h) {
            CAAT.Director.superclass.setBounds.call(this, x, y, w, h);
            for (var i = 0; i < this.scenes.length; i++) {
                this.scenes[i].setBounds(0, 0, w, h);
            }
            this.eventHandler.style.width= w+'px';
            this.eventHandler.style.height= h+'px';

            return this;
        };

        /**
         * In this DOM/CSS implementation, proxy is not taken into account since the event router is a top most
         * div in the document hierarchy (z-index 999999).
         * @param width
         * @param height
         * @param domElement
         * @param proxy
         */
        CAAT.Director.prototype.initialize= function(width, height, domElement, proxy) {

            this.timeline = new Date().getTime();
            this.domElement= domElement;
            this.style('position','absolute');
            this.style('width',''+width+'px');
            this.style('height',''+height+'px');
            this.style('overflow', 'hidden' );

            this.enableEvents(domElement);

            this.setBounds(0, 0, width, height);

            this.checkDebug();
            return this;
        };

        CAAT.Director.prototype.render= function(time) {

            this.time += time;
            this.animate(this,time);

            /**
             * draw director active scenes.
             */
            var i, l, tt;

            if ( CAAT.DEBUG ) {
                this.resetStats();
            }

            for (i = 0, l=this.childrenList.length; i < l; i++) {
                var c= this.childrenList[i];
                if (c.isInAnimationFrame(this.time)) {
                    tt = c.time - c.start_time;
                    if ( c.onRenderStart ) {
                        c.onRenderStart(tt);
                    }

                    if ( c.onRenderEnd ) {
                        c.onRenderEnd(tt);
                    }

                    if (!c.isPaused()) {
                        c.time += time;
                    }

                    if ( CAAT.DEBUG ) {
                        this.statistics.size_total+= c.size_total;
                        this.statistics.size_active+= c.size_active;
                        this.statistics.size_dirtyRects= this.nDirtyRects;
                    }

                }
            }

            this.frameCounter++;
        };

        CAAT.Director.prototype.addScene= function(scene) {
            scene.setVisible(true);
            scene.setBounds(0, 0, this.width, this.height);
            this.scenes.push(scene);
            scene.setEaseListener(this);
            if (null === this.currentScene) {
                this.setScene(0);
            }

            this.domElement.appendChild( scene.domElement );
        };

        CAAT.Director.prototype.emptyScenes= function() {
            this.scenes = [];
            this.domElement.innerHTML='';
            this.createEventHandler();
        };

        CAAT.Director.prototype.setClear= function(clear) {
            return this;
        };

        CAAT.Director.prototype.createEventHandler= function() {
            this.eventHandler= document.createElement('div');
            this.domElement.appendChild(this.eventHandler);

            this.eventHandler.style.position=   'absolute';
            this.eventHandler.style.left=       '0';
            this.eventHandler.style.top=        '0';
            this.eventHandler.style.zIndex=     999999;
            this.eventHandler.style.width=      ''+this.width+'px';
            this.eventHandler.style.height=     ''+this.height+'px';

            var canvas= this.eventHandler;
            this.in_ = false;

            this.addHandlers(canvas);
        };
    }

    extend(CAAT.Director, CAAT.ActorContainer, null);
})();
/**
 * See LICENSE file.
 *
 * MouseEvent is a class to hold necessary information of every mouse event related to concrete
 * scene graph Actors.
 *
 * Here it is also the logic to on mouse events, pump the correct event to the appropiate scene
 * graph Actor.
 *
 * TODO: add events for event pumping:
 *  + cancelBubling
 *
 **/


(function() {
    /**
     * This function creates a mouse event that represents a touch or mouse event.
     * @constructor
     */
	CAAT.MouseEvent = function() {
		this.point= new CAAT.Point(0,0,0);
		this.screenPoint= new CAAT.Point(0,0,0);
		return this;
	};
	
	CAAT.MouseEvent.prototype= {
		screenPoint:	null,
		point:			null,
		time:			0,
		source:			null,

        shift:          false,
        control:        false,
        alt:            false,
        meta:           false,

        sourceEvent:    null,

		init : function( x,y,sourceEvent,source,screenPoint,time ) {
			this.point.set(x,y);
			this.source=        source;
			this.screenPoint=   screenPoint;
            this.alt =          sourceEvent.altKey;
            this.control =      sourceEvent.ctrlKey;
            this.shift =        sourceEvent.shiftKey;
            this.meta =         sourceEvent.metaKey;
            this.sourceEvent=   sourceEvent;
            this.x=             x;
            this.y=             y;
            this.time=          time;
			return this;
		},
		isAltDown : function() {
			return this.alt;
		},
		isControlDown : function() {
			return this.control;
		},
		isShiftDown : function() {
			return this.shift;
		},
        isMetaDown: function() {
            return this.meta;
        },
        getSourceEvent : function() {
            return this.sourceEvent;
        }
	};
})();

CAAT.setCoordinateClamping= function( clamp ) {
    if ( clamp ) {
        CAAT.Matrix.prototype.transformRenderingContext= CAAT.Matrix.prototype.transformRenderingContext_Clamp;
        CAAT.Matrix.prototype.transformRenderingContextSet= CAAT.Matrix.prototype.transformRenderingContextSet_Clamp;
    } else {
        CAAT.Matrix.prototype.transformRenderingContext= CAAT.Matrix.prototype.transformRenderingContext_NoClamp;
        CAAT.Matrix.prototype.transformRenderingContextSet= CAAT.Matrix.prototype.transformRenderingContextSet_NoClamp;
    }
};

/**
 * Box2D point meter conversion ratio.
 */
CAAT.PMR= 64;

CAAT.GLRENDER= false;

/**
 * Allow visual debugging artifacts.
 */
CAAT.DEBUG= false;
CAAT.DEBUGBB= false;
CAAT.DEBUGBBBCOLOR='#00f';
CAAT.DEBUGAABB= false;    // debug bounding boxes.
CAAT.DEBUGAABBCOLOR='#f00';
CAAT.DEBUG_DIRTYRECTS=false;

/**
 * Log function which deals with window's Console object.
 */
CAAT.log= function() {
    if(window.console){
        window.console.log( Array.prototype.slice.call(arguments) );
    }
};

CAAT.FRAME_TIME= 0;

/**
 * Flag to signal whether events are enabled for CAAT.
 */
CAAT.GlobalEventsEnabled=   false;

/**
 * Accelerometer related data.
 */
CAAT.prevOnDeviceMotion=    null;   // previous accelerometer callback function.
CAAT.onDeviceMotion=        null;   // current accelerometer callback set for CAAT.
CAAT.accelerationIncludingGravity= { x:0, y:0, z:0 };   // acceleration data.
CAAT.rotationRate= { alpha: 0, beta:0, gamma: 0 };      // angles data.

/**
 * Do not consider mouse drag gesture at least until you have dragged
 * 5 pixels in any direction.
 */
CAAT.DRAG_THRESHOLD_X=      5;
CAAT.DRAG_THRESHOLD_Y=      5;

// has the animation loop began ?
CAAT.renderEnabled= false;
CAAT.FPS=           60;

/**
 * On resize event listener
 */
CAAT.windowResizeListeners= [];

/**
 * Register an object as resize callback.
 * @param f { function( windowResized(width{number},height{number})} ) }
 */
CAAT.registerResizeListener= function(f) {
    CAAT.windowResizeListeners.push(f);
};

/**
 * Unregister a resize listener.
 * @param director {CAAT.Director}
 */
CAAT.unregisterResizeListener= function(director) {
    for( var i=0; i<CAAT.windowResizeListeners.length; i++ ) {
        if ( director===CAAT.windowResizeListeners[i] ) {
            CAAT.windowResizeListeners.splice(i,1);
            return;
        }
    }
};

/**
 * Pressed key codes.
 */
CAAT.keyListeners= [];

/**
 * Register key events notification function.
 * @param f {function(key {integer}, action {'down'|'up'})}
 */
CAAT.registerKeyListener= function(f) {
    CAAT.keyListeners.push(f);
};



// Redefinitions of keyboard event to use noVNC code

CAAT.registerKeyListenerIfNeeded= function(f) {
 for( var i=0; i<CAAT.keyListeners.length; i++ ) {
        if ( f===CAAT.keyListeners[i] ) {            
            return;
        }
    }

    CAAT.keyListeners.push(f);
};

/**
 * Unregister a key events notification function
 * @param f {function}
 */
CAAT.unregisterKeyListener= function(f) {
    for( var i=0; i<CAAT.windowResizeListeners.length; i++ ) {
        if ( f===CAAT.keyListeners[i] ) {
            CAAT.keyListeners.splice(i,1);
            return;
        }
    }
};

CAAT.Keys = {
    ENTER:0xFF0D,
    BACKSPACE:0xFF08,
    TAB:0xFF09,
    SHIFT:0xFFE1,
    CTRL:0xFFE3,
    ALT:0xFFE9,
    PAUSE:19,
    CAPSLOCK:20,
    ESCAPE:0xFF1B,
    PAGEUP:33,
    PAGEDOWN:34,
    END:0xFF57,
    HOME:0xFF50,
    LEFT:0xFF51,
    UP:0xFF52,
    RIGHT:0xFF53,
    DOWN:0xFF54,
    INSERT:0xFF63,
    DELETE:0xFFFF,
    0:48,
    1:49,
    2:50,
    3:51,
    4:52,
    5:53,
    6:54,
    7:55,
    8:56,
    9:57,
    a:65,
    b:66,
    c:67,
    d:68,
    e:69,
    f:70,
    g:71,
    h:72,
    i:73,
    j:74,
    k:75,
    l:76,
    m:77,
    n:78,
    o:79,
    p:80,
    q:81,
    r:82,
    s:83,
    t:84,
    u:85,
    v:86,
    w:87,
    x:88,
    y:89,
    z:90,
    SELECT:93,
    NUMPAD0:96,
    NUMPAD1:97,
    NUMPAD2:98,
    NUMPAD3:99,
    NUMPAD4:100,
    NUMPAD5:101,
    NUMPAD6:102,
    NUMPAD7:103,
    NUMPAD8:104,
    NUMPAD9:105,
    MULTIPLY:106,
    ADD:107,
    SUBTRACT:109,
    DECIMALPOINT:110,
    DIVIDE:111,
    F1:112,
    F2:113,
    F3:114,
    F4:115,
    F5:116,
    F6:117,
    F7:118,
    F8:119,
    F9:120,
    F10:121,
    F11:122,
    F12:123,
    NUMLOCK:144,
    SCROLLLOCK:145,
    SEMICOLON:186,
    EQUALSIGN:187,
    COMMA:188,
    DASH:189,
    PERIOD:190,
    FORWARDSLASH:191,
    GRAVEACCENT:192,
    OPENBRACKET:219,
    BACKSLASH:220,
    CLOSEBRAKET:221,
    SINGLEQUOTE:222
};

CAAT.SHIFT_KEY=    0xFFE1;
CAAT.CONTROL_KEY=  0xFFE3;
CAAT.ALT_KEY=      0xFFE9;
CAAT.ENTER_KEY=    0xFF0D;

/**
 * Event modifiers.
 */
CAAT.KEY_MODIFIERS= {
    alt:        false,
    control:    false,
    shift:      false
};

/**
 * Define a key event.
 * @constructor
 * @param keyCode
 * @param up_or_down
 * @param modifiers
 * @param originalEvent
 */
CAAT.KeyEvent= function( keyCode, up_or_down, modifiers, originalEvent ) {
    this.keyCode= keyCode;
    this.action=  up_or_down;
    this.modifiers= modifiers;
    this.sourceEvent= originalEvent;

    this.preventDefault= function() {
        this.sourceEvent.preventDefault();
    }

    this.getKeyCode= function() {
        return this.keyCode;
    };

    this.getAction= function() {
        return this.action;
    };

    this.modifiers= function() {
        return this.modifiers;
    };

    this.isShiftPressed= function() {
        return this.modifiers.shift;
    };

    this.isControlPressed= function() {
        return this.modifiers.control;
    };

    this.isAltPressed= function() {
        return this.modifiers.alt;
    };

    this.getSourceEvent= function() {
        return this.sourceEvent;
    };
};

/**
 * Enable window level input events, keys and redimension.
 */
CAAT.GlobalEnableEvents= function __GlobalEnableEvents() {

    if ( CAAT.GlobalEventsEnabled ) {
        return;
    }    

    this.GlobalEventsEnabled= true;

    // Setup and activation of NoVNC key events library
    if (typeof(CAAT_EVT_SRC)=='undefined') {
	CAAT_EVT_SRC = window;
    }
    keyboard = new Keyboard({'target': CAAT_EVT_SRC,
        'onKeyPress':  function(keysym, down, evt) {

	if (down) {
                for( var i=0; i<CAAT.keyListeners.length; i++ ) {
                    CAAT.keyListeners[i]( new CAAT.KeyEvent(
                    	keysym,
                        'press',
                        {
                            alt:        CAAT.KEY_MODIFIERS.alt,
                            control:    CAAT.KEY_MODIFIERS.control,
                            shift:      CAAT.KEY_MODIFIERS.shift
                        },
                        evt));
                   }
		}
        },
     'onKeyDown':  function(keysym, down, evt) {

	  var key = keysym;

            if ( key===CAAT.SHIFT_KEY ) {
                CAAT.KEY_MODIFIERS.shift= true;
            } else if ( key===CAAT.CONTROL_KEY ) {
                CAAT.KEY_MODIFIERS.control= true;
            } else if ( key===CAAT.ALT_KEY ) {
                CAAT.KEY_MODIFIERS.alt= true;
            } else {
                for( var i=0; i<CAAT.keyListeners.length; i++ ) {
                    CAAT.keyListeners[i]( new CAAT.KeyEvent(
                        key,
                        'down',
                        {
                            alt:        CAAT.KEY_MODIFIERS.alt,
                            control:    CAAT.KEY_MODIFIERS.control,
                            shift:      CAAT.KEY_MODIFIERS.shift
                        },
                        evt)) ;
                }
            }
        },
      'onKeyUp':  function(keysym, down, evt) {

	  var key = keysym;

            if ( key===CAAT.SHIFT_KEY ) {
                CAAT.KEY_MODIFIERS.shift= false;
            } else if ( key===CAAT.CONTROL_KEY ) {
                CAAT.KEY_MODIFIERS.control= false;
            } else if ( key===CAAT.ALT_KEY ) {
                CAAT.KEY_MODIFIERS.alt= false;
            } else {

                for( var i=0; i<CAAT.keyListeners.length; i++ ) {
                    CAAT.keyListeners[i]( new CAAT.KeyEvent(
                        key,
                        'up',
                        {
                            alt:        CAAT.KEY_MODIFIERS.alt,
                            control:    CAAT.KEY_MODIFIERS.control,
                            shift:      CAAT.KEY_MODIFIERS.shift
                        },
                        evt));
                }
            }
        }


});

    keyboard.grab();
    



    CAAT_EVT_SRC.addEventListener('resize',
        function(evt) {
            for( var i=0; i<CAAT.windowResizeListeners.length; i++ ) {
                CAAT.windowResizeListeners[i].windowResized(
                        window.innerWidth,
                        window.innerHeight);
            }
        },
        true);
};


/**
 * Polyfill for requestAnimationFrame.
 */
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          window.oRequestAnimationFrame      ||
          window.msRequestAnimationFrame     ||
          function raf(/* function */ callback, /* DOMElement */ element){
            window.setTimeout(callback, 1000 / CAAT.FPS);
          };
})();

CAAT.SET_INTERVAL=0;
/**
 * Main animation loop entry point.
 * @param fps {number} desired fps. This parameter makes no sense unless requestAnimationFrame function
 * is not present in the system.
 */
CAAT.loop= function(fps) {
    if (CAAT.renderEnabled) {
        return;
    }


    CAAT.FPS= fps || 60;
    CAAT.renderEnabled= true;
    if (CAAT.NO_PERF) {
        setInterval(
                function() {
                    var t= new Date().getTime();
                    for (var i = 0, l = CAAT.director.length; i < l; i++) {
                        CAAT.director[i].renderFrame();
                    }
                    //t= new Date().getTime()-t;
                    CAAT.FRAME_TIME= t - CAAT.SET_INTERVAL;
                    
                    CAAT.SET_INTERVAL= t;

                },
                1000 / CAAT.FPS
        );
    } else {
        CAAT.renderFrame();
    }
}

CAAT.FPS_REFRESH= 500;  // debug panel update time.
CAAT.RAF= 0;            // requestAnimationFrame time reference.
CAAT.REQUEST_ANIMATION_FRAME_TIME=   0;
/**
 * Make a frame for each director instance present in the system.
 */
CAAT.renderFrame= function() {
    var t= new Date().getTime();
    for( var i=0, l=CAAT.director.length; i<l; i++ ) {
        CAAT.director[i].renderFrame();
    }
    t= new Date().getTime()-t;
    CAAT.FRAME_TIME= t;

    if (CAAT.RAF)   {
        CAAT.REQUEST_ANIMATION_FRAME_TIME= new Date().getTime()-CAAT.RAF;
    }
    CAAT.RAF= new Date().getTime();

    window.requestAnimFrame(CAAT.renderFrame, 0 );
}

/**
 * Set browser cursor. The preferred method for cursor change is this method.
 * @param cursor
 */
CAAT.setCursor= function(cursor) {
    if ( navigator.browser!=='iOS' ) {
        document.body.style.cursor= cursor;
    }
};

/**
 * Register and keep track of every CAAT.Director instance in the document.
 */
CAAT.RegisterDirector= function __CAATGlobal_RegisterDirector(director) {

    if ( !CAAT.director ) {
        CAAT.director=[];
    }
    CAAT.director.push(director);
    CAAT.GlobalEnableEvents();
};

/**
 * Enable at window level accelerometer events.
 */
(function() {

    function tilt(data) {
        CAAT.rotationRate= {
                alpha : 0,
                beta  : data[0],
                gamma : data[1]
            };
    }

    if (window.DeviceOrientationEvent) {
        window.addEventListener("deviceorientation", function (event) {
            tilt([event.beta, event.gamma]);
        }, true);
    } else if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', function (event) {
            tilt([event.acceleration.x * 2, event.acceleration.y * 2]);
        }, true);
    } else {
        window.addEventListener("MozOrientation", function (event) {
            tilt([-event.y * 45, event.x * 45]);
        }, true);
    }

})();
/**
 * See LICENSE file.
 *
 * TODO: allow set of margins, spacing, etc. to define subimages.
 *
 **/

(function() {

    CAAT.SpriteImageHelper= function(x,y,w,h, iw, ih) {
        this.x=         x;
        this.y=         y;
        this.width=     w;
        this.height=    h;

        this.setGL( x/iw, y/ih, (x+w-1)/iw, (y+h-1)/ih );
        return this;
    };

    CAAT.SpriteImageHelper.prototype= {

        x       :   0,
        y       :   0,
        width   :   0,
        height  :   0,
        u       :   0,
        v       :   0,
        u1      :   0,
        v1      :   0,

        setGL : function( u,v,u1,v1 ) {
            this.u= u;
            this.v= v;
            this.u1= u1;
            this.v1= v1;
            return this;
        }
    };
})();

(function() {

    /**
     *
     * This class is used by CAAT.Actor to draw images. It differs from CAAT.CompoundImage in that it
     * manages the subimage change based on time and a list of animation sub-image indexes.
     * A common use of this class will be:
     * 
     * <code>
     *     var si= new CAAT.SpriteImage().
     *          initialize( an_image_instance, rows, columns ).
     *          setAnimationImageIndex( [2,1,0,1] ).                // cycle throwout image with these indexes
     *          setChangeFPS( 200 ).                                // change sprite every 200 ms.
     *          setSpriteTransformation( CAAT.SpriteImage.TR_xx);   // optionally draw images inverted, ...
     * </code>
     *
     * A SpriteImage is an sprite sheet. It encapsulates an Image and treates and references it as a two
     * dimensional array of row by columns sub-images. The access form will be sequential so if defined a
     * CompoundImage of more than one row, the subimages will be referenced by an index ranging from 0 to
     * rows*columns-1. Each sumimage will be of size (image.width/columns) by (image.height/rows).
     *
     * <p>
     * It is able to draw its sub-images in the following ways:
     * <ul>
     * <li>no transformed (default)
     * <li>flipped horizontally
     * <li>flipped vertically
     * <li>flipped both vertical and horizontally
     * </ul>
     *
     * <p>
     * It is supposed to be used in conjunction with <code>CAAT.SpriteActor</code> instances.
     *
     * @constructor
     *
     */
    CAAT.SpriteImage = function() {
        this.paint= this.paintN;
        this.setAnimationImageIndex([0]);
        this.mapInfo=   {};
        return this;
    };

    CAAT.SpriteImage.prototype = {

        animationImageIndex:    null,   // an Array defining the sprite frame sequence
        prevAnimationTime:		-1,
        changeFPS:				1000,   // how much Scene time to take before changing an Sprite frame.
        transformation:			0,      // any of the TR_* constants.
        spriteIndex:			0,      // the current sprite frame

        TR_NONE:				0,      // constants used to determine how to draw the sprite image,
        TR_FLIP_HORIZONTAL:		1,
        TR_FLIP_VERTICAL:		2,
        TR_FLIP_ALL:			3,
        TR_FIXED_TO_SIZE:       4,
        TR_TILE:                5,

        image:                  null,
        rows:                   1,
        columns:                1,
        width:                  0,
        height:                 0,
        singleWidth:            0,
        singleHeight:           0,

        scaleX:                 1,
        scaleY:                 1,

        offsetX:                0,
        offsetY:                0,

        ownerActor:             null,

        mapInfo             :   null,
        map                 :   null,

        setOwner : function(actor) {
            this.ownerActor= actor;
            return this;
        },
        getRows: function() {
            return this.rows;
        },
        getColumns : function() {
            return this.columns;
        },

        getWidth : function() {
            var el= this.mapInfo[this.spriteIndex];
            return el.width;
        },

        getHeight : function() {
            var el= this.mapInfo[this.spriteIndex];
            return el.height;
        },

        /**
         * Get a reference to the same image information (rows, columns, image and uv cache) of this
         * SpriteImage. This means that re-initializing this objects image info (that is, calling initialize
         * method) will change all reference's image information at the same time.
         */
        getRef : function() {
            var ret=            new CAAT.SpriteImage();
            ret.image=          this.image;
            ret.rows=           this.rows;
            ret.columns=        this.columns;
            ret.width=          this.width;
            ret.height=         this.height;
            ret.singleWidth=    this.singleWidth;
            ret.singleHeight=   this.singleHeight;
            ret.mapInfo=        this.mapInfo;
            ret.offsetX=        this.offsetX;
            ret.offsetY=        this.offsetY;
            ret.scaleX=         this.scaleX;
            ret.scaleY=         this.scaleY;
            return ret;
        },
        /**
         * Set horizontal displacement to draw image. Positive values means drawing the image more to the
         * right.
         * @param x {number}
         * @return this
         */
        setOffsetX : function(x) {
            this.offsetX= x;
            return this;
        },
        /**
         * Set vertical displacement to draw image. Positive values means drawing the image more to the
         * bottom.
         * @param y {number}
         * @return this
         */
        setOffsetY : function(y) {
            this.offsetY= y;
            return this;
        },
        setOffset : function( x,y ) {
            this.offsetX= x;
            this.offsetY= y;
            return this;
        },
        /**
         * Initialize a grid of subimages out of a given image.
         * @param image {HTMLImageElement|Image} an image object.
         * @param rows {number} number of rows.
         * @param columns {number} number of columns
         *
         * @return this
         */
        initialize : function(image, rows, columns) {
            this.image = image;
            this.rows = rows;
            this.columns = columns;
            this.width = image.width;
            this.height = image.height;
            this.singleWidth = Math.floor(this.width / columns);
            this.singleHeight = Math.floor(this.height / rows);
            this.mapInfo= {};

            var i,sx0,sy0;
            var helper;

            if (image.__texturePage) {
                image.__du = this.singleWidth / image.__texturePage.width;
                image.__dv = this.singleHeight / image.__texturePage.height;


                var w = this.singleWidth;
                var h = this.singleHeight;
                var mod = this.columns;
                if (image.inverted) {
                    var t = w;
                    w = h;
                    h = t;
                    mod = this.rows;
                }

                var xt = this.image.__tx;
                var yt = this.image.__ty;

                var tp = this.image.__texturePage;

                for (i = 0; i < rows * columns; i++) {


                    var c = ((i % mod) >> 0);
                    var r = ((i / mod) >> 0);

                    var u = xt + c * w;  // esquina izq x
                    var v = yt + r * h;

                    var u1 = u + w;
                    var v1 = v + h;

                    helper= new CAAT.SpriteImageHelper(u,v,(u1-u),(v1-v),tp.width,tp.height).setGL(
                        u / tp.width,
                        v / tp.height,
                        u1 / tp.width,
                        v1 / tp.height );

                    this.mapInfo[i]= helper;
                }

            } else {
                for (i = 0; i < rows * columns; i++) {
                    sx0 = ((i % this.columns) | 0) * this.singleWidth;
                    sy0 = ((i / this.columns) | 0) * this.singleHeight;

                    helper= new CAAT.SpriteImageHelper( sx0, sy0, this.singleWidth, this.singleHeight, image.width, image.height  );
                    this.mapInfo[i]= helper;
                }
            }

            return this;
        },

        /**
         * Must be used to draw actor background and the actor should have setClip(true) so that the image tiles
         * properly.
         * @param director
         * @param time
         * @param x
         * @param y
         */
        paintTiled : function( director, time, x, y ) {
            this.setSpriteIndexAtTime(time);
            var el= this.mapInfo[this.spriteIndex];

            var r= new CAAT.Rectangle();
            this.ownerActor.AABB.intersect( director.AABB, r );

            var w= this.getWidth();
            var h= this.getHeight();
            var xoff= (this.offsetX-this.ownerActor.x) % w;
            if ( xoff> 0 ) {
                xoff= xoff-w;
            }
            var yoff= (this.offsetY-this.ownerActor.y) % h;
            if ( yoff> 0 ) {
                yoff= yoff-h;
            }

            var nw= (((r.width-xoff)/w)>>0)+1;
            var nh= (((r.height-yoff)/h)>>0)+1;
            var i,j;
            var ctx= director.ctx;

            for( i=0; i<nh; i++ ) {
                for( j=0; j<nw; j++ ) {
                    ctx.drawImage(
                        this.image,
                        el.x, el.y,
                        el.width, el.height,
                        (r.x-this.ownerActor.x+xoff+j*el.width)>>0, (r.y-this.ownerActor.y+yoff+i*el.height)>>0,
                        el.width, el.height);
                }
            }
        },

        /**
         * Draws the subimage pointed by imageIndex horizontally inverted.
         * @param canvas a canvas context.
         * @param imageIndex {number} a subimage index.
         * @param x {number} x position in canvas to draw the image.
         * @param y {number} y position in canvas to draw the image.
         *
         * @return this
         */
        paintInvertedH : function(director, time, x, y) {

            this.setSpriteIndexAtTime(time);

            var el= this.mapInfo[this.spriteIndex];

            var ctx= director.ctx;
            ctx.save();
            //ctx.translate(((0.5 + x) | 0) + el.width, (0.5 + y) | 0);
            ctx.translate( (x|0) + el.width, y|0 );
            ctx.scale(-1, 1);


            ctx.drawImage(
                this.image,
                el.x, el.y,
                el.width, el.height,
                this.offsetX>>0, this.offsetY>>0,
                el.width, el.height );

            ctx.restore();

            return this;
        },
        /**
         * Draws the subimage pointed by imageIndex vertically inverted.
         * @param canvas a canvas context.
         * @param imageIndex {number} a subimage index.
         * @param x {number} x position in canvas to draw the image.
         * @param y {number} y position in canvas to draw the image.
         *
         * @return this
         */
        paintInvertedV : function(director, time, x, y) {

            this.setSpriteIndexAtTime(time);
            var el= this.mapInfo[this.spriteIndex];

            var ctx= director.ctx;
            ctx.save();
            //ctx.translate((x + 0.5) | 0, (0.5 + y + el.height) | 0);
            ctx.translate( x|0, (y + el.height) | 0);
            ctx.scale(1, -1);

            ctx.drawImage(
                this.image,
                el.x, el.y,
                el.width, el.height,
                this.offsetX>>0,this.offsetY>>0,
                el.width, el.height);

            ctx.restore();

            return this;
        },
        /**
         * Draws the subimage pointed by imageIndex both horizontal and vertically inverted.
         * @param canvas a canvas context.
         * @param imageIndex {number} a subimage index.
         * @param x {number} x position in canvas to draw the image.
         * @param y {number} y position in canvas to draw the image.
         *
         * @return this
         */
        paintInvertedHV : function(director, time, x, y) {

            this.setSpriteIndexAtTime(time);
            var el= this.mapInfo[this.spriteIndex];

            var ctx= director.ctx;
            ctx.save();
            //ctx.translate((x + 0.5) | 0, (0.5 + y + el.height) | 0);
            ctx.translate( x | 0, (y + el.height) | 0);
            ctx.scale(1, -1);
            ctx.translate(el.width, 0);
            ctx.scale(-1, 1);

            ctx.drawImage(
                this.image,
                el.x, el.y,
                el.width, el.height,
                this.offsetX>>0, this.offsetY>>0,
                el.width, el.height);

            ctx.restore();

            return this;
        },
        /**
         * Draws the subimage pointed by imageIndex.
         * @param canvas a canvas context.
         * @param imageIndex {number} a subimage index.
         * @param x {number} x position in canvas to draw the image.
         * @param y {number} y position in canvas to draw the image.
         *
         * @return this
         */
        paintN : function(director, time, x, y) {
            this.setSpriteIndexAtTime(time);
            var el= this.mapInfo[this.spriteIndex];

            director.ctx.drawImage(
                this.image,
                el.x, el.y,
                el.width, el.height,
                (this.offsetX+x)>>0, (this.offsetY+y)>>0,
                el.width, el.height);

            return this;
        },
        /**
         * Draws the subimage pointed by imageIndex scaled to the size of w and h.
         * @param canvas a canvas context.
         * @param imageIndex {number} a subimage index.
         * @param x {number} x position in canvas to draw the image.
         * @param y {number} y position in canvas to draw the image.
         * @param w {number} new width of the subimage.
         * @param h {number} new height of the subimage.
         *
         * @return this
         */
        paintScaled : function(director, time, x, y) {
            this.setSpriteIndexAtTime(time);
            var el= this.mapInfo[this.spriteIndex];

            director.ctx.drawImage(
                this.image,
                el.x, el.y,
                el.width, el.height,
                (this.offsetX+x)>>0, (this.offsetY+y)>>0,
                this.ownerActor.width, this.ownerActor.height );

            return this;
        },
        getCurrentSpriteImageCSSPosition : function() {
            var el= this.mapInfo[this.spriteIndex];

            return '-'+(el.x-this.offsetX)+'px '+
                   '-'+(el.y-this.offsetY)+'px '+
                    (this.transformation===this.TR_TILE ? '' : 'no-repeat');
        },
        /**
         * Get the number of subimages in this compoundImage
         * @return {number}
         */
        getNumImages : function() {
            return this.rows * this.columns;
        },
        /**
         * TODO: set mapping coordinates for different transformations.
         * @param imageIndex
         * @param uvBuffer
         * @param uvIndex
         */
        setUV : function(uvBuffer, uvIndex) {
            var im = this.image;

            if (!im.__texturePage) {
                return;
            }

            var index = uvIndex;
            var sIndex= this.spriteIndex;
            var el= this.mapInfo[this.spriteIndex];

            var u=  el.u;
            var v=  el.v;
            var u1= el.u1;
            var v1= el.v1;
            if ( this.offsetX || this.offsetY ) {
                var w=  this.ownerActor.width;
                var h=  this.ownerActor.height;

                var tp= im.__texturePage;

                var _u= -this.offsetX / tp.width;
                var _v= -this.offsetY / tp.height;
                var _u1=(w-this.offsetX) / tp.width;
                var _v1=(h-this.offsetY) / tp.height;

                u=      _u  + im.__u;
                v=      _v  + im.__v;
                u1=     _u1 + im.__u;
                v1=     _v1 + im.__v;
            }

            if (im.inverted) {
                uvBuffer[index++] = u1;
                uvBuffer[index++] = v;

                uvBuffer[index++] = u1;
                uvBuffer[index++] = v1;

                uvBuffer[index++] = u;
                uvBuffer[index++] = v1;

                uvBuffer[index++] = u;
                uvBuffer[index++] = v;
            } else {
                uvBuffer[index++] = u;
                uvBuffer[index++] = v;

                uvBuffer[index++] = u1;
                uvBuffer[index++] = v;

                uvBuffer[index++] = u1;
                uvBuffer[index++] = v1;

                uvBuffer[index++] = u;
                uvBuffer[index++] = v1;
            }
        },
        /**
         * Set the elapsed time needed to change the image index.
         * @param fps an integer indicating the time in milliseconds to change.
         * @return this
         */
        setChangeFPS : function(fps) {
            this.changeFPS= fps;
            return this;
        },
        /**
         * Set the transformation to apply to the Sprite image.
         * Any value of
         *  <li>TR_NONE
         *  <li>TR_FLIP_HORIZONTAL
         *  <li>TR_FLIP_VERTICAL
         *  <li>TR_FLIP_ALL
         *
         * @param transformation an integer indicating one of the previous values.
         * @return this
         */
        setSpriteTransformation : function( transformation ) {
            this.transformation= transformation;
            switch(transformation)	{
				case this.TR_FLIP_HORIZONTAL:
					this.paint= this.paintInvertedH;
					break;
				case this.TR_FLIP_VERTICAL:
					this.paint= this.paintInvertedV;
					break;
				case this.TR_FLIP_ALL:
					this.paint= this.paintInvertedHV;
					break;
                case this.TR_FIXED_TO_SIZE:
                    this.paint= this.paintScaled;
                    break;
                case this.TR_TILE:
                    this.paint= this.paintTiled;
                    break;
				default:
					this.paint= this.paintN;
			}
            return this;
        },

        /**
         * Set the sprite animation images index. This method accepts an array of objects which define indexes to
         * subimages inside this sprite image.
         * If the SpriteImage is instantiated by calling the method initialize( image, rows, cols ), the value of
         * aAnimationImageIndex should be an array of numbers, which define the indexes into an array of subimages
         * with size rows*columns.
         * If the method InitializeFromMap( image, map ) is called, the value for aAnimationImageIndex is expected
         * to be an array of strings which are the names of the subobjects contained in the map object.
         *
         * @param aAnimationImageIndex an array indicating the Sprite's frames.
         */
		setAnimationImageIndex : function( aAnimationImageIndex ) {
			this.animationImageIndex= aAnimationImageIndex;
			this.spriteIndex= aAnimationImageIndex[0];

            return this;
		},
        setSpriteIndex : function(index) {
            this.spriteIndex= index;
            return this;
        },

        /**
         * Draws the sprite image calculated and stored in spriteIndex.
         *
         * @param director the CAAT.Director object instance that contains the Scene the Actor is in.
         * @param time an integer indicating the Scene time when the bounding box is to be drawn.
         */
		setSpriteIndexAtTime : function(time) {

            if ( this.animationImageIndex.length>1 ) {
                if ( this.prevAnimationTime===-1 )	{
                    this.prevAnimationTime= time;
                    this.spriteIndex=0;
                }
                else	{
                    var ttime= time;
                    ttime-= this.prevAnimationTime;
                    ttime/= this.changeFPS;
                    ttime%= this.animationImageIndex.length;
                    this.spriteIndex= this.animationImageIndex[Math.floor(ttime)];
                }
            }
        },

        getMapInfo : function( index ) {
            return this.mapInfo[ index ];
        },

        /**
         * This method takes the output generated from the tool at http://labs.hyperandroid.com/static/texture/spriter.html
         * and creates a map into that image.
         * @param image {Image|HTMLImageElement|Canvas} an image
         * @param map {object} the map into the image to define subimages.
         */
        initializeFromMap : function( image, map ) {
            this.initialize( image, 1, 1 );

            var key;
            var helper;
            var count=0;

            for( key in map ) {
                var value= map[key];

                helper= new CAAT.SpriteImageHelper(
                    value.x,
                    value.y,
                    value.width,
                    value.height,
                    image.width,
                    image.height
                );

                this.mapInfo[key]= helper;

                // set a default spriteIndex
                if ( !count ) {
                    this.setAnimationImageIndex( [key] );
                }

                count++;
            }

            return this;
        },

        /**
         *
         * @param image {Image|HTMLImageElement|Canvas}
         * @param map object with pairs "<a char>" : {
         *              id      : {number},
         *              height  : {number},
         *              xoffset : {number},
         *              letter  : {string},
         *              yoffset : {number},
         *              width   : {number},
         *              xadvance: {number},
         *              y       : {number},
         *              x       : {number}
         *          }
         */
        initializeAsGlyphDesigner : function( image, map ) {
            this.initialize( image, 1, 1 );

            var key;
            var helper;
            var count=0;

            for( key in map ) {
                var value= map[key];

                helper= new CAAT.SpriteImageHelper(
                    value.x,
                    value.y,
                    value.width,
                    value.height,
                    image.width,
                    image.height
                );

                helper.xoffset= typeof value.xoffset==='undefined' ? 0 : value.xoffset;
                helper.yoffset= typeof value.yoffset==='undefined' ? 0 : value.yoffset;
                helper.xadvance= typeof value.xadvance==='undefined' ? value.width : value.xadvance;

                this.mapInfo[key]= helper;

                // set a default spriteIndex
                if ( !count ) {
                    this.setAnimationImageIndex( [key] );
                }

                count++;
            }

            return this;

        },

        /**
         *
         * @param image
         * @param map: Array<{c: "a", width: 40}>
         */
        initializeAsFontMap : function( image, chars ) {
            this.initialize( image, 1, 1 );

            var helper;
            var x=0;

            for( var i=0;i<chars.length;i++ ) {
                var value= chars[i];

                helper= new CAAT.SpriteImageHelper(
                    x,
                    0,
                    value.width,
                    image.height,
                    image.width,
                    image.height
                );

                helper.xoffset= 0;
                helper.yoffset= 0;
                helper.xadvance= value.width;


                x += value.width;

                this.mapInfo[chars[i].c]= helper;

                // set a default spriteIndex
                if ( !i ) {
                    this.setAnimationImageIndex( [chars[i].c] );
                }
            }

            return this;
        },

        /**
         * This method creates a font sprite image based on a proportional font
         * It assumes the font is evenly spaced in the image
         * Example:
         * var font =   new CAAT.SpriteImage().initializeAsMonoTypeFontMap(
         *  director.getImage('numbers'),
         *  "0123456789"
         * );
         */

        initializeAsMonoTypeFontMap : function( image, chars ) {
            var map = [];
            var charArr = chars.split("");
            
            var w = image.width / charArr.length >> 0;

            for( var i=0;i<charArr.length;i++ ) {
                map.push({c: charArr[i], width: w });
            }

            return this.initializeAsFontMap(image,map);
        },

        stringWidth : function( str ) {
            var i,l,w=0,charInfo;

            for( i=0, l=str.length; i<l; i++ ) {
                  charInfo= this.mapInfo[ str.charAt(i) ];
                  if ( charInfo ) {
                      w+= charInfo.xadvance;
                  }
            }

            return w;
        },

        stringHeight : function() {
            if ( this.fontHeight ) {
                return this.fontHeight;
            }

            var y= 0;
            for( var i in this.mapInfo ) {
                var mi= this.mapInfo[i];

                var h= mi.height+mi.yoffset;
                if ( h>y ) {
                    y=h;
                }
            }

            this.fontHeight= y;
            return this.fontHeight;
        },

        drawString : function( ctx, str, x, y ) {
            var i, l, charInfo, w;
            var charArr = str.split("");
            
            for( i=0; i<charArr.length; i++ ) {
                charInfo= this.mapInfo[ charArr[i] ];
                  if ( charInfo ) {
                      w= charInfo.width;
                      ctx.drawImage(
                          this.image,
                          charInfo.x, charInfo.y,
                          w, charInfo.height,

                          x + charInfo.xoffset, y + charInfo.yoffset,
                          w, charInfo.height );

                      x+= charInfo.xadvance;
                  }
              }
        }

        
    };
})();
/**
 * See LICENSE file.
 *
 * Image/Resource preloader.
 *
 *
 **/


(function() {
    /**
     * This class is a image resource loader. It accepts an object of the form:
     *
     * {
     *   id1: string_url1,
     *   id2: string_url2,
     *   id3: string_url3,
     *   ...
     * }
     *
     * and on resources loaded correctly, will return an object of the form:
     *
     * {
     *   id1: HTMLImageElement,
     *   id2: HTMLImageElement,
     *   id3: HTMLImageElement,
     *   ...
     * }
     *
     * @constructor
     */
    CAAT.ImagePreloader = function()   {
        this.images = [];
        return this;
    };

    CAAT.ImagePreloader.prototype =   {

        images:                 null,   // a list of elements to load
        notificationCallback:   null,   // notification callback invoked for each image loaded.
        imageCounter:           0,      // elements counter.

        /**
         * Start images loading asynchronous process. This method will notify every image loaded event
         * and is responsibility of the caller to count the number of loaded images to see if it fits his
         * needs.
         * 
         * @param aImages {{ id:{url}, id2:{url}, ...} an object with id/url pairs.
         * @param callback_loaded_one_image {function( imageloader {CAAT.ImagePreloader}, counter {number}, images {{ id:{string}, image: {Image}}} )}
         * function to call on every image load.
         */
        loadImages: function( aImages, callback_loaded_one_image ) {

            if (!aImages) {
                if (callback_loaded_one_image ) {
                    callback_loaded_one_image(0,[]);
                }
            }

            var me= this, i;
            this.notificationCallback = callback_loaded_one_image;
            this.images= [];
            for( i=0; i<aImages.length; i++ ) {
                this.images.push( {id:aImages[i].id, image: new Image() } );
            }

            for( i=0; i<aImages.length; i++ ) {
                this.images[i].image.onload = function imageLoaded() {
                    me.imageCounter++;
                    me.notificationCallback(me.imageCounter, me.images);
                };
                this.images[i].image.src= aImages[i].url;
            }

            if ( aImages.length===0 ) {
                callback_loaded_one_image(0,[]);
            }
        }

    };
})();/**
 * See LICENSE file.
 */
(function() {
    /**
     * This class defines a timer action which is constrained to Scene time, so every Scene has the
     * abbility to create its own TimerTask objects. They must not be created by calling scene's
     * createTime method.
     *
     * <p>
     * A TimerTask is defined at least by:
     * <ul>
     *  <li>startTime: since when the timer will be active
     *  <li>duration:  from startTime to startTime+duration, the timerTask will be notifying (if set) the callback callback_tick.
     * </ul>
     * <p>
     * Upon TimerTask expiration, the TimerTask will notify (if set) the callback function callback_timeout.
     * Upon a call to the method cancel, the timer will be set expired, and (if set) the callback to callback_cancel will be
     * invoked.
     * <p>
     * Timer notifications will be performed <strong>BEFORE<strong> scene loop.
     *
     * @constructor
     *
     */
    CAAT.TimerTask= function() {
        return this;
    };

    CAAT.TimerTask.prototype= {
        startTime:          0,
        duration:           0,
        callback_timeout:   null,
        callback_tick:      null,
        callback_cancel:    null,

        scene:              null,
        taskId:             0,
        remove:             false,

        /**
         * Create a TimerTask.
         * The taskId will be set by the scene.
         * @param startTime {number} an integer indicating TimerTask enable time.
         * @param duration {number} an integer indicating TimerTask duration.
         * @param callback_timeout {function( sceneTime {number}, timertaskTime{number}, timertask {CAAT.TimerTask} )} on timeout callback function.
         * @param callback_tick {function( sceneTime {number}, timertaskTime{number}, timertask {CAAT.TimerTask} )} on tick callback function.
         * @param callback_cancel {function( sceneTime {number}, timertaskTime{number}, timertask {CAAT.TimerTask} )} on cancel callback function.
         *
         * @return this
         */
        create: function( startTime, duration, callback_timeout, callback_tick, callback_cancel ) {
            this.startTime=         startTime;
            this.duration=          duration;
            this.callback_timeout=  callback_timeout;
            this.callback_tick=     callback_tick;
            this.callback_cancel=   callback_cancel;
            return this;
        },
        /**
         * Performs TimerTask operation. The task will check whether it is in frame time, and will
         * either notify callback_timeout or callback_tick.
         *
         * @param time {number} an integer indicating scene time.
         * @return this
         *
         * @protected
         *
         */
        checkTask : function(time) {
            var ttime= time;
            ttime-= this.startTime;
            if ( ttime>=this.duration ) {
                this.remove= true;
                if( this.callback_timeout ) {
                    this.callback_timeout( time, ttime, this );
                }
            } else {
                if ( this.callback_tick ) {
                    this.callback_tick( time, ttime, this );
                }
            }
            return this;
        },
        /**
         * Reschedules this TimerTask by changing its startTime to current scene's time.
         * @param time {number} an integer indicating scene time.
         * @return this
         */
        reset : function( time ) {
            this.remove= false;
            this.startTime=  time;
            this.scene.ensureTimerTask(this);
            return this;
        },
        /**
         * Cancels this timer by removing it on scene's next frame. The function callback_cancel will
         * be called.
         * @return this
         */
        cancel : function() {
            this.remove= true;
            if ( null!=this.callback_cancel ) {
                this.callback_cancel( this.scene.time, this.scene.time-this.startTime, this );
            }
            return this;
        }
    };
})();
/**
* See LICENSE file.
 *
 */

(function() {
    /**
     * Scene is the top level ActorContainer of the Director at any given time.
     * The only time when 2 scenes could be active will be during scene change.
     * An scene controls the way it enters/exits the scene graph. It is also the entry point for all
     * input related and timed related events to every actor on screen.
     *
     * @constructor
     * @extends CAAT.ActorContainer
     *
     */
	CAAT.Scene= function() {
		CAAT.Scene.superclass.constructor.call(this);
        this.timerList= [];
        this.style( 'overflow', 'hidden' );
		return this;
	};
	
	CAAT.Scene.prototype= {
		
		easeContainerBehaviour:			null,   // Behavior container used uniquely for Scene switching.
		easeContainerBehaviourListener: null,   // who to notify about container behaviour events. Array.
		easeIn:							false,  // When Scene switching, this boolean identifies whether the
                                                // Scene is being brought in, or taken away.

        EASE_ROTATION:					1,      // Constant values to identify the type of Scene transition
		EASE_SCALE:						2,      // to perform on Scene switching by the Director.
		EASE_TRANSLATE:					3,

        timerList:                      null,   // collection of CAAT.TimerTask objects.
        timerSequence:                  0,      // incremental CAAT.TimerTask id.

        paused:                         false,

        isPaused :  function()  {
            return this.paused;
        },

        setPaused : function( paused ) {
            this.paused= paused;
        },

        /**
         * Check and apply timers in frame time.
         * @param time {number} the current Scene time.
         */
        checkTimers : function(time) {
            var i=this.timerList.length-1;
            while( i>=0 ) {
                if ( !this.timerList[i].remove ) {
                    this.timerList[i].checkTask(time);
                }
                i--;
            }
        },
        /**
         * Make sure the timertask is contained in the timer task list by adding it to the list in case it
         * is not contained.
         * @param timertask {CAAT.TimerTask} a CAAT.TimerTask object.
         * @return this
         */
        ensureTimerTask : function( timertask ) {
            if ( !this.hasTimer(timertask) ) {
                this.timerList.push(timertask);
            }
            return this;
        },
        /**
         * Check whether the timertask is in this scene's timer task list.
         * @param timertask {CAAT.TimerTask} a CAAT.TimerTask object.
         * @return {boolean} a boolean indicating whether the timertask is in this scene or not.
         */
        hasTimer : function( timertask ) {
            var i=this.timerList.length-1;
            while( i>=0 ) {
                if ( this.timerList[i]===timertask ) {
                    return true;
                }
                i--;
            }

            return false;
        },
        /**
         * Creates a timer task. Timertask object live and are related to scene's time, so when an Scene
         * is taken out of the Director the timer task is paused, and resumed on Scene restoration.
         *
         * @param startTime {number} an integer indicating the scene time this task must start executing at.
         * @param duration {number} an integer indicating the timerTask duration.
         * @param callback_timeout {function} timer on timeout callback function.
         * @param callback_tick {function} timer on tick callback function.
         * @param callback_cancel {function} timer on cancel callback function.
         *
         * @return {CAAT.TimerTask} a CAAT.TimerTask class instance.
         */
        createTimer : function( startTime, duration, callback_timeout, callback_tick, callback_cancel ) {

            var tt= new CAAT.TimerTask().create(
                        startTime,
                        duration,
                        callback_timeout, 
                        callback_tick,
                        callback_cancel );

            tt.taskId= this.timerSequence++;
            tt.sceneTime = this.time;
            tt.scene= this;

            this.timerList.push( tt );

            return tt;
        },
        /**
         * Removes expired timers. This method must not be called directly.
         */
        removeExpiredTimers : function() {
            var i;
            for( i=0; i<this.timerList.length; i++ ) {
                if ( this.timerList[i].remove ) {
                    this.timerList.splice(i,1);
                }
            }
        },
        /**
         * Scene animation method.
         * It extends Container's base behavior by adding timer control.
         * @param director {CAAT.Director} a CAAT.Director instance.
         * @param time {number} an integer indicating the Scene time the animation is being performed at.
         */
        animate : function(director, time) {
            this.checkTimers(time);
            CAAT.Scene.superclass.animate.call(this,director,time);
            this.removeExpiredTimers();
        },
        /**
         * Helper method to manage alpha transparency fading on Scene switch by the Director.
         * @param time {number} integer indicating the time in milliseconds the fading will take.
         * @param isIn {boolean} boolean indicating whether this Scene in the switch process is
         * being brought in.
         *
         * @private
         */
		createAlphaBehaviour: function(time, isIn) {
			var ab= new CAAT.AlphaBehavior();
			ab.setFrameTime( 0, time );
			ab.startAlpha= isIn ? 0 : 1;
			ab.endAlpha= isIn ? 1 : 0;
			this.easeContainerBehaviour.addBehavior(ab);
		},
        /**
         * Called from CAAT.Director to bring in an Scene.
         * A helper method for easeTranslation.
         * @param time integer indicating time in milliseconds for the Scene to be brought in.
         * @param alpha boolean indicating whether fading will be applied to the Scene.
         * @param anchor integer indicating the Scene switch anchor.
         * @param interpolator CAAT.Interpolator to apply to the Scene transition.
         */
		easeTranslationIn : function( time, alpha, anchor, interpolator ) {
            this.easeTranslation( time, alpha, anchor, true, interpolator );
        },
        /**
         * Called from CAAT.Director to bring in an Scene.
         * A helper method for easeTranslation.
         * @param time integer indicating time in milliseconds for the Scene to be taken away.
         * @param alpha boolean indicating whether fading will be applied to the Scene.
         * @param anchor integer indicating the Scene switch anchor.
         * @param interpolator CAAT.Interpolator to apply to the Scene transition.
         */
        easeTranslationOut : function( time, alpha, anchor, interpolator ) {
            this.easeTranslation( time, alpha, anchor, false, interpolator );
        },
        /**
         * This method will setup Scene behaviours to switch an Scene via a translation.
         * The anchor value can only be
         *  <li>CAAT.Actor.prototype.ANCHOR_LEFT
         *  <li>CAAT.Actor.prototype.ANCHOR_RIGHT
         *  <li>CAAT.Actor.prototype.ANCHOR_TOP
         *  <li>CAAT.Actor.prototype.ANCHOR_BOTTOM
         * if any other value is specified, any of the previous ones will be applied.
         *
         * @param time integer indicating time in milliseconds for the Scene.
         * @param alpha boolean indicating whether fading will be applied to the Scene.
         * @param anchor integer indicating the Scene switch anchor.
         * @param isIn boolean indicating whether the scene will be brought in.
         * @param interpolator {CAAT.Interpolator} a CAAT.Interpolator to apply to the Scene transition.
         */
		easeTranslation : function( time, alpha, anchor, isIn, interpolator ) {

            this.easeContainerBehaviour= new CAAT.ContainerBehavior();
            this.easeIn= isIn;

            var pb= new CAAT.PathBehavior();
            if ( interpolator ) {
                pb.setInterpolator( interpolator );
            }

            pb.setFrameTime( 0, time );

            // BUGBUG anchors: 1..4
            if ( anchor<1 ) {
                anchor=1;
            } else if ( anchor>4 ) {
                anchor= 4;
            }


			switch(anchor) {
			case CAAT.Actor.prototype.ANCHOR_TOP:
                if ( isIn ) {
                    pb.setPath( new CAAT.Path().setLinear( 0, -this.height, 0, 0) );
                } else {
                    pb.setPath( new CAAT.Path().setLinear( 0, 0, 0, -this.height) );
                }
                break;
            case CAAT.Actor.prototype.ANCHOR_BOTTOM:
                if ( isIn ) {
                    pb.setPath( new CAAT.Path().setLinear( 0, this.height, 0, 0) );
                } else {
                    pb.setPath( new CAAT.Path().setLinear( 0, 0, 0, this.height) );
                }
                break;
            case CAAT.Actor.prototype.ANCHOR_LEFT:
                if ( isIn ) {
                    pb.setPath( new CAAT.Path().setLinear( -this.width, 0, 0, 0) );
                } else {
                    pb.setPath( new CAAT.Path().setLinear( 0, 0, -this.width, 0) );
                }
                break;
            case CAAT.Actor.prototype.ANCHOR_RIGHT:
                if ( isIn ) {
                    pb.setPath( new CAAT.Path().setLinear( this.width, 0, 0, 0) );
                } else {
                    pb.setPath( new CAAT.Path().setLinear( 0, 0, this.width, 0) );
                }
                break;
            }

			if (alpha) {
				this.createAlphaBehaviour(time,isIn);
			}

			this.easeContainerBehaviour.addBehavior(pb);

			this.easeContainerBehaviour.setFrameTime( this.time, time );
			this.easeContainerBehaviour.addListener(this);

            var start= pb.path.startCurvePosition();
            this.setLocation(start.x, start.y);

			this.emptyBehaviorList();
			CAAT.Scene.superclass.addBehavior.call( this, this.easeContainerBehaviour );
		},
        /**
         * Called from CAAT.Director to bring in a Scene.
         * A helper method for easeScale.
         * @param time integer indicating time in milliseconds for the Scene to be brought in.
         * @param alpha boolean indicating whether fading will be applied to the Scene.
         * @param anchor integer indicating the Scene switch anchor.
         * @param interpolator {CAAT.Interpolator} a CAAT.Interpolator to apply to the Scene transition.
         * @param starttime integer indicating in milliseconds from which scene time the behavior will be applied.
         */
		easeScaleIn : function(starttime,time,alpha,anchor,interpolator) {
			this.easeScale(starttime,time,alpha,anchor,true,interpolator);
			this.easeIn= true;
		},
        /**
         * Called from CAAT.Director to take away a Scene.
         * A helper method for easeScale.
         * @param time integer indicating time in milliseconds for the Scene to be taken away.
         * @param alpha boolean indicating whether fading will be applied to the Scene.
         * @param anchor integer indicating the Scene switch anchor.
         * @param interpolator {CAAT.Interpolator} a CAAT.Interpolator instance to apply to the Scene transition.
         * @param starttime integer indicating in milliseconds from which scene time the behavior will be applied.
         */
		easeScaleOut : function(starttime,time,alpha,anchor,interpolator) {
			this.easeScale(starttime,time,alpha,anchor,false,interpolator);
			this.easeIn= false;
		},
        /**
         * Called from CAAT.Director to bring in ot take away an Scene.
         * @param time integer indicating time in milliseconds for the Scene to be taken away.
         * @param alpha boolean indicating whether fading will be applied to the Scene.
         * @param anchor integer indicating the Scene switch anchor.
         * @param interpolator {CAAT.Interpolator} a CAAT.Interpolator to apply to the Scene transition.
         * @param starttime integer indicating in milliseconds from which scene time the behavior will be applied.
         * @param isIn boolean indicating whether the Scene is being brought in.
         */
		easeScale : function(starttime,time,alpha,anchor,isIn,interpolator) {
			this.easeContainerBehaviour= new CAAT.ContainerBehavior();

			var x=0;
			var y=0;
			var x2=0;
			var y2=0;
			
			switch(anchor) {
			case CAAT.Actor.prototype.ANCHOR_TOP_LEFT:
			case CAAT.Actor.prototype.ANCHOR_TOP_RIGHT:
			case CAAT.Actor.prototype.ANCHOR_BOTTOM_LEFT:
			case CAAT.Actor.prototype.ANCHOR_BOTTOM_RIGHT:
			case CAAT.Actor.prototype.ANCHOR_CENTER:
				x2=1;
				y2=1;
				break;
			case CAAT.Actor.prototype.ANCHOR_TOP:
			case CAAT.Actor.prototype.ANCHOR_BOTTOM:
				x=1;
				x2=1;
				y=0;
				y2=1;
				break;
			case CAAT.Actor.prototype.ANCHOR_LEFT:
			case CAAT.Actor.prototype.ANCHOR_RIGHT:
				y=1;
				y2=1;
				x=0;
				x2=1;
				break;
			default:
				alert('scale anchor ?? '+anchor);
			}

			if ( !isIn ) {
				var tmp;
				tmp= x;
				x= x2;
				x2= tmp;
				
				tmp= y;
				y= y2;
				y2= tmp;
			}
			
			if (alpha) {
				this.createAlphaBehaviour(time,isIn);
			}
			
            var anchorPercent= this.getAnchorPercent(anchor);
			var sb= new CAAT.ScaleBehavior().
			        setFrameTime( starttime, time ).
                    setValues(x,x2,y,y2, anchorPercent.x, anchorPercent.y);

            if ( interpolator ) {
                sb.setInterpolator(interpolator);
            }

			this.easeContainerBehaviour.addBehavior(sb);
			this.easeContainerBehaviour.setFrameTime( this.time, time );
			this.easeContainerBehaviour.addListener(this);
			
			this.emptyBehaviorList();
			CAAT.Scene.superclass.addBehavior.call( this, this.easeContainerBehaviour );
		},
		/**
         * Overriden method to disallow default behavior.
		 * Do not use directly.
		 */
		addBehavior : function(behaviour) {
			return this;
		},
        /**
         * Called from CAAT.Director to use Rotations for bringing in.
         * This method is a Helper for the method easeRotation.
         * @param time integer indicating time in milliseconds for the Scene to be brought in.
         * @param alpha boolean indicating whether fading will be applied to the Scene.
         * @param anchor integer indicating the Scene switch anchor.
         * @param interpolator {CAAT.Interpolator} a CAAT.Interpolator to apply to the Scene transition.
         */
		easeRotationIn : function(time,alpha,anchor,interpolator) {
			this.easeRotation(time,alpha,anchor,true, interpolator);
			this.easeIn= true;
		},
        /**
         * Called from CAAT.Director to use Rotations for taking Scenes away.
         * This method is a Helper for the method easeRotation.
         * @param time integer indicating time in milliseconds for the Scene to be taken away.
         * @param alpha boolean indicating whether fading will be applied to the Scene.
         * @param anchor integer indicating the Scene switch anchor.
         * @param interpolator {CAAT.Interpolator} a CAAT.Interpolator to apply to the Scene transition.
         */
		easeRotationOut : function(time,alpha,anchor,interpolator) {
			this.easeRotation(time,alpha,anchor,false,interpolator);
			this.easeIn= false;
		},
        /**
         * Called from CAAT.Director to use Rotations for taking away or bringing Scenes in.
         * @param time integer indicating time in milliseconds for the Scene to be taken away or brought in.
         * @param alpha boolean indicating whether fading will be applied to the Scene.
         * @param anchor integer indicating the Scene switch anchor.
         * @param interpolator {CAAT.Interpolator} a CAAT.Interpolator to apply to the Scene transition.
         * @param isIn boolean indicating whehter the Scene is brought in.
         */
		easeRotation : function(time,alpha,anchor,isIn,interpolator) {
			this.easeContainerBehaviour= new CAAT.ContainerBehavior();
			
			var start=0;
			var end=0;

            if (anchor==CAAT.Actor.prototype.ANCHOR_CENTER ) {
                anchor= CAAT.Actor.prototype.ANCHOR_TOP;
            }

			switch(anchor) {
			case CAAT.Actor.prototype.ANCHOR_TOP:
			case CAAT.Actor.prototype.ANCHOR_BOTTOM:
			case CAAT.Actor.prototype.ANCHOR_LEFT:
			case CAAT.Actor.prototype.ANCHOR_RIGHT:
				start= Math.PI * (Math.random()<0.5 ? 1 : -1);
				break;
			case CAAT.Actor.prototype.ANCHOR_TOP_LEFT:
			case CAAT.Actor.prototype.ANCHOR_TOP_RIGHT:
			case CAAT.Actor.prototype.ANCHOR_BOTTOM_LEFT:
			case CAAT.Actor.prototype.ANCHOR_BOTTOM_RIGHT:
				start= Math.PI/2 * (Math.random()<0.5 ? 1 : -1);
				break;
			default:
				alert('rot anchor ?? '+anchor);
			}

			if ( false===isIn ) {
				var tmp= start;
				start=end;
				end= tmp;
			}

			if ( alpha ) {
				this.createAlphaBehaviour(time,isIn);
			}
			
            var anchorPercent= this.getAnchorPercent(anchor);
			var rb= new CAAT.RotateBehavior().
			        setFrameTime( 0, time ).
                    setValues( start, end, anchorPercent.x, anchorPercent.y );

            if ( interpolator ) {
                rb.setInterpolator(interpolator);
            }
			this.easeContainerBehaviour.addBehavior(rb);
			
			
			this.easeContainerBehaviour.setFrameTime( this.time, time );
			this.easeContainerBehaviour.addListener(this);
			
			this.emptyBehaviorList();
			CAAT.Scene.superclass.addBehavior.call( this, this.easeContainerBehaviour );
		},
        /**
         * Registers a listener for listen for transitions events.
         * Al least, the Director registers himself as Scene easing transition listener.
         * When the transition is done, it restores the Scene's capability of receiving events.
         * @param listener {function(caat_behavior,time,actor)} an object which contains a method of the form <code>
         * behaviorExpired( caat_behaviour, time, actor);
         */
		setEaseListener : function( listener ) {
			this.easeContainerBehaviourListener=listener;
		},
        /**
         * Private.
         * listener for the Scene's easeContainerBehaviour.
         * @param actor
         */
		behaviorExpired : function(actor) {
			this.easeContainerBehaviourListener.easeEnd(this, this.easeIn);
		},
        /**
         * This method should be overriden in case the developer wants to do some special actions when
         * the scene has just been brought in.
         */
        activated : function() {
        },
        /**
         * Scenes, do not expire the same way Actors do.
         * It simply will be set expired=true, but the frameTime won't be modified.
         * WARN: the parameter here is treated as boolean, not number.
         */
        setExpired : function(bExpired) {
            this.expired= bExpired;
            this.style('display', bExpired ? 'none' : 'block');
        },
        /**
         * An scene by default does not paint anything because has not fillStyle set.
         * @param director
         * @param time
         */
        paint : function(director, time) {
        }
	};

    extend( CAAT.Scene, CAAT.ActorContainer, null);

})();/**
 * See LICENSE file.
 *
 * @author  Mario Gonzalez || http://onedayitwillmake.com
 *
 **/


/**
 * @namespace
 */
CAAT.modules = CAAT.modules || {};

/**
 * @namespace
 */
CAAT.modules.CircleManager = CAAT.modules.CircleManager || {};/**
 * See LICENSE file.
 *
	  ####  #####  ##### ####    ###  #   # ###### ###### ##     ##  #####  #     #      ########    ##    #  #  #####
	 #   # #   #  ###   #   #  #####  ###    ##     ##   ##  #  ##    #    #     #     #   ##   #  #####  ###   ###
	 ###  #   #  ##### ####   #   #   #   ######   ##   #########  #####  ##### ##### #   ##   #  #   #  #   # #####
 -
 File:
 	PackedCircle.js
 Created By:
 	Mario Gonzalez
 Project	:
 	None
 Abstract:
 	 A single packed circle.
	 Contains a reference to it's div, and information pertaining to it state.
 Basic Usage:
	http://onedayitwillmake.com/CirclePackJS/
*/

(function() {

    /**
     * @constructor
     */
	CAAT.modules.CircleManager.PackedCircle= function()
	{
		this.boundsRule = CAAT.modules.CircleManager.PackedCircle.BOUNDS_RULE_IGNORE;
		this.position = new CAAT.Point(0,0,0);
		this.offset = new CAAT.Point(0,0,0);
		this.targetPosition = new CAAT.Point(0,0,0);
		return this;
	};

	CAAT.modules.CircleManager.PackedCircle.prototype = {
		id:             0,
		delegate:		null,
		position:		new CAAT.Point(0,0,0),
		offset:			new CAAT.Point(0,0,0),	// Offset from delegates position by this much

		targetPosition:	null,	// Where it wants to go
		targetChaseSpeed: 0.02,

		isFixed:		false,
		boundsRule:		0,
		collisionMask:	0,
		collisionGroup:	0,

		BOUNDS_RULE_WRAP:		1,      // Wrap to otherside
		BOUNDS_RULE_CONSTRAINT:	2,      // Constrain within bounds
		BOUNDS_RULE_DESTROY:	4,      // Destroy when it reaches the edge
		BOUNDS_RULE_IGNORE:		8,		// Ignore when reaching bounds

		containsPoint: function(aPoint)
		{
			var distanceSquared = this.position.getDistanceSquared(aPoint);
			return distanceSquared < this.radiusSquared;
		},

		getDistanceSquaredFromPosition: function(aPosition)
		{
			var distanceSquared = this.position.getDistanceSquared(aPosition);
			// if it's shorter than either radius, we intersect
			return distanceSquared < this.radiusSquared;
		},

		intersects: function(aCircle)
		{
			var distanceSquared = this.position.getDistanceSquared(aCircle.position);
			return (distanceSquared < this.radiusSquared || distanceSquared < aCircle.radiusSquared);
		},

/**
 * ACCESSORS
 */
		setPosition: function(aPosition)
		{
			this.position = aPosition;
			return this;
		},

		setDelegate: function(aDelegate)
		{
			this.delegate = aDelegate;
			return this;
		},

		setOffset: function(aPosition)
		{
			this.offset = aPosition;
			return this;
		},

		setTargetPosition: function(aTargetPosition)
		{
			this.targetPosition = aTargetPosition;
			return this;
		},

		setTargetChaseSpeed: function(aTargetChaseSpeed)
		{
			this.targetChaseSpeed = aTargetChaseSpeed;
			return this;
		},

		setIsFixed: function(value)
		{
			this.isFixed = value;
			return this;
		},

		setCollisionMask: function(aCollisionMask)
		{
			this.collisionMask = aCollisionMask;
			return this;
		},

		setCollisionGroup: function(aCollisionGroup)
		{
			this.collisionGroup = aCollisionGroup;
			return this;
		},

		setRadius: function(aRadius)
		{
			this.radius = aRadius;
			this.radiusSquared = this.radius*this.radius;
			return this;
		},

		initialize : function(overrides)
		{
			if (overrides)
			{
				for (var i in overrides)
				{
					this[i] = overrides[i];
				}
			}

			return this;
		},

		dealloc: function()
		{
			this.position = null;
			this.offset = null;
			this.delegate = null;
			this.targetPosition = null;
		}
	};
})();/**
 *
 * See LICENSE file.
 * 
	  ####  #####  ##### ####    ###  #   # ###### ###### ##     ##  #####  #     #      ########    ##    #  #  #####
	 #   # #   #  ###   #   #  #####  ###    ##     ##   ##  #  ##    #    #     #     #   ##   #  #####  ###   ###
	 ###  #   #  ##### ####   #   #   #   ######   ##   #########  #####  ##### ##### #   ##   #  #   #  #   # #####
 -
 File:
 	PackedCircle.js
 Created By:
 	Mario Gonzalez
 Project	:
 	None
 Abstract:
 	 A single packed circle.
	 Contains a reference to it's div, and information pertaining to it state.
 Basic Usage:
	http://onedayitwillmake.com/CirclePackJS/
*/
(function()
{
    /**
     * @constructor
     */
	CAAT.modules.CircleManager.PackedCircleManager= function()
	{
		return this;
	};

	CAAT.modules.CircleManager.PackedCircleManager.prototype = {
		allCircles:					[],
		numberOfCollisionPasses:	1,
		numberOfTargetingPasses:	0,
		bounds:						new CAAT.Rectangle(),

		/**
		 * Adds a circle to the simulation
		 * @param aCircle
		 */
		addCircle: function(aCircle)
		{
			aCircle.id = this.allCircles.length;
			this.allCircles.push(aCircle);
			return this;
		},

		/**
		 * Removes a circle from the simulations
		 * @param aCircle	Circle to remove
		 */
		removeCircle: function(aCircle)
		{
			var index = 0,
				found = false,
				len = this.allCircles.length;

			if(len === 0) {
				throw "Error: (PackedCircleManager) attempting to remove circle, and allCircles.length === 0!!";
			}

			while (len--) {
				if(this.allCircles[len] === aCircle) {
					found = true;
					index = len;
					break;
				}
			}

			if(!found) {
				throw "Could not locate circle in allCircles array!";
			}

			// Remove
			this.allCircles[index].dealloc();
			this.allCircles[index] = null;

			return this;
		},

		/**
		 * Forces all circles to move to where their delegate position is
		 * Assumes all targets have a 'position' property!
		 */
		forceCirclesToMatchDelegatePositions: function()
		{
			var len = this.allCircles.length;

			// push toward target position
			for(var n = 0; n < len; n++)
			{
				var aCircle = this.allCircles[n];
				if(!aCircle || !aCircle.delegate) {
					continue;
				}

				aCircle.position.set(aCircle.delegate.x + aCircle.offset.x,
						aCircle.delegate.y + aCircle.offset.y);
			}
		},

		pushAllCirclesTowardTarget: function(aTarget)
		{
			var v = new CAAT.Point(0,0,0),
				circleList = this.allCircles,
				len = circleList.length;

			// push toward target position
			for(var n = 0; n < this.numberOfTargetingPasses; n++)
			{
				for(var i = 0; i < len; i++)
				{
					var c = circleList[i];

					if(c.isFixed) continue;

					v.x = c.position.x - (c.targetPosition.x+c.offset.x);
					v.y = c.position.y - (c.targetPosition.y+c.offset.y);
					v.multiply(c.targetChaseSpeed);

					c.position.x -= v.x;
					c.position.y -= v.y;
				}
			}
		},

		/**
		 * Packs the circles towards the center of the bounds.
		 * Each circle will have it's own 'targetPosition' later on
		 */
		handleCollisions: function()
		{
			this.removeExpiredElements();

			var v = new CAAT.Point(0,0, 0),
				circleList = this.allCircles,
				len = circleList.length;

			// Collide circles
			for(var n = 0; n < this.numberOfCollisionPasses; n++)
			{
				for(var i = 0; i < len; i++)
				{
					var ci = circleList[i];


					for (var j = i + 1; j< len; j++)
					{
						var cj = circleList[j];

						if( !this.circlesCanCollide(ci, cj) ) continue;   // It's us!

						var dx = cj.position.x - ci.position.x,
							dy = cj.position.y - ci.position.y;

						// The distance between the two circles radii, but we're also gonna pad it a tiny bit
						var r = (ci.radius + cj.radius) * 1.08,
							d = ci.position.getDistanceSquared(cj.position);

						/**
						 * Collision detected!
						 */
						if (d < (r * r) - 0.02 )
						{
							v.x = dx;
							v.y = dy;
							v.normalize();

							var inverseForce = (r - Math.sqrt(d)) * 0.5;
							v.multiply(inverseForce);

							// Move cj opposite of the collision as long as its not fixed
							if(!cj.isFixed)
							{
								if(ci.isFixed)
									v.multiply(2.2);	// Double inverse force to make up for the fact that the other object is fixed

								// ADD the velocity
								cj.position.translatePoint(v);
							}

							// Move ci opposite of the collision as long as its not fixed
							if(!ci.isFixed)
							{
								if(cj.isFixed)
									v.multiply(2.2);	// Double inverse force to make up for the fact that the other object is fixed

								 // SUBTRACT the velocity
								ci.position.subtract(v);
							}

							// Emit the collision event from each circle, with itself as the first parameter
//							if(this.dispatchCollisionEvents && n == this.numberOfCollisionPasses-1)
//							{
//								this.eventEmitter.emit('collision', cj, ci, v);
//							}
						}
					}
				}
			}
		},

		handleBoundaryForCircle: function(aCircle, boundsRule)
		{
//			if(aCircle.boundsRule === true) return; // Ignore if being dragged

			var xpos = aCircle.position.x;
			var ypos = aCircle.position.y;

			var radius = aCircle.radius;
			var diameter = radius*2;

			// Toggle these on and off,
			// Wrap and bounce, are opposite behaviors so pick one or the other for each axis, or bad things will happen.
			var wrapXMask = 1 << 0;
			var wrapYMask = 1 << 2;
			var constrainXMask = 1 << 3;
			var constrainYMask = 1 << 4;
			var emitEvent = 1 << 5;

			// TODO: Promote to member variable
			// Convert to bitmask - Uncomment the one you want, or concact your own :)
	//		boundsRule = wrapY; // Wrap only Y axis
	//		boundsRule = wrapX; // Wrap only X axis
	//		boundsRule = wrapXMask | wrapYMask; // Wrap both X and Y axis
			boundsRule = wrapYMask | constrainXMask;  // Wrap Y axis, but constrain horizontally

			// Wrap X
			if(boundsRule & wrapXMask && xpos-diameter > this.bounds.right) {
				aCircle.position.x = this.bounds.left + radius;
			} else if(boundsRule & wrapXMask && xpos+diameter < this.bounds.left) {
				aCircle.position.x = this.bounds.right - radius;
			}
			// Wrap Y
			if(boundsRule & wrapYMask && ypos-diameter > this.bounds.bottom) {
				aCircle.position.y = this.bounds.top - radius;
			} else if(boundsRule & wrapYMask && ypos+diameter < this.bounds.top) {
				aCircle.position.y = this.bounds.bottom + radius;
			}

			// Constrain X
			if(boundsRule & constrainXMask && xpos+radius >= this.bounds.right) {
				aCircle.position.x = aCircle.position.x = this.bounds.right-radius;
			} else if(boundsRule & constrainXMask && xpos-radius < this.bounds.left) {
				aCircle.position.x = this.bounds.left + radius;
			}

			// Constrain Y
			if(boundsRule & constrainYMask && ypos+radius > this.bounds.bottom) {
				aCircle.position.y = this.bounds.bottom - radius;
			} else if(boundsRule & constrainYMask && ypos-radius < this.bounds.top) {
				aCircle.position.y = this.bounds.top + radius;
			}
		},

		/**
		 * Given an x,y position finds circle underneath and sets it to the currently grabbed circle
		 * @param {Number} xpos		An x position
		 * @param {Number} ypos		A y position
		 * @param {Number} buffer	A radiusSquared around the point in question where something is considered to match
		 */
		getCircleAt: function(xpos, ypos, buffer)
		{
			var circleList = this.allCircles;
			var len = circleList.length;
			var grabVector = new CAAT.Point(xpos, ypos, 0);

			// These are set every time a better match i found
			var closestCircle = null;
			var closestDistance = Number.MAX_VALUE;

			// Loop thru and find the closest match
			for(var i = 0; i < len; i++)
			{
				var aCircle = circleList[i];
				if(!aCircle) continue;
				var distanceSquared = aCircle.position.getDistanceSquared(grabVector);

				if(distanceSquared < closestDistance && distanceSquared < aCircle.radiusSquared + buffer)
				{
					closestDistance = distanceSquared;
					closestCircle = aCircle;
				}
			}

			return closestCircle;
		},

		circlesCanCollide: function(circleA, circleB)
		{
		    if(!circleA || !circleB || circleA===circleB) return false; 					// one is null (will be deleted next loop), or both point to same obj.
//			if(circleA.delegate == null || circleB.delegate == null) return false;					// This circle will be removed next loop, it's entity is already removed

//			if(circleA.isFixed & circleB.isFixed) return false;
//			if(circleA.delegate .clientID === circleB.delegate.clientID) return false; 				// Don't let something collide with stuff it owns

			// They dont want to collide
//			if((circleA.collisionGroup & circleB.collisionMask) == 0) return false;
//			if((circleB.collisionGroup & circleA.collisionMask) == 0) return false;

			return true;
		},
/**
 * Accessors
 */
		setBounds: function(x, y, w, h)
		{
			this.bounds.x = x;
			this.bounds.y = y;
			this.bounds.width = w;
			this.bounds.height = h;
		},

		setNumberOfCollisionPasses: function(value)
		{
			this.numberOfCollisionPasses = value;
			return this;
		},

		setNumberOfTargetingPasses: function(value)
		{
			this.numberOfTargetingPasses = value;
			return this;
		},

/**
 * Helpers
 */
		sortOnDistanceToTarget: function(circleA, circleB)
		{
			var valueA = circleA.getDistanceSquaredFromPosition(circleA.targetPosition);
			var valueB = circleB.getDistanceSquaredFromPosition(circleA.targetPosition);
			var comparisonResult = 0;

			if(valueA > valueB) comparisonResult = -1;
			else if(valueA < valueB) comparisonResult = 1;

			return comparisonResult;
		},

/**
 * Memory Management
 */
		removeExpiredElements: function()
		{
			// remove null elements
			for (var k = this.allCircles.length; k >= 0; k--) {
				if (this.allCircles[k] === null)
					this.allCircles.splice(k, 1);
			}
		},

		initialize : function(overrides)
		{
			if (overrides)
			{
				for (var i in overrides)
				{
					this[i] = overrides[i];
				}
			}

			return this;
		}
	};
})();/**
 * See LICENSE file.
 *
 **/

(function() {
    /**
     * Local storage management.
     * @constructor
     */
    CAAT.modules.LocalStorage= function() {
        return this;
    };

    CAAT.modules.LocalStorage.prototype= {
        /**
         * Stores an object in local storage. The data will be saved as JSON.stringify.
         * @param key {string} key to store data under.
         * @param data {object} an object.
         * @return this
         *
         * @static
         */
        save : function( key, data ) {
            try {
                localStorage.setItem( key, JSON.stringify(data) );
            } catch(e) {
                // eat it
            }
            return this;
        },
        /**
         * Retrieve a value from local storage.
         * @param key {string} the key to retrieve.
         * @return {object} object stored under the key parameter.
         *
         * @static
         */
        load : function( key ) {
            try {
                return JSON.parse(localStorage.getItem( key ));
            } catch(e) {
                return null;
            }
        },
        /**
         * Removes a value stored in local storage.
         * @param key {string}
         * @return this
         *
         * @static
         */
        remove : function( key ) {
            try {
                localStorage.removeItem(key);
            } catch(e) {
                // eat it
            }
            return this;
        }
    };

})();
/**
 * See LICENSE file.
 */

(function() {

    CAAT.modules.ImageUtil= {};

    CAAT.modules.ImageUtil.createAlphaSpriteSheet= function(maxAlpha, minAlpha, sheetSize, image, bg_fill_style ) {

        if ( maxAlpha<minAlpha ) {
            var t= maxAlpha;
            maxAlpha= minAlpha;
            minAlpha= t;
        }

        var canvas= document.createElement('canvas');
        canvas.width= image.width;
        canvas.height= image.height*sheetSize;
        var ctx= canvas.getContext('2d');
        ctx.fillStyle = bg_fill_style ? bg_fill_style : 'rgba(255,255,255,0)';
        ctx.fillRect(0,0,image.width,image.height*sheetSize);

        var i;
        for( i=0; i<sheetSize; i++ ) {
            ctx.globalAlpha= 1-(maxAlpha-minAlpha)/sheetSize*(i+1);
            ctx.drawImage(image, 0, i*image.height);
        }

        return canvas;
    };

        /**
         * Creates a rotated canvas image element.
         * @param img
         */
    CAAT.modules.ImageUtil.rotate= function( image, angle ) {

        angle= angle||0;
        if ( !angle ) {
            return image;
        }

        var canvas= document.createElement("canvas");
        canvas.width= image.height;
        canvas.height= image.width;
        var ctx= canvas.getContext('2d');
        ctx.globalAlpha= 1;
        ctx.fillStyle='rgba(0,0,0,0)';
        ctx.clearRect(0,0,canvas.width,canvas.height);

        var m= new CAAT.Matrix();
        m.multiply( new CAAT.Matrix().setTranslate( canvas.width/2, canvas.width/2 ) );
        m.multiply( new CAAT.Matrix().setRotation( angle*Math.PI/180 ) );
        m.multiply( new CAAT.Matrix().setTranslate( -canvas.width/2, -canvas.width/2 ) );
        m.transformRenderingContext(ctx);
        ctx.drawImage(image,0,0);

        return canvas;
    };

        /**
         * Remove an image's padding transparent border.
         * Transparent means that every scan pixel is alpha=0.
         * @param image
         * @param threshold {integer} any value below or equal to this will be optimized.
         * @param !areas { object{ top<boolean>, bottom<boolean>, left<boolean, right<boolean> }�}
         */
    CAAT.modules.ImageUtil.optimize= function(image, threshold, areas ) {
        threshold>>=0;

        var atop=       true;
        var abottom=    true;
        var aleft=      true;
        var aright=     true;
        if ( typeof areas!=='undefined' ) {
            if ( typeof areas.top!=='undefined' ) {
                atop= areas.top;
            }
            if ( typeof areas.bottom!=='undefined' ) {
                abottom= areas.bottom;
            }
            if ( typeof areas.left!=='undefined' ) {
                aleft= areas.left;
            }
            if ( typeof areas.right!=='undefined' ) {
                aright= areas.right;
            }
        }


        var canvas= document.createElement('canvas');
        canvas.width= image.width;
        canvas.height=image.height;
        var ctx= canvas.getContext('2d');

        ctx.fillStyle='rgba(0,0,0,0)';
        ctx.fillRect(0,0,image.width,image.height);
        ctx.drawImage( image, 0, 0 );

        var imageData= ctx.getImageData(0,0,image.width,image.height);
        var data= imageData.data;

        var i,j;
        var miny= 0, maxy=canvas.height-1;
        var minx= 0, maxx=canvas.width-1;

        var alpha= false;

        if ( atop ) {
            for( i=0; i<canvas.height; i++ ) {
                for( j=0; j<canvas.width; j++ ) {
                    if ( data[i*canvas.width*4 + 3+j*4]>threshold ) {
                        alpha= true;
                        break;
                    }
                }

                if ( alpha ) {
                    break;
                }
            }
            // i contiene el indice del ultimo scan que no es transparente total.
            miny= i;
        }

        if ( abottom ) {
            alpha= false;
            for( i=canvas.height-1; i>=miny; i-- ) {
                for( j=0; j<canvas.width; j++ ) {
                    if ( data[i*canvas.width*4 + 3+j*4]>threshold ) {
                        alpha= true;
                        break;
                    }
                }

                if ( alpha ) {
                    break;
                }
            }
            maxy= i;
        }

        if ( aleft ) {
            alpha= false;
            for( j=0; j<canvas.width; j++ ) {
                for( i=miny; i<=maxy; i++ ) {
                    if ( data[i*canvas.width*4 + 3+j*4 ]>threshold ) {
                        alpha= true;
                        break;
                    }
                }
                if ( alpha ) {
                    break;
                }
            }
            minx= j;
        }

        if ( aright ) {
            alpha= false;
            for( j=canvas.width-1; j>=minx; j-- ) {
                for( i=miny; i<=maxy; i++ ) {
                    if ( data[i*canvas.width*4 + 3+j*4 ]>threshold ) {
                        alpha= true;
                        break;
                    }
                }
                if ( alpha ) {
                    break;
                }
            }
            maxx= j;
        }

        if ( 0===minx && 0===miny && canvas.width-1===maxx && canvas.height-1===maxy ) {
            return canvas;
        }

        var width= maxx-minx+1;
        var height=maxy-miny+1;
        var id2= ctx.getImageData( minx, miny, width, height );

        canvas.width= width;
        canvas.height= height;
        ctx= canvas.getContext('2d');
        ctx.putImageData( id2, 0, 0 );

        return canvas;
    };

    CAAT.modules.ImageUtil.createThumb= function(image, w, h, best_fit) {
        w= w||24;
        h= h||24;
        var canvas= document.createElement('canvas');
        canvas.width= w;
        canvas.height= h;
        var ctx= canvas.getContext('2d');

        if ( best_fit ) {
            var max= Math.max( image.width, image.height );
            var ww= image.width/max*w;
            var hh= image.height/max*h;
            ctx.drawImage( image, (w-ww)/2,(h-hh)/2,ww,hh );
        } else {
            ctx.drawImage( image, 0, 0, w, h );
        }

        return canvas;
    }

})();/**
 * See LICENSE file.
 */

(function() {
    CAAT.modules.LayoutUtils= {};

    CAAT.modules.LayoutUtils.row= function( dst, what_to_layout_array, constraint_object ) {

        var width= dst.width;
        var x=0, y=0, i=0, l=0;
        var actor_max_h= -Number.MAX_VALUE, actor_max_w= Number.MAX_VALUE;

        // compute max/min actor list size.
        for( i=what_to_layout_array.length-1; i; i-=1 ) {
            if ( actor_max_w<what_to_layout_array[i].width ) {
                actor_max_w= what_to_layout_array[i].width;
            }
            if ( actor_max_h<what_to_layout_array[i].height ) {
                actor_max_h= what_to_layout_array[i].height;
            }
        }

        if ( constraint_object.padding_left ) {
            x= constraint_object.padding_left;
            width-= x;
        }
        if ( constraint_object.padding_right ) {
            width-= constraint_object.padding_right;
        }

        if ( constraint_object.top ) {
            var top= parseInt(constraint_object.top, 10);
            if ( !isNaN(top) ) {
                y= top;
            } else {
                // not number
                switch(constraint_object.top) {
                    case 'center':
                        y= (dst.height-actor_max_h)/2;
                        break;
                    case 'top':
                        y=0;
                        break;
                    case 'bottom':
                        y= dst.height-actor_max_h;
                        break;
                    default:
                        y= 0;
                }
            }
        }

        // space for each actor
        var actor_area= width / what_to_layout_array.length;

        for( i=0, l=what_to_layout_array.length; i<l; i++ ) {
            what_to_layout_array[i].setLocation(
                x + i * actor_area + (actor_area - what_to_layout_array[i].width) / 2,
                y);
        }

    };
})();
(function() {

    /**
     * @constructor
     */
    CAAT.Font= function( ) {
        return this;
    };

    var UNKNOWN_CHAR_WIDTH= 10;

    CAAT.Font.prototype= {

        fontSize    :   10,
        fontSizeUnit:   "px",
        font        :   'Sans-Serif',
        fontStyle   :   '',
        fillStyle   :   '#fff',
        strokeStyle :   null,
        padding     :   0,
        image       :   null,
        charMap     :   null,

        height      :   0,

        setPadding : function( padding ) {
            this.padding= padding;
            return this;
        },

        setFontStyle : function( style ) {
            this.fontStyle= style;
            return this;
        },

        setFontSize : function( fontSize ) {
            this.fontSize=      fontSize;
            this.fontSizeUnit=  'px';
            return this;
        },

        setFont : function( font ) {
            this.font= font;
            return this;
        },

        setFillStyle : function( style ) {
            this.fillStyle= style;
            return this;
        },

        setStrokeStyle : function( style ) {
            this.strokeStyle= style;
            return this;
        },

        createDefault : function( padding ) {
            var str="";
            for( var i=32; i<128; i++ ) {
                str= str+String.fromCharCode(i);
            }

            return this.create( str, padding );
        },

        create : function( chars, padding ) {

            this.padding= padding;

            var canvas= document.createElement('canvas');
            canvas.width=   1;
            canvas.height=  1;
            var ctx= canvas.getContext('2d');

            ctx.textBaseline= 'top';
            ctx.font= this.fontStyle+' '+this.fontSize+""+this.fontSizeUnit+" "+ this.font;

            var textWidth= 0;
            var charWidth= [];
            var i;
            var x;
            var cchar;

            for( i=0; i<chars.length; i++ ) {
                var cw= Math.max( 1, (ctx.measureText( chars.charAt(i) ).width>>0)+1 ) + 2 * padding ;

               // var cw= Math.max( 1, (ctx.measureText( chars.charAt(i) ).width>>0)+1 ) + 2 * padding ;
               var cw= Math.max( 1, (ctx.measureText( chars.charAt(i) ).width>>0)+1 );

                charWidth.push(cw);
                textWidth+= cw + 2 * padding;
            }

            canvas.width= textWidth;
            canvas.height= (this.fontSize*1.5)>>0;
            ctx= canvas.getContext('2d');

            ctx.textBaseline= 'top';
            ctx.font= this.fontStyle+' '+this.fontSize+""+this.fontSizeUnit+" "+ this.font;
            ctx.fillStyle= this.fillStyle;
            ctx.strokeStyle= this.strokeStyle;

            this.charMap= {};

            x=padding; // x=0
            for( i=0; i<chars.length; i++ ) {
                cchar= chars.charAt(i);
                ctx.fillText( cchar, x, 0 ); // x + padding
                if ( this.strokeStyle ) {
                    ctx.beginPath();
                    ctx.strokeText( cchar, x,  0 ); // x + padding
                }
                this.charMap[cchar]= {
                    x:      x,
                    width:  charWidth[i]
                };
                 x+= charWidth[i]  + 2 * padding; // next position
            }

            this.image= CAAT.modules.ImageUtil.optimize( canvas, 32, { top: true, bottom: true, left: false, right: false } );
            this.height= this.image.height;

            return this;
        },

        stringWidth : function( str ) {
            var i, l,  w=0, c;

            for( i=0, l=str.length; i<l; i++ ) {
                c= this.charMap[ str.charAt(i) ];
                if ( c ) {
                    w+= c.width;
                } else {
                    w+= UNKNOWN_CHAR_WIDTH;
                }
            }

            return w;
        },

        drawText : function( str, ctx, x, y ) {
            var i,l,charInfo,w;
            var height= this.image.height;

            for( i=0, l=str.length; i<l; i++ ) {
                charInfo= this.charMap[ str.charAt(i) ];
                if ( charInfo ) {
                    w= charInfo.width;
                    ctx.drawImage(
                        this.image,
                        charInfo.x, 0,
                        w, height,
                        x, y,
                        w, height);

                    x+= w;
                } else {
                    ctx.strokeStyle='#f00';
                    ctx.strokeRect( x,y,UNKNOWN_CHAR_WIDTH,height );
                    x+= UNKNOWN_CHAR_WIDTH;
                }
            }
        },


	// Temporary hack, best solution should be to reconciliate drawing API
	drawString : function( ctx, str, x, y ) {
        	this.drawText(str, ctx, x,y);
	},

        save : function() {
            var str= "image/png";
            var strData= this.image.toDataURL(str);
            document.location.href= strData.replace( str, "image/octet-stream" );
        }

    };

})();

/**
 * See LICENSE file.
 *
 * Interpolator actor will draw interpolators on screen.
 *
 **/
(function() {
    /**
     * This actor class draws an interpolator function by caching an interpolator contour as a polyline.
     *
     * @constructor
     * @extends CAAT.ActorContainer
     */
    CAAT.InterpolatorActor = function() {
        CAAT.InterpolatorActor.superclass.constructor.call(this);
        return this;
    };

    CAAT.InterpolatorActor.prototype= {
        interpolator:   null,   // CAAT.Interpolator instance.
        contour:        null,   // interpolator contour cache
        S:              50,     // contour samples.
        gap:            5,      // border size in pixels.

        /**
         * Sets a padding border size. By default is 5 pixels.
         * @param gap {number} border size in pixels.
         * @return this
         */
        setGap : function( gap ) {
            this.gap= gap;
            return this;
        },
        /**
         * Sets the CAAT.Interpolator instance to draw.
         *
         * @param interpolator a CAAT.Interpolator instance.
         * @param size an integer indicating the number of polyline segments so draw to show the CAAT.Interpolator
         * instance.
         *
         * @return this
         */
        setInterpolator : function( interpolator, size ) {
            this.interpolator= interpolator;
            this.contour= interpolator.getContour(size || this.S);

            return this;
        },
        /**
         * Paint this actor.
         * @param director {CAAT.Director}
         * @param time {number} scene time.
         */
        paint : function( director, time ) {

            CAAT.InterpolatorActor.superclass.paint.call(this,director,time);

            if ( this.backgroundImage ) {
                return this;
            }

            if ( this.interpolator ) {

                var canvas= director.crc;

                var xs= (this.width-2*this.gap);
                var ys= (this.height-2*this.gap);

                canvas.beginPath();
                canvas.moveTo(
                        this.gap +  xs*this.contour[0].x,
                        -this.gap + this.height - ys*this.contour[0].y);

                for( var i=1; i<this.contour.length; i++ ) {
                    canvas.lineTo(
                             this.gap + xs*this.contour[i].x,
                            -this.gap + this.height - ys*this.contour[i].y);
                }

                canvas.strokeStyle= this.strokeStyle;
                canvas.stroke();
            }
        },
        /**
         * Return the represented interpolator.
         * @return {CAAT.Interpolator}
         */
        getInterpolator : function() {
            return this.interpolator;
        }
    };

    extend( CAAT.InterpolatorActor, CAAT.ActorContainer, null);
})();/**
 * See LICENSE file.
 *
 * These classes encapsulate different kinds of paths.
 * LinearPath, defines an straight line path, just 2 points.
 * CurvePath, defines a path based on a Curve. Curves can be bezier quadric/cubic and catmull-rom.
 * Path, is a general purpose class, which composes a path of different path segments (Linear or Curve paths).
 *
 * A path, has an interpolator which stablishes the way the path is traversed (accelerating, by
 * easing functions, etc.). Normally, interpolators will be defined by CAAT,Interpolator instances, but
 * general Paths could be used as well.
 *
 **/

(function() {
    /**
     * This is the abstract class that every path segment must conform to.
     * <p>
     * It is implemented by all path segment types, ie:
     * <ul>
     *  <li>LinearPath
     *  <li>CurvePath, base for all curves: quadric and cubic bezier.
     *  <li>Path. A path built of different PathSegment implementations.
     * </ul>
     *
     * @constructor
     */
    CAAT.PathSegment = function() {
        this.bbox= new CAAT.Rectangle();
        return this;
    };

    CAAT.PathSegment.prototype =  {
        color:  '#000',
        length: 0,
        bbox:   null,
        parent: null,

        /**
         * Set a PathSegment's parent
         * @param parent
         */
        setParent : function(parent) {
            this.parent= parent;
            return this;
        },
        setColor : function(color) {
            if ( color ) {
                this.color= color;
            }
            return this;
        },
        /**
         * Get path's last coordinate.
         * @return {CAAT.Point}
         */
		endCurvePosition : function() { },

        /**
         * Get path's starting coordinate.
         * @return {CAAT.Point}
         */
		startCurvePosition : function() { },

        /**
         * Set this path segment's points information.
         * @param points {Array<CAAT.Point>}
         */
        setPoints : function( points ) { },

        /**
         * Set a point from this path segment.
         * @param point {CAAT.Point}
         * @param index {integer} a point index.
         */
        setPoint : function( point, index ) { },

        /**
         * Get a coordinate on path.
         * The parameter time is normalized, that is, its values range from zero to one.
         * zero will mean <code>startCurvePosition</code> and one will be <code>endCurvePosition</code>. Other values
         * will be a position on the path relative to the path length. if the value is greater that 1, if will be set
         * to modulus 1.
         * @param time a float with a value between zero and 1 inclusive both.
         *
         * @return {CAAT.Point}
         */
        getPosition : function(time) { },

        /**
         * Gets Path length.
         * @return {number}
         */
        getLength : function() {
            return this.length;
        },

        /**
         * Gets the path bounding box (or the rectangle that contains the whole path).
         * @param rectangle a CAAT.Rectangle instance with the bounding box.
         * @return {CAAT.Rectangle}
         */
		getBoundingBox : function() {
            return this.bbox;
        },

        /**
         * Gets the number of control points needed to create the path.
         * Each PathSegment type can have different control points.
         * @return {number} an integer with the number of control points.
         */
		numControlPoints : function() { },

        /**
         * Gets CAAT.Point instance with the 2d position of a control point.
         * @param index an integer indicating the desired control point coordinate.
         * @return {CAAT.Point}
         */
		getControlPoint: function(index) { },

        /**
         * Instruments the path has finished building, and that no more segments will be added to it.
         * You could later add more PathSegments and <code>endPath</code> must be called again.
         */
        endPath : function() {},

        /**
         * Gets a polyline describing the path contour. The contour will be defined by as mush as iSize segments.
         * @param iSize an integer indicating the number of segments of the contour polyline.
         *
         * @return {[CAAT.Point]}
         */
        getContour : function(iSize) {},

        /**
         * Recalculate internal path structures.
         */
        updatePath : function(point) {},

        /**
         * Draw this path using RenderingContext2D drawing primitives.
         * The intention is to set a path or pathsegment as a clipping region.
         *
         * @param ctx {RenderingContext2D}
         */
        applyAsPath : function(director) {},

        /**
         * Transform this path with the given affinetransform matrix.
         * @param matrix
         */
        transform : function(matrix) {},

        drawHandle : function( ctx, x, y ) {
            var w= CAAT.Curve.prototype.HANDLE_SIZE/2;
            ctx.fillRect( x-w, y-w, w*2, w*2 );
            /*
            ctx.arc(
                this.points[0].x,
                this.points[0].y,
                CAAT.Curve.prototype.HANDLE_SIZE/2,
                0,
                2*Math.PI,
                false) ;
                            */
        }
    };

})();

(function() {

    /**
     * Straight line segment path between two given points.
     *
     * @constructor
     * @extends CAAT.PathSegment
     */
	CAAT.LinearPath = function() {
        CAAT.LinearPath.superclass.constructor.call(this);

        this.points= [];
        this.points.push( new CAAT.Point() );
        this.points.push( new CAAT.Point() );

		this.newPosition=       new CAAT.Point(0,0,0);
		return this;
	};
	
	CAAT.LinearPath.prototype= {
        points:             null,
		newPosition:		null,   // spare holder for getPosition coordinate return.

        applyAsPath : function(director) {
            director.ctx.lineTo( this.points[0].x, this.points[1].y );
        },
        setPoint : function( point, index ) {
            if ( index===0 ) {
                this.points[0]= point;
            } else if ( index===1 ) {
                this.points[1]= point;
            }
        },
        /**
         * Update this segments length and bounding box info.
         */
        updatePath : function(point) {
            var x= this.points[1].x - this.points[0].x;
			var y= this.points[1].y - this.points[0].y;
			this.length= Math.sqrt( x*x+y*y );

            this.bbox.setEmpty();
			this.bbox.union( this.points[0].x, this.points[0].y );
			this.bbox.union( this.points[1].x, this.points[1].y );

            return this;
        },
        setPoints : function( points ) {
            this.points[0]= points[0];
            this.points[1]= points[1];
            this.updatePath();
            return this;
        },
        /**
         * Set this path segment's starting position.
         * @param x {number}
         * @param y {number}
         */
		setInitialPosition : function( x, y )	{
			this.points[0].x= x;
			this.points[0].y= y;
			this.newPosition.set(x,y);
            return this;
		},
        /**
         * Set this path segment's ending position.
         * @param finalX {number}
         * @param finalY {number}
         */
		setFinalPosition : function( finalX, finalY )	{
			this.points[1].x= finalX;
			this.points[1].y= finalY;
            return this;
		},
        /**
         * @inheritDoc
         */
        endCurvePosition : function() {
			return this.points[1];
		},
        /**
         * @inheritsDoc
         */
		startCurvePosition : function() {
			return this.points[0];
		},
        /**
         * @inheritsDoc
         */
		getPosition : function(time) {

            if ( time>1 || time<0 ) {
                time%=1;
            }
            if ( time<0 ) {
                time= 1+time;
            }

            this.newPosition.set(
						(this.points[0].x+(this.points[1].x-this.points[0].x)*time),
						(this.points[0].y+(this.points[1].y-this.points[0].y)*time) );

			return this.newPosition;
		},
        getPositionFromLength : function( len ) {
            return this.getPosition( len/this.length );
        },
        /**
         * Returns initial path segment point's x coordinate.
         * @return {number}
         */
		initialPositionX : function() {
			return this.points[0].x;
		},
        /**
         * Returns final path segment point's x coordinate.
         * @return {number}
         */
		finalPositionX : function() {
			return this.points[1].x;
		},
        /**
         * Draws this path segment on screen. Optionally it can draw handles for every control point, in
         * this case, start and ending path segment points.
         * @param director {CAAT.Director}
         * @param bDrawHandles {boolean}
         */
		paint : function(director, bDrawHandles) {
			
			var ctx= director.ctx;

            ctx.save();

            ctx.strokeStyle= this.color;
			ctx.beginPath();
			ctx.moveTo( this.points[0].x, this.points[0].y );
			ctx.lineTo( this.points[1].x, this.points[1].y );
			ctx.stroke();

            if ( bDrawHandles ) {
                ctx.globalAlpha=0.5;
                ctx.fillStyle='#7f7f00';
                ctx.beginPath();
                this.drawHandle( ctx, this.points[0].x, this.points[0].y );
                this.drawHandle( ctx, this.points[1].x, this.points[1].y );
                /*
                canvas.arc(
                        this.points[0].x,
                        this.points[0].y,
                        CAAT.Curve.prototype.HANDLE_SIZE/2,
                        0,
                        2*Math.PI,
                        false) ;
                canvas.arc(
                        this.points[1].x,
                        this.points[1].y,
                        CAAT.Curve.prototype.HANDLE_SIZE/2,
                        0,
                        2*Math.PI,
                        false) ;
                canvas.fill();
                */
            }

            ctx.restore();
		},
        /**
         * Get the number of control points. For this type of path segment, start and
         * ending path segment points. Defaults to 2.
         * @return {number}
         */
		numControlPoints : function() {
			return 2;
		},
        /**
         * @inheritsDoc
         */
		getControlPoint: function(index) {
			if ( 0===index ) {
				return this.points[0];
			} else if (1===index) {
				return this.points[1];
			}
		},
        /**
         * @inheritsDoc
         */
        getContour : function(iSize) {
            var contour= [];

            contour.push( this.getPosition(0).clone() );
            contour.push( this.getPosition(1).clone() );

            return contour;
        }
	};

    extend( CAAT.LinearPath, CAAT.PathSegment );
})();

(function() {
    /**
     * This class defines a Bezier cubic or quadric path segment.
     *
     * @constructor
     * @extends CAAT.PathSegment
     */
	CAAT.CurvePath = function() {
        CAAT.CurvePath.superclass.constructor.call(this);
		this.newPosition= new CAAT.Point(0,0,0);
		return this;
	};
	
	CAAT.CurvePath.prototype= {
		curve:	            null,   // a CAAT.Bezier instance.
		newPosition:		null,   // spare holder for getPosition coordinate return.

        applyAsPath : function(director) {
            this.curve.applyAsPath(director);
            return this;
        },
        setPoint : function( point, index ) {
            if ( this.curve ) {
                this.curve.setPoint(point,index);
            }
        },
        /**
         * Set this curve segment's points.
         * @param points {Array<CAAT.Point>}
         */
        setPoints : function( points ) {
            var curve = new CAAT.Bezier();
            curve.setPoints(points);
            this.curve = curve;
            return this;
        },
        /**
         * Set the pathSegment as a CAAT.Bezier quadric instance.
         * Parameters are quadric coordinates control points.
         *
         * @param p0x {number}
         * @param p0y {number}
         * @param p1x {number}
         * @param p1y {number}
         * @param p2x {number}
         * @param p2y {number}
         * @return this
         */
        setQuadric : function(p0x,p0y, p1x,p1y, p2x,p2y) {
	        var curve = new CAAT.Bezier();
	        curve.setQuadric(p0x,p0y, p1x,p1y, p2x,p2y);
	        this.curve = curve;
            this.updatePath();

            return this;
        },
        /**
         * Set the pathSegment as a CAAT.Bezier cubic instance.
         * Parameters are cubic coordinates control points.
         * @param p0x {number}
         * @param p0y {number}
         * @param p1x {number}
         * @param p1y {number}
         * @param p2x {number}
         * @param p2y {number}
         * @param p3x {number}
         * @param p3y {number}
         * @return this
         */
        setCubic : function(p0x,p0y, p1x,p1y, p2x,p2y, p3x,p3y) {
	        var curve = new CAAT.Bezier();
	        curve.setCubic(p0x,p0y, p1x,p1y, p2x,p2y, p3x,p3y);
	        this.curve = curve;
            this.updatePath();

            return this;
        },
        /**
         * @inheritDoc
         */
		updatePath : function(point) {
			this.curve.update();
            this.length= this.curve.getLength();
            this.curve.getBoundingBox(this.bbox);
            return this;
		},
        /**
         * @inheritDoc
         */
		getPosition : function(time) {

            if ( time>1 || time<0 ) {
                time%=1;
            }
            if ( time<0 ) {
                time= 1+time;
            }

            this.curve.solve(this.newPosition, time);

			return this.newPosition;
		},
        /**
         * Gets the coordinate on the path relative to the path length.
         * @param iLength {number} the length at which the coordinate will be taken from.
         * @return {CAAT.Point} a CAAT.Point instance with the coordinate on the path corresponding to the
         * iLenght parameter relative to segment's length.
         */
		getPositionFromLength : function(iLength) {
			this.curve.solve( this.newPosition, iLength/this.length );
			return this.newPosition;
		},
        /**
         * Get path segment's first point's x coordinate.
         * @return {number}
         */
		initialPositionX : function() {
			return this.curve.coordlist[0].x;
		},
        /**
         * Get path segment's last point's y coordinate.
         * @return {number}
         */
		finalPositionX : function() {
			return this.curve.coordlist[this.curve.coordlist.length-1].x;
		},
        /**
         * @inheritDoc
         * @param director {CAAT.Director}
         * @param bDrawHandles {boolean}
         */
		paint : function( director,bDrawHandles ) {
            this.curve.drawHandles= bDrawHandles;
            director.ctx.strokeStyle= this.color;
			this.curve.paint(director,bDrawHandles);
		},
        /**
         * @inheritDoc
         */
		numControlPoints : function() {
			return this.curve.coordlist.length;
		},
        /**
         * @inheritDoc
         * @param index
         */
		getControlPoint : function(index) {
			return this.curve.coordlist[index];
		},
        /**
         * @inheritDoc
         */
		endCurvePosition : function() {
			return this.curve.endCurvePosition();
		},
        /**
         * @inheritDoc
         */
		startCurvePosition : function() {
			return this.curve.startCurvePosition();
		},
        /**
         * @inheritDoc
         * @param iSize
         */
        getContour : function(iSize) {
            var contour=[];
            for( var i=0; i<=iSize; i++ ) {
                contour.push( {x: i/iSize, y: this.getPosition(i/iSize).y} );
            }

            return contour;
        }
	};

    extend( CAAT.CurvePath, CAAT.PathSegment, null);
	
})();

(function() {

    CAAT.ShapePath= function() {
        CAAT.ShapePath.superclass.constructor.call(this);

        this.points= [];
        this.points.push( new CAAT.Point() );
        this.points.push( new CAAT.Point() );
        this.points.push( new CAAT.Point() );
        this.points.push( new CAAT.Point() );
        this.points.push( new CAAT.Point() );

        this.newPosition= new CAAT.Point();

		return this;
    };

    CAAT.ShapePath.prototype= {
        points:             null,
        length:             -1,
        cw:                 true,   // should be clock wise traversed ?
        bbox:               null,
        newPosition:        null,   // spare point for calculations

        applyAsPath : function(director) {
            var ctx= director.ctx;
            //ctx.rect( this.bbox.x, this.bbox.y, this.bbox.width, this.bbox.height );
            if ( this.cw ) {
                ctx.lineTo( this.points[0].x, this.points[0].y );
                ctx.lineTo( this.points[1].x, this.points[1].y );
                ctx.lineTo( this.points[2].x, this.points[2].y );
                ctx.lineTo( this.points[3].x, this.points[3].y );
                ctx.lineTo( this.points[4].x, this.points[4].y );
            } else {
                ctx.lineTo( this.points[4].x, this.points[4].y );
                ctx.lineTo( this.points[3].x, this.points[3].y );
                ctx.lineTo( this.points[2].x, this.points[2].y );
                ctx.lineTo( this.points[1].x, this.points[1].y );
                ctx.lineTo( this.points[0].x, this.points[0].y );
            }
            return this;
        },
        setPoint : function( point, index ) {
            if ( index>=0 && index<this.points.length ) {
                this.points[index]= point;
            }
        },
        /**
         * An array of {CAAT.Point} composed of two points.
         * @param points {Array<CAAT.Point>}
         */
        setPoints : function( points ) {
            this.points= [];
            this.points.push( points[0] );
            this.points.push( new CAAT.Point().set(points[1].x, points[0].y) );
            this.points.push( points[1] );
            this.points.push( new CAAT.Point().set(points[0].x, points[1].y) );
            this.points.push( points[0].clone() );
            this.updatePath();

            return this;
        },
        setClockWise : function(cw) {
            this.cw= cw!==undefined ? cw : true;
            return this;
        },
        isClockWise : function() {
            return this.cw;
        },
        /**
         * Set this path segment's starting position.
         * This method should not be called again after setFinalPosition has been called.
         * @param x {number}
         * @param y {number}
         */
		setInitialPosition : function( x, y )	{
            for( var i=0, l= this.points.length; i<l; i++ ) {
			    this.points[i].x= x;
			    this.points[i].y= y;
            }
            return this;
		},
        /**
         * Set a rectangle from points[0] to (finalX, finalY)
         * @param finalX {number}
         * @param finalY {number}
         */
		setFinalPosition : function( finalX, finalY )	{
			this.points[2].x= finalX;
            this.points[2].y= finalY;

            this.points[1].x= finalX;
            this.points[1].y= this.points[0].y;

            this.points[3].x= this.points[0].x;
            this.points[3].y= finalY;

            this.points[4].x= this.points[0].x;
            this.points[4].y= this.points[0].y;

            this.updatePath();
            return this;
		},
        /**
         * @inheritDoc
         */
        endCurvePosition : function() {
			return this.points[4];
		},
        /**
         * @inheritsDoc
         */
		startCurvePosition : function() {
			return this.points[0];
		},
        /**
         * @inheritsDoc
         */
		getPosition : function(time) {

            if ( time>1 || time<0 ) {
                time%=1;
            }
            if ( time<0 ) {
                time= 1+time;
            }

            if ( -1===this.length ) {
                this.newPosition.set(0,0);
            } else {
                var w= this.bbox.width / this.length;
                var h= this.bbox.height / this.length;
                var accTime= 0;
                var times;
                var segments;
                var index= 0;

                if ( this.cw ) {
                    segments= [0,1,2,3,4];
                    times= [w,h,w,h];
                } else {
                    segments= [4,3,2,1,0];
                    times= [h,w,h,w];
                }

                while( index<times.length ) {
                    if ( accTime+times[index]<time ) {
                        accTime+= times[index];
                        index++;
                    } else {
                        break;
                    }
                }
                time-=accTime;

                var p0= segments[index];
                var p1= segments[index+1];

                // index tiene el indice del segmento en tiempo.
                this.newPosition.set(
                        (this.points[p0].x + (this.points[p1].x - this.points[p0].x)*time/times[index]),
                        (this.points[p0].y + (this.points[p1].y - this.points[p0].y)*time/times[index]) );
            }

			return this.newPosition;
		},
        /**
         * Returns initial path segment point's x coordinate.
         * @return {number}
         */
		initialPositionX : function() {
			return this.points[0].x;
		},
        /**
         * Returns final path segment point's x coordinate.
         * @return {number}
         */
		finalPositionX : function() {
			return this.points[2].x;
		},
        /**
         * Draws this path segment on screen. Optionally it can draw handles for every control point, in
         * this case, start and ending path segment points.
         * @param director {CAAT.Director}
         * @param bDrawHandles {boolean}
         */
		paint : function(director, bDrawHandles) {

			var ctx= director.ctx;

            ctx.save();

            ctx.strokeStyle= this.color;
			ctx.beginPath();
			ctx.strokeRect(
                this.bbox.x, this.bbox.y,
                this.bbox.width, this.bbox.height );

            if ( bDrawHandles ) {
                ctx.globalAlpha=0.5;
                ctx.fillStyle='#7f7f00';

                for( var i=0; i<this.points.length; i++ ) {
                    this.drawHandle( ctx, this.points[i].x, this.points[i].y );
                    /*
                    canvas.beginPath();
                    canvas.arc(
                            this.points[i].x,
                            this.points[i].y,
                            CAAT.Curve.prototype.HANDLE_SIZE/2,
                            0,
                            2*Math.PI,
                            false) ;
                    canvas.fill();
                    */
                }

            }

            ctx.restore();
		},
        /**
         * Get the number of control points. For this type of path segment, start and
         * ending path segment points. Defaults to 2.
         * @return {number}
         */
		numControlPoints : function() {
			return this.points.length;
		},
        /**
         * @inheritsDoc
         */
		getControlPoint: function(index) {
            return this.points[index];
		},
        /**
         * @inheritsDoc
         */
        getContour : function(iSize) {
            var contour= [];

            for( var i=0; i<this.points.length; i++ ) {
                contour.push( this.points[i] );
            }

            return contour;
        },
        updatePath : function(point) {

            if ( point ) {
                if ( point===this.points[0] ) {
                    this.points[1].y= point.y;
                    this.points[3].x= point.x;
                } else if ( point===this.points[1] ) {
                    this.points[0].y= point.y;
                    this.points[2].x= point.x;
                } else if ( point===this.points[2] ) {
                    this.points[3].y= point.y;
                    this.points[1].x= point.x;
                } else if ( point===this.points[3] ) {
                    this.points[0].x= point.x;
                    this.points[2].y= point.y;
                }
                this.points[4].x= this.points[0].x;
                this.points[4].y= this.points[0].y;
            }

            this.bbox.setEmpty();
            var minx= Number.MAX_VALUE, miny= Number.MAX_VALUE, maxx= -Number.MAX_VALUE, maxy= -Number.MAX_VALUE;
            for( var i=0; i<4; i++ ) {
                this.bbox.union( this.points[i].x, this.points[i].y );
            }

            this.length= 2*this.bbox.width + 2*this.bbox.height;

            this.points[0].x= this.bbox.x;
            this.points[0].y= this.bbox.y;

            this.points[1].x= this.bbox.x+this.bbox.width;
            this.points[1].y= this.bbox.y;

            this.points[2].x= this.bbox.x + this.bbox.width;
            this.points[2].y= this.bbox.y + this.bbox.height;

            this.points[3].x= this.bbox.x;
            this.points[3].y= this.bbox.y + this.bbox.height;

            this.points[4].x= this.bbox.x;
            this.points[4].y= this.bbox.y;

            return this;
        }
    }

    extend( CAAT.ShapePath, CAAT.PathSegment );

})();

(function() {

    /**
     * This class the top most abstraction of path related classes in CAAT. It defines a path composes un
     * an unlimited number of path segments including CAAT.Path instances.
     * <p>
     * Every operation of the CAAT.PathSegment interface is performed for every path segment. In example,
     * the method <code>getLength</code> will contain the sum of every path segment's length.
     * <p>
     * An example of CAAT.Path will be as follows:

     * <code>
     * path.beginPath(x,y).<br>
     * &nbsp;&nbsp;addLineTo(x1,y1).<br>
     * &nbsp;&nbsp;addLineTo(x2,y2).<br>
     * &nbsp;&nbsp;addQuadricTo(...).<br>
     * &nbsp;&nbsp;addCubicTo(...).<br>
     * &nbsp;&nbsp;endPath();<br>
     * </code>
     * <p>
     * This code creates a path composed of four chained segments, starting at (x,y) and having each
     * segment starting where the previous one ended.
     * <p>
     * This class is intended to wrap the other kind of path segment classes when just a one segmented
     * path is to be defined. The methods <code>setLinear, setCubic and setQuadrid</code> will make
     * a CAAT.Path instance to be defined by just one segment.
     *
     * @constructor
     * @extends CAAT.PathSegment
     */
	CAAT.Path= function()	{
        CAAT.Path.superclass.constructor.call(this);

		this.newPosition=   new CAAT.Point(0,0,0);
		this.pathSegments=  [];

        this.behaviorList=  [];
        this.matrix=        new CAAT.Matrix();
        this.tmpMatrix=     new CAAT.Matrix();
        
		return this;
	};
	
	CAAT.Path.prototype= {
			
		pathSegments:	            null,   // a collection of CAAT.PathSegment instances.
		pathSegmentDurationTime:	null,   // precomputed segment duration relative to segment legnth/path length
		pathSegmentStartTime:		null,   // precomputed segment start time relative to segment legnth/path length and duration.

		newPosition:	            null,   // spare CAAT.Point.
		
		pathLength:		            -1,     // path length (sum of every segment length)

        /*
            starting path position
         */
		beginPathX:		            -1,
		beginPathY:                 -1,

        /*
            last path coordinates position (using when building the path).
         */
		trackPathX:		            -1,
		trackPathY:		            -1,

        /*
            needed to drag control points.
          */
		ax:                         -1,
		ay:                         -1,
		point:                      [],

        interactive:                true,

        behaviorList:               null,

        /** rotation behavior info **/
        rb_angle:                   0,
        rb_rotateAnchorX:           .5,
        rb_rotateAnchorY:           .5,

        /** scale behavior info **/
        sb_scaleX:                  1,
        sb_scaleY:                  1,
        sb_scaleAnchorX:            .5,
        sb_scaleAnchorY:            .5,

        tAnchorX:                   0,
        tAnchorY:                   0,

        /** translate behavior info **/
        tb_x:                       0,
        tb_y:                       0,

        /** behavior affine transformation matrix **/
        matrix:                     null,
        tmpMatrix:                  null,

        /** if behaviors are to be applied, save original path points **/
        pathPoints:                 null,

        /** path width and height **/
        width:                      0,
        height:                     0,

        clipOffsetX             :   0,
        clipOffsetY             :   0,

        applyAsPath : function(director) {
            var ctx= director.ctx;

            director.modelViewMatrix.transformRenderingContext( ctx );
            ctx.beginPath();
            ctx.globalCompositeOperation= 'source-out';
            ctx.moveTo(
                this.getFirstPathSegment().startCurvePosition().x,
                this.getFirstPathSegment().startCurvePosition().y
            );
            for( var i=0; i<this.pathSegments.length; i++ ) {
                this.pathSegments[i].applyAsPath(director);
            }
            ctx.globalCompositeOperation= 'source-over';
            return this;
        },
        /**
         * Set whether this path should paint handles for every control point.
         * @param interactive {boolean}.
         */
        setInteractive : function(interactive) {
            this.interactive= interactive;
            return this;
        },
        getFirstPathSegment : function() {
            return this.pathSegments.length ?
                this.pathSegments[0] :
                null;
        },
        getLastPathSegment : function() {
            return this.pathSegments.length ?
                this.pathSegments[ this.pathSegments.length-1 ] :
                null;
        },
        /**
         * Return the last point of the last path segment of this compound path.
         * @return {CAAT.Point}
         */
        endCurvePosition : function() {
            if ( this.pathSegments.length ) {
                return this.pathSegments[ this.pathSegments.length-1 ].endCurvePosition();
            } else {
                return new CAAT.Point().set( this.beginPathX, this.beginPathY );
            }
        },
        /**
         * Return the first point of the first path segment of this compound path.
         * @return {CAAT.Point}
         */
        startCurvePosition : function() {
            return this.pathSegments[ 0 ].startCurvePosition();
        },
        /**
         * Return the last path segment added to this path.
         * @return {CAAT.PathSegment}
         */
        getCurrentPathSegment : function() {
            return this.pathSegments[ this.pathSegments.length-1 ];
        },
        /**
         * Set the path to be composed by a single LinearPath segment.
         * @param x0 {number}
         * @param y0 {number}
         * @param x1 {number}
         * @param y1 {number}
         * @return this
         */
        setLinear : function(x0,y0,x1,y1) {
            this.beginPath(x0,y0);
            this.addLineTo(x1,y1);
            this.endPath();

            return this;
        },
        /**
         * Set this path to be composed by a single Quadric Bezier path segment.
         * @param x0 {number}
         * @param y0 {number}
         * @param x1 {number}
         * @param y1 {number}
         * @param x2 {number}
         * @param y2 {number}
         * @return this
         */
        setQuadric : function(x0,y0,x1,y1,x2,y2) {
            this.beginPath(x0,y0);
            this.addQuadricTo(x1,y1,x2,y2);
            this.endPath();

            return this;
        },
        /**
         * Sets this path to be composed by a single Cubic Bezier path segment.
         * @param x0 {number}
         * @param y0 {number}
         * @param x1 {number}
         * @param y1 {number}
         * @param x2 {number}
         * @param y2 {number}
         * @param x3 {number}
         * @param y3 {number}
         *
         * @return this
         */
        setCubic : function(x0,y0,x1,y1,x2,y2,x3,y3) {
            this.beginPath(x0,y0);
            this.addCubicTo(x1,y1,x2,y2,x3,y3);
            this.endPath();

            return this;
        },
        setRectangle : function(x0,y0, x1,y1) {
            this.beginPath(x0,y0);
            this.addRectangleTo(x1,y1);
            this.endPath();

            return this;
        },
        setCatmullRom : function( points, closed ) {
            if ( closed ) {
                points = points.slice(0)
                points.unshift(points[points.length-1])
                points.push(points[1])
                points.push(points[2])
            }

            for( var i=1; i<points.length-2; i++ ) {

                var segment= new CAAT.CurvePath().setColor("#000").setParent(this);
                var cm= new CAAT.CatmullRom().setCurve(
                    points[ i-1 ],
                    points[ i ],
                    points[ i+1 ],
                    points[ i+2 ]
                );
                segment.curve= cm;
                this.pathSegments.push(segment);
            }
            return this;
        },
        /**
         * Add a CAAT.PathSegment instance to this path.
         * @param pathSegment {CAAT.PathSegment}
         * @return this
         *
         * @deprecated
         */
		addSegment : function(pathSegment) {
            pathSegment.setParent(this);
			this.pathSegments.push(pathSegment);
            return this;
		},
        addRectangleTo : function( x1,y1, cw, color ) {
            var r= new CAAT.ShapePath();
            r.setPoints([
                    this.endCurvePosition(),
                    new CAAT.Point().set(x1,y1)
                ]);

            r.setClockWise(cw);
            r.setColor(color);
            r.setParent(this);

            this.pathSegments.push(r);

            return this;
        },
        /**
         * Add a Quadric Bezier path segment to this path.
         * The segment starts in the current last path coordinate.
         * @param px1 {number}
         * @param py1 {number}
         * @param px2 {number}
         * @param py2 {number}
         * @param color {color=}. optional parameter. determines the color to draw the segment with (if
         *         being drawn by a CAAT.PathActor).
         *
         * @return this
         */
		addQuadricTo : function( px1,py1, px2,py2, color ) {
			var bezier= new CAAT.Bezier();

            bezier.setPoints(
                [
                    this.endCurvePosition(),
                    new CAAT.Point().set(px1,py1),
                    new CAAT.Point().set(px2,py2)
                ]);

			this.trackPathX= px2;
			this.trackPathY= py2;
			
			var segment= new CAAT.CurvePath().setColor(color).setParent(this);
			segment.curve= bezier;

			this.pathSegments.push(segment);

            return this;
		},
        /**
         * Add a Cubic Bezier segment to this path.
         * The segment starts in the current last path coordinate.
         * @param px1 {number}
         * @param py1 {number}
         * @param px2 {number}
         * @param py2 {number}
         * @param px3 {number}
         * @param py3 {number}
         * @param color {color=}. optional parameter. determines the color to draw the segment with (if
         *         being drawn by a CAAT.PathActor).
         *
         * @return this
         */
		addCubicTo : function( px1,py1, px2,py2, px3,py3, color ) {
			var bezier= new CAAT.Bezier();

            bezier.setPoints(
                [
                    this.endCurvePosition(),
                    new CAAT.Point().set(px1,py1),
                    new CAAT.Point().set(px2,py2),
                    new CAAT.Point().set(px3,py3)
                ]);

			this.trackPathX= px3;
			this.trackPathY= py3;
			
			var segment= new CAAT.CurvePath().setColor(color).setParent(this);
			segment.curve= bezier;

			this.pathSegments.push(segment);
            return this;
		},
        /**
         * Add a Catmull-Rom segment to this path.
         * The segment starts in the current last path coordinate.
         * @param px1 {number}
         * @param py1 {number}
         * @param px2 {number}
         * @param py2 {number}
         * @param px3 {number}
         * @param py3 {number}
         * @param color {color=}. optional parameter. determines the color to draw the segment with (if
         *         being drawn by a CAAT.PathActor).
         *
         * @return this
         */
		addCatmullTo : function( px1,py1, px2,py2, px3,py3, color ) {
			var curve= new CAAT.CatmullRom().setColor(color);
			curve.setCurve(this.trackPathX,this.trackPathY, px1,py1, px2,py2, px3,py3);
			this.trackPathX= px3;
			this.trackPathY= py3;
			
			var segment= new CAAT.CurvePath().setParent(this);
			segment.curve= curve;

			this.pathSegments.push(segment);
            return this;
		},
        /**
         * Adds a line segment to this path.
         * The segment starts in the current last path coordinate.
         * @param px1 {number}
         * @param py1 {number}
         * @param color {color=}. optional parameter. determines the color to draw the segment with (if
         *         being drawn by a CAAT.PathActor).
         *
         * @return this
         */
		addLineTo : function( px1,py1, color ) {
			var segment= new CAAT.LinearPath().setColor(color);
            segment.setPoints( [
                    this.endCurvePosition(),
                    new CAAT.Point().set(px1,py1)
                ]);

            segment.setParent(this);

			this.trackPathX= px1;
			this.trackPathY= py1;
			
			this.pathSegments.push(segment);
            return this;
		},
        /**
         * Set the path's starting point. The method startCurvePosition will return this coordinate.
         * <p>
         * If a call to any method of the form <code>add<Segment>To</code> is called before this calling
         * this method, they will assume to start at -1,-1 and probably you'll get the wrong path.
         * @param px0 {number}
         * @param py0 {number}
         *
         * @return this
         */
		beginPath : function( px0, py0 ) {
			this.trackPathX= px0;
			this.trackPathY= py0;
			this.beginPathX= px0;
			this.beginPathY= py0;
            return this;
		},
        /**
         * <del>Close the path by adding a line path segment from the current last path
         * coordinate to startCurvePosition coordinate</del>.
         * <p>
         * This method closes a path by setting its last path segment's last control point
         * to be the first path segment's first control point.
         * <p>
         *     This method also sets the path as finished, and calculates all path's information
         *     such as length and bounding box.
         *
         * @return this
         */
		closePath : function()	{

            this.getLastPathSegment().setPoint(
                this.getFirstPathSegment().startCurvePosition(),
                this.getLastPathSegment().numControlPoints()-1 );


			this.trackPathX= this.beginPathX;
			this.trackPathY= this.beginPathY;
			
			this.endPath();
            return this;
		},
        /**
         * Finishes the process of building the path. It involves calculating each path segments length
         * and proportional length related to a normalized path length of 1.
         * It also sets current paths length.
         * These calculi are needed to traverse the path appropriately.
         * <p>
         * This method must be called explicitly, except when closing a path (that is, calling the
         * method closePath) which calls this method as well.
         *
         * @return this
         */
		endPath : function() {

			this.pathSegmentStartTime=[];
			this.pathSegmentDurationTime= [];

            this.updatePath();

            return this;
		},
        /**
         * This method, returns a CAAT.Point instance indicating a coordinate in the path.
         * The returned coordinate is the corresponding to normalizing the path's length to 1,
         * and then finding what path segment and what coordinate in that path segment corresponds
         * for the input time parameter.
         * <p>
         * The parameter time must be a value ranging 0..1.
         * If not constrained to these values, the parameter will be modulus 1, and then, if less
         * than 0, be normalized to 1+time, so that the value always ranges from 0 to 1.
         * <p>
         * This method is needed when traversing the path throughout a CAAT.Interpolator instance.
         *
         * @param time a value between 0 and 1 both inclusive. 0 will return path's starting coordinate.
         * 1 will return path's end coordinate.
         *
         * @return {CAAT.Point}
         */
		getPosition : function(time) {

            if ( time>1 || time<0 ) {
                time%=1;
            }
            if ( time<0 ) {
                time= 1+time;
            }

            /*
            var found= false;
            for( var i=0; i<this.pathSegments.length; i++ ) {
                if (this.pathSegmentStartTime[i]<=time && time<=this.pathSegmentStartTime[i]+this.pathSegmentDurationTime[i]) {
                    time= this.pathSegmentDurationTime[i] ?
                            (time-this.pathSegmentStartTime[i])/this.pathSegmentDurationTime[i] :
                            0;
                    var pointInPath= this.pathSegments[i].getPosition(time);
                    this.newPosition.x= pointInPath.x;
                    this.newPosition.y= pointInPath.y;
                    found= true;
                    break;
                }
            }

			return found ? this.newPosition : this.endCurvePosition();
			*/


            var ps= this.pathSegments;
            var psst= this.pathSegmentStartTime;
            var psdt= this.pathSegmentDurationTime;
            var l=  0;
            var r=  ps.length;
            var m;
            var np= this.newPosition;
            var psstv;
            while( l!==r ) {

                m= ((r+l)/2)|0;
                psstv= psst[m];
                if ( psstv<=time && time<=psstv+psdt[m]) {
                    time= psdt[m] ?
                            (time-psstv)/psdt[m] :
                            0;

                    var pointInPath= ps[m].getPosition(time);
                    np.x= pointInPath.x;
                    np.y= pointInPath.y;
                    return np;
                } else if ( time<psstv ) {
                    r= m;
                } else /*if ( time>=psstv )*/ {
                    l= m+1;
                }
            }
            return this.endCurvePosition();


		},
        /**
         * Analogously to the method getPosition, this method returns a CAAT.Point instance with
         * the coordinate on the path that corresponds to the given length. The input length is
         * related to path's length.
         *
         * @param iLength {number} a float with the target length.
         * @return {CAAT.Point}
         */
		getPositionFromLength : function(iLength) {
			
			iLength%=this.getLength();
			if (iLength<0 ) {
				iLength+= this.getLength();
			}
			
			var accLength=0;
			
			for( var i=0; i<this.pathSegments.length; i++ ) {
				if (accLength<=iLength && iLength<=this.pathSegments[i].getLength()+accLength) {
					iLength-= accLength;
					var pointInPath= this.pathSegments[i].getPositionFromLength(iLength);
					this.newPosition.x= pointInPath.x;
					this.newPosition.y= pointInPath.y;
					break;
				}
				accLength+= this.pathSegments[i].getLength();
			}
			
			return this.newPosition;
		},
        /**
         * Paints the path.
         * This method is called by CAAT.PathActor instances.
         * If the path is set as interactive (by default) path segment will draw curve modification
         * handles as well.
         *
         * @param director {CAAT.Director} a CAAT.Director instance.
         */
		paint : function( director ) {
			for( var i=0; i<this.pathSegments.length; i++ ) {
				this.pathSegments[i].paint(director,this.interactive);
			}
		},
        /**
         * Method invoked when a CAAT.PathActor stops dragging a control point.
         */
		release : function() {
			this.ax= -1;
			this.ay= -1;
		},
        /**
         * Returns an integer with the number of path segments that conform this path.
         * @return {number}
         */
        getNumSegments : function() {
            return this.pathSegments.length;
        },
        /**
         * Gets a CAAT.PathSegment instance.
         * @param index {number} the index of the desired CAAT.PathSegment.
         * @return CAAT.PathSegment
         */
		getSegment : function(index) {
			return this.pathSegments[index];
		},

        numControlPoints : function() {
            return this.points.length;
        },

        getControlPoint : function(index) {
            return this.points[index];
        },

        /**
         * Indicates that some path control point has changed, and that the path must recalculate
         * its internal data, ie: length and bbox.
         */
		updatePath : function(point, callback) {
            var i,j;

            this.length=0;
            this.bbox.setEmpty();
            this.points= [];

            var xmin= Number.MAX_VALUE, ymin= Number.MAX_VALUE;
			for( i=0; i<this.pathSegments.length; i++ ) {
				this.pathSegments[i].updatePath(point);
                this.length+= this.pathSegments[i].getLength();
                this.bbox.unionRectangle( this.pathSegments[i].bbox );

                for( j=0; j<this.pathSegments[i].numControlPoints(); j++ ) {
                    var pt= this.pathSegments[i].getControlPoint( j );
                    this.points.push( pt );
                    if ( pt.x < xmin ) {
                        xmin= pt.x;
                    }
                    if ( pt.y < ymin ) {
                        ymin= pt.y;
                    }
                }
			}

            this.clipOffsetX= -xmin;
            this.clipOffsetY= -ymin;

            this.width= this.bbox.width;
            this.height= this.bbox.height;
            this.setLocation( this.bbox.x, this.bbox.y );
            this.bbox.x= 0;
            this.bbox.y= 0;
            this.bbox.x1= this.width;
            this.bbox.y1= this.height;

            this.pathSegmentStartTime=      [];
            this.pathSegmentDurationTime=   [];
            
            var i;
            for( i=0; i<this.pathSegments.length; i++) {
                this.pathSegmentStartTime.push(0);
                this.pathSegmentDurationTime.push(0);
            }

            for( i=0; i<this.pathSegments.length; i++) {
                this.pathSegmentDurationTime[i]= this.getLength() ? this.pathSegments[i].getLength()/this.getLength() : 0;
                if ( i>0 ) {
                    this.pathSegmentStartTime[i]= this.pathSegmentStartTime[i-1]+this.pathSegmentDurationTime[i-1];
                } else {
                    this.pathSegmentStartTime[0]= 0;
                }

                this.pathSegments[i].endPath();
            }

            this.extractPathPoints();

            if ( typeof callback!=='undefined' ) {
                callback(this);
            }

            return this;

		},
        /**
         * Sent by a CAAT.PathActor instance object to try to drag a path's control point.
         * @param x {number}
         * @param y {number}
         */
		press: function(x,y) {
            if (!this.interactive) {
                return;
            }

            var HS= CAAT.Curve.prototype.HANDLE_SIZE/2;
			for( var i=0; i<this.pathSegments.length; i++ ) {
				for( var j=0; j<this.pathSegments[i].numControlPoints(); j++ ) {
					var point= this.pathSegments[i].getControlPoint(j);
					if ( x>=point.x-HS &&
						 y>=point.y-HS &&
						 x<point.x+HS &&
						 y<point.y+HS ) {
						
						this.point= point;
						return;
					}
				}
			}
			this.point= null;
		},
        /**
         * Drags a path's control point.
         * If the method press has not set needed internal data to drag a control point, this
         * method will do nothing, regardless the user is dragging on the CAAT.PathActor delegate.
         * @param x {number}
         * @param y {number}
         */
		drag : function(x,y,callback) {
            if (!this.interactive) {
                return;
            }

			if ( null===this.point ) {
				return;
			}
			
			if ( -1===this.ax || -1===this.ay ) {
				this.ax= x;
				this.ay= y;
			}
			
            this.point.x+= x-this.ax;
            this.point.y+= y-this.ay;

			this.ax= x;
			this.ay= y;

			this.updatePath(this.point,callback);
		},
        /**
         * Returns a collection of CAAT.Point objects which conform a path's contour.
         * @param iSize {number}. Number of samples for each path segment.
         * @return {[CAAT.Point]}
         */
        getContour : function(iSize) {
            var contour=[];
            for( var i=0; i<=iSize; i++ ) {
                contour.push( new CAAT.Point().set( i/iSize, this.getPosition(i/iSize).y, 0 ) );
            }

            return contour;
        },

        /**
         * Reposition this path points.
         * This operation will only take place if the supplied points array equals in size to
         * this path's already set points.
         * @param points {Array<CAAT.Point>}
         */
        setPoints : function( points ) {
            if ( this.points.length===points.length ) {
                for( var i=0; i<points.length; i++ ) {
                    this.points[i].x= points[i].x;
                    this.points[i].y= points[i].y;
                }
            }
            return this;
        },

        /**
         * Set a point from this path.
         * @param point {CAAT.Point}
         * @param index {integer} a point index.
         */
        setPoint : function( point, index ) {
            if ( index>=0 && index<this.points.length ) {
                this.points[index].x= point.x;
                this.points[index].y= point.y;
            }
            return this;
        },


        /**
         * Removes all behaviors from an Actor.
         * @return this
         */
		emptyBehaviorList : function() {
			this.behaviorList=[];
            return this;
		},

        extractPathPoints : function() {
            if ( !this.pathPoints ) {
                var i;
                this.pathPoints= [];
                for ( i=0; i<this.numControlPoints(); i++ ) {
                    this.pathPoints.push( this.getControlPoint(i).clone() );
                }
            }

            return this;
        },

        /**
         * Add a Behavior to the Actor.
         * An Actor accepts an undefined number of Behaviors.
         *
         * @param behavior {CAAT.Behavior} a CAAT.Behavior instance
         * @return this
         */
		addBehavior : function( behavior )	{
			this.behaviorList.push(behavior);
//            this.extractPathPoints();
            return this;
		},
        /**
         * Remove a Behavior from the Actor.
         * If the Behavior is not present at the actor behavior collection nothing happends.
         *
         * @param behavior {CAAT.Behavior} a CAAT.Behavior instance.
         */
        removeBehaviour : function( behavior ) {
            var n= this.behaviorList.length-1;
            while(n) {
                if ( this.behaviorList[n]===behavior ) {
                    this.behaviorList.splice(n,1);
                    return this;
                }
            }

            return this;
        },
        /**
         * Remove a Behavior with id param as behavior identifier from this actor.
         * This function will remove ALL behavior instances with the given id.
         *
         * @param id {number} an integer.
         * return this;
         */
        removeBehaviorById : function( id ) {
            for( var n=0; n<this.behaviorList.length; n++ ) {
                if ( this.behaviorList[n].id===id) {
                    this.behaviorList.splice(n,1);
                }
            }

            return this;

        },

        applyBehaviors : function(time) {
//            if (this.behaviorList.length) {
                for( var i=0; i<this.behaviorList.length; i++ )	{
                    this.behaviorList[i].apply(time,this);
                }

                /** calculate behavior affine transform matrix **/
                this.setATMatrix();

                for (i = 0; i < this.numControlPoints(); i++) {
                    this.setPoint(
                        this.matrix.transformCoord(
                            this.pathPoints[i].clone().translate( this.clipOffsetX, this.clipOffsetY )), i);
                }
//            }

            return this;
        },

        setATMatrix : function() {
            this.matrix.identity();

            var m= this.tmpMatrix.identity();
            var mm= this.matrix.matrix;
            var c,s,_m00,_m01,_m10,_m11;
            var mm0, mm1, mm2, mm3, mm4, mm5;

            var bbox= this.bbox;
            var bbw= bbox.width  ;
            var bbh= bbox.height ;
            var bbx= bbox.x;
            var bby= bbox.y

            mm0= 1;
            mm1= 0;
            mm3= 0;
            mm4= 1;

            mm2= this.tb_x - bbx - this.tAnchorX * bbw;
            mm5= this.tb_y - bby - this.tAnchorY * bbh;

            if ( this.rb_angle ) {

                var rbx= (this.rb_rotateAnchorX*bbw + bbx);
                var rby= (this.rb_rotateAnchorY*bbh + bby);

                mm2+= mm0*rbx + mm1*rby;
                mm5+= mm3*rbx + mm4*rby;

                c= Math.cos( this.rb_angle );
                s= Math.sin( this.rb_angle);
                _m00= mm0;
                _m01= mm1;
                _m10= mm3;
                _m11= mm4;
                mm0=  _m00*c + _m01*s;
                mm1= -_m00*s + _m01*c;
                mm3=  _m10*c + _m11*s;
                mm4= -_m10*s + _m11*c;

                mm2+= -mm0*rbx - mm1*rby;
                mm5+= -mm3*rbx - mm4*rby;
            }

            if ( this.sb_scaleX!=1 || this.sb_scaleY!=1 ) {

                var sbx= (this.sb_scaleAnchorX*bbw + bbx);
                var sby= (this.sb_scaleAnchorY*bbh + bby);

                mm2+= mm0*sbx + mm1*sby;
                mm5+= mm3*sbx + mm4*sby;

                mm0= mm0*this.sb_scaleX;
                mm1= mm1*this.sb_scaleY;
                mm3= mm3*this.sb_scaleX;
                mm4= mm4*this.sb_scaleY;

                mm2+= -mm0*sbx - mm1*sby;
                mm5+= -mm3*sbx - mm4*sby;
            }

            mm[0]= mm0;
            mm[1]= mm1;
            mm[2]= mm2;
            mm[3]= mm3;
            mm[4]= mm4;
            mm[5]= mm5;

            return this;

        },

        setRotationAnchored : function( angle, rx, ry ) {
            this.rb_angle=          angle;
            this.rb_rotateAnchorX=  rx;
            this.rb_rotateAnchorY=  ry;
            return this;
        },

        setRotationAnchor : function( ax, ay ) {
            this.rb_rotateAnchorX= ax;
            this.rb_rotateAnchorY= ay;
        },

        setRotation : function( angle ) {
            this.rb_angle= angle;
        },

        setScaleAnchored : function( scaleX, scaleY, sx, sy ) {
            this.sb_scaleX= scaleX;
            this.sb_scaleAnchorX= sx;
            this.sb_scaleY= scaleY;
            this.sb_scaleAnchorY= sy;
            return this;
        },

        setScale : function( sx, sy ) {
            this.sb_scaleX= sx;
            this.sb_scaleY= sy;
            return this;
        },

        setScaleAnchor : function( ax, ay ) {
            this.sb_scaleAnchorX= ax;
            this.sb_scaleAnchorY= ay;
            return this;
        },

        setPositionAnchor : function( ax, ay ) {
            this.tAnchorX= ax;
            this.tAnchorY= ay;
            return this;
        },

        setPositionAnchored : function( x,y,ax,ay ) {
            this.tb_x= x;
            this.tb_y= y;
            this.tAnchorX= ax;
            this.tAnchorY= ay;
            return this;
        },

        setPosition : function( x,y ) {
            this.tb_x= x;
            this.tb_y= y;
            return this;
        },

        setLocation : function( x, y ) {
            this.tb_x= x;
            this.tb_y= y;
            return this;
        },

        flatten : function( npatches, closed ) {
            var point= this.getPositionFromLength(0);
            var path= new CAAT.Path().beginPath( point.x, point.y );
            for( var i=0; i<npatches; i++ ) {
                point= this.getPositionFromLength(i/npatches*this.length);
                path.addLineTo( point.x, point.y  );
            }
            if ( closed) {
                path.closePath();
            } else {
                path.endPath();
            }

            return path;
        }

    };

    extend( CAAT.Path, CAAT.PathSegment, null);
	
})();/**
 * See LICENSE file.
 *
 * An actor to show the path and its handles in the scene graph. 
 *
 **/
(function() {
    /**
     * This class paints and handles the interactive behavior of a path.
     *
     * @constructor
     * @extends CAAT.ActorContainer
     */
	CAAT.PathActor= function() {
		CAAT.PathActor.superclass.constructor.call(this);
		return this;
	};
	
	CAAT.PathActor.prototype= {
		path                    : null,
		pathBoundingRectangle   : null,
		bOutline                : false,
        outlineColor            : 'black',
        onUpdateCallback        : null,
        interactive             : false,

        /**
         * Return the contained path.
         * @return {CAAT.Path}
         */
        getPath : function() {
            return this.path;
        },
        /**
         * Sets the path to manage.
         * @param path {CAAT.PathSegment}
         * @return this
         */
		setPath : function(path) {
			this.path= path;
            if ( path!=null ) {
			    this.pathBoundingRectangle= path.getBoundingBox();
                this.setInteractive( this.interactive );
            }
            return this;
		},
        /**
         * Paint this actor.
         * @param director {CAAT.Director}
         * @param time {number}. Scene time.
         */
		paint : function(director, time) {

            CAAT.PathActor.superclass.paint.call( this, director, time );

            if ( !this.path ) {
                return;
            }

            var ctx= director.ctx;

            ctx.strokeStyle='#000';
			this.path.paint(director, this.interactive);

			if ( this.bOutline ) {
				ctx.strokeStyle= this.outlineColor;
				ctx.strokeRect(0,0,this.width,this.height);
			}
		},
        /**
         * Enables/disables drawing of the contained path's bounding box.
         * @param show {boolean} whether to show the bounding box
         * @param color {=string} optional parameter defining the path's bounding box stroke style.
         */
        showBoundingBox : function(show, color) {
            this.bOutline= show;
            if ( show && color ) {
                this.outlineColor= color;
            }
        },
        /**
         * Set the contained path as interactive. This means it can be changed on the fly by manipulation
         * of its control points.
         * @param interactive
         */
        setInteractive : function(interactive) {
            this.interactive= interactive;
            if ( this.path ) {
                this.path.setInteractive(interactive);
            }
            return this;
        },
        setOnUpdateCallback : function( fn ) {
            this.onUpdateCallback= fn;
            return this;
        },
        /**
         * Route mouse dragging functionality to the contained path.
         * @param mouseEvent {CAAT.MouseEvent}
         */
		mouseDrag : function(mouseEvent) {
			this.path.drag(mouseEvent.point.x, mouseEvent.point.y, this.onUpdateCallback);
		},
        /**
         * Route mouse down functionality to the contained path.
         * @param mouseEvent {CAAT.MouseEvent}
         */
		mouseDown : function(mouseEvent) {
			this.path.press(mouseEvent.point.x, mouseEvent.point.y);
		},
        /**
         * Route mouse up functionality to the contained path.
         * @param mouseEvent {CAAT.MouseEvent}
         */
		mouseUp : function(mouseEvent) {
			this.path.release();
		}
	};

    extend( CAAT.PathActor, CAAT.ActorContainer, null);
})();