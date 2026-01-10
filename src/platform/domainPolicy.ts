export class DefaultDomainPolicy {
  domainFromUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, "");
    } catch {
      return "unknown";
    }
  }
}
