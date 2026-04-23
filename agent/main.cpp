#include "utils.h"
#include "api_client.h"
#include "heuristics.h"
#include <iostream>
#include <curl/curl.h>
#include <string.h>

using namespace std;

int main(int argc, char *argv[]) {
  bool apiMode = false;
  string filePath = "";

  for (int i = 1; i < argc; ++i) {
    if (strcmp(argv[i], "--api") == 0) {
      apiMode = true;
    } else {
      filePath = argv[i];
    }
  }

  if (filePath.empty()) {
    cerr << "Usage: " << argv[0] << " [--api] <path_to_executable>" << endl;
    return 1;
  }

  if (!apiMode) {
    cout << "========================================" << endl;
    cout << "   MONADGUARD AGENT (0-Day Analyzer)    " << endl;
    cout << "========================================" << endl;
    cout << "[+] Dosya Ingest Ediliyor (Ingesting file): " << filePath << endl;
  }

  vector<uint8_t> data = readFile(filePath);
  if (data.empty()) {
    if (apiMode) cout << "{\"error\": \"Error reading file or file is empty.\"}" << endl;
    else cerr << "[-] Error reading file or file is empty." << endl;
    return 1;
  }

  // Basic format check before proceeding
  bool isPE = (data.size() > 2 && data[0] == 'M' && data[1] == 'Z');
  bool isELF = (data.size() > 4 && data[0] == 0x7F && data[1] == 'E' && data[2] == 'L' && data[3] == 'F');
  
  if (!isPE && !isELF) {
      if (apiMode) cout << "{\"error\": \"Unsupported file format. Only PE (MZ) and ELF (\\\\x7F ELF) are supported.\"}" << endl;
      else cerr << "[-] Error: Unsupported file format. Only PE (MZ) and ELF (\\x7F ELF) are supported." << endl;
      return 1;
  }

  if (!apiMode) cout << "[+] Dosya Tipi: " << (isPE ? "Windows PE" : "Linux ELF") << endl;

  if (!apiMode) cout << "[+] Hashing Islemi (Calculating SHA-256 Hash)..." << endl;
  string hash = calculateSHA256(data);
  if (!apiMode) cout << "    SHA-256: " << hash << endl;

  curl_global_init(CURL_GLOBAL_DEFAULT);
  if (!apiMode) cout << "[+] Threat Intel Oracle (MalwareBazaar) Sorgulaniyor..." << endl;
  string response = queryMalwareBazaar(hash);
  string family;

  if (parseBazaarResponse(response, family)) {
    if (apiMode) {
      cout << "{\"hash\": \"" << hash << "\", \"score\": 100, \"family\": \"" << family << "\", \"isKnown\": true}" << endl;
    } else {
      cout << "[!] BİLİNEN ZARARLI YAZILIM TESPİT EDİLDİ (KNOWN MALWARE DETECTED)!" << endl;
      cout << "    Family: " << family << endl;
      cout << "    Verdict: Malicious. No 0-day analysis needed." << endl;
    }
    curl_global_cleanup();
    return 0;
  } else {
    if (!apiMode) {
      cout << "[?] MalwareBazaar: BİLİNMİYOR (UNKNOWN). Potential 0-day." << endl;
      cout << "[+] Heuristics Başlatılıyor (Proceeding to Heuristics Engine)..." << endl;
    }
  }

  HEURISTICS_RESULT hRes = runHeuristics(data, hash);

  string verdict;
  if (hRes.probabilityScore < 40) {
    verdict = "LOW_RISK";
  } else if (hRes.probabilityScore <= 60) {
    verdict = "MEDIUM_RISK";
  } else {
    verdict = "HIGH_RISK";
  }

  if (apiMode) {
    cout << "{\"hash\": \"" << hash << "\", \"score\": " << hRes.probabilityScore << ", \"family\": \"UNKNOWN\", \"isKnown\": false}" << endl;
  } else {
    cout << "\n========================================" << endl;
    cout << "             ANALYSIS VERDICT           " << endl;
    cout << "========================================" << endl;
    cout << "[+] 0-Day Probability Score: " << hRes.probabilityScore << "%" << endl;

    if (verdict == "LOW_RISK") cout << "[+] LOW RISK (Benign)" << endl;
    else if (verdict == "MEDIUM_RISK") cout << "[!] MEDIUM RISK (Suspicious, manual review needed)" << endl;
    else cout << "[!!!] HIGH RISK (0-Day Candidate)" << endl;

    if (hRes.probabilityScore > 60 || verdict == "HIGH_RISK") {
      if (hRes.isCheapClone) {
          cout << "[-] Staking aborted due to Anti-Farming protection." << endl;
      } else {
          cout << "[!] Threat detected. Stake 10 MON and log to Monad Network? (E/H): ";
          char choice;
          cin >> choice;
          if (choice == 'E' || choice == 'e') {
            cout << "[+] Python Bridge başlatılıyor..." << endl;
            
            string command = "python3 bridge.py " + hash + " " + to_string(hRes.probabilityScore) + " " + verdict;
            cout << "[>] Executing: " << command << endl;
            
            int ret = system(command.c_str());
            
            if (ret == 0) {
                cout << "[+] Web3 ekosistemini guvenli tuttugunuz icin tesekkurler!" << endl;
            } else {
                cout << "[-] Köprü çalıştırılırken bir hata oluştu veya işlem başarısız oldu." << endl;
            }
          } else {
            cout << "[+] Yayin iptal edildi (Broadcast cancelled)." << endl;
          }
      }
    }
  }

  curl_global_cleanup();
  return 0;
}
