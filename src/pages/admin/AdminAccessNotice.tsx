import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminAccessNoticeProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  extra?: ReactNode;
}

export default function AdminAccessNotice({
  title,
  description,
  actionLabel = "Back to store",
  actionHref = "/",
  extra,
}: AdminAccessNoticeProps) {
  return (
    <main className="min-h-screen bg-muted/30 flex items-center justify-center px-4">
      <Card className="w-full max-w-lg border-primary/10 shadow-sm">
        <CardHeader>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="secondary">
            <Link to={actionHref}>
              <Store className="mr-2 h-4 w-4" />
              {actionLabel}
            </Link>
          </Button>
          {extra}
        </CardContent>
      </Card>
    </main>
  );
}
