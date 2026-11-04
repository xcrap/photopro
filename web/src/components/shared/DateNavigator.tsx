import { useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import { inZone, toDeviceCalendarDay } from '@/lib/time/zone'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

interface DateNavigatorProps {
  date: Date
  /** Location time zone the date is shown in. */
  timeZone: string
  isToday: boolean
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  onDateSelect: (date: Date) => void
}

export function DateNavigator({ date, timeZone, isToday, onPrevious, onNext, onToday, onDateSelect }: DateNavigatorProps) {
  const [open, setOpen] = useState(false)
  const formattedDate = isToday ? 'Today' : format(date, 'MMM d', inZone(timeZone))
  // The calendar works in device-local days; show the location-local day.
  const calendarDay = toDeviceCalendarDay(date, timeZone)

  return (
    <div className="flex items-center gap-0.5">
      {!isToday && (
        <button
          onClick={onToday}
          className="mr-1 flex h-7 items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.03] px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          aria-label="Go to today"
        >
          <RotateCcw className="h-2.5 w-2.5" />
          Today
        </button>
      )}

      <button
        onClick={onPrevious}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
        aria-label="Previous day"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            aria-label={`Choose date (${formattedDate})`}
            className="rounded-md px-2 py-1 text-xs font-medium tabular-nums text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            {formattedDate}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={calendarDay}
            onSelect={(day) => {
              if (day) {
                onDateSelect(day)
                setOpen(false)
              }
            }}
            defaultMonth={calendarDay}
          />
        </PopoverContent>
      </Popover>

      <button
        onClick={onNext}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
        aria-label="Next day"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
