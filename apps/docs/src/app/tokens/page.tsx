import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@digitaltwin/design-system";

import { tokens } from "@/data";

/**
 * Swatches are painted from the RESOLVED literal, not from `var(--token)`. A var-driven swatch
 * would show the current theme twice; this page has to show both themes side by side, including
 * the one you are not looking at.
 */
function Swatch({ value }: { value: string }) {
  return (
    <span
      className="inline-block size-6 shrink-0 rounded-md border align-middle"
      style={{ background: value }}
    />
  );
}

export default function TokensPage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Tokens</h1>
        <p className="max-w-2xl text-muted-foreground">
          Generated from <code className="font-mono text-sm">tokens.export.json</code> by{" "}
          <code className="font-mono text-sm">scripts/build-tokens.mjs</code>. Every
          contrast figure quoted below is measured by a test that reads the shipped
          stylesheet — see
          <code className="font-mono text-sm"> styles/tokens.test.ts</code>.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium">Theme-independent</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {tokens.primitives.map((p) => (
            <Card key={p.name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono text-sm">
                  {p.kind === "color" ? <Swatch value={p.value} /> : null}
                  {p.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <code className="text-xs text-muted-foreground">{p.value}</code>
                {p.description ? (
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium">Semantic colours</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>Light</TableHead>
              <TableHead>Dark</TableHead>
              <TableHead>Why it is this value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.colors.map((c) => (
              <TableRow key={c.name}>
                <TableCell className="font-mono text-xs whitespace-nowrap">
                  --{c.name}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className="flex items-center gap-2">
                    <Swatch value={c.light} />
                    <code className="text-xs text-muted-foreground">{c.light}</code>
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className="flex items-center gap-2">
                    <Swatch value={c.dark} />
                    <code className="text-xs text-muted-foreground">{c.dark}</code>
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.description || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <Separator />

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-medium">Type</h2>
          {tokens.fonts.map((f) => (
            <div key={f.name} className="flex flex-col gap-1">
              <code className="font-mono text-xs">--font-{f.name}</code>
              <p className="text-lg" style={{ fontFamily: f.value }}>
                The quick brown fox jumps over the lazy dog
              </p>
              <code className="text-xs text-muted-foreground">{f.value}</code>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-medium">Motion</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {tokens.motion.duration.map((d) => (
              <li key={d.name} className="flex justify-between gap-4">
                <code className="font-mono text-xs">--duration-{d.name}</code>
                <code className="text-xs text-muted-foreground">{d.value}</code>
              </li>
            ))}
            {tokens.motion.easing.map((e) => (
              <li key={e.name} className="flex justify-between gap-4">
                <code className="font-mono text-xs">--ease-{e.name}</code>
                <code className="text-xs text-muted-foreground">{e.value}</code>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
