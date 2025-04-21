export function getS3KeyFromUrl(url: string): string | null {
    try {
      const u = new URL(url);
      return u.pathname.startsWith("/") ? u.pathname.slice(1) : u.pathname;
    } catch {
      return null;
    }
  }
  