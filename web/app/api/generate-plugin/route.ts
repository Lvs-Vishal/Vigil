import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { Octokit } from "@octokit/rest";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // generous budget for the LLM round-trip

// ── C++ SensorPlugin base class template ────────────────────────────────────
// This is the exact interface the ESP32 firmware expects. Every generated
// plugin MUST implement all three virtual methods with these exact signatures.
const CPP_BASE_TEMPLATE = `
#pragma once
#include <Arduino.h>

/**
 * SensorPlugin — Nodeframe core interface.
 *
 * Rules for all implementors:
 *   1. No delay() anywhere. Use millis() for all timing.
 *   2. begin() is called once at boot. Return false if the sensor fails init.
 *   3. update() is called every loop() iteration. Only sample when your own
 *      internal interval has elapsed. Avoid heavy computation here.
 *   4. getValue() returns the most-recently sampled value. Thread-safe read.
 *   5. getUnit() returns the SI unit string (e.g. "°C", "ppm", "cm", "lux").
 *   6. getLabel() returns a short human-readable name (≤ 24 chars).
 *   7. Never use strapping pins (GPIO 0, 2, 5, 12, 15) for inputs.
 *   8. Never use input-only pins (GPIO 34, 35, 36, 39) for outputs.
 */
class SensorPlugin {
public:
  virtual ~SensorPlugin() = default;

  /** One-time hardware initialisation. Return true on success. */
  virtual bool begin() = 0;

  /** Called every loop() — advance internal state machine, never block. */
  virtual void update() = 0;

  /** Last sampled value (raw float, in the unit returned by getUnit()). */
  virtual float getValue() const = 0;

  /** SI unit string, e.g. "°C", "ppm", "cm", "lux". */
  virtual const char* getUnit() const = 0;

  /** Human-readable sensor label, ≤ 24 chars. */
  virtual const char* getLabel() const = 0;

  /** Slug used in JSON payloads — lowercase, hyphens, no spaces. */
  virtual const char* getSlug() const = 0;
};
`.trim();

// ── OpenAI system prompt ─────────────────────────────────────────────────────
function buildSystemPrompt(): string {
  return `You are a senior embedded C++ engineer writing production firmware for the Nodeframe IoT platform.

Your task is to implement a C++ class that inherits from SensorPlugin and provides a complete, production-ready driver.

HARD RULES — violating any of these makes the output invalid:
1. Output ONLY valid C++ code. No markdown fences, no prose, no comments explaining yourself outside the code.
2. Implement ALL six virtual methods: begin(), update(), getValue(), getUnit(), getLabel(), getSlug().
3. NEVER use delay(). ALL timing must use millis() and a stored _lastMs member.
4. NEVER use strapping pins (GPIO 0, 2, 5, 12, 15) for inputs.
5. NEVER use input-only pins (GPIO 34, 35, 36, 39) for outputs.
6. I2C sensors: SDA=GPIO 21, SCL=GPIO 22 (fixed Nodeframe bus assignment).
7. SPI sensors: MOSI=23, MISO=19, SCK=18, SS=4 (fixed Nodeframe SPI bus).
8. Include all necessary #include directives for the sensor's library.
9. The class name must be PascalCase with "Plugin" suffix (e.g. Bmp280Plugin).
10. getSlug() must return a lowercase-hyphenated string matching the class name (e.g. "bmp280").
11. Declare a private _value float member and update it only inside update().
12. The sample interval should be configurable via a constructor parameter with a sensible default (e.g. 2000ms).

Here is the exact SensorPlugin base class you must inherit from:

\`\`\`cpp
${CPP_BASE_TEMPLATE}
\`\`\`

Now implement the class described by the user. You must structure your entire response using the following XML format:

<instructions>
Provide clear, step-by-step wiring instructions for the user here. Tell them exactly which ESP32 GPIO pins to connect to which sensor pins, following the hardware safety rules. Keep it concise.
</instructions>

<code>
// Put your complete C++ implementation here (NO markdown fences, NO prose).
</code>`;
}

// ── Slug extractor ───────────────────────────────────────────────────────────
// Extracts the getSlug() return value from the generated code so we can use
// it as the filename and branch name without asking the model a second time.
function extractSlug(code: string): string {
  const match = code.match(/getSlug\(\)[^{]*\{[^}]*return\s+"([a-z0-9-]+)"/);
  return match?.[1] ?? "sensor-plugin";
}

// ── GitHub PR creation ───────────────────────────────────────────────────────
async function createGitHubPR(
  slug: string,
  code: string,
): Promise<{ pr_url: string; branch: string }> {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;

  if (!token || !owner || !repo) {
    throw new Error("GITHUB_TOKEN, GITHUB_REPO_OWNER, and GITHUB_REPO_NAME env vars are required for PR creation.");
  }

  const octokit = new Octokit({ auth: token });
  const branch = `plugin/${slug}-${Date.now()}`;
  const filePath = `firmware/plugins/${slug}.h`;

  // Get the SHA of the default branch HEAD so we can branch from it.
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: "heads/main",
  });
  const baseSha = refData.object.sha;

  // Create the feature branch.
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branch}`,
    sha: baseSha,
  });

  // Commit the generated plugin file.
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: `feat(plugins): add ${slug} sensor plugin\n\nAuto-generated by the Nodeframe AI Plugin Generator.`,
    content: Buffer.from(code, "utf-8").toString("base64"),
    branch,
  });

  // Open the pull request.
  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    title: `feat(plugins): Add ${slug} sensor plugin`,
    body: `## AI-Generated Plugin\n\nThis pull request was automatically created by the **Nodeframe AI Plugin Generator**.\n\n### Changes\n- Adds \`${filePath}\` implementing the \`SensorPlugin\` interface for the \`${slug}\` sensor.\n\n### Review Checklist\n- [ ] Verify no \`delay()\` calls exist\n- [ ] Confirm no strapping pins (GPIO 0, 2, 5, 12, 15) used\n- [ ] Test on hardware before merging\n- [ ] Add to plugin manifest in \`firmware/plugins/index.h\``,
    head: branch,
    base: "main",
    draft: false,
  });

  return { pr_url: pr.html_url, branch };
}

// ── XML Extractor helpers ───────────────────────────────────────────────────
function extractTag(text: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i");
  const match = text.match(regex);
  return match?.[1]?.trim() ?? "";
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt || prompt.length < 5) {
    return NextResponse.json(
      { error: "prompt is required (min 5 characters)." },
      { status: 400 },
    );
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on this server." },
      { status: 503 },
    );
  }

  let rawOutput: string;

  // Mock mode for local testing without an API key
  if (openaiKey === "your_actual_openai_key_here") {
    // Simulate LLM delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    rawOutput = `
<instructions>
**Wiring Instructions for Mock Sensor:**
1. Connect **VCC** to the ESP32 **3.3V** rail (Red wire).
2. Connect **GND** to any ESP32 **GND** pin (Black wire).
3. Connect **DATA** to **GPIO 4** (Yellow wire).
*Note: Do not use strapping pins (0, 2, 5, 12, 15).*
</instructions>

<code>
#pragma once
#include <Arduino.h>

class MockSensorPlugin : public SensorPlugin {
private:
  float _value = 0.0f;
  unsigned long _lastMs = 0;
  unsigned long _interval = 2000;
public:
  bool begin() override { return true; }
  void update() override {
    if (millis() - _lastMs > _interval) {
      _value = 42.0f; // mock reading
      _lastMs = millis();
    }
  }
  float getValue() const override { return _value; }
  const char* getUnit() const override { return "mock"; }
  const char* getLabel() const override { return "Mock Sensor"; }
  const char* getSlug() const override { return "mock-sensor"; }
};
</code>
    `.trim();
  } else {
    // ── Real LLM call ────────────────────────────────────────────────────────────
    const openai = new OpenAI({ apiKey: openaiKey });
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.2,  // Low temperature for deterministic, correct C++.
        max_tokens: 2048,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: prompt },
        ],
      });

      rawOutput = completion.choices[0]?.message?.content?.trim() ?? "";
      if (!rawOutput) {
        throw new Error("Model returned an empty response.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "OpenAI request failed.";
      return NextResponse.json({ error: `LLM error: ${message}` }, { status: 502 });
    }
  }

  const instructions = extractTag(rawOutput, "instructions") || "No wiring instructions provided.";
  let generatedCode = extractTag(rawOutput, "code");

  // Fallback if the LLM ignored XML tags
  if (!generatedCode) {
    generatedCode = rawOutput
      .replace(/^```(?:cpp|c\+\+)?\n?/im, "")
      .replace(/```\s*$/im, "")
      .trim();
  }

  const slug = extractSlug(generatedCode);

  // ── Optional GitHub PR ────────────────────────────────────────────────────
  // If GitHub env vars are present, open a PR automatically. If not, return
  // the generated code only — the user can copy it and open a PR manually.
  const hasGitHub =
    process.env.GITHUB_TOKEN &&
    process.env.GITHUB_REPO_OWNER &&
    process.env.GITHUB_REPO_NAME;

  if (hasGitHub) {
    try {
      const { pr_url, branch } = await createGitHubPR(slug, generatedCode);
      return NextResponse.json({
        slug,
        instructions,
        generated_code: generatedCode,
        pr_url,
        branch,
        github_enabled: true,
      });
    } catch (err) {
      // GitHub failed — still return the code so the user isn't stuck.
      const ghError = err instanceof Error ? err.message : "GitHub PR creation failed.";
      return NextResponse.json({
        slug,
        instructions,
        generated_code: generatedCode,
        pr_url: null,
        github_error: ghError,
        github_enabled: false,
      });
    }
  }

  return NextResponse.json({
    slug,
    instructions,
    generated_code: generatedCode,
    pr_url: null,
    github_enabled: false,
  });
}
