export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { amount, buyerName, buyerPhone } = req.body;

    // 🔒 IMPORTANTE: Cadastre a variável ABACASH_SECRET no painel da Vercel
    const SECRET_KEY = process.env.ABACASH_SECRET;

    const response = await fetch("https://app.abacash.com/api/payment.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SECRET_KEY}`
      },
      body: JSON.stringify({
        action: "create",
        product_id: "prod_123456", // ID do seu produto na Abacash
        amount: amount,
        customer: {
          name: buyerName,
          // A Abacash exige CPF. Como você só pede telefone, 
          // enviamos o telefone limpo como CPF provisório (verifique se sua conta permite)
          cpf: buyerPhone.replace(/\D/g, "").slice(0, 11), 
          email: "cliente@email.com"
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // Retornamos exatamente o que o script do seu HTML espera ler
    return res.status(200).json({
      copiaecola: data.pix_code || data.copy_paste || data.payload || "",
      qrCodeBase64: data.qr_code_base64 || null,
      qrCodeUrl: data.qr_code || null,
      expiresInSeconds: 600
    });

  } catch (error) {
    return res.status(500).json({ error: "Erro interno", detail: error.message });
  }
}