export default async function handler(req, res) {
  // 1. Configuração de Permissões (CORS)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  try {
    const { amount, buyerName, buyerPhone } = req.body;
    const SECRET_KEY = process.env.ABACASH_SECRET;

    if (!SECRET_KEY) {
        console.error("ABACASH_SECRET não configurada.");
        return res.status(500).json({ error: "Configuração ausente" });
    }

    // Tratamento de CPF
    let fakeCpf = buyerPhone.replace(/\D/g, "");
    if (fakeCpf.length > 11) fakeCpf = fakeCpf.slice(0, 11);
    if (fakeCpf.length < 11) fakeCpf = fakeCpf.padEnd(11, '1');

    const bodyToSend = {
        action: "create",
        product_id: "5niic0v1c",
        amount: Number(amount),
        customer: {
          name: buyerName || "Cliente",
          cpf: fakeCpf, 
          email: "cliente@email.com",
          phone: buyerPhone.replace(/\D/g, "")
        }
    };

    console.log("Enviando:", JSON.stringify(bodyToSend));

    const response = await fetch("https://app.abacash.com/api/payment.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SECRET_KEY}`
      },
      body: JSON.stringify(bodyToSend)
    });

    const jsonResponse = await response.json();
    console.log("Resposta Completa Abacash:", JSON.stringify(jsonResponse));

    if (!response.ok || (jsonResponse.success === false)) {
      return res.status(400).json({ error: "Erro na operadora", detail: jsonResponse });
    }

    // === A CORREÇÃO ESTÁ AQUI ===
    // Baseado no seu log: jsonResponse.data.qr_code
    const pixData = jsonResponse.data || {};
    
    const codigoCopiaCola = pixData.qr_code || pixData.pix_code || "";
    const urlQrCode = pixData.qr_image_url || pixData.qrcode_image || null;

    return res.status(200).json({
      copiaecola: codigoCopiaCola,
      qrCodeUrl: urlQrCode,
      qrCodeBase64: null, // A Abacash mandou URL, não Base64
      expiresInSeconds: 600
    });

  } catch (error) {
    console.error("Erro Fatal:", error);
    return res.status(500).json({ error: "Erro interno", detail: error.message });
  }
}
