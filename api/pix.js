export default async function handler(req, res) {
  // 1. Permite CORS para seu front funcionar sem travas
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { amount, buyerName, buyerPhone } = req.body;

    console.log("🔄 Iniciando PIX:", { amount, buyerName, buyerPhone });

    const SECRET_KEY = process.env.ABACASH_SECRET;
    
    if (!SECRET_KEY) {
        throw new Error("Chave ABACASH_SECRET não configurada na Vercel");
    }

    // ⚠️ IMPORTANTE: O CPF deve ser válido.
    // Se o seu formulário não pede CPF, a API pode rejeitar.
    // Tente usar um CPF fixo de teste SE a Abacash permitir (Sandbox), 
    // caso contrário, você precisará adicionar um campo de CPF no seu site.
    // Abaixo mantenho sua lógica do telefone, mas saiba que é a causa provável de falhas.
    const cpfProvisorio = buyerPhone.replace(/\D/g, "").padEnd(11, '0').slice(0, 11);

    const bodyToSend = {
        action: "create",
        product_id: "prod_123456", // <--- TROQUE PELO ID REAL DO SEU PRODUTO NA ABACASH
        amount: parseFloat(amount),
        customer: {
          name: buyerName || "Cliente",
          cpf: cpfProvisorio, 
          email: "cliente@email.com",
          phone: buyerPhone.replace(/\D/g, "")
        }
    };

    const response = await fetch("https://app.abacash.com/api/payment.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SECRET_KEY}`
      },
      body: JSON.stringify(bodyToSend)
    });

    const data = await response.json();
    console.log("📩 Resposta Abacash:", JSON.stringify(data));

    if (!response.ok || data.error) {
      return res.status(400).json({ 
          error: "Erro na operadora de pagamento", 
          detail: data.message || JSON.stringify(data) 
      });
    }

    // Mapeamento de resposta seguro
    // A Abacash pode retornar o código em campos diferentes dependendo da versão
    const pixCode = data.pix_code || data.copy_paste || data.payload || data.qrcode_text || "";
    const qrImage = data.qr_code_base64 || data.qrcode_image || null;
    const qrUrl = data.qr_code || data.qrcode_link || null;

    if (!pixCode && !qrUrl) {
        throw new Error("A API respondeu OK, mas não enviou o código PIX.");
    }

    return res.status(200).json({
      copiaecola: pixCode,
      qrCodeBase64: qrImage,
      qrCodeUrl: qrUrl,
      expiresInSeconds: 600
    });

  } catch (error) {
    console.error("❌ Erro fatal:", error);
    return res.status(500).json({ error: "Erro interno no servidor", detail: error.message });
  }
}
