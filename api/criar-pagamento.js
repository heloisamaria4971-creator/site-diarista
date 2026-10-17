module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      erro: "Método não permitido."
    });
  }

  const pacotes = {
    "4h": {
      titulo: "Limpeza Residencial - 4 horas",
      valor: 210.00
    },
    "6h": {
      titulo: "Limpeza Residencial - 6 horas",
      valor: 240.00
    },
    "8h": {
      titulo: "Limpeza Residencial - 8 horas",
      valor: 270.00
    }
  };

  try {
    const { pacote } = req.body || {};
    const servico = pacotes[pacote];

    if (!servico) {
      return res.status(400).json({
        erro: "Pacote inválido."
      });
    }

    // Aceita tanto ACCESS_TOKEN quanto MP_ACCESS_TOKEN
    const token = process.env.ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN;

    if (!token) {
      return res.status(500).json({
        erro: "O pagamento ainda não foi configurado."
      });
    }

    const resposta = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items: [
            {
              title: servico.titulo,
              quantity: 1,
              currency_id: "BRL",
              unit_price: servico.valor
            }
          ]
        })
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      console.error("Erro Mercado Pago:", dados);

      return res.status(502).json({
        erro: "Não foi possível iniciar o pagamento."
      });
    }

    return res.status(200).json({
      id: dados.id,
      checkout_url: dados.init_point
    });
  } catch (erro) {
    console.error("Erro ao criar pagamento:", erro);

    return res.status(500).json({
      erro: "Erro interno ao criar o pagamento."
    });
  }
};
