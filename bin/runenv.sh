#!/bin/bash

#
#
# Set environment vars for hypertable node api

#!/bin/bash

HYPERTABLE_HOME=/opt/hypertable/current

env NODE_PATH=$HYPERTABLE_HOME/lib/js/node/node_modules node --harmony ./app.js
