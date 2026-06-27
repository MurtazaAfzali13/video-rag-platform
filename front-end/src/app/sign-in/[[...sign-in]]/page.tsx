import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050816] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/8 blur-[120px]" />
      <SignIn
        appearance={{
          variables: {
            colorPrimary: "#7c3aed",
            colorBackground: "#08101F",
            colorText: "#f8fafc",
            colorTextSecondary: "#94a3b8",
            colorInputBackground: "#0C1426",
            colorInputText: "#f8fafc",
            borderRadius: "12px",
          },
        }}
      />
    </main>
  );
}
