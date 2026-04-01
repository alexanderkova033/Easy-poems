/** Best-effort wrappers: local/session storage can throw (quota, private mode). */

export function tryLocalStorageSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function tryLocalStorageRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function trySessionStorageSetItem(key: string, value: string): boolean {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
