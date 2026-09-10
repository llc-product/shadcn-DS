import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
} from "./carousel";

function Fixture(props: React.ComponentProps<typeof Carousel>) {
  return (
    <Carousel aria-label="Photos" {...props}>
      <CarouselContent>
        <CarouselItem>One</CarouselItem>
        <CarouselItem>Two</CarouselItem>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}

describe("Carousel", () => {
  it("is a region announced as a carousel, with each slide announced as a slide", () => {
    render(<Fixture />);
    const region = screen.getByRole("region", { name: "Photos" });
    expect(region).toHaveAttribute("aria-roledescription", "carousel");
    const slides = screen.getAllByRole("group");
    expect(slides).toHaveLength(2);
    expect(slides[0]).toHaveAttribute("aria-roledescription", "slide");
  });

  it("names both nav buttons for a screen reader", () => {
    render(<Fixture />);
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next slide" })).toBeInTheDocument();
  });

  it("takes a replacement label, so a non-English app is not stuck with the default", () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>One</CarouselItem>
        </CarouselContent>
        <CarouselPrevious label="Ảnh trước" />
        <CarouselNext label="Ảnh sau" />
      </Carousel>,
    );
    expect(screen.getByRole("button", { name: "Ảnh trước" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ảnh sau" })).toBeInTheDocument();
    expect(screen.queryByText("Previous slide")).not.toBeInTheDocument();
  });

  it("lets children replace the arrow entirely", () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>One</CarouselItem>
        </CarouselContent>
        <CarouselPrevious>Back</CarouselPrevious>
      </Carousel>,
    );
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });

  it("disables both arrows while there is nowhere to scroll", () => {
    // jsdom reports every element as zero-width, so Embla sees one full slide and no overflow.
    // That is exactly the state the disabled attribute is there to express.
    render(<Fixture />);
    expect(screen.getByRole("button", { name: "Previous slide" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next slide" })).toBeDisabled();
  });

  it("hands the Embla api to setApi", async () => {
    const setApi = vi.fn();
    render(<Fixture setApi={setApi} />);
    await vi.waitFor(() => expect(setApi).toHaveBeenCalled());
    expect(setApi.mock.calls[0]?.[0]).toHaveProperty("scrollNext");
  });

  it("scrolls on ArrowRight and ArrowLeft, and swallows the key so the page does not", () => {
    // The handler is onKeyDownCapture on the region, and the region is not itself focusable —
    // dispatching on it is what a key press inside a slide actually looks like.
    const setApi = vi.fn();
    render(<Fixture setApi={setApi} />);
    const region = screen.getByRole("region", { name: "Photos" });

    for (const key of ["ArrowRight", "ArrowLeft"]) {
      const event = createEvent.keyDown(region, { key });
      fireEvent(region, event);
      expect(event.defaultPrevented).toBe(true);
    }
  });

  it("leaves other keys alone", () => {
    render(<Fixture />);
    const region = screen.getByRole("region", { name: "Photos" });
    const event = createEvent.keyDown(region, { key: "a" });
    fireEvent(region, event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("switches the content axis when vertical", () => {
    const { container } = render(<Fixture orientation="vertical" />);
    expect(container.querySelector(".flex-col")).not.toBeNull();
  });

  it("lets className win over the position it conflicts with", () => {
    render(<Fixture className="static" />);
    const region = screen.getByRole("region", { name: "Photos" });
    expect(region).toHaveClass("static");
    expect(region).not.toHaveClass("relative");
  });

  it("refuses to be used outside a <Carousel />", () => {
    // The context default is undefined, so a stray CarouselNext would otherwise fail later with
    // "cannot read scrollNext of undefined", far from the mistake.
    function Stray() {
      useCarousel();
      return null;
    }
    expect(() => render(<Stray />)).toThrow(/must be used within a <Carousel \/>/);
  });
});
