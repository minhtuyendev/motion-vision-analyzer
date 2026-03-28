import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildSystemPrompt(frameCount: number) {
  return `You are an expert physics AI that analyzes mechanical motion from video frames of real physics experiments.

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
- Return exactly ${frameCount} positions, one for each frame
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
}

function buildToolSchema(frameCount: number) {
  return {
    name: "suggest_analysis",
    description: "Return the motion analysis result",
    parameters: {
      type: "object",
      properties: {
        motionType: {
          type: "string",
          enum: [
            "uniform_linear", "uniformly_accelerated", "circular",
            "harmonic", "projectile", "free_fall", "pendulum", "unknown",
          ],
        },
        confidence: { type: "number", description: "Confidence 0-1" },
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
          description: `Exactly ${frameCount} positions in screen coordinates`,
        },
        parameters: {
          type: "object",
          properties: {
            x0: { type: "number", description: "Initial x position" },
            y0: { type: "number", description: "Initial y position" },
            v0: { type: "number", description: "Initial velocity" },
            vx: { type: "number", description: "Initial x velocity" },
            vy: { type: "number", description: "Initial y velocity" },
            a: { type: "number", description: "Acceleration" },
            ax: { type: "number", description: "X acceleration" },
            ay: { type: "number", description: "Y acceleration" },
            g: { type: "number", description: "Gravitational acceleration" },
            omega: { type: "number", description: "Angular velocity" },
            R: { type: "number", description: "Radius" },
            A: { type: "number", description: "Amplitude" },
            phi: { type: "number", description: "Phase angle" },
            theta: { type: "number", description: "Launch angle" },
            cx: { type: "number", description: "Center x" },
            cy: { type: "number", description: "Center y" },
            L: { type: "number", description: "Length" },
            theta0: { type: "number", description: "Initial angle" },
          },
          description: "Physical parameters in normalized coordinates",
        },
        description: {
          type: "string",
          description: "Detailed Vietnamese description of the analysis",
        },
      },
      required: ["motionType", "confidence", "positions", "parameters", "description"],
    },
  };
}

async function callGoogleAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  imageContents: Array<{ data: string; mimeType: string }>,
  toolSchema: any,
) {
  const parts: any[] = [{ text: userPrompt }];
  for (const img of imageContents) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts }],
        tools: [{
          functionDeclarations: [toolSchema],
        }],
        toolConfig: {
          functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["suggest_analysis"] },
        },
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("Google AI error:", response.status, errText);
    if (response.status === 429) throw { status: 429, message: "Rate limit exceeded. Vui lòng thử lại sau." };
    throw new Error(`Google AI error: ${response.status} - ${errText}`);
  }

  const result = await response.json();
  const fnCall = result.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall);
  if (!fnCall?.functionCall?.args) {
    console.error("Google AI response:", JSON.stringify(result));
    throw new Error("Google AI did not return structured data");
  }
  return fnCall.functionCall.args;
}

async function callLovableAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  imageUrls: string[],
  toolSchema: any,
) {
  const imageContents = imageUrls.map((url) => ({
    type: "image_url" as const,
    image_url: { url },
  }));

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [{ type: "text", text: userPrompt }, ...imageContents],
        },
      ],
      tools: [{ type: "function", function: toolSchema }],
      tool_choice: { type: "function", function: { name: "suggest_analysis" } },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw { status: 429, message: "Rate limit exceeded. Vui lòng thử lại sau." };
    if (response.status === 402) throw { status: 402, message: "Hết credits AI. Vui lòng nạp thêm." };
    const errText = await response.text();
    console.error("Lovable AI error:", response.status, errText);
    throw new Error(`AI error: ${response.status}`);
  }

  const aiResponse = await response.json();
  const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("AI did not return structured data");
  return JSON.parse(toolCall.function.arguments);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { frames, timestamps, videoDuration } = await req.json();

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      throw new Error("No frames provided");
    }

    // Sample frames
    const maxFrames = 120;
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

    const systemPrompt = buildSystemPrompt(selectedFrames.length);
    const userPrompt = `Analyze these ${selectedFrames.length} sequential video frames from a physics experiment.
Timestamps: [${selectedTimestamps.map((t: number) => t.toFixed(3) + "s").join(", ")}]
Total video duration: ${videoDuration?.toFixed(2)}s

Look carefully at each frame, identify the moving object, track its position precisely, determine the motion type, and estimate physical parameters.`;

    const toolSchema = buildToolSchema(selectedFrames.length);

    let analysisData: any;

    const GOOGLE_KEY = Deno.env.get("GOOGLE_AI_STUDIO_KEY");
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (GOOGLE_KEY) {
      console.log("Using Google AI Studio API directly");
      // Extract base64 data from data URLs for Google API
      const googleImages = selectedFrames.map((frame: string) => {
        const match = frame.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) throw new Error("Invalid frame data URL");
        return { mimeType: match[1], data: match[2] };
      });
      analysisData = await callGoogleAI(GOOGLE_KEY, systemPrompt, userPrompt, googleImages, toolSchema);
    } else if (LOVABLE_KEY) {
      console.log("Using Lovable AI Gateway");
      analysisData = await callLovableAI(LOVABLE_KEY, systemPrompt, userPrompt, selectedFrames, toolSchema);
    } else {
      throw new Error("No AI API key configured");
    }

    analysisData.analyzedTimestamps = selectedTimestamps;

    return new Response(JSON.stringify(analysisData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("analyze-motion error:", e);
    const status = e?.status || 500;
    const message = e?.message || "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
