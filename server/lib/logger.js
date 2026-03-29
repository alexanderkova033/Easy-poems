import { randomUUID } from "node:crypto";

/**
 * @param {Record<string, unknown>} fields
 */
function emit(level, fields) {
  console.log(
    JSON.stringify({
      level,
      ts: new Date().toISOString(),
      ...fields,
    })
  );
}

/**
 * @param {{ requestId?: string }} [defaults]
 */
export function createRequestLogger(defaults = {}) {
  const base = { ...defaults };
  return {
    /**
     * @param {string} msg
     * @param {Record<string, unknown>} [extra]
     */
    info(msg, extra = {}) {
      emit("info", { msg, ...base, ...extra });
    },
    /**
     * @param {string} msg
     * @param {Record<string, unknown>} [extra]
     */
    warn(msg, extra = {}) {
      emit("warn", { msg, ...base, ...extra });
    },
    /**
     * @param {string} msg
     * @param {Record<string, unknown>} [extra]
     */
    error(msg, extra = {}) {
      emit("error", { msg, ...base, ...extra });
    },
  };
}

export function newRequestId(headerValue) {
  const fromClient =
    typeof headerValue === "string" ? headerValue.trim() : "";
  if (fromClient.length > 0 && fromClient.length <= 128) return fromClient;
  return randomUUID();
}
