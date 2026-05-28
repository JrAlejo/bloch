import { Link } from 'react-router';
import { FlaskConical, Timer, BookOpen, ArrowRight, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';
import HeroBlochSphere from '@/components/bloch/HeroBlochSphere';

const modules = [
  {
    path: '/tutorial',
    title: 'Tutorial de Teoria',
    desc: 'Aprende los fundamentos matematicos de la mecanica cuantica: qubits, Esfera de Bloch, matrices de compuertas unitarias, protocolos con ecuaciones y desigualdades de Bell.',
    icon: GraduationCap,
    features: ['Matrices 2x2 y 4x4', 'Formulas rigurosas', 'Estados de Bell', '6 Secciones']
  },
  {
    path: '/lab',
    title: 'Laboratorio de Compuertas',
    desc: 'Manipula estados cuanticos individuales con compuertas X, Y, Z, H, S, T. Visualiza en tiempo real la evolucion del vector de estado sobre la esfera de Bloch.',
    icon: FlaskConical,
    features: ['2 Esferas de Bloch', '6 Compuertas', 'Probabilidades en vivo']
  },
  {
    path: '/timeline',
    title: 'Timeline & Circuitos',
    desc: 'Construye secuencias temporales de compuertas y observa animaciones interpoladas suaves tipo Manim. Arrastra, conecta y reproduce circuitos cuanticos.',
    icon: Timer,
    features: ['Constructor visual', 'Animacion interpolada', 'Multi-qubit']
  },
  {
    path: '/protocols',
    title: 'Protocolos Didacticos',
    desc: 'Simulaciones guiadas: BB84, Interferometria de Ramsey, Eco de Hahn y Teleportacion Cuantica. Aprende los protocolos fundacionales paso a paso.',
    icon: BookOpen,
    features: ['BB84', 'Ramsey', 'Hahn Echo', 'Teleportacion']
  }
];

export default function Home() {
  return (
    <div className="relative" style={{ backgroundColor: '#000000' }}>

      {/* ===== FIXED 3D BLOCH SPHERE BACKGROUND ===== */}
      <HeroBlochSphere />

      {/* ===== ALL CONTENT FLOATS ABOVE THE SPHERE ===== */}
      <div className="relative" style={{ zIndex: 1 }}>

        {/* --- HERO: Text over transparent area (sphere visible) --- */}
        <section
          className="relative flex flex-col items-center justify-center text-center px-4"
          style={{ minHeight: '100vh' }}
        >
          {/* Radial vignette for text readability */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 60% 50% at 50% 45%, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, transparent 80%)',
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="relative z-10 max-w-4xl mx-auto pt-20"
          >
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className="label-tracked text-white/40">Plataforma Educativa</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="label-tracked text-white/40">Interactiva</span>
            </div>

            <h1
              className="font-serif font-light text-white leading-[0.9] mb-8"
              style={{ fontSize: 'clamp(3rem, 10vw, 8rem)' }}
            >
              Quantum<br />
              <span className="italic text-blue">Bloch</span> Sphere
            </h1>

            <p className="text-base md:text-lg text-white/40 max-w-xl mx-auto leading-relaxed font-light mb-10">
              Visualizacion de estados cuanticos en la esfera de Bloch.
              Mueve el cursor para guiar el vector de estado.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link to="/tutorial" className="btn-outline">
                <span className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Aprender Teoria
                </span>
              </Link>
              <Link to="/lab" className="btn-blue">
                <span className="flex items-center gap-2">
                  Explorar Laboratorio
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/15">Descubre mas</span>
              <div className="w-px h-8 bg-gradient-to-b from-white/15 to-transparent" />
            </div>
          </motion.div>
        </section>

        {/* --- MODULES SECTION: Solid black background --- */}
        <section className="relative" style={{ backgroundColor: '#000000' }}>
          <div className="max-w-6xl mx-auto px-4 py-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              className="text-center mb-16"
            >
              <span className="label-tracked block mb-4">Modulos de Aprendizaje</span>
              <h2 className="font-serif text-4xl md:text-5xl font-light text-white">
                Cuatro formas de explorar<br />la <span className="italic text-blue">mecanica cuantica</span>
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {modules.map((mod, i) => {
                const Icon = mod.icon;
                return (
                  <motion.div
                    key={mod.path}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.6, delay: i * 0.15 }}
                  >
                    <Link
                      to={mod.path}
                      className="block glass-panel rounded-2xl p-8 h-full group transition-all duration-500 hover:bg-white/[0.04] hover:border-blue/20"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue/10 flex items-center justify-center mb-6 group-hover:bg-blue/20 transition-colors">
                        <Icon className="w-5 h-5 text-blue" />
                      </div>

                      <h3 className="font-serif text-2xl text-white mb-3 group-hover:text-blue transition-colors">
                        {mod.title}
                      </h3>
                      <p className="text-sm text-white/40 leading-relaxed mb-6">
                        {mod.desc}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-6">
                        {mod.features.map(f => (
                          <span key={f} className="text-[9px] uppercase tracking-[0.15em] px-2 py-1 rounded-full border border-white/10 text-white/40">
                            {f}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 text-blue text-xs font-medium uppercase tracking-wider group-hover:gap-3 transition-all">
                        <span>Explorar</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* --- FOOTER: Solid black --- */}
        <footer className="relative px-4 py-10 text-center" style={{ backgroundColor: '#000000' }}>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/15">
            Compatible con dispositivo QIS UV fisico
          </p>
        </footer>
      </div>
    </div>
  );
}
