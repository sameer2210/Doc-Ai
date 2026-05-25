import { Platform } from 'react-native';

export type GoogleAuthResult = {
  idToken: string;
  providerAccessToken?: string;
};

export type GoogleWebPromptAsync = (options?: { showInRecents?: boolean }) => Promise<any>;

let nativeGoogleConfigured = false;

type NativeGoogleSignin = {
  configure: (options: { webClientId: string; scopes?: string[] }) => void;
  hasPlayServices: (options?: { showPlayServicesUpdateDialog?: boolean }) => Promise<unknown>;
  signIn: () => Promise<any>;
};

async function getNativeGoogleSignin(): Promise<NativeGoogleSignin | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  // Load native dependency lazily so web never needs the native module at runtime.
  const module = await import('@react-native-google-signin/google-signin');

  return module.GoogleSignin as NativeGoogleSignin;
}

const normalizeClientId = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed.toLowerCase().startsWith('dummy-')) return undefined;
  return trimmed;
};

export function getGoogleWebClientId(): string | undefined {
  return normalizeClientId(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
}

function readIdTokenFromPayload(payload: any): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return payload.params?.id_token ?? payload.authentication?.idToken ?? payload.idToken ?? null;
}

function readProviderAccessTokenFromPayload(payload: any): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  return (
    payload.params?.access_token ?? payload.authentication?.accessToken ?? payload.accessToken ?? undefined
  );
}

async function configureNativeGoogleSignIn(): Promise<boolean> {
  const googleSignin = await getNativeGoogleSignin();
  if (!googleSignin) {
    return false;
  }

  if (nativeGoogleConfigured) {
    return true;
  }

  const webClientId = getGoogleWebClientId();
  if (!webClientId) {
    console.error('[GoogleAuth][Native] Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.');
    return false;
  }

  googleSignin.configure({
    webClientId,
    scopes: ['openid', 'profile', 'email'],
  });

  nativeGoogleConfigured = true;
  return true;
}

export async function signInWithGoogleWeb(promptAsync?: GoogleWebPromptAsync) {
  console.log('[GoogleAuth] platform:', Platform.OS);
  console.log('[GoogleAuth] auth method: expo-auth-session (web)');

  if (!promptAsync) {
    console.error('[GoogleAuth][Web] promptAsync is unavailable.');
    return null;
  }

  const result = await promptAsync({ showInRecents: true });

  if (result?.type !== 'success') {
    console.log('[GoogleAuth][Web] Sign-in did not complete successfully. Result type:', result?.type);
    return null;
  }

  const idToken = readIdTokenFromPayload(result);
  const providerAccessToken = readProviderAccessTokenFromPayload(result);

  console.log('[GoogleAuth] token received:', Boolean(idToken));

  if (!idToken) {
    console.error('[GoogleAuth][Web] No idToken returned from Google.');
    return null;
  }

  return {
    idToken,
    providerAccessToken,
  } satisfies GoogleAuthResult;
}

export async function signInWithGoogleNative() {
  const googleSignin = await getNativeGoogleSignin();
  if (!googleSignin) {
    console.error('[GoogleAuth][Native] Native Google Sign-In is unavailable on web.');
    return null;
  }

  console.log('[GoogleAuth] platform:', Platform.OS);
  console.log('[GoogleAuth] auth method: @react-native-google-signin/google-signin (native)');

  if (!(await configureNativeGoogleSignIn())) {
    return null;
  }

  if (Platform.OS === 'android') {
    await googleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  const signInResult = await googleSignin.signIn();

  if (signInResult?.type === 'cancelled') {
    console.log('[GoogleAuth][Native] Sign-in cancelled by user.');
    return null;
  }

  const data =
    signInResult && typeof signInResult === 'object' && 'data' in signInResult
      ? signInResult.data
      : signInResult;

  const idToken = readIdTokenFromPayload(data);
  const providerAccessToken = readProviderAccessTokenFromPayload(data);

  console.log('[GoogleAuth] token received:', Boolean(idToken));

  if (!idToken) {
    console.error('[GoogleAuth][Native] No idToken returned from Google.');
    return null;
  }

  return {
    idToken,
    providerAccessToken,
  } satisfies GoogleAuthResult;
}

export async function signInWithGoogle(options?: { promptAsync?: GoogleWebPromptAsync }) {
  if (Platform.OS === 'web') {
    return signInWithGoogleWeb(options?.promptAsync);
  }

  return signInWithGoogleNative();
}
