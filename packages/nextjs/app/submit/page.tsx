"use client";

import { useState, useRef } from "react";
import type { NextPage } from "next";
import { parseEther } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import toast from "react-hot-toast";
import { ExclamationTriangleIcon, ShieldExclamationIcon, DocumentArrowUpIcon, CpuChipIcon } from "@heroicons/react/24/outline";
import { MONAD_GUARD_ADDRESS, MONAD_GUARD_ABI } from "~~/utils/monadGuard";

const SubmitThreat: NextPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [hash, setHash] = useState("");
  const [family, setFamily] = useState("");
  const [score, setScore] = useState(0);
  const [isKnown, setIsKnown] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: hashData, isPending, writeContract } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: hashData,
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setAnalysisDone(false);
    setIsKnown(false);
    await analyzeFile(selectedFile);
  };

  const analyzeFile = async (selectedFile: File) => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setHash(data.hash);
      setScore(data.score);
      setFamily(data.family || "UNKNOWN");
      setIsKnown(data.isKnown || false);
      setAnalysisDone(true);
      toast.success("Heuristic analysis completed!");

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to analyze the file.");
      setFile(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!hash || hash.length !== 66) {
      toast.error("Invalid SHA-256 hash.");
      return;
    }

    try {
      writeContract({
        address: MONAD_GUARD_ADDRESS,
        abi: MONAD_GUARD_ABI,
        functionName: "submitThreat",
        args: [hash as `0x${string}`, score, family],
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
            Drag and drop a PE or ELF file to run the C++ Heuristics Engine.
          </p>
        </div>

        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-start space-x-3 mb-6">
          <ExclamationTriangleIcon className="h-6 w-6 text-warning shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-warning">Stake Requirement</h3>
            <p className="text-xs text-warning/80 mt-1">
              Submitting a threat requires exactly <strong className="font-bold text-warning">10 MON</strong> as collateral to prevent spam. This stake will be locked in the smart contract.
            </p>
          </div>
        </div>

        {!analysisDone ? (
          <div 
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${isDragging ? "border-primary bg-primary/10" : "border-base-300 hover:border-primary/50 hover:bg-base-300/30"} ${isAnalyzing ? "opacity-50 pointer-events-none" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              accept=".exe,.elf" 
            />
            
            {isAnalyzing ? (
              <div className="flex flex-col items-center">
                <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
                <p className="text-lg font-medium text-white">Running 0-Day Heuristics Analysis...</p>
                <p className="text-sm text-base-content/60 mt-2">Invoking native C++ agent...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <DocumentArrowUpIcon className="h-16 w-16 text-base-content/40 mb-4" />
                <p className="text-lg font-medium text-white">Click or drag an executable here</p>
                <p className="text-sm text-base-content/60 mt-2">Supports Windows PE (.exe) and Linux ELF</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-base-300/50 rounded-xl p-6 border border-base-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <CpuChipIcon className="h-24 w-24 text-primary/10" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-4 relative z-10 flex items-center gap-2">
                <CpuChipIcon className="h-6 w-6 text-primary" />
                Analysis Results
              </h3>
              
              <div className="space-y-4 relative z-10">
                <div>
                  <p className="text-xs text-base-content/60 uppercase tracking-wider mb-1">File Name</p>
                  <p className="font-medium text-base-content">{file?.name}</p>
                </div>
                
                <div>
                  <p className="text-xs text-base-content/60 uppercase tracking-wider mb-1">SHA-256 Hash</p>
                  <p className="font-mono text-sm text-primary break-all">{hash}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-base-content/60 uppercase tracking-wider mb-1">0-Day Severity Score</p>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold inline-block ${score >= 75 ? "bg-error text-error-content" : score >= 40 ? "bg-warning text-warning-content" : "bg-success text-success-content"}`}>
                      {score} / 100
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-base-content/60 uppercase tracking-wider mb-1">Malware Family</p>
                    <p className="font-medium text-base-content">{family}</p>
                  </div>
                </div>
              </div>
            </div>

            {isKnown ? (
              <div className="bg-error/10 border border-error/30 rounded-xl p-4 text-center">
                <p className="text-error font-bold">Threat is already known to Oracle (MalwareBazaar).</p>
                <p className="text-sm text-error/80 mt-1">Cannot stake on a known threat.</p>
                <button className="btn btn-outline btn-error mt-4" onClick={() => setAnalysisDone(false)}>
                  Scan Another File
                </button>
              </div>
            ) : (
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setAnalysisDone(false)}
                  className="btn btn-outline border-base-300 flex-1"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isPending || isConfirming}
                  className="btn btn-primary flex-[2] text-lg h-14 shadow-[0_0_15px_rgba(123,63,228,0.3)] hover:shadow-[0_0_25px_rgba(123,63,228,0.5)] border-none"
                >
                  {isPending ? (
                    <span className="loading loading-spinner"></span>
                  ) : isConfirming ? (
                    <span>Confirming...</span>
                  ) : (
                    <span>Stake 10 MON & Log Threat</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

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
