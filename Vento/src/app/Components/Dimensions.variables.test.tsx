import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const fetchMock = vi.fn();

vi.mock("./NextStepButton", () => ({
  default: () => <div data-testid="next-step-button" />,
}));

import Dimensions from "./Dimensions";

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("Dimensions variables", () => {
  it("renderiza variables desde /api/variables y muestra la definición en tooltip", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        variables: [
          {
            dimension: "Técnica",
            name: "wind_speed",
            label: "Velocidad del viento",
            definition: "Promedio anual de velocidad del viento a 100m.",
            type: "decision",
          },
        ],
      }),
    });

    render(<Dimensions />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/variables"));
    });
    expect(await screen.findByText("Velocidad del viento")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Ver definición de variable" }),
    );
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Promedio anual de velocidad del viento a 100m.",
    );

    fireEvent.pointerDown(document.body);
    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });
});
