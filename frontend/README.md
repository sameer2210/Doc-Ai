# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.


Act as a senior React Native + Expo architect and frontend engineer.

I am building a production-grade AI chat application similar to ChatGPT.

Project Requirements:
- AI chat application
- User can send:
  - text prompts
  - images
  - documents/files
- ML model processing is handled by a separate backend/ML team
- Frontend only communicates with backend APIs
- Real-time streaming responses
- Chat history
- Markdown/code rendering
- Modern responsive UI
- Android + iOS support
- Scalable architecture
- Production-ready codebase
- TypeScript mandatory

My Stack Requirements:
- React Native
- Expo CLI
- Expo Router
- TypeScript
- NativeWind
- Zustand
- TanStack React Query
- Axios
- React Hook Form
- Zod
- FlashList
- Reanimated
- Bottom Sheet
- Secure Store
- Image Picker
- Document Picker

Important Architecture Rules:
- NEVER use OpenAI SDK or Gemini SDK directly in frontend
- Frontend should only communicate with backend APIs
- Frontend:

Expo Auth Session
SecureStore
React Query

that i will do  Backend:nestjs JWT Refresh token Google OAuth
ans start doing
- Secure token storage using Expo Secure Store
- Backend handles:
  - AI provider calls
  - ML communication
  - PostgreSQL
  - authentication
  - streaming
  - chat persistence

Frontend Responsibilities:
- Authentication UI
- Chat UI
- Streaming response rendering
- File/image uploads
- Markdown rendering
- Optimistic updates
- Pagination
- State management
- API integration
- Mobile UX
- Animations
- Dark/light theme

Need:
1. Best modern Expo project setup (2026 standards)
2. Best folder structure
3. Recommended packages with reasons
4. Exact package installation commands
5. Scalable frontend architecture
6. Best practices for AI chat apps
7. iOS compatibility-safe package recommendations
8. Clean API layer architecture
9. Feature-based architecture
10. Performance optimization tips
11. Recommended state management approach
12. Streaming response implementation approach
13. Modern reusable UI component strategy
14. Environment variable setup
15. Error handling architecture
16. Recommended naming conventions
17. Production-grade frontend patterns

Also provide:
- packages to avoid
- anti-patterns
- outdated approaches I should not use
- common mistakes in AI chat apps

Use latest stable versions and modern industry standards only.

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