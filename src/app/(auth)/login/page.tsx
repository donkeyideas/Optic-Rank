import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="h-8 w-48 animate-pulse bg-surface-raised" />
          <div className="h-4 w-64 animate-pulse bg-surface-raised" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
