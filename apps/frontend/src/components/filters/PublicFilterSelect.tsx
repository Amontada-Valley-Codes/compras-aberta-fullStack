"use client";

import { useState } from "react";
import * as Select from "@radix-ui/react-select";
import { CalendarDays, Check, ChevronDown, ChevronUp, FileBarChart, FileSearch, MapPin } from "lucide-react";

type FilterIcon = "municipality" | "nature" | "year";

interface FilterOption {
  value: string;
  label: string;
}

interface PublicFilterSelectProps {
  name: string;
  label: string;
  allLabel?: string;
  options: FilterOption[];
  defaultValue?: string;
  icon: FilterIcon;
  variant: "landing" | "analysis";
}

const allValue = "__all__";

export function PublicFilterSelect({ name, label, allLabel, options, defaultValue = "", icon, variant }: PublicFilterSelectProps) {
  const [value, setValue] = useState(defaultValue || allValue);
  const Icon = icon === "municipality" ? MapPin : icon === "year" ? CalendarDays : variant === "landing" ? FileSearch : FileBarChart;

  return <div className="public-filter-select">
    <input type="hidden" name={name} value={value === allValue ? "" : value} />
    <Select.Root value={value} onValueChange={setValue}>
      <Select.Trigger className="public-filter-trigger" aria-label={label}>
        <Icon className="public-filter-leading" aria-hidden="true" />
        <span className="public-filter-copy"><small>{label}</small><span className="public-filter-value"><Select.Value /></span></span>
        <Select.Icon asChild><ChevronDown className="public-filter-chevron" aria-hidden="true" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="public-filter-content" position="popper" sideOffset={6} collisionPadding={12}>
          <Select.ScrollUpButton className="public-filter-scroll"><ChevronUp size={16} /></Select.ScrollUpButton>
          <Select.Viewport className="public-filter-viewport">
            {allLabel && <FilterItem value={allValue} label={allLabel} />}
            {options.map((item) => <FilterItem key={item.value} value={item.value} label={item.label} />)}
          </Select.Viewport>
          <Select.ScrollDownButton className="public-filter-scroll"><ChevronDown size={16} /></Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  </div>;
}

function FilterItem({ value, label }: FilterOption) {
  return <Select.Item className="public-filter-item" value={value}>
    <Select.ItemText>{label}</Select.ItemText>
    <Select.ItemIndicator className="public-filter-check"><Check size={15} /></Select.ItemIndicator>
  </Select.Item>;
}
