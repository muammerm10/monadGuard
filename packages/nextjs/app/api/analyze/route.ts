import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

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

    // User requested EXE or ELF
    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length < 4) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }

    const isPE = buffer[0] === 0x4d && buffer[1] === 0x5a; // MZ
    const isELF = buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46; // \x7F ELF

    if (!isPE && !isELF) {
      return NextResponse.json(
        { error: "Unsupported file format. Only PE (MZ) and ELF (\\x7F ELF) are supported." },
        { status: 400 },
      );
    }

    // Write to a temporary file with a secure random UUID to prevent Path Injection
    const tempDir = os.tmpdir();
    const safeId = crypto.randomUUID();
    const tempFilePath = path.join(tempDir, `monadguard_${safeId}`);
    fs.writeFileSync(tempFilePath, buffer);

    // Call the C++ agent with the --api flag
    // Determine path based on platform
    const agentBinary = process.platform === "win32" ? "monadGuardAgent.exe" : "monadGuardAgent";
    const agentPath = path.resolve(process.cwd(), "../../agent", agentBinary);

    let result;
    try {
      if (fs.existsSync(agentPath)) {
        // Execute the real C++ agent
        const { stdout } = await execAsync(`"${agentPath}" --api "${tempFilePath}"`);
        result = JSON.parse(stdout.trim());
      } else {
        // Fallback: If agent is not compiled, mock it for the UI demonstration
        console.warn(`[API] Agent executable not found at ${agentPath}. Falling back to simulation.`);

        // Let's at least calculate the real SHA256 in Node.js
        const hashSum = crypto.createHash("sha256");
        hashSum.update(buffer);
        const cleanHash = hashSum.digest("hex");
        const hexHash = "0x" + cleanHash;

        // Query MalwareBazaar for accurate fallback
        let isKnown = false;
        let family = "UNKNOWN";
        try {
          const formDataApi = new URLSearchParams();
          formDataApi.append("query", "get_info");
          formDataApi.append("hash", cleanHash);

          const mbResponse = await fetch("https://mb-api.abuse.ch/api/v1/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formDataApi.toString(),
          });

          const mbData = await mbResponse.json();
          if (mbData.query_status === "ok" && mbData.data && mbData.data.length > 0) {
            isKnown = true;
            family = mbData.data[0].signature || "UNKNOWN";
          }
        } catch (mbErr) {
          console.error("MalwareBazaar fallback failed", mbErr);
        }

        // Simulate a heuristic score based on the file size
        const simulatedScore = (file.size % 60) + 40; // Random score between 40-99

        result = {
          hash: hexHash,
          score: simulatedScore,
          family: family,
          isKnown: isKnown,
          simulated: true,
        };
      }
    } catch (e: any) {
      console.error("Agent execution failed:", e);
      // Try parsing stdout even if it failed, sometimes it outputs JSON error
      if (e.stdout) {
        try {
          result = JSON.parse(e.stdout.trim());
        } catch {
          throw new Error("Failed to execute agent: " + e.message);
        }
      } else {
        throw new Error("Failed to execute agent: " + e.message);
      }
    } finally {
      // Clean up the temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
