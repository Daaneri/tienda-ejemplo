import React, { useState, useEffect } from 'react';
import { supabase } from './supabase'; // Asegurate de que la ruta a tu cliente de supabase sea correcta

export default function AdminPanel({ onVolver }) {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true); // Evita el parpadeo del login al recargar
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados para el CRUD de productos
  const [productos, setProductos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // 1. Escuchar la sesión de Supabase Auth
  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    }).catch(() => setLoadingSession(false));

    // Escuchar cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingSession(false);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // 2. Cargar productos si hay sesión activa
  useEffect(() => {
    if (session) {
      fetchProductos();
    }
  }, [session]);

  const fetchProductos = async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('id', { ascending: false });
    
    if (error) {
      console.error("Error al traer productos:", error.message);
    } else {
      setProductos(data);
    }
  };

  // 3. Manejar el Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Error al iniciar sesión: ' + error.message);
    setLoading(false);
  };

  // 4. Manejar el Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // 5. Insertar nuevo producto
  const handleAgregarProducto = async (e) => {
    e.preventDefault();
    if (!nombre || !precio) return alert('Nombre y precio son obligatorios');

    setLoading(true);
    const { error } = await supabase
      .from('productos')
      .insert([{ 
        nombre, 
        precio: parseFloat(precio), 
        descripcion, 
        imagen: imageUrl 
      }]);

    setLoading(false);

    if (error) {
      alert('Error al agregar: ' + error.message);
    } else {
      alert('¡Mate agregado con éxito!');
      // Limpiar formulario y recargar lista
      setNombre('');
      setPrecio('');
      setDescripcion('');
      setImageUrl('');
      fetchProductos();
    }
  };

  // 6. Eliminar producto
  const handleEliminar = async (id) => {
    if (confirm('¿Seguro querés borrar este producto?')) {
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id);

      if (error) alert('Error al eliminar: ' + error.message);
      else fetchProductos();
    }
  };

  // VISTA 0: ESPERANDO ESTADO DE LA SESIÓN (Previene flashes visuales)
  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white">
        <p className="text-zinc-400 animate-pulse">Verificando credenciales...</p>
      </div>
    );
  }

  // VISTA 1: FORMULARIO DE LOGIN (Si no está logueado)
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 px-4">
        <div className="max-w-md w-full bg-zinc-800 p-8 rounded-xl shadow-lg border border-zinc-700">
          <h2 className="text-2xl font-bold text-center text-white mb-6">Panel de Control Mates</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-zinc-400 text-sm mb-1">Email del Administrador</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 rounded bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                placeholder="admin@ejemplo.com"
                required
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-sm mb-1">Contraseña</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 rounded bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-orange-500"
                placeholder="••••••••"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>
          <button onClick={onVolver} className="w-full mt-4 text-sm text-zinc-400 hover:text-white transition">
            ← Volver a la Tienda
          </button>
        </div>
      </div>
    );
  }

  // VISTA 2: PANEL DE ADMINISTRADOR ACTIVO
  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-800 pb-4 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-orange-500">Panel de Control</h1>
          <p className="text-sm text-zinc-400">Sesión activa: {session.user?.email}</p>
        </div>
        <div className="space-x-4 flex w-full sm:w-auto justify-end">
          <button onClick={onVolver} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded transition text-sm">
            Ver Tienda Pública
          </button>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition text-sm">
            Cerrar Sesión
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* COLUMNA FORMULARIO DE CARGA */}
        <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-700 h-fit">
          <h3 className="text-xl font-semibold mb-4 text-orange-400">Cargar Nuevo Mate</h3>
          <form onSubmit={handleAgregarProducto} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Nombre del producto</label>
              <input 
                type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:border-orange-500" required
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Precio ($)</label>
              <input 
                type="number" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)}
                className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:border-orange-500" required
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">URL de la Imagen</label>
              <input 
                type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://supabase.co/storage/v1/object/public/..."
                className="w-full p-2 text-xs bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Descripción</label>
              <textarea 
                value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded h-24 resize-none text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <button 
              type="submit" disabled={loading}
              className="w-full py-2 bg-orange-600 hover:bg-orange-700 rounded font-semibold text-white transition disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Publicar Producto'}
            </button>
          </form>
        </div>

        {/* COLUMNA LISTADO ACTUAL */}
        <div className="lg:col-span-2 bg-zinc-800 p-6 rounded-xl border border-zinc-700">
          <h3 className="text-xl font-semibold mb-4 text-zinc-300">Productos en la Web ({productos.length})</h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {productos.map((prod) => (
              <div key={prod.id} className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                <div className="flex items-center space-x-4">
                  <img src={prod.imagen || 'https://via.placeholder.com/150'} alt={prod.nombre} className="w-12 h-12 object-cover rounded bg-zinc-800"/>
                  <div>
                    <h4 className="font-semibold text-white">{prod.nombre}</h4>
                    <p className="text-orange-400 font-medium text-sm">${prod.precio}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleEliminar(prod.id)}
                  className="px-3 py-1 bg-zinc-800 hover:bg-red-900 hover:text-red-200 text-zinc-400 rounded transition text-xs border border-zinc-700"
                >
                  Eliminar
                </button>
              </div>
            ))}
            {productos.length === 0 && <p className="text-zinc-500 text-center py-4">No hay productos cargados en la base de datos.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}