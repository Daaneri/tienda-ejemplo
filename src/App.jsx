import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabase';
import * as Lucide from 'lucide-react';

const Icon = ({ name, ...props }) => {
  const LucideIcon = Lucide[name];
  return LucideIcon ? <LucideIcon {...props} /> : null;
};

const CATEGORIAS = ['Todos', 'Imperiales', 'Camioneros', 'Torpedos', 'Bombillas'];

// ==========================================
// COMPONENTE PANEL DE ADMINISTRADOR (RUTA: /admin)
// ==========================================
function AdminPanel() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [productos, setProductos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState('Imperiales');
  const [imageUrl, setImageUrl] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [editandoId, setEditandoId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    }).catch(() => setLoadingSession(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingSession(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchProductos();
  }, [session]);

  const fetchProductos = async () => {
    const { data } = await supabase.from('productos').select('*').order('id', { ascending: false });
    setProductos(data || []);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Error: ' + error.message);
    setLoading(false);
  };

  const handleGuardarProducto = async (e) => {
    e.preventDefault();
    if (!nombre || !precio) return alert('Nombre y precio requeridos');
    setLoading(true);

    const datosProducto = { 
      nombre, 
      precio: parseFloat(precio), 
      categoria,
      imagen_url: imageUrl,
      descripcion
    };

    if (editandoId) {
      const { error } = await supabase.from('productos').update(datosProducto).eq('id', editandoId);
      setLoading(false);
      if (error) {
        alert('Error al actualizar: ' + error.message);
      } else {
        alert('¡Producto actualizado con éxito!');
        limpiarFormulario();
        fetchProductos();
      }
    } else {
      const { error } = await supabase.from('productos').insert([datosProducto]);
      setLoading(false);
      if (error) {
        alert('Error al guardar: ' + error.message);
      } else {
        alert('¡Producto publicado con éxito!');
        limpiarFormulario();
        fetchProductos();
      }
    }
  };

  const handleActivarEdicion = (p) => {
    setEditandoId(p.id);
    setNombre(p.nombre);
    setPrecio(p.precio);
    setCategoria(p.categoria || 'Imperiales');
    setImageUrl(p.imagen_url || '');
    setDescripcion(p.descripcion || '');
  };

  const limpiarFormulario = () => {
    setEditandoId(null);
    setNombre('');
    setPrecio('');
    setCategoria('Imperiales');
    setImageUrl('');
    setDescripcion('');
  };

  const handleEliminar = async (id) => {
    if (confirm('¿Seguro querés borrar este producto?')) {
      if (editandoId === id) limpiarFormulario();
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (error) alert('Error: ' + error.message);
      else fetchProductos();
    }
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center font-sans text-white">
        <p className="text-zinc-500 font-mono text-[10px] tracking-[0.4em] uppercase animate-pulse">Verificando Credenciales...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4 font-sans text-white">
        <div className="max-w-md w-full bg-[#0e0e0e] p-8 rounded-[35px] border border-white/5 shadow-2xl">
          <h2 className="text-xl font-black uppercase tracking-widest text-center mb-6 text-[#FF5A36]">Admin Acceso</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-xs outline-none focus:border-[#FF5A36]"
              placeholder="EMAIL ADMINISTRADOR" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-4 text-xs outline-none focus:border-[#FF5A36]"
              placeholder="CONTRASEÑA" required />
            <button type="submit" disabled={loading} className="w-full bg-[#FF5A36] text-black py-4 rounded-full font-black uppercase tracking-widest text-xs transition-all hover:bg-white">
              {loading ? 'INGRESANDO...' : 'INICIAR SESIÓN'}
            </button>
          </form>
          <button onClick={() => navigate('/')} className="w-full mt-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition">
            ← Volver a la Tienda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white p-6 md:p-12 font-sans">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-6 mb-12 gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Panel de Gestión</h1>
          <p className="text-xs text-zinc-500 tracking-widest uppercase mt-1">Admin: {session.user.email}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => navigate('/')} className="px-6 py-3 border border-white/10 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition">
            Ver Tienda
          </button>
          <button onClick={() => supabase.auth.signOut()} className="px-6 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-red-500/20 transition">
            Cerrar Sesión
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="bg-[#0e0e0e] p-8 rounded-[40px] border border-white/5 h-fit space-y-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-[#FF5A36]">
            {editandoId ? 'Editar Producto' : 'Nuevo Producto'}
          </h3>
          <form onSubmit={handleGuardarProducto} className="space-y-4">
            <input type="text" placeholder="NOMBRE" value={nombre} onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-2xl px-5 py-3.5 text-xs outline-none focus:border-[#FF5A36]" required />
            <input type="number" step="0.01" placeholder="PRECIO ($)" value={precio} onChange={(e) => setPrecio(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-2xl px-5 py-3.5 text-xs outline-none focus:border-[#FF5A36]" required />
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-2xl px-5 py-3.5 text-xs outline-none focus:border-[#FF5A36] text-zinc-400">
              {CATEGORIAS.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </select>
            <input type="url" placeholder="URL DE LA IMAGEN" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-2xl px-5 py-3.5 text-xs outline-none focus:border-[#FF5A36]" />
            <textarea placeholder="DESCRIPCIÓN CORTA" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-2xl px-5 py-3.5 text-xs outline-none focus:border-[#FF5A36] h-24 resize-none text-white" />
            <div className="space-y-2">
              <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl font-black bg-[#FF5A36] text-black uppercase tracking-widest text-xs transition-all hover:bg-white">
                {loading ? 'GUARDANDO...' : editandoId ? 'ACTUALIZAR EN WEB' : 'PUBLICAR EN WEB'}
              </button>
              {editandoId && (
                <button type="button" onClick={limpiarFormulario} className="w-full bg-zinc-900 border border-white/10 text-zinc-400 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:text-white transition">
                  Cancelar Edición
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 bg-[#0e0e0e] p-8 rounded-[40px] border border-white/5">
          <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-6">Productos Online ({productos.length})</h3>
          <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
            {productos.map((p) => (
              <div key={p.id} className={`flex items-center justify-between p-4 bg-black rounded-2xl border ${editandoId === p.id ? 'border-amber-500' : 'border-white/5'}`}>
                <div className="flex items-center space-x-4">
                  <img src={p.imagen_url || 'https://via.placeholder.com/150'} alt="" className="w-12 h-12 object-cover rounded-xl"/>
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-tight">{p.nombre}</h4>
                    <p className="text-[#FF5A36] font-black text-sm mt-0.5">${p.precio.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{p.categoria}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleActivarEdicion(p)} className="px-4 py-2 bg-zinc-900 text-amber-400 rounded-xl text-[10px] font-black uppercase hover:bg-zinc-800 transition">Editar</button>
                  <button onClick={() => handleEliminar(p.id)} className="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-[10px] font-black uppercase hover:bg-red-500/20 transition">Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE VISTA VENTA PÚBLICA (RUTA: /)
// ==========================================
function TiendaPublica() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('Todos');
  const [ordenPrecio, setOrdenPrecio] = useState('defecto'); // 'defecto', 'bajo', 'alto'
  const [busqueda, setBusqueda] = useState('');
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [cp, setCp] = useState('');
  const [envio, setEnvio] = useState(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  useEffect(() => {
    supabase.from('productos').select('*').then(({ data }) => {
      setProductos(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Lógica combinada de Filtrado y Ordenamiento
  const productosFiltrados = useMemo(() => {
    let result = [...productos];
    
    if (filtro !== 'Todos') result = result.filter(p => p.categoria === filtro);
    
    if (busqueda.trim() !== '') {
      result = result.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
    }

    if (ordenPrecio === 'bajo') {
      result.sort((a, b) => a.precio - b.precio);
    } else if (ordenPrecio === 'alto') {
      result.sort((a, b) => b.precio - a.precio);
    }
    
    return result;
  }, [productos, filtro, busqueda, ordenPrecio]);

  const subtotal = useMemo(() => carrito.reduce((acc, i) => acc + i.precio, 0), [carrito]);
  const total = subtotal + (envio || 0);

  const generarLinkWA = () => {
    const baseMsg = "¡Hola! Estoy viendo la tienda de Ejemplo Mates y me interesa:";
    const items = carrito.map(i => `%0A- ${i.nombre} ($${i.precio})`).join('');
    const totalMsg = `%0A%0ATotal estimado: $${total}`;
    return `https://wa.me/543400000000?text=${baseMsg}${items}${totalMsg}`;
  };

  const handleMercadoPago = async () => {
    if (carrito.length === 0) return;
    setIsCheckoutLoading(true);
    setTimeout(() => {
      setIsCheckoutLoading(false);
      alert("Redirigiendo a Mercado Pago seguro...");
    }, 1500);
  };

  if (loading) return (
    <div className="h-screen bg-[#080808] flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-[#FF5A36] border-t-transparent rounded-full animate-spin" />
      <span className="font-mono text-[10px] tracking-[0.4em] text-zinc-500 uppercase">Cargando Tienda...</span>
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

      {/* Ticker */}
      <div className="bg-[#FF5A36] py-2.5 text-black text-[10px] font-black uppercase tracking-[0.2em] text-center overflow-hidden border-b border-black/10">
        <motion.div animate={{ x: [0, -1000] }} transition={{ repeat: Infinity, duration: 30, ease: 'linear' }} className="flex whitespace-nowrap gap-20">
          {[...Array(10)].map((_, i) => (
            <span key={i}>Envíos gratis en Villa Constitución — 3 Cuotas sin interés — Cuero Legítimo — Garantía de por vida</span>
          ))}
        </motion.div>
      </div>

      {/* NAV */}
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

      {/* FLOTANTES */}
      <div className="fixed bottom-8 right-8 z-[150] flex flex-col gap-4 items-end">
        <a href={generarLinkWA()} target="_blank" rel="noreferrer" className="w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-2xl border-4 border-[#080808]">
          <Icon name="MessageCircle" size={24} fill="white" />
        </a>
        <button onClick={() => setCarritoAbierto(true)} className="w-20 h-20 bg-[#FF5A36] text-black rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,90,54,0.3)] border-4 border-[#080808] relative">
          <Icon name="ShoppingBag" size={32} />
          {carrito.length > 0 && <span className="absolute -top-1 -right-1 bg-white text-black text-[12px] font-black w-7 h-7 rounded-full flex items-center justify-center border-2 border-black">{carrito.length}</span>}
        </button>
      </div>

      {/* HERO */}
      <header className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 text-center border-b border-white/5">
        <span className="text-[#FF5A36] font-mono text-[11px] tracking-[0.6em] uppercase mb-10 block">Handmade in Argentina</span>
        <h1 className="text-[clamp(50px,14vw,160px)] font-black leading-[0.8] tracking-tighter uppercase mb-12">
          Calidad <br /> <span className="text-zinc-800 italic font-serif" style={{ fontFamily: "'Playfair Display', serif" }}>Sin Tiempo.</span>
        </h1>
        <p className="max-w-2xl text-zinc-500 text-lg md:text-xl font-light leading-relaxed mb-12 mx-auto">
          Seleccionamos los mejores cueros y metales para crear compañeros de ruta que duran generations.
        </p>
        <button onClick={() => document.getElementById('productos').scrollIntoView()} className="bg-[#FF5A36] text-black px-12 py-5 rounded-full font-black uppercase tracking-widest text-[11px] hover:bg-white transition-all">
          Explorar Colección
        </button>
      </header>

      {/* SECCIÓN DE FILTROS Y ORDENAMIENTO EXTENDIDO */}
      <section className="sticky top-20 z-50 bg-[#080808]/80 backdrop-blur-md border-b border-white/5 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {CATEGORIAS.map(c => (
              <button key={c} onClick={() => setFiltro(c)} className={`px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${filtro === c ? 'bg-white border-white text-black' : 'border-white/10 text-zinc-500'}`}>{c}</button>
            ))}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
            {/* Filtro de Orden por Precio */}
            <select 
              value={ordenPrecio} 
              onChange={(e) => setOrdenPrecio(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest text-zinc-400 outline-none focus:border-[#FF5A36] w-full sm:w-auto appearance-none cursor-pointer pr-10 relative"
              style={{ backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23666\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><polyline points=\'6 9 12 15 18 9\'></polyline></svg>")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 15px center', backgroundSize: '14px' }}
            >
              <option value="defecto" className="bg-[#0e0e0e]">Relevancia</option>
              <option value="bajo" className="bg-[#0e0e0e]">Precio: Más Bajo Primero</option>
              <option value="alto" className="bg-[#0e0e0e]">Precio: Más Alto Primero</option>
            </select>

            {/* Input Buscador */}
            <div className="relative w-full sm:w-64">
              <Icon name="Search" size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input type="text" placeholder="¿Qué buscás hoy?" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-full pl-12 pr-6 py-3 text-xs outline-none focus:border-[#FF5A36]" />
            </div>
          </div>
        </div>
      </section>

      {/* GRILLA */}
      <section id="productos" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-20">
          {productosFiltrados.map(p => (
            <div key={p.id} className="group cursor-pointer" onClick={() => setProductoSeleccionado(p)}>
              <div className="aspect-[3/4] bg-zinc-900 rounded-[45px] overflow-hidden mb-8 relative">
                <img src={p.imagen_url || 'https://via.placeholder.com/600'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                <div className="absolute top-6 right-6">
                  <span className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10">
                    Stock Online
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="text-2xl font-black uppercase tracking-tighter leading-tight">{p.nombre}</h3>
                  <span className="text-2xl font-black italic text-[#FF5A36]">${p.precio.toLocaleString()}</span>
                </div>
                <p className="text-zinc-600 text-[11px] font-bold tracking-[0.2em] uppercase">{p.categoria}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CURADO */}
      <section id="curado" className="bg-zinc-900/30 py-32 border-y border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Icon name="Flame" size={40} className="text-[#FF5A36] mx-auto mb-8" />
          <h2 className="text-4xl font-black uppercase italic mb-8 font-serif">El Ritual del Curado</h2>
          <div className="grid md:grid-cols-3 gap-10 text-left">
            {[{t: "1. Hidratar", d: "Llenar el mate con yerba usada y agua tibia."}, {t: "2. Reposo", d: "Dejar reposar 24 horas para sellar poros."}, {t: "3. Limpieza", d: "Retirar yerba y raspar suavemente las paredes."}].map(paso => (
              <div key={paso.t}>
                <h4 className="font-black uppercase text-[#FF5A36] text-xs tracking-widest mb-2">{paso.t}</h4>
                <p className="text-zinc-500 text-sm leading-relaxed">{paso.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODAL DETALLE */}
      <AnimatePresence>
        {productoSeleccionado && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setProductoSeleccionado(null)} />
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="relative bg-[#0e0e0e] w-full max-w-5xl rounded-[60px] overflow-hidden grid lg:grid-cols-2 border border-white/10">
              <div className="h-[350px] lg:h-full"><img src={productoSeleccionado.imagen_url || 'https://via.placeholder.com/600'} className="w-full h-full object-cover" alt="" /></div>
              <div className="p-8 md:p-16 flex flex-col justify-center">
                <button onClick={() => setProductoSeleccionado(null)} className="absolute top-10 right-10 text-zinc-500 hover:text-white"><Icon name="X" size={32} /></button>
                <span className="text-[#FF5A36] font-mono text-[10px] tracking-[0.5em] mb-4 uppercase">{productoSeleccionado.categoria}</span>
                <h2 className="text-5xl font-black uppercase mb-6">{productoSeleccionado.nombre}</h2>
                <p className="text-zinc-500 mb-8 leading-relaxed">{productoSeleccionado.descripcion || "Fabricado artesanalmente en Villa Constitución. Cada pieza es única con terminaciones premium en cuero vacuno."}</p>
                <div className="text-4xl font-black italic mb-8">${productoSeleccionado.precio.toLocaleString()}</div>
                <button onClick={() => { setCarrito([...carrito, productoSeleccionado]); setProductoSeleccionado(null); }} className="w-full bg-[#FF5A36] text-black py-5 rounded-[30px] font-black uppercase text-xs hover:bg-white transition-all shadow-2xl">Sumar al Carrito</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SIDEBAR CARRITO */}
      <AnimatePresence>
        {carritoAbierto && (
          <>
            <div className="fixed inset-0 bg-black/80 z-[200]" onClick={() => setCarritoAbierto(false)} />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-[#0e0e0e] z-[210] p-8 flex flex-col border-l border-white/5">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black italic uppercase font-serif">Tu Pedido</h2>
                <button onClick={() => setCarritoAbierto(false)}><Icon name="X" size={36} /></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-6">
                {carrito.length === 0 ? <p className="text-zinc-600 text-xs uppercase text-center mt-20">El carrito está vacío</p> : 
                  carrito.map((item, idx) => (
                    <div key={idx} className="flex gap-4 items-center border-b border-white/5 pb-4">
                      <img src={item.imagen_url || 'https://via.placeholder.com/150'} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                      <div className="flex-1">
                        <p className="font-black text-xs uppercase">{item.nombre}</p>
                        <p className="text-[#FF5A36] font-black">${item.precio.toLocaleString()}</p>
                      </div>
                      <button onClick={() => setCarrito(carrito.filter((_, i) => i !== idx))}><Icon name="Trash2" size={16} className="text-zinc-600 hover:text-red-500" /></button>
                    </div>
                  ))
                }
              </div>
              <div className="pt-6 space-y-6">
                <div className="bg-zinc-900/50 p-6 rounded-[30px] space-y-4">
                  <div className="flex gap-2">
                    <input type="text" placeholder="CP (2919)" className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#FF5A36]" value={cp} onChange={(e) => setCp(e.target.value)} />
                    <button onClick={() => setEnvio(cp === '2919' ? 0 : 4500)} className="bg-white text-black px-6 rounded-xl font-black text-[10px] uppercase">Calcular</button>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-zinc-500"><span>Total Final:</span><span className="text-2xl text-white font-black">${total.toLocaleString()}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={handleMercadoPago} className="bg-white text-black py-4 rounded-2xl font-black uppercase text-[10px]">{isCheckoutLoading ? "Cargando..." : "Pago Seguro"}</button>
                  <a href={generarLinkWA()} target="_blank" rel="noreferrer" className="bg-[#25D366] text-white py-4 rounded-2xl flex items-center justify-center font-black uppercase text-[10px]">WhatsApp</a>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* FOOTER PREMIUM COMPLETO COMPUESTO POR 4 COLUMNAS */}
      <footer id="contacto" className="py-32 border-t border-white/5 px-6 bg-[#060606]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
          <div className="space-y-8">
            <span className="font-serif italic text-3xl font-black text-white" style={{ fontFamily: "'Playfair Display', serif" }}>Ejemplo Mates</span>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
              Artesanía santafesina con proyección internacional. Showroom exclusivo y envíos directos a todo el país.
            </p>
          </div>
          <div className="space-y-8">
            <h5 className="font-black uppercase text-[10px] tracking-[0.4em] text-white">Navegación</h5>
            <ul className="flex flex-col gap-4 text-zinc-500 text-sm font-bold uppercase tracking-widest">
              <li><a href="#" className="hover:text-white transition-colors">Inicio</a></li>
              <li><a href="#productos" className="hover:text-white transition-colors">Catálogo</a></li>
              <li><a href="#curado" className="hover:text-white transition-colors">Cómo Curar</a></li>
              <li><Link to="/admin" className="hover:text-[#FF5A36] transition-colors">[ Panel Control ]</Link></li>
            </ul>
          </div>
          <div className="space-y-8">
            <h5 className="font-black uppercase text-[10px] tracking-[0.4em] text-white">Contacto</h5>
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
          
          {/* CUARTA COLUMNA COMBINADA: PREGUNTAS FRECUENTES + VISITAS */}
          <div className="space-y-8">
            <h5 className="font-black uppercase text-[10px] tracking-[0.4em] text-white">Preguntas & Visitas</h5>
            <div className="space-y-6 text-xs">
              <div>
                <span className="text-white block font-black uppercase text-[9px] tracking-wider mb-1">¿Hacen envíos?</span>
                <span className="text-zinc-500 leading-relaxed">Gratis en Villa Constitución. Despachamos por Andreani a todo el país todas las semanas.</span>
              </div>
              <div>
                <span className="text-white block font-black uppercase text-[9px] tracking-wider mb-1">Showroom & Retiros</span>
                <span className="text-zinc-500 leading-relaxed block">Lunes a Viernes de 16:00 a 20:00 hs — Cita previa.</span>
                <span className="text-[#FF5A36] font-bold text-[10px] uppercase tracking-wider block mt-1">Coordiná tu visita por WhatsApp</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto mt-32 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-zinc-700 text-[9px] uppercase tracking-[0.5em]">© 2026 Ejemplo Mates — Todos los derechos reservados</p>
          <div className="flex items-center gap-8 text-zinc-700">
            <Icon name="Instagram" size={20} className="hover:text-white cursor-pointer transition-colors" />
            <Icon name="Facebook" size={20} className="hover:text-white cursor-pointer transition-colors" />
          </div>
        </div>
      </footer>
    </div>
  );
}

// ==========================================
// PUNTO DE ENTRADA PRINCIPAL CON EL ENRUTADOR
// ==========================================
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TiendaPublica />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}