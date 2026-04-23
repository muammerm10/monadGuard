#include "pe_parser.h"
#include "utils.h"
#include <iostream>
#include <cstring>
#include <algorithm>

using namespace std;

#pragma pack(push, 1)
struct SECTION_HEADER {
  char Name[8];
  uint32_t VirtualSize;
  uint32_t VirtualAddress;
  uint32_t SizeOfRawData;
  uint32_t PointerToRawData;
  uint32_t PointerToRelocations;
  uint32_t PointerToLinenumbers;
  uint16_t NumberOfRelocations;
  uint16_t NumberOfLinenumbers;
  uint32_t Characteristics;
};
#pragma pack(pop)

uint32_t RvaToOffset(uint32_t rva, const vector<SECTION_HEADER> &sections) {
  for (const auto &sec : sections) {
    uint32_t size = sec.VirtualSize > 0 ? sec.VirtualSize : sec.SizeOfRawData;
    if (rva >= sec.VirtualAddress && rva < sec.VirtualAddress + size) {
      return rva - sec.VirtualAddress + sec.PointerToRawData;
    }
  }
  return 0;
}

PE_ANALYSIS_RESULT analyzePE(const vector<uint8_t> &data) {
  PE_ANALYSIS_RESULT result = {false, 0, ""};

  if (data.size() < 64) return result;

  const uint16_t *e_magic = (const uint16_t *)data.data();
  if (*e_magic != 0x5A4D) { // 'MZ'
    return result;
  }

  uint32_t e_lfanew = *(uint32_t *)&data[0x3C];
  if (e_lfanew + 24 > data.size()) return result;

  if (data[e_lfanew] != 'P' || data[e_lfanew + 1] != 'E') {
    return result;
  }

  result.isPE = true;

  uint16_t numSections = *(uint16_t *)&data[e_lfanew + 6];
  uint16_t optHeaderSize = *(uint16_t *)&data[e_lfanew + 20];

  uint32_t optHeaderOffset = e_lfanew + 24;
  uint32_t sectionsOffset = optHeaderOffset + optHeaderSize;

  uint32_t entryPointRVA = 0;
  if (optHeaderOffset + 20 <= data.size()) {
      entryPointRVA = *(uint32_t *)&data[optHeaderOffset + 16];
  }

  vector<SECTION_HEADER> sections;
  cout << "[+] Parsing PE Sections (" << numSections << " found)..." << endl;
  for (int i = 0; i < numSections; ++i) {
    if (sectionsOffset + sizeof(SECTION_HEADER) > data.size()) break;
    SECTION_HEADER sec;
    memcpy(&sec, &data[sectionsOffset], sizeof(SECTION_HEADER));
    sections.push_back(sec);

    char nameBuf[9] = {0};
    memcpy(nameBuf, sec.Name, 8);
    string name(nameBuf);

    bool isRwx = (sec.Characteristics & 0xE0000000) == 0xE0000000;
    bool isWritable = (sec.Characteristics & 0x80000000) != 0;
    bool isSuspiciousName =
        (name == ".upx" || name == ".upx0" || name == ".upx1" ||
         name == ".vmp" || name == ".themida");

    if (isRwx || isSuspiciousName) {
      cout << "    [!] ALERT: Suspicious section found: " << name
           << (isRwx ? " [RWX]" : "") << endl;
      result.scoreModifier += 10;
    }

    uint32_t secSize = sec.VirtualSize > 0 ? sec.VirtualSize : sec.SizeOfRawData;
    if (entryPointRVA >= sec.VirtualAddress && entryPointRVA < sec.VirtualAddress + secSize) {
        if (isWritable) {
            cout << "    [!] ALERT: Suspicious Entry Point in writable section: " << name << endl;
            result.scoreModifier += 30;
        }
    }

    if (name != ".text" && sec.SizeOfRawData > 0 && sec.PointerToRawData + sec.SizeOfRawData <= data.size()) {
        vector<uint8_t> secData(data.begin() + sec.PointerToRawData, data.begin() + sec.PointerToRawData + sec.SizeOfRawData);
        double secEntropy = calculateEntropy(secData);
        if (secEntropy > 7.5) {
            cout << "    [!] ALERT: High Entropy (" << secEntropy << ") in non-.text section: " << name << endl;
            result.scoreModifier += 40;
        }
    }

    sectionsOffset += sizeof(SECTION_HEADER);
  }

  if (optHeaderOffset + 2 > data.size()) return result;
  uint16_t magic = *(uint16_t *)&data[optHeaderOffset];
  uint32_t importDirRVA = 0;

  if (magic == 0x010B) { // PE32
    if (optHeaderOffset + 104 + 8 <= data.size()) {
      importDirRVA = *(uint32_t *)&data[optHeaderOffset + 104];
    }
  } else if (magic == 0x020B) { // PE32+
    if (optHeaderOffset + 120 + 8 <= data.size()) {
      importDirRVA = *(uint32_t *)&data[optHeaderOffset + 120];
    }
  }

  string importedFunctionsStr = "";

  if (importDirRVA != 0) {
    uint32_t importOffset = RvaToOffset(importDirRVA, sections);
    if (importOffset > 0 && importOffset < data.size()) {
      cout << "[+] Analyzing Import Address Table (IAT)..." << endl;
      uint32_t currentDesc = importOffset;

      while (currentDesc + 20 <= data.size()) {
        uint32_t oft = *(uint32_t *)&data[currentDesc];
        uint32_t nameRVA = *(uint32_t *)&data[currentDesc + 12];
        uint32_t ft = *(uint32_t *)&data[currentDesc + 16];

        if (oft == 0 && nameRVA == 0) break;

        uint32_t dllNameOffset = RvaToOffset(nameRVA, sections);
        string dllName = "Unknown";
        if (dllNameOffset > 0 && dllNameOffset < data.size()) {
          size_t len = 0;
          while (dllNameOffset + len < data.size() &&
                 data[dllNameOffset + len] != '\0' && len < 256)
            len++;
          dllName = string((char *)&data[dllNameOffset], len);
        }

        uint32_t thunkRVA = oft != 0 ? oft : ft;
        uint32_t thunkOffset = RvaToOffset(thunkRVA, sections);

        if (thunkOffset > 0) {
          while (thunkOffset + (magic == 0x020B ? 8 : 4) <= data.size()) {
            uint64_t thunkData = 0;
            if (magic == 0x020B) {
              thunkData = *(uint64_t *)&data[thunkOffset];
              thunkOffset += 8;
            } else {
              thunkData = *(uint32_t *)&data[thunkOffset];
              thunkOffset += 4;
            }

            if (thunkData == 0) break;

            bool byOrdinal = (magic == 0x020B)
                                 ? ((thunkData & 0x8000000000000000) != 0)
                                 : ((thunkData & 0x80000000) != 0);

            if (!byOrdinal) {
              uint32_t funcNameRVA = thunkData & 0x7FFFFFFF;
              uint32_t funcNameOffset = RvaToOffset(funcNameRVA, sections);
              if (funcNameOffset > 0 && funcNameOffset + 2 < data.size()) {
                size_t len = 0;
                while (funcNameOffset + 2 + len < data.size() &&
                       data[funcNameOffset + 2 + len] != '\0' && len < 256)
                  len++;
                string funcName =
                    string((char *)&data[funcNameOffset + 2], len);

                importedFunctionsStr += toLower(funcName);

                vector<string> tier1 = {"VirtualAllocEx", "WriteProcessMemory", "CreateRemoteThread", "NtUnmapViewOfSection", "SuspendThread"};
                vector<string> tier2 = {"SetWindowsHookEx", "CryptDecrypt", "InternetOpenUrl"};
                vector<string> tier3 = {"GetProcAddress", "LoadLibraryA", "IsDebuggerPresent"};

                auto contains = [](const vector<string>& v, const string& s) {
                    return find(v.begin(), v.end(), s) != v.end();
                };

                if (contains(tier1, funcName)) {
                    cout << "    [!] ALERT (Tier 1): Severe API imported: " << funcName << " (from " << dllName << ")" << endl;
                    result.scoreModifier += 30;
                } else if (contains(tier2, funcName)) {
                    cout << "    [!] ALERT (Tier 2): Suspicious API imported: " << funcName << " (from " << dllName << ")" << endl;
                    result.scoreModifier += 15;
                } else if (contains(tier3, funcName)) {
                    cout << "    [-] Info (Tier 3): Common/Low API imported: " << funcName << " (from " << dllName << ")" << endl;
                    result.scoreModifier += 5;
                }
              }
            }
          }
        }
        currentDesc += 20;
      }
    }
  }

  if (!importedFunctionsStr.empty()) {
    result.impHash = calculateMD5(importedFunctionsStr);
    cout << "    PE ImpHash: " << result.impHash << endl;
  }

  return result;
}
