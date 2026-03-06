import { supabase } from "@/lib/supabase";

export default async function TestPage() {

  const { data, error } = await supabase
    .from("users")
    .select("*");

  if (error) {
    return (
      <pre>
        {JSON.stringify(error, null, 2)}
      </pre>
    );
  }

  return (
    <pre>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}