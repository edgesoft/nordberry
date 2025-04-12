import { SignIn } from "@clerk/remix";
import { useRouteLoaderData } from "@remix-run/react";
import type { loader as rootLoader } from "../root";


export default function SignInPage() {
  const data = useRouteLoaderData<typeof rootLoader>("root");
  return (
    <div className="absolute pt-10 inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <SignIn
        routing="path"
        path={`/sign-in`}  // Viktigt: Matcha sökvägen till filen!
        forceRedirectUrl={`${data?.baseUrl}/chains`}   // Korrekt, dit du vill efter lyckad inloggning
      />
    </div>
  );
}