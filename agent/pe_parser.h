#pragma once

#include <vector>
#include <string>
#include <cstdint>

struct PE_ANALYSIS_RESULT {
  bool isPE;
  int scoreModifier;
  std::string impHash;
};

PE_ANALYSIS_RESULT analyzePE(const std::vector<uint8_t> &data);
