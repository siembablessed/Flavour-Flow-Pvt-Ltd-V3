import type { ApiRequest, ApiResponse } from "./_lib/httpTypes.js";

export default function handler(_req: ApiRequest, res: ApiResponse) {
  res.status(200).json({ ok: true });
}


