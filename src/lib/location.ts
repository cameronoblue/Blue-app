export class LocationError extends Error {}

export function captureLocation(): Promise<{ latitude: number, longitude: number, accuracy: number, capturedAt: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation || !window.isSecureContext) {
      reject(new LocationError('Location requires HTTPS or localhost and a supported browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, capturedAt: position.timestamp }),
      error => reject(new LocationError(error.code === 1 ? 'Location permission was denied.' : error.code === 3 ? 'Location request timed out.' : 'Your location is unavailable.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  })
}
