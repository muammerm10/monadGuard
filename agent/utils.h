#pragma once

#include <vector>
#include <string>
#include <cstdint>

std::vector<uint8_t> readFile(const std::string &path);
std::string calculateSHA256(const std::vector<uint8_t> &data);
std::string calculateMD5(const std::string &data);
double calculateEntropy(const std::vector<uint8_t> &data);
std::string toLower(const std::string &str);
