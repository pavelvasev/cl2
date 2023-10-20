project(main)
add_executable(main main.cl.cpp)

include_directories(${CMAKE_CURRENT_SOURCE_DIR} ../../runtime)
