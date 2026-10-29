import LoginForm from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  return <LoginForm errorCode={query.error} signedOut={query.message === "signed_out"} />;
}
