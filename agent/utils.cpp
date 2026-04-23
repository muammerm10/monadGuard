#include "utils.h"
#include <fstream>
#include <iomanip>
#include <sstream>
#include <map>
#include <cmath>
#include <algorithm>
#include <openssl/evp.h>

using namespace std;

vector<uint8_t> readFile(const string &path) {
  ifstream file(path, ios::binary | ios::ate);
  if (!file.is_open()) return {};
  streamsize size = file.tellg();
  file.seekg(0, ios::beg);
  vector<uint8_t> buffer(size);
  if (file.read((char *)buffer.data(), size)) {
    return buffer;
  }
  return {};
}

string calculateSHA256(const vector<uint8_t> &data) {
  EVP_MD_CTX *context = EVP_MD_CTX_new();
  const EVP_MD *md = EVP_sha256();
  unsigned char md_value[EVP_MAX_MD_SIZE];
  unsigned int md_len;

  EVP_DigestInit_ex(context, md, nullptr);
  EVP_DigestUpdate(context, data.data(), data.size());
  EVP_DigestFinal_ex(context, md_value, &md_len);
  EVP_MD_CTX_free(context);

  stringstream ss;
  for (unsigned int i = 0; i < md_len; i++) {
    ss << hex << setw(2) << setfill('0') << (int)md_value[i];
  }
  return ss.str();
}

string calculateMD5(const string &data) {
  EVP_MD_CTX *context = EVP_MD_CTX_new();
  const EVP_MD *md = EVP_md5();
  unsigned char md_value[EVP_MAX_MD_SIZE];
  unsigned int md_len;

  EVP_DigestInit_ex(context, md, nullptr);
  EVP_DigestUpdate(context, data.c_str(), data.size());
  EVP_DigestFinal_ex(context, md_value, &md_len);
  EVP_MD_CTX_free(context);

  stringstream ss;
  for (unsigned int i = 0; i < md_len; i++) {
    ss << hex << setw(2) << setfill('0') << (int)md_value[i];
  }
  return ss.str();
}

double calculateEntropy(const vector<uint8_t> &data) {
  if (data.empty()) return 0.0;
  map<uint8_t, int> counts;
  for (uint8_t b : data) counts[b]++;
  double entropy = 0.0;
  double size = data.size();
  for (const auto &pair : counts) {
    double p = pair.second / size;
    entropy -= p * log2(p);
  }
  return entropy;
}

string toLower(const string &str) {
  string result = str;
  transform(result.begin(), result.end(), result.begin(), ::tolower);
  return result;
}
