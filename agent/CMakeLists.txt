cmake_minimum_required(VERSION 3.10)
project(MonadGuardAgent)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find necessary packages
find_package(OpenSSL REQUIRED)
find_package(CURL REQUIRED)

add_executable(agent main.cpp utils.cpp api_client.cpp pe_parser.cpp elf_parser.cpp heuristics.cpp)

# Link the libraries
target_link_libraries(agent OpenSSL::SSL OpenSSL::Crypto CURL::libcurl)
