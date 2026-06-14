import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { LogIn, UserPlus, User, ChevronRight, CircleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/SEO';

type AuthTab = 'login' | 'signup' | 'guest';

const Auth: React.FC = () => {
  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginFeedback, setLoginFeedback] = useState<string | null>(null);
  const { signUp, signIn, signInAsGuest } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectTarget = useMemo(() => {
    const redirect = searchParams.get('redirect');
    return redirect && redirect.startsWith('/') ? redirect : '/lobby';
  }, [searchParams]);

  const authNotice = useMemo(() => {
    const reason = searchParams.get('reason');
    if (reason === 'auth-required') {
      return redirectTarget === '/lobby'
        ? 'Please sign in to continue to online multiplayer.'
        : 'Please sign in first and you will continue automatically.';
    }
    return null;
  }, [redirectTarget, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginFeedback(null);
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      setLoginFeedback('Sign in with the email address you registered with. Nickname is only used as your player name.');
      toast.error('Could not sign in. Use your email address and password.');
    } else {
      navigate(redirectTarget);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Please enter a name');
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(email, password, displayName);
    setIsLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created!');
      navigate(redirectTarget);
    }
  };

  const handleGuest = async () => {
    setIsLoading(true);
    const { error } = await signInAsGuest(guestName || 'Guest');
    setIsLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate(redirectTarget);
    }
  };

  const tabs = [
    { key: 'login' as AuthTab, label: 'Login', icon: LogIn },
    { key: 'signup' as AuthTab, label: 'Sign Up', icon: UserPlus },
    { key: 'guest' as AuthTab, label: 'Guest', icon: User },
  ];

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden" aria-label="Authentication">
      <SEO
        title="Sign in or sign up — RicochetHex"
        description="Sign in to RicochetHex to play online multiplayer matches, save games, and challenge friends in strategic hex chess."
        path="/auth"
        image="/og-auth.jpg"
      />
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              RicochetHex
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">Multiplayer — play with friends online</p>
        </div>

        <div className="glass rounded-2xl p-6 space-y-5 shadow-xl">
          {(authNotice || loginFeedback) && (
            <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs text-foreground flex items-start gap-2" role="status">
              <CircleAlert className="h-4 w-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <p>{loginFeedback ?? authNotice}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`
                  flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-200 text-xs font-semibold
                  ${tab === key 
                    ? 'border-primary bg-primary/10 text-foreground' 
                    : 'border-border bg-secondary/50 text-muted-foreground hover:bg-secondary'}
                `}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <Input
                type="email"
                placeholder="Email"
                aria-label="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="bg-secondary/50"
              />
              <Input
                type="password"
                placeholder="Password"
                aria-label="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="bg-secondary/50"
              />
              <p className="text-[10px] text-muted-foreground text-center">
                Sign in with your email address and password. Your nickname is only shown in-game.
              </p>
              <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-primary to-primary/80 rounded-xl group">
                {isLoading ? 'Loading...' : 'Login'}
                <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </form>
          )}

          {tab === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-3">
              <Input
                type="text"
                placeholder="Player name"
                aria-label="Player name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                maxLength={50}
                className="bg-secondary/50"
              />
              <Input
                type="email"
                placeholder="Email"
                aria-label="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="bg-secondary/50"
              />
              <Input
                type="password"
                placeholder="Password (min. 6 characters)"
                aria-label="Password (minimum 6 characters)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-secondary/50"
              />
              <Button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-primary to-primary/80 rounded-xl group">
                {isLoading ? 'Loading...' : 'Create Account'}
                <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </form>
          )}

          {tab === 'guest' && (
            <div className="space-y-3">
              <Input
                type="text"
                placeholder="Nickname (optional)"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                maxLength={50}
                className="bg-secondary/50"
              />
              <p className="text-[10px] text-muted-foreground text-center">
                Play without registration. Data won't be saved.
              </p>
              <Button onClick={handleGuest} disabled={isLoading} className="w-full bg-gradient-to-r from-accent to-accent/80 text-accent-foreground rounded-xl group">
                {isLoading ? 'Loading...' : 'Play as Guest'}
                <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => navigate('/')}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to local play
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Auth;
