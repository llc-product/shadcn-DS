import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

function Fixture() {
  return (
    <Tabs defaultValue="account">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Account panel</TabsContent>
      <TabsContent value="password">Password panel</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("shows one panel at a time and switches on click", async () => {
    render(<Fixture />);
    expect(screen.getByText("Account panel")).toBeInTheDocument();
    expect(screen.queryByText("Password panel")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Password" }));
    expect(screen.getByText("Password panel")).toBeInTheDocument();
    expect(screen.queryByText("Account panel")).not.toBeInTheDocument();
  });

  it("moves between tabs with the arrow keys", async () => {
    render(<Fixture />);
    await userEvent.click(screen.getByRole("tab", { name: "Account" }));
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Password" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("the list pairs bg-muted with text-muted-foreground", () => {
    // These two tokens render together here, which is why the contrast gate measures that exact
    // pair. An inactive tab label is real body text on a muted ground.
    render(<Fixture />);
    expect(screen.getByRole("tablist")).toHaveClass("bg-muted", "text-muted-foreground");
  });
});
