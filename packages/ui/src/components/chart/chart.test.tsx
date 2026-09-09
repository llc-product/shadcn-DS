import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// ResponsiveContainer decides its size by measuring its parent. jsdom reports every element as
// 0x0, so the real one renders nothing and every assertion below would be about an empty tree.
// Only the measuring wrapper is replaced — ChartContainer, the tooltip and the legend are the
// real components.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive">{children}</div>
    ),
  };
});

const { ChartContainer, ChartLegendContent, ChartTooltipContent, useChart } =
  await import("./chart");
type ChartConfig = import("./chart").ChartConfig;

const CONFIG: ChartConfig = {
  desktop: { label: "Desktop", color: "oklch(0.6 0.2 250)" },
  mobile: {
    label: "Mobile",
    theme: { light: "oklch(0.7 0.1 160)", dark: "oklch(0.5 0.1 160)" },
  },
  tablet: { label: "Tablet" },
};

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <ChartContainer config={CONFIG} data-testid="chart">
      {/* The mocked ResponsiveContainer renders whatever it is given. */}
      <div>{children}</div>
    </ChartContainer>
  );
}

const item = (over: Record<string, unknown> = {}) => ({
  dataKey: "desktop",
  name: "desktop",
  // Required by recharts' Payload type; the components never read it.
  graphicalItemId: "series-desktop",
  value: 1234,
  color: "oklch(0.6 0.2 250)",
  payload: { desktop: 1234 },
  ...over,
});

describe("ChartContainer", () => {
  it("publishes one CSS custom property per series", () => {
    render(<Wrap>body</Wrap>);
    const chart = screen.getByTestId("chart");
    // A config colour wins; a theme colour is next; a series with neither falls back to the
    // theme-aware token, which is what keeps a chart re-brandable from the token layer alone.
    expect(chart.style.getPropertyValue("--color-desktop")).toBe("oklch(0.6 0.2 250)");
    expect(chart.style.getPropertyValue("--color-mobile")).toBe("oklch(0.7 0.1 160)");
    expect(chart.style.getPropertyValue("--color-tablet")).toBe("var(--color-chart-3)");
  });

  it("sets the style as an attribute, not through a <style> element", () => {
    // The production CSP allows style-src-attr but not an unnonced <style> tag; a chart that
    // injected one would render colourless in production and correct in every test.
    const { container } = render(<Wrap>body</Wrap>);
    expect(container.querySelector("style")).toBeNull();
    expect(screen.getByTestId("chart")).toHaveAttribute("style");
  });

  it("lets className win over the aspect it conflicts with", () => {
    render(
      <ChartContainer config={CONFIG} className="aspect-square" data-testid="chart">
        <div>body</div>
      </ChartContainer>,
    );
    const chart = screen.getByTestId("chart");
    expect(chart).toHaveClass("aspect-square");
    expect(chart).not.toHaveClass("aspect-video");
  });

  it("refuses to be used outside a <ChartContainer />", () => {
    function Stray() {
      useChart();
      return null;
    }
    expect(() => render(<Stray />)).toThrow(/must be used within a <ChartContainer \/>/);
  });
});

describe("ChartTooltipContent", () => {
  it("renders nothing while inactive or empty", () => {
    const { container, rerender } = render(
      <Wrap>
        <ChartTooltipContent active={false} payload={[item()]} />
      </Wrap>,
    );
    expect(container).not.toHaveTextContent("Desktop");

    rerender(
      <Wrap>
        <ChartTooltipContent active payload={[]} />
      </Wrap>,
    );
    expect(container).not.toHaveTextContent("Desktop");
  });

  it("shows the config label and the formatted value", () => {
    render(
      <Wrap>
        <ChartTooltipContent active payload={[item()]} label="desktop" />
      </Wrap>,
    );
    // Twice: once as the tooltip's label row, once as the series name beside its value.
    expect(screen.getAllByText("Desktop")).toHaveLength(2);
    // Pinned, not host-locale: this asserted the machine's locale before, so it passed in en-US
    // and failed in vi-VN ("1.234") on the same commit.
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("lets a consumer format the value", () => {
    render(
      <Wrap>
        <ChartTooltipContent
          active
          payload={[item()]}
          label="desktop"
          valueFormatter={(v) => `${Number(v) / 1000}k`}
        />
      </Wrap>,
    );
    expect(screen.getByText("1.234k")).toBeInTheDocument();
    expect(screen.queryByText("1,234")).not.toBeInTheDocument();
  });

  it("hides the label on request", () => {
    render(
      <Wrap>
        <ChartTooltipContent active hideLabel payload={[item()]} label="desktop" />
      </Wrap>,
    );
    expect(screen.queryByText("Desktop")).toBeInTheDocument();
    // The label row is gone; the series name inside the row remains.
    expect(screen.getAllByText("Desktop")).toHaveLength(1);
  });

  it("defers to a labelFormatter when given one", () => {
    render(
      <Wrap>
        <ChartTooltipContent
          active
          payload={[item()]}
          label="desktop"
          labelFormatter={(value) => `on ${String(value)}`}
        />
      </Wrap>,
    );
    expect(screen.getByText("on Desktop")).toBeInTheDocument();
  });

  it("defers to a value formatter when given one", () => {
    render(
      <Wrap>
        <ChartTooltipContent
          active
          payload={[item()]}
          formatter={(value) => `${String(value)} sessions`}
        />
      </Wrap>,
    );
    expect(screen.getByText("1234 sessions")).toBeInTheDocument();
  });

  // The border colour, not the background: `dashed` sets bg-transparent, and cn() resolves that
  // by DROPPING bg-(--color-bg) — so a background selector would report the dashed swatch missing
  // when it is only painted differently.
  const swatch = (root: HTMLElement) =>
    root.querySelector(".border-\\(--color-border\\)");

  it.each(["dot", "line", "dashed"] as const)("renders the %s indicator", (indicator) => {
    const { container } = render(
      <Wrap>
        <ChartTooltipContent active indicator={indicator} payload={[item()]} />
      </Wrap>,
    );
    expect(swatch(container)).not.toBeNull();
  });

  it("drops the indicator on request", () => {
    const { container } = render(
      <Wrap>
        <ChartTooltipContent active hideIndicator payload={[item()]} />
      </Wrap>,
    );
    expect(swatch(container)).toBeNull();
  });

  it("renders a config icon instead of the swatch", () => {
    const withIcon: ChartConfig = {
      desktop: { label: "Desktop", icon: () => <svg data-testid="icon" /> },
    };
    render(
      <ChartContainer config={withIcon}>
        <div>
          <ChartTooltipContent active payload={[item()]} />
        </div>
      </ChartContainer>,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("falls back to the payload's own name when the config has no entry", () => {
    render(
      <Wrap>
        <ChartTooltipContent
          active
          payload={[item({ dataKey: "other", name: "other" })]}
        />
      </Wrap>,
    );
    expect(screen.getByText("other")).toBeInTheDocument();
  });

  it("reads the label through nameKey when the series is named on the payload item itself", () => {
    // Two shapes reach the config: the key on the item, and the key inside item.payload. Both
    // are how recharts hands a series name over, depending on how the chart was built.
    render(
      <Wrap>
        <ChartTooltipContent active nameKey="name" payload={[item({ name: "mobile" })]} />
      </Wrap>,
    );
    expect(screen.getByText("Mobile")).toBeInTheDocument();
  });

  it("reads the label through nameKey when the series is named in the row's data", () => {
    render(
      <Wrap>
        <ChartTooltipContent
          active
          nameKey="series"
          payload={[item({ payload: { series: "mobile" } })]}
        />
      </Wrap>,
    );
    expect(screen.getByText("Mobile")).toBeInTheDocument();
  });
});

describe("ChartLegendContent", () => {
  it("renders nothing without a payload", () => {
    const { container } = render(
      <Wrap>
        <ChartLegendContent payload={[]} />
      </Wrap>,
    );
    expect(container).not.toHaveTextContent("Desktop");
  });

  it("lists each series by its config label", () => {
    render(
      <Wrap>
        <ChartLegendContent
          payload={[
            { value: "desktop", dataKey: "desktop", color: "oklch(0.6 0.2 250)" },
            { value: "mobile", dataKey: "mobile", color: "oklch(0.7 0.1 160)" },
          ]}
        />
      </Wrap>,
    );
    expect(screen.getByText("Desktop")).toBeInTheDocument();
    expect(screen.getByText("Mobile")).toBeInTheDocument();
  });

  it("pads below when it sits on top, and above when it sits underneath", () => {
    const payload = [
      { value: "desktop", dataKey: "desktop", color: "oklch(0.6 0.2 250)" },
    ];
    const { container, rerender } = render(
      <Wrap>
        <ChartLegendContent payload={payload} verticalAlign="top" />
      </Wrap>,
    );
    expect(container.querySelector(".pb-3")).not.toBeNull();

    rerender(
      <Wrap>
        <ChartLegendContent payload={payload} />
      </Wrap>,
    );
    expect(container.querySelector(".pt-3")).not.toBeNull();
  });

  it("renders a config icon unless hideIcon says otherwise", () => {
    const withIcon: ChartConfig = {
      desktop: { label: "Desktop", icon: () => <svg data-testid="icon" /> },
    };
    const payload = [
      { value: "desktop", dataKey: "desktop", color: "oklch(0.6 0.2 250)" },
    ];
    const { rerender } = render(
      <ChartContainer config={withIcon}>
        <div>
          <ChartLegendContent payload={payload} />
        </div>
      </ChartContainer>,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();

    rerender(
      <ChartContainer config={withIcon}>
        <div>
          <ChartLegendContent payload={payload} hideIcon />
        </div>
      </ChartContainer>,
    );
    expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
  });
});
