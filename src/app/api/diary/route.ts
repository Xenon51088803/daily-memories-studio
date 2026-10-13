import { NextRequest, NextResponse } from "next/server";
import { diaryStore, dayAt } from "@/lib/diary-store.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers });
const token = (req: NextRequest) => req.cookies.get("diary_session")?.value;

export async function GET(req: NextRequest) {
  const store = diaryStore();
  const action = req.nextUrl.searchParams.get("action");
  if (action === "public") return json({ today: dayAt(), quotes: store.publicQuotes() });
  if (action === "session")
    return json({
      configured: store.configured(),
      authenticated: store.authenticated(token(req)),
      today: dayAt(),
    });
  if (!store.authenticated(token(req))) return json({ error: "请先登录私人空间" }, 401);
  if (action === "backup")
    return new NextResponse(JSON.stringify(store.backup(), null, 2), {
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="diary-${dayAt()}.json"`,
      },
    });
  try {
    return json({
      entry: store.entry(req.nextUrl.searchParams.get("date") || dayAt()),
      calendar: store.calendar(),
    });
  } catch {
    return json({ error: "日期无效" }, 400);
  }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  // Next can normalize request.url to localhost; Host preserves the actual local address.
  const requestHost = req.headers.get("host") || new URL(req.url).host;
  const allowed = process.env.DIARY_PUBLIC_ORIGIN || `${new URL(req.url).protocol}//${requestHost}`;
  if (!origin || origin !== allowed) return json({ error: "请从本站页面操作" }, 403);
  if (!req.headers.get("content-type")?.includes("application/json"))
    return json({ error: "请求格式错误" }, 415);
  if (Number(req.headers.get("content-length")) > 220000) return json({ error: "内容过长" }, 413);
  const store = diaryStore();
  try {
    const raw = await req.text();
    if (Buffer.byteLength(raw) > 220000) return json({ error: "内容过长" }, 413);
    const data = JSON.parse(raw);
    if (data.action === "setup" || data.action === "login") {
      if (data.action === "setup") {
        const local =
          process.env.NODE_ENV === "development" &&
          /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(requestHost);
        if (
          !local &&
          (!process.env.DIARY_SETUP_TOKEN || data.setupToken !== process.env.DIARY_SETUP_TOKEN)
        )
          return json({ error: "请填写服务器配置的首次设置码，或在本机开发模式下设置密码" }, 403);
        store.setup(data.password);
      }
      const session = store.login(data.password);
      const res = json({ ok: true });
      res.cookies.set("diary_session", session, {
        httpOnly: true,
        sameSite: "strict",
        secure: allowed.startsWith("https:"),
        path: "/",
        maxAge: 7 * 86400,
      });
      return res;
    }
    if (!store.authenticated(token(req)))
      return json({ error: "登录已过期，请重新登录。未保存内容仍保留在当前页面。" }, 401);
    if (data.action === "logout") {
      store.logout(token(req));
      const res = json({ ok: true });
      res.cookies.set("diary_session", "", { path: "/", maxAge: 0 });
      return res;
    }
    if (data.action !== "save") return json({ error: "不支持的操作" }, 400);
    return json({ entry: store.save(data.entry), calendar: store.calendar() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "操作失败";
    const expected = /密码|尝试|设置|只能|格式|长度|其他窗口/.test(message);
    if (!expected) console.error("Diary request failed", error);
    return json(
      { error: expected ? message : "暂时无法保存，请稍后重试" },
      message.includes("其他窗口") ? 409 : 400,
    );
  }
}
