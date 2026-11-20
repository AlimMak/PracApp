import { createCoachHandler } from "@/lib/coach-server";
const handle = createCoachHandler();
export function POST(request: Request) {
  return handle(
    request,
    process.env.OPENAI_API_KEY,
    process.env.OPENAI_MODEL || undefined,
  );
}
