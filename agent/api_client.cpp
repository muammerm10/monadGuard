#include "api_client.h"
#include <curl/curl.h>
#include <iostream>

using namespace std;

size_t WriteCallback(void *contents, size_t size, size_t nmemb, void *userp) {
  ((string *)userp)->append((char *)contents, size * nmemb);
  return size * nmemb;
}

string queryMalwareBazaar(const string &hash) {
  CURL *curl;
  CURLcode res;
  string readBuffer;

  curl = curl_easy_init();
  if (curl) {
    curl_easy_setopt(curl, CURLOPT_URL, "https://mb-api.abuse.ch/api/v1/");
    string postData = "query=get_info&hash=" + hash;
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, postData.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &readBuffer);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);

    res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
      cerr << "    [-] cURL error: " << curl_easy_strerror(res) << endl;
    }
    curl_easy_cleanup(curl);
  }
  return readBuffer;
}

bool parseBazaarResponse(const string &response, string &family) {
  // Basic string search for JSON parsing to avoid external dependencies
  if (response.find("\"query_status\": \"ok\"") != string::npos ||
      response.find("\"query_status\":\"ok\"") != string::npos) {
    size_t sigPos = response.find("\"signature\"");
    if (sigPos != string::npos) {
      size_t colonPos = response.find(":", sigPos);
      if (colonPos != string::npos) {
        size_t start = response.find("\"", colonPos);
        if (start != string::npos) {
          size_t end = response.find("\"", start + 1);
          if (end != string::npos) {
            family = response.substr(start + 1, end - start - 1);
            if (family == "null") {
              family = "Unknown Signature";
            }
            return true;
          }
        }
      }
    }
    family = "Known Malware";
    return true;
  }
  return false;
}
