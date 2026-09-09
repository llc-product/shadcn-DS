import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from "@digitaltwin/design-system";

import { catalog } from "@/data";
import { Gallery } from "@/ui/gallery";

export default function ComponentsPage() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Components</h1>
        <p className="max-w-2xl text-muted-foreground">
          Read out of the sources by{" "}
          <code className="font-mono text-sm">build-catalog.mjs</code>, so this page
          cannot describe a version of the library that does not exist.{" "}
          <strong>server</strong> means the module carries no{" "}
          <code className="font-mono text-sm">&quot;use client&quot;</code> and costs a
          route nothing.
        </p>
      </section>

      <Gallery />

      <Separator />

      {catalog.map((group) => (
        <section key={group.title} className="flex flex-col gap-4">
          <h2 className="text-xl font-medium">{group.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.components.map((c) => (
              <Card key={c.name}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <span className="font-mono">{c.name}</span>
                    <Badge variant={c.client ? "secondary" : "default"}>
                      {c.client ? "client" : "server"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                  {c.variants ? (
                    <dl className="flex flex-col gap-1 text-xs">
                      {Object.entries(c.variants).map(([scale, values]) => (
                        <div key={scale} className="flex flex-wrap items-center gap-1">
                          <dt className="font-mono text-muted-foreground">{scale}:</dt>
                          {values.map((v) => (
                            <dd key={v}>
                              <Badge variant="outline">{v}</Badge>
                            </dd>
                          ))}
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  <code className="text-xs text-muted-foreground">
                    {c.exports.join(" · ")}
                  </code>
                  {c.sidecar?.guidance ? (
                    <p className="border-l-2 pl-3 text-xs text-muted-foreground">
                      {c.sidecar.guidance}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
