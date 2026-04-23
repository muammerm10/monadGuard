#pragma once

#include <string>

std::string queryMalwareBazaar(const std::string &hash);
bool parseBazaarResponse(const std::string &response, std::string &family);
