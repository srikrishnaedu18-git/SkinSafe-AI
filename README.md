# BC Patent Project Frontend (Expo React Native)

This app is the frontend prototype for the explainable, blockchain-verified cosmetic compatibility system.

## Run

```bash
npm install
npm run start
```

## Environment Configuration

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Variables:

- `EXPO_PUBLIC_API_BASE_URL`: Backend API base URL (example: `http://localhost:8000`)
- `EXPO_PUBLIC_USE_MOCK_API`: `true` or `false`

Behavior:

- `EXPO_PUBLIC_USE_MOCK_API=true`: app uses API first and falls back to mock responses if API fails.
- `EXPO_PUBLIC_USE_MOCK_API=false`: app uses only real API and surfaces backend errors.

## Current Frontend Modules

- Profile setup and save
- Product resolve and verification gate
- Camera barcode/QR scanner (`/scan`)
- Assessment scoring/explanation view
- Assessment history feed
- Feedback submission screen
- Detailed report screen (`/report/[assessmentId]`)
- JSON report sharing from mobile/desktop share sheet
- PDF report export and share
- Local persistence for profile/product/assessment/history state
- Deferred-module status panel (Blockchain/AI/XAI marked deferred)

## Viewing Output

### On Mobile (Expo Go)

1. Install `Expo Go` on your phone.
2. Ensure laptop and phone are on the same Wi-Fi.
3. Run:

```bash
npm run start
```

4. Scan the QR code shown in terminal:
- Android: scan directly in Expo Go
- iOS: scan with Camera and open in Expo Go
5. Grant camera permission when opening scanner for the first time.

### On Localhost (Web)

```bash
npm run web
```

Open the localhost URL shown in terminal (commonly `http://localhost:8081`).

## Notes

- For mobile backend calls, `localhost` points to the phone itself. Use your laptop LAN IP instead (example: `http://192.168.1.20:8000`).
- If local network discovery fails, run Expo with tunnel mode:

```bash
npx expo start --tunnel
```
