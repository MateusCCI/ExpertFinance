import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "next-themes";
import { ArrowRight, ChartNoAxesCombined, CreditCard, Users, Landmark, ShieldCheck, Smartphone, Moon, Sun } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.12 } },
};

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="min-h-screen bg-background"
    >
      {/* Minimalist fixed header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-sm font-medium tracking-tight text-foreground">
            Finanças
          </span>
          <nav className="flex items-center gap-4">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              title={theme === "dark" ? "Tema claro" : "Tema escuro"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <a
              href="#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Recursos
            </a>
            <a
              href="#about"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sobre
            </a>
            {isLoading ? (
              <div className="w-20 h-8 bg-muted rounded-md animate-pulse" />
            ) : isAuthenticated ? (
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="text-xs"
              >
                Dashboard
                <ArrowRight className="ml-1.5 h-3 w-3" />
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate("/auth")}
                className="text-xs"
              >
                Entrar
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="pt-32 pb-24 px-6">
        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/60 text-xs text-muted-foreground bg-muted/30"
          >
            <ShieldCheck className="h-3 w-3" />
            Controle financeiro inteligente
          </motion.div>

          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight text-foreground leading-[1.1] mb-6"
          >
            Suas finanças pessoais
            <br />
            <span className="font-medium">em um só lugar</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Gestão inteligente de cartões de crédito, aluguéis com compensação
            cruzada, livro razão de terceiros e muito mais — tudo offline-first
            e com visual limpo.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center justify-center gap-4"
          >
            {isAuthenticated ? (
              <Button
                size="lg"
                onClick={() => navigate("/dashboard")}
                className="px-8 h-11 text-sm font-medium"
              >
                Acessar Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="px-8 h-11 text-sm font-medium"
                >
                  Começar agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/auth")}
                  className="px-8 h-11 text-sm"
                >
                  Já tenho conta
                </Button>
              </>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* FEATURES SECTION */}
      <section
        id="features"
        className="py-24 px-6 border-t border-border/50"
      >
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="text-xs text-muted-foreground tracking-widest uppercase mb-4 block">
              Funcionalidades
            </span>
            <h2 className="text-3xl font-light tracking-tight text-foreground">
              Tudo que você precisa para
              <br />
              <span className="font-medium">controlar seu dinheiro</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group p-6 rounded-lg border border-border/60 bg-card hover:border-border transition-colors"
              >
                <div className="w-10 h-10 rounded-md border border-border/60 flex items-center justify-center mb-4 text-foreground/70 group-hover:text-foreground transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-sm font-medium text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-24 px-6 border-t border-border/50 bg-muted/20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl font-light tracking-tight text-foreground mb-4">
            Pronto para assumir o controle?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
            Cadastre-se gratuitamente e comece a organizar suas finanças de
            forma inteligente, com ou sem internet.
          </p>
          {!isAuthenticated && (
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="px-8 h-11 text-sm font-medium"
            >
              Criar sua conta
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <span>© 2026 Minhas Finanças</span>
          <span>Feito com foco em simplicidade</span>
        </div>
      </footer>
    </motion.div>
  );
}

const features = [
  {
    title: "Gestão de Cartões",
    description:
      "Cartões virtuais vinculados a limites físicos, alertas de fechamento e gamificação com priorização por cashback e isenção de anuidade.",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    title: "Compensação de Aluguel",
    description:
      "Compras do proprietário no seu cartão abatem automaticamente o aluguel. Cálculo do saldo residual no fechamento do mês.",
    icon: <Landmark className="h-4 w-4" />,
  },
  {
    title: "Livro Razão",
    description:
      "Conta-corrente com terceiros: valores pagos geram créditos, recebidos geram débitos. Saldo líquido com inversão dinâmica.",
    icon: <Users className="h-4 w-4" />,
  },
  {
    title: "Offline-First",
    description:
      "Funciona sem internet. Inserções vão para fila de sincronização e são enviadas em background quando a rede voltar.",
    icon: <Smartphone className="h-4 w-4" />,
  },
  {
    title: "Categorização Inteligente",
    description:
      "Buscador typeahead para categorização automática. Catálogo reside no IndexedDB para latência zero.",
    icon: <ChartNoAxesCombined className="h-4 w-4" />,
  },
  {
    title: "Fundo de Reserva",
    description:
      "Percentual da receita separado automaticamente antes do abatimento das despesas variáveis.",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
];
