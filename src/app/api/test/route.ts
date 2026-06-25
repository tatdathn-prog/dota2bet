export async function GET() {
  return Response.json({ test: 'hello', time: Date.now() })
}
