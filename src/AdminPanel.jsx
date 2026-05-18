import React, { useState, useEffect } from 'react';
import { supabase } from './supabase'; 

export default function AdminPanel({ onVolver }) {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estados para el CRUD de productos
  const [productos, setProductos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  // Ahora manejamos múltiples imágenes (una URL por línea o separadas por coma)
  const [imagesInput, setImagesInput] = useState('');
  // ID de productos relacionados (Array de IDs)
  const [relacionados, setRelacionados] = useState([]);
  
  const [editandoId, setEditandoId] = useState(null);

  // Escuchar la sesión de Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    }).catch(() => setLoadingSession(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingSession(false);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // Cargar productos si hay sesión activa
  useEffect(() => {
    if (session) {
      fetchProductos();
    }
  }, [session]);

  const fetchProductos = async () => {
    // Ordenamos por la columna 'orden' de forma ascendente
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('orden', { ascending: true });
    
    if (error) {
      console.error("Error al traer productos:", error.message);
    } else {
      setProductos(data || []);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Error al iniciar sesión: ' + error.message);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Procesar el input de texto a un array de URLs limpio
  const procesarImagenes = (inputText) => {
    if (!inputText) return [];
    return inputText
      .split(/[\n,]+/)
      .map(url => url.trim())
      .filter(url => url.length > 0);
  };

  // Insertar o Actualizar producto
  const handleGuardarProducto = async (e) => {
    e.preventDefault();
    if (!nombre || !precio) return alert('Nombre y precio son obligatorios');

    setLoading(true);
    const listaImagenes = procesarImagenes(imagesInput);

    const datosProducto = {
      nombre,
      precio: parseFloat(precio),
      descripcion,
      // Guardamos la galería como un array JSON en Supabase (asegurate de que la columna 'imagenes' sea de tipo jsonb o text[])
      imagenes: listaImagenes,
      // Guardamos la primera imagen en el campo viejo por compatibilidad si lo usás en la tienda
      imagen: listaImagenes[0] || '',
      productos_relacionados: relacionados
    };

    if (editandoId) {
      const { error } = await supabase
        .from('productos')
        .update(datosProducto)
        .eq('id', editandoId);

      setLoading(false);
      if (error) {
        alert('Error al actualizar: ' + error.message);
      } else {
        alert('¡Producto actualizado con éxito!');
        limpiarFormulario();
        fetchProductos();
      }
    } else {
      // Si es nuevo, le asignamos el último lugar del orden de manera tentativa
      datosProducto.orden = productos.length + 1;

      const { error } = await supabase
        .from('productos')
        .insert([datosProducto]);

      setLoading(false);
      if (error) {
        alert('Error al agregar: ' + error.message);
      } else {
        alert('¡Producto agregado con éxito!');
        limpiarFormulario();
        fetchProductos();
      }
    }
  };

  const handleActivarEdicion = (prod) => {
    setEditandoId(prod.id);
    setNombre(prod.nombre);
    setPrecio(prod.precio);
    setDescripcion(prod.descripcion || '');
    // Si viene como array lo unimos por saltos de línea para el textarea, sino usamos el string clásico
    if (Array.isArray(prod.imagenes)) {
      setImagesInput(prod.imagenes.join('\n'));
    } else {
      setImagesInput(prod.imagen || '');
    }
    setRelacionados(prod.productos_relacionados || []);
  };

  const limpiarFormulario = () => {
    setEditandoId(null);
    setNombre('');
    setPrecio('');
    setDescripcion('');
    setImagesInput('');
    setRelacionados([]);
  };

  const handleEliminar = async (id) => {
    if (confirm('¿Seguro querés borrar este producto?')) {
      if (editandoId === id) limpiarFormulario();

      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id);

      if (error) alert('Error al eliminar: ' + error.message);
      else fetchProductos();
    }
  };

  // --- LÓGICA DE REORDENAMIENTO (Drag & Drop / Flechas de posición) ---
  const moverProducto = async (index, direccion) => {
    const nuevosProductos = [...productos];
    const targetIndex = direccion === 'SUBIR' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= nuevosProductos.length) return;

    // Intercambio posicional en el array local
    const temp = nuevosProductos[index];
    nuevosProductos[index] = nuevosProductos[targetIndex];
    nuevosProductos[targetIndex] = temp;

    // Actualizamos el estado de manera inmediata para feedback visual fluido
    setProductos(nuevosProductos);

    // Persistimos el nuevo orden mapeado en Supabase
    for (let i = 0; i < nuevosProductos.length; i++) {
      await supabase
        .from('productos')
        .update({ orden: i + 1 })
        .eq('id', nuevosProductos[i].id);
    }
  };

  // --- MÉTRICAS DEL DASHBOARD ---
  const totalProductos = productos.length;
  const valorTotalCatalogo = productos.reduce((acc, curr) => acc + (Number(curr.precio) || 0), 0);
  const precioPromedio = totalProductos > 0 ? (valorTotalCatalogo / totalProductos).toFixed(2) : 0;
  const sinImagen = productos.filter(p => !p.imagen && (!p.imagenes || p.imagenes.length === 0)).length;

  // --- MANEJO DE SELECCIÓN DE PRODUCTOS RELACIONADOS ---
  const handleToggleRelacionado = (id) => {
    if (relacionados.includes(id)) {
      setRelacionados(relacionados.filter(rId => rId !== id));
    } else {
      setRelacionados([...relacionados, id]);
    }
  };

  // --- ENVIAR RESUMEN DE COMPRA / PEDIDO SIMULADO POR EMAIL ---
  const enviarResumenPedidoEmail = (clienteEmail, itemsCarrito) => {
    const totalPedido = itemsCarrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    const listaItemsTexto = itemsCarrito.map(item => `- ${item.nombre} x${item.cantidad} ($${item.precio * item.cantidad})`).join('%0A');
    
    const asunto = `Resumen de tu pedido - Tienda Mates`;
    const cuerpo = `¡Hola! Gracias por tu compra.%0A%0AAcá tenés el detalle de tu pedido:%0A${listaItemsTexto}%0A%0ATotal: $${totalPedido}%0A%0ANos vamos a estar comunicando con vos a la brevedad para coordinar el envío.`;
    
    // Abre el cliente de correo predeterminado configurado (Ideal para automatizar desde cliente rápido o redirigir a un endpoint)
    window.open(`mailto:${clienteEmail}?subject=${asunto}&body=${cuerpo}`);
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white">
        <p className="text-zinc-400 animate-pulse">Verificando credenciales...</p>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6">
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-800 pb-4 mb-6 gap-4">
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

      {/* SECCIÓN 1: DASHBOARD MÉTRICAS */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-850 p-4 rounded-xl border border-zinc-800 shadow-sm">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Productos</p>
          <p className="text-2xl font-bold text-white mt-1">{totalProductos}</p>
        </div>
        <div className="bg-zinc-850 p-4 rounded-xl border border-zinc-800 shadow-sm">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Valor del Catálogo</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">${valorTotalCatalogo.toLocaleString('es-AR')}</p>
        </div>
        <div className="bg-zinc-850 p-4 rounded-xl border border-zinc-800 shadow-sm">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Precio Promedio</p>
          <p className="text-2xl font-bold text-orange-400 mt-1">${precioPromedio}</p>
        </div>
        <div className="bg-zinc-850 p-4 rounded-xl border border-zinc-800 shadow-sm">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Sin Imagen</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{sinImagen}</p>
        </div>
      </section>

      {/* SECCIÓN 2: FORMULARIO Y LISTADO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA FORMULARIO */}
        <div className="bg-zinc-800 p-6 rounded-xl border border-zinc-700 h-fit space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-orange-400">
              {editandoId ? 'Editar Mate Seleccionado' : 'Cargar Nuevo Mate'}
            </h3>
          </div>
          
          <form onSubmit={handleGuardarProducto} className="space-y-4">
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
            
            {/* GALERÍA MÚLTIPLES IMÁGENES */}
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Galería de Imágenes (URLs)</label>
              <textarea 
                value={imagesInput} onChange={(e) => setImagesInput(e.target.value)}
                placeholder="Pegá una URL por línea o separadas por comas..."
                className="w-full p-2 text-xs bg-zinc-900 border border-zinc-700 rounded text-white h-20 resize-none focus:outline-none focus:border-orange-500 font-mono"
              />
              <p className="text-[10px] text-zinc-500 mt-1">La primera imagen listada se tomará como la principal del producto.</p>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Descripción</label>
              <textarea 
                value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded h-20 resize-none text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* PRODUCTOS RELACIONADOS */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Vincular Productos Relacionados</label>
              <div className="bg-zinc-900 border border-zinc-700 rounded p-2 max-h-32 overflow-y-auto space-y-1">
                {productos
                  .filter(p => p.id !== editandoId)
                  .map(p => (
                    <label key={p.id} className="flex items-center space-x-2 text-xs text-zinc-300 hover:text-white cursor-pointer py-0.5">
                      <input 
                        type="checkbox"
                        checked={relacionados.includes(p.id)}
                        onChange={() => handleToggleRelacionado(p.id)}
                        className="rounded bg-zinc-800 border-zinc-700 text-orange-600 focus:ring-0 focus:ring-offset-0"
                      />
                      <span>{p.nombre}</span>
                    </label>
                  ))}
                {productos.length <= 1 && <p className="text-zinc-600 text-xs text-center py-2">No hay otros productos para relacionar.</p>}
              </div>
            </div>
            
            <div className="space-y-2 pt-2">
              <button 
                type="submit" disabled={loading}
                className={`w-full py-2 rounded font-semibold text-white transition disabled:opacity-50 ${editandoId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-orange-600 hover:bg-orange-700'}`}
              >
                {loading ? 'Guardando...' : editandoId ? 'Actualizar Producto' : 'Publicar Producto'}
              </button>
              
              {editandoId && (
                <button 
                  type="button" 
                  onClick={limpiarFormulario}
                  className="w-full py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded text-sm transition"
                >
                  Cancelar Edición
                </button>
              )}
            </div>
          </form>
        </div>

        {/* COLUMNA LISTADO CON REORDENAMIENTO */}
        <div className="lg:col-span-2 bg-zinc-800 p-6 rounded-xl border border-zinc-700">
          <h3 className="text-xl font-semibold mb-4 text-zinc-300">Organización y Catálogo ({productos.length})</h3>
          <div className="space-y-3 max-h-[650px] overflow-y-auto pr-2">
            {productos.map((prod, index) => (
              <div 
                key={prod.id} 
                className={`flex items-center justify-between p-3 rounded-lg border transition ${editandoId === prod.id ? 'bg-zinc-750 border-amber-500 shadow-md shadow-amber-950/20' : 'bg-zinc-900 border-zinc-800'}`}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {/* CONTROLES ORDEN (SUBIR / BAJAR) */}
                  <div className="flex flex-col space-y-1 text-zinc-500">
                    <button 
                      onClick={() => moverProducto(index, 'SUBIR')} 
                      disabled={index === 0}
                      className="hover:text-orange-400 disabled:opacity-20 text-xs p-0.5"
                      title="Subir Puesto"
                    >
                      ▲
                    </button>
                    <button 
                      onClick={() => moverProducto(index, 'BAJAR')} 
                      disabled={index === productos.length - 1}
                      className="hover:text-orange-400 disabled:opacity-20 text-xs p-0.5"
                      title="Bajar Puesto"
                    >
                      ▼
                    </button>
                  </div>

                  {/* MINIATURAS MULTI-IMAGEN */}
                  <div className="relative flex items-center">
                    <img 
                      src={prod.imagen || 'https://via.placeholder.com/150'} 
                      alt={prod.nombre} 
                      className="w-12 h-12 object-cover rounded bg-zinc-800 border border-zinc-700"
                    />
                    {prod.imagenes && prod.imagenes.length > 1 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-orange-600 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full shadow">
                        +{prod.imagenes.length - 1}
                      </span>
                    )}
                  </div>

                  <div className="truncate pr-2">
                    <h4 className="font-semibold text-white text-sm truncate">{prod.nombre}</h4>
                    <p className="text-orange-400 font-medium text-xs">${prod.precio}</p>
                    {prod.productos_relacionados && prod.productos_relacionados.length > 0 && (
                      <span className="text-[10px] text-zinc-500 block truncate">
                        🔗 {prod.productos_relacionados.length} vinculados
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-x-1.5 flex items-center shrink-0">
                  <button 
                    onClick={() => handleActivarEdicion(prod)}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-amber-400 rounded transition text-xs border border-zinc-700"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => handleEliminar(prod.id)}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-red-900 hover:text-red-200 text-zinc-400 rounded transition text-xs border border-zinc-700"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ))}
            {productos.length === 0 && (
              <p className="text-zinc-500 text-center py-8">No hay productos cargados en la base de datos.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}