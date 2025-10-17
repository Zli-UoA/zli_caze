import {
  createConfigCollection,
  type ConfigCollection,
} from "@/components/collections/config";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  UsernameDialog,
  UsernameDialogContextProvider,
  useUsername,
} from "@/lib/username";
import { Settings } from "lucide-react";
import { Link, Outlet, href } from "react-router";
import type { Route } from "./+types/_app";
export const clientLoader = async ({ params }: Route.LoaderArgs) => {
  const configCollection = createConfigCollection();

  return { configCollection };
};

const App = ({ configCollection }: { configCollection: ConfigCollection }) => {
  const { setIsOpenDialog } = useUsername(configCollection);

  return (
    <>
      <div className="bg-brand-secondary h-lvh overflow-y-scroll">
        <header className="bg-brand-dark text-brand-light fixed w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <Link to={href("/")} className="flex items-center gap-4">
                <Logo className="h-8 text-brand-primary" />
                <span className="text-3xl font-bold">Caze (beta)</span>
              </Link>
              <Button
                asChild
                variant="secondary"
                size="icon"
                onClick={() => setIsOpenDialog(true)}
              >
                <Settings />
              </Button>
            </div>
          </div>
        </header>
        <Outlet context={configCollection} />
      </div>
      <UsernameDialog configCollection={configCollection} />
    </>
  );
};

export default ({ loaderData }: Route.ComponentProps) => {
  return (
    <UsernameDialogContextProvider>
      <App configCollection={loaderData.configCollection} />
    </UsernameDialogContextProvider>
  );
};
