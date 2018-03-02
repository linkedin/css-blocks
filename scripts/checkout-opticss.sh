#!/bin/bash

OPTICSS_DIR=$1
if [[ -z "$OPTICSS_DIR" ]];
then
  OPTICSS_DIR=build/opticss
fi
BRANCH="$(node -e "const j = require('./scripts/config.json'); process.stdout.write(j.opticss.branch);")";
mkdir -p $(dirname $OPTICSS_DIR)
if [ -d $OPTICSS_DIR ]
then
  cd $OPTICSS_DIR
  git fetch origin
  git checkout $BRANCH
  git pull
  cd -
else
  git clone -b $BRANCH --depth 1 git@github.com:css-blocks/opticss.git $OPTICSS_DIR
fi
cd $OPTICSS_DIR && lerna bootstrap --registry=https://registry.npmjs.org/
cd -
