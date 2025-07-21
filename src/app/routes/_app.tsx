import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { UsernameDialog, useUsername } from "@/lib/username";
import { Settings } from "lucide-react";
import { Link, Outlet, href } from "react-router";

export default () => {
  const { setUsername } = useUsername();

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
                onClick={() => {
                  setUsername("");
                }}
              >
                <Settings />
              </Button>
            </div>
          </div>
        </header>
        <Outlet />
      </div>
      <UsernameDialog />
    </>
  );
};
