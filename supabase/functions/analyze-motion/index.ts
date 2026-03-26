import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { frames, timestamps, videoDuration } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      throw new Error("No frames provided");
    }

    // Send up to 20 frames evenly sampled
    const maxFrames = 20;
    let selectedFrames: string[] = frames;
    let selectedTimestamps: number[] = timestamps;
    if (frames.length > maxFrames) {
      const step = (frames.length - 1) / (maxFrames - 1);
      selectedFrames = [];
      selectedTimestamps = [];
      for (let i = 0; i < maxFrames; i++) {
        const idx = Math.round(i * step);
        selectedFrames.push(frames[idx]);
        selectedTimestamps.push(timestamps[idx]);
      }
    }

    const imageContents = selectedFrames.map((frame: string) => ({
      type: "image_url" as const,
      image_url: { url: frame },
    }));

    const systemPrompt = `You are an expert physics AI that analyzes mechanical motion from video frames of real physics experiments.

## YOUR TASK
Given sequential video frames, you must:
1. Identify the type of mechanical motion
2. Track the moving object's position across all frames
3. Estimate physical parameters for the theoretical model

## COORDINATE SYSTEM — CRITICAL
The video uses SCREEN coordinates: (0,0) = top-left, (1,1) = bottom-right.
- x increases LEFT → RIGHT (this matches physics convention)
- y increases TOP → BOTTOM (this is OPPOSITE to physics convention where y increases upward)

You MUST return positions in SCREEN coordinates as you observe them in the frames.
When you see an object falling DOWN in the video, its y value INCREASES (goes from ~0 toward ~1).
When you see an object moving RIGHT, its x value INCREASES.

## POSITION TRACKING RULES
- Return exactly ${selectedFrames.length} positions, one for each frame
- Use normalized 0-1 coordinates matching what you see in the image
- Track the CENTER of the most prominent moving object
- Be precise: look at the actual pixel position carefully for each frame
- Positions should show smooth, physically consistent changes between frames

## MOTION TYPE IDENTIFICATION
Analyze the trajectory pattern:
- uniform_linear: constant velocity straight line
- uniformly_accelerated: straight line with increasing/decreasing speed
- circular: circular/arc trajectory
- harmonic: back-and-forth oscillation along one axis
- projectile: parabolic trajectory (thrown object)
- free_fall: vertical straight line with increasing speed downward
- pendulum: arc oscillation from a pivot point
- unknown: if none of the above clearly fits

## PARAMETER ESTIMATION
Return parameters that fit the PHYSICS equations (mathematical y-axis pointing UP):
- For projectile: x = x0 + v0·cos(θ)·t, y = y0 + v0·sin(θ)·t - ½g·t²
- For free_fall: y = y0 + ½g·t² (y0 near top, object falls down)
- For harmonic: x = x_center + A·cos(ωt + φ)
- For circular: x = cx + R·cos(ωt + φ), y = cy + R·sin(ωt + φ)
- For uniform_linear: position changes linearly with time
- For uniformly_accelerated: position changes quadratically with time

Parameters should use NORMALIZED coordinates (0-1 range) matching the observed positions.
Provide initial positions (x0, y0) matching the first observed position.

IMPORTANT: You MUST respond using the suggest_analysis tool.`;

    const userPrompt = `Analyze these ${selectedFrames.length} sequential video frames from a physics experiment.
Timestamps: [${selectedTimestamps.map((t: number) => t.toFixed(3) + "s").join(", ")}]
Total video duration: ${videoDuration?.toFixed(2)}s

Look carefully at each frame, identify the moving object, track its position precisely, determine the motion type, and estimate physical parameters.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              ...imageContents,
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_analysis",
              description: "Return the motion analysis result",
              parameters: {
                type: "object",
                properties: {
                  motionType: {
                    type: "string",
                    enum: [
                      "uniform_linear",
                      "uniformly_accelerated",
                      "circular",
                      "harmonic",
                      "projectile",
                      "free_fall",
                      "pendulum",
                      "unknown",
                    ],
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence 0-1",
                  },
                  positions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        x: { type: "number", description: "Normalized x (0=left, 1=right)" },
                        y: { type: "number", description: "Normalized y (0=top, 1=bottom) — SCREEN coords" },
                      },
                      required: ["x", "y"],
                    },
                    description: `Exactly ${selectedFrames.length} positions in screen coordinates`,
                  },
                  parameters: {
                    type: "object",
                    additionalProperties: { type: "number" },
                    description: "Physical parameters in normalized coordinates: x0, y0, v0, vx, vy, a, ax, ay, g, omega, R, A, phi, theta, cx, cy, L, theta0 etc.",
                  },
                  description: {
                    type: "string",
                    description: "Detailed Vietnamese description of the analysis: what object was tracked, what motion was detected, key observations",
                  },
                },
                required: ["motionType", "confidence", "positions", "parameters", "description"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Vui lòng thử lại sau." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Hết credits AI. Vui lòng nạp thêm." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured data");
    }

    const analysisData = JSON.parse(toolCall.function.arguments);

    // Return selected timestamps so the client knows which frames were analyzed
    analysisData.analyzedTimestamps = selectedTimestamps;

    return new Response(JSON.stringify(analysisData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-motion error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
