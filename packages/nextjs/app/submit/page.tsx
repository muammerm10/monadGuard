"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { parseEther } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import toast from "react-hot-toast";
import { ExclamationTriangleIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { MONAD_GUARD_ADDRESS, MONAD_GUARD_ABI } from "~~/utils/monadGuard";

const FAMILIES = [
  "UNKNOWN", "Ransomware", "Trojan", "Rootkit", "Worm", 
  "Spyware", "Dropper", "Botnet", "Cryptominer"
];

const SubmitThreat: NextPage = () => {
  const [hash, setHash] = useState("");
  const [family, setFamily] = useState(FAMILIES[0]);
  const [score, setScore] = useState(50);

  const { data: hashData, isPending, writeContract } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: hashData,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let formattedHash = hash.trim();
    if (!formattedHash.startsWith("0x")) {
      formattedHash = "0x" + formattedHash;
    }

    if (formattedHash.length !== 66) {
      toast.error("Invalid SHA-256 hash. Must be 32 bytes (64 hex characters).");
      return;
    }

    try {
      writeContract({
        address: MONAD_GUARD_ADDRESS,
        abi: MONAD_GUARD_ABI,
        functionName: "submitThreat",
        args: [formattedHash as `0x${string}`, score, family],
        value: parseEther("10"),
      }, {
        onSuccess: () => {
          toast.success("Transaction submitted! Waiting for confirmation...");
        },
        onError: (error) => {
          console.error(error);
          toast.error("Transaction failed. Check console for details.");
        }
      });
    } catch (e) {
      console.error(e);
      toast.error("Error formatting submission parameters.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl bg-base-200/50 backdrop-blur-md rounded-3xl p-8 border border-base-300 shadow-2xl">
        <div className="text-center mb-10">
          <ShieldExclamationIcon className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-6 text-3xl font-extrabold text-white tracking-tight">Submit a New Threat</h2>
          <p className="mt-2 text-sm text-base-content/70">
            Log a 0-day malware signature on-chain to secure the Monad ecosystem.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-start space-x-3 mb-6">
            <ExclamationTriangleIcon className="h-6 w-6 text-warning shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-warning">Stake Requirement</h3>
              <p className="text-xs text-warning/80 mt-1">
                Submitting a threat requires exactly <strong className="font-bold text-warning">10 MON</strong> as collateral to prevent spam. This stake will be locked in the smart contract.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="hash" className="block text-sm font-medium text-base-content mb-2">
              SHA-256 Hash (bytes32)
            </label>
            <input
              id="hash"
              name="hash"
              type="text"
              required
              placeholder="0x..."
              className="input input-bordered w-full bg-base-100 border-base-300 focus:border-primary focus:ring-1 focus:ring-primary font-mono text-sm"
              value={hash}
              onChange={(e) => setHash(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="family" className="block text-sm font-medium text-base-content mb-2">
              Malware Family
            </label>
            <select
              id="family"
              name="family"
              className="select select-bordered w-full bg-base-100 border-base-300 focus:border-primary focus:ring-1 focus:ring-primary"
              value={family}
              onChange={(e) => setFamily(e.target.value)}
            >
              {FAMILIES.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="score" className="block text-sm font-medium text-base-content">
                0-Day Severity Score
              </label>
              <span className={`font-mono font-bold text-lg ${score >= 75 ? "text-error" : score >= 40 ? "text-warning" : "text-success"}`}>
                {score}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="range range-primary w-full"
            />
            <div className="w-full flex justify-between text-xs px-2 mt-2 text-base-content/50">
              <span>Low</span>
              <span>Medium</span>
              <span>Critical</span>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isPending || isConfirming}
              className="btn btn-primary w-full text-lg h-14 shadow-[0_0_15px_rgba(123,63,228,0.3)] hover:shadow-[0_0_25px_rgba(123,63,228,0.5)] border-none"
            >
              {isPending ? (
                <span className="loading loading-spinner"></span>
              ) : isConfirming ? (
                <span>Confirming...</span>
              ) : (
                <span>Submit Threat & Stake 10 MON</span>
              )}
            </button>
          </div>
        </form>

        {isConfirmed && (
          <div className="mt-6 bg-success/10 border border-success/20 rounded-xl p-4 text-center">
            <p className="text-success font-medium">Threat logged successfully!</p>
            <p className="text-xs text-success/70 mt-1 mono break-all">TX Hash: {hashData}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmitThreat;
