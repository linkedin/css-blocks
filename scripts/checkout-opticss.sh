#!/bin/bash

OPTICSS_DIR=$1
if [[ -z "$OPTICSS_DIR" ]];
then
  OPTICSS_DIR=build/opticss
fi
RELEASE="$(node -e "const j = require('./scripts/config.json'); process.stdout.write(j.opticss.release);")";
if [ "$RELEASE" == "latest" ]; then
  exit 0;
fi
BRANCH="$(node -e "const j = require('./scripts/config.json'); process.stdout.write(j.opticss.branch);")";
mkdir -p $(dirname $OPTICSS_DIR)
if [ -d $OPTICSS_DIR ]
then
  cd $OPTICSS_DIR
  git fetch origin
  git checkout $BRANCH
  git pull
  lerna bootstrap --registry=https://registry.npmjs.org/
else
  git clone -b $BRANCH --depth 1 git@github.com:linkedin/opticss.git $OPTICSS_DIR
  cd $OPTICSS_DIR
  lerna bootstrap --ci --registry=https://registry.npmjs.org/
fi
lerna run compile
cd -
