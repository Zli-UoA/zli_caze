import type { ConfigCollection } from "@/components/collections/config";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { type ReactNode, createContext, useContext, useState } from "react";

const UsernameDialogSetIsOpenContext = createContext((isOpen: boolean) => {});
const UsernameDialogIsOpenContext = createContext(false);

export const UsernameDialogContextProvider = ({
  children,
}: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <UsernameDialogSetIsOpenContext value={setIsOpen}>
      <UsernameDialogIsOpenContext value={isOpen}>
        {children}
      </UsernameDialogIsOpenContext>
    </UsernameDialogSetIsOpenContext>
  );
};

export const useUsername = (configCollection: ConfigCollection) => {
  const { data: config } = useLiveQuery((q) =>
    q
      .from({ config: configCollection })
      .where(({ config }) => eq(config.key, "username")),
  );
  const username = config.find((c) => c.key === "username")?.value;

  const setIsOpenDialog = useContext(UsernameDialogSetIsOpenContext);
  const isOpenDialog = useContext(UsernameDialogIsOpenContext);

  return { username, setIsOpenDialog, isOpenDialog };
};

export const UsernameDialog = ({
  configCollection,
}: { configCollection: ConfigCollection }) => {
  const {
    username: currentUsername,
    setIsOpenDialog,
    isOpenDialog,
  } = useUsername(configCollection);

  const [inputUsername, setInputUsername] = useState(currentUsername ?? "");

  const saveUsername = (username: string) => {
    const trimmedUsername = username.trim();
    if (trimmedUsername === "") return;

    if (currentUsername == null) {
      configCollection.insert({ key: "username", value: trimmedUsername });
    } else {
      configCollection.update("username", (draft) => {
        draft.value = trimmedUsername;
      });
    }

    setIsOpenDialog(false);
  };

  return (
    <Dialog open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ユーザー名を設定</DialogTitle>
          <DialogDescription>
            ユーザー名を入力してください(現在のユーザー名: {currentUsername})
          </DialogDescription>
        </DialogHeader>
        <Input
          value={inputUsername}
          onChange={(e) => setInputUsername(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            saveUsername(inputUsername);
          }}
        />
        <DialogFooter>
          <Button onClick={() => saveUsername(inputUsername)}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
