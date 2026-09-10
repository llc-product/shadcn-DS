import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AspectRatio } from "./aspect-ratio";

describe("AspectRatio", () => {
  it("renders its child inside the ratio box", () => {
    render(
      <AspectRatio ratio={16 / 9}>
        <img src="/cover.png" alt="Cover" />
      </AspectRatio>,
    );
    expect(screen.getByRole("img", { name: "Cover" })).toBeInTheDocument();
  });

  it("reserves the space with padding-bottom rather than a measured height", () => {
    // The wrapper is what makes the box hold its shape before the image loads. jsdom has no
    // layout engine, so the ratio itself cannot be measured here — only the mechanism.
    const { container } = render(
      <AspectRatio ratio={2}>
        <div>Panel</div>
      </AspectRatio>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.paddingBottom).toBe("50%");
  });
});
