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

    // Build vision message with frames as images
    const imageContents = frames.slice(0, 10).map((frame: string, i: number) => ({
      type: "image_url" as const,
      image_url: { url: frame },
    }));

    const systemPrompt = `You are an expert physics AI that analyzes mechanical motion from video frames.

Given a sequence of video frames showing an object in motion, you must:
1. Identify the type of motion (uniform_linear, uniformly_accelerated, circular, harmonic, projectile, free_fall, pendulum, or unknown)
2. Track the position of the moving object in each frame (normalized 0-1 coordinates)
3. Estimate physical parameters

IMPORTANT: You MUST respond using the suggest_analysis tool. Do not respond with plain text.

Analyze carefully:
- Look at how the object's position changes between frames
- Consider the trajectory shape (straight line, curve, parabola, circle, oscillation)
- Estimate velocity and acceleration patterns
- The timestamps for each frame are: ${JSON.stringify(timestamps)}
- Video duration: ${videoDuration}s

Guidelines for position tracking:
- Use normalized coordinates (0-1) where (0,0) is top-left and (1,1) is bottom-right
- Track the most prominent moving object
- If multiple objects, track the main one`;

    const userPrompt = `Analyze these ${frames.length} video frames taken at timestamps [${timestamps.map((t: number) => t.toFixed(2) + "s").join(", ")}] from a ${videoDuration?.toFixed(1)}s physics experiment video. Identify the motion type, track object positions, and provide physical parameters.`;

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
              description: "Return the motion analysis result with type, positions, parameters and description",
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
                    description: "The identified type of mechanical motion",
                  },
                  confidence: {
                    type: "number",
                    description: "Confidence level 0-1",
                  },
                  positions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        x: { type: "number", description: "Normalized x position 0-1" },
                        y: { type: "number", description: "Normalized y position 0-1" },
                      },
                      required: ["x", "y"],
                    },
                    description: "Position of the tracked object in each frame",
                  },
                  parameters: {
                    type: "object",
                    additionalProperties: { type: "number" },
                    description: "Physical parameters like v0, a, omega, R, A, theta, g, L etc.",
                  },
                  description: {
                    type: "string",
                    description: "Vietnamese description of the motion analysis",
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
