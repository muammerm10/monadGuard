"use client";

import { useState, useEffect } from "react";
import type { NextPage } from "next";
import { useWatchContractEvent } from "wagmi";
import { Address } from "@scaffold-ui/components";
import { SignalIcon } from "@heroicons/react/24/outline";
import { MONAD_GUARD_ADDRESS, MONAD_GUARD_ABI } from "~~/utils/monadGuard";

type ThreatEvent = {
  hash: string;
  score: number;
  family: string;
  submitter: string;
  timestamp: Date;
};

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
  const [events, setEvents] = useState<ThreatEvent[]>([]);

  // Watch for new ThreatLogged events
  useWatchContractEvent({
    address: MONAD_GUARD_ADDRESS,
    abi: MONAD_GUARD_ABI,
    eventName: "ThreatLogged",
    onLogs(logs) {
      const newEvents: ThreatEvent[] = logs.map((log: any) => ({
        hash: log.args.hash,
        score: log.args.score,
        family: log.args.family,
        submitter: log.args.submitter,
        timestamp: new Date(), // Local timestamp as fallback
      }));
      
      setEvents(prev => [...newEvents, ...prev].slice(0, 50)); // Keep last 50
    },
  });

  // Mock data for initial view if no events (optional, for demonstration)
  useEffect(() => {
    if (events.length === 0) {
      setEvents([
        {
          hash: "0x8d5c2e0b5f134a690e8f7c9e1f13b1a9e8f7c9e1f13b1a9e8f7c9e1f13b1a9f2",
          score: 85,
          family: "Ransomware",
          submitter: "0x1234567890123456789012345678901234567890",
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
        },
        {
          hash: "0x3a1be4d90e8f7c9e1f13b1a9e8f7c9e1f13b1a9e8f7c9e1f13b1a9e8f7c9e1f1",
          score: 60,
          family: "Trojan",
          submitter: "0xabcdef0123456789abcdef0123456789abcdef01",
          timestamp: new Date(Date.now() - 1000 * 60 * 45),
        },
        {
          hash: "0xc7f211b30e8f7c9e1f13b1a9e8f7c9e1f13b1a9e8f7c9e1f13b1a9e8f7c9e1f1",
          score: 25,
          family: "Spyware",
          submitter: "0x9876543210987654321098765432109876543210",
          timestamp: new Date(Date.now() - 1000 * 60 * 120),
        }
      ]);
    }
  }, []);

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
              Live Threat Feed
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-error"></span>
              </div>
            </h2>
            <p className="mt-2 text-base-content/70">
              Real-time stream of 0-day threats staked on Monad Testnet.
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0 flex items-center gap-2 bg-base-200 px-4 py-2 rounded-full border border-base-300 shadow-inner">
            <SignalIcon className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-xs font-medium uppercase tracking-wider text-base-content/80">Listening for Events</span>
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
                  <th className="px-6 py-4 text-right">Time Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-300/50">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-base-content/50">
                      Waiting for threats to be logged...
                    </td>
                  </tr>
                ) : (
                  events.map((ev, idx) => (
                    <tr key={idx} className="hover:bg-base-300/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center justify-center min-w-[3rem] ${getScoreColor(ev.score)}`}>
                          {ev.score}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm text-base-content/90">{truncateHash(ev.hash)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="bg-base-300 border border-base-100 px-2 py-1 rounded text-xs font-medium text-base-content/80">
                          {ev.family}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Address address={ev.submitter} format="short" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-base-content/60">
                        {formatDistanceToNow(ev.timestamp)}
                      </td>
                    </tr>
                  ))
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
