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
  redirectUrl: string;
  pollUrl: string;
  amount: number;
}

export interface PaynowStatusResponse {
  reference: string;
  amount: number;
  status: string;
  paid: boolean;
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = await response.json();

  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : "API request failed";
    throw new Error(message);
  }

  return payload as T;
}

export async function initiatePaynowPayment(input: InitiatePaynowRequest): Promise<InitiatePaynowResponse> {
  const response = await fetch("/api/payments/paynow/initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseApiResponse<InitiatePaynowResponse>(response);
}

export async function getPaynowStatus(reference: string): Promise<PaynowStatusResponse> {
  const response = await fetch(`/api/payments/paynow/status/${encodeURIComponent(reference)}`);
  return parseApiResponse<PaynowStatusResponse>(response);
}
