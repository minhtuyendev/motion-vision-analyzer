

## Hỗ trợ Google AI Studio API Key

### Vấn đề hiện tại
Edge function `analyze-motion` đang dùng Lovable AI Gateway (`ai.gateway.lovable.dev`) với `LOVABLE_API_KEY`. Bạn muốn dùng API key riêng từ Google AI Studio để gọi Gemini trực tiếp, tránh phụ thuộc vào credits của Lovable.

### Kế hoạch

**1. Thêm secret `GOOGLE_AI_STUDIO_KEY`**
- Yêu cầu bạn nhập API key từ Google AI Studio

**2. Sửa edge function `analyze-motion/index.ts`**
- Thêm logic ưu tiên: nếu có `GOOGLE_AI_STUDIO_KEY` → gọi thẳng Google Generative AI API (`generativelanguage.googleapis.com`), nếu không → fallback về Lovable AI Gateway như cũ
- Endpoint Google: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${API_KEY}`
- Chuyển đổi format request từ OpenAI-compatible sang Google Generative AI format (khác cấu trúc `messages` → `contents`, `tools` → `tools` với format Google)
- Giữ nguyên prompt, tool calling schema, và xử lý response

**3. Chi tiết kỹ thuật**

```text
Request flow:
  Client → Edge Function → Check GOOGLE_AI_STUDIO_KEY
                            ├─ Có → generativelanguage.googleapis.com (direct)
                            └─ Không → ai.gateway.lovable.dev (Lovable AI)
```

- Google API format khác OpenAI:
  - `messages` → `contents` (với `parts` array)
  - `tool_choice` → `toolConfig.functionCallingConfig`
  - Response: `candidates[0].content.parts[0].functionCall` thay vì `choices[0].message.tool_calls[0]`
- Xử lý lỗi 429/402 tương tự cho cả hai API

**4. Không thay đổi frontend** — logic chọn API hoàn toàn ở backend.

