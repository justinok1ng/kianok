export default async function handler(req, res) {
  // 1. Configurações de Permissão (CORS)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  try {
    const { amount, buyerName, buyerPhone } = req.body;
    const SECRET_KEY = process.env.ABACASH_SECRET;

    if (!SECRET_KEY) return res.status(500).json({ error: "Configuração ausente" });

    // ====================================================
    // 🎲 LISTA DE PRODUTOS PARA SORTEIO
    // Coloque aqui todos os seus IDs da Abacash entre aspas e separados por vírgula
    const MEUS_PRODUTOS = [
       "s2dwjdf1t",
        // "icmdwvk1x",
        // "rsvmvfzsy",
// "8gq7gb5en",
// "b8796vs1h",
    ];

    // Sorteia um ID da lista acima automaticamente
    const produtoSorteado = MEUS_PRODUTOS[Math.floor(Math.random() * MEUS_PRODUTOS.length)];
    
    console.log("ID do Produto Escolhido:", produtoSorteado);
    // ====================================================

    // Tratamento de CPF
    let fakeCpf = buyerPhone.replace(/\D/g, "");
    if (fakeCpf.length > 11) fakeCpf = fakeCpf.slice(0, 11);
    if (fakeCpf.length < 11) fakeCpf = fakeCpf.padEnd(11, '1');

    const bodyToSend = {
        action: "create",
        product_id: produtoSorteado, // <--- Aqui entra o ID sorteado
        amount: Number(amount),
        customer: {
          name: buyerName || "Cliente",
          cpf: fakeCpf, 
          email: "cliente@email.com",
          phone: buyerPhone.replace(/\D/g, "")
        }
    };

    console.log("Enviando...", JSON.stringify(bodyToSend));

    const response = await fetch("https://app.abacash.com/api/payment.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SECRET_KEY}`
      },
      body: JSON.stringify(bodyToSend)
    });

    const jsonResponse = await response.json();
    console.log("Resposta da Abacash:", JSON.stringify(jsonResponse));

    // Lógica correta de leitura (baseada no seu Log de sucesso)
    const pixData = jsonResponse.data || {};
    const code = pixData.qr_code || pixData.pix_code;
    const urlImage = pixData.qr_image_url || pixData.qrcode_image;

    if (code) {
        return res.status(200).json({
            copiaecola: code,
            qrCodeUrl: urlImage,
            qrCodeBase64: null,
            expiresInSeconds: 600
        });
    }

    return res.status(400).json({ 
        error: "Erro na operadora", 
        detail: jsonResponse.error || "Código PIX não retornado. Tente valor maior que R$ 5,00." 
    });

  } catch (error) {
    console.error("Erro Fatal:", error);
    return res.status(500).json({ error: "Erro interno", detail: error.message });
  }
}