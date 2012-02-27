#! /bin/bash
CAAT_SCRIPT_DIR="$( cd "$( dirname "$0" )" && pwd )"
CAAT_ROOT_DIR="$( cd "$CAAT_SCRIPT_DIR"/../.. && pwd )"

source $CAAT_SCRIPT_DIR/env.sh
########################################################


$JAVA -jar $JSDOC_TK_DIR/jsrun.jar $JSDOC_TK_DIR/app/run.js -a -v -p -r=4 -t=$JSDOC_TK_DIR/templates/jsdoc $CAAT_ROOT_DIR/src/CAAT.js $CAAT_ROOT_DIR/src/behavior $CAAT_ROOT_DIR/src/box2d $CAAT_ROOT_DIR/src/core $CAAT_ROOT_DIR/src/math $CAAT_ROOT_DIR/src/model/actor.js $CAAT_ROOT_DIR/src/model/audio.js $CAAT_ROOT_DIR/src/model/conpoundimage.js $CAAT_ROOT_DIR/src/model/debug.js $CAAT_ROOT_DIR/src/model/director.js $CAAT_ROOT_DIR/src/model/extraActor.js $CAAT_ROOT_DIR/src/model/imagepreloader.js $CAAT_ROOT_DIR/src/model/mouseevent.js $CAAT_ROOT_DIR/src/model/scene.js $CAAT_ROOT_DIR/src/model/timer.js $CAAT_ROOT_DIR/src/modules $CAAT_ROOT_DIR/src/path $CAAT_ROOT_DIR/src/texture $CAAT_ROOT_DIR/src/webgl -d=$CAAT_ROOT_DIR/documentation/jsdoc
