import { CheckCheck } from "lucide-react";
import { Typography } from "./ui/typography";

export function Logo() {
  return (
    <span>
      <Typography variant="h4" className="font-bold">
        <CheckCheck className="mr-1 inline-block" />
        ToDo
      </Typography>
    </span>
  );
}
