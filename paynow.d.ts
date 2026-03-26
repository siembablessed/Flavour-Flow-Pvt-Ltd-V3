declare module "paynow" {
  export interface Payment {
    add: (description: string, amount: number) => void;
    info?: string;
  }

  export interface PaymentResponse {
    success: boolean;
    pollUrl?: string;
    redirectUrl?: string;
    error?: string;
  }

  export interface TransactionStatus {
    status: string;
    paid?: boolean;
  }

  export class Paynow {
    constructor(integrationId: string, integrationKey: string, resultUrl?: string, returnUrl?: string);
    resultUrl?: string;
    returnUrl?: string;
    createPayment(reference: string, email: string): Payment;
    send(payment: Payment): Promise<PaymentResponse>;
    pollTransaction(pollUrl: string): Promise<TransactionStatus>;
    parseStatusUpdate(raw: string): { reference?: string; status?: string };
  }
}
