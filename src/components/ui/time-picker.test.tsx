import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimePicker, normalizeTo24h } from "./time-picker";

describe("TimePicker — native HTML5 time picker with standard 3-column Chromium support", () => {
  it("renders a native input with type='time'", () => {
    render(<TimePicker value="14:30" onChange={() => {}} />);
    const input = screen.getByDisplayValue("14:30");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "time");
  });

  it("normalizes 12h format e.g. 02:30 PM to 24h 14:30", () => {
    expect(normalizeTo24h("2:30 PM")).toBe("14:30");
    expect(normalizeTo24h("12:15 AM")).toBe("00:15");
    expect(normalizeTo24h("12:15 PM")).toBe("12:15");
    expect(normalizeTo24h("08:05 AM")).toBe("08:05");
    expect(normalizeTo24h("2026-10-17T09:45:00")).toBe("09:45");
  });

  it("emits 24h time on change", () => {
    const onChange = vi.fn();
    render(<TimePicker value="08:15" onChange={onChange} />);

    const input = screen.getByDisplayValue("08:15");
    fireEvent.change(input, { target: { value: "20:15" } });

    expect(onChange).toHaveBeenCalledWith("20:15");
  });

  it("clears the value when clearable button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimePicker value="08:00" onChange={onChange} clearable />);

    const clearButton = screen.getByRole("button", { name: "Clear time" });
    await user.click(clearButton);

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("respects the disabled prop", () => {
    render(<TimePicker value="09:00" onChange={() => {}} disabled />);
    const input = screen.getByDisplayValue("09:00");
    expect(input).toBeDisabled();
  });
});
