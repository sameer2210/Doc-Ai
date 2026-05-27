import { Platform } from 'react-native';

export type GoogleAuthResult = {
  idToken: string;
  providerAccessToken?: string;
  profile?: {
    id?: string;
    email?: string;
    name?: string;
    givenName?: string;
    familyName?: string;
    picture?: string;
    locale?: string;
    emailVerified?: boolean;
  };
};

export type GoogleWebPromptAsync = (options?: { showInRecents?: boolean }) => Promise<any>;

let nativeGoogleConfigured = false;

type NativeGoogleSignin = {
  configure: (options: { webClientId: string; scopes?: string[] }) => void;
  hasPlayServices: (options?: { showPlayServicesUpdateDialog?: boolean }) => Promise<unknown>;
  signIn: () => Promise<any>;
  signOut: () => Promise<unknown>;
  revokeAccess: () => Promise<unknown>;
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

function decodeJwtPayload(idToken: string): Record<string, unknown> | null {
  const parts = idToken.split('.');
  if (parts.length < 2) return null;

  try {
    const decodeBase64 =
      typeof globalThis.atob === 'function'
        ? globalThis.atob.bind(globalThis)
        : null;
    if (!decodeBase64) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const decoded = decodeBase64(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function profileFromClaims(claims: Record<string, unknown> | null) {
  if (!claims) return undefined;

  return {
    id: typeof claims.sub === 'string' ? claims.sub : undefined,
    email: typeof claims.email === 'string' ? claims.email : undefined,
    name: typeof claims.name === 'string' ? claims.name : undefined,
    givenName: typeof claims.given_name === 'string' ? claims.given_name : undefined,
    familyName: typeof claims.family_name === 'string' ? claims.family_name : undefined,
    picture: typeof claims.picture === 'string' ? claims.picture : undefined,
    locale: typeof claims.locale === 'string' ? claims.locale : undefined,
    emailVerified: typeof claims.email_verified === 'boolean' ? claims.email_verified : undefined,
  };
}

function mergeProfiles(
  primary: GoogleAuthResult['profile'] | undefined,
  secondary: GoogleAuthResult['profile'] | undefined
): GoogleAuthResult['profile'] | undefined {
  if (!primary && !secondary) return undefined;
  return {
    id: primary?.id ?? secondary?.id,
    email: primary?.email ?? secondary?.email,
    name: primary?.name ?? secondary?.name,
    givenName: primary?.givenName ?? secondary?.givenName,
    familyName: primary?.familyName ?? secondary?.familyName,
    picture: primary?.picture ?? secondary?.picture,
    locale: primary?.locale ?? secondary?.locale,
    emailVerified: primary?.emailVerified ?? secondary?.emailVerified,
  };
}

async function configureNativeGoogleSignIn(): Promise<boolean> {
  let googleSignin: NativeGoogleSignin | null = null;
  try {
    googleSignin = await getNativeGoogleSignin();
    if (!googleSignin) {
      return false;
    }
  } catch (error) {
    console.error('[GoogleAuth][Native] Failed to load Google Sign-In module.', error);
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
  const claimsProfile = idToken ? profileFromClaims(decodeJwtPayload(idToken)) : undefined;

  console.log('[GoogleAuth] token received:', Boolean(idToken));

  if (!idToken) {
    console.error('[GoogleAuth][Web] No idToken returned from Google.');
    return null;
  }

  return {
    idToken,
    providerAccessToken,
    profile: claimsProfile,
  } satisfies GoogleAuthResult;
}

export async function signInWithGoogleNative() {
  let googleSignin: NativeGoogleSignin | null = null;
  try {
    googleSignin = await getNativeGoogleSignin();
    if (!googleSignin) {
      console.error('[GoogleAuth][Native] Native Google Sign-In is unavailable on web.');
      return null;
    }
  } catch (error) {
    console.error('[GoogleAuth][Native] Failed to initialize native Google Sign-In.', error);
    return null;
  }

  console.log('[GoogleAuth] platform:', Platform.OS);
  console.log('[GoogleAuth] auth method: @react-native-google-signin/google-signin (native)');

  if (!(await configureNativeGoogleSignIn())) {
    return null;
  }

  let signInResult: any;
  try {
    if (Platform.OS === 'android') {
      await googleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    signInResult = await googleSignin.signIn();
  } catch (error: any) {
    const code = typeof error?.code === 'string' ? error.code : undefined;
    if (code === 'SIGN_IN_CANCELLED' || code === '12501') {
      console.log('[GoogleAuth][Native] Sign-in cancelled by user.');
      return null;
    }

    console.error('[GoogleAuth][Native] Sign-in failed.', {
      code,
      message: error?.message ?? 'Unknown Google Sign-In error',
    });
    return null;
  }

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
  const claimsProfile = idToken ? profileFromClaims(decodeJwtPayload(idToken)) : undefined;
  const nativeProfile =
    data?.user && typeof data.user === 'object'
      ? {
          id: typeof data.user.id === 'string' ? data.user.id : undefined,
          email: typeof data.user.email === 'string' ? data.user.email : undefined,
          name: typeof data.user.name === 'string' ? data.user.name : undefined,
          givenName: typeof data.user.givenName === 'string' ? data.user.givenName : undefined,
          familyName: typeof data.user.familyName === 'string' ? data.user.familyName : undefined,
          picture: typeof data.user.photo === 'string' ? data.user.photo : undefined,
        }
      : undefined;

  console.log('[GoogleAuth] token received:', Boolean(idToken));

  if (!idToken) {
    console.error('[GoogleAuth][Native] No idToken returned from Google.');
    return null;
  }

  return {
    idToken,
    providerAccessToken,
    profile: mergeProfiles(nativeProfile, claimsProfile),
  } satisfies GoogleAuthResult;
}

export async function signInWithGoogle(options?: { promptAsync?: GoogleWebPromptAsync }) {
  if (Platform.OS === 'web') {
    return signInWithGoogleWeb(options?.promptAsync);
  }

  return signInWithGoogleNative();
}

export async function clearNativeGoogleSession(options: { revokeAccess?: boolean } = {}) {
  if (Platform.OS === 'web') {
    return;
  }

  let googleSignin: NativeGoogleSignin | null = null;
  try {
    googleSignin = await getNativeGoogleSignin();
  } catch (error) {
    console.warn('[GoogleAuth][Native] Unable to load Google Sign-In during logout.', error);
    return;
  }

  if (!googleSignin) return;

  if (options.revokeAccess) {
    try {
      await googleSignin.revokeAccess();
      console.log('[GoogleAuth][Native] Google access revoked.');
    } catch (error: any) {
      console.warn('[GoogleAuth][Native] Google revokeAccess skipped or failed.', {
        code: typeof error?.code === 'string' ? error.code : undefined,
        message: error?.message ?? 'Unknown revokeAccess error',
      });
    }
  }

  try {
    await googleSignin.signOut();
    console.log('[GoogleAuth][Native] Google session signed out.');
  } catch (error: any) {
    console.warn('[GoogleAuth][Native] Google signOut skipped or failed.', {
      code: typeof error?.code === 'string' ? error.code : undefined,
      message: error?.message ?? 'Unknown signOut error',
    });
  }
}
