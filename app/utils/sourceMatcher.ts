export const sourceMatchers = [
    {
      regex: /https:\/\/[\w.-]+\.sharepoint\.com\/[^\s)"]+/g,
      source: "SHAREPOINT",
      extractName: (url: string) => {
        try {
          const decodedUrl = decodeURIComponent(url);
  
          // Matchar: wd=target(NOTEBOOK|.../PAGE|...)
          const wdMatch = decodedUrl.match(/wd=target\(([^|]+)\|[^/]+\/([^|)]+)\|/);
          if (wdMatch) {
            const notebook = wdMatch[1]; // t.ex. IC-2026.one
            const pageName = wdMatch[2]; // t.ex. 2025-04-09 Venue Evaluation Meeting
            return `${notebook} / ${pageName}`;
          }
  
          // Fallback till sista path-segment
          const fallback = url.split("/").pop()?.split("?")[0];
          if (fallback) return decodeURIComponent(fallback);
  
          return "SharePoint-länk";
        } catch {
          return "Ogiltig länk";
        }
      },
    },
  ];