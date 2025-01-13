import { get } from "./get";

export function template(
  matcher: RegExp,
  tpl: string,
  options?: {
    replaceUnknown?: boolean;
    escape?: (value: any, key: string) => string;
  }
) {
  return (variables: Record<string, any>) => {
    const { replaceUnknown = false, escape: _escape } = options ?? {};
    return tpl.replace(new RegExp(matcher), (match, key: string) => {
      key = key.trim();
      const value = get(variables, key);
      if (value === undefined) {
        return replaceUnknown ? "" : match;
      }

      return (_escape ? _escape(value, key) : value) ?? "";
    });
  };
}
