#pragma once

#include <vector>
#include <string>
#include <cstdint>

struct HEURISTICS_RESULT {
  int probabilityScore;
  bool isCheapClone;
};

HEURISTICS_RESULT runHeuristics(const std::vector<uint8_t> &data, const std::string &fileHash);
