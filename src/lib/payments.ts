export interface CheckoutLine {
  id: string;
  quantity: number;
}

export interface InitiatePaynowRequest {
  method: "ecocash" | "onemoney" | "visa";
  phone?: string;
  email?: string;
  items: CheckoutLine[];
}

export interface InitiatePaynowResponse {
  reference: string;
  orderNumber: string;
  redirectUrl: string;
  pollUrl: string;
  amount: number;
}

export interface PaynowStatusResponse {
  reference: string;
  orderNumber: string | null;
  amount: number;
  status: string;
  paid: boolean;
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const raw = await response.text();
  let payload: unknown = null;

  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof (payload as { error: unknown }).error === "string"
        ? (payload as { error: string }).error
        : raw?.trim() || "API request failed";
    throw new Error(message);
  }

  return payload as T;
}

export async function initiatePaynowPayment(input: InitiatePaynowRequest): Promise<InitiatePaynowResponse> {
  const response = await fetch("/api/payments/paynow/initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  return parseApiResponse<InitiatePaynowResponse>(response);
}

export async function getPaynowStatus(reference: string): Promise<PaynowStatusResponse> {
  const response = await fetch(`/api/payments/paynow/status/${encodeURIComponent(reference)}`, {
    credentials: "include",
  });
  return parseApiResponse<PaynowStatusResponse>(response);
}
