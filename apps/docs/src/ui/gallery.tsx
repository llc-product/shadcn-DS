"use client";

import { useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertTitle,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Progress,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Slider,
  Spinner,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toaster,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast,
} from "@digitaltwin/design-system";

function Demo({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <h3 className="font-mono text-xs text-muted-foreground">{title}</h3>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

/**
 * The live gallery. This is the part of the docs site that is not derivable from the sources:
 * whether the things actually work when composed. It is also the reason the docs app is built in
 * this repo at all — if the exports map, the "use client" boundaries or the @source line were
 * wrong, this page is where it breaks, before any consuming app sees it.
 */
export function Gallery() {
  const [progress, setProgress] = useState(40);

  return (
    <TooltipProvider delayDuration={200}>
      <Toaster />
      <section className="grid gap-4 md:grid-cols-2">
        <Demo title="Button">
          {(
            ["default", "secondary", "outline", "ghost", "destructive", "link"] as const
          ).map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </Demo>

        <Demo title="Badge">
          {(["default", "secondary", "outline", "destructive"] as const).map(
            (variant) => (
              <Badge key={variant} variant={variant}>
                {variant}
              </Badge>
            ),
          )}
        </Demo>

        <Demo title="Form controls">
          <div className="flex w-full flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="demo-email">Email</Label>
              <Input id="demo-email" type="email" placeholder="ada@example.com" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="demo-terms" />
              <Label htmlFor="demo-terms">Accept the terms</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="demo-notify" />
              <Label htmlFor="demo-notify">Email me</Label>
            </div>
            <RadioGroup defaultValue="card" className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="card" id="demo-card" />
                <Label htmlFor="demo-card">Card</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="paypal" id="demo-paypal" />
                <Label htmlFor="demo-paypal">PayPal</Label>
              </div>
            </RadioGroup>
            <Select>
              <SelectTrigger aria-label="Fruit">
                <SelectValue placeholder="Pick a fruit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apple">Apple</SelectItem>
                <SelectItem value="pear">Pear</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Demo>

        <Demo title="Slider + Progress">
          <div className="flex w-full flex-col gap-4">
            <Slider
              value={[progress]}
              max={100}
              step={1}
              aria-label="Progress"
              onValueChange={([v]) => setProgress(v ?? 0)}
            />
            <Progress value={progress} />
            <Slider defaultValue={[20, 80]} max={100} aria-label="Range" />
          </div>
        </Demo>

        <Demo title="Tabs">
          <Tabs defaultValue="account" className="w-full">
            <TabsList>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="text-sm text-muted-foreground">
              Account settings live here.
            </TabsContent>
            <TabsContent value="password" className="text-sm text-muted-foreground">
              Change your password here.
            </TabsContent>
          </Tabs>
        </Demo>

        <Demo title="Accordion">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="a">
              <AccordionTrigger>What is a design token?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                A named value the whole system reads from, so changing it once changes
                everywhere.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Demo>

        <Demo title="Overlays">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit profile</DialogTitle>
                <DialogDescription>
                  Changes are saved when you close this.
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete files</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Delete 3 files?</AlertDialogTitle>
              <AlertDialogDescription>
                This cannot be undone. The verb and the confirm step carry the warning —
                never the colour alone.
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep them</AlertDialogCancel>
                <AlertDialogAction>Delete files</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost">Tooltip</Button>
            </TooltipTrigger>
            <TooltipContent>Opens on focus too, not only on hover</TooltipContent>
          </Tooltip>

          <Button variant="secondary" onClick={() => toast("Saved")}>
            Toast
          </Button>
        </Demo>

        <Demo title="Feedback">
          <div className="flex w-full flex-col gap-3">
            <Alert>
              <AlertTitle>Heads up</AlertTitle>
              <AlertDescription>This is an inline message block.</AlertDescription>
            </Alert>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>AL</AvatarFallback>
              </Avatar>
              <Spinner />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </Demo>
      </section>
    </TooltipProvider>
  );
}
