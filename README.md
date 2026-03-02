# BC Patent Project

Project is now split into:

- `frontend/` -> Expo React Native app
- `backend/` -> AI + XAI compatibility API service

## 1) Frontend setup and run

```bash
cd "/home/krishna/Desktop/code/BC - Patent project/bc-patent-project/frontend"
npm install
```

Edit `.env` in `frontend/` and set your machine IP:

```env
EXPO_PUBLIC_API_BASE_URL=http://<YOUR_MACHINE_IP>:8080
EXPO_PUBLIC_USE_MOCK_API=false
```

Run frontend:

```bash
cd "/home/krishna/Desktop/code/BC - Patent project/bc-patent-project/frontend"
npm run start
```

Optional:

```bash
npm run android
npm run ios
npm run web
```

## 2) Backend setup and run

```bash
cd "/home/krishna/Desktop/code/BC - Patent project/bc-patent-project/backend"
npm install
```

Run backend service:

```bash
cd "/home/krishna/Desktop/code/BC - Patent project/bc-patent-project/backend"
npm run start
```

Backend API endpoints:

- `GET /health`
- `POST /compatibility/check`

## 3) Backend checks

```bash
cd "/home/krishna/Desktop/code/BC - Patent project/bc-patent-project/backend"
npm run test
```
