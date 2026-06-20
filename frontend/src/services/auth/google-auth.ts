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

export type GoogleWebPromptAsync = (options?: { showInRecents?: boolean }) => Promise<unknown>;

let nativeGoogleConfigured = false;

type NativeGoogleSignin = {
  configure: (options: { webClientId: string; scopes?: string[] }) => void;
  hasPlayServices: (options?: { showPlayServicesUpdateDialog?: boolean }) => Promise<unknown>;
  signIn: () => Promise<unknown>;
  signOut: () => Promise<unknown>;
  revokeAccess: () => Promise<unknown>;
};

type GooglePayloadRecord = Record<string, unknown> & {
  params?: { id_token?: string; access_token?: string };
  authentication?: { idToken?: string; accessToken?: string };
  idToken?: string;
  accessToken?: string;
  user?: {
    id?: string;
    email?: string;
    name?: string;
    givenName?: string;
    familyName?: string;
    photo?: string;
  };
  type?: string;
  data?: unknown;
};

type ErrorWithCode = Error & {
  code?: string;
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

function isRecord(value: unknown): value is GooglePayloadRecord {
  return Boolean(value && typeof value === 'object');
}

function readIdTokenFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const record = payload as GooglePayloadRecord;

  return record.params?.id_token ?? record.authentication?.idToken ?? record.idToken ?? null;
}

function readProviderAccessTokenFromPayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }
  const record = payload as GooglePayloadRecord;

  return (
    record.params?.access_token ?? record.authentication?.accessToken ?? record.accessToken ?? undefined
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
  } catch {
    return false;
  }

  if (nativeGoogleConfigured) {
    return true;
  }

  const webClientId = getGoogleWebClientId();
  if (!webClientId) {
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



  if (!promptAsync) {
    return null;
  }

  const result = await promptAsync({ showInRecents: true });
  const resultRecord = isRecord(result) ? result : null;

  if (resultRecord?.type !== 'success') {

    return null;
  }

  const idToken = readIdTokenFromPayload(result);
  const providerAccessToken = readProviderAccessTokenFromPayload(result);
  const claimsProfile = idToken ? profileFromClaims(decodeJwtPayload(idToken)) : undefined;



  if (!idToken) {
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
      return null;
    }
  } catch {
    return null;
  }




  if (!(await configureNativeGoogleSignIn())) {
    return null;
  }

  let signInResult: unknown;
  try {
    if (Platform.OS === 'android') {
      await googleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    signInResult = await googleSignin.signIn();
  } catch (error: unknown) {
    const code = error instanceof Error && typeof (error as ErrorWithCode).code === 'string' ? (error as ErrorWithCode).code : undefined;
    if (code === 'SIGN_IN_CANCELLED' || code === '12501') {

      return null;
    }


    return null;
  }

  if (isRecord(signInResult) && signInResult.type === 'cancelled') {

    return null;
  }

  const data =
    isRecord(signInResult) && 'data' in signInResult
      ? signInResult.data
      : signInResult;

  const idToken = readIdTokenFromPayload(data);
  const providerAccessToken = readProviderAccessTokenFromPayload(data);
  const claimsProfile = idToken ? profileFromClaims(decodeJwtPayload(idToken)) : undefined;
  const dataRecord = isRecord(data) ? data : null;
  const nativeProfile =
    dataRecord?.user && typeof dataRecord.user === 'object'
      ? {
          id: typeof dataRecord.user.id === 'string' ? dataRecord.user.id : undefined,
          email: typeof dataRecord.user.email === 'string' ? dataRecord.user.email : undefined,
          name: typeof dataRecord.user.name === 'string' ? dataRecord.user.name : undefined,
          givenName: typeof dataRecord.user.givenName === 'string' ? dataRecord.user.givenName : undefined,
          familyName: typeof dataRecord.user.familyName === 'string' ? dataRecord.user.familyName : undefined,
          picture: typeof dataRecord.user.photo === 'string' ? dataRecord.user.photo : undefined,
        }
      : undefined;



  if (!idToken) {
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
  } catch {
    return;
  }

  if (!googleSignin) return;

  if (options.revokeAccess) {
    try {
      await googleSignin.revokeAccess();

    } catch {
      
    }
  }

  try {
    await googleSignin.signOut();
  } catch {
    
  }
}
