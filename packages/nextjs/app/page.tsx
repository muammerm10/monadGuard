"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { ShieldCheckIcon, ChartBarIcon, CurrencyDollarIcon, ArrowRightIcon } from "@heroicons/react/24/outline";

const Home: NextPage = () => {
  return (
    <>
      <div className="flex items-center flex-col grow pt-16 pb-20 px-4">
        <div className="max-w-4xl w-full mx-auto text-center">
          <div className="inline-flex items-center justify-center space-x-2 bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 rounded-full mb-8">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm font-medium tracking-wide uppercase">Monad Testnet Live</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-white">
            Decentralized <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">0-Day Threat</span> Registry
          </h1>
          
          <p className="text-lg md:text-xl text-base-content/80 max-w-2xl mx-auto mb-10 leading-relaxed">
            MonadGuard is a community-driven malware threat registry powered by the Monad blockchain. Stake MON, report zero-day threats, and earn rewards for securing the ecosystem.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link 
              href="/submit" 
              className="btn btn-primary btn-lg rounded-full px-8 shadow-[0_0_20px_rgba(123,63,228,0.4)] hover:shadow-[0_0_30px_rgba(123,63,228,0.6)] border-none text-white w-full sm:w-auto"
            >
              Submit Threat <ArrowRightIcon className="w-5 h-5 ml-2" />
            </Link>
            <Link 
              href="/lookup" 
              className="btn btn-outline btn-lg rounded-full px-8 text-white border-base-300 hover:bg-base-300 hover:border-base-300 w-full sm:w-auto"
            >
              Hash Lookup
            </Link>
          </div>
        </div>

        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-base-200/50 backdrop-blur-sm border border-base-300 rounded-3xl p-8 flex flex-col items-center text-center hover:border-primary/50 transition-colors duration-300">
            <div className="p-4 bg-primary/10 rounded-2xl mb-4">
              <ShieldCheckIcon className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-4xl font-bold text-white mb-2 mono">1,204</h3>
            <p className="text-base-content/60 font-medium">Total Threats Logged</p>
          </div>
          
          <div className="bg-base-200/50 backdrop-blur-sm border border-base-300 rounded-3xl p-8 flex flex-col items-center text-center hover:border-primary/50 transition-colors duration-300">
            <div className="p-4 bg-primary/10 rounded-2xl mb-4">
              <ChartBarIcon className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-4xl font-bold text-white mb-2 mono">42</h3>
            <p className="text-base-content/60 font-medium">Recent 24h Activity</p>
          </div>
          
          <div className="bg-base-200/50 backdrop-blur-sm border border-base-300 rounded-3xl p-8 flex flex-col items-center text-center hover:border-primary/50 transition-colors duration-300">
            <div className="p-4 bg-primary/10 rounded-2xl mb-4">
              <CurrencyDollarIcon className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-4xl font-bold text-white mb-2 mono">12,040 MON</h3>
            <p className="text-base-content/60 font-medium">Total Stake Pool</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
