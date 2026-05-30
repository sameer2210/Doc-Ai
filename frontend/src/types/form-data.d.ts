type ReactNativeFormDataFile = {
  uri: string;
  name: string;
  type: string;
};

declare global {
  interface FormData {
    append(name: string, value: ReactNativeFormDataFile): void;
  }
}

export {};

