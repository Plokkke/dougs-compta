export function parseCookies(cookies: string[]): Record<string, string> {
  return cookies.reduce(
    (accumulator, cookie) => {
      cookie
        .split(/\s*;\s*/)
        .map((pair) => pair.split('='))
        .forEach(([key, value]) => {
          accumulator[key] = value;
        });
      return accumulator;
    },
    {} as Record<string, string>,
  );
}
