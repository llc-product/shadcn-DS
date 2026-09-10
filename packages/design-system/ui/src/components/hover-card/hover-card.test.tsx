import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";

describe("HoverCard", () => {
  it("shows its content when open", () => {
    // Driven through the `open` prop rather than a hover: Radix opens a hover card on a delay
    // tied to real pointer events, and faking those in jsdom would test the fake.
    render(
      <HoverCard open>
        <HoverCardTrigger>@ada</HoverCardTrigger>
        <HoverCardContent>Ada Lovelace</HoverCardContent>
      </HoverCard>,
    );
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("renders nothing while closed", () => {
    render(
      <HoverCard>
        <HoverCardTrigger>@ada</HoverCardTrigger>
        <HoverCardContent>Ada Lovelace</HoverCardContent>
      </HoverCard>,
    );
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  });

  it("is pointer-only, so it must never be the sole source of information", () => {
    // Not enforceable in code — recorded here because it is the rule that governs every use of
    // this component. Anything a hover card says has to be reachable another way.
    render(
      <HoverCard open>
        <HoverCardTrigger>@ada</HoverCardTrigger>
        <HoverCardContent>Ada Lovelace</HoverCardContent>
      </HoverCard>,
    );
    expect(screen.getByText("@ada")).toBeInTheDocument();
  });
});
