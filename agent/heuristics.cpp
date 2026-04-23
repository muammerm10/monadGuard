#include "heuristics.h"
#include "elf_parser.h"
#include "pe_parser.h"
#include "utils.h"
#include <algorithm>
#include <iomanip>
#include <iostream>

using namespace std;

// Dummy hardcoded ImpHashes (e.g., standard MD5 format hashes)
const vector<string> KNOWN_MALICIOUS_IMPHASHES = {
    "d41d8cd98f00b204e9800998ecf8427e", // Empty string MD5, just as an example
    "1234567890abcdef1234567890abcdef", "b89bf263884c7e6c518d6a78229f3c14",
    "deadbeefdeadbeefdeadbeefdeadbeef"};

HEURISTICS_RESULT runHeuristics(const vector<uint8_t> &data,
                                const string &fileHash) {
  HEURISTICS_RESULT res = {0, false};
  int score = 0;

  cout << "\n========================================" << endl;
  cout << "    MONADGUARD 0-DAY HEURISTICS ENGINE  " << endl;
  cout << "========================================" << endl;

  cout << "[+] Calculating Shannon Entropy..." << endl;
  double entropy = calculateEntropy(data);
  cout << "    Entropy: " << fixed << setprecision(2) << entropy << endl;
  if (entropy > 7.2) {
    cout << "    [!] ALERT: High Entropy / Potential Packer detected!" << endl;
    score += 30;
  }

  string impHash = "";

  // Try parsing as PE
  PE_ANALYSIS_RESULT peRes = analyzePE(data);
  if (peRes.isPE) {
    cout << "[+] Windows PE File Detected." << endl;
    score += peRes.scoreModifier;
    impHash = peRes.impHash;
  } else {
    // Try parsing as ELF
    ELF_ANALYSIS_RESULT elfRes = analyzeELF(data);
    if (elfRes.isELF) {
      cout << "[+] Linux ELF File Detected." << endl;
      score += elfRes.scoreModifier;
      impHash = elfRes.impHash;
    } else {
      cout
          << "[-] Unknown file format. Cannot perform deep structural analysis."
          << endl;
    }
  }

  res.probabilityScore = min(100, score);

  if (!impHash.empty()) {
    cout << "[+] Checking Anti-Farming Database for ImpHash..." << endl;
    if (find(KNOWN_MALICIOUS_IMPHASHES.begin(), KNOWN_MALICIOUS_IMPHASHES.end(),
             impHash) != KNOWN_MALICIOUS_IMPHASHES.end()) {
      cout << "    [!] ALERT: Cheap Clone Detected! Different File Hash but "
              "identical ImpHash."
           << endl;
      cout << "    Reward Farming Blocked." << endl;
      res.isCheapClone = true;
    } else {
      cout << "    [+] ImpHash clean. Proceeding." << endl;
    }
  }

  return res;
}
