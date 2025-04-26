import { SignIn } from "@clerk/remix";
import { useRouteLoaderData } from "@remix-run/react";
import type { loader as rootLoader } from "../root";

export default function SignInPage() {
  const data = useRouteLoaderData<typeof rootLoader>("root");
  return (
    <div className="absolute pt-10 inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <SignIn
        routing="path"
        path={`/sign-in`}
        forceRedirectUrl={`${data?.baseUrl}/chains`}
      />
    </div>
  );
}
