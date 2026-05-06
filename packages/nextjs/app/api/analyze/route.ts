import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { runHeuristics } from "~~/utils/heuristics";

const execAsync = promisify(exec);

// In-memory rate limiter: IP -> { count, resetTime }
const ipRequests = new Map<string, { count: number; resetTime: number }>();

export async function POST(req: NextRequest) {
  try {
    // Rate Limiting
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    if (ipRequests.has(ip)) {
      const data = ipRequests.get(ip)!;
      if (now > data.resetTime) {
        ipRequests.set(ip, { count: 1, resetTime: now + 60000 });
      } else {
        if (data.count >= 5) {
          return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
        }
        data.count++;
      }
    } else {
      ipRequests.set(ip, { count: 1, resetTime: now + 60000 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length < 4) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }

    // Magic bytes validation
    const isPE = buffer[0] === 0x4d && buffer[1] === 0x5a; // MZ
    const isELF = buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46; // \x7F ELF

    if (!isPE && !isELF) {
      return NextResponse.json(
        { error: "Unsupported file format. Only PE (MZ) and ELF (\\x7F ELF) are supported." },
        { status: 400 },
      );
    }

    // Compute SHA-256 hash (always needed)
    const cleanHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const hexHash = "0x" + cleanHash;

    // Query MalwareBazaar first — works in all environments
    let isKnown = false;
    let family = "UNKNOWN";
    try {
      const mbParams = new URLSearchParams();
      mbParams.append("query", "get_info");
      mbParams.append("hash", cleanHash);

      const mbResponse = await fetch("https://mb-api.abuse.ch/api/v1/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: mbParams.toString(),
      });

      const mbData = await mbResponse.json();
      if (mbData.query_status === "ok" && mbData.data && mbData.data.length > 0) {
        isKnown = true;
        family = mbData.data[0].signature || "UNKNOWN";
      }
    } catch (mbErr) {
      console.warn("[API] MalwareBazaar query failed:", mbErr);
    }

    // If already known in MalwareBazaar, return immediately (score = 100)
    if (isKnown) {
      return NextResponse.json({
        hash: hexHash,
        score: 100,
        family,
        isKnown: true,
        isCheapClone: false,
        simulated: false,
      });
    }

    // Try the compiled C++ agent first (local dev / self-hosted)
    const agentBinary = process.platform === "win32" ? "monadGuardAgent.exe" : "monadGuardAgent";
    const agentPath = path.resolve(process.cwd(), "../../agent", agentBinary);

    let result;

    if (fs.existsSync(agentPath)) {
      // ── Native C++ agent path ──────────────────────────────────────────────
      const tempDir = os.tmpdir();
      const safeId = crypto.randomUUID();
      const tempFilePath = path.join(tempDir, `monadguard_${safeId}`);

      try {
        fs.writeFileSync(tempFilePath, buffer);
        const { stdout } = await execAsync(`"${agentPath}" --api "${tempFilePath}"`);
        const agentResult = JSON.parse(stdout.trim());

        result = {
          hash: hexHash,
          score: agentResult.score ?? 0,
          family: agentResult.family || "UNKNOWN",
          isKnown: agentResult.isKnown || false,
          isCheapClone: agentResult.isCheapClone || false,
          simulated: false,
        };
      } catch (e: any) {
        console.error("[API] C++ agent execution failed:", e);
        // Fall through to TypeScript heuristics
      } finally {
        try {
          if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        } catch {
          /* ignore cleanup errors */
        }
      }
    }

    if (!result) {
      // ── TypeScript Heuristics Engine (Vercel-compatible) ──────────────────
      // This is a direct port of the C++ agent logic — NOT a simulation.
      console.info("[API] Using TypeScript heuristics engine (Vercel-compatible).");

      const hResult = runHeuristics(buffer);

      result = {
        hash: hexHash,
        score: hResult.score,
        family: "UNKNOWN",
        isKnown: false,
        isCheapClone: hResult.isCheapClone,
        simulated: false, // Real analysis — not simulated!
        details: hResult.details,
        fileType: hResult.fileType,
        entropy: parseFloat(hResult.entropy.toFixed(2)),
      };
    }

    const resultWithError = result as typeof result & { error?: string };
    if (resultWithError.error) {
      return NextResponse.json({ error: resultWithError.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[API] Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
