export default async function handler(req, res) {
  // Configuração para evitar bloqueios de navegador (CORS)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  try {
    const { amount, buyerName, buyerPhone } = req.body;

    // Pega a chave dos Segredos da Vercel
    const SECRET_KEY = process.env.ABACASH_SECRET;
    if (!SECRET_KEY) throw new Error("Chave ABACASH_SECRET não configurada");

    // Tenta criar um "CPF" usando o telefone, pois o form não pede CPF
    // (A API exige 11 números)
    let fakeCpf = buyerPhone.replace(/\D/g, "");
    if (fakeCpf.length < 11) fakeCpf = fakeCpf.padEnd(11, '0');
    if (fakeCpf.length > 11) fakeCpf = fakeCpf.slice(0, 11);

    // Corpo da requisição igual ao seu exemplo
    const payload = {
      action: "create",
      product_id: "5niic0v1c", // SEU ID DE PRODUTO ATUALIZADO
      amount: Number(amount),  // Valor variável
      customer: {
        name: buyerName || "Cliente",
        cpf: fakeCpf,          // CPF gerado do telefone
        email: "cliente@email.com",
        phone: buyerPhone.replace(/\D/g, "")
      }
    };

    console.log("Enviando para Abacash:", payload);

    const response = await fetch("https://app.abacash.com/api/payment.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SECRET_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("Resposta Abacash:", data);

    if (!response.ok || data.error) {
      return res.status(400).json({ error: "Erro Abacash", detail: data });
    }

    // Mapeia a resposta para o seu Frontend
    // A Abacash pode mandar 'pix_code', 'payload' ou 'qrcode_text'
    return res.status(200).json({
      copiaecola: data.pix_code || data.qrcode_text || data.payload || "",
      qrCodeBase64: data.qr_code_base64 || data.qrcode_image || null,
      qrCodeUrl: data.qr_code || data.qrcode_link || null,
      expiresInSeconds: 600
    });

  } catch (error) {
    console.error("Erro API:", error);
    return res.status(500).json({ error: "Erro interno", detail: error.message });
  }
}