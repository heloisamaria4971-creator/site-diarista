
document.addEventListener("DOMContentLoaded", function () {
    const menuBtn = document.getElementById("mobile-menu-btn");
    const navMenu = document.getElementById("nav-menu");

    if (menuBtn && navMenu) {
        menuBtn.addEventListener("click", function () {
            navMenu.classList.toggle("active");
        });
    }
});

// Cria o pagamento no servidor da Vercel
async function pagarPacote(pacote) {
    const pacotesValidos = ["4h", "6h", "8h"];

    if (!pacotesValidos.includes(pacote)) {
        alert("Pacote inválido.");
        return;
    }

    const botoes = document.querySelectorAll(
        `[onclick="pagarPacote('${pacote}')"]`
    );

    botoes.forEach(botao => {
        botao.disabled = true;
        botao.dataset.textoOriginal = botao.innerHTML;
        botao.innerHTML = "Preparando pagamento...";
    });

    try {
        const resposta = await fetch("/api/criar-pagamento", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ pacote })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro || "Não foi possível iniciar o pagamento."
            );
        }

        if (!dados.checkout_url) {
            throw new Error("O Mercado Pago não retornou o link de pagamento.");
        }

        // Abre o Checkout Pro do Mercado Pago
        window.location.href = dados.checkout_url;

    } catch (erro) {
        console.error("Erro ao iniciar pagamento:", erro);

        alert(
            erro.message ||
            "Não foi possível iniciar o pagamento. Tente novamente."
        );

        botoes.forEach(botao => {
            botao.disabled = false;
            botao.innerHTML = botao.dataset.textoOriginal;
        });
    }
}
