"use client";

import { useMemo, useState } from "react";
import * as Select from "@radix-ui/react-select";
import {
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Check,
  ChevronDown,
  ChevronUp,
  MapPinned,
  ReceiptText,
} from "lucide-react";

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
  disabled?: boolean;
}

const allValue = "__all__";

export function PublicFilterSelect({
  name,
  label,
  allLabel,
  options,
  defaultValue = "",
  icon,
  variant,
  disabled = false,
}: PublicFilterSelectProps) {
  const [value, setValue] = useState(defaultValue || allValue);
  const [search, setSearch] = useState("");
  const showSearch = options.length > 5;
  const Icon =
    icon === "municipality"
      ? MapPinned
      : icon === "year"
        ? CalendarDays
        : variant === "landing"
          ? ReceiptText
          : ChartNoAxesColumnIncreasing;
  const visibleOptions = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return term
      ? options.filter((item) =>
          item.label.toLocaleLowerCase("pt-BR").includes(term),
        )
      : options;
  }, [options, search]);
  const selectedLabel =
    value === allValue
      ? allLabel
      : options.find((item) => item.value === value)?.label;

  return (
    <div className="public-filter-select">
      <input
        type="hidden"
        name={name}
        value={value === allValue ? "" : value}
      />
      <Select.Root
        value={value}
        disabled={disabled}
        onValueChange={setValue}
        onOpenChange={(open) => {
          if (!open) setSearch("");
        }}
      >
        <Select.Trigger className="public-filter-trigger" aria-label={label}>
          <Icon className="public-filter-leading" aria-hidden="true" />
          <span className="public-filter-copy">
            <small>{label}</small>
            <span className="public-filter-value">
              <Select.Value>{selectedLabel}</Select.Value>
            </span>
          </span>
          <Select.Icon asChild>
            <ChevronDown className="public-filter-chevron" aria-hidden="true" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className="public-filter-content"
            position="popper"
            sideOffset={6}
            collisionPadding={12}
          >
            {showSearch && <div className="public-filter-search-wrap">
              <input
                className="public-filter-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDownCapture={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                onKeyUp={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                autoComplete="off"
                placeholder="Buscar"
                aria-label={`Buscar em ${label.toLowerCase()}`}
              />
            </div>}
            {showSearch && <Select.ScrollUpButton className="public-filter-scroll">
              <ChevronUp size={16} />
            </Select.ScrollUpButton>}
            <Select.Viewport className="public-filter-viewport">
              {allLabel && <FilterItem value={allValue} label={allLabel} />}
              {visibleOptions.map((item) => (
                <FilterItem
                  key={item.value}
                  value={item.value}
                  label={item.label}
                />
              ))}
              {!visibleOptions.length && (
                <p className="public-filter-empty">
                  Nenhum resultado encontrado.
                </p>
              )}
            </Select.Viewport>
            {showSearch && <Select.ScrollDownButton className="public-filter-scroll">
              <ChevronDown size={16} />
            </Select.ScrollDownButton>}
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

function FilterItem({ value, label }: FilterOption) {
  return (
    <Select.Item className="public-filter-item" value={value}>
      <Select.ItemText>{label}</Select.ItemText>
      <Select.ItemIndicator className="public-filter-check">
        <Check size={15} />
      </Select.ItemIndicator>
    </Select.Item>
  );
}
