import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

describe("Avatar", () => {
  it("shows the fallback while the image has not loaded", () => {
    // jsdom never fires the image load event, which is exactly the state this asserts: the
    // fallback is what a user sees before (or instead of) the picture.
    render(
      <Avatar>
        <AvatarImage src="/nobody.png" alt="Ada" />
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("clips to a circle and cannot be squashed by a flex parent", () => {
    const { container } = render(<Avatar />);
    expect(container.firstElementChild).toHaveClass(
      "rounded-full",
      "shrink-0",
      "overflow-hidden",
    );
  });
});
