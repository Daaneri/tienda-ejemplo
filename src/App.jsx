import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// ==========================================
// SIMULACIÓN DE CONTEXTOS Y COMPONENTES
// ==========================================
// Reemplazá esto por tus componentes o contextos reales si los tenés separados
const ThemeProvider = ({ children }) => {
  const [dark, setDark] = useState(true);
  const toggleTheme = () => setDark(!dark);
  return <div className={dark ? 'dark' : ''}>{children({ dark, toggleTheme })}</div>;
};

const ToastProvider = ({ children }) => {
  const toast = (msg, type = 'success') => console.log(`[Toast - ${type}]: ${msg}`);
  return children({ toast });
};

// Componente simulado de Íconos (podés mapearlo a lucide-react si usás esa librería)
const Icon = ({ name, size = 16, className = '', fill = 'none' }) => {
  return <span className={`inline-block ${className}`} style={{ width: size, height: size, backgroundColor: 'currentColor', mask: `url(#${name}) no-repeat center` }} />;
};

const AdminPanel = () => <div className="p-10 text-white">Panel de Administración</div>;
const ResenasModal = ({ producto, onClose }) => <div className="fixed inset-0 bg-black/50 z-[400] flex items-center justify-center text-white"><button onClick={onClose}>Cerrar Reseñas</button></div>;

// Constantes globales
const CATEGORIAS = ['Todos', 'Imperial', 'Camionero', 'Torpedos', 'Bombillas', 'Accesorios'];

const PRODUCTOS_MOCK = [
  { id: 1, nombre: 'Mate Imperial Premium', precio: 45000, categoria: 'Imperial', stock: 5, imagen_url: '', descripcion: 'Mate de calabaza seleccionado forrado en cuero vacuno con virola de alpaca trabajada.' },
  { id: 2, nombre: 'Mate Camionero Cincelado', precio: 38000, categoria: 'Camionero', stock: 3, imagen_url: '', descripcion: 'Base reforzada, cuero legítimo, ideal para el día a día.' },
  { id: 3, nombre: 'Bombilla Pico de Loro', precio: 12000, categoria: 'Bombillas', stock: 10, imagen_url: '', descripcion: 'Bombilla de alpaca maciza con filtro desarmable.' }
];

// ==========================================
// COMPONENTE TIENDA PÚBLICA (MÓDULO PRINCIPAL)
// ==========================================
export function TiendaPublica({ dark, toggleTheme, toast }) {
  // --- ESTADOS DE LA TIENDA ---
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState(PRODUCTOS_MOCK);
  const [filtro, setFiltro] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [ordenPrecio, setOrdenPrecio] = useState('defecto');
  
  const [carrito, setCarrito] = useState([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [cp, setCp] = useState('');
  const [envio, setEnvio] = useState(null);
  
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [resenasProducto, setResenasProducto] = useState(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // --- FUNCIONES AUXILIARES Y MANEJADORES ---
  const fmt = (num) => new Intl.NumberFormat('es-AR').format(num);

  const agregarAlCarrito = (producto) => {
    setCarrito([...carrito, producto]);
    toast(`¡${producto.nombre} agregado al carrito!`, 'success');
  };

  const cambiarCantidad = (id, cantidad) => {
    if (cantidad === -1) {
      const index = carrito.findIndex(item => item.id === id);
      if (index !== -1) {
        const nuevoCarrito = [...carrito];
        nuevoCarrito.splice(index, 1);
        setCarrito(nuevoCarrito);
      }
    } else {
      const encontrado = productos.find(p => p.id === id);
      if (encontrado) setCarrito([...carrito, encontrado]);
    }
  };

  const toggleWishlist = (id) => {
    if (wishlist.includes(id)) {
      setWishlist(wishlist.filter(favId => favId !== id));
    } else {
      setWishlist([...wishlist, id]);
    }
  };

  const isWished = (id) => wishlist.includes(id);

  const generarLinkWA = () => {
    const base = "https://wa.me/5493400000000?text="; // Cambiar por tu número real
    if (carrito.length === 0) return base + encodeURIComponent("¡Hola! Me gustaría hacer una consulta sobre los mates.");
    
    let mensaje = "¡Hola! Quiero realizar el siguiente pedido:\n\n";
    carritoAgrupado.forEach(item => {
      mensaje += `• ${item.nombre} (x${item.cantidad}) - $${fmt(item.precio * item.cantidad)}\n`;
    });
    if (envio !== null) mensaje += `\nEnvío: ${envio === 0 ? 'Gratis' : `$${fmt(envio)}`}`;
    mensaje += `\n*Total Final: $${fmt(total)}*`;
    return base + encodeURIComponent(mensaje);
  };

  // --- LÓGICA DE FILTRADO Y AGRUPACIÓN ---
  const productosFiltrados = productos
    .filter(p => filtro === 'Todos' || p.categoria === filtro)
    .filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => {
      if (ordenPrecio === 'bajo') return a.precio - b.precio;
      if (ordenPrecio === 'alto') return b.precio - a.precio;
      return 0;
    });

  const carritoAgrupado = Object.values(
    carrito.reduce((acc, item) => {
      if (!acc[item.id]) acc[item.id] = { ...item, cantidad: 0 };
      acc[item.id].cantidad += 1;
      return acc;
    }, {})
  );

  const total = carrito.reduce((sum, item) => sum + item.precio, 0) + (envio || 0);

  // --- LO QUE ME PASASTE VOS (SEGUNDA MITAD INTEGRADA) ---
  const handleMercadoPago = async () => {
    if (carrito.length === 0) return;
    setIsCheckoutLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsCheckoutLoading(false);
    toast('Redirigiendo a Mercado Pago...', 'info');
  };

  const handleCalcularEnvio = () => {
    const gratis = cp === '2919';
    setEnvio(gratis ? 0 : 4500);
    toast(gratis ? '¡Envío gratis a tu zona!' : `Envío: $4.500`);
  };

  const bg = dark ? 'bg-[#080808]' : 'bg-[#f5f0eb]';
  const navBg = dark ? 'bg-[#080808]/95' : 'bg-[#f5f0eb]/95';
  const textColor = dark ? 'text-white' : 'text-black';
  const textMuted = dark ? 'text-zinc-500' : 'text-stone-500';

  if (loading) return (
    <div className={`h-screen ${bg} flex flex-col items-center justify-center gap-4`}>
      <div className="w-12 h-12 border-4 border-[#FF5A36] border-t-transparent rounded-full animate-spin" />
      <span className="font-mono text-[10px] tracking-[0.4em] text-zinc-500 uppercase">Cargando Tienda...</span>
    </div>
  );

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
  const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 24 } } };

  return (
    <div className={`${bg} min-h-screen ${textColor} selection:bg-[#FF5A36] selection:text-black overflow-x-hidden`}>
      <style>{`
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #FF5A36; border-radius: 10px; }
      `}</style>

      {/* TICKER */}
      <div className="bg-[#FF5A36] py-2.5 text-black text-[10px] font-black uppercase tracking-[0.2em] text-center overflow-hidden border-b border-black/10">
        <motion.div animate={{ x: [0, -1000] }} transition={{ repeat: Infinity, duration: 30, ease: 'linear' }} className="flex whitespace-nowrap gap-20">
          {[...Array(10)].map((_, i) => <span key={i}>Envíos gratis en Villa Constitución — 3 Cuotas sin interés — Cuero Legítimo — Garantía de por vida</span>)}
        </motion.div>
      </div>

      {/* NAV */}
      <nav className={`sticky top-0 z-[100] ${navBg} backdrop-blur-2xl border-b ${dark ? 'border-white/5' : 'border-black/10'} h-20 flex items-center px-6 md:px-20 justify-between`}>
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-[#FF5A36] rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-black rounded-full animate-pulse" />
          </div>
          <span className="font-serif italic text-2xl font-black tracking-tighter" style={{ fontFamily: "'Playfair Display', serif" }}>Ejemplo Mates</span>
        </div>
        <div className="hidden lg:flex gap-10 text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
          <a href="#productos" className="hover:text-[#FF5A36] transition-colors">Catálogo</a>
          <a href="#curado" className="hover:text-[#FF5A36] transition-colors">Curado</a>
          <a href="#contacto" className="hover:text-[#FF5A36] transition-colors">Showroom</a>
        </div>
        <button onClick={toggleTheme} className={`p-2.5 rounded-full border ${dark ? 'border-white/10 text-zinc-400 hover:text-white' : 'border-black/10 text-stone-500 hover:text-black'} transition-all`}>
          <Icon name={dark ? 'Sun' : 'Moon'} size={18} />
        </button>
      </nav>

      {/* FLOTANTES */}
      <div className="fixed bottom-8 right-8 z-[150] flex flex-col gap-4 items-end">
        <a href={generarLinkWA()} target="_blank" rel="noreferrer" className={`w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-2xl border-4 ${dark ? 'border-[#080808]' : 'border-[#f5f0eb]'}`}>
          <Icon name="MessageCircle" size={24} fill="white" className="text-white" />
        </a>
        <button onClick={() => setCarritoAbierto(true)} className={`w-20 h-20 bg-[#FF5A36] text-black rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,90,54,0.3)] border-4 ${dark ? 'border-[#080808]' : 'border-[#f5f0eb]'} relative`}>
          <Icon name="ShoppingBag" size={32} />
          {carrito.length > 0 && <span className="absolute -top-1 -right-1 bg-white text-black text-[12px] font-black w-7 h-7 rounded-full flex items-center justify-center border-2 border-black">{carrito.length}</span>}
        </button>
      </div>

      {/* HERO */}
      <header className={`relative min-h-[90vh] flex flex-col items-center justify-center px-6 text-center border-b ${dark ? 'border-white/5' : 'border-black/10'}`}>
        <motion.span initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-[#FF5A36] font-mono text-[11px] tracking-[0.6em] uppercase mb-10 block">Handmade in Argentina</motion.span>
        <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, type: 'spring', stiffness: 120 }} className="text-[clamp(50px,14vw,160px)] font-black leading-[0.8] tracking-tighter uppercase mb-12">
          Calidad <br /><span className={`${dark ? 'text-zinc-800' : 'text-stone-300'} italic font-serif`} style={{ fontFamily: "'Playfair Display', serif" }}>Sin Tiempo.</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className={`max-w-2xl ${textMuted} text-lg font-light leading-relaxed mb-12 mx-auto`}>
          Seleccionamos los mejores cueros y metales para crear compañeros de ruta que duran generaciones.
        </motion.p>
        <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.65 }}
          onClick={() => document.getElementById('productos').scrollIntoView({ behavior: 'smooth' })}
          className="bg-[#FF5A36] text-black px-12 py-5 rounded-full font-black uppercase tracking-widest text-[11px] hover:bg-white transition-all hover:scale-105">
          Explorar Colección
        </motion.button>
      </header>

      {/* FILTROS */}
      <section className={`sticky top-20 z-50 ${dark ? 'bg-[#080808]/80' : 'bg-[#f5f0eb]/80'} backdrop-blur-md border-b ${dark ? 'border-white/5' : 'border-black/10'} py-6`}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {CATEGORIAS.map(c => (
              <button key={c} onClick={() => setFiltro(c)}
                className={`px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all
                  ${filtro === c ? 'bg-[#FF5A36] border-[#FF5A36] text-black' : `${dark ? 'border-white/10 text-zinc-500 hover:border-white/30' : 'border-black/20 text-stone-500 hover:border-black/40'}`}`}>{c}</button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
            <select value={ordenPrecio} onChange={e => setOrdenPrecio(e.target.value)}
              className={`${dark ? 'bg-white/5 border-white/10 text-zinc-400' : 'bg-black/5 border-black/20 text-stone-600'} border rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest outline-none focus:border-[#FF5A36] w-full sm:w-auto appearance-none cursor-pointer`}>
              <option value="defecto">Relevancia</option>
              <option value="bajo">Precio: Menor a Mayor</option>
              <option value="alto">Precio: Mayor a Menor</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Icon name="Search" size={14} className={`absolute left-4 top-1/2 -translate-y-1/2 ${textMuted}`} />
              <input type="text" placeholder="¿Qué buscás hoy?" value={busqueda} onChange={e => setBusqueda(e.target.value)}
                className={`w-full ${dark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/20'} border rounded-full pl-12 pr-6 py-3 text-xs outline-none focus:border-[#FF5A36]`} />
            </div>
          </div>
        </div>
      </section>

      {/* GRILLA */}
      <section id="productos" className="py-24 px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div key={filtro + busqueda + ordenPrecio} variants={stagger} initial="hidden" animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-16">
            {productosFiltrados.map(p => (
              <motion.div key={p.id} variants={fadeUp} layout className="group">
                <div className="aspect-[3/4] bg-zinc-900 rounded-[45px] overflow-hidden mb-6 relative cursor-pointer" onClick={() => setProductoSeleccionado(p)}>
                  <img src={p.imagen_url || 'https://via.placeholder.com/600'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={p.nombre} />
                  <div className="absolute top-5 left-5 right-5 flex justify-between">
                    <span className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 text-white">
                      {p.stock != null ? (p.stock > 0 ? `Stock: ${p.stock}` : 'Sin Stock') : 'Disponible'}
                    </span>
                    <button onClick={e => { e.stopPropagation(); toggleWishlist(p.id); toast(isWished(p.id) ? 'Quitado de favoritos' : '¡Agregado a favoritos!', isWished(p.id) ? 'info' : 'success'); }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${isWished(p.id) ? 'bg-[#FF5A36] border-[#FF5A36]' : 'bg-black/40 border-white/10 hover:bg-[#FF5A36]/20'}`}>
                      <Icon name="Heart" size={16} className={isWished(p.id) ? 'text-white fill-white' : 'text-white'} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1 px-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-black uppercase tracking-tighter leading-tight cursor-pointer hover:text-[#FF5A36] transition-colors" onClick={() => setProductoSeleccionado(p)}>{p.nombre}</h3>
                    <span className="text-xl font-black italic text-[#FF5A36]">${fmt(p.precio)}</span>
                  </div>
                  <p className={`${textMuted} text-[11px] font-bold tracking-[0.2em] uppercase`}>{p.categoria}</p>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => agregarAlCarrito(p)} className="flex-1 bg-[#FF5A36] text-black py-3 rounded-2xl font-black uppercase text-[10px] hover:bg-white transition-all hover:scale-[1.02]">Agregar</button>
                    <button onClick={() => setResenasProducto(p)} className={`px-4 py-3 rounded-2xl border ${dark ? 'border-white/10 text-zinc-400 hover:border-white/30' : 'border-black/20 text-stone-500'} transition-all`}>
                      <Icon name="Star" size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
        {productosFiltrados.length === 0 && (
          <div className="text-center py-24">
            <Icon name="SearchX" size={48} className={`${textMuted} mx-auto mb-4`} />
            <p className={`${textMuted} text-xs uppercase tracking-widest`}>Sin resultados</p>
          </div>
        )}
      </section>

      {/* CURADO */}
      <section id="curado" className={`${dark ? 'bg-zinc-900/30' : 'bg-stone-100'} py-32 border-y ${dark ? 'border-white/5' : 'border-black/10'}`}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Icon name="Flame" size={40} className="text-[#FF5A36] mx-auto mb-8" />
          <h2 className="text-4xl font-black uppercase italic mb-8 font-serif">El Ritual del Curado</h2>
          <div className="grid md:grid-cols-3 gap-10 text-left">
            {[{t:"1. Hidratar",d:"Llenar el mate con yerba usada y agua tibia."},{t:"2. Reposo",d:"Dejar reposar 24 horas para sellar poros."},{t:"3. Limpieza",d:"Retirar yerba y raspar suavemente las paredes."}].map(p => (
              <div key={p.t}>
                <h4 className="font-black uppercase text-[#FF5A36] text-xs tracking-widest mb-2">{p.t}</h4>
                <p className={`${textMuted} text-sm leading-relaxed`}>{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODAL DETALLE */}
      <AnimatePresence>
        {productoSeleccionado && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div className="absolute inset-0 bg-black/95 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setProductoSeleccionado(null)} />
            <motion.div initial={{ y: 60, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 60, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              className="relative bg-[#0e0e0e] w-full max-w-5xl rounded-[60px] overflow-hidden grid lg:grid-cols-2 border border-white/10">
              <div className="h-[350px] lg:h-full relative">
                <img src={productoSeleccionado.imagen_url || 'https://via.placeholder.com/600'} className="w-full h-full object-cover" alt="" />
                <button onClick={e => { e.stopPropagation(); toggleWishlist(productoSeleccionado.id); toast(isWished(productoSeleccionado.id) ? 'Quitado de favoritos' : '¡Guardado!', isWished(productoSeleccionado.id) ? 'info' : 'success'); }}
                  className={`absolute top-6 left-6 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border transition-all ${isWished(productoSeleccionado.id) ? 'bg-[#FF5A36] border-[#FF5A36]' : 'bg-black/40 border-white/10'}`}>
                  <Icon name="Heart" size={18} className={isWished(productoSeleccionado.id) ? 'text-white fill-white' : 'text-white'} />
                </button>
              </div>
              <div className="p-8 md:p-14 flex flex-col justify-center">
                <button onClick={() => setProductoSeleccionado(null)} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition"><Icon name="X" size={28} /></button>
                <span className="text-[#FF5A36] font-mono text-[10px] tracking-[0.5em] mb-3 uppercase">{productoSeleccionado.categoria}</span>
                <h2 className="text-4xl font-black uppercase mb-4">{productoSeleccionado.nombre}</h2>
                <p className="text-zinc-500 mb-6 leading-relaxed text-sm">{productoSeleccionado.descripcion || 'Fabricado artesanalmente en Villa Constitución. Cada pieza es única con terminaciones premium en cuero vacuno.'}</p>
                {productoSeleccionado.stock != null && (
                  <p className={`text-xs font-bold mb-4 ${productoSeleccionado.stock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {productoSeleccionado.stock > 0 ? `✓ ${productoSeleccionado.stock} unidades en stock` : '✗ Sin stock'}
                  </p>
                )}
                <div className="text-4xl font-black italic mb-8">${fmt(productoSeleccionado.precio)}</div>
                <div className="flex gap-3">
                  <button onClick={() => { agregarAlCarrito(productoSeleccionado); setProductoSeleccionado(null); }}
                    className="flex-1 bg-[#FF5A36] text-black py-5 rounded-[30px] font-black uppercase text-xs hover:bg-white transition-all shadow-2xl">
                    Sumar al Carrito
                  </button>
                  <button onClick={() => { setResenasProducto(productoSeleccionado); setProductoSeleccionado(null); }}
                    className="px-6 py-5 rounded-[30px] border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 transition-all text-xs font-bold uppercase">
                    Reseñas
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CARRITO SIDEBAR */}
      <AnimatePresence>
        {carritoAbierto && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 z-[200]" onClick={() => setCarritoAbierto(false)} />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed right-0 top-0 bottom-0 w-full max-w-lg ${dark ? 'bg-[#0e0e0e]' : 'bg-white'} z-[210] p-8 flex flex-col border-l ${dark ? 'border-white/5' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black italic uppercase font-serif">Tu Pedido</h2>
                <button onClick={() => setCarritoAbierto(false)}><Icon name="X" size={32} /></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4">
                {carritoAgrupado.length === 0
                  ? <p className={`${textMuted} text-xs uppercase text-center mt-20`}>El carrito está vacío</p>
                  : carritoAgrupado.map(item => (
                    <motion.div key={item.id} layout className={`flex gap-4 items-center border-b ${dark ? 'border-white/5' : 'border-gray-100'} pb-4`}>
                      <img src={item.imagen_url || 'https://via.placeholder.com/150'} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                      <div className="flex-1">
                        <p className="font-black text-xs uppercase">{item.nombre}</p>
                        <p className="text-[#FF5A36] font-black">${fmt(item.precio * item.cantidad)}</p>
                      </div>
                      <div className={`flex items-center gap-2 ${dark ? 'bg-black' : 'bg-gray-100'} rounded-xl px-3 py-2`}>
                        <button onClick={() => cambiarCantidad(item.id, -1)} className="text-zinc-400 hover:text-white transition font-black text-lg leading-none">−</button>
                        <span className="text-sm font-black w-5 text-center">{item.cantidad}</span>
                        <button onClick={() => cambiarCantidad(item.id, 1)} className="text-zinc-400 hover:text-white transition font-black text-lg leading-none">+</button>
                      </div>
                    </motion.div>
                  ))
                }
              </div>
              <div className="pt-6 space-y-5">
                <div className={`${dark ? 'bg-zinc-900/50' : 'bg-gray-50'} p-6 rounded-[30px] space-y-4`}>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Código postal" className={`flex-1 ${dark ? 'bg-black border-white/10' : 'bg-white border-gray-200'} border rounded-xl px-4 py-3 text-xs outline-none focus:border-[#FF5A36]`} value={cp} onChange={e => setCp(e.target.value)} />
                    <button onClick={handleCalcularEnvio} className="bg-[#FF5A36] text-black px-5 rounded-xl font-black text-[10px] uppercase hover:bg-white transition-all">Calcular</button>
                  </div>
                  {envio !== null && (
                    <p className={`text-xs font-bold ${envio === 0 ? 'text-green-400' : textMuted}`}>
                      {envio === 0 ? '✓ Envío gratuito' : `Envío: $${fmt(envio)}`}
                    </p>
                  )}
                  <div className={`flex justify-between text-xs font-bold ${textMuted}`}>
                    <span>Total Final:</span>
                    <span className="text-2xl text-[#FF5A36] font-black">${fmt(total)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={handleMercadoPago} className="bg-white text-black py-4 rounded-2xl font-black uppercase text-[10px] hover:bg-[#FF5A36] transition-all">
                    {isCheckoutLoading ? 'Cargando...' : 'Pago Seguro'}
                  </button>
                  <a href={generarLinkWA()} target="_blank" rel="noreferrer" className="bg-[#25D366] text-white py-4 rounded-2xl flex items-center justify-center font-black uppercase text-[10px] hover:opacity-90 transition-all gap-2">
                    <Icon name="MessageCircle" size={14} />WhatsApp
                  </a>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* RESEÑAS MODAL */}
      <AnimatePresence>
        {resenasProducto && <ResenasModal producto={resenasProducto} onClose={() => setResenasProducto(null)} />}
      </AnimatePresence>

      {/* FOOTER */}
      <footer id="contacto" className={`py-32 border-t ${dark ? 'border-white/5 bg-[#060606]' : 'border-black/10 bg-stone-200'} px-6`}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
          <div className="space-y-8">
            <span className="font-serif italic text-3xl font-black" style={{ fontFamily: "'Playfair Display', serif" }}>Ejemplo Mates</span>
            <p className={`${textMuted} text-sm leading-relaxed max-w-xs`}>Artesanía santafesina con proyección internacional. Showroom exclusivo y envíos directos a todo el país.</p>
          </div>
          <div className="space-y-8">
            <h5 className="font-black uppercase text-[10px] tracking-[0.4em]">Navegación</h5>
            <ul className={`flex flex-col gap-4 ${textMuted} text-sm font-bold uppercase tracking-widest`}>
              <li><a href="#" className={`hover:text-[#FF5A36] transition-colors`}>Inicio</a></li>
              <li><a href="#productos" className="hover:text-[#FF5A36] transition-colors">Catálogo</a></li>
              <li><a href="#curado" className="hover:text-[#FF5A36] transition-colors">Cómo Curar</a></li>
              <li><Link to="/admin" className="hover:text-[#FF5A36] transition-colors">[ Panel Control ]</Link></li>
            </ul>
          </div>
          <div className="space-y-8">
            <h5 className="font-black uppercase text-[10px] tracking-[0.4em]">Contacto</h5>
            <ul className={`flex flex-col gap-4 ${textMuted} text-sm`}>
              <li className="flex items-center gap-3"><Icon name="MapPin" size={16} className="text-[#FF5A36]" />Villa Constitución, Santa Fe</li>
              <li className="flex items-center gap-3"><Icon name="Mail" size={16} className="text-[#FF5A36]" />hola@ejemplomates.ar</li>
            </ul>
          </div>
          <div className="space-y-8">
            <h5 className="font-black uppercase text-[10px] tracking-[0.4em]">Preguntas & Visitas</h5>
            <div className="space-y-6 text-xs">
              <div>
                <span className="block font-black uppercase text-[9px] tracking-wider mb-1">¿Hacen envíos?</span>
                <span className={`${textMuted} leading-relaxed`}>Gratis en Villa Constitución. Andreani a todo el país.</span>
              </div>
              <div>
                <span className="block font-black uppercase text-[9px] tracking-wider mb-1">Showroom & Retiros</span>
                <span className={`${textMuted} leading-relaxed block`}>Lun a Vie 16:00–20:00 hs · Cita previa.</span>
                <span className="text-[#FF5A36] font-bold text-[10px] uppercase tracking-wider block mt-1">Coordiná por WhatsApp</span>
              </div>
            </div>
          </div>
        </div>
        <div className={`max-w-7xl mx-auto mt-24 pt-8 border-t ${dark ? 'border-white/5' : 'border-black/10'} flex flex-col md:flex-row justify-between items-center gap-8`}>
          <p className={`${textMuted} text-[9px] uppercase tracking-[0.5em]`}>© 2026 Ejemplo Mates — Todos los derechos reservados</p>
          <div className={`flex items-center gap-8 ${textMuted}`}>
            <Icon name="Instagram" size={20} className="hover:text-[#FF5A36] cursor-pointer transition-colors" />
            <Icon name="Facebook" size={20} className="hover:text-[#FF5A36] cursor-pointer transition-colors" />
          </div>
        </div>
      </footer>
    </div>
  );
}

// ==========================================
// APP ROOT
// ==========================================
export default function App() {
  return (
    <ThemeProvider>
      {({ dark, toggleTheme }) => (
        <ToastProvider>
          {({ toast }) => (
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<TiendaPublica dark={dark} toggleTheme={toggleTheme} toast={toast} />} />
                <Route path="/admin" element={<AdminPanel />} />
              </Routes>
            </BrowserRouter>
          )}
        </ToastProvider>
      )}
    </ThemeProvider>
  );
}