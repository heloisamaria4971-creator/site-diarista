module.exports = async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido." });
  }

  const pacotes = {
    "4h": { titulo: "Faxina promocional - 4 horas", valor: 149.9 },
    "6h": { titulo: "Faxina - 6 horas", valor: 340.0 },
    "8h": { titulo: "Faxina - 8 horas", valor: 440.0 },
  };

  try {
    // Em alguns setups, req.body pode vir como string
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    const { pacote } = body;
    const servico = pacotes[pacote];

    if (!servico) {
      return res.status(400).json({ erro: "Pacote inválido." });
    }

    // Use apenas UM nome de env var para não ter confusão
    const token = (process.env.MP_ACCESS_TOKEN || "").trim();

    console.log("Token carregado:", Boolean(token));
    console.log("Prefixo do token:", token ? token.slice(0, 7) : "ausente");

    if (!token) {
      return res.status(500).json({
        erro: "MP_ACCESS_TOKEN não configurado na Vercel.",
      });
    }

    // Checkout Pro em teste NÃO usa TEST-
    if (token.startsWith("TEST-")) {
      return res.status(500).json({
        erro:
          "Credencial incorreta para Checkout Pro. Para testar Checkout Pro, use um Access Token que comece com APP_USR (vendedor de teste), não TEST-.",
      });
    }

    // Diagnóstico: valida se o token está autorizado em geral
    const me = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("users/me status:", me.status);

    // Cria preferência
    const resposta = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              id: pacote,
              title: servico.titulo,
              quantity: 1,
              currency_id: "BRL",
              unit_price: servico.valor,
            },
          ],
        }),
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      console.error("Erro Mercado Pago:", {
        status: resposta.status,
        mensagem: dados?.message || null,
        codigo: dados?.error || null,
        causas: dados?.cause || null,
      });

      return res.status(502).json({
        erro: dados?.message || "O Mercado Pago recusou a criação do pagamento.",
        // incluo o status do /users/me na resposta para você ver no Network também
        debug: { users_me_status: me.status },
      });
    }

    if (!dados?.init_point) {
      console.error("Checkout criado sem init_point.", { id: dados?.id || null });
      return res.status(502).json({
        erro: "O Mercado Pago não retornou o link de pagamento (init_point).",
      });
    }

    return res.status(200).json({
      id: dados.id,
      checkout_url: dados.init_point,
    });
  } catch (erro) {
    console.error("Erro ao criar pagamento:", erro?.message || erro);
    return res.status(500).json({ erro: "Erro interno ao criar o pagamento." });
  }
};
