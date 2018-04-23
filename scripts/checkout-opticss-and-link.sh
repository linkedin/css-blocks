#!/bin/bash

OPTICSS_DIR=$1
if [[ -z "$OPTICSS_DIR" ]];
then
  OPTICSS_DIR=../opticss
fi
./scripts/checkout-opticss.sh $OPTICSS_DIR
./scripts/link-to-opticss.js $OPTICSS_DIR
