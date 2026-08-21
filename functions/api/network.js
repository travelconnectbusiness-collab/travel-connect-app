export async function onRequestGet() {
  return Response.json({
    success: true,
    service: "Travel Connect Network",
    status: "online",
    features: {
      messaging: true,
      locationSharing: true,
      alerts: true,
      driverNetwork: true
    }
  });
}
