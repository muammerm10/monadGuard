#pragma once

#include <vector>
#include <string>
#include <cstdint>

struct ELF_ANALYSIS_RESULT {
  bool isELF;
  int scoreModifier;
  std::string impHash;
};

ELF_ANALYSIS_RESULT analyzeELF(const std::vector<uint8_t> &data);
