import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/logo.svg";
import {
  ArrowRight,
  Loader2,
  Mail,
  Lock,
  ArrowLeft,
  Moon,
  Sun,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

interface AuthProps {
  redirectAfterAuth?: string;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const redirectSent = useRef(false);
  useEffect(() => {
    if (!authLoading && isAuthenticated && !redirectSent.current) {
      redirectSent.current = true;
      requestAnimationFrame(() => {
        navigate(redirectAfterAuth || "/dashboard", { replace: true });
      });
    }
  }, [authLoading, isAuthenticated, redirectAfterAuth, navigate]);

  if (authLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return "Senha deve ter no mínimo 8 caracteres";
    if (!/[A-Z]/.test(pw)) return "Senha deve ter ao menos uma letra maiúscula";
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw))
      return "Senha deve ter ao menos um caractere especial";
    return null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (mode === "signUp") {
      const pwError = validatePassword(password);
      if (pwError) {
        setError(pwError);
        setIsLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Senhas não conferem.");
        setIsLoading(false);
        return;
      }
    }

    try {
      if (mode === "signIn") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        setSuccess("Conta criada! Verifique seu email para confirmar.");
        setIsLoading(false);
        return;
      }
    } catch (error: any) {
      setError(
        error?.message ||
          (mode === "signIn"
            ? "Email ou senha inválidos."
            : "Falha ao criar conta. Tente novamente."),
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
          <Card className="border border-border/60 shadow-none">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <img
                  src={logo}
                  alt="Logo"
                  width={48}
                  height={48}
                  className="rounded-md opacity-80"
                />
              </div>
              <CardTitle className="text-lg font-medium tracking-tight">
                {mode === "signIn" ? "Acesse sua conta" : "Criar conta"}
              </CardTitle>
              <CardDescription className="text-sm">
                {mode === "signIn"
                  ? "Digite seu email e senha para entrar"
                  : "Crie sua conta com email e senha"}
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    name="email"
                    placeholder="seu@email.com"
                    type="email"
                    className="pl-9 text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    name="password"
                    placeholder="Senha"
                    type="password"
                    className="pl-9 text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                {mode === "signUp" && password.length > 0 && (
                  <div className="space-y-1 text-xs">
                    <p className={password.length >= 8 ? "text-green-500" : "text-muted-foreground"}>
                      {password.length >= 8 ? "✓" : "○"} Mínimo 8 caracteres
                    </p>
                    <p className={/[A-Z]/.test(password) ? "text-green-500" : "text-muted-foreground"}>
                      {/[A-Z]/.test(password) ? "✓" : "○"} Uma letra maiúscula
                    </p>
                    <p className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? "text-green-500" : "text-muted-foreground"}>
                      {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? "✓" : "○"} Um caractere especial
                    </p>
                  </div>
                )}

                {mode === "signUp" && (
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      name="confirmPassword"
                      placeholder="Confirmar senha"
                      type="password"
                      className="pl-9 text-sm"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                )}

                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}

                {success && (
                  <p className="text-xs text-green-500">{success}</p>
                )}

                <Button
                  type="submit"
                  className="w-full text-sm"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : mode === "signIn" ? (
                    <>
                      Entrar
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </>
                  ) : (
                    "Criar conta"
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === "signIn" ? "signUp" : "signIn");
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
                  >
                    {mode === "signIn"
                      ? "Não tem conta? Cadastre-se"
                      : "Já tem conta? Faça login"}
                  </button>
                </div>
              </CardContent>
            </form>

            <div className="px-6 py-3 border-t border-border/50 bg-muted/20 rounded-b-lg">
              <p className="text-xs text-center text-muted-foreground">
                Ambiente seguro •
                <a
                  href="https://freebuff.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground transition-colors ml-1"
                >
                  freebuff.com
                </a>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Auth;
