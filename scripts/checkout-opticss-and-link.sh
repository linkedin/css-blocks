#!/bin/bash

OPTICSS_DIR=$1
if [[ -z "$OPTICSS_DIR" ]];
then
  OPTICSS_DIR=build/opticss
fi
./script/checkout-opticss.sh $OPTICSS_DIR
./scripts/link-to-opticss.js $OPTICSS_DIR
