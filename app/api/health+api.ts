export async function GET(request: Request) {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'ChatVibe AI API is healthy and operational.'
  });
}
