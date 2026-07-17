import {
  ArrowRight,
  CalendarCheck,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { ModeToggle } from "@/components/mode-toggle";
import { FadeIn } from "@/components/motion/fade-in";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const features = [
  {
    icon: Wrench,
    title: "Trusted professionals",
    description:
      "Vetted plumbers, electricians and handypeople — matched to the job in minutes.",
  },
  {
    icon: CalendarCheck,
    title: "Scheduling that sticks",
    description:
      "Book, reschedule and track every visit with automatic reminders for both sides.",
  },
  {
    icon: ShieldCheck,
    title: "Protected payments",
    description:
      "Funds are held securely and released only when the work is signed off.",
  },
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a className="transition-colors hover:text-foreground" href="#features">
              Features
            </a>
            <a className="transition-colors hover:text-foreground" href="#system">
              Design system
            </a>
            <a className="transition-colors hover:text-foreground" href="#waitlist">
              Waitlist
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button size="sm" className="hidden sm:inline-flex">
              Sign in
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero */}
        <section className="flex flex-col items-center py-20 text-center sm:py-28">
          <FadeIn>
            <Badge variant="brand" className="mb-6">
              <Sparkles className="size-3" />
              Milestone 1 · Scaffold ready
            </Badge>
          </FadeIn>
          <FadeIn delay={0.05}>
            <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
              Home services,{" "}
              <span className="text-brand">professionally managed</span>.
            </h1>
          </FadeIn>
          <FadeIn delay={0.1}>
            <p className="mt-6 max-w-xl text-pretty text-lg text-muted-foreground">
              HousePro connects homeowners with trusted professionals and keeps
              every job on track — from first quote to final sign-off.
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" variant="brand">
                Get early access
                <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="outline">
                Browse professionals
              </Button>
            </div>
          </FadeIn>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 py-12">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature, i) => (
              <FadeIn key={feature.title} delay={i * 0.08}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="mb-2 flex size-11 items-center justify-center rounded-lg bg-secondary text-brand">
                      <feature.icon className="size-5" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* Design system showcase */}
        <section id="system" className="scroll-mt-20 py-12">
          <FadeIn>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">HousePro design system</CardTitle>
                <CardDescription>
                  Brand tokens, shadcn/ui primitives and motion — the building
                  blocks the rest of the product is assembled from.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Palette
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Swatch label="Primary" className="bg-primary" />
                    <Swatch label="Accent" className="bg-brand-accent" />
                    <Swatch label="Secondary" className="bg-secondary" />
                    <Swatch label="Muted" className="bg-muted" />
                    <Swatch label="Destructive" className="bg-destructive" />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Buttons
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="brand">Brand</Button>
                    <Button>Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="destructive">Destructive</Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Badges
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="brand">Brand</Badge>
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </section>

        {/* Waitlist */}
        <section id="waitlist" className="scroll-mt-20 py-12 pb-24">
          <FadeIn>
            <Card className="mx-auto max-w-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Join the waitlist</CardTitle>
                <CardDescription>
                  Be first to know when HousePro launches in your area.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col gap-4 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-2 text-left">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                    />
                  </div>
                  <Button type="submit" variant="brand">
                    Notify me
                  </Button>
                </form>
              </CardContent>
            </Card>
          </FadeIn>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo className="[&_span]:text-base" />
          <p>© {new Date().getFullYear()} HousePro. Built with Next.js.</p>
        </div>
      </footer>
    </div>
  );
}

function Swatch({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`size-14 rounded-lg border ${className}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
