#!/bin/bash
RELEASE="$(node -e "const j = require('./scripts/config.json'); process.stdout.write(j.opticss.release);")";
if [ "$RELEASE" == "latest" ]; then
  echo "Currently running against the latest release of opticss. Skipping $@";
  exit 0;
else
  $@
fi
