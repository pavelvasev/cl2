cmake_minimum_required(VERSION 3.13)

project(main)
add_executable(main main.cl.cpp)

include_directories(${CMAKE_CURRENT_SOURCE_DIR} ../../runtime)
# target_compile_features(${TARGET_NAME} cxx_std_17)
# https://cmake.org/cmake/help/latest/prop_tgt/CXX_STANDARD.html
set_property(TARGET main PROPERTY CXX_STANDARD 17)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fconcepts")