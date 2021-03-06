
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

