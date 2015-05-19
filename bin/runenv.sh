#!/bin/bash

#
#
# Set environment vars for hdf5 module

# location of hdf5 install
export HDF5_HOME=/usr/local
# location of node install
export NODE_HOME=/usr/local
# library path for linux
# export LD_LIBRARY_PATH=$HDF5_HOME/lib:$LD_LIBRARY_PATH
# library path for osx
export DYLD_LIBRARY_PATH=$HDF5_HOME/lib:$DYLD_LIBRARY_PATH

#
#
# Run API server

node --harmony ./app.js
