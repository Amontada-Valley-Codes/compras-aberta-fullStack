"use client";

import { useDeferredValue, useMemo, useState } from "react";
import * as Select from "@radix-ui/react-select";
import {
  ArrowUpDown,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Check,
  ChevronDown,
  ChevronUp,
  Gavel,
  MapPinned,
  ReceiptText,
} from "lucide-react";

type FilterIcon = "municipality" | "nature" | "year" | "modality" | "sort";

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
  variant?: "landing" | "analysis" | "dashboard";
  disabled?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
}

const allValue = "__all__";
const MAX_VISIBLE_OPTIONS = 60;

export function PublicFilterSelect({
  name,
  label,
  allLabel,
  options,
  defaultValue = "",
  icon,
  variant = "analysis",
  disabled = false,
  value: controlledValue,
  onValueChange,
}: PublicFilterSelectProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || allValue);
  const value = controlledValue === undefined ? internalValue : controlledValue || allValue;
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const showSearch = options.length > 5;
  const Icon =
    icon === "municipality"
      ? MapPinned
      : icon === "year"
        ? CalendarDays
        : icon === "modality"
          ? Gavel
          : icon === "sort"
            ? ArrowUpDown
            : variant === "landing"
              ? ReceiptText
              : ChartNoAxesColumnIncreasing;
  const normalizedOptions = useMemo(
    () => options.map((item) => ({ item, normalizedLabel: item.label.toLocaleLowerCase("pt-BR") })),
    [options],
  );
  const { visibleOptions, hasMoreOptions } = useMemo(() => {
    const term = deferredSearch.trim().toLocaleLowerCase("pt-BR");
    const matches = (term
      ? normalizedOptions.filter(({ normalizedLabel }) => normalizedLabel.includes(term))
      : [...normalizedOptions]);
    matches.sort((a, b) => Number(b.normalizedLabel.startsWith(term)) - Number(a.normalizedLabel.startsWith(term)));
    return {
      visibleOptions: matches.slice(0, MAX_VISIBLE_OPTIONS).map(({ item }) => item),
      hasMoreOptions: matches.length > MAX_VISIBLE_OPTIONS,
    };
  }, [deferredSearch, normalizedOptions]);
  const selectedLabel =
    value === allValue
      ? allLabel
      : options.find((item) => item.value === value)?.label;

  return (
    <div className={`public-filter-select ${variant === "dashboard" ? "is-dashboard" : ""}`}>
      <input
        type="hidden"
        name={name}
        value={value === allValue ? "" : value}
      />
      <Select.Root
        value={value}
        disabled={disabled}
        onValueChange={(nextValue) => {
          setInternalValue(nextValue);
          onValueChange?.(nextValue === allValue ? "" : nextValue);
        }}
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
            className={`public-filter-content ${variant === "dashboard" ? "is-dashboard" : ""}`}
            position="popper"
            sideOffset={6}
            collisionPadding={12}
          >
            {showSearch && <div className="public-filter-search-wrap">
              <input
                className="public-filter-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDownCapture={(event) => {
                  event.stopPropagation();
                  event.nativeEvent.stopImmediatePropagation();
                }}
                onKeyDown={(event) => event.stopPropagation()}
                onKeyUp={(event) => {
                  event.stopPropagation();
                  event.nativeEvent.stopImmediatePropagation();
                }}
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
              {hasMoreOptions && <p className="public-filter-empty">Mostrando os primeiros {MAX_VISIBLE_OPTIONS} resultados. Digite mais letras para refinar.</p>}
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
