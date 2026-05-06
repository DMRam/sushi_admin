export {}

declare global {
  interface Window {
    fbq?: (
      command: 'track' | 'init' | 'trackCustom',
      eventName: string,
      params?: Record<string, unknown>
    ) => void
  }
}