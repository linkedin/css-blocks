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
  git fetch origin || exit 1
  git checkout $BRANCH || exit 1
  git pull || exit 1
  lerna bootstrap --ci --registry=https://registry.npmjs.org/ || exit 1
else
  git clone -b $BRANCH --depth 1 https://github.com/linkedin/opticss.git $OPTICSS_DIR || exit 1
  cd $OPTICSS_DIR || exit 1
  lerna bootstrap --ci --registry=https://registry.npmjs.org/ || exit 1
fi
lerna run compile || exit 1
cd -
