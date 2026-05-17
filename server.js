const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
app.use(express.json());
app.use(cors());

// Reemplazá esto con tu "Access Token" de Mercado Pago (lo sacás de tu panel de desarrollador)
const client = new MercadoPagoConfig({ accessToken: 'TU_ACCESS_TOKEN_AQUÍ' });

app.post('/checkout', async (req, res) => {
  try {
    const preference = new Preference(client);
    const response = await preference.create({
      body: {
        items: req.body.items.map(i => ({
          title: i.nombre,
          unit_price: Number(i.precio),
          quantity: 1,
          currency_id: 'ARS'
        })),
        back_urls: {
          success: "http://localhost:5173", // A donde vuelve cuando paga
          failure: "http://localhost:5173",
        },
        auto_return: "approved",
      }
    });
    res.json({ init_point: response.init_point });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log("Servidor de pagos listo en el puerto 3000"));