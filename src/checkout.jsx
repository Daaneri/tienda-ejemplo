import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from './supabase'; 
import * as Lucide from 'lucide-react';

const Icon = ({ name, ...props }) => {
  const LucideIcon = Lucide[name];
  return LucideIcon ? <LucideIcon {...props} /> : null;
};

export default function Checkout({ itemsCarrito, totalCarrito, onOrderSuccess }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Datos del Cliente
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  
  // Entrega y Envío
  const [metodoEnvio, setMetodoEnvio] = useState('retiro'); // 'retiro' o 'envio'
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [provincia, setProvincia] = useState('Santa Fe');
  const [cp, setCp] = useState('');
  
  // Costo de envío según elección
  const costoEnvio = metodoEnvio === 'envio' ? 4500 : 0;
  const totalFinal = totalCarrito + costoEnvio;

  // Redirección si entran directo al checkout sin productos
  useEffect(() => {
    if (!itemsCarrito || itemsCarrito.length === 0) {
      navigate('/');
    }
  }, [itemsCarrito, navigate]);

  const handleProcesarPago = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Estructura limpia de los productos
      const listaProductos = itemsCarrito.map(item => ({ 
        id: item.id, 
        nombre: item.nombre, 
        precio: item.precio 
      }));

      // Enviamos solo las columnas universales garantizadas para evitar conflictos de schema
      const datosOrden = {
        total: totalFinal,
        estado: 'pendiente',
        cliente_email: email, // Mapeo estándar seguro
        items: listaProductos // Formato JSON de productos estándar
      };

      // 1. Inserción directa en la tabla 'pedidos'
      const { data: ordenGuardada, error: errorSupabase } = await supabase
        .from('pedidos') 
        .insert([datosOrden])
        .select()
        .single();

      if (errorSupabase) throw new Error('Error al registrar la orden: ' + errorSupabase.message);

      // 2. Llamada a tu API en Render para generar Mercado Pago
      // Pasamos todos los datos completos del cliente al backend para que no se pierda nada
      const response = await fetch('https://tu-api-en-render.com/api/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          external_reference: ordenGuardada.id,
          items: itemsCarrito.map(item => ({
            title: item.nombre,
            unit_price: Number(item.precio),
            quantity: 1,
            currency_id: 'ARS'
          })),
          shipment_cost: costoEnvio,
          payer: { 
            name: nombre, 
            surname: apellido, 
            email: email,
            phone: { number: telefono }
          },
          metadata: {
            metodo_envio: metodoEnvio,
            direccion_despacho: metodoEnvio === 'envio' 
              ? `${direccion}, ${ciudad}, ${provincia} (CP: ${cp})` 
              : 'Retiro en Showroom Villa Constitución'
          }
        })
      });

      const preference = await response.json();

      if (preference.init_point) {
        onOrderSuccess();
        window.location.href = preference.init_point;
      } else {
        throw new Error('No se pudo generar el punto de inicio de pago.');
      }

    } catch (error) {
      alert(error.message || 'Hubo un problema al procesar tu solicitud.');
    } finally {
      setLoading(false);
    }
  };

  if (!itemsCarrito || itemsCarrito.length === 0) return null;

  return (
    <div className="bg-[#080808] min-h-screen text-white font-sans selection:bg-[#FF5A36] selection:text-black">
      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-16">
        
        {/* COLUMNA IZQUIERDA: FORMULARIOS */}
        <div className="lg:col-span-7 space-y-12">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-white transition mb-8">
              <Icon name="ArrowLeft" size={14} /> Volver al catálogo
            </Link>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Finalizar Compra</h1>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mt-2">Completá tus datos para el despacho o retiro.</p>
          </div>

          <form onSubmit={handleProcesarPago} className="space-y-10">
            {/* Sección 1: Datos Personales */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#FF5A36]">01. Datos de Contacto</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" placeholder="NOMBRE" value={nombre} onChange={(e) => setNombre(e.target.value)} required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs outline-none focus:border-[#FF5A36]" />
                <input type="text" placeholder="APELLIDO" value={apellido} onChange={(e) => setApellido(e.target.value)} required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs outline-none focus:border-[#FF5A36]" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="email" placeholder="EMAIL" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs outline-none focus:border-[#FF5A36]" />
                <input type="tel" placeholder="TELÉFONO / WHATSAPP" value={telefono} onChange={(e) => setTelefono(e.target.value)} required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs outline-none focus:border-[#FF5A36]" />
              </div>
            </div>

            {/* Sección 2: Método de Entrega */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#FF5A36]">02. Método de Entrega</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div onClick={() => setMetodoEnvio('retiro')} 
                  className={`p-6 rounded-3xl border cursor-pointer transition flex items-start gap-4 ${metodoEnvio === 'retiro' ? 'border-[#FF5A36] bg-[#FF5A36]/5' : 'border-white/10 bg-black'}`}>
                  <Icon name="MapPin" className={metodoEnvio === 'retiro' ? 'text-[#FF5A36]' : 'text-zinc-600'} size={20} />
                  <div>
                    <p className="text-xs font-black uppercase">Retiro en Showroom</p>
                    <p className="text-[11px] text-zinc-500 mt-1">Villa Constitución, SF. Gratis.</p>
                  </div>
                </div>

                <div onClick={() => setMetodoEnvio('envio')} 
                  className={`p-6 rounded-3xl border cursor-pointer transition flex items-start gap-4 ${metodoEnvio === 'envio' ? 'border-[#FF5A36] bg-[#FF5A36]/5' : 'border-white/10 bg-black'}`}>
                  <Icon name="Truck" className={metodoEnvio === 'envio' ? 'text-[#FF5A36]' : 'text-zinc-600'} size={20} />
                  <div>
                    <p className="text-xs font-black uppercase">Envío a Domicilio</p>
                    <p className="text-[11px] text-zinc-500 mt-1">Por Andreani a todo el país. ($4.500)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dirección condicional si elige Envío */}
            {metodoEnvio === 'envio' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 bg-zinc-900/30 p-6 rounded-[35px] border border-white/5">
                <input type="text" placeholder="DIRECCIÓN Y NÚMERO" value={direccion} onChange={(e) => setDireccion(e.target.value)} required={metodoEnvio === 'envio'}
                  className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-xs outline-none focus:border-[#FF5A36]" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <input type="text" placeholder="CIUDAD" value={ciudad} onChange={(e) => setCiudad(e.target.value)} required={metodoEnvio === 'envio'}
                    className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-xs outline-none focus:border-[#FF5A36]" />
                  <input type="text" placeholder="PROVINCIA" value={provincia} onChange={(e) => setProvincia(e.target.value)} required={metodoEnvio === 'envio'}
                    className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-xs outline-none focus:border-[#FF5A36]" />
                  <input type="text" placeholder="CÓDIGO POSTAL" value={cp} onChange={(e) => setCp(e.target.value)} required={metodoEnvio === 'envio'}
                    className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-xs outline-none focus:border-[#FF5A36]" />
                </div>
              </motion.div>
            )}

            {/* Botón de Envío */}
            <button type="submit" disabled={loading}
              className="w-full bg-[#FF5A36] text-black py-5 rounded-full font-black uppercase tracking-widest text-xs hover:bg-white transition-all shadow-[0_0_50px_rgba(255,90,54,0.2)] flex items-center justify-center gap-3">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  CONECTANDO MERCADO PAGO...
                </>
              ) : (
                <>
                  <Icon name="CreditCard" size={16} />
                  PROCEDER AL PAGO SEGURO
                </>
              )}
            </button>
          </form>
        </div>

        {/* COLUMNA DERECHA: RESUMEN DE COMPRA */}
        <div className="lg:col-span-5">
          <div className="sticky top-32 bg-[#0e0e0e] border border-white/5 p-8 md:p-10 rounded-[45px] space-y-8">
            <h3 className="text-sm font-black uppercase tracking-widest border-b border-white/5 pb-4">Resumen del Pedido</h3>
            
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
              {itemsCarrito.map((item, index) => (
                <div key={index} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img src={item.imagen_url || 'https://via.placeholder.com/150'} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/5" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight line-clamp-1">{item.nombre}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{item.categoria}</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-zinc-400">${item.precio.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-white/5 pt-6 space-y-3 text-xs">
              <div className="flex justify-between text-zinc-500 font-bold">
                <span>Subtotal Productos:</span>
                <span className="text-white">${totalCarrito.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-zinc-500 font-bold">
                <span>Costo de Entrega:</span>
                <span className="text-white">
                  {metodoEnvio === 'retiro' ? 'Gratis (Showroom)' : `$${costoEnvio.toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between items-baseline border-t border-white/5 pt-4">
                <span className="font-black uppercase tracking-wider text-[#FF5A36]">Total Final:</span>
                <span className="text-3xl font-black italic text-white">${totalFinal.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-black rounded-2xl p-4 border border-white/5 flex items-center gap-4">
              <Icon name="ShieldCheck" className="text-[#FF5A36]" size={24} />
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide leading-relaxed">
                Transacción cifrada y procesada a través de las API oficiales de Mercado Pago.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}