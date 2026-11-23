import { Link } from 'react-router-dom';
import { useAuth } from '../store/auth';

function MockEditor() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm" aria-hidden>
      <div className="flex items-center justify-between border-b border-line bg-mist px-3 py-1.5 text-xs text-muted">
        <span>script.js</span>
        <span className="flex gap-1">
          <span className="rounded-full bg-[#2A55F5] px-2 py-0.5 text-white">Asha</span>
          <span className="rounded-full bg-[#0B8A5F] px-2 py-0.5 text-white">Dev</span>
        </span>
      </div>
      <pre className="p-4 font-mono text-[13px] leading-6">
{`function total(cart) {
  return cart.reduce((sum, item) => `}<span className="relative bg-[#2A55F5]/20">sum + item.price<span className="absolute -top-5 left-0 whitespace-nowrap rounded-sm bg-[#2A55F5] px-1 font-sans text-[10px] text-white">Asha</span></span>{`, 0);
}

console.log(total(`}<span className="relative border-l-2 border-[#0B8A5F]"><span className="absolute -top-5 left-0 whitespace-nowrap rounded-sm bg-[#0B8A5F] px-1 font-sans text-[10px] text-white">Dev</span></span>{`([{ price: 10 }]));`}
      </pre>
      <div className="border-t border-line bg-cobalt-soft px-4 py-2 text-xs text-cobalt-dark">
        AI: The initial value keeps this total safe when the cart is empty.
      </div>
    </div>
  );
}

export default function Landing() {
  const user = useAuth((s) => s.user);
  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col px-5">
      <header className="flex items-center justify-between py-5">
        <span className="text-lg font-bold">CodeRoom AI</span>
        <nav className="flex gap-2">
          {user ? (
            <Link className="btn-primary" to="/dashboard">Open dashboard</Link>
          ) : (
            <>
              <Link className="btn-ghost" to="/login">Sign in</Link>
              <Link className="btn-primary" to="/signup">Create account</Link>
            </>
          )}
        </nav>
      </header>
      <main className="grid flex-1 items-center gap-10 py-10 md:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">Code in the same file, at the same time.</h1>
          <p className="mt-4 max-w-md text-lg text-muted">
            Share a room code, edit together with live cursors, chat, run HTML/CSS/JS in the browser, and ask an AI copilot about the code you have selected.
          </p>
          <div className="mt-6 flex gap-2">
            <Link className="btn-primary px-5 py-2.5" to={user ? '/dashboard' : '/signup'}>Start a room</Link>
            <Link className="btn-ghost px-5 py-2.5" to={user ? '/dashboard' : '/login'}>Join with a code</Link>
          </div>
        </div>
        <MockEditor />
      </main>
    </div>
  );
}
