import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { AmbientBackground } from "@/components/layout/ambient-background";
import { parseSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
  const session = await parseSessionToken(token);

  if (session) {
    redirect("/");
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <AmbientBackground />
      <main className="relative z-shell flex min-h-[100dvh] items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        <LoginForm />
      </main>
    </div>
  );
}
