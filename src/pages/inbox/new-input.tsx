import { TodoCheckerInput } from "@/components/todo";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";
import { CalendarIcon, ChevronDownIcon, FolderIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const InputTextRightPaddingPx = 15;

export function NewInput() {
  const rightGroupRef = useRef<HTMLDivElement>(null);
  const [rightPadding, setRightPadding] = useState(0);

  useEffect(() => {
    if (rightGroupRef.current) {
      const observer = new ResizeObserver(() => {
        if (rightGroupRef.current) {
          setRightPadding(
            rightGroupRef.current.offsetWidth + InputTextRightPaddingPx
          );
        }
      });

      observer.observe(rightGroupRef.current);

      return () => observer.disconnect();
    }
  }, []);

  return (
    <form className="relative">
      <Input
        style={{ paddingRight: `${rightPadding}px` }}
        type="textarea"
        placeholder="Add new todo"
        autoFocus
        className="pl-9 h-11"
      />

      <div className="absolute inset-y-0 left-2 flex items-center">
        <TodoCheckerInput done={false} className="hover:cursor-default" />
      </div>

      <div
        className="absolute top-0 right-2 bottom-0 flex flex-row items-center gap-2"
        ref={rightGroupRef}>
        <DueDateButton />

        <SelectProjectsButton />
      </div>
    </form>
  );
}

function DueDateButton() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);

  return (
    <div className="flex flex-col gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-auto px-2"
            type="button">
            <CalendarIcon />
            <Typography variant="p">{date?.toLocaleDateString()}</Typography>
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            today={date}
            captionLayout="dropdown"
            onSelect={(date) => {
              setDate(date);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SelectProjectsButton() {
  return (
    <Select>
      <SelectTrigger
        className="bg-secondary text-secondary-foreground hover:bg-secondary/80 h-7 border-none shadow-xs"
        size="sm">
        <FolderIcon className="text-secondary-foreground" />
        <SelectValue placeholder="Project" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fruits</SelectLabel>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="blueberry">Blueberry</SelectItem>
          <SelectItem value="grapes">Grapes</SelectItem>
          <SelectItem value="pineapple">Pineapple</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
