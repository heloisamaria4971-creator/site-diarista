
module.exports = async (req, res) => {
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
      titulo: "Faxina promocional - 4 horas",
      valor: 149.90
    },
    "6h": {
      titulo: "Faxina - 6 horas",
      valor: 340.00
    },
    "8h": {
      titulo: "Faxina - 8 horas",
      valor: 440.00
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

    const token = (
      process.env.ACCESS_TOKEN ||
      process.env.MP_ACCESS_TOKEN ||
      ""
    ).trim();

    console.log("Token carregado:", Boolean(token));
    console.log(
      "Prefixo do token:",
      token ? token.slice(0, 7) : "ausente"
    );

    if (!token) {
      return res.status(500).json({
        erro: "Token do Mercado Pago não configurado na Vercel."
      });
    }

    const resposta = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items: [
            {
              id: pacote,
              title: servico.titulo,
              quantity: 1,
              currency_id: "BRL",
              unit_price: servico.valor
            }
          ],
          statement_descriptor: "LIMPEZA CUIDADO"
        })
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      console.error("Erro Mercado Pago:", {
        status: resposta.status,
        mensagem: dados.message || null,
        codigo: dados.error || null,
        causas: dados.cause || null
      });

      return res.status(502).json({
        erro: dados.message ||
          "O Mercado Pago recusou a criação do pagamento.",
        codigo: dados.error || "erro_mercado_pago",
        detalhes: Array.isArray(dados.cause)
          ? dados.cause.map(causa => ({
              codigo: causa.code,
              descricao: causa.description
            }))
          : []
      });
    }

    if (!dados.init_point) {
      console.error("Checkout criado sem init_point.");

      return res.status(502).json({
        erro: "O Mercado Pago não retornou o link de pagamento."
      });
    }

    return res.status(200).json({
      id: dados.id,
      checkout_url: dados.init_point
    });

  } catch (erro) {
    console.error("Erro ao criar pagamento:", erro.message);

    return res.status(500).json({
      erro: "Erro interno ao criar o pagamento."
    });
  }
};
