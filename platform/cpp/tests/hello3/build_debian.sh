#!/bin/bash

PLATFORM=cpp clon

mkdir build
cd build
cmake ..
cpus=$(/usr/bin/nproc)
make -j$cpus
