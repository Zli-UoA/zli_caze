import { createConfigCollection } from "@/components/collections/config";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ConfigCollectionProvider } from "@/lib/configContext";
import { UsernameDialog, UsernameDialogContextProvider, useUsername } from "@/lib/username";
import type { ConfigCollection } from "@/components/collections/config";
import { Link } from "@void/react";
import { Settings } from "lucide-react";
import { useMemo, useState, useEffect, type ReactNode } from "react";
import "../src/app/app.css";

const HeaderSettings = ({ configCollection }: { configCollection: ConfigCollection }) => {
  const { setIsOpenDialog } = useUsername(configCollection);
  return (
    <Button asChild variant="secondary" size="icon" onClick={() => setIsOpenDialog(true)}>
      <Settings />
    </Button>
  );
};

const App = ({
  children,
  configCollection,
}: {
  children: ReactNode;
  configCollection: ConfigCollection;
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <div className="bg-brand-secondary h-lvh overflow-y-scroll">
        <header className="bg-brand-dark text-brand-light fixed w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <Link href="/" className="flex items-center gap-4">
                <Logo className="h-8 text-brand-primary" />
                <span className="text-3xl font-bold">Caze (beta)</span>
              </Link>
              {mounted && <HeaderSettings configCollection={configCollection} />}
            </div>
          </div>
        </header>
        {children}
      </div>
      {mounted && <UsernameDialog configCollection={configCollection} />}
    </>
  );
};

export default function Layout({ children }: { children: ReactNode }) {
  const configCollection = useMemo(() => createConfigCollection(), []);

  return (
    <UsernameDialogContextProvider>
      <ConfigCollectionProvider value={configCollection}>
        <App configCollection={configCollection}>{children}</App>
      </ConfigCollectionProvider>
    </UsernameDialogContextProvider>
  );
}
