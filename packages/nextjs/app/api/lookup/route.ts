import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { hash } = body;

    if (!hash) {
      return NextResponse.json({ error: "No hash provided" }, { status: 400 });
    }

    // Clean hash (remove 0x prefix if present)
    const cleanHash = hash.startsWith("0x") ? hash.slice(2) : hash;

    // Query MalwareBazaar
    const formData = new URLSearchParams();
    formData.append("query", "get_info");
    formData.append("hash", cleanHash);

    const mbResponse = await fetch("https://mb-api.abuse.ch/api/v1/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = await mbResponse.json();

    if (data.query_status === "hash_not_found" || data.query_status === "no_hash_provided") {
      return NextResponse.json({ isKnown: false });
    }

    if (data.query_status === "ok" && data.data && data.data.length > 0) {
      return NextResponse.json({
        isKnown: true,
        details: {
          signature: data.data[0].signature,
          tags: data.data[0].tags,
        },
      });
    }

    return NextResponse.json({ isKnown: false, status: data.query_status });
  } catch (error: any) {
    console.error("MalwareBazaar Lookup Error:", error);
    return NextResponse.json({ error: "Failed to query external database" }, { status: 500 });
  }
}
