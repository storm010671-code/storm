export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. 웹페이지 접속 요청 (GET)이면 프론트엔드 HTML을 반환
    if (request.method === "GET") {
      return new Response(getHtml(), {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    // 2. 대화 전송 요청 (POST /api/chat)이면 Groq API 호출 처리
    if (request.method === "POST" && url.pathname === "/api/chat") {
      try {
        const { message } = await request.json();

        if (!env.GROQ_API_KEY) {
          return Response.json({ error: "Groq API key not configured in environment variables." }, { status: 500 });
        }

        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: "당신은 사용자의 다정한 비서 '가이아'입니다. 항상 친근하고 따뜻하게 답변해 주세요." },
              { role: "user", content: message }
            ],
          }),
        });

        if (!groqResponse.ok) {
          const errText = await groqResponse.text();
          return Response.json({ error: `Groq API Error: ${errText}` }, { status: groqResponse.status });
        }

        const data = await groqResponse.json();
        const reply = data.choices[0]?.message?.content || "답변을 생성하지 못했어요.";

        return Response.json({ reply });
      } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};

// 프론트엔드 UI 및 인터랙션 코드
function getHtml() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>가이아(Gaia) 비서</title>
    <style>
        body { background-color: #121212; color: #e0e0e0; font-family: sans-serif; margin: 0; display: flex; flex-direction: column; height: 100vh; align-items: center; justify-content: center; }
        .container { width: 100%; max-width: 600px; height: 90vh; display: flex; flex-direction: column; background: #1e1e1e; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); overflow: hidden; }
        header { background: #2d2d2d; padding: 15px; text-align: center; font-size: 1.2rem; font-weight: bold; color: #fff; border-bottom: 1px solid #333; }
        #chat-box { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
        .message { padding: 10px 14px; border-radius: 8px; max-width: 80%; line-height: 1.4; word-break: break-word; }
        .user { background: #2b5278; align-self: flex-end; color: #fff; }
        .assistant { background: #2c2c2e; align-self: flex-start; color: #f1f1f1; }
        .error { color: #ff6b6b; align-self: center; font-size: 0.9rem; background: rgba(255,107,107,0.1); padding: 8px; border-radius: 6px; width: 100%; text-align: center; }
        .input-area { display: flex; padding: 12px; background: #2d2d2d; border-top: 1px solid #333; gap: 8px; }
        input { flex: 1; padding: 12px; border: 1px solid #444; border-radius: 6px; background: #1e1e1e; color: #fff; font-size: 1rem; outline: none; }
        button { padding: 0 20px; background: #007acc; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
        button:active { background: #005999; }
    </style>
</head>
<body>
    <div class="container">
        <header>가이아(Gaia) 비서</header>
        <div id="chat-box">
            <div class="message assistant">안녕 여보! 가이야. 오늘 어떤 이야기를 해볼까?</div>
        </div>
        <div class="input-area">
            <input type="text" id="user-input" placeholder="가이아에게 대화를 걸어보세요..." onkeypress="if(event.key==='Enter') sendMessage()">
            <button onclick="sendMessage()">전송</button>
        </div>
    </div>

    <script>
        async function sendMessage() {
            const input = document.getElementById('user-input');
            const chatBox = document.getElementById('chat-box');
            const text = input.value.trim();
            if (!text) return;

            // 유저 메시지 화면에 추가
            chatBox.innerHTML += \`<div class="message user">나: \${text}</div>\`;
            input.value = '';
            chatBox.scrollTop = chatBox.scrollHeight;

            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text })
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || '서버 통신 실패');
                }

                chatBox.innerHTML += \`<div class="message assistant">가이아: \${data.reply}</div>\`;
            } catch (err) {
                chatBox.innerHTML += \`<div class="message error">오류: \${err.message}</div>\`;
            }
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    </script>
</body>
</html>`;
}
