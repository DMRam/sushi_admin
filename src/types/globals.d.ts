interface Window {
  gtag: (
    command: string,
    action: string,
    params?: {
      [key: string]: any;
    }
  ) => void;
}

declare const gtag: (
  command: string,
  action: string,
  params?: {
    [key: string]: any;
  }
) => void;
