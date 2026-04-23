"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { useReadContract } from "wagmi";
import { MagnifyingGlassIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { MONAD_GUARD_ADDRESS, MONAD_GUARD_ABI } from "~~/utils/monadGuard";

const HashLookup: NextPage = () => {
  const [searchInput, setSearchInput] = useState("");
  const [queryHash, setQueryHash] = useState<`0x${string}` | undefined>(undefined);

  const { data: isKnown, isFetching, error } = useReadContract({
    address: MONAD_GUARD_ADDRESS,
    abi: MONAD_GUARD_ABI,
    functionName: "threats",
    args: queryHash ? [queryHash] : undefined,
    query: {
      enabled: !!queryHash,
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    let formattedHash = searchInput.trim();
    if (!formattedHash.startsWith("0x")) {
      formattedHash = "0x" + formattedHash;
    }

    if (formattedHash.length !== 66) {
      alert("Invalid SHA-256 hash format.");
      return;
    }

    setQueryHash(formattedHash as `0x${string}`);
  };

  return (
    <div className="flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 grow">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-extrabold text-white tracking-tight mb-4">Hash Lookup</h2>
          <p className="text-base-content/70 text-lg">
            Check if a specific SHA-256 file hash is flagged as a 0-day threat in the Monad registry.
          </p>
        </div>

        <div className="bg-base-200/50 backdrop-blur-md rounded-3xl p-6 border border-base-300 shadow-xl mb-8">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="relative grow">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-base-content/50" />
              </div>
              <input
                type="text"
                placeholder="Enter 64-character SHA-256 hex..."
                className="input input-lg input-bordered w-full pl-12 bg-base-100 border-base-300 focus:border-primary focus:ring-1 focus:ring-primary font-mono text-sm shadow-inner"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary btn-lg shadow-[0_0_15px_rgba(123,63,228,0.3)] hover:shadow-[0_0_20px_rgba(123,63,228,0.5)] border-none shrink-0"
              disabled={isFetching}
            >
              {isFetching ? <span className="loading loading-spinner"></span> : "Scan Hash"}
            </button>
          </form>
        </div>

        {queryHash && !isFetching && !error && (
          <div className="animate-fadeIn">
            {isKnown ? (
              <div className="bg-error/10 border border-error/30 rounded-2xl p-8 flex flex-col items-center text-center shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                <div className="h-20 w-20 bg-error/20 rounded-full flex items-center justify-center mb-4">
                  <XCircleIcon className="h-12 w-12 text-error" />
                </div>
                <h3 className="text-2xl font-bold text-error mb-2">Threat Detected!</h3>
                <p className="text-base-content mb-4 max-w-xl">
                  This hash is recorded in the MonadGuard registry as a known 0-day threat. Exercise extreme caution.
                </p>
                <div className="bg-base-100/50 p-4 rounded-xl w-full border border-error/20">
                  <p className="text-xs text-base-content/50 uppercase tracking-widest mb-1">Queried Hash</p>
                  <p className="font-mono text-sm text-error break-all">{queryHash}</p>
                </div>
              </div>
            ) : (
              <div className="bg-success/10 border border-success/30 rounded-2xl p-8 flex flex-col items-center text-center shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                <div className="h-20 w-20 bg-success/20 rounded-full flex items-center justify-center mb-4">
                  <CheckCircleIcon className="h-12 w-12 text-success" />
                </div>
                <h3 className="text-2xl font-bold text-success mb-2">No Threat Found</h3>
                <p className="text-base-content mb-4 max-w-xl">
                  This hash is not currently in the MonadGuard registry. Note that this does not guarantee the file is safe, only that it is unknown to this registry.
                </p>
                <div className="bg-base-100/50 p-4 rounded-xl w-full border border-success/20">
                  <p className="text-xs text-base-content/50 uppercase tracking-widest mb-1">Queried Hash</p>
                  <p className="font-mono text-sm text-success break-all">{queryHash}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-error/10 border border-error/20 rounded-xl p-6 text-center">
            <p className="text-error font-medium">Error fetching data from the blockchain.</p>
            <p className="text-sm text-error/70 mt-2">{error.message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HashLookup;
