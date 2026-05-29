# SpandaVidya Frontend

Expo-based React Native client for the SpandaVidya application. The current app combines:

- a public landing experience,
- Google-based authentication wiring,
- secure session handling,
- an ML data collection flow with image upload,
- a local Body Insight questionnaire,
- and an in-progress chat interface prepared for streaming responses.

The frontend is written in TypeScript and uses Expo Router for navigation, NativeWind for utility styling, Zustand for client state, TanStack React Query for server state, and Axios plus `expo/fetch` for API communication.

## Current Implemented Features

### Navigation and screens

- Public home screen at `app/index.tsx`
- Login and signup routes that reuse a shared animated `AuthScreen`
- Tab navigator with:
  - chat screen in `app/(tabs)/index.tsx`
  - architecture/status screen in `app/(tabs)/explore.tsx`
- Standalone ML data collection route
- Standalone Body Insight assessment route

### Authentication and session handling

- Google Sign-In flow is wired through `expo-auth-session`
- Backend exchange is implemented through `POST /auth/google`
- Session state is stored in Zustand
- Session persistence uses:
  - `expo-secure-store` on native platforms
  - `localStorage` fallback on web
- Axios interceptor attaches bearer tokens and attempts token refresh on `401`

Not fully implemented:

- The visible X, email, and Apple buttons in `AuthScreen` do not currently perform real authentication flows.
- The signup screen shares the same UI shell, but a dedicated email/password registration form is not currently implemented.

### Chat UI and streaming client scaffolding

- Message list rendered with `FlashList`
- Markdown rendering for assistant replies
- Optimistic message insertion while sending
- Infinite-query hook for message pagination
- Attachment pickers for images and documents
- SSE-style stream parser for token events

Not fully implemented:

- The frontend expects chat endpoints such as:
  - `GET /chats/:chatId/messages`
  - `POST /chats/:chatId/messages`
  - `POST /chats/:chatId/stream`
- Those chat endpoints are not present in the current backend codebase, so end-to-end chat, chat history, and realtime assistant responses are not yet functional.
- Attachments can be selected in the chat UI, but chat attachment upload integration is not complete end to end.

### Data collection and assessment flows

- `DataCollectionForm`
  - captures name, age, gender, and an eye image
  - opens the device camera with `expo-image-picker`
  - uploads the image to the backend `POST /uploads/image` endpoint
- `BodyInsightForm`
  - renders a local questionnaire and progress count

Not fully implemented:

- The ML survey submission currently logs values locally and shows a success alert; there is no backend persistence or ML-processing endpoint for the full form payload.
- The Body Insight assessment is local UI only and does not submit data to an API.

### Client infrastructure

- Centralized API client and typed application errors
- React Query lifecycle integration with app foreground/background state and network status
- Theme-aware root layout using React Navigation themes
- Reanimated, Gesture Handler, Bottom Sheet provider, and keyboard controller are configured for richer mobile UX

## Tech Stack

- Expo SDK 54
- React Native 0.81
- React 19
- TypeScript
- Expo Router
- NativeWind / Tailwind CSS
- Zustand
- TanStack React Query
- Axios
- React Hook Form
- Zod
- FlashList
- React Native Markdown Display
- Expo Auth Session
- Expo Secure Store
- Expo Image Picker
- Expo Document Picker
- React Native Reanimated
- Gorhom Bottom Sheet

## Folder Structure

```text
frontend/
|-- app/                         # Expo Router screens and route groups
|   |-- (tabs)/                  # Tab navigator screens
|   |-- index.tsx                # Public landing screen
|   |-- login.tsx                # Login route
|   |-- signup.tsx               # Signup route
|   |-- data-collection.tsx      # ML data collection route
|   `-- body-insight.tsx # Questionnaire route
|-- assets/                      # App icons and splash assets
|-- src/
|   |-- components/              # Reusable UI and domain components
|   |-- features/
|   |   |-- auth/                # Auth API, types, and session store
|   |   `-- chat/                # Chat API, hooks, UI, and stream parsing
|   |-- providers/               # App-wide providers
|   |-- shared/                  # API client, env, auth storage, errors
|   |-- services/                # Thin service re-export layer
|   |-- hooks/                   # Theme helpers
|   `-- theme/                   # Theme exports
|-- app.json                     # Expo configuration
|-- package.json                 # Scripts and dependencies
`-- tailwind.config.js           # NativeWind configuration
```

## Important APIs and Services

| Area | Current implementation |
| --- | --- |
| Auth API | `src/features/auth/api/auth-api.ts` |
| Session store | `src/features/auth/store/session-store.ts` |
| Secure token storage | `src/shared/auth/token-storage.ts` |
| Shared HTTP client | `src/shared/api/http-client.ts` |
| Query client | `src/shared/api/query-client.ts` |
| Chat API contract | `src/features/chat/api/chat-api.ts` |
| Chat stream parser | `src/features/chat/streaming/parse-stream-chunks.ts` |
| Upload usage | `src/components/DataCollectionForm.tsx` |

## Environment Variables

Create `frontend/.env` with the values required by the current code:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8080
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id
```

Notes:

- `EXPO_PUBLIC_API_URL` is validated at startup and is required.
- Google client IDs are read by `AuthScreen`; if they are missing, fallback dummy values are used and real Google login will not work.

## Setup and Installation

```bash
cd frontend
npm install
```

Start the Expo development server:

```bash
npm run start
```

Other useful commands:

```bash
npm run android
npm run ios
npm run web
npm run lint
```

## Development Workflow

1. Configure `frontend/.env`.
2. Run the backend locally if you need auth or image uploads.
3. Start Expo with `npm run start`.
4. Use Expo Router files under `app/` for route-level changes.
5. Add domain work under `src/features/` and keep shared infrastructure under `src/shared/`.
6. Prefer React Query for remote/server state and Zustand for local session/client state.

## Deployment Notes

- Expo configuration is defined in `app.json`.
- Web output is configured as static Metro output.
- No EAS build profile or CI deployment config is present in this folder yet.

## Project Progress Summary

Completed so far:

- Frontend project scaffolding and route structure
- Shared providers and query lifecycle handling
- Google auth client flow and secure session persistence
- Auth-aware HTTP client with refresh handling
- ML image capture and upload UI
- Body Insight questionnaire UI
- Chat interface scaffolding with optimistic updates, markdown rendering, pagination hooks, and streaming parser

## Upcoming Improvements

- Implement the missing backend chat/message/stream endpoints required by the current chat client
- Complete real email/password, Apple, and X authentication flows or remove inactive buttons
- Add persistence and backend submission for the ML survey form
- Add persistence/submission for the Body Insight questionnaire
- Finish attachment upload handling for chat messages
- Add stronger protected-route handling around authenticated areas
- Add frontend tests and formal build/deployment configuration



Android Credentials
Project                 SpandaVidya-Ai
Application Identifier  com.spandavidya.ai

Push Notifications (FCM Legacy)
  None assigned yet

Push Notifications (FCM V1): Google Service Account Key For FCM V1
  None assigned yet

Submissions: Google Service Account Key for Play Store Submissions
  None assigned yet

Configuration: Build Credentials -ZSFJyMoUc (Default)
Keystore
Type                JKS
Key Alias           c835b930bf14105c2e13d093acf5a3ff
MD5 Fingerprint     07:FD:31:60:A7:34:70:0C:7C:A7:A7:86:A8:AA:AB:B4
SHA1 Fingerprint    E1:1C:0C:42:19:C8:D7:07:F4:94:3C:45:EC:2F:EE:31:5C:A4:B3:82
SHA256 Fingerprint  4C:B8:B6:01:93:49:F0:1F:14:CF:63:19:F8:65:A1:8D:B5:06:F5:D5:D1:CF:C6:65:6A:C1:A2:77:F5:F4:C7:12
Updated             1 day ago
