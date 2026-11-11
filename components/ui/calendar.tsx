'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { es } from 'react-day-picker/locale'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={es}
      weekStartsOn={1}
      navLayout="around"
      formatters={{
        formatCaption: (month) => capitalize(format(month, 'LLLL yyyy', { locale: es })),
        formatWeekdayName: (weekday) => capitalize(format(weekday, 'EEE', { locale: es })),
      }}
      className={cn('w-full max-w-[30rem]', className)}
      classNames={{
        root: 'w-full',
        months: 'w-full',
        month: 'relative w-full',
        month_caption: 'flex h-12 items-center justify-center rounded-xl border border-border bg-muted/40 px-12 shadow-sm',
        caption_label: 'text-sm font-semibold capitalize tracking-tight text-foreground sm:text-base',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'absolute left-1 top-1 z-10 h-10 w-10 rounded-lg border-border bg-background/80 p-0 text-foreground shadow-sm hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'absolute right-1 top-1 z-10 h-10 w-10 rounded-lg border-border bg-background/80 p-0 text-foreground shadow-sm hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        ),
        chevron: 'h-4 w-4',
        month_grid: 'w-full table-fixed border-separate border-spacing-y-1',
        weekdays: 'border-b border-border/70',
        weekday: 'h-9 pb-2 text-center text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground',
        week: '',
        day: 'h-11 p-0 text-center align-middle sm:h-12',
        day_button: 'relative mx-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-transparent text-sm font-medium text-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:h-11 sm:w-11',
        selected: '[&>button]:border-primary [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:shadow-[0_0_0_1px_rgba(142,232,194,0.3)] [&>button]:hover:bg-primary',
        today: '[&>button]:border-primary/80 [&>button]:text-primary',
        outside: 'opacity-40 [&>button]:text-muted-foreground',
        disabled: 'opacity-40',
        hidden: 'invisible',
        footer: 'mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground',
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation }) => {
          const Icon = {
            up: ChevronUp,
            down: ChevronDown,
            left: ChevronLeft,
            right: ChevronRight,
          }[orientation ?? 'left']

          return <Icon className={cn('h-4 w-4', className)} />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
