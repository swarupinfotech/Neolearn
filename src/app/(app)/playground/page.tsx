import type { Metadata } from "next";
import { Playground } from "@/components/playground/playground";

export const metadata: Metadata = {
  title: "Playground | NeoLearn",
  description: "Write and run Python, JavaScript, SQL and HTML/CSS safely in your browser.",
};

export default function PlaygroundPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold">Code Playground</h1>
        <p className="text-muted mt-1">
          Run code instantly in an isolated browser sandbox. Nothing you write touches our servers.
        </p>
      </header>
      <Playground />
    </div>
  );
}