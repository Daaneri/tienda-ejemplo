import React, { useState, useEffect, useMemo, useCallback, useContext, createContext, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabase';
import * as Lucide from 'lucide-react';

// ==========================================
// UTILS, CONSTANTS & ANIMATIONS
// ==========================================
const Icon = ({ name, ...props }) => {
  const LucideIcon = Lucide[name];
  return LucideIcon ? <LucideIcon {...props} /> : null;
};

const CATEGORIAS = ['Todos', 'Imperiales', 'Camioneros', 'Torpedos', 'Bombillas'];
const MONTO_ENVIO_GRATIS = 45000; // Banner dinámico e incentivo de compra

const fmt = (n) => Number(n || 0).toLocaleString('es-AR');

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
};

// ==========================================
// DARK MODE CONTEXT
// ==========================================
const ThemeContext = createContext();
function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') !== 'light');
  const toggle = () => setDark(d => {
    localStorage.setItem('theme', !d ? 'dark' : 'light');
    return !d;
  });
  return <ThemeContext.Provider value={{ dark, toggle }}>{children}</ThemeContext.Provider>;
}
const useTheme = () => useContext(ThemeContext);

// ==========================================
// TOAST SYSTEM
// ==========================================
const ToastContext = createContext();
let toastId = 0;
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = 'success') => {
    const id = ++toastId;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={add}>
      {children}
      <div className="fixed top-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className={`px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl pointer-events-auto border
                ${t.type === 'error' ? 'bg-red-500 text-white border-red-400' :
                  t.type === 'info' ? 'bg-zinc-800 text-white border-white/10' :
                  'bg-[#FF5A36] text-black border-orange-400'}`}>
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
const useToast = () => useContext(ToastContext);

// ==========================================
// CUSTOM HOOKS
// ==========================================
function useWishlist() {
  const [wishlist, setWishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wishlist') || '[]'); } catch { return []; }
  });
  const toggle = useCallback((id) => {
    setWishlist(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('wishlist', JSON.stringify(next));
      return next;
    });
  }, []);
  const has = (id) => wishlist.includes(id);
  return { wishlist, toggle, has };
}

function useProductos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    const { data } = await supabase.from('productos').select('*').order('id', { ascending: false });
    setProductos(data || []);
    setLoading(false);
  }, []);
  useEffect(() => { fetch(); }, [fetch]);
  return { productos, loading, refetch: fetch };
}

// ==========================================
// STAR RATING COMPONENT
// ==========================================
function StarRating({ value, onChange, size = 20 }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button"
          onMouseEnter={() => onChange && setHover(s)}
          onMouseLeave={() => onChange && setHover(0)}
          onClick={() => onChange?.(s)}
          className="transition-transform hover:scale-125">
          <Icon name="Star" size={size}
            className={`transition-colors ${(hover || value) >= s ? 'text-[#FF5A36] fill-[#FF5A36]' : 'text-zinc-600'}`} />
        </button>
      ))}
    </div>
  );
}

// ==========================================
// RESEÑAS MODAL
// ==========================================
function ResenasModal({ producto, onClose }) {
  const toast = useToast();
  const [resenas, setResenas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState(5);
  const [autor, setAutor] = useState('');
  const [texto, setTexto] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.from('resenas')
      .select('*')
      .eq('producto_id', producto.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setResenas(data || []); setLoading(false); });
  }, [producto.id]);

  const promedio = resenas.length ? (resenas.reduce((a,r) => a + r.estrellas, 0) / resenas.length).toFixed(1) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!autor.trim() || !texto.trim()) return toast('Completá todos los campos', 'error');
    setSubmitting(true);
    const { error } = await supabase.from('resenas').insert([{
      producto_id: producto.id,
      autor: autor.trim(),
      texto: texto.trim(),
      estrellas: stars
    }]);
    setSubmitting(false);
    if (error) return toast('Error al enviar reseña', 'error');
    toast('¡Reseña publicada!');
    setAutor(''); setTexto(''); setStars(5);
    const { data } = await supabase.from('resenas').select('*').eq('producto_id', producto.id).order('created_at', { ascending: false });
    setResenas(data || []);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative bg-[#0e0e0e] w-full max-w-2xl rounded-[40px] border border-white/10 p-8 max-h-[85vh] flex flex-col">
        <button onClick={onClose} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition"><Icon name="X" size={28} /></button>
        <div className="mb-6">
          <h2 className="text-2xl font-black uppercase tracking-tighter">{producto.nombre}</h2>
          {promedio && (
            <div className="flex items-center gap-3 mt-2">
              <StarRating value={Math.round(promedio)} size={16} />
              <span className="text-[#FF5A36] font-black">{promedio}</span>
              <span className="text-zinc-600 text-xs">({resenas.length} reseña{resenas.length !== 1 ? 's' : ''})</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2">
          {loading ? <p className="text-zinc-600 text-xs text-center py-8 animate-pulse">Cargando reseñas...</p> :
            resenas.length === 0 ? <p className="text-zinc-600 text-xs text-center py-8">Sé el primero en reseñar.</p> :
            resenas.map(r => (
              <div key={r.id} className="bg-black rounded-2xl p-4 border border-white/5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-black text-xs uppercase tracking-widest">{r.autor}</span>
                  <StarRating value={r.estrellas} size={13} />
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed">{r.texto}</p>
              </div>
            ))
          }
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 border-t border-white/5 pt-6">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FF5A36]">Tu Reseña</h4>
          <div className="flex items-center gap-4">
            <StarRating value={stars} onChange={setStars} />
            <span className="text-xs text-zinc-500">{stars} estrella{stars !== 1 ? 's' : ''}</span>
          </div>
          <input placeholder="TU NOMBRE" value={autor} onChange={e => setAutor(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#FF5A36]" />
          <textarea placeholder="CONTANOS TU EXPERIENCIA..." value={texto} onChange={e => setTexto(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-[#FF5A36] h-20 resize-none" />
          <button type="submit" disabled={submitting}
            className="w-full bg-[#FF5A36] text-black py-3 rounded-xl font-black uppercase text-xs hover:bg-white transition-all">
            {submitting ? 'Enviando...' : 'Publicar Reseña'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ==========================================
// ADMIN PANEL (CON STORAGE, METRICAS Y CSV)
// ==========================================
function AdminPanel() {
  const navigate = useNavigate();
  const toast = useToast();
  const { dark } = useTheme();
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('productos');

  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [categoria, setCategoria] = useState('Imperiales');
  const [imageUrl, setImageUrl] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [badge, setBadge] = useState('ninguno'); 
  const [editandoId, setEditandoId] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setLoadingSession(false);
    }).catch(() => setLoadingSession(false));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session); setLoadingSession(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) { fetchProductos(); fetchPedidos(); }
  }, [session]);

  const fetchProductos = async () => {
    const { data } = await supabase.from('productos').select('*').order('id', { ascending: false });
    setProductos(data || []);
  };

  const fetchPedidos = async () => {
    const { data } = await supabase.from('pedidos').select('*').order('created_at', { ascending: false });
    setPedidos(data || []);
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast('Error: ' + error.message, 'error');
    setLoading(false);
  };

  // Subida de archivos binarios directa a Supabase Storage
  const handleUploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `productos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('imagenes-mates')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('imagenes-mates').getPublicUrl(filePath);
      setImageUrl(data.publicUrl);
      toast('Imagen subida al Storage');
    } catch (err) {
      toast('Error subiendo imagen: ' + err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!nombre || !precio) return toast('Nombre y precio requeridos', 'error');
    setLoading(true);
    const datos = { 
      nombre, 
      precio: parseFloat(precio), 
      categoria, 
      imagen_url: imageUrl, 
      descripcion, 
      stock: stock === '' ? null : parseInt(stock),
      badge: badge === 'ninguno' ? null : badge,
      activo: true
    };
    const { error } = editandoId
      ? await supabase.from('productos').update(datos).eq('id', editandoId)
      : await supabase.from('productos').insert([datos]);
    setLoading(false);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast(editandoId ? '¡Producto actualizado!' : '¡Producto publicado!');
    limpiar(); fetchProductos();
  };

  const handleEditar = (p) => {
    setEditandoId(p.id); setNombre(p.nombre); setPrecio(p.precio);
    setCategoria(p.categoria || 'Imperiales'); setImageUrl(p.imagen_url || '');
    setDescripcion(p.descripcion || ''); setStock(p.stock ?? '');
    setBadge(p.badge || 'ninguno');
  };

  const toggleActivo = async (p) => {
    const nuevoEstado = !p.activo;
    const { error } = await supabase.from('productos').update({ activo: nuevoEstado }).eq('id', p.id);
    if (error) toast('Error al cambiar visibilidad', 'error');
    else {
      toast(nuevoEstado ? 'Producto visible en catálogo' : 'Producto ocultado');
      fetchProductos();
    }
  };

  const limpiar = () => {
    setEditandoId(null); setNombre(''); setPrecio('');
    setCategoria('Imperiales'); setImageUrl(''); setDescripcion(''); setStock('');
    setBadge('ninguno');
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Borrar este producto por completo?')) return;
    if (editandoId === id) limpiar();
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) toast('Error: ' + error.message, 'error');
    else { toast('Producto eliminado', 'info'); fetchProductos(); }
  };

  const updateEstadoPedido = async (id, estado, pedidoCompleto) => {
    const { error } = await supabase.from('pedidos').update({ estado }).eq('id', id);
    if (error) return toast('Error modificando estado', 'error');
    fetchPedidos();
    toast(`Pedido marcado: ${estado}`);

    // Notificación automática por WhatsApp al cambiar estado
    const nro = pedidoCompleto.cliente_wa?.replace(/\D/g, '');
    if (nro) {
      const msg = `¡Hola ${pedidoCompleto.cliente_nombre || 'cliente'}! El estado de tu pedido en Ejemplo Mates cambió a: *${estado.toUpperCase()}*. Total de compra: $${fmt(pedidoCompleto.total)}. ¡Muchas gracias!`;
      window.open(`https://wa.me/${nro}?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  // Exportar Pedidos a CSV
  const exportarCSV = () => {
    if (pedidos.length === 0) return toast('No hay datos para exportar', 'info');
    let csvContent = 'data:text/csv;charset=utf-8,ID,Cliente,WhatsApp,Total,Estado,Fecha\n';
    pedidos.forEach(p => {
      csvContent += `${p.id},"${p.cliente_nombre || ''}",${p.cliente_wa || ''},${p.total || 0},${p.estado || 'pendiente'},${p.created_at || ''}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pedidos_ejemplomates_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Métricas del Dashboard calculadas en tiempo real
  const metricas = useMemo(() => {
    const totalVendido = pedidos.filter(p => p.estado === 'entregado').reduce((acc, curr) => acc + (curr.total || 0), 0);
    const pendientes = pedidos.filter(p => p.estado === 'pendiente').length;
    return { totalVendido, pendientes };
  }, [pedidos]);

  const bg = dark ? 'bg-[#080808]' : 'bg-gray-50';
  const cardBg = dark ? 'bg-[#0e0e0e] border-white/5' : 'bg-white border-gray-200';
  const inputCls = `w-full ${dark ? 'bg-black border-white/10 text-white' : 'bg-gray-100 border-gray-300 text-black'} border rounded-2xl px-5 py-3.5 text-xs outline-none focus:border-[#FF5A36]`;
  const textMuted = dark ? 'text-zinc-500' : 'text-gray-500';

  if (loadingSession) return (
    <div className={`min-h-screen ${bg} flex items-center justify-center`}>
      <p className="text-zinc-500 font-mono text-[10px] tracking-[0.4em] uppercase animate-pulse">Verificando...</p>
    </div>
  );

  if (!session) return (
    <div className={`min-h-screen ${bg} flex items-center justify-center px-4`}>
      <div className={`max-w-md w-full ${cardBg} p-8 rounded-[35px] border shadow-2xl`}>
        <h2 className="text-xl font-black uppercase tracking-widest text-center mb-6 text-[#FF5A36]">Admin Acceso</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="EMAIL" required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} placeholder="CONTRASEÑA" required />
          <button type="submit" disabled={loading} className="w-full bg-[#FF5A36] text-black py-4 rounded-full font-black uppercase tracking-widest text-xs hover:bg-white transition-all">
            {loading ? 'INGRESANDO...' : 'INICIAR SESIÓN'}
          </button>
        </form>
        <button onClick={() => navigate('/')} className={`w-full mt-6 text-[10px] font-bold uppercase tracking-widest ${textMuted} hover:text-[#FF5A36] transition`}>
          ← Volver a la Tienda
        </button>
      </div>
    </div>
  );

  const ESTADO_COLORS = { pendiente: 'text-amber-400 bg-amber-400/10', enviado: 'text-blue-400 bg-blue-400/10', entregado: 'text-green-400 bg-green-400/10', cancelado: 'text-red-400 bg-red-400/10' };

  return (
    <div className={`min-h-screen ${bg} ${dark ? 'text-white' : 'text-black'} p-6 md:p-12`}>
      <header className={`flex flex-col md:flex-row justify-between items-start md:items-center border-b ${dark ? 'border-white/5' : 'border-gray-200'} pb-6 mb-8 gap-4`}>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Panel de Gestión</h1>
          <p className={`text-xs ${textMuted} tracking-widest uppercase mt-1`}>{session.user.email}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportarCSV} className="px-5 py-3 bg-zinc-800 text-white border border-white/10 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-zinc-700 transition flex items-center gap-2">
            <Icon name="Download" size={12} /> Exportar CSV
          </button>
          <button onClick={() => navigate('/')} className={`px-5 py-3 border ${dark ? 'border-white/10 hover:bg-white/5' : 'border-gray-300 hover:bg-gray-100'} rounded-full text-xs font-bold uppercase tracking-widest transition`}>Ver Tienda</button>
          <button onClick={() => supabase.auth.signOut()} className="px-5 py-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-red-500/20 transition">Cerrar Sesión</button>
        </div>
      </header>

      {/* DASHBOARD METRICAS EXPRESS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className={`${cardBg} border p-6 rounded-3xl flex justify-between items-center`}>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Ventas Liquidadas (Entregados)</p>
            <p className="text-2xl font-black text-green-400 mt-1">${fmt(metricas.totalVendido)}</p>
          </div>
          <Icon name="CircleDollarSign" size={28} className="text-green-400" />
        </div>
        <div className={`${cardBg} border p-6 rounded-3xl flex justify-between items-center`}>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Pedidos Pendientes</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{metricas.pendientes} entrantes</p>
          </div>
          <Icon name="Clock" size={28} className="text-amber-400" />
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-8">
        {['productos', 'pedidos'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all
              ${activeTab === t ? 'bg-[#FF5A36] text-black border-[#FF5A36]' : `${dark ? 'border-white/10 text-zinc-500 hover:bg-white/5' : 'border-gray-300 text-gray-500 hover:bg-gray-100'}`}`}>
            {t === 'productos' ? `Productos (${productos.length})` : `Pedidos (${pedidos.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'productos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* FORMULARIO */}
          <div className={`${cardBg} border p-8 rounded-[40px] h-fit space-y-5`}>
            <h3 className="text-sm font-black uppercase tracking-widest text-[#FF5A36]">{editandoId ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <form onSubmit={handleGuardar} className="space-y-4">
              <input placeholder="NOMBRE" value={nombre} onChange={e => setNombre(e.target.value)} className={inputCls} required />
              <input type="number" step="0.01" placeholder="PRECIO ($)" value={precio} onChange={e => setPrecio(e.target.value)} className={inputCls} required />
              <input type="number" placeholder="STOCK (unidades)" value={stock} onChange={e => setStock(e.target.value)} className={inputCls} />
              
              <div className="space-y-1">
                <label className="text-[10px] font-black tracking-widest text-zinc-500 block">BADGE VISUAL</label>
                <select value={badge} onChange={e => setBadge(e.target.value)} className={inputCls}>
                  <option value="ninguno">NINGUNO</option>
                  <option value="Nuevo">NUEVO</option>
                  <option value="Oferta">OFERTA</option>
                </select>
              </div>

              <select value={categoria} onChange={e => setCategoria(e.target.value)} className={inputCls}>
                {CATEGORIAS.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
              </select>
              
              {/* FILE LOADER STORAGE */}
              <div className="space-y-2">
                <label className="text-[10px] font-black tracking-widest text-zinc-500 block">IMAGEN DEL PRODUCTO (SUPABASE STORAGE)</label>
                <input type="file" accept="image/*" onChange={handleUploadImage} className="text-xs file:bg-[#FF5A36] file:text-black file:border-none file:px-4 file:py-2 file:rounded-xl file:text-[10px] file:font-black file:uppercase file:cursor-pointer cursor-pointer block w-full text-zinc-500" />
                {uploading && <p className="text-[10px] text-amber-500 animate-pulse font-bold">Subiendo archivo al bucket...</p>}
                {imageUrl && <input type="url" value={imageUrl} readOnly className={`${inputCls} opacity-60 text-zinc-400`} />}
              </div>

              <textarea placeholder="DESCRIPCIÓN" value={descripcion} onChange={e => setDescripcion(e.target.value)} className={`${inputCls} h-24 resize-none`} />
              <button type="submit" disabled={loading || uploading} className="w-full py-4 rounded-2xl font-black bg-[#FF5A36] text-black uppercase tracking-widest text-xs hover:bg-white transition-all">
                {loading ? 'GUARDANDO...' : editandoId ? 'ACTUALIZAR' : 'PUBLICAR'}
              </button>
              {editandoId && <button type="button" onClick={limpiar} className={`w-full ${dark ? 'bg-zinc-900 border-white/10 text-zinc-400' : 'bg-gray-100 border-gray-300 text-gray-500'} border py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:text-white transition`}>Cancelar</button>}
            </form>
          </div>

          {/* LISTA */}
          <div className={`lg:col-span-2 ${cardBg} border p-8 rounded-[40px]`}>
            <h3 className={`text-sm font-black uppercase tracking-widest ${textMuted} mb-6`}>Catálogo Interno</h3>
            <div className="space-y-4 max-h-[680px] overflow-y-auto pr-2">
              {productos.map(p => (
                <motion.div key={p.id} layout
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 ${dark ? 'bg-black' : 'bg-gray-50'} rounded-2xl border ${editandoId === p.id ? 'border-amber-500' : dark ? 'border-white/5' : 'border-gray-200'}`}>
                  <div className="flex items-center space-x-4">
                    <img src={p.imagen_url || 'https://via.placeholder.com/150'} alt="" className="w-12 h-12 object-cover rounded-xl flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-xs uppercase tracking-tight">{p.nombre}</h4>
                        {p.badge && <span className="bg-[#FF5A36]/10 border border-[#FF5A36]/30 text-[#FF5A36] text-[8px] px-2 py-0.5 rounded font-black uppercase">{p.badge}</span>}
                        {!p.activo && <span className="bg-zinc-700 text-zinc-300 text-[8px] px-2 py-0.5 rounded font-black uppercase">Inactivo</span>}
                      </div>
                      <p className="text-[#FF5A36] font-black text-sm">${fmt(p.precio)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-bold ${textMuted} uppercase tracking-widest`}>{p.categoria}</span>
                        {p.stock != null && <span className="text-[9px] font-bold text-blue-400 uppercase">· Stock: {p.stock}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-center">
                    <button onClick={() => toggleActivo(p)} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition ${p.activo ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                      {p.activo ? 'Ocultar' : 'Activar'}
                    </button>
                    <button onClick={() => handleEditar(p)} className="px-3 py-2 bg-amber-400/10 text-amber-400 rounded-xl text-[10px] font-black uppercase hover:bg-amber-400/20 transition">Editar</button>
                    <button onClick={() => handleEliminar(p.id)} className="px-3 py-2 bg-red-500/10 text-red-400 rounded-xl text-[10px] font-black uppercase hover:bg-red-500/20 transition">Borrar</button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pedidos' && (
        <div className={`${cardBg} border p-8 rounded-[40px]`}>
          <h3 className={`text-sm font-black uppercase tracking-widest ${textMuted} mb-6`}>Historial de Pedidos</h3>
          {pedidos.length === 0 ? (
            <p className={`text-center ${textMuted} text-xs py-16`}>No hay pedidos registrados aún.</p>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {pedidos.map(p => (
                <motion.div key={p.id} layout className={`p-5 ${dark ? 'bg-black border-white/5' : 'bg-gray-50 border-gray-200'} rounded-2xl border`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-black text-xs uppercase">{p.cliente_nombre || 'Cliente'}</span>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${ESTADO_COLORS[p.estado] || 'text-zinc-400 bg-zinc-400/10'}`}>{p.estado || 'pendiente'}</span>
                      </div>
                      <p className={`text-[10px] ${textMuted}`}>{p.cliente_email || p.cliente_wa} · {p.created_at ? new Date(p.created_at).toLocaleDateString('es-AR') : ''}</p>
                      {p.items && <p className={`text-xs ${textMuted} mt-1`}>{typeof p.items === 'string' ? p.items : JSON.stringify(p.items)}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[#FF5A36] font-black text-lg">${fmt(p.total || 0)}</span>
                      <select value={p.estado || 'pendiente'} onChange={e => updateEstadoPedido(p.id, e.target.value, p)}
                        className={`${dark ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-gray-300 text-black'} border rounded-xl px-3 py-2 text-[10px] font-bold uppercase outline-none`}>
                        {['pendiente','enviado','entregado','cancelado'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// TIENDA PÚBLICA
// ==========================================
function TiendaPublica() {
  const toast = useToast();
  const { dark, toggle: toggleTheme } = useTheme();
  const { productos, loading } = useProductos();
  const { wishlist, toggle: toggleWishlist, has: isWished } = useWishlist();
  
  // Persistencia segura del carrito mediante localStorage
  const [carrito, setCarrito] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('carrito') || '[]');
    } catch { return []; }
  });

  const [filtro, setFiltro] = useState('Todos');
  const [ordenPrecio, setOrdenPrecio] = useState('defecto');
  const [busqueda, setBusqueda] = useState('');
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [resenasProducto, setResenasProducto] = useState(null);
  const [cp, setCp] = useState('');
  const [envio, setEnvio] = useState(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  // Cupones de descuento válidos
  const [cuponInput, setCuponInput] = useState('');
  const [descuentoAplicado, setDescuentoAplicado] = useState(0); 
  const [cuponValido, setCuponValido] = useState(false);

  // Sincronizar cambios del carrito con localStorage
  useEffect(() => {
    localStorage.setItem('carrito', JSON.stringify(carrito));
  }, [carrito]);

  // Filtrado de productos excluyendo los que fueron marcados como inactivos
  const productosFiltrados = useMemo(() => {
    let r = productos.filter(p => p.activo !== false);
    if (filtro !== 'Todos') r = r.filter(p => p.categoria === filtro);
    if (busqueda.trim()) r = r.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
    if (ordenPrecio === 'bajo') r.sort((a,b) => a.precio - b.precio);
    else if (ordenPrecio === 'alto') r.sort((a,b) => b.precio - a.precio);
    return r;
  }, [productos, filtro, busqueda, ordenPrecio]);

  const carritoAgrupado = useMemo(() => {
    const map = {};
    carrito.forEach(item => {
      if (map[item.id]) map[item.id].cantidad++;
      else map[item.id] = { ...item, cantidad: 1 };
    });
    return Object.values(map);
  }, [carrito]);

  const subtotal = useMemo(() => carrito.reduce((acc,i) => acc + i.precio, 0), [carrito]);
  
  // Cálculo dinámico de envío según monto mínimo configurado
  const costoEnvioReal = useMemo(() => {
    if (subtotal === 0) return null;
    return subtotal >= MONTO_ENVIO_GRATIS ? 0 : (envio ?? 1200); 
  }, [subtotal, envio]);

  const total = useMemo(() => {
    const base = subtotal - (subtotal * descuentoAplicado);
    return base + (costoEnvioReal || 0);
  }, [subtotal, descuentoAplicado, costoEnvioReal]);

  const agregarAlCarrito = useCallback((p) => {
    setCarrito(c => [...c, p]);
    toast(`${p.nombre} agregado al carrito`);
  }, [toast]);

  const cambiarCantidad = useCallback((id, delta) => {
    setCarrito(c => {
      if (delta < 0) {
        const idx = c.findLastIndex ? c.findLastIndex(x => x.id === id) : [...c].reverse().findIndex(x => x.id === id);
        if (idx >= 0) { const n = [...c]; n.splice(idx, 1); return n; }
      } else {
        const item = c.find(x => x.id === id);
        if (item) return [...c, item];
      }
      return c;
    });
  }, []);

  const aplicarCupon = () => {
    const cod = cuponInput.trim().toUpperCase();
    if (cod === 'MATERO20') {
      setDescuentoAplicado(0.20);
      setCuponValido(true);
      toast('Cupón MATERO20 aplicado (-20%)');
    } else {
      toast('Cupón inválido', 'error');
    }
  };

  const handleCalcularEnvio = () => {
    if (!cp.trim()) return toast('Ingresá un código postal', 'error');
    setEnvio(1500); 
    toast('Costo de envío calculado');
  };

  const handleMercadoPago = async () => {
    if (carrito.length === 0) return toast('Carrito vacío', 'error');
    setIsCheckoutLoading(true);
    setTimeout(() => {
      setIsCheckoutLoading(false);
      toast('Redirección simulada a Mercado Pago exitosa');
    }, 1500);
  };

  const generarLinkWA = () => {
    const items = carritoAgrupado.map(i => `%0A- ${i.nombre} x${i.cantidad} ($${fmt(i.precio * i.cantidad)})`).join('');
    const cuponTxt = cuponValido ? `%0ACupón Aplicado: MATERO20 (-20%25)` : '';
    return `https://wa.me/543400000000?text=¡Hola! Me interesan estos productos:${items}${cuponTxt}%0A%0AEnvio: ${costoEnvioReal === 0 ? 'Gratis' : `$${fmt(costoEnvioReal)}`}%0ATotal Final: $${fmt(total)}`;
  };

  const textMuted = dark ? 'text-zinc-500' : 'text-gray-500';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${dark ? 'bg-[#080808] text-white' : 'bg-[#f5f0eb] text-black'}`}>
      
      {/* BANNER DINÁMICO DE ENVÍO GRATIS */}
      <div className="bg-[#FF5A36] text-black text-[10px] font-black uppercase tracking-[0.25em] py-3 px-4 text-center">
        {subtotal >= MONTO_ENVIO_GRATIS 
          ? '¡Felicidades! Tenés envío gratis garantizado' 
          : `Envío gratis a partir de $${fmt(MONTO_ENVIO_GRATIS)} (Te faltan $${fmt(MONTO_ENVIO_GRATIS - subtotal)})`}
      </div>

      {/* HEADER PRINCIPAL */}
      <header className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
        <span className="font-serif italic text-2xl font-black tracking-tighter" style={{ fontFamily: "'Playfair Display', serif" }}>Ejemplo Mates</span>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className={`w-10 h-10 rounded-full border ${dark ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'} flex items-center justify-center transition`}>
            <Icon name={dark ? 'Sun' : 'Moon'} size={16} />
          </button>
          <button onClick={() => setCarritoAbierto(true)} className="relative bg-[#FF5A36] text-black px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition">
            <Icon name="ShoppingBag" size={12} />
            <span>Carrito</span>
            <span className="bg-white text-black font-black px-1.5 py-0.5 rounded-full text-[9px]">{carrito.length}</span>
          </button>
        </div>
      </header>

      {/* FILTROS */}
      <section className={`sticky top-0 z-50 ${dark ? 'bg-[#080808]/80' : 'bg-[#f5f0eb]/80'} backdrop-blur-md border-b ${dark ? 'border-white/5' : 'border-black/10'} py-6`}>
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

      {/* GRILLA DE PRODUCTOS */}
      <section id="productos" className="py-24 px-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div key={filtro + busqueda + ordenPrecio} variants={stagger} initial="hidden" animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-16">
            {productosFiltrados.map(p => (
              <motion.div key={p.id} variants={fadeUp} layout className="group">
                <div className="aspect-[3/4] bg-zinc-900 rounded-[45px] overflow-hidden mb-6 relative cursor-pointer" onClick={() => setProductoSeleccionado(p)}>
                  <img src={p.imagen_url || 'https://via.placeholder.com/600'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={p.nombre} />
                  <div className="absolute top-5 left-5 right-5 flex justify-between items-center">
                    
                    {/* BADGES OFERTA / NUEVO DINÁMICOS */}
                    <div className="flex flex-col gap-1.5 items-start">
                      <span className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 text-white">
                        {p.stock != null ? (p.stock > 0 ? `Stock: ${p.stock}` : 'Sin Stock') : 'Disponible'}
                      </span>
                      {p.badge && (
                        <span className="bg-[#FF5A36] text-black px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">
                          {p.badge}
                        </span>
                      )}
                    </div>

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
              <div className="p-8 md:p-14 flex flex-col justify-center text-white">
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
              className={`fixed right-0 top-0 bottom-0 w-full max-w-lg ${dark ? 'bg-[#0e0e0e] text-white' : 'bg-white text-black'} z-[210] p-8 flex flex-col border-l ${dark ? 'border-white/5' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black italic uppercase font-serif">Tu Pedido</h2>
                <button onClick={() => setCarritoAbierto(false)}><Icon name="X" size={32} /></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4">
                {carritoAgrupado.length === 0
                  ? <p className={`${textMuted} text-xs uppercase text-center mt-20`}>El carrito está vacío</p>
                  : carritoAgrupado.map(item => (
                    <motion.div key={item.id} layout className={`flex gap-4 items-center border-b ${dark ? 'border-white/5' : 'border-gray-100'} pb-4`}>
                      <img src={item.imagen_url || 'https://via.placeholder.com/150'} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" alt="" />
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
                {/* GESTIÓN DE CUPONES DENTRO DEL CARRITO */}
                <div className={`flex gap-2 ${dark ? 'bg-black' : 'bg-gray-100'} p-3 rounded-2xl border ${dark ? 'border-white/5' : 'border-gray-200'}`}>
                  <input type="text" placeholder="CUPÓN DE DESCUENTO" value={cuponInput} onChange={e => setCuponInput(e.target.value)} disabled={cuponValido} className="bg-transparent flex-1 outline-none text-xs font-bold uppercase px-2" />
                  <button onClick={aplicarCupon} disabled={cuponValido} className="bg-zinc-800 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-[#FF5A36] hover:text-black transition">
                    {cuponValido ? 'Listo' : 'Aplicar'}
                  </button>
                </div>

                <div className={`${dark ? 'bg-zinc-900/50' : 'bg-gray-50'} p-6 rounded-[30px] space-y-4`}>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Código postal" className={`flex-1 ${dark ? 'bg-black border-white/10' : 'bg-white border-gray-200'} border rounded-xl px-4 py-3 text-xs outline-none focus:border-[#FF5A36]`} value={cp} onChange={e => setCp(e.target.value)} />
                    <button onClick={handleCalcularEnvio} className="bg-[#FF5A36] text-black px-5 rounded-xl font-black text-[10px] uppercase hover:bg-white transition-all">Calcular</button>
                  </div>
                  {costoEnvioReal !== null && (
                    <p className={`text-xs font-bold ${costoEnvioReal === 0 ? 'text-green-400' : textMuted}`}>
                      {costoEnvioReal === 0 ? '✓ Envío gratuito por monto mínimo' : `Envío: $${fmt(costoEnvioReal)}`}
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
              <li><a href="#" className="hover:text-[#FF5A36] transition-colors">Inicio</a></li>
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
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<TiendaPublica />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;900&family=Playfair+Display:ital,wght@1,900&display=swap');
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
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<TiendaPublica />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}