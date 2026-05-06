"use client";

import { useState } from "react";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { SignalIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { MONAD_GUARD_ABI, MONAD_GUARD_ADDRESS } from "~~/utils/monadGuard";

function formatDistanceToNow(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `${Math.max(0, seconds)} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

const ThreatFeed: NextPage = () => {
  const [rewarding, setRewarding] = useState<string | null>(null);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const { address } = useAccount();
  const { data: contractOwner } = useReadContract({
    address: MONAD_GUARD_ADDRESS,
    abi: MONAD_GUARD_ABI,
    functionName: "owner",
  });
  const isOwner = address?.toLowerCase() === (contractOwner as string)?.toLowerCase();

  const { writeContractAsync } = useWriteContract();

  // Feature 2: Persistent history — fetch from block 0
  const { data: historicalEvents, isLoading } = useScaffoldEventHistory({
    contractName: "MonadGuard",
    eventName: "ThreatLogged",
    fromBlock: 0n,
    blockData: true,
  });

  // Build deduplicated, sorted event list
  const events = (historicalEvents ?? [])
    .slice()
    .sort((a, b) => Number((b.block?.number ?? 0n) - (a.block?.number ?? 0n)))
    .slice(0, 50);

  // Feature 3: Critical alert banner
  const now = Date.now();
  const last24h = now - 24 * 60 * 60 * 1000;
  const criticalCount = events.filter(ev => {
    const ts = ev.block?.timestamp ? Number(ev.block.timestamp) * 1000 : 0;
    return ts >= last24h && (ev.args.score ?? 0) >= 75;
  }).length;

  const getScoreColor = (score: number) => {
    if (score >= 75) return "bg-error text-error-content shadow-[0_0_10px_rgba(239,68,68,0.5)]";
    if (score >= 40) return "bg-warning text-warning-content shadow-[0_0_10px_rgba(245,158,11,0.5)]";
    return "bg-success text-success-content shadow-[0_0_10px_rgba(16,185,129,0.5)]";
  };

  const truncateHash = (hash: string) => {
    if (!hash) return "...";
    return hash.substring(0, 10) + "..." + hash.substring(hash.length - 8);
  };

  const handleReward = async (hash: string) => {
    try {
      setRewarding(hash);
      await writeContractAsync({
        address: MONAD_GUARD_ADDRESS,
        abi: MONAD_GUARD_ABI,
        functionName: "rewardSubmitter",
        args: [hash as `0x${string}`],
      });
    } catch (e) {
      console.error("Failed to reward:", e);
    } finally {
      setRewarding(null);
    }
  };

  return (
    <div className="flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 grow">
      <div className="w-full max-w-6xl">
        {/* Feature 3: High severity alert banner */}
        {criticalCount > 0 && !alertDismissed && (
          <div className="flex items-center justify-between gap-4 mb-6 px-5 py-3 rounded-xl border border-error/40 bg-error/10 text-error shadow-[0_0_20px_rgba(239,68,68,0.15)]">
            <span className="text-sm font-semibold">
              ⚠ {criticalCount} critical 0-day threat{criticalCount > 1 ? "s" : ""} detected in the last 24h
            </span>
            <button
              onClick={() => setAlertDismissed(true)}
              className="btn btn-ghost btn-xs text-error"
              aria-label="Dismiss alert"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-end mb-8 border-b border-base-300 pb-4">
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Live Threat Feed
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-error"></span>
              </div>
            </h2>
            <p className="mt-2 text-base-content/70">Real-time stream of 0-day threats staked on Monad Testnet.</p>
          </div>

          <div className="mt-4 sm:mt-0 flex items-center gap-2 bg-base-200 px-4 py-2 rounded-full border border-base-300 shadow-inner">
            <SignalIcon className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-xs font-medium uppercase tracking-wider text-base-content/80">
              Listening for Events
            </span>
          </div>
        </div>

        <div className="bg-base-200/50 backdrop-blur-md rounded-2xl border border-base-300 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full text-left">
              <thead className="bg-base-300 text-base-content font-semibold uppercase tracking-wider text-xs border-b border-base-300/50">
                <tr>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Threat Hash</th>
                  <th className="px-6 py-4">Family</th>
                  <th className="px-6 py-4">Submitter</th>
                  <th className="px-6 py-4">Time Logged</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-base-content/50">
                      <span className="loading loading-spinner loading-lg text-primary"></span>
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-base-content/50">
                      Waiting for threats to be logged...
                    </td>
                  </tr>
                ) : (
                  events.map((ev, idx) => {
                    const ts = ev.block?.timestamp ? new Date(Number(ev.block.timestamp) * 1000) : new Date();
                    const isRewarded = false; // read from contract if needed
                    return (
                      <tr key={idx} className="hover:bg-base-300/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center justify-center min-w-[3rem] ${getScoreColor(ev.args.score ?? 0)}`}
                          >
                            {ev.args.score}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm text-base-content/90">
                            {truncateHash(ev.args.hash ?? "")}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="bg-base-300 border border-base-100 px-2 py-1 rounded text-xs font-medium text-base-content/80">
                            {ev.args.family}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Address address={ev.args.submitter as `0x${string}`} format="short" />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-base-content/60">
                          {formatDistanceToNow(ts)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {isRewarded ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success/20 text-success text-xs font-bold border border-success/30">
                              ✓ Rewarded
                            </span>
                          ) : isOwner ? (
                            <button
                              className="btn btn-sm btn-outline btn-primary text-xs tooltip tooltip-left"
                              data-tip="Reward 20 MON (Admin)"
                              onClick={() => handleReward(ev.args.hash ?? "")}
                              disabled={rewarding === ev.args.hash}
                            >
                              {rewarding === ev.args.hash ? (
                                <span className="loading loading-spinner loading-xs"></span>
                              ) : (
                                "Reward"
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-base-content/50 italic">Awaiting Admin</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreatFeed;
