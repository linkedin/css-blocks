#!/bin/bash

OPTICSS_DIR=$1
if [[ -z "$OPTICSS_DIR" ]];
then
  OPTICSS_DIR=../opticss
fi
./scripts/if-opticss-dev.sh ./scripts/checkout-opticss.sh $OPTICSS_DIR
./scripts/if-opticss-dev.sh ./scripts/link-to-opticss.js $OPTICSS_DIR
