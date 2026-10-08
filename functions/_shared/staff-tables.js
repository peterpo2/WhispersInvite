const MAX_POSTGRES_INTEGER = 2147483647;
const TABLE_ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;

export function validateMinimumSpendPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  if (typeof body.tableId !== "string") return null;
  const tableId = body.tableId.trim();
  if (!TABLE_ID_PATTERN.test(tableId)) return null;

  const rawValue = body.minimumSpendEur;
  const normalized = typeof rawValue === "string" ? rawValue.trim() : rawValue;
  const minimumSpendEur = normalized === "" ? 0 : Number(normalized);
  if (!Number.isSafeInteger(minimumSpendEur) || minimumSpendEur < 0 || minimumSpendEur > MAX_POSTGRES_INTEGER) {
    return null;
  }

  return { tableId, minimumSpendEur };
}

export function validateTablePositionPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  if (typeof body.tableId !== "string") return null;
  const tableId = body.tableId.trim();
  if (!TABLE_ID_PATTERN.test(tableId)) return null;
  if (body.mapX === "" || body.mapY === "") return null;

  const mapX = Number(body.mapX);
  const mapY = Number(body.mapY);
  if (!Number.isFinite(mapX) || !Number.isFinite(mapY) || mapX < 0 || mapX > 100 || mapY < 0 || mapY > 100) {
    return null;
  }

  return {
    tableId,
    mapX: Math.round(mapX * 100) / 100,
    mapY: Math.round(mapY * 100) / 100,
  };
}

export function validateHallPositionPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  if (body.hallX === null || body.hallY === null) return null;
  const position = validateTablePositionPayload({ tableId: body.tableId, mapX: body.hallX, mapY: body.hallY });
  if (!position) return null;
  return { tableId: position.tableId, hallX: position.mapX, hallY: position.mapY };
}
