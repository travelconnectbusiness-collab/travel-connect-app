export async function onRequestGet() {
  return Response.json({
    success: true,
    service: "Travel Connect API",
    status: "online"
  });
}
