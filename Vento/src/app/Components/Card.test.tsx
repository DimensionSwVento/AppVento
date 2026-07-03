import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Card from "./Card";

describe("Card", () => {
  it("renderiza título y descripción", () => {
    render(<Card title="Mi título" description="Mi descripción" />);
    expect(screen.getByRole("heading", { name: "Mi título" })).toBeInTheDocument();
    expect(screen.getByText("Mi descripción")).toBeInTheDocument();
  });
});
