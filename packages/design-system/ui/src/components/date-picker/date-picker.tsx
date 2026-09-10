// components/date-picker.tsx — date field, composed from Popover + Calendar + Button.
"use client";

import { CalendarIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "../../utils/cn.js";
import { Button } from "../button/index.js";
import { Calendar } from "../calendar/index.js";
import { Popover, PopoverContent, PopoverTrigger } from "../popover/index.js";

export type DatePickerProps = {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  /** Shown until a date is picked. A default, not a decision — pass your own translation. */
  placeholder?: string;
  className?: string;
  /**
   * BCP-47 tag the label is formatted with. A primitive cannot know the app's locale — and this
   * package may not import anything that decides one — so the caller supplies it. Left undefined,
   * Intl falls back to the runtime default, which is right for a single-locale app and wrong for
   * every other, in a way only the app can see.
   */
  locale?: string;
};

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  locale,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { year: "numeric", month: "long", day: "numeric" }),
    [locale],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-4" />
          {value ? dateFormatter.format(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          // react-day-picker does not infer the displayed month from `selected`: without this a
          // picker holding a date in March still opens on today, and the value the user set is
          // one they have to navigate back to.
          defaultMonth={value}
          onSelect={(date) => {
            onChange?.(date);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
