import Link from "next/link";

const steps = [
  {
    title: "Write it now",
    body: "Notes, passwords, PINs, the things you'd want someone to have. Encrypted in your browser before it ever leaves your device.",
  },
  {
    title: "Check in occasionally",
    body: "A monthly tap says you're still here. Miss it, and there's a grace period before anything happens - no surprises.",
  },
  {
    title: "A real person confirms",
    body: "Your chosen verifier has to actively confirm and supply a recovery code only you gave them. No single point of failure, no accidental releases.",
  },
  {
    title: "Delivered, privately",
    body: "Your recipients get a private link to exactly what you left them - nothing more.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="mx-auto w-full max-w-4xl px-6 py-24">
        <p className="text-sm font-medium uppercase tracking-widest text-stone-500">Digital legacy, done carefully</p>
        <h1 className="mt-4 max-w-2xl font-serif text-4xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-5xl">
          Say what you need to say - even if you&apos;re not here to say it.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600">
          Legacy Notes holds the messages, passwords, and love notes you want passed on, encrypted so
          that even we can&apos;t read them &mdash; and delivers them only once someone you trust confirms it&apos;s time.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/signup"
            className="rounded-md bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
          >
            Start your vault
          </Link>
          <a href="#how" className="rounded-md px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100">
            How it works
          </a>
        </div>
      </section>

      <section id="how" className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="font-serif text-2xl font-semibold text-stone-900">How it works</h2>
          <ol className="mt-10 grid gap-10 sm:grid-cols-2">
            {steps.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-900 text-sm font-medium text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-medium text-stone-900">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-stone-200">
        <div className="mx-auto max-w-4xl px-6 py-16 text-sm leading-6 text-stone-500">
          <p>
            <strong className="text-stone-700">Zero-knowledge by design.</strong> Your vault is encrypted in your
            browser with a passphrase we never see. The key that unlocks it is split in two - half stays with us,
            half goes only to the verifier you choose - so no single party, including Legacy Notes, can ever open
            it alone.
          </p>
        </div>
      </section>
    </main>
  );
}
