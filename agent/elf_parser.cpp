#include "elf_parser.h"
#include "utils.h"
#include <iostream>
#include <cstring>

using namespace std;

// ELF Definitions based on elf.h
#define EI_NIDENT 16

#define PT_DYNAMIC 2
#define PF_X 1
#define PF_W 2
#define PF_R 4

#define DT_NULL     0
#define DT_NEEDED   1
#define DT_STRTAB   5
#define DT_SYMTAB   6
#define DT_STRSZ    10
#define DT_SYMENT   11

#pragma pack(push, 1)
struct Elf64_Ehdr {
    unsigned char e_ident[EI_NIDENT];
    uint16_t      e_type;
    uint16_t      e_machine;
    uint32_t      e_version;
    uint64_t      e_entry;
    uint64_t      e_phoff;
    uint64_t      e_shoff;
    uint32_t      e_flags;
    uint16_t      e_ehsize;
    uint16_t      e_phentsize;
    uint16_t      e_phnum;
    uint16_t      e_shentsize;
    uint16_t      e_shnum;
    uint16_t      e_shstrndx;
};

struct Elf64_Phdr {
    uint32_t p_type;
    uint32_t p_flags;
    uint64_t p_offset;
    uint64_t p_vaddr;
    uint64_t p_paddr;
    uint64_t p_filesz;
    uint64_t p_memsz;
    uint64_t p_align;
};

struct Elf64_Dyn {
    int64_t d_tag;
    union {
        uint64_t d_val;
        uint64_t d_ptr;
    } d_un;
};

struct Elf64_Sym {
    uint32_t st_name;
    unsigned char st_info;
    unsigned char st_other;
    uint16_t st_shndx;
    uint64_t st_value;
    uint64_t st_size;
};
#pragma pack(pop)

uint64_t VaddrToOffset(uint64_t vaddr, const vector<Elf64_Phdr> &phdrs) {
    for (const auto &phdr : phdrs) {
        if (vaddr >= phdr.p_vaddr && vaddr < phdr.p_vaddr + phdr.p_memsz) {
            return vaddr - phdr.p_vaddr + phdr.p_offset;
        }
    }
    return 0;
}

ELF_ANALYSIS_RESULT analyzeELF(const vector<uint8_t> &data) {
    ELF_ANALYSIS_RESULT result = {false, 0, ""};

    if (data.size() < sizeof(Elf64_Ehdr)) return result;

    const unsigned char *e_ident = data.data();
    if (e_ident[0] != 0x7F || e_ident[1] != 'E' || e_ident[2] != 'L' || e_ident[3] != 'F') {
        return result;
    }

    result.isELF = true;

    if (e_ident[4] != 2) { // 1=32bit, 2=64bit
        cout << "    [!] 32-bit ELF analysis is currently limited. Assuming basic characteristics." << endl;
        // For brevity, fully supporting 64-bit primarily.
        return result;
    }

    Elf64_Ehdr ehdr;
    memcpy(&ehdr, data.data(), sizeof(Elf64_Ehdr));

    if (ehdr.e_phoff + ehdr.e_phnum * ehdr.e_phentsize > data.size()) return result;

    vector<Elf64_Phdr> phdrs;
    uint64_t dyn_offset = 0;
    uint64_t dyn_size = 0;

    cout << "[+] Parsing ELF Program Headers (" << ehdr.e_phnum << " found)..." << endl;
    for (int i = 0; i < ehdr.e_phnum; ++i) {
        Elf64_Phdr phdr;
        memcpy(&phdr, &data[ehdr.e_phoff + i * ehdr.e_phentsize], sizeof(Elf64_Phdr));
        phdrs.push_back(phdr);

        if ((phdr.p_flags & PF_W) && (phdr.p_flags & PF_X)) {
             cout << "    [!] ALERT: Suspicious segment found: Executable and Writable (WX)" << endl;
             result.scoreModifier += 10;
        }

        if (phdr.p_type == PT_DYNAMIC) {
            dyn_offset = phdr.p_offset;
            dyn_size = phdr.p_filesz;
        }
    }

    if (dyn_offset > 0 && dyn_offset + dyn_size <= data.size()) {
        cout << "[+] Analyzing ELF Dynamic Section..." << endl;
        
        uint64_t strtab_vaddr = 0;
        uint64_t symtab_vaddr = 0;
        uint64_t strsz = 0;
        uint64_t syment = sizeof(Elf64_Sym);

        // Find STRTAB and SYMTAB
        for (uint64_t offset = dyn_offset; offset < dyn_offset + dyn_size; offset += sizeof(Elf64_Dyn)) {
            Elf64_Dyn dyn;
            memcpy(&dyn, &data[offset], sizeof(Elf64_Dyn));
            if (dyn.d_tag == DT_NULL) break;
            if (dyn.d_tag == DT_STRTAB) strtab_vaddr = dyn.d_un.d_ptr;
            if (dyn.d_tag == DT_SYMTAB) symtab_vaddr = dyn.d_un.d_ptr;
            if (dyn.d_tag == DT_STRSZ) strsz = dyn.d_un.d_val;
            if (dyn.d_tag == DT_SYMENT) syment = dyn.d_un.d_val;
        }

        if (strtab_vaddr && symtab_vaddr) {
            uint64_t strtab_offset = VaddrToOffset(strtab_vaddr, phdrs);
            uint64_t symtab_offset = VaddrToOffset(symtab_vaddr, phdrs);

            if (strtab_offset > 0 && symtab_offset > 0) {
                string importedFunctionsStr = "";
                
                // Read symbols until we hit the end of file roughly
                for (uint64_t offset = symtab_offset; offset < data.size() && offset < symtab_offset + 1000 * syment; offset += syment) {
                    if (offset + sizeof(Elf64_Sym) > data.size()) break;
                    Elf64_Sym sym;
                    memcpy(&sym, &data[offset], sizeof(Elf64_Sym));
                    
                    if (sym.st_name != 0 && strtab_offset + sym.st_name < data.size()) {
                        size_t len = 0;
                        while (strtab_offset + sym.st_name + len < data.size() && data[strtab_offset + sym.st_name + len] != '\0' && len < 256) {
                            len++;
                        }
                        string funcName((char*)&data[strtab_offset + sym.st_name], len);
                        
                        // Dynamic symbols include both exports and imports. Usually imports have st_shndx == 0 (SHN_UNDEF)
                        if (sym.st_shndx == 0 && !funcName.empty()) {
                            importedFunctionsStr += toLower(funcName);

                            vector<string> suspiciousAPIs = {
                                "mprotect", "ptrace", "execve", "system", "fork", "memfd_create", "dlopen"
                            };

                            for (const auto &api : suspiciousAPIs) {
                                if (funcName == api) {
                                    cout << "    [!] ALERT: Suspicious function imported: " << funcName << endl;
                                    result.scoreModifier += 5;
                                    break;
                                }
                            }
                        }
                    }
                }

                if (!importedFunctionsStr.empty()) {
                    result.impHash = calculateMD5(importedFunctionsStr);
                    cout << "    ELF ImpHash: " << result.impHash << endl;
                }
            }
        }
    }

    return result;
}
