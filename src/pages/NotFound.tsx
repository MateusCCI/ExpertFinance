import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col"
    >

      
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="max-w-5xl mx-auto relative px-4">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <h1 className="text-4xl font-light tracking-tight text-foreground mb-2">404</h1>
              <p className="text-sm text-muted-foreground">Página não encontrada</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
