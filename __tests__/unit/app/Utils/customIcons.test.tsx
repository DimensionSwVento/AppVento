import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CUSTOM_ICONS } from "@/app/Utils/variables/customIcons";

describe("customIcons", () => {
  it("cada ícono del catálogo renderiza un SVG", () => {
    for (const [key, Icon] of Object.entries(CUSTOM_ICONS)) {
      const { container, unmount } = render(<Icon data-testid={key} />);
      expect(container.querySelector("svg"), `ícono ${key}`).not.toBeNull();
      unmount();
    }
  });

  it("propaga props al elemento svg (className)", () => {
    const first = Object.values(CUSTOM_ICONS)[0];
    const Icon = first;
    const { container } = render(<Icon className="h-4 w-4" />);
    expect(container.querySelector("svg")).toHaveClass("h-4", "w-4");
  });
});
