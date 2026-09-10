import ClientShell from "./client-shell";

export const dynamic = "force-dynamic";

export default function Home() {
  return <ClientShell user={null} signInPath="#" signOutPath="#" />;
}
