import { SignIn } from "@clerk/remix";

export default function SignInPage() {
  return (
    <div className="absolute pt-10 inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/chains"
      />
    </div>
  );
}