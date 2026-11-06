import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRef, useState } from "react";
import { href, useNavigate } from "react-router";

const validate = (input: HTMLInputElement) => {
  if (input.validity.valueMissing) {
    input.setCustomValidity("部屋IDを入力してください");
  } else {
    input.setCustomValidity("");
  }

  return input.reportValidity();
};

export default () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [roomId, setRoomId] = useState("");

  const navigate = useNavigate();

  const joinRoom = () => {
    const input = inputRef.current;
    if (input == null) return;

    const isValid = validate(input);
    if (!isValid) return;

    navigate(href("/room/:roomId", { roomId }));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-36">
      <Card>
        <CardHeader>
          <CardTitle>部屋に参加する</CardTitle>
          <CardDescription>部屋を作成する場合も参加するを押下してください</CardDescription>
          <CardAction>
            <Button onClick={joinRoom}>参加する</Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          <Label htmlFor="roomId">部屋ID</Label>
          <Input
            type="text"
            id="roomId"
            autoComplete="off"
            value={roomId}
            onChange={(e) => {
              setRoomId(e.target.value);
              if (inputRef.current != null) validate(inputRef.current);
            }}
            ref={inputRef}
            required
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                joinRoom();
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};
