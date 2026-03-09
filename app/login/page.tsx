"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default function AppPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;

      const session = data.session;
      if (!session) {
        router.replace("/login");
        return;
      }

      const userEmail = session.user.email;
      if (!userEmail) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      const { data: accessRow, error: accessError } = await supabase
        .from("mizo_users")
        .select("access_active")
        .eq("email", userEmail)
        .maybeSingle();

      if (!isMounted) return;

      if (accessError || !accessRow?.access_active) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      setAuthChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        router.replace("/login");
        return;
      }

      void (async () => {
        const userEmail = session.user.email;
        if (!userEmail) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        const { data: accessRow, error: accessError } = await supabase
          .from("mizo_users")
          .select("access_active")
          .eq("email", userEmail)
          .maybeSingle();

        if (!isMounted) return;

        if (accessError || !accessRow?.access_active) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        setAuthChecked(true);
      })();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut({ scope: "local" });
    router.replace("/login");
  }

  if (!authChecked) {
    return <div>Loading...</div>;
  }

  return (
    <main>
      <h1>Welcome to the App</h1>
      <button onClick={handleLogout}>Logout</button>
    </main>
  );
}