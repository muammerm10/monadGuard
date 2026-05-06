"use client";

import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { useScaffoldEventHistory, useScaffoldReadContract } from "~~/hooks/scaffold-eth";

type SubmissionStatusProps = {
  hash: string;
};

// Component to fetch the status of an individual hash
const SubmissionStatus = ({ hash }: SubmissionStatusProps) => {
  const { data: isRewarded, isLoading: isRewardedLoading } = useScaffoldReadContract({
    contractName: "MonadGuard",
    functionName: "isRewarded",
    args: [hash as `0x${string}`],
  });

  const { data: isRejected, isLoading: isRejectedLoading } = useScaffoldReadContract({
    contractName: "MonadGuard",
    functionName: "isRejected",
    args: [hash as `0x${string}`],
  });

  if (isRewardedLoading || isRejectedLoading) {
    return <span className="loading loading-dots loading-xs"></span>;
  }

  if (isRewarded) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success/20 text-success text-xs font-bold border border-success/30">
        ✓ Rewarded
      </span>
    );
  }

  // Assuming `isRejected` is the name of the mapping
  if (isRejected) {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-error/20 text-error text-xs font-bold border border-error/30">
          ✗ Rejected
        </span>
        <span className="text-[10px] text-base-content/50">Stake returned</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-warning/20 text-warning text-xs font-bold border border-warning/30">
        ⧖ Pending
      </span>
      <span className="text-[10px] text-base-content/50">10 MON locked</span>
    </div>
  );
};

const MySubmissions: NextPage = () => {
  const { address } = useAccount();

  const { data: events, isLoading } = useScaffoldEventHistory({
    contractName: "MonadGuard",
    eventName: "ThreatLogged",
    fromBlock: 0n,
    filters: { submitter: address },
    blockData: true,
  });

  const getScoreColor = (score: number) => {
    if (score >= 75) return "bg-error text-error-content shadow-[0_0_10px_rgba(239,68,68,0.5)]";
    if (score >= 40) return "bg-warning text-warning-content shadow-[0_0_10px_rgba(245,158,11,0.5)]";
    return "bg-success text-success-content shadow-[0_0_10px_rgba(16,185,129,0.5)]";
  };

  const truncateHash = (hash: string) => {
    return hash.substring(0, 10) + "..." + hash.substring(hash.length - 8);
  };

  return (
    <div className="flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 grow">
      <div className="w-full max-w-6xl">
        <div className="flex flex-col sm:flex-row justify-between items-end mb-8 border-b border-base-300 pb-4">
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              My Submissions
            </h2>
            <p className="mt-2 text-base-content/70">Track your staked 0-day threats and rewards.</p>
          </div>

          <div className="mt-4 sm:mt-0 flex items-center gap-2">
            <span className="text-sm text-base-content/80">Wallet:</span>
            {address ? <Address address={address} /> : <span className="text-sm text-error">Not Connected</span>}
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
                  <th className="px-6 py-4">Time Logged</th>
                  <th className="px-6 py-4 text-right">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-base-content/50">
                      <span className="loading loading-spinner loading-lg text-primary"></span>
                    </td>
                  </tr>
                ) : !events || events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-base-content/50">
                      You haven&apos;t submitted any threats yet.
                    </td>
                  </tr>
                ) : (
                  events.map((ev, idx) => {
                    const blockTimestamp = ev.block?.timestamp
                      ? new Date(Number(ev.block.timestamp) * 1000)
                      : new Date();
                    return (
                      <tr key={idx} className="hover:bg-base-300/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center justify-center min-w-[3rem] ${getScoreColor(
                              ev.args.score || 0,
                            )}`}
                          >
                            {ev.args.score}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm text-base-content/90">
                            {truncateHash(ev.args.hash || "")}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="bg-base-300 border border-base-100 px-2 py-1 rounded text-xs font-medium text-base-content/80">
                            {ev.args.family}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-base-content/60">
                          {blockTimestamp.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <SubmissionStatus hash={ev.args.hash as string} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            className="btn btn-sm btn-outline btn-disabled text-xs tooltip tooltip-left"
                            data-tip="Waiting for admin verification"
                            disabled
                          >
                            Claim
                          </button>
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

export default MySubmissions;
