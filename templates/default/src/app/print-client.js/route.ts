import { PRINT_SCRIPT } from "@kumuno/print";
export function GET() {
  return new Response(PRINT_SCRIPT, {headers:{"Content-Type":"text/javascript; charset=utf-8", "X-Content-Type-Options":"nosniff", "Cache-Control":"public, max-age=86400"}});
}
