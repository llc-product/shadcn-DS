import Link from "next/link";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@digitaltwin/design-system";

import { allComponents, tokens } from "@/data";

const CONSUME = `// app/globals.css
@import "tailwindcss";
@import "@digitaltwin/design-system/styles.css";
@source "../../node_modules/@digitaltwin/design-system/dist";`;

const USE = `import { Button } from "@digitaltwin/design-system";

export default function Page() {
  return <Button variant="destructive">Delete files</Button>;
}`;

export default function Home() {
  const count = allComponents.length;
  const serverSafe = allComponents.filter((c) => !c.client).length;

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Design system</h1>
        <p className="max-w-2xl text-muted-foreground">
          {count} React 19 primitives built on Radix and CVA, painted entirely from{" "}
          {tokens.colors.length} semantic colour tokens. {serverSafe} of them render in a
          Server Component without pulling a client reference into the route.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/components/">Browse components</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/tokens/">See the tokens</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Wire the stylesheet</CardTitle>
            <CardDescription>
              Three lines, and the third is the one people forget.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
              <code>{CONSUME}</code>
            </pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>2. Import a component</CardTitle>
            <CardDescription>One entry point for everything.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
              <code>{USE}</code>
            </pre>
          </CardContent>
        </Card>
      </section>

      <Alert>
        <AlertTitle>The @source line is not optional</AlertTitle>
        <AlertDescription>
          Tailwind v4 decides which utilities to emit by scanning source files, and it
          skips node_modules by default. Leave that line out and every component mounts
          with the right class names and no styles at all — with no error to explain it.
        </AlertDescription>
      </Alert>
    </div>
  );
}
