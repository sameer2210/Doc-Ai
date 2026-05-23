const whitelist = [
  'http://localhost:8081',   // Expo web (dev)
  'http://localhost:19006',  // Expo web (alt)
  'http://localhost:19000',  // Expo DevTools
  'http://localhost:8000',   // Backend Swagger UI
  'https://docai-backend.onrender.com', // Production backend
  // Add your production frontend URL here when deploying
];

export const CorsConfig = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Allow requests with no origin (Expo mobile, Postman, server-to-server)
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin '${origin}' is not allowed`));
    }
  },
  // credentials: false — tokens travel in Authorization header, not cookies
  credentials: false,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type, Accept, Authorization',
};
