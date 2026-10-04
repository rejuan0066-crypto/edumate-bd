import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { TimePicker } from "./time-picker";

describe("TimePicker — floating scroll containment", () => {
  it("renders the formatted 12h value on the trigger", () => {
    render(<TimePicker value="14:30" onChange={() => {}} />);
    expect(screen.getByText("2:30 PM")).toBeInTheDocument();
  });

  it("renders 24h format when requested", () => {
    render(<TimePicker value="14:30" onChange={() => {}} displayFormat="24h" />);
    expect(screen.getByText("14:30")).toBeInTheDocument();
  });

  it("lets the user switch AM to PM directly and saves the correct 24h value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimePicker value="08:15" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /8:15 PM|8:15 AM/ }));
    await user.click(screen.getByRole("button", { name: "PM" }));
    expect(screen.getByText("8:15 PM")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "সম্পন্ন" }));

    expect(onChange).toHaveBeenCalledWith("20:15");
  });

  it("wheel columns contain scroll so it never leaks to the page (mobile-safe)", async () => {
    const user = userEvent.setup();
    render(<TimePicker value="08:00" onChange={() => {}} />);

    await user.click(screen.getByRole("button"));

    // Radix Popover renders into a portal on document.body
    const wheels = document.querySelectorAll(".id-preview-scroll");
    expect(wheels.length).toBeGreaterThan(0);

    // Every scrollable wheel must contain its own overscroll and hide the scrollbar
    wheels.forEach((el) => {
      expect(el.className).toContain("overscroll-contain");
      expect(el.className).toContain("overflow-y-auto");
      expect(el.className).toContain("id-preview-scroll");
    });
  });
});
