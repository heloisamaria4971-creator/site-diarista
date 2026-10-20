
module.exports = async (req, res) => {
  // Configuração da API
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

  // Pacotes e preços definidos no servidor
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
    // Lê os dados enviados pelo site
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : (req.body || {});

    const { pacote } = body;
    const servico = pacotes[pacote];

    if (!servico) {
      return res.status(400).json({
        erro: "Pacote inválido."
      });
    }

    // Credencial configurada nas variáveis de ambiente da Vercel
    const token = (process.env.MP_ACCESS_TOKEN || "").trim();

    if (!token) {
      console.error("MP_ACCESS_TOKEN não configurado.");

      return res.status(500).json({
        erro: "Pagamento não configurado no servidor."
      });
    }

    // Cria a preferência de pagamento no Mercado Pago
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

          // Página para onde o cliente retorna após o checkout
          back_urls: {
            success: "https://site-diarista.vercel.app/pagamento-sucesso.html",
            failure: "https://site-diarista.vercel.app/servicos.html",
            pending: "https://site-diarista.vercel.app/servicos.html"
          },

          // Retorno automático quando o pagamento for aprovado
          auto_return: "approved"
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
        erro:
          dados.message ||
          "O Mercado Pago recusou a criação do pagamento."
      });
    }

    if (!dados.init_point) {
      console.error("Checkout criado sem init_point.");

      return res.status(502).json({
        erro: "O Mercado Pago não retornou o link de pagamento."
      });
    }

    // Retorna o link de checkout ao site
    return res.status(200).json({
      id: dados.id,
      checkout_url: dados.init_point
    });

  } catch (erro) {
    console.error(
      "Erro ao criar pagamento:",
      erro.message || erro
    );

    return res.status(500).json({
      erro: "Erro interno ao criar o pagamento."
    });
  }
};
