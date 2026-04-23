#include <iostream>
#include <windows.h>
#include <vector>
#include <cstdlib>

int main() {
    // MonadGuard 0-Day Simulator (Harmless PoC)
    // Amacımız zararlı davranmak değil, Heuristic Engine'in "Tier 1" API 
    // kontrollerine takılarak skoru >60% (HIGH RISK) seviyesine çıkarmaktır.

    // 1. TIER 1 API'leri IAT'ye (Import Address Table) ekletmek için
    // fonksiyonların adreslerini alıyoruz ama asla çalıştırmıyoruz.
    void* fakePtr1 = (void*)&VirtualAllocEx;
    void* fakePtr2 = (void*)&WriteProcessMemory;
    void* fakePtr3 = (void*)&CreateRemoteThread;

    if (fakePtr1 && fakePtr2 && fakePtr3) {
        std::cout << "[Simulator] Tier 1 API'ler IAT'ye eklendi." << std::endl;
    }

    // 2. TIER 2 API'yi de ekleyelim garanti olsun (+15 Puan)
    void* fakePtr4 = (void*)&SetWindowsHookExA;

    // 3. Yüksek Entropi (Karmaşıklık) yaratmak için rastgele baytlar (+30 Puan)
    std::vector<char> highEntropyData;
    for(int i = 0; i < 50000; i++) {
        highEntropyData.push_back((char)(rand() % 256));
    }

    std::cout << "[Simulator] Zararsiz islem basliyor..." << std::endl;
    Sleep(500); // TIER 1 API: SuspendThread / Sleep benzeri basit bekleme.

    // Sadece masum bir ekrana uyarı basıyoruz.
    MessageBoxA(NULL, "MonadGuard 0-Day Simulator Calisiyor! (Sistem Guvende)", "0-Day PoC", MB_OK | MB_ICONINFORMATION);

    return 0;
}