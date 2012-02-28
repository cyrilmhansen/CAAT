#! /bin/bash
CAAT_SCRIPT_DIR="$( cd "$( dirname "$0" )" && pwd )"
CAAT_ROOT_DIR="$( cd "$CAAT_SCRIPT_DIR"/../.. && pwd )"

source $CAAT_SCRIPT_DIR/env.sh
########################################################

cd $CAAT_SCRIPT_DIR
CAAT_DST=$CAAT_ROOT_DIR/build/caat
LICENSE=$CAAT_ROOT_DIR/LICENSE
CAAT_SRC_DIR=$CAAT_ROOT_DIR/src

#
# execute version procedure. 
# version.nfo contains new version value.
#
./version.sh
VERSION=`cat version.nfo`
echo "New generated version: ${VERSION}"


DST_FILE_NAME="${CAAT_DST}";

VERSION=`cat version.nfo`

FILE_CAAT="${DST_FILE_NAME}.js"
FILE_CAAT_CSS="${DST_FILE_NAME}-css.js"
FILE_CAAT_BOX2D="${DST_FILE_NAME}-box2d.js"
FILE_CAAT_TEXTINPUT="${DST_FILE_NAME}-textinput.js"

echo "Packing ${FILE_CAAT}"
echo -e "/*" > "${FILE_CAAT}"
cat $LICENSE >> "${FILE_CAAT}"
echo -e "\nVersion: ${VERSION}\n" >> "${FILE_CAAT}"
echo -e "Created on:" >> "${FILE_CAAT}"
date "+DATE: %Y-%m-%d%nTIME: %H:%M:%S" >> "${FILE_CAAT}"
echo -e "*/\n\n" >> "${FILE_CAAT}"

more $CAAT_SRC_DIR/CAAT.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/core/class.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/math/affinetransform2D.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/math/color.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/math/rectangle.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/math/bezier.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/math/point.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/math/quadtree.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/path/interpolator.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/behaviour/behaviour.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/behaviour/csskeyframehelper.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/core/browserdetect.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/model/debug.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/model/actor.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/model/audio.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/model/extraActor.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/model/director.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/model/mouseevent.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/model/conpoundimage.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/model/imagepreloader.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/model/timer.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/model/scene.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/modules/modules.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/modules/CircleManager/PackedCircle.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/modules/CircleManager/PackedCircleManager.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/modules/LocalStorage/LocalStorage.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/modules/ImageUtil/ImageUtil.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/modules/Layout/layout.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/modules/Font/font.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/path/interpolatoractor.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/path/path.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/path/pathactor.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/texture/plasma.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/webgl/ShaderUtil.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/webgl/glu.js >> "${FILE_CAAT}"
more $CAAT_SRC_DIR/webgl/glTexturePage.js >> "${FILE_CAAT}"


# Distribute resulting compiled files
#
echo -e "\nCopying:"
while read LINE; do
  echo -e "\tCopying results to ${LINE}"
  cp ${FILE_CAAT} ${LINE} 
done < version.distribution


#
# CSS
#
echo "Packing ${FILE_CAAT_CSS}"
echo -e "/*" > "${FILE_CAAT_CSS}"
cat $LICENSE >> "${FILE_CAAT_CSS}"
echo -e "\nVersion: ${VERSION}\n" >> "${FILE_CAAT_CSS}"
echo -e "Created on:" >> "${FILE_CAAT_CSS}"
date "+DATE: %Y-%m-%d%nTIME: %H:%M:%S" >> "${FILE_CAAT_CSS}"
echo -e "*/\n\n" >> "${FILE_CAAT_CSS}"

more $CAAT_SRC_DIR/CAAT.js >> "${FILE_CAAT_CSS}"
echo -e "CAAT.__CSS__=1;" >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/core/class.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/math/affinetransform2D.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/math/color.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/math/rectangle.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/math/bezier.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/math/point.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/math/quadtree.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/path/interpolator.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/behaviour/behaviour.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/behaviour/csskeyframehelper.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/core/browserdetect.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/model/debug.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/model/actorCSS.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/model/audio.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/model/extraActor.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/model/director.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/model/mouseevent.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/model/conpoundimage.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/model/imagepreloader.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/model/timer.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/model/sceneCSS.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/modules/modules.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/modules/CircleManager/PackedCircle.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/modules/CircleManager/PackedCircleManager.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/modules/LocalStorage/LocalStorage.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/modules/ImageUtil/ImageUtil.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/modules/Layout/layout.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/modules/Font/font.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/path/interpolatoractor.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/path/path.js >> "${FILE_CAAT_CSS}"
more $CAAT_SRC_DIR/path/pathactor.js >> "${FILE_CAAT_CSS}"


#
# Distribute resulting compiled files
#
echo -e "\nCopying css version:"
while read LINE; do
  echo -e "\tCopying css ${FILE_CAAT_CSS} results to ${LINE}"
  cp ${FILE_CAAT_CSS} "$( dirname "$LINE" )"
done < version.distribution


echo "Packing ${FILE_CAAT_TEXTINPUT}"
echo -e "/*" > "${FILE_CAAT_TEXTINPUT}"
cat $LICENSE >> "${FILE_CAAT_TEXTINPUT}"
echo -e "\nVersion: ${VERSION}\n" >> "${FILE_CAAT_TEXTINPUT}"
echo -e "Created on:" >> "${FILE_CAAT_TEXTINPUT}"
date "+DATE: %Y-%m-%d%nTIME: %H:%M:%S" >> "${FILE_CAAT_TEXTINPUT}"
echo -e "*/\n\n" >> "${FILE_CAAT_TEXTINPUT}"

more $CAAT_SRC_DIR/modules/TextInput/noVNC_Util.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/modules/TextInput/noVNC_Input.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/CAAT.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/core/class.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/math/affinetransform2D.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/math/color.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/math/rectangle.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/math/bezier.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/math/point.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/math/quadtree.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/path/interpolator.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/behaviour/behaviour.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/behaviour/csskeyframehelper.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/core/browserdetect.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/model/debug.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/model/actor.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/model/audio.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/model/extraActor.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/model/director.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/model/mouseevent.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/model/conpoundimage.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/model/imagepreloader.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/model/timer.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/model/scene.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/modules/modules.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/modules/CircleManager/PackedCircle.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/modules/CircleManager/PackedCircleManager.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/modules/LocalStorage/LocalStorage.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/modules/ImageUtil/ImageUtil.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/modules/Layout/layout.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/modules/Font/font.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/path/interpolatoractor.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/path/path.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/path/pathactor.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/texture/plasma.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/webgl/ShaderUtil.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/webgl/glu.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/webgl/glTexturePage.js >> "${FILE_CAAT_TEXTINPUT}"
more $CAAT_SRC_DIR/modules/TextInput/TextInput.js >> "${FILE_CAAT_TEXTINPUT}"


# Distribute resulting textinput compiled files
#
echo -e "\nCopying:"
while read LINE; do
  echo -e "\tCopying results to ${LINE}"
  cp ${FILE_CAAT_TEXTINPUT} ${LINE} 
done < version.distribution

# box2d

echo "Packing ${FILE_CAAT_BOX2D}"
echo -e "/*" > "${FILE_CAAT_BOX2D}"
cat $LICENSE >> "${FILE_CAAT_BOX2D}"
echo -e "\nVersion: ${VERSION}\n" >> "${FILE_CAAT_BOX2D}"
echo -e "Created on:" >> "${FILE_CAAT_BOX2D}"
date "+DATE: %Y-%m-%d%nTIME: %H:%M:%S" >> "${FILE_CAAT_BOX2D}"
echo -e "*/\n\n" >> "${FILE_CAAT_BOX2D}"

more $CAAT_SRC_DIR/box2d/box2Dactor.js >> "${FILE_CAAT_BOX2D}"

#
# Distribute resulting compiled files
#
echo -e "\nCopying:"
while read LINE; do
  echo -e "\tCopying results to ${LINE}"
  cp ${FILE_CAAT_BOX2D} ${LINE} 
done < version.distribution
