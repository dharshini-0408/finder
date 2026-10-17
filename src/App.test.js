import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("./services/aiDetector", () => ({
  __esModule: true,
  default: jest.fn(),
  MODEL_ID: "test-model",
  loadDetector: jest.fn(() => Promise.resolve()),
  subscribeModelStatus: jest.fn(() => () => {}),
}));

test("renders the hero and upload area", () => {
  render(<App />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
    /real\s*or rendered\?/i,
  );
  expect(screen.getByText(/drop an image or video/i)).toBeInTheDocument();
});
