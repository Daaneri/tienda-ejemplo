import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { supabase } from './supabase';
import * as Lucide from 'lucide-react';

const Icon = ({ name, ...props }) => {
  const LucideIcon = Lucide[name];
  return LucideIcon ? <LucideIcon {...props} /> : null;
};

const CATEGORIAS = ['Todos', 'Imperiales', 'Camioneros', 'Torpedos', 'Bombillas'];

export default function App() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cp, setCp] = useState('');
  const [envio, setEnvio] = useState(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // Carga de productos desde Supabase
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const { data } = await supabase.from('productos').select('*');
        setProductos(data || []);
      } catch (e) { 
        console.error("Error cargando productos:", e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchDocs();
  }, []);

  const productosFiltrados = useMemo(() => {
    let result = [...productos];
    if (filtro !== 'Todos') result = result.filter(p => p.categoria === filtro);
    if (busqueda.trim() !== '') {
      result = result.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
    }
    return result;
  }, [productos, filtro, busqueda]);

  const subtotal = useMemo(() => carrito.reduce((acc, i) => acc + i.precio, 0), [carrito]);
  const total = subtotal + (envio || 0);

  const agregarAlCarrito = (p) => {
    setCarrito([...carrito, p]);
    // Mini feedback visual podría ir acá
  };

  const generarLinkWA = () => {
    const baseMsg = "¡Hola! Estoy viendo la tienda de Ejemplo Mates y me interesa:";
    const items = carrito.map(i => `%0A- ${i.nombre} ($${i.precio})`).join('');
    const totalMsg = `%0A%0ATotal estimado: $${total}`;
    return `https://wa.me/543400000000?text=${baseMsg}${items}${totalMsg}`;
  };

  // Simulación de Checkout Profesional
  const handleMercadoPago = async () => {
    if (carrito.length === 0) return;
    setIsCheckoutLoading(true);
    // Aquí iría el fetch a tu backend en Render/Vercel para crear la preferencia
    setTimeout(() => {
      setIsCheckoutLoading(false);
      alert("Redirigiendo a Mercado Pago seguro...");
    }, 1500);
  };

  if (loading) return (
    <div className="h-screen bg-[#080808] flex flex-col items-center justify-center gap-4">
      <motion.div 
        animate={{ rotate: 360 }} 
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-12 h-12 border-4 border-[#FF5A36] border-t-transparent rounded-full" 
      />
      <span className="font-mono text-[10px] tracking-[0.4em] text-zinc-500 uppercase">Villa Constitución</span>
    </div>
  );

  return (
    <div className="bg-[#080808] min-h-screen text-white selection:bg-[#FF5A36] selection:text-black overflow-x-hidden font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;900&family=Playfair+Display:ital,wght@1,900&display=swap');
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #080808; }
        ::-webkit-scrollbar-thumb { background: #FF5A36; border-radius: 10px; }
      `}</style>

      {/* Ticker de beneficios infinitos */}
      <div className="bg-[#FF5A36] py-2.5 text-black text-[10px] font-black uppercase tracking-[0.2em] text-center overflow-hidden border-b border-black/10">
        <motion.div 
          animate={{ x: [0, -1000] }} 
          transition={{ repeat: Infinity, duration: 30, ease: 'linear' }}
          className="flex whitespace-nowrap gap-20"
        >
          {[...Array(10)].map((_, i) => (
            <span key={i}>Envíos gratis en Villa Constitución — 3 Cuotas sin interés — Cuero Legítimo — Garantía de por vida</span>
          ))}
        </motion.div>
      </div>

      {/* HEADER / NAV */}
      <nav className="sticky top-0 z-[100] bg-[#080808]/95 backdrop-blur-2xl border-b border-white/5 h-20 flex items-center px-6 md:px-20 justify-between">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-[#FF5A36] rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-black rounded-full animate-pulse" />
          </div>
          <span className="font-serif italic text-2xl font-black tracking-tighter" style={{ fontFamily: "'Playfair Display', serif" }}>
            Ejemplo Mates
          </span>
        </div>
        <div className="hidden lg:flex gap-10 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
          <a href="#productos" className="hover:text-[#FF5A36] transition-colors">Catálogo</a>
          <a href="#curado" className="hover:text-[#FF5A36] transition-colors">Curado</a>
          <a href="#contacto" className="hover:text-[#FF5A36] transition-colors">Showroom</a>
        </div>
      </nav>

      {/* BOTONES FLOTANTES - Siempre visibles */}
      <div className="fixed bottom-8 right-8 z-[150] flex flex-col gap-4 items-end">
        <motion.a 
          whileHover={{ scale: 1.1 }}
          href={generarLinkWA()} 
          target="_blank" 
          className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-2xl border-4 border-[#080808]"
        >
          <Icon name="MessageCircle" size={24} fill="white" />
        </motion.a>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setCarritoAbierto(true)} 
          className="w-20 h-20 bg-[#FF5A36] text-black rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,90,54,0.3)] border-4 border-[#080808] relative group"
        >
          <Icon name="ShoppingBag" size={32} />
          {carrito.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-white text-black text-[12px] font-black w-7 h-7 rounded-full flex items-center justify-center border-2 border-black">
              {carrito.length}
            </span>
          )}
        </motion.button>
      </div>

      {/* SECCIÓN HERO - Impacto Visual */}
      <header className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 text-center border-b border-white/5">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <span className="text-[#FF5A36] font-mono text-[11px] tracking-[0.6em] uppercase mb-10 block">Handmade in Argentina</span>
          <h1 className="text-[clamp(50px,14vw,160px)] font-black leading-[0.8] tracking-tighter uppercase mb-12">
            Calidad <br /> <span className="text-zinc-800 italic font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>Sin Tiempo.</span>
          </h1>
          <p className="max-w-2xl text-zinc-500 text-lg md:text-xl font-light leading-relaxed mb-12 mx-auto">
            Seleccionamos los mejores cueros y metales para crear compañeros de ruta que duran generaciones.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            <button 
              onClick={() => document.getElementById('productos').scrollIntoView()}
              className="bg-[#FF5A36] text-black px-12 py-5 rounded-full font-black uppercase tracking-widest text-[11px] hover:bg-white transition-all w-full md:w-auto shadow-xl"
            >
              Explorar Colección
            </button>
            <a href="#curado" className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest hover:text-white transition-colors py-4">
              ¿Cómo curar mi mate? ↓
            </a>
          </div>
        </motion.div>
      </header>

      {/* FILTROS Y BÚSQUEDA */}
      <section className="sticky top-20 z-50 bg-[#080808]/80 backdrop-blur-md border-b border-white/5 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
            {CATEGORIAS.map(c => (
              <button 
                key={c} 
                onClick={() => setFiltro(c)} 
                className={`whitespace-nowrap px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all ${filtro === c ? 'bg-white border-white text-black' : 'border-white/10 text-zinc-500 hover:border-white/30'}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-80">
            <Icon name="Search" size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input 
              type="text" 
              placeholder="¿Qué buscás hoy?" 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full pl-12 pr-6 py-3 text-xs outline-none focus:border-[#FF5A36] transition-all"
            />
          </div>
        </div>
      </section>

      {/* GRILLA DE PRODUCTOS */}
      <section id="productos" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-20">
          <AnimatePresence>
            {productosFiltrados.map(p => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                key={p.id} 
                className="group cursor-pointer"
                onClick={() => setProductoSeleccionado(p)}
              >
                <div className="aspect-[3/4] bg-zinc-900 rounded-[45px] overflow-hidden mb-8 relative">
                  <motion.img 
                    whileHover={{ scale: 1.15 }}
                    transition={{ duration: 0.8 }}
                    src={p.imagen_url} 
                    className="w-full h-full object-cover" 
                    alt={p.nombre} 
                  />
                  <div className="absolute top-6 right-6">
                    <span className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10">
                      Stock Disponible
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-black uppercase tracking-tighter leading-tight">{p.nombre}</h3>
                    <span className="text-2xl font-black italic text-[#FF5A36]">${p.precio.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-zinc-600 text-[11px] font-bold tracking-[0.2em] uppercase">{p.categoria}</p>
                    <span className="text-[9px] font-black uppercase text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Ver detalles +
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* SECCIÓN DE CURADO - Agrega valor al SaaS */}
      <section id="curado" className="bg-zinc-900/30 py-32 border-y border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Icon name="Flame" size={40} className="text-[#FF5A36] mx-auto mb-8" />
          <h2 className="text-4xl font-black uppercase italic mb-8 font-serif">El Ritual del Curado</h2>
          <div className="grid md:grid-cols-3 gap-10 text-left">
            {[
              {t: "1. Hidratar", d: "Llenar el mate con yerba usada y un chorrito de agua tibia."},
              {t: "2. Reposo", d: "Dejar reposar 24 horas para que el poro del cuero y la calabaza sellen."},
              {t: "3. Limpieza", d: "Retirar la yerba y raspar suavemente las paredes internas."}
            ].map(paso => (
              <div key={paso.t} className="space-y-4">
                <h4 className="font-black uppercase text-[#FF5A36] text-xs tracking-widest">{paso.t}</h4>
                <p className="text-zinc-500 text-sm leading-relaxed">{paso.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODAL DETALLE DE PRODUCTO */}
      <AnimatePresence>
        {productoSeleccionado && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setProductoSeleccionado(null)} 
              className="absolute inset-0 bg-black/95 backdrop-blur-xl" 
            />
            <motion.div 
              initial={{ scale: 0.95, y: 50, opacity: 0 }} 
              animate={{ scale: 1, y: 0, opacity: 1 }} 
              exit={{ scale: 0.95, y: 50, opacity: 0 }} 
              className="relative bg-[#0e0e0e] w-full max-w-5xl rounded-[60px] overflow-hidden grid lg:grid-cols-2 shadow-2xl border border-white/10"
            >
              <div className="h-[350px] lg:h-full bg-zinc-800">
                <img src={productoSeleccionado.imagen_url} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="p-8 md:p-16 flex flex-col justify-center">
                <button 
                  onClick={() => setProductoSeleccionado(null)} 
                  className="absolute top-10 right-10 text-zinc-500 hover:text-white transition-colors"
                >
                  <Icon name="X" size={32} />
                </button>
                <span className="text-[#FF5A36] font-mono text-[10px] tracking-[0.5em] mb-6 uppercase">
                  {productoSeleccionado.categoria}
                </span>
                <h2 className="text-5xl font-black uppercase mb-8 leading-none tracking-tighter">
                  {productoSeleccionado.nombre}
                </h2>
                <div className="space-y-6 mb-12">
                  <p className="text-zinc-500 text-base leading-relaxed">
                    Producto fabricado artesanalmente en Villa Constitución. Cada unidad presenta variaciones naturales en el cuero, garantizando una pieza única. Incluye bombilla de regalo.
                  </p>
                  <ul className="text-zinc-400 text-xs space-y-2 font-bold uppercase tracking-widest">
                    <li>✓ Virola de Alpaca Cincelada</li>
                    <li>✓ Cuero Vacuno de 4mm</li>
                    <li>✓ Base de 4 Patas Reforzadas</li>
                  </ul>
                </div>
                <div className="text-5xl font-black italic mb-12 tracking-tighter">
                  ${productoSeleccionado.precio.toLocaleString()}
                </div>
                <button 
                  onClick={() => agregarAlCarrito(productoSeleccionado)} 
                  className="w-full bg-[#FF5A36] text-black py-6 rounded-[30px] font-black uppercase tracking-widest text-xs hover:bg-white transition-all shadow-2xl"
                >
                  Sumar al Carrito
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SIDEBAR CARRITO */}
      <AnimatePresence>
        {carritoAbierto && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCarritoAbierto(false)} className="fixed inset-0 bg-black/80 z-[200] backdrop-blur-sm" />
            <motion.aside 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-[#0e0e0e] z-[210] p-8 md:p-12 flex flex-col border-l border-white/5"
            >
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h2 className="text-3xl font-black italic uppercase font-serif">Tu Pedido</h2>
                  <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mt-1">
                    {carrito.length} productos seleccionados
                  </p>
                </div>
                <button onClick={() => setCarritoAbierto(false)} className="hover:rotate-90 transition-transform">
                  <Icon name="X" size={36} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-8 pr-4 custom-scroll">
                {carrito.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <Icon name="ShoppingBag" size={48} className="text-zinc-800" />
                    <p className="text-zinc-600 text-[10px] uppercase font-bold tracking-[0.2em]">Tu carrito está vacío</p>
                  </div>
                ) : (
                  carrito.map((item, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={idx} 
                      className="flex gap-6 items-center border-b border-white/5 pb-8"
                    >
                      <div className="w-24 h-24 rounded-3xl bg-zinc-900 overflow-hidden shrink-0">
                        <img src={item.imagen_url} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-sm uppercase tracking-tight mb-1">{item.nombre}</p>
                        <p className="text-[#FF5A36] font-black text-lg">${item.precio.toLocaleString()}</p>
                      </div>
                      <button 
                        onClick={() => setCarrito(carrito.filter((_, i) => i !== idx))}
                        className="p-2 hover:bg-red-500/10 rounded-full transition-colors group"
                      >
                        <Icon name="Trash2" size={18} className="text-zinc-700 group-hover:text-red-500" />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="pt-10 space-y-8">
                <div className="bg-zinc-900/50 p-8 rounded-[40px] space-y-6">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-zinc-500">
                    <span>Subtotal</span>
                    <span>${subtotal.toLocaleString()}</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="CP (2919 Villa)" 
                        className="flex-1 bg-black border border-white/10 rounded-2xl px-5 py-4 text-xs outline-none focus:border-[#FF5A36]" 
                        value={cp} 
                        onChange={(e) => setCp(e.target.value)} 
                      />
                      <button 
                        onClick={() => setEnvio(cp === '2919' ? 0 : 4500)} 
                        className="bg-white text-black px-8 rounded-2xl font-black text-[10px] uppercase"
                      >
                        Calcular
                      </button>
                    </div>
                    {envio !== null && (
                      <motion.p 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-center text-[10px] font-black uppercase text-[#FF5A36] tracking-tighter"
                      >
                        {envio === 0 ? "¡Envío Bonificado a tu zona!" : `Costo de envío: $${envio}`}
                      </motion.p>
                    )}
                  </div>
                  <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                    <span className="text-zinc-500 uppercase font-black text-[10px] tracking-widest mb-1">Total Final</span>
                    <span className="text-5xl font-black tracking-tighter">${total.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={handleMercadoPago}
                    disabled={isCheckoutLoading || carrito.length === 0}
                    className="bg-white text-black py-6 rounded-[30px] font-black uppercase tracking-widest text-[10px] hover:bg-[#FF5A36] transition-all disabled:opacity-50"
                  >
                    {isCheckoutLoading ? "Cargando..." : "Pago Seguro"}
                  </button>
                  <a 
                    href={generarLinkWA()}
                    target="_blank"
                    className="bg-[#25D366] text-white py-6 rounded-[30px] flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px]"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* FOOTER - Completo */}
      <footer id="contacto" className="py-32 border-t border-white/5 px-6 bg-[#060606]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
          <div className="space-y-8">
            <span className="font-serif italic text-3xl font-black">Ejemplo Mates</span>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
              Artesanía santafesina con proyección internacional. Showroom exclusivo en Villa Constitución.
            </p>
          </div>
          <div className="space-y-8">
            <h5 className="font-black uppercase text-[10px] tracking-[0.4em]">Navegación</h5>
            <ul className="flex flex-col gap-4 text-zinc-500 text-sm font-bold uppercase tracking-widest">
              <li><a href="#" className="hover:text-white">Inicio</a></li>
              <li><a href="#productos" className="hover:text-white">Mates</a></li>
              <li><a href="#productos" className="hover:text-white">Bombillas</a></li>
              <li><a href="#curado" className="hover:text-white">Cómo Curar</a></li>
            </ul>
          </div>
          <div className="space-y-8">
            <h5 className="font-black uppercase text-[10px] tracking-[0.4em]">Contacto</h5>
            <ul className="flex flex-col gap-4 text-zinc-500 text-sm">
              <li className="flex items-center gap-3">
                <Icon name="MapPin" size={16} className="text-[#FF5A36]" />
                Villa Constitución, Santa Fe
              </li>
              <li className="flex items-center gap-3">
                <Icon name="Mail" size={16} className="text-[#FF5A36]" />
                hola@ejemplomates.ar
              </li>
            </ul>
          </div>
          <div className="space-y-8">
            <h5 className="font-black uppercase text-[10px] tracking-[0.4em]">Club del Mate</h5>
            <div className="flex flex-col gap-4">
              <p className="text-zinc-600 text-xs uppercase font-bold tracking-widest">Recibí ofertas exclusivas</p>
              <div className="flex border-b border-white/20 pb-2">
                <input type="email" placeholder="Email" className="bg-transparent text-white text-xs outline-none w-full" />
                <button className="text-[#FF5A36] font-black uppercase text-[10px] tracking-widest">Ok</button>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-32 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-zinc-700 text-[9px] uppercase tracking-[0.5em]">© 2026 Ejemplo Mates — Todos los derechos reservados</p>
          <div className="flex gap-8">
            <Icon name="Instagram" size={20} className="text-zinc-700 hover:text-white cursor-pointer" />
            <Icon name="Facebook" size={20} className="text-zinc-700 hover:text-white cursor-pointer" />
          </div>
        </div>
      </footer>
    </div>
  );
}