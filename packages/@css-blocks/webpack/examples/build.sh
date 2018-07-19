#!/bin/bash

EXAMPLES=jsx

for example in $EXAMPLES; do
  cd $example
  rm -rf node_modules/@css-blocks
  yarn && yarn build || exit 1
  cd -
done
