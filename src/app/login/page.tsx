import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { parseSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
  const session = await parseSessionToken(token);

  if (session) {
    redirect("/");
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-8 sm:py-10">
      <LoginForm />
    </main>
  );
}
